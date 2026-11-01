# Кадры в стиле @realhistorically (HyperFrames)

Свой сюжет «How to become a KNIGHT» в формате аккаунта @realhistorically:
1080×1920, рисованный мультяшный стиль с толстым контуром, белоголовый персонаж,
HUD справа сверху (дугой «YEARS PASSED» + счётчик + цветной «RANK: …»),
субтитры: белый жирный капс с тёмной обводкой, ключевое слово выделено цветом.

- `index.html` — композиция HyperFrames (4 сцены по 3 с).
- `frames/` — стоп-кадры (`hyperframes snapshot --at 2.5,5.5,8.5,11.5`).

Анализ аккаунта: `yt-dlp --impersonate chrome --flat-playlist -J https://www.tiktok.com/@realhistorically`
(метод из `earthstop/HANDOFF.md`), затем `ffmpeg -vf "fps=1/4,scale=270:-1,tile=6x4"` для контакт-листов.

## v2 — «живописный» рендер
`index.html` собирается из `gen.py` (`python3 gen.py index.html`). Приёмы, взятые у оригинала:
крупный план (персонаж на полкадра, обрезан краем), жёсткая тень + мягкая растушёвка на каждой форме,
«дрожащий» контур (feDisplacementMap), размытый фон (глубина резкости), бумажная текстура, зерно, виньетка.
