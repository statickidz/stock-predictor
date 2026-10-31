import copy
import logging
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from threading import RLock

from .assets import get_asset
from .engine import EngineError
from .market import MarketError
from .config import Settings
from .model_specs import resolve_model

logger = logging.getLogger(__name__)


class QueueFull(Exception):
    pass


class ForecastJobs:
    def __init__(self, market, engine, max_jobs=3, ttl=1800, max_retained=100, clock=time.monotonic, settings=None):
        self.market, self.engine = market, engine
        self.max_jobs, self.ttl, self.max_retained = max_jobs, ttl, max_retained
        self.clock = clock
        self.settings = settings or Settings()
        self._jobs = {}
        self._lock = RLock()
        self._executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="kronos")

    def _prune(self):
        terminal = [job for job in self._jobs.values() if job["state"] in ("complete", "failed")]
        for job in terminal:
            if self.clock() - job["_updated"] > self.ttl:
                self._jobs.pop(job["id"], None)
        terminal = sorted((job for job in self._jobs.values() if job["state"] in ("complete", "failed")), key=lambda job: job["_updated"])
        for job in terminal[:max(0, len(self._jobs) - self.max_retained)]:
            self._jobs.pop(job["id"], None)

    @staticmethod
    def _public(job):
        return copy.deepcopy({key: value for key, value in job.items() if not key.startswith("_")})

    def submit(self, symbol: str, horizon: int, model_key: str | None = None) -> dict:
        get_asset(symbol)
        model = resolve_model(model_key, self.settings)
        if horizon not in (5, 10, 20):
            raise ValueError("Choose a 5, 10 or 20 candle horizon.")
        with self._lock:
            self._prune()
            active = sum(job["state"] in ("queued", "running") for job in self._jobs.values())
            if active >= self.max_jobs:
                raise QueueFull("The forecast queue is full. Please try again in a moment.")
            job = {"id": uuid.uuid4().hex, "symbol": symbol, "horizon": horizon, "model": model.key, "state": "queued", "stage": "queued", "_updated": self.clock()}
            self._jobs[job["id"]] = job
            self._executor.submit(self._run, job["id"])
            return self._public(job)

    def get(self, job_id: str) -> dict | None:
        with self._lock:
            self._prune()
            job = self._jobs.get(job_id)
            return self._public(job) if job else None

    def _update(self, job_id, **fields):
        with self._lock:
            self._jobs[job_id].update(fields, _updated=self.clock())

    def _run(self, job_id):
        with self._lock:
            job = self._public(self._jobs[job_id])
        try:
            self._update(job_id, state="running", stage="fetching_data")
            history = self.market.history(job["symbol"])
            result = self.engine.predict(history, job["horizon"], lambda stage: self._update(job_id, stage=stage), model_key=job["model"])
            self._update(job_id, state="complete", stage="complete", result=result)
        except Exception as exc:
            logger.exception("Forecast job %s failed", job_id)
            message = str(exc) if isinstance(exc, (MarketError, EngineError)) else "The forecast failed. Please try again."
            self._update(job_id, state="failed", stage="failed", error=message)

    def close(self):
        self._executor.shutdown(wait=False, cancel_futures=True)
