#!/usr/bin/env bash
# Idempotente: roda no postCreate e em todo start/resume.
set -euo pipefail

if pg_isready -h 127.0.0.1 -p 5433 -q 2>/dev/null; then
  exit 0
fi

PGVER="$(ls /etc/postgresql 2>/dev/null | sort -V | tail -1)"
if [ -n "$PGVER" ]; then
  sudo pg_ctlcluster "$PGVER" main start || true
fi

for _ in $(seq 1 30); do
  if pg_isready -h 127.0.0.1 -p 5433 -q 2>/dev/null; then
    exit 0
  fi
  sleep 1
done

echo "Postgres não respondeu na 5433. Rode: sudo pg_lsclusters" >&2
exit 1
