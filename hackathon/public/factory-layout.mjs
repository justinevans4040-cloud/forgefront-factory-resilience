// Geometry is computed from the source quantities, including reversed comparisons.
export function certificateComparison(evidence,trackWidth){
 const quantities=evidence.map(e=>e.quantity.value),max=Math.max(...quantities,1);
 const widths=quantities.map(value=>trackWidth*value/max);
 const mismatchStart=widths.length?Math.min(...widths):0;
 return {widths,mismatchStart,mismatchWidth:widths.length>1?Math.max(...widths)-mismatchStart:0};
}

export function completionStatus(state){
 const offline=state.snapshot.cells.filter(c=>!c.online).map(c=>c.cellId);
 return `PACKET SEALED · ${state.ledger.count} events · revised plan accepted · ${offline.length?offline.join(', ')+' offline retained':'all cells online'}`;
}

export function openingStakes(state){
 const due=state.snapshot.jobs.filter(j=>j.materialId===state.snapshot.incident.heldMaterialId&&Number.isFinite(j.dueHours)).map(j=>j.dueHours);
 const quantities=state.evidence.filter(e=>e.quantity&&e.source.field==='quantity').slice(0,2).map(e=>e.quantity.value);
 return {parts:state.analysis.impacted.impactedUnits,orders:state.analysis.impacted.impactedJobCount,dueHours:due.length?Math.min(...due):null,quantityGap:quantities.length===2?Math.abs(quantities[0]-quantities[1]):0};
}
export function adjacentPath(options,current,direction){
 const feasible=options.filter(o=>o.feasible);if(!feasible.length)return null;
 const index=feasible.findIndex(o=>o.optionId===current);
 return feasible[index<0?0:(index+(direction<0?-1:1)+feasible.length)%feasible.length].optionId;
}

// Engine allocations are machine hours; demand is a distinct part quantity.
export function acceptedFlow(option,parts){
 const detail=option?.detail??{},totals=new Map();
 const allocations=detail.allocations??detail.draws?.flatMap(d=>d.cells)??[];
 for(const a of allocations)totals.set(a.cellId,(totals.get(a.cellId)??0)+a.hours);
 return {parts,materials:[...new Set(detail.materialId?[detail.materialId]:(detail.draws??[]).map(d=>d.materialId))],assignments:[...totals].map(([cellId,hours])=>({cellId,hours:Math.round(hours*100)/100}))};
}
