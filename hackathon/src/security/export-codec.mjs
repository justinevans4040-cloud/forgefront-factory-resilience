import {passphraseFeedback} from '../../public/passphrase.mjs';
import {randomBytes, scrypt as derive, createCipheriv, createDecipheriv} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(derive);
// Pin documented parameters; do not rely on Node default drift.
const SCRYPT={N:16384,r:8,p:1,maxmem:64*1024*1024};
const aad=Buffer.from('FFR_ENCRYPTED_EXPORT_V1');
function check(passphrase){if(typeof passphrase!=='string'||passphrase.length<16||passphrase.length>160)throw Object.assign(Error('Use a separate export passphrase of 16 to 160 characters'),{status:400});}
export async function encryptPacket(packet,passphrase){
 const feedback=passphraseFeedback(passphrase);if(!feedback.ok)throw Object.assign(Error(feedback.message),{status:400});const salt=randomBytes(16),iv=randomBytes(12);const key=await scrypt(passphrase,salt,32,SCRYPT);
 const cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(aad);
 const data=Buffer.concat([cipher.update(JSON.stringify(packet),'utf8'),cipher.final()]);key.fill(0);
 return {format:'FFR_ENCRYPTED_EXPORT_V1',kdf:'scrypt-N16384-r8-p1',salt:salt.toString('base64'),iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:data.toString('base64')};
}
export async function decryptPacket(envelope,passphrase){
 check(passphrase);
 if(envelope.format!=='FFR_ENCRYPTED_EXPORT_V1'||envelope.kdf!=='scrypt-N16384-r8-p1'||Object.keys(envelope).sort().join(',')!=='data,format,iv,kdf,salt,tag')throw Error('INVALID_ENCRYPTED_EXPORT');
 const salt=Buffer.from(envelope.salt,'base64'),iv=Buffer.from(envelope.iv,'base64'),tag=Buffer.from(envelope.tag,'base64');
 if(salt.length!==16||iv.length!==12||tag.length!==16)throw Error('INVALID_ENCRYPTED_EXPORT');
 const key=await scrypt(passphrase,salt,32,SCRYPT);try{const cipher=createDecipheriv('aes-256-gcm',key,iv);cipher.setAAD(aad);cipher.setAuthTag(tag);return JSON.parse(Buffer.concat([cipher.update(Buffer.from(envelope.data,'base64')),cipher.final()]).toString('utf8'));}finally{key.fill(0);}
}
