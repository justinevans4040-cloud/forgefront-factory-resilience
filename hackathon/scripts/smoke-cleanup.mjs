import {rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,relative,isAbsolute} from 'node:path';

export async function cleanupSmokeScratch(scratch){
 const target=resolve(scratch),rel=relative(resolve(tmpdir()),target);
 // Browser and public-launch scratch folders only — never arbitrary paths.
 if(!/^ffr-(?:ui-smoke|visual-gate|workflow|public-tree|browser)-[^\\/]+$/.test(rel)||isAbsolute(rel))throw Error('Refuse unsafe smoke cleanup');
 await new Promise(resolve=>setTimeout(resolve,500));
 await rm(target,{recursive:true,force:true,maxRetries:10,retryDelay:300});
}
