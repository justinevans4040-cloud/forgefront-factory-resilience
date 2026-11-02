import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync,statSync} from 'node:fs';
import {join,extname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../..',import.meta.url));
const allowedExt=new Set(['.mjs','.js','.html','.css','.md']);
const scanRoots=['public','docs','README.md','RUN_GUIDE.md','SECURITY_CONTROLS.md','HACKATHON_CONTRIBUTIONS.md'];

function files(){
 const out=[];
 for(const entry of scanRoots){
  const path=join(root,entry);
  const st=statSync(path);
  if(st.isFile()){out.push(path);continue;}
  const walk=(dir)=>{for(const name of readdirSync(dir)){if(name.endsWith('.bak')||name.startsWith('_audit'))continue;const p=join(dir,name);const s=statSync(p);if(s.isDirectory())walk(p);else if(allowedExt.has(extname(name)))out.push(p);}};
  walk(path);
 }
 return out;
}

function bareBrittHits(text){
 const hits=[];const re=/\bBritt\b/g;let match;
 while((match=re.exec(text))){
  const start=match.index;
  const before=text.slice(Math.max(0,start-4),start);
  if(/The $/i.test(before)||/THE $/i.test(before))continue;
  const lineStart=text.lastIndexOf('\n',start)+1;
  const end=text.indexOf('\n',start);const line=text.slice(lineStart,end===-1?text.length:end).trim();
  if(/\bbritt-[a-z]|#britt|\/britt|britt\.|'britt'|"britt"|Britt Enterprise/i.test(line)&&!/<h2>|Approve |investigates|proposal|The Britt/i.test(line))continue;
  hits.push(line.slice(0,160));
 }
 return hits;
}

test('UI strings and public docs always say The Britt, never bare Britt',()=>{
 const hits=[];
 for(const file of files()){
  const rel=relative(root,file).replaceAll('\\','/');
  for(const line of bareBrittHits(readFileSync(file,'utf8')))hits.push(rel+': '+line);
 }
 assert.deepEqual(hits,[],'bare Britt remains in:\n'+hits.join('\n'));
});

test('Investigate heading and approve copy use The Britt',()=>{
 const html=readFileSync(new URL('../../public/index.html',import.meta.url),'utf8');
 assert.match(html,/<h2>The Britt investigates\.<\/h2>/);
 assert.doesNotMatch(html,/<h2>Britt investigates\.<\/h2>/);
 assert.match(html,/Approve The Britt/);
 assert.match(html,/authorize-wall/);
 assert.match(html,/Approve recovery/);
});
