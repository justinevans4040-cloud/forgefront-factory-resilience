import {analyzePlant,dependencyChain} from './plant-engine.mjs';
import {plantTiles,plantGroups} from './plant-layout.mjs';
const el=(tag,content,className)=>{const node=document.createElement(tag);if(content!=null)node.textContent=content;if(className)node.className=className;return node;};
export function mountCascade({loadPlant,launcher,workflow}){
 const dialog=el('dialog',null,'plant-room');dialog.id='plant-room';dialog.setAttribute('aria-label','Full-shop recovery');
 const top=el('div',null,'plant-top'),brand=el('div',null,'plant-brand'),logo=el('img');logo.src='/forgefront-systems-logo.png';logo.alt='Forgefront Systems';brand.append(logo,el('strong','FULL-SHOP RECOVERY'));
 const close=el('button','Return to recovery room','secondary');close.addEventListener('click',()=>dialog.close());const cinema=el('button','Recording view','secondary');cinema.addEventListener('click',()=>{dialog.classList.toggle('recording');cinema.textContent=dialog.classList.contains('recording')?'Show controls':'Recording view';});top.append(brand,cinema,close);
 const controls=el('div',null,'plant-controls'),failureLabel=el('label','Choose a failure'),failureSelect=el('select'),strategyLabel=el('label','Recovery path'),strategySelect=el('select');failureSelect.id='plant-failure';strategySelect.id='plant-strategy';failureLabel.htmlFor=failureSelect.id;strategyLabel.htmlFor=strategySelect.id;
 const labels={'wrong-cert':'Wrong certificate','wrong-material':'Wrong material','wrong-grain':'Wrong grain direction','wrong-sticker':'Mislabeled sticker','failed-hardness':'Failed hardness'};
 for(const [id,label]of[['reroute','Reroute to alternate machines'],['expedite','Expedite verified replacement'],['rework','Rework and re-inspect']]){const option=el('option',label);option.value=id;strategySelect.append(option);}
 const trigger=el('button','Trigger failure'),recover=el('button','Accept calculated recovery'),overview=el('button','All departments','secondary'),previous=el('button','Previous','secondary'),next=el('button','Next','secondary');trigger.id='plant-trigger';recover.id='plant-recover';controls.append(failureLabel,failureSelect,trigger,strategyLabel,strategySelect,recover);
 const consent=el('div',null,'plant-consent');consent.hidden=true;const consentLabel=el('label','Approve the calculated plant recovery');const approve=el('button','Approve recovery');approve.id='plant-approve';const cancelConsent=el('button','Cancel','secondary');consent.append(consentLabel,approve,cancelConsent);
 const authorize=el('dialog',null,'plant-authorize');authorize.id='plant-authorize';authorize.innerHTML='<h2>Authorize this decision</h2><p class="plant-authorize-detail"></p><p class="muted">This seals the plant recovery to the evidence snapshot and ledger.</p><div class="authorize-actions"></div>';const authorizeDetail=authorize.querySelector('.plant-authorize-detail');const authorizeConfirm=el('button','Authorize');const authorizeCancel=el('button','Cancel','secondary');authorize.querySelector('.authorize-actions').append(authorizeConfirm,authorizeCancel);document.body.append(authorize);
 const metrics=el('div',null,'plant-metrics'),caption=el('p','','plant-caption'),legend=el('div',null,'plant-legend'),floor=el('div',null,'plant-floor'),tiles=el('div',null,'plant-tiles'),canvas=el('canvas',null,'plant-flow'),navigation=el('div',null,'plant-navigation'),pageLabel=el('span');
 legend.append(
  legendChip('RUNNING','plant-legend-run'),
  legendChip('HELD / BLOCKED','plant-legend-hold'),
  legendChip('× OFFLINE · pattern + text','plant-legend-offline'),
  legendChip('FEASIBLE RECOVERY','plant-legend-recovery')
 );
 // Flow canvas sits above tiles so emerald paths remain visible in still captures and motion.
 floor.append(tiles,canvas);canvas.style.pointerEvents='none';canvas.style.zIndex='3';tiles.style.zIndex='1';navigation.append(overview,previous,pageLabel,next);dialog.append(top,controls,consent,metrics,caption,legend,floor,navigation);document.body.append(dialog);
 let selectedMachine=null,plant,result,department=null,page=0,active=false,recovered=false,start=0,raf=0,highlighted=new Set(),resize,envelope=null,busy=false;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let calcCache=null;
 const calculate=()=>{
  const key=plant.machines.length+'|'+plant.lots[0].id+'|'+failureSelect.value+'|'+strategySelect.value+'|'+active+'|'+recovered;
  if(calcCache&&calcCache.key===key)return calcCache.result;
  const next=analyzePlant(plant,{lotId:plant.lots[0].id,failure:failureSelect.value,strategy:strategySelect.value});
  calcCache={key,result:next};return next;
 };
 const format=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(n);
 function setConsent(open){
  consent.hidden=!open;
  if(open){approve.textContent='Approve '+strategySelect.value;approve.disabled=false;approve.focus();}
  else{envelope=null;if(authorize.open)authorize.close();}
 }
 function draw(reason='full'){
  if(!plant||!dialog.open)return;
  dialog.dataset.cascadeActive=String(active&&!recovered);
  // Resize during cascade must not re-run analyzePlant (calcCache) — but must reflow tile geometry so bottom-row cards stay inside the floor.
  result=calculate();const groups=plantGroups(result.machines),items=department?groups.find(g=>g.id===department).machines:groups;
  // Keep every department on one overview page at 1366-wide: two rows beat pagination for the cascade wow moment.
  // Fit every department on one overview page in a balanced 4×2 / 4+3 grid (never a lonely bottom strip).
  const box=floor.getBoundingClientRect();
  const gap=16;
  const overviewCols=!department&&items.length>=5?4:null;
  const overviewMinWidth=overviewCols?Math.max(160,Math.floor((box.width-gap*(overviewCols-1))/overviewCols)-2):188;
  const overviewMinHeight=Math.min(168,Math.max(128,Math.floor((box.height-gap)/2)-4));
  const layout=plantTiles(items,{width:box.width,height:box.height,minWidth:department?220:overviewMinWidth,minHeight:department?176:overviewMinHeight,page});page=layout.page;
  tiles.replaceChildren();
  for(const t of layout.tiles){const card=el('button',null,'plant-tile');card.dataset.plantNode=t.item.id;card.style.left=t.x+'px';card.style.top=t.y+'px';card.style.width=t.width+'px';card.style.height=t.height+'px';card.style.maxWidth=t.width+'px';card.style.maxHeight=t.height+'px';card.style.overflow='hidden';
   const members=t.item.machines??[t.item],ids=new Set(members.map(m=>m.id)),affected=result.cascade.filter(c=>ids.has(c.machineId)),depth=affected.reduce((min,c)=>Math.min(min,c.depth),Infinity);
   card.dataset.depth=String(depth);card.dataset.affected=String(affected.length>0);card.dataset.recovered=String(recovered);card.classList.toggle('chain-linked',members.some(m=>highlighted.has(m.id)));
   const affectedIds=new Set(affected.map(c=>c.machineId)),offlineCount=[...ids].filter(id=>affectedIds.has(id)).length,runningCount=Math.max(0,members.length-offlineCount);
   card.dataset.offlineCount=String(offlineCount);card.dataset.memberCount=String(members.length);card.dataset.runningCount=String(runningCount);card.dataset.affectedIds=[...affectedIds].join(',');
   // Before the cascade wave reaches this tile, both lines read RUNNING from the same counts; after impact they share one OFFLINE derivation.
   const departmentState=departmentStatus({recovered,active,offlineCount,runningCount,members:members.length,hit:false});
   const subLine=department?members[0].capacityHours+'h · $'+members[0].hourlyCostUsd+'/h':(members.length>=100?String(members.length):members.length+' machines');
   // Single reserved footer strip carries OFFLINE/RUNNING (Wonder 167–170); no duplicate status nodes for the clip gate.
   const strip=el('span',departmentState,'plant-status-strip plant-state');
   // Wonder 177 cascade P1: full department names at readable size — never crop left/lower labels.
   const title=el('strong',t.item.label);
   title.className='plant-dept-label';
   card.append(title,el('span',subLine,'plant-sub'),strip);
   card.setAttribute('tabindex','0');
   card.setAttribute('aria-label',t.item.label+' · '+departmentState+(department?'':' · '+subLine));
   const fullyOffline=active&&!recovered&&offlineCount>0&&offlineCount===members.length;
   if(fullyOffline)card.dataset.depthLayer=String(Math.min(4,Math.max(1,Math.round(depth)||1)));
   card.dataset.partialOffline=String(active&&!recovered&&offlineCount>0&&!fullyOffline);
   // Art stays running until the cascade wave hits the tile so glyphs never contradict the status line.
   // Extreme plants: skip per-machine SVG glyphs on the overview (CSS hatch + canvas flow carry state; drill-in still draws glyphs).
  const extremeArt=(plant.machines.length>=800)&&!department;
  if(!extremeArt){
   const art=machineArt(members,machine=>{selectedMachine=machine.id;highlighted=new Set();const operations=new Map(plant.operations.map(o=>[o.id,o]));for(const op of plant.operations.filter(op=>op.machineId===machine.id))for(const id of dependencyChain(plant,op.id))highlighted.add(operations.get(id).machineId);draw();},new Set(),recovered);card.querySelector('.plant-state').before(art);
  }else{
   const proxy=el('div',null,'plant-machinery-proxy');proxy.setAttribute('aria-hidden','true');card.querySelector('.plant-state').before(proxy);
  }
   card.addEventListener('click',()=>{if(!department){department=t.item.id;page=0;draw();}else{highlighted=new Set();for(const op of plant.operations.filter(op=>op.machineId===t.item.id))for(const id of dependencyChain(plant,op.id)){const item=plant.operations.find(o=>o.id===id);highlighted.add(item.machineId);}caption.textContent='Dependency chain highlighted for '+t.item.label;draw();}});tiles.append(card);
  }
  pageLabel.textContent=(department??'Entire plant')+' · '+layout.total+' '+(department?'machines':'departments')+' · view '+(page+1)+' of '+layout.pages;previous.disabled=page===0;next.disabled=page+1>=layout.pages;overview.disabled=!department;
  recover.disabled=!active||recovered||!result.recovery.feasible||busy||!consent.hidden;
  caption.textContent=selectedMachine?'Dependency chain · '+selectedMachine+' → '+highlighted.size+' connected machines':recovered?'Recovery accepted · '+result.recovery.assignments.length+' operations · '+format(result.recovery.finishHours)+'h · $'+format(result.recovery.costUsd):active?labels[failureSelect.value]+' freezes '+result.affected.length+' affected operations across the plant. Emerald recovery stays on the feasible mills → lathes path.':plant.label+' · '+plant.machines.length+' machines. Choose a failure to see the cascade.';
  animate.tileCache=null;animate.arcKey=null;animate.staticDirty=true;paintMetrics(1);cancelAnimationFrame(raf);refreshTileCache();paintRecoveryArc(animate.tileCache);animate(performance.now());
 }
 function paintRecoveryArc(cache){
  // Layered SVG mills→lathes arc with directional chevrons (Wonder 167–170 cascade P1); static under reduced motion.
  // Geometry-keyed cache: never recreate SVG nodes every animation tick (audit40 FPS).
  let arc=floor.querySelector('.plant-recovery-arc');
  if(!active||!cache?.mills||!cache?.lathes){arc?.remove();animate.arcKey=null;return;}
  const a=cache.mills,b=cache.lathes;
  const x1=a.cx,y1=a.cy,x2=b.cx,y2=b.cy;
  const mx=(x1+x2)/2,my=Math.min(a.y,b.y)-18;
  const vw=Math.max(1,Math.round(floor.clientWidth)),vh=Math.max(1,Math.round(floor.clientHeight));
  const key=[active,recovered,x1,y1,x2,y2,vw,vh].join('|');
  if(arc&&animate.arcKey===key)return;
  animate.arcKey=key;
  if(!arc){
   arc=document.createElementNS('http://www.w3.org/2000/svg','svg');
   arc.classList.add('plant-recovery-arc');
   arc.setAttribute('aria-hidden','true');
   floor.append(arc);
  }
  arc.setAttribute('viewBox','0 0 '+vw+' '+vh);
  arc.replaceChildren();
  const ns='http://www.w3.org/2000/svg';
  const glow=document.createElementNS(ns,'path');
  glow.setAttribute('d','M '+x1+' '+y1+' Q '+mx+' '+my+' '+x2+' '+y2);
  glow.setAttribute('class',recovered?'plant-arc-glow recovered':'plant-arc-glow');
  glow.setAttribute('fill','none');
  const spine=document.createElementNS(ns,'path');
  spine.setAttribute('d','M '+x1+' '+y1+' Q '+mx+' '+my+' '+x2+' '+y2);
  spine.setAttribute('class',recovered?'plant-arc-spine recovered':'plant-arc-spine');
  spine.setAttribute('fill','none');
  const marker=document.createElementNS(ns,'polygon');
  marker.setAttribute('points',(x2-14)+','+(y2-8)+' '+x2+','+y2+' '+(x2-14)+','+(y2+8));
  marker.setAttribute('class','plant-arc-arrow');
  arc.append(glow,spine,marker);
 }
 function paintMetrics(progress){
  const m=result.metrics;
  if(!active&&!recovered){
   if(metrics.dataset.mode==='idle')return;
   metrics.dataset.mode='idle';
   metrics.replaceChildren(...[['—','HOURS AT RISK'],['—','LATE ORDERS'],['—','COST AT RISK'],['—','SHIP SLIP · HOURS']].map(([n,label])=>{const cell=el('div');cell.append(el('strong',n),el('span',label));cell.append(el('small','Awaiting failure selection','plant-metric-wait'));return cell;}));
   return;
  }
  const values=[[m.lostHours*progress,'HOURS AT RISK'],[m.lateOrders*progress,'LATE ORDERS'],[m.exposureUsd*progress,'COST AT RISK'],[m.shipSlipHours*progress,'SHIP SLIP · HOURS']];
  const key=values.map(([n,label])=>(label==='COST AT RISK'?'$':'')+format(n)).join('|');
  if(metrics.dataset.mode==='live'&&metrics.dataset.key===key)return;
  metrics.dataset.mode='live';metrics.dataset.key=key;
  // Fixed min-height cells so number updates never reflow the floor (ResizeObserver FPS cliff).
  metrics.replaceChildren(...values.map(([n,label])=>{const cell=el('div');cell.style.minHeight='64px';cell.append(el('strong',(label==='COST AT RISK'?'$':'')+format(n)),el('span',label));return cell;}));
 }
 function refreshTileCache(){
  // Cache layout centers + status nodes once per draw/layout — never parse style or querySelector every frame.
  const nodes=[...tiles.children].map(node=>{
   const x=parseFloat(node.style.left)||0,y=parseFloat(node.style.top)||0,w=parseFloat(node.style.width)||0,h=parseFloat(node.style.height)||0;
   return {
    node,x,y,w,h,cx:x+w/2,cy:y+h/2,
    depth:Number(node.dataset.depth||0),
    affected:node.dataset.affected==='true',
    partialFlag:node.dataset.partialOffline==='true',
    offlineCount:Number(node.dataset.offlineCount||0),
    memberCount:Number(node.dataset.memberCount||0),
    runningCount:Number(node.dataset.runningCount||0),
    label:((node.dataset.plantNode||'')+' '+(node.querySelector('strong')?.textContent||'')).toLowerCase(),
    stateEl:node.querySelector('.plant-status-strip'),
    stripEl:node.querySelector('.plant-status-strip'),
    subEl:node.querySelector('.plant-sub'),
    hitKey:node.dataset.hitKey||''
   };
  }).sort((a,b)=>a.x-b.x||a.y-b.y);
  // Route endpoints resolved once per layout — animate never re-scans labels each frame.
  const find=re=>nodes.find(n=>re.test(n.label));
  animate.tileCache={
   nodes,at:performance.now(),
   maxDepth:result.cascade.reduce((n,c)=>Math.max(n,c.depth),1),
   mills:find(/cnc\s*mills/),lathes:find(/cnc\s*lathes/),inspect:find(/inspect/),finish:find(/finish/)
  };
  animate.staticDirty=true;
 }
 function ensureCanvas(box,scale){
  // Pixel LOD only — machine counts stay full. Identity transform in backing-store pixels.
  const w=Math.max(1,Math.round(box.width*scale)),h=Math.max(1,Math.round(box.height*scale));
  if(canvas.width!==w||canvas.height!==h){
   canvas.width=w;canvas.height=h;
   if(canvas.style.width!==box.width+'px')canvas.style.width=box.width+'px';
   if(canvas.style.height!==box.height+'px')canvas.style.height=box.height+'px';
   animate.staticDirty=true;animate.ctx=null;
  }
  if(!animate.staticLayer||animate.staticLayer.width!==w||animate.staticLayer.height!==h){
   animate.staticLayer=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(w,h):Object.assign(document.createElement('canvas'),{width:w,height:h});
   animate.staticDirty=true;
  }
  if(!animate.ctx)animate.ctx=canvas.getContext('2d',{alpha:false,desynchronized:true});
  return animate.ctx;
 }
 function paintStaticLayer(box,scale,heavy,cache){
  const layer=animate.staticLayer;const sctx=layer.getContext('2d');sctx.setTransform(1,0,0,1,0,0);sctx.fillStyle='#050705';sctx.fillRect(0,0,layer.width,layer.height);
  const nodes=cache.nodes;const sx=scale,sy=scale;
  const stroke=(a,b,color,width)=>{sctx.strokeStyle=color;sctx.lineWidth=width;sctx.shadowBlur=0;sctx.beginPath();sctx.moveTo(a.cx*sx,a.cy*sy);if(heavy)sctx.lineTo(b.cx*sx,b.cy*sy);else{const mx=((a.cx+b.cx)/2)*sx,my=((a.cy+b.cy)/2-Math.min(72,Math.abs(b.cx-a.cx)*0.28))*sy;sctx.quadraticCurveTo(mx,my,b.cx*sx,b.cy*sy);}sctx.stroke();};
  if(recovered&&nodes.length>1){for(let i=0;i<nodes.length-1;i++)stroke(nodes[i],nodes[i+1],'#2d6b4a',3.2);}
  else if(active&&!recovered&&nodes.length>1){
   if(!heavy)for(let i=0;i<nodes.length-1;i++){const hit=nodes[i].node.classList.contains('cascade-hit')||nodes[i+1].node.classList.contains('cascade-hit');stroke(nodes[i],nodes[i+1],hit?'#c5ccd433':'#c5ccd422',hit?2:2.2);}
   else for(let i=0;i<nodes.length-1;i++)stroke(nodes[i],nodes[i+1],'#1f3d3088',1.6);
  }else if(nodes.length){
   for(const n of nodes){sctx.beginPath();sctx.moveTo(0,n.cy*sy);sctx.lineTo(layer.width,n.cy*sy);sctx.strokeStyle='#1f3d3088';sctx.lineWidth=1.5;sctx.stroke();}
  }
  animate.staticDirty=false;
 }
 function animate(now){if(!dialog.open){raf=0;return;}const sample=globalThis.__cascadeFpsSample;if(sample&&sample.collecting){if(sample.last)sample.frames.push(now-sample.last);sample.last=now;}
  const progress=reduced.matches?1:Math.min(1,(now-start)/2400);
  const plantScale=Math.max(1,plant?.machines?.length||1);
  // Viewport/pixel LOD only — never fewer machines. Cached centers + dirty static layer keep 1k/5k toward 60fps.
  const heavy=plantScale>=400;
  const extreme=plantScale>=800;
  const ultra=plantScale>=400; // audit40: CSS spine LOD earlier; machine counts unchanged
  // Metrics DOM refresh is expensive — throttle independently of canvas paints.
  // Ultra: skip mid-wave metric DOM (final paint below) so frame cost stays on the canvas spine.
  const metricsPeriod=ultra?1e9:extreme?240:heavy?120:80;
  const metricsTick=!ultra&&(!heavy||Math.floor(now/metricsPeriod)!==Math.floor((animate.lastMetrics||0)/metricsPeriod));
  if(active&&metricsTick){animate.lastMetrics=now;paintMetrics(progress);}
  if(!animate.tileCache||animate.tileCache.nodes.length!==tiles.children.length)refreshTileCache();
  const cache=animate.tileCache;const maxDepth=cache.maxDepth||1;
  // DOM status only on state change (dirty tiles) — syncMachineArt never runs every frame.
  const domPeriod=ultra?480:extreme?220:heavy?120:90;
  const domTick=!heavy||Math.floor(now/domPeriod)!==Math.floor((animate.lastDom||0)/domPeriod);
  if(domTick){
   animate.lastDom=now;
   for(const tile of cache.nodes){
    const depthReady=active&&!recovered&&tile.depth<=progress*maxDepth;
    const hit=depthReady&&tile.affected&&!tile.partialFlag;
    const partial=depthReady&&tile.partialFlag;
    const key=(hit?'H':partial?'P':'')+(recovered?'R':'');
    if(tile.hitKey===key)continue;
    tile.hitKey=key;tile.node.dataset.hitKey=key;
    tile.node.classList.toggle('cascade-hit',hit);tile.node.classList.toggle('cascade-partial',partial);
    const statusText=departmentStatus({recovered,active,offlineCount:tile.offlineCount,runningCount:tile.runningCount,members:tile.memberCount,hit:hit||partial});
    if(tile.stripEl)tile.stripEl.textContent=statusText;
    if(tile.subEl&&!department)tile.subEl.textContent=tile.memberCount>=100?String(tile.memberCount):tile.memberCount+' machines';
    // corner × only — OFFLINE word lives solely in the reserved footer strip (Wonder 167–170 / clip gate).
    let mark=tile.node.querySelector('.plant-offline-mark');
    if(hit||partial){
     if(!mark){mark=el('span','×','plant-offline-mark');mark.setAttribute('aria-hidden','true');tile.node.append(mark);}
    }else if(mark){mark.remove();}
    tile.node.querySelector('.plant-offline-chip')?.remove();
    // Extreme plants rely on tile CSS/hatch chips; glyph art flips only under lighter plants (LOD).
    if(!extreme)syncMachineArt(tile.node,hit||partial||recovered);
    // Heavy static layer is hit-agnostic — skip static-layer refreshes during the cascade wave.
    if(!heavy)animate.staticDirty=true;
   }
   // Ultra CSS spine already paints mills→lathes flow — skip SVG arc redraws (FPS; machine counts unchanged).
   if(!ultra)paintRecoveryArc(cache);
   else floor.querySelector('.plant-recovery-arc')?.remove();
  }
  if(!animate.boxCache||animate.boxCache.at<now-2000){animate.boxCache={at:now,box:floor.getBoundingClientRect()};}
  const box=animate.boxCache.box;
  // Ultra CSS spine LOD (audit37): living emerald flow moves to CSS; canvas stays clear. Machine counts unchanged.
  floor.dataset.cssFlow=ultra&&active&&!recovered?'1':(ultra&&recovered?'2':'0');
  if(ultra){
   if(canvas.width!==1){canvas.width=1;canvas.height=1;canvas.style.width='100%';canvas.style.height='100%';animate.ctx=null;animate.staticDirty=true;}
   if(ultra&&active&&progress>=1&&animate.lastMetrics!==-1){animate.lastMetrics=-1;paintMetrics(1);}
   // After the wave settles, CSS carries living flow — stop rAF unless FPS sampling needs frames (audit39 FPS).
   const needRaf=(sample&&sample.collecting)||(active&&!recovered&&progress<1&&!reduced.matches);
   raf=needRaf?requestAnimationFrame(animate):0;
   return;
  }
  // Backing-store density LOD: identity-transform pixel buffer; machine graph unchanged.
  const scale=extreme?0.4:heavy?0.55:Math.min(devicePixelRatio||1,1.25);
  const ctx=ensureCanvas(box,scale);ctx.setTransform(1,0,0,1,0,0);
  const sx=scale,sy=scale;
  // Extreme: skip offscreen blit — clear + living spine only (LOD; machine counts unchanged).
  if(extreme){ctx.fillStyle='#050705';ctx.fillRect(0,0,canvas.width,canvas.height);animate.staticDirty=false;}
  else{
   if(animate.staticDirty!==false)paintStaticLayer(box,scale,heavy,cache);
   ctx.drawImage(animate.staticLayer,0,0);
  }
  const nodes=cache.nodes;
  const drawFlow=(a,b,color,nowStamp,width=4.2,particles=9)=>{
   const ax=a.cx*sx,ay=a.cy*sy,bx=b.cx*sx,by=b.cy*sy;
   const mx=(ax+bx)/2,my=(ay+by)/2-Math.min(72*sy,Math.abs(bx-ax)*0.28);
   const particleCount=ultra?0:extreme?0:heavy?Math.min(2,particles):particles;
   ctx.strokeStyle=color;ctx.lineWidth=Math.max(1,width*sx);ctx.shadowBlur=0;ctx.setLineDash(reduced.matches||extreme?[12,10]:[16,8]);ctx.beginPath();ctx.moveTo(ax,ay);
   if(heavy)ctx.lineTo(bx,by);else ctx.quadraticCurveTo(mx,my,bx,by);
   if(!reduced.matches&&extreme)ctx.lineDashOffset=-((nowStamp/20)%40);
   ctx.stroke();ctx.setLineDash([]);ctx.lineDashOffset=0;
   if(reduced.matches||particleCount<=0)return;
   for(let p=0;p<particleCount;p++){
    const t=((nowStamp/8)+p*(1/Math.max(particleCount,1)))%1;
    const ox=heavy?ax+(bx-ax)*t:(1-t)*(1-t)*ax+2*(1-t)*t*mx+t*t*bx;
    const oy=heavy?ay+(by-ay)*t:(1-t)*(1-t)*ay+2*(1-t)*t*my+t*t*by;
    ctx.fillStyle=color;ctx.beginPath();ctx.arc(ox,oy,heavy?2.2:6+(p%3),0,Math.PI*2);ctx.fill();
   }
  };
  if(recovered&&nodes.length>1){
   if(extreme){const a=nodes[0],b=nodes[nodes.length-1];drawFlow(a,b,'#56ff9a',now,5.2,0);}
   else for(let i=0;i<nodes.length-1;i++)drawFlow(nodes[i],nodes[i+1],'#56ff9a',now,5.2,heavy?2:10);
   if(!reduced.matches&&!extreme){const sweep=(now/6)%(canvas.width+180)-90;const grad=ctx.createLinearGradient(sweep-160,0,sweep+160,0);grad.addColorStop(0,'#56ff9a00');grad.addColorStop(.5,'#56ff9a66');grad.addColorStop(1,'#56ff9a00');ctx.fillStyle=grad;ctx.fillRect(0,0,canvas.width,canvas.height);}
  }else if(active&&!recovered&&nodes.length>1){
   const mills=cache.mills,lathes=cache.lathes,inspect=cache.inspect,finish=cache.finish;
   if(mills&&lathes){
    drawFlow(mills,lathes,'#56ff9a',now,heavy?6.4:9.2,heavy?2:24);
    if(!heavy)drawFlow(lathes,mills,'#8affb888',now,3.8,10);
   }else if(nodes.length>1){
    drawFlow(nodes[0],nodes[nodes.length-1],'#56ff9a',now,heavy?6.4:9.2,0);
   }
   if(!extreme&&lathes&&inspect&&!inspect.node.classList.contains('cascade-hit'))drawFlow(lathes,inspect,'#56ff9acc',now,heavy?3.6:5.6,heavy?2:14);
   if(!heavy&&inspect&&finish&&!finish.node.classList.contains('cascade-hit'))drawFlow(inspect,finish,'#8affb866',now,3.6,8);
   if(!reduced.matches&&!extreme){
    for(const tile of nodes){if(!tile.node.classList.contains('cascade-hit'))continue;const pulse=(14+((now/28)%24))*sx;ctx.strokeStyle='#c5ccd466';ctx.lineWidth=2;ctx.beginPath();ctx.arc(tile.cx*sx,tile.cy*sy,pulse,0,Math.PI*2);ctx.stroke();}
   }
  }else if(nodes.length&&!reduced.matches&&!extreme){
   for(const tile of nodes){
    const offset=(now/11)%box.width;
    for(let n=0;n<(heavy?1:3);n++){ctx.fillStyle='#8cfbc0';ctx.fillRect(((tile.x+offset+n*90)%box.width)*sx,(tile.cy-3)*sy,14*sx,5*sy);}
   }
  }
  raf=(!reduced.matches||(sample&&sample.collecting))?requestAnimationFrame(animate):0;
}
 trigger.addEventListener('click',()=>{active=true;recovered=false;setConsent(false);start=performance.now();draw();});
 recover.addEventListener('click',async()=>{
  if(!result.recovery.feasible||busy||!workflow?.api)return;
  busy=true;recover.disabled=true;recover.textContent='Investigating with Meta…';
  try{
   const investigation=await workflow.api('plant-investigate',{provider:workflow.plantProvider||'sample',lotId:plant.lots[0].id,failure:failureSelect.value,strategy:strategySelect.value});
   if(!investigation?.proposalValid)throw new Error('Plant investigation did not validate against source evidence');
   recover.textContent='Preparing consent…';
   envelope=await workflow.api('plant-review',{lotId:plant.lots[0].id,failure:failureSelect.value,strategy:strategySelect.value});
   setConsent(true);caption.textContent='Meta investigation sealed the finding. Approve '+strategySelect.value+', then authorize to seal the calculated recovery.';
  }catch(error){caption.textContent=error?.message||'Plant recovery consent failed';}
  finally{busy=false;recover.textContent='Accept calculated recovery';draw();}
 });
 cancelConsent.addEventListener('click',()=>{setConsent(false);draw();});
 authorizeCancel.addEventListener('click',()=>{if(authorize.open)authorize.close();});
 approve.addEventListener('click',()=>{if(!envelope||busy)return;authorizeDetail.textContent='Authorize '+strategySelect.value+' against the sealed plant evidence.';authorize.showModal();authorizeConfirm.focus();});
 authorizeConfirm.addEventListener('click',async()=>{
  if(!envelope||busy)return;
  busy=true;approve.disabled=true;authorizeConfirm.disabled=true;authorizeConfirm.textContent='Authorizing…';
  try{
   await workflow.api('confirm',{nonce:envelope.nonce,typed:'APPROVE '+strategySelect.value});
   recovered=true;setConsent(false);
   if(typeof workflow.afterAccept==='function')await workflow.afterAccept({strategy:strategySelect.value,failure:failureSelect.value});
   caption.textContent='Recovery sealed · The Britt is drafting tracked work from the accepted plant plan.';
  }catch(error){caption.textContent=error?.message||'Plant recovery confirmation failed';setConsent(Boolean(envelope));}
  finally{busy=false;authorizeConfirm.disabled=false;authorizeConfirm.textContent='Authorize';if(authorize.open)authorize.close();draw();}
 });
 failureSelect.addEventListener('change',()=>{active=false;recovered=false;setConsent(false);draw();});strategySelect.addEventListener('change',()=>{recovered=false;setConsent(false);draw();});overview.addEventListener('click',()=>{department=null;page=0;draw();});previous.addEventListener('click',()=>{page--;draw();});next.addEventListener('click',()=>{page++;draw();});
 dialog.addEventListener('close',()=>{cancelAnimationFrame(raf);resize?.disconnect();setConsent(false);});
 launcher.addEventListener('click',async event=>{event.preventDefault();try{plant=await loadPlant();failureSelect.replaceChildren(...Object.keys(plant.failurePolicies).map(id=>{const option=el('option',labels[id]??id);option.value=id;return option;}));department=null;page=0;active=false;recovered=false;setConsent(false);dialog.showModal();start=performance.now();let resizeFrame=0,lastResizeBox='';resize=new ResizeObserver(entries=>{const box=entries[0]?.contentRect;const key=box?(Math.round(box.width)+'x'+Math.round(box.height)):'';if(key&&key===lastResizeBox)return;lastResizeBox=key;cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>draw('resize'));});resize.observe(floor);draw('full');}catch{launcher.textContent='Open the recovery room to explore the full shop';}});
 return {dialog};
}
function legendChip(label,className){const chip=el('span',label,className);chip.setAttribute('aria-hidden','true');return chip;}
export function departmentStatus({recovered,active,offlineCount,runningCount,members,hit}){
 if(recovered)return 'RECOVERY ACCEPTED';
 // Compact chips on huge departments stay inside tile bounds (clip gate); wording stays plain OFFLINE / RUNNING with counts (Wonder cascade P1).
 if(!active||!hit)return members>=100?('RUN · '+members):('RUNNING · '+members+' machines');
 // Compact OFFLINE footers stay fully visible (Wonder high step 10): never truncate the OFFLINE word on small shops;
 // dense plants use shorter OFF tokens so the reserved strip never exceeds tile width.
 if(offlineCount>=members&&members>0)return members>=100?('OFFLINE · '+members):('OFFLINE · '+members);
 if(offlineCount>0){
  if(members>=100)return 'OFF '+offlineCount+'/'+members;
  if(offlineCount>=10||runningCount>=10)return offlineCount+' OFFLINE / '+runningCount+' RUN';
  return 'OFFLINE · '+offlineCount+' / '+runningCount+' RUN';
 }
 return members>=100?('RUN · '+members):('RUNNING · '+members+' machines');
}
function syncMachineArt(node,showOffline){
 const svg=node.querySelector('.plant-machinery');if(!svg)return;
 const affected=new Set((node.dataset.affectedIds||'').split(',').filter(Boolean));
 for(const g of svg.querySelectorAll('[data-plant-machine]')){
  const want=showOffline&&(affected.size?affected.has(g.dataset.plantMachine):node.dataset.affected==='true');
  const has=g.dataset.artOffline==='true';
  if(want===has)continue;
  g.dataset.artOffline=String(want);
  g.querySelectorAll('[data-offline-art]').forEach(n=>n.remove());
  g.querySelectorAll('[data-online-art]').forEach(n=>n.remove());
  if(want){
   // Soft hatch behind glyph only — never over footer OFFLINE strip (Wonder 170 cascade P1).
   const hatch=document.createElementNS('http://www.w3.org/2000/svg','rect');hatch.setAttribute('data-offline-art','1');hatch.setAttribute('x','2');hatch.setAttribute('y','4');hatch.setAttribute('width','60');hatch.setAttribute('height','50');hatch.setAttribute('fill','url(#'+svg.dataset.hatchId+')');hatch.setAttribute('opacity','0.42');g.prepend(hatch);
   const mark=document.createElementNS('http://www.w3.org/2000/svg','text');mark.setAttribute('data-offline-art','1');mark.setAttribute('x','52');mark.setAttribute('y','18');mark.setAttribute('text-anchor','middle');mark.setAttribute('fill','#c5ccd4');mark.setAttribute('font-size','16');mark.setAttribute('font-weight','800');mark.setAttribute('class','offline-x');mark.textContent='×';g.append(mark);
  }else{
   const window=document.createElementNS('http://www.w3.org/2000/svg','rect');window.setAttribute('data-online-art','1');for(const [k,v]of Object.entries({x:8,y:22,width:25,height:20,rx:2,fill:'#03100a',stroke:'#92ffc1'}))window.setAttribute(k,v);g.append(window);
   const light=document.createElementNS('http://www.w3.org/2000/svg','circle');light.setAttribute('data-online-art','1');for(const [k,v]of Object.entries({cx:21,cy:31,r:4,fill:'#8affb8'}))light.setAttribute(k,v);light.classList.add('plant-machine-light');g.append(light);
  }
 }
}

function fitMachineGlyphs(machines){
 // Viewport LOD only: show as many glyphs as fit without overlap; engine/drill-in still hold every machine.
 // Prefer larger cubes (Wonder 169–170): slightly fewer glyphs when that raises scale.
 let lo=1,hi=Math.max(1,machines.length),best=1;
 while(lo<=hi){
  const mid=(lo+hi)>>1;
  const columns=Math.max(1,Math.ceil(Math.sqrt(mid*1.05))),rows=Math.ceil(mid/columns);
  const pitchX=480/columns,pitchY=160/rows;
  const scale=Math.min(1.15,Math.max(0.55,Math.min(pitchX/68,pitchY/58)));
  if(58*scale<=pitchX*0.9&&50*scale<=pitchY*0.9){best=mid;lo=mid+1;}else hi=mid-1;
 }
 return {shown:machines.slice(0,best),overflow:Math.max(0,machines.length-best)};
}
function machineArt(machines,onMachine,affectedIds=new Set(),recovered=false){
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 480 160');svg.setAttribute('aria-label','Machines in this department');svg.classList.add('plant-machinery');
 const defs=document.createElementNS(ns,'defs'),pattern=document.createElementNS(ns,'pattern');pattern.id='plant-offline-hatch-'+Math.random().toString(36).slice(2,8);pattern.setAttribute('width','8');pattern.setAttribute('height','8');pattern.setAttribute('patternUnits','userSpaceOnUse');pattern.setAttribute('patternTransform','rotate(45)');const hatchLine=document.createElementNS(ns,'line');hatchLine.setAttribute('x1','0');hatchLine.setAttribute('y1','0');hatchLine.setAttribute('x2','0');hatchLine.setAttribute('y2','8');hatchLine.setAttribute('stroke','#c5ccd4');hatchLine.setAttribute('stroke-width','1.4');pattern.append(hatchLine);defs.append(pattern);svg.append(defs);svg.dataset.hatchId=pattern.id;
 const {shown,overflow}=fitMachineGlyphs(machines);
 const columns=Math.max(1,Math.ceil(Math.sqrt(Math.max(shown.length,1)*1.05))),rows=Math.ceil(Math.max(shown.length,1)/columns),pitchX=480/columns,pitchY=160/rows,scale=Math.min(1.15,Math.max(0.55,Math.min(pitchX/68,pitchY/58)));
 // Per-glyph OFFLINE words clip at overview density; footer strip carries the word (Wonder + plant clip gate).
 const labelOffline=false;
 shown.forEach((machine,i)=>{const g=document.createElementNS(ns,'g');g.dataset.plantMachine=machine.id;g.setAttribute('tabindex','0');g.setAttribute('role','button');const offline=!recovered&&affectedIds.has(machine.id);g.dataset.artOffline=String(offline);g.setAttribute('aria-label',(offline?'OFFLINE ':'')+'Inspect '+machine.label);const select=event=>{event.preventDefault();event.stopPropagation();onMachine(machine);};g.addEventListener('click',select);g.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' ')select(event);});g.setAttribute('transform','translate('+((i%columns)*pitchX+pitchX/2-30*scale)+' '+(Math.floor(i/columns)*pitchY+pitchY/2-25*scale)+') scale('+scale+')');
  for(const [points,fill]of[['0,14 20,2 62,2 43,14',offline?'#8a9399':'#a9cbb7'],['43,14 62,2 62,42 43,54',offline?'#3a4147':'#294b3a'],['0,14 43,14 43,54 0,54',offline?'#5c656c':'#527862']]){const p=document.createElementNS(ns,'polygon');p.setAttribute('points',points);p.setAttribute('fill',fill);p.setAttribute('stroke','#c5ccd4');p.setAttribute('stroke-width','1');g.append(p);}
  if(offline){
   const hatch=document.createElementNS(ns,'rect');hatch.setAttribute('data-offline-art','1');hatch.setAttribute('x','2');hatch.setAttribute('y','4');hatch.setAttribute('width','60');hatch.setAttribute('height','50');hatch.setAttribute('fill','url(#'+pattern.id+')');hatch.setAttribute('opacity','0.42');g.prepend(hatch);
   const mark=document.createElementNS(ns,'text');mark.setAttribute('data-offline-art','1');mark.setAttribute('x','52');mark.setAttribute('y','18');mark.setAttribute('text-anchor','middle');mark.setAttribute('fill','#c5ccd4');mark.setAttribute('font-size','16');mark.setAttribute('font-weight','800');mark.setAttribute('class','offline-x');mark.textContent='×';g.append(mark);
   if(labelOffline){const offlineText=document.createElementNS(ns,'text');offlineText.setAttribute('data-offline-art','1');offlineText.setAttribute('x','31');offlineText.setAttribute('y','46');offlineText.setAttribute('text-anchor','middle');offlineText.setAttribute('fill','#c5ccd4');offlineText.setAttribute('font-size','14');offlineText.setAttribute('font-weight','800');offlineText.setAttribute('class','offline-label');offlineText.textContent='OFFLINE';g.append(offlineText);}
  }
  else{const window=document.createElementNS(ns,'rect');window.setAttribute('data-online-art','1');for(const [k,v]of Object.entries({x:8,y:22,width:25,height:20,rx:2,fill:'#03100a',stroke:'#92ffc1'}))window.setAttribute(k,v);g.append(window);const light=document.createElementNS(ns,'circle');light.setAttribute('data-online-art','1');for(const [k,v]of Object.entries({cx:21,cy:31,r:4,fill:'#8affb8'}))light.setAttribute(k,v);light.classList.add('plant-machine-light');g.append(light);}
  svg.append(g);
 });
 if(overflow>0){const more=document.createElementNS(ns,'text');more.textContent='+'+overflow+' more';more.setAttribute('x','240');more.setAttribute('y','156');more.setAttribute('text-anchor','middle');more.setAttribute('fill','#a9c8b8');more.setAttribute('font-size','16');more.setAttribute('font-weight','700');svg.append(more);}
 return svg;
}
