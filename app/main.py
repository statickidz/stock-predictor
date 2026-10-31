import secrets
from contextlib import asynccontextmanager
from typing import Literal

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, field_validator
from starlette.concurrency import run_in_threadpool

from .assets import ASSETS, get_asset
from .config import ROOT, Settings
from .engine import KronosEngine
from .jobs import ForecastJobs, QueueFull
from .market import MarketData, MarketError
from .model_specs import available_models, resolve_model


class ForecastRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    symbol: str
    horizon: Literal[5, 10, 20] = 10
    model: str | None = None

    @field_validator("symbol")
    @classmethod
    def supported_symbol(cls, value):
        get_asset(value)
        return value

    @field_validator("horizon", mode="before")
    @classmethod
    def integer_horizon(cls, value):
        if type(value) is not int:
            raise ValueError("Horizon must be an integer: 5, 10 or 20.")
        return value


def create_app(settings=None, market=None, engine=None) -> FastAPI:
    settings = settings or Settings()
    market = market or MarketData(cache_dir=settings.cache_dir)
    engine = engine or KronosEngine(settings)
    jobs = ForecastJobs(market, engine, settings.max_jobs, settings.job_ttl, settings.max_retained_jobs, settings=settings)

    @asynccontextmanager
    async def lifespan(application):
        yield
        jobs.close()

    application = FastAPI(title="Stock Predictor", lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)
    application.state.jobs = jobs

    @application.middleware("http")
    async def security_headers(request: Request, call_next):
        if request.url.path == "/api" or request.url.path.startswith("/api/"):
            if settings.api_token:
                received = request.headers.get("authorization", "")
                if not secrets.compare_digest(received.encode(), f"Bearer {settings.api_token}".encode()):
                    return JSONResponse({"detail": "Enter the server access token to continue."}, status_code=401, headers={"WWW-Authenticate": "Bearer", "Cache-Control": "no-store"})
            response = await call_next(request)
            response.headers["Cache-Control"] = "no-store"
        else:
            response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "same-origin"
        response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
        return response

    @application.get("/api/health")
    async def health():
        return {"status": "ok", "model": engine.status(), "authentication": bool(settings.api_token)}

    @application.get("/api/assets")
    async def assets():
        return {"assets": [asset.to_dict() for asset in ASSETS]}

    @application.get("/api/models")
    async def models():
        return {"models": [model.to_dict() for model in available_models(settings)], "default": resolve_model(None, settings).key}

    @application.get("/api/history")
    async def history(symbol: str):
        try:
            get_asset(symbol)
            return await run_in_threadpool(market.history, symbol)
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from exc
        except MarketError as exc:
            raise HTTPException(503, str(exc)) from exc

    @application.post("/api/forecasts", status_code=202)
    async def forecast(body: ForecastRequest):
        try:
            return jobs.submit(body.symbol, body.horizon, model_key=body.model)
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from exc
        except QueueFull as exc:
            raise HTTPException(429, str(exc), headers={"Retry-After": "10"}) from exc

    @application.get("/api/forecasts/{job_id}")
    async def job_status(job_id: str):
        job = jobs.get(job_id)
        if job is None:
            raise HTTPException(404, "This forecast expired or the server restarted. Generate a new forecast.")
        return job

    application.mount("/", StaticFiles(directory=ROOT / "app" / "static", html=True, check_dir=False), name="website")
    return application


app = create_app()
