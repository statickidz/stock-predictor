# Deployment

Build with pnpm assets:prepare followed by pnpm build. The first command refreshes real snapshots and packages prepared model inputs; build reuses those snapshots and compiles Astro. Only dist is deployed.

## GitHub Pages

Select GitHub Actions in Settings → Pages. The workflow separates prepared models, Node website build/browser verification, and Pages deployment.

On the first run, manually dispatch GitHub Pages with prepare_models enabled. If prepared exports are missing, the model job installs the isolated Python dependencies and runs the three pinned exports. Successful exports are cached and passed as an artifact to the Node build job. Future runs restore them without Python. Missing/expired/invalid caches without explicit bootstrap fail with instructions; rerun with prepare_models enabled. If a corrupt cache has the same key, delete that Actions cache before bootstrapping again.

Normal pushes to main and the daily 06:30 UTC schedule use prepared exports. The website job installs Node dependencies, refreshes market snapshots with Node, packages assets, builds Astro and runs browser smoke before uploading dist. Model binaries are never committed to Git. The owner must push/merge and enable Pages; local commits do not deploy anything.

The workflow derives Astro's origin and base path from the configured Pages site. This supports repository paths, root user/organization sites and custom domains. For other hosts, SITE_URL controls the canonical origin and BASE_PATH the deployment prefix; keep them consistent in build and preview. See [Astro's Pages guide](https://docs.astro.build/en/guides/deploy/github/).

A complete three-model artifact is roughly 673 MB, below GitHub Pages' 1 GB limit. check-dist enforces a 950 MB budget and rejects development files/symlinks. Model chunks are at most 16 MiB; runtime files can be larger.

## Local production checks

    pnpm assets:offline
    # PowerShell: $env:BASE_PATH='/stock-predictor/'
    # POSIX shell: export BASE_PATH=/stock-predictor/
    pnpm build
    pnpm preview --port 8020

Use that same prefix in SMOKE_URL when running pnpm test:browser. pnpm build:ui only compiles the frontend and is not a complete forecasting artifact when assets are absent.

## Other static hosts and Docker

Serve dist over HTTPS, with .mjs as JavaScript and .wasm as WebAssembly. WebGPU/Cache Storage require a secure context. No custom cross-origin isolation headers are needed for single-threaded WASM. If adding a CSP, allow same-origin workers/fetches and WebAssembly compilation.

Optional docker compose up --build -d serves an already-built dist with nginx on localhost:8000. It runs no model export, market refresh or inference. For the container root URL, build with BASE_PATH=/ first.

## Snapshot publication

The schedule refreshes dated completed candles, not live quotes. Provider failures can retain prior real snapshots; the interface shows observation/fetch dates. The default Yahoo integration does not grant public redistribution rights. Use appropriately licensed data before public/commercial publication.
