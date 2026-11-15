// Pure fixed-step simulation. Coordinates are metres; actors stand on y=0.
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
export function actor(id,team,x,z){return {id,team,x,z,vx:0,vz:0,yaw:0,hp:100,armor:0,crouch:false,weapon:'rifle',ammo:24,reserve:96,reload:0,cooldown:0,heat:0,cash:3200,frag:1,kills:0,route:0,wait:0,alert:0,lastX:x,lastZ:z,progress:0};}
export const SPAWNS=[[-3,17],[0,18],[3,17],[-10,-16],[9,-15],[0,-19]];
export function createMatch(){const s={actors:SPAWNS.map((v,i)=>actor(i,i<3?0:1,...v)),score:[0,0],round:0,phase:'buy',time:12,bomb:{planted:false,time:30},reason:'',winner:-1,events:[],elapsed:0};newRound(s);return s;}
export function newRound(s){
 s.round++;s.phase='buy';s.time=12;s.bomb={planted:false,time:30};s.reason='';
 for(const a of s.actors){a.x=SPAWNS[a.id][0];a.z=SPAWNS[a.id][1];a.vx=a.vz=0;a.hp=100;a.armor=a.id?50:a.armor;a.ammo=WEAPONS[a.weapon].mag;a.reserve=WEAPONS[a.weapon].reserve;a.reload=a.cooldown=a.heat=a.progress=a.route=a.alert=0;a.frag=Math.max(1,a.frag);a.wait=.5+a.id*.22;}
}
export function finishRound(s,team,reason){if(s.phase==='over'||s.phase==='match')return;s.score[team]++;s.winner=team;s.reason=reason;s.time=5;s.phase=s.score[team]>=5?'match':'over';for(const a of s.actors)a.cash=Math.min(12000,a.cash+(a.team===team?2400:1500));s.events.push({type:'round',team,reason});}
export function objective(s,a,dt){
 if(s.phase!=='live'||a.hp<=0||Math.hypot(a.x,a.z+14)>2.8)return false;
 if((a.team===0&&!s.bomb.planted)||(a.team===1&&s.bomb.planted)){
 a.progress+=dt;const need=a.team===0?3:5;
 if(a.progress>=need){a.progress=0;if(a.team===0){s.bomb.planted=true;s.bomb.time=30;a.cash+=300;s.events.push({type:'plant'});}else finishRound(s,1,'Charge defused');return true;}
 }return false;
}
export function stepRound(s,dt){
 s.elapsed+=dt;if(s.phase==='match')return;s.time-=dt;
 if(s.phase==='buy'){if(s.time<=0){s.phase='live';s.time=85;}return;}
 if(s.phase==='over'){if(s.time<=0)newRound(s);return;}
 const blue=s.actors.some(a=>a.team===0&&a.hp>0),red=s.actors.some(a=>a.team===1&&a.hp>0);
 if(s.bomb.planted){s.bomb.time-=dt;if(s.bomb.time<=0)finishRound(s,0,'Floodgate breached');else if(!red)finishRound(s,0,'Spillway secured');}
 else if(!blue)finishRound(s,1,'Attack team eliminated');else if(!red)finishRound(s,0,'Defense eliminated');else if(s.time<=0)finishRound(s,1,'Floodgate held');
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
 a.armor-=blocked; damage-=blocked; a.hp=Math.max(0,a.hp-damage);return damage;
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
