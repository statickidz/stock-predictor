# Troubleshooting

- Blank page at /repository/: publish dist contents and choose GitHub Actions as the Pages source.
- Missing runtime/model files: install locked root dependencies and rebuild. Upload the entire artifact, including every WASM variant and model chunk.
- Module served as text/plain: use the included preview server or set .mjs to JavaScript and .wasm to WebAssembly.
- WebGPU unavailable: use HTTPS/localhost and a supported adapter, or choose WebAssembly.
- Tab runs out of memory: cancel, close other tabs and choose Mini. Runtime memory exceeds download size. No server inference fallback exists.
- Integrity failure: retry or clear model downloads; check that the deployment contains every chunk.
- Old/missing market data: refresh the workflow, choose another asset, or import local data. Failed provider refreshes can retain prior snapshots.
- Build has no snapshots: allow provider access or provide prior real cache for --offline-data. The build never invents prices.
- Import rejected: supply 64+ valid candles and 20 future dates, ordered UTC dates, USD prices and a file below 2 MB.
- Pages deployment denied: enable Actions-based Pages and permit the selected branch in the github-pages environment rules.
- First build slow: model exports and real provider requests are necessary; inspect workflow logs before rerunning.
