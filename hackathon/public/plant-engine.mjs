// Shared deterministic plant calculations. No inference, I/O or demo identifiers.
const number=(n,label)=>{if(!Number.isFinite(n)||n<0)throw Error('Invalid '+label);return n;};
const sum=(items,field)=>items.reduce((total,item)=>total+item[field],0);
function unique(items,label){const map=new Map();for(const item of items){if(typeof item.id!=='string'||!item.id||map.has(item.id))throw Error('Invalid or duplicate '+label);map.set(item.id,item);}return map;}

export function compareQuantities(records){
 const groups=new Map();let recordCount=0;
 for(const record of records){if(!record.quantity)continue;const {value,unit}=record.quantity;number(value,'quantity');if(!unit)throw Error('Quantity unit required');const key=JSON.stringify([record.comparisonKey??record.materialId??null,unit]);if(!groups.has(key))groups.set(key,{comparisonKey:record.comparisonKey??record.materialId??null,unit,records:[],min:value,max:value});const group=groups.get(key);group.records.push(record);group.min=Math.min(group.min,value);group.max=Math.max(group.max,value);recordCount++;}
 return {recordCount,groups:[...groups.values()].map(g=>({...g,gap:g.max-g.min,matches:g.max===g.min}))};
}

export function indexPlant(plant){
 const machines=unique(plant.machines,'machine'),operations=unique(plant.operations,'operation'),lots=unique(plant.lots,'lot');
 const children=new Map(),indegree=new Map(),capabilities=new Map();
 for(const m of machines.values()){number(m.capacityHours,'capacity');number(m.hourlyCostUsd,'hourly cost');for(const c of new Set(m.capabilities)){if(!capabilities.has(c))capabilities.set(c,[]);capabilities.get(c).push(m);}}
 for(const op of operations.values()){
  number(op.hours,'operation hours');number(op.dueHours,'due window');
  if(!machines.has(op.machineId))throw Error('Unknown operation machine');
  if(!machines.get(op.machineId).capabilities.includes(op.capability))throw Error('Incompatible operation machine');
  for(const lot of op.lotIds??[])if(!lots.has(lot))throw Error('Unknown operation lot');
  if(new Set(op.dependsOn).size!==op.dependsOn.length)throw Error('Duplicate dependency');
  indegree.set(op.id,op.dependsOn.length);
  for(const id of op.dependsOn){if(!operations.has(id))throw Error('Unknown dependency');if(!children.has(id))children.set(id,[]);children.get(id).push(op.id);}
 }
 const order=[...operations.keys()].filter(id=>indegree.get(id)===0);
 for(let i=0;i<order.length;i++)for(const child of children.get(order[i])??[]){indegree.set(child,indegree.get(child)-1);if(indegree.get(child)===0)order.push(child);}
 if(order.length!==operations.size)throw Error('Plant dependency cycle');
 return {machines,operations,lots,children,order,capabilities};
}

function descendants(index,roots){const visited=new Set(roots),queue=[...visited];for(let i=0;i<queue.length;i++)for(const id of index.children.get(queue[i])??[])if(!visited.has(id)){visited.add(id);queue.push(id);}return visited;}
export function dependencyChain(plant,operationId){const index=indexPlant(plant);if(!index.operations.has(operationId))throw Error('Unknown operation');return [...descendants(index,[operationId])];}

function schedule(index,affected,policy,strategy){
 const usage=new Map(),finish=new Map(),assignments=[],unscheduled=[];
 for(const id of index.order){
  const op=index.operations.get(id),hit=affected.has(id),hours=op.hours+(hit&&strategy==='rework'?number(policy.reworkHoursPerOperation,'rework hours'):0);
  if(op.dependsOn.some(dep=>!finish.has(dep))){unscheduled.push(id);continue;}
  let earliest=hit?number(strategy==='expedite'?policy.expediteLeadHours:policy.releaseHours,'release hours'):0;
  for(const dep of op.dependsOn)earliest=Math.max(earliest,finish.get(dep));
  const candidates=hit&&strategy==='reroute'?index.capabilities.get(op.capability)??[]:[index.machines.get(op.machineId)];
  let best=null;
  for(const machine of candidates){
   if(machine.online===false||(hit&&strategy==='reroute'&&machine.id===op.machineId))continue;
   const used=usage.get(machine.id)??{hours:0,finish:0};if(used.hours+hours>machine.capacityHours)continue;
   const start=Math.max(earliest,used.finish),end=start+hours,cost=hours*machine.hourlyCostUsd;
   if(!best||end<best.finishHours||(end===best.finishHours&&cost<best.costUsd))best={operationId:id,machineId:machine.id,startHours:start,finishHours:end,hours,costUsd:cost};
  }
  if(!best){unscheduled.push(id);continue;}
  const used=usage.get(best.machineId)??{hours:0};usage.set(best.machineId,{hours:used.hours+hours,finish:best.finishHours});finish.set(id,best.finishHours);assignments.push(best);
 }
 let finishHours=0;for(const a of assignments)finishHours=Math.max(finishHours,a.finishHours);
 return {strategy,feasible:!unscheduled.length,assignments,unscheduled,finishHours,costUsd:sum(assignments,'costUsd')+(strategy==='expedite'?number(policy.expediteCostUsd,'expedite cost'):0)};
}

export function analyzePlant(plant,{lotId,failure,strategy='reroute'}={}){
 const index=indexPlant(plant),policy=plant.failurePolicies[failure];if(!policy)throw Error('Unknown failure policy');if(!index.lots.has(lotId))throw Error('Unknown failure lot');
 if(!['reroute','expedite','rework'].includes(strategy))throw Error('Unknown recovery strategy');
 const roots=plant.operations.filter(op=>(op.lotIds??[]).includes(lotId)).map(op=>op.id),affected=descendants(index,roots),depth=new Map();
 for(const id of index.order){let d=0;for(const dep of index.operations.get(id).dependsOn)d=Math.max(d,(depth.get(dep)??0)+1);depth.set(id,d);}
 const recovery=schedule(index,affected,policy,strategy),baseline=schedule(index,new Set(),{releaseHours:0},'baseline'),baselineFinish=new Map(baseline.assignments.map(a=>[a.operationId,a.finishHours])),recoveryFinish=new Map(recovery.assignments.map(a=>[a.operationId,a.finishHours]));
 const assignmentById=new Map(recovery.assignments.map(a=>[a.operationId,a])),rootSet=new Set(roots);
 let lostHours=0,exposureUsd=0,lateOrders=0,shipSlipHours=0;const orders=new Set();
 for(const id of affected){const op=index.operations.get(id);lostHours+=op.hours;exposureUsd+=op.hours*index.machines.get(op.machineId).hourlyCostUsd;
  const end=recoveryFinish.get(id);if(end===undefined||end>op.dueHours)orders.add(op.orderId??id);if(end!==undefined)shipSlipHours=Math.max(shipSlipHours,end-(baselineFinish.get(id)??0));
 }lateOrders=orders.size;
 const impactedMachines=new Set([...affected].map(id=>index.operations.get(id).machineId));
 return {machines:plant.machines.map(m=>({...m,state:impactedMachines.has(m.id)?'starved':m.online===false?'offline':'running'})),operations:plant.operations,affected:[...affected],cascade:index.order.filter(id=>affected.has(id)).map(id=>({operationId:id,machineId:index.operations.get(id).machineId,depth:depth.get(id),state:rootSet.has(id)?'blocked':'starved'})),evidence:compareQuantities(plant.evidence),metrics:{lostHours,exposureUsd,lateOrders,shipSlipHours},recovery,board:index.order.filter(id=>affected.has(id)).map(id=>{const op=index.operations.get(id),a=assignmentById.get(id);return {id:'recover-'+id,title:'Recover '+op.label,machineId:a?.machineId??op.machineId,dueHours:a?.finishHours??op.dueHours,dependsOn:op.dependsOn.filter(dep=>affected.has(dep)).map(dep=>'recover-'+dep),status:a?'To do':'Blocked'};})};
}
