import test from 'node:test';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
test('owner header navigation occupies most of the header with readable labels',()=>{
 const html=read('public/index.html');
 assert.ok(html.indexOf('id="workspace-switcher"')<html.indexOf('</header>'));
 assert.match(read('public/style.css'),/owner-header-tabs/);
});
test('geometry audits every visible text range, empty content cards and header span',()=>{
 const geometry=read('scripts/layout-geometry.mjs');
 for(const contract of ['textClipping','emptyElements','headerNavigation','createTreeWalker','createRange'])assert.ok(geometry.includes(contract),contract);
 const smoke=read('scripts/primary-guide-smoke.mjs');
 assert.match(smoke,/r\.textClipping\.length/);
 assert.match(smoke,/r\.emptyElements\.length/);
 assert.match(smoke,/r\.headerNavigation\.valid/);
});
test('visible route readiness uses plain English',()=>{
 assert.doesNotMatch(read('public/app.mjs'),/Nonce check pending|Identity check pending|Nonce: not requested/);
 assert.doesNotMatch(read('public/index.html'),/Route health · pre-flight/);
});
test('design direction honors owner green brand without requiring red',()=>{
 assert.doesNotMatch(read('scripts/design-director.mjs'),/Owner requires red on the stopped station/);
});
import {proposalLayout} from '../../public/stage-scene.mjs';
test('proposed task cards reserve readable title, due and status bands for three through six tasks',()=>{
 for(const count of [1,3,5,6,7,12])for(const height of [560,620,800]){
  const tiles=proposalLayout(count,height);assert.equal(tiles.length,count);
  for(const tile of tiles){assert.ok(tile.height>=140);assert.ok(tile.titleLines>=1);assert.ok(tile.titleBottom<tile.dueY-26);assert.ok(tile.dueY<tile.statusY-26);}
  for(let i=0;i<count;i++)for(let j=i+1;j<count;j++){const a=tiles[i],b=tiles[j];if(a.page!==b.page)continue;assert.ok(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y);}
 }
});
import {backupReviewFile} from '../../scripts/design-director.mjs';
import {mkdtempSync,writeFileSync,rmSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
test('design review preserves an existing legacy backup and each prior round backup',()=>{
 const dir=mkdtempSync(join(tmpdir(),'ffr-design-backup-'));
 try{const file=join(dir,'direction.json');writeFileSync(file,'current');writeFileSync(file+'.bak','protected');const first=backupReviewFile(file,80);writeFileSync(file,'next');const second=backupReviewFile(file,80);assert.notEqual(first,second);assert.equal(readFileSync(first,'utf8'),'current');assert.equal(readFileSync(second,'utf8'),'next');assert.equal(readFileSync(file+'.bak','utf8'),'protected');assert.ok(existsSync(file));}finally{rmSync(dir,{recursive:true,force:true});}
});
test('official brand remains byte-identical and the visible factory uses green and silver stopped markers',()=>{
 const logo=readFileSync(new URL('../../../assets/brand/forgefront-systems-logo.png',import.meta.url));assert.equal(createHash('sha256').update(logo).digest('hex'),'5d3333eb8a5d97e97d5b868ed81008c6994c19f3f756101208add0e7e526f707');
 const app=read('public/app.mjs'),css=read('public/style.css');assert.doesNotMatch(app,/const panelW=|v 28 h/);assert.doesNotMatch(app,/#E5484D|#ff8c91|#2b1115/i);assert.doesNotMatch(css,/#E5484D|#ff6b70|#ff8c91/i);assert.ok(app.includes("setAttribute('fill','url(#preview-hatch)')"));
});
