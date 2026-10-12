# Brief: "What if Earth was shaped like a spoon?"

Задание для Claude Code. Делать в движке `earthstop` (этот архив), всё по `README.md` и правилам ниже. Видео 1080×1920, 30 fps, ≈ 64 с, английский, аудитория США.

---

## 0. Как запускать (коротко)

```bash
unzip whatif_engine_v9.zip && cd earthstop && npm install
(setsid nohup python3 -m http.server 8765 --bind 127.0.0.1 >/dev/null 2>&1 &)
# тестовые кадры
PAGE=index_spoon.html node render.mjs out/test 0 1 30 "1,4.2,8,13,19,24,31,38,44,50,57"
ffmpeg -i out/test/f_%05d.jpg -vf "scale=270:480,tile=6x2" sheet.jpg     # посмотреть глазами!
# полный рендер (в фоне, ~40–60 мин)
(PAGE=index_spoon.html setsid nohup node render.mjs out/scene 0 64 30 > out/scene.log 2>&1 &)
python3 audio_spoon.py out/raw.wav && ffmpeg -i out/raw.wav -af loudnorm=I=-14:TP=-1.5:LRA=11 out/audio.wav
# двухпроходный энкод (< 30 МБ)
ffmpeg -y -framerate 30 -i out/scene/f_%05d.jpg -c:v libx264 -preset slow -b:v 3300k -pass 1 -an -f mp4 /dev/null
ffmpeg -y -framerate 30 -i out/scene/f_%05d.jpg -i out/audio.wav -map 0:v -map 1:a -c:v libx264 -preset slow -b:v 3300k -pass 2 -pix_fmt yuv420p -c:a aac -b:a 160k -shortest -movflags +faststart what_if_spoon.mp4
```

## 1. Что взять за основу

Ближе всего готовый (но не опубликованный) ролик-ракета: `parts_rocket/*.js` + `index_rocket.html`. Там уже есть всё нужное:
- `r_head.js`: рендерер, шейдер планеты `planetMat` (шумовые материки), `atmoShell`.
- `r_space.js`: космос, звёзды, фигуры рулетки (Sphere, Cube, Pyramid, Heart, Donut, Pizza, Star, Diamond, Tsunami), меш планеты с морем-кольцом и атмосферой, функция `morphRocket(droop, slump)` (изгиб и оплывание в шар).
- `r_sky.js`: «небо» с поверхности: та же планета в км, видимая из города (`Q_CITY2SKY`, `SKY_POS`), рендерится под городом.
- `r_city.js`: город (улица, здания, машины, люди).
- `r_main.js`: рулетка, камеры, наклон гравитации с катящимися машинами, HUD, подписи, рендер.

Скопировать `parts_rocket` → `parts_spoon`, заменить геометрию «ракеты» на ложку, переписать камеры/тексты по сценарию ниже. Сборка: `cat parts_spoon/s_head.js s_space.js s_sky.js s_city.js s_main.js > scene_spoon.js`, проверка `node --check scene_spoon.js`.

## 2. Форма ложки (единицы формы; 1 единица = 3 469 км, объём = объёму Земли)

Точно как в `tools/spoon_phys.py` (там же расчёт гравитации):
- **Черпак:** половина эллипсоидной оболочки (нижняя половина, z ≤ 0, открыт сверху). Внешние полуоси A=4.0, B=3.0, C=1.6; толщина стенки T=0.55 (внутренняя полость A−T, B−T, C−T).
- **Ручка:** начинается у края черпака (x = A−0.4), длина 11.0, ширина 1.1 → 0.7 к концу, толщина 0.45, плавно загибается вверх: `zc = -0.15 + 0.9·u²`, где u = 0…1 вдоль ручки.
- Центр масс ≈ (1.47, 0, −0.63) единиц.
- Геометрию построить так: черпак = LatheGeometry/параметрическая оболочка (внешняя + внутренняя поверхности + торец-кромка по z=0), ручка = экструзия профиля вдоль кривой; слить через `mergeGeometries`, `withBase(geo)` для шумовой текстуры.

## 3. Посчитанные факты (из `tools/spoon_phys.py`, Monte-Carlo гравитация)

| Где | Гравитация | Наклон «низа» | Примечание |
|---|---|---|---|
| Дно черпака (внутри) | 0.33 G | 4° | **самая низкая энергия** → сюда стекают океаны и воздух |
| Середина внутренней стенки | 0.30 G | **54°** | ровная земля ощущается как обрыв, всё катится к морю |
| Край черпака | 0.48 G | 33° | «выше» моря на ~1 500 км по энергии → воздуха нет |
| Ручка, середина | 0.26 G | 9° | |
| Кончик ручки | 0.24 G | 27° | «выше» моря на ~3 900 км → вакуум |

- Длина ложки **≈ 40 000 миль** (больше окружности Земли, 24 900 миль). Черпак 17 200 × 12 900 миль, глубина 2 260 миль, ручка 23 700 миль.
- Все океаны Земли (1.335 млрд км³) на дне черпака: **круглое море ≈ 3 900 миль в диаметре и ≈ 77 миль (124 км) глубиной.** Для сравнения: самая глубокая точка земного океана ≈ 6.8 мили.
- Оплывание: кончик ручки падает к центру масс за **пару часов** (грубая оценка: путь ~45 000 км при ~0.24–0.5 G).
- Всё это свойства ЭТОЙ модели формы. В HUD можно писать «MODEL».

## 4. Сценарий (≈ 64 с)

| Время | На экране | Подпись (#cap) | HUD |
|---|---|---|---|
| 0–5 | Быстрая рулетка форм: Sphere, Cube, Donut, Pyramid, Heart, Pizza, Star, Diamond, Cube, Heart → **обманка Tsunami (3.0 с)** → щелчок на **Spoon (3.95 с)** | Заголовок: **What if Earth was shaped like… _a spoon?_** (до 3.95 вместо «a spoon?» показывать «…?», чтобы строка была по центру) | EARTH'S SHAPE / название / SPINNING… → OF COURSE. |
| 5–11 | Ложка-Земля в космосе, медленно поворачивается. **6.5–9.0 с: на заднем плане пролетает «Rocket?»** (см. п.5) | 5.2–7.9 «A spoon. Why not.» · 8.1–10.8 «Same mass as Earth.<br>40,000 miles long.» | LENGTH / 40,000 mi / LONGER THAN EARTH'S EQUATOR |
| 11–17 | Материки «высыхают», в черпаке собирается круглое синее море, атмосфера сжимается в черпак | 11.2–14.0 «Every ocean drains<br>into the bowl…» · 14.3–16.9 «…one round sea,<br>77 miles deep.» | ALL OCEANS / 77 mi deep / EARTH'S DEEPEST · 6.8 MI |
| 17–21 | Камера ныряет к берегу моря на дне черпака (белая вуаль на 21 с) | 17.3–20.6 «Everyone lives on the shore<br>at the very bottom.» | |
| 21–28 | Город на берегу; камера смотрит через море: стены черпака встают по всему горизонту | 21.2–24.4 «From the beach, the bowl's<br>walls rise on every side…» · 24.6–27.8 «…2,000 miles high.» | GRAVITY / 0.33 G / YOU WEIGH A THIRD |
| 28–34 | Камера поднимается к небу: через всё небо дугой идёт ручка | 28.3–33.8 «And the handle arcs<br>across the whole sky.» | HANDLE / 23,700 mi / NO AIR UP THERE |
| 34–41 | Улица на середине стенки: камера с креном 54°, машины и люди съезжают «вниз» к морю (как наклон в `r_main.js`, только сильнее) | 34.3–37.6 «Halfway up the wall,<br>"down" tilts 54°.» · 37.8–40.8 «Everything slides<br>into the sea.» | GRAVITY TILT / 0→54° / TOWARD THE SEA |
| 41–47 | Космос: вид на кончик ручки, звёзды, ни облачка | 41.3–44.6 «The handle's tip is so far "uphill"…» · 44.8–46.8 «…there's no air at all.» | HANDLE TIP / 0.24 G / ~3,900 KM "UPHILL" |
| 47–55 | Ручка трескается (раскалённые трещины `uHeat`), гнётся и оплывает, ложка стягивается в шар (`morph`: изгиб → slump) | 47.3–50.6 «But no rock can hold up<br>a 40,000-mile spoon.» · 50.8–54.8 «Gravity melts it into a ball<br>in a couple of hours.» | TIME-LAPSE / ≈ 2 hours / GRAVITY ALWAYS WINS |
| 55–60 | Остывающий шар | 55.3–59.8 «That's why planets are round,<br>not spoon-shaped.» | EARTH'S SHAPE / Sphere / OF COURSE. |
| 60–64 | Тёмная карточка: заголовок + факты | — | — |

**Факты на карточке (`#endS`):** «ANYTHING MORE THAN A FEW HUNDRED MILES WIDE IS PULLED ROUND BY ITS OWN GRAVITY.<br>EARTH'S DEEPEST OCEAN POINT IS ABOUT 6.8 MILES DOWN.<br>EARTH IS ABOUT 24,900 MILES AROUND.»

## 5. Пасхалка «Rocket?»

- Взять геометрию «ракеты» из **первого ролика**: `scene_donut.js`, блок `// the "rocket"` (строки ~158–168: lathe-ствол + две сферы). Материал — тот же `planetMat`, чтобы выглядела как маленькая планета.
- Показать **только на заднем плане** в 6.5–9.0 с: далеко за ложкой (в 3–4 раза дальше), высота на экране ~10–12% кадра, пролетает слева направо по диагонали с лёгким вращением; к 9 с уходит за край кадра.
- Подпись рядом — DOM-метка (класс `txt`, позиция через проекцию 3D-точки), шрифт как HUD-лейбл: **«Rocket?»** (с вопросительным знаком, как в первом видео).
- Не крупно, не по центру, не в рулетке. Ни слова «penis» нигде.

## 6. Правила (обязательно)

- Текст строго по центру. Безопасные зоны TikTok: ничего важного выше y=320, правая колонка x>900 при y 950–1670, низ y>1650, ~57 px по бокам. Заголовок top ≥ 340 px, HUD `left:100px; top:900px`, подписи `top:1250px; padding:0 190px`.
- Каждые 4–6 секунд новый факт или визуальное событие. Тестовые кадры смотреть глазами до полного рендера.
- Типичные грабли: `pkill -f render.mjs` убивает свою же оболочку (искать PID через `pgrep`); многострочные шейдеры — только в бэктиках; позу/положение объектов считать до камеры, которая за ними следит; для узкого портретного кадра горизонтальный FOV ≈ 0.56 × вертикального (объекты легко обрезаются по бокам); длинные ожидания — `sleep 540`, вызовы инструментов обрываются через 10 мин.

## 7. Звук (`audio_spoon.py`)

Взять за основу `audio_rocket.py` (рулетка с щелчками и обманкой, «боинг» на приземлении, пэды, нырок, гул, наклон, трещины, оплывание со «сдувающимся» слайд-свистком, карточка). Добавить фоновую цепляющую тему из `audio_fart2.py` (блок `# ---------- background music`, функции `lead/tubaN/pizz2`, хук `HOOK_A/HOOK_B`), приглушать её под щелчки рулетки и удары. На пролёте «Rocket?» (6.5–9.0) — короткий смешной «вжух» (whoosh) с панорамой слева направо. Нормализация −14 LUFS.

## 8. Описание для TikTok (сразу вместе с видео)

**Caption:** What if Earth was shaped like a spoon? 🥄🌍 Every ocean would pour into the bowl: one sea 77 miles deep, walls 2,000 miles high, and a handle across the whole sky. Did you spot the rocket? 🚀👀

**Hashtags:** #whatif #space #earth #science #spoon #3danimation #fyp #learnontiktok

Короткие варианты: «Earth, but it's a spoon 🥄 Did you spot the rocket? 👀 #whatif #space #fyp» · «A 40,000-mile spoon with one ocean in the bowl 🌊 #whatif #science #fyp»
