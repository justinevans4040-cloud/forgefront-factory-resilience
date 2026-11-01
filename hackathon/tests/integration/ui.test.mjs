import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../server.mjs';
test('serves strict-CSP browser entry and denies private paths',async()=>{
 const app=createApp({models:{env:{}}});const a=await app.listen(0);const base=`http://127.0.0.1:${a.port}`;
 try{const r=await fetch(base);assert.equal(r.status,200);assert.match(r.headers.get('content-security-policy'),/script-src 'self'/);assert.match(await r.text(),/Recovery room|recovery room/);
 for(const path of ['/app.mjs','/style.css','/factory-layout.mjs'])assert.equal((await fetch(base+path)).status,200,path);
 for(const path of ['/server.mjs','/src/workflow.mjs','/.env','/data/events.jsonl'])assert.equal((await fetch(base+path)).status,404);
 }finally{await app.close();}
});
