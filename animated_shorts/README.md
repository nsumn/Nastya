# Анимированные шорты (three.js + Remotion)

Навык `cartoon-3d-short` из https://github.com/mromidev/claude-animated-shorts (MIT) лежит в `.claude/skills/cartoon-3d-short/`
(без чужих кадров-референсов: они только для личного изучения). Этот проект — рабочая сборка его примера (мост).

```bash
cd animated_shorts && npm install
npx tsc --noEmit
# кадры (в облаке без GPU нужен короткий TMPDIR и software GL):
TMPDIR=/tmp/rt CHROME=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome node scripts/bridge-stills.mjs out/b_ 100,700,1500 0.5
# видео:
npx remotion render src/index.ts BridgeShort out/video.mp4 --codec h264 --crf 16 --scale 1.3333
```

Скорость: в облачной сессии без видеокарты ~1 мин на кадр (software WebGL). На ПК с видеокартой — ~4 кадра/с в 2K (по README автора).
`preview/` — три кадра примера, отрендеренные здесь.
