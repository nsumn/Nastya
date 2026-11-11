#!/bin/bash
# One-time setup in a fresh Claude Code cloud session: deps, Xvfb (for llvmpipe GL), local http server.
# Usage: bash earthstop/setup.sh   (render.mjs finds Xvfb :99 by itself)
cd "$(dirname "${BASH_SOURCE[0]}")"
# install when ANY dependency is missing (a stale node_modules once lacked @fontsource/anton → news headlines fell back to a serif font, Nov 11)
node -e "const p=require('./package.json');process.exit(Object.keys({...p.dependencies,...p.devDependencies}).every(d=>require('fs').existsSync('node_modules/'+d))?0:1)" || npm install --no-audit --no-fund
python3 -c "import numpy, scipy" 2>/dev/null || pip install -q numpy scipy
command -v ffmpeg >/dev/null || echo "WARNING: ffmpeg missing"
if command -v Xvfb >/dev/null; then
  pgrep -x Xvfb >/dev/null || (setsid nohup Xvfb :99 -screen 0 1920x2200x24 >/dev/null 2>&1 &)
  export DISPLAY=:99
else
  echo "Xvfb missing — render.mjs will fall back to GL=swiftshader (slower)"
fi
# optional: Blender 4.2 LTS for the new realistic format  (BLENDER=1 bash earthstop/setup.sh)
if [ "$BLENDER" = 1 ] && [ ! -x /opt/blender/blender-4.2.3-linux-x64/blender ]; then
  mkdir -p /opt/blender && curl -sSL https://download.blender.org/release/Blender4.2/blender-4.2.3-linux-x64.tar.xz | tar xJ -C /opt/blender
  (apt-get install -y -q libegl1 libgl1 libxkbcommon0 >/dev/null 2>&1 || (apt-get update -q >/dev/null 2>&1 && apt-get install -y -q libegl1 libgl1 libxkbcommon0 >/dev/null 2>&1))
  /opt/blender/blender-4.2.3-linux-x64/blender -b --version | head -1
fi
curl -s -o /dev/null http://127.0.0.1:8765/ || (setsid nohup python3 -m http.server 8765 --bind 127.0.0.1 >/dev/null 2>&1 &)
sleep 1
curl -s -o /dev/null -w "http server: %{http_code}\n" http://127.0.0.1:8765/
cd - >/dev/null
