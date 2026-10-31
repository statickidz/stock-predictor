import {chromium} from 'playwright';import assert from 'node:assert/strict';
const b=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge'});
try{for(const width of [1366,1024,768,390,320]){
const p=await b.newPage({viewport:{width,height:768},colorScheme:'light'});await p.goto(process.env.SMOKE_URL||'http://127.0.0.1:4322');await p.locator('.asset-option').first().waitFor();
assert.equal(await p.locator('.project-link').getAttribute('href'),'https://github.com/statickidz/stock-predictor');assert.equal(await p.locator('a[href*="shiyu-coder"]').count(),0);
for(const name of ['About','How it works']){await p.getByRole('button',{name,exact:true}).click();assert.equal(await p.locator('dialog[open]').count(),1);await p.keyboard.press('Escape');assert.equal(await p.locator('dialog[open]').count(),0);assert.equal(await p.getByRole('button',{name,exact:true}).evaluate(e=>e===document.activeElement),true);}
await p.selectOption('#theme-select','dark');await p.reload();await p.locator('.asset-option').first().waitFor();await p.waitForFunction(()=>getComputedStyle(document.documentElement).colorScheme==='dark');assert.equal(await p.locator('#theme-select').inputValue(),'dark');
assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
await p.screenshot({path:`artifacts/ui-rebuild/nav-${width}.png`,fullPage:true});await p.getByRole('button',{name:'How it works',exact:true}).click();await p.screenshot({path:`artifacts/ui-rebuild/dialog-${width}.png`});await p.getByRole('button',{name:'Close How it works'}).click();await p.selectOption('#theme-select','light');await p.waitForFunction(()=>getComputedStyle(document.documentElement).colorScheme==='light');await p.close();console.log(`${width}: dialogs, theme persistence and overflow passed`);
}}finally{await b.close()}
