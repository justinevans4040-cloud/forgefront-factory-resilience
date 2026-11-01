// The viewport determines how many tiles fit. Every entity remains navigable.
export function plantTiles(items,{width,height,minWidth=180,minHeight=92,gap=16,page=0}){
 const maxColumns=Math.max(1,Math.floor((width+gap)/(minWidth+gap))),maxRows=Math.max(1,Math.floor((height+gap)/(minHeight+gap))),columns=Math.min(maxColumns,Math.max(1,Math.round(Math.sqrt(items.length*width/(height*1.5))))),rows=Math.min(maxRows,Math.max(1,Math.ceil(items.length/columns))),pageSize=columns*rows,pages=Math.max(1,Math.ceil(items.length/pageSize)),selected=Math.max(0,Math.min(page,pages-1));
 const cellWidth=(width-gap*(columns-1))/columns,cellHeight=(height-gap*(rows-1))/rows,tiles=[];
 for(let i=selected*pageSize;i<Math.min(items.length,(selected+1)*pageSize);i++){const local=i-selected*pageSize;tiles.push({item:items[i],x:(local%columns)*(cellWidth+gap),y:Math.floor(local/columns)*(cellHeight+gap),width:cellWidth,height:cellHeight});}
 return {tiles,page:selected,pages,total:items.length,pageSize};
}
export function plantGroups(machines){const groups=new Map();for(const machine of machines){const id=machine.department??'Production';if(!groups.has(id))groups.set(id,{id,label:id,machines:[]});groups.get(id).machines.push(machine);}return [...groups.values()];}
