import {readdirSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
const top=new Set(['README.md','render.yaml','LICENSE','.env.example','.gitignore','.github/workflows/ci.yml']);
export function publicFiles(root){
 const out=[];
 const evidence=join(root,'hackathon','evidence');
 let newest=null;
 try{newest=readdirSync(evidence,{withFileTypes:true}).filter(e=>e.isDirectory()&&/^run\d+$/.test(e.name)).map(e=>e.name).sort((a,b)=>Number(b.slice(3))-Number(a.slice(3)))[0]??null;}catch(error){if(error.code!=='ENOENT')throw error;}
 function walk(dir,prefix=''){
  for(const entry of readdirSync(dir,{withFileTypes:true})){
   const file=prefix+entry.name;
   if(entry.isSymbolicLink())throw Error('Public set refuses symbolic links');
   if(entry.isDirectory()){
    if(/\.bak$/i.test(entry.name))continue;
    if(prefix==='hackathon/evidence/'&&/^run\d+$/.test(entry.name)&&entry.name!==newest)continue;
    if(['.git','node_modules','data','evidence-backups','.playwright-cli'].includes(entry.name))continue;
    if(!prefix&&!['hackathon','assets','.github','docs'].includes(entry.name))continue;
    walk(join(dir,entry.name),file+'/');
   }else if(!/\.bak$/i.test(file)&&(file.startsWith('hackathon/')||file.startsWith('assets/showcase/')||file.startsWith('assets/brand/')||file.startsWith('docs/')||top.has(file)))out.push(file);
  }
 }
 walk(root);return out.sort();
}
export function decodeText(buffer){
 if(buffer[0]===255&&buffer[1]===254)return buffer.subarray(2).toString('utf16le');
 if(buffer[0]===254&&buffer[1]===255){const copy=Buffer.from(buffer.subarray(2));copy.swap16();return copy.toString('utf16le');}
 if(buffer.length>3&&buffer[1]===0&&buffer[3]===0)return buffer.toString('utf16le');
 if(buffer.length>3&&buffer[0]===0&&buffer[2]===0&&buffer.length%2===0){const copy=Buffer.from(buffer);copy.swap16();return copy.toString('utf16le');}
 if(buffer.includes(0))return null;
 try{return new TextDecoder('utf-8',{fatal:true}).decode(buffer);}catch{return null;}
}
const year=String.raw`(?:19|20)\d{2}`,month=String.raw`(?:0?[1-9]|1[0-2])`,day=String.raw`(?:0?[1-9]|[12]\d|3[01])`;
const named=String.raw`(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)`;
export const datePattern=new RegExp(String.raw`(?<!\d)(?:${year}[-_/.]${month}(?:[-_/.]${day})?|${year}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])|${day}[-_/.]${month}[-_/.]${year})(?!\d)|\b(?:${named}\s+(?:${day},?\s+)?${year}|${day}\s+${named}\s+${year})\b`,'i');
export function auditText(value,file=''){
 const property=['cur','sor'].join('');
 const cssText=/^hackathon\/public\/.*\.css$/i.test(file)?value.split(/(\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g).map((part,index)=>index%2?part:part.replace(new RegExp('([;{]\\s*)'+property+'\\s*:\\s*[-a-z]+\\s*(?=[;}])','gi'),'$1')).join(''):value;
 // The disclosure address is deliberately public, only in the security policy.
 // Do not exempt other contacts, or this address embedded in another address.
 const contact=['justin','wakeforged.com'].join('@');
 const text=file==='hackathon/SECURITY.md'?cssText.replace(new RegExp('(?<![\\w.+-])'+contact.replace('.','\\.')+'(?![\\w.-])','gi'),'public-security-contact'):cssText;
 const checks={profile:new RegExp('C:[\\\\/]+Users','i'),fileUrl:new RegExp(['file:','','',''].join('/'),'i'),mirror:new RegExp(['Iz','zy_'].join(''),'i'),publish:new RegExp(['FFR','Publish'].join('_'),'i'),history:new RegExp(['re','build'].join(''),'i'),toolA:new RegExp(['co','dex'].join(''),'i'),toolB:new RegExp(property,'i'),date:datePattern,email:/[\w.+-]+@(?!example\.(?:invalid|com|org|net)\b)[\w.-]+\.[a-z]{2,}/i,phone:/(?<!\d)(?:\+\d{1,3}[ -]?)?\(?\d{3}\)?[ -]\d{3}[ -]\d{4}(?!\d)/,stale:/source\s+(?:stays|remains)\s+private|code\s+stays\s+private|no\s+code\s+in\s+public\s+repo/i};
 return Object.entries(checks).filter(([,pattern])=>pattern.test(text)).map(([kind])=>kind);
}
