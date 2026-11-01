import {readFileSync,copyFileSync,mkdirSync,writeFileSync,existsSync} from 'node:fs';
const iteration=process.argv[2];const dir='hackathon/evidence/run17/design-iteration-'+iteration;mkdirSync(dir,{recursive:true});
const captures=JSON.parse(readFileSync('hackathon/evidence/run17/primary-browser-offline/screens.json'));
const screens=captures.filter(s=>s.layout.viewport==='1366x768').map(s=>{const name=s.step===3?'consent-initial-desktop.png':s.step===7?'consent-revised-desktop.png':s.path.split('/').pop();copyFileSync('hackathon/evidence/run17/primary-browser-offline/'+name,dir+'/'+name);return {...s,path:'evidence/run17/design-iteration-'+iteration+'/'+name};});
writeFileSync(dir+'/screens.json',JSON.stringify(screens,null,2)+'\n');
if(existsSync('hackathon/design/screens.json'))copyFileSync('hackathon/design/screens.json','hackathon/design/screens.json.run17.bak');writeFileSync('hackathon/design/screens.json',JSON.stringify(screens,null,2)+'\n');
