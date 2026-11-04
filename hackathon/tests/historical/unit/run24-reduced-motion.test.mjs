import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
test('reduced motion disables animation without erasing static SVG layout transforms',()=>{
 const css=readFileSync(new URL('../../public/style.css',import.meta.url),'utf8');
 assert.doesNotMatch(css,/\*,\*:before,\*:after\{[^}]*transform:none!important/);
});
