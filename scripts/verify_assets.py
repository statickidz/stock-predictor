"""Read-only live-provider check for the supported catalog (not a unit test)."""
import json
import sys
import warnings
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import yfinance as yf

from app.assets import ASSETS
from app.config import ROOT
from app.market import normalize_history


def check(asset):
    try:
        ticker = yf.Ticker(asset.symbol)
        frame = ticker.history(period="6mo", interval="1d", auto_adjust=True, actions=False, timeout=20, raise_errors=True)
        metadata = ticker.get_history_metadata()
        expected_types = {"CRYPTOCURRENCY"} if asset.kind == "crypto" else {"EQUITY", "ETF"}
        if metadata.get("currency") != "USD" or metadata.get("instrumentType") not in expected_types:
            raise ValueError("Provider currency/instrument type does not match the catalog")
        if asset.kind == "stock" and metadata.get("exchangeTimezoneName") != "America/New_York":
            raise ValueError("Instrument does not use the supported US trading timezone")
        rows = normalize_history(frame, asset, datetime.now(timezone.utc))
        exchange = metadata.get("fullExchangeName", "")
        if exchange.startswith("Nasdaq"):
            exchange = "NASDAQ"
        elif exchange.replace(" ", "") == "NYSEArca":
            exchange = "NYSE Arca"
        elif asset.kind == "crypto":
            exchange = "Crypto"
        return {"symbol": asset.symbol, "ok": True, "candles": len(rows), "as_of": rows[-1]["date"], "provider_exchange": exchange, "catalog_exchange": asset.exchange, "instrument_type": metadata.get("instrumentType")}
    except Exception as exc:
        return {"symbol": asset.symbol, "ok": False, "error": f"{type(exc).__name__}: {exc}"}


def main():
    warnings.filterwarnings("ignore", category=DeprecationWarning)
    yf.set_tz_cache_location(str(ROOT / ".cache" / "yfinance"))
    results = []
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = [executor.submit(check, asset) for asset in ASSETS]
        for future in as_completed(futures):
            row = future.result()
            results.append(row)
            if not row["ok"] or row.get("provider_exchange") != row.get("catalog_exchange"):
                print(json.dumps(row), flush=True)
            if len(results) % 25 == 0:
                print(f"Checked {len(results)}/{len(ASSETS)} assets", flush=True)
    results.sort(key=lambda row: row["symbol"])
    destination = ROOT / ".cache" / "asset-verification.json"
    destination.parent.mkdir(exist_ok=True)
    destination.write_text(json.dumps({"checked_at": datetime.now(timezone.utc).isoformat(), "assets": results}, indent=2), encoding="utf-8")
    failed = [row for row in results if not row["ok"]]
    mismatches = [row for row in results if row["ok"] and row["provider_exchange"] != row["catalog_exchange"]]
    print(f"Provider check: {len(results) - len(failed)}/{len(results)} valid; {len(mismatches)} exchange labels differ", flush=True)
    return 1 if failed or mismatches else 0


if __name__ == "__main__":
    raise SystemExit(main())
