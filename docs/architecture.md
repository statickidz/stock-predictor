# Architecture

Stock Predictor has one application architecture: an Astro static frontend running Kronos in browser workers. Node prepares deployable model/runtime assets and market snapshots. Python is isolated to optional model maintenance.

## Boundaries

Astro renders the document shell and workspace components from src/pages, src/layouts and src/components. Browser modules in src/lib own chart rendering, selection/CSV state, cache validation and worker requests. src/workers owns model execution. No API server, job queue or server-side inference process exists.

The inference flow is normalization → learned tokenizer encoder → two-stage autoregressive generation → tokenizer decoder → sample averaging and inverse normalization. Preserve the verified algorithms when changing the interface. One worker holds one model's sessions. Selection changes invalidate pending work; cancellation terminates the worker. Idle sessions can be reused.

A shared asset-base helper resolves data, models and runtime from Astro's deployment base. The module worker is emitted by Vite, and its hashed output location is not the public asset root. ONNX Runtime and model weights stay outside the application JS bundle and load only when inference is requested.

## Data and assets

data/assets.json contains the curated catalog; data/models.json records pinned model/tokenizer profiles. The versioned XNYS calendar in data/calendar includes sessions, actual UTC close times and provenance. Calendar coverage is explicit; exhaustion fails instead of guessing holidays.

scripts/prepare-assets.mjs packages .cache/browser-models into verified content-addressed chunks, copies the browser runtime/licenses, and prepares public/data. Its Node market adapter normalizes adjusted OHLCV and filters incomplete stock sessions and the current crypto UTC day. Prior real snapshots can survive provider failures. Missing data remains unavailable; zero real snapshots fail deployment preparation.

Generated public/data, public/models and public/runtime are ignored by Git. Astro copies them into dist alongside the compiled frontend. The complete artifact must remain below the configured 950 MB budget.

## Model maintenance

tools/model-export contains the sole Python environment and the unchanged upstream Kronos architecture. It exports pinned PyTorch weights into browser-compatible ONNX graphs and creates reference fixtures. The exporter validates wrappers against upstream and ONNX against PyTorch; real browser tests validate the actual deployed graphs.

The Astro build consumes prepared model bundles. The separate Pages model job automatically runs Python exports when cached bundles are missing or invalid. Local clean checkouts need a prepared bundle or an exporter run. Git history records the previous server implementation.
