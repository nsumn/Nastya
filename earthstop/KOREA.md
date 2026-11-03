# Korean channel 뚝딱 (@ttukttak3d) — handoff (read this first for any Korean video)

Shared project of Anastasia and her friend: one TikTok account, two Claude Code sessions. Branch: `claude/what-if-video-ideas-nmv78w` (repo `nsumn/Nastya`).
Always `git pull --rebase origin claude/what-if-video-ideas-nmv78w` before starting and before every push — the US-channel session pushes to the same branch.
Also read `earthstop/CLAUDE.md` (engine workflow, render, pitfalls) and `/.claude/skills/vizavi-motion/` (motion quality — mandatory).

## The channel
- Name **뚝딱**, handle **@ttukttak3d** (no dot). The mark sits top-right (`#mark`) and on the end card. Korean audience: all on-screen text in Korean, metric units. Talk to the owners in **Russian**, short messages (phone).
- Format that works: **"만약 X가 5초 동안 …라면?"** — a real Seoul place, a millisecond countdown HUD (story time slowed down), physics escalation, a dark end card with the title + a short answer. Styles referenced: @ifcam.kr (detailed semi-real Seoul, POV) and @man_ia_c (US, "X disappeared for 5 seconds", ms timer). Our own style — never copy shots.
- Monetisation: applied, not accepted yet (Nov 3). Plan: 5 more ~30 s videos, then an appeal. Quality must not drop: "кинематографично, детализировано".
- Posted so far (in order): 키 2배 (`growkr`), 수능 (`suneung`), 달팽이 (`snail`), 박수 (`clap`), 블랙홀 (`bh`) — MakeHuman people; then 한강이 5초 동안 사라진다면? (`hangang`) — the new faceted hero. Do NOT re-render posted videos.

## Her feedback (rules)
- MakeHuman people looked strange (hands!) → replaced by OUR generated faceted Korean hero (below). Keep him in every video.
- Make it cinematic: dusk/blue-hour light, city lights, haze, DOF on close-ups, motion blur on fast shots, the camera always moving, a split-tone grade (`parts_hangang/h_head.js`).
- Every key event must be READABLE: show the cause and the effect in one clear wide shot first (the Han vanish was unclear until a high wide shot + a bright ring sweeping the water). Show context before close-ups (the ferry needed a wide shot).
- No strange cuts inside one action: one continuous tracking shot is better than two odd angles (the slope slide).
- No flicker: far planes z-fight (raise `cam.near` on aerial shots, `polygonOffset` on overlays, never put the camera at/under a water plane); nothing pulsing fast.
- HUD timer at the top (`#hud` top 330 px) — it must not cover faces; title below it (560 px); captions at 1250 px; faces above the caption band.
- Sound is required: Lumean SFX on every event + music (Lumean music is 30 s max — order several pieces and cue them). No synthetic voices.

## The hero (approved)
`makeBlock({ head:'human', body:'human', skin:'#f1c9a5', hair:'#151215', browCol:'#1a1416', top:'#2f5a40', outfit:'tee_kr', collar:1.556, jeans:true, bottom:'#2f3d5c', shoe:'#f4f4f4', hairStyle:'twoblock', headMesh:'head_kr', kr:true, browW:1.25, headS:0.88 })`
- Same faceted low-poly method as the US hero (`tools/human_mesh.py`: SDF → marching cubes → decimation). Korean head + two-block hair: `tools/human_kr.py` (adds `head_kr`, `hair.twoblock` into `data/human_mesh.json`). Dark-green tee whose hem hangs OVER the jeans + a crew-neck rib (`ONLY=tee_kr python3 tools/human_mesh.py` rebuilds just that body). Almond monolid eyes drawn in the face decal (`kr:true`). Emotions: `P.face(name, t)` — names in `FACE` (`parts_dad/d_block.js`).
- **Pose rules (she saw broken bodies):** NEVER rotate `P.torso` (its pivot is at the feet → the body bends) — lean with `P.outer.rotation.x` (set `outer.rotation.order='YXZ'`). Arms only within ~-0.65…+0.5 rad on X, small Z; bend elbows instead of raising arms (beyond that the tee sleeves tear). Check new poses in the pose lab: `index_krpose.html` (`parts_krf/f_pose.js`, front + side). Look lab: `index_krflab.html`.

## Engine for the Korean videos
- `scene_hangang.js` = `cat parts_hangang/h_head.js parts_coffee/c_smoke.js parts_dad/d_block.js parts_hangang/h_set.js parts_hangang/h_fx.js parts_hangang/h_main.js`.
  - `h_head.js` renderer + cinematic compositor (bloom, split-tone, grain, vignette, `dof(cam, focus, amount)` from `RTA.depthTexture`).
  - `h_set.js` Banpo Hangang Park at dusk: sky shader, planar-reflecting Han (`river`, can get a hole: `uHR/uHC`), riverbed `bedHeight(x,z)` with fine stone-slope rows + debris/fish (`bedStuff`, `fishAt`), Banpo Bridge + rainbow fountain (`setJets(t, throw, power, floorY)`), north-bank city with lit windows, expressway car lights (`carsAt`), Namsan + N Seoul Tower, 63 Building, Lotte Tower, Sevit islands, ferry, park (trees, lamps, tents, mats, chicken/beer/ramyeon), crowd `CROWD` (+`sitPose`), the hero + `heroPhone`.
  - `h_fx.js` vanish ring, wind grass (`grassU.uWind`), debris (`debrisAt`), mud splash, foam eruption (`foamAt`), phone-screen render target.
  - `h_main.js` the Han video timeline (story time, cameras, kinetic captions, sub-frame motion blur).
- Space (km, real Earth 8k maps): `parts_namsan/n_space.js` (from `parts_growkr/k_space.js`). Needs `assets/growkr/earth/8k_earth_{daymap,nightmap,clouds}.jpg` — git-ignored; download from https://www.solarsystemscope.com/textures/ (CC BY 4.0) into that folder.
- Render (from `earthstop/`): `bash setup.sh`; `PAGE=index_X.html PASS=scene node render.mjs out/X/scene 0 <len> 30`, then `PASS=text … out/X/text`, then `./compose.sh out/X/scene out/X/text out/X/mix.wav out/X/X.mp4`. Test frames: `PAGE=… node render.mjs out/t 0 1 30 1.5,4,7,…` and tile them. ~1 s/frame (4× on motion-blur shots); render as ONE background process.
- Audio: `tools/lumean.py` (key: ask Anastasia privately; `export LUMEAN_API_KEY=…` or put it in `earthstop/.lumean.key`, git-ignored — NEVER commit it). Cue sheet `parts_<video>/cues.txt` → `python3 tools/mix_sfx.py <sfx_dir> <out.wav> <len> <cues>` → `ffmpeg -af loudnorm=I=-14:TP=-1.5:LRA=11`.
- Old videos (growkr/suneung/snail/clap/bh) use MakeHuman GLBs in `assets/growkr/mh` (git-ignored; regenerate with `tools/mh_people.py`, setup in README) — not needed for new work.

## In progress (Nov 3): "만약 남산타워가 로켓이라면?" (`parts_namsan/`, `index_namsan.html`, 33 s)
- Approved script (she said "Сразу видео делай"): park at dusk → Namsan ignition (tower 237 m = 2× Starship) → the river turns orange, silence → the sound reaches Banpo after **13.5 s** (4.63 km) → chase the climb → space, 400 km in 8 min 30 s, 7.7 km/s, 92 min per lap → the park again, Namsan without its tower → end card. Numbers: `tools/namsan_math.py`. Thrust/fuel = MODEL.
- `scene_namsan.js` = `cat parts_hangang/h_head.js parts_coffee/c_smoke.js parts_dad/d_block.js parts_hangang/h_set.js parts_hangang/h_fx.js parts_namsan/n_space.js parts_namsan/n_main.js`.
- First test sheet done. To fix before the full render: S4 (10.5–13 s) camera sees only the dark hill — move it out/up so the rising tower + smoke read; S2 smoke reads as a pink blob (make it grey-white, lit orange only near the flame); S7 chase OK; space S8/S9 OK. Then audio (SFX + music already in `out/nsaudio/`, not in git — regenerate with Lumean if missing), cue sheet, full render, review, deliver with a Korean TikTok caption + hashtags.
- Next 4 ideas she accepted as a list: 서울의 모든 불이 5초 동안 꺼진다면 (blackout → Milky Way), 5초 동안 마찰이 사라진다면, 반포대교 분수가 1000배 세진다면, 5초 동안 중력이 절반이 된다면. ~30 s each, same set + hero, new camera places.

## Delivery checklist (every video)
Script table + sources → her "да" → test sheet → full render → contact sheet + dense frames at cuts + flicker check (frame-difference numbers) → mp4 (SendUserFile) + Korean TikTok caption (hook + facts + "댓글로 👇"), 6–8 hashtags (#만약에 #과학 #3D애니메이션 #fyp + topic), 2 short alternatives, known flaws, posting time 19–21 KST. Commit + push engine changes (never out/, mp4, wav, assets, keys).
