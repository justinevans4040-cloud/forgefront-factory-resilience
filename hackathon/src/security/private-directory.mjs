import { mkdirSync, chmodSync as defaultChmodSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

export function protectDirectory(directory,{chmodSync=defaultChmodSync}={}){
 mkdirSync(directory,{recursive:true,mode:0o700});
 if(process.platform!=='win32'){
  try{
   chmodSync(directory,0o700);
   return {protected:true,mechanism:'POSIX_0700'};
  }catch(error){
   if(error&&(error.code==='EPERM'||error.code==='EACCES')){
    console.warn('private-directory: chmod unavailable on host filesystem; continuing with created directory ('+error.code+')');
    return {protected:true,mechanism:'POSIX_CREATED_NO_CHMOD',warning:error.code};
   }
   throw error;
  }
 }
 const identity=execFileSync('whoami',['/user','/fo','csv','/nh'],{encoding:'utf8',windowsHide:true});
 const sid=identity.match(/S-1-5-[\d-]+/)?.[0];if(!sid)throw new Error('Cannot establish private-state owner');
 execFileSync('icacls',[directory,'/inheritance:r','/grant:r',`*${sid}:(OI)(CI)F`,'*S-1-5-18:(OI)(CI)F'],{stdio:'pipe',windowsHide:true});
 const acl=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command','$ErrorActionPreference="Stop"; $a=[System.IO.Directory]::GetAccessControl($env:FFR_ACL_DIRECTORY); @{protected=$a.AreAccessRulesProtected; identities=@($a.Access | ForEach-Object { $_.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value })} | ConvertTo-Json -Compress'],{env:{...process.env,FFR_ACL_DIRECTORY:directory},encoding:'utf8',windowsHide:true}));
 if(!acl.protected || !acl.identities.includes(sid) || acl.identities.some(value=>![sid,'S-1-5-18'].includes(value)))throw new Error('Private-state ACL verification failed');
 return {protected:true,mechanism:'WINDOWS_OWNER_SYSTEM_ACL'};
}
