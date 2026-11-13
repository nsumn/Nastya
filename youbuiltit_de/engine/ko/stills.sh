#!/bin/bash
# ko/stills.sh <name> <times>  -> scratchpad sheet_<name>.jpg
cd "$(dirname "$0")/.."
./ko/build.sh $1 && cat lib.js $1_main.js > $1.js
pgrep -f "http.server 8766" >/dev/null || { (cd .. && setsid nohup python3 -m http.server 8766 >/dev/null 2>&1 < /dev/null &); sleep 1; }
PAGE=index_$1.html timeout 900 node render.js stills $2 2>&1 | grep -iv "^still" | tail -3
python3 - "$2" "$1" <<'PY'
import sys
from PIL import Image, ImageDraw
ts=sys.argv[1].split(','); W,H=270,480; cols=6; rows=(len(ts)+cols-1)//cols
sh=Image.new('RGB',(W*cols,H*rows))
for i,t in enumerate(ts):
    try: im=Image.open(f'frames/still_{t}.jpg').resize((W,H))
    except Exception: continue
    d=ImageDraw.Draw(im); d.text((6,6),t,fill='yellow'); sh.paste(im,((i%cols)*W,(i//cols)*H))
sh.save(f'/tmp/claude-0/-home-user/ceca219e-4873-5b1b-9907-a4607cb830a7/scratchpad/sheet_{sys.argv[2]}.jpg',quality=85)
PY
