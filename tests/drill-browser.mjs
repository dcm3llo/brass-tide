// Public solo onboarding, not a competitive match. All state comes from real inputs.
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??new URL('../../browser-tools/node_modules/playwright-core/index.mjs',import.meta.url).href);
import {mkdirSync,writeFileSync,copyFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {plan} from '../game/combat.js';
const evidence=resolve(process.env.BRASS_EVIDENCE||'../browser-drill');mkdirSync(evidence,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
const errors=[],requests=[],observations=[],actions=[],start=Date.now();
page.setDefaultTimeout(6000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('request',r=>requests.push(r.url()));
const snap=()=>page.evaluate(()=>window.brassTide.snapshot());
const record=async label=>{const s=await snap();observations.push({label,wallMs:Date.now()-start,snapshot:s});console.log(label,JSON.stringify({elapsed:s.elapsed,phase:s.phase,player:s.actors[0],bomb:s.bomb,reason:s.reason}));return s;};
async function shot(name){await page.screenshot({path:resolve('screenshots',name),type:'jpeg',quality:82});copyFileSync(resolve('screenshots',name),resolve(evidence,name));await record(name);}
let success=false;
try{
 await page.goto('http://127.0.0.1:8097');await page.waitForFunction(()=>window.brassTide);
 assert.equal(await page.locator('#school').count(),1,'publicly discoverable objective practice');
 await page.click('#school');assert.equal((await snap()).mode,'drill');
 await page.waitForFunction(()=>window.brassTide.snapshot().phase==='live',{}, {timeout:20000});
 await record('before-route');const deadline=Date.now()+25000;
 await page.keyboard.down('KeyW');actions.push('W down / walk to B');
 while(Date.now()<deadline){const s=await snap(),p=s.actors[0];if(Math.hypot(p.x-13,p.z+5)<1)break;
  const path=plan(p,13,-5);assert.ok(path.length,'site reachable');const [x,z]=path[0];
  await page.evaluate(({yaw})=>window.brassTide.look(yaw,0),{yaw:Math.atan2(-(x-p.x),-(z-p.z))});
  await page.waitForTimeout(80);
 }
 await page.keyboard.up('KeyW');actions.push('W up');await page.waitForTimeout(400);
 let s=await record('at-site');assert.ok(Math.hypot(s.actors[0].x-13,s.actors[0].z+5)<2.2,'walked to real B site');
 await page.evaluate(()=>window.brassTide.look(0,-.35));
 await page.keyboard.down('KeyE');actions.push('E down / interrupted plant');await page.waitForTimeout(1400);
 s=await record('partial-plant');assert.ok(s.actors[0].progress>1);assert.equal(s.bomb.planted,false);
 await page.keyboard.up('KeyE');await page.waitForTimeout(180);assert.equal((await snap()).actors[0].progress,0);
 await page.keyboard.down('KeyE');actions.push('E down / full plant');await page.waitForFunction(()=>window.brassTide.snapshot().bomb.planted,{}, {timeout:5000});
 await page.keyboard.up('KeyE');s=await record('planted');assert.equal(s.bomb.site,'B');assert.equal(s.actors[0].team,1);assert.equal(s.worldCharge.visible,true);
 assert.ok(Math.abs(s.worldCharge.x-s.bomb.x)<.001);assert.match(await page.locator('#phase').innerText(),/FIELD SCHOOL/);
 await page.keyboard.down('KeyS');actions.push('S down / inspect planted charge');await page.waitForTimeout(280);await page.keyboard.up('KeyS');await page.waitForTimeout(300);
 await page.evaluate(()=>window.brassTide.look(0,-1.05));
 await shot('02-field-school-plant.jpg');
 await page.keyboard.down('KeyE');actions.push('E down / interrupted defuse');await page.waitForTimeout(1600);s=await record('partial-defuse');assert.ok(s.actors[0].progress>1);
 await shot('03-field-school-defuse.jpg');await page.keyboard.up('KeyE');await page.waitForTimeout(180);assert.equal((await snap()).actors[0].progress,0);
 await page.keyboard.down('KeyE');actions.push('E down / full defuse');await page.waitForFunction(()=>window.brassTide.snapshot().reason==='Charge defused',{}, {timeout:6500});await page.keyboard.up('KeyE');
 s=await record('defused');assert.equal(s.phase,'match');assert.equal(s.history[0].reason,'Charge defused');assert.equal(s.actors[0].kills,0);
 assert.equal(errors.length,0,errors.join(';'));assert.equal(requests.filter(u=>!u.startsWith('http://127.0.0.1:8097/')).length,0);assert.equal(s.webgl,true);success=true;
 console.log('PASS FIELD SCHOOL',JSON.stringify({success,wallSeconds:(Date.now()-start)/1000,errors,requests:requests.length}));
}finally{writeFileSync(resolve(evidence,'report.json'),JSON.stringify({success,kind:'public solo onboarding, not match win',wallMs:Date.now()-start,errors,requests,actions,observations},null,2));await browser.close();}
