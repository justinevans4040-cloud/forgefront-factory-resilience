import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createPublicBudget,publicRequestIdentity,isTrustedRenderProxy} from '../../src/security/public-budget.mjs';

test('public visitor identity ignores forged forwarding outside the host proxy',()=>{
 const req={socket:{remoteAddress:'203.0.113.9'},headers:{'x-forwarded-for':'198.51.100.3'}};
 assert.equal(publicRequestIdentity(req,()=>false),'203.0.113.9');
 req.socket.remoteAddress='10.0.0.2';req.headers['x-forwarded-for']='192.0.2.8, 198.51.100.3';
 assert.equal(publicRequestIdentity(req,ip=>isTrustedRenderProxy(ip,{RENDER:'true'})),'198.51.100.3');
 assert.equal(isTrustedRenderProxy('203.0.113.1',{RENDER:'true'}),false);
 assert.equal(isTrustedRenderProxy('10.0.0.2',{}),false);
});
test('public run limits isolate visitors, persist across restart and reset at the UTC day boundary',()=>{
 const dir=mkdtempSync(join(tmpdir(),'ffr-public-budget-')),path=join(dir,'budget.json');let now=86399000;
 const config={now:()=>now,visitorMaximum:2,dailyMaximum:3,persistence:{path,key:'synthetic-public-budget-key'}};
 try{
  let b=createPublicBudget(config);
  assert.equal(b.reserve('one').mode,'live');assert.equal(b.reserve('one').mode,'live');
  assert.equal(b.reserve('one').mode,'limited');assert.equal(b.reserve('two').mode,'live');
  b=createPublicBudget(config);assert.equal(b.reserve('three').mode,'sample');
  assert.ok(!readFileSync(path,'utf8').includes('one'));
  now=86400001;assert.equal(b.reserve('three').mode,'live');
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('daily exhaustion is sample fallback but visitor exhaustion is 429 before daily exhaustion',()=>{
 const b=createPublicBudget({visitorMaximum:1,dailyMaximum:2});
 assert.equal(b.reserve('a').mode,'live');assert.equal(b.reserve('a').mode,'limited');
 assert.equal(b.reserve('b').mode,'live');assert.equal(b.reserve('a').mode,'sample');
});
import {createRequestGuards} from '../../src/security/request.mjs';
test('public HTTPS origin still rejects forged origins and direct forwarded-proto headers',()=>{
 const req={socket:{remoteAddress:'203.0.113.1'},headers:{host:'factory.example.invalid',origin:'https://factory.example.invalid','x-forwarded-proto':'https'}};
 const guards=createRequestGuards({allowedHosts:['factory.example.invalid']});
 assert.throws(()=>guards.assertOrigin(req),/Origin not allowed/);
});
test('default public budget admits exactly three hundred live operations per UTC day',()=>{
 const budget=createPublicBudget();
 for(let i=0;i<300;i++)assert.equal(budget.reserve('visitor-'+i).mode,'live');
 assert.equal(budget.reserve('next-visitor').mode,'sample');
});
