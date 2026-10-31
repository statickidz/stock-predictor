# Kronos Mini browser inference spike

An isolated proof of concept on branch `codex/browser-inference-poc`. Production FastAPI and its UI are unchanged. Mini runs in a module Web Worker through ONNX Runtime Web 1.24.2. Choose WebGPU or single-threaded WebAssembly explicitly; errors do not silently fall back to server inference.

## Run locally

From the repository root, using the existing Python 3.12 environment:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements-browser.txt
.\.venv\Scripts\python.exe scripts/export_browser.py --symbol NVDA
cd poc/browser
npm install --ignore-scripts
cd ../..
.\.venv\Scripts\python.exe scripts/serve_browser.py --directory poc/browser
```

`pnpm install --ignore-scripts` can replace `npm install`; a pnpm lockfile is included. The normal project Python dependencies, including CPU PyTorch, must already be installed. The export reuses `.cache/huggingface`, downloading Mini and Tokenizer-2k if absent. `--symbol NVDA` is optional and uses the existing market provider and trading calendar to prepare five real future sessions.

Open **http://127.0.0.1:8010**. Use **Validate against Python** first. For a real forecast, select the generated `poc/browser/input.json`, then **Run forecast**. Without an uploaded file, Run forecast uses explicitly labeled synthetic validation data. The market provider is used only during input preparation; browser inference needs no Python API, server model process, or external inference service.

The custom server sets `.mjs` and `.wasm` MIME types explicitly: Windows' default `http.server` can serve `.mjs` as `text/plain`, which browsers reject. WebGPU requires a supported adapter and secure context (localhost qualifies).

## What is proved

- Four FP32 graphs: tokenizer encoder (~8 MB), decoder (~8 MB), generation stage 1 (~14.4 MB), generation stage 2 (~3.2 MB). Total ~33.6 MB plus runtime. Generated graphs, fixtures, downloaded packages, and market input are ignored by Git.
- Export wrappers match the unmodified vendored tokenizer/model before export. A stateless rotary embedding replaces the inference cache without changing its math; portable float arithmetic replaces integer bit unpacking.
- The exporter checks ONNX outputs against PyTorch at batch/sequence sizes `(1,17)`, `(3,256)`, and `(3,276)`.
- Browser validation checks both stages' logits at every step, then reconstructed closes against a Python fixture. Fixed token choices isolate numerical agreement from differences in random-number generators. This does not establish forecast accuracy.
- Ordinary forecasts retain the app's 256-candle context, three samples, temperature 1.0 and top-p 0.9, including the sixth derived amount feature and inverse normalization.

## Verification

```powershell
node --test poc/browser/core.test.mjs
node --test tests/frontend.test.mjs
.\.venv\Scripts\python.exe -m pytest -q
```

After changing export wrappers, regenerate the graphs and repeat browser validation for both providers. Test a real input file, invalid input, cancellation and repeated runs. A passing Python export alone does not prove browser support.

Verified on this development machine in headless Microsoft Edge: WebAssembly and WebGPU both passed per-step logits checks and final-close validation (maximum close error below $0.00002). A real NVDA five-session forecast completed in the browser. These are local smoke checks, not cross-device benchmarks. ONNX Runtime emitted CPU-vendor/graph-placement warnings; WebGPU execution included CPU-assigned nodes. The existing suite passed 55 Python tests (one pre-existing Starlette/httpx deprecation warning), four frontend tests and four PoC math/input tests.

## Scope and limits

Mini only; no quantization, KV cache, persistent model-cache manager, production integration, automatic provider selection, or offline installer. Graph sessions stay loaded in worker memory until cancellation, provider change or page close. HTTP/browser caching may help subsequent downloads but persistent storage is not guaranteed. First load may require tens of megabytes of runtime files in addition to weights.

The page accepts `{ "label": "NVDA", "candles": [...], "future_dates": [...] }`. Each candle contains `date`, `open`, `high`, `low`, `close`, `volume`; dates are UTC `YYYY-MM-DD`. Supply 5, 10 or 20 future dates from the correct market calendar. Uploads are limited to 2 MB and inference uses only the last 256 candles.

WebGPU may assign shape/unsupported nodes to CPU. Selecting WebGPU does not mean every operation runs on GPU. Device memory, browser support, power consumption and latency need broader device testing; desktop measurements are not mobile guarantees. Small/Base require separate export and performance validation. Existing third-party/model/data terms still apply.

The model files are fetched from pinned upstream revisions in PROFILES in the export script. Retain exported artifacts and fixtures together when reproducing a result. Production development now uses the root static build and worker; this standalone page preserves the original Mini experiment.
