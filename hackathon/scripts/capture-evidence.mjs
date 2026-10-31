import {decodeText} from './public-set.mjs';
import {spawnSync} from 'node:child_process';
import {redactEvidence,writeEvidence} from './public-evidence.mjs';
// Usage: node hackathon/scripts/capture-evidence.mjs output.txt node --test ...
const [destination,command,...args]=process.argv.slice(2);
if(!destination||!command)throw Error('Provide output file, executable and arguments');
const result=spawnSync(command,args,{windowsHide:true,maxBuffer:32*1024*1024});
const output=redactEvidence(decodeText(result.stdout??Buffer.alloc(0))+decodeText(result.stderr??Buffer.alloc(0))+(result.error?'\nCapture command failed: '+result.error.message:''));
writeEvidence(destination,output);process.stdout.write(output);process.exitCode=result.error?1:result.status??1;
