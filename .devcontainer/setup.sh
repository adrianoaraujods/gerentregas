#!/usr/bin/env bash
# Roda uma vez por codespace (create/rebuild).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

OPENCODE_VERSION="1.19.3"
PGPORT=5433

echo "==> opencode $OPENCODE_VERSION"
npm install -g "opencode-ai@${OPENCODE_VERSION}" >/dev/null
opencode --version

echo "==> dependências"
pnpm install --frozen-lockfile

echo "==> .env"
if [ ! -f .env ]; then
  cp .env.example .env
  echo "    .env criado a partir do .env.example — confira DATABASE_URL"
fi

echo "==> postgres"
sudo apt-get update -qq
sudo apt-get install -y -qq postgresql >/dev/null
PGVER="$(ls /etc/postgresql | sort -V | tail -1)"
sudo sed -i "s/^port = .*/port = ${PGPORT}/" "/etc/postgresql/${PGVER}/main/postgresql.conf"
sudo pg_ctlcluster "$PGVER" main start || true

# O global-setup dos testes faz DROP/CREATE DATABASE, então o role precisa de SUPERUSER.
if ! sudo -u postgres psql -p "$PGPORT" -tAc "SELECT 1 FROM pg_roles WHERE rolname='gerentregas'" | grep -q 1; then
  sudo -u postgres psql -p "$PGPORT" -c "CREATE ROLE gerentregas LOGIN PASSWORD 'gerentregas' SUPERUSER"
fi
if ! sudo -u postgres psql -p "$PGPORT" -tAc "SELECT 1 FROM pg_database WHERE datname='gerentregas'" | grep -q 1; then
  sudo -u postgres createdb -p "$PGPORT" -O gerentregas gerentregas
fi

echo "==> schema e seed"
pnpm db:push
pnpm db:seed

echo "==> skills do fluxo"
for s in productivity/grill-me engineering/to-spec engineering/to-tickets engineering/implement-spec; do
  [ -f ".agents/skills/$s/SKILL.md" ] || { echo "    FALTA $s" >&2; exit 1; }
done
echo "    4/4 presentes"

echo
echo "Pronto. Para começar: opencode"
