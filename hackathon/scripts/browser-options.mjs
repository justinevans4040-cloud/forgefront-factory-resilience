// Offline accessibility checks must never inherit a live-run environment flag.
export function browserOptions(args,env){
 const keyboardOnly=args.includes('--keyboard');
 if(keyboardOnly&&(args.includes('--live')||args.includes('--guided')))throw Error('Offline keyboard checks cannot request live or guided model gates');
 return {keyboardOnly,liveBrowser:!keyboardOnly&&(env.FFR_LIVE_BROWSER==='1'||args.includes('--live')),guided:!keyboardOnly&&args.includes('--guided'),mobileFlow:args.includes('--mobile')};
}
// Public browser checks use the real production limits; fallback mode never contacts a provider.
export function publicSmokeConfig(args){return args.includes('--public-fallback')?{dailyMaximum:0}:args.includes('--public-hosting')?{}:undefined;}
