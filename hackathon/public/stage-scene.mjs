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

// Task cards reserve distinct bands for identity, title, dependency, due window and human status.
export function proposalLayout(count,height){
 if(!Number.isSafeInteger(count)||count<1)throw Error('Invalid proposal count');
 const gap=14,top=220,maxColumns=Math.max(1,Math.floor((800+gap)/(240+gap))),maxRows=Math.max(1,Math.floor((height-24-top+gap)/(148+gap))),pageSize=maxColumns*maxRows;
 return Array.from({length:count},(_,i)=>{
  const page=Math.floor(i/pageSize),local=i%pageSize,pageCount=Math.min(pageSize,count-page*pageSize),columns=Math.min(maxColumns,pageCount),rows=Math.ceil(pageCount/columns);
  const width=(800-gap*(columns-1))/columns,cardHeight=(height-24-top-gap*(rows-1))/rows;
  // Fixed footer bands keep due/status clear of title at every card height (including dense 5–12 task grids).
  // Prefer 2–3 title lines so task titles stay untruncated (Wonder guided board P1 / audit33).
  const statusY=cardHeight-12,dueY=cardHeight-56;
  const maxTitle=count<=3&&cardHeight>=200?3:2;
  let titleLines=Math.max(1,Math.min(maxTitle,Math.floor((dueY-72)/26)));
  if(cardHeight>=168)titleLines=Math.max(titleLines,Math.min(2,maxTitle));
  if(count<=3&&cardHeight>=210)titleLines=Math.max(titleLines,3);
  let titleBottom=62+(titleLines-1)*26+8;
  while(titleLines>1&&titleBottom>=dueY-26){titleLines-=1;titleBottom=62+(titleLines-1)*26+8;}
  if(titleBottom>=dueY-26)titleBottom=dueY-28;
  const dependsY=Math.min(titleBottom+20,dueY-28);
  const barY=Math.min(dueY-22,Math.max(dependsY+6,titleBottom+6));
  return {page,x:24+(local%columns)*(width+gap),y:top+Math.floor(local/columns)*(cardHeight+gap),width,height:cardHeight,titleLines,titleBottom,dependsY,dueY,statusY,barY};
 });
}
