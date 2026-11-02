import sys
sys.argv=[sys.argv[0]]
from stick_lib import *
import stick_lib as L

def variant(dark):
    you = "#f3f1ec" if dark else "#17171b"
    bg = ('<defs><radialGradient id="bg" cx=".5" cy=".42" r=".8"><stop offset="0" stop-color="#22252f"/><stop offset="1" stop-color="#0a0a0d"/></radialGradient></defs><rect width="1080" height="1920" fill="url(#bg)"/>'
          if dark else '<rect width="1080" height="1920" fill="#f4f2ed"/>')
    line = "#cfd3dc" if dark else "#1e1a1a"
    txt = "#f3f1ec" if dark else "#1e1a1a"
    G = 1500
    gr = f'<path d="M-20 {G} H1100" stroke="{line}" stroke-width="5" opacity=".8"/>'
    out = []
    # scene 1: love bombing — he kneels with flowers, she (faceless) — hearts
    him, hh, _ = figure(700, G, RED, "smug", la=(-70, -100), ra=(-50, -80), ll=(-80, 0), rl=(10, 90), lean=-8)
    her, _, _ = figure(320, G, you, "none", la=(30, 10), ra=(-30, -10))
    bq = (f'<g transform="translate({hh[0][0]-10} {hh[0][1]-40})"><path d="M-20 70 L0 0 L20 70 Z" fill="#7fb85a" stroke="{INK}" stroke-width="5"/>' +
          "".join(f'<circle cx="{dx}" cy="{dy}" r="22" fill="{c}" stroke="{INK}" stroke-width="5"/>' for dx, dy, c in [(-30, -10, RED), (0, -30, "#ff8fb0"), (30, -8, RED), (-12, 12, "#ff8fb0"), (16, 12, RED)]) + '</g>')
    hs = "".join(heart(x, y, sc, rot=r) for x, y, sc, r in [(250, 820, .7, -15), (470, 760, 1.0, 8), (820, 800, .7, 18), (380, 640, .5, 0), (900, 640, .6, -10)])
    out.append((bg + gr + hs + her + him + bq, "Am Anfang ist er<br><span>perfekt.</span>"))
    # scene 2: he gets cold
    him, hh2, _ = figure(800, G, RED, "cold", la=(10, 0), ra=(-10, 0), lean=4)
    her, hh1, _ = figure(270, G, you, "none", la=(-80, -95), ra=(-20, -10), lean=-6)
    string = f'<path d="M{hh1[0][0]} {hh1[0][1]} Q540 {G-40} {hh2[1][0]} {hh2[1][1]}" fill="none" stroke="{RED}" stroke-width="6"/>'
    flakes = "".join(f'<g transform="translate({x} {y}) scale({s})" stroke="#5aa8e6" stroke-width="6" stroke-linecap="round"><path d="M0 -30 V30 M-26 -15 L26 15 M-26 15 L26 -15"/></g>' for x, y, s in [(700, 700, 1.2), (900, 620, .9), (980, 820, .7)])
    out.append((bg + gr + string + her + him + flakes, "Dann wird er<br><span>kälter.</span>"))
    pages = []
    for body, title in out:
        pages.append(f'<svg viewBox="0 0 1080 1920" width="1080" height="1920" style="position:absolute;inset:0">{body}</svg>'
                     f'<div style="position:absolute;left:60px;right:60px;top:300px;text-align:center;font:900 80px Montserrat;line-height:1.08;text-transform:uppercase;color:{txt}">{title.replace("<span>", f"<span style=color:{RED}>")}</div>')
    return pages

L.face_orig = L.face
def face2(cx, cy, kind, s=1.0):
    return "" if kind == "none" else L.face_orig(cx, cy, kind, s)
L.face = face2
import builtins
pages = variant(True) + variant(False)
clips = "\n".join(f'<div class="clip" style="position:absolute;inset:0" id="p{i}" data-start="{i}" data-duration="1" data-track-index="0">{p}</div>' for i, p in enumerate(pages))
open(sys.argv[0].replace("ab.py", "ab/index.html"), "w").write(f'''<!doctype html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=1080, height=1920"/>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
<style>*{{margin:0;padding:0}}html,body{{width:1080px;height:1920px;overflow:hidden}}</style></head><body>
<div id="root" data-composition-id="main" data-start="0" data-duration="{len(pages)}" data-width="1080" data-height="1920" style="position:relative;width:1080px;height:1920px">{clips}</div>
<script>const tl=gsap.timeline({{paused:true}});window.__timelines["main"]=tl;</script></body></html>''')
print("ok", len(pages))
