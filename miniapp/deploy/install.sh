#!/usr/bin/env bash
# Установка JOWS одной командой — без ручной правки файлов.
#
#   bash /opt/jows/miniapp/deploy/install.sh
#
# Всё, чего не хватает, скрипт спросит. Можно передать заранее:
#
#   BOT_TOKEN=123:AA... ADMIN_ID=413124905 DOMAIN=otzzzzzi.duckdns.org \
#   bash /opt/jows/miniapp/deploy/install.sh
#
# Повторный запуск безопасен: обновляет .env, конфиг nginx и перезапускает
# службу. Чужие боты на сервере не трогает — своя папка, свой порт.
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# Имя службы: новое — jows, но на серверах, поставленных раньше, она
# называется voxy. Берём ту, что реально существует.
detect_service() {
    for name in jows voxy; do
        if systemctl cat "$name.service" >/dev/null 2>&1; then
            echo "$name"; return
        fi
    done
    echo jows
}
SERVICE="${SERVICE:-$(detect_service)}"
USER_NAME="${USER_NAME:-jows}"

say()  { printf '\n\033[1;35m▸ %s\033[0m\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
die()  { printf '\n\033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Запусти от root: sudo bash $0"

ask() {                      # ask ПЕРЕМЕННАЯ "вопрос" "значение по умолчанию"
    local var="$1" prompt="$2" default="${3:-}" answer
    if [ -n "${!var:-}" ]; then return; fi
    if [ -n "$default" ]; then
        read -r -p "$prompt [$default]: " answer </dev/tty || true
        answer="${answer:-$default}"
    else
        read -r -p "$prompt: " answer </dev/tty || true
    fi
    [ -n "$answer" ] || die "Пустой ответ — прерываю."
    printf -v "$var" '%s' "$answer"
}

# ---------- вопросы ----------

say "Настройка"
ask BOT_TOKEN "Токен бота от @BotFather"
ask ADMIN_ID  "Твой Telegram ID (узнать у @userinfobot)"
ask DOMAIN    "Домен мини-аппа (без https://)"
ask PORT      "Локальный порт" "8082"
PANEL_BOT_TOKEN="${PANEL_BOT_TOKEN:-}"
DUCKDNS_TOKEN="${DUCKDNS_TOKEN:-}"

case "$ADMIN_ID" in ''|*[!0-9]*) die "ID должен быть числом: $ADMIN_ID";; esac
case "$PORT"     in ''|*[!0-9]*) die "Порт должен быть числом: $PORT";; esac
case "$BOT_TOKEN" in *:*) ;; *) die "Токен не похож на токен: $BOT_TOKEN";; esac
DOMAIN="${DOMAIN#http://}"; DOMAIN="${DOMAIN#https://}"; DOMAIN="${DOMAIN%%/*}"

# ---------- порт ----------

say "Проверяю порт $PORT"
if ss -lntp 2>/dev/null | grep -q ":$PORT "; then
    ss -lntp | grep ":$PORT " || true
    die "Порт $PORT уже занят. Запусти снова с другим: PORT=8083 bash $0"
fi
ok "порт свободен"

# ---------- DuckDNS ----------

if [ -n "$DUCKDNS_TOKEN" ]; then
    say "Обновляю IP на DuckDNS"
    sub="${DOMAIN%%.duckdns.org}"
    if [ "$(curl -s "https://www.duckdns.org/update?domains=$sub&token=$DUCKDNS_TOKEN&ip=")" = "OK" ]; then
        ok "домен $DOMAIN указывает на этот сервер"
        mkdir -p /opt/duckdns
        cat > /opt/duckdns/duck.sh <<EOF
curl -s "https://www.duckdns.org/update?domains=$sub&token=$DUCKDNS_TOKEN&ip=" \
  > /opt/duckdns/duck.log 2>&1
EOF
        chmod +x /opt/duckdns/duck.sh
        ( crontab -l 2>/dev/null | grep -v '/opt/duckdns/duck.sh'
          echo "*/5 * * * * /opt/duckdns/duck.sh >/dev/null 2>&1" ) | crontab -
        ok "IP будет обновляться каждые 5 минут"
    else
        warn "DuckDNS не ответил OK — проверь токен, IP выставишь вручную"
    fi
fi

say "Проверяю домен"
resolved="$(getent hosts "$DOMAIN" | awk '{print $1}' | head -1 || true)"
myip="$(curl -s --max-time 10 https://api.ipify.org || true)"
if [ -z "$resolved" ]; then
    warn "$DOMAIN пока не резолвится — сертификат не выпустится"
elif [ -n "$myip" ] && [ "$resolved" != "$myip" ]; then
    warn "$DOMAIN → $resolved, а сервер $myip. Сертификат не выпустится."
else
    ok "$DOMAIN → $resolved"
fi

# ---------- зависимости ----------

say "Ставлю зависимости"
if [ ! -x "$APP_DIR/.venv/bin/python" ]; then
    python3 -m venv "$APP_DIR/.venv"
fi
"$APP_DIR/.venv/bin/pip" install -q --upgrade pip
"$APP_DIR/.venv/bin/pip" install -q -r "$APP_DIR/requirements.txt"
ok "python-окружение готово"

# ---------- .env ----------

say "Пишу .env"
cat > "$APP_DIR/.env" <<EOF
BOT_TOKEN=$BOT_TOKEN
ADMIN_CHAT_ID=$ADMIN_ID
ADMIN_IDS=
PUBLIC_BASE_URL=https://$DOMAIN
PORT=$PORT
BRAND_NAME=${BRAND_NAME:-JOWS}
BRAND_TAGLINE=${BRAND_TAGLINE:-платформа заданий}
MIN_WITHDRAW=${MIN_WITHDRAW:-500}
PARTICIPANTS_BASE=${PARTICIPANTS_BASE:-7000}
AUTOAPPROVE=${AUTOAPPROVE:-1}
OP_STATE_FILE=$APP_DIR/op_state.json
PANEL_BOT_TOKEN=$PANEL_BOT_TOKEN
DB_PATH=$APP_DIR/jows.db
SUPPORT_USERNAME=${SUPPORT_USERNAME:-@support}
WEBAPP_DEV=0
EOF
chmod 600 "$APP_DIR/.env"
ok "$APP_DIR/.env (токен виден только root)"

# ---------- пользователь ----------

# Папку отдаём служебному пользователю, а команды обновления запускают от
# root — заранее помечаем репозиторий доверенным, иначе git ругнётся
# «dubious ownership».
git config --global --add safe.directory "$(cd "$APP_DIR/.." && pwd)" 2>/dev/null || true
id -u "$USER_NAME" >/dev/null 2>&1 || useradd --system --home "$APP_DIR" "$USER_NAME"
chown -R "$USER_NAME:$USER_NAME" "$(dirname "$APP_DIR")"
ok "владелец файлов: $USER_NAME"

# ---------- nginx ----------

if command -v nginx >/dev/null 2>&1; then
    say "Настраиваю nginx"
    conf=/etc/nginx/sites-available/$SERVICE
    if grep -q "listen 443" "$conf" 2>/dev/null; then
        # certbot уже правил этот конфиг — меняем только адрес бэкенда
        sed -i "s|proxy_pass http://127.0.0.1:[0-9]*;|proxy_pass http://127.0.0.1:$PORT;|g" "$conf"
        ok "конфиг уже с сертификатом, обновил только порт"
    else
        cat > "$conf" <<EOF
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
        ln -sf "$conf" /etc/nginx/sites-enabled/$SERVICE
        ok "создан $conf"
    fi
    nginx -t >/dev/null 2>&1 || die "nginx -t ругается, конфиг не применён"
    systemctl reload nginx
    ok "nginx перезагружен"
else
    warn "nginx не установлен — пропускаю"
fi

# ---------- сертификат ----------

if command -v certbot >/dev/null 2>&1; then
    if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
        ok "сертификат для $DOMAIN уже есть"
    else
        say "Выпускаю сертификат"
        certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos \
            --register-unsafely-without-email --redirect \
            || warn "certbot не справился — запусти вручную: certbot --nginx -d $DOMAIN"
    fi
else
    warn "certbot не установлен: apt install -y certbot python3-certbot-nginx"
fi

# ---------- служба ----------

command -v systemctl >/dev/null 2>&1 || die "systemd не найден — этот скрипт для обычного Linux-сервера"

say "Запускаю службу"
sed -e "s|/opt/jows/miniapp|$APP_DIR|g" -e "s|^User=.*|User=$USER_NAME|" \
    "$APP_DIR/deploy/jows.service" > "/etc/systemd/system/$SERVICE.service"
if [ -n "$PANEL_BOT_TOKEN" ]; then
    sed -e "s|/opt/jows/miniapp|$APP_DIR|g" -e "s|^User=.*|User=$USER_NAME|" \
        "$APP_DIR/deploy/jows-panel.service" > "/etc/systemd/system/$SERVICE-panel.service"
fi
systemctl daemon-reload
systemctl enable --now "$SERVICE" >/dev/null 2>&1
systemctl restart "$SERVICE"
[ -n "$PANEL_BOT_TOKEN" ] && systemctl enable --now "$SERVICE-panel" >/dev/null 2>&1 || true

sleep 4
if systemctl is-active --quiet "$SERVICE"; then
    ok "служба $SERVICE работает"
else
    journalctl -u "$SERVICE" -n 20 --no-pager || true
    die "служба не поднялась — логи выше"
fi

# ---------- проверка ----------

say "Проверяю"
local_code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/health" || true)"
[ "$local_code" = "200" ] && ok "локально отвечает" || warn "локально код $local_code"
pub_code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "https://$DOMAIN/health" || true)"
[ "$pub_code" = "200" ] && ok "снаружи отвечает: https://$DOMAIN" \
    || warn "снаружи код $pub_code — проверь сертификат и домен"

cat <<EOF

Готово. Дальше в самом Telegram:

  1. Напиши боту /start — появятся кнопки админа.
  2. Сделай бота админом проверочного канала и перешли ему любой пост
     оттуда — он запомнит, по какому каналу проверять подписку.
  3. Пришли боту список спонсорских ссылок обычным сообщением,
     следующим сообщением — проверочную ссылку. Раздел (вход/вывод)
     переключается в /op.
  4. /tasks — заведи реальные задания вместо демо.

Полезное:
  sudo bash $APP_DIR/deploy/update.sh      # обновиться до свежего кода
  systemctl restart $SERVICE
  journalctl -u $SERVICE -n 50 --no-pager

EOF
