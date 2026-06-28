"""Хранилище подписчиков (SQLite через aiosqlite).

Таблица subscribers:
    chat_id   — id чата пользователя (PRIMARY KEY)
    active    — 1 если подписан на ежедневную рассылку, иначе 0
    position  — индекс следующего материала в общей ленте (для ротации)
    created_at — когда впервые нажал /start
"""
from __future__ import annotations

import aiosqlite


class Database:
    def __init__(self, path: str) -> None:
        self._path = path

    async def init(self) -> None:
        async with aiosqlite.connect(self._path) as db:
            await db.execute(
                """
                CREATE TABLE IF NOT EXISTS subscribers (
                    chat_id    INTEGER PRIMARY KEY,
                    active     INTEGER NOT NULL DEFAULT 0,
                    position   INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL DEFAULT (datetime('now'))
                )
                """
            )
            # Карта «id сообщения в чате админа -> id пользователя» для relay:
            # админ отвечает reply на пересланное сообщение, бот доставляет
            # ответ нужному покупателю.
            await db.execute(
                """
                CREATE TABLE IF NOT EXISTS relay (
                    admin_msg_id INTEGER PRIMARY KEY,
                    user_id      INTEGER NOT NULL
                )
                """
            )
            # Настройки, меняемые из админ-панели (карта, цены, статус продаж).
            await db.execute(
                """
                CREATE TABLE IF NOT EXISTS settings (
                    key   TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                )
                """
            )
            await db.commit()

    async def get_all_settings(self) -> dict[str, str]:
        async with aiosqlite.connect(self._path) as db:
            async with db.execute("SELECT key, value FROM settings") as cur:
                return {row[0]: row[1] for row in await cur.fetchall()}

    async def set_setting(self, key: str, value: str) -> None:
        async with aiosqlite.connect(self._path) as db:
            await db.execute(
                "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
                (key, value),
            )
            await db.commit()

    async def save_relay(self, admin_msg_id: int, user_id: int) -> None:
        async with aiosqlite.connect(self._path) as db:
            await db.execute(
                "INSERT OR REPLACE INTO relay (admin_msg_id, user_id) VALUES (?, ?)",
                (admin_msg_id, user_id),
            )
            await db.commit()

    async def get_relay_user(self, admin_msg_id: int) -> int | None:
        async with aiosqlite.connect(self._path) as db:
            async with db.execute(
                "SELECT user_id FROM relay WHERE admin_msg_id = ?", (admin_msg_id,)
            ) as cur:
                row = await cur.fetchone()
                return int(row[0]) if row else None

    async def ensure_user(self, chat_id: int) -> None:
        """Регистрирует пользователя при /start (без подписки)."""
        async with aiosqlite.connect(self._path) as db:
            await db.execute(
                "INSERT OR IGNORE INTO subscribers (chat_id, active) VALUES (?, 0)",
                (chat_id,),
            )
            await db.commit()

    async def is_subscribed(self, chat_id: int) -> bool:
        async with aiosqlite.connect(self._path) as db:
            async with db.execute(
                "SELECT active FROM subscribers WHERE chat_id = ?", (chat_id,)
            ) as cur:
                row = await cur.fetchone()
                return bool(row and row[0])

    async def set_subscribed(self, chat_id: int, active: bool) -> None:
        async with aiosqlite.connect(self._path) as db:
            await db.execute(
                """
                INSERT INTO subscribers (chat_id, active) VALUES (?, ?)
                ON CONFLICT(chat_id) DO UPDATE SET active = excluded.active
                """,
                (chat_id, 1 if active else 0),
            )
            await db.commit()

    async def active_subscribers(self) -> list[tuple[int, int]]:
        """Возвращает список (chat_id, position) активных подписчиков."""
        async with aiosqlite.connect(self._path) as db:
            async with db.execute(
                "SELECT chat_id, position FROM subscribers WHERE active = 1"
            ) as cur:
                return [(row[0], row[1]) for row in await cur.fetchall()]

    async def get_position(self, chat_id: int) -> int:
        async with aiosqlite.connect(self._path) as db:
            async with db.execute(
                "SELECT position FROM subscribers WHERE chat_id = ?", (chat_id,)
            ) as cur:
                row = await cur.fetchone()
                return int(row[0]) if row else 0

    async def advance_position(self, chat_id: int) -> None:
        async with aiosqlite.connect(self._path) as db:
            await db.execute(
                """
                INSERT INTO subscribers (chat_id, position) VALUES (?, 1)
                ON CONFLICT(chat_id) DO UPDATE SET position = position + 1
                """,
                (chat_id,),
            )
            await db.commit()

    async def deactivate(self, chat_id: int) -> None:
        """Снимает подписку — например, если пользователь заблокировал бота."""
        await self.set_subscribed(chat_id, False)
