# youbuiltit_de: немецкий TikTok «Wie es gebaut wird», правила для Claude

Канал делает 3D-ролики по формату американского аккаунта **@youbuiltit** (около 2 млн просмотров на ролик), только на немецком.
Работаем в ветке **`claude/youbuiltit-frames`** и после каждого шага коммитим и пушим туда.
Общение с людьми на русском. Текст на экране и озвучка на немецком, обращение на «du».

## 1. Формат (повторяем оригинал)
- Вертикальное видео 1080×1920, 30 fps, длительность 60–66 с. Темп быстрый, около 3.5–4 слов в секунду. Медленные ролики заказчицы не принимают.
- Структура текста: «Wenn du X machst, hast du ein Y. Aber … Also … Aber … Also …», в конце «Glückwunsch! Du hast ein(e) Y gebaut.».
  Каждое «Aber» вводит проблему, каждое «Also» даёт её решение, и оно сразу видно на экране.
- Объём 190–220 слов. Факты должны быть реальными инженерными решениями: weiße Wanne, Rückstauklappe, Bergfried и т. п.
- Картинка: мультяшный 3D (three.js), мягкие тени, облачное небо, низкополигональные деревья.
  Субтитры показывают по одному слову по центру кадра (y=990), шрифт Fredoka 700 96px, белый с чёрной обводкой.
  Цифры и подписи даются жёлтыми плашками в 3D: «3 m», «10 m», «1 Jahr».
- Каждое действие на экране привязано к слову из озвучки через `T('Wort', n)`, то есть к n-му вхождению слова, начинающегося с `Wort`.
- Голос: **Lennard** (ElevenLabs, немецкий) со скоростью 1.15, после озвучки паузы ужимаются до 0.2 с.
  Другие голоса уже пробовали и отвергли: Ole Carpenter, Victor Voss, три варианта Tristan.

## 2. Что уже сделано
| № | Папка | Тема | Длит. | Статус |
|---|---|---|---|---|
| 01 | `01_keller/` | Wie ein Loch im Garten zum Keller wird (подвал: weiße Wanne, Fugenblech, Dämmung, Lichtschacht, Rückstauklappe) | 65.8 с | готов, `DE_01_keller.mp4` |
| 02 | `02_burg/` | Wie ein Hügel zur Ritterburg wird (Holzhütte, Palisade, Mauer, Zinnen, Graben, Zugbrücke, Türme, Belagerung, Brunnen, Bergfried) | 60.3 с | готов, `DE_02_burg.mp4` |
| 04 | `04_kuehlschrank/` | **Формат @oddtilt:** Wie du den Kühlschrank erfunden hast (пещерный человек: снег → ледник в яме → ящик с соломой и льдом → испарение → насос → AKW, но «du bist in Deutschland» → Windrad) | 49.9 с | готов, `DE_04_kuehlschrank.mp4` |
| 05 | `05_tuer/` | **Формат @oddtilt:** Wie du die Tür erfunden hast (пещера → шкура → щит из досок → шип в каменной пятке → рама с притвором → засов → падающие штыри и ключ → глазок → двери наружу) | ~52 с | в работе, сцена в Blender (`blender/tuer_scene.py`), озвучки нет |

### Второй формат: @oddtilt («How you invented …», 1–9 млн просмотров)
- Герой — пещерный человек «du» (у нас мультяшный риг `caveman()` в `kuehl_main.js`: суставы плеч, локтей, бёдер и коленей, брови, рот; позы задаются массивом `POSE`, ходьба через `walkP`).
- Текст: «Dein … stinkt/nervt … Also … Genial! Aber … Also … Glückwunsch! Du hast den/die/das … erfunden.» Около 170 слов, 45–50 с, юмор грубоватый (одно «Scheiße» допустимо).
- В конце абсурдный поворот: у оригинала это атомная станция. Немецкая фишка: «Aber du bist in Deutschland, also schaltest du es wieder ab und stellst ein Windrad hin».
- Темы: бытовые изобретения. Лучше всего зашли Tür (9.3M), Dusche (7.2M), Toilette (3.4M). Немецкие изобретения тоже подходят: Fahrrad (Drais), Dübel, Thermoskanne, Teebeutel, Zahnpastatube, Kühlschrank (Linde).
- Описание: «Wie du den Kühlschrank erfunden hast 🥶 …» + `#erfindungen #wiedueserfundenhast …`.

Описание к посту строится так: 1–2 строки, перечисление частей и вопрос в конце. К нему 5 хештегов, последний всегда серийный `#wiesgebautwird`.
Пример для 02: «Von der Holzhütte auf dem Hügel zur echten Ritterburg 🏰 Mauer, Zinnen, Burggraben, Zugbrücke, Türme und Bergfried: jedes Teil hatte einen Grund. Welches hättest du zuerst gebaut? 👇» `#ritterburg #mittelalter #burg #geschichte #wiesgebautwird`

Идеи на следующие ролики (немецкие или исторические темы заходят лучше всего):
- Autobahn: Feldweg → Frostschutzschicht → Asphalt → Leitplanke → Lärmschutzwand;
- Fachwerkhaus;
- Schleuse;
- U-Bahn;
- Oktoberfest-Zelt;
- Windrad;
- Bunker / Luftschutzkeller;
- Wasserturm.

## 3. Структура папки
```
youbuiltit_de/
  CLAUDE.md          этот файл
  START_HERE.md      для людей: как начать
  setup.sh           установка (npm three, проверка ffmpeg/playwright)
  lumean.py          клиент озвучки Lumean (preview / order / resume / template)
  tighten.py         ужимает паузы: voice/result.mp3 -> voice_fast.mp3 + alignment_fast.csv
  make_words.py      alignment_fast.csv -> words.json (тайминги слов для движка)
  NN_тема/
    script_de.txt    текст озвучки (без кавычек!), по предложению в строке
    voice/           result.mp3, voice_fast.mp3, alignment*.csv, subtitles, order_id
    words.json       [слово, start, end] по voice_fast
    DE_NN_тема.mp4   готовое видео с голосом
  engine/
    lib.js           общая часть: рендерер, небо, свет, текстуры (земля, трава, бетон...), wbox, tree, house, rock, pipe, arrow
    keller_main.js   таймлайн ролика 01, собирается: cat lib.js keller_main.js > keller.js
    burg_main.js     таймлайн ролика 02:  cat lib.js burg_main.js hq_layer.js > burg.js
    hq_layer.js      «HQ»-вид: фото-текстуры (камень, дерево, солома, детали травы), HDRI-освещение, ambient occlusion (GTAO).
                     Дописывается в конец сборки. ?hq=0 в адресе выключает его, ?ao=0 выключает только AO. Сравнение: hq_compare_burg.jpg
    assets/          текстуры и HDRI с Poly Haven (CC0, без указания авторства)
    index_*.html     страница (importmap на node_modules/three), грузит собранный *.js
    render.js        Playwright + ffmpeg: стоп-кадры или видео без звука
    kuehl_main.js    таймлайн ролика 04 (риг пещерного человека, сезоны, ящик-холодильник)
    render_video.sh  ./render_video.sh <name> <NN_тема>: сборка, рендер кусками по 10 с (3 параллельно, с докачкой), склейка, звук
    render_burg.sh   старый вариант того же только для 02
youbuiltit_frames/   первый разбор оригинала: кадры @youbuiltit, воссозданные в three.js
```

## 4. Конвейер нового ролика (NN_тема)
1. **Тема и текст.** Предложи 3–5 тем и согласуй одну. Напиши `NN_тема/script_de.txt` по формату из раздела 1 и `script_ru.txt` с переводом для заказчицы. Факты проверь. Кавычек в тексте быть не должно.
2. **Озвучка.** Ключ берётся только из `LUMEAN_API_KEY` (см. раздел 6).
   ```bash
   cd youbuiltit_de
   python3 lumean.py preview NN_тема/script_de.txt            # бесплатно, показывает разбиение
   python3 lumean.py order   NN_тема/script_de.txt NN_тема/voice   # платно (копейки), ждёт и скачивает
   python3 tighten.py NN_тема/voice 0.2                       # 67 с -> ~60 с
   python3 make_words.py NN_тема                              # words.json + начала предложений
   ```
   Если соединение оборвалось, запусти `python3 lumean.py resume NN_тема/voice`: заказ не теряется.
   Проверь, что голос ничего не съел. Для этого прогони voice_fast.mp3 через faster-whisper (модель `small`, `language='de'`). Аудио нужно подавать numpy-массивом через `ffmpeg -f f32le`, иначе PyAV падает.
3. **Сцена.** Скопируй `engine/burg_main.js` в `engine/NN_main.js` и поменяй:
   - путь `fetch('../NN_тема/words.json')`;
   - объекты сцены;
   - объект `tw`, где хранятся времена слов;
   - `KEYS`, ключевые кадры камеры: `[время, позиция, точка взгляда]`;
   - `update(t)`.
   Затем создай `index_NN.html` (копия `index_burg.html` с другим .js) и собери: `cat lib.js NN_main.js > NN.js`.
   Полезные приёмы:
   - `gbox` + `growTo`: коробка растёт вверх;
   - `pop(t, a)`: появление с пружинкой;
   - `ease(t, a, b)` и `win(t, a, b)`: плавный переход и окно видимости;
   - `InstancedMesh` для сотен одинаковых объектов;
   - `label('3 m')`: жёлтая подпись-спрайт;
   - ночь делается подменой `scene.background` и снижением света и exposure;
   - огонь: конусы `MeshBasicMaterial`, дым: полупрозрачные сферы.
4. **Проверка кадрами (обязательно, до полного рендера).**
   ```bash
   (cd youbuiltit_de && python3 -m http.server 8766 &)        # сервер должен работать во время рендера
   cd youbuiltit_de/engine
   PAGE=index_NN.html node render.js stills 1,5,10,15,20,...  # -> frames/still_<t>.jpg, ~2 с на кадр
   GPU=1 PAGE=index_NN.html node render.js stills 1,5,10,...   # на машине с видеокартой: 0.4-0.5 с на кадр
   ```
   `GPU=1` запускает Chromium через ANGLE/D3D11 на настоящей видеокарте вместо программного SwiftShader.
   Кадры при этом попиксельно те же, а рендер быстрее примерно в 7 раз (проверено на RTX 3060, ролик 02).
   Склей 10–20 кадров в контактный лист (PIL) и посмотри на него. Типичные проблемы:
   - камера влетает в стражников или стены;
   - объекты видны раньше времени;
   - подписи уезжают за край кадра;
   - ничего не происходит на ключевом слове.
5. **Полный рендер.** Это 2.5–4 с на кадр, то есть около 1800 кадров, 30–60 минут при параллельной работе.
   `cd engine && ./render_video.sh NN NN_тема`. Скрипт сам собирает `NN.js` и `index_NN.html`, а рендер идёт кусками в `engine/chunks/`.
   Если контейнер перезапустился, просто запусти скрипт снова: готовые куски не пересчитываются.
   Если скрипт повис после рендера на `wait`, склей вручную (последние 3 команды скрипта).
   Финальное кодирование делается так: `-crf 21 -preset slow -af apad -shortest`, тогда звук не обрезает конец видео, а файл весит около 50 МБ.
5a. **Субтитры отдельным слоем (для всех новых роликов).** Положи в папку ролика `captions.json`:
   ```json
   { "style": "word", "y": 1450, "size": 96, "color": "#ffffff", "hi": "#5ff0ff", "keys": ["Momo"], "hide": [["Folg", 2]] }
   ```
   - `style`: `word` (одно слово, как у канала) или `phrase` (фраза до 3 слов, текущее слово выделено);
   - `y`: высота на экране; `keys`: слова цветом `hi`; `show`: замены вида `{"hundert": "100"}`;
   - `hide`: с этого слова и до конца без субтитров (финальная карточка); `moves`: `[[["Folgst",1],["Zusammen",1],1400]]` другая высота между двумя словами.
   Тогда `render_video.sh` рендерит сцену с `?nocap=1` (сцена должна пропускать свои субтитры при `nocap`), а субтитры
   идут отдельной страницей `captions.html?dir=NN_тема` (прозрачные PNG → `chunks/<name>_cap.mov`, около минуты) и накладываются ffmpeg.
   Поменял субтитры → просто запусти `./render_video.sh` ещё раз: сцена берётся из готовых кусков, пересчитывается только слой.
6. **Сдача.** Проверь длительность и 12 кадров из готового mp4. Отправь видео, пришли описание и 5 хештегов. Закоммить mp4, исходники и озвучку и запушь.

## 4a. Смотреть сцену Blender живьём
`blender/view.bat` (двойной клик) или:
```bash
cd youbuiltit_de/blender
"C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" --python view.py -- castle_test.py CYCLES 32 GPU
```
Открывает окно Blender с построенной сценой и следит за файлом: сохранил правку — сцена пересобралась сама.
В PowerShell путь в кавычках надо звать через `&`, а `--` прятать за `--%`, иначе он ругается на Unexpected token.

Как это устроено (и почему не проще):
- скрипт сцены выполняется без хвоста с рендером (всё от строки `t0 = time.time()` отрезается);
- таймер Blender работает без контекста окна, поэтому `bpy.context.object` в сценах падает. `view.py` подсовывает
  настоящие window/area/region через `temp_override`;
- `read_factory_settings()` из таймера освобождает то самое окно, в котором мы стоим, и Blender падает с
  EXCEPTION_ACCESS_VIOLATION. Поэтому в смотрелке эта строка подменяется на свою очистку данных,
  а картинки не выгружаются: перезагружать текстуры Poly Haven на каждое сохранение слишком долго.

## 5. Грабли, на которые уже наступали
- HQ-слой рендерит 6–9 с на кадр вместо 2.5–4 с: полный ролик идёт примерно вдвое дольше. Слой рассчитан на переменные сцены 02
  (stoneMat, towerMat, woodMat, terrMat, tGrass, daySky — `let`). Для новой сцены называй материалы так же или поправь слой.
- HDRI как фон в вертикальном кадре выглядит серым, поэтому фоном остаётся нарисованное небо (`?bg=1.5` включит HDRI-фон).
- В alignment Lumean бывают склеенные слова через точку, например `Sommergewitter.Die`. `make_words.py` их разделяет.
- В `lib.js` уже есть глобальные `P` (бассейн), `W`, `H`, `M`, `sun`, `fill`. Не объявляй их заново, иначе страница молча не загрузится и рендер упадёт по таймауту через 5 минут. Проверить конфликты можно так: `comm -12 <(grep -oE "^(const|let|function) +\w+" lib.js | awk '{print $NF}' | sort -u) <(grep -oE "^(const|let|function) +\w+" NN_main.js | awk '{print $NF}' | sort -u)`.
- `T('Tür')` находит и «Türme», поэтому для нужного вхождения передавай номер: `T('Tür', 2)`. То же с `Leiter`/`Leitern`, `hochziehen`/`hochziehst`. Неверный номер ломает тайминг молча, так что проверяй стоп-кадрами.
- SwiftShader (headless Chromium без GPU) работает медленно. Не увлекайся сегментами геометрии: рельеф 256×256 ещё нормально, деревьев не больше примерно 30.
  На домашней машине с видеокартой это ограничение снимается: `GPU=1` (см. шаг 4), 0.4-0.5 с на кадр.
- Windows: `setup.sh` рассчитан на bash и `python3`. Вручную это `npm install` и `npm install playwright` в `engine/`,
  `npx playwright install chromium`, `python -m pip install numpy pillow`. Git, Node LTS, Python 3 и ffmpeg ставятся через winget.
  Файл-сервер: `cd youbuiltit_de && python -m http.server 8766 &` — он должен работать во время рендера.
- Трава: фото-текстура на плоскости на любом расстоянии усредняется в заливку. Настоящие травинки — `L.scatter()`
  (волосяные частицы с объектом-инстансом). Стоит около 2 с на кадр, то есть +1 час на ролик, поэтому есть `GRASS=0`.
- Частицы на холме с `use_modifier_stack` сеются и по стенкам тоннеля, который вырезан булевой операцией:
  трава росла внутри пещеры. Лечится группой вершин с нулевым весом вокруг входа (`vertex_group_density`).
- Mixamo отдаёт FBX в сантиметрах, и `obj.dimensions` у мешей, привязанных к арматуре, мерит в единицах файла.
  Человек ростом 1.75 м получался девятиметровым и уходил из кадра, оставляя в нём только свою тень.
  Рост подгоняем по мировому bounding box (`matrix_world @ bound_box`) после `view_layer.update()`.
- `show()` раньше затирал масштаб импортированной модели. Теперь масштаб из импорта хранится в `root['base_scale']`,
  и `show()` на него умножает. Для анимаций ходьбы и толкания в Mixamo включаем **In Place**: позицию двигает сцена.
- Кадры в видео первые 60 штук рендерятся медленнее (около 6 с на кадр), дальше 2.5–4 с.
- `render_video.sh` раньше склеивал старые куски с новым голосом, если сцену или озвучку меняли после рендера. Теперь в `chunks/<name>.hash` хранится хеш сцены и `words.json`; если он другой, старые куски удаляются сами.
- Фоновые задачи в облачной сессии живут не дольше 2 часов, а контейнер может перезапуститься. Поэтому рендер всегда идёт кусками с докачкой.
- `node_modules/`, `frames/`, `chunks/`, `*.mp4` в `engine/` и собранные `keller.js`/`burg.js` в git не идут. После клона запусти `bash setup.sh`.

## 6. Ключи и секреты
- **Ключ Lumean не кладём никуда:** ни в файлы, ни в коммиты, ни в чат. Он берётся только из переменной окружения `LUMEAN_API_KEY`.
  В облачной сессии его добавляют в секреты окружения (environment variables).
- **Вариант через Network secrets (так сейчас настроено в окружении «full»):** ключ сохранён как сетевой секрет для `api.lumean.app`
  (заголовок `X-API-KEY`), и прокси сам подставляет его в запросы. Переменной с ключом при этом нет,
  поэтому скрипты запускай с заглушкой: `LUMEAN_API_KEY=proxy-injected python3 lumean.py ...`. Прокси заменит заголовок настоящим ключом.
  Если в чат вставили ключ, не используй его, а попроси сохранить через форму секретов (request_credential).
- Шаблон голоса привязан к аккаунту Lumean. ID по умолчанию в `lumean.py` есть только на аккаунте Насти.
  С другим ключом сначала выполни `python3 lumean.py template` (бесплатно) и потом `export LUMEAN_TEMPLATE=<id>`.
- Перед коммитом проверь: `git grep -n "X-API-KEY\|LUMEAN_API_KEY=" -- ':!*.md'` не должен находить ключей.

## 7. Как смотреть TikTok-аккаунт (оригинал или конкуренты)
```bash
python3 -m venv .venv && .venv/bin/pip install yt-dlp curl_cffi
.venv/bin/yt-dlp --impersonate chrome --flat-playlist -J https://www.tiktok.com/@youbuiltit > list.json    # список: id, title, view_count
.venv/bin/yt-dlp --impersonate chrome -o '%(id)s.mp4' https://www.tiktok.com/@youbuiltit/video/<id>
ffmpeg -i <id>.mp4 -vf "fps=1,scale=270:-1,tile=6x4" -frames:v 1 sheet.jpg                              # контактный лист
```
Текст ролика можно снять faster-whisper. Средний темп оригинала 3.92 слова в секунду при длительности около 66 с.
