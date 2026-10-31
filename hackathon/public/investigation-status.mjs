export function investigationStatus({phase='empty',elapsedMs=0,route='Selected route'}={}){
 if(phase==='empty')return 'Choose a route, then Investigate. No model has run on this snapshot yet. Live keys must be configured; Sample is explicitly offline.';
 if(phase==='failed')return route+' · Stopped. No replacement answer was generated. Inspect the recorded failure, then select the route and retry explicitly.';
 if(phase==='complete')return 'Complete. Inspect source-validated facts and calculated options. Model narrative remains unvalidated advice.';
 const seconds=Math.max(0,Math.floor(elapsedMs/1000));
 return route+' · '+seconds+'s · '+(seconds>=12?'Still waiting for the selected route. No automatic retry or provider switch.':'Waiting for read-only investigation results.')+' One-minute model budget; elapsed time is not completion progress.';
}
