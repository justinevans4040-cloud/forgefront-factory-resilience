const stepLabels={sources:'Inspect the discrepancy',sample:'Investigate the offline scenario',spark:'Let Spark Open investigate',wonder:'Ask Wonder for the tradeoff',accept:'Make the human decision',board:'Britt turns the decision into work',shock:'Disrupt the plan again',recover:'Reinvestigate changed capacity',reaccept:'Review the revised recovery','board-revised':'Britt replans the recovery work',export:'Verify and retain evidence',complete:'Recovery story complete'};
export function guidedSteps(mode,withBoard=false){return ['sources',...(mode==='offline'?['sample']:['spark','wonder']),'accept',...(withBoard?['board']:[]),'shock','recover','reaccept',...(withBoard?['board-revised']:[]),'export','complete'].map(id=>({id,title:stepLabels[id]}));}
export function guideStep(state,guide){
 const current=state.snapshot.snapshotDigest;
 const live=(digest,providers)=>state.runs.some(r=>r.proposalValid&&!r.run.sample&&r.run.snapshotDigest===digest&&r.calls.some(c=>providers.includes(c.provider)));
 const offline=guide.mode==='offline';
 const sample=digest=>state.runs.some(r=>r.proposalValid&&r.run.sample&&r.run.snapshotDigest===digest);
 const order=guidedSteps(offline?'offline':'live',Boolean(guide.boardEnabled)).map(s=>s.id);
 const step=(id,index,title,detail,target)=>({id,index:guide.boardEnabled?Math.max(0,order.indexOf(id)):(offline&&index>=3?index-1:index),title:stepLabels[id]??title,detail,target,total:guide.boardEnabled?order.length-1:(offline?7:8)});
 if(current!==guide.initialDigest&&(offline?!sample(guide.initialDigest):(!live(guide.initialDigest,['baseten','fireworks'])||!live(guide.initialDigest,['meta-model-api']))))return step('restart',0,'Restart for this investigation mode','The earlier snapshot needs a complete comparison in this mode. Start a fresh guided recovery to follow the full story.','guide-start');
 if(!guide.inspected)return step('sources',0,'Inspect the discrepancy','Open the certificate and receiving evidence. Quantities come from this snapshot.','evidence');
 if(offline&&!sample(guide.initialDigest))return step('sample',1,'Investigate the offline scenario','Select Sample deliberately, then investigate the source records and calculated options.','investigate');
 if(!offline&&!live(guide.initialDigest,['baseten','fireworks']))return step('spark',1,'Let Spark Open investigate','Select Baseten. Run the bounded, read-only investigation. Choose a GREEN live route; Sample offers a separate offline walkthrough.','investigate');
 if(!offline&&!live(guide.initialDigest,['meta-model-api']))return step('wonder',2,'Ask Wonder for the tradeoff','Select Wonder and run on the same snapshot. Compare its counterfactual with the calculated options.','investigate');
 if(!guide.acceptedInitial)return step('accept',3,'Make the human decision','Review a feasible option and type its exact APPROVE phrase. Seal the chosen plan to this evidence snapshot.','options');
 if(guide.boardEnabled&&current===guide.initialDigest&&!(state.board?.tasks?.length))return step('board',3,'Britt turns the decision into work','Review Britt’s task breakdown. Approve or decline; you hold final authority.','britt-draft');
 if(current===guide.initialDigest)return step('shock',4,'Disrupt the plan again','Take CELL-MILL-2 offline. The old acceptance must become invalid.','shock');
 if(offline&&!sample(current))return step('recover',5,'Reinvestigate changed capacity','Run Sample on the changed capacity and compare the new constraints.','investigate');
 if(!offline&&(!live(current,['baseten'])||!live(current,['meta-model-api'])))return {...step('recover',5,'Reinvestigate changed capacity',!live(current,['baseten'])?'Spark Open investigates the changed capacity first.':'Wonder receives the validated Spark findings and compares the revised tradeoffs.','investigate'),provider:!live(current,['baseten'])?'baseten':'wonder'};
 if(state.decision.status!=='accepted')return step('reaccept',6,'Review the revised recovery','Inspect the changed options and deliberately accept a feasible revised plan.','options');
 if(guide.boardEnabled&&(state.britt?.proposal||state.board?.tasks?.some(t=>t.change?.requiresReview)))return step('board-revised',6.5,'Britt replans the recovery work','Review changed tasks against the fresh decision. Approve to track the revised plan.','britt-draft');
 if(guide.exported!==state.ledger?.head||guide.verified!==state.ledger?.head||guide.checkpoint!==state.ledger?.head)return step('export',7,'Verify and retain evidence','Verify the ledger, export with a separate passphrase and retain the independent checkpoint separately.','encrypted-export');
 return step('complete',8,'Recovery story complete','The packet preserves investigation routes, source claims, the invalidated decision and revised acceptance.','ledger');
}
