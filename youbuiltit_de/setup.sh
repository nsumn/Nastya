#!/bin/bash
# One-time setup for the youbuiltit_de video pipeline (cloud session or local machine).
set -e
cd "$(dirname "$0")"
command -v ffmpeg >/dev/null || { echo "need ffmpeg (apt-get install -y ffmpeg / brew install ffmpeg)"; exit 1; }
(cd engine && npm install --no-audit --no-fund)                       # three@0.169
python3 -c "import numpy" 2>/dev/null || pip install numpy            # tighten.py
node -e "require('playwright')" 2>/dev/null || {                      # headless Chromium for rendering
  echo "installing playwright (cloud sessions already have it)"; (cd engine && npm install playwright && npx playwright install chromium); }
# optional tools (TikTok download + speech check) in a venv:
#   python3 -m venv .venv && .venv/bin/pip install yt-dlp curl_cffi faster-whisper pillow numpy
echo "ok. Start the file server:  (cd $(pwd) && python3 -m http.server 8766 &)"
