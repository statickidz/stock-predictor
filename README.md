<div align="center">
  <img src="docs/assets/stock-predictor.svg" alt="Stock Predictor logo" width="76" height="76">
  <h1>Stock Predictor</h1>
  <p><strong>A little more perspective on the markets.</strong></p>
  <p>Explore stocks, ETFs and crypto with real market history<br>and forecasts powered by <a href="https://github.com/shiyu-coder/Kronos">Kronos</a>, right in your browser.</p>
  <p>
    <a href="https://astro.build"><img src="https://img.shields.io/badge/Astro-7-BC52EE?style=flat-square&logo=astro&logoColor=white" alt="Astro 7"></a>
    <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node.js-24-417E38?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js 24"></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-60695D?style=flat-square" alt="MIT license"></a>
    <a href="https://github.com/shiyu-coder/Kronos"><img src="https://img.shields.io/badge/Powered_by-Kronos-0877D1?style=flat-square" alt="Powered by Kronos"></a>
  </p>
  <p><a href="#quick-start">Quick start</a> · <a href="#choose-your-model">Models</a> · <a href="#your-device-does-the-work">How it works</a> · <a href="docs/deployment.md">GitHub Pages</a> · <a href="CONTRIBUTING.md">Contributing</a></p>
</div>

![Night Studio in dark mode with a browser-generated NVIDIA forecast](docs/images/forecast-desktop.jpg)

Stock Predictor is a small research workspace: pick an asset, choose a Kronos model and explore its projected daily closes. **Astro serves the interface. Your browser runs the model.** No inference server, account or paid AI API is required.

## Made for exploring

- **130 curated assets.** Search 80 US-listed stocks, 20 ETFs and 30 USD crypto pairs.
- **Three real models.** Choose Kronos Mini, Small or Base, with the matching tokenizer.
- **Your device, your forecast.** Run on CPU through WebAssembly or a supported GPU through WebGPU.
- **A readable path ahead.** Historical prices stay solid; forecasts are dashed. Source dates and model provenance stay visible.
- **Useful exports.** Inspect daily projections and save CSV results.
- **Honest failure states.** No invented prices or simulated-inference fallback. Cancel a forecast at any time.

## Quick start

Use **Node.js 24** and **pnpm 11.25.0**:

If needed, install pnpm once with `npm install --global pnpm@11.25.0`.

```sh
pnpm install --frozen-lockfile
pnpm assets:prepare
pnpm dev
```

Open **[localhost:4321](http://127.0.0.1:4321)**. The Node preparation command fetches completed market candles and packages already-prepared models. Subsequent development runs use the generated assets.

**One-time model setup:** models are large generated artifacts and are not committed to Git. A clean checkout needs a trusted prepared bundle in `.cache/browser-models/`, or the [optional model exporter](tools/model-export/README.md). Only model maintainers need Python. Visitors and ordinary Astro development, data refresh, build and preview use Node/browser tooling.

```sh
pnpm models:check     # Check prepared model inputs
pnpm assets:offline   # Repackage using cached real snapshots
pnpm build           # Build the complete static site
pnpm preview         # Preview the production build
```

For layout work without model downloads, `pnpm build:ui` compiles the frontend alone. It does not produce a complete forecasting deployment. See the [configuration guide](docs/configuration.md) for smaller asset/model subsets.

## From history to a forecast

1. Choose **Stocks & ETFs** or **Crypto**, then search by name or symbol.
2. Pick a **5, 10 or 20-day** horizon, a model and a browser runtime.
3. Generate a forecast. Inspect the chart and daily results, then export if useful.

The site publishes dated market snapshots. Stocks and ETFs follow US trading sessions; crypto advances by UTC calendar days. Stock snapshots use adjusted prices. The observation and fetch dates are always shown: these are **daily observations, not live quotes**.

![Night Studio in dark mode with a browser-generated Bitcoin forecast](docs/images/forecast-crypto.jpg)

### A focused market inventory

| Market | Assets | Examples |
| :--- | ---: | :--- |
| US-listed stocks | 80 | AAPL, MSFT, NVDA, AMZN |
| US-listed ETFs | 20 | SPY, QQQ, VTI, GLD |
| USD crypto pairs | 30 | BTC-USD, ETH-USD, SOL-USD, LINK-USD |

All quotes use USD. The catalog is curated; arbitrary symbols and international exchange calendars are outside this version.

## Choose your model

| Model | Parameters | Tokenizer | Approximate model download |
| :--- | ---: | :--- | ---: |
| [Kronos Mini](https://huggingface.co/NeoQuasar/Kronos-mini) · default | 4.1M | Tokenizer-2k | 34 MB |
| [Kronos Small](https://huggingface.co/NeoQuasar/Kronos-small) | 24.7M | Tokenizer-base | 117 MB |
| [Kronos Base](https://huggingface.co/NeoQuasar/Kronos-base) | 102.3M | Tokenizer-base | 429 MB |

Runtime files download separately. Only the selected model loads. Downloads are verified with SHA-256 and can be cached locally when browser storage allows it. **Settings → Remove downloaded models** removes this site's model cache.

Each forecast uses up to **256 completed candles**, averages **three samples**, and uses temperature `1.0` and top-p `0.9`. Larger models use more memory and do not guarantee better predictions. Start with Mini on phones. Results are stochastic; rerunning a forecast may change it.

<details>
<summary><strong>A compact workspace on mobile, too</strong></summary>
<br>
<img src="docs/images/mobile-controls.jpg" alt="Stock Predictor browser model and forecast controls on mobile" width="310">
<img src="docs/images/mobile-forecast.jpg" alt="Stock Predictor browser-generated chart and forecast on mobile" width="310">
</details>

## Your device does the work

The interface is built with **Astro, plain browser modules and ONNX Runtime Web**. Inference runs in a Web Worker, keeping the page responsive. WebAssembly uses a single CPU thread. WebGPU needs a compatible browser/adapter and HTTPS or localhost; some graph operations may still run on CPU.

Only one model's sessions stay loaded at a time. Changing selection during a forecast cancels the worker, and obsolete results never update the chart. Storage being full or unavailable does not prevent a verified in-memory download. Model caching is not a complete offline installer.

### Bring your own history

Use **Settings → Remove downloaded models** in the navbar to free model storage. Model files download again when needed; your saved selections remain.

Each candle contains `date`, `open`, `high`, `low`, `close` and `volume`. The top-level object contains `label`, `kind` (`stock` or `crypto`), `candles` and `future_dates`. Use strictly increasing UTC `YYYY-MM-DD` dates and USD prices; maximum file size is 2 MB. See [configuration](docs/configuration.md) for an example.

## Made for static hosting

The production output is `dist/`: HTML, CSS, JavaScript, runtime assets, verified model chunks and market snapshots. **No Python or Node process runs on the host.** GitHub Pages and ordinary HTTPS static hosts can serve it.

For GitHub Pages, choose **GitHub Actions** in repository Settings → Pages. Missing or invalid prepared models are rebuilt automatically; **prepare_models** optionally forces a rebuild. Model exports run separately; the website build and daily data refresh use Node. [Deployment instructions](docs/deployment.md) cover branch rules, custom domains and cache bootstrap.

A full three-model artifact is around 673 MB. Models are split into 16 MiB chunks and remain outside the application JavaScript bundle. Optional Docker hosting serves a previously built `dist` with nginx.

**Market-data rights matter.** The Yahoo Finance integration is intended for personal research. Public/commercial snapshot publication needs a provider with appropriate redistribution rights. The code license does not grant data rights. See [third-party notices](THIRD_PARTY_NOTICES.md).

## Under the hood

```text
src/
  pages/          Astro routes
  layouts/        Document shell
  components/     Forecast workspace
  lib/            Chart, data, state and inference helpers
  workers/        Browser model execution
  styles/         Shared visual system
data/             Catalog, model profiles and versioned exchange calendar
scripts/          Node data preparation, packaging and verification
tools/model-export/  Optional PyTorch → ONNX maintenance tooling
tests/            Node contracts and real-browser verification
```

| Guide | What you will find |
| :--- | :--- |
| [Architecture](docs/architecture.md) | Astro components, browser worker and asset/data boundaries |
| [Configuration](docs/configuration.md) | Asset subsets, base paths and model inputs |
| [Deployment](docs/deployment.md) | GitHub Pages, model bootstrap, static hosts and Docker |
| [Troubleshooting](docs/troubleshooting.md) | Downloads, snapshots, browser support and missing assets |
| [Verification](docs/verification.md) | Unit contracts, export parity and browser checks |
| [Contributing](CONTRIBUTING.md) | Node development and maintenance boundaries |
| [Security](SECURITY.md) | Local inputs, public artifacts and verified downloads |

```sh
pnpm test
pnpm build
pnpm exec playwright install chromium
# Start pnpm preview in another terminal, then:
pnpm test:browser
```

Unit tests run without model downloads or market requests. The browser suite checks all three real models against Python reference logits/closes, plus forecasts, CSV, cancellation, cache handling, settings and mobile layout. See [verification](docs/verification.md) for repository-path and GPU checks.

## Credit & license

Stock Predictor is an independent interface built around **[Kronos by ShiYu and contributors](https://github.com/shiyu-coder/Kronos)**, with weights from [NeoQuasar](https://huggingface.co/NeoQuasar), browser execution through [ONNX Runtime](https://onnxruntime.ai/), and market preparation through [yahoo-finance2](https://github.com/gadicc/yahoo-finance2). Upstream licenses and pinned model provenance are preserved.

Application code is available under the [MIT license](LICENSE). Models, market data and dependencies retain their own terms; see [third-party notices](THIRD_PARTY_NOTICES.md).

**For research and exploration.** Forecasts are estimates, not financial advice. Stock Predictor provides no accuracy guarantee, calibrated confidence interval or trading execution.
