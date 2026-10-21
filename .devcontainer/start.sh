#!/usr/bin/env bash
# Idempotente: garante um cluster Postgres do próprio usuário na 5433.
# Sem sudo: o cluster vive em $HOME e é iniciado pelo usuário `node`.
set -euo pipefail

PGPORT="${PGPORT:-5433}"
PGDATA="${PGDATA:-$HOME/.pgdata}"

if pg_isready -h 127.0.0.1 -p "$PGPORT" -q 2>/dev/null; then
  exit 0
fi

PGBIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1 || true)"
if [ -z "$PGBIN" ]; then
  echo "Postgres não está na imagem. Rebuild o container." >&2
  exit 1
fi

if [ ! -d "$PGDATA" ]; then
  echo "==> initdb em $PGDATA"
  "$PGBIN/initdb" -D "$PGDATA" -U postgres --auth=trust --encoding=UTF8 >/dev/null
fi

# Codespace parado no meio deixa postmaster.pid órfão e o pg_ctl recusa subir.
if [ -f "$PGDATA/postmaster.pid" ] && ! kill -0 "$(head -1 "$PGDATA/postmaster.pid")" 2>/dev/null; then
  rm -f "$PGDATA/postmaster.pid"
fi

echo "==> subindo postgres na $PGPORT"
if ! "$PGBIN/pg_ctl" -D "$PGDATA" -l "$PGDATA/server.log" \
  -o "-p $PGPORT -k /tmp -c listen_addresses=localhost" start >/dev/null; then
  tail -20 "$PGDATA/server.log" >&2
  exit 1
fi

for _ in $(seq 1 30); do
  pg_isready -h 127.0.0.1 -p "$PGPORT" -q 2>/dev/null && break
  sleep 1
done
if ! pg_isready -h 127.0.0.1 -p "$PGPORT" -q 2>/dev/null; then
  echo "Postgres não respondeu na $PGPORT:" >&2
  tail -20 "$PGDATA/server.log" >&2
  exit 1
fi

# O global-setup dos testes faz DROP/CREATE DATABASE, então o role precisa de SUPERUSER.
q() { psql -h 127.0.0.1 -p "$PGPORT" -U postgres -d postgres -tAc "$1"; }
[ "$(q "SELECT 1 FROM pg_roles WHERE rolname='gerentregas'")" = "1" ] \
  || psql -h 127.0.0.1 -p "$PGPORT" -U postgres -d postgres \
    -c "CREATE ROLE gerentregas LOGIN PASSWORD 'gerentregas' SUPERUSER"
[ "$(q "SELECT 1 FROM pg_database WHERE datname='gerentregas'")" = "1" ] \
  || createdb -h 127.0.0.1 -p "$PGPORT" -U postgres -O gerentregas gerentregas
