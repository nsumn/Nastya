---
name: whatif-tiktok-video
description: "Make a 3D 'What if…' TikTok video (1080×1920, ≥61 s, English for the US) with the earthstop engine in this repo: topic, researched script, three.js scene, music/SFX (or Lumean narration), render, encode, TikTok description."
---

# What-if TikTok video (earthstop engine)

This repo already contains the whole engine and every past video. Do not start from scratch:

1. Read `earthstop/HANDOFF.md` (current state, the channel owner's feedback and rules — follow them), then `earthstop/CLAUDE.md` (workflow, TikTok safe zones, pitfalls, render/encode commands) and `earthstop/README.md` (every scene and its reusable parts).
2. Run `bash earthstop/setup.sh` (npm install, numpy/scipy, Xvfb, local server on :8765).
3. Apply the `vizavi-motion` skill (`.claude/skills/vizavi-motion/`) adapted to the channel brief, as described in `earthstop/CLAUDE.md` §7.
4. Workflow per video: 4–6 topic ideas → researched facts with sources + math in `earthstop/tools/*.py` → time-coded script table → wait for approval → build `parts_<name>/` + `index_<name>.html` (+ `audio_<name>.py`) → test frames → full render → review the decoded MP4 → deliver the mp4 + English TikTok caption + hashtags + 2 alternatives + known flaws.
5. Talk to the user in Russian; everything on screen is English with US units. Commit and push engine changes (never renders, mp4/wav, songs, or API keys).

The newest, most complete examples to copy from: `parts_gone/` (story video in New York, two characters, motion blur / DOF / whip-pans / kinetic captions), `parts_spooky/` (beat-synced to a song), `parts_groc/` (narrated with Lumean TTS), `parts_energy/` (body timeline).
