"""Тексты сообщений бота."""
from __future__ import annotations

import html

from .config import Config, Tariff

TARIFF_PROMPT = "⬇️ ЖМИ НА НУЖНЫЙ ТАРИФ ⬇️"


def welcome(config: Config) -> str:
    """Приветствие. «Наши отзывы» и «Администрация» — кликабельные ссылки
    прямо в тексте (а не кнопки), если ссылки заданы."""
    reviews = config.reviews_link
    admin = config.admin_link
    otzyvy = (f'<a href="{reviews}">📚 НАШИ ОТЗЫВЫ</a>'
              if reviews else "📚 НАШИ ОТЗЫВЫ")
    admin_line = (f'<a href="{admin}">👥 Администрация</a>'
                  if admin else "👥 Администрация")
    return (
        "🔥 Приветствуем! В этом боте ты можешь легко выбрать подходящий тариф — "
        "без лишних разговоров с администратором\n\n"
        "— ЧТО МОЖНО ЗАКАЗАТЬ ЗДЕСЬ\n\n"
        "• Полные ответы;\n"
        "• Подробные решения;\n"
        "• Официальные критерии;\n"
        "• Полезные материалы и шпоры;\n\n"
        "И главное — всё сдашь на отлично! 🏆\n\n"
        f"{otzyvy}\n\n"
        f"{admin_line}"
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
        f"Цена: {t.price} 🇷🇺{t.currency}\n"
        f"Срок действия: {t.duration}\n\n"
        f"Описание: {desc}"
    )


def choose_method(t: Tariff) -> str:
    return (
        f"Тариф: {t.title}\n"
        f"К оплате: {t.price} {t.currency}\n\n"
        "Выбери удобный способ оплаты ⬇️"
    )


def sbp_message(t: Tariff) -> str:
    return (
        "📲 Оплата по СБП\n\n"
        f"Тариф: {t.title}\n"
        f"Сумма: {t.price} {t.currency}\n\n"
        "Нажми кнопку «Оплатить» ниже, оплати по QR/СБП, и бот "
        "автоматически проверит платёж.\n"
        "После подтверждения ты сразу получишь ссылку на канал. ✅"
    )


def card_message(t: Tariff, card_details: str) -> str:
    details = card_details or "Реквизиты уточняй у администратора."
    return (
        "💳 Оплата по карте РФ\n\n"
        f"Тариф: {t.title}\n"
        f"Сумма: {t.price} {t.currency}\n\n"
        "Реквизиты для перевода:\n"
        f"{details}\n\n"
        "После оплаты нажми кнопку «✅ Оплатить и отправить чек» и пришли "
        "сюда фото/скриншот чека.\n"
        "Администратор проверит платёж вручную и пришлёт тебе ссылку на "
        "канал прямо в этот чат."
    )


def sbp_in_development() -> str:
    return (
        "🛠 Оплата по СБП временно в разработке.\n\n"
        "Подключаем платёжную систему — скоро заработает автоматически.\n"
        "Пока выбери другой способ оплаты: 💳 Карта РФ или ⭐ Telegram Stars."
    )


def stars_message(t: Tariff) -> str:
    return (
        "⭐ Оплата Telegram Stars\n\n"
        f"Тариф: {t.title}\n\n"
        "Перейди по кнопке ниже, чтобы оформить доступ через Telegram Stars."
    )


def stars_unavailable() -> str:
    return (
        "⭐ Оплата звёздами скоро будет доступна.\n"
        "Пока выбери другой способ оплаты."
    )


def stars_delivered(link: str) -> str:
    link = link or "ссылку пришлёт администратор"
    return (
        "✅ Оплата звёздами получена! Спасибо 🎉\n\n"
        f"Твоя ссылка на канал:\n{link}"
    )


def receipt_prompt() -> str:
    return (
        "🧾 Жду твой чек.\n\n"
        "Пришли фото или скриншот чека одним сообщением. "
        "Как только администратор проверит оплату — ты получишь ссылку "
        "на канал прямо здесь."
    )


def purchase_delivered(t: Tariff, link: str = "") -> str:
    link = link or t.channel_link or "ссылку пришлёт администратор"
    return (
        "✅ Оплата подтверждена! Спасибо за покупку 🎉\n\n"
        f"Тариф: {t.title}\n\n"
        f"Твоя персональная ссылка на канал (одноразовая):\n{link}"
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
