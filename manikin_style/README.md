# Манекены в стиле psyamour (наша версия)

Основа — 3D-конвейер `tiktok_de/clay` (three.js, Playwright), сюда скопирован с режимом `mono=1`:
фигуры-манекены из капсул в одежде (она — розовый свитер, джинсы; он — шалфейный свитер, брюки), белые лицо и руки, на том же скелете (`buildManikin` в `lib/figure.js`), простые лица,
у неё пучок, тёмная серо-синяя квартира, субтитры сверху капсом.

```bash
cd manikin_style/clay && npm install
MONO=1 CAPS='{"sofa":"Eine Frau, die keine Nähe mehr bekommt,"}' NODE_PATH=$(npm root -g) node still.js ../out sofa
```
(для шрифта субтитров нужен `tiktok_de/render/fonts` рядом — см. ветку festive-lovelace.)
Скорость: ~10 с на кадр 1080×1920 в облаке без GPU.

## v3 (`frames_dress/`)
Цельное «лепное» тело (SDF, без швов), она в платье до колена с длинными рукавами, волосы с пучком, он в шалфейном свитере.
