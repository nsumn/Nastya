"""Клиент публичного API Roblox: по нику отдаёт дату регистрации,
возраст аккаунта, аватар и базовую статистику.

Используются только открытые эндпоинты (авторизация не нужна):

* ``users.roblox.com/v1/usernames/users``      — ник → id
* ``users.roblox.com/v1/users/{id}``           — дата создания, бан, описание
* ``thumbnails.roblox.com/v1/users/avatar-headshot`` — аватарка
* ``friends.roblox.com/v1/users/{id}/...``     — друзья/подписчики
"""
from __future__ import annotations

import asyncio
import logging
import re
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone

from aiohttp import ClientSession, ClientTimeout

log = logging.getLogger(__name__)

USERS_API = "https://users.roblox.com"
THUMBS_API = "https://thumbnails.roblox.com"
FRIENDS_API = "https://friends.roblox.com"

# Не выдумываем правила Roblox: пропускаем всё, что вообще может быть ником
# (латиница, цифры, подчёркивание), а существует он или нет — решает Roblox.
USERNAME_RE = re.compile(r"^[A-Za-z0-9_]{1,25}$")
CACHE_TTL = 300  # секунд


class RobloxError(Exception):
    """Ошибка обращения к API Roblox (сеть/лимиты/5xx)."""


class UserNotFound(Exception):
    """Такого ника нет."""


class BadUsername(Exception):
    """Ник не проходит проверку формата."""


def normalize_username(raw: str) -> str:
    """Чистит ввод пользователя: ссылки, @, пробелы."""
    name = (raw or "").strip()
    # Вставили ссылку на профиль — вытащим ник или id.
    m = re.search(r"roblox\.com/users/(\d+)", name, re.I)
    if m:
        return "#" + m.group(1)  # спец-форма: поиск сразу по id
    m = re.search(r"[?&]username=([^&\s]+)", name, re.I)
    if m:
        name = m.group(1)
    name = name.lstrip("@").strip()
    if name.isdigit():
        return "#" + name
    return name


def validate_username(name: str) -> None:
    if name.startswith("#"):
        return  # это id
    if not USERNAME_RE.match(name):
        raise BadUsername(name)


@dataclass
class AccountAge:
    years: int
    months: int
    days: int
    total_days: int

    def as_dict(self) -> dict:
        return {
            "years": self.years,
            "months": self.months,
            "days": self.days,
            "total_days": self.total_days,
        }


def account_age(created: datetime, now: datetime | None = None) -> AccountAge:
    """Возраст аккаунта в годах/месяцах/днях по календарю."""
    now = now or datetime.now(timezone.utc)
    years = now.year - created.year
    months = now.month - created.month
    days = now.day - created.day
    if days < 0:
        months -= 1
        # число дней в предыдущем (относительно now) месяце
        prev_month = now.month - 1 or 12
        prev_year = now.year if now.month > 1 else now.year - 1
        if prev_month == 12:
            nxt = datetime(prev_year + 1, 1, 1, tzinfo=timezone.utc)
        else:
            nxt = datetime(prev_year, prev_month + 1, 1, tzinfo=timezone.utc)
        days += (nxt - datetime(prev_year, prev_month, 1,
                                tzinfo=timezone.utc)).days
    if months < 0:
        years -= 1
        months += 12
    total = (now - created).days
    return AccountAge(max(years, 0), max(months, 0), max(days, 0),
                      max(total, 0))


def _plural(n: int, one: str, few: str, many: str) -> str:
    n10, n100 = n % 10, n % 100
    if n10 == 1 and n100 != 11:
        word = one
    elif 2 <= n10 <= 4 and not 12 <= n100 <= 14:
        word = few
    else:
        word = many
    return f"{n} {word}"


def age_phrase(age: AccountAge) -> str:
    """«2 года 3 месяца 5 дней» — по-русски и без нулевых частей."""
    parts = []
    if age.years:
        parts.append(_plural(age.years, "год", "года", "лет"))
    if age.months:
        parts.append(_plural(age.months, "месяц", "месяца", "месяцев"))
    if age.days or not parts:
        parts.append(_plural(age.days, "день", "дня", "дней"))
    return " ".join(parts)


def _parse_created(raw: str) -> datetime:
    # Roblox отдаёт вида 2006-03-08T17:17:52.9Z (дробные секунды переменной длины)
    text = (raw or "").replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(text).astimezone(timezone.utc)
    except ValueError:
        text = re.sub(r"\.\d+", "", text)
        return datetime.fromisoformat(text).astimezone(timezone.utc)


@dataclass
class RobloxClient:
    timeout: float = 10.0
    _session: ClientSession | None = field(default=None, init=False)
    _cache: dict[str, tuple[float, dict]] = field(default_factory=dict,
                                                  init=False)
    _lock: asyncio.Lock = field(default_factory=asyncio.Lock, init=False)

    async def _http(self) -> ClientSession:
        if self._session is None or self._session.closed:
            self._session = ClientSession(
                timeout=ClientTimeout(total=self.timeout),
                headers={"Accept": "application/json",
                         "User-Agent": "Mozilla/5.0 (compatible; RobloxAgeBot/1.0)"},
            )
        return self._session

    async def close(self) -> None:
        if self._session and not self._session.closed:
            await self._session.close()

    async def _get_json(self, url: str, **kw) -> dict:
        session = await self._http()
        try:
            async with session.get(url, **kw) as resp:
                if resp.status == 429:
                    raise RobloxError("Roblox временно ограничил запросы. "
                                      "Попробуй через минуту.")
                if resp.status >= 500:
                    raise RobloxError("Roblox не отвечает. Попробуй позже.")
                if resp.status == 404:
                    raise UserNotFound(url)
                resp.raise_for_status()
                return await resp.json()
        except (RobloxError, UserNotFound):
            raise
        except Exception as exc:  # noqa: BLE001
            log.warning("Roblox GET %s failed: %s", url, exc)
            raise RobloxError("Не удалось связаться с Roblox.") from exc

    async def _post_json(self, url: str, payload: dict) -> dict:
        session = await self._http()
        try:
            async with session.post(url, json=payload) as resp:
                if resp.status == 429:
                    raise RobloxError("Roblox временно ограничил запросы. "
                                      "Попробуй через минуту.")
                if resp.status >= 500:
                    raise RobloxError("Roblox не отвечает. Попробуй позже.")
                resp.raise_for_status()
                return await resp.json()
        except RobloxError:
            raise
        except Exception as exc:  # noqa: BLE001
            log.warning("Roblox POST %s failed: %s", url, exc)
            raise RobloxError("Не удалось связаться с Roblox.") from exc

    async def _resolve_id(self, username: str) -> int:
        data = await self._post_json(
            f"{USERS_API}/v1/usernames/users",
            {"usernames": [username], "excludeBannedUsers": False},
        )
        items = data.get("data") or []
        if items:
            return int(items[0]["id"])
        # Точного логина нет — ищем по отображаемому имени: в Roblox человек
        # чаще помнит именно его, а логин может отличаться.
        return await self._search_id(username)

    async def _search_id(self, keyword: str) -> int:
        try:
            data = await self._get_json(
                f"{USERS_API}/v1/users/search",
                params={"keyword": keyword, "limit": "10"})
        except (RobloxError, UserNotFound):
            raise UserNotFound(keyword)
        rows = data.get("data") or []
        if not rows:
            raise UserNotFound(keyword)
        low = keyword.lower()
        for row in rows:                       # точное совпадение имени
            if (row.get("displayName") or "").lower() == low:
                return int(row["id"])
        for row in rows:                       # или логина
            if (row.get("name") or "").lower() == low:
                return int(row["id"])
        return int(rows[0]["id"])

    async def _avatar(self, user_id: int) -> str:
        try:
            data = await self._get_json(
                f"{THUMBS_API}/v1/users/avatar-headshot",
                params={"userIds": str(user_id), "size": "150x150",
                        "format": "Png", "isCircular": "false"},
            )
            items = data.get("data") or []
            return items[0].get("imageUrl", "") if items else ""
        except (RobloxError, UserNotFound):
            return ""

    async def _count(self, user_id: int, kind: str) -> int | None:
        try:
            data = await self._get_json(
                f"{FRIENDS_API}/v1/users/{user_id}/{kind}/count")
            return int(data.get("count", 0))
        except (RobloxError, UserNotFound):
            return None

    async def lookup(self, raw_username: str) -> dict:
        """Главный метод: ник (или id/ссылка) → словарь с данными профиля.

        Бросает :class:`BadUsername`, :class:`UserNotFound`, :class:`RobloxError`.
        """
        name = normalize_username(raw_username)
        if not name:
            raise BadUsername("")
        validate_username(name)

        key = name.lower()
        async with self._lock:
            hit = self._cache.get(key)
            if hit and time.monotonic() - hit[0] < CACHE_TTL:
                return self._fresh_age(hit[1])

        user_id = int(name[1:]) if name.startswith("#") \
            else await self._resolve_id(name)

        profile = await self._get_json(f"{USERS_API}/v1/users/{user_id}")
        created = _parse_created(profile.get("created", ""))
        avatar, friends, followers = await asyncio.gather(
            self._avatar(user_id),
            self._count(user_id, "friends"),
            self._count(user_id, "followers"),
        )

        result = {
            "id": user_id,
            "username": profile.get("name", ""),
            "display_name": profile.get("displayName", ""),
            "description": (profile.get("description") or "").strip(),
            "created": created.isoformat(),
            "created_ts": int(created.timestamp()),
            "is_banned": bool(profile.get("isBanned")),
            "has_verified_badge": bool(profile.get("hasVerifiedBadge")),
            "avatar_url": avatar,
            "friends": friends,
            "followers": followers,
            "profile_url": f"https://www.roblox.com/users/{user_id}/profile",
        }
        async with self._lock:
            self._cache[key] = (time.monotonic(), result)
            self._cache[str(user_id)] = (time.monotonic(), result)
        return self._fresh_age(result)

    @staticmethod
    def _fresh_age(data: dict) -> dict:
        """Возраст считаем на момент запроса, а не на момент кэширования."""
        age = account_age(_parse_created(data["created"]))
        return {**data, "age": age.as_dict(), "age_text": age_phrase(age)}
