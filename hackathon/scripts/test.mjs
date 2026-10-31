import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
// Explicit paths support Windows Node versions whose test runner does not expand globs.
const groups=process.argv.slice(2);const selected=groups.length?groups:['unit','integration'];
if(selected.some(group=>!['unit','integration'].includes(group)))throw Error('Select unit or integration');
const paths=selected.flatMap(group=>{const dir=new URL(`../tests/${group}/`,import.meta.url);return readdirSync(dir).filter(name=>name.endsWith('.test.mjs')).sort().map(name=>fileURLToPath(new URL(name,dir)));});
if(!paths.length)throw Error('No tests found');
const result=spawnSync(process.execPath,['--test',...paths],{stdio:'inherit',windowsHide:true});
process.exitCode=result.error?1:result.status??1;
