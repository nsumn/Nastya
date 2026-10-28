# What-if TikTok video with the earthstop engine

Anastasia runs a TikTok channel of low-poly 3D "What if…" videos for a US audience. Each video is built with this engine (`earthstop/`; `README.md` here is the source of truth for scenes and parts). Talk to her in Russian; everything on screen is in English with US units (miles, ft, °F, "football fields"). She usually works from an iPhone/iPad — keep messages short, send files with SendUserFile.

## 1. Topic and script (before any code)
- Offer 4–6 topic ideas, recommend one. US hooks work best: US landmarks (Statue of Liberty, NYC, the US map), "every American", seasonal US events (Halloween, Thanksgiving, Super Bowl). Only ~40% of her views are US, so push US cues into the first frame and the title.
- Comment requests ("what if…" from a viewer) are great: suggest posting as Reply to comment so the comment shows as a sticker.
- Research every fact with web search and cite sources. Compute numbers yourself (small Python scripts in `tools/`) and show the math. If the shape/scenario is invented, the numbers apply only to that model — say so; label your own simulations as "MODEL" in the HUD.
- Send a second-by-second script table (time · on screen · caption/HUD) and wait for approval. Re-check the script for physics errors before building and tell her what you corrected.
- Length ≥ 61 s (usually 63–67 s), end on a dark card with the title + a short plain ANSWER to the title question (3–6 short lines). No list of studies/authors on the card (her rule, Oct 2026) — sources go in the chat, not on screen.

## 2. Content rules (TikTok)
- No blood, wounds, gore or violence; zombies/monsters are cartoony (green skin + flash). Bites OK if bloodless.
- No real celebrities depicted. No explicit nudity — phallic shapes get videos restricted; if she insists, keep it stylized, never write the word on screen, warn her about strikes.
- Text must be CENTERED. Safe zones for 1080×1920: nothing important at y < 320 (tabs/Stories pill), right column x > 900 for y 950–1670 (icons), y > 1650 (caption/search), ~57 px side crop. Title top ≥ 340 px, HUD `left:100px; top:900px`, captions `top:1250px; padding:0 190px; text-align:center`.

## 3. Engine layout
- `index_<name>.html` — DOM overlay: `#title` (orange `.hl` keywords), `#hud` (`#stat` red-dot line, `#lab`, big serif `#val`, `#sub`), `#cap` italic serif captions, `#veil`, `#flash`, `#cracks`, `#end/#endT/#endS`, `#labels`. Elements carry class `txt` (text) or `gfx` (graphics) for render passes. Fonts: Source Serif 4 + Inter (`node_modules/@fontsource`).
- `scene_<name>.js` — three.js r169 module, assembled from `parts_<name>/*.js` with `cat`. Every frame is a pure function of t: `window.renderAt(t)`; seeded `rnd()` only at build time; `window.sceneReady` promise.
- Reusable parts: city street (`parts_touch/t_city.js`: buildings/cars/people/lamps), `people.js` (`makePerson(rnd, {skin, top, bottom, …})`, poses walk/idle/flail/sit), low-poly real-continent globe (world-atlas + topojson, vertex colours), planet shader `planetMat`, sky dome with `SKYFN`, render-target crossfades + `blit()` (`parts_touch/t_head.js`), US map (us-atlas states-albers + precomputed data texture, see `tools/zombie_map.mjs`).
- `audio_<name>.py` — numpy/scipy synthesis timed to the scene constants. Then `ffmpeg -af loudnorm=I=-14:TP=-1.5:LRA=11`.
- `render.mjs` — Playwright Chromium: `PAGE=index_x.html node render.mjs <outDir> <t0> <t1> 30 [comma list of test times]`. `PASS=text` renders text-only PNGs. GL backend via `GL=llvmpipe|swiftshader|gpu` (default llvmpipe when `DISPLAY` is set). It prints the active renderer — check it says llvmpipe.

## 4. Workflow (Claude Code cloud session)
1. Setup: `bash earthstop/setup.sh` — npm install, numpy/scipy, Xvfb on :99 (render.mjs finds it automatically), http server on 8765. Re-run it if the server/Xvfb died. Put render outputs in `earthstop/out/` (git-ignored) or the scratchpad.
2. Write the parts, `cat` them into `scene_<name>.js`, run `node --check`.
3. Render 8–15 test frames across all shots, tile with ffmpeg (`-vf scale=270:480,tile=7x2`), LOOK at the sheet, fix framing/lighting, repeat. Typical fixes: camera inside terrain, object cut by the narrow portrait FOV (horizontal FOV ≈ 0.56× vertical), overexposed additive effects, silhouettes against bright windows (add a fill light), text over busy areas.
4. Full render as ONE background process (Bash `run_in_background`, or `setsid nohup … &` + a background `until` loop) — you get notified when it ends; do not poll with sleep. Measured on this server (4 cores, llvmpipe): zombie video 1980 frames in ~10 min (≈0.3 s/frame avg; city ≈1.3 s, map ≈0.25 s). Parallel chunks do NOT help — software GL already uses all cores. If one section needs a fix, re-render only that range into another folder and renumber with symlinks.
4b. ALWAYS render two layers: `PASS=scene` (3D, JPEG) and `PASS=text` (DOM text, transparent PNG — fast if `renderAt` skips the 3D when `window.PASS === 'text'`, see `parts_iq/i_main.js`), then `./compose.sh`. Text fixes (captions, HUD, cards) then cost a couple of minutes instead of a full re-render. Captions stay at the series height `top:1250px` (she noticed when they drifted to 1420 px).
5. Encode two-pass ~3.3 Mbit/s so 65 s stays < 30 MB (≈2.5 min):
   `ffmpeg -framerate 30 -i out/scene/f_%05d.jpg -c:v libx264 -preset slow -b:v 3300k -pass 1 -an -f mp4 /dev/null`, then pass 2 with `-i audio.wav -map 0:v -map 1:a -pix_fmt yuv420p -c:a aac -b:a 160k -shortest -movflags +faststart out.mp4`. With a separate text pass use `./compose.sh`.
6. Sample the final mp4 into a contact sheet and check it before sending.
7. Update `README.md` (new scene entry), commit the engine changes (scene, parts, audio, tools — not frames/mp4/wav) and push to the session's branch, so the next session starts with the latest engine.

## 5. Delivery (always in the same message)
- Send the mp4 (SendUserFile).
- Write the TikTok description immediately, without being asked: English caption (hook + 1–2 real facts + CTA like "Comment your state 👇"), 6–8 hashtags (#whatif #science #fyp + topic/US tags), plus 2 short alternatives.
- Mention any known small flaws and offer a quick fix. Posting tip: schedule for 7–9 pm US Eastern (2–4 am Moscow).

## 6. Pitfalls seen before
- Audio: NO synthetic "voices" — the `voice()` helper (square-wave buzz through formants) and voiced `breath(..., voice, f0)` read as a constant BUZZING on a phone; she hates it (mom birthday video, Oct 2026). No laughs/giggles/singing/chatter via synthesis; carry a song on an instrument (e.g. `pluck`) instead. Also no constant room-tone noise beds under whole scenes.
- Audio: no repeating high clicks under counters/timers (1.8–2.6 kHz ticks at 4–14/s read as a gas-stove igniter — she disliked it in the asteroid video). Keep most of the mix above ~200 Hz: phone speakers drop sub-bass rumbles and booms, so the track sounds empty on a phone.
- `pkill -f render.mjs` / `pgrep -f "node render.mjs" | xargs kill` kills your own shell when the pattern appears in the same command — use a bracket pattern (`pgrep -f "[r]ender.mjs"`) in a separate command.
- llvmpipe silently falls back to SwiftShader without an X display (`DISPLAY=:99` + Xvfb) or with extra flags like `--enable-gpu`.
- Multi-line shader strings must use backticks, not quotes ("Invalid or unexpected token").
- `page.waitForFunction` polls with rAF: heavy async work in the page (big Dijkstra etc.) stalls it — precompute heavy data in Node (`tools/*.mjs`) and load JSON/binary.
- Dijkstra with Float32Array arrival times skips nodes through rounding — use Float64Array.
- Order matters: pose characters before computing a camera that follows them.
- Duplicate const names when concatenating parts (e.g. `hzC`/`skyHorizon`) — `node --check` the result.
- Rendering into HalfFloat render targets gives linear HDR; tone-map once in the final blit.
