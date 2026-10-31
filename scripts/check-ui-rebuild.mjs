import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
await mkdir('artifacts/ui-rebuild',{recursive:true});
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL || 'msedge'});
try {
for(const [width,height] of [[1366,768],[1024,600],[768,800],[390,844],[320,640]]){
const page=await browser.newPage({viewport:{width,height}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(process.env.SMOKE_URL || 'http://127.0.0.1:4321');await page.locator('.asset-option').first().waitFor();
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`overflow ${width}`);
await page.fill('#asset-search','Microsoft');await page.getByRole('button',{name:/MSFT/}).click();
await page.click('[data-horizon="20"]');assert.equal(await page.locator('[data-horizon="20"]').getAttribute('aria-pressed'),'true');
await page.selectOption('#model-select','small');await page.click('[popovertarget="preferences-menu"]');await page.selectOption('#runtime-select','wasm');await page.keyboard.press('Escape');await page.click('.local-data summary');
assert.equal(await page.locator('#import-history').isVisible(),true);
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`expanded overflow ${width}`);
await page.click('.local-data summary');await page.fill('#asset-search','');
await page.evaluate(()=>{document.querySelector('.sidebar-scroll').scrollTop=0});
if(width>900){assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight>innerHeight),false,'desktop shell overflows vertically');const box=await page.locator('#generate-button').boundingBox();assert.ok(box.y+box.height<=height,'Generate stays visible');}
await page.waitForTimeout(150);
await page.screenshot({path:`artifacts/ui-rebuild/${width}.png`,fullPage:true});assert.deepEqual(errors,[]);await page.close();console.log(`${width}x${height}: controls and overflow passed`);
}
}finally{await browser.close()}
