# Configuration

Copy [`.env.example`](../.env.example) to `.env` in the repository root. The application loads it automatically; existing environment variables take precedence. The `KRONOS_*` prefix is retained for compatibility with the original setup.

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `KRONOS_HOST` | `127.0.0.1` | Bind address for `python -m app` |
| `KRONOS_PORT` | `8000` | HTTP port |
| `KRONOS_DEVICE` | `auto` | Automatic CUDA/CPU selection, `cpu`, or `cuda:0` |
| `KRONOS_CPU_THREADS` | `4` | PyTorch CPU thread budget, at least 1 |
| `KRONOS_CACHE_DIR` | project `.cache` | Model and market-history cache |
| `KRONOS_MODEL` | `NeoQuasar/Kronos-small` | Default model repository or trusted local path |
| `KRONOS_TOKENIZER` | Matching preset | Optional tokenizer override |
| `KRONOS_API_TOKEN` | Empty | Optional bearer token protecting every `/api/*` route |

Start scripts change to the project root, so relative paths such as `.cache` resolve there. Command-line `--host` and `--port` override the corresponding environment settings. On Windows, the start script also accepts `-Port 8001`.

## Models

Mini, Small and Base remain available in the browser. The default is determined by `KRONOS_MODEL`. Mini automatically pairs with `NeoQuasar/Kronos-Tokenizer-2k`; Small and Base pair with `NeoQuasar/Kronos-Tokenizer-base`.

A different model/tokenizer combination adds a **Configured model** choice. Set both paths for custom weights, keep them compatible, and use trusted sources. Custom configurations use the app's 512-token limit; the current inference input is capped at 256 candles. This is not a fine-tuning or training interface.

Weights download on first use into the Hugging Face cache beneath `KRONOS_CACHE_DIR`. One predictor is loaded at a time; switching models replaces it in memory and reuses downloaded files.

## CPU and NVIDIA CUDA

The setup scripts install CPU PyTorch for portability. For NVIDIA acceleration, replace it with a compatible CUDA build using the [official PyTorch installer](https://pytorch.org/get-started/locally/). Match your operating system and driver. The pinned dependency set uses PyTorch `2.15.0`; verify the suite if you change versions.

Set `KRONOS_DEVICE=cuda:0` to require CUDA or leave `auto` to use CUDA when available and CPU otherwise. The application does not select Apple's MPS backend. CPU remains the portable option on macOS.

On Windows, inspect dependencies and device availability with:

```powershell
.\scripts\start.ps1 -Check
```

After installing a CUDA build, start without `-Setup` / `--setup`: setup reinstalls the CPU dependency file. The included container is also CPU-only; see [deployment](deployment.md).

## API access token

For remote access, set a long random `KRONOS_API_TOKEN`, restart the service, and use TLS at the reverse proxy. The interface prompts for the token when the API returns 401. It retains the token only in browser memory; reloading requires entering it again.

API clients send `Authorization: Bearer <your-token>` on every API request, including health checks. Static HTML, styles and scripts remain publicly readable. The token is a shared access control, not a user-account system. See [SECURITY.md](../SECURITY.md).
