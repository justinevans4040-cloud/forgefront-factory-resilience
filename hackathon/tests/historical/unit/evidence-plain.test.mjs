import test from 'node:test';
import assert from 'node:assert/strict';
import {evidencePlainEnglish,evidenceDetailLabel} from '../../public/factory-layout.mjs';

test('evidence cards speak plain English quantities before raw IDs',()=>{
 assert.equal(evidencePlainEnglish({evidenceId:'ev-cert-qty',source:{documentId:'doc-cert-441',lineId:'L3'},quantity:{value:120,unit:'each'}}),'Certificate says 120');
 assert.equal(evidencePlainEnglish({evidenceId:'ev-recv-qty',source:{documentId:'doc-recv-882',recordId:'R1'},quantity:{value:80,unit:'each'}}),'Receiving counted 80');
 assert.equal(evidencePlainEnglish({evidenceId:'ev-sub-stock',source:{documentId:'doc-sub-100'},quantity:{value:100,unit:'each'}}),'Substitute available: 100');
 assert.equal(evidenceDetailLabel({evidenceId:'ev-cert-qty',source:{documentId:'doc-cert-441',lineId:'L3'}}),'ev-cert-qty · doc-cert-441 / L3');
});
