const fs=require('node:fs');
const sim=require('../engine.js');

function stagesFor(quantity){
 const p=sim.makePlan(quantity);
 const completed=e=>['arrive','assembly_end','jig_ready','jig_home','pallet_end','complete'].includes(e.kind)||(e.kind==='part'&&e.part===3);
 // A global ACK barrier must never freeze another robot halfway through its trip.
 // Keep turns/drives inside each move; pause only when every moving robot has
 // reached a destination (a new trip at this exact boundary has not moved yet).
 const times=[...new Set(p.events.filter(completed).map(e=>e.time))]
  .filter(time=>!p.tasks.some(t=>t.type==='move'&&t.start<time-1e-7&&time<t.end-1e-7))
  .sort((a,b)=>a-b);
 return times.map((time,index)=>{
  const previous=index?times[index-1]:-1;
  const s=sim.snapshot(p,time);
  return {seq:index+1,time,events:p.events.filter(e=>e.time>previous&&e.time<=time),
   transport:s.transport,remaining:s.remaining,completed:s.completed,done:s.done};
 });
}
if(require.main===module){
 const scenarios=Object.fromEntries(Array.from({length:20},(_,i)=>[i+1,stagesFor(i+1)]));
 fs.writeFileSync(require('node:path').join(__dirname,'scenarios.json'),JSON.stringify(scenarios));
}
module.exports={stagesFor};
