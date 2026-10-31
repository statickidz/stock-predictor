import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge'});
const base=process.env.SMOKE_URL||'http://127.0.0.1:4322';
async function inside(page){const tip=await page.locator('#chart-tooltip').boundingBox(),chart=await page.locator('#chart-wrap').boundingBox();assert.ok(tip.x>=chart.x&&tip.x+tip.width<=chart.x+chart.width+1);assert.ok(tip.y>=chart.y&&tip.y+tip.height<=chart.y+chart.height+1);assert.equal(await page.locator('.chart-crosshair').getAttribute('visibility'),'visible')}
try{
 const page=await browser.newPage({viewport:{width:1310,height:956},colorScheme:'dark'});await page.goto(base);await page.waitForFunction(()=>!document.querySelector('#generate-button').disabled);const chart=page.locator('#chart-wrap');let box=await chart.boundingBox();
 for(const fraction of [.02,.5,.98]){await page.mouse.move(box.x+box.width*fraction,box.y+box.height*.4);await inside(page);assert.match(await page.locator('#chart-tooltip').innerText(),/USD.*\nVolume/s)}
 await page.screenshot({path:'artifacts/ui-rebuild/crosshair-desktop.png'});await page.mouse.move(0,0);assert.equal(await page.locator('#chart-tooltip').isVisible(),false);
 await chart.focus();await page.keyboard.press('End');await inside(page);const end=await page.locator('.chart-crosshair').getAttribute('x1');await page.keyboard.press('ArrowLeft');assert.ok(Number(await page.locator('.chart-crosshair').getAttribute('x1'))<Number(end));assert.match(await page.locator('[data-chart-announcement]').innerText(),/USD/);await page.keyboard.press('Escape');assert.equal(await page.locator('.chart-crosshair').getAttribute('visibility'),'hidden');
 await page.click('[data-horizon="5"]');await page.click('#generate-button');await page.waitForFunction(()=>!document.querySelector('#forecast-results').hidden,{}, {timeout:180000});await chart.focus();await page.keyboard.press('End');await inside(page);assert.match(await page.locator('#chart-tooltip').innerText(),/Projected volume/);await page.close();
 for(const width of [390,320]){
 const p=await browser.newPage({viewport:{width,height:844},hasTouch:true,isMobile:true,colorScheme:'dark'});await p.goto(base);await p.waitForFunction(()=>!document.querySelector('#generate-button').disabled);await p.locator('#chart-wrap').scrollIntoViewIfNeeded();box=await p.locator('#chart-wrap').boundingBox();
 await p.touchscreen.tap(box.x+box.width*.5,box.y+box.height*.5);await inside(p);const selected=await p.locator('.chart-crosshair').getAttribute('x1');
 const cdp=await p.context().newCDPSession(p);const y=box.y+box.height*.5;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width*.3,y}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width*.7,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await inside(p);assert.notEqual(await p.locator('.chart-crosshair').getAttribute('x1'),selected);
 await p.screenshot({path:`artifacts/ui-rebuild/crosshair-mobile-${width}.png`});
 const before=await p.evaluate(()=>scrollY);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width*.5,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width*.5,y:y+180}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(200);assert.ok(await p.evaluate(()=>scrollY)<before,'vertical swiping still scrolls');assert.equal(await p.locator('#chart-tooltip').isVisible(),false);await p.close();
 }
 console.log('Crosshair passed: desktop edges, keyboard, forecast values, mobile tap/drag persistence, vertical scroll');
}finally{await browser.close()}
