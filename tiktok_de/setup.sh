#!/bin/bash
# One-time setup in a fresh cloud session: python venv + the Inter font for cairo text.
set -e
cd "$(dirname "$0")"
python3 -m venv .venv
.venv/bin/pip install -q cairocffi pillow numpy opencv-python-headless faster-whisper
mkdir -p ~/.fonts && cp render/fonts/*.otf ~/.fonts/ && (fc-cache -f >/dev/null 2>&1 || true)
command -v ffmpeg >/dev/null || (apt-get update -qq && apt-get install -y -qq ffmpeg)
echo "setup ok"
