# Автозапуск бота ОГЭ (24/7 через systemd)

Чтобы бот работал постоянно и сам перезапускался после сбоя или перезагрузки
сервера, запусти его как systemd-сервис.

> Пути в `oge-bot.service` рассчитаны на проект в `/root/Nastya` и виртуальное
> окружение в `/root/Nastya/.venv`. Если у тебя иначе — поправь две строки
> `WorkingDirectory` и `ExecStart` в файле.

## Установка (один раз)

```bash
# 1. Скопировать service-файл в systemd
sudo cp /root/Nastya/deploy/oge-bot.service /etc/systemd/system/oge-bot.service

# 2. Перечитать конфигурацию systemd
sudo systemctl daemon-reload

# 3. Включить автозапуск при загрузке сервера и сразу запустить
sudo systemctl enable --now oge-bot
```

Готово — бот работает в фоне и переживёт закрытие терминала и перезагрузку.

## Полезные команды

```bash
sudo systemctl status oge-bot      # статус (работает или нет)
sudo systemctl restart oge-bot     # перезапустить
sudo systemctl stop oge-bot        # остановить
sudo systemctl start oge-bot       # запустить
journalctl -u oge-bot -f           # смотреть логи в реальном времени
journalctl -u oge-bot -n 50        # последние 50 строк логов
```

## После обновления кода

Когда подтянул новый код (`git pull`), перезапусти сервис, чтобы изменения
применились:

```bash
cd /root/Nastya && git pull origin claude/telegram-oge-prep-bot-cd3k7j
sudo systemctl restart oge-bot
```

> ВАЖНО: перед запуском сервиса убедись, что в `/root/Nastya/.env` заполнен
> `BOT_TOKEN` (и при необходимости `SHOP_ADMIN_CHAT_ID`, `CARD_DETAILS`), а
> зависимости установлены в `.venv` (`pip install -r requirements.txt`).
> Если бот уже запущен вручную в терминале — сначала останови его (Ctrl+C),
> иначе два процесса будут конфликтовать за один токен.
