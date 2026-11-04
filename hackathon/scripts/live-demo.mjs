import {readFileSync,writeFileSync,copyFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
export const LIVE_DEMO_URL='https://forgefront-factory-resilience.onrender.com';
export const DEMO_VIDEO_URL='https://youtu.be/CZSc0KaQ-Uc';
const root=new URL('../../',import.meta.url);
const files=['README.md','hackathon/README.md','hackathon/RUN_GUIDE.md'];
const standardBlock=()=>`<!-- live-demo:start -->\n**Live demo:** [Open the recovery room](${LIVE_DEMO_URL})\n<!-- live-demo:end -->`;
const rootBlock=()=>`<!-- live-demo:start -->
<!-- **Live demo:** [Open the recovery room](${LIVE_DEMO_URL}) -->
<!-- **Demo video · 2:55:** [Watch the complete demonstration](${DEMO_VIDEO_URL}) -->
<table>
  <tr>
    <td align="center" width="33%">
      <h3><a href="${LIVE_DEMO_URL}">LAUNCH THE LIVE APP →</a></h3>
      <strong>Enter the recovery room</strong><br />
      <sub>Run the complete decision workflow</sub>
    </td>
    <td align="center" width="34%">
      <h3><a href="${DEMO_VIDEO_URL}">WATCH THE 2:55 DEMO →</a></h3>
      <strong>See the story in motion</strong><br />
      <sub>YouTube · no account required</sub><br />
      <sub><a href="https://github.com/justinevans4040-cloud/forgefront-factory-resilience/releases/tag/demo-video-v14">Video details &amp; MP4</a></sub>
    </td>
    <td align="center" width="33%">
      <h3><a href="hackathon/docs/JUDGES_GUIDE.md">OPEN THE JUDGE GUIDE →</a></h3>
      <strong>Follow the winning path</strong><br />
      <sub>Rubric, model roles and verification</sub>
    </td>
  </tr>
</table>
<!-- live-demo:end -->`;
const block=file=>file==='README.md'?rootBlock():standardBlock();
export function checkLiveDemoDocs(){return files.filter(file=>!readFileSync(new URL(file,root),'utf8').replaceAll('\r\n','\n').includes(block(file)));}
export function syncLiveDemoDocs(){for(const file of files){const path=new URL(file,root),text=readFileSync(path,'utf8');if(!/<!-- live-demo:start -->[\s\S]*?<!-- live-demo:end -->/.test(text))throw Error('Live demo marker missing');const next=text.replace(/<!-- live-demo:start -->[\s\S]*?<!-- live-demo:end -->/,block(file));if(next===text)continue;let backup=fileURLToPath(path)+'.bak',i=0;while(existsSync(backup))backup=fileURLToPath(path)+'.'+(++i)+'.bak';copyFileSync(path,backup);writeFileSync(path,next);}}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){if(process.argv.includes('--write'))syncLiveDemoDocs();const stale=checkLiveDemoDocs();console.log(JSON.stringify({ok:!stale.length,stale}));process.exitCode=stale.length?1:0;}
