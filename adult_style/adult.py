"""Adult faceless-silhouette stills (dark evening scenes). Writes adult/index.html, 6 clips x 1 s."""
import sys

OUT = sys.argv[1]
SK = "#18181d"      # silhouette (skin/hair/legs)
ROSE = "#b9787f"    # her cardigan
SAGE = "#66766a"    # his shirt
WARM = "#ffcf8a"
WALL = "#2a2d38"
WALL2 = "#232631"
FLOOR = "#1c1e26"
WOOD = "#5b4434"
TXT = "#f3efe8"
ACC = "#f0b48a"


def L(d, w, c=SK, cap="round"):
    return f'<path d="{d}" fill="none" stroke="{c}" stroke-width="{w}" stroke-linecap="{cap}" stroke-linejoin="round"/>'


def lamp_glow(x, y, r=420, o=.55):
    return f'<circle cx="{x}" cy="{y}" r="{r}" fill="url(#glow)" opacity="{o}"/>'


def her_sit(x, y, f=1, mood="down", cup=True):
    """Woman sitting in profile, facing f (1 = right). (x,y) = hip on seat."""
    s = f
    hx, hy = x + 18 * s, y - 250          # head
    if mood == "down":
        hx, hy = x + 40 * s, y - 232
    out = []
    # legs (dark trousers)
    out.append(L(f"M{x} {y} L{x+120*s} {y+6} L{x+128*s} {y+170}", 46))
    out.append(f'<ellipse cx="{x+150*s}" cy="{y+176}" rx="34" ry="14" fill="{SK}"/>')
    # hair back (shoulder length)
    out.append(f'<path d="M{hx-50*s} {hy-30} Q{hx-70*s} {hy+60} {hx-46*s} {hy+96} Q{hx-10*s} {hy+104} {hx+6*s} {hy+60} Z" fill="{SK}"/>')
    # torso cardigan (slightly hunched)
    out.append(f'<path d="M{x-40*s} {y+10} Q{x-52*s} {y-110} {x-8*s} {y-190} Q{x+36*s} {y-206} {x+56*s} {y-176} Q{x+70*s} {y-90} {x+50*s} {y+10} Z" fill="{ROSE}"/>')
    out.append(f'<path d="M{x+44*s} {y-170} Q{x+60*s} {y-90} {x+46*s} {y+6}" fill="none" stroke="#000" stroke-opacity=".18" stroke-width="10"/>')
    # neck + head
    out.append(L(f"M{x+20*s} {y-188} L{hx-4*s} {hy+40}", 30))
    out.append(f'<circle cx="{hx}" cy="{hy}" r="54" fill="{SK}"/>')
    out.append(f'<path d="M{hx-56*s} {hy-8} Q{hx-30*s} {hy-70} {hx+30*s} {hy-50} Q{hx+10*s} {hy-30} {hx-20*s} {hy-10} Z" fill="{SK}"/>')
    # arm to table (forearm forward)
    ax, ay = x + 30 * s, y - 160
    out.append(L(f"M{ax} {ay} L{ax+40*s} {ay+110} L{ax+170*s} {ay+96}", 30, ROSE))
    out.append(f'<circle cx="{ax+178*s}" cy="{ay+94}" r="17" fill="{SK}"/>')
    if cup:
        out.append(f'<g transform="translate({ax+205*s} {ay+60})"><path d="M-26 0 H26 L20 44 H-20 Z" fill="#e9e1d4"/><path d="M26 10 q22 4 0 22" fill="none" stroke="#e9e1d4" stroke-width="7"/>'
                   f'<path d="M-6 -12 q-8 -18 4 -34 M8 -14 q-8 -16 4 -30" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="5" stroke-linecap="round"/></g>')
    return "".join(out)


def stand(x, g, f=1, col=ROSE, who="her", coat=None, bag=False, case=False, head_down=False):
    s = f
    hx, hy = x + (10 * s if head_down else 0), g - 470 + (14 if head_down else 0)
    out = []
    out.append(L(f"M{x-14} {g-210} L{x-18} {g}", 40))
    out.append(L(f"M{x+16} {g-210} L{x+22} {g}", 40))
    out.append(f'<ellipse cx="{x-18+16*s}" cy="{g+2}" rx="30" ry="12" fill="{SK}"/><ellipse cx="{x+22+16*s}" cy="{g+2}" rx="30" ry="12" fill="{SK}"/>')
    if who == "her":
        out.append(f'<path d="M{hx-54} {hy-20} Q{hx-72} {hy+70} {hx-46} {hy+104} Q{hx} {hy+112} {hx+46} {hy+104} Q{hx+72} {hy+70} {hx+54} {hy-20} Z" fill="{SK}"/>')
    body_col = coat or col
    if coat:
        out.append(f'<path d="M{x-62} {g-150} L{x-56} {g-360} Q{x} {g-392} {x+56} {g-360} L{x+62} {g-150} Z" fill="{coat}"/>')
    else:
        out.append(f'<path d="M{x-54} {g-200} L{x-52} {g-360} Q{x} {g-390} {x+52} {g-360} L{x+54} {g-200} Z" fill="{col}"/>')
    out.append(L(f"M{x} {g-382} L{hx} {hy+40}", 30))
    out.append(f'<circle cx="{hx}" cy="{hy}" r="54" fill="{SK}"/>')
    if who == "her":
        out.append(f'<path d="M{hx-56} {hy-6} Q{hx-40} {hy-72} {hx+10} {hy-60} Q{hx+60} {hy-50} {hx+56} {hy-4} Q{hx+20} {hy-40} {hx-56} {hy-6} Z" fill="{SK}"/>')
    else:
        out.append(f'<path d="M{hx-54} {hy-14} Q{hx-40} {hy-66} {hx+10} {hy-62} Q{hx+56} {hy-56} {hx+54} {hy-14} Q{hx} {hy-42} {hx-54} {hy-14} Z" fill="{SK}"/>')
    # arms
    out.append(L(f"M{x-48} {g-350} L{x-62} {g-240} L{x-58} {g-150}", 28, body_col))
    out.append(L(f"M{x+48} {g-350} L{x+62} {g-240} L{x+58} {g-150}", 28, body_col))
    out.append(f'<circle cx="{x-58}" cy="{g-140}" r="16" fill="{SK}"/><circle cx="{x+58}" cy="{g-140}" r="16" fill="{SK}"/>')
    if bag:
        out.append(f'<path d="M{x-58} {g-150} L{x-90} {g-320}" stroke="#3a2f2a" stroke-width="7"/><rect x="{x-118}" y="{g-170}" width="90" height="80" rx="12" fill="#3a2f2a"/>')
    if case:
        out.append(f'<g><rect x="{x+70}" y="{g-200}" width="130" height="190" rx="16" fill="#46404a" stroke="#000" stroke-opacity=".3" stroke-width="5"/>'
                   f'<path d="M{x+110} {g-200} v-30 h50 v30" fill="none" stroke="#46404a" stroke-width="10"/><circle cx="{x+90}" cy="{g-4}" r="9" fill="#111"/><circle cx="{x+180}" cy="{g-4}" r="9" fill="#111"/></g>')
    return "".join(out)


def room(back=WALL):
    return (f'<rect width="1080" height="1920" fill="{back}"/>'
            f'<rect y="1380" width="1080" height="540" fill="{FLOOR}"/>'
            f'<path d="M0 1380 H1080" stroke="#000" stroke-opacity=".35" stroke-width="6"/>')


def window(x, y, w, h, night=True, rain=False):
    sky = '<rect x="{0}" y="{1}" width="{2}" height="{3}" fill="url(#night)"/>'.format(x, y, w, h)
    lights = "".join(f'<rect x="{x+20+i*55}" y="{y+h-90-(i%3)*40}" width="16" height="22" fill="#f3c46e" opacity=".7"/>' for i in range(int(w / 55) - 1))
    r = "".join(f'<path d="M{x+15+i*37} {y+10+(i*53)%h*0.6} l-10 34" stroke="#9fb3d6" stroke-opacity=".35" stroke-width="3"/>' for i in range(int(w / 37))) if rain else ""
    return (sky + lights + r + f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="none" stroke="#14151b" stroke-width="18"/>'
            f'<path d="M{x+w/2} {y} V{y+h} M{x} {y+h*.45} H{x+w}" stroke="#14151b" stroke-width="12"/>')


def pendant(x, y, h=300):
    return (lamp_glow(x, y + h + 40, 520, .6) + f'<path d="M{x} 0 V{y+h}" stroke="#111" stroke-width="5"/>'
            f'<path d="M{x-80} {y+h+50} Q{x} {y+h-30} {x+80} {y+h+50} Z" fill="#2f2b28"/><ellipse cx="{x}" cy="{y+h+50}" rx="80" ry="12" fill="{WARM}"/>')


def table(x, y, w):
    return (f'<rect x="{x}" y="{y}" width="{w}" height="26" rx="6" fill="{WOOD}"/>'
            f'<path d="M{x+30} {y+26} V1390 M{x+w-30} {y+26} V1390" stroke="{WOOD}" stroke-width="20"/>')


def chair(x, y, f=1):
    return (f'<path d="M{x-60} {y} H{x+60}" stroke="#3b2c22" stroke-width="18" stroke-linecap="round"/>'
            f'<path d="M{x-50} {y} V1390 M{x+50} {y} V1390" stroke="#3b2c22" stroke-width="12"/>'
            f'<path d="M{x-60*f} {y} V{y-230}" stroke="#3b2c22" stroke-width="16" stroke-linecap="round"/>')


def word(t, y=1560, size=110, acc=None):
    if acc:
        t = t.replace(acc, f'<tspan fill="{ACC}">{acc}</tspan>')
    return (f'<text x="540" y="{y}" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="{size}" fill="{TXT}" '
            f'letter-spacing="2" style="text-transform:uppercase">{t}</text>')


def small(t, y=1660):
    return f'<text x="540" y="{y}" text-anchor="middle" font-family="Montserrat" font-weight="600" font-size="44" fill="{TXT}" opacity=".7">{t}</text>'


FX = ('<rect width="1080" height="1920" fill="url(#vig)"/>'
      '<rect width="1080" height="1920" filter="url(#grain)" opacity=".5"/>')

S = []
# 1 — kitchen, late: she alone at the table, his plate untouched
S.append(room() + window(620, 300, 360, 460, rain=True) + pendant(430, 0, 520) +
         table(240, 1080, 560) +
         '<ellipse cx="640" cy="1074" rx="80" ry="14" fill="#e9e1d4"/><ellipse cx="640" cy="1068" rx="50" ry="8" fill="#c9bfae"/>' +
         chair(200, 1150, 1) + her_sit(230, 1140, 1, "down") +
         '<g transform="translate(860 1060)"><rect x="-20" y="-30" width="40" height="60" rx="8" fill="#111"/></g>' +
         word("22:47", 1560, 120) + small("Sein Teller ist kalt. Wieder."))
# 2 — the fridge: her handwriting on everything
notes = "".join(f'<g transform="translate({x} {y}) rotate({r})"><rect x="-60" y="-50" width="120" height="100" fill="{c}"/>'
                f'<path d="M-40 -20 H40 M-40 0 H30 M-40 20 H20" stroke="#5b4a3a" stroke-width="5" opacity=".6"/></g>'
                for x, y, r, c in [(470, 520, -4, "#f3e3a1"), (610, 560, 5, "#f2c9c4"), (480, 680, 3, "#cfe3c4"), (620, 720, -6, "#f3e3a1"),
                                   (540, 860, 2, "#f2c9c4"), (440, 960, -3, "#cfe3c4"), (640, 980, 4, "#f3e3a1")])
S.append(room(WALL2) + lamp_glow(540, 700, 600, .35) +
         '<rect x="360" y="300" width="360" height="1080" rx="24" fill="#d9d6cf"/><path d="M360 760 H720" stroke="#b9b5ab" stroke-width="6"/><rect x="680" y="400" width="14" height="140" rx="7" fill="#9a968d"/><rect x="680" y="820" width="14" height="140" rx="7" fill="#9a968d"/>' +
         notes + stand(860, 1390, -1, head_down=True) + word("ALLES.", 1560, 130) + small("Termine. Geschenke. Arzt. Elternabend."))
# 3 — bedroom: backs to each other
S.append(room("#20232d") + window(380, 260, 320, 380) + lamp_glow(880, 980, 380, .45) +
         '<rect x="120" y="980" width="840" height="200" rx="30" fill="#3a3f52"/><rect x="100" y="860" width="60" height="420" rx="20" fill="#2c3040"/>'
         '<ellipse cx="300" cy="960" rx="120" ry="44" fill="#e8e3d8" opacity=".85"/><ellipse cx="720" cy="960" rx="120" ry="44" fill="#e8e3d8" opacity=".85"/>'
         f'<circle cx="320" cy="930" r="56" fill="{SK}"/><path d="M270 900 Q300 860 360 880 Q380 950 330 990 Q270 990 270 900 Z" fill="{SK}"/>'
         f'<circle cx="700" cy="930" r="56" fill="{SK}"/>'
         '<path d="M140 1000 Q300 950 520 1010 Q740 950 940 1000 L960 1180 H120 Z" fill="#4a5168"/>'
         '<path d="M520 1010 V1180" stroke="#000" stroke-opacity=".25" stroke-width="8"/>'
         '<rect x="880" y="1060" width="70" height="120" rx="6" fill="#2a2a30"/><path d="M850 1060 Q915 990 980 1060 Z" fill="#3a3530"/>' +
         word("STILLE.", 1560, 130) + small("Nicht Streit. Schlimmer."))
# 4 — car in front of the house: she doesn't go in yet
S.append('<rect width="1080" height="1920" fill="url(#night)"/>' +
         '<path d="M640 520 L880 340 L1120 520 V1300 H640 Z" fill="#262a36"/>' +
         '<rect x="700" y="620" width="120" height="150" fill="#f3c46e" opacity=".85"/><rect x="900" y="620" width="120" height="150" fill="#f3c46e" opacity=".85"/>' +
         lamp_glow(860, 700, 380, .35) +
         '<rect y="1300" width="1080" height="620" fill="#14151b"/>' +
         '<path d="M-40 1290 Q20 1000 240 960 L600 940 Q720 950 780 1080 L820 1290 Z" fill="#30343f"/>'
         '<path d="M120 1060 Q200 990 300 980 L560 970 Q640 980 680 1060 Z" fill="#7d8aa6" opacity=".55"/>'
         f'<circle cx="430" cy="1030" r="48" fill="{SK}"/><path d="M378 1010 Q370 1080 400 1100 L460 1100 Q480 1060 470 1000 Z" fill="{SK}"/>'
         f'<path d="M380 1070 Q430 1050 480 1070 L490 1100 H370 Z" fill="{ROSE}"/>'
         '<circle cx="560" cy="1080" r="34" fill="none" stroke="#111" stroke-width="12"/>'
         '<circle cx="160" cy="1290" r="70" fill="#0d0d10"/><circle cx="640" cy="1290" r="70" fill="#0d0d10"/>'
         '<rect x="740" y="1150" width="70" height="26" rx="8" fill="#f3c46e" opacity=".9"/>' +
         word("NOCH 5 MINUTEN.", 1560, 92) + small("Bevor sie wieder funktionieren muss."))
# 5 — hallway: coat on, keys in hand, suitcase
S.append(room("#262a36") + '<rect x="120" y="420" width="300" height="960" fill="#3a2f2a"/><rect x="140" y="440" width="260" height="920" fill="#f3c46e" opacity=".18"/>' +
         '<circle cx="380" cy="900" r="12" fill="#c9a25a"/>' + lamp_glow(560, 300, 500, .45) +
         '<path d="M560 0 V230" stroke="#111" stroke-width="5"/><circle cx="560" cy="250" r="34" fill="#ffe7b0"/>' +
         stand(620, 1390, 1, coat="#5b4f57", bag=True, case=True) +
         word("GENUG.", 1560, 140) + small("Nicht laut. Einfach fertig."))
# 6 — morning window: she alone, coffee, light
S.append(room("#3a3a44") + '<rect x="260" y="260" width="560" height="760" fill="url(#morning)"/><rect x="260" y="260" width="560" height="760" fill="none" stroke="#1b1b20" stroke-width="20"/><path d="M540 260 V1020 M260 620 H820" stroke="#1b1b20" stroke-width="14"/>' +
         '<path d="M260 1020 L820 1020 L1000 1380 L80 1380 Z" fill="#ffe2b0" opacity=".12"/>' +
         stand(540, 1390, 1, head_down=False) +
         '<g transform="translate(600 1250)"><path d="M-22 0 H22 L18 38 H-18 Z" fill="#e9e1d4"/></g>' +
         word("ZUM ERSTEN MAL", 1540, 92) + small("seit Jahren: nur für sich.", 1640))

DEFS = f'''<defs>
<radialGradient id="glow"><stop offset="0" stop-color="{WARM}" stop-opacity=".55"/><stop offset="1" stop-color="{WARM}" stop-opacity="0"/></radialGradient>
<radialGradient id="vig" cx=".5" cy=".45" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".7"/></radialGradient>
<linearGradient id="night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f1424"/><stop offset="1" stop-color="#243052"/></linearGradient>
<linearGradient id="morning" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd9a8"/><stop offset="1" stop-color="#f6eee0"/></linearGradient>
<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 .12"/></feComponentTransfer></filter>
</defs>'''

clips = "\n".join(f'<div class="clip" id="p{i}" style="position:absolute;inset:0" data-start="{i}" data-duration="1" data-track-index="0">'
                  f'<svg viewBox="0 0 1080 1920" width="1080" height="1920">{DEFS}{body}{FX}</svg></div>' for i, body in enumerate(S))
open(OUT, "w").write(f'''<!doctype html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=1080, height=1920"/>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
<style>*{{margin:0;padding:0}}html,body{{width:1080px;height:1920px;overflow:hidden;background:#000}}</style></head><body>
<div id="root" data-composition-id="main" data-start="0" data-duration="{len(S)}" data-width="1080" data-height="1920" style="position:relative;width:1080px;height:1920px">{clips}</div>
<script>const tl=gsap.timeline({{paused:true}});window.__timelines["main"]=tl;</script></body></html>''')
print("ok", len(S))
