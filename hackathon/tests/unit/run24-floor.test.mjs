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
