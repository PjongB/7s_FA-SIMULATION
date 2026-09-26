'use strict';
const $=id=>document.getElementById(id);
const photoPath=key=>window.EMBEDDED_PHOTOS?.[key]||`assets/${key}.jpg`;
const photos={
 'full-map':{title:'전체 맵 · 현장 배치',detail:'왼쪽 아래 초기위치, 중앙 위 자재창고, 오른쪽 아래 제작공정. 중앙 아래 테이프 박스가 교대 대기장소입니다.'},
 route:{title:'운반경로 및 대기위치',detail:'자재창고와 제작공정 사이의 운반 경로, 교대를 위한 대기장소입니다.'},
 warehouse:{title:'자재창고',detail:'로봇팔 1이 A제품 한 세트에 필요한 부품 3개를 준비하는 공간입니다.'},
 loading:{title:'버거 1 부품 적재',detail:'로봇팔 1이 버거 상판에 부품 3개를 싣습니다. 버거 2도 같은 적재 순서를 사용합니다.'},
 assembly:{title:'로봇팔 2 · 티칭 조립',detail:'버거가 도착하고 A지그 위치가 준비되면 티칭 동작으로 제품을 조립합니다.'},
 process:{title:'제작공정 · 리니어 모터',detail:'조립 전에는 A지그 위치로, 조립 후에는 초기위치로 이동합니다.'},
 pallet:{title:'로봇팔 3 · 완제품 적재',detail:'완제품을 파렛트로 옮긴 뒤 성공을 확인하면 Host의 완제품 잔여 카운트가 줄어듭니다.'},
 waiting:{title:'버거 대기장소',detail:'다음 버거가 공정에 진입하기 전, 작업을 마친 버거가 이곳으로 이동합니다.'},
 home:{title:'버거 초기위치',detail:'버거 1과 2의 시작·복귀 위치입니다. 중간 대기장소와 별도로 관리합니다.'}
};
let plan=null,time=0,playing=false,speed=1,following=true,currentPhoto='full-map',lastEventKey='',lastFrame=0;
const idlePlan=RobotSimulation.makePlan(2);
function formatTime(t){return `${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;}
function validateQuantity(){const n=Number($('quantity').value);if(!Number.isInteger(n)||n<1||n>20)throw Error('주문 수량을 1~20 사이의 정수로 입력해 주세요.');return n;}
function setPhoto(key){if(currentPhoto!==key||!$('scene-image').getAttribute('src')){$('scene-image').src=photoPath(key);currentPhoto=key;}$('scene-image').alt=photos[key].title;}
function openPhoto(key){$('dialog-image').src=photoPath(key);$('dialog-image').alt=photos[key].title;$('dialog-title').textContent=photos[key].title;$('dialog-description').textContent=photos[key].detail;$('photo-dialog').showModal();}
function begin(run=true){try{plan=RobotSimulation.makePlan(validateQuantity());time=0;playing=run;following=true;lastEventKey='';$('form-error').textContent='';render();}catch(e){$('form-error').textContent=e.message;}}
function reset(){plan=null;time=0;playing=false;following=true;lastEventKey='';setPhoto('full-map');render();}
function step(direction){if(!plan){begin(false);return;}playing=false;const times=[...new Set(plan.events.map(e=>e.time))];time=direction>0?(times.find(t=>t>time+0.001)??plan.duration):([...times].reverse().find(t=>t<time-0.001)??0);render();}
function togglePlay(){if(!plan){begin();return;}if(time>=plan.duration){time=0;lastEventKey='';}playing=!playing;render();}
$('order-form').addEventListener('submit',e=>{e.preventDefault();begin();});
$('plus').onclick=()=>$('quantity').value=Math.min(20,Math.max(1,Number($('quantity').value)||1)+1);
$('minus').onclick=()=>$('quantity').value=Math.max(1,(Number($('quantity').value)||1)-1);
$('play').onclick=togglePlay;$('reset').onclick=reset;$('next').onclick=()=>step(1);$('previous').onclick=()=>step(-1);
$('speed').onchange=e=>speed=Number(e.target.value);
$('timeline').oninput=e=>{if(!plan)return;playing=false;time=Number(e.target.value);render();};
$('follow').onclick=()=>{following=!following;render();};
$('photo-open').onclick=()=>openPhoto(currentPhoto);
$('close-dialog').onclick=()=>$('photo-dialog').close();
$('photo-dialog').onclick=e=>{if(e.target===$('photo-dialog'))$('photo-dialog').close();};
document.querySelectorAll('[data-photo]').forEach(el=>{const activate=()=>{following=false;setPhoto(el.dataset.photo);render();};el.addEventListener('click',activate);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate();}});});
document.querySelectorAll('[data-tab]').forEach(button=>button.onclick=()=>{document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b===button));$('simulation-view').hidden=button.dataset.tab!=='simulation';$('gallery-view').hidden=button.dataset.tab!=='gallery';});
Object.entries(photos).forEach(([key,data])=>{const card=document.createElement('button');card.className='gallery-card';card.innerHTML=`<img src="${photoPath(key)}" alt="${data.title}" loading="lazy"><div><h3>${data.title} ↗</h3><p>${data.detail}</p></div>`;card.onclick=()=>openPhoto(key);$('gallery-grid').append(card);});
$('export').onclick=()=>{if(!plan)return;const s=RobotSimulation.snapshot(plan,time);const data={product:'A',ordered:plan.quantity,simulationTime:time,transportRemaining:s.transport,productRemaining:s.remaining,completed:s.completed,events:s.events.map(({time,kind,text,robot,job})=>({time,kind,text,robot:robot==null?null:`burger${robot+1}`,productNumber:job==null?null:job+1}))};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='robot3-simulation-log.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
document.addEventListener('keydown',e=>{if(['INPUT','SELECT','BUTTON','TEXTAREA'].includes(e.target.tagName)||$('photo-dialog').open)return;if(e.code==='Space'){e.preventDefault();togglePlay();}if(e.code==='ArrowRight'){e.preventDefault();step(1);}if(e.code==='ArrowLeft'){e.preventDefault();step(-1);}});
function getScene(s){
 if(s.done)return {key:'pallet',kicker:'ORDER COMPLETE',title:'A제품 주문 완료',detail:`완제품 ${plan.quantity}개가 파렛트에 적재됐고, 버거 1·2가 모두 초기위치로 돌아왔습니다.`};
 const f=s.focus;
 if(!f)return {key:s.events.at(-1)?.photo||'route',kicker:'WAITING FOR NEXT EVENT',title:'다음 공정을 준비합니다',detail:s.events.at(-1)?.text||'장비가 다음 단계를 기다립니다.'};
 const p=f.job==null?'':`제품 #${f.job+1} · `;
 if(f.type==='assemble')return {key:'assembly',kicker:'ASSEMBLY IN PROGRESS',title:`${p}티칭 조립`,detail:'로봇팔 2가 A지그에서 조립합니다. 다음 주문이 있으면 다른 버거가 자재창고에서 부품을 준비합니다.'};
 if(f.type==='load')return {key:'loading',kicker:'LOADING 3 PARTS',title:`버거 ${f.robot+1} · 부품 적재`,detail:`${p}로봇팔 1이 부품 3개를 차례로 싣습니다. 적재가 모두 끝나야 제작공정으로 이동할 수 있습니다.`};
 if(f.type==='pallet')return {key:'pallet',kicker:'PALLET TRANSFER',title:`${p}완제품 이송`,detail:'로봇팔 3이 완제품을 파렛트에 놓습니다. 적재 성공을 확인한 시점에 완제품 잔여가 1 감소합니다.'};
 if(f.type==='prepare'||f.type==='reset')return {key:'process',kicker:'LINEAR MOTOR',title:f.type==='prepare'?'A지그 위치 준비':'리니어 모터 복귀',detail:f.type==='prepare'?'다음 조립에 사용할 A지그를 작업 위치로 이동합니다.':'조립이 끝나 리니어 모터를 초기위치로 되돌립니다.'};
 if(f.type==='gate')return {key:'waiting',kicker:'INTERLOCK WAIT',title:'제작공정 진입 대기',detail:'부품 적재 완료. 앞 제품의 파렛트 적재와 앞 버거의 대기장소 도착을 기다립니다.'};
 const names={home:'초기위치 복귀',waiting:'대기장소 이동',warehouse:'자재창고 이동',assembly:'제작공정 이동'};
 return {key:f.to==='home'?'home':f.to==='waiting'?'waiting':f.to==='warehouse'?'warehouse':'route',kicker:`BURGER ${f.actor+1} · MOVING`,title:`버거 ${f.actor+1} · ${names[f.to]}`,detail:f.to==='assembly'?'Host가 운송 시작을 확인해 운송 잔여를 1 감소시켰습니다. 조립 위치로 이동 중입니다.':f.to==='home'?'추가 운송 배정이 없어 초기위치로 복귀합니다. 진행 중인 제품의 조립·적재는 계속됩니다.':f.to==='waiting'?'다른 버거와 제작공정을 교대하기 위해 대기장소로 이동합니다.':'자재창고에 도착하면 로봇팔 1이 A제품 부품 3개를 적재합니다.'};
}
function render(){
 const s=plan?RobotSimulation.snapshot(plan,time):{...RobotSimulation.snapshot(idlePlan,0),events:[],active:[],robots:[0,1].map(id=>({id,position:RobotSimulation.POINTS['home'+(id+1)],parts:0,status:'초기위치 대기'})),linear:0,arms:['대기','대기','대기'],done:false};
 $('total').textContent=plan?plan.quantity:'—';$('transport').textContent=plan?s.transport:'—';$('remaining').textContent=plan?s.remaining:'—';$('completed').textContent=plan?s.completed:0;
 const percent=plan?Math.round(s.completed/plan.quantity*100):0;$('completion-percent').textContent=percent+'%';$('completion-bar').style.width=percent+'%';$('pallet-count').textContent=(plan?s.completed:0)+'개 적재';
 $('run-status').textContent=!plan?'주문 대기':s.done?'주문 완료':playing?'시뮬레이션 진행 중':'일시정지';
 $('order-id').textContent=plan?`A제품 ${plan.quantity}개 · ${formatTime(time)} / ${formatTime(plan.duration)}`:'수량을 정하고 시작하세요';
 document.querySelector('.order-status').className='order-status'+(playing?' running':s.done?' complete':'');
 ['quantity','plus','minus','product'].forEach(id=>$(id).disabled=!!plan&&!s.done);$('start').disabled=!!plan&&!s.done;$('start').innerHTML=s.done?'<span>↻</span> 새 주문 · 시작':'<span>▶</span> 주문 · 시작';
 $('play').textContent=playing?'Ⅱ':'▶';$('play').setAttribute('aria-label',playing?'일시정지':'재생');$('elapsed').textContent=formatTime(time);$('duration').textContent=formatTime(plan?.duration||0);$('timeline').max=plan?.duration||100;$('timeline').value=time;$('timeline').disabled=!plan;$('previous').disabled=!plan||time===0;$('next').disabled=!!plan&&s.done;$('export').disabled=!plan;
 s.robots.forEach((r,i)=>{const g=$('robot'+(i+1));g.setAttribute('transform',`translate(${r.position.join(' ')})`);g.querySelector('.cargo').innerHTML=Array.from({length:r.parts},(_,n)=>`<rect x="${n*9}" width="7" height="6" rx="1" fill="${i?'#d99032':'#3979c6'}"/>`).join('');const d=$('device-b'+(i+1));d.querySelector('.device-status').textContent=r.status;d.querySelector('.part-dots').innerHTML=Array.from({length:3},(_,n)=>`<i class="${n<r.parts?'filled':''}"></i>`).join('');d.classList.toggle('working',s.active.some(t=>t.actor===i&&t.type==='move'));});
 $('jig').setAttribute('transform',`translate(${600-s.linear*95} 812)`);
 s.arms.forEach((v,i)=>{const d=$('device-a'+(i+1));d.querySelector('.device-status').textContent=v;d.classList.toggle('working',v!=='대기');const g=$('arm'+(i+1)+'-map');g.classList.toggle('active-arm',v!=='대기');g.querySelector('use').setAttribute('transform',v!=='대기'?`rotate(${Math.sin(time*2.6)*12})`:'rotate(0)');});
 if(plan){const scene=getScene(s);if(following)setPhoto(scene.key);$('scene-kicker').textContent=following?scene.kicker:'ON-SITE REFERENCE';$('scene-title').textContent=following?scene.title:photos[currentPhoto].title;$('scene-detail').textContent=following?scene.detail:photos[currentPhoto].detail;}
 else {$('scene-kicker').textContent=following?'READY TO START':'ON-SITE REFERENCE';$('scene-title').textContent=following?'주문을 기다리고 있어요':photos[currentPhoto].title;$('scene-detail').textContent=following?'Host PC에서 제품 수량을 입력하면 두 카운트가 설정되고 시뮬레이션이 시작됩니다.':photos[currentPhoto].detail;}
 $('follow').classList.toggle('active',following);$('follow').setAttribute('aria-pressed',String(following));
 const next=plan?.jobs.find(j=>j.dispatch>time+1e-7);const prev=next?plan.jobs[next.id-1]:null;
 const gates=plan?[!prev||time>=prev.palletEnd,!prev||time>=prev.waitEnd,!!next?time>=next.loaded:true]:[false,false,false];
 $('gates').querySelectorAll('li').forEach((li,i)=>li.classList.toggle('passed',gates[i]));
 const key=plan?`${plan.quantity}:${s.events.length}`:'idle';
 if(key!==lastEventKey){lastEventKey=key;$('event-count').textContent=s.events.length+'건';$('event-log').innerHTML=s.events.length?[...s.events].reverse().map(e=>`<div class="event-row ${['order','dispatch','pallet_end','complete'].includes(e.kind)?'counter':''}"><time>${formatTime(e.time)}</time><i class="event-dot"></i><span>${e.text}</span><span class="tag">${e.kind.toUpperCase()}</span></div>`).join(''):'<div class="empty-log">주문을 시작하면 장비 동작과 카운트 변경 이력이 표시됩니다.</div>';}
}
function frame(now){if(lastFrame&&playing&&plan){time=Math.min(plan.duration,time+Math.min((now-lastFrame)/1000,.2)*speed);if(time>=plan.duration)playing=false;render();}lastFrame=now;requestAnimationFrame(frame);}
render();requestAnimationFrame(frame);
