# Static deployment

The production artifact is dist. It contains HTML/CSS/ES modules, browser runtime files, immutable model chunks, JSON data and notices. No Python, Node, API token or server inference process runs at deployment time.

## GitHub Pages

Choose GitHub Actions in Settings → Pages. The GitHub Pages workflow builds and uploads dist with actions/upload-pages-artifact and deploys with actions/deploy-pages. Only the deployment job has pages:write and id-token:write permissions.

Pushes to main and manual dispatch trigger the workflow. Feature-branch dispatch requires that branch to be allowed by the github-pages environment. The 06:30 UTC daily schedule runs from the default branch. The owner must push/merge and enable Pages; keeping a branch locally does not publish a site.

First builds download pinned weights and validate exports. Subsequent runs cache weights, exported graphs and prior snapshots. Successful runs save a fresh snapshot cache. Exporter/architecture hashes invalidate graph caches. No weights or price datasets are committed to Git.

A full build is approximately 673 MB, below Pages' 1 GB published-site limit. The builder refuses artifacts larger than 950 MB. Every model chunk is at most 16 MiB. All URLs resolve relative to their containing modules and support repository subpaths.

See GitHub's [custom workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) and [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).

## Market snapshots

Pages cannot run yfinance. Builds fetch completed candles and the next 20 exchange/calendar dates. The browser slices those dates for the chosen horizon. Failed refreshes reuse prior real snapshots where possible; missing assets are unavailable. A build with zero real snapshots fails.

Observation/fetch dates remain visible. Forecast dates are relative to the snapshot, not the current wall clock. Rebuild when history needs refreshing. Local imports include their own future dates and stay in the browser.

The default provider's personal-use terms do not grant public redistribution rights. Before public/commercial deployment, replace MarketData._load with a provider permitting publication or use your own licensed dataset. Packaging and workflows do not grant data rights.

## Other static hosts

Serve dist over HTTPS or localhost. Configure .mjs as text/javascript and .wasm as application/wasm. GitHub Pages supplies these MIME types. No COOP/COEP headers are required for single-threaded WASM. If adding a CSP, allow same-origin workers/fetches and WebAssembly compilation. JSON should revalidate; content-hashed model chunks can be cached immutably.

Docker is optional: build dist first, then docker compose up --build -d. The nginx image copies only dist and serves it at localhost:8000. Rebuild the image after static changes. No GPU device, inference cache volume or API environment variables are needed.
