// One explicit primary retry, then the approved Meta-model host. The caller's
// remaining wall-clock budget covers every attempt; no standby inference route.
export function resilientWonder(primary,makeFallback,{record=async()=>{},now=()=>Date.now()}={}){
 if(primary.route?.provider!=='meta-model-api')throw Error('PRIMARY_META_ROUTE_REQUIRED');
 let fallback=null;
 return {...primary,resilient:true,async complete(request){
  const deadline=now()+(request.timeoutMs??60000);
  const complete=async(client,budget)=>{
   const remaining=deadline-now();if(remaining<=0)throw Error('MODEL_DEADLINE');
   const result=await client.complete({...request,...(client!==primary?{maxTokens:8192}:{}),timeoutMs:Math.min(remaining,budget)});
   if(result.modelId!==client.route.model)throw Error('MODEL_IDENTITY_MISMATCH');
   return {...result,route:client.route,fallbackUsed:client!==primary};
  };
  if(fallback)return complete(fallback,deadline-now());
  for(let attempt=0;attempt<2;attempt++){
   try{return await complete(primary,Math.min(10000,Math.max(1,(deadline-now())/3)));}
   catch(error){
    await record({provider:primary.route.provider,requestedModel:primary.route.model,status:'rejected',failure:error.message==='MODEL_IDENTITY_MISMATCH'?'MODEL_IDENTITY_MISMATCH':'PRIMARY_REQUEST_FAILED',purpose:attempt?'investigation_fallback':'investigation_retry',operationalRelease:false});
    if(error.message==='MODEL_IDENTITY_MISMATCH')throw error;
   }
  }
  fallback=makeFallback();if(fallback?.route?.provider!=='baseten'||fallback.route.model!=='meta-models/muse-spark-open')throw Error('PRIMARY_META_ROUTE_REQUIRED');
  return complete(fallback,deadline-now());
 }};
}
