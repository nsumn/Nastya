"""Общее хранилище обязательной подписки для нескольких ботов.

Состояние ОП (список ссылок, проверочная ссылка, проверочный канал) лежит в
одном JSON-файле. Все боты на сервере читают этот файл, а админ-панель в него
пишет — поэтому список меняется сразу во всех ботах.

Путь к файлу задаётся переменной `OP_STATE_FILE` (по умолчанию `op_state.json`
рядом с ботом). Запись атомарная и под блокировкой, поэтому одновременный
доступ нескольких процессов безопасен.
"""
from __future__ import annotations

import fcntl
import json
import logging
import os
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

log = logging.getLogger(__name__)

MSK = timezone(timedelta(hours=3))
CACHE_TTL = 3.0          # секунды: столько держим прочитанное состояние в памяти

_path = Path(os.getenv("OP_STATE_FILE", "op_state.json"))
_cache: dict | None = None
_cache_at = 0.0
_cache_mtime = 0.0

EMPTY: dict = {
    "items": [],
    "label": "",
    "updated": "",
    "check_url": "",
    "check_chat": "",
    "check_title": "",
    "enabled": True,
    "reward_text": "",
    "welcome_text": "",
    "button_text": "",
    "bonus_label": "",
    "bots": {},
}


def configure(path: str) -> None:
    """Указать файл состояния (вызывается при старте бота/панели)."""
    global _path, _cache, _cache_at
    if path:
        _path = Path(path)
    _cache, _cache_at = None, 0.0
    log.info("Общее состояние ОП: %s", _path.resolve())


def path() -> Path:
    return _path


def now_msk() -> str:
    return datetime.now(MSK).strftime("%d.%m.%Y %H:%M")


def read() -> dict:
    """Текущее состояние. Кэш сбрасывается, если файл изменил другой процесс."""
    global _cache, _cache_at, _cache_mtime
    try:
        mtime = _path.stat().st_mtime
    except OSError:
        mtime = 0.0
    fresh = (_cache is not None
             and time.monotonic() - _cache_at < CACHE_TTL
             and mtime == _cache_mtime)
    if fresh:
        return _cache

    data = dict(EMPTY)
    if mtime:
        try:
            with _path.open("r", encoding="utf-8") as fh:
                fcntl.flock(fh.fileno(), fcntl.LOCK_SH)
                try:
                    data = {**EMPTY, **json.load(fh)}
                finally:
                    fcntl.flock(fh.fileno(), fcntl.LOCK_UN)
        except (OSError, ValueError) as exc:
            log.warning("Не смог прочитать %s: %s", _path, exc)
            data = dict(EMPTY)

    _cache, _cache_at, _cache_mtime = data, time.monotonic(), mtime
    return data


def update(**changes) -> dict:
    """Меняет поля состояния и сразу пишет файл (атомарно, под блокировкой)."""
    global _cache, _cache_at, _cache_mtime
    _path.parent.mkdir(parents=True, exist_ok=True)
    lock_file = _path.with_suffix(_path.suffix + ".lock")

    with lock_file.open("a+") as lock:
        fcntl.flock(lock.fileno(), fcntl.LOCK_EX)
        try:
            data = dict(EMPTY)
            if _path.exists():
                try:
                    data = {**EMPTY, **json.loads(_path.read_text("utf-8"))}
                except (OSError, ValueError):
                    pass
            data.update(changes)

            tmp = _path.with_suffix(_path.suffix + ".tmp")
            tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2),
                           encoding="utf-8")
            os.replace(tmp, _path)
        finally:
            fcntl.flock(lock.fileno(), fcntl.LOCK_UN)

    _cache, _cache_at = data, time.monotonic()
    try:
        _cache_mtime = _path.stat().st_mtime
    except OSError:
        _cache_mtime = 0.0
    return data


# ---------- список подключённых ботов ----------

def register_bot(username: str, title: str, bot_id: int,
                 can_check: bool | None = None) -> None:
    """Бот отмечается в общем состоянии: «я здесь и вот мои права»."""
    bots = dict(read().get("bots") or {})
    entry = dict(bots.get(username) or {})
    entry.update({"title": title, "id": bot_id, "seen": now_msk()})
    if can_check is not None:
        entry["can_check"] = bool(can_check)
    bots[username] = entry
    update(bots=bots)


def bots() -> dict:
    return dict(read().get("bots") or {})
