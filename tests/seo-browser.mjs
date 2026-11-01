import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const preview = new URL(process.env.SMOKE_URL || 'http://127.0.0.1:4321/');
const production = process.env.SITE_URL ? new URL(preview.pathname, process.env.SITE_URL).href : undefined;
const imagePath = `${preview.pathname}social-preview.png`;
const expectedImage = production ? `${production}social-preview.png` : imagePath;
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_CHANNEL ? {channel: process.env.BROWSER_CHANNEL} : {})});
try {
  // Pages starts its preview immediately before this check.
  for (let attempt = 0; attempt < 30; attempt++) {
    try { if ((await fetch(preview, {signal: AbortSignal.timeout(1000)})).ok) break; } catch { /* Server still starting. */ }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  // Social crawlers must receive everything in the original static document.
  const page = await browser.newPage({javaScriptEnabled: false});
  const response = await page.goto(`${preview.href}?symbol=BTC-USD#forecast`);
  assert.equal(response.status(), 200);
  assert.equal(await page.locator('title').count(), 1);
  assert.match(await page.title(), /AI Stock Prediction.*Stock Predictor/);
  const meta = async selector => {
    const locator = page.locator(selector);
    assert.equal(await locator.count(), 1, selector);
    return locator.getAttribute('content');
  };
  const title = await page.title();
  const description = await meta('meta[name="description"]');
  assert.match(description, /daily market snapshots/);
  assert.equal(await meta('meta[property="og:title"]'), title);
  assert.equal(await meta('meta[property="og:description"]'), description);
  assert.equal(await meta('meta[property="og:type"]'), 'website');
  assert.equal(await meta('meta[property="og:site_name"]'), 'Stock Predictor');
  assert.equal(await meta('meta[property="og:image"]'), expectedImage);
  assert.equal(await meta('meta[property="og:image:type"]'), 'image/png');
  assert.equal(await meta('meta[property="og:image:width"]'), '1200');
  assert.equal(await meta('meta[property="og:image:height"]'), '630');
  assert.match(await meta('meta[property="og:image:alt"]'), /Stock Predictor/);
  assert.equal(await meta('meta[name="twitter:card"]'), 'summary_large_image');
  assert.equal(await meta('meta[name="twitter:title"]'), title);
  assert.equal(await meta('meta[name="twitter:description"]'), description);
  assert.equal(await meta('meta[name="twitter:image"]'), expectedImage);
  assert.match(await meta('meta[name="twitter:image:alt"]'), /Stock Predictor/);
  assert.equal(await meta('meta[name="robots"]'), 'index, follow, max-image-preview:large');

  const robots = await page.request.get(new URL('robots.txt', preview).href);
  const sitemap = await page.request.get(new URL('sitemap.xml', preview).href);
  assert.equal(robots.status(), 200);
  assert.equal(sitemap.status(), 200);
  assert.match(robots.headers()['content-type'], /text\/plain/);
  assert.match(sitemap.headers()['content-type'], /(?:application|text)\/xml/);
  const sitemapText = await sitemap.text();
  const locations = await page.evaluate(xml => {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('Invalid sitemap XML');
    return Array.from(doc.querySelectorAll('loc'), node => node.textContent);
  }, sitemapText);
  if (production) {
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), production);
    assert.equal(await meta('meta[property="og:url"]'), production);
    assert.equal(await page.locator('link[rel="sitemap"]').getAttribute('href'), `${production}sitemap.xml`);
    assert.ok((await robots.text()).includes(`Sitemap: ${production}sitemap.xml`));
    assert.deepEqual(locations, [production]);
    const schema = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
    assert.equal(schema['@context'], 'https://schema.org');
    assert.deepEqual(schema['@graph'].map(node => node['@type']), ['WebSite', 'WebApplication']);
    for (const node of schema['@graph']) assert.equal(node.url, production);
    assert.equal(schema['@graph'][1].image, expectedImage);
  } else {
    assert.equal(await page.locator('link[rel="canonical"], meta[property="og:url"], script[type="application/ld+json"]').count(), 0);
    assert.doesNotMatch(await robots.text(), /Sitemap:|localhost|undefined/);
    assert.deepEqual(locations, []);
  }
  const image = await page.request.get(new URL('social-preview.png', preview).href);
  assert.equal(image.status(), 200);
  assert.match(image.headers()['content-type'], /image\/png/);
  const png = await image.body();
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
  assert.ok(png.length < 5_000_000, 'Keep the sharing image below 5 MB');
  console.log(`SEO verified without JavaScript: ${production || preview.href} (metadata, JSON-LD, crawler files, 1200×630 PNG)`);
} finally {
  await browser.close();
}
