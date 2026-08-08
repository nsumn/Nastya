#!/usr/bin/env bash
# Установка RB DAYS (бот-проверялка Roblox) и админ-панели на свой сервер.
#
# Запуск на сервере одной строкой:
#   bash <(curl -fsSL https://raw.githubusercontent.com/nsumn/Nastya/claude/telegram-roblox-account-checker-633oas/deploy/install.sh)
#
# Скрипт ставит всё в отдельную папку /opt/rbdays и заводит свои службы,
# поэтому уже работающий бот (например, с ОГЭ) не трогается.
set -euo pipefail

BRANCH="claude/telegram-roblox-account-checker-633oas"
DIR="/opt/rbdays"
PORT="8081"          # у бота с ОГЭ обычно занят 8080

say() { printf "\n\033[1;35m%s\033[0m\n" "$*"; }
ask() { local p="$1" d="${2:-}" v; read -rp "$p" v; echo "${v:-$d}"; }

[ "$(id -u)" -eq 0 ] || { echo "Запускай от root: sudo bash ..."; exit 1; }

say "1/6 · Что нужно ввести"
GH_TOKEN=$(ask "Токен GitHub (ghp_...), репозиторий приватный: ")
BOT_TOKEN=$(ask "Токен бота-проверялки (RB DAYS): ")
ADMIN_ID=$(ask "Твой Telegram ID [413124905]: " "413124905")
PANEL_TOKEN=$(ask "Токен бота-панели (можно оставить пустым): ")
# Домен нужен только ради https — Telegram открывает мини-приложение лишь по нему.
# Покупать не обязательно: бесплатный поддомен на duckdns.org подходит,
# например rbdays.duckdns.org (в личном кабинете DuckDNS укажи IP этого сервера).
DOMAIN=$(ask "Домен для мини-приложения (rbdays.duckdns.org или свой; пусто — без мини-аппа): ")

say "2/6 · Ставлю системные пакеты"
apt-get update -qq
apt-get install -y -qq python3 python3-venv python3-pip git curl >/dev/null

say "3/6 · Забираю код в $DIR"
if [ -d "$DIR/.git" ]; then
  git -C "$DIR" remote set-url origin "https://${GH_TOKEN}@github.com/nsumn/Nastya.git"
  git -C "$DIR" fetch origin "$BRANCH" --quiet
  git -C "$DIR" checkout -B "$BRANCH" "origin/$BRANCH" --quiet
else
  git clone -q -b "$BRANCH" "https://${GH_TOKEN}@github.com/nsumn/Nastya.git" "$DIR"
fi

say "4/6 · Зависимости"
python3 -m venv "$DIR/.venv"
"$DIR/.venv/bin/pip" install -q --upgrade pip
"$DIR/.venv/bin/pip" install -q -r "$DIR/requirements.txt"

say "5/6 · Настройки (.env)"
cat > "$DIR/.env" <<EOF
BOT_TOKEN=$BOT_TOKEN
ADMIN_CHAT_ID=$ADMIN_ID
BOT_MODE=roblox
PORT=$PORT
DB_PATH=$DIR/bot.db
OP_STATE_FILE=$DIR/op_state.json
PANEL_BOT_TOKEN=$PANEL_TOKEN
PANEL_ADMIN_ID=$ADMIN_ID
EOF
[ -n "$DOMAIN" ] && echo "PUBLIC_BASE_URL=https://$DOMAIN" >> "$DIR/.env"
chmod 600 "$DIR/.env"

say "6/6 · Службы systemd"
cat > /etc/systemd/system/rbdays-bot.service <<EOF
[Unit]
Description=RB DAYS — Roblox age bot
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$DIR
ExecStart=$DIR/.venv/bin/python -m bot.main
Restart=always
RestartSec=5
User=root

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now rbdays-bot >/dev/null

if [ -n "$PANEL_TOKEN" ]; then
  cat > /etc/systemd/system/rbdays-panel.service <<EOF
[Unit]
Description=RB DAYS — админ-панель ОП
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$DIR
ExecStart=$DIR/.venv/bin/python -m panel.main
Restart=always
RestartSec=5
User=root

[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload
  systemctl enable --now rbdays-panel >/dev/null
fi

if [ -n "$DOMAIN" ]; then
  say "Домен: ставлю nginx и бесплатный сертификат"
  apt-get install -y -qq nginx certbot python3-certbot-nginx >/dev/null
  cat > "/etc/nginx/sites-available/$DOMAIN" <<EOF
server {
    listen 80;
    server_name $DOMAIN;
    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
  ln -sf "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/$DOMAIN"
  nginx -t && systemctl reload nginx
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos \
          --register-unsafely-without-email --redirect || \
    echo "⚠️ Сертификат не выдан — проверь, что домен уже указывает на этот сервер (A-запись)."
  systemctl restart rbdays-bot
fi

say "Готово"
echo "Бот:    systemctl status rbdays-bot"
[ -n "$PANEL_TOKEN" ] && echo "Панель: systemctl status rbdays-panel"
[ -n "$DOMAIN" ] && echo "Мини-приложение: https://$DOMAIN/app"
echo
echo "Логи:   journalctl -u rbdays-bot -f"
echo "Обновить код: cd $DIR && git pull && systemctl restart rbdays-bot rbdays-panel"
