# Передача задачи: развернуть проект на сервере

Вставь этот файл целиком в новую сессию Claude, у которой есть доступ к серверу.

---

## Что нужно сделать

Развернуть на VPS два Telegram-бота из репозитория `nsumn/Nastya`, ветка
**`claude/telegram-roblox-account-checker-633oas`**:

1. **RB DAYS** (`@RBDAYS_BOT`) — бот-проверялка возраста аккаунта Roblox
   с обязательной подпиской и мини-приложением.
2. **Админ-панель** (`@adddminnnoppppbot`) — меняет список спонсоров сразу
   во всех ботах.

Плюс домен с https, иначе мини-приложение не откроется: Telegram запускает
Web App только по https.

## Важно: на сервере уже работает другой бот

В `/opt/nastya-bot` крутится бот продажи тарифов ОГЭ (служба `nastya-bot`,
порт 8080). **Его нельзя останавливать, переписывать и менять ему `.env`.**
Новый проект ставится в отдельную папку `/opt/rbdays`, со своими службами
(`rbdays-bot`, `rbdays-panel`) и портом **8081**.

## Самый быстрый путь

В репозитории есть готовый установщик `deploy/install.sh`. На сервере:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/nsumn/Nastya/claude/telegram-roblox-account-checker-633oas/deploy/install.sh)
```

Он спросит пять значений, поставит код в `/opt/rbdays`, создаст `.env`,
заведёт обе службы, а при указанном домене поднимет nginx и выпустит
сертификат через certbot.

Значения для установщика (спроси у пользователя то, чего нет ниже):

| Что спрашивает | Что вводить |
|---|---|
| Токен GitHub | `ghp_...` — репозиторий приватный, токен создаётся на github.com/settings/tokens с галочкой **repo** |
| Токен бота RB DAYS | у пользователя |
| Telegram ID администратора | `413124905` |
| Токен бота-панели | у пользователя |
| Домен | например `rbdays.ru`, должен уже указывать A-записью на IP сервера. Пусто — установка без мини-аппа |

Если что-то в установщике не сработает — ниже то же самое руками.

## Вручную

```bash
apt update && apt install -y python3 python3-venv python3-pip git nginx certbot python3-certbot-nginx

cd /opt
git clone -b claude/telegram-roblox-account-checker-633oas \
  https://ghp_ТОКЕН@github.com/nsumn/Nastya.git rbdays
cd rbdays
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

`.env` в `/opt/rbdays/.env`:

```env
BOT_TOKEN=<токен RB DAYS>
ADMIN_CHAT_ID=413124905
BOT_MODE=roblox
PORT=8081
DB_PATH=/opt/rbdays/bot.db
OP_STATE_FILE=/opt/rbdays/op_state.json
PANEL_BOT_TOKEN=<токен панели>
PANEL_ADMIN_ID=413124905
PUBLIC_BASE_URL=https://<домен>
```

Службы — готовые файлы лежат в `deploy/`:
`deploy/nastya-bot.service` (правь пути на `/opt/rbdays` и `bot.main`) и
`deploy/nastya-panel.service` (`panel.main`). Скопировать в
`/etc/systemd/system/` как `rbdays-bot.service` и `rbdays-panel.service`,
затем `systemctl daemon-reload && systemctl enable --now rbdays-bot rbdays-panel`.

nginx: проксировать домен на `http://127.0.0.1:8081`, потом
`certbot --nginx -d <домен>`.

## Как устроен проект (чтобы не гадать по коду)

- `bot/main.py` — точка входа. `BOT_MODE=roblox` включает только проверку
  Roblox и обязательную подписку; `payments` — старую витрину тарифов ОГЭ.
- `bot/roblox.py` — публичный API Roblox: ник → id → дата регистрации,
  возраст, аватар, счётчики. Ключи не нужны.
- `bot/op.py` + `bot/op_store.py` — обязательная подписка. Состояние
  (список ссылок, проверочная ссылка, проверочный канал, текст финального
  экрана) лежит в общем JSON-файле `OP_STATE_FILE`. Все боты, у которых
  в `.env` один и тот же путь, показывают один список.
- `bot/handlers/op_admin.py` — админ присылает боту дневное сообщение со
  ссылками, оно разбирается автоматически; следующим сообщением — новая
  проверочная ссылка; пересланный пост из канала задаёт проверочный канал.
- `panel/main.py` — та же логика отдельным ботом-панелью для всех ботов.
- `bot/webapp.py` + `bot/miniapp/index.html` — мини-приложение: страница
  отдаётся на `/app`, API — `/api/roblox/user` и `/api/op/status`.
  Запросы подписаны Telegram `initData`, сервер проверяет HMAC.

## Проверки после установки

```bash
systemctl status rbdays-bot rbdays-panel
journalctl -u rbdays-bot -n 50 --no-pager
curl -s localhost:8081/health          # ожидается ok
curl -s -o /dev/null -w '%{http_code}\n' https://<домен>/app   # ожидается 200
systemctl status nastya-bot            # старый бот должен остаться работающим
```

В Telegram:

- `/start` у `@RBDAYS_BOT` — приветствие про Roblox и кнопка
  «🎮 Возраст Roblox», которая открывает мини-приложение;
- `/op` — состояние обязательной подписки;
- `/start` у панели — меню со списком и кнопкой «🔄 Поменять все ссылки».

## Что попросить у пользователя после установки

База на новом сервере пустая, поэтому нужно один раз:

1. Переслать боту (или панели) любой пост из проверочного канала — так
   задаётся канал, по которому проверяется подписка. Бот **должен быть
   администратором** этого канала, иначе проверка не работает.
2. Прислать дневное сообщение со ссылками, затем отдельным сообщением
   новую проверочную ссылку.
3. Задать текст финального экрана мини-приложения: кнопка
   «✏️ Финальный экран» в панели или команда `/reward текст`.

Проверочный канал, который использовался раньше: «Те самые новости».

## Чего делать не нужно

- Не трогать `/opt/nastya-bot` и службу `nastya-bot`.
- Не занимать порт 8080.
- Не коммитить `.env`, `*.db` и `op_state.json` — они в `.gitignore`.
- Ветка `claude/miniapp-design-gemini` — только черновик дизайна,
  разворачивать нужно `claude/telegram-roblox-account-checker-633oas`.
