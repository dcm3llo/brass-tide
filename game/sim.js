// Pure fixed-step simulation. Coordinates are metres; actors stand on y=0.
import {sites} from './map.js';
export const DT=1/60;
export const WEAPONS={
 pistol:{name:'P9 / SIDEARM',cost:300,mag:12,reserve:60,damage:26,delay:.26,load:1.3,spread:.009,recoil:.024},
 rifle:{name:'KITE / CARBINE',cost:1800,mag:24,reserve:96,damage:29,delay:.115,load:1.85,spread:.005,recoil:.019},
 marksman:{name:'HERON / DMR',cost:2600,mag:8,reserve:40,damage:68,delay:.65,load:2.3,spread:.0017,recoil:.047}
};
export function spreadFor(a,ads){return WEAPONS[a.weapon].spread*(ads?.42:1)*(a.crouch?.55:1)+Math.hypot(a.vx,a.vz)*.008+a.heat*.027;}
export function shoot(a){if(a.hp<=0||a.ammo<=0||a.reload>0||a.cooldown>0)return false;a.ammo--;a.cooldown=WEAPONS[a.weapon].delay;a.heat=Math.min(1,a.heat+.19);return true;}
export function reload(a){if(a.hp<=0||a.reload>0||a.ammo===WEAPONS[a.weapon].mag||a.reserve<=0)return false;a.reload=WEAPONS[a.weapon].load;return true;}
export function tickWeapon(a,dt){a.cooldown=Math.max(0,a.cooldown-dt);a.heat=Math.max(0,a.heat-dt*.7);if(a.reload>0){a.reload-=dt;if(a.reload<=0){a.reload=0;const n=Math.min(WEAPONS[a.weapon].mag-a.ammo,a.reserve);a.ammo+=n;a.reserve-=n;}}}
export function buy(a,item,allowed){
 if(!allowed||a.hp<=0)return false;
 const cost=item==='armor'?650:item==='frag'?300:WEAPONS[item]?.cost;
 if(cost===undefined||a.cash<cost||item==='armor'&&a.armor>=100||item==='frag'&&a.frag>=2)return false;
 a.cash-=cost;if(item==='armor')a.armor=100;else if(item==='frag')a.frag++;else{a.weapon=item;a.ammo=WEAPONS[item].mag;a.reserve=WEAPONS[item].reserve;a.reload=0;a.cooldown=0;}return true;
}
export function actor(id,team,x,z){return {id,team,x,z,vx:0,vz:0,yaw:0,hp:100,armor:0,crouch:false,weapon:'rifle',ammo:24,reserve:96,reload:0,cooldown:0,heat:0,cash:3200,frag:1,kills:0,deaths:0,roundKills:0,income:0,route:0,wait:0,alert:0,lastX:x,lastZ:z,progress:0,action:null,role:'deploy'};}
export const SPAWNS=[[-3,17],[0,18],[3,17],[-10,-16],[9,-15],[0,-19]];
export function createMatch({playerTeam=0,mode='match'}={}){
 playerTeam=playerTeam===1?1:0;
 const s={mode:mode==='drill'?'drill':'match',playerTeam,actors:SPAWNS.map((v,i)=>actor(i,i<3?playerTeam:1-playerTeam,...v)),score:[0,0],round:0,phase:'buy',time:12,bomb:null,reason:'',winner:-1,events:[],elapsed:0,history:[]};
 if(s.mode==='drill'){s.actors=s.actors.slice(0,1);s.actors[0].team=0;s.playerTeam=0;}
 newRound(s);return s;
}
export function newRound(s){
 s.round++;s.phase='buy';s.time=12;s.bomb={planted:false,dropped:false,time:30,carrier:s.actors.find(a=>a.team===0).id,site:null,x:0,z:-14};s.reason='';s.grenades=[];
 s.attackSite=sites[(s.round-1)%sites.length].id;
 for(const a of s.actors){
  const spawn=SPAWNS[a.team*3+a.id%3];a.x=spawn[0];a.z=spawn[1];
  if(a.hp<=0){a.weapon='pistol';a.armor=0;a.frag=0;}
  a.vx=a.vz=0;a.hp=100;a.crouch=false;a.yaw=a.team===0?0:Math.PI;
  a.ammo=WEAPONS[a.weapon].mag;a.reserve=WEAPONS[a.weapon].reserve;
  a.reload=a.cooldown=a.heat=a.progress=a.route=a.alert=a.roundKills=0;a.action=null;
  a.path=[];a.replan=0;a.wait=.5+a.id*.22;a.role='deploy';a.memory=null;a.targetId=null;a.goalX=null;a.goalZ=null;a.useHP=null;a.useX=null;a.useZ=null;a.footstepAt=0;a.lastX=a.x;a.lastZ=a.z;
  if(a.id>0){if(a.weapon==='pistol')buy(a,'rifle',true);if(a.armor<50)buy(a,'armor',true);if(!a.frag)buy(a,'frag',true);}
 }
}
export function finishRound(s,team,reason){
 if(s.phase==='over'||s.phase==='match')return;
 s.score[team]++;s.winner=team;s.reason=reason;s.time=5;s.phase=s.score[team]>=5||s.mode==='drill'?'match':'over';
 for(const a of s.actors){a.income=a.team===team?2400:1500;a.cash=Math.min(12000,a.cash+a.income);cancelUse(a);}
 s.history.push({round:s.round,team,reason,site:s.bomb.site});
 s.events.push({type:'round',team,reason});
}
export function cancelUse(a){a.progress=0;a.action=null;}
export function syncCharge(s){
 const b=s.bomb,a=s.actors[b.carrier];
 if(b.planted||b.carrier===null||!a)return;
 b.x=a.x;b.z=a.z;
 if(a.hp<=0){b.carrier=null;b.dropped=true;cancelUse(a);s.events.push({type:'drop',id:a.id,x:b.x,z:b.z});}
}
export function objective(s,a,dt,held=true){
 syncCharge(s);
 if(held&&s.phase==='live'&&a.hp>0&&a.team===0&&s.bomb.dropped&&Math.hypot(a.x-s.bomb.x,a.z-s.bomb.z)<1.3){
  s.bomb.carrier=a.id;s.bomb.dropped=false;cancelUse(a);s.events.push({type:'recover',id:a.id});return true;
 }
 const site=sites.find(v=>Math.hypot(a.x-v.x,a.z-v.z)<=v.r);
 const planting=a.team===0&&!s.bomb.planted&&s.bomb.carrier===a.id&&site;
 const defusing=a.team===1&&s.bomb.planted&&Math.hypot(a.x-s.bomb.x,a.z-s.bomb.z)<2;
 if(!held||s.phase!=='live'||a.hp<=0||a.reload>0||Math.hypot(a.vx,a.vz)>.3||(!planting&&!defusing)){cancelUse(a);return false;}
 const action=planting?'plant '+site.id:'defuse';
 if(a.action!==action||a.useHP!==a.hp||Math.hypot(a.x-a.useX,a.z-a.useZ)>.15){
  cancelUse(a);a.action=action;a.useHP=a.hp;a.useX=a.x;a.useZ=a.z;
 }
 a.progress+=dt;const need=planting?3:5;
 if(a.progress+1e-8<need)return false;
 cancelUse(a);
 if(planting){
  Object.assign(s.bomb,{planted:true,time:30,carrier:null,site:site.id,x:a.x,z:a.z});
  a.cash+=300;s.events.push({type:'plant',id:a.id,site:site.id});
  if(s.mode==='drill'){a.team=1;s.playerTeam=1;}
 }else{a.cash+=300;s.events.push({type:'defuse',id:a.id,site:s.bomb.site});finishRound(s,1,'Charge defused');}
 return true;
}
export function stepRound(s,dt){
 syncCharge(s);
 s.elapsed+=dt;if(s.phase==='match')return;s.time-=dt;
 if(s.phase==='buy'){if(s.time<=0){s.phase='live';s.time=85;}return;}
 if(s.phase==='over'){if(s.time<=0)newRound(s);return;}
 if(s.mode==='drill'){if(s.actors[0].hp<=0)finishRound(s,1,'Operator down');else if(s.bomb.planted){s.bomb.time-=dt;if(s.bomb.time<=0)finishRound(s,0,'Charge detonated');}else if(s.time<=0)finishRound(s,1,'Drill timed out');return;}
 const blue=s.actors.some(a=>a.team===0&&a.hp>0),red=s.actors.some(a=>a.team===1&&a.hp>0);
 if(s.bomb.planted){s.bomb.time-=dt;if(s.bomb.time<=0)finishRound(s,0,'Floodgate breached');else if(!red)finishRound(s,0,'Spillway secured');}
 else if(!blue)finishRound(s,1,'Attack team eliminated');else if(!red)finishRound(s,0,'Defense eliminated');else if(s.time<=0)finishRound(s,1,'Floodgate held');
}
export function movePlayer(s,input,dt,walls){
 const p=s.actors[0];if(p.hp<=0||!['live','buy'].includes(s.phase))return;
 p.crouch=input.crouch;p.yaw=input.yaw;
 const {forward,right,yaw}=input,length=Math.hypot(forward,right)||1,speed=p.crouch?1.65:input.ads?2.25:4.1;
 const tx=(-Math.sin(yaw)*forward+Math.cos(yaw)*right)/length*speed,tz=(-Math.cos(yaw)*forward-Math.sin(yaw)*right)/length*speed;
 const smoothing=1-Math.exp(-dt*(forward||right?11:16));p.vx+=(tx-p.vx)*smoothing;p.vz+=(tz-p.vz)*smoothing;
 const x=p.x,z=p.z;moveActor(p,p.vx,p.vz,dt,walls);
 if(s.phase==='buy'&&(p.team===0?p.z<12:p.z>-14)){p.z=z;p.x=x;}
}
export function moveActor(a,dx,dz,dt,walls){
 const n=Math.max(1,Math.ceil(Math.max(Math.abs(dx*dt),Math.abs(dz*dt))/.15)),r=.33;
 for(let i=0;i<n;i++){
  const x=a.x+dx*dt/n;
  if(!walls.some(b=>b.h>.45&&Math.abs(x-b.x)<b.w/2+r&&Math.abs(a.z-b.z)<b.d/2+r))a.x=x;
  const z=a.z+dz*dt/n;
  if(!walls.some(b=>b.h>.45&&Math.abs(a.x-b.x)<b.w/2+r&&Math.abs(z-b.z)<b.d/2+r))a.z=z;
 }
}
export function hurt(a,base,head=false){
 if(a.hp<=0)return 0;
 let damage=base*(head?3.5:1); const blocked=Math.min(a.armor,damage*.45);
 a.armor-=blocked; damage-=blocked; a.hp=Math.max(0,a.hp-damage);if(a.hp<=0)a.deaths++;return damage;
}
export function rayBox(ox,oy,oz,dx,dy,dz,b){
 let lo=0,hi=Infinity;
 // Scalar slab loop avoids temporary arrays in the bot visibility hot path.
 for(let axis=0;axis<3;axis++){
  const o=axis===0?ox:axis===1?oy:oz,d=axis===0?dx:axis===1?dy:dz,c=axis===0?b.x:axis===1?(b.y??b.h/2):b.z,s=axis===0?b.w:axis===1?b.h:b.d;
  if(Math.abs(d)<1e-9){if(o<c-s/2||o>c+s/2)return Infinity;continue;}
  let a=(c-s/2-o)/d,v=(c+s/2-o)/d;if(a>v){const temp=a;a=v;v=temp;}lo=Math.max(lo,a);hi=Math.min(hi,v);if(lo>hi)return Infinity;
 }return lo;
}
