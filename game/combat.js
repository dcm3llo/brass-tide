import {WEAPONS,shoot,hurt,tickWeapon,reload,moveActor,objective,stepRound,cancelUse,syncCharge,spreadFor} from './sim.js';
import {walls,sites,holds,nodes,names} from './map.js';
import {rayBox} from './sim.js';
const navWalls=walls.map(b=>({...b,w:b.w+.66,d:b.d+.66}));
export function blocked(x,z,tx,tz,height=1.4){
 const dist=Math.hypot(tx-x,tz-z);if(dist<.01)return false;
 const volumes=height===.5?navWalls:walls;
 for(const b of volumes)if(rayBox(x,height,z,(tx-x)/dist,0,(tz-z)/dist,b)<dist-.001)return true;return false;
}
export function trace(s,from,dx,dy,dz){
 const eye=from.crouch?1.08:1.62;let distance=100,target=null,head=false;
 for(const b of walls)distance=Math.min(distance,rayBox(from.x,eye,from.z,dx,dy,dz,b));
 for(const a of s.actors){
  if(a.id===from.id||a.hp<=0)continue;
  const h=a.crouch?1.22:1.8;
  const body=rayBox(from.x,eye,from.z,dx,dy,dz,{x:a.x,y:h*.43,z:a.z,w:.6,h:h*.72,d:.5});
  const skull=rayBox(from.x,eye,from.z,dx,dy,dz,{x:a.x,y:h-.17,z:a.z,w:.36,h:.36,d:.36});
  const t=Math.min(body,skull);if(t<distance){distance=t;target=a;head=skull<=body;}
 }return {distance,target,head};
}
export function canSee(a,b){
 const dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz);
 if(a.hp<=0||b.hp<=0||d>30)return false;
 if(d>.01&&(-Math.sin(a.yaw)*dx-Math.cos(a.yaw)*dz)/d<.25)return false;
 return !blocked(a.x,a.z,b.x,b.z,Math.min(a.crouch?1.08:1.62,b.crouch?1.08:1.62));
}
export function hear(s,source,range){
 for(const a of s.actors){
  if(a.team===source.team||a.hp<=0)continue;
  const reach=blocked(a.x,a.z,source.x,source.z)?range*.55:range;
  if(Math.hypot(a.x-source.x,a.z-source.z)>reach)continue;
  a.alert=4;a.memory='heard';a.lastX=source.x;a.lastZ=source.z;
 }
}
export function fire(s,a,yaw,pitch,spread=0){
 if(s.phase!=='live'||!shoot(a))return null;
 yaw+=(Math.random()-.5)*spread;pitch+=(Math.random()-.5)*spread;
 const dx=-Math.sin(yaw)*Math.cos(pitch),dy=Math.sin(pitch),dz=-Math.cos(yaw)*Math.cos(pitch);
 const hit=trace(s,a,dx,dy,dz);
 hear(s,a,23);
 s.events.push({type:'shot',id:a.id,x:a.x,y:a.crouch?1.08:1.62,z:a.z,tx:a.x+dx*hit.distance,ty:(a.crouch?1.08:1.62)+dy*hit.distance,tz:a.z+dz*hit.distance,weapon:a.weapon});
 if(hit.target&&hit.target.team!==a.team){const b=hit.target;hurt(b,WEAPONS[a.weapon].damage,hit.head);s.events.push({type:'hit',id:a.id,target:b.id,head:hit.head});if(b.hp<=0){a.cash+=300;a.kills++;s.events.push({type:'kill',killer:names[a.id],victim:names[b.id],head:hit.head,team:a.team});}}
 return hit;
}
// Visibility-graph routing for investigations and charge retakes. Cached paths on each bot.
export function plan(a,tx,tz){
 const points=[[a.x,a.z],...nodes,[tx,tz]],end=points.length-1,dist=new Array(points.length).fill(Infinity),prev=new Array(points.length).fill(-1),done=new Set();dist[0]=0;
 for(let n=0;n<points.length;n++){
  let u=-1;for(let i=0;i<points.length;i++)if(!done.has(i)&&(u<0||dist[i]<dist[u]))u=i;
  if(u===end||dist[u]===Infinity)break;done.add(u);
  for(let v=1;v<points.length;v++)if(!done.has(v)&&!blocked(...points[u],...points[v],.5)){
   const d=dist[u]+Math.hypot(points[v][0]-points[u][0],points[v][1]-points[u][1]);if(d<dist[v]){dist[v]=d;prev[v]=u;}
  }
 }
 const path=[];let v=end;while(prev[v]>=0){path.unshift(points[v]);v=prev[v];}return path;
}
export function walk(a,tx,tz,dt,speed=2.1){
 if(blocked(a.x,a.z,tx,tz,.5)){
  a.replan=(a.replan||0)-dt;
  if(!a.path?.length||a.replan<=0||Math.hypot(tx-a.goalX,tz-a.goalZ)>.8){a.path=plan(a,tx,tz);a.replan=1.2;a.goalX=tx;a.goalZ=tz;}
  if(!a.path.length){a.vx=a.vz=0;return false;}
  tx=a.path[0][0];tz=a.path[0][1];if(Math.hypot(tx-a.x,tz-a.z)<.12){a.path.shift();a.route++;}
 }
 const d=Math.hypot(tx-a.x,tz-a.z),x=a.x,z=a.z;
 if(d>.04){a.yaw=Math.atan2(-(tx-a.x),-(tz-a.z));moveActor(a,(tx-a.x)/d*Math.min(speed,d/dt),(tz-a.z)/d*Math.min(speed,d/dt),dt,walls);}
 a.vx=(a.x-x)/dt;a.vz=(a.z-z)/dt;return d<.35;
}
export function stepBot(s,a,dt){
 if(a.hp<=0)return;a.vx=a.vz=0;a.alert=Math.max(0,a.alert-dt);a.wait-=dt;
 let target=null,nearest=35;
 for(const b of s.actors)if(b.team!==a.team&&b.hp>0){const d=Math.hypot(a.x-b.x,a.z-b.z);if(d<nearest&&canSee(a,b)){nearest=d;target=b;}}
 if(target){
  cancelUse(a);a.role='engage';
  if(a.targetId!==target.id){a.wait=Math.max(a.wait,.38);a.targetId=target.id;}
  a.lastX=target.x;a.lastZ=target.z;a.alert=3;a.memory='seen';a.yaw=Math.atan2(-(target.x-a.x),-(target.z-a.z));
  if(a.ammo<3||a.reload>0){
   a.role='reload cover';reload(a);
   let cover=null,cost=Infinity;
   for(const point of nodes){const d=Math.hypot(a.x-point[0],a.z-point[1]);if(d<cost&&blocked(...point,target.x,target.z)&&!blocked(a.x,a.z,...point,.5)){cover=point;cost=d;}}
   if(cover)walk(a,...cover,dt,2.8);return;
  }
  if(a.frag>0&&nearest>9&&nearest<17&&!s.actors.some(b=>b!==a&&b.team===a.team&&b.hp>0&&Math.hypot(b.x-target.x,b.z-target.z)<7))throwFrag(s,a,a.yaw);
  a.crouch=nearest>12;
  if(a.wait<=0){const aim=Math.atan2((target.crouch?1:1.35)-(a.crouch?1.08:1.62),nearest);fire(s,a,a.yaw,aim,.025+nearest*.0008+spreadFor(a,false));a.wait=.3+Math.random()*.4;}
  if(nearest>21)walk(a,target.x,target.z,dt,1.5);
  return;
 }
 a.targetId=null;a.crouch=false;if(a.ammo<6)reload(a);
 if(s.bomb.planted){
  if(a.team===0){a.role='cover '+s.bomb.site;const h=holds[s.bomb.site][a.id%3];if(Math.hypot(a.x-h[0],a.z-h[1])>.5)walk(a,...h,dt);else a.yaw=Math.PI+Math.sin(s.elapsed*.6+a.id)*.6;return;}
  a.role='retake';
  // Only the nearest living defender channels; the others watch approaches.
  let defuser=null,best=Infinity;
  for(const d of s.actors)if(d.team===1&&d.hp>0){const distance=Math.hypot(d.x-s.bomb.x,d.z-s.bomb.z);if(distance<best){best=distance;defuser=d;}}
  if(defuser!==a){cancelUse(a);a.role='cover retake';const h=holds[s.bomb.site||'A'][a.id%3];if(Math.hypot(a.x-h[0],a.z-h[1])>.5)walk(a,...h,dt,2.8);else a.yaw=Math.PI+Math.sin(s.elapsed*.7)*.8;return;}
  if(Math.hypot(a.x-s.bomb.x,a.z-s.bomb.z)<1.5){a.role='defuse';objective(s,a,dt);return;}
  cancelUse(a);walk(a,s.bomb.x,s.bomb.z,dt,2.8);return;
 }
 if(a.team===0){
  if(s.bomb.dropped){a.role='recover';if(Math.hypot(a.x-s.bomb.x,a.z-s.bomb.z)<1.2)objective(s,a,dt);else{cancelUse(a);walk(a,s.bomb.x,s.bomb.z,dt,3);}return;}
  const site=sites.find(v=>v.id===s.attackSite)||sites[0];
  if(s.bomb.carrier===a.id){a.role='plant '+site.id;if(Math.hypot(a.x-site.x,a.z-site.z)<site.r-.5)objective(s,a,dt);else{cancelUse(a);walk(a,site.x,site.z,dt,2.8);}return;}
  a.role='escort '+site.id;cancelUse(a);
  if(a.alert>0){a.role='investigate';if(Math.hypot(a.x-a.lastX,a.z-a.lastZ)>.7)walk(a,a.lastX,a.lastZ,dt);else a.yaw+=dt;return;}
  const h=holds[site.id][a.id%3];if(Math.hypot(a.x-h[0],a.z-h[1])>.6)walk(a,...h,dt,2.6);else a.yaw=Math.sin(s.elapsed*.7+a.id);return;
 }
 cancelUse(a);
 if(a.alert>0){a.role='rotate '+a.memory;if(Math.hypot(a.x-a.lastX,a.z-a.lastZ)>2)walk(a,a.lastX,a.lastZ,dt,2.5);else a.yaw+=dt*.7;return;}
 const site=a.id%3===1?'B':'A',h=holds[site][a.id%3];
 a.role='hold '+site;
 if(Math.hypot(a.x-h[0],a.z-h[1])>.5)walk(a,...h,dt);
 else{a.crouch=true;a.yaw=Math.PI+Math.sin(s.elapsed*.55+a.id)*.7;}
}
export function throwFrag(s,a,yaw){
 if(s.phase!=='live'||a.frag<=0||a.hp<=0)return false;a.frag--;
 s.grenades??=[];s.grenades.push({x:a.x,y:1.3,z:a.z,vx:-Math.sin(yaw)*10,vy:5,vz:-Math.cos(yaw)*10,time:1.65,owner:a.id});s.events.push({type:'throw'});return true;
}
export function stepWorld(s,dt){
 syncCharge(s);
 for(const a of s.actors)tickWeapon(a,dt);
 if(s.phase==='live'){
  for(let i=1;i<s.actors.length;i++)stepBot(s,s.actors[i],dt);
  for(const g of s.grenades||[]){
   if(g.time<=0)continue;g.time-=dt;g.vy-=dt*12;
   const probe={x:g.x,z:g.z};moveActor(probe,g.vx,g.vz,dt,walls);if(probe.x===g.x)g.vx*=-.5;if(probe.z===g.z)g.vz*=-.5;g.x=probe.x;g.z=probe.z;g.y+=g.vy*dt;if(g.y<.16){g.y=.16;g.vy=Math.abs(g.vy)*.4;g.vx*=.8;g.vz*=.8;}
   if(g.time<=0){s.events.push({type:'blast',x:g.x,z:g.z});const owner=s.actors[g.owner];for(const a of s.actors){const d=Math.hypot(a.x-g.x,a.z-g.z);if(a.hp>0&&d<7&&!blocked(g.x,g.z,a.x,a.z,.7)){hurt(a,Math.max(0,110*(1-d/7)));if(a.hp<=0){s.events.push({type:'kill',killer:names[g.owner],victim:names[a.id],team:owner.team});if(a.team!==owner.team){owner.cash+=300;owner.kills++;}}}}}
  }
 }
 const oldRound=s.round;stepRound(s,dt);if(s.round!==oldRound){s.grenades=[];for(const a of s.actors){a.path=[];a.replan=0;}}
}
