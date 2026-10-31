# Deployment

Build with pnpm assets:prepare followed by pnpm build. The first command refreshes real snapshots and packages prepared model inputs; build reuses those snapshots and compiles Astro. Only dist is deployed.

## GitHub Pages

Select GitHub Actions in Settings → Pages. The workflow separates prepared models, Node website build/browser verification, and Pages deployment.

The model job automatically prepares pinned exports when the prepared cache is missing or fails validation. It installs the isolated Python dependencies, exports all three models, and validates them before saving a fresh cache generation. Valid cached exports skip Python. The prepare_models input optionally forces a rebuild. Unique cache keys let recovery replace corrupt exports without manually deleting caches. Cold and recovery builds take longer; the job allows 90 minutes. Export or validation failures still stop deployment.

Normal pushes to main and manual Pages runs use prepared exports. Scheduled market updates run separately and do not redeploy Pages. The website job installs Node dependencies, refreshes market snapshots with Node, packages assets, builds Astro and runs browser smoke before uploading dist. Model binaries are never committed to Git. The owner must push/merge and enable Pages; local commits do not deploy anything.

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

## Independent market-data branch

The Market data workflow refreshes JSON only: weekdays at 16:30 America/New_York (DST aware), plus daily at 06:30 UTC for completed crypto candles and a stock retry. Holidays retain the latest completed session. GitHub schedules may run late.

After merging the workflows to the default branch:

1. Run **Market data** manually from Actions. It creates the orphan `market-data` branch automatically; later runs update that branch without force pushing.
2. Deploy **GitHub Pages** once to enable the new data URL in the browser bundle. Future price refreshes need no site or model deployment.

The publisher needs Actions `contents: write` permission and branch rules that permit its bot to update `market-data`. No personal token is needed. The repository must be public for anonymous raw-file reads. Leave the branch out of any Pages source-branch configuration; Pages continues using the existing Actions deployment.

Pages builds set `PUBLIC_MARKET_DATA_URL=https://raw.githubusercontent.com/OWNER/REPO/market-data/data`. For local testing or other hosts, set this environment variable at build time; unset it to use bundled data only. Only the market catalog and history use this URL; model catalogs, binaries and runtime stay on Pages.

Raw GitHub responses can remain cached for several minutes. Each request has a 10-second timeout and falls back to the bundled snapshot on network, HTTP or JSON errors. Fetching occurs when opening the site or selecting an asset; an already-open chart does not poll. Existing observation/fetch dates identify snapshot age. This is appropriate for daily snapshots, without a precise delivery-time guarantee.

The Node publisher validates each provider response with the existing trading calendar. Failures emit Actions warnings and retain the prior valid snapshot with its original timestamps; a run with no valid snapshots fails without publishing. Publication is one Git commit after validation. The daily job requires no model cache, exports, Astro build or browser installation.
