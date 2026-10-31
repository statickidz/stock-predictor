import {chromium} from 'playwright';import assert from 'node:assert/strict';
const b=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge'});
try{for(const width of [1310,1024,758,390,320]){
const p=await b.newPage({viewport:{width,height:935},colorScheme:'dark'});await p.goto(process.env.SMOKE_URL||'http://127.0.0.1:4322');await p.waitForFunction(()=>!document.querySelector('#generate-button').disabled);
assert.equal(await p.evaluate(()=>getComputedStyle(document.documentElement).colorScheme),'light','fresh visits default light even with a dark OS');
assert.equal(await p.locator('.forecast-panel #runtime-select').count(),1);
assert.equal(await p.locator('[data-range="3"]').getAttribute('aria-pressed'),'true');
assert.equal(await p.locator('.kronos-link').getAttribute('href'),'https://github.com/shiyu-coder/Kronos');
assert.equal(await p.locator('.kronos-link').getAttribute('target'),'_blank');
assert.equal(await p.locator('.forecast-run #connection-label').count(),1);
assert.equal(await p.locator('input[type=file]').count(),0);
await p.getByRole('button',{name:'Settings',exact:true}).click();
await p.getByRole('button',{name:'Remove downloaded models',exact:true}).click();
await p.waitForFunction(()=>document.querySelector('#storage-status').textContent.includes('removed'));
assert.equal(await p.locator('#settings-menu').evaluate(e=>e.matches(':popover-open')),true);
await p.screenshot({path:`artifacts/ui-rebuild/settings-${width}.png`});
await p.keyboard.press('Escape');
await p.selectOption('#runtime-select','wasm');
assert.equal(await p.locator('.project-link').getAttribute('href'),'https://github.com/statickidz/stock-predictor');assert.equal(await p.locator('#asset-mark').innerText(),'AAPL');
for(const name of ['About this project','How it works','Disclaimer']){await p.getByRole('button',{name:'Help',exact:true}).click();await p.getByRole('button',{name,exact:true}).click();assert.equal(await p.locator('dialog[open]').count(),1);await p.keyboard.press('Escape');assert.equal(await p.locator('dialog[open]').count(),0);assert.equal(await p.getByRole('button',{name:'Help',exact:true}).evaluate(e=>e===document.activeElement),true);}
await p.getByRole('button',{name:'Dark mode',exact:true}).click();await p.reload();await p.waitForFunction(()=>!document.querySelector('#generate-button').disabled);await p.waitForFunction(()=>getComputedStyle(document.documentElement).colorScheme==='dark');assert.equal(await p.locator('.appearance-trigger').getAttribute('aria-pressed'),'true');
assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal((await p.locator('header').boundingBox()).height,64);
await p.screenshot({path:`artifacts/ui-rebuild/nav-${width}.png`,fullPage:true});await p.getByRole('button',{name:'Dark mode',exact:true}).focus();await p.keyboard.press('Space');await p.waitForFunction(()=>getComputedStyle(document.documentElement).colorScheme==='light');await p.keyboard.press('Escape');await p.waitForTimeout(200);await p.screenshot({path:`artifacts/ui-rebuild/light-${width}.png`,fullPage:true});await p.close();console.log(`${width}: popovers, dialogs, theme persistence, ticker and overflow passed`);
}}finally{await b.close()}
