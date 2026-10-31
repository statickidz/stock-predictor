# Stock Predictor

Explore stock, ETF and crypto forecasts with **Kronos running in your browser**. This is a static application for GitHub Pages: visitors need no Python installation, API server or inference service.

The interface preserves 130 curated assets, charts, 5/10/20-day horizons, CSV export and all three models. It adds WebAssembly/WebGPU selection, verified model caching, cancellation and local JSON import.

## Deploy on GitHub Pages

1. Push this branch to your GitHub repository, then merge into main or manually dispatch from this branch.
2. In Settings → Pages → Build and deployment, choose GitHub Actions.
3. Run Actions → GitHub Pages → Run workflow. For a feature-branch deployment, allow that branch in the github-pages environment rules.

The workflow installs build tools, exports pinned weights, fetches completed daily history, builds dist and deploys it using the Pages artifact/deployment actions. Pushes to main trigger deployment. The daily schedule (06:30 UTC) runs from the default branch and refreshes snapshots. The first build is slower than cached rebuilds. This local branch does not publish anything by itself.

All URLs work under a repository path such as /stock-predictor/. No weights or datasets are committed to Git. No secrets or backend credentials are embedded in the frontend.

**Prices are dated snapshots, not live quotes.** Fetch and observation dates remain visible. A failed refresh can retain a prior real snapshot; missing data is reported explicitly. Before public hosting, use a provider whose terms permit redistribution. The default Yahoo/yfinance integration is intended for personal research; see [third-party notices](THIRD_PARTY_NOTICES.md).

## Build and preview

Python 3.12 and Node 24 are build tools. From the repository root on Windows:

    py -3.12 -m venv .venv
    .\.venv\Scripts\python.exe -m pip install -r requirements-torch.txt
    .\.venv\Scripts\python.exe -m pip install -r requirements.txt -r requirements-browser.txt -r requirements-dev.txt
    npm install --global pnpm@11.25.0
    pnpm install --frozen-lockfile --ignore-scripts
    .\.venv\Scripts\python.exe scripts/build_pages.py
    .\.venv\Scripts\python.exe scripts/serve_browser.py

Open [localhost:8010](http://127.0.0.1:8010). On macOS/Linux use python3.12 and .venv/bin/python.

For a faster development build, append --models mini --symbols AAPL NVDA BTC-USD. The --offline-data option reuses prior real snapshots in .cache/pages-history. A full artifact is approximately **673 MB**, including all model and runtime files. The builder uploads only deployable assets and notices.

Test a repository URL with:

    python scripts/serve_browser.py --port 8020 --base-path /stock-predictor/

Optional Docker hosting serves an already-built dist: docker compose up --build -d. Its nginx container performs no model export or inference.

## Browser inference

| Model | Parameters | Approximate exported download |
| :--- | ---: | ---: |
| Mini · default | 4.1M | 34 MB |
| Small | 24.7M | 117 MB |
| Base | 102.3M | 429 MB |

Runtime files download separately. Selected models download in chunks of at most 16 MiB, checked with SHA-256 and retained in Cache Storage when allowed. Clear downloads under Local data & storage. Denied/full storage does not prevent memory-only inference.

WebAssembly uses one CPU thread and needs no custom isolation headers. WebGPU needs a supported adapter and HTTPS/localhost; some operations may still run on CPU. Model memory use exceeds download size. Start with Mini on phones. Only one model's sessions stay loaded at a time. Selection changes during inference cancel the worker and prevent stale results from updating the chart.

Forecasts use up to 256 completed candles, three averaged samples, temperature 1.0 and top-p 0.9. Stocks/ETFs follow precomputed US trading sessions; crypto uses UTC calendar days. These are stochastic research estimates, with no accuracy guarantee or calibrated confidence interval.

## Local data import

Under Local data & storage choose a JSON file smaller than 2 MB. Files stay on this device. The shape is:

    {
      "label": "My research data",
      "kind": "stock",
      "candles": [
        {"date":"2026-10-30","open":100,"high":103,"low":99,"close":102,"volume":10000}
      ],
      "future_dates": ["2026-11-02"]
    }

This illustrates individual records: a usable file needs **64+ valid daily candles and 20 future dates** from the correct trading calendar. Use kind crypto for crypto. Dates must increase strictly in UTC YYYY-MM-DD format. Prices use USD. Synthetic parity fixtures are never production data or fallback forecasts.

## Verify

    pnpm test
    python -m pytest -q
    pnpm exec playwright install chromium
    # Start the preview on port 8020 with /stock-predictor/, then:
    node tests/browser-smoke.mjs

BROWSER_CHANNEL=msedge uses installed Edge; SMOKE_WEBGPU=1 checks GPU parity. The browser test checks all three models against Python logits/closes, a 20-day forecast, CSV, cancellation, cache clearing, invalid input and mobile width at a repository subpath.

## Source map

- app/static: production interface, chart, data contracts, worker and verified cache.
- scripts/build_pages.py: static packaging and market snapshots.
- scripts/export_browser.py: pinned model export and parity fixtures.
- .github/workflows/pages.yml: build, refresh and deployment.
- vendor/kronos: unchanged upstream architecture and MIT license.
- poc/browser: historical standalone Mini proof of concept.
- Other Python modules/tests retain the original backend and supply catalog/calendar/market tooling. They are absent from the Pages runtime.

See [deployment](docs/deployment.md), [architecture](docs/architecture.md), [configuration](docs/configuration.md) and [verification](docs/verification.md). Built on [Kronos](https://github.com/shiyu-coder/Kronos) and ONNX Runtime Web. Application code is MIT licensed; models, data and dependencies retain their respective terms.
