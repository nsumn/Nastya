# Фигуры в Blender (стиль les.zamours2)

`bed_pair.py` строит сцену целиком в Blender: мягкие цельные фигуры (Skin + Subdivision), она розовая с волосами
и хвостом, он синий; кровать, подушки, одеяло, ночник, тёмно-синяя комната, Cycles + размытие фона.

```bash
/opt/blender/blender-4.2.3-linux-x64/blender -b -P bed_pair.py -- out.png 32 1.0   # 1080x1920, ~95 с в облаке без GPU
/opt/blender/blender-4.2.3-linux-x64/blender -b -P bed_pair.py -- out.png 24 0.5   # 540x960, ~20 с
```

`figures.py` — лист персонажей: она и он стоя, спереди и сзади (`figures_front.jpg`, `figures_back.jpg`).
