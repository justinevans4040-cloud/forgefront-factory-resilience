import { createApp } from '../server.mjs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
// Local isolated rehearsal only. This public test credential is never a production default.
const env={...process.env,HACKATHON_OPERATORS_JSON:'',HACKATHON_ADMIN_TOKEN:'synthetic-browser-rehearsal',HACKATHON_LEDGER_KEY:randomBytes(32).toString('hex'),HACKATHON_STATE_DIR:mkdtempSync(join(tmpdir(),'ffr-browser-'))};
const app=createApp({models:{env}});const addr=await app.listen(Number(process.env.HACKATHON_DEMO_PORT??8791),'127.0.0.1');
console.log(`Isolated synthetic recovery room: http://127.0.0.1:${addr.port}`);
console.log('Operator test token: synthetic-browser-rehearsal (public synthetic credential only)');
console.log('Muse Wonder / muse-wonder-1.0: '+(env.MUSE_API_KEY?.trim()||env.MODEL_API_KEY?.trim()?'configured; live identity checked on each run':'KEY UNAVAILABLE; fails closed'));
console.log('Muse Spark Open / Baseten: '+(env.BASETEN_API_KEY?.trim()?'configured':'KEY UNAVAILABLE; fails closed'));
console.log('Muse Spark Open / Fireworks: '+(env.FIREWORKS_API_KEY?.trim()?'configured':'KEY UNAVAILABLE; fails closed'));
console.log('No model runs until explicitly selected. Sample is explicit-only. Ctrl+C stops the server.');
let closing=false;async function stop(){if(closing)return;closing=true;await app.close();}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
