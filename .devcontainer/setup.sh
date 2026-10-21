#!/usr/bin/env bash
# Roda uma vez por codespace (create/rebuild).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

OPENCODE_VERSION="2.1.1"

echo "==> opencode $OPENCODE_VERSION"
npm uninstall -g opencode-ai >/dev/null 2>&1 || true
npm install -g "@opencode/cli@${OPENCODE_VERSION}" >/dev/null
opencode --version

echo "==> locale"
if ! locale -a 2>/dev/null | grep -qi "^pt_BR.utf8"; then
  sudo apt-get update -qq
  sudo apt-get install -y -qq locales >/dev/null
  sudo sed -i 's/^# *pt_BR.UTF-8/pt_BR.UTF-8/' /etc/locale.gen
  sudo locale-gen
fi

echo "==> dependências"
pnpm install --frozen-lockfile

echo "==> .env"
if [ ! -f .env ]; then
  cp .env.example .env
  echo "    .env criado a partir do .env.example — confira DATABASE_URL"
fi

echo "==> banco"
bash .devcontainer/start.sh
pnpm db:push
pnpm db:seed

echo "==> skills do fluxo"
for s in productivity/grill-me engineering/to-spec engineering/to-tickets engineering/implement-spec; do
  [ -f ".agents/skills/$s/SKILL.md" ] || { echo "    FALTA $s" >&2; exit 1; }
done
echo "    4/4 presentes"

echo
echo "Pronto. Para começar: opencode"
