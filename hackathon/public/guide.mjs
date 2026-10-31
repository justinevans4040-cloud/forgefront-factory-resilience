export function guideStep(state,guide){
 const current=state.snapshot.snapshotDigest;
 const live=(digest,providers)=>state.runs.some(r=>r.proposalValid&&!r.run.sample&&r.run.snapshotDigest===digest&&r.calls.some(c=>providers.includes(c.provider)));
 const step=(id,index,title,detail,target)=>({id,index,title,detail,target,total:8});
 if(!guide.inspected)return step('sources',0,'Inspect the discrepancy','Open the certificate and receiving evidence. Quantities come from this snapshot.','evidence');
 if(!live(guide.initialDigest,['baseten','fireworks']))return step('spark',1,'Let Spark Open investigate','Select Baseten or Fireworks. Run the bounded, read-only investigation. Sample cannot satisfy this live step.','investigate');
 if(!live(guide.initialDigest,['meta-model-api']))return step('wonder',2,'Ask Wonder for the tradeoff','Select Wonder and run on the same snapshot. Compare its advisory counterfactual with the calculated options.','investigate');
 if(!guide.acceptedInitial)return step('accept',3,'Make the human decision','Review a feasible option and type its exact APPROVE phrase. This records advice; no material is released.','options');
 if(current===guide.initialDigest)return step('shock',4,'Disrupt the plan again','Take CELL-MILL-2 offline. The old acceptance must become invalid.','shock');
 if(!live(current,['baseten','fireworks','meta-model-api']))return step('recover',5,'Reinvestigate changed capacity','Run your selected Meta route again. Compare the new constraints with the original run.','investigate');
 if(state.decision.status!=='accepted')return step('reaccept',6,'Review the revised recovery','Inspect the changed options and deliberately accept a feasible revised plan.','options');
 if(guide.exported!==state.ledger?.head||guide.verified!==state.ledger?.head||guide.checkpoint!==state.ledger?.head)return step('export',7,'Verify and retain evidence','Verify the ledger, export with a separate passphrase and retain the independent checkpoint separately.','encrypted-export');
 return step('complete',8,'Recovery story complete','The packet preserves live routes, source claims, the invalidated decision and revised acceptance.','ledger');
}
