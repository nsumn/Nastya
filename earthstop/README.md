# "What if…" video engine (low-poly 3D, TikTok 1080×1920)

Vertical 3D "What if…" videos in the style of the example clips: low-poly city,
HUD counters, italic captions, screen cracks, dark end card, synthesized sound.
Rendered headless in Chromium (three.js), encoded with ffmpeg.

## Files
- `scene_en.js` + `index_en.html` — FINISHED example: "What if Earth stopped spinning for 1 second?" (65 s, English, New York).
- `scene.js` + `index.html` — first short Russian test (16 s).
- `scene_bh.js` + `index_bh.html` — IN PROGRESS: "marble-sized black hole in Central Park" (lensing, inflow, fireball, melting globe). Being upgraded to new people + bloom + ambient occlusion; not tested yet after the upgrade.
- `scene_donut.js` + `index_donut.html` + `audio_donut.py` — FINISHED: "What if Earth was shaped like a donut?" (65 s, English). Fast shape roulette hook → torus planet → street on the inner equator with the far side arching over the sky (baked 4096×2048 texture — per-pixel noise is too slow in software GL) → 0.29 G jumps → 2 h 50 min day time-lapse → bright night → spin slows, donut collapses. Facts: Anders Sandberg, "Torus–Earth" (2014). Fonts: Source Serif 4 + Inter.
- `scene_67.js` + `index_67.html` + `audio_67.py` — FINISHED: "What if 67 got deleted?" (65 s, meme chain reaction). LED billboards redrawn per frame (canvas textures), 2D glitch overlay canvas (slices of the WebGL frame), "six seven" gesture / T-pose poses, court with jersey #67, periodic-table DOM overlay, comet 67P dissolved with a clipping plane, buildings shrink into voxels. Trap beat + glitch SFX synthesized.
- `scene_tsunami.js` + `index_tsunami.html` + `audio_tsunami.py` — FINISHED: "What if Earth was shaped like a tsunami?" (65 s). Roulette with a real rocket and a cube fake-out → wave planet (profile extruded, Earth's volume), wet/dry baked crest textures, 75° gravity-tilt street shot, oceans draining into one sea, crest collapse, tsunami wall. Physics of the shape: `tools/wave_phys2.py` (Monte-Carlo gravity).
- `scene_touch.js` (assembled from `parts_touch/*.js`) + `index_touch.html` + `audio_touch.py` — FINISHED: "What if we could actually touch each other?" (67 s). Hands close-up over a blurred city (low-res render target = cheap bokeh) → log-scale dive: skin ridges (mm) → corneocytes (µm) → atoms (Å) with crossfades through HalfFloat render targets → electron clouds squashed against the interface (vertex shader) → bench with a magnifier inset (atoms rendered to a texture, circular blit) → hug with fresnel glow shells → DOM toggle switch → sink through the sidewalk into an underground shaft → wedge cut-away Earth (two clipping planes + layered section faces), fall line LA → Indian Ocean, time-lapse oscillation → fusion close-up of two hydrogen nuclei → dusk outro. Physics: `tools/tunnel.py` (PREM-like layers: 38.3 min one way, ~22,000 mph at the centre). Rebuild: `cat parts_touch/t_head.js parts_touch/t_city.js parts_touch/t_heroes.js parts_touch/t_micro.js parts_touch/t_tunnel.js parts_touch/t_earth.js parts_touch/t_main.js > scene_touch.js`.
- `scene_zombie.js` (from `parts_zombie/*.js`) + `index_zombie.html` + `audio_zombie.py` — FINISHED: "What if a real zombie showed up on Halloween?" (66 s, US-targeted). Night NYC street (street trees, jack-o'-lanterns with emissive faces, costumes as accessories on `people.js`, zombie twins swapped in with a green flash — no blood), extruded lower-48 map (us-atlas Albers) whose top shader reads a precomputed arrival-time texture, northern Rockies valley (value-noise ridges, instanced pines, cabin). Spread model: `node tools/zombie_map.mjs` → `zmap.bin` + `zmap.json` (state raster + metro gaussians, density-dependent front from every metro ≥0.9M; our own simplification). Facts: Alemi et al. 2015 (Cornell), arXiv:1503.01104. Needs `npm i us-atlas d3-geo`.
- `scene_rocket.js` (from `parts_rocket/*.js`) — UNFINISHED / on hold: "What if Earth was shaped like a rocket?" (physics `tools/rocket_phys.py`).
- `scene_fart.js` (from `parts_fart/*.js`) + `index_fart.html` + `audio_fart.py` — FINISHED: "What if everything that can fart… farted at once?" (63 s, reply to a comment). Globe with a sweeping green front + puff sprites, NY harbor with a low-poly Statue of Liberty next to a 90.4 m translucent gas cube (738,000 m³), pasture/cow burp, herring shoal with bubbles, sloth, bird flock, lighter finale. Synth fart = jittery pulse train through a low-pass.
- `people.js` — new jointed low-poly people (knees/elbows, hair, outfits) + walk / idle / flail / sit poses. `makePerson(rnd, {top, bottom, skin, …})` overrides the outfit.
- `render.mjs` — renders frames: `PAGE=index_en.html node render.mjs <outDir> <tStart> <tEnd> 30 [comma-separated times for test frames]`.
- `audio*.py` — soundtrack synthesis per video (numpy/scipy), then loudnorm to −14 LUFS.

## Setup (in a fresh session)
```bash
bash earthstop/setup.sh   # npm install, numpy/scipy, Xvfb :99, http server on 8765
```
`render.mjs` finds Playwright itself and picks the GL backend: `GL=llvmpipe` (default when `DISPLAY` is set; Mesa software GL, fastest on a CPU server), `GL=swiftshader` (fallback), `GL=gpu` (real graphics card on a Mac/PC). It prints the active renderer.

## Workflow that worked
1. Write the scene: every frame must be a pure function of time `t` (`window.renderAt(t)`), no randomness at render time (seeded rnd only at build) — then the video can be rendered in parallel chunks.
2. Render ~10 test frames across all shots, make a contact sheet with ffmpeg `tile`, look, fix.
3. Full render: ONE process (software GL already uses all cores; 4 parallel chunks were slower). Claude Code cloud server (4 cores, llvmpipe): scene_zombie 1980 frames in ~10 min (city ≈ 1.3 s/frame, map ≈ 0.25 s/frame). Old claude.ai chat sandbox (2 cores, SwiftShader): ≈ 3 s/frame city, 1–1.5 h per video.
4. Audio: `python3 audio_en.py out.wav` → `ffmpeg -af loudnorm=I=-14:TP=-1.5:LRA=11`.
5. Encode two-pass at ~3.3 Mbit/s so a 65 s clip stays under 30 MB:
   `ffmpeg -framerate 30 -i frames/f_%05d.jpg -i audio.wav -c:v libx264 -preset slow -b:v 3300k -pass 1/2 … -c:a aac -b:a 160k -movflags +faststart`

## TikTok safe zones (1080×1920) — measured from a real TikTok screenshot
- Top 0–320 px: status bar, Following/For You tabs, "Stories" pill → no text there (titles start at ≥ 340 px).
- Right column x > 900, y 950–1670: avatar, like/comment/save/share → captions use padding `0 200px 0 110px`, end-card facts too.
- Bottom y > 1650: username, description, search bar.
- Tall phones crop ~57 px on each side → HUD at left: 100px, nothing important within 60 px of the edges.

## Render passes (cheap text edits)
- `PAGE=index_67.html node render.mjs out/scene 0 65 30` → 3D + graphics (JPEG).
- `PASS=text PAGE=index_67.html node render.mjs out/text 0 65 30` → titles/HUD/captions/end text only, transparent PNG (fast, ~10 min).
- `./compose.sh out/scene out/text audio.wav final.mp4` → overlay + 2-pass encode. Changing a caption = re-run only the text pass.
- Mark text elements with class `txt`, graphic overlays with `gfx` (see index_67.html). Keep the http.server alive with `setsid nohup python3 -m http.server 8765 --bind 127.0.0.1 &`.

## Style rules
- Hook title with the key words highlighted (orange `#f4a548`), centered.
- HUD left: red-dot status line, mono label, big serif counter, mono sub-fact. Captions centered, italic serif, kept clear of TikTok's right-side icons and bottom caption.
- Facts must be real and checked (numbers in captions/HUD are computed, not guessed).
- Length ≥ 61 s for the US audience; end on a dark card with title + 2–3 lines of facts.
