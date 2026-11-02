// The viewport determines how many tiles fit. Every entity remains navigable.
// Incomplete final rows stretch across the full width so overview grids leave no empty void.
export function plantTiles(items,{width,height,minWidth=180,minHeight=92,gap=16,page=0}){
 const maxColumns=Math.max(1,Math.floor((width+gap)/(minWidth+gap)));
 const maxRows=Math.max(1,Math.floor((height+gap)/(minHeight+gap)));
 const preferred=Math.min(maxColumns,Math.max(1,Math.round(Math.sqrt(Math.min(items.length,maxColumns*maxRows)*width/(height*1.5)))));
 let columns=preferred,rows=Math.min(maxRows,Math.max(1,Math.ceil(Math.min(items.length,maxColumns*maxRows)/columns)));
 // Prefer a denser page packing that still respects min cell size.
 let best={columns,rows,capacity:columns*rows,empty:columns*rows};
 for(let cols=1;cols<=maxColumns;cols++){
  const fitRows=Math.min(maxRows,Math.max(1,Math.ceil(Math.min(items.length,cols*maxRows)/cols)));
  const capacity=cols*fitRows;
  const shown=Math.min(items.length,capacity);
  const empty=capacity-shown;
  const betterCapacity=capacity>best.capacity;
  const sameCapacityFewerEmpty=capacity===best.capacity&&empty<best.empty;
  if(betterCapacity||sameCapacityFewerEmpty){
   best={columns:cols,rows:fitRows,capacity,empty};
  }
 }
 columns=best.columns;rows=best.rows;
 const pageSize=columns*rows,pages=Math.max(1,Math.ceil(items.length/pageSize)),selected=Math.max(0,Math.min(page,pages-1));
 const baseHeight=(height-gap*(rows-1))/rows,tiles=[];
 for(let row=0;row<rows;row++){
  const start=selected*pageSize+row*columns;
  const end=Math.min(items.length,selected*pageSize+(row+1)*columns);
  const count=Math.max(0,end-start);
  if(!count)continue;
  const cellWidth=(width-gap*(count-1))/count;
  const y=row*(baseHeight+gap);
  // Clamp to the floor box so cascade state chrome never reports a tile past the floor (plant clip gate).
  const tileHeight=Math.max(1,Math.min(baseHeight,height-y));
  for(let i=0;i<count;i++){
   const index=start+i;
   const x=i*(cellWidth+gap);
   const tileWidth=Math.max(1,Math.min(cellWidth,width-x));
   tiles.push({item:items[index],x,y,width:tileWidth,height:tileHeight});
  }
 }
 return {tiles,page:selected,pages,total:items.length,pageSize,columns,rows};
}
export function plantGroups(machines){const groups=new Map();for(const machine of machines){const id=machine.department??'Production';if(!groups.has(id))groups.set(id,{id,label:id,machines:[]});groups.get(id).machines.push(machine);}return [...groups.values()];}
