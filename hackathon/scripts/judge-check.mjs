import {readFileSync,existsSync} from 'node:fs';
import {publicFiles,decodeText,auditText,datePattern} from './public-set.mjs';
import {resolve,relative,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const read=p=>readFileSync(resolve(root,p),'utf8');
const trackedFiles=()=>publicFiles(root);
export function auditPublicFiles({root:base=root}={}){
  const files=publicFiles(base),findings=[];
  for(const file of files){
    if(datePattern.test(file))findings.push({file,kind:'date'});
    const text=decodeText(readFileSync(resolve(base,file)));if(text===null){if(!/\.(?:png|jpe?g|webp|gif|ico|pdf|woff2?)$/i.test(file))findings.push({file,kind:'encoding'});continue;}
    findings.push(...auditText(text,file).map(kind=>({file,kind})));
  }
  return {files:files.length,findings};
}
export function checkReadmeCommands(text=read('README.md')){
  const errors=[];
  for(const match of text.matchAll(/(?:^|[`\n])npm\s+(?:(?:run)\s+)?([\w:-]+)([^\n`]*)/g)){
    const [,script,args]=match;if(['install','ci','--version'].includes(script))continue;
    const prefix=args.match(/--prefix\s+([\w/.-]+)/)?.[1]??'.';
    if(!JSON.parse(read(prefix+'/package.json')).scripts?.[script])errors.push({script,prefix});
  }
  return errors;
}
// Follow local imports from the real entry. Include statically served assets and fixtures,
// which are loaded by fs/URL rather than imports. No copy, clone, install or staging needed.
export function checkTrackedDemo({tracked=new Set(trackedFiles())}={}){
  const required=new Set(['hackathon/package.json','hackathon/public/index.html','hackathon/public/style.css','hackathon/fixtures/scenario-v1.json']);
  const queue=['hackathon/scripts/rehearse.mjs','hackathon/public/app.mjs'];
  while(queue.length){const file=queue.pop();if(required.has(file))continue;required.add(file);
    if(!existsSync(resolve(root,file)))continue;
    for(const m of read(file).matchAll(/(?:from\s*|import\s*\(|new URL\(\s*)['"](\.[^'"]+)['"]/g)){
      const path=relative(root,resolve(root,dirname(file),m[1])).split(sep).join('/');
      if(/\.(?:mjs|json|html|css)$/.test(path)&&!required.has(path))queue.push(path);
    }
  }
  return {required:[...required].sort(),missing:[...required].filter(p=>!tracked.has(p)||!existsSync(resolve(root,p))).sort()};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const result={public:auditPublicFiles(),readme:checkReadmeCommands(),demo:checkTrackedDemo()};
  console.log(JSON.stringify(result,null,2));process.exitCode=result.public.findings.length||result.readme.length||result.demo.missing.length?1:0;
}
