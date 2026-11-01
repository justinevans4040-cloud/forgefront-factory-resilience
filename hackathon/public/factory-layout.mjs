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
