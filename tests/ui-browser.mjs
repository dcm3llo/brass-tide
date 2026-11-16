const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??new URL('../../browser-tools/node_modules/playwright-core/index.mjs',import.meta.url).href);
import assert from 'node:assert/strict';
const base=process.env.BRASS_BASE_URL??'http://127.0.0.1:8097';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
const errors=[];const remote=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
page.on('request',r=>{if(!r.url().startsWith(base+'/'))remote.push(r.url());});
try{
 await page.goto(base);await page.waitForFunction(()=>window.brassTide);
 assert.equal(await page.locator('#defend').count(),1,'defender is a real selectable mode');
 await page.click('#defend');await page.waitForTimeout(250);
 const s=await page.evaluate(()=>window.brassTide.snapshot());assert.equal(s.actors[0].team,1);assert.ok(s.actors[0].z<0);
 assert.match(await page.locator('#objectiveText').innerText(),/DEFEND|Defend/);
 await page.keyboard.press('KeyB');await page.click('[data-buy="armor"]');
 assert.equal((await page.evaluate(()=>window.brassTide.snapshot())).actors[0].armor,100);
 await page.click('#closeBuy');await page.keyboard.down('Tab');await page.waitForTimeout(250);
 assert.equal(await page.locator('#roster tbody tr').count(),6);assert.equal(await page.locator('#roster').isVisible(),true);
 assert.match(await page.locator('#roster').innerText(),/KILLS/);await page.keyboard.up('Tab');
 assert.equal(s.worldSites?.length,2,'two rendered world site rings');
 assert.equal(s.worldSites[1].x,13);assert.equal(s.worldSites[1].z,-5);
 assert.equal(s.worldTeams[1],1,'defense allies render in their actual team color');
 assert.equal(s.webgl,true);assert.ok(s.drawCalls>0);assert.equal(errors.length,0,errors.join(';'));assert.equal(remote.length,0);
 console.log(JSON.stringify({passed:true,webgl:s.webgl,drawCalls:s.drawCalls,errors,remote}));
}finally{await browser.close();}
