import test from 'node:test';import assert from 'node:assert/strict';
import {createMatch,rayBox} from '../game/sim.js';import {trace,fire,blocked,stepWorld,throwFrag} from '../game/combat.js';
test('real body/head trace, wall occlusion and firing damage',()=>{
 const s=createMatch();s.phase='live';const p=s.actors[0],enemy=s.actors[3];p.x=-15;p.z=8;enemy.x=-15;enemy.z=-3;enemy.armor=0;s.actors[1].hp=s.actors[2].hp=s.actors[4].hp=s.actors[5].hp=0;
 const hit=trace(s,p,0,0,-1);assert.equal(hit.target,enemy);assert.equal(hit.head,true);fire(s,p,0,0);assert.equal(enemy.hp,0);assert.equal(p.cash,3500);
 assert.equal(blocked(-7,12,-7,0),true);assert.equal(blocked(-15,8,-15,-3),false);
});
test('grenade is consumed, travels and explodes through simulation only',()=>{
 const s=createMatch();s.phase='live';assert.equal(throwFrag(s,s.actors[0],0),true);assert.equal(s.actors[0].frag,0);assert.equal(throwFrag(s,s.actors[0],0),false);for(let i=0;i<110;i++)stepWorld(s,1/60);assert.ok(s.events.some(e=>e.type==='blast'));
});
test('bots move, shoot and resolve actual live rounds without scripted victories',()=>{
 const s=createMatch();let shots=0,rounds=0,moved=false;for(let i=0;i<60*120;i++){stepWorld(s,1/60);moved ||= s.actors.some(a=>a.id>0&&a.route>0);for(const e of s.events){if(e.type==='shot')shots++;if(e.type==='round')rounds++;}s.events.length=0;}
 // A buy phase at the final tick legitimately resets all route counters.
 assert.ok(shots>15);assert.ok(rounds>0);assert.ok(s.round>1);assert.ok(moved);console.log('bot soak',JSON.stringify({shots,rounds,score:s.score,round:s.round}));
});
