from fastapi.testclient import TestClient
import pytest

from app.config import Settings
from app.main import create_app
from app.market import MarketError
from test_jobs import EngineFixture, MarketFixture, wait_for


def test_health_and_assets_do_not_load_model():
    with TestClient(create_app(Settings(), MarketFixture(), EngineFixture())) as client:
        health = client.get("/api/health")
        assert health.status_code == 200
        assert health.json()["status"] == "ok"
        catalog = client.get("/api/assets").json()["assets"]
        assert len(catalog) >= 130
        assert next(asset for asset in catalog if asset["symbol"] == "QQQ")["kind"] == "stock"
        assert next(asset for asset in catalog if asset["symbol"] == "LINK-USD")["kind"] == "crypto"


def test_forecast_api_runs_and_returns_job_result():
    application = create_app(Settings(), MarketFixture(), EngineFixture())
    with TestClient(application) as client:
        response = client.post("/api/forecasts", json={"symbol": "AAPL", "horizon": 5})
        assert response.status_code == 202
        job = response.json()
        wait_for(application.state.jobs, job["id"], "complete")
        result = client.get(f"/api/forecasts/{job['id']}").json()
        assert result["result"]["horizon"] == 5
        assert client.get("/api/forecasts/missing").status_code == 404


@pytest.mark.parametrize("body", [{"symbol": "NOPE", "horizon": 5}, {"symbol": "AAPL", "horizon": 6}, {"symbol": "AAPL", "horizon": "5"}])
def test_bad_forecast_input_rejected(body):
    with TestClient(create_app(Settings(), MarketFixture(), EngineFixture())) as client:
        assert client.post("/api/forecasts", json=body).status_code == 422


def test_history_endpoint_and_unsupported_symbol():
    with TestClient(create_app(Settings(), MarketFixture(), EngineFixture())) as client:
        assert client.get("/api/history?symbol=AAPL").json() == {"symbol": "AAPL"}
        assert client.get("/api/history?symbol=NOPE").status_code == 422


def test_provider_failure_maps_to_retryable_http_error():
    class Unavailable:
        def history(self, symbol):
            raise MarketError("Data unavailable. Please try again.")
    with TestClient(create_app(Settings(), Unavailable(), EngineFixture())) as client:
        result = client.get("/api/history?symbol=AAPL")
        assert result.status_code == 503
        assert "try again" in result.json()["detail"]


def test_health_remains_responsive_while_model_load_is_blocked():
    import threading
    from app.engine import KronosEngine
    from test_engine import PredictorFixture, history
    entered, release = threading.Event(), threading.Event()
    def load(spec):
        entered.set()
        release.wait(5)
        return PredictorFixture(), "cpu"
    class Market:
        def history(self, symbol):
            return history()
    engine = KronosEngine(Settings(), predictor_loader=load)
    application = create_app(Settings(), Market(), engine)
    try:
        with TestClient(application) as client:
            job = client.post("/api/forecasts", json={"symbol": "BTC-USD", "horizon": 5}).json()
            assert entered.wait(2)
            response = client.get("/api/health")
            assert response.status_code == 200
            assert response.json()["model"]["state"] == "loading"
            assert client.get(f"/api/forecasts/{job['id']}").json()["state"] == "running"
            release.set()
            wait_for(application.state.jobs, job["id"], "complete")
    finally:
        release.set()


@pytest.mark.parametrize("path", ["/api/health", "/api/assets", "/api/models", "/api/history?symbol=AAPL", "/api/forecasts/missing", "/api/docs", "/api"])
def test_token_protects_all_api_routes(path):
    with TestClient(create_app(Settings(api_token="test-token"), MarketFixture(), EngineFixture())) as client:
        assert client.get(path).status_code == 401
        assert client.get("/api/health", headers={"Authorization": "Bearer test-token"}).status_code == 200
        assert client.post("/api/forecasts", json={"symbol": "AAPL", "horizon": 5}).status_code == 401
        assert client.get("/api/assets", headers={"Authorization": "Bearer wrong"}).status_code == 401


def test_models_endpoint_and_selected_forecast_model():
    application = create_app(Settings(), MarketFixture(), EngineFixture())
    with TestClient(application) as client:
        response = client.get("/api/models")
        assert response.status_code == 200
        assert response.json()["default"] == "small"
        assert [model["key"] for model in response.json()["models"]] == ["mini", "small", "base"]
        queued = client.post("/api/forecasts", json={"symbol": "AAPL", "horizon": 5, "model": "base"})
        assert queued.status_code == 202
        assert queued.json()["model"] == "base"
        result = wait_for(application.state.jobs, queued.json()["id"], "complete")
        assert result["result"]["model"] == "base"
        assert client.post("/api/forecasts", json={"symbol": "AAPL", "horizon": 5, "model": "large"}).status_code == 422
