# Запуск котохозяйства на сервере

Котобот можно запустить на **том же VPS**, где уже работает платёжный бот.
Они не мешают друг другу: другой токен, другая папка, другой порт.

Telegram открывает мини-приложения только по **HTTPS**. Домен покупать не нужно:
сервис `sslip.io` даёт бесплатный адрес вида `1-2-3-4.sslip.io`, а программа
**Caddy** сама получит для него сертификат.

---

## Шаг 1. Создать нового бота

1. Открой [@BotFather](https://t.me/BotFather) → `/newbot`.
2. Придумай имя (например «Котохозяйство») и юзернейм (например `kiki_laki_pusya_bot`).
3. Скопируй токен (`123456:ABC...`).

## Шаг 2. Зайти на сервер

```bash
ssh root@ТВОЙ_IP
```

## Шаг 3. Скачать код

Нужен тот же GitHub-токен (`ghp_...`), что и для платёжного бота.

```bash
cd /opt
git clone -b claude/telegram-cat-care-app-8q21gh https://ghp_ТВОЙ_ТОКЕН@github.com/nsumn/Nastya.git cat-care
cd /opt/cat-care/cat_care
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

## Шаг 4. Включить HTTPS (Caddy + sslip.io)

Установить Caddy:

```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy
```

Записать адрес. **Подставь свой IP, заменив точки на дефисы**: IP `203.0.113.5` → `203-0-113-5.sslip.io`.

```bash
cat > /etc/caddy/Caddyfile <<'CADDY'
203-0-113-5.sslip.io {
    reverse_proxy 127.0.0.1:8090
}
CADDY
systemctl restart caddy
```

Если на сервере включён файрвол `ufw`, открой порты:

```bash
ufw allow 80 && ufw allow 443
```

## Шаг 5. Настройки `.env`

```bash
cd /opt/cat-care/cat_care
cp .env.example .env
nano .env
```

Поменяй:

- `BOT_TOKEN` — токен из шага 1;
- `WEBAPP_URL` — `https://203-0-113-5.sslip.io` (твой адрес из шага 4);
- `ALLOWED_USER_IDS` — chat_id всех членов семьи через запятую
  (каждый может узнать свой у [@userinfobot](https://t.me/userinfobot)).
  Если оставить пустым, пользоваться сможет любой, кто найдёт бота;
- `REMINDER_TIMES` — когда напоминать (по умолчанию `20:00,22:30`);
- `TIMEZONE` — часовой пояс (по умолчанию `Europe/Moscow`).

Сохранить: **Ctrl+O** → Enter, выйти: **Ctrl+X**.

## Шаг 6. Автозапуск

```bash
cp deploy/cat-care.service /etc/systemd/system/cat-care.service
systemctl daemon-reload
systemctl enable --now cat-care
systemctl status cat-care
```

Должно быть зелёное `active (running)`.

## Шаг 7. Пользоваться

Каждый член семьи открывает бота и жмёт **/start**. Иначе бот не сможет
присылать ему напоминания. Слева от поля ввода появится кнопка **🐾 Котики**,
она открывает приложение.

---

## Полезное

Логи:
```bash
journalctl -u cat-care -f
```

Обновить код:
```bash
cd /opt/cat-care && git pull && systemctl restart cat-care
```

Проверить, что HTTPS работает: открой `https://203-0-113-5.sslip.io/?demo=1` в
браузере. Должно открыться приложение в демо-режиме.

**Если приложение не открывается в Telegram:**
- `systemctl status caddy`: Caddy должен работать;
- адрес в `WEBAPP_URL` должен точно совпадать с адресом в Caddyfile и начинаться с `https://`;
- после изменения `.env` выполни `systemctl restart cat-care`.
