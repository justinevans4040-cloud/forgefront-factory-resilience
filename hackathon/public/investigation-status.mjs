export function investigationStatus({phase='empty',elapsedMs=0,route='Selected route',call=null}={}){
 if(phase==='empty')return 'Choose a route, then Investigate. No model has run on this snapshot yet. Live keys must be configured; Sample is explicitly offline.';
 if(phase==='failed')return route+' · Stopped. No replacement answer was generated. Inspect the recorded failure, then select the route and retry explicitly.';
 if(phase==='complete')return 'Complete. Inspect source-validated facts and calculated options. Model narrative remains unvalidated advice.';
 const seconds=Math.max(0,Math.floor(elapsedMs/1000));
 const callText=call?.status==='waiting'?' Call '+call.number+' · '+Math.max(0,Math.ceil(call.remainingMs/1000))+'s remaining · '+Math.ceil(call.timeoutMs/1000)+'s timeout for this request. No automatic retry or provider switch.':'';
 return route+' · '+seconds+'s · '+(seconds>=12?'Still waiting for the selected route. No automatic retry or provider switch.':'Waiting for read-only investigation results.')+callText+' '+Math.max(0,60-seconds)+'s remaining in the one-minute model budget (from request start). Status requests time out after 12s. Elapsed time is not completion progress.';
}
