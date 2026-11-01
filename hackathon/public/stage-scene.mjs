// Visual scenes are projections of the same approved workflow state.
export function stageScene(stage,state,guide={}){
 const pending=Boolean(state.britt?.proposal);
 if(stage==='board')return {kind:'tasks',cells:structuredClone(state.snapshot.cells),compact:true,pending,blocked:(state.board?.tasks??[]).filter(t=>t.status==='Blocked').length,tasks:structuredClone(pending?state.britt.proposal.board.tasks:state.board?.tasks??[])};
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


// Overview tiles reserve three lines; the full title remains in the selected inspector and accessible name.
export function tileTitle(value,width=23,maxLines=3){
 const lines=wrapSceneTitle(value,width);
 if(lines.length<=maxLines)return lines;
 const visible=lines.slice(0,maxLines);
 visible[maxLines-1]=visible[maxLines-1].slice(0,width-1).trimEnd()+'…';
 return visible;
}

// Task cards reserve distinct bands for identity, title, due window and human status.
export function proposalLayout(count,height){
 if(!Number.isSafeInteger(count)||count<1||count>12)throw Error('Invalid proposal count');
 return Array.from({length:count},(_,i)=>{
  const page=Math.floor(i/6),local=i%6,pageCount=Math.min(6,count-page*6),columns=Math.min(3,pageCount),rows=Math.ceil(pageCount/columns),gap=14,top=220;
  const width=(800-gap*(columns-1))/columns,cardHeight=(height-24-top-gap*(rows-1))/rows,titleLines=Math.max(1,Math.min(3,Math.floor((cardHeight-120)/32)));
  return {page,x:24+(local%columns)*(width+gap),y:top+Math.floor(local/columns)*(cardHeight+gap),width,height:cardHeight,titleLines,titleBottom:62+(titleLines-1)*32+8,dueY:cardHeight-52,statusY:cardHeight-20};
 });
}
