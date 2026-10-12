#!/bin/bash
# One-time setup in a fresh Claude Code cloud session: deps, Xvfb (for llvmpipe GL), local http server.
# Usage: bash earthstop/setup.sh   (render.mjs finds Xvfb :99 by itself)
cd "$(dirname "${BASH_SOURCE[0]}")"
[ -d node_modules/three ] || npm install --no-audit --no-fund
python3 -c "import numpy, scipy" 2>/dev/null || pip install -q numpy scipy
command -v ffmpeg >/dev/null || echo "WARNING: ffmpeg missing"
if command -v Xvfb >/dev/null; then
  pgrep -x Xvfb >/dev/null || (setsid nohup Xvfb :99 -screen 0 1920x2200x24 >/dev/null 2>&1 &)
  export DISPLAY=:99
else
  echo "Xvfb missing — render.mjs will fall back to GL=swiftshader (slower)"
fi
curl -s -o /dev/null http://127.0.0.1:8765/ || (setsid nohup python3 -m http.server 8765 --bind 127.0.0.1 >/dev/null 2>&1 &)
sleep 1
curl -s -o /dev/null -w "http server: %{http_code}\n" http://127.0.0.1:8765/
cd - >/dev/null
