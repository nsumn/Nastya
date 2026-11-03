#!/bin/bash
# Resumable castle render: 10 s chunks, 3 in parallel; finished chunks are kept across restarts.
cd "$(dirname "$0")"
pgrep -f "http.server 8766" >/dev/null || (cd .. && nohup python3 -m http.server 8766 >/dev/null 2>&1 &)
sleep 1
END=$(python3 -c "import json;w=json.load(open('../02_burg/words.json'));print(round(w[-1][2]+.7,3))")
mkdir -p chunks
run() { local a=$1 b=$2 f=chunks/burg_$(printf %02d $1).mp4
  [ -f "$f" ] && return
  PAGE=index_burg.html node render.js video "$f.tmp.mp4" 30 $a $b > chunks/log_$a.txt 2>&1 && mv "$f.tmp.mp4" "$f"; }
starts=(0 10 20 30 40 50)
for i in "${!starts[@]}"; do a=${starts[$i]}; b=$((a+10)); [ $a -eq 50 ] && b=$END
  run $a $b & while [ $(jobs -rp | wc -l) -ge 3 ]; do sleep 5; done; done
wait
ls chunks/burg_*.mp4 | grep -v tmp | sed "s/^/file '/;s/$/'/" > burg_list.txt
[ $(wc -l < burg_list.txt) -eq 6 ] || { echo "missing chunks"; exit 1; }
ffmpeg -y -v error -f concat -safe 0 -i burg_list.txt -c copy burg_noaudio.mp4 &&
ffmpeg -y -v error -i burg_noaudio.mp4 -i ../02_burg/voice/voice_fast.mp3 -map 0:v -map 1:a -c:v libx264 -crf 21 -preset slow -pix_fmt yuv420p -movflags +faststart -af apad -c:a aac -b:a 192k -shortest ../02_burg/DE_02_burg.mp4 &&
ffprobe -v error -show_entries format=duration -of csv=p=0 ../02_burg/DE_02_burg.mp4 && echo DONE
