# Architecture

The build produces a static site; the visitor's browser runs the models.

Build-time Python exports pinned Kronos weights into four ONNX graphs per model and fetches dated history plus future trading sessions. The builder copies only frontend/runtime assets, graph chunks, JSON data and notices into dist.

app/static/app.js owns selection/view state. data.js loads snapshots and validates imports. inference-client.js owns worker requests/cancellation. inference-worker.js owns one model's sessions and executes tokenizer encoding, two-stage autoregressive generation and tokenizer decoding. inference-core.js implements six-feature normalization, timestamps and top-p sampling. model-cache.js verifies SHA-256 chunks before using cached or downloaded bytes.

Requests carry IDs and selection state has a generation counter. Selection changes during inference terminate the worker; obsolete responses cannot commit. Idle sessions are reused. Model/provider changes release old sessions. Cache failures permit memory-only inference; corrupt weights never reach the runtime.

Every URL is relative to the deployment directory. No production code calls /api. Static runtime assets still need to load after page reload; this is not a full offline PWA.

Architecture source remains unchanged at upstream commit 67b630e67f6a18c9e9be918d9b4337c960db1e9a. Export wrappers remove mutable rotary caches and replace bit unpacking with portable arithmetic. Wrappers are checked against upstream, then ONNX is checked against PyTorch. Browser fixtures validate both stages' logits and reconstructed closes using fixed tokens.

Other Python modules preserve backend comparisons/regressions and supply the catalog, market normalization and calendars. They are absent from the static artifact.
