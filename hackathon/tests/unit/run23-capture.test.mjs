import test from 'node:test';
import assert from 'node:assert/strict';
import * as capture from '../../scripts/capture-format.mjs';
test('lean screenshots change encoding only and retain actual viewport capture',()=>{
 assert.deepEqual(capture.screenshotCaptureOptions([]),{format:'png',captureBeyondViewport:false});
 assert.deepEqual(capture.screenshotCaptureOptions(['--jpeg-evidence']),{format:'jpeg',quality:90,captureBeyondViewport:false});
 assert.equal(capture.screenshotExtension(['--jpeg-evidence']),'jpg');
 assert.equal(capture.screenshotMime('frame.jpg'),'image/jpeg');
 assert.equal(capture.screenshotMime('frame.png'),'image/png');
});
