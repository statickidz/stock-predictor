# Configuration

## Node commands

- pnpm dev starts Astro at localhost:4321.
- pnpm assets:prepare refreshes real market snapshots and packages prepared model inputs.
- pnpm assets:offline packages existing real snapshots without provider access.
- pnpm build prepares cached assets, compiles Astro and checks the complete artifact.
- pnpm build:ui compiles UI only; useful for frontend CI without model assets.
- pnpm preview serves the production artifact.
- pnpm models:check checks that prepared exports match the pinned catalog.

For smaller development assets:

    pnpm assets:prepare --models mini --symbols AAPL NVDA BTC-USD

The complete build defaults to all models/catalog entries; use the Node preparation script's subset options and build:ui when intentionally preparing a subset artifact, then run node scripts/check-dist.mjs. Generated assets live in ignored public folders. Model inputs live in .cache/browser-models; snapshots in .cache/pages-history.

## Deployment

BASE_PATH selects a project prefix, default /. SITE_URL optionally sets the canonical origin. Set the same values for build and preview. For example BASE_PATH=/stock-predictor/ and SITE_URL=https://example.github.io. No inference API token, server model device or server host variables exist.

## Search and link previews

Set `SITE_URL` to your public HTTPS origin for production builds. `BASE_PATH` supplies the deployment prefix. The document head includes a descriptive title, description, canonical URL, Open Graph metadata, an X/Twitter large-image card, and WebSite/WebApplication JSON-LD. These are rendered into HTML and require no browser JavaScript. GitHub Pages already provides both settings through its workflow.

`src/lib/seo.js` holds the shared title, description and image defaults. The document layout also accepts `title` and `description` props. Canonical links identify the microsite homepage, without transient query strings or fragments. Builds without `SITE_URL` omit canonical URLs, URL-based structured data and sitemap entries; their image uses a local base-relative path. Set the public origin before deploying so shared images have absolute URLs.

The build generates `sitemap.xml` and `robots.txt` at the deployment base. The sitemap lists the homepage; it does not invent market-specific pages or modification dates. On a project host such as `https://example.github.io/stock-predictor/`, crawlers read robots rules from the origin's `/robots.txt`, not the project's `/stock-predictor/robots.txt`. Submit the full project sitemap URL in your search engine's webmaster tools, or reference it from the origin-root robots file when you control that file.

The committed `public/social-preview.png` is a 1200×630 PNG matching the site's font and dark palette. To update it, edit `scripts/generate-social-image.mjs` and run `pnpm seo:image` with Playwright Chromium installed (`pnpm exec playwright install chromium`). An installed Edge/Chrome can be used by setting `BROWSER_CHANNEL=msedge` or `chrome`. Image generation is separate from ordinary builds.

After building, start `pnpm preview` with the same `SITE_URL` and `BASE_PATH`, then run `pnpm test:seo` with `SMOKE_URL` pointing at that local preview, including its prefix. This checks the rendered metadata, crawler files and actual image with JavaScript disabled. The Pages workflow runs this check before its forecasting smoke test. Existing social-platform caches may need a refresh after deployment.

## Browser controls and model storage

Mini and WebAssembly are defaults. WebGPU is offered where the browser exposes it, but adapter initialization can still fail; explicitly select CPU if necessary. Browser storage is optional. Remove downloaded models through the navbar Settings popup. Saved selections remain; model files download again when needed.


## Model inputs

data/models.json records source IDs/revisions. To change models, update it and the isolated exporter's PROFILES together, regenerate all affected graphs/fixtures and repeat parity checks. See [model maintenance](../tools/model-export/README.md).

Calendar coverage/provenance lives in data/calendar/XNYS.json. Check coverage before extending the dataset or supporting other exchanges. Calendar exhaustion is an error, never a weekends-only approximation.
