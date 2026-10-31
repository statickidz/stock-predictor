import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const b=await chromium.launch({channel:process.env.BROWSER_CHANNEL || 'msedge'});
try{const p=await b.newPage({viewport:{width:1366,height:768},colorScheme:'dark'});const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto(process.env.SMOKE_URL || 'http://127.0.0.1:4322');await p.locator('.asset-option').first().waitFor();
assert.equal(await p.evaluate(()=>getComputedStyle(document.documentElement).colorScheme),'light');
await p.getByRole('button',{name:'Dark mode',exact:true}).click();
await p.click('#filter-crypto');await p.fill('#asset-search','BTC');await p.getByRole('button',{name:/BTC-USD/}).click();
await p.click('[data-horizon="20"]');await p.selectOption('#model-select','small');await p.click('[data-range="12"]');
await p.reload();await p.locator('.asset-option').first().waitFor();
assert.match(await p.locator('#asset-name').innerText(),/BTC-USD/);assert.equal(await p.locator('#filter-crypto').getAttribute('aria-pressed'),'true');assert.equal(await p.locator('[data-horizon="20"]').getAttribute('aria-pressed'),'true');assert.equal(await p.locator('[data-range="12"]').getAttribute('aria-pressed'),'true');assert.equal(await p.locator('#model-select').inputValue(),'small');
assert.equal(await p.evaluate(()=>getComputedStyle(document.documentElement).colorScheme),'dark');
await p.waitForFunction(()=>!document.querySelector('#generate-button').disabled);
await p.evaluate(()=>document.querySelector('.sidebar-scroll').scrollTop=0);await p.screenshot({path:'artifacts/ui-rebuild/dark-desktop.png'});
await p.setViewportSize({width:390,height:844});await p.screenshot({path:'artifacts/ui-rebuild/dark-mobile.png',fullPage:true});
await p.emulateMedia({colorScheme:'light'});assert.equal(await p.evaluate(()=>getComputedStyle(document.documentElement).colorScheme),'dark');
await p.getByRole('button',{name:'Dark mode',exact:true}).click();assert.equal(await p.evaluate(()=>getComputedStyle(document.documentElement).colorScheme),'light');assert.deepEqual(errors,[]);
console.log('System appearance switching and preference reload passed');
}finally{await b.close()}
