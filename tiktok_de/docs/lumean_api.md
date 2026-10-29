# Lumean Public API — справочник для LLM

> Этот файл — самодостаточная спецификация публичного API Lumean для языковых моделей.
> Отдайте его нейросети целиком: в нём есть авторизация, соглашения, все эндпоинты с точными
> полями, enum'ы, схемы ответов, real-time (WebSocket) и сквозные рабочие примеры.
> Все идентификаторы, имена полей, enum-значения и JSON приведены **дословно** — используйте их
> буква-в-букву. Пояснения на русском, технические имена — в оригинале.

Машиночитаемые спецификации (истина о схемах, дополняют этот файл):
`GET /docs/public-openapi.json` (OpenAPI 3.1, REST) и `GET /docs/public-asyncapi.json` (AsyncAPI 2.6, WebSocket).
Английский вариант REST-спеки — `GET /docs/public-openapi.en.json` (то же дерево, переведённые описания).

---

## 0. Что это за API

Lumean — SaaS для генерации медиа ИИ: **озвучка текста (TTS)** на трёх сервисах (`elevenlabs`,
`heygen`, `cartesia`), **генерация и редактирование изображений**, **звуковые эффекты (SFX)**,
**музыка**, **клонирование голоса** (по API — для Cartesia и Fish Audio, §7.12), **дубляж** готовой
озвучки Cartesia и ElevenLabs на другой язык с сохранением таймингов (§7.14). Работа строится
вокруг **заказов** (`order`): вы отправляете задачу, сервер разбивает её на чанки, обрабатывает
асинхронно воркерами и отдаёт файлы-результаты.

Публичный API (`/api/public/*`) предназначен для программных интеграций **по API-ключу** (заголовок
`X-API-KEY`). Это отдельный контур от фронтового JWT-API. Ключ создаётся пользователем в личном
кабинете (веб), у него набор **прав** (permissions) и **лимиты**. Здесь описан ТОЛЬКО публичный
контур по ключу.

**Ключевые факты, которые часто понимают неверно (прочитайте до генерации запросов):**

1. **TTS-голос задаётся только через шаблон**, а не полем заказа. Нет `orders.voice_id`.
   Порядок: положить `voice_id` в `config.tts_settings.voice_id` шаблона → создать заказ по этому
   шаблону. См. §11 (Рецепты).
2. **Текст для TTS передаётся в top-level поле `input_text`** запроса `POST /orders` (сырая строка).
   НЕ кладите текст TTS в `task_data`. А вот для template-less SFX/music промпт идёт в `task_data`.
3. **У заказов НЕТ update/delete.** Доступны только `index`, `store`, `show`, плюс действия
   `cancel`/`retry`. `PUT/PATCH/DELETE /orders/{order}` вернут 405/404.
4. **Два независимых лимита:** rate-limit по числу запросов (429, `reason: rate_limit_exceeded`,
   заголовок `Retry-After`) и токен-квота по объёму генерации (429, `reason: token_quota_exceeded`;
   `Retry-After` — только у окна со сбросом по времени, у пула `window: "quota"` его нет). См. §6.
5. **Пагинация с разными базами:** внешние каталоги голосов (`voices/elevenlabs/library`, `voices/heygen`)
   считают `page` **с 0**; обычные списки (`orders`, `templates`, `templates/browse`, а также каталог и клоны
   Cartesia `voices/cartesia`, `voices/cartesia/clones`, а также Fish Audio `voices/fishaudio`,
   `voices/fishaudio/clones`) — `current_page` **с 1**.
6. **Субтитры и другие сервисные файлы лежат ОТДЕЛЬНО** — в `result.service_files[]`, не в
   `result.files[]`. Оба поля — плоские массивы строк-путей (напр. `.../output/final/service/subtitles.srt`),
   генерируется только для TTS. Скачивается тем же `POST /storage/url`. См. §7.10.
7. **Сбой чанка чинится на уровне чанка, не заказа.** У чанка бывают статусы `failed` (тех. ошибка)
   и `policy_flagged` (контент отклонён политикой провайдера). Частично готовый заказ
   (`partially_completed`) доводят до `completed` так: один вызов
   `POST /orders/{order}/items/retry-failed` забирает все `failed` разом, а `policy_flagged`
   добивают поштучно `POST /orders/{order}/items/{item}/retry` с **исправленным** `text` (повтор с
   тем же текстом бессмыслен). Order-level `retry` для этого не годится — он создаёт новый заказ.
   См. §7.11.
8. **Бесплатна только пауза `{{pause}}`; квадратные скобки и `<break/>` оплачиваются.**
   `{{pause=2s}}` — наш формат: тишину строит воркер, до провайдера строка не доезжает, в
   цену и в длину фрагмента не входит. Любые `[…]` (`[шёпот]`, а заодно `[1]`, `[sic]`,
   `[00:12]`) и `<break time="…"/>` — синтаксис провайдера: он получает их целиком, модель
   читает их как указание диктору, а символы **тарифицируются и занимают место во
   фрагменте**. `(ремарка)`, `<тег>`, `*звёздочки*` — прозвучат вслух и тоже тарифицируются.
   См. §8.3.
9. **Тонкие настройки голоса включаются флагом.** Без `tts_settings.advanced_voice_settings: true`
   (по умолчанию `false`) на `eleven_v3*` до движка доезжает только `stability`, на `eleven_v4*` —
   `stability`, `similarity_boost` и `clone_strength`; остальные значения (в том числе `speed`) молча не влияют на
   звук — ошибки не будет. На прочих моделях флаг на звук не влияет. См. §8.2.
10. **Свой голос для Cartesia клонируется по API, но асинхронно.** `POST /voices/cartesia/clones`
    (право `voices.write`) сразу отвечает `201` с клоном в статусе `pending`, а `voice_id`
    появляется только в статусе `ready` — ждите событие `voice_clone.updated` (§10) или опрашивайте
    `GET /voices/cartesia/clones`. В шаблон кладут `voice_id` клона, а НЕ его `id`. Клонирование
    требует живой подписки с Cartesia, только если сервис закрыт для оплаты с баланса (иначе 402
    `no_subscription`), и упирается в потолок клонов: 2 без подписки, лимит тарифа с подпиской.
    См. §7.12, Рецепт H. То же у Fish Audio (`POST /voices/fishaudio/clones`, §7.12): правила
    те же, что у Cartesia, лимит клонов у Fish свой, `voice_id` — строка из 32 hex-символов, а не
    UUID.
11. **Не подбирайте адреса — все эндпоинты описаны в этом файле.** Путь, которого нет, отвечает
    **404** с `reason: "endpoint_not_found"`, текстом-подсказкой и ссылками на этот файл. Перебор
    несуществующих путей распознаётся как http probing: после нескольких таких 404 IP банится на
    ВСЕХ путях — **429** `reason: "ip_banned"` (5 мин → 10 → 30 → 1 ч → 24 ч). Получили
    `endpoint_not_found` — остановитесь и найдите нужный запрос здесь. См. §6.1, §12.
12. **Есть отдельный AI API (LLM-гейтвей), не входящий в `/api/public/*`.** OpenAI- и
    Anthropic-совместимые ручки на `https://api.lumean.app/v1` (`/chat/completions`, `/responses`,
    `/messages`, `/models`, `/images/*`) работают с ЛЮБЫМ ключом кабинета (`Authorization: Bearer` или
    `x-api-key`), оплата с баланса LUMC. Полностью — §14.
13. **Цены AI-моделей не фиксированы.** Они меняются вслед за поставщиками (иногда несколько раз в
    день), модель может временно пропасть. Перед дорогой генерацией сверяйте цену —
    `GET /api/public/ai/models/{key}` (любой ключ, ETag → 304, пока цена прежняя) — и держите
    месячный лимит ключа. См. §14.6.

---

## 1. TL;DR — путь от нуля до готового TTS-заказа

Предполагается, что у вас уже есть API-ключ с правами `orders.write`, `templates.write`,
`voices.read`, `orders.download`, `billing.read`. **Внимание:** готовый пресет `automation` НЕ
включает `templates.write` (только `templates.read`) — для этого сценария (создание шаблона)
берите пресет `full` либо добавьте `templates.write` к `automation` вручную при создании ключа.

```bash
BASE=https://api.lumean.app/api/public
KEY=<ваш_api_ключ>

# 1. Найти voice_id (например, из публичной библиотеки ElevenLabs)
curl -s "$BASE/voices/elevenlabs/library?page=0&page_size=20" -H "X-API-KEY: $KEY"

# 2. Создать шаблон TTS с этим voice_id
curl -s -X POST "$BASE/templates" -H "X-API-KEY: $KEY" -H "Content-Type: application/json" -d '{
  "service_key": "elevenlabs",
  "name": "My TTS",
  "config": {
    "tts_settings": {
      "mode": "mode_v1",
      "model_id": "eleven_multilingual_v2",
      "voice_id": "<VOICE_ID_ИЗ_ШАГА_1>",
      "advanced_voice_settings": true,
      "voice_settings": { "stability": 0.5, "similarity_boost": 0.75, "use_speaker_boost": true, "speed": 1.0 }
    }
  }
}'
# → data.id = <TEMPLATE_UUID>

# 3. Создать заказ по шаблону (текст в input_text)
curl -s -X POST "$BASE/orders" -H "X-API-KEY: $KEY" -H "Content-Type: application/json" -d '{
  "template_id": "<TEMPLATE_UUID>",
  "input_text": "Привет! Это тестовая озвучка через Lumean API."
}'
# → data.id = <ORDER_UUID>, data.status = "created"

# 4. Дождаться готовности: опрос статуса (или WebSocket, см. §10)
curl -s "$BASE/orders/<ORDER_UUID>" -H "X-API-KEY: $KEY"
# ждём data.status = "completed" (или "partially_completed")

# 5. Забрать файл-результат: путь берём из data.result.files[] (элемент — строка-путь)
curl -s -X POST "$BASE/storage/url" -H "X-API-KEY: $KEY" -H "Content-Type: application/json" \
  -d '{ "path": "<строка_из_result.files[]>" }'
# → data.url = временная ссылка; качаем обычным GET
```

В шаге 2 `tts_settings.mode` — обязателен, а `tts_settings.language_code` — опциональный ISO-639-1
код (не показан выше для краткости минимального примера); подробнее — §8.2.

---

## 2. Базовый URL и окружения

| Что | Значение (production) |
| --- | --- |
| REST base | `https://api.lumean.app/api/public` |
| WebSocket host / port / scheme | `ws.lumean.app` / `443` / `wss` |
| WS app key (публичный) | `7c4dd881d8116ac76fe89aff71d8c2ff` |
| WS auth endpoint | `POST https://api.lumean.app/api/public/broadcasting/auth` |
| OpenAPI (REST) | `https://api.lumean.app/docs/public-openapi.json` |
| OpenAPI (REST, EN) | `https://api.lumean.app/docs/public-openapi.en.json` |
| AsyncAPI (WS) | `https://api.lumean.app/docs/public-asyncapi.json` |

Все запросы — HTTPS. Тело — JSON (`Content-Type: application/json`), кроме загрузки файлов
(`multipart/form-data`). Ответы — JSON в UTF-8.

---

## 3. Аутентификация — заголовок `X-API-KEY`

Каждый запрос обязан нести заголовок:

```
X-API-KEY: <ваш_ключ>
```

Ключ хешируется (sha256) и резолвится с кэшем ~1 час. При успехе сервер действует от имени
владельца ключа.

### Необязательный заголовок `X-Timezone`

```
X-Timezone: Europe/Moscow
```

Все моменты времени в ответах — ISO-8601 с **явным оффсетом**
(`2026-08-10T15:34:56+03:00`). По умолчанию это UTC; прислав `X-Timezone`, вы
получите те же моменты, записанные в вашей зоне. Принимается только имя зоны
IANA — голый оффсет (`+03:00`) отвергается, потому что не знает про переход на
летнее время.

Ответ сообщает **фактически применённую** зону тем же заголовком: прислав мусор,
вы увидите `X-Timezone: UTC` и поймёте причину. Календарные даты (`Y-m-d`:
границы периодов действия) по зоне не конвертируются — у них её нет.

**Ошибки авторизации (HTTP 401), тело `{ "success": false, "message": <строка>, "data": null }`:**

| Причина | message-ключ |
| --- | --- |
| Нет заголовка | `auth.api_key.missing` |
| Неизвестный / неактивный ключ / удалённый или заблокированный пользователь | `auth.api_key.invalid` |
| Ключ истёк (`expires_at` в прошлом) | `auth.api_key.expired` |

### Права (permissions)

Каждый эндпоинт требует конкретное право. Ключ без нужного права → **HTTP 403**
`{ "success": false, "message": <auth.api_key.forbidden>, "data": null }`.

| Право | Открывает |
| --- | --- |
| `orders.read` | Чтение заказов, чанков, WebSocket-подписка на заказы |
| `orders.write` | Создание/отмена/повтор заказов, retry/regenerate чанков |
| `orders.download` | `POST /storage/url` — ссылки на файлы-результаты |
| `templates.read` | Чтение шаблонов, `browse`, `config-options` |
| `templates.write` | Создание/изменение/удаление шаблонов |
| `voices.read` | Все каталоги голосов (LumVoice + ElevenLabs + HeyGen + Cartesia + Fish Audio), список своих клонов Cartesia и Fish Audio, WebSocket-подписка на клоны |
| `voices.write` | Создание, повтор и архивирование клонов голоса Cartesia и Fish Audio |
| `billing.read` | `usage`, `subscriptions`, (при включённом кошельке) `wallets`/`ledger-transactions` |
| `profile.read` | `GET /user` (профиль) |
| `reseller.read` | Кабинет реселлера (§7.13): профиль и баланс, настройки кодов, статистика, список и один код **с полным значением**, WebSocket-подписка на канал кодов |
| `reseller.write` | Выпуск подарочных кодов с баланса реселлера и их отмена (§7.13) |
| `*` (wildcard) | Проходит любую проверку прав, **кроме** `reseller.read`/`reseller.write` |

Без права работают `GET /key` (ключ описывает сам себя, §7.9) и `GET /ai/models` (цены AI, §14.6) —
подходит любой действующий ключ.

**Пресеты прав** (набор, который обычно назначают ключу):
- `read_only` = все read-права: `orders.read`, `templates.read`, `voices.read`, `billing.read`, `profile.read`, `orders.download`.
- `automation` = `orders.read`, `orders.write`, `orders.download`, `templates.read`, `voices.read`, `billing.read`, `profile.read`.
- `full` = все права (включая `voices.write`), кроме прав реселлера.

`reseller.read` и `reseller.write` не входят ни в один пресет и не покрываются `*` — только явным
перечислением в правах ключа: код — деньги на предъявителя. В форме ключа группа «Реселлер» видна только пользователю с профилем реселлера.

`voices.write` — write-право: в `read_only` и `automation` его нет. Ключу, который клонирует голоса,
добавьте его вручную либо возьмите `full`.

> Можно перечислить несколько прав через запятую в требовании — достаточно любого. `orders.download`
> — это отдельное право для скачивания (не покрывается `orders.read`).

---

## 4. Соглашения

### Конверт ответа

**Успех** (200/201):
```json
{ "success": true, "message": "<человекочитаемо>", "data": <payload> }
```

**Ошибка домена/инфраструктуры** (400, 404, 429 rate-limit, 500, 503 и пр.):
```json
{ "success": false, "message": "<причина>" }
```
Ключ `errors` в публичном API на этих кодах не используется — не путайте с 422 ниже, где он
обязателен. Некоторые доменные 4xx (напр. 402/409 биллинга, 429 квоты) несут дополнительные
машиночитаемые поля поверх `success`/`message` — см. §12. 404 на путь, которого нет, несёт
`reason: "endpoint_not_found"` и подсказку — это сигнал прекратить перебор адресов (§6.1).

**Ошибка валидации** (422) — стандартный формат Laravel, **без** ключа `success`:
```json
{ "message": "<итоговое>", "errors": { "field.name": ["текст ошибки", "..."] } }
```

### Пагинация

Пагинированные списки кладут в `data`:
```json
{ "items": [ ... ], "current_page": 1, "last_page": 5, "per_page": 20, "total": 93 }
```
Параметры запроса: `page` (с 1), `per_page` (обычно 1..100). **Исключение:** внешние каталоги
голосов используют свою обёртку `{ voices, total, page, page_size, has_more }` с `page` **от 0**.

### Типы идентификаторов

| Ресурс | Тип `id` |
| --- | --- |
| Order | **UUID** (строка) |
| Template | **UUID** (строка) |
| User, ApiKey, Subscription, Service | **integer** |
| LumVoice | id голоса (в пути `voices/{voice}`) |
| Внешний голос (ElevenLabs/HeyGen/Cartesia/Fish Audio) | строковый `voice_id` провайдера (у Fish — 32 hex-символа, не UUID) |
| Клон голоса Cartesia | **UUID** (`id` — для путей `voices/cartesia/clones/{voiceClone}`); в шаблон идёт его строковый `voice_id` |
| Клон голоса Fish Audio | **UUID** (`id` — для путей `voices/fishaudio/clones/{voiceClone}`); в шаблон идёт его `voice_id` (32 hex-символа, не UUID) |

Даты — ISO-8601 (`2026-07-08T12:34:56+00:00`), по умолчанию в UTC; заголовок `X-Timezone`
(IANA-зона, например `Europe/Moscow`) переводит их в вашу зону. Локаль ответа (локализованные
`message`/labels) выбирается по порядку: заголовок `X-Locale` → язык аккаунта владельца ключа →
`Accept-Language` → язык по умолчанию.

---

## 5. Типы заказов (`task_type`)

Enum `task_type` (дословно, 11 значений): `tts`, `image`, `txt2img`, `remix`, `image_edit`,
`voice_clone`, `sfx`, `music`, `voice_search`, `cartesia_dub`, `elevenlabs_dub`. Это полный список enum'а (валидные значения фильтра
`GET /orders?task_type[]=…`), но **создаются** через публичный `POST /orders` не все — см. ниже.

Как создаётся каждый **доступный** тип на `POST /orders`:

| task_type | Способ | Что передавать | Файлов в `result.files[]` |
| --- | --- | --- | --- |
| `tts` | по шаблону (сервис `elevenlabs`, `heygen` или `cartesia`) | `template_id` + `input_text` (текст озвучки) | 1 (склеенная дорожка) + субтитры в `service_files` |
| `sfx` | template-less | `task_type: "sfx"` + `task_data.text` (см. §8.1, рецепт §11-B) | **ровно 1** аудиофайл |
| `music` | template-less | `task_type: "music"` + `task_data.prompt` (см. §8.1, рецепт §11-C) | **`n_variants`** аудиофайлов (1..4) |
| `voice_search` | template-less | `task_type: "voice_search"` + аудио в `input_files` (multipart), опционально `task_data.top` | файлов нет — результат это список похожих голосов |

Правило: на `POST /orders` обязателен **один из** `template_id` **или** `task_type`. Шаблон
однозначно задаёт сервис и его настройки; `task_type` без шаблона работает **только** для
сервисов, у которых код сервиса совпадает с типом задачи — это **`sfx`**, **`music`** и
**`voice_search`**.

> **Через публичный `POST /orders` создаются `tts` (по шаблону), `sfx`, `music` и
> `voice_search` (template-less).** Значения `image`, `txt2img`, `remix`, `image_edit`,
> `voice_clone`, `cartesia_dub` и `elevenlabs_dub` валидны только как фильтр `GET /orders?task_type[]=…` (могут встречаться на
> ранее созданных заказах); создать заказ такого типа по API-ключу нельзя — сервиса с таким
> кодом нет, попытка даст **422** `service_not_found`. Не пытайтесь их создавать.
> `cartesia_dub` и `elevenlabs_dub` — дубляж готового заказа Cartesia и ElevenLabs на другой язык. Их
> создают **не** через `POST /orders` (там такой тип — 422 `service_not_found`), а отдельной ручкой
> `POST /orders/{order}/dub` от готового заказа озвучки — §7.14, рецепт §11-I.
> Клонирование голоса Cartesia — это НЕ заказ: у него свои эндпоинты `voices/cartesia/clones`
> (§7.12), и `task_type: "voice_clone"` для него не нужен. Так же у Fish Audio — `voices/fishaudio/clones`.

**`voice_search`** — подбор похожих голосов по вашему аудиофрагменту (не по текстовому
описанию). Аудио обязательно (без файла → отказ `source_file_required` до списания), тип
проверяется по содержимому файла, а не по расширению: картинка или архив дадут
`source_file_unsupported`. Запись длиннее 60 секунд обрезается — вектор диктора насыщается
раньше, признак обрезки приходит в результате. `task_data.top` (1..50, по умолчанию 10) задаёт
число кандидатов. Цена — одна ставка за заказ, от длительности записи не зависит.

### Статусы заказов (`order.status`)

Enum `OrderStatus` (дословно, 9 значений): `created`, `pending`, `in_progress`, `completed`,
`result_delivered`, `failed`, `compensated`, `cancelled`, `partially_completed`.

**Терминальные** (заказ достиг финального состояния, дальше не меняется): `completed`,
`result_delivered`, `failed`, `compensated`, `cancelled`. **Нетерминальные**: `created`, `pending`,
`in_progress`, `partially_completed` — последний не терминален специально: его можно доретраить в
`completed` через `POST /orders/{order}/items/retry-failed` (все `failed` разом) или
`POST /orders/{order}/items/{item}/retry` (поштучно, в т.ч. `policy_flagged`) — §7.2.

**`compensated` и `failed`** — заказ закрыт без результата. `compensated` — штатный исход: ни один
фрагмент не получился (сбой генерации или все фрагменты отклонены контентной политикой),
блокировка по заказу снята (`unlock_balance` в истории операций), квота возвращена; удерживается
только плата за попытки `policy_flagged` (ниже). `failed` — редкий: заказ
упал на подготовке входных файлов (возврат сделан сразу) либо автоматический возврат не прошёл —
такой заказ доводит поддержка. Если готов хотя бы один фрагмент, сбой даёт `partially_completed`:
готовое оплачено, упавшее можно повторить. Причина для показа пользователю — в
`result.user_message` (по фрагменту — `items[].failure_reason`), оба поля — локализованный текст,
не машинный код.

**Плата за попытку, отбитую политикой.** Фрагмент `policy_flagged` у ElevenLabs не бесплатен:
из суммы, которая вернулась бы за него, удерживается фиксированная плата за попытку (на заказах
из квоты — эквивалент в токенах). Удерживается только из возвращаемого — сверх заблокированного
по заказу не списывается ничего, баланс в минус не уходит. Денежная часть видна в истории операций
как `policy_block_fee`; из квоты просто возвращается меньше токенов.

Строгий фильтр `status` в `GET /orders` (§7.1) принимает только эти значения — иное → 422.

---

## 6. Лимиты: rate-limit и токен-квота

Это **два разных** механизма, оба возвращают 429 — различайте по телу.

### 6.1 Rate-limit (число запросов)

Ограничение частоты по окнам ключа (`limits.requests.per_minute|per_hour|per_day`). Превышение →
**HTTP 429**, тело `{ "success": false, "message": "...", "reason": "rate_limit_exceeded",
"error_code": "rate_limit_exceeded", "retry_after": <секунды> }` и заголовки `Retry-After`,
`X-RateLimit-*` — ждите `retry_after` секунд и повторяйте.

> **Бан IP — тоже 429, но не про ключ.** Адрес, замеченный в переборе несуществующих путей,
> банится на время (5 мин → 10 → 30 → 1 ч → 24 ч) на ВСЕХ путях, до проверки ключа: 429 с
> `reason`/`error_code` = `ip_banned`, `retry_after`, `banned_until`, `ban_step`,
> `ban_ladder_seconds` и заголовком `Retry-After`. Повтор до `banned_until` бан не снимет —
> остановите перебор и дождитесь срока. Предупреждение приходит ДО бана: каждый 404 на путь,
> которого нет, несёт `reason`/`error_code` = `endpoint_not_found`, `message` (ru) и `message_en`
> с подсказкой, `method`, `path`, `docs` (адреса этого файла), `developers` и `ban_warning`
> (`status: 429`, `reason: "ip_banned"`, `ban_ladder_seconds`). Такой 404 — сигнал прекратить
> перебор, а не пробовать соседний адрес.

> **Дефолт по частоте — «без лимита», а не 60/мин.** Ключ, созданный без явных request-окон,
> по умолчанию **не ограничивается по частоте** (`limits.requests.* = null` → сервер применяет
> `Limit::none()`). Числовой дефолт включается, только если оператор задал его в окружении
> (`API_KEY_DEFAULT_RATE_PER_MINUTE|_HOUR|_DAY`). Действующие окна вашего ключа — в личном
> кабинете (`limits.requests.*`). Реальный расход всё равно ограничен квотой аккаунта (см. §6.2),
> даже когда частота не лимитирована. Есть **третий** источник 429 — usage-лимит подписки
> (`reason: limit_exceeded`, §12), без `Retry-After`, и **четвёртый** — лимит одновременно
активных задач (`reason: concurrency_limit_exceeded`, §12), тоже без `Retry-After`. Последний
не про частоту и не про объём: он ограничивает, сколько ваших заказов может выполняться
ОДНОВРЕМЕННО. Пачка из сотен заказов, отправленная залпом, упрётся именно в него — лечится
не паузой между запросами, а ожиданием завершения уже запущенных. **Пятый** —
кулдаун после серии контентных блокировок (`reason: policy_cooldown_active`, §12);
он единственный из «заказных» 429 несёт `Retry-After` и `retry_after`/`retry_at`.
Лечится не паузой и не ожиданием чужих задач, а правкой текста: пять подряд
заблокированных политикой задач ограничивают создание новых на 5 минут, дальше 10 и 15.

### 6.2 Токен-квота (объём генерации)

Поверх rate-limit'а, но считает **токены** — учётную единицу объёма работы сервиса
(`токены = стоимость операции в токенах`; это НЕ деньги/LMC). Окна: `per_minute`, `per_hour`,
`per_day`, `per_month` из `limits.tokens.*` ключа. Ключ без токен-лимитов — без ограничения по токенам.

Кроме окон, у ключа может быть **пул** — `limits.tokens.quota` (`{limit, used, remaining}`): объём
токенов, который выдаёт администратор платформы. Пул **не сбрасывается по времени**: заказы тратят
его, пока не кончится, затем ключ получает 429 до следующей довыдачи. `limit: null` — пула у ключа
нет, он не участвует в проверке. Выдать пул себе нельзя; текущий остаток виден в личном кабинете
и в `GET /api-keys/{id}/statistics` (`limits.quota`).

Проверяется **до** создания при `POST /orders` (по оценке), `POST /orders/{order}/retry`
(по сумме чанков оригинала) и `.../regenerate`. Превышение → **HTTP 429** + `Retry-After`:

```json
{
  "success": false,
  "message": "API key token quota exceeded",
  "reason": "token_quota_exceeded",
  "window": "per_minute",
  "limit": 10000,
  "used": 9800,
  "requested": 500,
  "reset_at": "2026-07-08T13:00:00+00:00",
  "retry_after": 42
}
```
`window` — первое нарушенное окно. При 429 по квоте заказ **не создаётся**.

Исчерпан пул — тот же `reason`, но `window: "quota"`, `reset_at: null`, `retry_after: null` и
**без** заголовка `Retry-After`: ожидание не поможет, нужна довыдача администратором. Если
исчерпаны и пул, и окно, приходит `quota`.

```json
{
  "success": false,
  "message": "API key token quota exhausted: it does not reset over time, ask the administrator to grant more tokens",
  "reason": "token_quota_exceeded",
  "window": "quota",
  "limit": 1000000,
  "used": 999990,
  "requested": 500,
  "reset_at": null,
  "retry_after": null
}
```

### 6.3 PAYG-добор (квоты подписки не хватило)

Отдельная от лимитов развилка **оплаты**, а не отказа. Если заказ стоит больше, чем осталось токенов
в квоте подписки, и сервис разрешает pay-as-you-go (`Service.payg_access` ≠ `disabled`), недостающая
часть **списывается с LMC-баланса автоматически**, и заказ создаётся сразу (**201**) — отдельного
подтверждения не нужно (с 04.09.2026). Сколько ушло из квоты и сколько доплачено — в заказе:
`tokens_from_quota` / `tokens_from_payg` (§9). Не хватает и квоты, и денег на добор → **402
`insufficient_balance`**; PAYG у сервиса отключён → `insufficient_allowance` / `no_subscription`
(§12) — доплатить нельзя.

Поля `confirm_payg_topup` и `quote_token` принимаются ради совместимости и **игнорируются**. Ответы
**402 `payg_topup_required`** и **409 `quote_mismatch`** приходят только в режиме отката к явному
подтверждению, который включает оператор платформы: в норме их не бывает, но обработчик стоит
оставить как запасной путь — **Рецепт G (§11)**; формы тел — §12.

---

## 7. Справочник эндпоинтов

Формат: `МЕТОД путь` — `право` — параметры → ответ. Все пути относительны base `…/api/public`.

### 7.1 Orders

- **`GET /orders`** — `orders.read`
  Query: `page` (int≥1), `per_page` (int 1..100, деф. 20), `template_id` (uuid).
  `status` — строгий enum (невалидное значение → 422): `created`, `pending`, `in_progress`,
  `completed`, `result_delivered`, `failed`, `compensated`, `cancelled`, `partially_completed`
  (терминальные статусы — см. §5).
  `task_type` — строка или массив (`?task_type[]=tts&task_type[]=sfx`); мягкая валидация:
  неизвестный тип → пустой список, не ошибка.
  → `data` = пагинированный список `Order` (только ваши заказы).

- **`POST /orders`** — `orders.write` — см. §8.0 (тело). → 201, `data` = `Order`.

- **`GET /orders/{order}`** — `orders.read`. → `data` = `Order` (с `items`). 404/403.

- **`POST /orders/{order}/cancel`** — `orders.write`.
  Отменяет заказ в статусе `created`/`pending`/`partially_completed`, разблокирует средства,
  возвращает токен-квоту. У `created`/`pending` блокировка снимается целиком; у
  `partially_completed` готовые фрагменты оплачиваются, а возвращается только незавершённое
  (остаток блокировки — на баланс, неизрасходованные токены — в квоту подписки). Итоговый статус —
  `cancelled`. → `data` = `Order`. Недопустимо → 400.

- **`POST /orders/{order}/retry`** — `orders.write`.
  Создаёт **новый** заказ с теми же параметрами (исходный должен быть `completed`/`result_delivered`,
  без `failed`-чанков). Оценка квоты = сумма `price_units` чанков оригинала.
  Параметры — **снимок исходного заказа**: конфиг шаблона на момент его создания и тот же
  `config_override`, а не текущее состояние шаблона; правка и удаление шаблона на повтор не влияют
  (заказы, созданные до конца сентября 2026 года, снимка не имеют и повторяются по текущему
  шаблону). Снимок, который больше не проходит текущую схему сервиса, → **400**
  `retry_config_outdated` (§12).
  **Тело (оба поля опциональны, как у `POST /orders`):** `confirm_payg_topup` (boolean),
  `quote_token` (string) — нужны только в режиме отката (§6.3), иначе игнорируются. Retry проходит
  **тот же биллинг-flow, что и создание**: добор сверх квоты подписки списывается автоматически, не
  хватает денег → **402** `insufficient_balance`, доменный отказ → **403/422**, токен-квота ключа →
  **429** (см. §8.0 и таблицу reason в §12).
  → 201, `data` = новый `Order`.

- **Дубляж готового заказа** — `GET /orders/dubbing/options`, `GET /orders/{order}/dub/quote`,
  `POST /orders/{order}/dub`: см. §7.14.

- **`POST /orders/chunks/preview`** — `orders.read` (preview не мутирует данные — логически
  чтение). **Бесплатно**, токен-квоту ключа не тратит. Dry-run разбиения текста на чанки и
  расчёта стоимости — БЕЗ создания заказа, тот же расчётный конвейер, что и `POST /orders`.
  Тело: `{ template_id, input_text, task_type?, previous_preview_id?, text_hash?,
  generation_mode? }`. Throttle: 30/мин (`public-chunks-preview`, отдельный от `orders.write`).
  → **200** `{ status: "ready", preview_id, summary, chunks, page }` — TTS-текст ≤ 50 000
  символов (и любой non-TTS). → **202** `{ status: "processing", preview_id }` — TTS-текст
  длиннее порога, расчёт в фоне, результат — WS-событие `.ready` на канале
  `private-chunks.preview.{userId}` (см. §10) либо ручной поллинг GET ниже. → 422 без
  `input_text`, и тот же `422` `template_model_outdated`, что у `POST /orders` (§12), если шаблон
  несёт настройки прежней схемы сервиса. Превышение пауз-капов НЕ роняет запрос (в отличие от `POST /orders`) —
  приходит `summary.caps_ok=false`. `preview_id` — sha256-хеш (64 hex, БЕЗ дефисов), детерминирован
  по (текст+шаблон+режим): повторный запрос того же текста отдаётся из кэша мгновенно, в т.ч. если
  тот же текст уже считался веб-сессией того же аккаунта (кэш общий по `user_id`, не по способу
  входа). Полный референс — `docs/PUBLIC_API_CHUNK_PREVIEW.md`.

- **`GET /orders/chunks/preview`** — `orders.read`. Preflight по хешу текста — без пересылки
  самого текста. Query: `template_id` (uuid), `text_hash` (sha256 сырого `input_text`,
  нижний регистр hex), `generation_mode?`. Throttle: 120/мин
  (`public-chunks-preview-read`). → 200 (ready)/202 (processing)/404 (нет в кэше — шлите POST).

- **`GET /orders/chunks/preview/{previewId}`** — `orders.read`. Страница уже посчитанных
  чанков (без пересчёта). `{previewId}` — sha256-хеш, НЕ UUID. Query: `page?` (с 1), `per_page?`
  (деф. 100, макс 500). Throttle: 120/мин (`public-chunks-preview-read`). → 200/202/404
  (протухло/упало — пере-отправьте POST).

### 7.2 Order Items (чанки заказа)

Все — ownership по заказу (право `orders.*`).

- **`GET /orders/{order}/items`** — `orders.read` → `data` = массив `OrderItem` (без пагинации).
- **`GET /orders/{order}/items/{item}`** — `orders.read` → `data` = `OrderItem`.
- **`GET /orders/{order}/items/{item}/text`** — `orders.read` →
  `data` = `{ "text": string|null, "length": int, "original_text_length": int, "free_length": int,
  "billable_length": int, "max_billable_length": int, "max_raw_length": int, "surcharge_applies": bool,
  "capacity_unit": "chars"|"utf8_bytes", "raw_length": int }`
  — готовые пределы правки: `free_length` — оплаченный объём, `max_billable_length` — предел с
  доплатой, `max_raw_length` — ёмкость фрагмента (её оплатой не снять) в единице `capacity_unit`:
  `chars` — символы, `utf8_bytes` — байты UTF-8 (Fish Audio: русская буква — 2 байта, латинская — 1);
  `raw_length` — длина текущего текста в той же единице. Текст, удалённый по сроку
  хранения, — `422` `input_expired`.
- **`POST /orders/{order}/items/{item}/retry`** — `orders.write`.
  Тело: `{ "text"?: string(max 50000) }`. Повторяет **сбойный** чанк — `policy_flagged` **или**
  `failed` (заказ при этом `partially_completed`). В пределах оплаченной длины (`free_length`)
  новых денег и токен-квоты НЕ тратит (использует уже залоченный остаток
  `price_units − consumed_units`); текст длиннее оплаченного (до `max_billable_length`) берёт
  доплату за превышение — она учитывается в токен-квоте ключа и возвращается, если повтор не
  удался. Без `text` повторяется **тот же** текст; с `text` — заменяет текст чанка. Лимит попыток —
  5. Недоступно для `sfx`/`music`. → 201, `data` = `OrderItem`. Отказы — с `reason`/`error_code`:
  `402` (`insufficient_funds`, `insufficient_balance`, `insufficient_allowance`), `409`
  (`active_retry_exists`, `stitch_in_progress`), `422` (`invalid_status`, `invalid_order_status`,
  `max_attempts_reached`, `text_over_capacity`, `content_blocked`, `input_expired`,
  `retry_config_outdated` — настройки заказа не проходят текущую схему сервиса, §12, …), `503`
  (`service_maintenance`), `429` — токен-квота ключа за доплату. **При `policy_flagged` шлите
  исправленный `text` — см. плейбук §7.11.**
- **`POST /orders/{order}/items/retry-failed`** — `orders.write`. **Массовый повтор.**
  Тело **пустое**. Ставит на повтор все чанки заказа в статусе `failed` разом — вместо обхода
  `.../items/{item}/retry` в цикле. `policy_flagged` сюда **не входит**: тот же текст отклонят
  снова, такие чанки перезапускают поштучно с исправленным `text`.
  → **`202`** (не 201): план принят, работа идёт в фоне. `data`:

  ```json
  {
    "queued_count": 2,
    "queued": [
      { "item_id": "9a1e4f60-2b77-4a1c-8d33-5c0e1b7a9f21", "chunk_index": 3 },
      { "item_id": "7c4b18ad-6e02-4f9b-91a7-0d2c5e8b3f14", "chunk_index": 5 }
    ],
    "skipped_count": 1,
    "skipped": [
      { "item_id": "1f2d90c4-3a15-4e6b-b8d2-7f4a6c1e0b93", "chunk_index": 7,
        "reason": "policy_flagged",
        "reason_label": "Чанк отклонён политикой контента — перезапустите его отдельно с исправленным текстом." }
    ]
  }
  ```

  Синхронного результата у вызова нет **по построению** (повтор чанка — это чтение/запись S3 и
  транзакция на каждый элемент): дождитесь `GET .../items` либо слушайте WebSocket —
  событие `bulk_retry.completed` (§10). `reason` каждого пропуска — машинный код:

  | `reason` | Смысл | Что делать |
  | --- | --- | --- |
  | `superseded` | у чанка уже есть успешная версия (либо последняя версия — перегенерация) | ничего, чанк здоров |
  | `active_retry_exists` | повтор уже идёт (`pending`/`processing`) | дождаться |
  | `policy_flagged` | нужен исправленный текст | поштучный retry с новым `text` (§7.11) |
  | `max_attempts_reached` | исчерпан лимит попыток (5) | только новый заказ |
  | `insufficient_funds` | не осталось залоченного остатка (`price_units − consumed_units`) | только новый заказ |

  `reason_label` — тот же код словами, на языке ключа; **логику стройте по `reason`**, не по label.
  **Биллинг:** бесплатно, как и поштучный retry (переиспользует уже заблокированный остаток),
  токен-квоту ключа не расходует.
  **Отказы на уровне заказа** — телом `{ "success": false, "message": "…", "reason": "<машинный>",
  "error_code": "<то же значение>" }`:
  `409` `stitch_in_progress` (по заказу идёт склейка), `422` `invalid_order_status` (заказ не
  `partially_completed`), `422` `generative_not_supported` (`sfx`/`music`), `422` `nothing_to_retry`
  (перезапускать нечего), `422` `retry_config_outdated` (настройки заказа не проходят текущую схему
  сервиса — отказ синхронный, повтор не ставится, §12), `503` `service_maintenance` (приём
  сервиса, исполняющего заказ, приостановлен — тоже синхронно, план не принимается). Отдельными
  схемами в спеке они не описаны: коды рождаются в бизнес-исключении, а не в валидации запроса.

- **`POST /orders/{order}/items/{item}/regenerate`** — `orders.write`.
  Тело: `{ "text": string(required, max 50000) }` (пустой → 422; длиннее ёмкости фрагмента
  `max_billable_length` → `422` `text_over_capacity`). Платная перегенерация **`completed`**-чанка
  (не сбойного!): стоимость — по всей новой длине, квота-precheck → 429. Отказы: `402`
  (`insufficient_balance`, `insufficient_allowance`), `422` (`invalid_status`, `text_not_voiceable`,
  `content_blocked`, `retry_config_outdated` — §12, …), `503` (`service_maintenance`). Недоступно для `sfx`/`music`. → 201,
  `data` = `OrderItem`.

### 7.3 Storage (скачивание результатов)

- **`POST /storage/url`** — `orders.download`.
  Тело:

  | Поле | Правило | Дефолт | Назначение |
  | --- | --- | --- | --- |
  | `path` | **required**, string | — | Путь файла как в `result.files[]`/`service_files[]` (строка целиком) |
  | `download` | sometimes, boolean | `false` | `true` — ссылка помечается как attachment: файл скачается под человекочитаемым именем заказа, а не откроется во вкладке |
  | `number_base` | sometimes, integer (`0` или `1`) | `1` | С какого числа нумеруются чанки в имени файла (`0` → первый чанк «0») |
  | `number_padding` | sometimes, integer (`1..4`) | `3` | Ширина номера чанка с ведущими нулями (`3` → «007») |

  → `data` = `{ "url": string }` (временная ссылка, качать обычным GET; TTL по умолчанию ~60 мин —
  после истечения запросите заново, сам файл живёт до ретенции заказа, см. §13).
  Коды: 200 / 403 (чужой файл) / 404 (файл не найден/истёк по ретенции) / 422 (`path` не передан) /
  500 (временная ошибка генерации, повторить).
  > `number_base`/`number_padding` держите одинаковыми с запросом ZIP-архива, иначе один и тот же
  > чанк называется по-разному поштучно и внутри архива.

### 7.4 Templates

- **`GET /templates`** — `templates.read`. Постраничный список шаблонов, новые первыми.
  Query: `page` (≥1), `per_page` (**1..30**, деф. 30), `search` (подстрока названия, ≤100),
  `service` (code сервиса), `folder_id` (uuid; без него — корень, `folder_id = null`),
  `sort_by` (`created_at|name`, деф. `created_at`), `sort_order` (`asc|desc`, деф. `desc`).
  → `data` = `{ items:[Template], current_page, last_page, per_page, total }`. `per_page > 30` → **422**.
  Все шаблоны — проходом `page=1, 2, …` до `current_page = last_page`; искать нужный —
  `search`/`service`, а не выкачкой всего списка.
  > **Устарело (с 06.10.2026):** запрос **без единого параметра** по-прежнему отдаёт все корневые
  > шаблоны массивом в `data` (без пагинации) и несёт заголовки `Deprecation`, `Sunset` (дата
  > снятия, 06.11.2026) и `Link: <…?page=1&per_page=30>; rel="successor-version"`. После даты снятия
  > такой запрос получит первую страницу (`data` станет объектом). Переход: добавить `?page=1` и
  > читать `data.items`.
  > Шаблон на каждый заказ заводить не нужно: один шаблон переиспользуется, а настройки под
  > конкретный заказ (голос, скорость и т.п.) меняет `config_override` в `POST /orders` (§8.1).
- **`GET /templates/browse`** — `templates.read`.
  Query: `page` (≥1), `per_page` (1..100, деф. 15), `sort_by` (`name|created_at`, деф. `name`),
  `sort_order` (`asc|desc`, деф. `asc`), `folder_id` (uuid), `service` (code сервиса).
  → `data` = `{ items:[Template-lite], current_page, last_page, per_page, total, current_folder, breadcrumbs }`.
- **`GET /templates/config-options`** — `templates.read`.
  Query: `service` (required, code активного сервиса). → `data` = карта опций конфига сервиса
  (дескрипторы полей: `type`, `options`, `min`, `max`, `step`, `default`, `nullable`). Используйте
  её, чтобы узнать допустимые ключи/значения `config` для шаблона данного сервиса.
- **`POST /templates`** — `templates.write` — см. §8.2 (тело). → 201, `data` = `Template`.
- **`GET /templates/{template}`** — `templates.read` → `data` = `Template`.
- **`PUT|PATCH /templates/{template}`** — `templates.write`. Частичное обновление
  (`name`, `is_public`, `folder_id`, и `service_key`+`config` вместе). → `data` = `Template`.
  Уже созданные заказы правка не меняет: они выполняются, повторяются и показываются
  (`template.config` в `GET /orders/{order}`) с настройками на момент своего создания (§9).
  Исключение — заказы, созданные до конца сентября 2026 года: снимка у них нет, они идут по
  текущему конфигу шаблона с `config_override`, и правка их затрагивает.
- **`DELETE /templates/{template}`** — `templates.write` → `data: null`. Шаблон пропадает из
  `GET /templates` и `/templates/browse`, запросы к `/templates/{template}` → **404**, новый
  заказ или превью с этим `template_id` → **422**, как на несуществующий шаблон. Созданные по нему
  заказы выполняются дальше (заказы до конца сентября 2026 года — по конфигу шаблона на момент
  удаления); если они есть, шаблон сохраняется скрытым, и `GET /orders/{order}` по-прежнему
  показывает его в `template` (§9).

### 7.5 Voices — LumVoice (внутренние голоса)

Право `voices.read`. Элемент — `LumVoice` (см. §9).

- **`GET /voices`** — мои голоса. Query: `voice_status`
  (`pending_clone|cloning|ready|partially_ready|clone_failed|archived`; `partially_ready` — часть
  языков склонирована, часть упала, рабочие языки доступны), `publication_status`
  (`private|pending_review|public|rejected`), `language_code`, `search`, `sort_by`
  (`created_at|updated_at|display_name|last_used_at|usage_count_total`, деф. `created_at`),
  `sort_order` (`asc|desc`, деф. `desc`), `per_page` (1..100, деф. 20). → пагинированный список `LumVoice`.
- **`GET /voices/library`** — моя библиотека. Query: `available` (bool), `search`, `language_code`,
  `sort_by` (`added_at|created_at|nickname`), `sort_order`, `per_page`.
  → пагинированный список `{ id, voice_id, nickname, added_at, available, unavailable_reason, origin("own"|"library"), voice: LumVoice|null }`.
- **`GET /voices/public`** — публичный каталог. Query: `tag_ids` (array<int>: `tag_ids[]=1&tag_ids[]=2`;
  одно значение `tag_ids=5` и список через запятую `tag_ids=1,2` тоже принимаются), `language_code`,
  `gender` (`male|female|neutral`), `search`, `sort` (`popular|newest|name`, деф. `popular`),
  `per_page`. → пагинированный список `LumVoice` (только публичные, ready, разрешённые в заказах).
- Во всех трёх списках тип query проверяется: массив на месте строки (`search[]=x`), нечисловой
  `per_page` или элемент `tag_ids`, не-булев `available` → `422` с `errors.<поле>`. Неизвестное
  значение перечисления (`sort_by=foo`, `voice_status=foo`) — не ошибка: фильтр игнорируется,
  `per_page` сверх 100 зажимается до 100.
- **`GET /voices/tags`** → `data` = массив `{ id, code, name, description, color, sort_order }`.
- **`GET /voices/{voice}`** → `data` = `LumVoice` (свой / публичный / из библиотеки). 404/403.

### 7.6 Voices — внешние провайдеры (ElevenLabs, HeyGen, Cartesia, Fish Audio)

Право `voices.read`, read-only. Отсюда берут `voice_id` для TTS-шаблонов. У ElevenLabs и HeyGen
обёртка — **внутри `data`**: `data = { voices: [...], total, page, page_size, has_more }`, `page`
**с 0**. У Cartesia — обычная пагинация (`items`, `page` с 1), см. последний пункт.

- **`GET /voices/elevenlabs/library`** — публичная Voice Library ElevenLabs.
  Query: `search`, `sort`, `required_languages`, `accent`, `use_cases`, `page` (≥0, деф. 0),
  `page_size` (≥1, деф. 30); `gender` — строгий enum `male|female`; `age` — строгий enum
  `young|middle_aged|old` (именно так, через нижнее подчёркивание; «middle-aged» → 422).
  Элементы — объекты ElevenLabs.
  **Зависит от внешнего API ElevenLabs → 503 при недоступности.**
- **`GET /voices/heygen`** — каталог голосов HeyGen.
  Query: `language`, `accent`, `voice_engine` (CSV), `search`, `sort` (`name|newest|default`),
  `page` (≥0, деф. 0), `page_size` (1..200, деф. 55); `gender` — enum `male|female|unknown`.
  Третье значение есть **только здесь**: у ElevenLabs — `male|female`, у LumVoice
  (`GET /voices/public`) — `male|female|neutral`. HeyGen отдаёт часть голосов без указанного пола.
  Элемент: `{ voice_id, voice_name, display_name, gender, language, locale, accent, flag_url,
  preview_url, voice_engines:[...], labels:{...}, support_realtime, emotion_support, support_locale }`.
- **`GET /voices/heygen/filters`** →
  `data = { voice_engines:[{value,count}], genders:[...], languages:[...], accents:[...], labels:[...] }`.
- **`GET /voices/cartesia`** — каталог голосов Cartesia (около тысячи голосов, ~40 языков).
  Query: `language` (ISO 639-1, напр. `ru`), `gender` (`masculine|feminine|gender_neutral` —
  написание Cartesia, не `male/female`), `search` (по названию и описанию), `page` (≥1),
  `per_page` (1..200, деф. 50). → пагинированный список
  `{ items:[CartesiaVoice], current_page, last_page, per_page, total }` (§9). `voice_id` элемента
  кладут в `tts_settings.voice_id` шаблона `cartesia`. Свои клоны в каталог не попадают — их
  `voice_id` отдаёт `GET /voices/cartesia/clones` (§7.12). Если сервис закрыт для владельца
  ключа (закрытый тест), ответ — **404** `reason: service_not_found`.
  `language` и `gender` — свободные строки, а не enum: опечатка (`gender=male`, `language=russian`)
  даёт **200 с пустым `items`**, а не 422. 422 бывает только на форме параметров (`per_page` > 200,
  `page` < 1, строка длиннее лимита). Пустой `items` при `total: 0` — проверьте написание фильтров.
- **`GET /voices/fishaudio`** — каталог голосов Fish Audio (публичные TTS-голоса Fish, обновляются
  раз в сутки; языки каталога — `ru`, `en`, `es`). Query: `language` (`ru|en|es`), `gender`
  (`male|female`), `search` (по названию и описанию), `page` (≥1), `per_page` (1..200, деф. 50).
  → пагинированный список `{ items:[FishAudioVoice], current_page, last_page, per_page, total }`
  (§9), порядок — по популярности (`task_count`). `voice_id` элемента (32 hex-символа, не UUID)
  кладут в `tts_settings.voice_id` шаблона `fishaudio`. Свои клоны в каталог не попадают — их
  `voice_id` отдаёт `GET /voices/fishaudio/clones` (§7.12). Сервис в закрытом тесте и ключ не
  бета-тестера → **404** `reason: service_not_found`. Фильтры — свободные строки: опечатка даёт
  **200 с пустым `items`**, а не 422.
  Подписка для каталога не нужна — только право `voices.read` и доступ к сервису. Полные примеры
  ответов — §7.12, «Ответы по кодам».

`preview_url` — подписанная ссылка на аудио-превью, играется обычным `<audio>`.

### 7.7 Billing / Usage

Право `billing.read`.

- **`GET /usage`** → `data` = массив записей потребления:
  `{ limit_id, service_id, service_code, service_name, entitlement_id, entitlement_code, limit_type,
  limit_value, used, remaining, period_start, period_end, resets_in }`.
  `period_start`/`period_end`/`resets_in` — `null`, если в текущем периоде расхода не было (`used` при
  этом 0): учёт открывается первым расходом, а не по календарю — так не только у новых пользователей,
  но и у тех, кто тратил лимит в прошлых периодах. `null` здесь не значит «лимит не применяется».
  Запись с `limit_type: "voice_clones"` (сервис `cartesia`) — потолок клонов голоса вашего тарифа:
  `limit_value` — потолок, `used` — клоны в `pending`/`cloning`/`ready`, `remaining` — сколько ещё
  можно создать. Периода и сброса у неё нет (`period_*`, `resets_in` = `null`): место освобождает
  архивирование клона или отказ клонирования.
- **`GET /usage/{service}`** — `{service}` = код сервиса (`service_code` из `GET /usage`, он же
  `service_key` шаблона: `elevenlabs`, `cartesia`…); для совместимости принимается и числовой id. Тот же
  формат, по одному сервису. Неизвестный или закрытый для вас сервис → 404.

- **`GET /wallets`** — кошельки владельца ключа. Query: `page`, `per_page` (деф. 20; кошельков
  обычно единицы). → `data` = страница `{ items, current_page, last_page, per_page, total }`, элемент —
  `{ id, user_id, asset_id, purpose, balance, locked_balance, balance_formatted,
  locked_balance_formatted, balance_converted, asset, deleted_at, created_at, updated_at }`. `balance`/`locked_balance` — целые minor units
  актива: реальное значение = `balance / 10^asset.precision` (делитель не 100 — смотрите
  `asset.precision`); `*_formatted` — уже готовое к показу число. `locked_balance` — заблокировано под
  идущие заказы.
- **`GET /ledger-transactions`** — история движений средств. Query: `page`, `per_page` (1..100, деф. 15),
  `wallet_id` (только ваш кошелёк, чужой → 422), `type` (enum `LedgerTransactionType`, неизвестное → 422:
  `deposit`, `order_completion`, `order_refund`, `referral_reward`, `policy_block_fee` и др.), `sort_by`,
  `sort_order`. → `data` = та же страница, элемент — `{ id, type, status, description, amount,
  amount_formatted, asset, direction, created_at, entries[] }`; у движения мимо кошелька `entries`
  пуст, а сумма — в полях транзакции. Запись `entries[]` — `{ id, wallet_id, amount, amount_formatted,
  asset, entry_type, created_at }` (`amount` записи со знаком). Суммы — целые minor units: делитель —
  `asset.precision`, `amount_formatted` — уже готовое к показу число. `direction` (`credit`/`debit`)
  у блокировки и разблокировки под заказ (`lock_balance`/`unlock_balance`) считается по доступному
  балансу: блокировка — `debit`, разблокировка — `credit` (деньги не покидают кошелёк).

> Обе ручки (право `billing.read`) существуют только при включённом кошельке: в модели «без аванса»
> маршрутов нет → 404. Публичный surface состояния услуги в любой конфигурации — `usage` и
> `subscriptions`.

### 7.8 Subscriptions

- **`GET /subscriptions`** — `billing.read`. Без параметров. → `data`:
```json
{
  "available_models": ["<model_key>", "..."],
  "subscriptions": [
    {
      "id": 1, "status": "active",
      "current_period_start": "…", "current_period_end": "…",
      "items": [
        {
          "plan": { "code": "pro", "name": "Pro" },
          "status": "active", "is_usable": true, "billing_period": "monthly",
          "start_at": "…", "end_at": "…",
          "token_allowance": 1000000, "tokens_used": 12345, "tokens_remaining": 987655
        }
      ]
    }
  ]
}
```
Возвращаются только «живые» подписки (Active и срок не истёк). Денежных полей нет.

### 7.9 Profile

- **`GET /user`** — `profile.read`.
  Query: `include` (CSV, whitelist; неизвестное игнорируется):
  `wallets, telegram, subscriptions, referral, order_settings, entitlements, usage, unread_notifications_count`.
  → `data` = `User` (см. §9) + подмешанные `extras` из include (напр. `usage`, `unread_notifications_count`).
- **`GET /key`** — без права, любой действующий ключ. Ключ, которым подписан запрос:
  `{ id, name, permissions[], is_active, expires_at, limits }`. `id` и `name` — как в кабинете;
  `permissions: []` — прав Public API нет (эта ручка работает, остальные `/api/public/*` → 403;
  доступ к AI API от прав не зависит — его включает галочка AI на ключе);
  `limits` — та же форма, что у ключа в кабинете (`requests.*`, `tokens.*`, пул `tokens.quota`
  `{limit, used, remaining}`). Секрета и его хеша в ответе нет. Отозванный/истёкший ключ → 401.

### 7.10 Сервисные файлы (субтитры, alignment)

Помимо основного результата (`result.files[]` — аудио/изображения), заказ может нести **сервисные
файлы** в **отдельном** поле `result.service_files[]`. О них не догадаться из `files` — это разные
контейнеры.

**Форма.** `service_files` — **плоский массив строк-путей**, ровно как и `files[]`:
```json
"result": {
  "user_message": null,
  "files": [ "storage/501/orders/<ORDER_UUID>/output/final/result.mp3" ],
  "service_files": [
    "storage/501/orders/<ORDER_UUID>/output/final/service/subtitles.srt",
    "storage/501/orders/<ORDER_UUID>/output/final/service/subtitles.vtt",
    "storage/501/orders/<ORDER_UUID>/output/final/service/result.json"
  ]
}
```
Пути абсолютные (как у `files`), готовы к обмену на ссылку.

**Типы (видимые потребителю).** Различаются **по расширению / сегменту `/service/`** в самой строке —
отдельного поля `type` у элемента НЕТ:
- **субтитры** — `.srt` / `.vtt` / `.lrc` (basename `subtitles.*`);
- **alignment** — пословное/посимвольное выравнивание текст↔аудио (`alignment.*`);
- **result.json** — богатые тайминги (el-timestamps): караоке, пословная подсветка, точная синхронизация.

(Типы `raw_chunk` — сырые данные чанка — и `metadata` отдаются только админу, потребителю по ключу
не видны: скачивание такого пути вернёт 403.)

**Только TTS.** Субтитры/alignment генерируют TTS-сервисы. У `sfx`/`music` поля `service_files`
**нет** (заказ его не содержит).

**Скачивание** — тем же `POST /storage/url` c `path` = строкой из `service_files[]` (право
`orders.download`):
```bash
curl -s -X POST "$BASE/storage/url" -H "X-API-KEY: $KEY" -H "Content-Type: application/json" \
  -d '{ "path": "storage/501/orders/<ORDER_UUID>/output/final/service/subtitles.srt" }'
```

**Только на уровне заказа.** `service_files` есть в `order.result` (`GET /orders/{order}` и в списке
`GET /orders`). На уровне отдельного чанка (`GET /orders/{order}/items/{item}`) сервисные файлы **не
отдаются** — там только основной `result_file` чанка.

### 7.11 Плейбук: обработка сбоев чанка

Заказ разбивается на чанки (`OrderItem`). Статусы чанка: `pending`, `processing`, `completed`,
`policy_flagged`, `failed`. Если часть чанков не удалась, заказ переходит в **`partially_completed`**
(нетерминальный) — успешные чанки готовы, сбойные ждут вашего действия.

**Два вида сбоя чанка:**
- **`failed`** — техническая ошибка (таймаут воркера, сбой генерации). Обычно достаточно повторить
  как есть.
- **`policy_flagged`** — контент отклонён политикой провайдера (напр. ElevenLabs). **Повтор с тем же
  текстом будет отклонён снова** — нужен исправленный текст.

**Четыре инструмента (не путать):**

| Действие | Для чанка в статусе | Что делает | Стоимость |
| --- | --- | --- | --- |
| `POST .../items/retry-failed` | все `failed` заказа сразу | массовый повтор одним вызовом, `202` + план `queued`/`skipped`; `policy_flagged` пропускает | бесплатно (залоченный остаток) |
| `POST .../items/{item}/retry` | `policy_flagged` **или** `failed` | повторяет сбойный чанк (опц. новый `text`); заказ должен быть `partially_completed` | бесплатно (залоченный остаток) |
| `POST .../items/{item}/regenerate` | `completed` | переделывает уже готовый чанк новым `text` | платно (новая токен-квота, precheck → 429) |
| `POST /orders/{order}/retry` | — (весь заказ) | создаёт **новый** заказ теми же параметрами — по настройкам исходной генерации (снимок шаблона на момент создания заказа + `config_override`), даже если шаблон с тех пор изменили или удалили; заказы, созданные до 26.09.2026, повторяются по текущему шаблону. Исходный должен быть `completed`/`result_delivered` без `failed`-чанков | платно (новый заказ) |

**Как дотянуть `partially_completed` до `completed`:**
1. Один вызов `POST /orders/{order}/items/retry-failed` — он заберёт все технические `failed`.
2. Оставшиеся `policy_flagged` (они придут в `skipped[]` с этой причиной) добейте поштучно
   `POST .../items/{item}/retry` с **исправленным** `text`.

Order-level `POST /orders/{order}/retry` для этого **не подходит** (он не принимает
`partially_completed` и падает при наличии `failed`-чанков). Поштучный обход тоже рабочий путь —
просто дороже по числу запросов; на длинном тексте это десятки вызовов вместо одного.

**Правило policy_flagged:**
1. Получите текущий текст чанка: `GET /orders/{order}/items/{item}/text`.
2. Исправьте формулировку (уберите/перефразируйте потенциально проблемный фрагмент).
3. Повторите с исправленным телом: `POST .../items/{item}/retry` `{ "text": "<новый текст>" }`.

> **Причина policy/сбоя наружу НЕ отдаётся.** API не сообщает, *что именно* не понравилось
> провайдеру: поля с reason нет, а у полностью упавшего заказа `result` приходит `null`. Правьте
> текст по своему усмотрению — не ищите несуществующее поле с причиной.

**`can_retry` / `can_regenerate` ≠ гарантия успеха.** Эти булевы флаги в `OrderItem` смотрят
**только на статус чанка** (`can_retry` = `policy_flagged`/`failed`; `can_regenerate` = `completed`).
Фактический вызов может всё равно вернуть **400**, если: заказ не `partially_completed`, исчерпан
лимит попыток (5), не осталось залоченного остатка, либо тип задачи — `sfx`/`music`.

**`sfx`/`music`:** item-retry и regenerate для них **недоступны** (одноразовая генерация). При
неудаче — отмените (`cancel`, пока возможно) и создайте заказ заново.

### 7.12 Клоны голоса Cartesia и Fish Audio

Свой голос по образцу записи → `voice_id` для озвучки сервисом `cartesia`. Клон — это не заказ:
у него свои эндпоинты, своя модель (`CartesiaVoiceClone`, §9) и своё WS-событие. Токены
подписки клонирование не тратит.

**Кто может клонировать.** Проверки создания и повтора — по порядку (первая не пройденная
определяет ответ):

0. ключ (**401**), право `voices.write` (**403**), лимит частоты клонирования (**429**), затем форма
   тела (**422** с `errors`: нет поля, `consent_confirmed` не `true`, `language` не из списка);
1. доступ к сервису `cartesia` (пока сервис в закрытом тесте, — только бета-тестерам) → иначе
   **404** `service_not_found`;
2. живая подписка с правом Cartesia (тарифы от Creator; Start его не включает) нужна, только
   если сервис закрыт для оплаты с баланса (`payg_access = subscribers_only`) → иначе **402**
   `no_subscription`; если сервис открыт для оплаты с баланса, клонировать можно и без подписки.
   Исчерпанная квота токенов клонированию не мешает;
3. потолок клонов: без подписки (и на тарифе без правила, например Start) — запасной потолок 2;
   с подпиской — лимит тарифа: Creator — 3, Studio — 5, Pro — 7, NOT Secret — 10, Studio Max — 15
   (при двух подписках действует более щедрая) → иначе **422** `voice_clone_quota_exceeded` с
   полем `max` (потолок). Место держат клоны в `pending`, `cloning` и `ready`; освобождают
   архивирование и отказ. Текущее число — в `GET /usage` (`limit_type: "voice_clones"`, §7.7);
4. только при создании — разбор образца: битый base64, больше 20 МБ, формат вне списка → **422** с
   `errors.reference_audio`. Образец проверяется ПОСЛЕ подписки и потолка: при закрытом для оплаты с баланса сервисе
   большой файл без подписки получит 402, а не ошибку размера.

Список и архивирование работают со своими клонами без этих проверок: истёкшая подписка созданные
клоны не прячет и удалить их не мешает. Озвучивать клоном — это уже обычный заказ `cartesia`
(квота, добор, лимиты — §6, §8.2).

**Жизненный цикл** (`status`): `pending` (в очереди) → `cloning` (клонируется) → `ready` (есть
`voice_id`) либо `failed` (причина в `error`). `archived` — снят владельцем. Попытка без ответа дольше 3 часов
закрывается как `failed` с `error.reason: timeout`.

- **`GET /voices/cartesia/clones`** — `voices.read`. Свои клоны, новые сверху. Query: `status`
  (`pending|cloning|ready|failed|archived`; без параметра — все, кроме `archived`), `search` (по
  `display_name`), `page` (≥1), `per_page` (1..100, деф. 20). → пагинированный список
  `{ items:[CartesiaVoiceClone], current_page, last_page, per_page, total }`.
- **`GET /voices/cartesia/clones/quota`** — `voices.read`. Квота клонов ДО попытки создания
  (без лимита частоты). → `data` = `{ limit, used, remaining, can_create, reason, ban_reason }`:
  `limit` — потолок (правило тарифа, иначе запасной 2; `null`, если проверка отказала раньше
  подсчёта — бан или `no_subscription` у сервиса, закрытого для оплаты с баланса), `used` —
  клоны в `pending|cloning|ready`, `remaining` — свободные места (`null` при `limit: null`).
  `can_create: false` + `reason` — тот же код, что отдало бы создание: `no_subscription`,
  `voice_clone_banned` (причина в `ban_reason`), `voice_clone_quota_exceeded`. Закрытый
  сервис — **404** `service_not_found`. Отдельная ручка; число занятых мест есть и в `GET /usage`.
- **`POST /voices/cartesia/clones`** — `voices.write`. Лимит частоты — на пользователя, общий с
  клонированием голосов LumVoice в кабинете (по умолчанию 6 в минуту и 60 в сутки), превышение —
  **429** `rate_limit_exceeded`. Тело JSON:

  | Поле | Правило |
  | --- | --- |
  | `display_name` | **required**, string, max 128 — название, видно только вам |
  | `reference_audio` | **required**, string — образец в base64 (можно data URI `data:audio/wav;base64,…`), **до 20 МБ** после декодирования; формат определяется по содержимому: WAV, MP3, M4A/MP4, AAC, OGG, WebM, FLAC. Нужна чистая речь одного человека без музыки и шума |
  | `language` | nullable, ISO 639-1 из списка Cartesia (`en, ru, uk, de, fr, es, pt, it, nl, pl, sv, tr, cs, sk, bg, ro, hu, el, fi, da, no, hr, ka, he, ar, hi, bn, ta, te, gu, kn, ml, mr, pa, ja, ko, zh, vi, th, id, ms, tl`) — язык образца |
  | `description` | nullable, string, max 500 |
  | `consent_confirmed` | **required**, `true` (принимаются и `1`/`"yes"`/`"on"`) — подтверждение, что голос ваш или у вас есть право его использовать |

  → **201**, `data` = `CartesiaVoiceClone` в `pending` (или сразу `failed` с
  `error.reason: dispatch_failed`, если очередь недоступна, — тогда повторите через `retry`).
  Битый base64, файл больше 20 МБ или формат вне списка → **422** с ошибкой на `reference_audio`.
- **`POST /voices/cartesia/clones/{voiceClone}/retry`** — `voices.write`, тот же лимит частоты, что у создания.
  Новая попытка клона в `failed` с тем же образцом; клон возвращается в `pending` и снова
  занимает место, поэтому проверки те же, что у создания (404/402/422). Не `failed` (или образец
  уже удалён) → **409** `voice_clone_not_retryable`. → **200**, `data` = клон.
- **`DELETE /voices/cartesia/clones/{voiceClone}`** — `voices.write`. Архивирует: клон уходит в
  `archived`, в новые шаблоны и заказы больше не принимается, образец удаляется, место в потолке
  освобождается. Заказы, уже принятые с этим голосом, доигрываются. Идемпотентно — повтор отдаёт
  тот же архивный клон. → **200**, `data` = клон.

`{voiceClone}` — UUID из поля `id` клона. Чужой или несуществующий клон → **404**
`voice_clone_not_found`. Причины отказа клонирования (`error.reason`): `processing_error`,
`max_retries`, `network`, `timeout`, `dispatch_failed`. Первое действие при любой — повтор; если
`processing_error` повторяется, смените образец (длиннее, чище, без музыки).

#### Ответы по кодам (каталог и клоны Cartesia)

Порядок проверок повтора: клон свой (**404** `voice_clone_not_found`) → доступ к сервису (**404**
`service_not_found`) → подписка (**402**) → клон в `failed` и образец на месте (**409**) → потолок
(**422** `max`). Тексты `message` — на языке ключа (`X-Locale`), ветвитесь только по `reason` и коду.

**200 `GET /voices/cartesia`:**
```json
{ "success": true, "message": "Success", "data": {
  "items": [ { "id": 12, "voice_id": "a0e99841-438c-4a64-b679-ae501e7d6091", "name": "Russian Narrator",
               "description": "Calm male narrator for audiobooks.", "language": "ru", "gender": "masculine",
               "preview_url": "https://…/preview.wav" } ],
  "current_page": 1, "last_page": 1, "per_page": 50, "total": 1 } }
```

**200 `GET /voices/cartesia/clones`** (форма `items[]` — та же, что `data` ниже):
```json
{ "success": true, "message": "Success", "data": {
  "items": [ { "id": "01a10e08-2ee3-73c2-88b2-8df2bcef9d1d", "provider": "cartesia",
               "display_name": "Narrator (my voice)", "language": "ru", "description": null,
               "status": "ready", "voice_id": "6afd76cb-2663-46f7-8f74-85221ce58c56", "attempts": 1,
               "error": null, "created_at": "2026-10-05T18:02:11+00:00",
               "completed_at": "2026-10-05T18:03:40+00:00", "failed_at": null } ],
  "current_page": 1, "last_page": 1, "per_page": 20, "total": 1 } }
```

**201 `POST /voices/cartesia/clones`** — клон принят, `voice_id` ещё нет:
```json
{ "success": true, "message": "Success", "data": {
  "id": "01a10e08-27fe-716f-b428-6bc739602ca6", "provider": "cartesia", "display_name": "My voice",
  "language": "ru", "description": null, "status": "pending", "voice_id": null, "attempts": 1,
  "error": null, "created_at": "2026-10-06T09:15:00+00:00", "completed_at": null, "failed_at": null } }
```
Сохраните `data.id` — по нему повтор, архив и поиск в списке. Ответ 201 — не «голос готов»: ждите
`status: "ready"` (WS или опрос списка раз в 5–10 с; обычно клон готов меньше чем за минуту,
потолок ожидания — 3 часа, после него `failed`/`timeout`).

**200 `POST …/{voiceClone}/retry`** — тот же клон: `status: "pending"`, `attempts` +1, `error: null`,
`failed_at: null`. **200 `DELETE …/{voiceClone}`** — тот же клон со `status: "archived"` (`voice_id`
остаётся в ответе, но в новых шаблонах и заказах уже не принимается).

**Ошибки** (у всех `success: false`):

| Код | Где | Тело |
| --- | --- | --- |
| 401 | везде | `{ "success": false, "message": "API key is missing. Provide it in the X-API-KEY header.", "data": null }` — ключа нет, он неверен, отключён или истёк (меняется только `message`) |
| 403 | везде | `{ "success": false, "message": "This API key does not have permission to perform this action." }` — нет `voices.read` (чтение) или `voices.write` (создание, повтор, архив). Добавьте право ключу в кабинете; повтор запроса не поможет |
| 402 | создание, повтор | `{ "success": false, "message": "An active subscription is required.", "reason": "no_subscription", "error_code": "no_subscription" }` |
| 404 | каталог, создание, повтор | `{ "success": false, "message": "Service not found.", "reason": "service_not_found", "error_code": "service_not_found" }` — сервис закрыт для владельца ключа; ни повтор, ни другой ключ того же аккаунта не помогут |
| 404 | повтор, архив | `{ "success": false, "message": "Voice clone not found.", "reason": "voice_clone_not_found", "error_code": "voice_clone_not_found" }` — нет такого `id` или клон чужой |
| 404 | повтор, архив | `{ "success": false, "message": "...", "reason": "endpoint_not_found", "error_code": "endpoint_not_found", ... }` — `{voiceClone}` не UUID, маршрут не совпал (форма — §6.1). Подставьте `data.id`, а не `voice_id`; такие 404 считаются перебором путей и ведут к бану IP |
| 409 | повтор | `{ "success": false, "message": "Only a clone that ended with an error can be retried.", "reason": "voice_clone_not_retryable", "error_code": "voice_clone_not_retryable" }` — клон `ready`, ещё идёт, архивный или образец уже удалён. Создайте новый клон |
| 422 | создание, повтор | `{ "success": false, "message": "Voice clone limit reached: no more than 3. …", "reason": "voice_clone_quota_exceeded", "error_code": "voice_clone_quota_exceeded", "max": 3 }` — потолок тарифа |
| 422 | все с телом/query | `{ "success": false, "message": "Validation error", "errors": { "consent_confirmed": ["The consent confirmed field must be accepted."], "reference_audio": ["The file is too large: 20 MB at most."] } }` — **без `reason`**; два вида 422 различайте по наличию `reason` |
| 429 | создание, повтор | `{ "success": false, "message": "Too many attempts. Please wait a moment and try again.", "reason": "rate_limit_exceeded", "error_code": "rate_limit_exceeded", "retry_after": 56 }` + заголовки `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining` |
| 429 | везде | окно частоты самого ключа (`throttle:api-key`) — форма и поля в §12 |
| 500 | создание | хранилище не приняло образец; клон не создан, место не занято — повторите запрос |

**Как считать лимит частоты клонирования (429).** Счётчик на пользователя (не на ключ и не на IP),
общий для всех его ключей, веб-кабинета и клонирования LumVoice; по умолчанию 6 в минуту и 60 в
сутки. Считается **каждая** попытка `POST /voices/cartesia/clones` и `…/retry`, включая отклонённые
422/402: цикл «отправил — 422 — исправил — отправил» тоже тратит лимит. Получив 429, ждите
`retry_after` секунд (или `Retry-After`): сами ответы 429 лимит не тратят, но до конца окна любая
попытка получит тот же 429. Проверяйте тело локально (base64, размер, `consent_confirmed: true`)
до отправки, чтобы не тратить попытки на 422.

**Ход клонирования — без поллинга:** подпишитесь на `private-cartesia-voice-clones.{userId}`
(право `voices.read`) и ловите `voice_clone.updated` (§10). Сквозной пример — Рецепт H (§11).

#### Клоны голоса Fish Audio

Те же ручки, тела, ответы, лимит частоты (общий с Cartesia и кабинетом) и жизненный цикл, что
выше, с путями `voices/fishaudio/clones` и моделью `FishAudioVoiceClone` (§9, `provider:
"fishaudio"`); `voice_id` готового клона кладут в `tts_settings.voice_id` шаблона `fishaudio`.

- **`GET /voices/fishaudio/clones/quota`** — `voices.read`: квота клонов Fish Audio, форма и
  смысл полей те же, что у `GET /voices/cartesia/clones/quota` (потолок и занятые места —
  Fish Audio, не Cartesia).
- **`GET /voices/fishaudio/clones`** — `voices.read`; **`POST /voices/fishaudio/clones`**,
  **`POST …/{voiceClone}/retry`**, **`DELETE …/{voiceClone}`** — `voices.write`.
- Подписка и запасной потолок — те же правила, что у Cartesia: подписка с правом Fish нужна,
  только если сервис закрыт для оплаты с баланса (иначе **402** `no_subscription`); без подписки
  доступно 2 клона, с подпиской — лимит тарифа.
- Отличия от Cartesia:
  1. **Свой потолок клонов.** Правило `voice_clones` тарифа на сервис `fishaudio` (по умолчанию
     Creator 3, Studio 5, Pro 7, NOT Secret 10, Studio Max 15); клоны Cartesia место Fish не
     занимают и наоборот. Превышение — **422** `voice_clone_quota_exceeded` с `max`. Текущее
     число — в `GET /usage` (`limit_type: "voice_clones"`, сервис `fishaudio`).
  2. **`voice_id` — 32 hex-символа**, не UUID; `id` самого клона по-прежнему UUID.
  3. **`language` — только справочная метка:** nullable, двухбуквенный код ISO 639-1 (`ru`, `en`…),
     список Cartesia не применяется, провайдеру язык не передаётся.
- Закрытый тест сервиса — **404** `service_not_found`; остальные отказы (401/403/404/409/422/429)
  и их тела — как у Cartesia (таблица выше и §12).
- Ход клонирования — WS `voice_clone.updated` на `private-fishaudio-voice-clones.{userId}`
  (право `voices.read`, §10).

**200 `GET /voices/fishaudio`:**
```json
{ "success": true, "message": "Success", "data": {
  "items": [ { "id": 31, "voice_id": "8ef4a238714b45718ce04243307c57a7", "name": "Russian Narrator",
               "description": "Calm male narrator.", "language": "ru", "languages": ["ru"],
               "gender": "male", "tags": ["male", "narration"], "author_name": "Fish",
               "task_count": 120450, "like_count": 380, "preview_url": "https://…/preview.mp3" } ],
  "current_page": 1, "last_page": 1, "per_page": 50, "total": 1 } }
```

**201 `POST /voices/fishaudio/clones`** — клон принят, `voice_id` ещё нет:
```json
{ "success": true, "message": "Success", "data": {
  "id": "01a10e08-27fe-716f-b428-6bc739602ca7", "provider": "fishaudio", "display_name": "My voice",
  "language": "ru", "description": null, "status": "pending", "voice_id": null, "attempts": 1,
  "error": null, "created_at": "2026-10-14T09:15:00+00:00", "completed_at": null, "failed_at": null } }
```
`GET /voices/fishaudio/clones` отдаёт `items[]` той же формы с `current_page`/`last_page`/`per_page`/`total`;
у готового клона `status: "ready"` и `voice_id` вида `8ef4a238714b45718ce04243307c57a7`.

### 7.13 Реселлер: выпуск и учёт подарочных кодов

Для пользователя с профилем реселлера (статус получают по заявке в кабинете). Подарочный код —
предоплата на LMC: тот, кто его активирует, получает номинал на баланс. Реселлер выпускает коды
со своего баланса со своей скидкой. **Пополнение баланса и заявка на роль по ключу недоступны** —
только в кабинете на сайте.

Общие отказы всех маршрутов раздела: **404** `reason: "not_reseller"` — у владельца ключа нет
профиля реселлера; **404** `reason: "gift_codes_disabled"` — подарочные коды выключены. Право
ключа проверяется раньше: без права — **403**.

- **`GET /reseller`** — `reseller.read`. Профиль: `status` (`active`/`blocked`/`revoked`),
  `discount_bps` (скидка в базисных пунктах, 1000 = 10%), `limits` (в т.ч. сколько кодов за один
  выпуск — `max_codes_per_issue`), `balance` (`available` — можно тратить, `held` — пополнения под
  заморозкой 24 ч, `debt` — долг после оспоренного платежа, вычитается из доступного при выпуске;
  миноры LMC + `*_formatted`).
- **`GET /reseller/settings`** — `reseller.read`. Готовые номиналы `nominals` (LMC-строки), границы
  своего номинала `min_nominal`/`max_nominal`, окно самоотмены `reseller_cancel_window_minutes`.
- **`GET /reseller/statistics?from=YYYY-MM-DD&to=YYYY-MM-DD`** — `reseller.read`. Деньги, коды, разрез
  по номиналам, ряд по дням. Даты — в зоне `X-Timezone`, без заголовка — UTC; по умолчанию 30 суток.
- **`GET /reseller/codes`** — `reseller.read`. Свои коды, новые первыми, **с полным `code`**.
  Фильтры `status` (`active`, `refunding`, `redeemed`, `refunded`, `cancelled`, `annulled`) и
  `source` (`reseller`, `purchase`); пагинация `page`, `per_page` (до 100) → `data.items[]`,
  `current_page`, `last_page`, `per_page`, `total`.
- **`GET /reseller/codes/{uuid}`** — `reseller.read`. Один свой код с полным `code`. Чужой или
  несуществующий — **404** `reason: "gift_code_not_found"`.
- **`POST /reseller/codes`** — `reseller.write`. Тело `{"nominals": ["100", "500"]}` — номинал каждого
  кода в LMC. Стоимость кода = номинал − личная скидка на момент выпуска; списывается с
  `balance.available`. → **201**, `data` — партия: `uuid`, `codes_count`, `nominal_total`, `cost_total`,
  `discount_bps`, `codes[]` с **полными** `code`.
  - **Заголовок `Idempotency-Key`** (необязательный, 1–64 символа `A-Z a-z 0-9 _ . : -`, регистр
    значим) — передавайте всегда, например id своего заказа. Повтор с тем же ключом и тем же набором
    номиналов вернёт **ту же партию** — **200** и заголовок `Idempotent-Replayed: true`, баланс второй
    раз не списывается. Тот же ключ с другими номиналами — **422** `reason: "idempotency_key_mismatch"`.
    Без ключа каждый запрос выпускает новую партию: сетевой повтор = второе списание.
  - Отказы: **409** `reseller_insufficient_balance` (не хватает `available` за вычетом долга),
    **409** `reseller_inactive` (кабинет заблокирован), **422** `gift_code_nominal_not_allowed`
    (номинал вне границ из `settings`), **422** `reseller_too_many_codes` (больше лимита за выпуск).
- **`POST /reseller/codes/{uuid}/cancel`** — `reseller.write`. Отмена неактивированного кода
  реселлера в окне `reseller_cancel_window_minutes` после выпуска; стоимость возвращается на баланс.
  → **200**, `data.status = "cancelled"`. Отказы: **409** `gift_code_cancel_window_expired`,
  **409** `gift_code_not_cancellable` (уже активирован, отменён или это купленный код).

Real-time: канал `private-giftcodes.{userId}` (право `reseller.read`, §10) — события `issued`
(сводка партии **без** кодов: коды берите из ответа выпуска или `GET /reseller/codes`),
`status.changed` (код активирован, отменён, возвращён), `reseller.status.changed`.

### 7.14 Дубляж готового заказа (Cartesia, ElevenLabs)

Дубляж переводит **готовую озвучку** на другой язык и озвучивает перевод так, что каждая фраза дубля
стартует там же, где фраза исходника, а длина дорожки совпадает. Текст передавать не нужно —
перевод делает сервис. Результат — **новый заказ** (исходный не меняется):

| Исходник (`service_key` заказа) | Дубль: сервис = `task_type` нового заказа | Цена за символ исходника | Потолок исходника |
| --- | --- | --- | --- |
| `cartesia` | `cartesia_dub` | 1,35 символа Cartesia (перевод включён) | 60 000 символов |
| `elevenlabs` | `elevenlabs_dub` | 1,5 символа ElevenLabs (перевод включён, тот же минимум сервиса) | 30 000 символов |

Точные значения (языки, модели, потолок, множитель, техрежим) — **только** из
`GET /orders/dubbing/options`: не зашивайте таблицу выше в код.

**Какой заказ можно дублировать.** Только **свой** заказ озвучки `cartesia` или `elevenlabs` в
статусе `completed`/`result_delivered`, чьи файлы ещё хранятся; одна дорожка — заказ в абзацном
режиме (`generation_mode: "paragraph"`, §8.4) дублировать нельзя; над ним не должна идти
перегенерация или склейка; не длиннее потолка. Иначе — **422** с `reason` (таблица в §12).

**Язык дубля должен отличаться от языка исходника.** У исходника Cartesia язык известен (из
шаблона), и совпадение отбивается сразу — **422** `dub_same_language`. У исходника ElevenLabs язык
не известен (котировка отдаёт `source_language: "auto"`): такой дубль создастся, упадёт у
исполнителя и вернёт деньги целиком — следите за языком сами.

**Символы исходника** — оплаченная длина последних версий его фрагментов (перегенерированный
фрагмент считается по последней версии). Именно их показывает котировка в `source_chars`.

**Оплата** — как у обычной озвучки: сначала квота подписки (по праву **исходного** сервиса —
подписка с Cartesia оплачивает и дубль Cartesia), остаток — PAYG с баланса (§6.3). Стоимость
списывается и с **токен-квоты ключа** (§6.2) — проверка до создания, превышение → **429**
`token_quota_exceeded`, заказ не создаётся. Упавший дубль возвращает деньги целиком (как любой
упавший заказ).

**Голос и модель дубля** по умолчанию — из **снимка шаблона исходного заказа** (того, каким шаблон
был при создании исходника, а не текущего). Их можно заменить: явными `voice_id`/`model_id` или
своим шаблоном того же сервиса (`template_id`) — тогда берутся его голос, модель и настройки голоса.
Явные поля перекрывают шаблон.

- **`GET /orders/dubbing/options`** — `orders.read`. Справочник: какие виды открыты владельцу
  ключа. → `data`:
  ```json
  {
    "available": true, "languages": ["en", "de", "..."], "models": ["sonic-3", "..."],
    "default_model": "sonic-3", "max_source_chars": 60000, "price_factor": 1.35, "maintenance": false,
    "kinds": {
      "cartesia":   { "available": true, "dub_service": "cartesia_dub",   "languages": ["..."], "models": ["..."],
                      "default_model": "sonic-3", "max_source_chars": 60000, "price_factor": 1.35, "maintenance": false },
      "elevenlabs": { "available": true, "dub_service": "elevenlabs_dub", "languages": ["..."], "models": ["..."],
                      "default_model": "...", "max_source_chars": 30000, "price_factor": 1.5, "maintenance": false }
    }
  }
  ```
  Вид выбирайте по `service_key` исходного заказа: `kinds[order.service_key]`. Поля верхнего уровня
  (кроме `kinds`) повторяют вид `cartesia` — для старых клиентов. Закрытый вид — `available: false`,
  `dub_service: null`, пустые списки и нули (это ответ «функции нет», а не ошибка). `maintenance: true` —
  приём временно приостановлен, создание ответит **503**.

- **`GET /orders/{order}/dub/quote`** — `orders.read`, лимит **60/мин на ключ**. Цена дубля **до**
  заказа; ничего не списывает и токен-квоту ключа не тратит. Query — те же поля, что у тела
  создания (`target_language`, `voice_id`, `model_id`, `template_id`, `name`), **все
  необязательны**: цена зависит только от символов исходника. → `data`:
  ```json
  {
    "source_order_id": "<ORDER_UUID>", "source_language": "ru", "target_language": "en",
    "source_chars": 815,
    "tokens": 657, "tokens_from_quota": 657, "tokens_from_payg": 0,
    "lmc_cost_minor": 0, "lmc_cost_formatted": 0,
    "price_lumc_minor": 3495897, "price_lumc_formatted": 0.03495897,
    "currency_asset": { "code": "LUMC", "precision": 8 },
    "defaults": { "template_id": null, "voice_id": "<VOICE_ID>", "model_id": "sonic-3" },
    "source_template": { "id": "<TEMPLATE_UUID>", "name": "Мой голос — Cartesia" },
    "templates": [ { "id": "<TEMPLATE_UUID>", "name": "Мой голос — Cartesia", "voice_id": "<VOICE_ID>", "model_id": "sonic-3" } ],
    "allowed": true, "reason": null
  }
  ```
  `tokens` = `tokens_from_quota` + `tokens_from_payg`; `lmc_cost_minor` — добор PAYG, а
  `price_lumc_minor` — полная цена, даже если всё оплатит квота (суммы — minor LMC,
  `real = value / 10^currency_asset.precision`). `allowed: false` — заказ сейчас не пройдёт,
  `reason` — тот же код, что вернуло бы создание: `insufficient_balance`, `insufficient_allowance`,
  `token_quota_exceeded` (не хватает токен-квоты ключа, §6.2) и т.п.
  `defaults.voice_id: null` — голос по умолчанию больше недоступен (снят из каталога, клон удалён):
  передайте `voice_id` при создании. `templates` — ваши шаблоны того же сервиса (до 100, свежие
  первыми) — кандидаты для `template_id`. Отказы исходника — те же **422**, что у создания; чужой
  или несуществующий заказ — **404**; техрежим вида — **503**.

- **`POST /orders/{order}/dub`** — `orders.write`. Создаёт заказ дубля. Тело (JSON):

  | Поле | Правило | Смысл |
  | --- | --- | --- |
  | `target_language` | **required**, string ≤ 16, из `languages` вида | Язык дубля; ≠ языка исходника (`dub_same_language`) |
  | `voice_id` | nullable, string ≤ 64 | Голос дубля. Нет — голос шаблона (снимок исходника или `template_id`). Cartesia — UUID голоса каталога (`GET /voices/cartesia`) или `voice_id` своего клона (§7.12); ElevenLabs — 20-символьный id голоса |
  | `model_id` | nullable, string ≤ 64, из `models` вида | Модель. Нет — модель шаблона, иначе `default_model` |
  | `template_id` | nullable | Ваш шаблон **того же сервиса**, что исходник. Чужой, удалённый или другого сервиса → **422** по полю `template_id`, без списания |
  | `name` | nullable, string ≤ 120 | Название нового заказа. Нет — «<название исходника> → EN» |

  → **201**, `data` = новый `Order`: `task_type` = `cartesia_dub`/`elevenlabs_dub`, `status`
  `created`/`pending`, один фрагмент. Дальше — как с любым заказом: WS `private-order.task.{orderId}`
  (§10) или опрос `GET /orders/{order}`. Готовый дубль:
  ```json
  "result": {
    "files": [ "storage/501/orders/<DUB_UUID>/output/chunks/0/result.mp3" ],
    "service_files": [ "storage/501/orders/<DUB_UUID>/output/chunks/0/service/subtitles.srt" ]
  }
  ```
  Скачивание — `POST /storage/url` (§7.3), как у озвучки. Повтор **того же** запроса (тот же
  исходник и те же поля) в течение минуты → **409** `duplicate_order` (защита от двойной отправки;
  нужен второй дубль на тот же язык — измените `name`). Ошибки — **402** (не хватает денег на
  PAYG-добор), **404** (не ваш заказ), **422** (отказ исходника или валидация, §12), **429**
  (токен-квота ключа, usage-лимит, слоты одновременных задач), **503** (техрежим вида).

Дубль — обычный заказ: его видно в `GET /orders?task_type[]=cartesia_dub`, его можно отменить
(`cancel`) до начала работы, а `retry` для него не нужен — при сбое деньги возвращаются, создайте
дубль заново. Длительность — минуты (несколько минут на 5 000 символов, дольше при очереди).

---

## 8. Тела POST-запросов (точные правила валидации)

### 8.0 `POST /orders`

| Поле | Правило |
| --- | --- |
| `template_id` | nullable, **required_without:task_type**, exists (UUID шаблона) |
| `task_type` | nullable, **required_without:template_id**, one of `tts,image,txt2img,remix,image_edit,voice_clone,sfx,music,voice_search` |
| `name` | sometimes, nullable, string, max 120 — человекочитаемое имя заказа: определяет имя скачиваемого файла и ZIP-архива. Не передано → сервер выведет сам (см. ниже) |
| `input_text` | nullable, string — текст/промпт (для TTS — озвучиваемый текст) |
| `task_data` | nullable, array (или JSON-строка) — параметры для template-less сервисов (§8.1) |
| `config_override` | sometimes, nullable, array (или JSON-строка) — пер-заказный оверрайд `config` шаблона (см. ниже) |
| `input_files` | nullable, array; `input_files.*` — file, max 20480 КБ (20 МБ/файл) |
| `skip_service_defaults` | sometimes, nullable, boolean — не подмешивать `default_config` сервиса к `task_data` (§8.1) |
| `confirm_payg_topup` | sometimes, boolean — согласие на PAYG-добор; нужно только в режиме отката (§6.3), иначе игнорируется |
| `quote_token` | sometimes, string — котировка из ответа 402 режима отката (§6.3) |

> **Как выводится `name`, если вы его не прислали.** Порядок источников:
> явный `name` → **имя загруженного файла без расширения** (`Интервью с автором.mp3` →
> `Интервью с автором`) → первые ~60 символов текста по границе слова (паузные теги
> `{{pause=…}}` вырезаются). Имя файла, записанного сервером из `input_text`, источником
> не считается — там был бы `{uuid}.txt`.

> **`config_override` — единственный способ переопределить настройки шаблона под конкретный заказ**,
> не создавая новый шаблон. Форма — тот же JSON-объект, что и `config` шаблона; применяется поверх
> `template.config` **только** к этому заказу. Например, сделать один TTS-заказ другим голосом:
> `{ "template_id": "<UUID>", "input_text": "…", "config_override": { "tts_settings": { "voice_id": "<OTHER_VOICE_ID>" } } }`
> — остальной конфиг шаблона сохранится. Пути вне `Service.validation_schema` **молча отбрасываются**,
> оставшиеся значения валидируются по схеме (вне диапазона/enum → **422**). Работает только при заказе
> по `template_id`; у template-less `sfx`/`music` все параметры и так в `task_data`.
>
> **Явный `null` в `config_override` стирает значение шаблона для этого заказа**, а не означает
> «оставить как есть»: мерж идёт `array_replace_recursive`, и `null` перезаписывает. Клиент,
> сериализующий всю форму настроек целиком с `null` в пустых полях, молча обнулит половину
> шаблона. Единственный способ сказать «не трогать» — не присылать ключ.

> **Входные файлы (`input_files[]`, либо одиночный `input_file` — multipart).** Не «не нужны»:
> для `tts` файл `.txt` — полноценный **третий канал текста** наравне с `input_text` и
> `task_data.text` (все три проходят одни и те же проверки — капы пауз, `text_empty`,
> `text_not_voiceable`); для `voice_search` аудиофайл **обязателен**. Не нужны они только
> `sfx` и `music`.

Провенанс (`source=api`, `api_key_id`) проставляет сервер. Возможные коды: 201 (в том числе когда
квоты подписки не хватило — добор списан с LMC автоматически, §6.3) / 400 / 402 (`insufficient_balance`
— не хватает денег на добор; `insufficient_allowance` — тариф добор запрещает) / 422 / 429. В режиме
отката (§6.3) добавляются 402 `payg_topup_required` и 409 `quote_mismatch` — Рецепт G (§11).

### 8.1 `task_data` для template-less сервисов (`sfx`, `music`, `voice_search`)

Промпт и параметры генеративного сервиса без шаблона идут в `task_data` (объект **или**
JSON-строка — multipart-клиент может прислать всю структуру одним полем). **Сервер домешивает
`default_config` сервиса поверх ваших значений**: то, что вы не передали, приедет в сохранённом
`task_data` заказа со значением по умолчанию (ваши значения приоритетнее). Значения ниже —
предельные. Ключ описания у SFX — **`text`**, у Music — **`prompt`** (не перепутайте).

> **Ключи кладите в КОРЕНЬ `task_data`, без обёртки.** `GET /templates/config-options?service=sfx`
> для этих сервисов отвечает, но отдаёт параметры сгруппированными в секцию (`sfx_settings`,
> `music_settings`, `voice_search_settings`) — это форма для интерфейса настроек, а не форма
> запроса: `validation_schema` у них плоская. `{"sfx_settings": {"text": "…"}}` → **422**
> «text обязателен» (обязательный ключ спрятан обёрткой), а в `config_override` заказа такая
> обёртка отбрасывается молча. У `elevenlabs`/`heygen`/`lumimg` расхождения нет: там имя секции
> и есть путь (`tts_settings.model_id`).

**SFX** (`task_type: "sfx"`) — одна генерация = **ровно один** аудиофайл:

| Ключ | Тип / правило | Дефолт | Примечание |
| --- | --- | --- | --- |
| `text` | **required**, string | — | Описание звука (английский промпт работает лучше всего) |
| `prompt_influence` | nullable, numeric `0..1` | `0.3` | Насколько строго держаться промпта |
| `duration_seconds` | nullable, numeric `0.5..30` | `null` | `null` = авто-длительность |
| `loop` | nullable, boolean | `false` | Бесшовное зацикливание |
| `output_format` | nullable, enum | `mp3_44100_128` | Одно из: `mp3_44100_128`, `mp3_44100_192`, `opus_48000_128` |

**Music** (`task_type: "music"`) — **`n_variants` генераций = `n_variants` файлов**:

| Ключ | Тип / правило | Дефолт | Примечание |
| --- | --- | --- | --- |
| `prompt` | **required**, string | — | Описание трека (жанр, настроение, инструменты) |
| `n_variants` | nullable, integer `1..4` | `1` | Сколько вариантов сгенерировать. **Умножает цену** (`n_variants ×` ставку) и даёт столько же файлов в `result.files[]` |
| `lyrics_text` | nullable, string | `null` | Текст песни; если пусто и не `force_instrumental` — модель может добавить вокал сама |
| `force_instrumental` | nullable, boolean | `false` | Инструментал без вокала |
| `music_length_ms` | nullable, integer `10000..30000` | `30000` | Длительность трека в **миллисекундах**: от 10 до **30 секунд максимум**. Больше `30000` → **422**. Нужен трек длиннее — склейте несколько заказов |
| `model_id` | nullable, enum | `music_v2` | Пока единственное значение: `music_v2` |

**Voice Search** (`task_type: "voice_search"`) — аудио едет в `input_files`, здесь один параметр:

| Ключ | Тип / правило | Дефолт | Примечание |
| --- | --- | --- | --- |
| `top` | nullable, integer `1..50` | `10` | Сколько похожих голосов вернуть |

> **Цена этих сервисов зависит от ЧИСЛА генераций, а не от их размера.** `sfx` — одна ставка
> за заказ (`duration_seconds` и длина `text` на цену не влияют); `music` — ставка ×
> `n_variants` (`music_length_ms`, длина `prompt` и `lyrics_text` не влияют); `voice_search` —
> одна ставка (длительность записи и `top` не влияют). Пятиминутный трек стоит ровно столько
> же, сколько десятисекундный. Фактически списанное — в `price_units` заказа.

> **`skip_service_defaults: true` отключает это домешивание.** Пришлите флаг, если у вас
> уже есть полный набор параметров и вы хотите, чтобы воркер получил ровно его: сервер не
> добавит в `task_data` ни одного ключа из `default_config`, и повторное домешивание при
> отправке задачи воркеру тоже не произойдёт. Флаг сохраняется на заказе — `POST
> /orders/{id}/retry` воспроизводит то же поведение. На заказы **по шаблону** флаг не
> влияет: там конфиг берётся из `template.config` (+ `config_override`), а не из
> `default_config` сервиса.

> Значение вне диапазона/enum → **422** (проверяется до биллинга; заказ не создаётся).
> У обоих сервисов **нет** item-level `retry`/`regenerate` (§7.11) и **нет**
> `result.service_files` (субтитры генерирует только TTS). Одноразовая генерация: при неудаче —
> `cancel` (пока возможно) и создать заказ заново.

### 8.2 `POST /templates`

| Поле | Правило |
| --- | --- |
| `service_key` | **required**, code активного сервиса: для озвучки — `elevenlabs`, `heygen`, `cartesia` |
| `name` | **required**, string, max 255 |
| `config` | **required**, JSON-объект — по схеме сервиса (динамические правила `config.*`) |
| `is_public` | boolean |
| `folder_id` | nullable, exists (UUID вашей папки) |

`config` валидируется по правилам конкретного сервиса. Точную структуру для нужного сервиса берите
из `GET /templates/config-options?service=<code>`. Пример **минимального валидного `config`
для `elevenlabs`** (TTS):
```json
{
  "tts_settings": {
    "mode": "mode_v1",
    "model_id": "eleven_multilingual_v2",
    "voice_id": "<VOICE_ID>",
    "advanced_voice_settings": true,
    "voice_settings": {
      "stability": 0.5,
      "similarity_boost": 0.75,
      "use_speaker_boost": true,
      "speed": 1.0
    }
  }
}
```

> **Что из `voice_settings` доезжает до движка, зависит от модели и
> `tts_settings.advanced_voice_settings`** (по умолчанию `false`):
>
> | Модель | Без флага | С флагом |
> | --- | --- | --- |
> | `eleven_v3`, `eleven_v3_beta` | `stability` | все пять |
> | `eleven_v4`, `eleven_v4_exp` | `stability`, `similarity_boost`, `clone_strength` | все пять + `clone_strength` |
> | остальные | все пять | все пять |
>
> Не доехавшие значения сохранятся в шаблоне и пройдут валидацию, но на звук не повлияют.
> Ошибки не будет: со стороны это выглядит как «настройка не работает» — чаще всего со `speed`
> на v3/v4. Если крутите тонкие параметры — ставьте флаг в том же объекте.

**`tts_settings.prev_next_text` и `tts_settings.request_ids`** (оба nullable boolean, по
умолчанию `false`) — сшивка просодии между фрагментами. Длинный текст режется на фрагменты, и
каждый озвучивается своим запросом, поэтому на стыках слышен перепад интонации. Первый флаг
просит передавать движку текст соседних фрагментов (`previous_text`/`next_text`), второй —
идентификаторы соседних генераций (request stitching; провайдер отдаёт им приоритет над
текстом). На цену и на разбиение текста флаги не влияют.

> **Включить можно только ОДИН из двух.** Оба сразу — `422`
> (`tts_stitching_flags_mutually_exclusive`): получив и текст соседей, и идентификаторы,
> ElevenLabs использует только идентификаторы, а текст игнорирует — то есть «включено
> оба» было бы тихо выключенным `prev_next_text`.

**`tts_settings.apply_text_normalization`** (nullable string, по умолчанию `auto`) — нормализация
текста у движка: `auto` — решает сам (например, читать ли числа словами), `on` — применять всегда,
`off` — пропускать.

> **Флаги влияют не на всех моделях, и молча.** Публичная документация ElevenLabs числит
> семейство `eleven_v3` вне request stitching. Значение сохранится в шаблоне и пройдёт
> валидацию, но на звук может не повлиять — ошибки при этом не будет. Та же природа отказа,
> что у `advanced_voice_settings` выше.

Допустимые `model_id` (ElevenLabs):

| `model_id` | Что это |
| --- | --- |
| `eleven_v4` | Новейшее поколение ElevenLabs |
| `eleven_v4_exp` | Экспериментальный вариант v4 — звучание может меняться без предупреждения; для стабильного результата берите `eleven_v4` |
| `eleven_v3` | Выразительная модель v3 — значение по умолчанию в форме шаблона |
| `eleven_v3_beta` | Бета-ветка v3 |
| `eleven_multilingual_v2` | Многоязычная модель v2, стабильная |
| `eleven_flash_v2_5`, `eleven_turbo_v2_5` | Быстрые модели v2.5 |
| `eleven_turbo_v2` | Быстрая модель v2 |
| `eleven_flash_v2` | Принимается валидацией, но больше не предлагается в `config-options` — для новых шаблонов не выбирайте |

Значение вне списка → **422**. Актуальный список и значение по умолчанию — всегда в
`GET /templates/config-options?service=elevenlabs` (`tts_settings.model_id.options`). Диапазоны `voice_settings`:
`stability` 0..1 (**единственный обязательный**), `similarity_boost` 0..1 (nullable),
`style` 0..1 (nullable), `use_speaker_boost` boolean, `speed` 0.7..1.2; только для `eleven_v4*` —
`clone_strength` 0..1 (nullable, по умолчанию 0; действует лишь на профессиональные клоны, дообученные
под v4), на других моделях не применяется. Опциональные секции:
`pause_settings.*`,
`output_settings.*` (`audio_format` из `mp3,wav,ogg`; `audio_quality` из
`low,medium,high,lossless`; `sample_rate` из `22050,44100,48000`).

**`tts_settings.language_code`** (опционально, nullable, ISO-639-1) — язык синтеза. Отсутствие
поля или `null` = ElevenLabs сама определяет язык по тексту (ненадёжно на коротких/смешанных
фразах) — явный код надёжнее. Полный список из 73 допустимых значений — в
`GET /templates/config-options?service=elevenlabs` (`tts_settings.language_code.options`).
29 базовых кодов (`eleven_multilingual_v2`, `eleven_flash_v2_5`, `eleven_turbo_v2_5`):
`en, ja, zh, de, hi, fr, ko, pt, it, es, id, nl, tr, fil, pl, sv, bg, ro, ar, cs, el, fi, hr, ms,
sk, da, ta, uk, ru`. Остальные 44 (например `he`, `kk`, `vi`, `cy`) поддерживает только
v3-семейство (`eleven_v3`, `eleven_v3_beta`): на v2-моделях они теперь **отклоняются
валидацией (422)**. Для `eleven_v4`/`eleven_v4_exp` форма (`config-options`) предлагает только 29
базовых кодов — держитесь их: расширенный код валидация на v4 не отклонит, но его поддержку
моделью платформа не гарантирует. Раньше такой запрос проходил, но ElevenLabs отвечала 400 и язык молча
терялся — озвучка выходила на автоопределённом языке. `GET /templates/config-options` отдаёт
полный список в `options` и суженный до 29 — в `conditional_overrides` для не-v3 моделей.

`stability` на v3-семействе принимает только `0.0`, `0.5` и `1.0` — шаг приходит в
`conditional_overrides` отдельной веткой на каждую v3-модель. На v4 (`eleven_v4`, `eleven_v4_exp`)
и v2 — непрерывно, шаг `0.01`.

#### Конфиг `heygen`

TTS на движке HeyGen. Голос — из `GET /voices/heygen` (§7.6). Минимальный валидный `config`:
```json
{
  "tts_settings": {
    "voice_id": "<VOICE_ID_HEYGEN>",
    "voice_engine": "elevenLabs",
    "model_id": "eleven_multilingual_v2",
    "voice_settings": { "stability": 0.5, "similarity_boost": 0.75 }
  }
}
```

| Поле | Правило |
| --- | --- |
| `tts_settings.voice_id` | **required** — голос каталога HeyGen |
| `tts_settings.voice_engine` | **required**, сейчас единственное значение `elevenLabs` |
| `tts_settings.model_id` | **required**, `eleven_multilingual_v2` \| `eleven_v3` |
| `tts_settings.voice_settings.stability` | **required**, 0..1 (на `eleven_v3` — только `0`, `0.5`, `1`) |
| `tts_settings.voice_settings.similarity_boost` | **required** на `eleven_multilingual_v2`, 0..1; на `eleven_v3` поле снимается |
| `tts_settings.voice_settings.style` | nullable, 0..1; на `eleven_v3` снимается |
| `tts_settings.voice_settings.speed` | 0.7..1.2 |
| `tts_settings.prev_next_text` / `request_ids` / `apply_text_normalization` | как у `elevenlabs` (взаимоисключение флагов сшивки — то же) |

`pause_settings.*`, `stress_settings.*`, `output_settings.*` — как у `elevenlabs`.
Модель, недоступная выбранному голосу, — **422** на `tts_settings.model_id`
(`GET /templates/config-options?service=heygen` предлагает только доступные).

#### Конфиг `cartesia`

TTS на движке Cartesia. Голос — из каталога `GET /voices/cartesia` (§7.6) **или** `voice_id`
СВОЕГО готового клона (`GET /voices/cartesia/clones`, статус `ready`, §7.12). Минимальный валидный
`config`:
```json
{
  "tts_settings": {
    "voice_id": "<VOICE_ID_CARTESIA_ИЛИ_КЛОНА>",
    "model_id": "sonic-3",
    "language_code": "ru"
  }
}
```

| Поле | Правило |
| --- | --- |
| `tts_settings.voice_id` | **required**. Голос каталога (снятый с каталога → **422** `user.order.voice_unavailable`) либо `voice_id` своего клона в `ready` (чужой, неготовый или архивный клон → **422** `validation.exists`) |
| `tts_settings.model_id` | **required**, `sonic-3.6` \| `sonic-3.5` \| `sonic-3` (по умолчанию) |
| `tts_settings.language_code` | nullable, ISO 639-1: `en, ru, uk, de, fr, es, pt, it, nl, pl, sv, tr, cs, sk, bg, ro, hu, el, fi, da, no, hr, ka, he, ar, hi, bn, ta, te, gu, kn, ml, mr, pa, ja, ko, zh, vi, th, id, ms, tl`. В форме по умолчанию `ru`; пусто — язык воркера по умолчанию |
| `tts_settings.voice_settings.speed` | nullable, 0.6..1.5 (по умолчанию 1.0) |
| `tts_settings.voice_settings.volume` | nullable, 0.5..2.0 (по умолчанию 1.0) |
| `pause_settings.*` | `enabled`, `max_pause_symbols` (1..20000), `default_duration`, `auto_paragraph_pause`, `max_shift` (0..2), `min_anchor_silence` (0..1) |
| `output_settings.*` | как у `elevenlabs` (`audio_format`, `audio_quality`, `sample_rate`, `crossfade_ms`, `loudnorm.*`) |

У Cartesia **нет** `mode`, `stability`/`similarity_boost`/`style`/`use_speaker_boost`,
`advanced_voice_settings`, флагов сшивки (`prev_next_text`, `request_ids`),
`apply_text_normalization` и `stress_settings`: такие ключи бесполезны (на звук не влияют).

**Доступ и деньги.** Озвучка Cartesia входит в тарифы от Creator (право `cartesia_tts`; Start его
не включает). Списывается общая квота токенов подписки; когда она кончилась, недостающее
доплачивается с баланса (§6.3) — **только при живой подписке**: без подписки заказ получает
`no_subscription`. Одновременно в работе — **не больше 3 заказов Cartesia** на пользователя:
четвёртый получает **429** `concurrency_limit_exceeded` (§12) — ждите завершения своих заказов.

### 8.3 Текст озвучки: каналы, разметка, нормализация

**Каналов текста три, и они равноправны** — все три проходят одни и те же проверки:
`input_text`, содержимое `.txt` из `input_files[]`, `task_data.text`.

#### Разметка: что звучит и что оплачивается

Распознаются три вида разметки, но **бесплатен из них только один**:

| Вид | Примеры | Что делает | Тарифицируется |
| --- | --- | --- | --- |
| Пауза | `{{pause=2.5}}`, `{{pause:500ms}}`, `{{pause-3s}}`, `{{pause}}` | Тишина; без значения — 1 секунда | **Нет** |
| SSML-пауза | `<break time="2s"/>`, `<break time="500ms"/>` | То же в SSML-нотации | Да |
| Указание диктору | `[шёпот]`, `[confident]`, `[pause]` | Подсказка модели о манере чтения | Да |

> **Бесплатны и невесомы только `{{…}}`.** Это наш собственный формат: тишину по нему
> строит воркер, до провайдера строка не доезжает.
>
> **Квадратные скобки и `<break/>` — синтаксис самого провайдера.** Он получает их
> целиком, тарифицирует по своим правилам и учитывает в лимите длины запроса. Поэтому
> они оплачиваются и **занимают место во фрагменте**: 999-символьный фрагмент с
> `[confident]` внутри вмещает 988 произносимых символов, а не 999.
>
> Квадратные скобки — это ВСЯ разметка, а не список ключевых слов: подсказкой считается
> любой фрагмент `[…]` без вложенных скобок и переноса строки внутри (regex
> `/\[[^\[\]\n]+\]/u`). Сноска `[1]`, пометка `[sic]`, тайм-код `[00:12]` — модель увидит
> их и, скорее всего, интерпретирует как указание. Легаси-форма `[pause=2s]` в подсчёт
> пауз для капов не входит (там считаются только `{{pause}}` и `<break/>`).
>
> **Круглые и угловые скобки, звёздочки и прочая типографика озвучиваются и
> тарифицируются**: `(пауза)`, `<Fade out>`, `*шёпотом*` диктор прочитает вслух.

#### Санити-капы пауз (`config/chunking.php`)

Проверяются **до** создания заказа; превышение → **422**, деньги не резервируются:

| Ограничение | Значение |
| --- | --- |
| Пауз в тексте | ≤ 500 |
| Одна пауза | ≤ 10 секунд |
| Суммарная тишина | ≤ 3600 секунд |

Паузы `{{pause}}` бесплатны (`<break/>` оплачивается) — капы защищают от мусорного ввода, а не тарифицируют. Отдельный отказ —
текст, в котором **нечего произносить**. Все случаи — 422, но приходят по-разному:

- **Создание заказа, весь текст:** только теги или одни знаки препинания (`.`, `!!!`, `—`) /
  скобочные ремарки → ошибка валидации поля канала текста (`errors.input_text` и т. п.), без `reason`.
- **Создание заказа, отдельный фрагмент:** текст в целом произносим, но после нарезки остался
  фрагмент из одних пауз, тегов или ремарок (чаще всего абзац в абзацном режиме) →
  `reason: paragraph_not_voiceable`. Рез вообще не дал фрагментов → `reason: text_empty`.
- **Повтор и перегенерация фрагмента** (`…/items/{item}/retry`, `…/regenerate`) с новым `text`,
  в котором нечего произносить → `reason: text_not_voiceable`.

#### Нормализация до нарезки

Сохранённый заказ и все смещения чанков считаются уже от изменённого текста:

| Что | Как | Для кого |
| --- | --- | --- |
| `\r\n`, `\r` | → `\n` | любой текстовый вход |
| Табуляция | → пробел | любой текстовый вход |
| > 3 переносов подряд | → ровно 3 | любой текстовый вход |
| > 5 пробелов подряд | → ровно 5 | любой текстовый вход |
| `Привет.Мир` | → `Привет. Мир` (пробел после `.`/`!`/`?` перед буквой или цифрой) | **только озвучка** |

Последнее правило не трогает десятичные (`3.14`), сокращения (`т.д.`), акронимы (`U.S.A.`),
URL со схемой, email, многоточия и содержимое тегов разметки. Известный компромисс: голый
домен без схемы (`example.com` в середине фразы) неотличим от `Привет.Мир` и получит пробел —
пишите такие адреса со схемой. Операции идемпотентны.

### 8.4 Абзацный режим озвучки (`generation_mode`)

По умолчанию текст режется на фрагменты подряд, по техническому размеру, и границы абзацев
роли не играют. Абзацный режим делит текст сначала по **пустой строке**, и уже каждый абзац
режется внутри себя.

Ключ лежит **не внутри `tts_settings`**, а рядом с ним, в корне `config_override` (или в корне
`config` шаблона — тогда режим станет постоянным для всех заказов по нему):

```json
{ "template_id": "<UUID>", "input_text": "Первый абзац.\n\nВторой абзац.",
  "config_override": { "generation_mode": "paragraph" } }
```

| Значение | Что делает |
| --- | --- |
| `paragraph` | Абзац — самостоятельная единица генерации |
| `default` | Сплошной рез по размеру фрагмента (как без ключа) |

Поддерживают `elevenlabs`, `heygen` и `cartesia`; прочие сервисы ключ игнорируют — отказа не
будет, режим просто не включится. В `GET /templates/config-options` он не перечислен: справочник описывает
настройки сервиса, а режим задаётся на заказ.

**Что меняется в ответе:** у заказа появляется `paragraphs[]` (по каждому абзацу —
`paragraph_index`, `chunks_count`, `completed_chunks`, `status`, `progress_percent`,
`result_file`), у фрагментов — `paragraph_index`.

- `paragraphs[].result_file` — аудио абзаца целиком (абсолютный путь либо структура с путём и
  размером; скачивается через `POST /storage/url`, как остальные файлы заказа). Резать склейку
  заказа (`result.files`) на абзацы не нужно — это те же файлы, что `001.mp3`… в архиве заказа.
  `null` читается по `chunks_count`:
  - `chunks_count > 1` — склейки абзаца ещё не было; файл появится ТОЛЬКО после неё, заранее
    никогда.
  - `chunks_count = 1` — собственного файла у абзаца нет и не будет: абзац и есть этот
    единственный фрагмент, берите `items[].result_file` фрагмента с тем же `paragraph_index`.

- `paragraphs[].status` — свой словарь из 4 значений: `pending`, `in_progress`, `failed`,
  `completed` (чанк, заблокированный контентной политикой, схлопывается в `failed`).
- Считаются **только исходные чанки** (`item_type = chunk`), поэтому успешный повтор упавшего
  фрагмента статус абзаца НЕ меняет — смотрите на сам фрагмент.
- `OrderItem.paragraph_index` заполнен только у исходных чанков. У записей `retry` и
  `regeneration` он `null` даже в абзацном заказе — привязку берите у родителя через
  `parent_item_id`.

> **Влияет на цену:** минимальный тарифицируемый объём применяется к КАЖДОМУ абзацу отдельно.
> Пять коротких абзацев стоят пять минимумов, тогда как тот же текст в обычном режиме обошёлся
> бы в один.
>
> **Влияет на скорость:** абзац — самостоятельная задача, одновременно исполняются не больше
> 10 однофрагментных абзацев плюс 5 многофрагментных на заказ, остальные ждут слота. Текст из
> сотни коротких абзацев идёт волнами, зато первые результаты приходят раньше.

---

## 9. Схемы ресурсов (ключи в user-контексте)

По API-ключу все ресурсы отдаются в **пользовательском** контексте — админ-поля скрыты, даже если
ключ принадлежит администратору.

> **Типы в этом разделе точные** (`int` / `enum` / ISO-дата). Портальный `public-openapi.json`
> собирается без доступа к БД, поэтому часть скалярных полей показана там как generic `string` —
> ориентируйтесь на типы отсюда и на примеры ответов (в примерах — реальные значения). Поля с
> пометкой «Скрыто (admin)» по API-ключу **не приходят** (даже если ключ принадлежит администратору).

**`Order`:**
```
id (UUID), user_id, name (string|null), template (Template|null), template_id,
task_type, status (enum `OrderStatus`, 9 значений — см. §5),
price_units (int), price_formatted (float), currency_asset (Asset),
total_tokens (int|null), total_duration_ms (int|null),
tokens_from_quota (int|null), tokens_from_payg (int|null), tokens_spent (int|null),
task_data (object|null),
result ({ user_message, files:[string], service_files:[string] } | null),
created_at, updated_at,
files_expire_at (ISO|null), files_expired (bool),
eta_seconds (int|null), eta_at (ISO|null),
queue_position (int), queue_wait_seconds (int|null) — только пока заказ в очереди, см. ниже,
completed_chunks (int), total_chunks (int), progress_percent (int),
items: [ OrderItem ]
```
**Шаблон заказа.** `template` — шаблон, по которому создан заказ (у заказов без шаблона его нет).
Его `config` — настройки, с которыми выполняется **именно этот** заказ: конфиг шаблона на момент
создания заказа с наложенным `config_override`. Правки шаблона после создания его не меняют, повтор
(`POST /orders/{order}/retry`) идёт по тем же настройкам. В списке `GET /orders` `template.config` =
`null` — полный конфиг в `GET /orders/{order}`. Шаблон могли удалить после создания заказа: в заказе
он виден по-прежнему (признака удаления нет), но `GET /templates/{template}` → **404**, а новый заказ
или превью с этим `template_id` → **422**. Заказы, созданные до конца сентября 2026 года, снимка не
имеют — у них `config` — текущий конфиг шаблона с наложенным `config_override`: правка шаблона меняет
и его, и то, с чем заказ выполняется, а повтор идёт по текущему шаблону.

**Прогресс и ожидание.** `completed_chunks`/`total_chunks`/`progress_percent` — сколько чанков уже
готово. `eta_seconds` — оценка времени до готовности (секунды), `eta_at` — тот же прогноз
абсолютным моментом; считаются по накопленной статистике сервиса, это **оценка, а не обещание**.
`queue_position`/`queue_wait_seconds` — место заказа в очереди исполнителей: `queue_position` —
сколько заказов стоит **впереди** (`0` — следующий). У любого типа задачи ключи есть, пока заказ
ждёт свободного исполнителя (статус `pending`, ни одна задача ещё не взята); как только работа
началась — ключей нет. У `voice_search` своя очередь (задачи идут по одной), там позиция держится
до конца проверки (`0` — обрабатывается сейчас) и есть оценка ожидания `queue_wait_seconds`; у
остальных сервисов `queue_wait_seconds` всегда `null`. **Оба ключа в ответе либо есть, либо их нет
вовсе** — `null`-заглушек не будет. Не пишите `order.queue_position === null`, проверяйте наличие
ключа. Позицию обновляют события `order.queue.updated` (все сервисы, кроме `voice_search`) и
`voice_search.queue.updated` (§10). В WebSocket-проекции заказа (`order` в `status.changed` и др.)
позиция есть, если очередь уже пересчитана (первые ~2 с после перехода в `pending` ключей ещё
нет); у `voice_search` там `queue_wait_seconds` = `null` — оценка считается на запрос и в
событиях очереди, а не на каждую рассылку заказа.
**Деньги.** `price_units` — залоченная PAYG-сумма в **minor units** LMC, показывать её как
число нельзя: реальное значение = `price_units / 10^currency_asset.precision`, а `precision`
живёт в активе и не обязана быть равна 2. Рядом всегда идут `price_formatted` (та же сумма
как decimal-число в LMC) и `currency_asset` (объект `Asset` с полем `precision`). Заказ всегда
номинирован в LUMC. Тот же инвариант — у всех денежных ресурсов (Payment, Invoice, Refund).

**Ретенция файлов.** `files_expire_at` — ISO8601-момент, когда файлы заказа удалит сборщик
ретенции, либо `null` = «дедлайна нет»: заказ ещё не в терминальном статусе **или** файлы уже
удалены. `files_expired: true` — файлов больше нет, скачивать нечего (запись заказа в БД
остаётся). Оба поля — арифметика над полями заказа, приходят во всех контекстах, включая
WebSocket. Различайте два `null`-случая по `files_expired`.

**`total_duration_ms`** — суммарная **длина аудио** заказа в миллисекундах (сумма
`duration_ms` по чанкам), а **не** время генерации. `null` — воркер длительности не прислал
(или тип задачи не аудио).
`name` — человекочитаемое имя заказа (источник имени файла/ZIP при скачивании). `total_tokens` —
полная стоимость в токенах по всем завершённым версиям (чанки + регенерации + retry). `tokens_spent` —
реально потраченные токены (чанки + регенерации, **без** retry), разложенные на бесплатную долю из
квоты подписки (`tokens_from_quota`) и платную PAYG-долю (`tokens_from_payg`). **Нулевая доля приходит
как `null`, а не `0`** — при заказе, полностью покрытом квотой, `tokens_from_payg` = `null`; при чистом
PAYG — `tokens_from_quota` = `null`. `tokens_spent` = сумма обеих долей.
`result` (пользовательский контекст): `files` — основные файлы (плоский массив строк-путей; после
склейки TTS содержит ровно один элемент — финальную дорожку); `service_files` —
сервисные файлы (плоский массив строк-путей: субтитры/alignment, только TTS, whitelist — см. §7.10),
присутствует только при непустом наборе видимых файлов; `user_message` — passthrough от воркера,
**обычно `null`** (не гарантированный текст статуса). У упавшего заказа (`failed`/`compensated`)
`result` = **`null`** (детали ошибки скрыты). Скрыто (admin): `source`, `user`, `execution_meta`,
`metrics`, error-детали и не-whitelisted сервисные файлы (`metadata`).

**`OrderItem`:**
```
id, order_id, item_type (chunk|retry|regeneration|pause_edit|stitch), chunk_index (int|null),
parent_item_id (string|null), original_text_length (int), current_text_length (int),
price_units (int), consumed_units (int), remaining_locked (int),
status (pending|processing|completed|policy_flagged|failed),
result_file (object|string|null), duration_ms (int|null),
attempt_number (int), can_retry (bool), can_regenerate (bool),
created_at, updated_at, parent_item (OrderItem|null), retries ([OrderItem])
```
`duration_ms` — длительность синтезированного **аудио** этого чанка в миллисекундах (не время
генерации). `null` — воркер её не прислал. Сумма по чанкам приходит в `Order.total_duration_ms`.
`status`: `policy_flagged` (контент отклонён политикой) и `failed` (тех. ошибка) — оба сбойные,
оба доступны для item-retry; `completed` — доступен для regenerate (см. плейбук §7.11).
`result_file` — **основной** файл этого чанка (не заказа; per-chunk service_files здесь не отдаются).
`can_retry`/`can_regenerate` отражают только статус чанка — **не гарантируют** успех вызова (§7.11).
Скрыто (admin): `metadata` (в т.ч. причина policy/сбоя — потребителю по ключу не видна).

**`Template`:**
```
id (UUID), user_id, slug, name, service_key, service (Service|null),
config (object), is_public (bool), folder_id, folder (при загрузке), created_at, updated_at
```

**`Service`** (вложенный):
```
id, code, name, display_name, payg_access, billing_mode, unit_asset_id, unit_asset (Asset),
required_entitlement_id, required_entitlement, units_per_call, units_per_char, units_per_image,
units_per_second, min_billable_chars, lumcoin_per_token, lumc_precision,
price_lumc_minor (int|null, money-first цена), unit_size, uses_money_first_pricing (bool),
rate_unit, display_category, is_premium, display_order, metadata, is_active, created_at, updated_at
```
Скрыто (admin): `config_schema, default_config, validation_schema, routing_config, task_types,
default_task_type, features, cost_config`.

**Как читать тариф.** `code` — то самое значение, что идёт в `service_key` шаблона и в путь
`GET /usage/{service}`; `id` в запросах не нужен. `billing_mode` говорит, **какое из полей
`units_per_*` вообще работает** (за вызов / за символ / за секунду / за изображение) — остальные у
этого сервиса смысла не имеют. Все `units_*`, `lumcoin_per_token` и `price_lumc_minor` — **в
минимальных единицах**: реальное значение = `value / 10^precision`, где `precision` для `units_*`
лежит в `unit_asset`, а для LMC-полей — в `lumc_precision`. `min_billable_chars` — пол тарификации:
текст короче тарифицируется как этот минимум. `lumcoin_per_token` нужен для оценки PAYG-добора
(`shortfall_tokens × lumcoin_per_token`, §6.3). Если `uses_money_first_pricing: true`, цена задана
сразу в LMC — `price_lumc_minor` за `unit_size` натуральных единиц (напр. за 1000 символов), а не
выведена из токенов; на итоговую сумму заказа способ расчёта не влияет. `required_entitlement`
(`null` — сервис открыт всем) — возможность подписки, без которой заказ отклонят: есть ли она у
вас, видно в `GET /usage`. `is_active: false` — сервис заказы не принимает. `payg_access` —
разрешён ли для сервиса доплатный добор сверх квоты (`disabled` → вместо 402 придёт
`insufficient_allowance`, §12). `metadata` — произвольный набор ключей, на конкретные не
полагайтесь.

**`LumVoice`:**
```
id, display_name, description, gender, accent, default_language_code,
voice_status, publication_status, allow_usage_in_orders (bool),
preview_generated_at, created_at, updated_at,
tags: [{id,code,name,...}], languages: [...],
preview_urls: { "<language_code>": <signed_url|null> }
```
**Что здесь важно для заказа.** `id` — это и есть значение для `config.voice_id` шаблона.
`voice_status` — состояние клонирования: `ready` — годен целиком, `partially_ready` — часть языков
склонирована, часть упала, **рабочие языки доступны**. Поэтому решает не только статус голоса, а
`languages[]`: заказывать можно на языке, клон которого завершён (состояние каждого —
`VoiceLanguage.status`, причина сбоя — `failure_reason`). `allow_usage_in_orders` — разрешение
автора отдать голос другим: без него голос не показывается в `GET /voices/public`, а у тех, кто
успел добавить его в библиотеку, запись становится `available: false` с `unavailable_reason`
(`author_unpublished` / `admin_force_removed` / `author_deleted` / `owner_deleted`). На **свои**
голоса флаг так не влияет. `publication_status` — стадия модерации, тоже про видимость в общем
каталоге, а не про допуск к заказу. Практическое следствие: голос из `GET /voices/public` заведомо
`ready` и разрешён (каталог фильтрует по обоим полям); голос из своей библиотеки проверяйте по
`available`, а свой собственный — по `languages[]`.
`preview_urls` — карта «код языка → временная ссылка на демо-аудио» (значение `null` = превью для
языка нет); ссылки подписанные и живут ограниченное время, кэшировать их надолго нельзя.
Скрыто (admin): статистика использования, модерация, `owner_user_id`, `metadata` и т.п.

**`User`** (по api-key):
```
id, email, lang_code, display_currency (ISO-4217|null), has_telegram (bool), created_at, updated_at
```
При включённых фичах добавляются `wallets` (если кошелёк включён) и реферальные поля. Динамические
include подмешивают `telegram, subscriptions, order_settings, entitlements, usage,
unread_notifications_count`. Всегда скрыто: `is_admin, email_verified_at, allowed_models,
referrer_id, is_blocked` и прочие приватные/админ-поля.

**`Asset`** (вложенный — `asset` / `currency_asset` / `unit_asset` в денежных полях):
```
id (int), code (string, напр. `LUMC`), kind (enum `AssetKind`: `money` | `unit`),
precision (int — знаков после запятой; реальное значение = stored / 10^precision),
name (string — локализованное), deleted_at (ISO|null — обычно null), created_at, updated_at
```
Скрыто (admin): `is_active`, `is_default`, `default_balance`.

**`Subscription`** (публичная проекция — `GET /subscriptions`, безденежная):
```
id (int), status (string: `active` и т.п.),
current_period_start (ISO), current_period_end (ISO),
items: [ SubscriptionItem ]
```
Публичный surface намеренно урезан: нет денежных полей (`unit_amount`/LMC), вложенного `user`,
кошельков. Возвращаются только «живые» подписки (`Active` и срок не истёк). Полная (внутренняя) форма
с деньгами по API-ключу **не отдаётся** — портальная спека показывает её схему (`SubscriptionItem`/
`SubscriptionPlan` с money-полями), но это НЕ публичный контур; авторитетна форма ниже и в §7.8.

**`SubscriptionItem`** (публичная проекция, вложен в `Subscription.items[]`):
```
plan ({ code, name } | null), status (string: `active` | `canceled` | `expired`),
is_usable (bool — «живая ли»: `Active` И срок `end_at` не истёк; авторитетнее `status`),
billing_period (string: `monthly`),
start_at (ISO), end_at (ISO),
token_allowance (int|null — месячный лимит токенов), tokens_used (int|null),
tokens_remaining (int = token_allowance − tokens_used)
```

**`Entitlement`** (право; вложен в план при `?include=entitlements` на `/user`):
```
id (int), code (string), name (string — локализованное),
metadata (object|null), is_active (bool), created_at, updated_at,
is_unlimited (bool — только в контексте плана: сервисы этого права безлимитны, токены не списываются)
```

**`TemplateFolder`** (папка шаблонов):
```
id (int), user_id (int), name (string),
templates: [ Template ] (при eager-load), created_at, updated_at
```

**`BrowseTemplates`** (ответ `GET /templates/browse` — папки+шаблоны, виртуальная пагинация):
```
items: [ TemplateItem ] (папки и шаблоны вперемешку; дискриминатор — поле `type`: `folder` | `template`),
current_page (int), last_page (int), per_page (int), total (int),
current_folder ({ id, name } | null), breadcrumbs: [ { id, name } ]
```

**`TemplateItem`** (элемент `BrowseTemplates.items[]`; форма зависит от `type` — НЕ `kind`):
```
папка (type "folder"):   type ("folder"), id (int), name (string), templates_count (int), created_at, updated_at
шаблон (type "template"): type ("template"), id (UUID), name (string), slug (string|null),
                          service_key (string), service (Service|null при eager-load), config (object),
                          is_public (bool), folder_id (UUID|null), created_at, updated_at
```
Различайте по `type`: у папки `id` — **int** и есть `templates_count`; у шаблона `id` — **UUID** и есть
`service_key`/`config`. Это lite-проекция (у шаблона нет вложенных `user`/`folder`, у папки — `templates`).

**`VoiceTag`** (вложен в `LumVoice.tags[]`; отдельно — `GET /voices/tags`):
```
id (int), code (string), name (string — локализованное), description (string|null),
color (string — hex), sort_order (int)
```
Скрыто (admin): `name_translations`, `description_translations`, `is_active`, timestamps, `deleted_at`.

**`VoiceLanguage`** (вложен в `LumVoice.languages[]` — статус клон-озвучки по языку):
```
id (int), language_code (string, напр. `en`), status (string|null — статус клонирования голоса),
reference_duration_ms (int|null), model_version (string|null), failure_reason (string|null),
clone_started_at (ISO|null), clone_completed_at (ISO|null), updated_at
```
Скрыто (admin): `reference_audio_path`, `reference_transcription`, `model_path`, `preview_path`, `metadata`.

**`CartesiaVoice`** (элемент `GET /voices/cartesia`):
```
id (int — внутренний, для озвучки не нужен), voice_id (string — значение для tts_settings.voice_id),
name (string), description (string|null), language (string|null — ISO 639-1),
gender (string|null — masculine|feminine|gender_neutral), preview_url (string|null — демо-запись)
```
Скрыто (admin): `is_active`, `sort_order`, `imported_at`, timestamps.

**`FishAudioVoice`** (элемент `GET /voices/fishaudio`):
```
id (int — внутренний, для озвучки не нужен), voice_id (string, 32 hex — значение для tts_settings.voice_id),
name (string), description (string|null), language (string|null — ru|en|es), languages (string[]),
gender (string|null — male|female), tags (string[]), author_name (string|null),
task_count (int — популярность), like_count (int),
preview_url (string|null — временная ссылка на MP3-сэмпл; null, пока превью не скачано)
```
Скрыто (admin): `preview_source_url`, `is_active`, `sort_order`, `imported_at`, timestamps.

**`FishAudioVoiceClone`** (`GET/POST /voices/fishaudio/clones`, retry, delete; payload `voice_clone.updated`) —
те же поля, что у `CartesiaVoiceClone` ниже, с отличиями: `provider` = `"fishaudio"`, `voice_id` — 32 hex
(не UUID), `language` — справочная метка ISO 639-1, `status` может быть и `banned` (забанен модератором;
причина — `ban_reason`, момент — `banned_at`), `error.reason` — ещё и `unbanned`. Скрыто (admin) — как у Cartesia.

**`CartesiaVoiceClone`** (`GET/POST /voices/cartesia/clones`, retry, delete; payload `voice_clone.updated`):
```
id (UUID — для путей voices/cartesia/clones/{voiceClone}), provider ("cartesia"),
display_name (string), language (string|null), description (string|null),
status (pending|cloning|ready|failed|archived),
voice_id (string|null — только у ready; значение для tts_settings.voice_id шаблона cartesia),
attempts (int — 1 при создании, +1 за каждый retry),
error ({ reason, message|null } | null — reason: processing_error|max_retries|network|timeout|dispatch_failed),
created_at (ISO), completed_at (ISO|null), failed_at (ISO|null)
```
Скрыто (admin): владелец, попытка воркера, аккаунт провайдера, путь образца, хронология.

---

## 10. Real-time (WebSocket) — статус заказов и клонов голоса без поллинга

Протокол Pusher-совместимый (`pusher-js` или Laravel Echo).

```js
import Pusher from 'pusher-js';

const pusher = new Pusher('7c4dd881d8116ac76fe89aff71d8c2ff', {
  wsHost: 'ws.lumean.app', wsPort: 443, wssPort: 443,
  forceTLS: true, enabledTransports: ['ws', 'wss'], cluster: '',
  channelAuthorization: {
    endpoint: 'https://api.lumean.app/api/public/broadcasting/auth',
    headers: { 'X-API-KEY': 'ВАШ_API_КЛЮЧ' },   // право под канал: orders.read / voices.read
  },
});

const ch = pusher.subscribe('private-orders.42');   // 42 = ID владельца ключа (user_id)
ch.bind('status.changed', (e) => console.log(e.new_status, e.order.id));
ch.bind('progress',       (e) => console.log(`${e.completed}/${e.total} (${e.percent}%)`));
```

**Каналы:**
- `private-orders.{userId}` — все заказы аккаунта (`userId` = ваш `user_id`, из `GET /user`).
- `private-order.task.{orderId}` — один заказ (`orderId` = UUID заказа).
- `private-chunks.preview.{userId}` — результат async-расчёта `POST /orders/chunks/preview`
  (§7.1). Право доступа то же (`orders.read`).
- `private-cartesia-voice-clones.{userId}` — ход клонирования голосов Cartesia (§7.12). Право —
  `voices.read`.
- `private-fishaudio-voice-clones.{userId}` — ход клонирования голосов Fish Audio (§7.12). Право —
  `voices.read`.
- `private-giftcodes.{userId}` — подарочные коды и статус реселлера (§7.13). Право — `reseller.read`.

**События** (для `pusher-js` имя без ведущей точки; для Echo — `.listen('.status.changed')`):

| Событие | Канал | payload |
| --- | --- | --- |
| `created` | orders | `{ order }` |
| `status.changed` | оба | `{ order, previous_status, new_status, items_summary: {total, by_status} }` — `order` — состояние заказа на момент доставки и может опережать `new_status`, если кадр задержался; показывайте `order.status` |
| `item.status.changed` | оба | `{ item, previous_status, new_status, completed_chunks, total_chunks, progress_percent }` |
| `progress` | orders | `{ order_id, completed, total, percent }` |
| `progress` | order.task | `{ task_id, progress, chunks_done, chunks_total, timestamp }` |
| `bulk_retry.completed` | оба | `{ order_id, created_count, failed_count }` |
| `renamed` | оба | `{ order }` |
| `order.queue.updated` | оба | `{ order_id, queue_position, queue_wait_seconds }` — `queue_position: null` = заказ вышел из очереди |
| `voice_search.queue.updated` | оба | `{ order_id, queue_position, queue_wait_seconds }` |
| `policy_cooldown.applied` | orders | `{ reason, minutes, retry_after, retry_at, level, threshold }` |
| `policy_cooldown.cleared` | orders | `{ was_blocked, strikes, level }` |
| `archive.progress` | orders | `{ order_id, archive_id, percent, files_done, files_total }` |
| `archive.ready` | orders | `{ order_id, archive_id, url, size, expires_at }` |
| `archive.failed` | orders | `{ order_id, archive_id, reason }` |
| `ready` | chunks.preview | `{ status: "ready", preview_id, summary, page }` — БЕЗ `chunks` (см. ниже) |
| `voice_clone.updated` | cartesia-voice-clones | `{ voice_clone: CartesiaVoiceClone }` (§9) — на каждое изменение клона: создание, `cloning`, `ready`, `failed`, `archived` |
| `voice_clone.updated` | fishaudio-voice-clones | `{ voice_clone: FishAudioVoiceClone }` (§9) — то же, что у Cartesia, для клонов Fish |
| `issued` | giftcodes | сводка выпущенной партии **без** кодов — коды берите из ответа `POST /reseller/codes` или `GET /reseller/codes` |
| `status.changed` | giftcodes | смена статуса кода: активирован, отменён, возвращён, аннулирован |
| `reseller.status.changed` | giftcodes | смена статуса реселлера (`active`/`blocked`/`revoked`) |

> **`bulk_retry.completed`** — финал массового повтора (`POST .../items/retry-failed`, §7.2):
> `created_count` — сколько повторных чанков реально создано, `failed_count` — сколько не удалось
> поставить (гарды в момент исполнения строже предварительных: между ответом `202` и запуском
> джобы состояние чанка могло измениться). Это событие «план исполнен», а не «заказ готов» —
> готовность по-прежнему смотрите по `status.changed`/`item.status.changed`.
>
> **`order.queue.updated`** — место заказа в очереди исполнителей сдвинулось (все сервисы, кроме
> `voice_search`). Приходит только тем заказам, чья позиция изменилась, не чаще раза в ~2 с;
> сдвиг между позициями ≥ 100 не рассылается (точное число — в REST);
> когда исполнитель взял задачу или заказ отменён — один кадр с `queue_position: null`.
> `queue_wait_seconds` всегда `null`. После переподключения перечитайте `GET /orders/{order}`:
> пропущенный кадр не повторяется, источник истины — REST.
>
> **`voice_search.queue.updated`** — только для заказов `voice_search`: они обслуживаются по
> одному, и место в очереди меняется по мере продвижения. Те же значения приходят в полях
> `queue_position`/`queue_wait_seconds` заказа (§9); `queue_wait_seconds` — оценка, а не обещание.
>
> **`renamed` и `archive.*` по API-ключу инициировать нельзя** — переименование заказа и сборка
> ZIP-архива живут только в веб-кабинете (в публичном контуре таких эндпоинтов нет). События
> приходят, если владелец аккаунта сделал это из интерфейса, — учитывайте их, чтобы не считать
> неизвестными; `renamed` несёт полный обновлённый `order`, поэтому им можно освежать своё
> состояние заказа.

> **`policy_cooldown.applied`** предупреждает о кулдауне (`reason: policy_cooldown_active`, §12)
> **до** того, как вы упрётесь в 429: ограничение накладывается в момент финализации последней
> провалившейся задачи, а не в ответ на ваш запрос. Отсчёт вести по `retry_at` (абсолютный
> ISO-8601), а не по `retry_after`: событие идёт через очередь, и относительное значение
> стареет в пути. Локализованного текста в payload нет — рассылка идёт из фонового воркера,
> где язык клиента неизвестен; текст отдаёт синхронный 429. **`policy_cooldown.cleared`**
> приходит, когда ограничение снято досрочно успешной задачей (такое бывает: задачи,
> отправленные до ограничения, продолжают выполняться) — по нему можно возобновлять отправку,
> не дожидаясь `retry_at`.

> **`ready`** на `chunks.preview` — ограниченное уведомление, чанки в payload НЕ приходят
> (страница с их текстом превысила бы лимит кадра Reverb): подтяните первую страницу через
> `GET /orders/chunks/preview/{previewId}?page=1` (§7.1). Полный референс, включая
> TypeScript-типы и примеры — `docs/PUBLIC_API_CHUNK_PREVIEW.md`.
>
> `progress` на двух каналах имеет **разную форму** — различайте по каналу. Подписка возможна
> только на свои каналы (иначе 403). Файлы в payload — только метаданные; скачивание — через
> `POST /storage/url`. Права канала: `orders.*` требуют `orders.read`; квоты/леджер — `billing.read`;
> `cartesia-voice-clones.*`, `fishaudio-voice-clones.*` — `voices.read`; `giftcodes.*` — `reseller.read`.
>
> **`voice_clone.updated`** несёт клон целиком — это снимок, а не дельта: события могут прийти не по
> порядку, ориентируйтесь на `status`. Финал — `ready` (берите `voice_id`) или `failed` (смотрите
> `error.reason`, повтор — `POST /voices/cartesia/clones/{voiceClone}/retry`).

```js
const clones = pusher.subscribe('private-cartesia-voice-clones.42');   // 42 = ваш user_id
clones.bind('voice_clone.updated', ({ voice_clone: c }) => {
  if (c.status === 'ready') console.log('voice_id для шаблона:', c.voice_id);
  if (c.status === 'failed') console.log('отказ:', c.error?.reason);
});
```

**Авторизация подписки вручную (клиент без Pusher SDK).** Приватный канал требует подписи: сервер
Reverb присылает вам `socket_id` при подключении, вы отдаёте его вместе с именем канала на
`POST /api/public/broadcasting/auth` и полученную строку передаёте в кадре подписки.

| Поле тела | Тип | Что это |
| --- | --- | --- |
| `socket_id` | string, required | Идентификатор соединения из кадра `pusher:connection_established` |
| `channel_name` | string, required | Полное имя канала **с префиксом** `private-` (напр. `private-orders.42`) |

```bash
curl -s -X POST "https://api.lumean.app/api/public/broadcasting/auth" \
  -H "X-API-KEY: $KEY" -H "Content-Type: application/json" \
  -d '{ "socket_id": "123456.7891011", "channel_name": "private-orders.42" }'
# → { "auth": "7c4dd881d8116ac76fe89aff71d8c2ff:<hmac>" }
```

Строку `auth` целиком кладите в `data.auth` кадра `pusher:subscribe`. Отказы: **401** — ключа нет
или он невалиден; **403** — у ключа нет права под этот канал (`orders.*` → `orders.read`,
`cartesia-voice-clones.*`, `fishaudio-voice-clones.*` → `voices.read`) **или**
канал чужой (проверка владельца — по `user_id` внутри имени канала). Эндпоинт живёт **вне** общей
группы публичного API: на него действует отдельный лимит (1200 запросов в минуту), окна ключа
(`per_minute`/`per_hour`/`per_day`, §6.1) он не расходует. Пользуетесь `pusher-js`/Laravel Echo —
всё перечисленное SDK делает сам, ему достаточно блока `channelAuthorization` из примера выше.

---

## 11. Рецепты (сквозные примеры)

### Рецепт A. TTS на ElevenLabs
См. §1 (TL;DR) — полный путь: голос → шаблон → заказ → ожидание → `storage/url`.
Аналогично для голосов **HeyGen** (`GET /voices/heygen`), **Cartesia** (`GET /voices/cartesia`)
и **LumVoice** (`GET /voices/public` или `GET /voices`): берёте оттуда `voice_id`/`id` и кладёте в
`config.tts_settings.voice_id` шаблона соответствующего сервиса (форма `config` для `heygen` и
`cartesia` — §8.2).

### Рецепт B. Звуковой эффект (SFX, без шаблона) — полный цикл

Шаблон не нужен: тип и параметры — прямо в запросе. Ключ описания звука — **`text`** (НЕ `prompt`).

**1. Создать заказ.**
```bash
curl -s -X POST "$BASE/orders" -H "X-API-KEY: $KEY" -H "Content-Type: application/json" -d '{
  "task_type": "sfx",
  "task_data": {
    "text": "Ocean waves crashing on rocks, distant seagulls",
    "duration_seconds": 8,
    "prompt_influence": 0.4,
    "output_format": "mp3_44100_128"
  }
}'
```
**Ответ `201`** — `data` = заказ. Обратите внимание: сервер **домешал дефолты** (`loop`) в
`task_data`; ключей `template`/`items` в только что созданном заказе ещё нет:
```json
{
  "success": true,
  "message": "Order created successfully.",
  "data": {
    "id": "b2c3d4e5-6f7a-4b8c-9d0e-1f2a3b4c5d6e",
    "user_id": 501,
    "template_id": null,
    "task_type": "sfx",
    "status": "created",
    "price_units": 0,
    "total_tokens": 0,
    "task_data": {
      "prompt_influence": 0.4,
      "duration_seconds": 8,
      "loop": false,
      "output_format": "mp3_44100_128",
      "text": "Ocean waves crashing on rocks, distant seagulls"
    },
    "result": null,
    "created_at": "2026-07-17T12:05:00+00:00",
    "updated_at": "2026-07-17T12:05:00+00:00",
    "eta_seconds": 45,
    "eta_at": "2026-07-17T12:05:45+00:00",
    "completed_chunks": 0,
    "total_chunks": 1,
    "progress_percent": 0
  }
}
```
- `total_tokens: 0` при создании — считаются только **завершённые** чанки, наполнится по мере обработки.
- `price_units` — заблокированная сумма (LMC-minor, деньги, НЕ токены); `0`, если покрыто квотой подписки.

**2. Дождаться готовности** — опрос `GET /orders/b2c3d4e5-…` (или WebSocket §10) до `status: "completed"`.

**Готовый заказ** — **ровно один** файл в `result.files[]` (строка-путь), поля `service_files`
у SFX нет вовсе:
```json
{
  "success": true,
  "message": "Order loaded successfully.",
  "data": {
    "id": "b2c3d4e5-6f7a-4b8c-9d0e-1f2a3b4c5d6e",
    "task_type": "sfx",
    "status": "completed",
    "price_units": 0,
    "total_tokens": 1000,
    "task_data": {
      "prompt_influence": 0.4, "duration_seconds": 8, "loop": false,
      "output_format": "mp3_44100_128", "text": "Ocean waves crashing on rocks, distant seagulls"
    },
    "result": {
      "user_message": null,
      "files": [
        "storage/501/orders/b2c3d4e5-6f7a-4b8c-9d0e-1f2a3b4c5d6e/output/chunks/0/result.mp3"
      ]
    },
    "created_at": "2026-07-17T12:05:00+00:00",
    "updated_at": "2026-07-17T12:05:40+00:00",
    "eta_seconds": null,
    "eta_at": null,
    "completed_chunks": 1,
    "total_chunks": 1,
    "progress_percent": 100,
    "items": [
      {
        "id": "a6b7c8d9-0e1f-4a2b-8c3d-4e5f6a7b8c9d",
        "item_type": "chunk", "chunk_index": 0, "status": "completed",
        "price_units": 1000, "consumed_units": 1000,
        "result_file": "storage/501/orders/b2c3d4e5-6f7a-4b8c-9d0e-1f2a3b4c5d6e/output/chunks/0/result.mp3"
      }
    ]
  }
}
```
> `total_tokens: 1000` здесь **иллюстративно** — фактическая ставка задаётся сервисом (см. §7.7
> `usage` и §6.2 токен-квоту). Расширение файла — `mp3` или `opus` в зависимости от `output_format`.

**3. Скачать** — путь из `result.files[0]` (строка целиком) в `POST /storage/url` → `data.url` → `GET`:
```bash
curl -s -X POST "$BASE/storage/url" -H "X-API-KEY: $KEY" -H "Content-Type: application/json" \
  -d '{ "path": "storage/501/orders/b2c3d4e5-6f7a-4b8c-9d0e-1f2a3b4c5d6e/output/chunks/0/result.mp3" }'
```

### Рецепт C. Музыка (без шаблона) — полный цикл, `n_variants` → несколько файлов

Ключ описания у Music — **`prompt`**. Главная особенность: `n_variants` даёт **столько же
отдельных (несклеенных) файлов** в `result.files[]` и **умножает цену** (`n_variants ×` ставку).

**1. Создать заказ** (три варианта одного трека):
```bash
curl -s -X POST "$BASE/orders" -H "X-API-KEY: $KEY" -H "Content-Type: application/json" -d '{
  "task_type": "music",
  "task_data": {
    "prompt": "Lo-fi hip hop, calm, rainy night, vinyl crackle",
    "n_variants": 3,
    "music_length_ms": 30000,
    "force_instrumental": true
  }
}'
```
**Ответ `201`** — `total_chunks` = `n_variants`; сервер домешал дефолты (`lyrics_text`, `model_id`)
в `task_data`:
```json
{
  "success": true,
  "message": "Order created successfully.",
  "data": {
    "id": "c7d8e9f0-1a2b-4c3d-8e4f-5a6b7c8d9e0f",
    "user_id": 501,
    "template_id": null,
    "task_type": "music",
    "status": "created",
    "price_units": 0,
    "total_tokens": 0,
    "task_data": {
      "n_variants": 3,
      "lyrics_text": null,
      "force_instrumental": true,
      "music_length_ms": 30000,
      "model_id": "music_v2",
      "prompt": "Lo-fi hip hop, calm, rainy night, vinyl crackle"
    },
    "result": null,
    "created_at": "2026-07-17T12:10:00+00:00",
    "updated_at": "2026-07-17T12:10:00+00:00",
    "eta_seconds": 90,
    "eta_at": "2026-07-17T12:11:30+00:00",
    "completed_chunks": 0,
    "total_chunks": 3,
    "progress_percent": 0
  }
}
```

**2. Дождаться готовности** (`GET /orders/c7d8e9f0-…` до `completed`). **Готовый заказ —
`n_variants` файлов, по одному на вариант, НЕ склеены:**
```json
{
  "success": true,
  "message": "Order loaded successfully.",
  "data": {
    "id": "c7d8e9f0-1a2b-4c3d-8e4f-5a6b7c8d9e0f",
    "task_type": "music",
    "status": "completed",
    "price_units": 0,
    "total_tokens": 6000,
    "task_data": {
      "n_variants": 3, "lyrics_text": null, "force_instrumental": true,
      "music_length_ms": 30000, "model_id": "music_v2",
      "prompt": "Lo-fi hip hop, calm, rainy night, vinyl crackle"
    },
    "result": {
      "user_message": null,
      "files": [
        "storage/501/orders/c7d8e9f0-1a2b-4c3d-8e4f-5a6b7c8d9e0f/output/chunks/0/result.mp3",
        "storage/501/orders/c7d8e9f0-1a2b-4c3d-8e4f-5a6b7c8d9e0f/output/chunks/1/result.mp3",
        "storage/501/orders/c7d8e9f0-1a2b-4c3d-8e4f-5a6b7c8d9e0f/output/chunks/2/result.mp3"
      ]
    },
    "completed_chunks": 3,
    "total_chunks": 3,
    "progress_percent": 100,
    "items": [
      { "chunk_index": 0, "item_type": "chunk", "status": "completed", "result_file": "storage/501/orders/c7d8e9f0-1a2b-4c3d-8e4f-5a6b7c8d9e0f/output/chunks/0/result.mp3" },
      { "chunk_index": 1, "item_type": "chunk", "status": "completed", "result_file": "storage/501/orders/c7d8e9f0-1a2b-4c3d-8e4f-5a6b7c8d9e0f/output/chunks/1/result.mp3" },
      { "chunk_index": 2, "item_type": "chunk", "status": "completed", "result_file": "storage/501/orders/c7d8e9f0-1a2b-4c3d-8e4f-5a6b7c8d9e0f/output/chunks/2/result.mp3" }
    ]
  }
}
```
> `total_tokens: 6000` = `n_variants(3) ×` ставку (иллюстративно: 2000/вариант). При `n_variants=1`
> в `result.files[]` будет один файл. Если один из вариантов упадёт — заказ станет
> `partially_completed`, но `sfx`/`music` **не** доводятся item-retry (§7.11): отмените и создайте заново.

**3. Скачать все** — пройдитесь `POST /storage/url` по каждому пути из `result.files[]`
(строка целиком) → `data.url` → `GET` (см. рецепт E).

### Рецепт D. Проверить остаток токенов подписки
```bash
curl -s "$BASE/subscriptions" -H "X-API-KEY: $KEY"
# items[].tokens_remaining — сколько токенов ещё доступно
```

### Рецепт E. Скачать все файлы готового заказа
```bash
# 1) GET /orders/{id} → result.files[] (основные) + result.service_files[] (субтитры, TTS)
# 2) для каждого path (из files[] И из service_files[]): POST /storage/url { "path": path } → data.url
# 3) GET data.url → бинарник файла
```
`result.files[]` и `result.service_files[]` — строки-пути; кладите строку целиком в `path`. Если поля нет — субтитров
у этого заказа не сгенерировано (напр. `sfx`/`music`).

### Рецепт F. Дотянуть частично готовый заказ (`partially_completed`)

**Шаг 1. Все технические `failed` — одним вызовом.** Тело пустое.
```bash
curl -s -X POST "$BASE/orders/<ORDER>/items/retry-failed" -H "X-API-KEY: $KEY"
```
**Ответ `202`** — план принят, повтор идёт в фоне:
```json
{
  "success": true,
  "message": "Упавшие чанки поставлены на перезапуск",
  "data": {
    "queued_count": 2,
    "queued": [
      { "item_id": "9a1e4f60-2b77-4a1c-8d33-5c0e1b7a9f21", "chunk_index": 3 },
      { "item_id": "7c4b18ad-6e02-4f9b-91a7-0d2c5e8b3f14", "chunk_index": 5 }
    ],
    "skipped_count": 1,
    "skipped": [
      { "item_id": "1f2d90c4-3a15-4e6b-b8d2-7f4a6c1e0b93", "chunk_index": 7,
        "reason": "policy_flagged",
        "reason_label": "Чанк отклонён политикой контента — перезапустите его отдельно с исправленным текстом." }
    ]
  }
}
```
> `message` и `reason_label` приходят на языке аккаунта-владельца ключа (в примере — русский;
> у англоязычного аккаунта будут `Failed chunks queued for retry` и `The chunk was rejected by
> content policy — retry it individually with corrected text.`). Тексты меняются при правке
> локализации — **никогда не разбирайте их программно**, для логики есть `reason`.
**Шаг 2. Каждый `skipped` с `reason: "policy_flagged"` — поштучно с исправленным текстом.**
```bash
curl -s "$BASE/orders/<ORDER>/items/<ITEM>/text" -H "X-API-KEY: $KEY"          # → data.text
curl -s -X POST "$BASE/orders/<ORDER>/items/<ITEM>/retry" -H "X-API-KEY: $KEY" \
  -H "Content-Type: application/json" -d '{ "text": "<исправленный текст>" }'
```
**Шаг 3. Дождаться результата.** Синхронного ответа у массового повтора нет: опрашивайте
`GET /orders/<ORDER>/items` (или `GET /orders/<ORDER>` до `status = completed`), либо слушайте
WebSocket — `bulk_retry.completed` придёт с `created_count`/`failed_count` (§10).
Лимит попыток — 5 на чанк; исчерпанные вернутся в `skipped` с `max_attempts_reached`.

### Рецепт G. Квоты подписки не хватило — PAYG-добор

Подписка даёт месячный лимит токенов. Если заказ стоит **больше**, чем осталось в квоте, и сервис
разрешает pay-as-you-go, недостающая часть **доплачивается с LMC-баланса автоматически**: `POST /orders`
сразу отвечает **201**, делать ничего не нужно (с 04.09.2026).

```bash
# Обычный POST /orders. Квоты не хватило — добор списан с LMC, заказ создан:
curl -s -X POST "$BASE/orders" -H "X-API-KEY: $KEY" -H "Content-Type: application/json" \
  -d '{ "template_id": "<UUID>", "input_text": "…" }'
# HTTP 201; разбивка оплаты в заказе: data.tokens_from_quota / data.tokens_from_payg
```

Важное:
- **Не хватает денег на добор** → **402** `insufficient_balance`: пополните LMC-баланс и повторите.
- **Доступность PAYG зависит от сервиса.** Если у сервиса PAYG отключён (`Service.payg_access = disabled`),
  заказ сверх квоты откажет с `insufficient_allowance`/`no_subscription` (см. §12), доплатить нельзя.
  Политику видно в `Service.payg_access`: `everyone` (PAYG всем) / `subscribers_only` (добор только
  подписчикам) / `disabled` (только из квоты).
- Итог по деньгам виден в заказе: `tokens_from_quota` (бесплатно из квоты) + `tokens_from_payg`
  (оплачено доплатой) — см. §9 `Order`.
- Тот же флоу у `POST /orders/{order}/retry` (retry идёт через тот же биллинг).

**Запасной путь — режим отката к явному подтверждению.** Оператор платформы может временно вернуть
прежний двухшаговый флоу. Тогда заказ сверх квоты **не создаётся**, а сервер отвечает **402
`payg_topup_required`** с ценой добора:

```bash
# HTTP 402, тело:
# {
#   "success": false,
#   "message": "…",
#   "reason": "payg_topup_required",
#   "error_code": "payg_topup_required",
#   "shortfall_tokens": 1200,           # токенов сверх остатка квоты — их и доплачиваете
#   "shortfall_lmc": 3.60,              # цена доплаты (LMC, human-формат)
#   "shortfall_lmc_minor": 360000000,   # та же цена в minor-units LMC
#   "quote_token": "<QUOTE>",           # подписанная квота цены — верните её как есть
#   "expires_at": "2026-07-25T12:34:56+00:00"  # до этого момента цена гарантирована
# }

# Согласны доплатить → повторите ТОТ ЖЕ запрос + confirm_payg_topup + quote_token:
curl -s -X POST "$BASE/orders" -H "X-API-KEY: $KEY" -H "Content-Type: application/json" \
  -d '{ "template_id": "<UUID>", "input_text": "…",
        "confirm_payg_topup": true, "quote_token": "<QUOTE>" }'
# → 201: shortfall_lmc списан из LMC-баланса, заказ создан. Не согласны — не повторяйте.
```

В этом режиме: токен истёк или квота изменилась → повторный запрос даст **свежий 402** с новым
`quote_token`; цена выросла относительно согласованной → **409** `quote_mismatch`: тело сразу несёт
свежую котировку на фактическую сумму (`quote_token`, `expires_at`, `actual_lmc_minor`; прежняя —
`quoted_lmc_minor`) — покажите новую цену и повторите запрос с `confirm_payg_topup: true` и этим
токеном, новый 402 не нужен. Клиенту, всегда присылающему `confirm_payg_topup`
и `quote_token` из последнего 402, переключение режима не заметно.

### Рецепт H. Cartesia своим голосом: клон → шаблон → заказ

Ключу нужны `voices.read`, `voices.write`, `templates.write`, `orders.write`, `orders.read`,
`orders.download`; аккаунту — живая подписка с Cartesia (от Creator).

```bash
# 1. Клонировать голос по образцу (base64 в JSON, до 20 МБ)
AUDIO_B64=$(base64 -w0 sample.wav)
curl -s -X POST "$BASE/voices/cartesia/clones" -H "X-API-KEY: $KEY" -H "Content-Type: application/json" \
  -d "{ \"display_name\": \"Мой голос\", \"language\": \"ru\", \"consent_confirmed\": true,
        \"reference_audio\": \"$AUDIO_B64\" }"
# → 201, data = { "id": "<CLONE_UUID>", "status": "pending", "voice_id": null, ... }
#   402 no_subscription — нет подписки с Cartesia (только если сервис закрыт для оплаты с баланса); 422 voice_clone_quota_exceeded — потолок тарифа (поле max)

# 2. Дождаться ready: событие voice_clone.updated (§10) либо опрос
curl -s "$BASE/voices/cartesia/clones?status=ready" -H "X-API-KEY: $KEY"
# → data.items[] — ищем свой id; у ready есть voice_id. failed → смотрим error.reason и
#   POST $BASE/voices/cartesia/clones/<CLONE_UUID>/retry

# 3. Шаблон Cartesia с voice_id клона (НЕ с его id)
curl -s -X POST "$BASE/templates" -H "X-API-KEY: $KEY" -H "Content-Type: application/json" -d '{
  "service_key": "cartesia",
  "name": "Мой голос — Cartesia",
  "config": {
    "tts_settings": {
      "voice_id": "<VOICE_ID_КЛОНА>",
      "model_id": "sonic-3",
      "language_code": "ru",
      "voice_settings": { "speed": 1.0, "volume": 1.0 }
    }
  }
}'
# → data.id = <TEMPLATE_UUID>

# 4. Заказ — как в §1: template_id + input_text → ожидание → POST /storage/url
curl -s -X POST "$BASE/orders" -H "X-API-KEY: $KEY" -H "Content-Type: application/json" -d '{
  "template_id": "<TEMPLATE_UUID>",
  "input_text": "Привет! Это мой голос на Cartesia."
}'
```

Голос каталога вместо клона: шаг 1–2 заменяет `GET /voices/cartesia?language=ru`, дальше то же.
**Fish Audio — тот же путь:** `POST /voices/fishaudio/clones` (402 `no_subscription` без живой подписки с
правом Fish — только если сервис закрыт для оплаты с баланса), опрос `GET /voices/fishaudio/clones?status=ready`, шаблон с
`"service_key": "fishaudio"` и `tts_settings.voice_id` = `voice_id` клона (32 hex; допустимые поля
`config` — `GET /templates/config-options?service=fishaudio`), затем заказ как в шаге 4; каталог вместо
клона — `GET /voices/fishaudio?language=ru`.
Клон больше не нужен — `DELETE /voices/cartesia/clones/<CLONE_UUID>` (место в потолке
освободится; уже принятые заказы доиграют, новые шаблоны и заказы с этим `voice_id` получат 422).

### Рецепт I. Дубляж готовой озвучки на другой язык

Ключу нужны `orders.read`, `orders.write`, `orders.download`. Исходник — ваш готовый заказ
`cartesia` или `elevenlabs` (например, из рецепта H).

```bash
SRC=<ORDER_UUID>   # готовый заказ озвучки: status = completed

# 1. Открыт ли дубляж и на какие языки (вид — по service_key исходника)
curl -s "$BASE/orders/dubbing/options" -H "X-API-KEY: $KEY"
# → data.kinds.cartesia.available = true, data.kinds.cartesia.languages = ["en", ...]

# 2. Цена до заказа (ничего не списывает)
curl -s "$BASE/orders/$SRC/dub/quote?target_language=en" -H "X-API-KEY: $KEY"
# → data.tokens = 657 (из них tokens_from_quota / tokens_from_payg), data.allowed = true,
#   data.defaults.voice_id — голос, которым пойдёт дубль

# 3. Создать дубль: голос и модель — из шаблона исходника
curl -s -X POST "$BASE/orders/$SRC/dub" -H "X-API-KEY: $KEY" -H "Content-Type: application/json" \
  -d '{ "target_language": "en" }'
# → 201, data.id = <DUB_UUID>, data.task_type = "cartesia_dub"
#   свой голос: добавьте "voice_id"; голос из другого своего шаблона того же сервиса: "template_id"

# 4. Дождаться готовности: WS private-order.task.<DUB_UUID> (§10) или опрос
curl -s "$BASE/orders/<DUB_UUID>" -H "X-API-KEY: $KEY"
# ждём data.status = "completed"

# 5. Скачать дорожку и субтитры — пути из data.result.files[] и data.result.service_files[]
curl -s -X POST "$BASE/storage/url" -H "X-API-KEY: $KEY" -H "Content-Type: application/json" \
  -d '{ "path": "storage/501/orders/<DUB_UUID>/output/chunks/0/result.mp3" }'
```

Частые отказы на шаге 3: `422` `dub_same_language` — язык дубля совпал с языком исходника
(только у Cartesia; у ElevenLabs язык исходника `auto`, и совпадение даст упавший дубль с возвратом денег);
`422` `dub_source_unavailable` — исходник не готов, абзацный или его файлы истекли; `422`
`dub_source_too_long` — длиннее потолка (в теле `source_chars`, `max_source_chars`); `409`
`duplicate_order` — тот же запрос меньше минуты назад.

---

## 12. Коды ответов (сводка)

| Код | Когда | Тело |
| --- | --- | --- |
| 200 | Успех чтения/действия | `{ success:true, message, data }` |
| 201 | Ресурс создан (order/template/item) | `{ success:true, message, data }` |
| 400 | Ошибка домена (недопустимое действие) | `{ success:false, message }`; у отказа операции над заказом (cancel, retry) ещё `reason` и `error_code` с тем же значением — см. таблицу ниже |
| 401 | Нет/невалидный/истёкший ключ | `{ success:false, message, data:null }` |
| 402 | `insufficient_balance` / `insufficient_allowance` — не хватает денег на добор сверх квоты или тариф добор запрещает (таблица ниже). Только в режиме отката (§6.3): `payg_topup_required` — нужен явный добор | `{ success:false, message, reason, error_code }`; у `payg_topup_required` ещё `shortfall_tokens, shortfall_lmc, shortfall_lmc_minor, quote_token, expires_at` — повторите `POST /orders` с `confirm_payg_topup:true` и тем же `quote_token` (Рецепт G) |
| 403 | Нет права ключа / чужой ресурс | `{ success:false, message, data:null }` |
| 404 | Ресурс не найден / файл не найден **или** такого эндпоинта нет — различайте по `reason` | ресурс: `{ success:false, message }`; эндпоинта нет (§6.1): `{ success:false, message, reason:"endpoint_not_found", error_code:"endpoint_not_found", message_en, method, path, docs, developers, ban_warning:{ status:429, reason:"ip_banned", ban_ladder_seconds } }` |
| 405 | Метод не поддержан (напр. `DELETE /orders/{id}`) | стандартный |
| 409 | Только в режиме отката (§6.3): `quote_mismatch` — добор подорожал, `quote_token` устарел (гонка). Ещё `stitch_in_progress` у поштучного повтора фрагмента (§7.2) | `{ success:false, message, reason, error_code }`; у `quote_mismatch` ещё `actual_lmc_minor, quoted_lmc_minor, quote_token, expires_at` — повторите запрос со свежим `quote_token` из тела, без нового 402 |
| 422 | Ошибка валидации **или** доменный отказ с `reason` (таблица ниже) | валидация: `{ success:false, message, errors:{field:[...]} }`; отказ: `{ success:false, message, reason, error_code }` (у `template_model_outdated` ещё `fields`) |
| 429 | Rate-limit, токен-квота, лимиты заказа (таблица ниже) **или** бан IP — различайте по `reason` | rate: `{ success:false, message, reason:"rate_limit_exceeded", error_code:"rate_limit_exceeded", retry_after }` + заголовок `Retry-After`; квота: `{ success:false, message, reason:"token_quota_exceeded", error_code:"token_quota_exceeded", window, limit, used, requested, reset_at, retry_after }` + заголовок `Retry-After` (у пула `window:"quota"` — `reset_at`/`retry_after` = `null` и без заголовка, §6.2); бан IP (§6.1): `{ success:false, message, reason:"ip_banned", error_code:"ip_banned", message_en, scenario, retry_after, banned_until, ban_step, ban_ladder_seconds, docs, developers }` + заголовок `Retry-After` |
| 500 | Временная инфраструктурная ошибка | `{ success:false, message }`, безопасный текст, повторить |
| 503 | Внешний ElevenLabs library недоступен | только `voices/elevenlabs/library` |

**Отказы каталога и клонов Cartesia** (`voices/cartesia*`, §7.6, §7.12). Тело
`{ "success": false, "message": "...", "reason": "<машинный>", "error_code": "<то же значение>" }`:

| `reason` | HTTP | Где | Смысл |
| --- | --- | --- | --- |
| `service_not_found` | 404 | каталог, создание, повтор | Сервис Cartesia закрыт для владельца ключа (закрытый тест) |
| `no_subscription` | 402 | создание, повтор | Нет живой подписки с правом Cartesia; приходит только если сервис закрыт для оплаты с баланса. Обратите внимание: у клонов это **402**, а у заказов (`POST /orders`, таблица ниже) тот же `reason` приходит с **403** |
| `voice_clone_quota_exceeded` | 422 | создание, повтор | Потолок клонов тарифа; в теле ещё `max`. Освободите место архивированием (`DELETE`) или перейдите на старший тариф |
| `voice_clone_not_found` | 404 | повтор, архив | Клона нет или он чужой |
| `voice_clone_not_retryable` | 409 | повтор | Клон не в `failed` (уже `ready` или ещё идёт) либо образец уже удалён |

Те же `reason`, коды и тела — у каталога и клонов Fish Audio (`voices/fishaudio*`, §7.6, §7.12);
`no_subscription` у Fish, как и у Cartesia, приходит только если сервис закрыт для оплаты с баланса;
потолок клонов — свой, отдельный от Cartesia (без подписки 2 клона).


Коды **402** и **409** одинаково применимы к `POST /orders` **и** `POST /orders/{order}/retry` (retry
проходит тот же биллинг-flow).

**Машинный код отказа приходит под двумя ключами — `reason` и `error_code`, значения всегда
одинаковые** (с 25.09.2026 — у всех отказов, где есть код; раньше часть отказов несла только `reason`).
Ветвитесь по любому из них, по тексту `message` — нельзя: формулировки меняются.

**Доменный отказ `POST /orders` и `POST /orders/{order}/retry` (`OrderNotAllowedException`).**
Тело: `{ "success": false, "message": "...", "reason": "<машинный>", "error_code": "<то же значение>" }`.
HTTP-код зависит от `reason`:

| `reason` | HTTP | Смысл |
| --- | --- | --- |
| `insufficient_balance` / `insufficient_allowance` | 402 | Не хватает баланса/залоченного лимита (модель с авансом) |
| `no_subscription` / `entitlement_missing` / `template_access_denied` | 403 | Нет подписки/entitlement под сервис либо доступа к шаблону |
| `limit_exceeded` | 429 | **Превышен usage-лимит подписки** — третий вид 429 (см. §6): в теле только `message`+`reason`, **нет** полей токен-квоты и **нет** `Retry-After`. Сверьтесь с `GET /usage` |
| `concurrency_limit_exceeded` | 429 | **Исчерпаны слоты одновременных задач** — четвёртый вид 429 (см. §6). Ограничено не число запросов и не объём, а количество ваших заказов **в работе одновременно**. `Retry-After` нет. Ждать надо завершения СВОИХ активных заказов (минуты), а НЕ конца расчётного периода — повтор сразу после завершения любого из них пройдёт. Действующий потолок и текущее число активных — в `GET /usage` (запись с `limit_type: "concurrent"`; у неё `period_start`/`period_end`/`resets_in` = `null`, потому что периода у такого лимита нет). Лимит может быть задан как на все сервисы сразу, так и отдельно на каждый |
| `content_blocked` | 422 | **Текст уже отбивался контентной политикой сервиса** и лежит в глобальном блоклисте. Повторять бессмысленно: исход будет тот же, а попытка снова стоит денег. Единственное действие — отредактировать спорные фрагменты. Проверка идёт по ЧАНКАМ (точное совпадение текста фрагмента), поэтому в длинном тексте достаточно поправить один спорный кусок. Тот же `reason` отдают повтор и перегенерация чанка. **Узнать заранее можно:** dry-run разбиения на чанки (`POST /orders/chunks/preview`, §7.1) бесплатен и отдаёт `summary.has_blocked_content` и `summary.blocked_chunks` (номера чанков из блоклиста) — поправьте их до создания заказа |
| `policy_cooldown_active` | 429 | **Кулдаун после серии блокировок по политике** — пятый вид 429 (см. §6). Пять подряд заблокированных политикой задач ограничивают создание новых на 5 минут, при повторных залётах — 10, затем 15 (выше не поднимается). В отличие от прочих 429 заказа, здесь **есть** `Retry-After` и поля `retry_after` (секунды) / `retry_at` (ISO-8601). Сбои инфраструктуры (таймаут воркера, сеть) счётчик не двигают — считаются только контентные блокировки. Любая успешно выполненная задача обнуляет и счётчик, и достигнутую ступень |
| `service_not_found` / `not_allowed` | 422 | Сервис не найден/не активен либо прочий доменный отказ |
| `template_model_outdated` | 422 | **Шаблон или `config_override` несут настройки прежней схемы сервиса** — модель или движок, которых в текущей схеме сервиса нет. В теле ещё `fields` — пути устаревших настроек (например `["tts_settings.voice_engine"]`). Тихого перевода на новую схему нет, повтор того же запроса даст тот же отказ: выберите модель в шаблоне заново (`PUT /templates/{template}`, список — `GET /templates/config-options`) и повторите. Тот же отказ отдаёт превью `POST /orders/chunks/preview` |

`limit_exceeded` приходит одинаковым ответом (429, `message` + `reason`) и тогда, когда параллельный
заказ занял последний слот лимита между проверкой и списанием (до 24.09.2026 такая гонка давала 500).

**Отказы дубляжа** (`POST /orders/{order}/dub` и `GET /orders/{order}/dub/quote`, §7.14). Тело
`{ "success": false, "message": "...", "reason": "<машинный>", "error_code": "<то же значение>" }`; деньги
не списываются. Плюс общие отказы создания заказа из таблицы выше (402, 429):

| `reason` | HTTP | Смысл |
| --- | --- | --- |
| `dub_source_unavailable` | 422 | Исходник не дублируется: не готовая озвучка `cartesia`/`elevenlabs`, файлы истекли, нет таймингов фраз, заказ в абзацном режиме или над ним идёт перегенерация/склейка |
| `dub_source_too_long` | 422 | Исходник длиннее потолка вида; в теле ещё `source_chars` и `max_source_chars` |
| `dub_same_language` | 422 | Язык дубля совпал с языком исходника (только когда язык исходника известен — у Cartesia; у ElevenLabs он `auto`) |
| `service_not_found` | 422 | Дубляж этого вида владельцу ключа недоступен (тот же ответ, что у несуществующего сервиса) |
| `duplicate_order` | 409 | Тот же дубль (исходник и поля) уже создан меньше минуты назад |

Отказ поля (`target_language` не из списка, `voice_id` не того формата, чужой `template_id`) —
обычная **422** валидации с `errors`.

**Отказ операции над существующим заказом** (`POST /orders/{order}/cancel`, `POST /orders/{order}/retry`).
Код **400** (как у «ошибки домена» выше), тело `{ "success": false, "message": "...", "reason": "<машинный>",
"error_code": "<то же значение>" }`, `message` — на языке ключа. Логику стройте по `reason`:

| `reason` | HTTP | Где | Смысл |
| --- | --- | --- | --- |
| `invalid_order_status` | 400 | cancel, retry | Статус заказа не допускает операцию: отмена — только `created`/`pending`/`partially_completed`, полный повтор — только `completed`/`result_delivered` |
| `has_failed_items` | 400 | retry | В исходном заказе есть упавшие фрагменты — полный повтор недоступен, дотягивайте их поштучно (`POST /orders/{order}/items/{item}/retry`) |
| `retry_config_outdated` | 400 | retry | Настройки исходной генерации (снимок шаблона на момент создания заказа вместе с `config_override`) больше не проходят текущую схему сервиса, поэтому повторить заказ «как был» нельзя. Создайте новый заказ (`POST /orders`) по актуальному шаблону |

Один и тот же `reason` на разных ручках может прийти с разным HTTP-кодом: у поштучного повтора
фрагмента (`POST /orders/{order}/items/{item}/retry`, §7.2) `invalid_order_status` — это `422`, а
`stitch_in_progress` — `409`, у отмены и полного повтора заказа `invalid_order_status` — `400`.
Так же `retry_config_outdated`: у полного повтора заказа — `400`, а у повтора и перегенерации
фрагмента (`.../items/{item}/retry`, `.../items/{item}/regenerate`) и у массового повтора
(`.../items/retry-failed`) — `422`. Смысл один: настройки заказа (снимок шаблона с
`config_override`) больше не проходят текущую схему сервиса, повторить «как был» нельзя — создайте
новый заказ по актуальному шаблону. Массовый повтор отказывает сразу, синхронно: повтор не
ставится, и события `bulk_retry.completed` не будет.
Ветвитесь по `reason` (и ручке), а не по коду.

---

## 13. FAQ / частые ошибки для LLM

- **«Как перевести готовую озвучку на другой язык?»** — Дубляжом: `POST /orders/{order}/dub` с
  `target_language` от готового заказа `cartesia`/`elevenlabs` (§7.14, рецепт §11-I). Не создавайте
  `POST /orders` с `task_type: "cartesia_dub"` — это 422. Текст переводить и присылать не нужно, цену
  заранее даёт `GET /orders/{order}/dub/quote`.
- **«Как прикрепить голос к заказу?»** — Никак напрямую. Голос → в шаблон
  (`config.tts_settings.voice_id`) → заказ по шаблону. Поля `orders.voice_id` не существует.
- **«Куда положить текст TTS?»** — В top-level `input_text` запроса `POST /orders`. Не в `task_data`.
- **«Как создать SFX/Music и что придёт в ответе?»** — Без шаблона: `POST /orders` с
  `task_type: "sfx"` и `task_data.text` (описание звука) **или** `task_type: "music"` и
  `task_data.prompt`. Ответ `201` — заказ со `status: "created"` (сервер домешивает дефолты в
  `task_data`); файлы появятся после обработки в `result.files[]` (SFX — **1** файл; Music —
  **`n_variants`** файлов, по одному на вариант, не склеены). Полные примеры запрос+ответ —
  §11-B (SFX) и §11-C (Music), поля — §8.1. Ключ описания: у SFX `text`, у Music `prompt`.
- **«Можно ли создать `image`/`txt2img`/`remix`/`image_edit`/`voice_clone` по API-ключу?»** — Нет.
  Через публичный `POST /orders` создаются `tts`, `sfx`, `music` и `voice_search` (§5). Остальные
  значения — лишь для фильтра `GET /orders?task_type[]=…`. Технически: они проходят валидацию
  запроса (в enum'е), но падают на резолве сервиса — сервиса с таким кодом не существует — и
  дают **422** `service_not_found`. Не отправляйте их.
- **«А `voice_search` создаётся?»** — Да, с 27.07.2026 (раньше — нет, и старые версии этого
  справочника утверждали обратное). Это template-less тип: аудиофрагмент в `input_files`,
  опционально `task_data.top`. Подробности и ограничения — §5.
- **«Как долго доступны файлы готового заказа?»** — Ограниченное время: storage заказа удаляется по
  ретенции (**по умолчанию 7 дней** после перехода в терминальный статус — `completed`/`result_delivered`/
  `failed`/`compensated`/`cancelled`). После удаления `POST /storage/url` по этим путям → **404**. Нюанс:
  `GET /orders/{order}` после истечения **всё ещё показывает старые пути** в `result.files[]` — они уже
  «мёртвые», отдельного признака истечения в пользовательском ответе нет (виден только 404 при скачивании).
  Запись заказа в БД сохраняется. **Скачивайте результаты сразу после `completed`, не откладывайте.**
- **«Работает ли курсорная пагинация (`?pag=cursor`)?»** — В публичном API **нет**. Параметр проходит
  валидацию (не даёт 422), но **молча игнорируется** — списки всегда отдают offset-форму
  `{ items, current_page, last_page, per_page, total }`. Листайте через `page`/`per_page`; поля
  `next_cursor` здесь нет.
- **«Квоты подписки не хватило — заказ откажет?»** — Нет, если сервис разрешает pay-as-you-go:
  недостающая часть доплачивается с LMC-баланса автоматически, `POST /orders` отвечает `201` (§6.3).
  Откажет только нехватка денег (**402** `insufficient_balance`) или запрет добора тарифом
  (`insufficient_allowance`, §12).
- **«Получил `402 payg_topup_required` — что это?»** — Платформа временно в режиме отката к явному
  подтверждению добора (§6.3). В теле: `shortfall_tokens`, `shortfall_lmc`, `quote_token` + `expires_at`.
  Согласны — повторите **тот же** `POST /orders` с `confirm_payg_topup: true` и тем же `quote_token` →
  201. Не согласны — не повторяйте (ничего не списано). Цена выросла → 409 `quote_mismatch`: в теле уже свежий
  `quote_token` на новую сумму — повторите запрос с ним. Полный пример — **Рецепт G (§11)**.
- **«Как узнать, спишется ли доплата PAYG заранее?»** — Превью (`POST /orders/chunks/preview`, §7.1)
  отдаёт стоимость заказа (`summary.cost_lmc`); остаток квоты — `GET /subscriptions` (`items[].tokens_remaining`, Рецепт D).
  Разбивка по факту — в заказе: `tokens_from_quota` (бесплатно из квоты) и `tokens_from_payg`
  (оплачено доплатой), см. §9 `Order`.
- **«Почему пустой список голосов ElevenLabs?»** — `page` начинается **с 0**. `page=1` — это вторая страница.
  У Cartesia (`voices/cartesia`, `voices/cartesia/clones`) и Fish Audio (`voices/fishaudio`,
  `voices/fishaudio/clones`) — наоборот, обычная пагинация с 1.
- **«Какие модели ElevenLabs есть?»** — `eleven_v4`, `eleven_v4_exp`, `eleven_v3`, `eleven_v3_beta`,
  `eleven_multilingual_v2`, `eleven_flash_v2_5`, `eleven_turbo_v2_5`, `eleven_turbo_v2` (§8.2).
  Источник истины — `GET /templates/config-options?service=elevenlabs`. У HeyGen —
  `eleven_multilingual_v2` и `eleven_v3`, у Cartesia — `sonic-3.6`, `sonic-3.5`, `sonic-3`.
- **«Как озвучить своим голосом?»** — Через Cartesia или Fish Audio (`/voices/fishaudio/clones`, тот
  же порядок, правила подписки те же, `voice_id` из 32 hex-символов). Через Cartesia: `POST /voices/cartesia/clones` → дождаться
  `ready` → `voice_id` клона в шаблон `cartesia` → заказ. Рецепт H (§11). Создание клона — не заказ:
  `task_type: "voice_clone"` для этого не нужен и по ключу не создаётся.
- **«Клон создан, но `voice_id: null`»** — Клонирование асинхронное: `voice_id` появится в статусе
  `ready`. Ждите `voice_clone.updated` (§10) или опрашивайте `GET /voices/cartesia/clones`.
- **«Положил в шаблон `id` клона — 422»** — В шаблон идёт `voice_id` клона (строка Cartesia), а
  `id` (UUID) нужен только для путей `voices/cartesia/clones/{voiceClone}`.
- **«Четвёртый заказ Cartesia получил 429»** — Это `concurrency_limit_exceeded`: у Cartesia не
  больше 3 заказов в работе одновременно. Дождитесь завершения своих заказов и повторите.
- **«Заказ создан, где файл?»** — Дождитесь `status = completed`/`partially_completed`, возьмите
  `result.files[]` (строка-путь), обменяйте на ссылку через `POST /storage/url`.
- **«Обновить/удалить заказ?»** — Нельзя. Только `cancel` (до обработки) или `retry` (создаёт новый).
- **«429 — что делать?»** — Если тело несёт `reason: token_quota_exceeded` — исчерпана квота по
  токенам: при `window: "quota"` исчерпан пул ключа, ожидание не поможет — нужна довыдача
  администратором; иначе ждать до `reset_at` (заголовок `Retry-After` тоже есть). Иначе это rate-limit —
  `Retry-After` здесь НЕ присылается, ориентируйтесь на окно ключа (`per_minute`/`per_hour`/`per_day`)
  и делайте backoff самостоятельно.
- **«404 с `reason: endpoint_not_found`»** — Такого пути нет. Не перебирайте соседние адреса:
  найдите нужный запрос в этом файле (§7). Ещё несколько таких 404 — и IP получит бан на всех
  путях (429 `ip_banned`, §6.1); запросы во время бана его не снимут.
- **«Какие поля config у шаблона?»** — Спросите `GET /templates/config-options?service=<code>`;
  структура зависит от сервиса.
- **«403 на, казалось бы, доступном эндпоинте?»** — У ключа нет нужного права. Скачивание требует
  отдельного `orders.download`, каталоги голосов — `voices.read`, создание/повтор/архив клонов
  Cartesia и Fish Audio — `voices.write` (его нет в пресетах `read_only` и `automation`), профиль — `profile.read`.
- **«Где субтитры (.srt/.vtt) заказа?»** — В отдельном поле `result.service_files[]` (не в
  `result.files[]`), только для TTS. Это массив строк-путей; скачивайте их тем же `POST /storage/url`.
  См. §7.10.
- **«Чанк заказа `failed`/`policy_flagged` — что делать?»** — Заказ стал `partially_completed`.
  Сначала один вызов `POST /orders/{order}/items/retry-failed` — он поставит на повтор все
  технические `failed` сразу и вернёт `202` со списком `skipped`. Затем каждый пропущенный с
  `reason: "policy_flagged"` добейте поштучно `POST /orders/{order}/items/{item}/retry`,
  передав **исправленный** `text` (тот же текст отклонят снова). Order-level `retry` здесь не
  поможет. См. §7.11 и Рецепт F.
- **«Массовый повтор вернул 202, но в ответе нет готовых чанков — где результат?»** — Его там и не
  будет: `202` означает «план принят», повтор выполняется в фоне. Тело несёт только `queued`
  (что поставлено) и `skipped` (что и почему пропущено). Готовность узнавайте опросом
  `GET /orders/{order}/items` или событием `bulk_retry.completed` по WebSocket (§10).
- **«API не говорит, почему сработала policy — где причина?»** — Её нет в ответе по ключу (это
  admin-only). Правьте текст по своему усмотрению; не ищите поле с reason — его не отдают.
- **«Заказ `failed`, но `result: null` — где детали ошибки?»** — Их нет в пользовательском контексте
  (отфильтрованы). Ориентируйтесь на `status` заказа и статусы чанков (`failed`/`policy_flagged`).
- **«`can_retry: true`, но retry вернул 400?»** — Флаг смотрит только на статус чанка. Реальный вызов
  ещё требует: заказ `partially_completed`, попыток < 5, остался залоченный остаток, тип не `sfx`/`music`.

---

## 14. AI API (OpenAI- и Anthropic-совместимый)

Отдельный контур от `/api/public/*`: LLM-гейтвей с протоколами OpenAI и Anthropic. Код клиента не
меняется — меняются **базовый адрес и ключ**. Машиночитаемая спека: `GET /docs/public-ai-gateway.json`
(русская) и `GET /docs/public-ai-gateway.en.json` (английская).

### 14.1 База, ключ, оплата

- **База:** `https://api.lumean.app/v1` (не `/api/public`). Для Anthropic SDK и Claude Code база **без `/v1`**:
  `https://api.lumean.app` — клиент сам дописывает `/v1/messages`.
- **Ключ — ЛЮБОЙ API-ключ кабинета Lumean** (тот же, что для Public API, §3). Передаётся как
  `Authorization: Bearer <ключ>` либо `x-api-key: <ключ>` (так делают Claude Code и Anthropic SDK).
  Заголовок `X-API-KEY` из §3 здесь не используется.
- **Галочка «AI»** на ключе (`ai_enabled`, по умолчанию включена). Выключенная даёт **401** `not_a_gateway_key`.
- **Оплата** — с баланса LUMC по ставке модели. Нет денег — **402** `insufficient_quota`.
- **Месячный лимит трат ключа** (необязательный, `ai_monthly_limit_minor`, в LUMC; календарный месяц UTC):
  превышение даёт **402** `key_budget_exceeded`.
- **Цены меняются** вслед за поставщиками — проверяйте перед запросом (§14.6).
- **Текущие цены по ключу:** `GET /api/public/ai/models` (§14.6); в кабинете — `GET /api/ai-gateway/models`
  (JWT). `GET /v1/models` — список моделей и их лимиты, **без цен**.
- Каждый ответ несёт заголовок `X-Request-Id`.

### 14.2 Ручки

| Метод и путь | Что это |
|---|---|
| `POST /v1/chat/completions` | OpenAI Chat Completions. Буфер и SSE (`stream: true`, конец — `data: [DONE]`); tools/function calling, `response_format`, мультимодальный вход проходят как есть. `usage` в ответе. |
| `POST /v1/responses` | OpenAI Responses API (для Codex CLI). Ответы **не хранятся**: всегда `store: false`; `previous_response_id`, `conversation`, `background: true` → 400 `unsupported_parameter` (контекст передавайте целиком в `input`). Стрим — события `response.*`, конец — `response.completed`. |
| `POST /v1/messages` | Anthropic Messages (Claude Code, Anthropic SDK). `max_tokens` обязателен (иначе 400). Заголовки `anthropic-version`, `anthropic-beta` пробрасываются. **Ошибки в конверте Anthropic** `{"type":"error","error":{"type":"...","message":"..."}}`. Стрим — `message_start … message_stop`. |
| `POST /v1/messages/count_tokens` | `{"input_tokens": N}` — наша оценка, бесплатно. |
| `GET /v1/models` | Форма OpenAI: `{"object":"list","data":[{"id","object":"model","created":0,"owned_by":"lumean","name","kind":"chat"\|"image","context_window","max_output_tokens"}]}`. |
| `GET /v1/models/{id}` | Одна модель или 404 `model_not_found`. |
| `POST /v1/images/generations` | JSON: `model`, `prompt`; необязательные `size`, `aspect_ratio` (см. ниже); `n` — только 1. Модели `kind=image`. |
| `POST /v1/images/edits` | multipart: `model`, `prompt`, `image` или `image[]` (до 4); необязательные `size`, `aspect_ratio` — текстовыми полями формы. Модели `kind=image`. |

Ответ ручек изображений: `data[0].url` — **наша** ссылка, живёт **7 дней** (скачайте файл, если нужен дольше).

**Размер картинки.** Какие значения принимает модель, говорит каталог `GET /api/public/ai/models`
(§14.6): поле `capabilities.image_options` модели.

- Ключ `image_options` — имя поля запроса (`size`, `aspect_ratio`), значение — список допустимых
  вариантов; **первый — значение по умолчанию**. Формат: `size` — `ШxВ` (`1536x864`) или `auto`,
  `aspect_ratio` — `Ш:В` (`16:9`) или `auto`.
- Выбранное значение передавайте полем с тем же именем: в JSON `/v1/images/generations` и текстовым
  полем multipart `/v1/images/edits` — размер работает и при правке по референсам.
- Нет `image_options` (или нет нужного ключа) — модель размер не выбирает: поле не шлите.
- Значение не из списка уходит поставщику как есть, и он может отказать (**400**). Отказ не
  списывается, но берите варианты из каталога.
- **Модели, рисующие через чат** — `nano-banana-2`, `nano-banana-pro`, `gemini-3-pro-image-preview`,
  `gemini-3.1-flash-image`: `size` и `aspect_ratio` до поставщика **не доходят** и молча
  игнорируются, `image_options` у них нет. Нужную форму можно попросить словами в `prompt` — без
  гарантии.

```bash
# 1. Варианты размера у модели
curl -s "https://api.lumean.app/api/public/ai/models/gpt-image-2.5" -H "X-API-KEY: $KEY" \
  | jq '.data.models[0].capabilities.image_options'
# → {"size": ["auto", "1024x1024", "1536x864", "864x1536", ...]}

# 2. Генерация с выбранным размером
curl -s https://api.lumean.app/v1/images/generations -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-image-2.5", "prompt": "закат над морем", "size": "1536x864"}'

# 3. Правка по референсу с тем же размером
curl -s https://api.lumean.app/v1/images/edits -H "Authorization: Bearer $KEY" \
  -F model=gpt-image-2.5 -F prompt="тот же персонаж на пляже" -F size=1536x864 -F image=@ref.png
```

### 14.3 Запрещённые серверные инструменты

Серверные инструменты поставщика тарифицируются им сверх токенов, поэтому запрещены:

- **Responses:** разрешены `tools[].type` = `function` | `custom` и клиентские инструменты Codex
  `local_shell`, `shell`, `apply_patch`, `computer_use_preview`.
- **Messages:** разрешены обычные инструменты (без `type` или `custom`) и клиентские `bash_*`,
  `text_editor_*`, `computer_*`, `memory_*`. `web_search_*`, `web_fetch_*`, `code_execution_*`,
  `mcp_servers` → **400** `unsupported_tool`.
- Формат (responses/messages) для модели не обслуживается → **404** `endpoint_not_supported`:
  используйте chat/completions. Модели картинок через responses/messages → **400** `endpoint_not_supported`.

Режимы, которые поставщик тарифицирует дороже ставки модели, тоже не проходят:

- `service_tier` — только `auto`, `default`, `flex`, `standard_only` (иначе **400** `unsupported_parameter`).
- Messages: `ttl` у `cache_control` снимается (действует 5-минутный кэш); бета `context-1m-*` из
  `anthropic-beta` не передаётся.
- Responses без `max_output_tokens` получает потолок **32768** токенов.
- Ключи тела, различающиеся только регистром (`tools` и `Tools`), → **400** `invalid_request_body`.

### 14.4 Лимиты и ошибки

- Лимиты ключа: **300 запросов/мин** и **16 одновременных** → **429** `rate_limit_exceeded` /
  `concurrent_requests_limit_exceeded` с заголовком `Retry-After`.
- Тело запроса до **32 МиБ** (иначе **413** `request_too_large`).
- Форма ошибки — OpenAI: `{"error":{"message","type","param","code"}}` (на `/v1/messages` — конверт Anthropic).
- Коды `code`: `missing_api_key`, `not_a_gateway_key`, `unknown_key`, `key_inactive`, `key_expired` (401),
  `insufficient_quota`, `key_budget_exceeded` (402), `invalid_request_body`, `unsupported_parameter`,
  `unsupported_tool`, `missing_required_parameter`, `context_length_exceeded`, `endpoint_not_supported` (400/404),
  `model_not_found`, `model_disabled` (404), `provider_keys_cooling` (429), `gateway_at_capacity` (503),
  `quota_check_unavailable` (502/503), `catalog_unavailable` (503).
- Отказ поставщика модели: `upstream_timeout` (**502**, модель не начала отвечать за 300 с), `upstream_error` (**502**),
  `rate_limit_exceeded` (**429**, лимит у поставщика).

**Долгие ответы.** При `stream: true`, если модель не начала отвечать за **20 с**, поток открывается раньше: приходит
`200` и строки `: ping` каждые **15 с** — до первого кадра и в долгих паузах генерации. Это комментарий SSE: OpenAI и
Anthropic SDK, `EventSource` его пропускают; самописный парсер обязан пропускать строки, начинающиеся с `:`. Отказ после
этого приходит **событием в потоке** с тем же `code` (`data: {"error":{…}}`; на `/v1/responses` — `event: error`, на
`/v1/messages` — `event: error` в конверте Anthropic), без `data: [DONE]` и завершающего события — SDK бросит ошибку, но
сам запрос не повторит. Отказы в первые 20 с — обычными HTTP-кодами, как выше. Без `stream` ответ приходит целиком: на
`api.lumean.net` ответ, который генерируется дольше ~2 минут, обрывает промежуточный прокси — для долгих генераций
используйте `stream: true`.

### 14.5 Подключение клиентов

**curl**

```bash
curl https://api.lumean.app/v1/chat/completions \
  -H "Authorization: Bearer $LUMEAN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"<model-id>","messages":[{"role":"user","content":"hi"}]}'
```

**OpenAI SDK**

```python
from openai import OpenAI
client = OpenAI(base_url="https://api.lumean.app/v1", api_key="LUMEAN_API_KEY")
```

```javascript
import OpenAI from "openai";
const client = new OpenAI({ baseURL: "https://api.lumean.app/v1", apiKey: "LUMEAN_API_KEY" });
```

**Anthropic SDK** (база без `/v1`)

```python
from anthropic import Anthropic
client = Anthropic(base_url="https://api.lumean.app", api_key="LUMEAN_API_KEY")
```

**Claude Code** — переменные окружения (база **без** `/v1`):

```bash
export ANTHROPIC_BASE_URL=https://api.lumean.app
export ANTHROPIC_AUTH_TOKEN=<ключ>
export ANTHROPIC_MODEL=<model-id>
export ANTHROPIC_SMALL_FAST_MODEL=<model-id>
```

**Codex CLI** — `~/.codex/config.toml`:

```toml
model = "<model-id>"
model_provider = "lumean"

[model_providers.lumean]
name = "Lumean"
base_url = "https://api.lumean.app/v1"
env_key = "LUMEAN_API_KEY"
wire_api = "responses"
```

**opencode** — `opencode.json` (`<model-id>` брать из `GET /v1/models`):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "lumean": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Lumean",
      "options": { "baseURL": "https://api.lumean.app/v1", "apiKey": "{env:LUMEAN_API_KEY}" },
      "models": { "<model-id>": { "name": "<имя>" } }
    }
  }
}
```

**Cursor** — Settings → Models → OpenAI API Key; включить Override OpenAI Base URL =
`https://api.lumean.app/v1`; добавить имя модели.

**Continue** — `config.yaml`:

```yaml
models:
  - name: Lumean
    provider: openai
    model: <model-id>
    apiBase: https://api.lumean.app/v1
    apiKey: <ключ>
```

**Cline / Roo** — провайдер «OpenAI Compatible»: Base URL `https://api.lumean.app/v1`, API key, Model ID.

### 14.6 Цены меняются: проверяйте перед запросом

**Цена модели не фиксирована.** Модели мы берём у поставщиков, а их цены меняются в течение дня,
иногда несколько раз. Цена модели в Lumean идёт за ними — вверх и вниз — автоматически, без
предупреждения. Модель также может **временно пропасть**: отвечать **404** `model_not_found` /
`model_disabled` или **429** `provider_keys_cooling`. Поэтому стройте клиент так, чтобы он:

1. **Сверял цену перед дорогой генерацией** с вашим порогом и не отправлял запрос, если цена его
   превышает.
2. **Умел жить без модели**: при 404/429 переходил на запасную модель или откладывал задачу, а не
   повторял запрос в цикле.
3. **Держал месячный лимит ключа** (`ai_monthly_limit_minor`, §14.1): это потолок трат, даже если
   цена выросла между проверкой и запросом.

**Текущие цены по ключу** — `GET https://api.lumean.app/api/public/ai/models` (все модели) и
`GET /api/public/ai/models/{key}` (одна; `key` — то же имя, что в поле `model`). Подходит **любой
активный ключ**, права Public API не нужны; заголовок `X-API-KEY` (как в §3).

```json
{
  "success": true,
  "data": {
    "version": "9f2c…",
    "models": [{
      "key": "gpt-image-2.5", "name": "GPT Image 2.5", "kind": "image",
      "price": {
        "input":  {"per_mtok_minor": 0, "per_mtok_formatted": 0, "per_mtok_display": 0},
        "output": {"per_mtok_minor": 0, "per_mtok_formatted": 0, "per_mtok_display": 0},
        "request": {"per_call_minor": 1887160, "per_call_formatted": 0.0188716, "per_call_display": 0.002254}
      },
      "billing_available": true,
      "context_window": null, "max_output_tokens": null,
      "capabilities": {
        "image_output": true,
        "image_options": {"size": ["auto", "1024x1024", "1536x864", "864x1536", "1536x1024", "1024x1536"]}
      }
    }],
    "asset": {"code": "LUMC", "precision": 8},
    "display_currency": {"code": "USD", "symbol": "$", "precision": 2, "available": true}
  }
}
```

- `price.<класс>.per_mtok_minor` — за **1M токенов**: `input`, `cached_input`, `output`, `reasoning`,
  `cache_write`. `price.request.per_call_minor` — **за вызов** (картинки). Значение в LUMC =
  `minor / 10^asset.precision`; готовое число — `*_formatted`.
- `*_display` — та же ставка в валюте `display_currency`, справочно: валюту задаёт заголовок
  `X-Display-Currency: USD` (иначе валюта аккаунта, иначе по гео). Десятичное число с 6 знаками —
  цена картинки бывает долями цента. `null` и `display_currency.available: false` — курса сейчас
  нет. **Списание всегда в LUMC.**
- `price: null` или `billing_available: false` — модель сейчас платно не вызвать. Модели без живого
  маршрута в выдаче нет вовсе (`/models/{key}` → **404**).
- `capabilities` — возможности модели. У моделей картинок `capabilities.image_options` — допустимые
  `size` / `aspect_ratio`, первый вариант по умолчанию; как ими пользоваться — §14.2, «Размер
  картинки».
- **Кэш и ETag.** Ответ сервера всегда свежий: кэш сбрасывается при любом изменении цены. `version`
  и заголовок `ETag` меняются вместе с ценами. Проверяйте с `If-None-Match: <ETag>` — пока цены
  прежние, ответ **304** без тела, и проверку можно делать перед каждым запросом.
- **Списание — по цене на момент запроса.** Проверка не фиксирует цену: если она изменилась в
  секунды между проверкой и генерацией, спишут по новой. Порог клиента и месячный лимит ключа —
  ваша защита.
- `GET /v1/models` цен **не несёт** — только список и лимиты модели (§14.2).

```python
import requests

BASE = "https://api.lumean.app/api/public/ai/models"
etag, price = None, None

def current_price(model: str, key: str):
    global etag, price
    headers = {"X-API-KEY": key, **({"If-None-Match": etag} if etag else {})}
    r = requests.get(f"{BASE}/{model}", headers=headers, timeout=10)
    if r.status_code == 304:
        return price                       # цена не менялась
    r.raise_for_status()                   # 404 — модели сейчас нет
    etag = r.headers["ETag"]
    m, asset = r.json()["data"]["models"][0], r.json()["data"]["asset"]
    price = m["price"]["request"]["per_call_minor"] / 10 ** asset["precision"]
    return price

if current_price("gpt-image-2.5", KEY) > MAX_LUMC_PER_IMAGE:
    raise RuntimeError("Цена выше моего порога — генерацию не отправляю")
```

### 14.7 Глубина размышлений (effort) и почему длинный диалог дорожает

**Effort** — сколько модель размышляет перед ответом. Своей настройки effort у Lumean нет: поле
задаёт клиент в теле запроса, гейтвей передаёт его поставщику без изменений. Не задано — действует
умолчание модели у её разработчика (у Claude Opus 5.5 это `medium`; выключить размышления у неё
нельзя, effort — единственная ручка).

| Формат | Как задать | Значения |
|---|---|---|
| `POST /v1/messages` | `"output_config": {"effort": "low"}` | `low`, `medium`, `high`, `xhigh`, `max` |
| `POST /v1/responses` | `"reasoning": {"effort": "low"}` | по документации модели |
| `POST /v1/chat/completions` | `"reasoning_effort": "low"` | по документации модели |

- В `/v1/messages` и `/v1/responses` тело идёт поставщику сквозной передачей — поле доезжает как есть.
  В `/v1/chat/completions` `reasoning_effort` проходит без изменений, когда модель обслуживается
  OpenAI-совместимым маршрутом; если запрос приходится переводить в другой диалект, поле может быть
  отброшено. Для моделей Claude надёжнее `/v1/messages`.
- Соблюдает ли поле конкретный поставщик модели, гейтвей не гарантирует: мы его передаём, а не
  исполняем. Проверка — сравнить `usage` (выходные токены) одного и того же запроса при `low` и `high`.
- **Размышления оплачиваются как выходные токены** — по ставке `reasoning`, а если у модели её нет —
  по ставке `output` (§14.6). Выход — самый дорогой класс, поэтому effort заметно влияет на цену.
  У моделей Claude размышления входят в выходные токены `usage` и отдельно не показываются.
- **Что ставить:** `low` — переписка, короткие ответы, простые правки, вспомогательные вызовы агента;
  `medium`/`high` — код и многошаговые задачи; `xhigh`/`max` — только когда качество важнее цены.
- **Не меняйте effort посреди диалога:** смена параметра запроса сбрасывает кэш переписки у
  поставщика, и следующий запрос перечитает её по полной ставке входа.

**Почему каждое следующее сообщение дороже.** Модель не помнит прошлые запросы: клиент каждый раз
отправляет всю переписку заново — системный промпт, описания инструментов агента, все прошлые
сообщения, ответы и скриншоты. Поэтому «привет» в новом диалоге стоит копейки, а тот же «привет» в
длинном — как вся история до него. Удешевляет это кэш: уже прочитанная часть переписки (`cached_input`
в ценах §14.6) стоит в разы дешевле обычного входа, но живёт недолго: у моделей Claude — **5 минут**
(`ttl` у `cache_control` снимается, §14.3), у остальных — сколько держит поставщик. После паузы
длиннее кэш остывает, и переписка снова читается по полной ставке (`cache_write`, а без отдельной
ставки — `input`).

Как тратить меньше:

1. **Новая задача — новый диалог.** Старая история перестаёт ездить с каждым запросом.
2. **Не оставляйте в диалоге лишнее** — большие файлы, скриншоты и логи пересылаются в каждом
   следующем запросе.
3. **Проверяйте расход по полям `usage`**: агент на один ответ пользователю часто делает несколько
   запросов к модели, и счётчик в клиенте показывает их сумму за ход или за сессию.
4. **Простые задачи — модели попроще и `low` effort.**
