# Contributing to Stock Predictor

Keep changes focused and describe the problem they solve. For larger changes, open an issue first to discuss scope. Include reproduction steps for bugs and screenshots for visible interface changes.

## Run the full app

Use Python 3.12. From the repository root, run:

```powershell
# Windows PowerShell
.\scripts\start.ps1 -Setup
```

```sh
# macOS / Linux
sh scripts/start.sh --setup
```

These scripts install the application and CPU PyTorch. See the [README](README.md) for platform alternatives and subsequent starts. Real forecasts fetch market history and download model weights on first use.

Read [architecture](docs/architecture.md) for the provider, predictor, and job boundaries, and [configuration](docs/configuration.md) before changing runtime settings.

## Run tests without PyTorch

Node 24 is needed only for frontend tests; no npm dependencies or build step are required. Python tests use provider and predictor fixtures, so they need neither PyTorch nor downloaded weights. In a fresh checkout:

```powershell
# Windows PowerShell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m pytest -q
node --test tests/frontend.test.mjs
```

```sh
# macOS / Linux
python3.12 -m venv .venv
.venv/bin/python -m pip install -r requirements-dev.txt
.venv/bin/python -m pytest -q
node --test tests/frontend.test.mjs
```

Dependency installation needs network access. Keep the tests themselves deterministic: inject fixtures at the market-provider and predictor boundaries, avoid live market requests, and never require weights or GPU hardware. Document any separately performed real-inference checks in the pull request.

## Source and data hygiene

- Keep upstream source under `vendor/` unmodified and retain its licenses and notices. Discuss an upstream refresh separately; preserve provenance in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
- Exclude `.env`, tokens, downloaded weights, caches, and personal artifacts from contributions.
- Match the surrounding code and `.editorconfig`; update relevant tests and documentation when behavior changes.
- Report security issues using [SECURITY.md](SECURITY.md), rather than a public issue.
