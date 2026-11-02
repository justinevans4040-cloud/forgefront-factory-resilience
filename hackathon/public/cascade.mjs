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
  legendChip('OFFLINE','plant-legend-offline'),
  legendChip('FEASIBLE RECOVERY','plant-legend-recovery')
 );
 // Flow canvas sits above tiles so emerald paths remain visible in still captures and motion.
 floor.append(tiles,canvas);canvas.style.pointerEvents='none';canvas.style.zIndex='3';tiles.style.zIndex='1';navigation.append(overview,previous,pageLabel,next);dialog.append(top,controls,consent,metrics,caption,legend,floor,navigation);document.body.append(dialog);
 let selectedMachine=null,plant,result,department=null,page=0,active=false,recovered=false,start=0,raf=0,highlighted=new Set(),resize,envelope=null,busy=false;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const calculate=()=>analyzePlant(plant,{lotId:plant.lots[0].id,failure:failureSelect.value,strategy:strategySelect.value});
 const format=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(n);
 function setConsent(open){
  consent.hidden=!open;
  if(open){approve.textContent='Approve '+strategySelect.value;approve.disabled=false;approve.focus();}
  else{envelope=null;if(authorize.open)authorize.close();}
 }
 function draw(){
  if(!plant||!dialog.open)return;
  dialog.dataset.cascadeActive=String(active&&!recovered);
  result=calculate();const groups=plantGroups(result.machines),items=department?groups.find(g=>g.id===department).machines:groups;
  // Keep every department on one overview page at 1366-wide: two rows beat pagination for the cascade wow moment.
  // Fit every department on one overview page in a balanced 4×2 / 4+3 grid (never a lonely bottom strip).
  const box=floor.getBoundingClientRect();
  const gap=16;
  const overviewCols=!department&&items.length>=5?4:null;
  const overviewMinWidth=overviewCols?Math.max(160,Math.floor((box.width-gap*(overviewCols-1))/overviewCols)-2):188;
  const overviewMinHeight=Math.min(172,Math.max(132,Math.floor((box.height-gap)/2)-2));
  const layout=plantTiles(items,{width:box.width,height:box.height,minWidth:department?220:overviewMinWidth,minHeight:department?176:overviewMinHeight,page});page=layout.page;
  tiles.replaceChildren();
  for(const t of layout.tiles){const card=el('button',null,'plant-tile');card.dataset.plantNode=t.item.id;card.style.left=t.x+'px';card.style.top=t.y+'px';card.style.width=t.width+'px';card.style.height=t.height+'px';
   const members=t.item.machines??[t.item],ids=new Set(members.map(m=>m.id)),affected=result.cascade.filter(c=>ids.has(c.machineId)),depth=affected.reduce((min,c)=>Math.min(min,c.depth),Infinity);
   card.dataset.depth=String(depth);card.dataset.affected=String(affected.length>0);card.dataset.recovered=String(recovered);card.classList.toggle('chain-linked',members.some(m=>highlighted.has(m.id)));
   const affectedIds=new Set(affected.map(c=>c.machineId)),offlineCount=[...ids].filter(id=>affectedIds.has(id)).length,runningCount=Math.max(0,members.length-offlineCount);
   card.dataset.offlineCount=String(offlineCount);card.dataset.memberCount=String(members.length);card.dataset.runningCount=String(runningCount);card.dataset.affectedIds=[...affectedIds].join(',');
   // Before the cascade wave reaches this tile, both lines read RUNNING from the same counts; after impact they share one OFFLINE derivation.
   const departmentState=departmentStatus({recovered,active,offlineCount,runningCount,members:members.length,hit:false});
   const subLine=department?members[0].capacityHours+'h · $'+members[0].hourlyCostUsd+'/h':members.length+' machines';
   card.append(el('strong',t.item.label),el('span',subLine,'plant-sub'),el('span',departmentState,'plant-state'));
   const fullyOffline=active&&!recovered&&offlineCount>0&&offlineCount===members.length;
   if(fullyOffline)card.dataset.depthLayer=String(Math.min(4,Math.max(1,Math.round(depth)||1)));
   card.dataset.partialOffline=String(active&&!recovered&&offlineCount>0&&!fullyOffline);
   // Art stays running until the cascade wave hits the tile so glyphs never contradict the status line.
   const art=machineArt(members,machine=>{selectedMachine=machine.id;highlighted=new Set();const operations=new Map(plant.operations.map(o=>[o.id,o]));for(const op of plant.operations.filter(op=>op.machineId===machine.id))for(const id of dependencyChain(plant,op.id))highlighted.add(operations.get(id).machineId);draw();},new Set(),recovered);card.querySelector('.plant-state').before(art);
   card.addEventListener('click',()=>{if(!department){department=t.item.id;page=0;draw();}else{highlighted=new Set();for(const op of plant.operations.filter(op=>op.machineId===t.item.id))for(const id of dependencyChain(plant,op.id)){const item=plant.operations.find(o=>o.id===id);highlighted.add(item.machineId);}caption.textContent='Dependency chain highlighted for '+t.item.label;draw();}});tiles.append(card);
  }
  pageLabel.textContent=(department??'Entire plant')+' · '+layout.total+' '+(department?'machines':'departments')+' · view '+(page+1)+' of '+layout.pages;previous.disabled=page===0;next.disabled=page+1>=layout.pages;overview.disabled=!department;
  recover.disabled=!active||recovered||!result.recovery.feasible||busy||!consent.hidden;
  caption.textContent=selectedMachine?'Dependency chain · '+selectedMachine+' → '+highlighted.size+' connected machines':recovered?'Recovery accepted · '+result.recovery.assignments.length+' operations · '+format(result.recovery.finishHours)+'h · $'+format(result.recovery.costUsd):active?labels[failureSelect.value]+' freezes '+result.affected.length+' affected operations across the plant. Emerald recovery stays on the feasible mills → lathes path.':plant.label+' · '+plant.machines.length+' machines. Choose a failure to see the cascade.';
  paintMetrics(1);cancelAnimationFrame(raf);animate(performance.now());
 }
 function paintMetrics(progress){
  const m=result.metrics;
  if(!active&&!recovered){
   metrics.replaceChildren(...[['—','HOURS AT RISK'],['—','LATE ORDERS'],['—','COST AT RISK'],['—','SHIP SLIP · HOURS']].map(([n,label])=>{const cell=el('div');cell.append(el('strong',n),el('span',label));cell.append(el('small','Awaiting failure selection','plant-metric-wait'));return cell;}));
   return;
  }
  metrics.replaceChildren(...[[m.lostHours*progress,'HOURS AT RISK'],[m.lateOrders*progress,'LATE ORDERS'],[m.exposureUsd*progress,'COST AT RISK'],[m.shipSlipHours*progress,'SHIP SLIP · HOURS']].map(([n,label])=>{const cell=el('div');cell.append(el('strong',(label==='COST AT RISK'?'$':'')+format(n)),el('span',label));return cell;}));
 }
 function animate(now){if(!dialog.open)return;const sample=globalThis.__cascadeFpsSample;if(sample&&sample.collecting){if(sample.last)sample.frames.push(now-sample.last);sample.last=now;}
  const progress=reduced.matches?1:Math.min(1,(now-start)/2400);if(active)paintMetrics(progress);
  const plantScale=Math.max(1,plant?.machines?.length||1);
  // Viewport LOD only — never fewer machines. Heavy earlier so 1k/5k stay fluid toward 60fps.
  const heavy=plantScale>=400;
  const extreme=plantScale>=1000;
  const maxDepth=result.cascade.reduce((n,c)=>Math.max(n,c.depth),1);
  // Throttle DOM status updates on large plants; canvas flow still runs (or every other frame when extreme).
  const domTick=!heavy||Math.floor(now/(extreme?160:110))!==Math.floor((animate.lastDom||0)/(extreme?160:110));
  animate.lastDom=now;
  // Skip alternate canvas paints from heavy upward (LOD only; machine count unchanged).
  const paintCanvas=!heavy||!animate.skipPaint;animate.skipPaint=heavy?!animate.skipPaint:false;
  for(const node of tiles.children){
   const depthReady=active&&!recovered&&Number(node.dataset.depth)<=progress*maxDepth;
   const offlineCount=Number(node.dataset.offlineCount||0),memberCount=Number(node.dataset.memberCount||0),runningCount=Number(node.dataset.runningCount||0);
   const hit=depthReady&&node.dataset.affected==='true'&&node.dataset.partialOffline!=='true';
   const partial=depthReady&&node.dataset.partialOffline==='true';
   if(domTick){
    node.classList.toggle('cascade-hit',hit);node.classList.toggle('cascade-partial',partial);
    const stateEl=node.querySelector('.plant-state'),subEl=node.querySelector('.plant-sub');
    if(stateEl)stateEl.textContent=departmentStatus({recovered,active,offlineCount,runningCount,members:memberCount,hit:hit||partial});
    if(subEl&&!department)subEl.textContent=memberCount+' machines';
    let mark=node.querySelector('.plant-offline-mark');
    if(hit||partial){
     if(!mark){mark=el('span','×','plant-offline-mark');mark.setAttribute('aria-hidden','true');node.append(mark);}
     let chip=node.querySelector('.plant-offline-chip');
     if(!chip){chip=el('span','OFFLINE','plant-offline-chip');chip.setAttribute('aria-hidden','true');node.append(chip);}
    }else if(mark){mark.remove();node.querySelector('.plant-offline-chip')?.remove();}
    syncMachineArt(node,hit||partial||recovered);
   }
  }
  if(!paintCanvas){if(!reduced.matches||(sample&&sample.collecting))raf=requestAnimationFrame(animate);return;}
  const box=floor.getBoundingClientRect();
  // Cap devicePixelRatio on heavy plants (LOD only) — fewer canvas pixels, same machine count.
  const dpr=heavy?1:Math.min(devicePixelRatio||1,1.5);
  if(canvas.width!==Math.round(box.width*dpr)||canvas.height!==Math.round(box.height*dpr)){canvas.width=Math.round(box.width*dpr);canvas.height=Math.round(box.height*dpr);}
  const ctx=canvas.getContext('2d',{alpha:false,desynchronized:true});ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#050705';ctx.fillRect(0,0,box.width,box.height);
  const nodes=[...tiles.children];
  const center=node=>{const x=parseFloat(node.style.left)+parseFloat(node.style.width)/2,y=parseFloat(node.style.top)+parseFloat(node.style.height)/2;return {x,y};};
  const drawFlow=(from,to,color,nowStamp,width=4.2,particles=9)=>{
   const a=center(from),b=center(to);
   const mx=(a.x+b.x)/2,my=(a.y+b.y)/2-Math.min(72,Math.abs(b.x-a.x)*0.28);
   const particleCount=extreme?Math.min(1,particles):heavy?Math.min(2,particles):particles;
   ctx.strokeStyle=color;ctx.lineWidth=width;ctx.shadowColor=color;ctx.shadowBlur=reduced.matches||heavy?0:22;ctx.setLineDash(reduced.matches?[]:[16,8]);ctx.beginPath();ctx.moveTo(a.x,a.y);
   // Straight routes on heavy plants (LOD only); quadratic depth retained under 400.
   if(heavy)ctx.lineTo(b.x,b.y);else ctx.quadraticCurveTo(mx,my,b.x,b.y);
   ctx.stroke();ctx.setLineDash([]);ctx.shadowBlur=0;
   if(reduced.matches||particles<=0)return;
   for(let p=0;p<particleCount;p++){
    const t=((nowStamp/8)+p*(1/Math.max(particleCount,1)))%1;
    const ox=heavy?a.x+(b.x-a.x)*t:(1-t)*(1-t)*a.x+2*(1-t)*t*mx+t*t*b.x;
    const oy=heavy?a.y+(b.y-a.y)*t:(1-t)*(1-t)*a.y+2*(1-t)*t*my+t*t*b.y;
    ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=heavy?0:24;ctx.beginPath();ctx.arc(ox,oy,heavy?2.5:7+(p%4),0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
   }
  };
  const ordered=[...nodes].sort((left,right)=>parseFloat(left.style.left)-parseFloat(right.style.left)||parseFloat(left.style.top)-parseFloat(right.style.top));
  if(recovered&&ordered.length>1){
   for(let i=0;i<ordered.length-1;i++)drawFlow(ordered[i],ordered[i+1],'#56ff9a',now,5.2,10);
   if(!reduced.matches){const sweep=(now/6)%(box.width+180)-90;const grad=ctx.createLinearGradient(sweep-160,0,sweep+160,0);grad.addColorStop(0,'#56ff9a00');grad.addColorStop(.5,'#56ff9a88');grad.addColorStop(1,'#56ff9a00');ctx.fillStyle=grad;ctx.fillRect(0,0,box.width,box.height);}
  }else if(active&&!recovered&&ordered.length>1){
   // One clear emerald living cascade: CNC mills → CNC lathes → inspection/finishing when present; silver static elsewhere.
   const deptLabel=node=>(node?.dataset?.plantNode||'')+' '+(node?.querySelector('strong')?.textContent||'');
   const mills=ordered.find(n=>/cnc\s*mills/i.test(deptLabel(n)));
   const lathes=ordered.find(n=>/cnc\s*lathes/i.test(deptLabel(n)));
   const inspect=ordered.find(n=>/inspect/i.test(deptLabel(n)));
   const finish=ordered.find(n=>/finish/i.test(deptLabel(n)));
   // Neighbor silver links only under lighter plants — heavy keeps the emerald spine only.
   if(!heavy)for(let i=0;i<ordered.length-1;i++){
    const from=ordered[i],to=ordered[i+1];
    const hit=from.classList.contains('cascade-hit')||to.classList.contains('cascade-hit');
    drawFlow(from,to,hit?'#c5ccd433':'#c5ccd422',now,hit?2.0:2.2,0);
   }
   if(mills&&lathes){
    // Primary living emerald mills → lathes spine; reverse glow only under lighter plants.
    drawFlow(mills,lathes,'#56ff9a',now,heavy?6.4:9.2,heavy?3:24);
    if(!heavy)drawFlow(lathes,mills,'#8affb888',now,3.8,10);
   }
   if(!extreme&&lathes&&inspect&&!inspect.classList.contains('cascade-hit'))drawFlow(lathes,inspect,'#56ff9acc',now,heavy?3.6:5.6,heavy?2:14);
   if(!heavy&&inspect&&finish&&!finish.classList.contains('cascade-hit'))drawFlow(inspect,finish,'#8affb866',now,3.6,8);
   if(!reduced.matches){
    if(!heavy){
     const alarm=(now/5)%(box.width+200)-100;
     const alarmGrad=ctx.createLinearGradient(alarm-90,0,alarm+90,0);alarmGrad.addColorStop(0,'#c5ccd400');alarmGrad.addColorStop(.5,'#c5ccd455');alarmGrad.addColorStop(1,'#c5ccd400');
     ctx.fillStyle=alarmGrad;ctx.fillRect(0,0,box.width,box.height);
    }
    // Pulse rings only on light plants; extreme skips them entirely (LOD).
    if(!extreme)for(const node of ordered.filter(n=>n.classList.contains('cascade-hit'))){
     const c=center(node),pulse=14+((now/28)%24);
     ctx.strokeStyle='#c5ccd488';ctx.lineWidth=heavy?2:3;ctx.beginPath();ctx.arc(c.x,c.y,pulse,0,Math.PI*2);ctx.stroke();
    }
    if(!heavy)for(const node of ordered.filter(n=>!n.classList.contains('cascade-hit'))){
     const c=center(node);
     ctx.fillStyle='#8affb8';ctx.shadowColor='#56ff9a';ctx.shadowBlur=18;ctx.beginPath();ctx.arc(c.x,c.y,5,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    }
   }
  }else if(ordered.length){
   ctx.strokeStyle='#27664c';ctx.lineWidth=2.2;
   for(let i=0;i<ordered.length-1;i++)drawFlow(ordered[i],ordered[i+1],'#56ff9a77',now,2.6,3);
   for(const node of ordered){
    const y=parseFloat(node.style.top)+parseFloat(node.style.height)/2,x=parseFloat(node.style.left);
    ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(box.width,y);ctx.strokeStyle='#1f3d3088';ctx.stroke();
    if(reduced.matches)continue;
    const offset=(now/11)%box.width;
    for(let n=0;n<4;n++){ctx.fillStyle='#8cfbc0';ctx.shadowColor='#56ff9a';ctx.shadowBlur=10;ctx.fillRect((x+offset+n*90)%box.width,y-3,16,6);ctx.shadowBlur=0;}
   }
  }
  if(!reduced.matches||(sample&&sample.collecting))raf=requestAnimationFrame(animate);
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
 launcher.addEventListener('click',async event=>{event.preventDefault();try{plant=await loadPlant();failureSelect.replaceChildren(...Object.keys(plant.failurePolicies).map(id=>{const option=el('option',labels[id]??id);option.value=id;return option;}));department=null;page=0;active=false;recovered=false;setConsent(false);dialog.showModal();start=performance.now();resize=new ResizeObserver(draw);resize.observe(floor);draw();}catch{launcher.textContent='Open the recovery room to explore the full shop';}});
 return {dialog};
}
function legendChip(label,className){const chip=el('span',label,className);chip.setAttribute('aria-hidden','true');return chip;}
export function departmentStatus({recovered,active,offlineCount,runningCount,members,hit}){
 if(recovered)return 'RECOVERY ACCEPTED';
 if(!active||!hit)return 'RUNNING · '+members+' machines';
 if(offlineCount>=members&&members>0)return 'OFFLINE · '+members+' machines';
 // Full OFFLINE/RUNNING chips (Wonder P1); short form only when both counts exceed two digits.
 if(offlineCount>0){
  if(offlineCount>=10||runningCount>=10)return offlineCount+' OFF / '+runningCount+' RUN';
  return 'OFFLINE · '+offlineCount+' · RUNNING · '+runningCount;
 }
 return 'RUNNING · '+members+' machines';
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
   // Silver hatch + × on glyphs; plain OFFLINE lives on the department chip so dense plants stay collision-free.
   const hatch=document.createElementNS('http://www.w3.org/2000/svg','rect');hatch.setAttribute('data-offline-art','1');hatch.setAttribute('x','2');hatch.setAttribute('y','4');hatch.setAttribute('width','60');hatch.setAttribute('height','50');hatch.setAttribute('fill','url(#'+svg.dataset.hatchId+')');hatch.setAttribute('opacity','0.85');g.prepend(hatch);
   for(const d of ['M10 18 L52 46','M52 18 L10 46']){const line=document.createElementNS('http://www.w3.org/2000/svg','path');line.setAttribute('data-offline-art','1');line.setAttribute('d',d);line.setAttribute('stroke','#c5ccd4');line.setAttribute('stroke-width','3');g.append(line);}
  }else{
   const window=document.createElementNS('http://www.w3.org/2000/svg','rect');window.setAttribute('data-online-art','1');for(const [k,v]of Object.entries({x:8,y:22,width:25,height:20,rx:2,fill:'#03100a',stroke:'#92ffc1'}))window.setAttribute(k,v);g.append(window);
   const light=document.createElementNS('http://www.w3.org/2000/svg','circle');light.setAttribute('data-online-art','1');for(const [k,v]of Object.entries({cx:21,cy:31,r:4,fill:'#8affb8'}))light.setAttribute(k,v);light.classList.add('plant-machine-light');g.append(light);
  }
 }
}

function fitMachineGlyphs(machines){
 // Viewport LOD only: show as many glyphs as fit without overlap; engine/drill-in still hold every machine.
 let lo=1,hi=Math.max(1,machines.length),best=1;
 while(lo<=hi){
  const mid=(lo+hi)>>1;
  const columns=Math.max(1,Math.ceil(Math.sqrt(mid*1.2))),rows=Math.ceil(mid/columns);
  const pitchX=480/columns,pitchY=150/rows;
  const scale=Math.min(0.95,Math.max(0.42,Math.min(pitchX/70,pitchY/62)));
  if(62*scale<=pitchX*0.92&&54*scale<=pitchY*0.92){best=mid;lo=mid+1;}else hi=mid-1;
 }
 return {shown:machines.slice(0,best),overflow:Math.max(0,machines.length-best)};
}
function machineArt(machines,onMachine,affectedIds=new Set(),recovered=false){
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 480 150');svg.setAttribute('aria-label','Machines in this department');svg.classList.add('plant-machinery');
 const defs=document.createElementNS(ns,'defs'),pattern=document.createElementNS(ns,'pattern');pattern.id='plant-offline-hatch-'+Math.random().toString(36).slice(2,8);pattern.setAttribute('width','8');pattern.setAttribute('height','8');pattern.setAttribute('patternUnits','userSpaceOnUse');pattern.setAttribute('patternTransform','rotate(45)');const hatchLine=document.createElementNS(ns,'line');hatchLine.setAttribute('x1','0');hatchLine.setAttribute('y1','0');hatchLine.setAttribute('x2','0');hatchLine.setAttribute('y2','8');hatchLine.setAttribute('stroke','#c5ccd4');hatchLine.setAttribute('stroke-width','2');pattern.append(hatchLine);defs.append(pattern);svg.append(defs);svg.dataset.hatchId=pattern.id;
 const {shown,overflow}=fitMachineGlyphs(machines);
 const columns=Math.max(1,Math.ceil(Math.sqrt(Math.max(shown.length,1)*1.2))),rows=Math.ceil(Math.max(shown.length,1)/columns),pitchX=480/columns,pitchY=150/rows,scale=Math.min(0.95,Math.max(0.42,Math.min(pitchX/70,pitchY/62)));
 const labelOffline=shown.length<=8;
 shown.forEach((machine,i)=>{const g=document.createElementNS(ns,'g');g.dataset.plantMachine=machine.id;g.setAttribute('tabindex','0');g.setAttribute('role','button');const offline=!recovered&&affectedIds.has(machine.id);g.dataset.artOffline=String(offline);g.setAttribute('aria-label',(offline?'OFFLINE ':'')+'Inspect '+machine.label);const select=event=>{event.preventDefault();event.stopPropagation();onMachine(machine);};g.addEventListener('click',select);g.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' ')select(event);});g.setAttribute('transform','translate('+((i%columns)*pitchX+pitchX/2-30*scale)+' '+(Math.floor(i/columns)*pitchY+pitchY/2-25*scale)+') scale('+scale+')');
  for(const [points,fill]of[['0,14 20,2 62,2 43,14',offline?'#8a9399':'#a9cbb7'],['43,14 62,2 62,42 43,54',offline?'#3a4147':'#294b3a'],['0,14 43,14 43,54 0,54',offline?'#5c656c':'#527862']]){const p=document.createElementNS(ns,'polygon');p.setAttribute('points',points);p.setAttribute('fill',fill);p.setAttribute('stroke','#c5ccd4');p.setAttribute('stroke-width','1');g.append(p);}
  if(offline){
   const hatch=document.createElementNS(ns,'rect');hatch.setAttribute('data-offline-art','1');hatch.setAttribute('x','2');hatch.setAttribute('y','4');hatch.setAttribute('width','60');hatch.setAttribute('height','50');hatch.setAttribute('fill','url(#'+pattern.id+')');hatch.setAttribute('opacity','0.85');g.prepend(hatch);
   for(const d of ['M10 18 L52 46','M52 18 L10 46']){const line=document.createElementNS(ns,'path');line.setAttribute('data-offline-art','1');line.setAttribute('d',d);line.setAttribute('stroke','#c5ccd4');line.setAttribute('stroke-width','3');g.append(line);}
   if(labelOffline){const offlineText=document.createElementNS(ns,'text');offlineText.setAttribute('data-offline-art','1');offlineText.setAttribute('x','31');offlineText.setAttribute('y','46');offlineText.setAttribute('text-anchor','middle');offlineText.setAttribute('fill','#c5ccd4');offlineText.setAttribute('font-size','14');offlineText.setAttribute('font-weight','800');offlineText.setAttribute('class','offline-label');offlineText.textContent='OFFLINE';g.append(offlineText);}
  }
  else{const window=document.createElementNS(ns,'rect');window.setAttribute('data-online-art','1');for(const [k,v]of Object.entries({x:8,y:22,width:25,height:20,rx:2,fill:'#03100a',stroke:'#92ffc1'}))window.setAttribute(k,v);g.append(window);const light=document.createElementNS(ns,'circle');light.setAttribute('data-online-art','1');for(const [k,v]of Object.entries({cx:21,cy:31,r:4,fill:'#8affb8'}))light.setAttribute(k,v);light.classList.add('plant-machine-light');g.append(light);}
  svg.append(g);
 });
 if(overflow>0){const more=document.createElementNS(ns,'text');more.textContent='+'+overflow+' more';more.setAttribute('x','240');more.setAttribute('y','146');more.setAttribute('text-anchor','middle');more.setAttribute('fill','#a9c8b8');more.setAttribute('font-size','16');more.setAttribute('font-weight','700');svg.append(more);}
 return svg;
}
