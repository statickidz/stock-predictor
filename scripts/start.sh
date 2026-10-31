#!/usr/bin/env sh
set -eu
TASK_ROOT=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)
cd "$TASK_ROOT"
SETUP=0
if [ ! -f .venv/bin/python ]; then
  python3.12 -m venv .venv
  SETUP=1
fi
if [ "${1:-}" = '--setup' ]; then
  SETUP=1
  shift
fi
if [ "$SETUP" = 1 ]; then
  .venv/bin/python -m pip install -r requirements-torch.txt
  .venv/bin/python -m pip install -r requirements.txt
fi
exec .venv/bin/python -m app "$@"
