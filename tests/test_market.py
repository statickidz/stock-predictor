from datetime import datetime, timezone

import exchange_calendars as xcals
import pandas as pd
import pytest

from app.assets import get_asset
from app.market import MarketData, MarketError, future_dates, normalize_history


def stock_frame():
    dates = xcals.get_calendar("XNYS").sessions_in_range("2025-03-01", "2025-07-03")
    return pd.DataFrame(
        {"Open": 100.0, "High": 102.0, "Low": 99.0, "Close": 101.0, "Volume": 1000.0},
        index=dates,
    )


def test_normalizes_sorts_and_deduplicates_candles():
    frame = stock_frame()
    frame = pd.concat([frame.iloc[::-1], frame.iloc[-1:]])
    rows = normalize_history(frame, get_asset("AAPL"), datetime(2025, 7, 5, tzinfo=timezone.utc))
    assert rows[-1] == {"date": "2025-07-03", "open": 100.0, "high": 102.0, "low": 99.0, "close": 101.0, "volume": 1000.0}
    assert len(rows) == len(stock_frame())
    assert rows[0]["date"] < rows[-1]["date"]


def test_early_close_candle_only_available_after_close():
    frame = stock_frame()
    before = normalize_history(frame, get_asset("AAPL"), datetime(2025, 7, 3, 16, 59, tzinfo=timezone.utc))
    after = normalize_history(frame, get_asset("AAPL"), datetime(2025, 7, 3, 17, 1, tzinfo=timezone.utc))
    assert before[-1]["date"] == "2025-07-02"
    assert after[-1]["date"] == "2025-07-03"


def test_crypto_excludes_current_utc_day():
    frame = stock_frame().reindex(pd.date_range("2025-04-01", "2025-07-03"), method="ffill")
    rows = normalize_history(frame, get_asset("BTC-USD"), datetime(2025, 7, 3, 23, 59, tzinfo=timezone.utc))
    assert rows[-1]["date"] == "2025-07-02"


def test_invalid_prices_and_volume_are_removed():
    frame = stock_frame()
    frame.iloc[-1, frame.columns.get_loc("Close")] = float("nan")
    frame.iloc[-2, frame.columns.get_loc("High")] = 50
    frame.iloc[-3, frame.columns.get_loc("Volume")] = -1
    rows = normalize_history(frame, get_asset("AAPL"), datetime(2025, 7, 5, tzinfo=timezone.utc))
    assert rows[-1]["date"] == frame.index[-4].strftime("%Y-%m-%d")


def test_insufficient_history_is_rejected():
    with pytest.raises(MarketError, match="64"):
        normalize_history(stock_frame().iloc[:10], get_asset("AAPL"), datetime.now(timezone.utc))


def test_forecast_dates_skip_stock_holiday_and_weekend():
    assert future_dates("stock", "2025-07-03", 5) == ["2025-07-07", "2025-07-08", "2025-07-09", "2025-07-10", "2025-07-11"]
    assert future_dates("crypto", "2025-07-03", 5) == ["2025-07-04", "2025-07-05", "2025-07-06", "2025-07-07", "2025-07-08"]


def test_provider_caches_history_and_keeps_as_of_date():
    calls = []
    def load(symbol):
        calls.append(symbol)
        return stock_frame()
    market = MarketData(loader=load, now=lambda: datetime(2025, 7, 5, tzinfo=timezone.utc))
    result = market.history("AAPL")
    assert result["as_of"] == "2025-07-03"
    assert result["source"] == "Yahoo Finance via yfinance"
    assert market.history("AAPL") == result
    assert calls == ["AAPL"]


def test_provider_failure_is_actionable_and_not_cached():
    def fail(symbol):
        raise TimeoutError("upstream socket detail")
    with pytest.raises(MarketError, match="try again"):
        MarketData(loader=fail).history("BTC-USD")


def test_unknown_symbol_rejected():
    with pytest.raises(ValueError, match="supported"):
        get_asset("UNSUPPORTED")
