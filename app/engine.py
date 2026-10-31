import logging
import math
import sys
import time
from datetime import datetime, timezone
from threading import Lock

import pandas as pd

from .config import ROOT, Settings
from .market import future_dates
from .model_specs import ModelSpec, resolve_model

logger = logging.getLogger(__name__)


class EngineError(Exception):
    pass


class KronosEngine:
    def __init__(self, settings: Settings, predictor_loader=None):
        self.settings = settings
        self._loader = predictor_loader or self._load_predictor
        self._predictor = None
        self._loaded_model = None
        self._requested_model = resolve_model(None, settings)
        self._state = "not_loaded"
        self._device = settings.device
        self._lock = Lock()

    def status(self) -> dict:
        return {"state": self._state, "model": self._requested_model.model_id, "model_key": self._requested_model.key, "device": self._device}

    def _load_predictor(self, spec: ModelSpec):
        import gc
        import torch

        # Upstream imports model.module; preserve its unmodified package layout.
        source = str(ROOT / "vendor" / "kronos")
        if source not in sys.path:
            sys.path.insert(0, source)
        from model import Kronos, KronosPredictor, KronosTokenizer

        device = self.settings.device
        if device == "auto":
            device = "cuda:0" if torch.cuda.is_available() else "cpu"
        if device.startswith("cuda") and not torch.cuda.is_available():
            raise EngineError("CUDA is unavailable. Install a compatible PyTorch build or set KRONOS_DEVICE=cpu.")
        torch.set_num_threads(self.settings.cpu_threads)
        # The previous predictor has been released before loading a different one.
        gc.collect()
        if device.startswith("cuda"):
            torch.cuda.empty_cache()
        cache = str(self.settings.cache_dir / "huggingface")
        tokenizer = KronosTokenizer.from_pretrained(spec.tokenizer_id, cache_dir=cache)
        model = Kronos.from_pretrained(spec.model_id, cache_dir=cache)
        tokenizer.eval()
        model.eval()
        return KronosPredictor(model, tokenizer, device=device, max_context=spec.max_context), device

    def predict(self, history: dict, horizon: int, on_stage, model_key: str | None = None) -> dict:
        spec = resolve_model(model_key, self.settings)
        with self._lock:
            started = time.monotonic()
            if self._predictor is None or self._loaded_model != spec:
                self._predictor = None
                self._loaded_model = None
                self._requested_model = spec
                on_stage("loading_model")
                self._state = "loading"
                try:
                    predictor, device = self._loader(spec)
                    self._predictor, self._device = predictor, device
                    self._loaded_model = spec
                    self._state = "ready"
                except Exception as exc:
                    self._state = "error"
                    logger.exception("Kronos model loading failed")
                    if isinstance(exc, EngineError):
                        raise
                    raise EngineError("Could not load Kronos. Check internet access and the model cache, then try again.") from exc
            on_stage("predicting")
            context = history["candles"][-256:]
            dates = future_dates(history["asset"]["kind"], context[-1]["date"], horizon)
            frame = pd.DataFrame(context)
            try:
                prediction = self._predictor.predict(
                    df=frame[["open", "high", "low", "close", "volume"]],
                    x_timestamp=pd.Series(pd.to_datetime(frame["date"])),
                    y_timestamp=pd.Series(pd.to_datetime(dates)),
                    pred_len=horizon, T=1.0, top_p=0.9, sample_count=3, verbose=False,
                )
            except Exception as exc:
                logger.exception("Kronos inference failed")
                raise EngineError("Kronos could not generate this forecast. Please try again.") from exc
            if len(prediction) != horizon or "close" not in prediction:
                raise EngineError("Kronos returned an invalid forecast. Please try again.")
            closes = [float(value) for value in prediction["close"]]
            if not all(math.isfinite(value) and value > 0 for value in closes):
                raise EngineError("Kronos returned an invalid price. Please try again.")
            last = context[-1]["close"]
            return {
                "asset": history["asset"], "horizon": horizon, "history": history,
                "forecast": [{"date": date, "close": close} for date, close in zip(dates, closes)],
                "last_close": last, "projected_close": closes[-1],
                "change_pct": (closes[-1] / last - 1) * 100,
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "elapsed_seconds": round(time.monotonic() - started, 2),
                "model": {"key": spec.key, "name": spec.name, "id": spec.model_id, "tokenizer": spec.tokenizer_id, "max_context": spec.max_context, "device": self._device, "context": len(context), "samples": 3, "temperature": 1.0, "top_p": 0.9},
            }
