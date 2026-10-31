import {copyFileSync,mkdirSync,mkdtempSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,dirname,join,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {publicFiles} from './public-set.mjs';
import {auditPublicFiles} from './judge-check.mjs';
import {redactEvidence} from './public-evidence.mjs';
const source=fileURLToPath(new URL('../../',import.meta.url));
export function checkPublicTree(){
 const temporary=mkdtempSync(join(tmpdir(),'ffr-public-tree-'));const files=publicFiles(source);
 const env={...process.env};for(const name of Object.keys(env))if(/KEY|TOKEN|PASSPHRASE|HACKATHON_|FFR_/.test(name))delete env[name];
 try{
  for(const file of files){const destination=resolve(temporary,file);mkdirSync(dirname(destination),{recursive:true});copyFileSync(resolve(source,file),destination);}
  if(existsSync(join(temporary,'package.json')))throw Error('Unexpected root package');
  const npm=process.env.npm_execpath??join(dirname(process.execPath),'node_modules','npm','bin','npm-cli.js');
  if(!existsSync(npm))throw Error('Run through npm run check:public-tree so the npm entry is available');
  const tests=spawnSync(process.execPath,[npm,'test','--prefix','hackathon'],{cwd:temporary,env,encoding:'utf8',windowsHide:true,maxBuffer:32*1024*1024});
  process.stdout.write(redactEvidence((tests.stdout??'')+(tests.stderr??'')));
  const scan=auditPublicFiles({root:temporary});
  if(tests.error||tests.status!==0||scan.findings.length)throw Error('Public tree verification failed: '+JSON.stringify({testStatus:tests.status,findings:scan.findings}));
  return {files:files.length,tests:'pass',scan:'pass',keys:'absent',rootPackage:'absent',cleanup:'removed'};
 }finally{
  const path=resolve(temporary),parent=resolve(tmpdir()),rel=relative(parent,path);
  if(!rel||rel.startsWith('..')||isAbsolute(rel)||!rel.startsWith('ffr-public-tree-'))throw Error('Refuse unsafe temporary cleanup');
  rmSync(path,{recursive:true,force:true});
 }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(checkPublicTree(),null,2));
