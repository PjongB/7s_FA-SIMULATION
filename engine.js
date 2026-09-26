/* Deterministic, seekable process simulation. Durations are illustrative seconds. */
(function (root) {
  'use strict';
  const POINTS = { home1:[110,700], home2:[110,795], waiting:[340,920], warehouse:[340,300], assembly:[400,700] };
  const NAME = {home:'초기위치',waiting:'대기장소',warehouse:'자재창고',assembly:'제작공정'};
  function makePlan(quantity) {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) throw new RangeError('주문 수량은 1~20 사이의 정수로 입력하세요.');
    const tasks=[], events=[], jobs=[], tails=[0,0];
    let serial=0;
    const event=(time,kind,data={})=>events.push({time,kind,...data,serial:serial++});
    function task(actor,type,start,end,data={}) { const x={id:tasks.length,actor,type,start,end,...data}; tasks.push(x); return x; }
    function move(robot,from,to,start,duration,job=null) {
      const end=start+duration;
      task(robot,'move',start,end,{from,to,job});
      event(start,'move_start',{robot,from,to,job,text:`버거 ${robot+1} · ${NAME[to]}로 이동`,photo:to==='warehouse'?'warehouse':to==='home'?'home':'route'});
      event(end,'arrive',{robot,to,job,text:`버거 ${robot+1} · ${NAME[to]} 도착`,photo:to==='waiting'?'waiting':to==='home'?'home':to==='assembly'?'process':'warehouse'});
      return end;
    }
    event(0,'order',{quantity,text:`Host 주문 접수 · A제품 ${quantity}개 / 두 카운트 ${quantity}로 설정`,photo:'route'});
    for(let i=0;i<quantity;i++) {
      const robot=i%2, prior=jobs[i-1], prevOwn=jobs[i-2];
      let warehouseStart;
      if(i===0) warehouseStart=0;
      else {
        if(i===1) tails[1]=move(1,'home','waiting',prior.dispatch,3,i);
        warehouseStart=Math.max(tails[robot],prior.assemblyStart);
      }
      const loadStart=move(robot,i===0?'home':'waiting','warehouse',warehouseStart,4,i);
      const loaded=loadStart+4.5;
      task('arm1','load',loadStart,loaded,{robot,job:i});
      event(loadStart,'load_start',{robot,job:i,text:`로봇팔 1 · 버거 ${robot+1}에 부품 3개 적재 시작`,photo:'loading'});
      for(let n=1;n<=3;n++)event(loadStart+n*1.5,'part',{robot,job:i,part:n,text:`제품 #${i+1} · 부품 ${n}/3 적재`,photo:'loading'});
      const dispatch=Math.max(loaded,prior?prior.palletEnd:0,prior?prior.waitEnd:0);
      task(robot,'gate',loaded,dispatch,{job:i});
      event(dispatch,'dispatch',{robot,job:i,text:`제품 #${i+1} · 제작공정 운송 시작 / 운송 잔여 −1`,photo:'route'});
      const arrived=move(robot,'warehouse','assembly',dispatch,5,i);
      const jigStart=prior?prior.palletEnd:0, jigReady=jigStart+3;
      task('linear','prepare',jigStart,jigReady,{job:i});
      event(jigStart,'jig_start',{job:i,text:`리니어 모터 · A지그 위치로 이동`,photo:'process'});
      event(jigReady,'jig_ready',{job:i,text:`리니어 모터 · A지그 위치 도달`,photo:'process'});
      const assemblyStart=Math.max(arrived,jigReady), assemblyEnd=assemblyStart+6;
      task('arm2','assemble',assemblyStart,assemblyEnd,{robot,job:i});
      event(assemblyStart,'assembly_start',{robot,job:i,text:`로봇팔 2 · 제품 #${i+1} 티칭 조립 시작`,photo:'assembly'});
      event(assemblyEnd,'assembly_end',{robot,job:i,text:`제품 #${i+1} 조립 완료`,photo:'assembly'});
      task('linear','reset',assemblyEnd,assemblyEnd+2,{job:i});
      event(assemblyEnd,'jig_reset',{job:i,text:'리니어 모터 · 초기위치 복귀 시작',photo:'process'});
      event(assemblyEnd+2,'jig_home',{job:i,text:'리니어 모터 · 초기위치 복귀 완료',photo:'pallet'});
      const palletStart=assemblyEnd+2,palletEnd=palletStart+3;
      task('arm3','pallet',palletStart,palletEnd,{job:i});
      event(palletStart,'pallet_start',{job:i,text:`로봇팔 3 · 제품 #${i+1} 파렛트 이송`,photo:'pallet'});
      event(palletEnd,'pallet_end',{job:i,text:`제품 #${i+1} 파렛트 적재 성공 / 완제품 잔여 −1`,photo:'pallet'});
      const last=i===quantity-1;
      const waitEnd=move(robot,'assembly',last?'home':'waiting',assemblyEnd,last?6:4,i);
      tails[robot]=waitEnd;
      jobs.push({id:i,robot,warehouseStart,loadStart,loaded,dispatch,arrived,assemblyStart,assemblyEnd,palletStart,palletEnd,waitEnd});
    }
    const last=jobs[quantity-1];
    if(quantity>1) {
      const other=1-last.robot;
      tails[other]=move(other,'waiting','home',Math.max(last.dispatch,tails[other]),3);
    }
    const duration=Math.max(...tails,last.palletEnd);
    event(duration,'complete',{text:`주문 완료 · A제품 ${quantity}개 적재 / 버거 1·2 초기위치 확인`,photo:'pallet'});
    events.sort((a,b)=>a.time-b.time||a.serial-b.serial);
    return {quantity,tasks,events,jobs,duration};
  }
  function point(place,robot) {return POINTS[place==='home'?'home'+(robot+1):place];}
  function path(from,to,robot) {
    // Each bay joins the central vertical aisle; never cut across a workboard.
    const branch=place=>{
      const p=point(place,robot);
      if(place==='home')return [p,[220,p[1]],[220,750],[340,750]];
      if(place==='assembly')return [p,[400,750],[340,750]];
      return [p,[340,750]];
    };
    const points=[...branch(from),...branch(to).reverse()];
    return points.filter((p,i)=>!i||p[0]!==points[i-1][0]||p[1]!==points[i-1][1]);
  }
  function position(points,progress) {
    const lengths=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1]));
    let distance=lengths.reduce((a,b)=>a+b,0)*Math.max(0,Math.min(1,progress));
    for(let i=0;i<lengths.length;i++) {
      if(distance<=lengths[i]||i===lengths.length-1) {
        const f=lengths[i]?distance/lengths[i]:0;
        return [points[i][0]+(points[i+1][0]-points[i][0])*f,points[i][1]+(points[i+1][1]-points[i][1])*f];
      }
      distance-=lengths[i];
    }
    return points.at(-1);
  }
  function snapshot(plan,time) {
    time=Math.max(0,Math.min(plan.duration,time));
    const robots=[0,1].map(i=>({id:i,place:'home',status:'초기위치 대기',parts:0,job:null,position:point('home',i)}));
    const state={time,quantity:plan.quantity,transport:plan.quantity,remaining:plan.quantity,completed:0,robots,linear:0,arms:['대기','대기','대기'],events:[],done:false};
    for(const e of plan.events) {
      if(e.time>time+1e-7)break;
      state.events.push(e);const r=robots[e.robot];
      switch(e.kind) {
        case 'move_start': r.place=e.to;r.status=NAME[e.to]+' 이동';r.job=e.job;break;
        case 'arrive':r.status=e.to==='home'?'초기위치 복귀 완료':NAME[e.to]+' 대기';r.position=point(e.to,e.robot);break;
        case 'load_start':r.status='부품 적재 중';state.arms[0]='부품 적재 중';break;
        case 'part':r.parts=e.part;if(e.part===3){r.status='부품 적재 완료 · 진입 대기';state.arms[0]='대기';}break;
        case 'dispatch':state.transport--;break;
        case 'assembly_start':r.status='티칭 조립 중';state.arms[1]='티칭 조립 중';break;
        case 'assembly_end':r.parts=0;state.arms[1]='대기';break;
        case 'jig_ready':state.linear=1;break;
        case 'jig_home':state.linear=0;break;
        case 'pallet_start':state.arms[2]='완제품 이송 중';break;
        case 'pallet_end':state.completed++;state.remaining--;state.arms[2]='대기';break;
        case 'complete':state.done=true;break;
      }
    }
    state.active=plan.tasks.filter(x=>x.start<=time&&time<x.end);
    for(const t of state.active) {
      const f=(time-t.start)/(t.end-t.start);
      if(t.type==='move')robots[t.actor].position=position(path(t.from,t.to,t.actor),f);
      if(t.type==='prepare')state.linear=f;
      if(t.type==='reset')state.linear=1-f;
    }
    state.focus=[...state.active].sort((a,b)=>({pallet:5,assemble:4,load:3,move:2,prepare:1,reset:1,gate:0}[b.type]||0)-({pallet:5,assemble:4,load:3,move:2,prepare:1,reset:1,gate:0}[a.type]||0))[0];
    return state;
  }
  const api={makePlan,snapshot,path,position,POINTS};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RobotSimulation=api;
})(typeof window!=='undefined'?window:globalThis);
