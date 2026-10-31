import logging
import time
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from pathlib import Path
from threading import Lock

import exchange_calendars as xcals
import numpy as np
import pandas as pd

from .assets import Asset, get_asset
from .config import ROOT

logger = logging.getLogger(__name__)


class MarketError(Exception):
    pass


@lru_cache(maxsize=8)
def calendar(year):
    return xcals.get_calendar("XNYS", start=f"{year - 3}-01-01", end=f"{year + 3}-12-31")


def future_dates(kind: str, last_date: str, horizon: int) -> list[str]:
    start = pd.Timestamp(last_date) + pd.Timedelta(days=1)
    if kind == "crypto":
        dates = pd.date_range(start, periods=horizon, freq="D")
    else:
        dates = calendar(start.year).sessions_in_range(start, start + pd.Timedelta(days=horizon * 4 + 20))[:horizon]
    if len(dates) != horizon:
        raise MarketError("Trading calendar is unavailable for these forecast dates.")
    return [date.strftime("%Y-%m-%d") for date in dates]


def normalize_history(frame: pd.DataFrame, asset: Asset, now: datetime) -> list[dict]:
    if frame is None or frame.empty:
        raise MarketError("No price history returned. Please try again shortly.")
    frame = frame.copy()
    frame.columns = [str(col).lower() for col in frame.columns]
    required = ["open", "high", "low", "close", "volume"]
    if not set(required).issubset(frame.columns):
        raise MarketError("The provider returned incomplete OHLCV data. Please try again.")
    frame = frame[required].apply(pd.to_numeric, errors="coerce")
    frame["date"] = [pd.Timestamp(date).strftime("%Y-%m-%d") for date in frame.index]
    frame = frame.drop_duplicates("date", keep="last").sort_values("date")
    now = pd.Timestamp(now).tz_convert("UTC")
    rows = []
    for record in frame.to_dict("records"):
        values = [record[key] for key in required]
        if not np.isfinite(values).all() or min(values[:4]) <= 0 or record["volume"] < 0:
            continue
        if record["low"] > min(record["open"], record["close"]) or record["high"] < max(record["open"], record["close"]):
            continue
        day = pd.Timestamp(record["date"])
        if asset.kind == "crypto":
            complete = day.date() < now.date()
        else:
            exchange = calendar(day.year)
            complete = exchange.is_session(day) and exchange.session_close(day) + pd.Timedelta(minutes=1) <= now
        if complete:
            rows.append({"date": record["date"], **{key: float(record[key]) for key in required}})
    if len(rows) < 64:
        raise MarketError("At least 64 valid completed daily candles are required. Please try another asset.")
    return rows[-512:]


class MarketData:
    def __init__(self, loader=None, now=None, cache_dir: Path | None = None):
        self.loader = loader or self._load
        self.now = now or (lambda: datetime.now(timezone.utc))
        self.cache_dir = cache_dir or ROOT / ".cache"
        self._cache = {}
        self._lock = Lock()

    def _load(self, symbol):
        import yfinance as yf
        yf.set_tz_cache_location(str(self.cache_dir / "yfinance"))
        return yf.Ticker(symbol).history(period="2y", interval="1d", auto_adjust=True, actions=False, timeout=20, raise_errors=True)

    def history(self, symbol: str) -> dict:
        asset = get_asset(symbol)
        # Serialize provider access: yfinance has process-global caches/session state.
        with self._lock:
            cached = self._cache.get(symbol)
            if cached and time.monotonic() - cached[0] < 300:
                return cached[1]
            try:
                frame = self.loader(symbol)
                now = self.now()
                candles = normalize_history(frame, asset, now)
            except MarketError:
                raise
            except Exception as exc:
                logger.warning("Market data failed for %s: %s", symbol, type(exc).__name__)
                raise MarketError("Market data is unavailable. Please try again shortly.") from exc
            result = {"asset": asset.to_dict(), "candles": candles, "as_of": candles[-1]["date"], "fetched_at": now.isoformat(), "source": "Yahoo Finance via yfinance", "adjusted": True}
            self._cache[symbol] = (time.monotonic(), result)
            return result
