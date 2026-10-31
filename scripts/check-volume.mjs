import {chromium} from 'playwright';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const b=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge'});
try{const p=await b.newPage({viewport:{width:1310,height:956},colorScheme:'dark',acceptDownloads:true});await p.goto(process.env.SMOKE_URL||'http://127.0.0.1:4322');await p.waitForFunction(()=>!document.querySelector('#generate-button').disabled);await p.click('[data-horizon="5"]');await p.click('#generate-button');await p.waitForFunction(()=>!document.querySelector('#forecast-results').hidden,{}, {timeout:180000});
assert.equal(await p.locator('.volume-bar.projected').count(),5);assert.equal(await p.locator('#forecast-results th').count(),4);assert.equal(await p.locator('#forecast-rows tr').count(),5);
const volumes=await p.locator('#forecast-rows tr td:last-child').allTextContents();assert.ok(volumes.every(v=>Number.isFinite(Number(v.replaceAll(',','')))&&Number(v.replaceAll(',',''))>=0));
await p.locator('#chart-wrap').focus();await p.keyboard.press('ArrowRight');assert.match(await p.locator('#chart-tooltip').innerText(),/Volume/);await p.keyboard.press('Escape');
const downloading=p.waitForEvent('download');await p.click('#download-csv');const download=await downloading;const csv=await readFile(await download.path(),'utf8');assert.match(csv,/projected_volume/);assert.equal(csv.trim().split('\n').length,6);
await p.evaluate(()=>document.querySelector('.analysis-workspace').scrollTop=0);
}finally{await b.close()}
