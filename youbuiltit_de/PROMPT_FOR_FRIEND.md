Скопируй текст ниже целиком и отправь первым сообщением своему Claude Code (сессия с репозиторием nsumn/Nastya):

---

Мы с подругой вместе ведём немецкий TikTok-канал с 3D-роликами в стиле аккаунта @youbuiltit («Wenn du … Aber … Also … Glückwunsch! Du hast … gebaut.»). Вся работа лежит в репозитории nsumn/Nastya в ветке claude/youbuiltit-frames.

1. Переключись на ветку claude/youbuiltit-frames и подтяни свежие изменения (git fetch origin claude/youbuiltit-frames && git checkout claude/youbuiltit-frames && git pull). Работай и пушь только в эту ветку.
2. Прочитай youbuiltit_de/CLAUDE.md целиком и действуй строго по нему. Там формат, конвейер по шагам, команды и известные грабли. Ещё прочитай youbuiltit_de/START_HERE.md.
3. Запусти bash youbuiltit_de/setup.sh и сделай пробный стоп-кадр готового ролика (19_waldhuette: сначала cd youbuiltit_de/engine && cat lib.js wald_main.js > wald.js, потом PAGE=index_wald.html node render.js stills 5), чтобы убедиться, что движок работает.
4. Ключ озвучки Lumean бери только из переменной окружения LUMEAN_API_KEY. Никогда не записывай его в файлы, коммиты или чат. Если переменной нет, скажи мне, как её добавить. Если ключ от другого аккаунта Lumean, сначала выполни python3 youbuiltit_de/lumean.py template и используй выданный LUMEAN_TEMPLATE.
5. Потом предложи мне 5 тем для следующего ролика: немецкие или исторические, которые работают в формате «Aber… Also…». Уже сделаны: подвал (01_keller), рыцарский замок (02_burg), холодильник в формате @oddtilt (04_kuehlschrank), шалаш в лесу (19_waldhuette). Новый ролик делай по образцу 19_waldhuette: звуки через window.SFX и субтитры отдельным слоем (captions.json). Кошачьи папки (07–18, 20) и CATS.md к нашему каналу не относятся, их не трогай.

Общайся со мной по-русски. Текст ролика, субтитры и описание пиши на немецком, с обращением на «du». Ролики должны быть быстрыми (60–65 с, голос Lennard), медленные не нужны. После каждого шага коммить и пушь в ветку, чтобы подруга видела актуальное состояние.
