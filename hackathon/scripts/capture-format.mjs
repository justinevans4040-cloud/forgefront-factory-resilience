export function screenshotCaptureOptions(args=[]){return args.includes('--jpeg-evidence')?{format:'jpeg',quality:90,captureBeyondViewport:false}:{format:'png',captureBeyondViewport:false};}
export function screenshotExtension(args=[]){return args.includes('--jpeg-evidence')?'jpg':'png';}
export function screenshotMime(path){return /\.jpe?g$/i.test(path)?'image/jpeg':'image/png';}
