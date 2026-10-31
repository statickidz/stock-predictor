import hashlib

from scripts.build_pages import pack_graph, validate_history


def test_model_chunks_round_trip_and_detect_content_changes(tmp_path):
    source = tmp_path / "weights.onnx"
    source.write_bytes(b"abcdefghijk")
    target = tmp_path / "public"
    graph = pack_graph(source, target, chunk_bytes=4)
    assert graph["bytes"] == 11
    assert len(graph["chunks"]) == 3
    assert b"".join((target / c["file"]).read_bytes() for c in graph["chunks"]) == b"abcdefghijk"
    assert graph["chunks"][0]["sha256"] == hashlib.sha256(b"abcd").hexdigest()
    first = graph["chunks"][0]["file"]
    source.write_bytes(b"ABCD")
    changed = pack_graph(source, target, chunk_bytes=4)
    assert changed["chunks"][0]["file"] != first


def test_history_contract_rejects_wrong_forecast_dates():
    import pytest
    history = {"candles": [{"date": "2026-10-30"}], "future_dates": ["2026-10-29", *[f"2026-11-{i:02}" for i in range(1,20)]]}
    with pytest.raises(ValueError, match="future"):
        validate_history(history)
