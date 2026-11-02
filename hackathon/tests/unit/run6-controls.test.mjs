import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createWorkflow} from '../../src/workflow.mjs';
import {createClientLimiter} from '../../src/security/client-limit.mjs';
import {createApp} from '../../server.mjs';
test('global failed-login audit budget survives restart and rotating clients without scenario bootstrap',()=>{
 let time=100000;const options={directory:mkdtempSync(join(tmpdir(),'ffr-login-cap-')),key:'synthetic-ledger',now:()=>time};
 let w=createWorkflow(options);for(let i=0;i<100;i++)w.recordLoginFailure('client-'+i);
 let packet=w.exportPacket();assert.equal(packet.events.length,12);assert.equal(packet.events.at(-1).data.reason,'GLOBAL_AUDIT_CAP_REACHED');assert.equal(packet.events.at(-1).data.furtherAttemptsOmitted,true);assert.ok(packet.events.every(e=>e.type==='login_failed'));
 w=createWorkflow(options);w.recordLoginFailure('another');assert.equal(w.exportPacket().events.length,12);
 time+=60001;w.recordLoginFailure('fresh');assert.equal(w.exportPacket().events.length,13);
});
test('encrypted quotas retain independent client windows across restart and reset corruption instead of crashing',()=>{
 let time=100;const path=join(mkdtempSync(join(tmpdir(),'ffr-quota-')),'quota');const options={maximum:2,now:()=>time,persistence:{path,key:'synthetic-ledger'}};
 const a={socket:{remoteAddress:'private-client-a'}};let limit=createClientLimiter(options);assert.equal(limit(a).allowed,true);
 limit=createClientLimiter(options);assert.equal(limit(a).allowed,true);assert.equal(limit(a).allowed,false);assert.equal(limit({socket:{remoteAddress:'other'}}).allowed,true);
 assert.ok(!readFileSync(path,'utf8').includes('private-client-a'));time+=60001;limit=createClientLimiter(options);assert.equal(limit(a).allowed,true);
 writeFileSync(path,'corrupt');limit=createClientLimiter(options);assert.equal(limit(a).allowed,true);
});
test('clock rollback extends active quota windows instead of resetting them',()=>{
 let time=50_000;const path=join(mkdtempSync(join(tmpdir(),'ffr-quota-clock-')),'quota');
 const limit=createClientLimiter({maximum:1,windowMs:60_000,now:()=>time,persistence:{path,key:'synthetic-ledger'}});
 const client={socket:{remoteAddress:'clock-client'}};
 assert.equal(limit(client).allowed,true);
 time=40_000;
 assert.equal(limit(client).allowed,false);
 assert.ok(limit(client).retryAfter>=1);
});
test('quota persist failure after increment still grants the in-memory request',()=>{
 const missingParent=join(mkdtempSync(join(tmpdir(),'ffr-quota-fail-')),'missing','quota');
 const limit=createClientLimiter({maximum:2,persistence:{path:missingParent,key:'synthetic-ledger'}});
 assert.equal(limit({socket:{remoteAddress:'writer'}}).allowed,true);
});
test('createApp keeps serving when an encrypted quota snapshot is corrupt',()=>{
 const directory=mkdtempSync(join(tmpdir(),'ffr-quota-app-'));
 writeFileSync(join(directory,'quota-login.json'),'corrupt');
 const app=createApp({models:{env:{HACKATHON_DEMO_MODE:'1',HACKATHON_LEDGER_KEY:'synthetic-ledger',HACKATHON_ADMIN_TOKEN:'synthetic-admin',HACKATHON_STATE_DIR:directory}}});
 assert.ok(app);
});
