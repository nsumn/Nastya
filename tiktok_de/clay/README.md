# clay: 3D-пластилиновый стиль (эксперимент)

Проба нового вида роликов: пластилиновые 3D-герои в сером мире (three.js), рендер прямо в облачной сессии.
Герои те же, что в канале: она с каштановыми волосами, в пыльно-розовом свитере, с золотыми серёжками; он в шалфейном свитере, со щетиной.
Пока это только стоп-кадры; утверждённый стиль канала остаётся прежним (см. `../CLAUDE.md`), пока его не поменяют оба автора.

- `lib/figure.js`: риг героя (группы-суставы), позы `POSES`, шаг `walk(p)`, лицо `setFace` (брови, веки, рот, слёзы).
  Тело цельное: на каждую позу оно заново «лепится» из сглаженных форм (`lib/sdf.js`, SDF + surface nets), поэтому руки, шея и ноги без швов.
  Цвет одежды по ближайшей форме, с мягким переходом; ровный край свитера задаётся `split`.
- `lib/sets.js`: места (гостиная, кухня, спальня, лестница, улица) и общий свет.
- `lib/shots.js`: пробные кадры (место + герои + поза + лицо + камера).
- `index.html?shot=<имя>`: собирает кадр (GTAO-тени, лёгкая глубина резкости, субтитр по правилам канала).

```bash
cd clay && npm i && cd ..
node clay/still.js out/clay                 # все пробные кадры
node clay/still.js out/clay close,stairs    # только некоторые
```

## Финальный рендер в Blender (Cycles)
Та же сцена (геометрия из three.js) рендерится в Blender: мягкий свет, настоящие тени, матовый «пластилин».
Около 3,5 мин на кадр 1080×1920 при 64 сэмплах на 4 ядрах, поэтому Blender подходит для стоп-кадров (кадр на план + движение камеры в 2D), а не для покадровой анимации.

```bash
# один раз: Blender 4.2 LTS в /opt/blender
mkdir -p /opt/blender && curl -sSL https://download.blender.org/release/Blender4.2/blender-4.2.3-linux-x64.tar.xz | tar -xJ -C /opt/blender
EXPORT=1 node clay/still.js out/clay sofa,close                      # сцены -> out/clay/<shot>.glb
/opt/blender/blender-4.2.3-linux-x64/blender -b -P clay/blender/render_shot.py -- out/clay/sofa.glb out/clay/sofa_bl.png 64
/opt/blender/blender-4.2.3-linux-x64/blender -b -P clay/blender/render_shot.py -- out/clay/close.glb out/clay/close_bl.png 64 night
```
