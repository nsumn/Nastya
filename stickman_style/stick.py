"""Stick-figure metaphor stills (Love Bombing). Writes stick/index.html with 6 scenes, 2 s each."""
import math, sys

INK = "#1e1a1a"
RED = "#d42a2a"
RED_D = "#9e1717"
WHITE = "#ffffff"
HAIR = "#7a4a2a"


def P(x, y, ang, L):
    a = math.radians(ang)
    return x + L * math.sin(a), y + L * math.cos(a)


def tube(pts, fill, w=30):
    d = "M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in pts)
    return (f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="{w+10}" stroke-linecap="round" stroke-linejoin="round"/>'
            f'<path d="{d}" fill="none" stroke="{fill}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>')


def face(cx, cy, kind, s=1.0):
    e = lambda dx, dy, rx=5.5, ry=8: f'<ellipse cx="{cx+dx*s}" cy="{cy+dy*s}" rx="{rx*s}" ry="{ry*s}" fill="{INK}"/>'
    L = lambda d, w=4.5: f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="{w*s}" stroke-linecap="round"/>'
    def p(*pts):  # relative points -> path
        return "M" + " ".join(f"{cx+x*s:.1f} {cy+y*s:.1f}" + ("" if i else "") for i, (x, y) in enumerate(pts))
    if kind == "happy":
        return e(-17, -4) + e(17, -4) + \
            f'<path d="M{cx-20*s} {cy+16*s} Q{cx} {cy+38*s} {cx+20*s} {cy+16*s}" fill="none" stroke="{INK}" stroke-width="{4.5*s}" stroke-linecap="round"/>' \
            f'<ellipse cx="{cx-32*s}" cy="{cy+12*s}" rx="{9*s}" ry="{5*s}" fill="#f4a3a3"/><ellipse cx="{cx+32*s}" cy="{cy+12*s}" rx="{9*s}" ry="{5*s}" fill="#f4a3a3"/>'
    if kind == "love":
        h = lambda dx: f'<path transform="translate({cx+dx*s} {cy-4*s}) scale({.55*s})" d="M0 8 C-14 -6 -24 6 0 22 C24 6 14 -6 0 8 Z" fill="{RED}" stroke="{INK}" stroke-width="3"/>'
        return h(-18) + h(18) + f'<path d="M{cx-20*s} {cy+18*s} Q{cx} {cy+40*s} {cx+20*s} {cy+18*s}" fill="none" stroke="{INK}" stroke-width="{4.5*s}" stroke-linecap="round"/>'
    if kind == "smug":
        return (L(f"M{cx-28*s} {cy-6*s} L{cx-8*s} {cy-2*s} M{cx+28*s} {cy-6*s} L{cx+8*s} {cy-2*s}", 6) +
                e(-17, 4, 5, 5) + e(17, 4, 5, 5) +
                f'<path d="M{cx-14*s} {cy+22*s} Q{cx+6*s} {cy+30*s} {cx+20*s} {cy+16*s}" fill="none" stroke="{INK}" stroke-width="{4.5*s}" stroke-linecap="round"/>')
    if kind == "cold":
        return (L(f"M{cx-26*s} {cy-14*s} L{cx-8*s} {cy-10*s} M{cx+26*s} {cy-14*s} L{cx+8*s} {cy-10*s}", 5) +
                e(-17, 0, 5, 5) + e(17, 0, 5, 5) + L(f"M{cx-12*s} {cy+24*s} H{cx+12*s}"))
    if kind == "sad":
        return (L(f"M{cx-28*s} {cy-12*s} L{cx-8*s} {cy-20*s} M{cx+28*s} {cy-12*s} L{cx+8*s} {cy-20*s}", 4.5) +
                e(-17, -2) + e(17, -2) +
                f'<path d="M{cx-16*s} {cy+28*s} Q{cx} {cy+16*s} {cx+16*s} {cy+28*s}" fill="none" stroke="{INK}" stroke-width="{4.5*s}" stroke-linecap="round"/>' +
                f'<path d="M{cx+20*s} {cy+8*s} q{6*s} {12*s} 0 {18*s} q{-6*s} {-6*s} 0 {-18*s}" fill="#8fd0ff" stroke="{INK}" stroke-width="{2.5*s}"/>')
    if kind == "unsure":
        return (L(f"M{cx-28*s} {cy-16*s} L{cx-8*s} {cy-12*s} M{cx+28*s} {cy-20*s} L{cx+8*s} {cy-14*s}", 4.5) +
                e(-17, 0) + e(17, 0) +
                f'<path d="M{cx-14*s} {cy+24*s} Q{cx-4*s} {cy+18*s} {cx+4*s} {cy+24*s} Q{cx+10*s} {cy+30*s} {cx+16*s} {cy+22*s}" fill="none" stroke="{INK}" stroke-width="{4*s}" stroke-linecap="round"/>')
    return ""


def figure(x, ground, col, f="happy", la=(20, 10), ra=(-20, -10), ll=(8, 0), rl=(-8, 0), lean=0, hair=False, s=1.3, extra_hand=""):
    """Stick figure. Arm/leg angles: (upper, lower) degrees from straight down (+ = towards figure's left/screen-left? -> sin)."""
    leg, arm, torso, hr = 100 * s, 82 * s, 150 * s, 58 * s
    hip = (x, ground - 2 * leg)
    neck = P(*hip, 180 + lean, torso)
    out = []
    for (a1, a2) in (ll, rl):
        k = P(*hip, a1, leg); ft = P(*k, a2, leg)
        out.append(tube([hip, k, ft], col, 30 * s))
        out.append(f'<ellipse cx="{ft[0]+ (10*s if a1 <= 0 else -10*s):.1f}" cy="{ft[1]+4*s:.1f}" rx="{20*s}" ry="{11*s}" fill="{col}" stroke="{INK}" stroke-width="{5*s}"/>')
    out.append(tube([hip, neck], col, 46 * s))
    hands = []
    for (a1, a2) in (la, ra):
        sh = neck[0], neck[1] + 18 * s
        e = P(*sh, a1, arm); h = P(*e, a2, arm)
        out.append(tube([sh, e, h], col, 26 * s))
        hands.append(h)
    for h in hands:
        out.append(f'<circle cx="{h[0]:.1f}" cy="{h[1]:.1f}" r="{16*s}" fill="{col}" stroke="{INK}" stroke-width="{5*s}"/>')
    hc = P(*neck, 180 + lean, hr + 6 * s)
    if hair:
        out.append(f'<path d="M{hc[0]-hr-8*s} {hc[1]+30*s} Q{hc[0]-hr-14*s} {hc[1]-hr} {hc[0]} {hc[1]-hr-10*s} Q{hc[0]+hr+14*s} {hc[1]-hr} {hc[0]+hr+8*s} {hc[1]+30*s} Q{hc[0]+hr-4*s} {hc[1]+50*s} {hc[0]+hr-10*s} {hc[1]+44*s} L{hc[0]-hr+10*s} {hc[1]+44*s} Q{hc[0]-hr+4*s} {hc[1]+50*s} {hc[0]-hr-8*s} {hc[1]+30*s} Z" fill="{HAIR}" stroke="{INK}" stroke-width="{5*s}"/>')
    out.append(f'<circle cx="{hc[0]:.1f}" cy="{hc[1]:.1f}" r="{hr}" fill="{col}" stroke="{INK}" stroke-width="{6*s}"/>')
    if hair:
        out.append(f'<path d="M{hc[0]-hr+2*s} {hc[1]-10*s} Q{hc[0]-10*s} {hc[1]-hr-6*s} {hc[0]+hr-2*s} {hc[1]-14*s} Q{hc[0]+20*s} {hc[1]-hr+16*s} {hc[0]-hr+2*s} {hc[1]-10*s} Z" fill="{HAIR}" stroke="{INK}" stroke-width="{5*s}"/>')
        out.append(f'<circle cx="{hc[0]+hr-2*s}" cy="{hc[1]+12*s}" r="{6*s}" fill="#f0c24a" stroke="{INK}" stroke-width="{2.5*s}"/>')
    out.append(face(hc[0], hc[1] + 6 * s, f, s * (1 if col == WHITE else 1)))
    return "".join(out), hands, hc


def heart(x, y, s=1.0, fill=RED, rot=0):
    return (f'<path transform="translate({x} {y}) rotate({rot}) scale({s})" d="M0 -12 C-18 -42 -62 -22 -42 12 C-30 32 -10 44 0 56 C10 44 30 32 42 12 C62 -22 18 -42 0 -12 Z" '
            f'fill="{fill}" stroke="{INK}" stroke-width="{6/s:.1f}" stroke-linejoin="round"/>')


def ground(y=1440):
    tufts = "".join(f'<path d="M{x} {y} l6 -16 M{x+8} {y} l2 -20 M{x+16} {y} l-4 -14" stroke="{INK}" stroke-width="3" fill="none"/>' for x in (90, 300, 520, 760, 980))
    return f'<path d="M-20 {y} H1100" stroke="{INK}" stroke-width="6"/>' + tufts


def scene(title, body):
    return f'''<svg viewBox="0 0 1080 1920" width="1080" height="1920">
<rect width="1080" height="1920" fill="#f7f6f2"/>
{body}
</svg>
<div class="ttl">{title}</div>'''


G = 1560
S = []

# 1 — perfect at the start: he kneels with a bouquet, hearts around
him, hh, _ = figure(700, G, RED, "love", la=(-70, -100), ra=(-50, -80), ll=(-80, 0), rl=(10, 90), lean=-8)
her, _, _ = figure(300, G, WHITE, "love", la=(150, 160), ra=(-150, -160), hair=True)
bq = (f'<g transform="translate({hh[0][0]-10} {hh[0][1]-40})">'
      f'<path d="M-20 70 L0 0 L20 70 Z" fill="#7fb85a" stroke="{INK}" stroke-width="5"/>' +
      "".join(f'<circle cx="{dx}" cy="{dy}" r="22" fill="{c}" stroke="{INK}" stroke-width="5"/>' for dx, dy, c in [(-30, -10, RED), (0, -30, "#ff8fb0"), (30, -8, RED), (-12, 12, "#ff8fb0"), (16, 12, RED)]) + '</g>')
hs = "".join(heart(x, y, sc, rot=r) for x, y, sc, r in [(200, 760, .9, -15), (470, 680, 1.2, 8), (820, 760, .8, 18), (300, 560, .6, 0), (900, 600, .7, -10), (620, 520, .5, 12)])
S.append(scene("Am Anfang ist<br>er <span>perfekt.</span>", ground(G) + hs + her + him + bq))

# 2 — Love Bombing: hearts with fuses falling on her
her, _, hc = figure(540, G, WHITE, "unsure", la=(150, 170), ra=(-150, -170), hair=True)
bombs = ""
for x, y, sc, r in [(360, 560, 1.3, -20), (690, 470, 1.6, 15), (520, 760, 1.0, 5), (230, 860, .9, -30), (850, 700, 1.1, 25), (980, 420, .8, 0), (110, 480, .8, 10)]:
    bombs += heart(x, y, sc, rot=r)
    bombs += f'<path d="M{x} {y-14*sc} q10 -40 34 -46" fill="none" stroke="{INK}" stroke-width="5" transform="rotate({r} {x} {y})"/>'
    bombs += f'<g transform="rotate({r} {x} {y})"><circle cx="{x+34}" cy="{y-14*sc-46}" r="10" fill="#ffcf3f" stroke="{INK}" stroke-width="3"/></g>'
    bombs += f'<path d="M{x-40*sc} {y-120*sc} l-10 -40 M{x} {y-130*sc} v-44 M{x+40*sc} {y-120*sc} l10 -40" stroke="{INK}" stroke-width="4" opacity=".35"/>'
S.append(scene("In der Psychologie:<br><span>Love Bombing.</span>", ground(G) + her + bombs))

# 3 — 50 messages a day
her, hh, _ = figure(360, G, WHITE, "love", la=(-60, -150), ra=(-30, -140), hair=True)
phone = (f'<g transform="translate(720 640)"><rect x="-120" y="-60" width="240" height="430" rx="34" fill="#2a2a33" stroke="{INK}" stroke-width="7"/>'
         f'<rect x="-100" y="-30" width="200" height="370" rx="14" fill="#fff"/>' +
         "".join(f'<rect x="{-86 if i%2 else -40}" y="{-14+i*70}" width="126" height="50" rx="18" fill="{RED if i%2==0 else "#ffd9d9"}" stroke="{INK}" stroke-width="4"/>'
                 f'<text x="{-23 if i%2 else 23}" y="{19+i*70}" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="30" fill="{"#fff" if i%2==0 else RED}">{["♥","Ich vermiss dich","♥♥","Du bist alles","♥"][i] if i in (0,2,4) else "♥ ♥"}</text>' for i in range(5)) +
         f'<circle cx="110" cy="-60" r="62" fill="{RED}" stroke="{INK}" stroke-width="7"/><text x="110" y="-38" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="64" fill="#fff">50</text></g>')
S.append(scene("50 Nachrichten<br>am <span>Tag.</span>", ground(G) + her + phone))

# 4 — then it gets cold: he turns away, the string sags, snowflakes
him, hh2, hc2 = figure(800, G, RED, "cold", la=(10, 0), ra=(-10, 0), lean=4)
her, hh1, _ = figure(260, G, WHITE, "sad", la=(-80, -95), ra=(-20, -10), hair=True)
string = f'<path d="M{hh1[0][0]} {hh1[0][1]} Q540 {G-40} {hh2[1][0]} {hh2[1][1]}" fill="none" stroke="{RED}" stroke-width="6" stroke-dasharray="2 0"/>'
flakes = "".join(f'<g transform="translate({x} {y}) scale({s})" stroke="#5aa8e6" stroke-width="6" stroke-linecap="round"><path d="M0 -30 V30 M-26 -15 L26 15 M-26 15 L26 -15"/></g>' for x, y, s in [(700, 640, 1.2), (900, 560, .9), (980, 760, .7), (620, 820, .6)])
S.append(scene("Dann wird er<br><span>kälter.</span>", ground(G) + string + her + him + flakes))

# 5 — intermittent reinforcement: slot machine of hearts
her, hh, _ = figure(230, G, WHITE, "unsure", la=(-90, -100), ra=(-20, -10), hair=True)
slot = (f'<g transform="translate(740 1080)"><rect x="-220" y="-300" width="440" height="560" rx="40" fill="{RED}" stroke="{INK}" stroke-width="8"/>'
        f'<rect x="-180" y="-220" width="360" height="200" rx="18" fill="#fff" stroke="{INK}" stroke-width="7"/>'
        f'<path d="M-60 -220 V-20 M60 -220 V-20" stroke="{INK}" stroke-width="6"/>' +
        heart(-120, -130, .9) +
        f'<g transform="translate(0 -120)" stroke="#5aa8e6" stroke-width="7" stroke-linecap="round"><path d="M0 -40 V40 M-34 -20 L34 20 M-34 20 L34 -20"/></g>' +
        heart(120, -130, .9) +
        f'<rect x="-150" y="40" width="300" height="80" rx="16" fill="#9e1717" stroke="{INK}" stroke-width="6"/>'
        f'<text x="0" y="96" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="44" fill="#ffd54a">???</text>'
        f'<path d="M220 -200 h50 v-140" fill="none" stroke="{INK}" stroke-width="12"/><circle cx="270" cy="-350" r="30" fill="#ffcf3f" stroke="{INK}" stroke-width="7"/>'
        f'<rect x="-200" y="260" width="400" height="40" rx="10" fill="#9e1717" stroke="{INK}" stroke-width="6"/></g>')
S.append(scene("Mal warm, mal kalt:<br><span>intermittierende<br>Verstärkung.</span>", ground(G) + slot + her))

# 6 — waiting for the man from the beginning: she holds a photo, a smiling mask lies on the floor
her, hh, _ = figure(520, G, WHITE, "sad", la=(-60, -40), ra=(-30, -60), hair=True)
photo = (f'<g transform="translate({hh[0][0]-150} {hh[0][1]+40}) rotate(-8)"><rect x="-90" y="-110" width="180" height="210" rx="8" fill="#fff" stroke="{INK}" stroke-width="7"/>'
         f'<rect x="-72" y="-92" width="144" height="150" fill="#ffe3e3"/>'
         f'<circle cx="0" cy="-30" r="40" fill="{RED}" stroke="{INK}" stroke-width="5"/>' + face(0, -26, "love", .7) +
         f'<path d="M-40 58 Q0 10 40 58 Z" fill="{RED}" stroke="{INK}" stroke-width="5"/></g>')
mask = (f'<g transform="translate(820 {G-40}) rotate(12)"><path d="M-80 -30 Q0 -80 80 -30 Q80 40 0 50 Q-80 40 -80 -30 Z" fill="#fff" stroke="{INK}" stroke-width="7"/>' +
        face(0, 0, "happy", 1.1) + f'<path d="M-80 -20 L-130 -40 M80 -20 L130 -40" stroke="{INK}" stroke-width="5"/></g>')
S.append(scene("Sie wartet auf den<br>Mann vom Anfang.<br><span>Den gab es nie.</span>", ground(G) + her + photo + mask))

clips = "\n".join(f'<div id="s{i}" class="sc clip" data-start="{i*2}" data-duration="2" data-track-index="0">{s}</div>' for i, s in enumerate(S))
html = f'''<!doctype html><html lang="de" data-resolution="portrait"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=1080, height=1920"/>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
<style>*{{margin:0;padding:0;box-sizing:border-box}}html,body{{width:1080px;height:1920px;overflow:hidden;background:#f7f6f2}}
#root{{position:relative;width:100%;height:100%;font-family:"Montserrat",sans-serif}}
.sc{{position:absolute;inset:0}} .sc svg{{position:absolute;inset:0}}
.ttl{{position:absolute;left:60px;right:60px;top:220px;text-align:center;font-weight:900;font-size:76px;line-height:1.08;color:#1e1a1a;text-transform:uppercase}}
.ttl span{{color:{RED}}}</style></head><body>
<div id="root" data-composition-id="main" data-start="0" data-duration="{2*len(S)}" data-width="1080" data-height="1920">
{clips}
</div>
<script>const tl=gsap.timeline({{paused:true}});window.__timelines["main"]=tl;tl.seek(0);</script></body></html>'''
open(sys.argv[1], "w").write(html)
print("ok", len(S))
