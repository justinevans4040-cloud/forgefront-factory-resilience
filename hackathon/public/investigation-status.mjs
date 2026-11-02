export function investigationStatus({phase='empty',elapsedMs=0,route='Meta route',call=null}={}){
 if(phase==='empty')return 'Choose a route, then Investigate. Sample stays offline.';
 if(phase==='failed')return route+' · Stopped. No replacement answer was generated. Inspect the recorded failure, then select the route and retry explicitly.';
 if(phase==='complete')return 'Ready for review. Inspect source-validated facts, model interpretation and calculated recovery options.';
 const seconds=Math.max(0,Math.floor(elapsedMs/1000));
 const callText=call?.status==='waiting'?' Call '+call.number+' · '+Math.max(0,Math.ceil(call.remainingMs/1000))+'s remaining · '+Math.ceil(call.timeoutMs/1000)+'s timeout for this request.': ''; 
 const found=call?.sourcesRead?' '+call.sourcesRead+' source records read.'+(call.feasiblePaths==null?' Comparing stock and cell capacity next.':' Engine returned '+call.feasiblePaths+' feasible paths; composing the recovery analysis.'):' Reading the certificate and receiving evidence.';
 return route+' · '+seconds+'s · '+(seconds>=12?'Still waiting for the selected route.':'Waiting for read-only investigation results.')+callText+' '+Math.max(0,60-seconds)+'s remaining in the model budget. Wonder can retry once, then use Spark Open on Baseten.'+found;
}
