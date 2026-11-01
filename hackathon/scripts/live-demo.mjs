import {readFileSync,writeFileSync,copyFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
export const LIVE_DEMO_URL='https://forgefront-factory-resilience.onrender.com';
const root=new URL('../../',import.meta.url);
const files=['README.md','hackathon/README.md','hackathon/RUN_GUIDE.md'];
const block=()=>`<!-- live-demo:start -->\n**Live demo:** [Open the recovery room](${LIVE_DEMO_URL})\n<!-- live-demo:end -->`;
export function checkLiveDemoDocs(){return files.filter(file=>!readFileSync(new URL(file,root),'utf8').replaceAll('\r\n','\n').includes(block()));}
export function syncLiveDemoDocs(){for(const file of files){const path=new URL(file,root),text=readFileSync(path,'utf8');if(!/<!-- live-demo:start -->[\s\S]*?<!-- live-demo:end -->/.test(text))throw Error('Live demo marker missing');const next=text.replace(/<!-- live-demo:start -->[\s\S]*?<!-- live-demo:end -->/,block());if(next===text)continue;let backup=fileURLToPath(path)+'.bak',i=0;while(existsSync(backup))backup=fileURLToPath(path)+'.'+(++i)+'.bak';copyFileSync(path,backup);writeFileSync(path,next);}}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){if(process.argv.includes('--write'))syncLiveDemoDocs();const stale=checkLiveDemoDocs();console.log(JSON.stringify({ok:!stale.length,stale}));process.exitCode=stale.length?1:0;}
