import { hkdfSync, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
// Domain-separated encryption key: never reuse the HMAC signing key as an AES key.
export function createStateCodec(secret) {
 if(typeof secret!=='string'||secret.length<12||secret.length>4096)throw new Error('STATE_KEY_REQUIRED');
 const key=Buffer.from(hkdfSync('sha256',secret,'forgefront-local-state','aes-gcm-v1',32));
 return {
  encode(value,purpose){
   const iv=randomBytes(12);const cipher=createCipheriv('aes-256-gcm',key,iv);
   cipher.setAAD(Buffer.from('forgefront-state-v1:'+purpose));
   const data=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);
   return JSON.stringify({format:'FFR_AES_GCM_V1',iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:data.toString('base64')});
  },
  decode(encoded,purpose){
   const envelope=JSON.parse(encoded);
   if(envelope.format!=='FFR_AES_GCM_V1')throw new Error('STATE_ENCRYPTION_REQUIRED');
   const iv=Buffer.from(envelope.iv,'base64'),tag=Buffer.from(envelope.tag,'base64');
   if(iv.length!==12||tag.length!==16)throw new Error('STATE_AUTHENTICATION_FAILED');
   const cipher=createDecipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from('forgefront-state-v1:'+purpose));cipher.setAuthTag(tag);
   return JSON.parse(Buffer.concat([cipher.update(Buffer.from(envelope.data,'base64')),cipher.final()]).toString('utf8'));
  }
 };
}
