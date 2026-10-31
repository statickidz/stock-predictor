# Stock Predictor — Product

## Platform and stack

A browser-first web application built with Astro, plain browser modules and ONNX Runtime Web. Node prepares data/assets and builds the static website. Optional Python tooling converts upstream models; no Python API or inference server exists.

## Users and purpose

People exploring daily stock, ETF and cryptocurrency research forecasts on their own device, from GitHub Pages or another static host.

## Capabilities and constraints

The curated catalog includes 80 US equities,20 ETFs and30 USD crypto pairs. Daily snapshots,5/10/20-session horizons, price and volume chart and CSV. Actual model inference only; no accuracy claims or calibrated confidence intervals.

Kronos Mini (default), Small and Base execute in browser workers with matching tokenizers. One model's sessions remain loaded at a time. Runtime choice offers single-threaded WebAssembly or supported WebGPU. Selection changes cancel running forecasts; stale results cannot update the chart.

Published history uses completed market candles and a versioned exchange calendar. Fetch/observation dates remain visible. Imported JSON stays on the device and supplies its own future dates. Browser caching is optional and verified.

## Principles

- Keep observations, forecast dates and model provenance visible.
- Surface data/model failures honestly.
- Make static browser deployment the single application architecture.
- Preserve the restrained financial workspace documented in DESIGN.md.
