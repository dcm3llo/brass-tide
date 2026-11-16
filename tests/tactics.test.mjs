import test from 'node:test';
import assert from 'node:assert/strict';
import * as sim from '../game/sim.js';
import * as map from '../game/map.js';
import * as combat from '../game/combat.js';

function live(){const s=sim.createMatch();s.phase='live';return s;}
test('only the charge carrier can choose and arm either distinct site',()=>{
 assert.equal(map.sites?.length,2,'two real mapped objective sites');
 for(const site of map.sites){
  const s=live(),p=s.actors[0],ally=s.actors[1];
  assert.equal(s.bomb.carrier,0);
  ally.x=site.x;ally.z=site.z;
  assert.equal(sim.objective(s,ally,4),false,'non-carrier cannot create a charge');
  p.x=site.x;p.z=site.z;
  assert.equal(sim.objective(s,p,3.1),true);
  assert.equal(s.bomb.site,site.id);assert.equal(s.bomb.planted,true);
  assert.equal(s.bomb.carrier,null);assert.equal(s.bomb.x,site.x);
 }
});
test('plant and defuse require uninterrupted stationary undamaged holds',()=>{
 const s=live(),p=s.actors[0];p.x=0;p.z=-14;
 sim.objective(s,p,2);sim.objective(s,p,.1,false);
 assert.equal(p.progress,0,'releasing use clears the hold');
 sim.objective(s,p,2);p.x=8;sim.objective(s,p,.1);
 assert.equal(p.progress,0,'leaving the site clears the hold');
 p.x=0;sim.objective(s,p,2);sim.hurt(p,1);sim.objective(s,p,.1);
 assert.ok(p.progress<.2,'damage interrupts a plant');
 sim.objective(s,p,3);assert.equal(s.bomb.planted,true);
 const d=s.actors[3];d.x=0;d.z=-14;sim.objective(s,d,4);
 sim.objective(s,d,.1,false);assert.equal(d.progress,0);
 sim.objective(s,d,4);assert.equal(s.phase,'live');
 sim.objective(s,d,1.1);assert.equal(s.reason,'Charge defused');
});
test('dead carrier drops at death position; an attacker recovers and can plant',()=>{
 const s=live(),p=s.actors[0],ally=s.actors[1];p.x=13;p.z=-5;p.hp=0;
 sim.stepRound(s,.01);assert.equal(s.bomb.carrier,null);assert.equal(s.bomb.dropped,true);
 assert.equal(s.bomb.x,13);assert.equal(s.bomb.z,-5);
 const enemy=s.actors[3];enemy.x=13;enemy.z=-5;sim.objective(s,enemy,.1);
 assert.equal(s.bomb.carrier,null,'defenders cannot steal the charge');
 ally.x=13;ally.z=-5;sim.objective(s,ally,.1);
 assert.equal(s.bomb.carrier,ally.id);assert.equal(s.bomb.dropped,false);
 sim.objective(s,ally,3.1);assert.equal(s.bomb.site,'B');
 ally.hp=0;s.actors[2].hp=0;sim.stepRound(s,1);
 assert.equal(s.phase,'live');assert.equal(s.bomb.dropped,false);
 sim.newRound(s);assert.equal(s.bomb.carrier,0);assert.equal(s.bomb.planted,false);
 assert.equal(s.actors[1].progress,0);
});
test('defense is a selectable balanced side with persistent earned stats and equipment loss',()=>{
 const s=sim.createMatch({playerTeam:1}),p=s.actors[0];
 assert.equal(p.team,1);assert.ok(p.z<0);assert.equal(s.actors.filter(a=>a.team===0).length,3);
 assert.equal(s.actors[s.bomb.carrier].team,0);assert.notEqual(s.bomb.carrier,0);
 s.phase='live';sim.hurt(p,200);assert.equal(p.deaths,1);sim.hurt(p,200);assert.equal(p.deaths,1);
 const before=p.cash;sim.finishRound(s,0,'Test elimination');assert.equal(p.cash,before+1500);
 assert.equal(s.history.length,1);assert.equal(s.history[0].reason,'Test elimination');
 sim.newRound(s);assert.equal(p.weapon,'pistol','dead operators lose purchased rifles');
 assert.equal(p.deaths,1);assert.equal(p.hp,100);assert.ok(p.z<0);
 assert.ok(s.actors.filter(a=>a.id>0).every(a=>a.cash<5600),'bots pay for their own armor/gear');
});
test('bot perception respects facing, cover and remembered sound without tracking through walls',()=>{
 assert.equal(typeof combat.canSee,'function','shared fair perception, not omnidirectional LOS');
 const s=live(),a=s.actors[3],p=s.actors[0];a.x=-15;a.z=0;a.yaw=0;p.x=-15;p.z=8;
 assert.equal(combat.canSee(a,p),false);p.z=-8;assert.equal(combat.canSee(a,p),true);
 a.x=-7;a.z=12;p.x=-7;p.z=0;assert.equal(combat.canSee(a,p),false);
 a.x=-15;a.z=0;p.x=-15;p.z=8;combat.fire(s,p,Math.PI,0);
 assert.equal(a.memory,'heard');assert.equal(a.lastZ,8);
 p.z=12;assert.equal(a.lastZ,8,'a hidden moving source does not update remembered coordinates');
});
test('bots follow collision-safe paths to both sites and complete a planted retake',()=>{
 assert.equal(typeof combat.stepBot,'function');
 assert.equal(typeof combat.walk,'function');
 for(const site of map.sites)for(const spawn of sim.SPAWNS){
  const a=sim.actor(1,0,...spawn);
  for(let i=0;i<2400&&Math.hypot(a.x-site.x,a.z-site.z)>.5;i++)combat.walk(a,site.x,site.z,sim.DT,3);
  assert.ok(Math.hypot(a.x-site.x,a.z-site.z)<.6,`reachable ${spawn} to ${site.id}`);
  assert.equal(map.walls.some(w=>Math.abs(a.x-w.x)<w.w/2+.32&&Math.abs(a.z-w.z)<w.d/2+.32),false);
 }
 const s=live(),p=s.actors[0];p.x=13;p.z=-5;sim.objective(s,p,3.1);
 for(const a of s.actors)if(a.id!==3)a.hp=0;
 let retake=false;
 for(let i=0;i<1750&&s.phase==='live';i++){combat.stepWorld(s,sim.DT);retake ||= s.actors[3].role==='retake';}
 assert.equal(retake,true);assert.equal(s.reason,'Charge defused');assert.equal(s.score[1],1);
});
test('quiet guards hold distinct sites while a recovered carrier executes the selected lane',()=>{
 const s=live();for(const a of s.actors)if(a.team===0)a.hp=0;
 for(let i=0;i<900;i++){s.elapsed+=sim.DT;combat.stepBot(s,s.actors[3],sim.DT);combat.stepBot(s,s.actors[4],sim.DT);}
 assert.equal(s.actors[3].role,'hold A');assert.equal(s.actors[4].role,'hold B');
 assert.ok(s.actors[3].z<-8);assert.ok(s.actors[4].x>10);
 const t=live();t.attackSite='B';t.actors[0].hp=0;
 for(const a of t.actors)if(a.team===1)a.hp=0;
 sim.syncCharge(t);
 for(let i=0;i<2400&&!t.bomb.planted;i++){t.elapsed+=sim.DT;combat.stepBot(t,t.actors[1],sim.DT);}
 assert.equal(t.bomb.planted,true);assert.equal(t.bomb.site,'B');
 combat.stepBot(t,t.actors[2],sim.DT);assert.equal(t.actors[2].role,'cover B');
});
test('bots deploy finite frag utility and retreat to reload instead of firing empty',()=>{
 const s=live(),a=s.actors[3],p=s.actors[0];for(const b of s.actors)if(b!==a&&b!==p)b.hp=0;
 a.x=-15;a.z=-8;a.yaw=Math.PI;p.x=-15;p.z=5;a.wait=0;
 combat.stepBot(s,a,sim.DT);assert.equal(a.frag,0);assert.equal(s.grenades.length,1);
 a.ammo=1;combat.stepBot(s,a,sim.DT);
 assert.equal(a.role,'reload cover');assert.ok(a.reload>0);assert.ok(a.path?.length||Math.hypot(a.vx,a.vz)>0);
 const ammo=a.ammo;combat.stepBot(s,a,sim.DT);assert.equal(a.ammo,ammo,'no empty/while-reloading firing');
});
test('routes recover from real wall-edge positions without a padded-graph deadlock',()=>{
 for(const [x,z,tx,tz] of [[3.6506759248837564,-1.8881086911911749,13,-5],[10.821904360866473,-14.833628877816974,12,-2],[10.346454006985361,9.258987707366709,13,-5]]){
  const a=sim.actor(1,0,x,z);
  for(let i=0;i<2400&&Math.hypot(a.x-tx,a.z-tz)>.5;i++)combat.walk(a,tx,tz,sim.DT,2.8);
  assert.ok(Math.hypot(a.x-tx,a.z-tz)<.6,`wall edge ${x},${z} reachable`);
 }
});
test('public field-school teaches a real plant then defuse without preset bomb or fake opponents',()=>{
 const s=sim.createMatch({mode:'drill'}),p=s.actors[0];
 assert.equal(s.mode,'drill');assert.equal(s.actors.length,1);assert.equal(s.bomb.planted,false);
 sim.stepRound(s,13);assert.equal(s.phase,'live');sim.stepRound(s,.1);assert.equal(s.phase,'live','no pretend elimination win');
 p.x=13;p.z=-5;sim.objective(s,p,2);assert.equal(p.team,0);sim.objective(s,p,1.1);
 assert.equal(s.bomb.planted,true);assert.equal(p.team,1,'drill changes role only after actual successful plant');
 sim.objective(s,p,4);assert.equal(s.phase,'live');sim.objective(s,p,1.1);
 assert.equal(s.reason,'Charge defused');assert.equal(s.phase,'match');assert.equal(s.history.length,1);
});
test('shared player movement accelerates, brakes, crouches and seals both buy spawns',()=>{
 assert.equal(typeof sim.movePlayer,'function');
 const s=live(),p=s.actors[0];p.x=0;p.z=17;
 const control={yaw:0,forward:1,right:0,crouch:false,ads:false};
 sim.movePlayer(s,control,sim.DT,map.walls);assert.ok(-p.vz>0&&-p.vz<1);
 for(let i=0;i<20;i++)sim.movePlayer(s,control,sim.DT,map.walls);
 assert.ok(-p.vz>3.9);control.forward=0;for(let i=0;i<20;i++)sim.movePlayer(s,control,sim.DT,map.walls);
 assert.ok(Math.hypot(p.vx,p.vz)<.03);control.forward=1;control.crouch=true;
 for(let i=0;i<30;i++)sim.movePlayer(s,control,sim.DT,map.walls);assert.ok(-p.vz<1.66);assert.equal(p.crouch,true);
 for(const team of [0,1]){const t=sim.createMatch({playerTeam:team}),q=t.actors[0];q.x=0;q.z=team===0?12.1:-14.1;
  for(let i=0;i<60;i++)sim.movePlayer(t,{...control,crouch:false,yaw:team===0?0:Math.PI},sim.DT,map.walls);
  assert.ok(team===0?q.z>=12:q.z<=-14);
 }
});
test('new round clears perception and cooldown memories instead of phantom targets',()=>{
 const s=live(),a=s.actors[3];a.memory='seen';a.targetId=0;a.goalX=8;a.goalZ=3;a.useHP=5;a.footstepAt=90;
 sim.newRound(s);assert.equal(a.memory,null);assert.equal(a.targetId,null);assert.equal(a.useHP,null);
 assert.equal(a.goalX,null);assert.equal(a.footstepAt,0);assert.equal(a.lastX,a.x);assert.equal(a.lastZ,a.z);
});
