// sRGB relative luminance. Browser smoke uses this same tested calculation.
export function contrastRatio(a,b){
 const luminance=c=>{
  if(!Array.isArray(c)||c.length<3||c.slice(0,3).some(v=>!Number.isFinite(v)||v<0||v>255))throw Error('Invalid RGB colour');
  const values=c.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});
  return .2126*values[0]+.7152*values[1]+.0722*values[2];
 };
 const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
