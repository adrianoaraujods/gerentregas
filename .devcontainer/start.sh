#!/usr/bin/env bash
# Idempotente: garante Postgres instalado, na 5433, com role e banco.
# Roda no postCreate e em todo start/resume. Também serve como reparo manual.
set -euo pipefail

PGPORT=5433

if pg_isready -h 127.0.0.1 -p "$PGPORT" -q 2>/dev/null; then
  exit 0
fi

if ! command -v pg_ctlcluster >/dev/null 2>&1; then
  echo "==> instalando postgres"
  sudo apt-get update -qq
  sudo apt-get install -y -qq postgresql >/dev/null
fi

PGVER="$(ls /etc/postgresql 2>/dev/null | sort -V | tail -1)"
if [ -z "$PGVER" ]; then
  echo "Nenhum cluster em /etc/postgresql. Rode: sudo pg_createcluster 17 main" >&2
  exit 1
fi

CONF="/etc/postgresql/${PGVER}/main/postgresql.conf"
grep -qx "port = ${PGPORT}" "$CONF" || sudo sed -i "s/^port = .*/port = ${PGPORT}/" "$CONF"
sudo pg_ctlcluster "$PGVER" main restart 2>/dev/null \
  || sudo pg_ctlcluster "$PGVER" main start 2>/dev/null \
  || true

# O global-setup dos testes faz DROP/CREATE DATABASE, então o role precisa de SUPERUSER.
if ! sudo -u postgres psql -p "$PGPORT" -tAc "SELECT 1 FROM pg_roles WHERE rolname='gerentregas'" 2>/dev/null | grep -q 1; then
  sudo -u postgres psql -p "$PGPORT" -c "CREATE ROLE gerentregas LOGIN PASSWORD 'gerentregas' SUPERUSER"
fi
if ! sudo -u postgres psql -p "$PGPORT" -tAc "SELECT 1 FROM pg_database WHERE datname='gerentregas'" 2>/dev/null | grep -q 1; then
  sudo -u postgres createdb -p "$PGPORT" -O gerentregas gerentregas
fi

for _ in $(seq 1 30); do
  if pg_isready -h 127.0.0.1 -p "$PGPORT" -q 2>/dev/null; then
    exit 0
  fi
  sleep 1
done

echo "Postgres não respondeu na ${PGPORT}. Diagnóstico:" >&2
sudo pg_lsclusters >&2 || true
exit 1
