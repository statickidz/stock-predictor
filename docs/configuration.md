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

## Browser controls and local imports

Mini and WebAssembly are defaults. WebGPU is offered where the browser exposes it, but adapter initialization can still fail; explicitly select CPU if necessary. Browser storage is optional. Clear model downloads under Local data & storage.

Import JSON with label, kind (stock or crypto), candles and future_dates. Each candle has date/open/high/low/close/volume. Include at least 64 valid completed candles and 20 future dates, strictly increasing UTC YYYY-MM-DD, USD prices, and a file smaller than 2 MB. Future stock dates must follow the correct exchange calendar; crypto dates are UTC calendar days. Files stay on this device.

## Model inputs

data/models.json records source IDs/revisions. To change models, update it and the isolated exporter's PROFILES together, regenerate all affected graphs/fixtures and repeat parity checks. See [model maintenance](../tools/model-export/README.md).

Calendar coverage/provenance lives in data/calendar/XNYS.json. Check coverage before extending the dataset or supporting other exchanges. Calendar exhaustion is an error, never a weekends-only approximation.
