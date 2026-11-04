import {readdirSync,readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';import {fileURLToPath} from 'node:url';
// Entity-count truncation is different from byte, timeout and abuse budgets.
// Keep the broad candidate inventory reviewable; the gate rejects numeric entity slices.
export function entityCaps(source){
 return source.split(/\r?\n/).flatMap((text,i)=>{
  const slice=/\b(?:machines|cells|jobs|tasks|records|evidence|quantities|memory|operations)\b[^;\n]*\.slice\(\s*(?:0\s*,\s*\d+|-\d+)\s*\)/;
  const count=/\b(?:tasks|machines|cells|jobs|operations|claims)\.length\s*(?:>\s*[1-9]\d*|<=\s*\d+)/;
  return slice.test(text)||count.test(text)?[{line:i+1,text:text.trim()}]:[];
 });
}
export function auditPlantCaps(base=new URL('../',import.meta.url)){
 const root=base instanceof URL?fileURLToPath(base):base,files=[];
 function walk(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const path=join(dir,e.name);if(e.isDirectory())walk(path);else if(e.name.endsWith('.mjs'))files.push(path);}}
 for(const dir of ['src','public'])walk(join(root,dir));
 return files.flatMap(path=>entityCaps(readFileSync(path,'utf8')).map(f=>({...f,file:path.substring(root.length).replaceAll('\\','/').replace(/^\//,'')})));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){const findings=auditPlantCaps();console.log(JSON.stringify({findings},null,2));process.exitCode=findings.length?1:0;}
