# 만약 서울의 모든 불이 5초 동안 꺼진다면? — approved script (Nov 3, "ok")
Banpo park, moonless clear night, the hero + crowd. Story time slowed, ms HUD. Numbers: tools/blackout_math.py.
| t | shot | caption |
|---|---|---|
| 0–3.6 | S1 wide from the park: fountain, city, Namsan; everything goes dark at 3.0 | title · countdown 소등까지 |
| 3.6–6.5 | S2 high over the Han: the orange dome drains (µs on the HUD) | 하늘의 빛은 0.0001초 만에 사라진다 |
| 6.5–10 | S3 his face in the dark, eyes widen | 동공은 몇 초 만에 커진다 |
| 10–15 | S4 his POV tilting up, stars fill in (counter 20 → 2,500, MODEL) | 서울 밤하늘의 별: 약 20개 / 진짜 어두운 하늘: 2,500개 |
| 15–21 | S5 drone pull-back, Milky Way over the dark city | 하지만 눈이 은하수를 보려면 / 20–30분이 필요하다 |
| 21–24 | S6 low on the hero looking up, stars behind | 1994년 LA 정전 … 천문대에 전화했다고 한다 |
| 24–26.2 | S7 = S1, lights back (flash) | 5초 끝. 다시 별 20개. |
| 26.2–30 | end card (answer) | |
Sources: eye adaptation (Wikipedia "Adaptation (eye)", WTAMU Baird 2013, The Conversation); ~20 stars in Seoul (Korea JoongAng Daily); ~2,500 at a dark site (EarthSky, Sky & Telescope); LA 1994 Griffith Observatory calls (NPS, Discover). The Milky Way shows only because the camera "adapts" — the caption says eyes need 20–30 min.
Night sky: `b_sky.js` (Milky Way arching across the north as in early-November evenings, 30k stars with magnitudes). Lights switch: `lightsK()` in `b_main.js` (all emissive/HDR-unlit/point lights in the set).
