import test from 'node:test';
import assert from 'node:assert/strict';
import { moveActor, hurt, actor, rayBox } from '../game/sim.js';
test('collision slides along cover without tunnelling',()=>{
 const p=actor(0,0,0,0); const walls=[{x:2,z:0,w:1,d:8,h:3}];
 moveActor(p,10,2,1,walls); assert.ok(p.x<1.2); assert.ok(p.z>1);
});
test('headshots exceed body damage; armor absorbs and death is clamped',()=>{
 const a=actor(0,0,0,0),b=actor(1,1,0,0); a.armor=b.armor=50;
 hurt(a,30,false); hurt(b,30,true); assert.ok(b.hp<a.hp); assert.ok(a.armor<50);
 hurt(b,500,true); assert.equal(b.hp,0);
});
test('ray intersects nearest slab and rejects a miss',()=>{
 assert.equal(rayBox(0,1,0,0,0,-1,{x:0,y:1,z:-5,w:2,h:2,d:2}),4);
 assert.equal(rayBox(4,1,0,0,0,-1,{x:0,y:1,z:-5,w:2,h:2,d:2}),Infinity);
});
