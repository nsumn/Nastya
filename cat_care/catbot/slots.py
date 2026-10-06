"""Напоминания: утро, день и вечер настраивает каждый сам,
а последнее (по умолчанию в 23:00) приходит всем и не отключается."""
from __future__ import annotations

from dataclasses import dataclass

from . import db


@dataclass(frozen=True)
class Slot:
    id: str
    icon: str
    title: str  # «Утро»
    when: str  # «утром» — для вопросов «во сколько напоминать утром?»
    default_time: str
    default_on: bool
    presets: tuple[str, ...]


SLOTS: list[Slot] = [
    Slot("morning", "🌅", "Утро", "утром", "09:00", False, ("07:00", "08:00", "09:00", "10:00")),
    Slot("day", "☀️", "День", "днём", "14:00", False, ("12:00", "13:00", "14:00", "16:00")),
    Slot("evening", "🌙", "Вечер", "вечером", "20:00", True, ("19:00", "20:00", "21:00", "22:00")),
]
SLOT_BY_ID = {s.id: s for s in SLOTS}
FORCED = "forced"


async def user_slots(user_id: int) -> dict[str, tuple[bool, str]]:
    """Настройки человека с подставленными значениями по умолчанию."""
    saved = await db.reminder_settings(user_id)
    return {s.id: saved.get(s.id, (s.default_on, s.default_time)) for s in SLOTS}


def parse_time(text: str) -> str | None:
    """«8», «8:30», «8.30», «08 30», «830» → «08:30». None, если не похоже на время."""
    digits = text.strip().replace(".", ":").replace(" ", ":").replace("-", ":")
    if ":" in digits:
        parts = [p for p in digits.split(":") if p]
        if len(parts) != 2 or not all(p.isdigit() for p in parts):
            return None
        h, m = int(parts[0]), int(parts[1])
    elif digits.isdigit() and len(digits) <= 2:
        h, m = int(digits), 0
    elif digits.isdigit() and len(digits) in (3, 4):
        h, m = int(digits[:-2]), int(digits[-2:])
    else:
        return None
    if 0 <= h < 24 and 0 <= m < 60:
        return f"{h:02d}:{m:02d}"
    return None
