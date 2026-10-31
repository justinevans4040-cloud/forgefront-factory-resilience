// Named credentials are configured only through the server environment.
export function loadOperators(env={}){
 let entries=[];
 try{
  if(env.HACKATHON_OPERATORS_JSON?.trim())entries=JSON.parse(env.HACKATHON_OPERATORS_JSON);
  if(!Array.isArray(entries)||entries.length>32)throw Error();
  const ids=new Set(),tokens=new Set();
  for(const e of entries){
   if(!e||typeof e!=='object'||Object.keys(e).some(k=>!['id','role','token'].includes(k))||typeof e.id!=='string'||! /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(e.id)||e.id==='local-admin'||!['operator','auditor'].includes(e.role)||typeof e.token!=='string'||e.token.length<12||e.token.length>256||e.token!==e.token.trim()||ids.has(e.id)||tokens.has(e.token)||e.token===env.HACKATHON_ADMIN_TOKEN)throw Error();
   ids.add(e.id);tokens.add(e.token);
  }
 }catch{throw new Error('OPERATOR_CONFIGURATION_INVALID');}
 const admin=env.HACKATHON_ADMIN_TOKEN;
 if(admin!=null&&admin!==''&&(typeof admin!=='string'||admin.length<12||admin.length>256||admin!==admin.trim()))throw new Error('OPERATOR_CONFIGURATION_INVALID');
 const allTokens=[...entries.map(e=>e.token),admin].filter(Boolean);
 if(entries.some(e=>allTokens.some(token=>e.id.includes(token))))throw new Error('OPERATOR_CONFIGURATION_INVALID');
 const accounts=entries.map(e=>Object.freeze({...e}));
 if(admin)accounts.push(Object.freeze({id:'local-admin',role:'admin',token:admin}));
 return Object.freeze(accounts);
}
