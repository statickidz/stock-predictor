# Contributing

Use Python 3.12 and Node 24. Install build/development dependencies as shown in README. Production source is app/static; scripts/build_pages.py creates ignored dist artifacts. Keep weights, market data, caches, credentials and .env out of Git.

Run pnpm test and python -m pytest -q. A Mini/subset artifact is convenient for iteration. Before merging deployment changes, build all models and run actual browser smoke at a repository subpath.

Preserve DESIGN.md, chart keyboard interactions, CSV provenance, date labels and selection invalidation. Keep URLs relative. Do not add fake-data/inference fallbacks, API dependencies or client-embedded secrets.

Export changes must retain the unmodified upstream source, pinned provenance and upstream/PyTorch/ONNX/browser parity checks. Cache persistence is optional; storage failures must not block verified inference. GitHub Pages cannot supply custom isolation headers, so default WASM remains single-threaded.

Legacy Python backend modules remain reference/test tooling. Production features use browser inference and static contracts. Building does not authorize pushing, publishing data or changing repository settings.
