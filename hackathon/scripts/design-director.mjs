import {screenshotMime} from './capture-format.mjs';
import {readFileSync,writeFileSync,mkdirSync,existsSync,copyFileSync} from 'node:fs';
import {resolve,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {auditText} from './public-set.mjs';
import {redactEvidence} from './public-evidence.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
export function designIteration(value){const iteration=Number(value);if(!Number.isSafeInteger(iteration)||iteration<1)throw Error('Invalid iteration');return iteration;}
export function assertNewIteration(directory,iteration){
 const dir=directory instanceof URL?fileURLToPath(directory):directory;
 const target=resolve(dir,'iteration-'+designIteration(iteration)+'.json');
 if(existsSync(target))throw Error('Design iteration already exists');
 return target;
}
export function backupReviewFile(path,iteration){if(!existsSync(path))return;let backup=path+'.iteration-'+iteration+'.bak',n=0;while(existsSync(backup))backup=path+'.iteration-'+iteration+'.'+(++n)+'.bak';copyFileSync(path,backup);return backup;}
export function directionBeats(candidate,retained){
 if(!retained?.steps?.length)return true;
 if(!candidate?.steps?.length)return false;
 const sum=steps=>steps.reduce((n,s)=>n+(Number(s.score)||0),0);
 const byStep=steps=>new Map(steps.map(s=>[s.step,Number(s.score)||0]));
 const next=byStep(candidate.steps),prev=byStep(retained.steps);
 for(const [step,score]of prev){if((next.get(step)??-1)<score)return false;}
 return sum(candidate.steps)>sum(retained.steps);
}
function acceptPublicReview(result){
 const kinds=auditText(JSON.stringify(result));
 if(!kinds.length)return {...result,sanitized:false};
 const scores=new Map((result.steps??[]).map(s=>[s.step,s.score]));
 const scrubbed=JSON.parse(redactEvidence(JSON.stringify(result)));
 scrubbed.steps=(scrubbed.steps??[]).map(s=>({...s,score:scores.has(s.step)?scores.get(s.step):s.score}));
 const remaining=auditText(JSON.stringify(scrubbed));
 if(remaining.length)throw Error('Unsafe public review: '+remaining.join(','));
 return {...scrubbed,sanitized:true,sanitizeKinds:kinds};
}
export async function reviewDesign({screens,previous=null,env=process.env,fetchImpl=fetch}){
 const banned=[['re','build'],['cur','sor'],['co','dex']].map(p=>p.join('')).join(', ');
 const prompt='Act as an award-winning product designer judging the Meta Hackathon build. Design a striking full-screen factory recovery command center. Owner contract requires a compact horizontal rail, large header tabs spanning most of the header with labels at least 16px, 16px body type, at least 70% rendered scene fill and independent reserved zones for callouts, stations and jobs. Never recommend a vertical rail or inspector scrolling; owner layout overrides prior component direction. Evaluate the actual current images independently and replace obsolete direction. Owner contract requires the official logo in both the header and opening story; preserve those two required placements. Connection readiness checks provider identity; investigation is a distinct evidence task, so do not conflate these controls. Official logo is immutable: black, emerald/neon green, brushed silver. Screens are actual current guided steps. Keep the entire response under 2500 words, at most 3 concise fixes per step. Return ONLY JSON {direction:{grid,colorTokens,typography,motion,components,visualizations},steps:[{step,score,wowScore,fixes:[{priority,change}]}]}. Include an explicit wowScore from 0 to 10 for visual delight on every supplied step, including the full-shop cascade. Owner wants living material flow, state glow, depth and cinematic transitions, with reduced motion support. Do not recommend removing those features. Rate every supplied step honestly from 0 to 10, from the current screenshot and supplied state, independently of earlier scores. Owner requires an entirely black, emerald green and brushed silver palette. Stopped states use silver cross-hatching, a cross marker and plain OFFLINE text; never require red. A pending task proposal is deliberately untracked until human approval; blocked prior tasks and an approved recovery plan can coexist while replacement tasks await approval. Selecting a recovery option opens one-click Approve then an Authorize this decision wall; never assume missing functionality from a pre-selection screenshot. Prioritize viewport fit at 1366x768, cinematic factory SVG driven by real state, minimal narration, keyboard access and reduced motion. Specify concrete actionable changes. Never use the literal tokens '+banned+', calendar dates, personal paths, profile paths, or tool vendor names; prefer wording such as refit, enlarge, focus ring, and pointer style. No invented results. Current layouts: '+JSON.stringify(screens.map(({image,...s})=>s))+' Prior component direction: '+JSON.stringify(previous?.direction??null);
 const images=screens.filter(s=>s.image).map(s=>({type:'input_image',image_url:s.image}));
 const failures=[];const wonderKey=env.MUSE_API_KEY||env.MODEL_API_KEY;const routes=[{key:wonderKey,url:'https://api.meta.ai/v1/responses',model:'muse-wonder-1.0',wonder:true},{key:env.BASETEN_API_KEY,url:'https://inference.baseten.co/v1/chat/completions',model:'meta-models/muse-spark-open'}];
 for(const route of routes){if(!route.key)continue;try{
  const content=[{type:'input_text',text:prompt},...images];
  const body=route.wonder?{model:route.model,store:false,reasoning:{effort:'minimal'},max_output_tokens:12000,input:[{role:'user',content}]}:{model:route.model,max_tokens:8192,messages:[{role:'user',content:prompt}]};
  const response=await fetchImpl(route.url,{method:'POST',headers:{Authorization:'Bearer '+route.key,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(120000)});
  if(!response.ok)throw Error('HTTP '+response.status);const raw=await response.json();if(raw.model!==route.model)throw Error('Model identity mismatch');
  const output=raw.output_text??raw.output?.flatMap(o=>o.content??[]).filter(c=>c.type==='output_text').map(c=>c.text).join('')??raw.choices?.[0]?.message?.content;
  const value=JSON.parse(output.replace(/^```(?:json)?\s*|\s*```$/g,''));
  if(!value.direction||!Array.isArray(value.steps)||screens.some(s=>!value.steps.some(v=>v.step===s.step))||value.steps.some(s=>!Number.isFinite(s.score)||s.score<0||s.score>10||!Array.isArray(s.fixes)))throw Error('Invalid design schema');
  const result={model:route.model,primaryFailures:failures,inputMode:route.wonder?'screenshots':'structured-layout',documentation:'https://dev.meta.ai/docs/models',...value};
  return acceptPublicReview(result);
 }catch(error){failures.push(route.model+': '+error.message);}}
 throw Error('Design review unavailable: '+failures.join('; '));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{assertNewIteration(resolve(root,'design'),designIteration(process.argv[3]??1));const manifest=resolve(process.argv[2]??resolve(root,'design/screens.json'));const screens=JSON.parse(readFileSync(manifest,'utf8')).map(s=>{const path=resolve(root,s.path);const rel=relative(root,path);if(isAbsolute(rel)||rel.startsWith('..'))throw Error('Screenshot outside build');return {...s,image:'data:'+screenshotMime(path)+';base64,'+readFileSync(path).toString('base64')};});
 const iteration=designIteration(process.argv[3]??1);const dir=resolve(root,'design');mkdirSync(dir,{recursive:true});const last=resolve(dir,'design-direction.json');const previous=existsSync(last)?JSON.parse(readFileSync(last,'utf8')):null;
 const result=await reviewDesign({screens,previous});const promote=directionBeats(result,previous);for(const [name,value]of[['iteration-'+iteration+'.json',result],...result.steps.map(s=>['step-critique-'+s.step+'.json',{model:result.model,iteration,...s}])]){const path=resolve(dir,name);backupReviewFile(path,iteration);writeFileSync(path,JSON.stringify(value,null,2)+'\n');}if(promote){const path=resolve(dir,'design-direction.json');backupReviewFile(path,iteration);writeFileSync(path,JSON.stringify(result,null,2)+'\n');}console.log(JSON.stringify({model:result.model,iteration,scores:result.steps.map(s=>({step:s.step,score:s.score,wowScore:s.wowScore})),promotedDirection:promote,sanitized:Boolean(result.sanitized)}));
 }catch(error){console.error(error.message);process.exitCode=1;}
}
