#!/usr/bin/env bash
# Разбор чужого TikTok-аккаунта: список видео, топ по просмотрам, скачивание, листы кадров, расшифровка голоса.
# Использование: tools/tiktok_analyze.sh <account> [N_top]   (без @)
# Нужно один раз: python3 -m venv .venv && .venv/bin/pip install yt-dlp curl_cffi faster-whisper numpy pillow
set -euo pipefail
A="$1"; N="${2:-2}"; OUT="out/acc/$A"; mkdir -p "$OUT"
PY=.venv/bin/python; YT=.venv/bin/yt-dlp
$YT --impersonate chrome --flat-playlist -J "https://www.tiktok.com/@$A" > "$OUT/list.json"
$PY -I - "$OUT/list.json" "$N" > "$OUT/top.txt" <<'PY'
import json,sys,datetime
d=json.load(open(sys.argv[1]));e=d['entries'];n=int(sys.argv[2])
ts=[x.get('timestamp') for x in e if x.get('timestamp')]
print(len(e),'videos', datetime.date.fromtimestamp(min(ts)),'->',datetime.date.fromtimestamp(max(ts)),'avg views',sum((x.get('view_count') or 0) for x in e)//len(e), file=sys.stderr)
for x in sorted(e,key=lambda x:-(x.get('view_count') or 0))[:n]: print(x['id'])
PY
for id in $(cat "$OUT/top.txt"); do
  $YT -q --impersonate chrome -o "$OUT/$id.%(ext)s" "https://www.tiktok.com/@$A/video/$id"
  ffmpeg -v error -y -i "$OUT/$id.mp4" -vf "fps=1/2.5,scale=200:-1,tile=9x3" -frames:v 1 "$OUT/${id}_sheet.jpg"
  ffmpeg -v error -y -i "$OUT/$id.mp4" -ac 1 -ar 16000 "$OUT/$id.wav"
done
$PY -I - "$OUT" <<'PY'
import sys,glob,wave,numpy as np
from faster_whisper import WhisperModel
m=WhisperModel("small",compute_type="int8")
for f in sorted(glob.glob(sys.argv[1]+"/*.wav")):
    w=wave.open(f); a=np.frombuffer(w.readframes(w.getnframes()),np.int16).astype(np.float32)/32768
    segs,info=m.transcribe(a); print("==",f,info.language); print(" ".join(s.text.strip() for s in segs))
PY
