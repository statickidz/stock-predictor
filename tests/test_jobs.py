import threading
import time

import pytest

from app.jobs import ForecastJobs, QueueFull


class MarketFixture:
    def history(self, symbol):
        return {"symbol": symbol}


class EngineFixture:
    def __init__(self, gate=None, fail=False):
        self.gate = gate
        self.fail = fail
        self.entered = threading.Event()

    def status(self):
        return {"state": "not_loaded", "model": "test fixture", "device": "cpu"}

    def predict(self, history, horizon, on_stage, model_key=None):
        on_stage("predicting")
        self.entered.set()
        if self.gate:
            self.gate.wait(5)
        if self.fail:
            raise RuntimeError("secret upstream exception")
        return {"asset": history["symbol"], "horizon": horizon, "model": model_key}


def wait_for(jobs, job_id, state):
    for _ in range(200):
        result = jobs.get(job_id)
        if result["state"] == state:
            return result
        time.sleep(.01)
    pytest.fail(f"Job did not reach {state}")


def test_jobs_complete_and_expire():
    clock = [0.]
    jobs = ForecastJobs(MarketFixture(), EngineFixture(), ttl=10, clock=lambda: clock[0])
    try:
        job = jobs.submit("AAPL", 5)
        result = wait_for(jobs, job["id"], "complete")
        assert result["result"] == {"asset": "AAPL", "horizon": 5, "model": "small"}
        clock[0] = 11
        assert jobs.get(job["id"]) is None
    finally:
        jobs.close()


def test_running_jobs_bound_queue_without_blocking_status():
    gate = threading.Event()
    engine = EngineFixture(gate)
    jobs = ForecastJobs(MarketFixture(), engine, max_jobs=1)
    try:
        job = jobs.submit("AAPL", 5)
        assert engine.entered.wait(2)
        assert jobs.get(job["id"])["state"] == "running"
        with pytest.raises(QueueFull):
            jobs.submit("MSFT", 10)
    finally:
        gate.set()
        jobs.close()


def test_jobs_fail_without_leaking_internal_error():
    jobs = ForecastJobs(MarketFixture(), EngineFixture(fail=True))
    try:
        job = jobs.submit("AAPL", 5)
        result = wait_for(jobs, job["id"], "failed")
        assert "try again" in result["error"]
        assert "secret" not in result["error"]
    finally:
        jobs.close()


def test_queued_job_keeps_its_requested_model():
    gate = threading.Event()
    engine = EngineFixture(gate)
    jobs = ForecastJobs(MarketFixture(), engine)
    try:
        first = jobs.submit("AAPL", 5, model_key="mini")
        assert engine.entered.wait(2)
        second = jobs.submit("AAPL", 5, model_key="base")
        assert jobs.get(second["id"])["model"] == "base"
        gate.set()
        assert wait_for(jobs, first["id"], "complete")["result"]["model"] == "mini"
        assert wait_for(jobs, second["id"], "complete")["result"]["model"] == "base"
    finally:
        gate.set()
        jobs.close()
