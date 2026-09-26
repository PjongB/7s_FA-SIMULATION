const fs=require('node:fs');
const sim=require('../engine.js');
const scenarios={};
for(let q=1;q<=20;q++){
 const p=sim.makePlan(q);
 const times=[...new Set(p.events.map(e=>e.time))].sort((a,b)=>a-b);
 scenarios[q]=times.map((time,index)=>({seq:index+1,time,events:p.events.filter(e=>e.time===time),...((s)=>({transport:s.transport,remaining:s.remaining,completed:s.completed,done:s.done}))(sim.snapshot(p,time))}));
}
fs.writeFileSync(require('node:path').join(__dirname,'scenarios.json'),JSON.stringify(scenarios));
