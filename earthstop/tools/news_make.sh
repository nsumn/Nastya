#!/bin/bash
# One command for the US news-map videos (Nov 11 2026: "be first" — the same-topic hits went out within hours of the event).
# Usage (from earthstop/):  bash tools/news_make.sh <name> <parts_dir> <stage> [fps]
#   <name>       out/<name>/ holds vo.txt, voice, mixes, frames, the mp4
#   <parts_dir>  e.g. parts_surv  (needs <x>_times.js target, *_main.js, tools/<name>_cues.mjs writing <parts_dir>/cues.txt)
#   stages: voice | timing | build | test | render | audio | compose | all      fps default 60 (v5 rule; 30 halves the render time)
# Steps it runs: Lumean Drew voice → word timing (silences cut to 0.14 s) → scene cat + node --check → test frames + contact sheet
#                → PASS=scene + PASS=text frames → SFX/music bed + voice, loudnorm −14 → compose.sh → contact sheet of the mp4.
set -e
cd "$(dirname "$0")/.."
N=$1; P=$2; ST=${3:-all}; FPS=${4:-60}
[ -n "$N" ] && [ -d "$P" ] || { echo "usage: bash tools/news_make.sh <name> <parts_dir> <stage> [fps]"; exit 1; }
X=$(basename "$P" | sed 's/^parts_//'); MAIN=$(ls $P/*_main.js | head -1); TIMES=$(ls $P/*_times.js 2>/dev/null | head -1); TIMES=${TIMES:-$P/${X:0:1}_times.js}
D=out/$N; mkdir -p $D
curl -s -o /dev/null http://127.0.0.1:8765/ || bash setup.sh > /dev/null 2>&1
run() { echo "== $1"; }
if [ $ST = voice ] || [ $ST = all ]; then run voice; VOICE=drew SPEED=1.1 python3 tools/news_voice.py $N $D/vo.txt; fi
if [ $ST = timing ] || [ $ST = all ]; then run timing; TRIMHEAD=1 MAXGAP=0.14 OUTJS=$TIMES python3 tools/news_timing.py $N 0.0 ""; fi
if [ $ST = build ] || [ $ST = all ] || [ $ST = test ]; then run build; EXTRA=""; grep -q "addHiPatch\|groundLabel" $MAIN && EXTRA=parts_map2/m5_hi.js
  cat parts_day/y_head.js $TIMES parts_map2/m3_map.js $EXTRA $MAIN > scene_$X.js && node --check scene_$X.js && echo "scene_$X.js ok"; fi
if [ $ST = test ] || [ $ST = all ]; then run test; LEN=$(node -e "const s=require('fs').readFileSync('$TIMES','utf8');console.log(Math.floor(+s.match(/VO_END = ([0-9.]+)/)[1]))")
  TT=$(python3 -c "print(','.join(str(round(x*$LEN/14,1)) for x in range(14)))"); rm -rf $D/test; PAGE=index_$X.html node render.mjs $D/test 0 1 30 "$TT" | tail -1
  ffmpeg -v error -y -i $D/test/f_%05d.jpg -vf scale=270:480,tile=7x2 $D/test_sheet.jpg && echo "look at $D/test_sheet.jpg"; fi
if [ $ST = render ] || [ $ST = all ]; then run render; END=$(node -e "const s=require('fs').readFileSync('$MAIN','utf8');const t=require('fs').readFileSync('$TIMES','utf8');const v=+t.match(/VO_END = ([0-9.]+)/)[1];console.log((v+0.35+4.9).toFixed(2))")
  rm -rf $D/scene $D/text; PASS=scene PAGE=index_$X.html node render.mjs $D/scene 0 $END $FPS | tail -1; PASS=text PAGE=index_$X.html node render.mjs $D/text 0 $END $FPS | tail -1; fi
if [ $ST = audio ] || [ $ST = all ]; then run audio; [ -f tools/${N}_cues.mjs ] && node tools/${N}_cues.mjs; END=$(ls $D/scene | wc -l); END=$(python3 -c "print(round($END/$FPS,2))")
  python3 tools/mix_sfx.py out/nwaudio $D/bed.wav $END $P/cues.txt
  python3 - "$D" "$END" <<'EOF'
import sys, numpy as np, scipy.io.wavfile as wf
D, L = sys.argv[1], float(sys.argv[2]); sr, v = wf.read(D + '/voice.wav'); v = v.astype(np.float32) / 32768
if v.ndim == 1: v = np.stack([v, v], 1)
_, b = wf.read(D + '/bed.wav'); b = b.astype(np.float32) / 32768; n = max(len(v), len(b)); m = np.zeros((n, 2), np.float32); m[:len(v)] += v; m[:len(b)] += b * 0.27
m = m[:int(L * sr)]; m /= max(1, np.abs(m).max() / 0.98); wf.write(D + '/mix_raw.wav', sr, (m * 32767).astype(np.int16))
EOF
  ffmpeg -v error -y -i $D/mix_raw.wav -af loudnorm=I=-14:TP=-1.5:LRA=11 -ar 44100 $D/mix.wav; echo "mix ok"; fi
if [ $ST = compose ] || [ $ST = all ]; then run compose; (cd $D && sed "s/-framerate 30/-framerate $FPS/g; s/3300k/$([ $FPS -ge 50 ] && echo 4500k || echo 3300k)/g" ../../compose.sh > compose_fps.sh && bash compose_fps.sh scene text mix.wav $N.mp4)
  ffmpeg -v error -y -i $D/$N.mp4 -vf "fps=1/3,scale=216:384,tile=10x2" -frames:v 1 $D/final_sheet.jpg && echo "done: $D/$N.mp4 (check $D/final_sheet.jpg)"; fi
