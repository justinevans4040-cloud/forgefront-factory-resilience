import {readFileSync,writeFileSync} from 'node:fs';
import {decryptPacket} from '../src/security/export-codec.mjs';
// Intentional plaintext output. Exclusive create refuses to overwrite any retained evidence.
try{
 const [source,destination]=process.argv.slice(2);
 if(!source||!destination||process.argv.length!==4)throw Error();
 const packet=await decryptPacket(JSON.parse(readFileSync(source,'utf8')),process.env.FFR_EXPORT_PASSPHRASE);
 writeFileSync(destination,JSON.stringify(packet,null,2),{flag:'wx',mode:0o600});
 console.log('PLAINTEXT EXPORT created. Protect the output and retain your checkpoint separately.');
}catch{console.error('Export decryption failed. Check paths, a new output filename and FFR_EXPORT_PASSPHRASE.');process.exitCode=1;}
