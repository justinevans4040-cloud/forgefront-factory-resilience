import {analyzePlant,dependencyChain} from './plant-engine.mjs';
import {plantTiles,plantGroups} from './plant-layout.mjs';
const el=(tag,content,className)=>{const node=document.createElement(tag);if(content!=null)node.textContent=content;if(className)node.className=className;return node;};
export function mountCascade({loadPlant,launcher,workflow}){
 const dialog=el('dialog',null,'plant-room');dialog.id='plant-room';dialog.setAttribute('aria-label','Full-shop recovery');
 const top=el('div',null,'plant-top'),brand=el('div',null,'plant-brand'),logo=el('img');logo.src='/forgefront-systems-logo.png';logo.alt='Forgefront Systems';brand.append(logo,el('strong','FULL-SHOP RECOVERY'));
 const close=el('button','Return to recovery room','secondary');close.addEventListener('click',()=>dialog.close());const cinema=el('button','Recording view','secondary');cinema.addEventListener('click',()=>{dialog.classList.toggle('recording');cinema.textContent=dialog.classList.contains('recording')?'Show controls':'Recording view';});top.append(brand,cinema,close);
 const controls=el('div',null,'plant-controls'),failureLabel=el('label','Choose a failure'),failureSelect=el('select'),strategyLabel=el('label','Recovery path'),strategySelect=el('select');failureSelect.id='plant-failure';strategySelect.id='plant-strategy';failureLabel.htmlFor=failureSelect.id;strategyLabel.htmlFor=strategySelect.id;
 const labels={'wrong-cert':'Wrong certificate','wrong-material':'Wrong material','wrong-grain':'Wrong grain direction','wrong-sticker':'Mislabeled sticker','failed-hardness':'Failed hardness'};
 for(const [id,label]of [['reroute','Reroute to alternate machines'],['expedite','Expedite verified replacement'],['rework','Rework and re-inspect']]){const option=el('option',label);option.value=id;strategySelect.append(option);}
 const trigger=el('button','Trigger failure'),recover=el('button','Accept calculated recovery'),overview=el('button','All departments','secondary'),previous=el('button','Previous','secondary'),next=el('button','Next','secondary');controls.append(failureLabel,failureSelect,trigger,strategyLabel,strategySelect,recover);
 const consent=el('div',null,'plant-consent');consent.hidden=true;const consentLabel=el('label','Type the approval phrase to seal this plant recovery');const consentInput=el('input');consentInput.id='plant-consent-phrase';consentInput.autocomplete='off';consentInput.spellcheck=false;consentLabel.htmlFor=consentInput.id;const seal=el('button','Seal recovery and draft The Britt');const cancelConsent=el('button','Cancel','secondary');consent.append(consentLabel,consentInput,seal,cancelConsent);
 const metrics=el('div',null,'plant-metrics'),caption=el('p','','plant-caption'),floor=el('div',null,'plant-floor'),tiles=el('div',null,'plant-tiles'),canvas=el('canvas',null,'plant-flow'),navigation=el('div',null,'plant-navigation'),pageLabel=el('span');floor.append(canvas,tiles);navigation.append(overview,previous,pageLabel,next);dialog.append(top,controls,consent,metrics,caption,floor,navigation);document.body.append(dialog);
 let selectedMachine=null,plant,result,department=null,page=0,active=false,recovered=false,start=0,raf=0,highlighted=new Set(),resize,envelope=null,busy=false;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const calculate=()=>analyzePlant(plant,{lotId:plant.lots[0].id,failure:failureSelect.value,strategy:strategySelect.value});
 const format=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(n);
 function setConsent(open){
  consent.hidden=!open;
  if(open){consentInput.value='';consentInput.placeholder='APPROVE '+strategySelect.value;seal.disabled=true;consentInput.focus();}
  else{envelope=null;consentInput.value='';}
 }
 function draw(){
  if(!plant||!dialog.open)return;
  result=calculate();const groups=plantGroups(result.machines),items=department?groups.find(g=>g.id===department).machines:groups;
  const box=floor.getBoundingClientRect(),layout=plantTiles(items,{width:box.width,height:box.height,minWidth:department?220:300,minHeight:180,page});page=layout.page;
  tiles.replaceChildren();
  for(const t of layout.tiles){const card=el('button',null,'plant-tile');card.dataset.plantNode=t.item.id;card.style.left=t.x+'px';card.style.top=t.y+'px';card.style.width=t.width+'px';card.style.height=t.height+'px';
   const members=t.item.machines??[t.item],ids=new Set(members.map(m=>m.id)),affected=result.cascade.filter(c=>ids.has(c.machineId)),depth=affected.reduce((min,c)=>Math.min(min,c.depth),Infinity);
   card.dataset.depth=String(depth);card.dataset.affected=String(affected.length>0);card.dataset.recovered=String(recovered);card.classList.toggle('chain-linked',members.some(m=>highlighted.has(m.id)));
   const departmentState=recovered?'RECOVERY ACCEPTED':active&&affected.length?(affected.length===members.length?'OFFLINE · × HOLD':affected.length+' OFFLINE · '+ (members.length-affected.length)+' RUNNING'):'RUNNING';
   card.append(el('strong',t.item.label),el('span',department?members[0].capacityHours+'h capacity · $'+members[0].hourlyCostUsd+'/h':members.length+' machines · '+affected.length+' affected operations','plant-sub'),el('span',departmentState,'plant-state'));
   const art=machineArt(members,machine=>{selectedMachine=machine.id;highlighted=new Set();const operations=new Map(plant.operations.map(o=>[o.id,o]));for(const op of plant.operations.filter(op=>op.machineId===machine.id))for(const id of dependencyChain(plant,op.id))highlighted.add(operations.get(id).machineId);draw();},new Set(affected.map(c=>c.machineId)),recovered);card.querySelector('.plant-state').before(art);
   card.addEventListener('click',()=>{if(!department){department=t.item.id;page=0;draw();}else{highlighted=new Set();for(const op of plant.operations.filter(op=>op.machineId===t.item.id))for(const id of dependencyChain(plant,op.id)){const item=plant.operations.find(o=>o.id===id);highlighted.add(item.machineId);}caption.textContent='Dependency chain highlighted for '+t.item.label;draw();}});tiles.append(card);
  }
  pageLabel.textContent=(department??'Entire plant')+' · '+layout.total+' '+(department?'machines':'departments')+' · view '+(page+1)+' of '+layout.pages;previous.disabled=page===0;next.disabled=page+1>=layout.pages;overview.disabled=!department;
  recover.disabled=!active||recovered||!result.recovery.feasible||busy||!consent.hidden;
  caption.textContent=selectedMachine?'Dependency chain · '+selectedMachine+' → '+highlighted.size+' connected machines':recovered?'Recovery accepted · '+result.recovery.assignments.length+' scheduled operations · '+format(result.recovery.finishHours)+'h completion · $'+format(result.recovery.costUsd)+' · sealed in the ledger':active?labels[failureSelect.value]+' → '+result.affected.length+' affected operations. Preview a recovery, then accept it.':plant.label+' · '+plant.machines.length+' machines connected by real operation dependencies. Choose a failure to see the cascade.';
  paintMetrics(1);cancelAnimationFrame(raf);animate(performance.now());
 }
 function paintMetrics(progress){const m=result.metrics;metrics.replaceChildren(...[[active?m.lostHours*progress:0,'HOURS AT RISK'],[active?m.lateOrders*progress:0,'LATE ORDERS'],[active?m.exposureUsd*progress:0,'COST AT RISK'],[active?m.shipSlipHours*progress:0,'SHIP SLIP · HOURS']].map(([n,label])=>{const cell=el('div');cell.append(el('strong',(label==='COST AT RISK'?'$':'')+format(n)),el('span',label));return cell;}));}
 function animate(now){if(!dialog.open)return;const progress=reduced.matches?1:Math.min(1,(now-start)/2400);if(active)paintMetrics(progress);
  for(const node of tiles.children){const hit=active&&!recovered&&Number(node.dataset.depth)<=progress*result.cascade.reduce((n,c)=>Math.max(n,c.depth),1);node.classList.toggle('cascade-hit',hit);const mark=node.querySelector('.plant-offline-mark');if(hit&&!recovered&&node.dataset.affected==='true'){if(!mark){const badge=el('span','×','plant-offline-mark');badge.setAttribute('aria-hidden','true');node.append(badge);}}else if(mark)mark.remove();}
  const box=floor.getBoundingClientRect(),dpr=devicePixelRatio||1;if(canvas.width!==Math.round(box.width*dpr)||canvas.height!==Math.round(box.height*dpr)){canvas.width=Math.round(box.width*dpr);canvas.height=Math.round(box.height*dpr);}const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,box.width,box.height);ctx.strokeStyle='#27664c';ctx.lineWidth=2;
  for(const node of tiles.children){const x=parseFloat(node.style.left),y=parseFloat(node.style.top)+parseFloat(node.style.height)/2;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(box.width,y);ctx.stroke();if(!active||recovered){ctx.fillStyle='#8cfbc0';const offset=reduced.matches?0:(now/12)%box.width;ctx.fillRect((x+offset)%box.width,y-3,18,6);}}
  if(!reduced.matches)raf=requestAnimationFrame(animate);
 }
 trigger.addEventListener('click',()=>{active=true;recovered=false;setConsent(false);start=performance.now();draw();});
 recover.addEventListener('click',async()=>{
  if(!result.recovery.feasible||busy||!workflow?.api)return;
  busy=true;recover.disabled=true;recover.textContent='Preparing consent…';
  try{
   envelope=await workflow.api('plant-review',{lotId:plant.lots[0].id,failure:failureSelect.value,strategy:strategySelect.value});
   setConsent(true);caption.textContent='Type APPROVE '+strategySelect.value+' to seal the calculated plant recovery in the ledger.';
  }catch(error){caption.textContent=error?.message||'Plant recovery consent failed';}
  finally{busy=false;recover.textContent='Accept calculated recovery';draw();}
 });
 consentInput.addEventListener('input',()=>{seal.disabled=!envelope||consentInput.value.trim()!=='APPROVE '+strategySelect.value||busy;});
 cancelConsent.addEventListener('click',()=>{setConsent(false);draw();});
 seal.addEventListener('click',async()=>{
  if(!envelope||busy||consentInput.value.trim()!=='APPROVE '+strategySelect.value)return;
  busy=true;seal.disabled=true;seal.textContent='Sealing…';
  try{
   await workflow.api('confirm',{nonce:envelope.nonce,typed:consentInput.value.trim()});
   recovered=true;setConsent(false);
   if(typeof workflow.afterAccept==='function')await workflow.afterAccept({strategy:strategySelect.value,failure:failureSelect.value});
   caption.textContent='Recovery sealed · The Britt is drafting tracked work from the accepted plant plan.';
  }catch(error){caption.textContent=error?.message||'Plant recovery confirmation failed';setConsent(Boolean(envelope));}
  finally{busy=false;seal.textContent='Seal recovery and draft The Britt';draw();}
 });
 failureSelect.addEventListener('change',()=>{active=false;recovered=false;setConsent(false);draw();});strategySelect.addEventListener('change',()=>{recovered=false;setConsent(false);draw();});overview.addEventListener('click',()=>{department=null;page=0;draw();});previous.addEventListener('click',()=>{page--;draw();});next.addEventListener('click',()=>{page++;draw();});
 dialog.addEventListener('close',()=>{cancelAnimationFrame(raf);resize?.disconnect();setConsent(false);});
 launcher.addEventListener('click',async event=>{event.preventDefault();try{plant=await loadPlant();failureSelect.replaceChildren(...Object.keys(plant.failurePolicies).map(id=>{const option=el('option',labels[id]??id);option.value=id;return option;}));department=null;page=0;active=false;recovered=false;setConsent(false);dialog.showModal();start=performance.now();resize=new ResizeObserver(draw);resize.observe(floor);draw();}catch{launcher.textContent='Open the recovery room to explore the full shop';}});
 return {dialog};
}

function machineArt(machines,onMachine,affectedIds=new Set(),recovered=false){
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 400 100');svg.setAttribute('aria-label','Machines in this department');svg.classList.add('plant-machinery');
 const columns=Math.ceil(Math.sqrt(machines.length*4)),rows=Math.ceil(machines.length/columns),pitchX=400/columns,pitchY=100/rows,scale=Math.min(pitchX/70,pitchY/60);
 machines.forEach((machine,i)=>{const g=document.createElementNS(ns,'g');g.dataset.plantMachine=machine.id;g.setAttribute('tabindex','0');g.setAttribute('role','button');const offline=!recovered&&affectedIds.has(machine.id);g.setAttribute('aria-label',(offline?'OFFLINE ':'')+'Inspect '+machine.label);const select=event=>{event.preventDefault();event.stopPropagation();onMachine(machine);};g.addEventListener('click',select);g.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' ')select(event);});g.setAttribute('transform','translate('+((i%columns)*pitchX+pitchX/2-30*scale)+' '+(Math.floor(i/columns)*pitchY+pitchY/2-25*scale)+') scale('+scale+')');
  for(const [points,fill]of [['0,14 20,2 62,2 43,14',offline?'#8a9399':'#a9cbb7'],['43,14 62,2 62,42 43,54',offline?'#3a4147':'#294b3a'],['0,14 43,14 43,54 0,54',offline?'#5c656c':'#527862']]){const p=document.createElementNS(ns,'polygon');p.setAttribute('points',points);p.setAttribute('fill',fill);p.setAttribute('stroke','#c5ccd4');p.setAttribute('stroke-width','1');g.append(p);}
  if(offline){for(const d of ['M10 20 L52 48','M52 20 L10 48']){const line=document.createElementNS(ns,'path');line.setAttribute('d',d);line.setAttribute('stroke','#c5ccd4');line.setAttribute('stroke-width','3');g.append(line);}const label=document.createElementNS(ns,'text');label.textContent='OFFLINE';label.setAttribute('x','12');label.setAttribute('y','40');label.setAttribute('fill','#c5ccd4');label.setAttribute('font-size','8');label.setAttribute('font-weight','700');g.append(label);}
  else{const window=document.createElementNS(ns,'rect');for(const [k,v]of Object.entries({x:8,y:22,width:25,height:20,rx:2,fill:'#03100a',stroke:'#92ffc1'}))window.setAttribute(k,v);g.append(window);const light=document.createElementNS(ns,'circle');for(const [k,v]of Object.entries({cx:21,cy:31,r:4,fill:'#8affb8'}))light.setAttribute(k,v);light.classList.add('plant-machine-light');g.append(light);}
  svg.append(g);
 });return svg;
}
