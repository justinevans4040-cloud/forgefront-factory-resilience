// Local heuristic only: passing does not prove entropy or safe custody.
export function passphraseFeedback(value){
 if(typeof value!=='string'||value.length<16||value.length>160)return {ok:false,message:'Use a separate export passphrase of 16 to 160 characters.'};
 const words=value.toLowerCase().trim().split(/\s+/);
 const classes=[/[a-z]/,/[A-Z]/,/[0-9]/,/[^a-zA-Z0-9\s]/].filter(r=>r.test(value)).length;
 if(new Set(value.toLowerCase()).size<8||/^(password|1234567890|qwerty|abcdefgh)+/i.test(value)||(new Set(words).size<3&&classes<3))return {ok:false,message:'Weak passphrase: use at least three distinct words or three character types, with varied characters.'};
 return {ok:true,message:'Passphrase meets the local strength minimum. Use unique, randomly chosen words; strength and custody are not guaranteed.'};
}

export function passphraseInputStatus(value){
 const feedback=passphraseFeedback(value),count=typeof value==='string'?value.length:0;
 return {ok:feedback.ok,message:count+'/160 characters · '+(feedback.ok?'Separate passphrase meets the rules.':count<16||count>160?'Use 16–160 characters and three distinct words or three character types.':'Use three distinct words or three character types with varied characters.')};
}
