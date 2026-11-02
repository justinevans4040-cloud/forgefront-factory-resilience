// Runs inside the actual browser. Independent labels and semantic scene nodes
// must never intersect across reserved layout bands or as sibling text boxes.
export function measureLayout(){
 const rect=r=>({left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height});
 const visible=e=>{
  if(!e||!e.isConnected)return false;
  const s=getComputedStyle(e),r=e.getBoundingClientRect();
  return e.checkVisibility({checkVisibilityCSS:true})&&s.visibility!=='hidden'&&s.display!=='none'&&r.width>0.5&&r.height>0.5&&!e.closest('[hidden]');
 };
 const pad=1.25;
 const inflate=b=>({left:b.left-pad,top:b.top-pad,right:b.right+pad,bottom:b.bottom+pad,width:b.width+pad*2,height:b.height+pad*2});
 const entries=[];
 const add=(el,box,label,kind,band)=>{
  if(box.width<=0.5||box.height<=0.5)return;
  entries.push({el,box:inflate(rect(box)),label,kind,band:band||el.closest('[data-scene-band],[data-layout-zone]')?.getAttribute('data-scene-band')||el.closest('[data-layout-zone]')?.getAttribute('data-layout-zone')||''});
 };
 // Leaf text and actionable scene nodes — never measure opaque parent groups that swallow captions.
 for(const e of document.querySelectorAll('#factory-svg text,#factory-svg [data-scene-task],#factory-svg [data-scene-option],#room button:not([hidden]),#room #decision-bar button,#factory-selection:not([hidden])')){
  if(!visible(e)||e.closest('dialog'))continue;
  add(e,e.getBoundingClientRect(),(e.textContent||e.getAttribute('aria-label')||e.id||'').trim().slice(0,90),e.namespaceURI?.includes('svg')?(e.tagName==='text'?'text':'node'):'control',e.getAttribute('data-scene-band'));
 }
 // Station/job rects (first rect of each factory-node) for node-vs-text collisions outside the same parent.
 for(const g of document.querySelectorAll('#factory-svg g.factory-node')){
  if(!visible(g))continue;
  const r=g.querySelector('rect');
  if(!r)continue;
  add(r,r.getBoundingClientRect(),(g.getAttribute('aria-label')||'node').slice(0,90),'node',g.getAttribute('data-scene-band'));
 }
 // Callout/overview panels are independent cards — their outer rects must never cover stations or jobs.
 for(const g of document.querySelectorAll('#factory-svg g[data-scene-band="callout"],#factory-svg g[data-scene-callout]')){
  if(!visible(g))continue;
  const r=g.querySelector('rect');
  if(!r)continue;
  add(r,r.getBoundingClientRect(),(g.getAttribute('data-scene-callout')||g.getAttribute('aria-label')||'callout').slice(0,90),'node',g.getAttribute('data-scene-band')||'callout');
 }
 const intersects=(a,b)=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>0&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>0;
 // Labels drawn on their own card/node are intentional nesting; every other pair must stay clear.
 const ownerGroup=el=>el.closest('g.factory-node,g[data-scene-option],g[data-scene-task],g[data-scene-overview],g[data-scene-machine],g[data-evidence],g[data-scene-band="callout"]');
 const related=(a,b)=>{
  if(a.el===b.el||a.el.contains(b.el)||b.el.contains(a.el))return true;
  if(a.el.parentElement===b.el||b.el.parentElement===a.el)return true;
  const ga=ownerGroup(a.el),gb=ownerGroup(b.el);
  return Boolean(ga&&ga===gb&&(a.kind==='node'||b.kind==='node'));
 };
 const hits=[];
 for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++){
  const a=entries[i],b=entries[j];
  if(related(a,b))continue;
  if(intersects(a.box,b.box))hits.push({a:a.label,b:b.label,kind:a.kind+'/'+b.kind,bands:[a.band,b.band],boxes:[a.box,b.box]});
 }
 const stage=document.querySelector('#factory-stage').getBoundingClientRect(),svg=document.querySelector('#factory-svg'),s=svg.getBoundingClientRect();
 const v=svg.viewBox.baseVal,scale=Math.min(s.width/v.width,s.height/v.height);
 const fill=(scale*v.width*scale*v.height)/(stage.width*stage.height);
 const clipped=entries.filter(e=>{
  const parent=e.el.closest('svg,#stage-deck,#factory-stage');
  const b=parent?.getBoundingClientRect();
  return e.box.left<-2||e.box.right>innerWidth+2||e.box.top<-2||e.box.bottom>innerHeight+2||(b&&(e.box.left<b.left-2||e.box.right>b.right+2||e.box.top<b.top-2||e.box.bottom>b.bottom+2));
 }).map(({label,box})=>({label,box}));
 // Audit actual rendered text fragments, including the entire inspector and header.
 const textClipping=[],walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
 while(walker.nextNode()){
  const node=walker.currentNode,el=node.parentElement;
  if(!node.textContent.trim()||!visible(el)||el.closest('script,style,svg,dialog'))continue;
  // Off-screen skip link must stay in tab order; exclude it from fold clipping until focused.
  if(el.closest('a.skip')&&document.activeElement!==el.closest('a.skip'))continue;
  let hidden=false;
  for(let a=el;a;a=a.parentElement){if(Number(getComputedStyle(a).opacity)===0){hidden=true;break;}}
  if(hidden)continue;
  const range=document.createRange();range.selectNodeContents(node);
  for(const r of range.getClientRects()){
   if(r.width<.5||r.height<.5)continue;
   let cut=r.left < -2||r.right>innerWidth+2||r.top < -2||r.bottom>innerHeight+2,container='viewport';
   for(let a=el;a&&!cut;a=a.parentElement){
    const st=getComputedStyle(a),b=a.getBoundingClientRect();
    if(/hidden|clip|auto|scroll/.test(st.overflowX)&& (r.left<b.left-2||r.right>b.right+2)){cut=true;container=a.id||a.className;}
    if(/hidden|clip|auto|scroll/.test(st.overflowY)&& (r.top<b.top-2||r.bottom>b.bottom+2)){cut=true;container=a.id||a.className;}
   }
   if(cut)textClipping.push({text:node.textContent.trim().slice(0,100),container,box:rect(r)});
  }
 }
 const emptyElements=[...document.querySelectorAll('button,summary,.task-card,.proposal-task,.evidence-card,.chip,.badge')].filter(e=>visible(e)&&!e.textContent.trim()&&!e.querySelector('img,svg')&&!e.getAttribute('aria-label')).map(e=>({tag:e.tagName,id:e.id,class:e.className}));
 const header=document.querySelector('header').getBoundingClientRect(),nav=document.querySelector('#workspace-switcher'),nr=nav.getBoundingClientRect(),tabs=[...nav.querySelectorAll('button')];
 const headerNavigation={span:nr.width/header.width,minLabelPx:Math.min(...tabs.map(e=>parseFloat(getComputedStyle(e).fontSize))),current:tabs.filter(e=>e.getAttribute('aria-current')==='step').length};
 headerNavigation.valid=headerNavigation.span>=.70&&headerNavigation.minLabelPx>=16&&headerNavigation.current===1;
 const bodyPx=parseFloat(getComputedStyle(document.body).fontSize);
 const pageScroll=document.documentElement.scrollHeight>innerHeight+2||document.documentElement.scrollWidth>innerWidth+2;
 return {hits,clipped,textClipping,emptyElements,headerNavigation,fill,bodyPx,pageScroll,measured:entries.length,viewBox:{w:v.width,h:v.height},svg:{w:s.width,h:s.height}};
}
