# Handoff — state of the "What if…" TikTok work

Read this first in a new session, then `earthstop/CLAUDE.md` (workflow, safe zones, pitfalls) and `README.md` (scene list).
Branch: `claude/what-if-video-ideas-veem1s` (repo `nsumn/Nastya`). Everything below is committed there.

## Who / how
- Anastasia (talk to her in **Russian**, short messages, she is on a phone). On-screen text is **English, US units**.
- Every video: research facts (web search, cite sources), compute numbers in `tools/*.py`, send a time-coded **script table**, wait for "ок/да", build, check a contact sheet, then send the mp4 + TikTok caption + 6–8 hashtags + 2 short alternatives + known flaws + posting tip (7–9 pm ET).
- Commit + push engine changes (not frames / mp4 / wav / assets) after each step.

## Her feedback so far (keep it)
- **No repeating high "ticking" sounds** under counters (sounds like a gas stove igniter). Keep the mix in the mids so it is audible on phone speakers.
- **One melody only** — don't stack two music themes (spoon video: she asked to drop the extra fart2 theme).
- **Visual continuity matters**: if we dive toward water, the next shot must lead to that water (spoon: street now runs down to a crowded beach).
- **Series style** for the shape videos: Earth planet shader on the shape + the signature roulette and its sound (from `parts_rocket`). Follow a brief she uploads (e.g. `SPOON_BRIEF.md`) exactly.
- **Never fill a gap with an assumption when a spec search can answer it.** Tesla video: I modelled hover time and "air stations" from an assumed tank (100 L, 4,500 psi) while same-day reports gave 200–600 L at 10,000 psi (~250 kg of air, several seconds of hover) and an onboard compressor (6–7 h refill). She had already posted it. Search for every number a MODEL depends on, and say in the script which parts are invented.
- Never write the word "penis" anywhere (the meme rocket appears only as a background cameo labelled "Rocket?").
- **Style decision (latest):** after the realistic hole video came out pixelated on TikTok she said the realistic/"high quality" look is out — **use the classic series low-poly style** ("как раньше"). The cat video was rebuilt that way in `parts_cat2/` (`index_cat2.html`, `scene_cat2.js`, audio = `audio_cat.py`). Keep the realistic pipeline only as reference.
- TikTok pixelation lesson: heavy grain/dark gradients + 3.3 Mbit/s source get mangled by TikTok's re-encode; tell her to enable "Upload HD"/turn off Data Saver, and don't add film grain.

## Latest: Tesla Roadster video (`parts_tesla/`, `index_tesla.html`, `scene_tesla.js`, `audio_tesla.py`)
"What if everyone had the new Tesla Roadster?" (reveal of 2026-10-15). She asked for the car to look exactly like the real one — reference photos were from Electrek; the model is in `parts_tesla/t_car.js`. No Musk on screen (no real celebrities). Numbers in `tools/roadster_math.py` (Thrust 0-60 0.9 s = 3 G = Shuttle max; 298 M vehicles FHWA 2024; MODEL hover ~1.2 s and ~9 kWh refill with an assumed 100 L tank at 4,500 psi).

## Spam calls video (`parts_spam/`, `index_spam.html`, `scene_spam.js`, `audio_spam.py`)
"What if spam calls were missing people calling for help?" — classic low-poly, 64 s. TikTok-safety choices: no real missing persons, MODEL labels, explicit "In real life, spam calls are just spam" + "Don't call back unknown numbers. But if someone needs help — call 911.", no emergency-alert sounds, creepy but no horror. Numbers in `tools/spam_math.py` (YouMail 52.5 B/yr, NCIC 93,447, FCC 212.9 M 911 calls, Pew ~80% ignore unknown numbers).

## Finished videos (engine parts in the repo)
Asteroid on Times Square, US↔UK swap, Earth shaped like a spoon (`parts_spoon/`, per `SPOON_BRIEF.md`), Sun as a blue star (`parts_blue/`, low-poly — she disliked the look).

## CURRENT TASK: "What if you dug a hole through the Earth?" (`parts_hole/`, `index_hole.html`, `scene_hole.js`)
Status: she asked for a continuous ride down the hole with the real problems at each depth (new script approved: 811/gas line, groundwater, limestone fossils, rock bursts, heat/squeeze at Kola, cutaway, PREM fall with live speed/G, Indian Ocean). Full build done in `parts_hole/`, audio `audio_hole.py`; first full render in progress. Captions/HUD live in `h_main.js`.

Numbers (`tools/hole_math.py`, PREM density): 7,919 mi through; evacuated tunnel fall **38.1 min** (Klotz 2015: ~38 min); **22,188 mph** at the center after 19 min; gravity **rises to 1.09 G** at the core–mantle boundary (1,797 mi down), then 0 at the center. Kola Superdeep Borehole 7.6 mi (12,262 m, 1989, ~180 °C/356 °F) = 0.1% of the way. Mponeng mine ~2.5 mi, rock ~140 °F. Core ~6,000 °C (~10,800 °F, ESRF/Anzellini 2013), ~3.3 million atm. Kansas (38.5 N, 98 W) → antipode 38.5 S, 82 E = Indian Ocean, not China.

Approved script (on-screen English):
| t | shot | caption / HUD |
|---|---|---|
| 0–4 | Kansas backyard at sunset, dug pit, spade, gnome | title "What if you dug a hole through the Earth?" |
| 4–11 | camera descends the shaft: soil → clay → rock | DEPTH counter · "Mponeng, the deepest mine: 2.5 miles. Rock: 140°F." |
| 11–18 | deeper, walls glow with heat | DEPTH 7.6 mi · "The deepest hole ever: 7.6 miles." / "Just 0.1% of the way." |
| 18–25 | pull out: realistic Earth with a wedge cut out, layers, tunnel line | "Imagine a tube all the way through…" / "…7,900 miles." |
| 25–33 | fall down the tunnel, fiery walls | SPEED counter · "Gravity gets stronger as you fall…" / "…9% more at the core." |
| 33–41 | core: white heat, pressure | 10,800°F · "As hot as the Sun's surface." / "Center: weightless at 22,000 mph." |
| 41–49 | rise on the far side, speed back to 0 | TIME 38 min · "38 minutes to the other side." |
| 49–58 | pop out of the ocean at sunrise | "Not China." / "You'd pop out in the Indian Ocean." |
| 58–64 | dark end card + facts | — |
Audio plan: realistic (spade/dirt, wind, a few birds, deep but phone-audible rumble, falling whoosh, ocean waves), no ticks.

### Realistic pipeline (new, in `parts_hole/h_head.js`)
- Assets: `python3 earthstop/tools/fetch_hole_assets.py` → `earthstop/assets/hole/` (git-ignored, ~280 MB). Poly Haven CC0 (HDRIs `grasslands_sunset`, `kloppenheim_06_puresky`; PBR scans `leafy_grass`, `brown_mud_02`, `excavated_soil_wall`, `rock_face`, `dark_rock`…; glTF `rusted_spade_01`, `garden_gnome`, `grass_medium_01/02`), Solar System Scope 8k Earth day/night/clouds (CC BY 4.0 — credit them in the description), three.js water normals. Poly Haven needs a browser User-Agent (403 otherwise).
- Renderer: ACES, shadows, HalfFloat MSAA target → EffectComposer: RenderPass → BokehPass (DOF, yard) → UnrealBloom → OutputPass → grade/grain/vignette ShaderPass (`post(scene, cam, {dof, bloom, exp, con, sat, warm})`).
- Yard (`h_yard.js`): HDRI + `GroundedSkybox`, sun light aimed at the HDRI's brightest pixel (`hdrSunDir`), fine near patch with the pit + cut-out big lawn, dirt blended in by a noisy world-space mask with triplanar dirt (vertical walls), instanced grass clumps (no `large/tall` variants — they are huge), spade stuck in the heap, gnome.
- Earth (`h_earth.js`): tunnel frame = Kansas on +Y, 90° wedge removed toward the camera (shader discard), two half-disc faces with PREM layer radii (inner core 0.1917, outer core 0.5462, crust 0.9945), analytic atmosphere halo (no rim artefacts on the cut), tunnel cylinder + traveller dot.
- Ocean (`h_ocean.js`): three.js `Water` under the pure-sky HDRI (background + PMREM env).
- Look-test frames render at t = 2 / 21 / 53 (`PAGE=index_hole.html node render.mjs out/hotest 0 0 30 2,21,53`), ~5–15 s each on llvmpipe.
- Still to do: shaft shot (excavated_soil_wall → rock → glowing rock, depth counter), fall POV inside the tunnel, rise + zoom to the Indian Ocean, pop-out from under the water, HUD/captions/DOM labels, `audio_hole.py`, end card, full render, encode, deliver. Known nit: the orange part of the title blends into the sunset — give it a stronger dark shadow.

## Cat video ("What if you were a cat for one day?")
Realistic pipeline (`parts_cat/`, assets via `python3 earthstop/tools/fetch_ph.py cat hdri:lythwood_room hdri:grasslands_sunset hdri:suburban_garden@4k hdri:street_lamp tex:diagonal_parquet tex:fabric_pattern_05 tex:clay_plaster tex:leafy_grass model:sofa_02 model:modern_coffee_table_01 model:potted_plant_02 model:throw_pillows_01 model:side_table_01 model:rubber_duck_toy model:wooden_bookshelf_worn model:modern_arm_chair_01 model:street_rat model:food_apple_01 model:food_lime_01 model:lemon model:strawberry_chocolate_cake model:wooden_bowl_01 model:grass_medium_01 model:grass_medium_02` — grasslands_sunset is copied from assets/hole). She asked for a dynamic start (mouse: ultrasonic squeak → chase → miss), colour vision emphasised (split YOU/CAT with fruit + rainbow bars), then the street. Approved script is in `parts_cat/c_main.js` captions.

## Queued
- Hole video v2 (tsunami ending, 71.5 s): after popping out, the sea drains into the hole (whirlpool, `updateSea` in h_ocean.js), then a 100 ft tsunami rolls in (Indian Ocean 2004 reference). Frames 0–52 s reused from the first render.
- The hole video was posted in the realistic version (description included the Solar System Scope CC BY credit).
- "What if you dropped a penny from the Empire State Building?" — she said "пока делай", then switched topics. Math ready in `tools/penny_math.py` (terminal ~25 mph after ~50 ft / 2 s; vacuum 177 mph from 1,050 ft; 0.16 J ≈ a flick; MythBusters busted it in 2003). Script table was sent, not yet approved. If done, do it in the new realistic style.

## Setup in a fresh session
`bash earthstop/setup.sh` (npm, numpy/scipy, Xvfb :99, http server :8765), then `python3 earthstop/tools/fetch_hole_assets.py`. If renders fail with ERR_CONNECTION_REFUSED, re-run setup.sh.
