"""Тексты бота в одном месте — чтобы менять формулировки без правки логики."""
from __future__ import annotations


def greeting(brand: str) -> str:
    return (
        f"👋 <b>{brand}</b> — платформа заданий.\n\n"
        "Здесь публикуются задания от компаний, которым нужна обратная связь "
        "по товарам, услугам и клиентскому опыту.\n\n"
        "• Выполняете задание в приложении\n"
        "• Получаете рубли на баланс\n"
        "• Выводите на СБП или карту\n\n"
        "Нажмите кнопку ниже, чтобы открыть приложение 👇"
    )


OPEN_HINT = "Нажми кнопку ниже, чтобы открыть приложение 👇"


def gate_required(brand: str) -> str:
    return (
        f"🔒 <b>Доступ к {brand}</b>\n\n"
        "Платформа работает при поддержке партнёров. Подпишитесь на каналы "
        "ниже — это займёт 10 секунд — и нажмите «Проверить подписку».\n\n"
        "После проверки откроется приложение с заданиями."
    )


GATE_NOT_PASSED = (
    "❌ Подписка найдена не на все каналы.\n"
    "Проверьте список ещё раз и нажмите кнопку повторно."
)

GATE_PASSED = "✅ Подписка подтверждена! Приложение открыто — нажмите кнопку ниже."

APP_NOT_READY = (
    "🛠 Приложение сейчас настраивается — загляните чуть позже.\n"
    "Как только всё будет готово, здесь появится кнопка запуска."
)

NO_WEBAPP_URL = (
    "⚠️ Не задан PUBLIC_BASE_URL — мини-апп не может открыться.\n"
    "Укажите публичный HTTPS-адрес сервера в .env и перезапустите бота."
)

ADMIN_PANEL = "🛠 <b>Админ-панель</b>\n\nВыберите раздел:"

ADMIN_ONLY = "Команда доступна только администратору."


def _share(value: int, base: int) -> str:
    """Доля от первого шага воронки — чтобы видеть, где отваливаются."""
    return f" ({round(value / base * 100)}%)" if base else ""


def funnel_block(data: dict) -> str:
    base = data["opened"]
    lines = [
        f"📱 Открыли приложение: <b>{data['opened']}</b>",
        f"✅ Из них выполняли задания: <b>{data['tasks']}</b>"
        + _share(data["tasks"], base),
        f"💸 Из них нажимали «Вывести»: <b>{data['payout']}</b>"
        + _share(data["payout"], base),
        f"🔒 Из них подписаны и ждут вывод: <b>{data['waiting']}</b>"
        + _share(data["waiting"], base),
    ]
    if data.get("waiting_off"):
        lines.append(f"🚪 Ждут вывод, но отписались: "
                     f"<b>{data['waiting_off']}</b>")
    return "\n".join(lines)


def subs_block(data: dict, channel: str = "", ready: bool = True) -> str:
    """Проверочный канал: подписки и отписки, сверенные с Telegram."""
    name = channel or "Проверочный канал"
    if not ready:
        return (f"📡 <b>{name}</b>\n"
                "Канал не задан — подписку проверить нечем, "
                "пришлите пост из канала, чтобы бот его запомнил.")
    return "\n".join([
        f"📡 <b>{name}</b>",
        f"➕ Подписались: <b>{data['ever']}</b>",
        f"✅ Сейчас подписаны: <b>{data['now']}</b>",
        f"🚪 Отписались: <b>{data['left']}</b>",
        f"🚫 Выводов отменено из-за отписки: <b>{data['canceled']}</b>"
        + (f" на {data['canceled_sum']:g} ₽" if data["canceled"] else ""),
    ])


def withdraw_canceled(rows: list[dict]) -> str:
    """Сообщение участнику: ушёл из канала — заявка отменена.

    Это же сообщение бот удалит, если человек подпишется обратно,
    поэтому оно самодостаточное: без него в чате не останется следов.
    """
    total = sum(row["amount"] for row in rows)
    if len(rows) == 1:
        what = (f"заявка <b>{rows[0]['code'] or '#' + str(rows[0]['id'])}</b> "
                f"на <b>{rows[0]['amount']:g} ₽</b> отменена")
    else:
        codes = ", ".join(row["code"] or f"#{row['id']}" for row in rows)
        what = f"заявки {codes} на <b>{total:g} ₽</b> отменены"
    return (
        "🚫 <b>Вывод отменён</b>\n\n"
        f"Вы отписались от каналов спонсоров, поэтому {what}.\n\n"
        f"<b>{total:g} ₽</b> вернулись на баланс. Подпишитесь обратно "
        "и оформите вывод заново — тогда заявка уйдёт в обработку."
    )


SUBS_NOTE = (
    "<i>Подписка сверяется с Telegram, а не по клику по ссылке. "
    "Отписку видно, когда человек снова заходит в приложение; "
    "у тех, чья заявка ждёт выплаты, она перепроверяется прямо сейчас — "
    "и такая заявка тут же отменяется, а деньги возвращаются на баланс.</i>"
)


def admin_stats(data: dict, since: str = "", new_users: int = 0,
                period_subs: int = 0, funnel_period: dict | None = None,
                funnel_all: dict | None = None,
                subs_period: dict | None = None,
                subs_all: dict | None = None,
                channel: str = "", check_ready: bool = True) -> str:
    parts = ["📊 <b>Статистика</b>", ""]

    if funnel_period is not None:
        parts += [
            "<b>С момента смены ссылок</b> "
            f"({since[:16] if since else 'ссылки ещё не менялись'})",
            funnel_block(funnel_period),
        ]
        if subs_period is not None:
            parts += ["", subs_block(subs_period, channel, check_ready)]
        parts += [
            "",
            f"🆕 Новых участников: <b>{new_users}</b>",
            f"📝 Выполнено заданий: <b>{period_subs}</b>",
            "",
        ]

    if funnel_all is not None:
        parts += ["<b>За всё время</b>", funnel_block(funnel_all)]
        if subs_all is not None:
            parts += ["", subs_block(subs_all, channel, check_ready)]
        parts += ["", SUBS_NOTE, ""]

    parts += [
        "<b>Итого</b>",
        f"👥 Участников: <b>{data['users']}</b>",
        f"📝 Выполнено заданий: <b>{data['submissions']}</b> "
        f"(сегодня: {data['today']})",
        f"💰 На балансах: <b>{data['balance']:g} ₽</b>",
        f"💸 Выплачено: <b>{data['paid']:g} ₽</b>",
        "",
        f"⏳ Заявок на вывод: {data['pending_wd']}",
        f"🧾 Ждут модерации: {data['pending_sub']}",
    ]
    return "\n".join(parts)


TASK_PICK_KIND = (
    "Какое задание добавляем?\n\n"
    "📝 <b>Отзыв</b> — человек пишет текст и ставит оценку.\n"
    "🎬 <b>Ролик</b> — смотрит видео прямо в приложении."
)

VIDEO_ADD_TITLE = (
    "Добавление ролика.\n\n"
    "Шаг 1/4 — пришлите <b>эмодзи и название</b> одной строкой.\n"
    "Пример: <code>🎬 Посмотреть ролик</code>"
)
VIDEO_ADD_URL = (
    "Шаг 2/4 — <b>ссылка на ролик</b> (YouTube, в том числе Shorts).\n"
    "Пример: <code>https://youtube.com/shorts/y02mOQudT3E</code>"
)
VIDEO_ADD_REWARD = "Шаг 3/4 — <b>награда в рублях</b>. Пример: <code>50</code>"
VIDEO_ADD_WATCH = (
    "Шаг 4/4 — <b>сколько секунд</b> нужно смотреть, чтобы задание "
    "засчиталось. Пример: <code>15</code>"
)

TASK_ADD_TITLE = (
    "Добавление задания.\n\n"
    "Шаг 1/6 — пришлите <b>эмодзи и название</b> одной строкой.\n"
    "Пример: <code>✂️ Отзыв о барбершопе</code>"
)
TASK_ADD_SHORT = (
    "Шаг 2/6 — <b>короткое описание</b> (видно в раскрытой карточке).\n"
    "Пример: <code>Положительный отзыв о качестве стрижки.</code>"
)
TASK_ADD_BRIEF = (
    "Шаг 3/6 — <b>условия задания</b> (текст на экране выполнения).\n"
    "Пример: <code>Напишите отзыв минимум на 35 символов: оцените "
    "качество стрижки, сервис и результат.</code>"
)
TASK_ADD_REWARD = "Шаг 4/6 — <b>награда в рублях</b>. Пример: <code>350</code>"
TASK_ADD_MIN = (
    "Шаг 5/6 — <b>минимальная длина текста</b> в символах. "
    "Пример: <code>35</code>"
)
TASK_ADD_TEMPLATES = (
    "Шаг 6/6 — <b>шаблоны ответов</b>, каждый с новой строки "
    "(или <code>-</code>, если без шаблонов)."
)

SCOPE_TITLES = {"entry": "вход в приложение", "payout": "вывод средств",
                "both": "вход и вывод"}


def sponsor_add(scope: str) -> str:
    return (
        f"Добавление спонсора (<b>{SCOPE_TITLES.get(scope, scope)}</b>).\n\n"
        "Пришлите одной строкой через <code>|</code>:\n"
        "<code>@channel | Название | https://t.me/channel | подзаголовок</code>\n\n"
        "Хватит и <code>@channel | Название</code> — ссылку соберём сами.\n"
        "Бот должен быть администратором канала, иначе проверка подписки "
        "не сработает."
    )


BULK_PICK_SCOPE = (
    "Куда добавить каналы списком?\n\n"
    "🚪 <b>Вход</b> — проверка при запуске приложения.\n"
    "💸 <b>Вывод</b> — проверка перед созданием заявки на вывод."
)


def bulk_add(scope: str) -> str:
    return (
        f"Загрузка каналов списком (<b>{SCOPE_TITLES.get(scope, scope)}</b>).\n\n"
        "Пришлите одним сообщением, каждый канал с новой строки:\n"
        "<code>@channel | Название | https://t.me/channel | подзаголовок</code>\n\n"
        "Минимум — <code>@channel | Название</code>.\n"
        "Первой строкой можно прислать <code>replace</code> — тогда прежние "
        "каналы этого раздела будут удалены."
    )


SPONSOR_SCOPE_HINT = (
    "🚪 — проверка на входе в приложение\n"
    "💸 — проверка перед выводом средств"
)

CANCELLED = "Отменено."
