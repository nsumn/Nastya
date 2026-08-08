#!/usr/bin/env bash
# Запускает панель фоном, а бота — основным процессом.
# Если PANEL_BOT_TOKEN не задан, панель просто не стартует.
set -u

mkdir -p "$(dirname "${OP_STATE_FILE:-/data/op_state.json}")" 2>/dev/null || true

if [ -n "${PANEL_BOT_TOKEN:-}" ]; then
  python -m panel.main &
  PANEL_PID=$!
  echo "Панель запущена (pid $PANEL_PID)"
  trap 'kill $PANEL_PID 2>/dev/null' EXIT
fi

exec python -m bot.main
