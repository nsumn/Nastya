# Quality comparison, Nov 11 2026 — our US news-map videos vs @geolyth__, @geomapstories, @worldhistorynetwork (+ @dailyplugusa, @dollarindex, @didyouknow.geo, @cruzastudillo, @quarterchart)

Her request (Nov 11, night): compare OUR videos with theirs in every detail (camera, map, font, animations, materials, sound, views/likes, topics) and make ours better. The full illustrated report is an Artifact: https://claude.ai/artifact/XCamuKXVdsB6EemsDbKwrj ; this file keeps the facts and the rules for the next sessions.

## How it was measured (reproducible)
- Download: `yt-dlp --impersonate chrome` (needs `pip install yt-dlp curl_cffi`; she explicitly allowed TikTok downloads). Videos are NOT committed.
- Stats: `yt-dlp --impersonate chrome --skip-download --playlist-end 30 --print "%(id)s|%(upload_date)s|%(duration)s|%(view_count)s|%(like_count)s|%(comment_count)s|%(repost_count)s|%(title)s" https://www.tiktok.com/@<handle>`
- Frame metrics (first 60 s, 10 fps at 360×640): Farneback optical flow in the middle 70 % of the frame → motion px / 0.1 s, radial part = zoom, median vector = pan; "static second" = flow < 0.15 and pixel diff < 1.2; colour/brightness/dark-fraction at 1080×1920 1 fps. Audio: faster-whisper base.en (words/min, hook), AST AudioSet tagger (MIT/ast-finetuned-audioset) on 3 s windows, librosa onsets.

## Numbers
| | motion px/0.1 s | zoom s / 60 | pan s / 60 | brightness | saturation | near-black share | fps |
|---|---|---|---|---|---|---|---|
| Geolyth (3) | 6.1 | 47 | 44 | 144 | 155 | 23 % | 60 |
| geomapstories (3) | 5.3 | 48 | 31 | 151 | 164 | 5 % | 60 |
| WorldHistoryNetwork (2) | 3.5 | 39 | 19 | 117 | 157 | 23 % | 30 (720p) |
| dailyplugusa (2) | 0.4 | 29 | 2 | 120 | 82 | 28 % | 30 |
| ours: Texas / Alaska / 7 states | 0.7 | 17 | 3 | 157 | 101 | 5 % | 30 |
| ours: Hegseth (v4) | 1.0 | 3 | 1 | 85 | 179 | 61 % | 30 |

Account medians (last 13–30 posts): geomapstories 240K views, dailyplugusa 57K, dollarindex 48K, geolyth 47K, cruzastudillo 27K, quarterchart 17K, didyouknow.geo 9K, worldhistorynetwork 8.5K; ours (news, Nov 8–11) 1.3K; ours (body/habit what-ifs, Oct 24–Nov 2) 38.8K. Like rate is the same everywhere (2.6–3.9 %; ours 3.9 %) → our problem is distribution, not the people who watch.

Same-topic case: @didyouknow.geo "Texas just voted blue" = 2.2M views (posted Nov 4, flat paper-style 2D map, huge 3D words "VOTED BLUE"/"2026"/"7.7M", checklist UI) vs ours "Texas went BLUE" = 12.6K (posted Nov 8). All election hits went up on Nov 4 (dollarindex 463K, dailyplugusa 363K). Speed (first 6–12 h) beats render quality for news.

Honest caveat: the two biggest same-topic hits were nearly STATIC (didyouknow.geo Texas: motion 0.37, 26 static s/60, no music; dollarindex impeachment: motion 0.25, 23 static s, 68 % near-black frames, real Trump clips). Camera/map quality = the look of the strong map accounts and TikTok's 'quality' for Additional Reward; virality in news = topic + being first + the opening line (theirs and ours were almost the same words: "Texas just voted/flipped blue … For 32 years").

Audio: everyone starts the voice at 0.0 s; 160–190 wpm (WHN 225; ours 153–170). Map accounts keep music 50–95 % of the time; the two biggest hits had NO music. SFX match the subject: Geolyth war footage = explosions/artillery/gunfire; geomapstories = coins, camera shutter, cartoon pops; WHN = shutter click on every photo. Our pop/whoosh/stamp set is masked by the music (the tagger hears only 'Music') → +3–6 dB and subject-specific SFX; test one video voice + SFX without music.

## Rules for the next news videos (v5)
1. CAMERA: continuous zoom 12–20 % of scale per second in every shot (direction flips on each new event) + 0.1–0.2 rad/s turn; tilt opens up (more oblique) as the camera gets close; topic changes = a 0.8–1.2 s fly-over through height with motion blur. Never a drifting near-static hold.
2. 60 fps output (they are 1080p60; render time ×2).
3. LIGHT: no near-black frames — sea not dimmed below ~0.6 of v3, land bright (`mapUni.uV5 = 1`), average brightness 120–160.
4. MAP v5 (parts_hilab, tools/hires_patch.py): hi-res focus patch for the story's region (Terrarium z9 relief + NASA BMNG 500 m colour), Natural Earth rivers, deep saturated paint with relief showing through + white rim, place names lying ON the terrain (`groundLabel`, `cityDot`; load Inter weights with `document.fonts.load` before drawing canvases).
5. FIRST FRAME: one huge word/number over the map (didyouknow.geo style) + a face; voice from 0.0 s with a recognisable rubric line ("Here's what happened in America in the last 24 hours").
6. MATERIAL: cut-out politicians (no circle) next to the medallions, speech bubbles with real quotes (key words yellow), our own headline cards (source + headline, no foreign logos), detailed 3D stickers (plane, ship, missile, money, handcuffs, warning sign). Short real news footage only if she accepts the copyright risk.
7. LENGTH test: one 2–2.5 min "24 hours" video (Geolyth/dollarindex/dailyplugusa length).
8. SPEED: a fast "24 hours" template that can be built in ~1 h, so it goes out the same day.

## Posting times (ET, last 15 posts)
dailyplugusa posts twice a day at 6–7 am and 5 pm ET (both top videos at 7 am "what happened overnight"); didyouknow.geo's 2.2M hit went up at 3 am ET right after the count; Geolyth 5 am–9 pm (hit at 11 am). → Be first after the event; for the "24 hours" rubric use US morning 6–8 am ET = 14–16 MSK.

## Ready-made pieces (Nov 11)
- `news_v3.css` `.hook` + `.hook .date` — the first-frame huge question/word.
- `assets/news/cutouts/<key>.png` — background-removed portraits with a white sticker outline (`pip install rembg[cpu]`, model u2net_human_seg; script in the Nov 11 session: rembg → MaxFilter(21) outline + blurred shadow).
- `parts_surv/v_main.js` `?v5=1` → v5 light + v5 camera on holds (`V5LOOK`): ~16 %/s zoom alternating in/out + slow turn, fly-overs start from the moving shot. Copy this into the next news main and make it the default.
- Subject SFX (Lumean, `tools/news_audio.py` → out/nwaudio): shutter, coins, gavel, crowd, cheer, boom, jet, type, ding, paper, alarm. Use them in cues next to pop/whoosh (shutter on every photo, coins on money, gavel on Congress, crowd on votes, boom only for real strikes), +3–6 dB over the old level.

## Faster pipeline (Nov 11)
`bash tools/news_make.sh <name> <parts_dir> all [fps]` = voice (Drew 1.1) → timing (MAXGAP 0.14) → scene build (adds parts_map2/m5_hi.js when the main uses it) → 14 test frames + sheet → PASS=scene/text at 60 fps → cues + bed + voice, loudnorm −14 → compose (4500k at 60 fps) → final sheet. Stages can be run one by one (`voice`, `timing`, `build`, `test`, `render`, `audio`, `compose`). Writing the script/table and the main is still the manual part.
Map v5 for any region: `python3 tools/hires_patch.py <name> <lon0> <lon1> <lat0> <lat1>` (NASA tiles download on demand), then in the main `await addHiPatch('<name>')` and `mapUni.uV5.value = 1`.
