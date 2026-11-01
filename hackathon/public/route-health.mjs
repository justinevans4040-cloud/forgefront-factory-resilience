const names={wonder:'Muse Wonder',baseten:'Spark Open · Baseten',fireworks:'Spark Open · Fireworks'};
export function routeHealthView(selected,health={},now=Date.now()){
 if(selected==='sample')return {light:'OFFLINE',message:'Sample · offline walkthrough; no live AI call. Select a Meta route for live investigation.'};
 const fresh=r=>r&&now-r.checkedAt>=0&&now-r.checkedAt<900000;
 const current=health[selected];const light=current?.light==='RED'&&current.checkedAt===null?'RED':fresh(current)?current.light:'UNCHECKED';
 const alternatives=Object.entries(health).filter(([id,r])=>id!==selected&&fresh(r)&&r.light==='GREEN').map(([id])=>names[id]).join(', ');
 const message=light==='UNCHECKED'?names[selected]+' · Check selected route before presenting.':names[selected]+' · '+light+' · '+current.reason+(fresh(current)?' · checked '+Math.floor((now-current.checkedAt)/1000)+'s ago.':'.');
 return {light,message:message+(light==='RED'?(alternatives?' Choose '+alternatives+' (GREEN) explicitly.':' Check another route explicitly.'):'')};
}
