import test from 'node:test';import assert from 'node:assert/strict';
import {plantTiles,plantGroups} from '../../public/plant-layout.mjs';
import {generatedPlant} from '../../fixtures/generated-plant.mjs';
import {jobShopPlant} from '../../fixtures/job-shop.mjs';
import {analyzePlant} from '../../public/plant-engine.mjs';
test('full shop has 45 machines and every failure computes a complete recovery and board',()=>{
 const p=jobShopPlant();assert.equal(p.machines.length,45);assert.equal(plantGroups(p.machines).length,7);
 for(const failure of Object.keys(p.failurePolicies))for(const strategy of ['reroute','expedite','rework']){
  const r=analyzePlant(p,{lotId:p.lots[0].id,failure,strategy});assert.equal(r.affected.length,p.operations.length);assert.equal(r.board.length,p.operations.length);assert.equal(r.recovery.feasible,true,failure+' '+strategy);assert.equal(r.metrics.lostHours,105);
  for(const a of r.recovery.assignments){const op=p.operations.find(o=>o.id===a.operationId);assert.ok(p.machines.find(m=>m.id===a.machineId).capabilities.includes(op.capability));if(strategy==='reroute')assert.notEqual(a.machineId,op.machineId);}
 }
});
for(const size of [2,40,1000,5000])for(const [width,height]of [[1920,1080],[1366,768]])test(`floor navigation retains ${size} machines at ${width}x${height}`,()=>{
 const items=generatedPlant(size).machines,seen=new Set();let page=0,pages=1;
 do{const r=plantTiles(items,{width:width-80,height:height-350,page});pages=r.pages;
  for(const a of r.tiles){seen.add(a.item.id);assert.ok(a.width>=180&&a.height>=92);assert.ok(a.x>=0&&a.y>=0&&a.x+a.width<=width-80+.01&&a.y+a.height<=height-350+.01);for(const b of r.tiles)if(a!==b)assert.ok(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y);}
  page++;
 }while(page<pages);assert.equal(seen.size,size);
});
test('department overview fills the floor with no empty trailing void',()=>{
 const groups=plantGroups(jobShopPlant().machines);
 assert.equal(groups.length,7);
 for(const [width,height]of [[1920-80,1080-350],[1366-80,768-350]]){
  const mins=height<360?{minWidth:190,minHeight:130}:{minWidth:210,minHeight:160};
  const layout=plantTiles(groups,{width,height,...mins});
  assert.equal(layout.pages,1);
  assert.equal(layout.tiles.length,7);
  const lastRowY=Math.max(...layout.tiles.map(t=>t.y));
  const lastRow=layout.tiles.filter(t=>t.y===lastRowY);
  const span=Math.max(...lastRow.map(t=>t.x+t.width));
  assert.ok(Math.abs(span-width)<0.5,'last row must span the full floor width');
  const covered=layout.tiles.reduce((sum,t)=>sum+t.width*t.height,0);
  assert.ok(covered/ (width*height) > 0.92,'department cards must fill the floor');
 }
});
