// Rebuild the committed social card with the site's own font and chart vocabulary.
import {readFile, stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {SEO} from '../src/lib/seo.js';

const font = (await readFile(new URL('../src/assets/InterVariable.woff2', import.meta.url))).toString('base64');
const target = fileURLToPath(new URL(`../public/${SEO.image}`, import.meta.url));
const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_CHANNEL ? {channel: process.env.BROWSER_CHANNEL} : {})});
try {
  const page = await browser.newPage({viewport: {width: SEO.imageWidth, height: SEO.imageHeight}, deviceScaleFactor: 1});
  await page.setContent(`<!doctype html><html><head><style>
    @font-face {font-family: Inter; src: url(data:font/woff2;base64,${font}) format('woff2'); font-weight: 100 900;}
    * {box-sizing: border-box;} body {margin: 0; background: #0e161d;} svg {display: block; font-family: Inter, sans-serif;}
  </style></head><body>
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
      <rect width="1200" height="630" fill="#0e161d" />
      <g transform="translate(64 62)" stroke="#39b7f5" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <path d="M3 3v30h31M9 25l8-9 7 4L34 6M27 6h7v7" />
      </g>
      <text x="115" y="92" fill="#eaf2fa" font-size="32" font-weight="650" letter-spacing="-1">stock predictor<tspan fill="#39b7f5">.</tspan></text>
      <text x="64" y="242" fill="#eaf2fa" font-size="80" font-weight="600" letter-spacing="-2.5">AI stock</text>
      <text x="64" y="334" fill="#eaf2fa" font-size="80" font-weight="600" letter-spacing="-2.5">prediction.</text>
      <text x="66" y="391" fill="#9eafc0" font-size="25">Stock, ETF &amp; crypto forecasts.</text>
      <text x="66" y="430" fill="#9eafc0" font-size="22">Powered by Kronos. Run on your device.</text>
      <g stroke="#2b3b49" stroke-width="1" opacity=".65">
        <path d="M712 242h424M712 310h424M712 378h424M712 446h424" />
        <path d="M738 218v228M814 218v228M890 218v228M966 218v228M1042 218v228M1118 218v228" />
      </g>
      <text x="714" y="193" fill="#39b7f5" font-size="13" font-weight="600" letter-spacing="1.5">HISTORY</text>
      <text x="989" y="193" fill="#efb65c" font-size="13" font-weight="600" letter-spacing="1.5">FORECAST</text>
      <path d="M714 409l27-18 23 9 23-49 24 11 25-44 24 13 26-40 25 18 29-48 26 17" fill="none" stroke="#39b7f5" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" />
      <path d="M966 278l28-19 25 15 28-41 28 16 27-27 30 14" fill="none" stroke="#efb65c" stroke-width="4" stroke-dasharray="8 9" stroke-linejoin="round" stroke-linecap="round" />
      <circle cx="966" cy="278" r="5" fill="#0e161d" stroke="#39b7f5" stroke-width="3" />
      <text x="1136" y="474" text-anchor="end" fill="#9eafc0" font-size="11" letter-spacing="1">ILLUSTRATIVE CHART</text>
      <path d="M64 526h1072" stroke="#2b3b49" />
      <text x="64" y="570" fill="#9eafc0" font-size="17">Daily snapshots. On-device research.</text>
      <text x="1136" y="570" text-anchor="end" fill="#9eafc0" font-size="15">For research only · Not financial advice</text>
    </svg>
  </body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({path: target, type: 'png', animations: 'disabled'});
  console.log(`Social image generated: ${target} (${(await stat(target)).size} bytes)`);
} finally {
  await browser.close();
}
