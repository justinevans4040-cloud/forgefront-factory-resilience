import {readFileSync,writeFileSync,mkdirSync,existsSync,copyFileSync} from 'node:fs';
import {resolve,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {auditText} from './public-set.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
export async function reviewDesign({screens,previous=null,env=process.env,fetchImpl=fetch}){
 const prompt='Act as an award-winning product designer judging the Meta Hackathon build. Design a striking full-screen factory recovery command center. Owner contract requires the official logo in both the header and opening story; preserve those two required placements. Route pre-flight checks nonce/identity health; investigation is a distinct evidence task, so do not conflate these controls. Official logo is immutable: black, emerald/neon green, brushed silver. Screens are actual current guided steps. Keep the entire response under 2500 words, at most 3 concise fixes per step. Return ONLY JSON {direction:{grid,colorTokens,typography,motion,components,visualizations},steps:[{step,score,fixes:[{priority,change}]}]}. Rate every supplied step honestly from 0 to 10, from the current screenshot and supplied state, independently of earlier scores. Owner requires red on the stopped station, so preserve that exception to the emerald/silver palette. A pending task proposal is deliberately untracked until human approval; blocked prior tasks and an approved recovery plan can coexist while replacement tasks await approval. Selecting a recovery option opens the typed consent form; never assume missing functionality from a pre-selection screenshot. Prioritize viewport fit at 1366x768, cinematic factory SVG driven by real state, minimal narration, keyboard access and reduced motion. Specify concrete actionable changes. No invented results, dates, personal paths or tool vendors. Current layouts: '+JSON.stringify(screens.map(({image,...s})=>s))+' Prior component direction: '+JSON.stringify(previous?.direction??null);
 const images=screens.filter(s=>s.image).map(s=>({type:'input_image',image_url:s.image}));
 const failures=[];const routes=[{key:env.MUSE_API_KEY,url:'https://api.meta.ai/v1/responses',model:'muse-wonder-1.0',wonder:true},{key:env.BASETEN_API_KEY,url:'https://inference.baseten.co/v1/chat/completions',model:'meta-models/muse-spark-open'}];
 for(const route of routes){if(!route.key)continue;try{
  const content=[{type:'input_text',text:prompt},...images];
  const body=route.wonder?{model:route.model,store:false,reasoning:{effort:'minimal'},max_output_tokens:12000,input:[{role:'user',content}]}:{model:route.model,max_tokens:8192,messages:[{role:'user',content:prompt}]};
  const response=await fetchImpl(route.url,{method:'POST',headers:{Authorization:'Bearer '+route.key,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(55000)});
  if(!response.ok)throw Error('HTTP '+response.status);const raw=await response.json();if(raw.model!==route.model)throw Error('Model identity mismatch');
  const output=raw.output_text??raw.output?.flatMap(o=>o.content??[]).filter(c=>c.type==='output_text').map(c=>c.text).join('')??raw.choices?.[0]?.message?.content;
  const value=JSON.parse(output.replace(/^```(?:json)?\s*|\s*```$/g,''));
  if(!value.direction||!Array.isArray(value.steps)||screens.some(s=>!value.steps.some(v=>v.step===s.step))||value.steps.some(s=>!Number.isFinite(s.score)||s.score<0||s.score>10||!Array.isArray(s.fixes)))throw Error('Invalid design schema');
  const result={model:route.model,primaryFailures:failures,inputMode:route.wonder?'screenshots':'structured-layout',documentation:'https://dev.meta.ai/docs/models',...value};if(auditText(JSON.stringify(result)).length)throw Error('Unsafe public review');return result;
 }catch(error){failures.push(route.model+': '+error.message);}}
 throw Error('Design review unavailable: '+failures.join('; '));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const manifest=resolve(process.argv[2]??resolve(root,'design/screens.json'));const screens=JSON.parse(readFileSync(manifest,'utf8')).map(s=>{const path=resolve(root,s.path);const rel=relative(root,path);if(isAbsolute(rel)||rel.startsWith('..'))throw Error('Screenshot outside build');return {...s,image:'data:image/png;base64,'+readFileSync(path).toString('base64')};});
 const iteration=Number(process.argv[3]??1);if(!Number.isInteger(iteration)||iteration<1||iteration>20)throw Error('Invalid iteration');const dir=resolve(root,'design');mkdirSync(dir,{recursive:true});const last=resolve(dir,'design-direction.json');const previous=existsSync(last)?JSON.parse(readFileSync(last,'utf8')):null;
 const result=await reviewDesign({screens,previous});for(const [name,value]of [['design-direction.json',result],['iteration-'+iteration+'.json',result],...result.steps.map(s=>['step-critique-'+s.step+'.json',{model:result.model,iteration,...s}])]){const path=resolve(dir,name);if(existsSync(path))copyFileSync(path,path+'.bak');writeFileSync(path,JSON.stringify(value,null,2)+'\n');}console.log(JSON.stringify({model:result.model,iteration,scores:result.steps.map(s=>({step:s.step,score:s.score}))}));
 }catch(error){console.error(error.message);process.exitCode=1;}
}
