import { encryptPacket } from './export-codec.mjs';
import { createClientLimiter } from './client-limit.mjs';
import { randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { loadOperators } from './operators.mjs';
import { redactSecrets } from './redact.mjs';
import { createModelClient } from '../models/client.mjs';
import { SPARK_BASETEN_ROUTE, SPARK_FIREWORKS_ROUTE } from '../models/routes.mjs';

function fail(status, message) { return Object.assign(new Error(message), { status }); }
function equal(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  return left.length === right.length && timingSafeEqual(left, right);
}

export function createMetaHandler({ env = process.env, fetchImpl = globalThis.fetch, workflow, quotaPersistence } = {}) {
  const accounts=loadOperators(env);
  const sessions = new Map();
  const routeHealth={};
  const limit=createClientLimiter({maximum:120,persistence:quotaPersistence?.('meta')});
  const loginLimit=createClientLimiter({maximum:12,persistence:quotaPersistence?.('login')});
  return async function handle(req, res, path, guards, snapshot) {
    if (!path.startsWith('/api/')) return null;
    guards.assertOrigin(req);
    if ((path.startsWith('/api/meta/')||path.startsWith('/api/workflow/')) && req.method !== 'POST') throw fail(405, 'POST required');
    if (path === '/api/meta/session' || path === '/api/meta/demo-entry') {
      const loginAllowance=loginLimit(req);
      if(!loginAllowance.allowed){res.setHeader('Retry-After',String(loginAllowance.retryAfter));throw fail(429,'Client request rate limit exceeded');}
      if (!accounts.length) throw fail(503, 'HACKATHON_ADMIN_TOKEN or HACKATHON_OPERATORS_JSON is not configured');
      const demoMode=String(env.HACKATHON_DEMO_MODE||'')==='1';
      if(path==='/api/meta/demo-entry'&&!demoMode)throw fail(404,'Unknown meta route');
      const account=path==='/api/meta/demo-entry'
        ?(accounts.find(a=>a.role==='admin')||accounts[0])
        :accounts.find(a=>equal(req.headers.authorization,`Bearer ${a.token}`));
      if(!account){workflow?.recordLoginFailure(req.socket?.remoteAddress??'unknown');throw fail(401,'Authentication required');}
      const operator={id:account.id,role:account.role};
      const session = randomBytes(32).toString('hex');
      const csrf = randomBytes(32).toString('hex');
      for (const [key, value] of sessions) if (value.expires <= Date.now()) sessions.delete(key);
      if (sessions.size >= 100) {res.setHeader('Retry-After','600');throw fail(429, 'Session capacity reached');}
      sessions.set(session, { csrf, operator, expires: Date.now() + 10 * 60_000 });
      res.setHeader('Set-Cookie',`ffr_session=${session}; HttpOnly; SameSite=Strict; Path=/; Max-Age=600${req.socket.encrypted?'; Secure':''}`);
      return path==='/api/meta/demo-entry'?{session,csrf,operator,demo:true}:{session,csrf,operator};
    }
    const cookieSession=String(req.headers.cookie??'').split(';').map(s=>s.trim()).find(s=>s.startsWith('ffr_session='))?.slice('ffr_session='.length);
    const sessionToken=req.headers['x-session-token']??cookieSession;
    const session = sessions.get(sessionToken);
    if (!session || session.expires <= Date.now()) throw fail(401, 'Valid session required');
    if (!equal(req.headers['x-csrf-token'], session.csrf)) throw fail(403, 'Valid CSRF token required');
    // Authenticated meta/workflow routes get a tighter per-client ceiling; legacy /api/* keep the server 240 window only.
    if(path.startsWith('/api/meta/')||path.startsWith('/api/workflow/')){
      const allowance=limit(req);
      if(!allowance.allowed){res.setHeader('Retry-After',String(allowance.retryAfter));throw fail(429,'Client request rate limit exceeded');}
    }
    const readOnlyPaths=new Set(['/api/workflow/status','/api/workflow/verify','/api/workflow/export','/api/workflow/encrypted-export','/api/workflow/checkpoint','/api/workflow/report','/api/workflow/investigation-status','/api/scenario','/api/analysis','/api/tools','/api/tools/invoke','/api/meta/logout']);
    if(session.operator.role==='auditor'&&!readOnlyPaths.has(path))throw fail(403,'Auditor role is read-only');
    if(path==='/api/workflow/reset'||path==='/api/scenario/reset-demo'){if(session.operator.role!=='admin')throw fail(403,'Scenario reset requires admin rights');}
    if(path==='/api/workflow/revoke'&&session.operator.role!=='operator')throw fail(403,'Revocation requires a named operator');
    if(!path.startsWith('/api/meta/')&&!path.startsWith('/api/workflow/'))return {legacyAuthorized:true,operator:session.operator};
    if(path==='/api/meta/logout'){sessions.delete(sessionToken);res.setHeader('Set-Cookie','ffr_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return {ok:true};}
    const body = await guards.readJson(req);
    if(!body||typeof body!=='object'||Array.isArray(body))throw fail(400,'JSON object required');
    if(path.startsWith('/api/workflow/')) {
      const fieldsByRoute=Object.create(null);
      Object.assign(fieldsByRoute,{status:[],'britt-draft':['provider'],'britt-decide':['proposalId','action'],'task-move':['taskId','status','idempotencyKey'],review:['runId','optionId'],confirm:['nonce','typed'],revoke:[],shock:['cellId'],reset:[],verify:[],export:['acknowledgePlaintext'],'encrypted-export':['passphrase'],checkpoint:[],report:['acknowledgePlaintext'],investigate:['provider'],'investigation-start':['provider'],'investigation-status':['jobId'],'provider-check':['provider']});
      const route=path.slice('/api/workflow/'.length);
      if(!Object.prototype.hasOwnProperty.call(fieldsByRoute,route))throw fail(404,'Unknown workflow route');
      const fields=fieldsByRoute[route];
      if(Object.keys(body).some(k=>!fields.includes(k))||fields.some(k=>typeof body[k]!=='string'||!body[k].trim()||body[k].length>160))throw fail(400,'Invalid workflow fields');
      if(!workflow)throw fail(503,'Workflow requires HACKATHON_LEDGER_KEY and private state configuration');
      if(['export','report'].includes(route)&&body.acknowledgePlaintext!=='EXPORT PLAINTEXT')throw fail(400,'Explicit plaintext export acknowledgement required');
      const actor=sessionToken;
      if(path==='/api/workflow/investigation-status')return workflow.investigationStatus(body.jobId,actor);
      if(path==='/api/workflow/status')return {...workflow.status(),britt:workflow.brittFor(sessionToken,session.operator),routeHealth:Object.fromEntries(['wonder','baseten','fireworks'].map(provider=>[provider,routeHealth[provider]??{light: (provider==='wonder'?(env.MUSE_API_KEY?.trim()||env.MODEL_API_KEY?.trim()):env[provider==='baseten'?'BASETEN_API_KEY':'FIREWORKS_API_KEY']?.trim())?'UNCHECKED':'RED',reason:'Key unavailable',checkedAt:null}])),pendingConsents:workflow.pendingFor(sessionToken,session.operator),operator:session.operator,providers:{wonder:Boolean(env.MUSE_API_KEY?.trim()||env.MODEL_API_KEY?.trim()),baseten:Boolean(env.BASETEN_API_KEY?.trim()),fireworks:Boolean(env.FIREWORKS_API_KEY?.trim())}};
      if(path==='/api/workflow/britt-decide')return workflow.decideTasks(body.proposalId,body.action,actor,session.operator);
      if(path==='/api/workflow/task-move')return workflow.moveTask(body.taskId,body.status,session.operator,body.idempotencyKey);
      if(path==='/api/workflow/britt-draft'&&!['sample','wonder','baseten'].includes(body.provider))throw fail(400,'Choose a primary Meta route');
      if(path==='/api/workflow/review')return workflow.review(body.runId,body.optionId,actor,session.operator);
      if(path==='/api/workflow/confirm')return workflow.confirm(body.nonce,body.typed,actor,session.operator);
      if(path==='/api/workflow/revoke')return workflow.revoke(session.operator);
      if(path==='/api/workflow/shock')return workflow.shock(body.cellId,session.operator);
      if(path==='/api/workflow/reset')return workflow.reset(session.operator);
      if(path==='/api/workflow/verify')return workflow.verify();
      if(path==='/api/workflow/encrypted-export')return encryptPacket(workflow.exportPacket(),body.passphrase);
      if(path==='/api/workflow/export')return workflow.exportPacket();
      if(path==='/api/workflow/checkpoint')return workflow.exportCheckpoint();
      if(path==='/api/workflow/report')return workflow.exportReport();
      if(path==='/api/workflow/provider-check'){
        if(!['wonder','baseten','fireworks'].includes(body.provider))throw fail(400,'Select a live Meta route');
        const provider=body.provider,authEnv={wonder:'MUSE_API_KEY',baseten:'BASETEN_API_KEY',fireworks:'FIREWORKS_API_KEY'}[provider];
        const apiKey=env[authEnv]?.trim()||(provider==='wonder'?env.MODEL_API_KEY?.trim():null);
        const started=Date.now(),nonce='ROUTE_OK_'+randomBytes(12).toString('hex');let result,reason='Key unavailable',passed=false;
        const client=apiKey?createModelClient(provider==='wonder'?'wonder':'spark-open',{apiKey,fetchImpl,...(provider==='wonder'?{}:{route:provider==='baseten'?SPARK_BASETEN_ROUTE:SPARK_FIREWORKS_ROUTE})}):null;
        if(client){
          try{result=await client.complete({prompt:'Reply with exactly '+nonce+' and nothing else.',maxTokens:1024,timeoutMs:8000});passed=!result.sample&&result.modelId===client.route.model&&result.text.trim()===nonce;reason=passed?'Nonce and identity matched':'Nonce or identity mismatch';}
          catch(error){reason=Number.isInteger(error.status)?'HTTP '+error.status:error.name==='AbortError'?'Request deadline reached':'Provider request failed';}
        }
        workflow.recordModelCall({type:'model_call',operatorId:session.operator.id,operatorRole:session.operator.role,mode:'live',sample:false,provider,requestedModel:client?.route.model??null,returnedModel:result?.modelId??null,latencyMs:Date.now()-started,status:passed?'accepted':'rejected',failure:passed?null:'PREFLIGHT_FAILED',purpose:'provider_preflight',operationalRelease:false});
        return routeHealth[provider]={light:passed?'GREEN':'RED',reason,checkedAt:Date.now()};
      }
      if(path==='/api/workflow/britt-draft'&&body.provider==='sample')return workflow.draftTasks(createModelClient('sample'),actor,session.operator);
      if(body.provider==='sample')return path.endsWith('investigation-start')?workflow.startInvestigation(createModelClient('sample'),actor,session.operator):workflow.investigate(createModelClient('sample'),session.operator);
      if (!['wonder', 'baseten', 'fireworks'].includes(body.provider)) throw fail(400, 'Select wonder, baseten or fireworks');
      const authEnv = { wonder: 'MUSE_API_KEY', baseten: 'BASETEN_API_KEY', fireworks: 'FIREWORKS_API_KEY' }[body.provider];
      const apiKey=env[authEnv]?.trim() || (body.provider==='wonder'?env.MODEL_API_KEY?.trim():null);
      if (!apiKey) throw fail(503, `${authEnv} is unavailable`);
      const client = body.provider === 'wonder'
        ? createModelClient('wonder', { apiKey, fetchImpl })
        : createModelClient('spark-open', { apiKey, route: body.provider === 'baseten' ? SPARK_BASETEN_ROUTE : SPARK_FIREWORKS_ROUTE, fetchImpl });
      if(path==='/api/workflow/britt-draft')return workflow.draftTasks(client,actor,session.operator);
      if(path==='/api/workflow/investigation-start')return workflow.startInvestigation(client,sessionToken,session.operator);
      return workflow.investigate(client,session.operator);
    }
    if(path!=='/api/meta/respond')throw fail(404,'Unknown meta route');
    if (!['wonder', 'baseten', 'fireworks'].includes(body.provider)) throw fail(400, 'Select wonder, baseten or fireworks');
    if (typeof body.prompt !== 'string' || !body.prompt.trim() || body.prompt.length > 4000) throw fail(400, 'Prompt must contain 1 to 4000 characters');
    const authEnv = { wonder: 'MUSE_API_KEY', baseten: 'BASETEN_API_KEY', fireworks: 'FIREWORKS_API_KEY' }[body.provider];
    const apiKey=env[authEnv]?.trim() || (body.provider==='wonder'?env.MODEL_API_KEY?.trim():null);
    if (!apiKey) throw fail(503, `${authEnv} is unavailable`);
    const client = body.provider === 'wonder'
      ? createModelClient('wonder', { apiKey, fetchImpl })
      : createModelClient('spark-open', { apiKey, route: body.provider === 'baseten' ? SPARK_BASETEN_ROUTE : SPARK_FIREWORKS_ROUTE, fetchImpl });
    if(!workflow)throw fail(503,'Diagnostic inference requires a configured evidence ledger');
    let result;
    const started=Date.now();let failure=null;
    try {
      result = await client.complete({ prompt: `Read-only advisory response. Synthetic scenario ${snapshot.snapshotDigest}. Never approve operational release. User request: ${body.prompt}` });
      if(result.modelId!==client.route.model)throw new Error('Identity mismatch');
    } catch { failure='PROVIDER_REQUEST_OR_IDENTITY_FAILED';throw fail(502, 'Meta provider request failed'); }
    finally {
      workflow.recordModelCall({type:'model_call',operatorId:session.operator.id,operatorRole:session.operator.role,mode:'live',sample:false,provider:body.provider,requestedModel:client.route.model,returnedModel:result?.modelId??null,snapshotDigest:snapshot.snapshotDigest,latencyMs:Date.now()-started,status:failure?'rejected':'accepted',failure,usage:result?.usage??null,responseDigest:result?.text?createHash('sha256').update(result.text).digest('hex'):null,operationalRelease:false});
    }
    if (!result.text?.trim()) throw fail(502, 'Meta provider returned no text');
    // Provider text is untrusted, not a validated claim or an operational instruction.
    const secrets=[env.MUSE_API_KEY,env.MODEL_API_KEY,env.BASETEN_API_KEY,env.FIREWORKS_API_KEY,env.HACKATHON_ADMIN_TOKEN,env.HACKATHON_LEDGER_KEY,...accounts.map(a=>a.token)];
    return redactSecrets({ mode: result.mode, sample: result.sample, provider: body.provider,
      requestedModel: client.route.model, returnedModel: result.modelId, requestId: result.requestId,
      text: result.text, validation: 'UNVALIDATED_MODEL_OUTPUT', label: 'SYNTHETIC; ADVISORY ONLY',
      snapshotDigest: snapshot.snapshotDigest, operationalRelease: false }, secrets);
  };
}
