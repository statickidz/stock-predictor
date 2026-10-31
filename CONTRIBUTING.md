# Contributing

Stock Predictor is an Astro static app. Use Node24/pnpm11.25.0 and follow README's prepared-assets setup. Ordinary development, preview, tests, data refresh and website builds use Node only. There is no Python application server.

Keep src/pages/layouts/components for document/UI structure, src/lib for browser logic and src/workers for inference. Node packaging/market code belongs under scripts and curated metadata/calendar under data. Preserve the visual system in DESIGN.md, accessible chart controls, CSV provenance, explicit dates, cancellation and stale-result protection.

Run pnpm test and pnpm build:ui for frontend work. Before merging deployment/inference changes, prepare real assets, build the full artifact and run pnpm test:browser under a repository prefix. Validate all models and both supported runtimes where possible. Preserve lazy model downloads and single-threaded WASM compatibility with Pages.

tools/model-export is optional maintainer tooling, not a dependency to pull into the app. Keep vendored architecture unchanged, pin sources and validate regenerated graphs/reference fixtures. Do not commit generated model/data/runtime assets, private datasets, .env, local environments or caches.

Node data logic must preserve adjusted prices, complete-candle filtering, early closes, holiday sessions and explicit calendar bounds. Provider failures may retain prior real snapshots but must never fabricate history. Cache failures must not prevent verified in-memory inference.

Building or committing does not authorize pushing, publishing data or changing repository settings. Review redistribution rights before public snapshot publication.
