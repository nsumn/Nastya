#!/bin/bash
# Resumable render of any video:  ./render_video.sh <name> <video_dir>
#   e.g. ./render_video.sh kuehl 04_kuehlschrank   -> builds kuehl.js from lib.js + kuehl_main.js,
#   renders 10 s chunks (3 in parallel) into chunks/<name>_NN.mp4 (finished chunks survive restarts),
#   then concatenates and muxes ../<video_dir>/voice/voice_fast.mp3 into ../<video_dir>/DE_<video_dir>.mp4
set -e
cd "$(dirname "$0")"
NAME=$1; DIR=$2; [ -n "$NAME" ] && [ -n "$DIR" ] || { sed -n 2,5p "$0"; exit 1; }
cat lib.js ${NAME}_main.js $( [ -f ${NAME}_hq.js ] && echo ${NAME}_hq.js ) > ${NAME}.js   # optional HQ layer
[ -f index_${NAME}.html ] || sed "s/keller.js/${NAME}.js/" index_keller.html > index_${NAME}.html
pgrep -f "http.server 8766" >/dev/null || { (cd .. && setsid nohup python3 -m http.server 8766 >/dev/null 2>&1 < /dev/null &); sleep 1; }
END=$(python3 -c "import json;w=json.load(open('../$DIR/words.json'));print(round(w[-1][2]+.7,3))")
mkdir -p chunks
pids=()
for a in $(seq 0 10 $(python3 -c "print(int($END))")); do
  b=$((a+10)); python3 -c "import sys;sys.exit(0 if $b<$END else 1)" || b=$END
  python3 -c "import sys;sys.exit(0 if $b-$a>=0.2 else 1)" || continue   # skip a tail chunk too short for one frame
  f=chunks/${NAME}_$(printf %02d $a).mp4; [ -f "$f" ] && continue
  ( PAGE=index_${NAME}.html node render.js video "$f.tmp.mp4" 30 $a $b > chunks/${NAME}_log_$a.txt 2>&1 && mv "$f.tmp.mp4" "$f" ) &
  pids+=($!)
  while [ $(jobs -rp | wc -l) -ge 3 ]; do sleep 5; done
done
for p in "${pids[@]}"; do wait $p; done
(cd chunks && ls ${NAME}_[0-9]*.mp4) | grep -v tmp | sed "s/^/file '/;s/$/'/" > chunks/${NAME}_list.txt
ffmpeg -y -v error -f concat -safe 0 -i chunks/${NAME}_list.txt -c copy chunks/${NAME}_noaudio.mp4
ffmpeg -y -v error -i chunks/${NAME}_noaudio.mp4 -i ../$DIR/voice/voice_fast.mp3 -map 0:v -map 1:a -c:v libx264 -crf 21 -preset slow -pix_fmt yuv420p -movflags +faststart -af apad -c:a aac -b:a 192k -shortest ../$DIR/DE_$DIR.mp4
ffprobe -v error -show_entries format=duration -of csv=p=0 ../$DIR/DE_$DIR.mp4; echo DONE
