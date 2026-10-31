# Deployment

The same application runs locally or on a private server. It is designed for personal research, with one process, a shared optional access token and in-memory jobs. It has no durable task queue or user accounts.

## Docker Compose

Install Docker with Compose support, then run from the repository root:

```sh
docker compose up --build -d
docker compose logs -f stock-predictor
```

Open [localhost:8000](http://127.0.0.1:8000) on the server or access it through an SSH tunnel. To stop:

```sh
docker compose down
```

The image uses Python 3.12, CPU PyTorch and a non-root application user. It does not download weights at build time. A named `model-cache` volume persists downloaded models and market history under `/data/cache`; stopping the container preserves it. Removing that volume requires downloads again.

Compose publishes `127.0.0.1:8000`, with the host port configurable through `KRONOS_PORT` in `.env`. It passes `KRONOS_API_TOKEN` and `KRONOS_CPU_THREADS`; CPU device and the container cache location are set by the packaged configuration. Edit Compose explicitly to pass other model settings. The health check supports the configured token.

The supplied Dockerfile is a CPU configuration. GPU containers require a CUDA-capable PyTorch installation and NVIDIA Container Toolkit. CUDA/container execution has not been verified in the local Windows validation; see [tested scope](verification.md).

## Remote access

For private access, forward the loopback port over SSH:

```sh
ssh -L 8000:127.0.0.1:8000 your-user@your-server
```

For browser access through a domain, place a TLS reverse proxy on the same host in front of `127.0.0.1:8000`. Before exposing the API, configure a long random `KRONOS_API_TOKEN` in `.env` and restart/recreate the service. Apply access controls and rate limits at the proxy. Allow sufficient upstream timeouts for history requests; forecasting itself is asynchronous and polled by the browser.

The app does not terminate TLS. Keep secrets out of images and version control. See [security guidance](../SECURITY.md) and [configuration](configuration.md).

## Runtime and resources

- Keep **one worker**. Multiple Uvicorn workers each create separate models and job stores; polling may reach the wrong process.
- At most **three jobs** can run or wait at once. A full queue returns 429; one predictor runs inference serially.
- Finished jobs expire after **30 minutes**, and retained records are bounded at 100. All job records disappear when the process restarts. CSV exports can be saved independently.
- Budget disk space for every model/tokenizer used, and memory for the selected predictor. First inference includes download and initialization time. No fixed latency or hardware minimum is claimed.
- Keep the model cache persistent and monitor disk space, memory, provider failures and queue saturation.

For a Python installation without Docker, use the [quick start](../README.md#quick-start) and run `python -m app` under your server's process manager. Keep its working directory at the repository root and configure the service environment deliberately. Do not use auto-reload for deployment.

## Market-data permissions

The default Yahoo Finance / yfinance integration is intended for personal research. Before public or commercial hosting, use a provider with suitable data rights. The MIT application license does not grant redistribution rights for market data or downloaded weights. Replace the provider behind `app/market.py` while preserving its normalized interface; see [architecture](architecture.md) and [third-party notices](../THIRD_PARTY_NOTICES.md).
