#!/usr/bin/env sh
set -eu
TASK_ROOT=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)
cd "$TASK_ROOT"
SETUP=0
BUILD=0
if [ ! -f .venv/bin/python ]; then
  python3.12 -m venv .venv
  SETUP=1
fi
while [ "$#" -gt 0 ]; do
  case "$1" in
    --setup) SETUP=1; shift ;;
    --build) BUILD=1; shift ;;
    *) break ;;
  esac
done
if [ "$SETUP" = 1 ]; then
  .venv/bin/python -m pip install -r requirements-torch.txt
  .venv/bin/python -m pip install -r requirements.txt -r requirements-browser.txt
  npm install --global pnpm@11.25.0
  pnpm install --frozen-lockfile --ignore-scripts
fi
if [ "$BUILD" = 1 ] || [ ! -f dist/index.html ]; then
  .venv/bin/python scripts/build_pages.py
fi
exec .venv/bin/python scripts/serve_browser.py "$@"
