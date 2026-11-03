"""Build koreg/index.html: Nano Banana stills + voice 11 + bed, realhistorically-style captions."""
import json, sys

S = sys.argv[1]
words = json.load(open(f"{S}/v11/words.json"))
END = 66.0
W, H = 1080, 1935  # image box (cover of 1438x2576 at width 1080)

# (image, t0, (scale0, fx0, fy0), (scale1, fx1, fy1))  fx/fy = focus point in the image, 0..1
SHOTS = [
    ("s01", 0.0,  (1.04, .5, .45), (1.24, .5, .42)),   # face, strong push
    ("s02", 1.4,  (1.0, .5, .6),  (1.16, .5, .6)),     # hands
    ("s03", 5.0,  (1.0, .5, .5),  (1.08, .5, .5)),     # heartbeat lines
    ("s03", 9.1,  (1.55, .52, .38), (1.68, .54, .38)), # their heads
    ("s04", 12.8, (1.04, .5, .45), (1.16, .45, .4)),   # breath
    ("s05", 14.3, (1.1, .55, .4), (1.22, .62, .38)),   # voice
    ("s06", 15.7, (1.0, .5, .5),  (1.1, .5, .5)),      # heartbeat close
    ("s06", 18.6, (1.45, .38, .45), (1.55, .38, .45)), # her closed eyes
    ("s07", 21.5, (1.0, .5, .5),  (1.07, .5, .5)),     # MRI wide
    ("s07", 25.7, (1.9, .33, .35), (2.0, .33, .35)),   # her worried face
    ("s07", 29.4, (1.7, .52, .58), (1.8, .52, .58)),   # hands holding
    ("s08", 33.9, (1.0, .45, .45), (1.14, .32, .38)),  # stranger
    ("s03", 35.8, (1.3, .5, .48), (1.4, .5, .46)),     # happy marriage
    ("s09", 39.7, (1.0, .5, .5),  (1.35, .38, .38)),   # airplane
    ("s10", 42.9, (1.0, .55, .5), (1.14, .62, .5)),    # storm
    ("s11", 47.1, (1.0, .5, .5),  (1.08, .5, .45)),    # hallway
    ("s11", 49.5, (1.6, .52, .34), (1.72, .52, .34)),  # hand on shoulder
    ("s12", 52.0, (1.0, .5, .5),  (1.08, .5, .5)),     # sofa
    ("s12", 54.3, (1.45, .6, .38), (1.6, .6, .38)),    # their faces
    ("s13", 59.2, (1.0, .5, .5),  (1.08, .5, .45)),    # harbor
    ("s13", 62.8, (1.7, .6, .6),  (1.02, .55, .5)),    # pull back reveal
]


def xy(s, fx, fy):
    x = (0.5 - fx) * W * s
    y = (0.5 - fy) * H * s
    mx, my = (s - 1) * W / 2, (s - 1) * H / 2
    return max(-mx, min(mx, x)), max(-my, min(my, y))


shots_html, tweens = [], []
for i, (img, t0, a, b) in enumerate(SHOTS):
    t1 = SHOTS[i + 1][1] if i + 1 < len(SHOTS) else END
    d = round(t1 - t0, 3)
    sid = f"sh{i:02d}"
    shots_html.append(
        f'<div id="{sid}" class="shot clip" data-start="{t0}" data-duration="{d}" data-track-index="0">'
        f'<img id="{sid}i" src="assets/{img}.jpg" alt=""/></div>')
    x0, y0 = xy(*a); x1, y1 = xy(*b)
    tweens.append(f'tl.fromTo("#{sid}i",{{scale:{a[0]},x:{x0:.0f},y:{y0:.0f}}},{{scale:{b[0]},x:{x1:.0f},y:{y1:.0f},duration:{d},ease:"sine.inOut"}},{t0});')

# captions: <=3 words, break after punctuation; skip the term (shown big)
chunks, cur = [], []
for w, s, e in words:
    for part in w.replace("sitzt.Darum", "sitzt. Darum").split(" "):
        cur.append((part, s, e))
        if len(cur) >= 3 or part[-1] in ".,!?" or sum(len(p) for p, _, _ in cur) > 16:
            chunks.append(cur); cur = []
if cur: chunks.append(cur)

caps_html = []
for i, ch in enumerate(chunks):
    text = " ".join(p for p, _, _ in ch).rstrip(".,")
    if text.startswith("Ko-Regulation"):
        continue
    t0 = ch[0][1]
    nxt = chunks[i + 1][0][1] if i + 1 < len(chunks) else END
    t1 = min(nxt, ch[-1][2] + 0.6)
    d = round(max(t1 - t0, 0.25), 3)
    cid = f"cp{i:03d}"
    caps_html.append(f'<div id="{cid}" class="cap clip" data-start="{t0:.3f}" data-duration="{d}" data-track-index="2"><span id="{cid}t">{text}</span></div>')
    tweens.append(f'tl.fromTo("#{cid}t",{{scale:.8,opacity:0}},{{scale:1,opacity:1,duration:.12,ease:"back.out(3)"}},{t0:.3f});')

# kinetic term
letters = "".join(f'<span class="ltr" id="l{i}">{c}</span>' for i, c in enumerate("KO-REGULATION"))
term = (f'<div id="term" class="clip" data-start="6.9" data-duration="2.2" data-track-index="3">'
        f'<div id="termIn" class="term">{letters}</div></div>')
tweens.append('tl.fromTo("#termIn .ltr",{y:60,opacity:0,scale:.4},{y:0,opacity:1,scale:1,duration:.22,ease:"back.out(3)",stagger:.045},7.2);')
tweens.append('tl.fromTo("#termIn",{scale:1},{scale:1.08,duration:1.9,ease:"none"},7.2);')

html = f'''<!doctype html>
<html lang="de" data-resolution="portrait">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=1080, height=1920"/>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
<style>
* {{ margin:0; padding:0; box-sizing:border-box; }}
html, body {{ margin:0; width:1080px; height:1920px; overflow:hidden; background:#000; }}
#root {{ position:relative; width:100%; height:100%; font-family:"Montserrat", sans-serif; overflow:hidden; }}
.shot {{ position:absolute; inset:0; overflow:hidden; }}
.shot img {{ position:absolute; left:0; top:-7px; width:{W}px; height:{H}px; object-fit:cover; }}
#vig {{ position:absolute; inset:0; background:radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 58%, rgba(10,6,4,.45) 100%); z-index:5; }}
.cap {{ position:absolute; left:70px; right:70px; top:1420px; text-align:center; z-index:10; }}
.cap span {{ display:inline-block; color:#fff; font-weight:800; font-size:66px; line-height:1.08; text-transform:uppercase;
  -webkit-text-stroke:10px #1d130d; paint-order:stroke fill; text-shadow:0 6px 10px rgba(0,0,0,.6); }}
.term {{ position:absolute; left:0; right:0; top:520px; text-align:center; z-index:11; font-weight:900; font-size:100px; color:#ffd54a; white-space:nowrap;
  -webkit-text-stroke:16px #1d130d; paint-order:stroke fill; text-shadow:0 10px 14px rgba(0,0,0,.6); letter-spacing:1px; }}
.ltr {{ display:inline-block; }}
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="{END}" data-width="1080" data-height="1920">
{chr(10).join(shots_html)}
<div id="vig" class="clip" data-start="0" data-duration="{END}" data-track-index="1"></div>
{chr(10).join(caps_html)}
{term}
<audio id="voice" src="assets/voice.mp3" data-start="0" data-track-index="5"></audio>
<audio id="bed" src="assets/bed.wav" data-start="0" data-duration="{END}" data-track-index="6"></audio>
</div>
<script>
const tl = gsap.timeline({{ paused: true }});
{chr(10).join(tweens)}
window.__timelines["main"] = tl;
tl.seek(0);
</script>
</body>
</html>'''
open(f"{S}/koreg/index.html", "w").write(html)
print("shots", len(SHOTS), "captions", len(caps_html))
