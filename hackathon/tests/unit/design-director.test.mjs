import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reviewDesign} from '../../scripts/design-director.mjs';
test('design director sends real images to Wonder and validates design JSON',async()=>{
 const calls=[];const result=await reviewDesign({screens:[{step:1,image:'data:image/png;base64,AAAA',layout:{title:'Recovery'}}],env:{MUSE_API_KEY:'test-only'},fetchImpl:async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return new Response(JSON.stringify({model:'muse-wonder-1.0',output_text:JSON.stringify({direction:{grid:'full stage'},steps:[{step:1,score:8,fixes:[{priority:1,change:'Expand factory'}]}]})}));}});
 assert.equal(result.model,'muse-wonder-1.0');assert.equal(calls[0].body.input[0].content[1].type,'input_image');
});
test('design director falls back only to Baseten after Wonder failure',async()=>{
 const urls=[];await assert.rejects(reviewDesign({screens:[],env:{MUSE_API_KEY:'test',BASETEN_API_KEY:'test'},fetchImpl:async url=>{urls.push(url);return new Response('{}',{status:503});}}));assert.equal(urls.length,2);assert.ok(urls[1].includes('baseten'));
});
