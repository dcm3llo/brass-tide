import {DT,createMatch,WEAPONS,moveActor,reload,buy,objective,spreadFor} from './sim.js';
import {fire,stepWorld,throwFrag,blocked} from './combat.js';
import {walls,names} from './map.js';
import {View} from './view.js';
import {Audio} from './audio.js';
const $=id=>document.getElementById(id),canvas=$('world'),view=new View(canvas),audio=new Audio();
let state=createMatch(),started=false,paused=false,buyOpen=false,accumulator=0,last=performance.now(),hitTime=0,damageTime=0,oldHP=100,hudTime=0,feed=[];
const input={yaw:0,pitch:0,ads:false,fire:false,drag:false,sensitivity:1,keys:new Set(),dragMoved:false};
const mm=$('minimap').getContext('2d');
function lock(){try{const p=canvas.requestPointerLock();if(p?.catch)p.catch(()=>{});}catch{}}
function start(){if(started)return;started=true;paused=false;$('start').classList.add('hidden');audio.start();lock();canvas.focus();last=performance.now();}
$('deploy').addEventListener('click',start);
function pause(value){if(!started||state.phase==='match')return;paused=value;input.fire=false;input.ads=false;input.keys.clear();$('pause').classList.toggle('hidden',!paused);if(paused){closeBuy();document.exitPointerLock?.();}else{audio.start();lock();}}
function closeBuy(){buyOpen=false;$('buy').classList.add('hidden');}
function toggleBuy(){if(!started||paused||state.phase==='match')return;if(state.phase!=='buy'||state.actors[0].z<12){audio.tone(150,.08,.2);return;}buyOpen=!buyOpen;$('buy').classList.toggle('hidden',!buyOpen);input.fire=false;input.keys.clear();if(buyOpen)document.exitPointerLock?.();else lock();}
$('closeBuy').onclick=()=>{closeBuy();lock();};$('resume').onclick=()=>pause(false);
$('restart').onclick=()=>{state=createMatch();feed=[];oldHP=100;input.yaw=input.pitch=0;$('match').classList.add('hidden');lock();};
$('sensitivity').oninput=e=>input.sensitivity=Number(e.target.value);$('mute').onchange=e=>audio.muted=e.target.checked;
for(const button of document.querySelectorAll('[data-buy]'))button.onclick=()=>{
 const p=state.actors[0],ok=buy(p,button.dataset.buy,state.phase==='buy'&&p.z>12&&Math.abs(p.x)<15);
 $('buyMessage').textContent=ok?`REQUISITION APPROVED / ${button.dataset.buy.toUpperCase()} / $${p.cash} remaining`:'REQUISITION DENIED / deployment only, south dock, sufficient funds required';audio.tone(ok?600:160,.1,.3);updateHUD();
};
addEventListener('keydown',e=>{
 if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab'].includes(e.code))e.preventDefault();
 if(e.code==='Escape'){pause(!paused);return;}
 if(e.repeat)return;if(e.code==='KeyB'){toggleBuy();return;}if(!started||paused||buyOpen)return;
 input.keys.add(e.code);
 if(e.code==='KeyR'&&reload(state.actors[0])){audio.tone(260,.12,.2,'square');setTimeout(()=>audio.tone(420,.08,.2,'square'),300);}
 if(e.code==='KeyG')throwFrag(state,state.actors[0],input.yaw);
});
addEventListener('keyup',e=>input.keys.delete(e.code));
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('mousedown',e=>{if(!started||paused||buyOpen)return;if(e.button===2){input.ads=true;return;}if(e.button===0){input.fire=true;input.drag=true;input.dragMoved=false;if(document.pointerLockElement!==canvas)lock();}});
addEventListener('mouseup',e=>{if(e.button===0){input.fire=false;input.drag=false;}if(e.button===2)input.ads=false;});
addEventListener('mousemove',e=>{if(!started||paused||buyOpen)return;if(document.pointerLockElement===canvas||input.drag){const factor=.002*input.sensitivity*(input.ads?.65:1);input.yaw-=e.movementX*factor;input.pitch=Math.max(-1.35,Math.min(1.35,input.pitch-e.movementY*factor));if(input.drag&&Math.abs(e.movementX)+Math.abs(e.movementY)>1)input.dragMoved=true;}});
addEventListener('blur',()=>{if(started)pause(true);});
function playerStep(dt){
 const p=state.actors[0];if(p.hp<=0||buyOpen)return;
 const keys=input.keys;p.crouch=keys.has('ControlLeft')||keys.has('ControlRight')||keys.has('KeyC');
 input.yaw+=(Number(keys.has('ArrowLeft'))-Number(keys.has('ArrowRight')))*dt*1.65;
 input.pitch=Math.max(-1.35,Math.min(1.35,input.pitch+(Number(keys.has('ArrowUp'))-Number(keys.has('ArrowDown')))*dt*1.3));p.yaw=input.yaw;
 const forward=Number(keys.has('KeyW'))-Number(keys.has('KeyS')),right=Number(keys.has('KeyD'))-Number(keys.has('KeyA')),length=Math.hypot(forward,right)||1,speed=p.crouch?1.65:input.ads?2.25:4.1;
 const tx=(-Math.sin(input.yaw)*forward+Math.cos(input.yaw)*right)/length*speed,tz=(-Math.cos(input.yaw)*forward-Math.sin(input.yaw)*right)/length*speed;
 const smoothing=1-Math.exp(-dt*(forward||right?11:16));p.vx+=(tx-p.vx)*smoothing;p.vz+=(tz-p.vz)*smoothing;
 if(state.phase==='live'||state.phase==='buy'){
  const oldX=p.x,oldZ=p.z;moveActor(p,p.vx,p.vz,dt,walls);
  if(state.phase==='buy'&&p.z<12){p.z=Math.max(12,oldZ);p.x=oldX;}
 }
 if(state.phase==='live'){
  if(keys.has('KeyE')&&Math.hypot(p.x,p.z+14)<2.8){p.vx=p.vz=0;objective(state,p,dt);}else p.progress=0;
  const dragLook=document.pointerLockElement!==canvas&&input.dragMoved;
  if(input.fire&&!dragLook&&!keys.has('KeyE')){
   const weapon=WEAPONS[p.weapon],spread=spreadFor(p,input.ads);
   const hit=fire(state,p,input.yaw,input.pitch,spread);
   if(hit){input.pitch=Math.min(1.35,input.pitch+weapon.recoil*(input.ads?.65:1));input.yaw+=(Math.random()-.5)*weapon.recoil*.3;}
  }
 }
}
function events(){
 for(const e of state.events){view.effect(e);audio.event(e,state.actors[0],input.yaw);
  if(e.type==='hit'&&e.id===0){hitTime=.18;$('hitmarker').style.color=e.head?'#f38861':'#ffe4a3';}
  if(e.type==='kill'){feed.unshift({...e,time:state.elapsed});feed=feed.slice(0,5);}
 }
 state.events.length=0;
 const hp=state.actors[0].hp;if(hp<oldHP)damageTime=.4;oldHP=hp;
}
function updateHUD(){
 const s=state,p=s.actors[0],blue=s.actors.filter(a=>a.team===0&&a.hp>0).length,red=s.actors.filter(a=>a.team===1&&a.hp>0).length;
 $('scoreBlue').textContent=s.score[0];$('scoreRed').textContent=s.score[1];
 const time=Math.max(0,Math.ceil(s.bomb.planted?s.bomb.time:s.time));$('timer').textContent=`${String(Math.floor(time/60)).padStart(2,'0')}:${String(time%60).padStart(2,'0')}`;
 $('phase').textContent=s.bomb.planted?'CHARGE ARMED':s.phase==='buy'?'DEPLOYMENT':s.phase==='over'?'ROUND RESOLVED':'LIVE OPERATION';
 $('round').textContent=`ROUND ${String(s.round).padStart(2,'0')} / FIRST TO 5`;
 $('health').textContent=Math.ceil(p.hp);$('healthfill').style.width=p.hp+'%';$('armor').textContent='◇ '+Math.ceil(p.armor);$('ammo').textContent=p.ammo;$('reserve').textContent='/ '+p.reserve;$('weapon').textContent=WEAPONS[p.weapon].name;$('cash').textContent='$'+p.cash;$('alive').textContent=`${blue} TIDELINE / ${red} BREAKWATER`;
 $('ammoStatus').textContent=p.reload>0?'RELOADING …':p.ammo===0?'EMPTY / R TO RELOAD':`${p.frag} FRAG / ${p.weapon==='rifle'?'AUTO':'SEMI'}`;
 $('objectiveText').textContent=s.bomb.planted?'Charge armed. Deny the defenders a defuse.':'Reach the northern spillway. Hold E to plant.';
 $('location').textContent=p.z>12?'SOUTH DOCK':p.z<-10?'NORTH SPILLWAY':p.x<-10?'WEST SERVICE':p.x>10?'EAST CHANNEL':'UTILITY COURT';
 const near=Math.hypot(p.x,p.z+14)<2.8;
 let prompt=p.hp<=0?'DOWNED / WATCHING TIDELINE':s.phase==='buy'?'DEPLOYMENT / B TO BUY / SOUTH DOCK SEALED':near&&!s.bomb.planted?'HOLD E / PLANT CHARGE • 3 SEC':!document.pointerLockElement?'CLICK TO CAPTURE MOUSE / DRAG OR ARROWS TO LOOK':'';
 $('prompt').style.display=prompt?'block':'none';$('prompt').textContent=prompt;
 $('progress').style.display=p.progress>0?'block':'none';$('progress').firstElementChild.style.width=Math.min(100,p.progress/3*100)+'%';
 $('crosshair').style.setProperty('--gap',(input.ads?3:6)+p.heat*16+Math.hypot(p.vx,p.vz)*2+'px');
 $('crosshair').style.opacity=p.hp<=0?'0':input.ads?'.65':'1';
 if(s.phase==='over'){$('announce').style.display='block';$('announce').innerHTML=`<b>${s.winner===0?'TIDE TURNED':'GATE HELD'}</b><span>${s.reason.toUpperCase()} / NEXT ROUND ${Math.ceil(s.time)}</span>`;}else $('announce').style.display='none';
 if(s.phase==='match'){$('match').classList.remove('hidden');$('matchTitle').textContent=s.winner===0?'THE COAST IS YOURS.':'THE GATE STILL STANDS.';$('matchResult').textContent=`TIDELINE ${s.score[0]} — ${s.score[1]} BREAKWATER / ${p.kills} eliminations`;document.exitPointerLock?.();}
 if(buyOpen&&s.phase!=='buy')closeBuy();
 $('killfeed').replaceChildren(...feed.filter(e=>s.elapsed-e.time<7).map(e=>{const node=document.createElement('div');node.textContent=`${e.killer}  ${e.head?'⌖':'›'}  ${e.victim}`;node.style.borderRightColor=e.team===0?'#85cce2':'#d38162';return node;}));
 drawMap();
}
function drawMap(){
 mm.fillStyle='#1a363c';mm.fillRect(0,0,190,225);
 const sx=x=>95+x*4.8,sz=z=>112+z*4.8;
 mm.strokeStyle='#69877d';mm.lineWidth=1;mm.strokeRect(13,6,164,213);
 mm.fillStyle='#b4b6a0';for(const b of walls)mm.fillRect(sx(b.x-b.w/2),sz(b.z-b.d/2),b.w*4.8,b.d*4.8);
 mm.strokeStyle='#e7bc78';mm.beginPath();mm.arc(sx(0),sz(-14),12,0,Math.PI*2);mm.stroke();mm.fillStyle='#e7bc78';mm.font='10px Arial';mm.fillText('A',sx(0)-3,sz(-14)+3);
 const p=state.actors[0];
 for(const a of state.actors){if(a.hp<=0)continue;if(a.team!==0&&!state.actors.some(b=>b.team===0&&b.hp>0&&Math.hypot(a.x-b.x,a.z-b.z)<24&&!blocked(b.x,b.z,a.x,a.z)))continue;
  mm.fillStyle=a.id===0?'#fff3cd':a.team===0?'#77c5e4':'#e58f69';mm.beginPath();mm.arc(sx(a.x),sz(a.z),a.id===0?3.5:2.8,0,Math.PI*2);mm.fill();
 }
 mm.strokeStyle='#fff3cd';mm.beginPath();mm.moveTo(sx(p.x),sz(p.z));mm.lineTo(sx(p.x)-Math.sin(input.yaw)*10,sz(p.z)-Math.cos(input.yaw)*10);mm.stroke();
}
function frame(now){
 const dt=Math.min(.1,(now-last)/1000);last=now;
 if(started&&!paused&&!buyOpen&&state.phase!=='match'){
  accumulator+=dt;while(accumulator>=DT){playerStep(DT);stepWorld(state,DT);events();audio.tick(state,state.actors[0]);accumulator-=DT;}
 }else accumulator=0;
 hitTime=Math.max(0,hitTime-dt);damageTime=Math.max(0,damageTime-dt);$('hitmarker').style.opacity=hitTime>0?'1':'0';$('damage').style.opacity=damageTime/.4*.7;
 if(!started){input.yaw=-.09;input.pitch=.03;state.actors[0].x=-1;state.actors[0].z=18;}
 view.render(state,input,dt);hudTime+=dt;if(hudTime>.1){hudTime=0;updateHUD();}requestAnimationFrame(frame);
}
// Test surface exposes observations and ordinary input only; no world-state mutation or staged scenes.
window.brassTide={snapshot:()=>JSON.parse(JSON.stringify({started,paused,buyOpen,phase:state.phase,time:state.time,score:state.score,round:state.round,bomb:state.bomb,actors:state.actors,grenades:state.grenades||[],pointerLocked:document.pointerLockElement===canvas,ads:input.ads,sensitivity:input.sensitivity,muted:audio.muted,yaw:input.yaw,pitch:input.pitch,webgl:view.renderer.capabilities.isWebGL2,drawCalls:view.renderer.info.render.calls})),input:(key,down)=>{if(down)input.keys.add(key);else input.keys.delete(key);},look:(yaw,pitch)=>{input.yaw=yaw;input.pitch=Math.max(-1.35,Math.min(1.35,pitch));}};
updateHUD();requestAnimationFrame(frame);
