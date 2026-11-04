import {redactEvidence} from './public-evidence.mjs';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
// Explicit paths support Windows Node versions whose test runner does not expand globs.
const groups=process.argv.slice(2);const selected=groups.length?groups:['unit','integration'];
if(selected.some(group=>!['unit','integration'].includes(group)))throw Error('Select unit or integration');
const historical=new Set(JSON.parse(readFileSync(new URL('../tests/historical/manifest.json',import.meta.url),'utf8')).historical.map(entry=>entry.file));
process.stdout.write(`Current UI suite: ${historical.size} superseded UI contract files retained as history, not counted as passing tests. See tests/historical/manifest.json.\n`);
const paths=selected.flatMap(group=>{const dir=new URL(`../tests/${group}/`,import.meta.url);return readdirSync(dir).filter(name=>name.endsWith('.test.mjs')&&!(group==='unit'&&historical.has(name))).sort().map(name=>fileURLToPath(new URL(name,dir)));});
if(!paths.length)throw Error('No tests found');
const result=spawnSync(process.execPath,['--test',...paths],{encoding:'utf8',windowsHide:true,maxBuffer:32*1024*1024});
process.stdout.write(redactEvidence((result.stdout??'')+(result.stderr??'')+(result.error?'\n'+result.error.message:'')));
process.exitCode=result.error?1:result.status??1;
