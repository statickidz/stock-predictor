# Stock Predictor — Product

## Platform

web

## Stack

Stock Predictor is a static HTML/CSS/JavaScript application with ONNX Runtime Web executing Kronos in a browser worker. Python/PyTorch run only during export, snapshot generation and reference testing.

## Users

People exploring daily stock, ETF and cryptocurrency research forecasts in their own browser, from GitHub Pages or another static host.

## Product Purpose

Explore real daily market data and generate research forecasts using the upstream Kronos model.

## Operating Context

HTTPS static hosting and localhost preview. Visitors download the selected model on first use; verified chunks can persist in browser storage. Python/Node are build-time dependencies only.

## Capabilities and Constraints

Supported US stocks/ETFs and USD crypto pairs. Daily candles, 5/10/20-candle horizons, price chart and CSV. Actual market data and inference only. Predictions are estimates; no claimed accuracy or calibrated confidence intervals.

The expanded inventory contains 80 US-listed equities, 20 US-listed ETFs, and 30 USD crypto pairs. The search spans the selected category, and displayed inventory counts derive from the backend catalog. All stock/ETF instruments use the existing US-session calendar; crypto uses UTC calendar days.

Model picker: Kronos Mini (default), Small and Base, with matching pinned tokenizers. One model's sessions remain loaded at a time. Runtime selection offers single-threaded WebAssembly or supported WebGPU. Dated market snapshots refresh through the Pages build; imported JSON remains on the device. Selection changes cancel running forecasts; exports identify the model and source dates.

## Evidence on Hand

Open-source Kronos is the inference mechanism. See [architecture](docs/architecture.md) for implementation boundaries, [verification](docs/verification.md) for exercised scope, and [DESIGN.md](DESIGN.md) for the interface system. No trading performance claims are supplied.

## Product Principles

- Keep input, observation dates and forecast dates visible.
- Surface provider and model failures honestly.
- Use the same application locally and on a server.
