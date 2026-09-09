# Деплой

## 1. Сервер

```bash
adduser --system --group --home /opt/voxy voxy
git clone <repo> /opt/voxy
cd /opt/voxy/miniapp
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env && nano .env
chown -R voxy:voxy /opt/voxy
```

В `.env` обязательны: `BOT_TOKEN`, `ADMIN_CHAT_ID`, `PUBLIC_BASE_URL`
(HTTPS-адрес, по которому снаружи доступен этот сервер), `WEBAPP_DEV=0`.

## 2. nginx + сертификат

Telegram открывает мини-апп только по HTTPS с валидным сертификатом.

```nginx
server {
    listen 443 ssl http2;
    server_name voxy.example.com;

    ssl_certificate     /etc/letsencrypt/live/voxy.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/voxy.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
certbot --nginx -d voxy.example.com
```

## 3. Автозапуск

```bash
cp deploy/voxy.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now voxy
journalctl -u voxy -f
```

## 4. После запуска

1. `/start` у бота — должна появиться кнопка «Открыть VOXY».
2. `/admin` → 📣 Спонсоры — добавить каналы (бот должен быть их админом).
3. `/admin` → 📋 Задания — заменить демо-задания на реальные.

## Обновление

```bash
cd /opt/voxy && git pull
.venv/bin/pip install -r miniapp/requirements.txt
systemctl restart voxy
```

База (`voxy.db`) лежит рядом с проектом и переживает обновления — бэкапьте её
перед миграциями: `cp /opt/voxy/miniapp/voxy.db ~/voxy-$(date +%F).db`.
