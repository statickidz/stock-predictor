# Configuration

The static runtime has no server environment variables, authentication token or model service.

python scripts/build_pages.py includes all three models and the 130-asset catalog. Optional flags:

- --models mini small includes selected models only.
- --symbols AAPL NVDA BTC-USD builds a smaller catalog.
- --offline-data reuses prior real snapshots without provider requests.

dist is rebuilt from scratch. Do not replace it with a symlink. Export caches live in .cache/browser-models and source weights in .cache/huggingface; neither directory is deployed.

Pinned weight/tokenizer revisions are declared in PROFILES in scripts/export_browser.py and recorded in manifests. Changing export code invalidates graph caches. Custom architecture/model overrides from the legacy server are unsupported by the static runtime.

Mini and WebAssembly are defaults. WebGPU is available when the browser exposes it, but adapter initialization can still fail; choose CPU explicitly in that case. Persistent caching is optional. Clear downloaded models under Local data & storage.

Import at least 64 valid daily OHLCV candles and 20 future dates in JSON under 2 MB. Dates increase strictly in UTC YYYY-MM-DD format. Supply the correct stock/ETF exchange calendar or daily crypto dates.

The old KRONOS_* variables and .env.example apply only to retained legacy tooling, not Pages.
