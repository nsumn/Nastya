#!/usr/bin/env python3
"""Получить api_id и api_hash прямо с сервера, без браузера.

Сайт my.telegram.org часто отвечает «ERROR» из мобильных браузеров и
блокирует повторные попытки («too many attempts») по адресу в сети.
У сервера адрес другой, поэтому с него обычно всё проходит с первого раза.

Запуск на сервере:

    cd /opt/nastya-bot
    .venv/bin/python tools/get_api_keys.py

Скрипт спросит номер телефона, потом код (придёт сообщением от Telegram
в само приложение, не смс), создаст приложение и покажет два ключа.
В конце предложит сразу записать их в .env.

Никуда, кроме my.telegram.org, ничего не отправляется: это тот же вход,
что и через браузер, только без браузера.
"""
from __future__ import annotations

import http.cookiejar
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

BASE = "https://my.telegram.org"
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/125.0 Safari/537.36")

_jar = http.cookiejar.CookieJar()
_opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(_jar))


def _post(path: str, data: dict) -> str:
    req = urllib.request.Request(
        BASE + path,
        data=urllib.parse.urlencode(data).encode(),
        headers={
            "User-Agent": UA,
            "Referer": BASE + "/auth",
            "Origin": BASE,
            "X-Requested-With": "XMLHttpRequest",
            "Content-Type": "application/x-www-form-urlencoded",
        },
    )
    with _opener.open(req, timeout=30) as resp:
        return resp.read().decode("utf-8", "replace").strip()


def _get(path: str) -> str:
    req = urllib.request.Request(BASE + path, headers={"User-Agent": UA})
    with _opener.open(req, timeout=30) as resp:
        return resp.read().decode("utf-8", "replace")


def _fail(message: str) -> None:
    print("\n❌ " + message)
    sys.exit(1)


def _explain(answer: str) -> str:
    """Перевести ответ сайта на человеческий."""
    low = answer.lower()
    if "too many" in low or "flood" in low:
        return ("сайт временно не принимает попытки с этого адреса "
                "(«too many attempts»). Подожди несколько часов и повтори — "
                "новые попытки только продлевают ожидание.")
    if "invalid" in low and "phone" in low:
        return "номер не подошёл. Введи его как +79991234567, без пробелов."
    if "invalid" in low and ("password" in low or "code" in low):
        return "код не подошёл. Он живёт пару минут — запроси заново."
    if "banned" in low or "blocked" in low:
        return "Telegram отклонил вход с этого номера."
    return f"сайт ответил: {answer[:200]}"


def login() -> None:
    phone = input("Номер телефона (например +79991234567): ").strip()
    if not phone.startswith("+"):
        phone = "+" + phone.lstrip("+")

    print("\nЗапрашиваю код…")
    answer = _post("/auth/send_password", {"phone": phone})
    try:
        random_hash = json.loads(answer)["random_hash"]
    except (ValueError, KeyError, TypeError):
        _fail(_explain(answer))

    print("Код отправлен сообщением от Telegram — посмотри в самом приложении "
          "(это не смс).")
    code = input("Введи код: ").strip()

    answer = _post("/auth/login", {"phone": phone, "random_hash": random_hash,
                                   "password": code, "remember": "1"})
    if answer.lower() not in ("true", '"true"'):
        _fail(_explain(answer))
    print("✅ Вход выполнен.\n")


def parse_keys(page: str) -> tuple[str, str] | None:
    api_id = re.search(r"App api_id[\s\S]{0,400}?>\s*(\d{4,12})\s*<", page)
    api_hash = re.search(r"App api_hash[\s\S]{0,400}?>\s*([0-9a-f]{32})\s*<",
                         page)
    if api_id and api_hash:
        return api_id.group(1), api_hash.group(1)
    return None


def create_app(page: str) -> None:
    form_hash = re.search(r'name="hash"\s+value="([^"]+)"', page)
    if not form_hash:
        _fail("не нашёл форму создания приложения. Пришли мне вывод команды "
              "целиком, разберусь.")
    print("Создаю приложение…")
    answer = _post("/apps/create", {
        "hash": form_hash.group(1),
        "app_title": "mirror",
        "app_shortname": "mirrorapp",
        "app_url": "https://example.com",
        "app_platform": "desktop",
        "app_desc": "personal use",
    })
    if answer.lower() not in ("true", '"true"', ""):
        print("⚠️  " + _explain(answer))


def save_to_env(api_id: str, api_hash: str) -> None:
    env = Path(".env")
    if not env.exists():
        print("\nФайла .env рядом нет — впиши ключи туда вручную.")
        return
    answer = input("\nЗаписать ключи в .env? [д/н]: ").strip().lower()
    if answer not in ("д", "да", "y", "yes", ""):
        return
    text = env.read_text()
    text = re.sub(r"^TG_API_ID=.*$", "", text, flags=re.M)
    text = re.sub(r"^TG_API_HASH=.*$", "", text, flags=re.M)
    text = text.rstrip() + (f"\n\nTG_API_ID={api_id}\n"
                            f"TG_API_HASH={api_hash}\n")
    env.write_text(text)
    print("✅ Записала в .env")


def main() -> None:
    print("Получение ключей api_id / api_hash с my.telegram.org\n")
    try:
        login()
        page = _get("/apps")
        keys = parse_keys(page)
        if not keys:
            create_app(page)
            page = _get("/apps")
            keys = parse_keys(page)
        if not keys:
            _fail("приложение не создалось. Попробуй через несколько часов — "
                  "скорее всего сработало ограничение по числу попыток.")
    except urllib.error.URLError as e:
        _fail(f"не смогла достучаться до my.telegram.org: {e}")

    api_id, api_hash = keys
    print("\n=====================================")
    print(f"  api_id:   {api_id}")
    print(f"  api_hash: {api_hash}")
    print("=====================================")
    print("Сохрани их себе. Никому не показывай — это ключи от программы.")
    save_to_env(api_id, api_hash)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print()
