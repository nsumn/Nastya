# Как собрать комментарии TikTok для нового ролика

Инструкция для Claude в новой сессии (или для человека). Всё делается без входа в аккаунт, через открытый веб-интерфейс TikTok.

**Правило:** ники и фото комментаторов в git не кладём. Они лежат только локально, в файлах, которые занесены в `.gitignore`. В свежей сессии их нужно собрать заново.

## 0. Подготовка (один раз за сессию)
```bash
cd youbuiltit_de
bash setup.sh
rm -rf engine/node_modules/playwright engine/node_modules/playwright-core   # setup ставит свой playwright, он не видит встроенный браузер
git checkout -- engine/package-lock.json
python3 -m venv .venv && .venv/bin/pip install -q yt-dlp curl_cffi pillow pillow-heif
```

## 1. Аккаунты
| Аккаунт | Ник | Язык |
|---|---|---|
| Mimi | `deweywycfy5` | de |
| Flocke | `eabu3lzksps0n9cp` | de |
| Momo | `3dzebra` | de |
| Kiki | `lovelpojkzk` | ko |

## 2. Список роликов и число подписчиков
```bash
cd youbuiltit_de && mkdir -p /tmp/tt
H=3dzebra
.venv/bin/yt-dlp --impersonate chrome --flat-playlist -J https://www.tiktok.com/@$H > /tmp/tt/list.json
python3 -c "
import json,datetime;d=json.load(open('/tmp/tt/list.json'))
for e in d['entries']: print(e['id'], datetime.datetime.fromtimestamp(e['timestamp'],datetime.UTC).strftime('%m-%d %H:%M'), e.get('view_count'), e.get('comment_count'), (e.get('title') or '')[:70])"
# число подписчиков:
.venv/bin/python -I -c "
from curl_cffi import requests;import re
r=requests.get('https://www.tiktok.com/@$H',impersonate='chrome',timeout=30)
print(re.search('\"followerCount\":(\d+)',r.text).group(1))"
```
Первая колонка — это `video_id`, она нужна на следующем шаге. Время в списке UTC, по Германии +1 час.

## 3. Комментарии к ролику
```bash
python3 tools/fetch_comments.py <video_id> /tmp/tt/c.json     # все комментарии, листает по 50
python3 tools/fetch_replies.py  <video_id>                     # ответы на комментарии -> replies.json
```
Каждый комментарий сохраняется в формате `{cid, nick, uid, text, likes, replies, images}`. Здесь `uid` — @-ник, `images` — ссылки на прикреплённые фото.
Если комментариев заметно меньше, чем показывает TikTok, запусти скрипт ещё раз и объедини результаты по `cid`.

Быстрый просмотр, топ по лайкам:
```bash
python3 -c "
import json;c=json.load(open('/tmp/tt/c.json'));print(len(c))
for x in sorted(c,key=lambda x:-(x['likes'] or 0))[:60]: print(x['likes'],'|',x['uid'],'|',(x['text'] or '')[:90],'| img' if x['images'] else '')"
```

## 4. Фото питомцев → нарисованные котята
1. Скачай фото в локальную папку ролика: `NN_папка/photos/` (она в `.gitignore`).
2. Конвертируй в JPG: фото бывают HEIC и WebP. `pillow_heif.register_heif_opener()` и `Image.open(...).convert('RGB')`, обрезка до квадрата 400×400.
3. Собери контактный лист и посмотри, кто на фото. Подбери ближайший окрас из `LOOKS`: `black`, `tabby`, `silver`, `calico`, `golden`, `gingerwhite`, `white`, `tuxedo`, `siamese`…
4. Ники и роли запиши в `NN_папка/roles.json` (он тоже в `.gitignore`). Сцена грузит его через `fetch`, а без файла показывается без ников. Пример: `engine/momo8_2d.js`, функции `ROLES`, `PET`, `petCard`.

## 5. Что берём в ролик
- Ответы на призыв прошлой серии: «Fischer», «Kiosk», «냥» и так далее. По ним даём роли (работа, должность) и показываем ник на экране.
- Фото питомцев: питомец «переезжает» на остров или в переулок и превращается в нарисованного котёнка.
- Самые залайканные идеи: их «строим» в серии.
- Первый, кто выполнил призыв: награда («냥민등록증 №1», «Kätzchen Nr. 1»).

## 6. Чего так не получить
- Закрытые аккаунты и приватные ролики.
- Статистику аккаунта (Kontostatus, Traffic-Quellen, тень). Её смотрит только владелец в приложении, нужны скриншоты.
- Совсем свежие комментарии иногда приходят с опозданием на несколько минут.

## 7. После сборки
- mp4 с вшитыми никами и фото в git не коммитим: добавь его в `.gitignore`, как `28_momo_tag2/DE_28_momo_tag2.mp4`.
- Перед коммитом сцены проверь, что в коде нет ников: `grep -n "@" engine/<scene>_2d.js`.
