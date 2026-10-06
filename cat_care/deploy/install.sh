#!/usr/bin/env bash
# Установка котохозяйства на сервер одной командой.
# Запуск (от root, из папки cat_care):  bash deploy/install.sh
# Без вопросов:  BOT_TOKEN=123:ABC ALLOWED_USER_IDS= bash deploy/install.sh
#   (ALLOWED_USER_IDS пустой — пускать всех)
#
# Что делает: ставит Python-зависимости и Caddy (HTTPS), создаёт .env,
# настраивает адрес <IP>.sslip.io и автозапуск через systemd.

set -euo pipefail
cd "$(dirname "$0")/.."
APP_DIR="$(pwd)"
PORT=8090

if [ "$(id -u)" -ne 0 ]; then
  echo "Запусти от root:  sudo bash deploy/install.sh"
  exit 1
fi

clean() {  # убрать <> и пробелы по краям (бывают при вставке)
  local v="$1"
  v="$(printf '%s' "$v" | tr -d '<>')"
  v="${v#"${v%%[![:space:]]*}"}"
  v="${v%"${v##*[![:space:]]}"}"
  printf '%s' "$v"
}

echo "================ Котохозяйство: установка ================"
echo

if [ -z "${BOT_TOKEN:-}" ]; then
  read -rp "1) Токен НОВОГО бота от @BotFather: " BOT_TOKEN
fi
BOT_TOKEN="$(clean "$BOT_TOKEN")"
if [[ ! "$BOT_TOKEN" =~ ^[0-9]+:[A-Za-z0-9_-]+$ ]]; then
  echo "Похоже, это не токен бота (должен выглядеть как 123456:ABC-DEF...)."
  exit 1
fi

if [ -n "${ALLOWED_USER_IDS+set}" ]; then
  ALLOWED="$ALLOWED_USER_IDS"
else
  echo
  echo "2) chat_id всех, кто будет пользоваться, через запятую."
  echo "   Каждый может узнать свой у @userinfobot. Пусто — пускать всех."
  read -rp "   chat_id: " ALLOWED
fi
ALLOWED="$(clean "$ALLOWED" | tr -d ' ')"

echo
echo "Определяю IP сервера..."
IP="$(curl -4 -s --max-time 5 https://api.ipify.org || true)"
if [[ ! "$IP" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  read -rp "Не получилось. Введи IP сервера вручную: " IP
  IP="$(clean "$IP")"
fi
HOST="${IP//./-}.sslip.io"
URL="https://$HOST"
echo "Адрес приложения: $URL"

echo
echo "=== Устанавливаю программы ==="
apt-get update -q
apt-get install -y -q python3 python3-venv python3-pip curl gpg ca-certificates

if ! command -v caddy >/dev/null 2>&1; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -q
  apt-get install -y -q caddy
fi

echo
echo "=== Python-зависимости ==="
python3 -m venv .venv
.venv/bin/pip install -q --upgrade pip
.venv/bin/pip install -q -r requirements.txt

echo
echo "=== Файл настроек .env ==="
if [ -f .env ]; then
  cp .env ".env.backup.$(date +%Y%m%d-%H%M%S)"
  echo "Старый .env сохранён в резервную копию."
fi
cat > .env <<EOF
BOT_TOKEN=$BOT_TOKEN
WEBAPP_URL=$URL
ALLOWED_USER_IDS=$ALLOWED
TIMEZONE=Europe/Moscow
REMINDER_TIMES=20:00,22:30
HOST=127.0.0.1
PORT=$PORT
DB_PATH=cats.db
DEV_MODE=0
EOF
chmod 600 .env

echo
echo "=== HTTPS (Caddy) ==="
BUSY="$(ss -ltnp 2>/dev/null | grep -E ':(80|443)\s' | grep -v caddy || true)"
if [ -n "$BUSY" ]; then
  echo "ВНИМАНИЕ: порты 80/443 занимает другая программа:"
  echo "$BUSY"
  echo "Caddy не сможет получить сертификат. Напиши мне — разберёмся."
fi
CADDYFILE=/etc/caddy/Caddyfile
BLOCK="$HOST {
    reverse_proxy 127.0.0.1:$PORT
}"
if [ ! -s "$CADDYFILE" ] || grep -q "/usr/share/caddy" "$CADDYFILE"; then
  # стандартный файл-заглушка — заменяем целиком
  printf '%s\n' "$BLOCK" > "$CADDYFILE"
elif ! grep -q "$HOST" "$CADDYFILE"; then
  # там уже есть чужие настройки — дописываем свой блок
  printf '\n%s\n' "$BLOCK" >> "$CADDYFILE"
fi
systemctl enable caddy >/dev/null 2>&1 || true
systemctl restart caddy

if command -v ufw >/dev/null 2>&1 && ufw status | grep -q "Status: active"; then
  ufw allow 80/tcp >/dev/null
  ufw allow 443/tcp >/dev/null
  echo "Открыл порты 80 и 443 в файрволе."
fi

echo
echo "=== Автозапуск ==="
sed "s#/opt/cat-care/cat_care#$APP_DIR#g" deploy/cat-care.service > /etc/systemd/system/cat-care.service
systemctl daemon-reload
systemctl enable cat-care >/dev/null 2>&1
systemctl restart cat-care

echo
echo "Жду, пока всё запустится (до минуты)..."
OK=""
for _ in $(seq 1 20); do
  if curl -s --max-time 5 -o /dev/null -w '%{http_code}' "$URL/" 2>/dev/null | grep -q 200; then
    OK=1
    break
  fi
  sleep 3
done

echo
if ! systemctl is-active --quiet cat-care; then
  echo "❌ Бот не запустился. Последние строки лога:"
  journalctl -u cat-care -n 20 --no-pager
  exit 1
fi
if [ -n "$OK" ]; then
  echo "✅ Готово! Приложение работает: $URL"
else
  echo "⚠️  Бот запущен, но $URL пока не открывается."
  echo "   Иногда сертификату нужно пару минут. Проверь позже: открой $URL/?demo=1 в браузере."
  echo "   Логи Caddy:  journalctl -u caddy -n 30 --no-pager"
fi
echo
echo "Теперь каждый член семьи открывает бота в Telegram и жмёт /start."
echo "Кнопка «🐾 Котики» слева от поля ввода открывает приложение."
