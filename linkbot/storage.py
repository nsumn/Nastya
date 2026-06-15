"""Маленькое хранилище состояния бота в JSON-файле.

Хранит:
  * owner_id — кому присылать готовый список (узнаётся из /start);
  * verification_url — последняя найденная ссылка «Алёна …» (как запас, если
    в очередном списке её вдруг не окажется).
"""
from __future__ import annotations

import json
import os


class Storage:
    def __init__(self, path: str):
        self.path = path
        self.data: dict = self._load()

    def _load(self) -> dict:
        try:
            with open(self.path, encoding="utf-8") as f:
                return json.load(f)
        except (FileNotFoundError, ValueError):
            return {}

    def _save(self) -> None:
        tmp = self.path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(self.data, f, ensure_ascii=False, indent=2)
        os.replace(tmp, self.path)

    @property
    def owner_id(self) -> int:
        return int(self.data.get("owner_id", 0) or 0)

    @owner_id.setter
    def owner_id(self, value: int) -> None:
        self.data["owner_id"] = int(value)
        self._save()

    @property
    def verification_url(self) -> str | None:
        return self.data.get("verification_url") or None

    @verification_url.setter
    def verification_url(self, value: str | None) -> None:
        self.data["verification_url"] = value or ""
        self._save()
