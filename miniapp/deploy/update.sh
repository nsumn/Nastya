#!/usr/bin/env bash
# Обновление до свежего кода — одной командой:
#
#   sudo bash /opt/voxy/miniapp/deploy/update.sh
#
# Забирает изменения из GitHub, доставляет зависимости, возвращает права
# служебному пользователю и перезапускает бота. Настройки (.env), база и
# состояние подписки не трогаются.
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_DIR="$(cd "$APP_DIR/.." && pwd)"
SERVICE="${SERVICE:-voxy}"
USER_NAME="${USER_NAME:-voxy}"

say()  { printf '\n\033[1;35m▸ %s\033[0m\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
die()  { printf '\n\033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Запусти от root: sudo bash $0"

say "Забираю изменения"
# Папка принадлежит служебному пользователю, а команду запускают от root —
# без этого git отказывается работать («dubious ownership»).
git config --global --add safe.directory "$REPO_DIR" 2>/dev/null || true
before="$(git -C "$REPO_DIR" rev-parse --short HEAD 2>/dev/null || echo '?')"
git -C "$REPO_DIR" pull --ff-only
after="$(git -C "$REPO_DIR" rev-parse --short HEAD)"
if [ "$before" = "$after" ]; then
    ok "уже последняя версия ($after)"
else
    ok "$before → $after"
    git -C "$REPO_DIR" log --oneline "$before..$after" | head -10 | sed 's/^/    /'
fi

say "Проверяю зависимости"
# venv могли не создать или удалить — тогда собираем заново.
[ -x "$APP_DIR/.venv/bin/pip" ] || python3 -m venv "$APP_DIR/.venv"
"$APP_DIR/.venv/bin/pip" install -q --upgrade pip
"$APP_DIR/.venv/bin/pip" install -q -r "$APP_DIR/requirements.txt"
ok "готово"

say "Права и перезапуск"
id -u "$USER_NAME" >/dev/null 2>&1 && chown -R "$USER_NAME:$USER_NAME" "$REPO_DIR"
systemctl restart "$SERVICE"
systemctl is-enabled --quiet "$SERVICE-panel" 2>/dev/null \
    && systemctl restart "$SERVICE-panel" || true
sleep 4

if systemctl is-active --quiet "$SERVICE"; then
    ok "служба $SERVICE работает"
else
    journalctl -u "$SERVICE" -n 20 --no-pager || true
    die "служба не поднялась — логи выше"
fi

say "Проверяю приложение"
port="$(grep -E '^PORT=' "$APP_DIR/.env" | cut -d= -f2 | tr -d '[:space:]')"
port="${port:-8080}"
code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$port/health" || true)"
[ "$code" = "200" ] && ok "локально отвечает (порт $port)" || warn "локально код $code"

domain="$(grep -E '^PUBLIC_BASE_URL=' "$APP_DIR/.env" | cut -d= -f2- | tr -d '[:space:]')"
if [ -n "$domain" ]; then
    title="$(curl -s --max-time 15 "$domain/app/" | grep -o '<title>[^<]*</title>' || true)"
    [ -n "$title" ] && ok "снаружи отдаётся: ${title#<title>}" \
        || warn "снаружи приложение не ответило — проверь nginx и сертификат"
fi

printf '\nГотово. В Telegram закрой мини-апп и открой заново.\n\n'
