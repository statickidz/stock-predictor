# Troubleshooting

- Missing models on a clean checkout: restore prepared .cache/browser-models or follow tools/model-export/README.md. pnpm build does not secretly invoke Python.
- Missing data during dev: run pnpm assets:prepare once, or assets:offline if real snapshots are cached.
- Node provider refresh fails: previous real snapshots can be retained. Check source/fetch dates, try later or import local data. No fake prices are generated.
- First Pages deployment fails model checks: manually rerun with prepare_models enabled. Delete corrupt matching Actions caches before rebuilding them.
- Broken project-site URLs: configure BASE_PATH and use the same prefix for build/preview. Do not use the hashed JS/worker directory as the model root.
- Module/WASM MIME errors: serve with Astro preview, the supplied nginx configuration or correctly configured static hosting.
- GPU initialization fails: use HTTPS/localhost and a supported adapter or choose WebAssembly explicitly.
- Browser runs out of memory: cancel, close other tabs and choose Mini. Download size is smaller than runtime memory.
- Integrity failure: retry; the cache removes corrupt bytes. Confirm all model chunks were deployed.
- Calendar coverage exhausted: update the versioned exchange calendar and its tests. Do not approximate holidays.
- Import fails: supply 64+ valid candles, 20 future dates, ordered UTC dates, USD prices and JSON below 2 MB.
- Daily history looks old: the site uses snapshots. Refresh/redeploy or import newer history; forecast dates are relative to the selected observations.
