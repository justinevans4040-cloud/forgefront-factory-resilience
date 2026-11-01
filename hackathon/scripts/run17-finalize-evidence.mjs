import {fileURLToPath} from 'node:url';
import {readFileSync,writeFileSync,copyFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {publicFiles} from './public-set.mjs';
const root=new URL('../../',import.meta.url),base=new URL('../',import.meta.url);
function save(name,value){const p=new URL(name,base);if(existsSync(p))copyFileSync(p,new URL(name+'.run17.bak',base));writeFileSync(p,JSON.stringify(value,null,2)+'\n');}
const captures=JSON.parse(readFileSync(new URL('evidence/run17/primary-browser-offline/screens.json',base)));
for(const iteration of [38,39])save('evidence/run17/design-iteration-'+iteration+'/screens.json',captures.filter(c=>c.layout.viewport==='1366x768').map(c=>({...c,path:'evidence/run17/design-iteration-'+iteration+'/'+c.path.split('/').pop()})));
const iterations=[38,39,40,41,42,43].filter(i=>existsSync(new URL('design/iteration-'+i+'.json',base))).map(iteration=>{const r=JSON.parse(readFileSync(new URL('design/iteration-'+iteration+'.json',base)));return {iteration,model:r.model,inputMode:r.inputMode,primaryFailures:r.primaryFailures,scores:r.steps.map(({step,score})=>({step,score})),manifest:'evidence/run17/design-iteration-'+iteration+'/screens.json'};});save('evidence/run17/design-results.json',{iterations,scorePolicy:'Unedited model returns',visualFreeze:iterations.at(-1).scores.every(s=>s.score>=9)});
const files=publicFiles(fileURLToPath(new URL('../../',import.meta.url))).filter(f=>f.startsWith('hackathon/')&&!f.startsWith('hackathon/evidence/')&&!f.includes('/_audit11-')&&f!=='hackathon/docs/SOURCE_MANIFEST.json');
save('docs/SOURCE_MANIFEST.json',{scope:'active Meta Hackathon build source, tests, fixtures, design and documentation; excludes evidence, backups and private state; uncommitted candidate',files:files.map(f=>{const b=readFileSync(new URL(f,root));return {path:f.slice('hackathon/'.length),bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')};})});
console.log(JSON.stringify({iterations:iterations.length,sourceFiles:files.length}));
