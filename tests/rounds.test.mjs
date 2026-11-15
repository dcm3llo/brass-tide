import test from 'node:test';import assert from 'node:assert/strict';
import {createMatch,stepRound,objective,finishRound,newRound} from '../game/sim.js';
test('buy expires into a live round; elimination rewards and next round resets',()=>{
 const s=createMatch();stepRound(s,13);assert.equal(s.phase,'live');s.actors.filter(a=>a.team===1).forEach(a=>a.hp=0);stepRound(s,.1);assert.equal(s.score[0],1);assert.equal(s.phase,'over');const cash=s.actors[0].cash;stepRound(s,6);assert.equal(s.phase,'buy');assert.equal(s.actors[0].hp,100);assert.equal(s.actors[0].cash,cash);
});
test('plant needs live site proximity and hold; armed charge survives attacker elimination',()=>{
 const s=createMatch();s.phase='live';const p=s.actors[0];assert.equal(objective(s,p,4),false);p.x=0;p.z=-14;assert.ok(objective(s,p,3.1));assert.equal(s.bomb.planted,true);
 s.actors.filter(a=>a.team===0).forEach(a=>a.hp=0);stepRound(s,1);assert.equal(s.phase,'live');stepRound(s,30);assert.equal(s.score[0],1);
});
test('defuse wins, timeout loses, first to five ends match',()=>{
 const s=createMatch();s.phase='live';s.bomb.planted=true;const d=s.actors[3];d.x=0;d.z=-14;objective(s,d,5.1);assert.equal(s.score[1],1);
 newRound(s);s.phase='live';s.time=.01;stepRound(s,1);assert.equal(s.score[1],2);
 s.score[0]=4;s.phase='live';finishRound(s,0,'test');assert.equal(s.phase,'match');assert.equal(s.score[0],5);
});
