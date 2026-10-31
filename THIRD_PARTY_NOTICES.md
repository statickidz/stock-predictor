# Third-party notices

## Kronos

Source: https://github.com/shiyu-coder/Kronos

Pinned commit: `67b630e67f6a18c9e9be918d9b4337c960db1e9a`.

The upstream `model/__init__.py`, `model/kronos.py`, and `model/module.py` are included unmodified under `tools/model-export/vendor/kronos`. The upstream MIT license is preserved there. These sources are optional model-preparation tooling, not application/runtime code.

Model weights are fetched separately from Hugging Face. Default repositories:

- https://huggingface.co/NeoQuasar/Kronos-small
- https://huggingface.co/NeoQuasar/Kronos-Tokenizer-base
- https://huggingface.co/NeoQuasar/Kronos-mini
- https://huggingface.co/NeoQuasar/Kronos-Tokenizer-2k
- https://huggingface.co/NeoQuasar/Kronos-base

Refer to those model repositories for model-specific terms and provenance.

## Market data

yahoo-finance2 source: https://github.com/gadicc/yahoo-finance2

The Node market adapter uses the independent yahoo-finance2 project and is not affiliated with Yahoo. Yahoo data access is intended for personal research; static packaging does not grant redistribution or commercial data rights. For public/commercial snapshot publication, use a properly licensed provider through the adapter boundary in scripts/lib/market.mjs. Previously cached snapshots retain their original source provenance.

Application and optional model-tool dependencies retain their own licenses in installed package metadata.

## Exchange sessions

data/calendar/XNYS.json is a generated exchange-session dataset from exchange_calendars 4.13.2, covering 2020–2035. Its provenance and bounds are embedded in the dataset. Source: https://github.com/gerrymanoim/exchange_calendars. It includes historical exceptional closures and UTC close times; newly announced closures require maintenance. The source project's Apache-2.0 license and a dataset attribution notice are preserved beside the calendar and distributed with the site.

## ONNX Runtime Web

The static artifact redistributes ONNX Runtime Web 1.24.2 and associated WebAssembly runtime variants under the MIT license. Its license is preserved at vendor/onnxruntime-LICENSE.txt and copied to ONNXRUNTIME-LICENSE.txt in the artifact. Source: https://github.com/microsoft/onnxruntime/tree/v1.24.2.

Exported Kronos graphs are transformations of the pinned model weights, whose model/tokenizer IDs and revisions are recorded in their manifests. Public snapshot publication requires appropriate market-data redistribution rights; GitHub Pages packaging does not grant them.
