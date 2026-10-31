import pandas as pd
import pytest

from app.config import Settings
from app.engine import EngineError, KronosEngine
from app.assets import get_asset


def history():
    dates = pd.date_range("2024-01-01", periods=300)
    return {"asset": get_asset("BTC-USD").to_dict(), "candles": [
        {"date": day.strftime("%Y-%m-%d"), "open": 100., "high": 102., "low": 99., "close": 100., "volume": 1000.}
        for day in dates
    ], "as_of": "2024-10-26", "source": "test fixture", "fetched_at": "2024-10-27T00:00:00Z"}


class PredictorFixture:
    def __init__(self, close=110.):
        self.close = close
        self.input = None

    def predict(self, **kwargs):
        self.input = kwargs
        return pd.DataFrame({"close": [self.close] * kwargs["pred_len"]}, index=kwargs["y_timestamp"])


def test_engine_passes_bounded_context_and_matching_dates():
    predictor = PredictorFixture()
    engine = KronosEngine(Settings(), predictor_loader=lambda spec: (predictor, "cpu"))
    stages = []
    result = engine.predict(history(), 5, stages.append)
    assert len(predictor.input["df"]) == 256
    assert len(predictor.input["x_timestamp"]) == 256
    assert predictor.input["sample_count"] == 3
    assert list(predictor.input["y_timestamp"].dt.strftime("%Y-%m-%d")) == ["2024-10-27", "2024-10-28", "2024-10-29", "2024-10-30", "2024-10-31"]
    assert result["forecast"][-1] == {"date": "2024-10-31", "close": 110.}
    assert result["change_pct"] == pytest.approx(10)
    assert result["history"]["as_of"] == "2024-10-26"
    assert engine.status()["state"] == "ready"
    assert stages == ["loading_model", "predicting"]


@pytest.mark.parametrize("close", [float("nan"), float("inf"), -1, 0])
def test_engine_rejects_invalid_forecasts(close):
    engine = KronosEngine(Settings(), predictor_loader=lambda spec: (PredictorFixture(close), "cpu"))
    with pytest.raises(EngineError, match="invalid"):
        engine.predict(history(), 5, lambda stage: None)


def test_failed_model_load_can_be_retried():
    attempts = []
    def load(spec):
        attempts.append(1)
        if len(attempts) == 1:
            raise OSError("private filesystem detail")
        return PredictorFixture(), "cpu"
    engine = KronosEngine(Settings(), predictor_loader=load)
    with pytest.raises(EngineError, match="load"):
        engine.predict(history(), 5, lambda stage: None)
    assert engine.status()["state"] == "error"
    assert engine.predict(history(), 5, lambda stage: None)["forecast"][0]["close"] == 110


def test_predictor_wrong_length_rejected():
    class ShortPredictor:
        def predict(self, **kwargs):
            return pd.DataFrame({"close": [100.]})
    engine = KronosEngine(Settings(), predictor_loader=lambda spec: (ShortPredictor(), "cpu"))
    with pytest.raises(EngineError, match="invalid"):
        engine.predict(history(), 5, lambda stage: None)


def test_switches_model_and_tokenizer_and_reuses_only_current_predictor():
    loads = []
    def load(spec):
        loads.append(spec)
        return PredictorFixture({"mini": 105., "small": 110., "base": 115.}[spec.key]), "cpu"
    engine = KronosEngine(Settings(), predictor_loader=load)
    for key, close in [("small", 110.), ("small", 110.), ("mini", 105.), ("mini", 105.), ("base", 115.)]:
        result = engine.predict(history(), 5, lambda stage: None, model_key=key)
        assert result["projected_close"] == close
        assert result["model"]["key"] == key
        assert result["model"]["id"] == f"NeoQuasar/Kronos-{key}"
    assert [spec.key for spec in loads] == ["small", "mini", "base"]
    assert loads[1].tokenizer_id == "NeoQuasar/Kronos-Tokenizer-2k"
    assert loads[1].max_context == 2048
    assert loads[2].tokenizer_id == "NeoQuasar/Kronos-Tokenizer-base"
    assert engine.status()["model"] == "NeoQuasar/Kronos-base"


def test_failed_model_switch_does_not_reuse_old_predictor_under_new_name():
    loads = []
    def load(spec):
        loads.append(spec.key)
        if spec.key == "base":
            raise OSError("download failed")
        return PredictorFixture(110.), "cpu"
    engine = KronosEngine(Settings(), predictor_loader=load)
    engine.predict(history(), 5, lambda stage: None, model_key="small")
    with pytest.raises(EngineError, match="load"):
        engine.predict(history(), 5, lambda stage: None, model_key="base")
    assert engine.status()["state"] == "error"
    result = engine.predict(history(), 5, lambda stage: None, model_key="small")
    assert result["model"]["id"] == "NeoQuasar/Kronos-small"
    assert loads == ["small", "base", "small"]
