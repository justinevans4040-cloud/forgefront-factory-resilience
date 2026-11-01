export function investigationStatus({phase='empty',elapsedMs=0,route='Meta route',call=null}={}){
 if(phase==='empty')return 'Choose a route, then Investigate. No model has run on this snapshot yet. Sample runs offline without a live AI call.';
 if(phase==='failed')return route+' · Stopped. No replacement answer was generated. Inspect the recorded failure, then select the route and retry explicitly.';
 if(phase==='complete')return 'Ready for review. Inspect source-validated facts, model interpretation and calculated recovery options.';
 const seconds=Math.max(0,Math.floor(elapsedMs/1000));
 const callText=call?.status==='waiting'?' Call '+call.number+' · '+Math.max(0,Math.ceil(call.remainingMs/1000))+'s remaining · '+Math.ceil(call.timeoutMs/1000)+'s timeout for this request.': ''; 
 return route+' · '+seconds+'s · '+(seconds>=12?'Still waiting for the selected route.':'Waiting for read-only investigation results.')+callText+' '+Math.max(0,60-seconds)+'s remaining in the model budget. No automatic retry or provider switch.';
}
