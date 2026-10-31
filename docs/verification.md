# Verification

This document records the scope of the local preparation checks. It is not a forecast-accuracy study or a claim that every deployment platform has been exercised.

## Automated checks

The deterministic suite contains **55 Python tests** and **4 frontend tests**. Provider and predictor fixtures keep it independent of live market requests, downloaded weights and GPU hardware.

```sh
python -m pip install -r requirements-dev.txt
python -m pytest -q
node --test tests/frontend.test.mjs
```

Run inside a Python 3.12 environment; Node 24 is used for frontend tests. The website does not require Node in production. GitHub Actions is configured to run Python tests on Windows and Ubuntu and frontend tests separately. Hosted results will be available after the repository is uploaded and Actions runs.

Coverage includes catalog validation, model/tokenizer pairing, completed-candle filtering, US market calendars, prediction date construction, queue bounds and expiration, API validation/authentication, model provenance, stale browser response handling and CSV serialization.

## Locally exercised scope

| Area | Result / scope |
| :--- | :--- |
| Windows / Python 3.12 / CPU | Startup, dependency checks and automated suites exercised |
| Real model inference | Mini, Small and Base loaded and produced forecasts with their matching tokenizers |
| Market data | All 130 catalog entries returned sufficient completed history and matching metadata in a live check |
| API integration | Stock, ETF and crypto histories/forecasts exercised; result and export provenance checked |
| Browser interface | Desktop and narrow viewport layouts inspected, including model selection, asset search, chart and CSV |
| Linux/macOS | Startup paths provided; not executed locally |
| Docker | Packaging provided; image build/runtime not executed locally |
| NVIDIA CUDA | Configuration supported; GPU inference not exercised locally |
| Physical phones | Narrow browser viewports inspected; real-device testing not performed |

README screenshots were captured from the running application using real market history and model-generated forecasts. They are illustrative snapshots, not current quotes or evidence of accuracy.

## Live catalog check

To recheck provider availability from the repository root:

```powershell
.\.venv\Scripts\python.exe scripts\verify_assets.py
```

On macOS/Linux, use `.venv/bin/python scripts/verify_assets.py`. This requests six months of history and checks metadata plus a minimum of 64 completed candles per instrument. It writes `.cache/asset-verification.json` and exits nonzero for unavailable histories or mismatched metadata. The report is a local cache artifact and is excluded from version control.

This live check is separate from deterministic CI and is not required at startup. Provider availability, symbols and data permissions can change; recheck when updating the catalog. No backtest, calibrated uncertainty interval or out-of-sample accuracy score is supplied.
