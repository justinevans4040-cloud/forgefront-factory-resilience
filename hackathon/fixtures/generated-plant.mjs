// Generated fixtures deliberately live outside the product engine.
const DEPARTMENTS=[
 {id:'Saw',capability:'mill'},
 {id:'CNC mills',capability:'mill'},
 {id:'CNC lathes',capability:'mill'},
 {id:'Heat treat',capability:'mill'},
 {id:'Inspection',capability:'mill'},
 {id:'Finishing',capability:'mill'},
 {id:'Assembly',capability:'mill'}
];
export function generatedPlant(size){
 if(!Number.isSafeInteger(size)||size<2)throw Error('Fixture requires at least two machines');
 const machines=Array.from({length:size},(_,i)=>{
  const dept=DEPARTMENTS[i%DEPARTMENTS.length];
  return {
   id:i===size-1?'machine-alternate':'machine-'+i,
   label:'Machine '+(i+1),
   department:dept.id,
   capabilities:[dept.capability],
   capacityHours:size*4,
   hourlyCostUsd:100,
   online:true
  };
 });
 const operations=Array.from({length:size},(_,i)=>({
  id:'op-'+i,
  label:'Operation '+(i+1),
  machineId:'machine-'+(i%(size-1)),
  capability:'mill',
  lotIds:i===0?['lot-primary']:[],
  hours:2,
  dueHours:size*4,
  dependsOn:i?['op-'+(i-1)]:[],
  orderId:'order-'+i
 }));
 return {
  label:'Generated plant',
  machines,
  operations,
  lots:[{id:'lot-primary'}],
  evidence:Array.from({length:size},(_,i)=>({id:'source-'+i,comparisonKey:'lot-primary',quantity:{value:i+1,unit:'each'}})),
  failurePolicies:{'wrong-cert':{releaseHours:0,reworkHoursPerOperation:1,expediteLeadHours:1,expediteCostUsd:100}}
 };
}
