import pytest

from app.assets import ASSETS, get_asset


def test_inventory_covers_more_sectors_etfs_and_cryptocurrencies():
    stocks = [asset for asset in ASSETS if asset.kind == "stock"]
    crypto = [asset for asset in ASSETS if asset.kind == "crypto"]
    assert len(stocks) >= 100
    assert len(crypto) >= 30
    for symbol in ("JPM", "XOM", "JNJ", "CAT", "QQQ", "VTI", "GLD", "TLT"):
        assert get_asset(symbol).kind == "stock"
    for symbol in ("ADA-USD", "DOGE-USD", "LINK-USD", "AVAX-USD", "LTC-USD"):
        assert get_asset(symbol).kind == "crypto"


def test_inventory_symbols_are_unique_with_usable_display_metadata():
    assert len({asset.symbol for asset in ASSETS}) == len(ASSETS)
    assert all(asset.name and asset.exchange and asset.currency == "USD" for asset in ASSETS)
    assert all(asset.kind in ("stock", "crypto") for asset in ASSETS)
    assert all(asset.symbol.endswith("-USD") for asset in ASSETS if asset.kind == "crypto")
    assert all(get_asset(asset.symbol) is asset for asset in ASSETS)


@pytest.mark.parametrize("symbol", ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "SPY", "BTC-USD", "ETH-USD", "SOL-USD", "XRP-USD"])
def test_original_assets_stay_available(symbol):
    assert get_asset(symbol).symbol == symbol
