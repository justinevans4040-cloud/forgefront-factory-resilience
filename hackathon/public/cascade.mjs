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
 const trigger=el('button','Trigger failure'),recover=el('button','Accept calculated recovery'),overview=el('button','All departments','secondary'),previous=el('button','Previous','secondary'),next=el('button','Next','secondary');controls.append(failureLabel,failureSelect,trigger,strategyLabel,strategySelect,recover);
 const consent=el('div',null,'plant-consent');consent.hidden=true;const consentLabel=el('label','Approve the calculated plant recovery');const approve=el('button','Approve recovery');approve.id='plant-approve';const cancelConsent=el('button','Cancel','secondary');consent.append(consentLabel,approve,cancelConsent);
 const authorize=el('dialog',null,'plant-authorize');authorize.id='plant-authorize';authorize.innerHTML='<h2>Authorize this decision</h2><p class="plant-authorize-detail"></p><p class="muted">This seals the plant recovery to the evidence snapshot and ledger.</p><div class="authorize-actions"></div>';const authorizeDetail=authorize.querySelector('.plant-authorize-detail');const authorizeConfirm=el('button','Authorize');const authorizeCancel=el('button','Cancel','secondary');authorize.querySelector('.authorize-actions').append(authorizeConfirm,authorizeCancel);document.body.append(authorize);
 const metrics=el('div',null,'plant-metrics'),caption=el('p','','plant-caption'),legend=el('div',null,'plant-legend'),floor=el('div',null,'plant-floor'),tiles=el('div',null,'plant-tiles'),canvas=el('canvas',null,'plant-flow'),navigation=el('div',null,'plant-navigation'),pageLabel=el('span');
 legend.append(
  legendChip('RUNNING','plant-legend-run'),
  legendChip('HELD / BLOCKED','plant-legend-hold'),
  legendChip('OFFLINE','plant-legend-offline'),
  legendChip('FEASIBLE RECOVERY','plant-legend-recovery')
 );
 floor.append(canvas,tiles);navigation.append(overview,previous,pageLabel,next);dialog.append(top,controls,consent,metrics,caption,legend,floor,navigation);document.body.append(dialog);
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
  result=calculate();const groups=plantGroups(result.machines),items=department?groups.find(g=>g.id===department).machines:groups;
  const box=floor.getBoundingClientRect(),overviewMins=box.height<360?{minWidth:200,minHeight:148}:{minWidth:228,minHeight:188},layout=plantTiles(items,{width:box.width,height:box.height,minWidth:department?210:overviewMins.minWidth,minHeight:department?160:overviewMins.minHeight,page});page=layout.page;
  tiles.replaceChildren();
  for(const t of layout.tiles){const card=el('button',null,'plant-tile');card.dataset.plantNode=t.item.id;card.style.left=t.x+'px';card.style.top=t.y+'px';card.style.width=t.width+'px';card.style.height=t.height+'px';
   const members=t.item.machines??[t.item],ids=new Set(members.map(m=>m.id)),affected=result.cascade.filter(c=>ids.has(c.machineId)),depth=affected.reduce((min,c)=>Math.min(min,c.depth),Infinity);
   card.dataset.depth=String(depth);card.dataset.affected=String(affected.length>0);card.dataset.recovered=String(recovered);card.classList.toggle('chain-linked',members.some(m=>highlighted.has(m.id)));
   const offlineIds=new Set(affected.map(c=>c.machineId)),offlineCount=[...ids].filter(id=>offlineIds.has(id)).length,runningCount=Math.max(0,members.length-offlineCount);
   const fullyOffline=active&&!recovered&&offlineCount>0&&offlineCount===members.length;
   const departmentState=recovered?'RECOVERY ACCEPTED':fullyOffline?'OFFLINE · '+members.length+' machines':active&&offlineCount?offlineCount+' OFFLINE · '+runningCount+' RUNNING':'RUNNING · '+members.length+' machines';
   card.append(el('strong',t.item.label),el('span',department?members[0].capacityHours+'h capacity · $'+members[0].hourlyCostUsd+'/h':members.length+' machines · '+offlineCount+' offline','plant-sub'),el('span',departmentState,'plant-state'));
   if(fullyOffline)card.dataset.depthLayer=String(Math.min(4,Math.max(1,Math.round(depth)||1)));
   card.dataset.partialOffline=String(active&&!recovered&&offlineCount>0&&!fullyOffline);
   const art=machineArt(members,machine=>{selectedMachine=machine.id;highlighted=new Set();const operations=new Map(plant.operations.map(o=>[o.id,o]));for(const op of plant.operations.filter(op=>op.machineId===machine.id))for(const id of dependencyChain(plant,op.id))highlighted.add(operations.get(id).machineId);draw();},new Set(affected.map(c=>c.machineId)),recovered);card.querySelector('.plant-state').before(art);
   card.addEventListener('click',()=>{if(!department){department=t.item.id;page=0;draw();}else{highlighted=new Set();for(const op of plant.operations.filter(op=>op.machineId===t.item.id))for(const id of dependencyChain(plant,op.id)){const item=plant.operations.find(o=>o.id===id);highlighted.add(item.machineId);}caption.textContent='Dependency chain highlighted for '+t.item.label;draw();}});tiles.append(card);
  }
  pageLabel.textContent=(department??'Entire plant')+' · '+layout.total+' '+(department?'machines':'departments')+' · view '+(page+1)+' of '+layout.pages;previous.disabled=page===0;next.disabled=page+1>=layout.pages;overview.disabled=!department;
  recover.disabled=!active||recovered||!result.recovery.feasible||busy||!consent.hidden;
  caption.textContent=selectedMachine?'Dependency chain · '+selectedMachine+' → '+highlighted.size+' connected machines':recovered?'Recovery accepted · '+result.recovery.assignments.length+' operations · '+format(result.recovery.finishHours)+'h · $'+format(result.recovery.costUsd):active?labels[failureSelect.value]+' → '+result.affected.length+' affected operations. Preview a recovery, then accept it.':plant.label+' · '+plant.machines.length+' machines. Choose a failure to see the cascade.';
  paintMetrics(1);cancelAnimationFrame(raf);animate(performance.now());
 }
 function paintMetrics(progress){const m=result.metrics;metrics.replaceChildren(...[[active?m.lostHours*progress:0,'HOURS AT RISK'],[active?m.lateOrders*progress:0,'LATE ORDERS'],[active?m.exposureUsd*progress:0,'COST AT RISK'],[active?m.shipSlipHours*progress:0,'SHIP SLIP · HOURS']].map(([n,label])=>{const cell=el('div');cell.append(el('strong',(label==='COST AT RISK'?'$':'')+format(n)),el('span',label));return cell;}));}
 function animate(now){if(!dialog.open)return;const sample=globalThis.__cascadeFpsSample;if(sample&&sample.collecting){if(sample.last)sample.frames.push(now-sample.last);sample.last=now;}
  const progress=reduced.matches?1:Math.min(1,(now-start)/2400);if(active)paintMetrics(progress);
  for(const node of tiles.children){const depthReady=active&&!recovered&&Number(node.dataset.depth)<=progress*result.cascade.reduce((n,c)=>Math.max(n,c.depth),1);const hit=depthReady&&node.dataset.affected==='true'&&node.dataset.partialOffline!=='true';node.classList.toggle('cascade-hit',hit);node.classList.toggle('cascade-partial',depthReady&&node.dataset.partialOffline==='true');const mark=node.querySelector('.plant-offline-mark');if(hit&&!node.classList.contains('plant-tile-machine')){if(!mark){const badge=el('span','×','plant-offline-mark');badge.setAttribute('aria-hidden','true');node.append(badge);}}else if(mark)mark.remove();}
  const box=floor.getBoundingClientRect(),dpr=devicePixelRatio||1;if(canvas.width!==Math.round(box.width*dpr)||canvas.height!==Math.round(box.height*dpr)){canvas.width=Math.round(box.width*dpr);canvas.height=Math.round(box.height*dpr);}const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,box.width,box.height);
  const nodes=[...tiles.children];
  const drawFlow=(from,to,color,nowStamp)=>{
   const ax=parseFloat(from.style.left)+parseFloat(from.style.width)/2,ay=parseFloat(from.style.top)+parseFloat(from.style.height)/2;
   const bx=parseFloat(to.style.left)+parseFloat(to.style.width)/2,by=parseFloat(to.style.top)+parseFloat(to.style.height)/2;
   ctx.strokeStyle=color;ctx.lineWidth=2.5;ctx.setLineDash(reduced.matches?[]:[10,8]);ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke();ctx.setLineDash([]);
   if(!reduced.matches){const t=((nowStamp/14)%100)/100;ctx.fillStyle=color;ctx.beginPath();ctx.arc(ax+(bx-ax)*t,ay+(by-ay)*t,5,0,Math.PI*2);ctx.fill();}
  };
  if(recovered&&nodes.length>1){
   for(let i=0;i<nodes.length-1;i++)drawFlow(nodes[i],nodes[i+1],'#56ff9a',now);
  }else if(active&&!recovered&&nodes.length>1){
   // Feasible recovery preview: emerald flow only between departments that still have running capacity.
   const runningNodes=[...nodes].filter(n=>/RUNNING/.test(n.querySelector('.plant-state')?.textContent??'')||!n.classList.contains('cascade-hit'));
   const path=runningNodes.length>1?runningNodes:nodes;
   for(let i=0;i<path.length-1;i++)drawFlow(path[i],path[i+1],'#56ff9a88',now);
   ctx.strokeStyle='#27664c';ctx.lineWidth=1.5;
   for(const node of nodes){const y=parseFloat(node.style.top)+parseFloat(node.style.height)/2;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(box.width,y);ctx.stroke();}
  }else{
   ctx.strokeStyle='#27664c';ctx.lineWidth=2;
   for(const node of nodes){const x=parseFloat(node.style.left),y=parseFloat(node.style.top)+parseFloat(node.style.height)/2;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(box.width,y);ctx.stroke();ctx.fillStyle='#8cfbc0';const offset=reduced.matches?0:(now/12)%box.width;ctx.fillRect((x+offset)%box.width,y-3,18,6);}
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

function machineArt(machines,onMachine,affectedIds=new Set(),recovered=false){
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 480 150');svg.setAttribute('aria-label','Machines in this department');svg.classList.add('plant-machinery');
 const defs=document.createElementNS(ns,'defs'),pattern=document.createElementNS(ns,'pattern');pattern.id='plant-offline-hatch-'+Math.random().toString(36).slice(2,8);pattern.setAttribute('width','8');pattern.setAttribute('height','8');pattern.setAttribute('patternUnits','userSpaceOnUse');pattern.setAttribute('patternTransform','rotate(45)');const hatchLine=document.createElementNS(ns,'line');hatchLine.setAttribute('x1','0');hatchLine.setAttribute('y1','0');hatchLine.setAttribute('x2','0');hatchLine.setAttribute('y2','8');hatchLine.setAttribute('stroke','#c5ccd4');hatchLine.setAttribute('stroke-width','2');pattern.append(hatchLine);defs.append(pattern);svg.append(defs);
 // Cap overview density so sparse departments (Assembly) and dense ones (CNC mills) share balanced glyph size.
 const limit=Math.min(machines.length,8),shown=machines.slice(0,limit),overflow=machines.length-shown.length;
 const columns=Math.max(1,Math.ceil(Math.sqrt(shown.length*1.35))),rows=Math.ceil(shown.length/columns),pitchX=480/columns,pitchY=(overflow?132:150)/rows,scale=Math.min(1.35,Math.max(0.72,Math.min(pitchX/64,pitchY/58)));
 shown.forEach((machine,i)=>{const g=document.createElementNS(ns,'g');g.dataset.plantMachine=machine.id;g.setAttribute('tabindex','0');g.setAttribute('role','button');const offline=!recovered&&affectedIds.has(machine.id);g.setAttribute('aria-label',(offline?'OFFLINE ':'')+'Inspect '+machine.label);const select=event=>{event.preventDefault();event.stopPropagation();onMachine(machine);};g.addEventListener('click',select);g.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' ')select(event);});g.setAttribute('transform','translate('+((i%columns)*pitchX+pitchX/2-30*scale)+' '+(Math.floor(i/columns)*pitchY+pitchY/2-25*scale)+') scale('+scale+')');
  for(const [points,fill]of[['0,14 20,2 62,2 43,14',offline?'#8a9399':'#a9cbb7'],['43,14 62,2 62,42 43,54',offline?'#3a4147':'#294b3a'],['0,14 43,14 43,54 0,54',offline?'#5c656c':'#527862']]){const p=document.createElementNS(ns,'polygon');p.setAttribute('points',points);p.setAttribute('fill',fill);p.setAttribute('stroke','#c5ccd4');p.setAttribute('stroke-width','1');g.append(p);}
  if(offline){
   const hatch=document.createElementNS(ns,'rect');hatch.setAttribute('x','2');hatch.setAttribute('y','4');hatch.setAttribute('width','60');hatch.setAttribute('height','50');hatch.setAttribute('fill','url(#'+pattern.id+')');hatch.setAttribute('opacity','0.85');g.prepend(hatch);
   for(const d of ['M10 18 L52 46','M52 18 L10 46']){const line=document.createElementNS(ns,'path');line.setAttribute('d',d);line.setAttribute('stroke','#c5ccd4');line.setAttribute('stroke-width','3');g.append(line);}
   const label=document.createElementNS(ns,'text');label.textContent='OFFLINE';label.setAttribute('x','4');label.setAttribute('y','40');label.setAttribute('fill','#e8edf0');label.setAttribute('font-size','18');label.setAttribute('font-weight','800');label.setAttribute('letter-spacing','0.4');g.append(label);
  }
  else{const window=document.createElementNS(ns,'rect');for(const [k,v]of Object.entries({x:8,y:22,width:25,height:20,rx:2,fill:'#03100a',stroke:'#92ffc1'}))window.setAttribute(k,v);g.append(window);const light=document.createElementNS(ns,'circle');for(const [k,v]of Object.entries({cx:21,cy:31,r:4,fill:'#8affb8'}))light.setAttribute(k,v);light.classList.add('plant-machine-light');g.append(light);}
  svg.append(g);
 });
 if(overflow>0){const more=document.createElementNS(ns,'text');more.textContent='+'+overflow+' more';more.setAttribute('x','240');more.setAttribute('y','146');more.setAttribute('text-anchor','middle');more.setAttribute('fill','#a9c8b8');more.setAttribute('font-size','16');more.setAttribute('font-weight','700');svg.append(more);}
 return svg;
}
