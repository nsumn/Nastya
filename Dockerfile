# Один контейнер: бот-проверялка Roblox + админ-панель.
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    DB_PATH=/data/bot.db \
    OP_STATE_FILE=/data/op_state.json \
    BOT_MODE=roblox \
    PORT=8080

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

# /data — постоянное хранилище: база и общий список ОП переживают перезапуск
RUN mkdir -p /data
VOLUME ["/data"]

EXPOSE 8080
CMD ["bash", "deploy/run_all.sh"]
