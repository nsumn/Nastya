# Запуск бота на VPS (24/7)

Пошаговая инструкция для Ubuntu 22.04/24.04. Все команды можно копировать как есть.

## Быстрый способ (RB DAYS + панель)

Если сервер уже есть — подключись по SSH и вставь одну строку:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/nsumn/Nastya/claude/telegram-roblox-account-checker-633oas/deploy/install.sh)
```

Скрипт спросит токены и домен, поставит всё в `/opt/rbdays`, заведёт службы
`rbdays-bot` и `rbdays-panel`, а если указан домен — поднимет nginx с
бесплатным https-сертификатом, и мини-приложение откроется на
`https://домен/app`. Уже работающий бот с ОГЭ он не трогает: отдельная папка,
отдельные службы, другой порт (8081).

Дальше — подробная ручная инструкция, если что-то пошло не так.

---

## Шаг 1. Арендовать сервер

Зайди к любому провайдеру (Timeweb Cloud, aeza, Selectel, Beget) и возьми
самый дешёвый VPS:

- ОС: **Ubuntu 22.04** или **24.04**
- 1 CPU / 1 GB RAM — этого хватит с запасом

После оплаты тебе пришлют: **IP-адрес сервера**, **логин** (`root`) и **пароль**.

---

## Шаг 2. Подключиться к серверу по SSH

- **Windows**: открой PowerShell (или приложение «Терминал»)
- **Mac/Linux**: открой Терминал

Введи (подставь свой IP):

```bash
ssh root@ТВОЙ_IP
```

Согласись с вопросом (`yes`), введи пароль. Ты на сервере.

---

## Шаг 3. Установить нужные программы

```bash
apt update && apt install -y python3 python3-venv python3-pip git nano
```

---

## Шаг 4. Скачать код бота

Репозиторий приватный, поэтому нужен **токен доступа GitHub** (это НЕ токен бота):

1. Зайди на https://github.com/settings/tokens → **Generate new token (classic)**
2. Поставь галочку **repo**, нажми Generate, скопируй токен (`ghp_...`)

Теперь склонируй проект (подставь свой `ghp_...` токен):

```bash
cd /opt
git clone -b claude/payment-bot-platega-Nk9lh https://ghp_ТВОЙ_ТОКЕН@github.com/nsumn/Nastya.git nastya-bot
cd nastya-bot
```

---

## Шаг 5. Установить зависимости

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

---

## Шаг 6. Создать файл `.env` с настройками

```bash
nano .env
```

Вставь содержимое (со **своими** значениями — токен бота, admin_chat_id и т.д.,
которые уже заполнены в чате):

```env
BOT_TOKEN=сюда_токен_бота_от_BotFather
ADMIN_CHAT_ID=твой_chat_id
PLATEGA_MERCHANT_ID=
PLATEGA_SECRET=
PLATEGA_BASE_URL=https://app.platega.io
PLATEGA_SBP_METHOD=2
PUBLIC_BASE_URL=
RETURN_URL=https://t.me
FAILED_URL=https://t.me
PORT=8080
CHANNEL_LINK=https://t.me/+xxxxxxxxxxxx
STARS_LINK=https://t.me/+xxxxxxxxxxxx
REVIEWS_LINK=
ADMIN_LINK=
CARD_DETAILS=Номер карты: 0000 0000 0000 0000\nБанк: Ваш банк
DB_PATH=bot.db
```

> Реальные значения (токен, chat_id, ссылки на каналы, номер карты) подставляй
> прямо на сервере — они НЕ должны попадать в репозиторий.

Сохрани: **Ctrl+O** → Enter, выйди: **Ctrl+X**.

---

## Шаг 7. Настроить автозапуск (бот будет работать 24/7)

```bash
cp deploy/nastya-bot.service /etc/systemd/system/nastya-bot.service
systemctl daemon-reload
systemctl enable --now nastya-bot
```

Проверить, что бот работает:

```bash
systemctl status nastya-bot
```

Должно быть зелёное `active (running)`. Готово — бот в эфире!

Посмотреть логи (что происходит / ошибки):

```bash
journalctl -u nastya-bot -f
```

(выход из логов — **Ctrl+C**)

---

## Полезное

**Не забудь:** один раз нажми `/start` своему боту в Telegram, иначе чеки тебе
не придут.

**Перезапустить бота:**
```bash
systemctl restart nastya-bot
```

**Обновить код (когда внесли изменения):**
```bash
cd /opt/nastya-bot
git pull
.venv/bin/pip install -r requirements.txt
systemctl restart nastya-bot
```

**Изменить настройки** (ссылки, реквизиты): отредактируй `.env` и перезапусти:
```bash
nano /opt/nastya-bot/.env
systemctl restart nastya-bot
```

---

## Позже: подключение Platega (оплата по СБП)

Когда получишь доступ к Platega:

1. В `.env` впиши `PLATEGA_MERCHANT_ID` и `PLATEGA_SECRET`.
2. В `PUBLIC_BASE_URL` впиши адрес сервера. Если есть домен — `https://твой-домен`.
   Если только IP — понадобится домен + HTTPS (помогу настроить).
3. В личном кабинете Platega укажи callback-адрес:
   `<PUBLIC_BASE_URL>/platega/callback`
4. Перезапусти: `systemctl restart nastya-bot`.

После этого СБП заработает автоматически (кнопка перестанет показывать
«в разработке»).

---

## Мини-приложение «Возраст аккаунта Roblox»

Бот уже отдаёт страницу мини-аппа сам — на том же порту, что и вебхуки:

```
GET  <PUBLIC_BASE_URL>/app              — страница мини-приложения
GET  <PUBLIC_BASE_URL>/api/roblox/user  — JSON-API (только для мини-аппа)
```

Что нужно сделать:

1. В `.env` укажи `PUBLIC_BASE_URL=https://твой-домен` (обязательно **https** —
   Telegram не открывает WebApp по http).
2. Перезапусти: `systemctl restart nastya-bot`.
3. Кнопка «🎮 Возраст Roblox» в нижнем меню бота откроет мини-приложение.
4. (По желанию) BotFather → `/mybots` → бот → *Bot Settings* → *Menu Button* →
   `https://твой-домен/app` — тогда мини-апп открывается ещё и кнопкой у поля ввода.

Если домена с HTTPS пока нет — проверка всё равно работает командой в чате:
`/roblox builderman`.

Если перед ботом стоит nginx, пробрось на него `/app` и `/api/` так же,
как `/platega/callback` (`proxy_pass http://127.0.0.1:8080;`).

### Спонсоры (обязательная подписка)

1. Добавь бота **администратором** в проверочный канал — бот сам его запомнит
   (или перешли ему любой пост из этого канала).
2. Каждый день присылай боту сообщение со ссылками, а следующим сообщением —
   новую проверочную ссылку. Бот всё расставит сам.
3. `/op` — проверить, что стоит сейчас.

Проверить со стороны: с любого другого аккаунта напиши боту `/roblox nickname`
— пока не подписан на проверочный канал, вместо ответа будет список спонсоров.

### Админ-панель для нескольких ботов

1. Создай ещё одного бота у @BotFather — это будет панель.
2. В `.env` пропиши `PANEL_BOT_TOKEN=<токен панели>` и
   `OP_STATE_FILE=/opt/nastya-bot/op_state.json`.
3. Тот же `OP_STATE_FILE` пропиши в `.env` **каждого** бота, который должен
   жить на общем списке (боты могут лежать в разных папках — важен один файл).
4. Поставь службу панели:

```bash
cp /opt/nastya-bot/deploy/nastya-panel.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now nastya-panel
systemctl status nastya-panel
```

Теперь в панели: «🔄 Поменять все ссылки» → сообщение со ссылками →
новая проверочная ссылка. Список меняется во всех ботах сразу.
Каждого бота нужно добавить администратором в проверочный канал — кто это
умеет, видно в панели по кнопке «🤖 Мои боты».
