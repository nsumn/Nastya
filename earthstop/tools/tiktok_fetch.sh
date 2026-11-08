#!/usr/bin/env bash
# Download + analyse TikTok videos of reference accounts (for studying a format, never for re-uploading).
#   bash earthstop/tools/tiktok_fetch.sh <account> [count=1] [outdir=earthstop/out/tiktok]
# Example: bash earthstop/tools/tiktok_fetch.sh sdfaktentv 5
# Per video it writes: <uploader>_<id>.mp4, .info.json (views/likes/shares/description),
# .sheet.jpg (1 frame every 6 s, 8x3 tiles) and .txt (Whisper transcript with timestamps).
# Works in the cloud session through the agent proxy: yt-dlp needs curl_cffi + --impersonate chrome,
# otherwise TikTok returns an empty page.
set -euo pipefail
ACC=${1:?account without @}; N=${2:-1}; OUT=${3:-earthstop/out/tiktok}
VENV=${VENV:-$HOME/.venv-tiktok}
[ -x "$VENV/bin/yt-dlp" ] || { python3 -m venv "$VENV"; "$VENV/bin/pip" -q install yt-dlp curl_cffi faster-whisper; }
[ -f /root/.ccr/ca-bundle.crt ] && export SSL_CERT_FILE=/root/.ccr/ca-bundle.crt CURL_CA_BUNDLE=/root/.ccr/ca-bundle.crt
mkdir -p "$OUT"
# newest first; pinned videos can appear on top, check the dates in the listing
"$VENV/bin/yt-dlp" --impersonate chrome --flat-playlist --playlist-end "$N" \
  --print "%(id)s %(upload_date)s %(duration)ss %(view_count)s views | %(title).90s" "https://www.tiktok.com/@$ACC"
"$VENV/bin/yt-dlp" -q --impersonate chrome --playlist-end "$N" --write-info-json \
  -o "$OUT/%(uploader)s_%(id)s.%(ext)s" "https://www.tiktok.com/@$ACC"
cat > "$OUT/.transcribe.py" <<'EOF'
import sys, wave, numpy as np
from faster_whisper import WhisperModel
m = WhisperModel("small", device="cpu", compute_type="int8")
for f in sys.argv[1:]:
    w = wave.open(f); a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    segs, info = m.transcribe(a, vad_filter=True)   # raw samples: avoids the PyAV open() version clash
    with open(f[:-4] + '.txt', 'w') as o:
        for s in segs: o.write(f"{s.start:6.1f} {s.text.strip()}\n")
    print(info.language, f[:-4] + '.txt')
EOF
for f in "$OUT"/*.mp4; do
  b=${f%.mp4}; [ -f "$b.txt" ] && continue
  ffmpeg -v error -y -i "$f" -vf "fps=1/6,scale=180:320,tile=8x3" -frames:v 1 "$b.sheet.jpg"
  ffmpeg -v error -y -i "$f" -ac 1 -ar 16000 "$b.wav"
  "$VENV/bin/python" -I "$OUT/.transcribe.py" "$b.wav" && rm -f "$b.wav"
done
