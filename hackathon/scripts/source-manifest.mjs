import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {publicFiles,decodeText} from './public-set.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const target='hackathon/docs/SOURCE_MANIFEST.json';
const files=publicFiles(root).filter(path=>path!==target&&!path.startsWith('hackathon/evidence/'));
const manifest={
  scope:'Prepared publication set: source, tests, fixtures, design, assets and documentation; paths are repository-root relative. UTF-8 text is normalized to LF for portable checkout hashes; binary assets retain exact bytes. Excludes this manifest, retained execution evidence, private state and ignored backups. Historical tests and design records retain their explicit historical status.',
  algorithm:'SHA-256',
  files:files.map(path=>{const raw=readFileSync(resolve(root,path)),text=decodeText(raw);const bytes=text===null?raw:Buffer.from(text.replace(/\r\n/g,'\n'),'utf8');return {path,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};}),
};
const serialized=JSON.stringify(manifest,null,2)+'\n';
if(process.argv.includes('--write')){
  writeFileSync(resolve(root,target),serialized);
  console.log('Source manifest written: '+files.length+' files');
}else{
  const current=readFileSync(resolve(root,target),'utf8').replace(/\r\n/g,'\n');
  if(current!==serialized){console.error('Source manifest is stale; run node hackathon/scripts/source-manifest.mjs --write after reviewing the candidate.');process.exitCode=1;}
  else console.log('Source manifest matches '+files.length+' public files');
}
