#!/usr/bin/env bash
# HTTPS для котохозяйства через уже установленный nginx (вместо Caddy).
# Нужен, когда порты 80/443 занимает nginx с другими сайтами.
# Запуск (от root):  bash deploy/nginx_https.sh
# Чужие сайты nginx не трогает: добавляет отдельный файл только для котиков.

set -euo pipefail
cd "$(dirname "$0")/.."
APP_DIR="$(pwd)"

if [ ! -f .env ]; then
  echo "Нет файла .env — сначала запусти deploy/install.sh"
  exit 1
fi
URL="$(grep '^WEBAPP_URL=' .env | cut -d= -f2-)"
HOST="${URL#https://}"
HOST="${HOST%/}"
PORT="$(grep '^PORT=' .env | cut -d= -f2- || true)"
PORT="${PORT:-8090}"
echo "Адрес приложения: https://$HOST  →  127.0.0.1:$PORT"

# Caddy не нужен: он конфликтует с nginx за порты 80/443
if systemctl list-unit-files caddy.service >/dev/null 2>&1; then
  systemctl disable --now caddy >/dev/null 2>&1 || true
fi

echo "=== certbot ==="
if ! command -v certbot >/dev/null 2>&1 || ! dpkg -s python3-certbot-nginx >/dev/null 2>&1; then
  apt-get update -q
  apt-get install -y -q certbot python3-certbot-nginx
fi

echo "=== nginx ==="
if [ -d /etc/nginx/sites-enabled ]; then
  CONF=/etc/nginx/sites-available/cat-care.conf
  LINK=/etc/nginx/sites-enabled/cat-care.conf
else
  CONF=/etc/nginx/conf.d/cat-care.conf
  LINK=""
fi
if [ ! -f "$CONF" ] || ! grep -q "ssl_certificate" "$CONF"; then
  cat > "$CONF" <<EOF
server {
    listen 80;
    server_name $HOST;

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
fi
if [ -n "$LINK" ]; then
  ln -sf "$CONF" "$LINK"
fi
nginx -t
systemctl reload nginx

echo "=== HTTPS-сертификат ==="
certbot --nginx -d "$HOST" --non-interactive --agree-tos \
  --register-unsafely-without-email --redirect --keep-until-expiring
nginx -t
systemctl reload nginx

echo "=== Бот ==="
sed "s#/opt/cat-care/cat_care#$APP_DIR#g" deploy/cat-care.service > /etc/systemd/system/cat-care.service
systemctl daemon-reload
systemctl enable cat-care >/dev/null 2>&1
systemctl restart cat-care

echo
echo "Проверяю..."
OK=""
for _ in $(seq 1 10); do
  if curl -s --max-time 5 -o /dev/null -w '%{http_code}' "https://$HOST/" | grep -q 200; then
    OK=1
    break
  fi
  sleep 2
done
echo
if [ -n "$OK" ] && systemctl is-active --quiet cat-care; then
  echo "✅ Готово! Приложение работает: https://$HOST"
  echo "Закрой мини-приложение в Telegram (если открыто) и открой заново кнопкой «🐾 Котики»."
else
  echo "❌ Что-то не так. Скопируй это сообщение целиком и пришли:"
  systemctl is-active cat-care || true
  journalctl -u cat-care -n 15 --no-pager || true
  curl -sv --max-time 5 "https://$HOST/" -o /dev/null 2>&1 | tail -15 || true
  exit 1
fi
