import {readFileSync} from 'node:fs';
const root=new URL('../../',import.meta.url);
export function renderJudgeReadme(){
 const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
 const image=path=>'data:'+(/\.svg$/.test(path)?'image/svg+xml':/\.png$/.test(path)?'image/png':'image/jpeg')+';base64,'+readFileSync(new URL(path,root)).toString('base64');
 const inline=line=>escape(line).replace(/!\[([^\]]*)\]\(([^)]+)\)/g,(_,label,path)=>'<img class="partner" alt="'+label+'" src="'+image(path)+'">').replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<span class="link">$1</span>').replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>');
 const sections=[];let list=false,table=false;
 for(const line of readFileSync(new URL('README.md',root),'utf8').split(/\r?\n/)){
  if(!line.trim()||line.startsWith('<!--'))continue;
  if(!/^\d+\./.test(line)&&list){sections.push('</ol>');list=false;}
  if(!line.startsWith('|')&&table){sections.push('</tbody></table>');table=false;}
  if(line.startsWith('<p align=')){sections.push(line.replace(/src="([^"]+)"/,(_,path)=>'src="'+image(path)+'"'));continue;}
  const heading=line.match(/^(#{1,3}) (.*)/);if(heading){sections.push('<h'+heading[1].length+'>'+inline(heading[2])+'</h'+heading[1].length+'>');continue;}
  if(/^\d+\./.test(line)){if(!list){sections.push('<ol>');list=true;}sections.push('<li>'+inline(line.replace(/^\d+\.\s*/,''))+'</li>');continue;}
  if(line.startsWith('|')){if(/^\|\s*---/.test(line))continue;if(!table){sections.push('<table><tbody>');table=true;}sections.push('<tr>'+line.split('|').filter(s=>s.trim()).map(s=>'<td>'+inline(s.trim())+'</td>').join('')+'</tr>');continue;}
  sections.push('<p>'+inline(line)+'</p>');
 }
 return '<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#07100c;color:#dce9e1;font:18px/1.6 system-ui}main{max-width:1080px;margin:auto;padding:36px}h1{font-size:40px;color:#a0ffc4}h2{font-size:28px;color:#b8efcd;margin-top:34px}img{max-width:100%;height:auto}p[align=center]{text-align:center}p[align=center] img{border-radius:10px}.partner{width:130px}table{width:100%;border-collapse:collapse}td{padding:12px 18px;border:1px solid #3a5e48}li{margin:12px 0}.link{color:#96edb5}b{color:#effaf3}</style></head><body><main>'+sections.join('\n')+'</main></body></html>';
}
