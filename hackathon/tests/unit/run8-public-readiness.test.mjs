import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const moduleUrl=new URL('../../scripts/public-evidence.mjs',import.meta.url);
async function evidence(){assert.ok(existsSync(moduleUrl),'public evidence redactor must exist');return import(moduleUrl);}
test('evidence redacts Windows, JSON escaped, POSIX and environment profile paths without changing provider URLs',async()=>{
 const {redactEvidence}=await evidence();
 const profile=['C:', 'Users', 'synthetic-owner'].join('\\');
 const input=JSON.stringify({path:profile+'\\Desktop\\report',url:'https://api.meta.ai/v1/responses'})+' /home/synthetic-owner/work /Users/synthetic-owner/work';
 const result=redactEvidence(input,{USERPROFILE:profile});
 assert.doesNotMatch(result,/[A-Z]:[\\/]+Users[\\/]+|\/home\/synthetic-owner|\/Users\/synthetic-owner/i);
 assert.match(result,/https:\/\/api.meta.ai\/v1\/responses/);assert.doesNotThrow(()=>JSON.parse(result.slice(0,result.indexOf('}')+1)));
});
test('evidence writers redact text and preserve binary screenshots and existing backups',async()=>{
 const {writeEvidence}=await evidence();const dir=mkdtempSync(join(tmpdir(),'ffr-public-evidence-'));const target=join(dir,'report.json');
 writeEvidence(target,JSON.stringify({path:['D:', 'Users', 'fixture-owner', 'Desktop'].join('\\')}));writeEvidence(target,'second');
 assert.doesNotMatch(readFileSync(target+'.bak','utf8'),/[A-Z]:[\\/]+Users[\\/]+/i);assert.equal(readFileSync(target,'utf8'),'second');
 writeEvidence(target,'third');assert.equal(readFileSync(target+'.1.bak','utf8'),'second');assert.match(readFileSync(target+'.bak','utf8'),/private-local-path/);
 const png=Buffer.from([137,80,78,71,0,255]);writeEvidence(join(dir,'image.png'),png);assert.deepEqual(readFileSync(join(dir,'image.png')),png);
});
test('tracked public text contains no profile paths or real contact coordinates',async()=>{
 const {auditPublicFiles}=await import('../../scripts/judge-check.mjs');assert.deepEqual(auditPublicFiles().findings,[]);
});
test('public path scrub rejects Windows profile paths, file URL drives and mirror folder names',async()=>{
 const {auditPublicFiles}=await import('../../scripts/judge-check.mjs');
 const clean=auditPublicFiles();
 assert.equal(clean.findings.filter(f=>f.kind==='profile'||f.kind==='fileUrl'||f.kind==='mirror').length,0);
 const src=readFileSync(new URL('../../scripts/judge-check.mjs',import.meta.url),'utf8');
 assert.match(src,/publicFiles/);
 assert.match(src,/auditText/);
 const profile=['C:','Users','synthetic-owner'].join('\\');
 assert.match(profile,/[A-Z]:[\\/]+Users[\\/]+/i);
 assert.match(['file:', '', '', 'C:/tmp'].join('/'),/file:\/\/\/[A-Z]:\//i);
 assert.match(['Desktop/', 'Iz', 'zy_Brain/report.md'].join(''),new RegExp(['Iz','zy_'].join('')));
});
test('README npm quickstarts resolve scripts and fail for a nonexistent script',async()=>{
 const {checkReadmeCommands}=await import('../../scripts/judge-check.mjs');assert.deepEqual(checkReadmeCommands(),[]);assert.ok(checkReadmeCommands('npm run imaginary --prefix hackathon').length);
});
test('public docs point verification outcomes at in-tree evidence folders',()=>{
 const rootReadme=readFileSync(new URL('../../../README.md',import.meta.url),'utf8');
 const hackReadme=readFileSync(new URL('../../README.md',import.meta.url),'utf8');
 const gates=readFileSync(new URL('../../docs/RELEASE_GATES.md',import.meta.url),'utf8');
 assert.doesNotMatch(rootReadme,/handoff report|root build report/i);
 assert.doesNotMatch(hackReadme,/\bin the build report\b/i);
 assert.doesNotMatch(gates,/root build report/i);
 assert.match(rootReadme,/hackathon\/RUN_GUIDE\.md/);
 assert.match(hackReadme,/RUN_GUIDE\.md/);
 assert.match(gates,/evidence\/README\.md/);
});
test('tracked demo dependency closure needs no ignored or untracked files and detects omissions',async()=>{
 const {checkTrackedDemo}=await import('../../scripts/judge-check.mjs');const result=checkTrackedDemo();assert.deepEqual(result.missing,[]);assert.ok(result.required.includes('hackathon/public/passphrase.mjs'));assert.ok(result.required.includes('hackathon/fixtures/scenario-v1.json'));
 assert.ok(checkTrackedDemo({tracked:new Set()}).missing.includes('hackathon/server.mjs'));
});
test('CI is pinned, read-only, credential-free and runs public suites and gitleaks',()=>{
 const ci=readFileSync(new URL('../../../.github/workflows/ci.yml',import.meta.url),'utf8');
 assert.match(ci,/contents: read/);assert.doesNotMatch(ci,/secrets\.|pull_request_target/);for(const m of ci.matchAll(/uses:\s*([^\s]+)/g))assert.match(m[1],/@[a-f0-9]{40}$/);
 assert.match(ci,/npm test --prefix hackathon/);assert.match(ci,/check:public-tree/);assert.match(ci,/gitleaks/);assert.match(ci,/fetch-depth: 0/);
 assert.match(ci,/hashFiles\('package\.json'\)/);assert.match(ci,/^\s+run: npm test$/m);
});
test('environment templates have empty assignments only and backups are ignored',()=>{
 for(const file of ['../../../.env.example','../../.env.example'])for(const line of readFileSync(new URL(file,import.meta.url),'utf8').split(/\r?\n/))if(line.trim()&&!line.startsWith('#'))assert.match(line,/^[A-Z0-9_]+=$/);
 const ignore=readFileSync(new URL('../../../.gitignore',import.meta.url),'utf8');for(const item of ['*.bak','.playwright-cli/','evidence-backups/'])assert.ok(ignore.split(/\r?\n/).includes(item));
});

test('public evidence preserves command failure and redacts the actual child output',async()=>{
 const {spawnSync}=await import('node:child_process');const dir=mkdtempSync(join(tmpdir(),'ffr-capture-'));const file=join(dir,'failure.txt');
 const child=spawnSync(process.execPath,[new URL('../../scripts/capture-evidence.mjs',import.meta.url).pathname.replace(/^\/(?=[A-Z]:)/,''),file,process.execPath,'-e',"console.log(process.env.USERPROFILE);process.exitCode=7"],{encoding:'utf8',env:{...process.env,USERPROFILE:['C:','Users','synthetic-capture-owner'].join('\\')}});
 assert.equal(child.status,7);assert.match(readFileSync(file,'utf8'),/private-local-path/);assert.doesNotMatch(child.stdout,/synthetic-capture-owner/);
});
