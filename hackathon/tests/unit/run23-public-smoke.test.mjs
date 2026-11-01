import {test} from 'node:test';
import assert from 'node:assert/strict';
import {publicSmokeConfig} from '../../scripts/browser-options.mjs';
test('public smoke retains production quotas and can force daily fallback without sending live requests',()=>{
 assert.equal(publicSmokeConfig([]),undefined);
 assert.deepEqual(publicSmokeConfig(['--public-hosting']),{});
 assert.deepEqual(publicSmokeConfig(['--public-fallback']),{dailyMaximum:0});
});
