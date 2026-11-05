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
    render_burg.sh   рендер кусками по 10 с, 3 параллельно, с докачкой; затем склейка и звук
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
   Скопируй `render_burg.sh` и поменяй в нём `PAGE`, путь к words.json и имена. Рендер идёт кусками в `engine/chunks/`.
   Если контейнер перезапустился, просто запусти скрипт снова: готовые куски не пересчитываются.
   Если скрипт повис после рендера на `wait`, склей вручную (последние 3 команды скрипта).
   Финальное кодирование делается так: `-crf 21 -preset slow -af apad -shortest`, тогда звук не обрезает конец видео, а файл весит около 50 МБ.
6. **Сдача.** Проверь длительность и 12 кадров из готового mp4. Отправь видео, пришли описание и 5 хештегов. Закоммить mp4, исходники и озвучку и запушь.

## 5. Грабли, на которые уже наступали
- HQ-слой рендерит 6–9 с на кадр вместо 2.5–4 с: полный ролик идёт примерно вдвое дольше. Слой рассчитан на переменные сцены 02
  (stoneMat, towerMat, woodMat, terrMat, tGrass, daySky — `let`). Для новой сцены называй материалы так же или поправь слой.
- HDRI как фон в вертикальном кадре выглядит серым, поэтому фоном остаётся нарисованное небо (`?bg=1.5` включит HDRI-фон).
- В alignment Lumean бывают склеенные слова через точку, например `Sommergewitter.Die`. `make_words.py` их разделяет.
- `T('Tür')` находит и «Türme», поэтому для нужного вхождения передавай номер: `T('Tür', 2)`. То же с `Leiter`/`Leitern`, `hochziehen`/`hochziehst`. Неверный номер ломает тайминг молча, так что проверяй стоп-кадрами.
- SwiftShader (headless Chromium без GPU) работает медленно. Не увлекайся сегментами геометрии: рельеф 256×256 ещё нормально, деревьев не больше примерно 30.
  На домашней машине с видеокартой это ограничение снимается: `GPU=1` (см. шаг 4), 0.4-0.5 с на кадр.
- Windows: `setup.sh` рассчитан на bash и `python3`. Вручную это `npm install` и `npm install playwright` в `engine/`,
  `npx playwright install chromium`, `python -m pip install numpy pillow`. Git, Node LTS, Python 3 и ffmpeg ставятся через winget.
  Файл-сервер: `cd youbuiltit_de && python -m http.server 8766 &` — он должен работать во время рендера.
- Кадры в видео первые 60 штук рендерятся медленнее (около 6 с на кадр), дальше 2.5–4 с.
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
