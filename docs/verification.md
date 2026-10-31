# Verification

Run pnpm test and python -m pytest -q. Unit tests cover frontend selection/CSV/chart, data contracts, corrupt model caches, sampling/normalization, model chunking and date contracts, alongside preserved Python backend/market/calendar regressions.

A real build compares export wrappers against unmodified upstream and ONNX against PyTorch at batch/sequence sizes (1,17), (3,256) and (3,276). It checks graph validity and creates matching browser fixtures.

For deployed-code verification:

    pnpm exec playwright install chromium
    python scripts/serve_browser.py --port 8020 --base-path /stock-predictor/
    # In another terminal:
    node tests/browser-smoke.mjs

BROWSER_CHANNEL=msedge selects installed Edge. SMOKE_URL selects another preview. SMOKE_WEBGPU=1 checks all-model GPU parity on compatible devices; UI checks use default WASM.

The smoke test uses real browser workers, comparing every generation step's logits and final closes against Python fixtures. It also exercises a 20-day forecast, CSV, cancellation, stale selection, cache deletion, invalid import and mobile overflow under a repository prefix. Accidental /api requests fail the test.

Fixed tokens isolate numerical differences from random-number-generator differences. Parity does not establish accuracy, calibrated uncertainty or identical stochastic forecasts. Keep fixtures and graphs from the same export together.

Desktop success is not a mobile memory/performance guarantee. Test target devices. Some WebGPU nodes remain assigned to CPU; runtime placement warnings are expected.
