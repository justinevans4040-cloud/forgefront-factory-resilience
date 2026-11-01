import {readFileSync,writeFileSync} from 'node:fs';
const path=new URL('../public/index.html',import.meta.url);
let html=readFileSync(path,'utf8');
const next='Protect your evidence packet <small id="passphrase-rules">Checklist: 16-160 characters · three distinct words or three character types · keep separately; it cannot be recovered.</small>';
const updated=html.replace(/Protect your evidence packet <small>[^<]*<\/small>/,next);
if(updated===html)throw Error('passphrase label not found');
writeFileSync(path,updated);
console.log('passphrase checklist label updated');
