import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync,statSync} from 'node:fs';
import {join,extname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../..',import.meta.url));
const allowedExt=new Set(['.mjs','.js','.html','.css','.md','.json']);
const skipDirs=new Set(['node_modules','evidence','.git','design']);

function walk(dir,out=[]){
 for(const name of readdirSync(dir)){
  if(name.endsWith('.bak')||name.includes('.audit22.bak')||name.startsWith('_audit'))continue;
  const path=join(dir,name);const st=statSync(path);
  if(st.isDirectory()){if(!skipDirs.has(name))walk(path,out);continue;}
  if(allowedExt.has(extname(name)))out.push(path);
 }
 return out;
}

test('public product copy never names Britt with a version number',()=>{
 const hits=[];
 for(const file of walk(root)){
  const rel=relative(root,file).replaceAll('\\','/');
  if(rel.includes('evidence/')||rel.startsWith('design/iteration-')||rel.endsWith('SOURCE_MANIFEST.json')||rel.includes('scripts/_audit')||/run24-britt-name\.test\.mjs$/.test(rel))continue;
  const text=readFileSync(file,'utf8');
  if(/Britt\s*4(?:\.0)?\b/i.test(text)||/\b4\.0\b[^.\n]{0,20}Britt/i.test(text)||/Britt[^.\n]{0,20}\b4\.0\b/i.test(text)||/New Britt|Britt v4/i.test(text))hits.push(rel);
 }
 assert.deepEqual(hits,[],'versioned Britt labels remain in: '+hits.join(', '));
});
