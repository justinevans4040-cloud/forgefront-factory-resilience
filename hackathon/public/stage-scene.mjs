// Visual scenes are projections of the same approved workflow state.
export function stageScene(stage,state,guide={}){
 const pending=Boolean(state.britt?.proposal);
 if(stage==='board')return {kind:'tasks',compact:true,pending,blocked:(state.board?.tasks??[]).filter(t=>t.status==='Blocked').length,tasks:structuredClone(pending?state.britt.proposal.board.tasks:state.board?.tasks??[])};
 if(stage==='proof')return {kind:'proof',compact:true,events:state.ledger.count,gates:['verified','exported','checkpoint'].map(key=>guide?.[key]===state.ledger.head)};
 return {kind:stage==='shock'?'shock':'factory',compact:stage==='incident'||stage==='shock'};
}
export function wrapSceneTitle(value,width=28){
 const lines=[];for(const word of String(value).split(/\s+/)){
  if(!lines.length||lines.at(-1).length+1+word.length>width)lines.push(word);
  else lines[lines.length-1]+=' '+word;
 }
 return lines;
}
