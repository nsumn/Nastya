# "Everyone disappeared" — vizavi_motion revision storyboard (Oct 30, 2026)

Brief kept from her channel: TikTok vertical 1080×1920, 30 fps (her pipeline; the skill's 1920×1080/60 default is overridden by the brief), captions only, music + SFX on.
One thread: the planet empties → you two get everything → the systems quietly fail one by one → the friendship survives (the couch).

| Scene (s) | Variants considered | Chosen | Camera / optics | Type | Sound / sync |
|---|---|---|---|---|---|
| 0–2 crowd | static wide · crane down into the crowd · whip from a billboard · dolly along the sidewalk | crane down into the crowd (sets the city scale, ends on the two) | crane 5.2 → 1.8 m, ease-out | title words drop in, tilt + de-blur | music intro, poofs 1.4–3.6 s |
| 2–4 vanish | — | low dolly + arc on the two as people poof behind | dolly + 0.5 m arc | title blows away like the people | poofs; title exit lands on GONE (4.0) |
| 4–6 alone | static two-shot · orbit · snap zoom | slow orbit (−0.55 → +0.3 rad), DOF on faces | orbit, DOF | words rise in | music stops: wind only |
| 6–9 "Just you two" | cut to aerial · crane up · drone pull-back | crane up from the curb to 42 m over the empty avenue | crane with motion blur | — | cymbal + music back on 6.0 |
| 9–15 homes/cars | static aerial · drift · split wipe | drifting aerial while the city splits in two colours; lot tracks sideways | drift; tracking with MB | counters land with overshoot | dings on the landings |
| 15–21 market | — | dolly back as you push the cart; orbit on the friend eating, DOF | dolly / orbit + DOF | | crunches |
| 21–27 car | static front · tracking · side swing | whip-pan in, tracking front that swings to the side, MB | whip + MB | | whoosh, engine, wind |
| 27–33 grid | static map · push + drift | push in + drift while regions go dark | | percent counter | power-down, thuds per region |
| 33–39 subway | — | arc around the stairwell, crane down over the rising water | arc / crane | | water rush |
| 39–45 rot | — | push-in on the crying friend (DOF), arc to the can | push / arc + DOF | | sad trombone |
| 45–51 stall + bikes | — | whip in, orbit the dead car; whip to tracking bikes (MB) | whip + orbit; whip + MB | | whoosh, sputters, bell |
| 51–56.5 election | — | whip in, crane up to reveal the VOTE billboards; push-in two-shot (DOF) | crane; orbit + DOF | VOTES counter | drum roll → cymbal on "It's a tie" |
| 56.5–64 couch + card | — | dolly in + arc in the penthouse; arc on you (DOF); end card words assemble | dolly / arc + DOF | card title kinetic, answer lines slide in | soft section, final chord |

Main risks checked with test frames before the full render: motion-blur accumulation brightness (fixed: autoClear during accumulation), title tokenizer with `<span class="hl">` (fixed), DOF depth source (GTAO depth buffer), whip smear strength.
