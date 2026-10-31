# Troubleshooting

## Installation

Use **Python 3.12**. The setup scripts create a project-local `.venv` and install pinned dependencies. Rerunning with `-Setup` / `--setup` repairs an incomplete environment, but also reinstalls the CPU PyTorch dependency file.

### PowerShell blocks the startup script

Use the interpreter directly, from the repository root:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-torch.txt
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m app
```

### No matching CPU-index PyTorch wheel

Some platforms, including some macOS architectures, need the PyPI build instead. With Python 3.12 and venv support installed:

```sh
python3.12 -m venv .venv
.venv/bin/python -m pip install torch==2.15.0
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -m app
```

Use the matching interpreter path on Windows. Start without setup afterward so the CPU-index installation is not retried. For NVIDIA builds, follow [CUDA configuration](configuration.md#cpu-and-nvidia-cuda).

## Runtime

| Symptom | What to check |
| :--- | :--- |
| Market data unavailable | Check connectivity and retry after upstream rate limits subside. The app will not substitute invented prices. |
| Model download failed | Check access to Hugging Face and free space in the cache directory. Retry; failed loading does not require a restart. |
| First forecast is slow | The selected model and tokenizer may be downloading or initializing. Mini uses the smallest model. |
| CUDA unavailable | Install a compatible CUDA-enabled PyTorch build or set `KRONOS_DEVICE=cpu`. |
| Port already in use | Set `KRONOS_PORT=8001` in `.env`, or use `scripts/start.ps1 -Port 8001` on Windows. |
| Access token requested again | The token is held only in browser memory. Enter it again after a reload. Check the server's `KRONOS_API_TOKEN` if rejected. |
| Queue full / HTTP 429 | Wait for an active job to finish, then retry. At most three jobs can run or wait at once. |
| Forecast expired / HTTP 404 | The process restarted or the job expired. Generate a fresh forecast. |
| Prices differ from a quote site | These are completed daily candles, not live quotes. Stock history is adjusted. Check the visible observation date. |

On Windows, `scripts/start.ps1 -Check` reports dependency and device availability without starting the server. In containers, inspect `docker compose logs stock-predictor` and the container health status.

For a bug report, use the repository's issue form and include the platform, Python version, reproduction steps and a sanitized error. Keep access tokens and private logs out of public issues. Use [private reporting](../SECURITY.md) for security concerns.
