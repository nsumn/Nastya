#!/usr/bin/env python3
"""Получить api_id и api_hash прямо с сервера, без браузера.

Сайт my.telegram.org часто отвечает «ERROR» из мобильных браузеров и
блокирует повторные попытки («too many attempts») по адресу в сети.
У сервера адрес другой, поэтому с него обычно всё проходит с первого раза.

Запуск на сервере:

    cd /opt/nastya-bot
    .venv/bin/python tools/get_api_keys.py

Если номер российский, а сервер стоит за границей, Telegram откажется
создавать приложение: страна адреса должна совпадать со страной номера.
Тогда запускай через российский прокси:

    .venv/bin/python tools/get_api_keys.py --proxy http://логин:пароль@адрес:порт

Скрипт спросит номер телефона, потом код (придёт сообщением от Telegram
в само приложение, не смс), создаст приложение и покажет два ключа.
В конце предложит сразу записать их в .env.

Никуда, кроме my.telegram.org, ничего не отправляется: это тот же вход,
что и через браузер, только без браузера.
"""
from __future__ import annotations

import http.cookiejar
import json
import random
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

BASE = "https://my.telegram.org"
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/125.0 Safari/537.36")

# Сессию храним в файле: повторный запуск не будет заново просить код.
SESSION_FILE = Path(".my_telegram_session")
_jar = http.cookiejar.MozillaCookieJar(SESSION_FILE)
if SESSION_FILE.exists():
    try:
        _jar.load(ignore_discard=True, ignore_expires=True)
    except (OSError, http.cookiejar.LoadError):
        pass
# Можно ходить через прокси: --proxy http://логин:пароль@адрес:порт
# Telegram создаёт приложение только если страна адреса совпадает со
# страной номера телефона, поэтому для российского номера нужен
# российский адрес.
_proxy = ""
for _i, _arg in enumerate(sys.argv):
    if _arg == "--proxy" and _i + 1 < len(sys.argv):
        _proxy = sys.argv[_i + 1]
    elif _arg.startswith("--proxy="):
        _proxy = _arg.split("=", 1)[1]

_handlers = [urllib.request.HTTPCookieProcessor(_jar)]
if _proxy:
    _handlers.append(urllib.request.ProxyHandler({"http": _proxy,
                                                  "https": _proxy}))
_opener = urllib.request.build_opener(*_handlers)


def _save_session() -> None:
    try:
        _jar.save(ignore_discard=True, ignore_expires=True)
        SESSION_FILE.chmod(0o600)
    except OSError:
        pass


def _post(path: str, data: dict, referer: str = "/auth") -> str:
    req = urllib.request.Request(
        BASE + path,
        data=urllib.parse.urlencode(data).encode(),
        headers={
            "User-Agent": UA,
            "Referer": BASE + referer,
            "Origin": BASE,
            "X-Requested-With": "XMLHttpRequest",
            "Content-Type": "application/x-www-form-urlencoded",
        },
    )
    with _opener.open(req, timeout=30) as resp:
        return resp.read().decode("utf-8", "replace").strip()


def _get_url(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with _opener.open(req, timeout=20) as resp:
        return resp.read().decode("utf-8", "replace")


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
    _save_session()
    print("✅ Вход выполнен (сохранила, второй раз код не понадобится).\n")


def _plain(page: str) -> str:
    """Страница без тегов — так разбор не зависит от вёрстки сайта."""
    text = re.sub(r"<(script|style)[\s\S]*?</\1>", " ", page, flags=re.I)
    text = re.sub(r"<[^>]+>", "\n", text)
    return re.sub(r"[ \t]+", " ", text)


def parse_keys(page: str) -> tuple[str, str] | None:
    text = _plain(page)
    api_id = re.search(r"api_id:?\s*(\d{4,12})", text)
    api_hash = re.search(r"api_hash:?\s*([0-9a-f]{32})", text)
    if not (api_id and api_hash):
        # запасной вариант: ищем по вёрстке
        api_id = api_id or re.search(
            r"App api_id[\s\S]{0,600}?>\s*(\d{4,12})\s*<", page)
        api_hash = api_hash or re.search(
            r"App api_hash[\s\S]{0,600}?>\s*([0-9a-f]{32})\s*<", page)
    if api_id and api_hash:
        return api_id.group(1), api_hash.group(1)
    return None


def _form_fields(page: str) -> dict[str, str]:
    """Реальные поля формы со страницы: {имя: значение}."""
    fields: dict[str, str] = {}
    for tag in re.findall(r"<(?:input|textarea)[^>]*>", page, re.I):
        name = re.search(r'name="([^"]+)"', tag)
        if not name:
            continue
        value = re.search(r'value="([^"]*)"', tag)
        fields.setdefault(name.group(1), value.group(1) if value else "")
    return fields


def create_app(page: str) -> tuple[str, str] | None:
    """Создать приложение. Короткое имя должно быть уникальным на весь
    Telegram, поэтому при отказе пробуем другое."""
    fields = _form_fields(page)
    if "hash" not in fields:
        _fail("не нашла форму создания приложения. Пришли мне вывод команды "
              "целиком, разберусь.")
    print(f"Поля формы на сайте: {', '.join(sorted(fields))}")

    action = re.search(r'<form[^>]+action="([^"]*apps/create[^"]*)"', page)
    path = action.group(1) if action else "/apps/create"
    if path.startswith("http"):
        path = path.split("my.telegram.org", 1)[-1]

    # Сайт придирчив: имя — латиница UpperCamelCase без пробелов и
    # подчёркиваний, описание — развёрнутое (короткое он отвергает),
    # URL — реальный сайт.
    names = ["MirrorApp"] + [f"Mirror{random.randint(1000, 9999)}"]
    for name in names:
        print(f"Создаю приложение ({name})…")
        payload = dict(fields)          # скрытые поля отправляем как есть
        payload.update({
            "app_title": name,
            "app_shortname": name,
            "app_url": "https://example.com",
            "app_platform": "desktop",
            "app_desc": ("Personal application for reading my own Telegram "
                         "channels and reposting their content to my own "
                         "channel."),
        })
        answer = _post(path, payload, referer="/apps")
        keys = parse_keys(_get("/apps"))
        if keys:
            return keys
        print(f"⚠️  ответ сайта: {answer[:200] or '(пусто)'}")
        time.sleep(5)

    print("\n💡 Вход проходит, а создание приложения — нет. Telegram требует, "
          "чтобы страна IP-адреса совпадала со страной номера телефона. "
          "Этот сервер стоит не в России, а номер российский — отсюда отказ. "
          "Создавать приложение нужно с обычного российского интернета "
          "(домашний wi-fi или мобильный, VPN выключен).")
    return None


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
    if _proxy:
        host = _proxy.split("@")[-1]
        print(f"Иду через прокси {host}")
    check_only = "--check" in sys.argv
    try:
        try:
            where = json.loads(_get_url("https://ipinfo.io/json"))
            print(f"Сайт увидит адрес из страны: {where.get('country', '?')} "
                  f"({where.get('city', '?')})\n")
        except Exception:  # noqa: BLE001
            pass
        page = _get("/apps")
        if "send_password" in page or "Login" in page[:2000]:
            login()          # сессии нет или протухла — входим по коду
            page = _get("/apps")
        else:
            print("Использую сохранённый вход — код не нужен.\n")
        keys = parse_keys(page)
        if not keys and not check_only:
            keys = create_app(page)
            page = _get("/apps")
        if not keys:
            dump = Path("apps_page.txt")
            dump.write_text(_plain(page).strip()[:4000])
            print("\n--- что сейчас на странице приложений ---")
            print(_plain(page).strip()[:1200])
            print("--- конец ---")
            _fail("ключи не появились. Полный текст страницы сохранён в "
                  f"{dump} — пришли его мне, разберусь. Вход сохранён, "
                  "повторный запуск код уже не спросит.")
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
