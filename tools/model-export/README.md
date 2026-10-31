# Optional model preparation

This folder is the only Python part of Stock Predictor. It prepares pinned upstream PyTorch weights for the browser; it is not an application server, frontend build tool or daily market-data dependency.

The Astro app consumes four prepared ONNX graphs and matching parity fixtures per model from .cache/browser-models/<key>. Those large artifacts are ignored by Git. Restore a trusted prepared bundle there, or generate it once with this tool.

From the repository root (Python 3.12):

    python -m venv .venv-models
    .venv-models/Scripts/python -m pip install -r tools/model-export/requirements-torch.txt
    .venv-models/Scripts/python -m pip install -r tools/model-export/requirements.txt
    .venv-models/Scripts/python tools/model-export/export.py --model mini
    .venv-models/Scripts/python tools/model-export/export.py --model small
    .venv-models/Scripts/python tools/model-export/export.py --model base
    pnpm models:check

On macOS/Linux use .venv-models/bin/python. An existing compatible Python environment can be used instead. --output chooses another export directory; default outputs go to .cache/browser-models/<model>. The exporter reuses downloaded weights under .cache/huggingface.

PROFILES pins model and tokenizer revisions. Keep it in sync with data/models.json when intentionally changing models. Export wrappers are compared against the unmodified upstream architecture, then ONNX outputs against PyTorch at several batch/sequence lengths. Each export creates its matching fixed-token browser parity fixture. Synthetic fixtures are validation data only.

The unchanged Kronos architecture is vendored under vendor/kronos with its MIT license. Upstream source commit: 67b630e67f6a18c9e9be918d9b4337c960db1e9a. Weight sources and revisions are recorded in each manifest. Retain manifests, graphs and fixtures together. Browser smoke tests provide an additional compatibility check after preparation.

For GitHub Pages' first deployment or after prepared caches expire, manually dispatch the Pages workflow with prepare_models enabled. Its separate model-preparation job installs these optional dependencies only when needed. Website builds, previews, frontend CI and daily snapshot refreshes use Node.
