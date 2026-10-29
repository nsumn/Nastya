#!/bin/bash
# Render a project:  ./render.sh <project_dir> <shots_module> <out.mp4>
# e.g.               ./render.sh projects/01_wie_mitbewohner video_shots out/DE_wie_Mitbewohner.mp4
#                    ./render.sh projects/02_tasse shots_tasse out/DE_Tasse_explodiert.mp4
# Takes ~20-30 min for 80 s — run it in the background.
set -e
cd "$(dirname "$0")"
P=$1; SHOTS=$2; OUTMP4=$3
PY=.venv/bin/python; ALIGN=$P/voice/alignment.csv; TMP=$(mktemp -d)
for w in 0 1 2 3; do SHOTS=$SHOTS $PY render/video_v5.py $ALIGN $TMP $w 4 & done; wait
for w in 0 1 2 3; do echo "file '$TMP/part_$w.mp4'"; done > $TMP/list.txt
ffmpeg -v error -y -f concat -safe 0 -i $TMP/list.txt -c copy $TMP/video.mp4
mkdir -p "$(dirname "$OUTMP4")"
# voice + quiet pad, about -15 LUFS, peak about -1 dB
ffmpeg -v error -y -i $TMP/video.mp4 -i $P/voice/result.mp3 -i assets/pad.flac \
  -filter_complex "[2:a]volume=0.10[p];[1:a][p]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-12:TP=-1.0:LRA=11,alimiter=limit=0.79:level=false,aresample=44100[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest "$OUTMP4"
rm -rf $TMP
echo "DONE $OUTMP4"
