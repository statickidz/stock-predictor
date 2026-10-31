# Stock Predictor — Product

## Platform

web

## Stack

Stock Predictor uses Python/FastAPI, plain HTML/CSS/JavaScript, and PyTorch/Kronos. A single service serves the UI and API.

## Users

People exploring daily stock, ETF and cryptocurrency forecasts locally, with a path to private server deployment.

## Product Purpose

Explore real daily market data and generate research forecasts using the upstream Kronos model.

## Operating Context

Local Windows use first, optional Docker/server use later. Python environment and first-run model download are required.

## Capabilities and Constraints

Supported US stocks/ETFs and USD crypto pairs. Daily candles, 5/10/20-candle horizons, price chart and CSV. Actual market data and inference only. Predictions are estimates; no claimed accuracy or calibrated confidence intervals.

The expanded inventory contains 80 US-listed equities, 20 US-listed ETFs, and 30 USD crypto pairs. The search spans the selected category, and displayed inventory counts derive from the backend catalog. All stock/ETF instruments use the existing US-session calendar; crypto uses UTC calendar days.

Model picker: Kronos Mini, Small (default), and Base, with matching tokenizers. Server-configured custom models remain available. One predictor is loaded at a time; queued requests and exported forecasts identify their selected model.

## Evidence on Hand

Open-source Kronos is the inference mechanism. See [architecture](docs/architecture.md) for implementation boundaries, [verification](docs/verification.md) for exercised scope, and [DESIGN.md](DESIGN.md) for the interface system. No trading performance claims are supplied.

## Product Principles

- Keep input, observation dates and forecast dates visible.
- Surface provider and model failures honestly.
- Use the same application locally and on a server.
