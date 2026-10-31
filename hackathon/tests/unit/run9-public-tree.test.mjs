import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {auditPublicFiles} from '../../scripts/judge-check.mjs';
const forbidden=[['C:', 'Users'].join('\\'),['C:', 'Users'].join('/'),['file:', '', '', ''].join('/'),['Iz','zy_'].join(''),['FFR','Publish'].join('_'),['re','build'].join(''),['co','dex'].join(''),['cur','sor'].join('')];
for(const [index,value] of forbidden.entries())test('public scan rejects restricted pattern '+index,()=>{
 const root=mkdtempSync(join(tmpdir(),'ffr-scan-'));mkdirSync(join(root,'hackathon'));assert.deepEqual(auditPublicFiles({root}).findings,[]);writeFileSync(join(root,'hackathon','probe.txt'),value.toUpperCase());
 assert.ok(auditPublicFiles({root}).findings.length);
});
test('public scan decodes wide-character evidence and checks dated folders',()=>{
 const root=mkdtempSync(join(tmpdir(),'ffr-scan-'));const folder=join(root,'hackathon','evidence',['20','26','10','28'].join(''));mkdirSync(folder,{recursive:true});
 writeFileSync(join(folder,'probe.txt'),Buffer.concat([Buffer.from([255,254]),Buffer.from(forbidden[0]+'\\owner','utf16le')]));
 const findings=auditPublicFiles({root}).findings;assert.ok(findings.some(f=>f.kind==='profile'));assert.ok(findings.some(f=>f.kind==='date'));
});
test('public scan allows CSS pointer property only in its stylesheet',()=>{
 const root=mkdtempSync(join(tmpdir(),'ffr-scan-'));mkdirSync(join(root,'hackathon','public'),{recursive:true});
 const property=forbidden.at(-1);writeFileSync(join(root,'hackathon','public','style.css'),`button{${property}:pointer}`);assert.deepEqual(auditPublicFiles({root}).findings,[]);
 writeFileSync(join(root,'hackathon','public','style.css'),`/* ${property} */`);assert.ok(auditPublicFiles({root}).findings.length);
});
import {redactEvidence,writeEvidence} from '../../scripts/public-evidence.mjs';
import {readFileSync} from 'node:fs';
test('wide-character evidence writer emits portable UTF-8 and retains relative stack frames',()=>{
 const root=mkdtempSync(join(tmpdir(),'ffr-wide-')),target=join(root,'trace.txt');
 const local=['C:','Users','owner','Desktop',['FFR','Publish','20'+'261028'].join('_'),'forgefront-factory-resilience','hackathon','src','workflow.mjs:12:3'].join('/');
 const frame=['file:', '', '', local].join('/');writeEvidence(target,Buffer.concat([Buffer.from([255,254]),Buffer.from('at work ('+frame+')','utf16le')]));
 const output=readFileSync(target,'utf8');assert.ok(output.includes('hackathon/src/workflow.mjs:12:3'));assert.equal(readFileSync(target).includes(0),false);assert.deepEqual(auditPublicFiles({root}).findings,[]);
});
test('scanner covers dates in text, BOM-free wide text and cannot skip damaged text',()=>{
 const root=mkdtempSync(join(tmpdir(),'ffr-wide-'));mkdirSync(join(root,'hackathon'));
 const target=join(root,'hackathon','probe.txt');writeFileSync(target,Buffer.from(forbidden[0],'utf16le'));assert.ok(auditPublicFiles({root}).findings.length);
 writeFileSync(target,Buffer.from([0xff,0,0x23,0x24,0x25]));assert.ok(auditPublicFiles({root}).findings.some(f=>f.kind==='encoding'));
});
test('capture decodes wide-character child diagnostics before redaction',async()=>{
 const {spawnSync}=await import('node:child_process');const {fileURLToPath}=await import('node:url');const root=mkdtempSync(join(tmpdir(),'ffr-wide-capture-')),target=join(root,'trace.txt');
 const payload='wide diagnostic '+forbidden[0]+'\\owner';
 const result=spawnSync(process.execPath,[fileURLToPath(new URL('../../scripts/capture-evidence.mjs',import.meta.url)),target,process.execPath,'-e',`process.stdout.write(Buffer.concat([Buffer.from([255,254]),Buffer.from(${JSON.stringify(payload)},'utf16le')]));process.exitCode=7`],{encoding:'utf8'});
 assert.equal(result.status,7);assert.match(readFileSync(target,'utf8'),/wide diagnostic/);assert.equal(readFileSync(target).includes(0),false);assert.doesNotMatch(readFileSync(target,'utf8'),/owner/);
});
test('public scope excludes private review files and README links stay inside the public set',async()=>{
 const {publicFiles}=await import('../../scripts/public-set.mjs');const {resolve,dirname}=await import('node:path');const {fileURLToPath}=await import('node:url');
 const root=mkdtempSync(join(tmpdir(),'ffr-scope-'));writeFileSync(join(root,'private-review.md'),forbidden.join(' '));mkdirSync(join(root,'hackathon'));writeFileSync(join(root,'hackathon','safe.md'),'synthetic');assert.deepEqual(publicFiles(root),['hackathon/safe.md']);assert.deepEqual(auditPublicFiles({root}).findings,[]);
 const repo=fileURLToPath(new URL('../../../',import.meta.url));const files=new Set(publicFiles(repo));
 for(const match of readFileSync(join(repo,'README.md'),'utf8').matchAll(/(?:\]\(|src=")(?!https?:|#)([^)"#]+)[)"]/g))assert.ok(files.has(match[1]),'README reference must be public: '+match[1]);
});
test('dates are rejected in public contents and UTF-16 big endian is inspected',()=>{
 const root=mkdtempSync(join(tmpdir(),'ffr-calendar-'));mkdirSync(join(root,'hackathon'));const target=join(root,'hackathon','probe.txt');
 for(const sample of [['20','26','10','28'].join(''),['20'+'26','10','28'].join('-'),['October','28,','20'+'26'].join(' ')]){writeFileSync(target,sample);assert.ok(auditPublicFiles({root}).findings.some(f=>f.kind==='date'));}
 const wide=Buffer.from(forbidden[0],'utf16le');wide.swap16();writeFileSync(target,Buffer.concat([Buffer.from([254,255]),wide]));assert.ok(auditPublicFiles({root}).findings.some(f=>f.kind==='profile'));
});
test('restricted CSS wording in comments cannot masquerade as a property',()=>{
 const root=mkdtempSync(join(tmpdir(),'ffr-css-'));mkdirSync(join(root,'hackathon','public'),{recursive:true});
 writeFileSync(join(root,'hackathon','public','style.css'),`/* { ${forbidden.at(-1)}: pointer; } */`);assert.ok(auditPublicFiles({root}).findings.length);
});
test('calendar rules cover day-first, dotted and month-only dates',()=>{
 const root=mkdtempSync(join(tmpdir(),'ffr-calendar-'));mkdirSync(join(root,'hackathon'));const target=join(root,'hackathon','probe.txt');
 for(const sample of [['28','10','20'+'26'].join('/'),['20'+'26','10','28'].join('.'),['28','October','20'+'26'].join(' '),['October','20'+'26'].join(' '),['20'+'26','10'].join('-')]){writeFileSync(target,sample);assert.ok(auditPublicFiles({root}).findings.some(f=>f.kind==='date'),'reject calendar sample');}
});
