# Деплой

Мини-апп открывается в Telegram **только по HTTPS** с валидным сертификатом,
поэтому нужен домен. Бесплатный вариант — DuckDNS.

## Быстрый путь: одна команда

Ставит всё сразу и ничего не нужно редактировать руками — скрипт спросит
токен, ID администратора и домен, а `.env`, nginx, сертификат и автозапуск
сделает сам:

```bash
git clone -b claude/telegram-mini-app-subscriptions-9qf4me \
  https://github.com/nsumn/Nastya.git /opt/voxy
sudo bash /opt/voxy/miniapp/deploy/install.sh
```

Ответы можно передать заранее, тогда скрипт ничего не спросит:

```bash
sudo BOT_TOKEN='123:AA...' ADMIN_ID=413124905 \
     DOMAIN=otzzzzzi.duckdns.org PORT=8082 \
     bash /opt/voxy/miniapp/deploy/install.sh
```

Дополнительно: `DUCKDNS_TOKEN=...` — скрипт сам пропишет IP сервера на
DuckDNS и поставит обновление по крону; `PANEL_BOT_TOKEN=...` — поднимет
ещё и бота-панель.

Повторный запуск безопасен: обновит `.env`, конфиг и перезапустит службу.
Чужие боты на сервере не трогает — своя папка и свой порт.

Ниже — то же самое вручную, по шагам, если что-то пошло не так.

## 0. Если на сервере уже есть другие боты

Ставим JOWS отдельно, ничего чужого не трогаем:

| Что | Папка | Порт | Службы |
|-----|-------|------|--------|
| бот оплаты ОГЭ | `/opt/nastya-bot` | 8080 | `nastya-bot` |
| Roblox-боты | `/opt/rbdays` | 8081 | `rbdays-bot`, `rbmap-bot`, `rbdays-panel` |
| **JOWS** | `/opt/voxy` | **8082** | `voxy`, `voxy-panel` |

Порт задаётся в `.env` (`PORT=8082`). Проверить, что он свободен:

```bash
ss -lntp | grep 8082 || echo "порт свободен"
```

## 1. Домен на DuckDNS

1. Зайти на https://www.duckdns.org, войти через Google/GitHub.
2. Создать поддомен, например `otzzzzzi` → получится
   `otzzzzzi.duckdns.org`.
3. IP выставить **с самого сервера** — так DuckDNS подставит правильный
   адрес, а не адрес твоего браузера:

```bash
curl "https://www.duckdns.org/update?domains=otzzzzzi&token=ТВОЙ_ТОКЕН&ip="
# ответ должен быть: OK
```

4. Проверить с сервера, что домен резолвится в нужный IP:

```bash
dig +short otzzzzzi.duckdns.org
```

Если IP сервера меняется, поставь автообновление (токен берётся на
duckdns.org, он на странице сверху):

```bash
mkdir -p /opt/duckdns
cat > /opt/duckdns/duck.sh <<'EOF'
echo url="https://www.duckdns.org/update?domains=otzzzzzi&token=ТВОЙ_ТОКЕН&ip=" \
  | curl -k -o /opt/duckdns/duck.log -K -
EOF
chmod +x /opt/duckdns/duck.sh
( crontab -l 2>/dev/null; echo "*/5 * * * * /opt/duckdns/duck.sh >/dev/null 2>&1" ) | crontab -
```

## 2. Код и зависимости

```bash
git clone -b claude/telegram-mini-app-subscriptions-9qf4me \
  https://github.com/nsumn/Nastya.git /opt/voxy
cd /opt/voxy/miniapp
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env
nano .env
```

В `.env` обязательно:

```
BOT_TOKEN=токен от @BotFather
ADMIN_CHAT_ID=твой id (узнать у @userinfobot)
PUBLIC_BASE_URL=https://otzzzzzi.duckdns.org
PORT=8082
WEBAPP_DEV=0
```

Если нужен отдельный бот-панель — заведи второго бота у @BotFather и
впиши его токен в `PANEL_BOT_TOKEN`.

## 3. nginx и сертификат

```bash
cat > /etc/nginx/sites-available/voxy <<'EOF'
server {
    listen 80;
    server_name otzzzzzi.duckdns.org;

    location / {
        proxy_pass http://127.0.0.1:8082;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
ln -sf /etc/nginx/sites-available/voxy /etc/nginx/sites-enabled/voxy
nginx -t && systemctl reload nginx

certbot --nginx -d otzzzzzi.duckdns.org
```

Certbot сам допишет в конфиг 443 и сертификат. Дальше проверить:

```bash
curl -I https://otzzzzzi.duckdns.org/health
```

## 4. Автозапуск

```bash
useradd --system --home /opt/voxy voxy 2>/dev/null
chown -R voxy:voxy /opt/voxy

cp /opt/voxy/miniapp/deploy/voxy.service /etc/systemd/system/
cp /opt/voxy/miniapp/deploy/voxy-panel.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now voxy
journalctl -u voxy -n 30 --no-pager

# бот-панель — только если задан PANEL_BOT_TOKEN
systemctl enable --now voxy-panel
journalctl -u voxy-panel -n 30 --no-pager
```

Обе службы читают и пишут один файл `OP_STATE_FILE` — списки каналов
меняются сразу везде. Поэтому у них должен быть одинаковый `User=`.

## 5. После запуска

1. `/start` у бота — появится кнопка «Открыть JOWS», приложение должно
   открыться внутри Telegram.
2. Сделать бота **администратором проверочного канала**, затем переслать
   боту любой пост из этого канала — он запомнит, по какому каналу
   проверять подписку.
3. Прислать боту сообщение со списком спонсорских ссылок, следующим
   сообщением — проверочную ссылку. Раздел (вход/вывод) переключается
   в `/op`.
4. `/tasks` — заменить демо-задания на реальные.

## Обновление

```bash
sudo bash /opt/voxy/miniapp/deploy/update.sh
```

Скрипт забирает свежий код, доставляет зависимости, возвращает права
служебному пользователю, перезапускает службы и проверяет, что приложение
отвечает. Настройки (`.env`), база и состояние подписки не трогаются.

После обновления закрой мини-апп в Telegram и открой заново — иначе
увидишь старую страницу из кэша клиента.

Если обновляешь вручную и git ругается на «dubious ownership» — папка
принадлежит служебному пользователю, а команда запущена от root:

```bash
git config --global --add safe.directory /opt/voxy
```

## Если что-то не так

```bash
systemctl status voxy                  # жив ли процесс
journalctl -u voxy -n 50 --no-pager    # последние логи
ss -lntp | grep 8082                   # слушает ли порт
curl -I http://127.0.0.1:8082/health   # отвечает ли локально
nginx -t                               # цел ли конфиг nginx
dig +short otzzzzzi.duckdns.org        # туда ли смотрит домен
```

- **Мини-апп не открывается, «Открой через Telegram» или 401** — почти
  всегда дело в способе запуска: с кнопки обычной клавиатуры Telegram не
  передаёт `initData`, и подпись проверить нечем. Открывать можно только
  инлайн-кнопкой под сообщением и кнопкой-меню у поля ввода — так и сделано.
- **Проверка подписки не срабатывает** — бот не администратор проверочного
  канала.
- **Сертификат не выпускается** — сначала проверь, что DuckDNS указывает
  на актуальный IP сервера и что порт 80 открыт.
- **`.env` не читается** — в нём не должно быть пробелов перед именем
  переменной.

База (`voxy.db`) и состояние подписки (`op_state.json`) лежат рядом с
проектом и переживают обновление. Бэкап перед изменениями:

```bash
cp /opt/voxy/miniapp/voxy.db ~/voxy-$(date +%F).db
cp /opt/voxy/miniapp/op_state.json ~/op-$(date +%F).json
```
