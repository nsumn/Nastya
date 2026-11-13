#!/bin/bash
# ko/finish.sh <name> <video_dir> <OUT.mp4>: render (resumable) -> loudnorm -> commit + push
set -e
cd "$(dirname "$0")/.."
[ -f ko/$1.js ] && ko/build.sh $1
pgrep -f "http.server 8766" >/dev/null || { (cd .. && setsid nohup python3 -m http.server 8766 >/dev/null 2>&1 < /dev/null &); sleep 1; }
CRF=18 ./render_video.sh $1 $2
cd ../$2
ffmpeg -v error -y -i DE_$2.mp4 -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 -ar 44100 -ac 2 -c:a aac -b:a 192k -movflags +faststart /tmp/ko_$1.mp4 && mv /tmp/ko_$1.mp4 $3 && rm DE_$2.mp4
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 $3); echo "duration $D"
cd .. && git add $2/$3 $2/sfx.json $2/voice/mix.mp3 && git commit -qm "$2: final video $3 (${D%.*} s)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019j4rNud77Fi6Gn4EMCUn9G" && for i in 1 2 3 4; do git push -q origin claude/youbuiltit-frames && break; sleep $((i*5)); done
echo FINISHED $3
