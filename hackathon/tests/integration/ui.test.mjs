import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../../server.mjs';
import {readFileSync} from 'node:fs';
const screens=['incident','findings','decision','britt-replan','disrupt','evidence','shop','settings'];
test('current entry serves a closed self-hosted UI dependency graph under strict CSP and denies private paths',async()=>{
 const app=createApp({models:{env:{},fetchImpl:()=>{throw Error('Provider access prohibited');}}});const address=await app.listen(0);const base=`http://127.0.0.1:${address.port}`;
 try {
  const response=await fetch(base);assert.equal(response.status,200);
  const csp=response.headers.get('content-security-policy');assert.match(csp,/script-src 'self'/);assert.doesNotMatch(csp,/unsafe-inline|unsafe-eval/);
  const html=await response.text();assert.match(html,/src="\/ui\/kit\.mjs"/);assert.match(html,/<html lang="en"/);assert.match(html,/name="viewport"/);
  assert.doesNotMatch(html,/<script(?![^>]*src=)[^>]*>[\s\S]*?\S[\s\S]*?<\/script>/);
  const paths=['/ui/kit.mjs','/ui/diagnostics.mjs','/ui/theme.css','/ui/forgefront-logo.png','/favicon.png',...screens.flatMap(id=>[`/ui/screen-${id}.mjs`,`/ui/screen-${id}.css`])];
  for(const path of paths){const asset=await fetch(base+path);assert.equal(asset.status,200,path);assert.match(asset.headers.get('content-type'),path.endsWith('.mjs')?/javascript/:path.endsWith('.css')?/css/:/image/);}
  for(const path of ['/server.mjs','/src/workflow.mjs','/.env','/data/events.jsonl','/tests/unit/current-ui.test.mjs','/app.mjs','/style.css'])assert.equal((await fetch(base+path)).status,404,path);
 } finally {app.server.closeAllConnections();await app.close();}
});
