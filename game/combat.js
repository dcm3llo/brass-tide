import {WEAPONS,shoot,hurt,tickWeapon,reload,moveActor,objective,stepRound} from './sim.js';
import {walls,routes,nodes,names} from './map.js';
import {rayBox} from './sim.js';
const navWalls=walls.map(b=>({...b,w:b.w+.8,d:b.d+.8}));
export function blocked(x,z,tx,tz,height=1.4){
 const dist=Math.hypot(tx-x,tz-z);if(dist<.01)return false;
 const volumes=height===.5?navWalls:walls;
 for(const b of volumes)if(rayBox(x,height,z,(tx-x)/dist,0,(tz-z)/dist,b)<dist-.1)return true;return false;
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
export function fire(s,a,yaw,pitch,spread=0){
 if(s.phase!=='live'||!shoot(a))return null;
 yaw+=(Math.random()-.5)*spread;pitch+=(Math.random()-.5)*spread;
 const dx=-Math.sin(yaw)*Math.cos(pitch),dy=Math.sin(pitch),dz=-Math.cos(yaw)*Math.cos(pitch);
 const hit=trace(s,a,dx,dy,dz);
 for(const other of s.actors)if(other.team!==a.team&&Math.hypot(other.x-a.x,other.z-a.z)<23){other.alert=4;other.lastX=a.x;other.lastZ=a.z;}
 s.events.push({type:'shot',id:a.id,x:a.x,y:a.crouch?1.08:1.62,z:a.z,tx:a.x+dx*hit.distance,ty:(a.crouch?1.08:1.62)+dy*hit.distance,tz:a.z+dz*hit.distance,weapon:a.weapon});
 if(hit.target&&hit.target.team!==a.team){const b=hit.target;hurt(b,WEAPONS[a.weapon].damage,hit.head);s.events.push({type:'hit',id:a.id,target:b.id,head:hit.head});if(b.hp<=0){a.cash+=300;a.kills++;s.events.push({type:'kill',killer:names[a.id],victim:names[b.id],head:hit.head,team:a.team});}}
 return hit;
}
// Visibility-graph routing for investigations and charge retakes. Cached paths on each bot.
function plan(a,tx,tz){
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
function walk(a,tx,tz,dt,speed=2.1){
 if(blocked(a.x,a.z,tx,tz,.5)){
  a.replan=(a.replan||0)-dt;if(!a.path?.length||a.replan<=0){a.path=plan(a,tx,tz);a.replan=1.2;}
  if(a.path?.length){tx=a.path[0][0];tz=a.path[0][1];if(Math.hypot(tx-a.x,tz-a.z)<.6)a.path.shift();}
 }
 const d=Math.hypot(tx-a.x,tz-a.z);if(d>.12){a.yaw=Math.atan2(-(tx-a.x),-(tz-a.z));moveActor(a,(tx-a.x)/d*speed,(tz-a.z)/d*speed,dt,walls);}
}
function bot(s,a,dt){
 if(a.hp<=0)return;a.alert=Math.max(0,a.alert-dt);a.wait-=dt;
 let target=null,nearest=35;
 for(const b of s.actors)if(b.team!==a.team&&b.hp>0){const d=Math.hypot(a.x-b.x,a.z-b.z);if(d<nearest&&!blocked(a.x,a.z,b.x,b.z)){nearest=d;target=b;}}
 if(target){
  a.progress=0;
  a.lastX=target.x;a.lastZ=target.z;a.alert=3;a.yaw=Math.atan2(-(target.x-a.x),-(target.z-a.z));
  a.crouch=nearest>12;
  if(a.wait<=0){const aim=Math.atan2((target.crouch?1:1.35)-(a.crouch?1.08:1.62),nearest);fire(s,a,a.yaw,aim,.025+nearest*.0008);a.wait=.3+Math.random()*.4;}
  if(a.ammo<=0)reload(a);
  if(nearest>21)walk(a,target.x,target.z,dt,1.5);
  return;
 }
 a.crouch=false;
 if(s.bomb.planted){
  if(Math.hypot(a.x,a.z+14)<2.4){if(a.team===1)objective(s,a,dt);return;}
  walk(a,0,-14,dt,2.8);return;
 }
 if(a.team===0&&Math.hypot(a.x,a.z+14)<2.3){objective(s,a,dt);return;}a.progress=0;
 if(a.alert>0){walk(a,a.lastX,a.lastZ,dt);return;}
 const route=routes[a.id],point=route[a.route%route.length];
 if(Math.hypot(a.x-point[0],a.z-point[1])<.7){a.route++;a.wait=.35;}
 else if(a.wait<=0)walk(a,...point,dt);
}
export function throwFrag(s,a,yaw){
 if(s.phase!=='live'||a.frag<=0||a.hp<=0)return false;a.frag--;
 s.grenades??=[];s.grenades.push({x:a.x,y:1.3,z:a.z,vx:-Math.sin(yaw)*10,vy:5,vz:-Math.cos(yaw)*10,time:1.65,owner:a.id});s.events.push({type:'throw'});return true;
}
export function stepWorld(s,dt){
 for(const a of s.actors)tickWeapon(a,dt);
 if(s.phase==='live'){
  for(let i=1;i<s.actors.length;i++)bot(s,s.actors[i],dt);
  for(const g of s.grenades||[]){
   if(g.time<=0)continue;g.time-=dt;g.vy-=dt*12;
   const probe={x:g.x,z:g.z};moveActor(probe,g.vx,g.vz,dt,walls);if(probe.x===g.x)g.vx*=-.5;if(probe.z===g.z)g.vz*=-.5;g.x=probe.x;g.z=probe.z;g.y+=g.vy*dt;if(g.y<.16){g.y=.16;g.vy=Math.abs(g.vy)*.4;g.vx*=.8;g.vz*=.8;}
   if(g.time<=0){s.events.push({type:'blast',x:g.x,z:g.z});const owner=s.actors[g.owner];for(const a of s.actors){const d=Math.hypot(a.x-g.x,a.z-g.z);if(a.hp>0&&d<7&&!blocked(g.x,g.z,a.x,a.z,.7)){hurt(a,Math.max(0,110*(1-d/7)));if(a.hp<=0){s.events.push({type:'kill',killer:names[g.owner],victim:names[a.id],team:owner.team});if(a.team!==owner.team){owner.cash+=300;owner.kills++;}}}}}
  }
 }
 const oldRound=s.round;stepRound(s,dt);if(s.round!==oldRound){s.grenades=[];for(const a of s.actors){a.path=[];a.replan=0;}}
}
