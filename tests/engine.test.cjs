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

// The second robot stages as soon as the first reaches storage, before dispatch.
for(let n=1;n<=20;n++){
 const plan=makePlan(n);
 const firstArrival=plan.events.find(e=>e.kind==='arrive'&&e.robot===0&&e.to==='warehouse');
 const staging=plan.tasks.filter(t=>t.actor===1&&t.type==='move'&&t.from==='home'&&t.to==='waiting');
 if(n===1){
  assert.equal(staging.length,0);
  assert(plan.tasks.every(t=>t.actor!==1),'One-item orders leave burger 2 at home');
 }else{
  assert.equal(staging.length,1);
  assert.equal(staging[0].start,firstArrival.time);
  assert(staging[0].start<plan.jobs[0].dispatch);
  assert.equal(snapshot(plan,firstArrival.time-.001).robots[1].status,'초기위치 대기');
  assert.equal(snapshot(plan,firstArrival.time).robots[1].status,'대기장소 이동');
  assert.equal(snapshot(plan,staging[0].end).robots[1].status,'대기장소 대기');
 }
}
for(const robot of [0,1]){
 const route=path('warehouse','assembly',robot);
 assert.equal(route.length,3,'Storage to assembly has one turn at the aisle junction');
 const approach=route.at(-2),dock=route.at(-1);
 assert.equal(approach[1],dock[1],'Final approach is horizontal');
 assert(dock[0]>approach[0],'Dock by moving straight right toward the workboard');
 assert.deepEqual(path('assembly','warehouse',robot),[...route].reverse());
}
console.log('PASS: staging trigger for orders 1–20, exact arrival boundary and straight assembly docking.');
// Body heading follows the actual velocity on every straight route segment.
const {pose,DOCK_HEADINGS}=require('../engine.js');
for(const n of [1,2,3,20]){
 const plan=makePlan(n);
 for(const task of plan.tasks.filter(t=>t.type==='move')){
  const route=path(task.from,task.to,task.actor);
  const lengths=route.slice(1).map((p,i)=>Math.hypot(p[0]-route[i][0],p[1]-route[i][1]));
  const total=lengths.reduce((a,b)=>a+b,0);let covered=0;
  for(let i=0;i<lengths.length;i++){
   const fraction=(covered+lengths[i]/2)/total;
   const state=snapshot(plan,task.start+fraction*(task.end-task.start)).robots[task.actor];
   const radians=state.heading*Math.PI/180;
   const dx=route[i+1][0]-route[i][0],dy=route[i+1][1]-route[i][1];
   assert(Math.abs(Math.sin(radians)-dx/lengths[i])<1e-8,'Front must follow horizontal velocity');
   assert(Math.abs(-Math.cos(radians)-dy/lengths[i])<1e-8,'Front must follow vertical velocity');
   covered+=lengths[i];
  }
  assert.equal(pose(route,1).heading,DOCK_HEADINGS[task.to],'Arrive facing target marker and IR line');
 }
 const end=snapshot(plan,plan.duration);
 end.robots.forEach(r=>assert.equal(r.heading,n===1&&r.id===1?90:DOCK_HEADINGS.home));
 const mid=snapshot(plan,plan.duration/2);snapshot(plan,plan.duration);assert.deepEqual(snapshot(plan,plan.duration/2),mid);
}
console.log('PASS: forward-facing travel on every segment, aligned docking headings and deterministic seek.');
