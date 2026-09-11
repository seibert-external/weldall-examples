#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
npm ci --ignore-scripts
npm run check
(
  cd services/crm
  uv sync --locked
  uv run ruff format --check .
  uv run ruff check .
  uv run pytest -q
)
