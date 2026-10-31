"""Build a complete static Pages artifact; Python is never needed by visitors."""
import argparse
import hashlib
import json
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def pack_graph(source, target, chunk_bytes=16 * 1024 * 1024):
    target.mkdir(parents=True, exist_ok=True)
    chunks = []
    with source.open("rb") as stream:
        while data := stream.read(chunk_bytes):
            digest = hashlib.sha256(data).hexdigest()
            name = f"{digest}.bin"
            (target / name).write_bytes(data)
            chunks.append({"file": name, "sha256": digest, "bytes": len(data)})
    return {"bytes": source.stat().st_size, "chunks": chunks}


def validate_history(history):
    dates = [c["date"] for c in history["candles"]] + history["future_dates"]
    if len(history["future_dates"]) < 20 or any(a >= b for a, b in zip(dates, dates[1:])):
        raise ValueError("Invalid history or future session dates")


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, separators=(",", ":")), encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--models", nargs="+", choices=["mini", "small", "base"], default=["mini", "small", "base"])
    parser.add_argument("--symbols", nargs="+", help="Subset for local verification; default: full catalog")
    parser.add_argument("--offline-data", action="store_true", help="Reuse cached real snapshots without provider access")
    args = parser.parse_args()
    sys.path.insert(0, str(ROOT))
    from app.assets import ASSETS
    from app.market import MarketData, future_dates
    from app.model_specs import MODELS

    out = ROOT / "dist"
    # Never follow a replaced/symlinked build directory during cleanup.
    if out.is_symlink() or out.resolve().parent != ROOT.resolve():
        raise ValueError("Build output must remain inside the repository")
    if out.exists():
        shutil.rmtree(out)
    shutil.copytree(ROOT / "app/static", out)
    runtime = ROOT / "node_modules/onnxruntime-web/dist"
    if not runtime.exists():
        raise SystemExit("Install browser runtime first: pnpm install --frozen-lockfile --ignore-scripts")
    (out / "runtime").mkdir()
    runtime_files = [runtime / "ort.webgpu.min.mjs", *runtime.glob("ort-wasm-*.mjs"), *runtime.glob("ort-wasm-*.wasm")]
    for path in runtime_files:
        shutil.copy2(path, out / "runtime" / path.name)
    # A build-key invalidates cached exports when architecture/export code changes.
    key = hashlib.sha256()
    for path in [ROOT / "scripts/export_browser.py", *sorted((ROOT / "vendor/kronos/model").glob("*.py"))]:
        key.update(path.read_bytes())
    export_key = key.hexdigest()
    profiles = []
    for spec in MODELS:
        if spec.key not in args.models:
            continue
        source = ROOT / ".cache/browser-models" / spec.key
        stamp = source / "export-key"
        if not stamp.exists() or stamp.read_text() != export_key:
            subprocess.run([sys.executable, str(ROOT / "scripts/export_browser.py"), "--model", spec.key,
                            "--output", str(source)], check=True)
            stamp.write_text(export_key)
        manifest = json.loads((source / "manifest.json").read_text())
        target = out / "models" / spec.key
        graphs = {name: pack_graph(source / file, target) for name, file in manifest["graphs"].items()}
        write_json(target / "manifest.json", {**manifest, "graphs": graphs, "format": 1})
        shutil.copy2(source / "fixture.json", target / "fixture.json")
        profiles.append({**spec.to_dict(), "manifest": f"models/{spec.key}/manifest.json",
                         "bytes": sum(g["bytes"] for g in graphs.values())})
    write_json(out / "data/models.json", {"models": profiles, "default": profiles[0]["key"]})

    cache = ROOT / ".cache/pages-history"
    cache.mkdir(parents=True, exist_ok=True)
    market = MarketData(cache_dir=ROOT / ".cache")
    assets, failures = [], []
    for asset in ASSETS:
        if args.symbols and asset.symbol not in args.symbols:
            continue
        path = cache / f"{asset.symbol}.json"
        try:
            if args.offline_data:
                history = json.loads(path.read_text(encoding="utf-8"))
            else:
                history = market.history(asset.symbol)
                history["future_dates"] = future_dates(asset.kind, history["as_of"], 20)
                validate_history(history)
                write_json(path, history)
        except Exception as error:
            print(f"Snapshot warning {asset.symbol}: {error}", flush=True)
            if path.exists():
                history = json.loads(path.read_text(encoding="utf-8"))
            else:
                failures.append(asset.symbol)
                assets.append({**asset.to_dict(), "available": False})
                continue
        validate_history(history)
        write_json(out / "data/history" / f"{asset.symbol}.json", history)
        assets.append({**asset.to_dict(), "available": True})
    if not any(a["available"] for a in assets):
        raise SystemExit("No real market snapshots available; refusing to publish an empty site")
    write_json(out / "data/assets.json", {"assets": assets, "built_at": datetime.now(timezone.utc).isoformat(), "unavailable": failures})
    for name in ["LICENSE", "THIRD_PARTY_NOTICES.md"]:
        shutil.copy2(ROOT / name, out / name)
    shutil.copy2(ROOT / "vendor/kronos/LICENSE", out / "KRONOS-LICENSE.txt")
    shutil.copy2(ROOT / "vendor/onnxruntime-LICENSE.txt", out / "ONNXRUNTIME-LICENSE.txt")
    (out / ".nojekyll").touch()
    size = sum(p.stat().st_size for p in out.rglob("*") if p.is_file())
    if size > 950_000_000:
        raise SystemExit(f"Artifact too large for Pages: {size} bytes")
    print(f"Static artifact: {out} ({size/1e6:.1f} MB); {len(profiles)} models; {len(assets)-len(failures)} snapshots", flush=True)


if __name__ == "__main__":
    main()
