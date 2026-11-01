import test from 'node:test';
import assert from 'node:assert/strict';
import {passphraseInputStatus} from '../../public/passphrase.mjs';
test('passphrase feedback reports length and unmet rules without reflecting the secret',()=>{
 for(const [secret,ok] of [['tiny',false],['aaaaaaaaaaaaaaaa',false],['orchid river cobalt lantern',true]]){
  const status=passphraseInputStatus(secret);
  assert.equal(status.ok,ok);
  assert.ok(status.message.includes(secret.length+'/160'));
  assert.ok(!status.message.includes(secret));
 }
 assert.match(passphraseInputStatus('tiny').message,/16/);
 assert.match(passphraseInputStatus('aaaaaaaaaaaaaaaa').message,/three/);
});
