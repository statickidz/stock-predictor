import pytest

from app.config import Settings
from app.model_specs import available_models, resolve_model


def test_catalog_and_mini_tokenizer_are_explicit():
    models = {model.key: model for model in available_models(Settings())}
    assert set(models) == {"mini", "small", "base"}
    assert models["mini"].tokenizer_id == "NeoQuasar/Kronos-Tokenizer-2k"
    assert models["small"].tokenizer_id == models["base"].tokenizer_id == "NeoQuasar/Kronos-Tokenizer-base"
    assert resolve_model(None, Settings()).key == "small"
    with pytest.raises(ValueError, match="supported"):
        resolve_model("arbitrary/model", Settings())


def test_server_default_and_custom_paths_are_preserved():
    assert resolve_model(None, Settings(model_id="NeoQuasar/Kronos-base")).key == "base"
    custom = Settings(model_id="/models/finetuned", tokenizer_id="/models/tokenizer")
    assert resolve_model(None, custom).key == "configured"
    assert resolve_model("configured", custom).model_id == "/models/finetuned"
    assert resolve_model("mini", custom).tokenizer_id == "NeoQuasar/Kronos-Tokenizer-2k"


def test_mini_environment_default_automatically_pairs_its_tokenizer(monkeypatch):
    monkeypatch.delenv("KRONOS_TOKENIZER", raising=False)
    settings = Settings(model_id="NeoQuasar/Kronos-mini")
    assert settings.tokenizer_id == "NeoQuasar/Kronos-Tokenizer-2k"
    assert resolve_model(None, settings).key == "mini"
