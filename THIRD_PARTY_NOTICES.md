# Third-party notices

## Kronos

Source: https://github.com/shiyu-coder/Kronos

Pinned commit: `67b630e67f6a18c9e9be918d9b4337c960db1e9a`.

The upstream `model/__init__.py`, `model/kronos.py`, and `model/module.py` are included unmodified under `vendor/kronos`. The upstream MIT license is preserved at `vendor/kronos/LICENSE`.

Model weights are fetched separately from Hugging Face. Default repositories:

- https://huggingface.co/NeoQuasar/Kronos-small
- https://huggingface.co/NeoQuasar/Kronos-Tokenizer-base
- https://huggingface.co/NeoQuasar/Kronos-mini
- https://huggingface.co/NeoQuasar/Kronos-Tokenizer-2k
- https://huggingface.co/NeoQuasar/Kronos-base

Refer to those model repositories for model-specific terms and provenance.

## Market data

yfinance documentation: https://ranaroussi.github.io/yfinance/

yfinance is an independent open-source project and is not affiliated with Yahoo. Its documentation states that Yahoo Finance data access is intended for personal use. This application's default provider is for personal/research use. Server packaging does not grant redistribution or commercial data rights. For public/commercial service, replace `MarketData._load` with a provider licensed for that use, preserving the normalized OHLCV interface.

Python dependencies retain their own licenses in installed package metadata.
