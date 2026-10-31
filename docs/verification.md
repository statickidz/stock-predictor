# Verification

pnpm test runs Node contracts for frontend state/CSV/chart, normalization/sampling, cache corruption, market sessions/completed candles, catalog and packaging. No Python, downloads or provider calls are needed.

pnpm build:ui checks Astro compilation without preparing models. For the complete artifact, prepare real model assets/snapshots and run pnpm build. check-dist verifies size and excludes development files.

## Real browser checks

    pnpm exec playwright install chromium
    pnpm preview
    # In another terminal:
    pnpm test:browser

The default smoke URL is http://127.0.0.1:4321/. Set SMOKE_URL to the actual preview URL when changing port or BASE_PATH. For example, a repository-path preview on port8020 needs SMOKE_URL=http://127.0.0.1:8020/stock-predictor/. BROWSER_CHANNEL=msedge uses installed Edge. SMOKE_WEBGPU=1 checks parity on compatible GPU devices; ordinary smoke uses WebAssembly.

The suite obtains the actual Vite-emitted worker URL from the app rather than assuming an unbundled file. It checks all three models' generation logits and decoded closes against fixed-token reference fixtures; loading lifecycle, forecasts, CSV, cancellation, selection invalidation, cache clearing, settings and mobile layout are also checked. It rejects backend requests and model/runtime downloads before inference.

The optional model exporter independently compares wrappers to unchanged upstream architecture and ONNX outputs to PyTorch at several batch/sequence sizes. Its Python dependencies are not frontend test dependencies. See tools/model-export/README.md.

README images are screenshots of actual browser forecasts. With a prepared preview running, use node scripts/capture-screenshots.mjs to refresh them; it accepts the same SMOKE_URL and BROWSER_CHANNEL options. It never injects demo prices or predictions.

Parity does not establish predictive accuracy, calibrated uncertainty or identical random paths between runtimes. Test actual target devices for memory/support/performance. WebGPU may assign some operators to CPU. Keep reference fixtures and graph versions together.
