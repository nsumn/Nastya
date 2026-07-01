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
            # Файлы сборников для отправки (хранится file_id из Telegram).
            await db.execute(
                """
                CREATE TABLE IF NOT EXISTS sale_materials (
                    id         INTEGER PRIMARY KEY AUTOINCREMENT,
                    title      TEXT NOT NULL,
                    file_id    TEXT NOT NULL,
                    file_type  TEXT NOT NULL DEFAULT 'document',
                    created_at TEXT NOT NULL DEFAULT (datetime('now'))
                )
                """
            )
            # Журнал продаж (из бота и добавленные вручную).
            await db.execute(
                """
                CREATE TABLE IF NOT EXISTS sales (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    buyer           TEXT NOT NULL DEFAULT '',
                    buyer_id        INTEGER,
                    subject         TEXT NOT NULL DEFAULT '',
                    receipt_file_id TEXT,
                    receipt_type    TEXT,
                    source          TEXT NOT NULL DEFAULT 'bot',
                    delivered       INTEGER NOT NULL DEFAULT 0,
                    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
                )
                """
            )
            await db.commit()

    # ---------------------- Материалы для отправки ------------------------- #
    async def add_material(self, title: str, file_id: str, file_type: str) -> None:
        async with aiosqlite.connect(self._path) as db:
            await db.execute(
                "INSERT INTO sale_materials (title, file_id, file_type) VALUES (?, ?, ?)",
                (title, file_id, file_type),
            )
            await db.commit()

    async def list_materials(self) -> list[dict]:
        async with aiosqlite.connect(self._path) as db:
            async with db.execute(
                "SELECT id, title, file_id, file_type FROM sale_materials ORDER BY id"
            ) as cur:
                return [
                    {"id": r[0], "title": r[1], "file_id": r[2], "file_type": r[3]}
                    for r in await cur.fetchall()
                ]

    async def get_material(self, material_id: int) -> dict | None:
        async with aiosqlite.connect(self._path) as db:
            async with db.execute(
                "SELECT id, title, file_id, file_type FROM sale_materials WHERE id = ?",
                (material_id,),
            ) as cur:
                r = await cur.fetchone()
                return {"id": r[0], "title": r[1], "file_id": r[2], "file_type": r[3]} if r else None

    async def delete_material(self, material_id: int) -> None:
        async with aiosqlite.connect(self._path) as db:
            await db.execute("DELETE FROM sale_materials WHERE id = ?", (material_id,))
            await db.commit()

    # ---------------------------- Продажи ---------------------------------- #
    async def add_sale(
        self,
        buyer: str,
        subject: str,
        *,
        buyer_id: int | None = None,
        receipt_file_id: str | None = None,
        receipt_type: str | None = None,
        source: str = "bot",
    ) -> None:
        async with aiosqlite.connect(self._path) as db:
            await db.execute(
                """
                INSERT INTO sales
                    (buyer, buyer_id, subject, receipt_file_id, receipt_type, source)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (buyer, buyer_id, subject, receipt_file_id, receipt_type, source),
            )
            await db.commit()

    def _sale_row(self, r) -> dict:
        return {
            "id": r[0], "buyer": r[1], "buyer_id": r[2], "subject": r[3],
            "receipt_file_id": r[4], "receipt_type": r[5], "source": r[6],
            "delivered": r[7], "created_at": r[8],
        }

    async def list_sales(self, limit: int = 30) -> list[dict]:
        async with aiosqlite.connect(self._path) as db:
            async with db.execute(
                """
                SELECT id, buyer, buyer_id, subject, receipt_file_id, receipt_type,
                       source, delivered, created_at
                FROM sales ORDER BY id DESC LIMIT ?
                """,
                (limit,),
            ) as cur:
                return [self._sale_row(r) for r in await cur.fetchall()]

    async def list_receipts(self, limit: int = 30) -> list[dict]:
        async with aiosqlite.connect(self._path) as db:
            async with db.execute(
                """
                SELECT id, buyer, buyer_id, subject, receipt_file_id, receipt_type,
                       source, delivered, created_at
                FROM sales WHERE receipt_file_id IS NOT NULL
                ORDER BY id DESC LIMIT ?
                """,
                (limit,),
            ) as cur:
                return [self._sale_row(r) for r in await cur.fetchall()]

    async def get_sale(self, sale_id: int) -> dict | None:
        async with aiosqlite.connect(self._path) as db:
            async with db.execute(
                """
                SELECT id, buyer, buyer_id, subject, receipt_file_id, receipt_type,
                       source, delivered, created_at
                FROM sales WHERE id = ?
                """,
                (sale_id,),
            ) as cur:
                r = await cur.fetchone()
                return self._sale_row(r) if r else None

    async def set_sale_delivered(self, sale_id: int, delivered: bool) -> None:
        async with aiosqlite.connect(self._path) as db:
            await db.execute(
                "UPDATE sales SET delivered = ? WHERE id = ?",
                (1 if delivered else 0, sale_id),
            )
            await db.commit()

    async def sales_count(self) -> int:
        async with aiosqlite.connect(self._path) as db:
            async with db.execute("SELECT COUNT(*) FROM sales") as cur:
                return int((await cur.fetchone())[0])

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
