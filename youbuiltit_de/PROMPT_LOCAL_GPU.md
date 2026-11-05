# Промпт для Claude Code на компьютере с видеокартой (Windows)

Вставь текст ниже первым сообщением в Claude Code, открытом в папке `C:\Users\krumb\Documents\Nastya`.

---

Мы ведём немецкий TikTok в стиле @youbuiltit. Ты работаешь локально на моём Windows-компьютере с видеокартой, в репозитории `nsumn/Nastya`.

1. Переключись на ветку `claude/youbuiltit-frames` и подтяни изменения (`git checkout claude/youbuiltit-frames && git pull`). Работай и пушь только в эту ветку.
2. Прочитай `youbuiltit_de/CLAUDE.md` и `youbuiltit_de/TOPICS_03.md` (там разбор конкурентов и тест Blender) и действуй по ним.
3. Blender уже установлен: `C:\Program Files\Blender Foundation\Blender 5.2\blender.exe`.
   Запусти сам тест видеокарты и пришли мне цифры:
   `"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b -P youbuiltit_de\blender\castle_test.py -- CYCLES 64 <абсолютный путь>\gpu_cycles.png GPU`
   и то же с `BLENDER_EEVEE 32` вместо `CYCLES 64`. Смотри строки `GPU_BACKEND` и `RENDER_SECONDS`, открой картинки и оцени их.
   В облаке без видеокарты кадр считался ~60 с; цель — несколько секунд на кадр.
4. Если видеокарта быстрая, предложи план перевода конвейера на Blender: сцена на Python (bpy), тайминги из `words.json`
   (как `T('Wort', n)` в three.js-движке), рендер кусками с докачкой, склейка с голосом через ffmpeg (см. CLAUDE.md, раздел 4).
   Ориентир по картинке: @youbuiltit, @oddtilt, @kerozni — фото-текстуры, мягкий свет, анимированные люди.
5. Озвучка: ключ Lumean только из переменной окружения `LUMEAN_API_KEY`, никогда не пиши его в файлы, коммиты и чат.
   Если переменной нет, скажи мне, как её задать в Windows (`setx LUMEAN_API_KEY ...` в отдельном окне, не в чате).

6. Эта локальная сессия — теперь основная, весь конвейер идёт здесь: тема, текст, озвучка, сцена, рендер, сдача.
   Проверь и при необходимости поставь через winget: Git, Node.js LTS, Python 3, ffmpeg (`winget install Gyan.FFmpeg`).
   Потом `bash youbuiltit_de/setup.sh` (через Git Bash) или те же шаги вручную: `npm install` в `youbuiltit_de/engine`,
   `pip install numpy pillow`, `npx playwright install chromium`. Сделай пробный стоп-кадр 02_burg, как в CLAUDE.md, раздел 4.
   Следующий ролик (03): тему выбираем из `TOPICS_03.md` (лидеры: корабль викингов из Хайтабу, Autobahn) или формат @oddtilt
   «Wie du … erfunden hast». Спроси меня, что берём.

Общайся со мной по-русски, текст роликов — на немецком с обращением на «du». После каждого шага коммить и пушь.
Готовые мп4 и большие рендеры в git не клади, если они не финальные (см. .gitignore).
