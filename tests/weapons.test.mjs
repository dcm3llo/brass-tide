import test from 'node:test';
import assert from 'node:assert/strict';
import {actor,shoot,reload,tickWeapon,buy,WEAPONS,spreadFor} from '../game/sim.js';
test('moving and sustained bursts punish accuracy; ADS/crouch tighten it',()=>{
 const p=actor(0,0,0,0),still=spreadFor(p,false);p.vx=4;assert.ok(spreadFor(p,false)>still*3);p.vx=0;p.heat=.8;assert.ok(spreadFor(p,false)>still);p.heat=0;p.crouch=true;assert.ok(spreadFor(p,true)<still*.5);
});
test('ammo depletes, cooldown gates fire, reload conserves reserve',()=>{
 const a=actor(0,0,0,0);a.ammo=1;a.reserve=7;assert.equal(shoot(a),true);assert.equal(a.ammo,0);assert.equal(shoot(a),false);
 assert.equal(reload(a),true);tickWeapon(a,3);assert.equal(a.ammo,7);assert.equal(a.reserve,0);
});
test('buy is spawn/phase/cash restricted and grants the actual weapon',()=>{
 const a=actor(0,0,0,0);assert.equal(buy(a,'marksman',false),false);assert.equal(a.cash,3200);
 assert.equal(buy(a,'marksman',true),true);assert.equal(a.cash,3200-WEAPONS.marksman.cost);assert.equal(a.weapon,'marksman');
 assert.equal(buy(a,'rifle',true),false);assert.equal(buy(a,'unknown',true),false);
});
test('reload cannot create rounds or fire while loading',()=>{
 const a=actor(0,0,0,0);assert.equal(reload(a),false);a.ammo=4;assert.ok(reload(a));assert.equal(shoot(a),false);tickWeapon(a,2);assert.equal(a.ammo,24);assert.equal(a.reserve,76);
});
