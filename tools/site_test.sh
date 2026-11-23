#!/bin/bash
# Run every part of tools/site_test.py in its own process with a time limit, so one hanging view cannot stop the rest.
BASE="${1:-https://recurrentanalytics.github.io/wal.funk_891/}"
cd "$(dirname "$0")/.."
for part in main:de main:en main:zh main:de:phone sub:de sub:en sub:zh; do
  echo "=== $part"
  timeout 420 uv run --no-project --python 3.12 --with "playwright>=1.49,<1.56" python tools/site_test.py "$BASE" "$part" 2>&1 | grep -E "^(OK|FAIL|WARN)|checks:" || echo "FAIL $part timed out or crashed"
done
