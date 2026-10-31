// Run against the built Astro artifact: BASE_PATH=/stock-predictor/ pnpm preview.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';

const base = process.env.SMOKE_URL || 'http://127.0.0.1:4321/';
const browser = await chromium.launch({headless:true, ...(process.env.BROWSER_CHANNEL ? {channel:process.env.BROWSER_CHANNEL} : {})});
try {
  await mkdir('artifacts',{recursive:true});
  // The workflow starts a local server immediately before this process.
  for (let attempt=0; attempt<30; attempt++) {
    try { if((await fetch(base)).ok)break; } catch { /* Server still starting. */ }
    await new Promise(resolve=>setTimeout(resolve,200));
  }
  const page = await browser.newPage({acceptDownloads:true});
  const errors = [];
  const prematureDownloads = [];
  let forecastingStarted = false;
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    const path = new URL(request.url()).pathname;
    assert.ok(!/(^|\/)api(?:\/|$)/.test(path), 'Unexpected backend dependency');
    if (!forecastingStarted && /\/(models|runtime)\//.test(path)) prematureDownloads.push(path);
    if (/\/(data|models|runtime)\//.test(path)) {
      assert.ok(path.startsWith(new URL(base).pathname), `Public asset escaped deployment base: ${path}`);
    }
  });
  await page.route('**/data/history/*.json',async route=>{
    await new Promise(resolve=>setTimeout(resolve,600));
    await route.continue();
  });
  let loading=page.waitForRequest(request=>request.url().includes('/data/history/'));
  await page.goto(base);
  await loading;
  await page.waitForFunction(() => document.querySelector('meta[name="inference-worker"]')?.content);
  const workerUrl = await page.locator('meta[name="inference-worker"]').getAttribute('content');
  assert.ok(new URL(workerUrl, base).pathname.startsWith(new URL(base).pathname), 'Worker must use the deployment base');

  await page.selectOption('#runtime-select','wasm');
  await page.waitForFunction(() => !document.querySelector('#generate-button').disabled,{}, {timeout:5000});
  loading=page.waitForRequest(request=>request.url().includes('/data/history/'));
  await page.reload();await loading;
  await page.click('.local-data summary');await page.click('#clear-cache');
  await page.waitForFunction(() => !document.querySelector('#generate-button').disabled,{}, {timeout:5000});
  loading=page.waitForRequest(request=>request.url().includes('/data/history/'));
  await page.reload();await loading;
  await page.setInputFiles('#import-history',{name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{}')});
  await page.waitForFunction(() => !document.querySelector('#generate-button').disabled,{}, {timeout:5000});
  await page.unroute('**/data/history/*.json');
  await page.click('[data-horizon="10"]');
  console.log('Loading lifecycle: runtime change, cache clear, failed import passed');
  assert.equal(await page.locator('#model-select option').count(), 3);
  assert.deepEqual(prematureDownloads, [], 'Model graphs and runtime must load only when inference starts');
  forecastingStarted = true;
  for (const key of ['mini','small','base']) {
    const result = await page.evaluate(async ({key, gpu, workerUrl}) => {
      const profiles = await (await fetch('./data/models.json')).json();
      const model = profiles.models.find(m => m.key === key);
      const input = await (await fetch(`./models/${key}/fixture.json`)).json();
      return new Promise((resolve,reject) => {
        const worker = new Worker(workerUrl, {type:'module'});
        const timeout = setTimeout(()=>{worker.terminate();reject(Error('Worker timeout'));},180000);
        worker.onerror = e => {clearTimeout(timeout);worker.terminate();reject(Error(e.message));};
        worker.onmessage = ({data}) => {
          if (data.type === 'status') return;
          clearTimeout(timeout); worker.terminate();
          data.type === 'error' ? reject(Error(data.message)) : resolve(data);
        };
        worker.postMessage({requestId:1,input,model,provider:gpu?'webgpu':'wasm',parity:true});
      });
    }, {key, gpu:process.env.SMOKE_WEBGPU === '1', workerUrl});
    assert.ok(result.maxError < .01);
    console.log(`${key}: parity passed; error $${result.maxError.toFixed(6)}; inference ${(result.inferenceMs/1000).toFixed(2)}s`);
  }
  await page.click('[data-horizon="20"]');
  await page.click('#generate-button');
  await page.waitForFunction(()=>!document.querySelector('#generate-button').disabled, {}, {timeout:180000});
  assert.equal(await page.locator('#forecast-rows tr').count(),20);
  assert.match(await page.locator('#forecast-provenance').innerText(), /browser wasm/);
  const download = page.waitForEvent('download');
  await page.click('#download-csv');
  assert.match((await download).suggestedFilename(), /mini.*\.csv$/);
  await page.click('#generate-button');
  await page.click('#cancel-button');
  assert.equal(await page.locator('#forecast-results').isVisible(),false);
  await page.click('#generate-button');
  await page.selectOption('#model-select','small');
  assert.equal(await page.locator('#generate-button').isDisabled(),false);
  assert.equal(await page.locator('#forecast-results').isVisible(),false);
  await page.click('.local-data summary');
  await page.click('#clear-cache');
  await page.waitForFunction(()=>document.querySelector('#job-status').textContent.includes('cache cleared'));
  assert.match(await page.locator('#job-status').innerText(),/cache cleared/);
  await page.setInputFiles('#import-history', {name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{}')});
  await page.waitForFunction(()=>!document.querySelector('#error-panel').hidden);
  assert.match(await page.locator('#error-message').innerText(),/64/);
  const catalog = await (await fetch(new URL('data/assets.json',base))).json();
  const available = catalog.assets.find(a=>a.available);
  const history = await (await fetch(new URL(`data/history/${encodeURIComponent(available.symbol)}.json`,base))).json();
  await page.selectOption('#model-select','mini');
  await page.setInputFiles('#import-history',{name:'history.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...history,label:'Imported research',kind:available.kind}))});
  await page.waitForFunction(()=>document.querySelector('#asset-name').textContent.includes('Imported research'));
  await page.click('[data-horizon="5"]');
  await page.click('#generate-button');
  await page.waitForFunction(()=>!document.querySelector('#generate-button').disabled,{}, {timeout:120000});
  assert.equal(await page.locator('#forecast-rows tr').count(),5);
  assert.match(await page.locator('#forecast-provenance').innerText(),/Local JSON import/);
  await page.screenshot({path:'artifacts/pages-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:'artifacts/pages-mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);
  console.log('UI: 20-day forecast, CSV, cancellation, model change, cache clear, invalid import, mobile width passed');
} finally {
  await browser.close();
}
