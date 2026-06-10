"""Конфигурация бота: читается из переменных окружения (.env).

Тарифы заданы здесь же словарём TARIFFS — чтобы добавить новый тариф,
достаточно дописать ещё один пункт. Кнопки в боте строятся автоматически.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field

from dotenv import load_dotenv

load_dotenv()


def _get(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


@dataclass
class Tariff:
    id: str
    button: str          # текст кнопки в приветствии
    title: str           # «Тариф: ...»
    price: float
    currency: str
    duration: str        # «Срок действия: ...»
    description: str
    channel_link: str    # запасная ссылка (если бот не админ канала) — СБП/карта
    stars_link: str      # запасная ссылка для звёзд
    stars_price: int = 0       # цена в звёздах (⭐). 0 = оплата звёздами выключена
    channel_id: int = 0        # numeric id канала (СБП/карта) для одноразовых ссылок
    stars_channel_id: int = 0  # numeric id канала для звёзд


@dataclass
class Config:
    bot_token: str
    admin_chat_id: int

    platega_merchant_id: str
    platega_secret: str
    platega_base_url: str
    platega_sbp_method: int

    public_base_url: str
    return_url: str
    failed_url: str
    port: int

    reviews_link: str
    admin_link: str
    card_details: str
    db_path: str
    support_username: str
    privacy_url: str
    terms_url: str
    buy_stars_link: str
    test_user_id: int = 0       # для этого id особая цена в звёздах (тест)
    test_stars_price: int = 1   # тестовая цена в звёздах

    tariffs: dict[str, Tariff] = field(default_factory=dict)
    # Включённые способы оплаты (меняются админом на лету).
    methods_enabled: dict = field(
        default_factory=lambda: {"card": True, "sbp": True, "stars": True})

    @property
    def callback_path(self) -> str:
        return "/platega/callback"

    @property
    def callback_url(self) -> str:
        if not self.public_base_url:
            return ""
        return self.public_base_url.rstrip("/") + self.callback_path


def load_config() -> Config:
    channel_link = _get("CHANNEL_LINK")
    stars_link = _get("STARS_LINK")

    # Тариф из ТЗ. Чтобы добавить ещё — скопируй блок с новым id.
    vip_oge = Tariff(
        id="vip_oge_2026",
        button="VIP ОГЭ 2026",
        title="🔹VIP ОГЭ/ГВЭ 2026 (все предметы)🔹",
        price=990.0,
        currency="RUB",
        duration="навсегда",
        description=(
            "Это первоисточник наших авторских ответов на различные школьные "
            "работы, вступив в него, вы будете первыми получать задания, "
            "ответы и подробное решение на все официальные экзамены.\n\n"
            "❓ЧТО ВХОДИТ В VIP ОГЭ 2026:👇\n\n"
            "✨Полные ответы ОГЭ/ГВЭ 2026 по ВСЕМ предметам\n"
            "✨Сборники ОГЭ + подробная инструкция\n"
            "💫Решение второй части (по-возможности)\n"
            "✨Распределение вариантов по регионам\n"
            "💫Точные ответы на 4-5 по всем предметам\n"
            "🌟Ориентиры по регионам на реальные варианты\n\n"
            "📌 Наши преимущества:\n\n"
            "Доступ включает в себя — все для сдачи ОГЭ/ГВЭ 2026\n\n"
            "VIP уже помог сотням учеников сдать экзамены спокойно и без "
            "паники🤍\n\n"
            "Не жди повышения цен — потом будет дороже ❌"
        ),
        channel_link=channel_link,
        stars_link=stars_link,
        stars_price=619,
        channel_id=int(_get("CHANNEL_ID", "0") or "0"),
        stars_channel_id=int(_get("STARS_CHANNEL_ID", "0") or "0"),
    )

    peresdacha = Tariff(
        id="peresdacha_vip_oge",
        button="ПЕРЕСДАЧА VIP ОГЭ",
        title="📖 ОГЭ ПЕРЕСДАЧА",
        price=890.0,
        currency="RUB",
        duration="навсегда",
        description=(
            "🔥 Что входит в VIP | ОГЭ ПЕРЕСДАЧА 2026:\n\n"
            "- Сборник ОГЭ по Всем предметам (с инструкцией)\n"
            "- Решение второй части (по возможности)\n"
            "- Точные ответы на оценку 4-5 по всем предметам\n"
            "- Публикации ответов за 4-12 часов до проведения экзамена\n"
            "- Ответы на 77/78 регион включительно\n\n"
            "‼️ Доступ включает в себя ответы на всю РФ без распределения "
            "по регионам.\n\n"
            "Выберите вариант:"
        ),
        channel_link=_get("PERESDACHA_CHANNEL_LINK") or channel_link,
        stars_link=_get("PERESDACHA_CHANNEL_LINK") or stars_link,
        stars_price=555,
        channel_id=int(_get("PERESDACHA_CHANNEL_ID", "0") or "0")
        or int(_get("CHANNEL_ID", "0") or "0"),
        stars_channel_id=int(_get("PERESDACHA_CHANNEL_ID", "0") or "0")
        or int(_get("STARS_CHANNEL_ID", "0") or "0"),
    )

    tariffs = {vip_oge.id: vip_oge, peresdacha.id: peresdacha}

    admin_chat_id = int(_get("ADMIN_CHAT_ID", "0") or "0")

    return Config(
        bot_token=_get("BOT_TOKEN"),
        admin_chat_id=admin_chat_id,
        platega_merchant_id=_get("PLATEGA_MERCHANT_ID"),
        platega_secret=_get("PLATEGA_SECRET"),
        platega_base_url=_get("PLATEGA_BASE_URL", "https://app.platega.io"),
        platega_sbp_method=int(_get("PLATEGA_SBP_METHOD", "2") or "2"),
        public_base_url=_get("PUBLIC_BASE_URL"),
        return_url=_get("RETURN_URL", "https://t.me"),
        failed_url=_get("FAILED_URL", "https://t.me"),
        port=int(_get("PORT", "8080") or "8080"),
        reviews_link=_get("REVIEWS_LINK"),
        admin_link=_get("ADMIN_LINK"),
        card_details=_get("CARD_DETAILS").replace("\\n", "\n"),
        db_path=_get("DB_PATH", "bot.db"),
        support_username=_get("SUPPORT_USERNAME", "@shewmilka"),
        privacy_url=_get(
            "PRIVACY_URL",
            "https://telegra.ph/Politika-konfidencialnosti-04-01-26"),
        terms_url=_get(
            "TERMS_URL",
            "https://telegra.ph/Polzovatelskoe-soglashenie-04-01-19"),
        buy_stars_link=_get("BUY_STARS_LINK",
                            "https://buyns.t.me/?start=ref-9ahrunie2par"),
        test_user_id=int(_get("TEST_USER_ID", "0") or "0"),
        test_stars_price=int(_get("TEST_STARS_PRICE", "1") or "1"),
        tariffs=tariffs,
    )
