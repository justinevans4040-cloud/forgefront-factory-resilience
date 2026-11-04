import {readFileSync,existsSync} from 'node:fs';
import {publicFiles,decodeText,auditText,datePattern} from './public-set.mjs';
import {resolve,relative,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=fileURLToPath(new URL('../../',import.meta.url));
const read=p=>readFileSync(resolve(root,p),'utf8');
const trackedFiles=base=>{
 const result=spawnSync('git',['ls-files','-z'],{cwd:base,encoding:'utf8',windowsHide:true});
 if(result.error||result.status!==0)throw Error('Tracked dependency verification requires a Git checkout or an explicit tracked file set');
 return result.stdout.split('\0').filter(Boolean);
};
export function auditPublicFiles({root:base=root}={}){
  const files=publicFiles(base),findings=[];
  for(const file of files){
    if(datePattern.test(file))findings.push({file,kind:'date'});
    const text=decodeText(readFileSync(resolve(base,file)));if(text===null){if(!/\.(?:png|jpe?g|webp|gif|ico|pdf|woff2?)$/i.test(file))findings.push({file,kind:'encoding'});continue;}
    findings.push(...auditText(text,file).map(kind=>({file,kind})));
  }
  return {files:files.length,findings};
}
// Check public prose against the same exact copy set, including directory links.
export function checkPublicLinks({root:base=root}={}){
 const files=publicFiles(base),set=new Set(files),errors=[];
 for(const file of files.filter(f=>/\.md$/i.test(f))){
  const content=readFileSync(resolve(base,file),'utf8');
  for(const match of content.matchAll(/(?:\]\(|(?:src|href)=["'])([^)"'\s]+)[)"']/g)){
   const target=match[1];if(/^(?:https?:|mailto:|#)/i.test(target))continue;
   const clean=decodeURIComponent(target.split(/[?#]/)[0]);
   const path=relative(base,resolve(base,dirname(file),clean)).split(sep).join('/');
   if(!set.has(path)&&!files.some(f=>f.startsWith(path.replace(/\/$/,'')+'/')))errors.push({file,target});
  }
 }
 return errors;
}
export function checkReadmeCommands(text=read('README.md'),{root:base=root,directory='.'}={}){
  const errors=[];
  for(const match of text.matchAll(/(?:^|[`\n])npm\s+(?:(?:run)\s+)?([\w:-]+)([^\n`]*)/g)){
    const [,script,args]=match;if(['install','ci','--version'].includes(script))continue;
    const prefix=args.match(/--prefix\s+([\w/.-]+)/)?.[1]??'.';
    try{if(!JSON.parse(readFileSync(resolve(base,directory,prefix,'package.json'),'utf8')).scripts?.[script])errors.push({script,prefix});}
    catch{errors.push({script,prefix,kind:'command-package'});}
  }
  return errors;
}
export function checkJudgePitch(text){
 const errors=[];
 const forbidden=/\b(?:npm\s|Run locally|MUSE_API_KEY|MODEL_API_KEY|BASETEN_API_KEY|provider checks?|GREEN\/RED|Sample offline walkthrough|consent phrase|tamper-evident ledger|encrypted evidence packet|independent checkpoint)\b/i;
 if(forbidden.test(text))errors.push({kind:'pitch-setup-or-jargon'});
 const prose=text.replace(/<!--[\s\S]*?-->/g,'').trim();
 const lines=prose.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
 const live=/^\*\*Live demo:\*\*\s*\[[^\]]+\]\((https:\/\/[^\s)]+)\)$/i;
 const video=/^\*\*Demo video(?:\s*·\s*[^*\r\n]+)?:\*\*\s*(?:\[[^\]]+\]|\[!\[[^\]]*\]\([^)]+\)\])\((https:\/\/[^\s)]+)\)/i;
 if(!live.test(lines[0]??''))errors.push({kind:'pitch-live-entry'});
 if(!video.test(lines[1]??''))errors.push({kind:'pitch-video-placement'});
 if(!/^#\s+\S/m.test(prose))errors.push({kind:'pitch-heading'});
 if(!/!\[[^\]]+\]\((?:\.\.\/)?assets\/showcase\/current\/[^)]+\)/.test(prose))errors.push({kind:'pitch-current-screenshot'});
 if(!/Meta/i.test(prose)||!/Muse Spark Open/i.test(prose)||!/Baseten/i.test(prose))errors.push({kind:'pitch-model-integration'});
 if(!/\[[^\]]+\]\((?:hackathon\/)?docs\/META_MODEL_USAGE\.md\)/.test(prose))errors.push({kind:'pitch-model-guide'});
 if((text.match(/\[Run it yourself\]/g)??[]).length!==1)errors.push({kind:'pitch-run-guide'});
 return errors;
}
// Follow local imports from the real entry. Include statically served assets and fixtures,
// which are loaded by fs/URL rather than imports. No copy, clone, install or staging needed.
export function checkTrackedDemo({root:base=root,tracked=new Set(trackedFiles(base))}={}){
  const required=new Set(),queue=['hackathon/package.json','hackathon/public/index.html'];
  const enqueue=(file,target)=>{
    if(!/^(?:\.?\.?\/|\/)/.test(target)||target.includes('${'))return;
    const path=relative(base,target.startsWith('/')?resolve(base,'hackathon/public',target.slice(1)):resolve(base,dirname(file),target)).split(sep).join('/');
    if(/\.(?:m?js|json|html|css|svg|png|jpe?g|webp|ico|woff2?)$/i.test(path)&&!required.has(path))queue.push(path);
  };
  while(queue.length){const file=queue.pop();if(required.has(file))continue;required.add(file);
    if(!existsSync(resolve(base,file)))continue;
    if(!/\.(?:json|m?js|html|css)$/.test(file))continue;
    const content=readFileSync(resolve(base,file),'utf8');
    if(file==='hackathon/package.json'){
      const scripts=JSON.parse(content).scripts??{};
      for(const name of ['demo','rehearse','start','serve:public']){
        const entry=scripts[name]?.match(/^node\s+(?:--[\w=-]+\s+)*([\w/.-]+\.mjs)(?:\s|$)/)?.[1];
        if(entry)enqueue(file,'./'+entry);
      }
    }
    for(const match of content.matchAll(/(?:from\s*|import\s*(?:\(\s*)?|new URL\(\s*)['"]([^'"]+)['"]/g))enqueue(file,match[1]);
    if(/\.(?:html|m?js)$/.test(file))for(const match of content.matchAll(/(?:src|href)=["']([^"']+)["']/g))enqueue(file,match[1]);
    if(/\.css$/.test(file))for(const match of content.matchAll(/(?:url\(\s*|@import\s*)["']?([^'"\s)]+)["']?/g))enqueue(file,match[1]);
    // The shell deliberately loads screens by template. Expand its declared route
    // table, so a missing screen is detected even when the shell itself exists.
    const flow=content.match(/\bSCREEN_FLOW\s*=\s*\[([\s\S]*?)\]/)?.[1];
    if(flow)for(const match of flow.matchAll(/\bid\s*:\s*['"]([\w-]+)['"]/g)){
      for(const template of content.matchAll(/[`]([^`]*\$\{id\}[^`]*)[`]/g)){
        if(/^\/ui\/[\w${}./-]+\.(?:mjs|css)$/.test(template[1]))enqueue(file,template[1].replace('${id}',match[1]));
      }
    }
  }
  return {required:[...required].sort(),missing:[...required].filter(p=>!tracked.has(p)||!existsSync(resolve(base,p))).sort()};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const result={public:auditPublicFiles(),readme:[...checkJudgePitch(read('README.md')),...checkJudgePitch(read('hackathon/README.md')),...checkReadmeCommands(),...checkReadmeCommands(read('hackathon/README.md'),{directory:'hackathon'}),...checkReadmeCommands(read('hackathon/RUN_GUIDE.md'))],links:checkPublicLinks(),demo:checkTrackedDemo()};
  console.log(JSON.stringify(result,null,2));process.exitCode=result.public.findings.length||result.readme.length||result.links.length||result.demo.missing.length?1:0;
}
