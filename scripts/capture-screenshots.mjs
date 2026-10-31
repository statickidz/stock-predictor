// Capture real browser-generated forecasts for README images; no demo data.
import {chromium} from 'playwright';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
try{
  let page=await browser.newPage({viewport:{width:1920,height:1440},colorScheme:'light'});
  await page.goto(process.env.SMOKE_URL||'http://127.0.0.1:4321/');
  await page.waitForFunction(()=>!document.querySelector('#generate-button').disabled);
  await page.fill('#asset-search','NVDA');
  await page.locator('.asset-option').filter({hasText:'NVDA'}).click();
  await page.waitForFunction(()=>!document.querySelector('#generate-button').disabled);
  await page.fill('#asset-search','');
  await page.click('[data-horizon="20"]');
  const forecast=async()=>{
    await page.click('#generate-button');
    await page.waitForFunction(()=>!document.querySelector('#generate-button').disabled,{}, {timeout:180000});
    if(await page.locator('#error-panel').isVisible())throw Error(await page.locator('#error-message').innerText());
    await page.mouse.move(0,0);
  };
  const target=name=>fileURLToPath(new URL(`../docs/images/${name}.jpg`,import.meta.url));
  await forecast();
  assert.match(await page.locator('#asset-name').innerText(), /NVIDIA/);
  assert.equal(await page.locator('.sidebar-scroll').evaluate(el=>el.scrollHeight>el.clientHeight),false,'Desktop capture must show all sidebar controls without scrolling');
  await page.screenshot({path:target('forecast-desktop'),type:'jpeg',quality:88,animations:'disabled'});
  await page.click('#filter-crypto');
  await page.waitForFunction(()=>!document.querySelector('#generate-button').disabled);
  await forecast();
  await page.screenshot({path:target('forecast-crypto'),type:'jpeg',quality:88,animations:'disabled'});
  // A separate touch context keeps mobile media queries active during tall element captures.
  await page.close();
  page=await browser.newPage({viewport:{width:390,height:1600},hasTouch:true,isMobile:true,colorScheme:'light'});
  await page.goto(process.env.SMOKE_URL||'http://127.0.0.1:4321/');
  await page.waitForFunction(()=>!document.querySelector('#generate-button').disabled);
  await page.click('#filter-crypto');
  await page.waitForFunction(()=>!document.querySelector('#generate-button').disabled);
  await page.click('[data-horizon="20"]');
  await forecast();
  await page.locator('.forecast-panel').screenshot({path:target('mobile-controls'),type:'jpeg',quality:88,animations:'disabled'});
  await page.locator('.chart-panel').screenshot({path:target('mobile-forecast'),type:'jpeg',quality:88,animations:'disabled'});
  console.log('README screenshots captured from real Astro browser forecasts.');
}finally{await browser.close();}
