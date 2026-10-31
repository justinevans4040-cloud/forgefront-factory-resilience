import { readFileSync } from 'node:fs';
import { verifyCheckpoint } from '../src/packet.mjs';
try{const [packet,checkpoint]=process.argv.slice(2);const result=verifyCheckpoint(JSON.parse(readFileSync(packet,'utf8')),JSON.parse(readFileSync(checkpoint,'utf8')));console.log(JSON.stringify(result));if(!result.ok)process.exitCode=1;}
catch{console.error('Verification failed: supply packet and independently retained checkpoint JSON paths.');process.exitCode=1;}
