"""Тексты сообщений бота."""
from __future__ import annotations

import html

from .config import Config, Tariff

TARIFF_PROMPT = "👇 ВЫБЕРИ ТАРИФ 👇"

WELCOME_MAP = (
    "Привет! Здесь мы выдаём приглашение на карту, где можно получать "
    "робуксы за её прохождение.\n\n"
    "Жми кнопку ниже 👇"
)

WELCOME_ROBLOX = (
    "🎮 <b>Привет!</b>\n\n"
    "Здесь можно узнать, <b>сколько существует любой аккаунт Roblox</b>: "
    "дату регистрации, возраст аккаунта, ID и подписчиков.\n\n"
    "Просто пришли ник — или нажми кнопку ниже 👇"
)

# Приписка под выдаваемой ссылкой.
LINK_NOTE = ("ссылка одноразовая, поэтому сразу закрепите канал, "
             "чтобы не потерять 🫶🏻")


def welcome(config: Config) -> str:
    """Приветствие. «Наши отзывы» и «Менеджер» — кликабельные ссылки
    прямо в тексте (а не кнопки), если ссылки заданы."""
    reviews = config.reviews_link
    admin = config.admin_link
    otzyvy = (f'<a href="{reviews}">📚 Наши отзывы</a>'
              if reviews else "📚 Наши отзывы")
    manager = (f'<a href="{admin}">👥 Менеджер</a>'
               if admin else "👥 Менеджер")
    return (
        "Приветствуем! В этом боте ты можешь легко приобрести VIP-канал — "
        "без лишних разговоров с администратором 😎\n\n"
        "И главное — всё сдашь на отлично! 🏆\n\n"
        f"{otzyvy}\n\n"
        f"{manager}"
    )


def tariff_card(t: Tariff, reviews_link: str = "") -> str:
    desc = t.description
    if reviews_link:
        desc = desc.replace(
            "Реальные отзывы о работе канала",
            f'<a href="{reviews_link}">Реальные отзывы о работе канала</a>',
        )
    return (
        f"Тариф: {t.title}\n"
        f"Цена: {t.price:g} 🇷🇺{t.currency}\n\n"
        f"Описание: {desc}"
    )


def choose_method(t: Tariff) -> str:
    return (
        f"Тариф: {t.title}\n"
        f"К оплате: {t.price:g} {t.currency}\n\n"
        "Выбери удобный способ оплаты ⬇️"
    )


def sbp_message(t: Tariff) -> str:
    return (
        "📲 Оплата по СБП\n\n"
        f"Тариф: {t.title}\n"
        f"Сумма: {t.price:g} {t.currency}\n\n"
        "Нажми кнопку «Оплатить» ниже, оплати по QR/СБП, и бот "
        "автоматически проверит платёж.\n"
        "После подтверждения ты сразу получишь ссылку на канал. ✅"
    )


def card_message(t: Tariff, card_details: str) -> str:
    details = card_details or "Реквизиты уточняй у администратора."
    return (
        "💳 Оплата по карте РФ\n\n"
        f"Тариф: {t.title}\n"
        f"Сумма: {t.price:g} {t.currency}\n\n"
        "Реквизиты для перевода:\n"
        f"{details}\n\n"
        "После оплаты нажми кнопку «✅ Оплатить и отправить чек» и пришли "
        "сюда фото/скриншот чека.\n"
        "Администратор проверит платёж вручную и пришлёт тебе ссылку на "
        "канал прямо в этот чат в течение 5 минут."
    )


def sbp_in_development() -> str:
    return (
        "🛠 Оплата по СБП временно в разработке.\n\n"
        "Подключаем платёжную систему — скоро заработает автоматически.\n"
        "Пока выбери другой способ оплаты: 💳 Карта РФ или ⭐ Telegram Stars."
    )


def stars_offer(t: Tariff, buy_stars_link: str) -> str:
    text = (
        "⭐ Оплата Telegram Stars\n\n"
        f"Тариф: {t.title}\n\n"
        "После оплаты вы автоматически попадаете в канал.\n\n"
    )
    if buy_stars_link:
        text += (f'Купить выгодно звёзды вы можете '
                 f'<a href="{buy_stars_link}">здесь</a>\n'
                 f'(1000⭐️ = 1454₽)')
    return text


def stars_unavailable() -> str:
    return (
        "⭐ Оплата звёздами скоро будет доступна.\n"
        "Пока выбери другой способ оплаты."
    )


def stars_delivered(link: str) -> str:
    link = link or "ссылку пришлёт администратор"
    return (
        "✅ Оплата звёздами получена! Спасибо 🎉\n\n"
        f"Твоя ссылка на канал:\n{link}\n\n"
        f"{LINK_NOTE}"
    )


def receipt_prompt() -> str:
    return (
        "🧾 Жду твой чек.\n\n"
        "Пришли фото или скриншот чека одним сообщением. "
        "Как только администратор проверит оплату — ты получишь ссылку "
        "на канал прямо здесь."
    )


def receipt_prompt_offline() -> str:
    return (
        "🧾 Если ты уже оплатил(а) — пришли фото/скриншот чека сюда, "
        "он обязательно сохранится.\n\n"
        "⚠️ Сейчас администратор не в сети, поэтому проверка может занять "
        "чуть больше времени. Как только он вернётся — подтвердит оплату и "
        "пришлёт ссылку на канал прямо в этот чат. Не переживай 🙏"
    )


def purchase_delivered(t: Tariff, link: str = "") -> str:
    link = link or t.channel_link or "ссылку пришлёт администратор"
    return (
        "✅ Оплата подтверждена! Спасибо за покупку 🎉\n\n"
        f"Тариф: {t.title}\n\n"
        f"Твоя персональная ссылка на канал (одноразовая):\n{link}\n\n"
        f"{LINK_NOTE}"
    )


def payment_canceled() -> str:
    return (
        "❌ Платёж отменён или не прошёл.\n"
        "Попробуй ещё раз или выбери другой способ оплаты."
    )


def contacts(support_username: str) -> str:
    return (
        f"👤 Поддержка {support_username}\n\n"
        "Совершая оплату, вы соглашаетесь с политикой конфиденциальности "
        "и пользовательским соглашением."
    )


def profile(user, purchases: int) -> str:
    username = f"@{user.username}" if user.username else "—"
    name = html.escape(user.full_name or "—")
    return (
        "👤 Твой профиль\n\n"
        f"Имя: {name}\n"
        f"Username: {username}\n"
        f"ID: <code>{user.id}</code>\n"
        f"Покупок: {purchases}"
    )
