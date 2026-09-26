const assert=require('node:assert/strict');
const {makePlan,snapshot}=require('../engine.js');
let cases=0;
for(const n of [1,2,3,4,5,10,20]){
 const p=makePlan(n),end=snapshot(p,p.duration);
 assert.equal(end.transport,0);assert.equal(end.remaining,0);assert.equal(end.completed,n);assert(end.done);
 end.robots.forEach(r=>{assert.equal(r.place,'home');assert.equal(r.parts,0);});
 assert.equal(p.events.filter(e=>e.kind==='dispatch').length,n);
 assert.equal(p.events.filter(e=>e.kind==='pallet_end').length,n);
 assert.equal(p.events.filter(e=>e.kind==='part').length,n*3);
 for(const j of p.jobs){
  assert(j.dispatch>=j.loaded);assert(j.assemblyStart>=j.arrived);
  if(j.id){const prev=p.jobs[j.id-1];assert(j.dispatch>=prev.palletEnd);assert(j.dispatch>=prev.waitEnd);assert(j.warehouseStart>=prev.assemblyStart);}
 }
 for(let t=0;t<=p.duration;t+=.13){const s=snapshot(p,t);assert(s.transport>=0&&s.remaining>=0);assert.equal(s.remaining+s.completed,n);assert(s.transport<=s.remaining);const inAssembly=s.active.filter(a=>a.actor==='arm2');assert(inAssembly.length<=1);}
 for(const actor of [0,1,'arm1','arm2','arm3','linear']){const jobs=p.tasks.filter(t=>t.actor===actor&&t.end>t.start&&t.type!=='gate').sort((a,b)=>a.start-b.start);for(let i=1;i<jobs.length;i++)assert(jobs[i].start>=jobs[i-1].end,`${actor} resource overlap`);}
 // Repeated/rewound reads never decrement persistent counters twice.
 assert.deepEqual(snapshot(p,10),snapshot(p,10));snapshot(p,p.duration);assert.deepEqual(snapshot(p,0),snapshot(p,0));cases++;
}
const p=makePlan(2),j=p.jobs;
assert(j[1].loadStart<j[0].assemblyEnd,'second load overlaps first assembly');
for(const job of j){assert.equal(snapshot(p,job.dispatch-.001).transport,snapshot(p,job.dispatch).transport+1);assert.equal(snapshot(p,job.palletEnd-.001).remaining,snapshot(p,job.palletEnd).remaining+1);}
for(const bad of [0,-1,21,NaN,Infinity,1.2,'2'])assert.throws(()=>makePlan(bad));
console.log(`PASS: ${cases} order sizes; counters, all 3 parts, concurrent work, exclusive resources, interlocks, seek and return-to-home.`);
// All routes must follow floor aisles, with no diagonal cuts through workboards.
const {path,position,POINTS}=require('../engine.js');
const floorAreas=[[280,250,400,975],[50,640,435,850]];
const inFloor=([x,y])=>floorAreas.some(([l,t,r,b])=>x>=l&&x<=r&&y>=t&&y<=b);
for(const n of [1,2,3,20])for(const task of makePlan(n).tasks.filter(t=>t.type==='move')){
 const route=path(task.from,task.to,task.actor);
 const endpoint=place=>POINTS[place==='home'?'home'+(task.actor+1):place];
 assert.deepEqual(route[0],endpoint(task.from));
 assert.deepEqual(route.at(-1),endpoint(task.to));
 for(let i=1;i<route.length;i++)assert(route[i][0]===route[i-1][0]||route[i][1]===route[i-1][1],'Only orthogonal aisle segments');
 for(let i=0;i<=100;i++)assert(inFloor(position(route,i/100)),`${task.from} → ${task.to} leaves the floor aisle`);
}
assert(POINTS.home1[0]<POINTS.warehouse[0]&&POINTS.home1[1]>POINTS.warehouse[1]);
assert(POINTS.assembly[0]>POINTS.warehouse[0]&&POINTS.assembly[1]>POINTS.warehouse[1]);
console.log('PASS: photo-oriented floor layout, route endpoints, orthogonal aisles and workboard avoidance.');
