#!/usr/bin/env bash
# Интерактивное создание файла .env.
# Запуск из корня проекта:  bash deploy/setup_env.sh
#
# Скрипт спрашивает значения и сам аккуратно записывает .env — без проблем
# со вставкой ссылок (убирает случайные пробелы и угловые скобки <>).

set -e
cd "$(dirname "$0")/.."

# Убрать угловые скобки <> (иногда добавляются при вставке) и пробелы по краям.
clean() {
  local v="$1"
  v="$(printf '%s' "$v" | tr -d '<>')"
  v="${v#"${v%%[![:space:]]*}"}"
  v="${v%"${v##*[![:space:]]}"}"
  printf '%s' "$v"
}

echo "================ Настройка .env ================"
echo "Вставляй значения и жми Enter после каждого."
echo

read -rp "1) BOT_TOKEN (токен от @BotFather): " BOT_TOKEN
read -rp "2) ADMIN_CHAT_ID (твой chat_id): " ADMIN_CHAT_ID
read -rp "3) Ссылка на канал (выдаётся после оплаты): " CHANNEL_LINK
read -rp "4) Ссылка для Telegram Stars: " STARS_LINK
read -rp "5) Номер карты РФ: " CARD_NUMBER
read -rp "6) Банк карты (напр. Яндекс Банк): " CARD_BANK

BOT_TOKEN="$(clean "$BOT_TOKEN")"
ADMIN_CHAT_ID="$(clean "$ADMIN_CHAT_ID")"
CHANNEL_LINK="$(clean "$CHANNEL_LINK")"
STARS_LINK="$(clean "$STARS_LINK")"
CARD_NUMBER="$(clean "$CARD_NUMBER")"
CARD_BANK="$(clean "$CARD_BANK")"

cat > .env <<EOF
BOT_TOKEN=$BOT_TOKEN
ADMIN_CHAT_ID=$ADMIN_CHAT_ID

# Platega пока в разработке — оставляем пустым, СБП покажет «в разработке».
PLATEGA_MERCHANT_ID=
PLATEGA_SECRET=
PLATEGA_BASE_URL=https://app.platega.io
PLATEGA_SBP_METHOD=2
PUBLIC_BASE_URL=
RETURN_URL=https://t.me
FAILED_URL=https://t.me
PORT=8080

CHANNEL_LINK=$CHANNEL_LINK
STARS_LINK=$STARS_LINK
REVIEWS_LINK=
ADMIN_LINK=
CARD_DETAILS=Номер карты: $CARD_NUMBER\nБанк: $CARD_BANK

SUPPORT_USERNAME=@shewmilka
PRIVACY_URL=https://telegra.ph/Politika-konfidencialnosti-04-01-26
TERMS_URL=https://telegra.ph/Polzovatelskoe-soglashenie-04-01-19

DB_PATH=bot.db
EOF

echo
echo "✅ Файл .env создан:"
echo "------------------------------------------------"
cat .env
echo "------------------------------------------------"
echo "Если что-то не так — запусти скрипт ещё раз."
