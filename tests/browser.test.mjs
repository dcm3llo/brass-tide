import {chromium} from 'file:///C:/Users/zalta/AppData/Local/hermes/cache/scratch/brass-browser/node_modules/playwright-core/index.mjs';
import assert from 'node:assert/strict';import {writeFileSync} from 'node:fs';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
const errors=[],requests=[],consoleErrors=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
const snap=()=>page.evaluate(()=>window.brassTide.snapshot());
const log=(label,data)=>console.log(label,JSON.stringify(data));
const shot=async name=>{await page.screenshot({path:'screenshots/'+name,type:'jpeg',quality:83});log('SCREENSHOT',name);};
try{
 await page.goto('http://127.0.0.1:8087');await page.waitForFunction(()=>window.brassTide);await page.waitForTimeout(800);
 assert.equal((await snap()).started,false);await shot('02-deployment.jpg');
 await page.click('#deploy');assert.equal((await snap()).started,true);log('START',{started:true,webgl:(await snap()).webgl});
 await page.keyboard.press('KeyB');await page.click('[data-buy="armor"]');assert.equal((await snap()).actors[0].armor,100);assert.equal((await snap()).actors[0].cash,2550);await shot('03-requisition.jpg');await page.click('#closeBuy');
 await page.keyboard.down('KeyW');await page.waitForTimeout(800);await page.keyboard.up('KeyW');const moved=await snap();assert.ok(moved.actors[0].z<17);log('MOVE',{x:moved.actors[0].x,z:moved.actors[0].z});
 await page.keyboard.down('ControlLeft');await page.waitForTimeout(120);assert.equal((await snap()).actors[0].crouch,true);await page.keyboard.up('ControlLeft');
 const yaw=(await snap()).yaw;await page.keyboard.down('ArrowRight');await page.waitForTimeout(180);await page.keyboard.up('ArrowRight');assert.ok((await snap()).yaw<yaw);await page.evaluate(()=>window.brassTide.look(0,0));
 await page.keyboard.press('Escape');assert.equal((await snap()).paused,true);const frozen=(await snap()).time;await page.waitForTimeout(300);assert.equal((await snap()).time,frozen);await page.locator('#sensitivity').fill('1.7');await page.locator('#mute').check();assert.equal((await snap()).sensitivity,1.7);assert.equal((await snap()).muted,true);await page.click('#resume');assert.equal((await snap()).paused,false);log('PAUSE',{frozen:true,resumed:true,settings:true});
 await page.waitForFunction(()=>window.brassTide.snapshot().phase==='live',{},{timeout:25000});
 await page.keyboard.press('KeyB');assert.equal((await snap()).buyOpen,false);await page.mouse.down({button:'right'});await page.waitForTimeout(100);assert.equal((await snap()).ads,true);await page.mouse.up({button:'right'});log('ADS',{works:true,pointerLocked:(await snap()).pointerLocked});
 await page.mouse.move(640,360);await page.mouse.down();await page.waitForTimeout(400);await page.mouse.up();const fired=await snap();assert.ok(fired.actors[0].ammo<24);log('FIRE',{ammo:fired.actors[0].ammo});
 await page.keyboard.press('KeyR');await page.waitForFunction(()=>window.brassTide.snapshot().actors[0].reload===0,{},{timeout:8000});const loaded=await snap();assert.equal(loaded.actors[0].ammo,24);assert.ok(loaded.actors[0].reserve<96);log('RELOAD',{ammo:loaded.actors[0].ammo,reserve:loaded.actors[0].reserve});
 await page.keyboard.press('KeyG');assert.equal((await snap()).actors[0].frag,0);await page.waitForTimeout(1800);log('GRENADE',{consumed:true,exploded:(await snap()).grenades.every(g=>g.time<=0)});
 await page.evaluate(()=>window.brassTide.look(-.08,.01));await shot('01-coastal-works.jpg');
 // Drive a real flank using only locomotion and look inputs. No teleport/state injection.
 async function go(x,z,timeout=9000){const end=Date.now()+timeout;await page.keyboard.down('KeyW');while(Date.now()<end){const s=await snap(),p=s.actors[0];if(p.hp<=0||s.phase!=='live')break;if(Math.hypot(p.x-x,p.z-z)<.6)break;await page.evaluate(({x,z})=>{const p=window.brassTide.snapshot().actors[0];window.brassTide.look(Math.atan2(-(x-p.x),-(z-p.z)),0);},{x,z});await page.waitForTimeout(100);}await page.keyboard.up('KeyW');}
 await go(-14.6,13);await go(-14.6,-15.8,14000);await go(-1,-16,8000);
 const flank=await snap();log('FLANK',{phase:flank.phase,player:flank.actors[0],score:flank.score,actors:flank.actors.map(a=>({id:a.id,x:a.x,z:a.z,hp:a.hp}))});
 if(flank.actors[0].hp>0&&flank.phase==='live'&&Math.hypot(flank.actors[0].x,flank.actors[0].z+14)<2.8){await page.keyboard.down('KeyE');await page.waitForTimeout(3400);await page.keyboard.up('KeyE');log('PLANT',(await snap()).bomb);}
 await page.evaluate(()=>window.brassTide.look(0,.02));await shot('04-field-operation.jpg');
 const final=await snap();assert.ok(final.drawCalls>0);assert.equal(errors.length,0);assert.equal(consoleErrors.length,0);assert.ok(requests.every(url=>url.startsWith('http://127.0.0.1:8087/')));
 log('PASS',{errors,consoleErrors,requests:requests.length,network:'localhost only',drawCalls:final.drawCalls,phase:final.phase,round:final.round,score:final.score});
 writeFileSync('evidence/browser-report.json',JSON.stringify({errors,consoleErrors,requests,final},null,2));
 if(final.phase==='over'){await page.waitForFunction(()=>window.brassTide.snapshot().round>1,{},{timeout:12000});const next=await snap();assert.equal(next.actors[0].hp,100);log('NEXT ROUND',{round:next.round,phase:next.phase,hp:next.actors[0].hp,score:next.score});}
 const fallback=await browser.newPage({viewport:{width:1280,height:720}});await fallback.addInitScript(()=>{HTMLCanvasElement.prototype.requestPointerLock=function(){return Promise.reject(new Error('Disabled to test drag fallback'));};});await fallback.goto('http://127.0.0.1:8087');await fallback.waitForFunction(()=>window.brassTide);await fallback.click('#deploy');const before=await fallback.evaluate(()=>window.brassTide.snapshot().yaw);await fallback.mouse.move(600,350);await fallback.mouse.down();await fallback.mouse.move(730,380,{steps:8});await fallback.mouse.up();const after=await fallback.evaluate(()=>window.brassTide.snapshot().yaw);assert.notEqual(before,after);assert.equal(await fallback.evaluate(()=>window.brassTide.snapshot().pointerLocked),false);log('FALLBACK',{dragLook:true,before,after});await fallback.close();
}finally{await browser.close();}
