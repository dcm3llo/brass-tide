// Real-time match verification. Only keyboard, mouse and the public look input.
// Snapshot data is read-only. No actor, clock, damage or objective injection.
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??new URL('../../browser-tools/node_modules/playwright-core/index.mjs',import.meta.url).href);
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {plan,blocked} from '../game/combat.js';
const evidence=resolve(process.env.BRASS_EVIDENCE||'../browser-match');mkdirSync(evidence,{recursive:true});
const requiredPlant=process.argv[2]!=='combat',mode=process.argv[2]==='combat'?'attack':process.argv[2]||'attack',started=Date.now(),actions=[],observed=[],errors=[],requests=[];
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('request',r=>requests.push(r.url()));
const snap=()=>page.evaluate(()=>window.brassTide.snapshot());
const log=(action,data={})=>{actions.push({wallMs:Date.now()-started,action,...data});console.log(action,JSON.stringify(data));};
let held=false,firing=false,planted=false,defused=false,actionShot=false,plantShot=false,defuseShot=false,lastObservation=0,success=false,playerPlant=false,waypoint=0,lastRound=1;
const flank=[[15,15],[15,0],[13,-5]];
async function key(down){if(down!==held){await page.keyboard[down?'down':'up']('KeyW');held=down;log(down?'forward':'stop');}}
async function shoot(down){if(down!==firing){await page.mouse[down?'down':'up']();firing=down;log(down?'fire':'cease');}}
async function look(x,z,height=1.62){const p=(await snap()).actors[0];await page.evaluate(({yaw,pitch})=>window.brassTide.look(yaw,pitch),{yaw:Math.atan2(-(x-p.x),-(z-p.z)),pitch:Math.atan2(height-(p.crouch?1.08:1.62),Math.hypot(x-p.x,z-p.z))});}
async function shot(name){
 if(name==='04-round-ledger.jpg'){
  await page.waitForSelector('#roster:not(.hidden)');
  const a=await page.locator('#announce').boundingBox(),r=await page.locator('#roster').boundingBox();
  assert.ok(a.y+a.height<=r.y,'round banner must not overlap scoreboard');
 }
 await page.screenshot({path:resolve('screenshots',name),type:'jpeg',quality:82});writeFileSync(resolve(evidence,name+'.json'),JSON.stringify(await snap(),null,2));log('screenshot',{name});
}
try{
 await page.goto('http://127.0.0.1:8097');await page.waitForFunction(()=>window.brassTide);
 await page.click(mode==='attack'?'#deploy':'#defend');log('deploy',{mode});
 await page.keyboard.press('KeyB');await page.click('[data-buy="armor"]');await page.click('#closeBuy');
 if(mode==='attack')await page.keyboard.press('Digit1');
 await page.waitForFunction(()=>window.brassTide.snapshot().phase==='live',{}, {timeout:20000});
 const end=Date.now()+120000;
 while(Date.now()<end){
  const s=await snap(),p=s.actors[0];
  if(!requiredPlant)waypoint=2;else if(s.round!==lastRound){waypoint=0;lastRound=s.round;}
  if(mode==='attack'&&p.progress>1&&s.bomb.carrier===0)playerPlant=true;
  if(Date.now()-lastObservation>800){observed.push(s);lastObservation=Date.now();}
  planted ||= s.bomb.planted;
  if(s.reason==='Charge defused'&&s.actors[0].team===1){defused=true;}
  if((mode==='attack'&&s.phase==='over'&&(requiredPlant?planted&&playerPlant:p.kills>0))||(mode==='defense'&&defused)){
   await key(false);await shoot(false);await shot(mode==='attack'?'04-round-ledger.jpg':'03-defused-ledger.jpg');success=true;log('RESULT',{reason:s.reason,score:s.score,bomb:s.bomb});break;
  }
  if(p.hp<=0||s.phase!=='live'){
   await key(false);await shoot(false);await page.keyboard.up('KeyE');
   if(s.phase==='match')break;
   await page.waitForTimeout(120);continue;
  }
  if(mode==='attack'&&s.bomb.planted){
   await key(false);await shoot(false);await page.keyboard.up('KeyE');
   if(!plantShot){await look(s.bomb.x,s.bomb.z,.2);await shot('02-charge-armed.jpg');plantShot=true;}
   // Defend the real charge with aimed bursts when enemies approach.
  }
  const enemies=s.actors.filter(a=>a.team!==p.team&&a.hp>0&&!blocked(p.x,p.z,a.x,a.z,a.crouch?1.08:1.62)).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z));
  const enemy=enemies[0],distance=enemy?Math.hypot(enemy.x-p.x,enemy.z-p.z):Infinity;
  const fight=enemy&&distance<(!requiredPlant?25:mode==='attack'?10:23)&&(mode==='attack'||s.bomb.planted||(distance<8&&enemy.id!==s.bomb.carrier));
  if(fight){
   await key(false);await page.keyboard.up('KeyE');await look(enemy.x,enemy.z,enemy.crouch?1.05:1.62);
   if(p.ammo===0){await shoot(false);await page.keyboard.press('KeyR');}else{await shoot(true);}
   if(!actionShot&&mode==='attack'&&p.ammo<23){await shot('01-channel-contact.jpg');actionShot=true;}
  }else{
   await shoot(false);
   if(mode==='attack'&&!s.bomb.planted){
    if(waypoint<2&&Math.hypot(p.x-flank[waypoint][0],p.z-flank[waypoint][1])<.65)waypoint++;
    const target=s.bomb.dropped?{x:s.bomb.x,z:s.bomb.z}:{x:flank[waypoint][0],z:flank[waypoint][1]};
    if(waypoint===2&&Math.hypot(p.x-target.x,p.z-target.z)<1.2){await key(false);await page.keyboard.down('KeyE');log('hold-plant',{progress:p.progress,hp:p.hp});}
    else{await page.keyboard.up('KeyE');const path=plan(p,target.x,target.z);assert.ok(path.length,'reachable live approach');await look(...path[0]);await key(true);}
   }else if(mode==='defense'&&s.bomb.planted){
    if(Math.hypot(p.x-s.bomb.x,p.z-s.bomb.z)<1.45){
     await key(false);await look(s.bomb.x,s.bomb.z,.2);await page.keyboard.down('KeyE');
     if(p.progress>1&&!defuseShot){await shot('03-defuse-in-progress.jpg');defuseShot=true;}log('hold-defuse',{progress:p.progress,hp:p.hp});
    }else{await page.keyboard.up('KeyE');const path=plan(p,s.bomb.x,s.bomb.z);assert.ok(path.length,'reachable retake');await look(...path[0]);await key(true);}
   }else if(mode==='defense'){
    // Stay alive behind west cover until an actual plant; do not shoot attackers prematurely.
    const target={x:0,z:-20};if(Math.hypot(p.x-target.x,p.z-target.z)>.6){const path=plan(p,target.x,target.z);assert.ok(path.length,'defender cover reachable');await look(...path[0]);await key(true);}else await key(false);
   }else await key(false);
  }
  await page.waitForTimeout(120);
 }
 const final=await snap();observed.push(final);
 assert.equal(errors.length,0,errors.join(';'));assert.equal(requests.filter(u=>!u.startsWith('http://127.0.0.1:8097/')).length,0);
 assert.equal(final.webgl,true);assert.equal(success,true,JSON.stringify({mode,planted,defused,phase:final.phase,reason:final.reason}));
 if(mode==='defense')assert.equal(defuseShot,true,'human defuse progress actually observed');
 console.log('PASS',JSON.stringify({mode,planted,defused,wallSeconds:(Date.now()-started)/1000}));
}finally{
 writeFileSync(resolve(evidence,'report.json'),JSON.stringify({mode,success,planted,defused,wallMs:Date.now()-started,errors,requests,actions,observed},null,2));
 await browser.close();
}
