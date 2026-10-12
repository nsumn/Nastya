#!/bin/bash
# usage: compose.sh <sceneDir(jpg)> <textDir(png)> <audio.wav> <out.mp4>
set -e
SC=$1; TX=$2; AU=$3; OUT=$4
ffmpeg -v error -y -framerate 30 -i $SC/f_%05d.jpg -framerate 30 -i $TX/f_%05d.png -i $AU -filter_complex "[0][1]overlay=format=auto,format=yuv420p[v]" -map "[v]" -c:v libx264 -preset slow -b:v 3300k -pass 1 -an -f mp4 /dev/null
ffmpeg -v error -y -framerate 30 -i $SC/f_%05d.jpg -framerate 30 -i $TX/f_%05d.png -i $AU -filter_complex "[0][1]overlay=format=auto,format=yuv420p[v]" -map "[v]" -map 2:a -c:v libx264 -preset slow -b:v 3300k -pass 2 -c:a aac -b:a 160k -shortest -movflags +faststart $OUT
ls -la $OUT
