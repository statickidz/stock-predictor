"""Export pinned Kronos models for browser inference and validate ONNX parity."""
import argparse
import json
import sys
from pathlib import Path

import numpy as np
import onnx
import onnxruntime as ort
import torch
from torch import nn

ROOT = Path(__file__).resolve().parents[1]
PROFILES = {
    "mini": ("NeoQuasar/Kronos-mini", "f4e68697d9d5aed55cef5c96aabc3376bcad9f81", "NeoQuasar/Kronos-Tokenizer-2k", "26966d0035065a0cae0ebad7af8ece35bc1fb51c"),
    "small": ("NeoQuasar/Kronos-small", "901c26c1332695a2a8f243eb2f37243a37bea320", "NeoQuasar/Kronos-Tokenizer-base", "0e0117387f39004a9016484a186a908917e22426"),
    "base": ("NeoQuasar/Kronos-base", "2b554741eca47781b64468546e77fef3e85130e6", "NeoQuasar/Kronos-Tokenizer-base", "0e0117387f39004a9016484a186a908917e22426"),
}
sys.path.insert(0, str(ROOT / "vendor" / "kronos"))
from model import Kronos, KronosTokenizer
from model.module import RotaryPositionalEmbedding


class StatelessRotary(nn.Module):
    """Avoid tracing upstream's mutable sequence-length cache into a fixed graph."""
    def __init__(self, rotary):
        super().__init__()
        self.register_buffer("inv_freq", rotary.inv_freq.clone())

    def forward(self, q, k):
        t = torch.arange(q.shape[-2], device=q.device).to(self.inv_freq.dtype)
        freqs = t[:, None] * self.inv_freq[None, :]
        angles = torch.cat((freqs, freqs), -1)[None, None]
        def rotate(x):
            a, b = x.chunk(2, -1)
            return x * angles.cos() + torch.cat((-b, a), -1) * angles.sin()
        return rotate(q), rotate(k)


def replace_rotary(module):
    for name, child in list(module.named_children()):
        if isinstance(child, RotaryPositionalEmbedding):
            setattr(module, name, StatelessRotary(child))
        else:
            replace_rotary(child)


class Encoder(nn.Module):
    def __init__(self, tokenizer):
        super().__init__()
        self.t = tokenizer

    def forward(self, x):
        z = self.t.embed(x)
        for layer in self.t.encoder:
            z = layer(z)
        z = torch.nn.functional.normalize(self.t.quant_embed(z), dim=-1)
        # Inference BSQ uses sign (>0). Float indices avoid int64 WebGPU kernels.
        bits = (z > 0).float()
        n = self.t.s1_bits
        p1 = 2.0 ** torch.arange(n, device=x.device)
        p2 = 2.0 ** torch.arange(self.t.s2_bits, device=x.device)
        return (bits[..., :n] * p1).sum(-1), (bits[..., n:] * p2).sum(-1)


class Decoder(nn.Module):
    def __init__(self, tokenizer):
        super().__init__()
        self.t = tokenizer

    def forward(self, pre, post):
        def unpack(ids, n):
            powers = 2.0 ** torch.arange(n, device=ids.device)
            return torch.remainder(torch.floor(ids[..., None] / powers), 2) * 2 - 1
        bits = torch.cat((unpack(pre, self.t.s1_bits), unpack(post, self.t.s2_bits)), -1)
        z = self.t.post_quant_embed(bits / self.t.codebook_dim ** 0.5)
        for layer in self.t.decoder:
            z = layer(z)
        return self.t.head(z)


class Stage1(nn.Module):
    def __init__(self, model):
        super().__init__()
        self.m = model

    def forward(self, pre, post, stamps):
        logits, context = self.m.decode_s1(pre.long(), post.long(), stamps)
        return logits[:, -1], context


class Stage2(nn.Module):
    def __init__(self, model):
        super().__init__()
        self.m = model

    def forward(self, context, token):
        return self.m.decode_s2(context, token.long())[:, -1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, help="Default: .cache/browser-models/<model>")
    parser.add_argument("--symbol", help="Also prepare real market input (e.g. NVDA)")
    parser.add_argument("--model", choices=PROFILES, default="mini")
    args = parser.parse_args()
    args.output = args.output or ROOT / ".cache/browser-models" / args.model
    torch.set_num_threads(4)
    torch.manual_seed(42)
    cache = str(ROOT / ".cache/huggingface")
    model_id, revision, tokenizer_id, tokenizer_revision = PROFILES[args.model]
    tokenizer = KronosTokenizer.from_pretrained(tokenizer_id, revision=tokenizer_revision, cache_dir=cache).eval()
    model = Kronos.from_pretrained(model_id, revision=revision, cache_dir=cache).eval()
    # Check wrappers against unmodified upstream before replacing rotary modules.
    x = torch.randn(3, 32, 6).clamp(-5, 5)
    stamps = torch.tensor([0, 0, 1, 15, 6], dtype=torch.float32).repeat(3, 32, 1)
    encoder, decoder = Encoder(tokenizer).eval(), Decoder(tokenizer).eval()
    with torch.no_grad():
        pre, post = encoder(x)
        original = tokenizer.encode(x, half=True)
        torch.testing.assert_close(pre.long(), original[0])
        torch.testing.assert_close(post.long(), original[1])
        torch.testing.assert_close(decoder(pre, post), tokenizer.decode(original, half=True))
        expected1 = model.decode_s1(pre.long(), post.long(), stamps)
        token = pre[:, -1:]
        expected2 = model.decode_s2(expected1[1], token.long())[:, -1]
    replace_rotary(tokenizer)
    replace_rotary(model)
    stage1, stage2 = Stage1(model).eval(), Stage2(model).eval()
    with torch.no_grad():
        actual1 = stage1(pre, post, stamps)
        torch.testing.assert_close(actual1[0], expected1[0][:, -1])
        torch.testing.assert_close(actual1[1], expected1[1])
        torch.testing.assert_close(stage2(actual1[1], token), expected2)
    args.output.mkdir(parents=True, exist_ok=True)
    jobs = [
        ("encoder", encoder, (x,), ["x"], ["pre", "post"], {"x": {0: "batch", 1: "seq"}, "pre": {0: "batch", 1: "seq"}, "post": {0: "batch", 1: "seq"}}),
        ("decoder", decoder, (pre, post), ["pre", "post"], ["values"], {n: {0: "batch", 1: "seq"} for n in ["pre", "post", "values"]}),
        ("stage1", stage1, (pre, post, stamps), ["pre", "post", "stamps"], ["logits", "context"], {**{n: {0: "batch", 1: "seq"} for n in ["pre", "post", "stamps", "context"]}, "logits": {0: "batch"}}),
        ("stage2", stage2, (actual1[1], token), ["context", "token"], ["logits"], {"context": {0: "batch", 1: "seq"}, "token": {0: "batch"}, "logits": {0: "batch"}}),
    ]
    sessions = {}
    with torch.no_grad():
        for name, wrapper, inputs, input_names, output_names, axes in jobs:
            path = args.output / f"{name}.onnx"
            torch.onnx.export(wrapper, inputs, str(path), input_names=input_names, output_names=output_names,
                              dynamic_axes=axes, opset_version=17, dynamo=False)
            onnx.checker.check_model(str(path))
            session = ort.InferenceSession(str(path), providers=["CPUExecutionProvider"])
            sessions[name] = session
            # Exercise new batch and sequence lengths, including production context.
            for batch, seq in [(1, 17), (3, 256), (3, 276)]:
                if name == "encoder":
                    sample = (torch.randn(batch, seq, 6),)
                elif name == "stage2":
                    sample = (torch.randn(batch, seq, model.d_model), torch.zeros(batch, 1))
                else:
                    sample = (torch.zeros(batch, seq), torch.zeros(batch, seq))
                    if name == "stage1":
                        sample += (torch.tensor([0, 0, 1, 15, 6]).float().repeat(batch, seq, 1),)
                expected = wrapper(*sample)
                if isinstance(expected, torch.Tensor):
                    expected = (expected,)
                actual = session.run(None, {n: t.numpy() for n, t in zip(input_names, sample)})
                for a, e in zip(actual, expected):
                    np.testing.assert_allclose(a, e.numpy(), rtol=2e-3, atol=2e-4)
            print(f"Validated {name}: {path.stat().st_size / 1e6:.2f} MB", flush=True)

        # Synthetic fixture is explicitly validation data, never presented as market history.
        rng = np.random.default_rng(42)
        candles = []
        from datetime import date, timedelta
        for i in range(256):
            close = 100 + i * 0.1 + float(rng.normal())
            candles.append(dict(date=str(date(2025, 1, 1) + timedelta(days=i)), open=close - .2,
                                high=close + 1, low=close - 1, close=close, volume=1000 + i * 7))
        dates = [str(date(2025, 1, 1) + timedelta(days=256 + i)) for i in range(5)]
        sys.path.insert(0, str(ROOT))
        import pandas as pd
        from model.kronos import calc_time_stamps
        frame = pd.DataFrame(candles)
        frame["amount"] = frame.volume * frame[["open", "high", "low", "close"]].mean(axis=1)
        raw = frame[["open", "high", "low", "close", "volume", "amount"]].values.astype(np.float32)
        mean, std = raw.mean(0), raw.std(0)
        normalized = np.clip((raw - mean) / (std + 1e-5), -5, 5)
        data = torch.tensor(normalized).unsqueeze(0).repeat(3, 1, 1)
        time = calc_time_stamps(pd.Series(pd.to_datetime(frame.date.tolist() + dates)))
        all_stamps = torch.tensor(time.values.astype(np.float32)).unsqueeze(0).repeat(3, 1, 1)
        p, q = encoder(data)
        forced = []
        reference_logits = []
        for i in range(5):
            logits, context = stage1(p, q, all_stamps[:, :256+i])
            a = logits.argmax(-1).float().unsqueeze(-1)
            logits2 = stage2(context, a)
            b = logits2.argmax(-1).float().unsqueeze(-1)
            reference_logits.append([logits.flatten().tolist(), logits2.flatten().tolist()])
            forced.append([a[:, 0].tolist(), b[:, 0].tolist()])
            p, q = torch.cat((p, a), 1), torch.cat((q, b), 1)
        decoded = decoder(p, q).mean(0).numpy() * (std + 1e-5) + mean
        fixture = {"label": "Synthetic parity fixture (not market data)", "candles": candles,
                   "future_dates": dates, "forced_tokens": forced, "reference_logits": reference_logits,
                   "expected_closes": decoded[-5:, 3].tolist()}
        (args.output / "fixture.json").write_text(json.dumps(fixture), encoding="utf-8")
        (args.output / "manifest.json").write_text(json.dumps({"model": model_id, "revision": revision,
            "tokenizer": tokenizer_id, "tokenizer_revision": tokenizer_revision, "context": 256, "samples": 3,
            "graphs": {n: f"{n}.onnx" for n in sessions}}), encoding="utf-8")
    if args.symbol:
        from app.market import MarketData, future_dates
        history = MarketData(cache_dir=ROOT / ".cache").history(args.symbol)
        candles = history["candles"][-256:]
        payload = {"label": args.symbol, "candles": candles,
                   "future_dates": future_dates(history["asset"]["kind"], candles[-1]["date"], 5)}
        (args.output.parent / "input.json").write_text(json.dumps(payload), encoding="utf-8")
    print("Export and CPU parity checks passed.")


if __name__ == "__main__":
    main()
