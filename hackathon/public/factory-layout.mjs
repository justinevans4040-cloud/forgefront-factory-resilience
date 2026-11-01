// Geometry is computed from the source quantities, including reversed comparisons.
export function certificateComparison(evidence,trackWidth){
 const quantities=evidence.map(e=>e.quantity.value),max=Math.max(...quantities,1);
 const widths=quantities.map(value=>trackWidth*value/max);
 const mismatchStart=widths.length?Math.min(...widths):0;
 return {widths,mismatchStart,mismatchWidth:widths.length>1?Math.max(...widths)-mismatchStart:0};
}

// Plain-English evidence cards for the inspector; raw IDs stay in expandable detail.
export function evidencePlainEnglish(record){
 const id=String(record?.evidenceId??'');
 const doc=String(record?.source?.documentId??'');
 const qty=record?.quantity;
 if(qty&&(/cert/i.test(id)||/cert/i.test(doc)))return `Certificate says ${qty.value}`;
 if(qty&&(/recv/i.test(id)||/recv/i.test(doc)))return `Receiving counted ${qty.value}`;
 if(qty&&(/sub/i.test(id)||/sub/i.test(doc)))return `Substitute available: ${qty.value}`;
 if(qty)return `${record.source?.field??'Quantity'}: ${qty.value} ${qty.unit??''}`.trim();
 const excerpt=String(record?.excerpt??'').trim();
 return excerpt?excerpt.split(/[.;]/)[0].trim():id||'Source evidence';
}

export function evidenceDetailLabel(record){
 const line=record?.source?.lineId??record?.source?.recordId??'';
 return `${record?.evidenceId??'evidence'} · ${record?.source?.documentId??'document'} / ${line}`;
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

// Span the whole reserved band; keep a gap even as the station count grows.
export function factoryPositions(left,right,count,nodeWidth=186){
 if(!Number.isSafeInteger(count)||count<1)return [];
 const width=Math.min(nodeWidth,(right-left-13*(count-1))/count);
 const pitch=count>1?(right-left-width)/(count-1):0;
 return Array.from({length:count},(_,i)=>({x:left+i*pitch,width}));
}
