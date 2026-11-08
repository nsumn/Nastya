#!/bin/bash
# Resumable render of any video:  ./render_video.sh <name> <video_dir>
#   e.g. ./render_video.sh kuehl 04_kuehlschrank   -> builds kuehl.js from lib.js + kuehl_main.js,
#   renders 10 s chunks (3 in parallel) into chunks/<name>_NN.mp4 (finished chunks survive restarts),
#   then concatenates and muxes ../<video_dir>/voice/voice_fast.mp3 into ../<video_dir>/DE_<video_dir>.mp4
#   If ../<video_dir>/captions.json exists, the scene is rendered with ?nocap=1 and the captions are a separate
#   transparent layer (captions.html, ~1 min) overlaid at the end: re-running after a caption change re-renders only that layer.
set -e
cd "$(dirname "$0")"
NAME=$1; DIR=$2; [ -n "$NAME" ] && [ -n "$DIR" ] || { sed -n 2,5p "$0"; exit 1; }
if [ -f ${NAME}_2d.js ]; then cp ${NAME}_2d.js ${NAME}.js   # 2D canvas scene (no three.js)
else cat lib.js ${NAME}_main.js $( [ -f ${NAME}_hq.js ] && echo ${NAME}_hq.js ) > ${NAME}.js; fi   # optional HQ layer
[ -f index_${NAME}.html ] || sed "s/keller.js/${NAME}.js/" index_keller.html > index_${NAME}.html
pgrep -f "http.server 8766" >/dev/null || { (cd .. && setsid nohup python3 -m http.server 8766 >/dev/null 2>&1 < /dev/null &); sleep 1; }
END=$(python3 -c "import json;w=json.load(open('../$DIR/words.json'));print(round(w[-1][2]+${TAIL:-1.8},3))")
CAP=../$DIR/captions.json; QS=""; [ -f $CAP ] && QS="?nocap=1"
mkdir -p chunks
# finished chunks are reused only while the scene and the voice timing are unchanged
HASH=$(cat ${NAME}.js ../$DIR/words.json | md5sum | cut -c1-16)
[ "$(cat chunks/${NAME}.hash 2>/dev/null)" = "$HASH" ] || { rm -f chunks/${NAME}_[0-9]*.mp4; echo "$HASH" > chunks/${NAME}.hash; }
pids=()
for a in $(seq 0 10 $(python3 -c "print(int($END))")); do
  b=$((a+10)); python3 -c "import sys;sys.exit(0 if $b<$END else 1)" || b=$END
  python3 -c "import sys;sys.exit(0 if $b-$a>=0.2 else 1)" || continue   # skip a tail chunk too short for one frame
  f=chunks/${NAME}_$(printf %02d $a).mp4; [ -f "$f" ] && continue
  ( PAGE=index_${NAME}.html$QS node render.js video "$f.tmp.mp4" 30 $a $b > chunks/${NAME}_log_$a.txt 2>&1 && mv "$f.tmp.mp4" "$f" ) &
  pids+=($!)
  while [ $(jobs -rp | wc -l) -ge 3 ]; do sleep 5; done
done
for p in "${pids[@]}"; do wait $p; done
(cd chunks && ls ${NAME}_[0-9]*.mp4) | grep -v tmp | sed "s/^/file '/;s/$/'/" > chunks/${NAME}_list.txt
ffmpeg -nostdin -y -v error -f concat -safe 0 -i chunks/${NAME}_list.txt -c copy chunks/${NAME}_noaudio.mp4
AUDIO=../$DIR/voice/voice_fast.mp3
node dump_sfx.js index_${NAME}.html ../$DIR/sfx.json && [ -f ../$DIR/sfx.json ] && python3 ../sfx.py ../$DIR && AUDIO=../$DIR/voice/mix.mp3   # sound effects + music, if the scene exports window.SFX
VIN=(-i chunks/${NAME}_noaudio.mp4); VMAP=(-map 0:v)
if [ -f $CAP ]; then   # caption layer: transparent frames, overlaid on the clean scene
  DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 chunks/${NAME}_noaudio.mp4)
  ALPHA=1 PAGE="captions.html?dir=$DIR" node render.js video chunks/${NAME}_cap.mov 30 0 $DUR > chunks/${NAME}_cap_log.txt 2>&1
  VIN=(-i chunks/${NAME}_noaudio.mp4 -i chunks/${NAME}_cap.mov); VMAP=(-filter_complex "[0:v][1:v]overlay=0:0[v]" -map "[v]")
fi
ffmpeg -nostdin -y -v error "${VIN[@]}" -i $AUDIO "${VMAP[@]}" -map $([ -f $CAP ] && echo 2 || echo 1):a -c:v libx264 -crf ${CRF:-21} -preset slow -pix_fmt yuv420p -movflags +faststart -af apad -c:a aac -b:a 192k -shortest ../$DIR/DE_$DIR.mp4
ffprobe -v error -show_entries format=duration -of csv=p=0 ../$DIR/DE_$DIR.mp4; echo DONE
