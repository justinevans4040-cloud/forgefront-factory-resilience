import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../server.mjs';
test('HttpOnly same-site session supports CSRF, protected logout and replay denial',async()=>{
 const app=createApp({models:{env:{HACKATHON_ADMIN_TOKEN:'synthetic-admin'}}});const addr=await app.listen(0);const base=`http://127.0.0.1:${addr.port}`;
 try{
 const r=await fetch(base+'/api/meta/session',{method:'POST',headers:{Authorization:'Bearer synthetic-admin'}});const s=await r.json();const cookie=r.headers.get('set-cookie');
 assert.match(cookie,/HttpOnly/);assert.match(cookie,/SameSite=Strict/);const headers={Cookie:cookie.split(';')[0],'Content-Type':'application/json','X-CSRF-Token':s.csrf};
 assert.equal((await fetch(base+'/api/analysis',{headers})).status,200);
 assert.equal((await fetch(base+'/api/meta/logout',{method:'POST',headers:{Cookie:headers.Cookie,'Content-Type':'application/json'},body:'{}'})).status,403);
 assert.equal((await fetch(base+'/api/meta/logout',{method:'POST',headers,body:'{}'})).status,200);
 assert.equal((await fetch(base+'/api/analysis',{headers})).status,401);
 }finally{await app.close();}
});
