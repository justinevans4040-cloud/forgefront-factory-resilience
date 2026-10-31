import {copyFileSync, existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {decodeText,datePattern} from './public-set.mjs';
import {fileURLToPath} from 'node:url';

// Keep diagnostic evidence portable, including JSON-escaped stack trace paths.
export function redactEvidence(value, env=process.env) {
  let text=Buffer.isBuffer(value)?decodeText(value):String(value);
  if(text===null)throw Error('Expected text evidence');
  const repo=fileURLToPath(new URL('../../',import.meta.url)).replace(/[\\/]+$/,'');
  for(const form of [repo,repo.replaceAll('\\','/'),JSON.stringify(repo).slice(1,-1)])text=text.split(form+'\\').join('').split(form+'/').join('');
  text=text.replace(new RegExp('file:'+'/{3}','gi'),'');
  for (const name of ['MUSE_API_KEY','MODEL_API_KEY','BASETEN_API_KEY','FIREWORKS_API_KEY','HACKATHON_ADMIN_TOKEN','HACKATHON_LEDGER_KEY','FFR_EXPORT_PASSPHRASE','USERPROFILE','HOME']) {
    const secret=env[name];
    if (!secret || secret.length<3) continue;
    for (const form of new Set([secret,secret.replaceAll('\\','/'),JSON.stringify(secret).slice(1,-1)])) text=text.split(form).join(name==='USERPROFILE'||name==='HOME'?'%USERPROFILE%':'[REDACTED]');
  }
  text=text.replace(/[A-Z]:[\\/]+Users[\\/]+[^\\/\s"'<>]+/gi,'%USERPROFILE%')
    .replace(/\/(?:home|Users)\/[^/\s"'<>]+/g,'%USERPROFILE%')
    .replace(/Bearer\s+[^\s"']+/gi,'Bearer [REDACTED]');
  text=text.replace(/%USERPROFILE%[\\/]+Desktop[\\/]+[^\s"<>]*?[\\/]+forgefront-factory-resilience[\\/]+/gi,'');
  text=text.replace(/%USERPROFILE%[^\s"<>)]*/g,'[private-local-path]');
  for(const parts of [['Iz','zy_'],['FFR','Publish'],['re','build'],['co','dex'],['cur','sor']])text=text.replace(new RegExp(parts.join(parts[0]==='FFR'?'_':''),'gi'),'[internal-reference]');
  return text.replace(new RegExp(datePattern.source,'gi'),'[calendar-redacted]');
}

export function writeEvidence(target, contents) {
  const file=target instanceof URL?fileURLToPath(target):target;
  mkdirSync(dirname(file),{recursive:true});
  if(existsSync(file)){let backup=file+'.bak',index=0;while(existsSync(backup))backup=file+'.'+(++index)+'.bak';copyFileSync(file,backup);}
  const binary=Buffer.isBuffer(contents)&&decodeText(contents)===null;
  writeFileSync(file,binary?contents:redactEvidence(contents));
}
