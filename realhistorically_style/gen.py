"""Generate knight/index.html — painted-cartoon look (cel shadow + airbrush + wobble line + DOF + grain)."""
import itertools, sys

INK = "#3a2a24"
cid = itertools.count()


def shp(d, fill, shadow=None, sh="#000", sh_op=0.28, hi=None, sw=9, air=True, extra=""):
    """A shape: flat fill, hard cel shadow clipped inside, soft airbrush, optional highlight, ink outline."""
    i = next(cid)
    out = [f'<clipPath id="c{i}"><path d="{d}"/></clipPath>', f'<path d="{d}" fill="{fill}"/>',
           f'<g clip-path="url(#c{i})">']
    if air:
        out.append(f'<path d="{d}" fill="url(#air)" opacity=".55"/>')
    if shadow:
        out.append(f'<path d="{shadow}" fill="{sh}" opacity="{sh_op}"/>')
    if hi:
        out.append(f'<path d="{hi}" fill="#fff" opacity=".35"/>')
    out.append(extra)
    out.append('</g>')
    out.append(f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="{sw}" stroke-linejoin="round"/>')
    return "\n".join(out)


def line(d, sw=7, col=INK, op=1):
    return f'<path d="{d}" fill="none" stroke="{col}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round" opacity="{op}"/>'


def ell(cx, cy, rx, ry):
    return f"M{cx-rx} {cy} A{rx} {ry} 0 1 0 {cx+rx} {cy} A{rx} {ry} 0 1 0 {cx-rx} {cy} Z"


def head(cx, cy, rx, ry, face, skin="#f2ede7"):
    d = ell(cx, cy, rx, ry)
    # crescent shadow lower-right
    shadow = f"M{cx+rx*0.15} {cy+ry*1.2} Q{cx+rx*1.25} {cy+ry*0.9} {cx+rx*1.1} {cy-ry*0.6} Q{cx+rx*0.95} {cy+ry*0.55} {cx+rx*0.15} {cy+ry*1.2} Z"
    shadow2 = f"M{cx-rx*1.2} {cy+ry*0.35} Q{cx-rx*0.3} {cy+ry*1.05} {cx+rx*1.2} {cy+ry*0.55} V{cy+ry*1.3} H{cx-rx*1.2} Z"
    hi = ell(cx - rx * 0.45, cy - ry * 0.55, rx * 0.22, ry * 0.12)
    return shp(d, skin, shadow, "#7d6658", 0.30, hi, sw=10,
               extra=f'<path d="{shadow2}" fill="#7d6658" opacity=".12"/>') + face


def mitt(x, y, s=1.0, rot=0):
    """A white mitten hand, fingers curled, at (x,y)."""
    d = "M-40 -30 Q-55 20 -20 45 Q20 60 45 30 Q60 5 40 -25 Q30 -45 0 -45 Q-30 -45 -40 -30 Z"
    return (f'<g transform="translate({x} {y}) rotate({rot}) scale({s})">' +
            shp(d, "#f4f0ea", "M10 -45 Q60 0 30 60 L60 60 L60 -45 Z", "#7d6658", .25, sw=8) +
            line("M-38 -5 Q-10 0 10 -12 M-34 15 Q-8 22 18 8", 6) + '</g>')


def stitches(x, y, s=1, rot=0):
    return (f'<g transform="translate({x} {y}) rotate({rot}) scale({s})">' +
            line("M-22 -8 L22 -14 M-22 6 L22 0 M-8 -24 L-4 20 M8 -26 L12 18", 5) + '</g>')


def hud(years, rank, rank_fill):
    return f'''
<svg class="hud" viewBox="0 0 440 320">
  <g filter="url(#hudGlow)">
  <text font-family="Montserrat" font-weight="900" font-size="40" fill="url(#hudBlue)" stroke="#fff" stroke-width="9" paint-order="stroke" letter-spacing="14"><textPath href="#arc" startOffset="50%" text-anchor="middle">YEARS PASSED</textPath></text>
  <text x="220" y="196" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="92" fill="url(#hudBlue)" stroke="#fff" stroke-width="11" paint-order="stroke">{years}</text>
  <text x="220" y="282" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="46" fill="{rank_fill}" stroke="#3a2a24" stroke-width="8" paint-order="stroke">RANK: {rank}</text>
  </g>
</svg>'''


# ---------------------------------------------------------------- SCENE 1: peasant close-up
def scene1():
    bg = []
    bg.append('<rect width="1080" height="1920" fill="url(#sky1)"/>')
    bg.append('<g fill="#e9eef0" opacity=".9"><ellipse cx="820" cy="420" rx="260" ry="70"/><ellipse cx="700" cy="380" rx="140" ry="80"/><ellipse cx="960" cy="360" rx="120" ry="70"/></g>')
    # far hills
    bg.append(shp("M-20 980 Q260 860 520 930 T1100 880 V1200 H-20 Z", "#6f8a52", "M-20 1050 Q500 990 1100 1000 V1200 H-20 Z", "#000", .15, sw=8))
    # village row
    for x, w, h, roof in [(380, 170, 170, "#7b5a45"), (560, 140, 210, "#86624b"), (700, 190, 150, "#7b5a45"), (900, 200, 190, "#86624b")]:
        y = 1040
        bg.append(shp(f"M{x} {y} V{y-h} H{x+w} V{y} Z", "#9a7b62", f"M{x+w*0.6} {y} V{y-h} H{x+w} V{y} Z", "#000", .18, sw=8))
        bg.append(shp(f"M{x-15} {y-h} L{x+w/2} {y-h-90} L{x+w+15} {y-h} Z", roof, f"M{x+w/2} {y-h-90} L{x+w+15} {y-h} H{x+w/2} Z", "#000", .2, sw=8))
    # church spire
    bg.append(shp("M640 1040 V760 H720 V1040 Z", "#a1836a", "M690 1040 V760 H720 V1040 Z", "#000", .2, sw=8))
    bg.append(shp("M630 770 L680 600 L730 770 Z", "#7b5a45", "M680 600 L730 770 H680 Z", "#000", .2, sw=8))
    bg.append(shp("M668 830 Q680 805 692 830 V870 H668 Z", "#3a2a24", sw=6, air=False))
    # ground
    bg.append(shp("M-20 1030 H1100 V1920 H-20 Z", "#a48a68", "M-20 1030 H1100 V1080 H-20 Z", "#000", .18, sw=8,
                  extra='<path d="M-20 1100 Q300 1060 1100 1120 V1300 Q500 1200 -20 1260 Z" fill="#7d8a4e" opacity=".55"/>'))
    # half-timbered house left edge
    bg.append(shp("M-20 1080 V160 H330 V1080 Z", "#e6ddcf", "M250 1080 V160 H330 V1080 Z", "#6b4a35", .22, sw=10))
    bg.append(line("M-20 440 H330 M-20 470 H330 M-20 160 L330 160", 22, "#6b4a35"))
    bg.append(shp("M30 1080 V700 H200 V1080 Z", "#4f7a3d", "M150 1080 V700 H200 V1080 Z", "#000", .25, sw=10,
                  extra=line("M75 700 V1080 M120 700 V1080", 6, "#2f4a24")))
    bg.append(shp("M230 640 V520 H320 V640 Z", "#5c6f7a", "M230 520 L320 640 V520 Z", "#fff", .25, sw=10, extra=line("M275 520 V640 M230 580 H320", 6)))
    background = f'<g filter="url(#dof)">{"".join(bg)}</g>'

    fg = []
    # pitchfork behind body
    fg.append('<g transform="translate(130 330)">' + shp("M800 260 H840 V1920 H800 Z", "#8a5f3b", "M825 260 H840 V1920 H825 Z", "#000", .25, sw=8) +
              shp("M740 300 Q820 260 900 300 V330 Q820 290 740 330 Z", "#8d949c", None, sw=7) +
              ''.join(shp(f"M{x} 300 V120 Q{x+8} 100 {x+16} 120 V300 Z", "#9aa1aa", f"M{x+8} 300 V110 H{x+16} V300 Z", "#000", .25, sw=6) for x in (742, 812, 882)) + '</g>')
    # body / shirt
    body = "M150 1920 Q160 1400 300 1270 Q540 1170 780 1270 Q920 1400 930 1920 Z"
    fg.append(shp(body, "#cdbfae", "M640 1260 Q900 1350 930 1920 H700 Q720 1500 640 1260 Z", "#5b4436", .30,
                  extra='<path d="M150 1700 Q540 1640 930 1700 V1920 H150 Z" fill="#5b4436" opacity=".15"/>'))
    fg.append(line("M420 1260 L540 1400 L660 1260", 9))  # collar
    fg.append(line("M330 1500 Q360 1600 340 1720 M720 1480 Q700 1580 730 1700 M520 1520 Q540 1560 525 1610", 6, op=.8))
    fg.append(shp("M560 1560 L690 1545 L700 1660 L570 1675 Z", "#a48a68", None, sw=7))
    fg.append(stitches(630, 1605))
    fg.append(shp("M260 1460 L300 1530 L240 1560 Z", "#f2ede7", None, sw=6, air=False))  # tear
    # arm holding pitchfork
    fg.append(shp("M760 1300 Q900 1260 930 1100 L1000 1130 Q980 1340 820 1420 Z", "#cdbfae", "M900 1250 Q980 1240 1000 1130 L1010 1300 Z", "#5b4436", .3))
    fg.append(mitt(965, 1080, 1.25, -20))
    # head
    hx, hy, rx, ry = 520, 1010, 245, 225
    face = (f'<ellipse cx="{hx-85}" cy="{hy+10}" rx="20" ry="27" fill="{INK}"/><ellipse cx="{hx+75}" cy="{hy+10}" rx="20" ry="27" fill="{INK}"/>'
            f'<circle cx="{hx-79}" cy="{hy}" r="6" fill="#fff"/><circle cx="{hx+81}" cy="{hy}" r="6" fill="#fff"/>' +
            line(f"M{hx-140} {hy-55} Q{hx-100} {hy-50} {hx-45} {hy-30} M{hx+130} {hy-55} Q{hx+90} {hy-50} {hx+35} {hy-30}", 10) +
            line(f"M{hx-35} {hy+110} Q{hx-15} {hy+92} {hx} {hy+108} Q{hx+18} {hy+124} {hx+38} {hy+104}", 8) +
            ''.join(f'<circle cx="{hx+dx}" cy="{hy+dy}" r="3.5" fill="{INK}" opacity=".45"/>' for dx, dy in [(-110,140),(-90,160),(-60,175),(60,175),(95,158),(118,138),(-20,185),(25,186),(-130,115),(135,112)]) +
            f'<ellipse cx="{hx-150}" cy="{hy+70}" rx="34" ry="18" fill="#a77" opacity=".25"/>' +
            # mud smear
            f'<path d="M{hx+120} {hy-60} q30 10 40 40 q-25 5 -40 -40 Z" fill="#7a5a3c" opacity=".55"/>')
    fg.append(head(hx, hy, rx, ry, face))
    # straw hat (perspective, patched)
    fg.append(shp(f"M{hx-330} {hy-120} Q{hx} {hy-250} {hx+330} {hy-120} Q{hx+220} {hy-60} {hx} {hy-70} Q{hx-220} {hy-60} {hx-330} {hy-120} Z",
                  "#d8b46a", f"M{hx-330} {hy-120} Q{hx} {hy-80} {hx+330} {hy-120} Q{hx+220} {hy-60} {hx} {hy-70} Q{hx-220} {hy-60} {hx-330} {hy-120} Z", "#6b4a35", .35))
    fg.append(shp(f"M{hx-185} {hy-170} Q{hx-170} {hy-330} {hx} {hy-340} Q{hx+170} {hy-330} {hx+185} {hy-170} Q{hx} {hy-205} {hx-185} {hy-170} Z",
                  "#dcbb74", f"M{hx+60} {hy-340} Q{hx+170} {hy-330} {hx+185} {hy-170} Q{hx+120} {hy-185} {hx+80} {hy-190} Z", "#6b4a35", .3,
                  hi=ell(hx - 70, hy - 290, 60, 18)))
    fg.append(shp(f"M{hx-186} {hy-200} Q{hx} {hy-240} {hx+186} {hy-200} L{hx+185} {hy-165} Q{hx} {hy-205} {hx-185} {hy-165} Z", "#9b3f33", None, sw=8))
    fg.append(stitches(hx - 90, hy - 270, 1.2, -10))
    fg.append(line(f"M{hx+260} {hy-135} l20 -40 M{hx+290} {hy-128} l30 -25 M{hx-280} {hy-130} l-25 -35", 6))
    # foreground blurred grass tuft bottom-left
    fg.append('<g filter="url(#dofFg)">' + shp("M-40 1920 Q0 1700 60 1600 Q90 1760 120 1650 Q150 1800 200 1720 Q220 1850 260 1920 Z", "#5d7a3c", None, sw=8) + '</g>')
    art = background + "".join(fg)
    return art


# ---------------------------------------------------------------- SCENE 2: page under a pile
def scene2():
    bg = ['<rect width="1080" height="1920" fill="#9c8571"/>']
    # bricks
    for r in range(0, 20):
        y = r * 110
        off = 0 if r % 2 == 0 else -110
        for c in range(-1, 6):
            x = c * 220 + off
            bg.append(shp(f"M{x+8} {y+8} H{x+212} V{y+102} H{x+8} Z", "#a88f78" if (r + c) % 3 else "#9a826c",
                          f"M{x+8} {y+80} H{x+212} V{y+102} H{x+8} Z", "#000", .2, f"M{x+20} {y+14} H{x+150} V{y+26} H{x+20} Z", sw=6, air=False))
    # banner
    bg.append(shp("M330 120 H750 V900 L540 780 L330 900 Z", "#b2332c", "M640 120 H750 V900 L640 840 Z", "#000", .25))
    bg.append(shp("M430 420 L470 300 L540 380 L610 300 L650 420 Z", "url(#gold)", "M540 380 L610 300 L650 420 H540 Z", "#7a4a10", .25))
    bg.append(shp("M430 440 H650 V470 H430 Z", "url(#gold)", None, sw=7))
    bg.append(shp("M300 100 H780 V140 H300 Z", "#6b4a35", None, sw=8))
    # torch glows
    for x in (130, 950):
        bg.append(f'<circle cx="{x}" cy="560" r="260" fill="url(#glow)"/>')
        bg.append(shp(f"M{x-40} 600 L{x-20} 760 H{x+20} L{x+40} 600 Z", "#6b4a35", None, sw=8))
        bg.append(shp(f"M{x} 610 Q{x-70} 530 {x} 400 Q{x+70} 530 {x} 610 Z", "#ffa63a", None, sw=7, air=False,
                      extra=f'<path d="M{x} 600 Q{x-30} 540 {x} 470 Q{x+30} 540 {x} 600 Z" fill="#fff2a6"/>'))
    bg.append(shp("M-20 1350 H1100 V1920 H-20 Z", "#6e5747", "M-20 1350 H1100 V1420 H-20 Z", "#000", .3))
    background = f'<g filter="url(#dof)">{"".join(bg)}</g>'

    fg = []
    fg.append('<ellipse cx="540" cy="1820" rx="360" ry="50" fill="#000" opacity=".3"/>')
    # legs
    fg.append(shp("M430 1500 V1800 H500 V1500 Z", "#3d4f8f", "M470 1500 V1800 H500 V1500 Z", "#000", .3))
    fg.append(shp("M580 1500 V1800 H650 V1500 Z", "#3d4f8f", "M620 1500 V1800 H650 V1500 Z", "#000", .3))
    fg.append(shp("M410 1790 H510 Q520 1840 410 1840 Z M570 1790 H670 Q680 1840 570 1840 Z", "#5b3d2a", None, sw=7))
    # tunic
    fg.append(shp("M330 1560 Q350 1200 540 1170 Q730 1200 750 1560 Q540 1600 330 1560 Z", "#3f66c4",
                  "M610 1180 Q730 1220 750 1560 Q680 1580 640 1575 Q680 1350 610 1180 Z", "#0a1540", .35))
    fg.append(line("M440 1190 L540 1330 L640 1190", 12, "#e8b844"))
    fg.append(shp("M510 1360 L570 1360 L575 1420 L540 1440 L505 1420 Z", "url(#gold)", None, sw=6))
    # arms up (shaded tubes)
    fg.append(shp("M380 1240 Q290 1050 330 800 L410 810 Q380 1030 450 1220 Z", "#3f66c4", "M380 810 L410 810 Q380 1030 450 1220 L420 1230 Q350 1030 380 810 Z", "#0a1540", .3))
    fg.append(shp("M700 1240 Q790 1050 750 800 L670 810 Q700 1030 630 1220 Z", "#3f66c4", "M720 810 L750 800 Q790 1050 700 1240 L680 1230 Q760 1040 720 810 Z", "#0a1540", .3))
    # pile (tilted)
    pile = []
    pile.append(shp("M180 820 Q540 700 900 820 L880 900 Q540 800 200 900 Z", "#8d6747", "M540 760 Q760 770 900 820 L880 900 Q720 830 540 815 Z", "#000", .25))  # plank shield
    pile.append(shp("M260 790 Q300 600 540 580 Q780 600 820 790 Q540 740 260 790 Z", "url(#steel)", "M600 590 Q780 610 820 790 Q720 765 650 760 Z", "#1c2733", .35,
                    hi="M330 720 Q360 640 460 610 Q400 660 360 730 Z"))  # breastplate
    pile.append(shp("M400 600 V380 Q540 270 680 380 V600 Q540 560 400 600 Z", "url(#steel)", "M600 330 Q660 350 680 380 V600 Q640 590 610 585 Z", "#1c2733", .35,
                    hi="M430 560 V400 Q460 360 500 340 Q450 420 460 560 Z"))  # helmet
    pile.append(line("M430 460 H650 M430 500 H650", 14, "#1c2733"))
    pile.append(shp("M560 310 Q620 150 700 120 Q690 220 610 330 Z", "#d6463a", "M650 140 Q690 220 610 330 L600 320 Q660 220 690 125 Z", "#000", .25))  # plume
    pile.append(shp("M150 760 L60 300 L90 290 L180 750 Z", "url(#steel)", None, sw=7))  # sword
    pile.append(shp("M110 770 L230 740 L240 770 L120 800 Z", "#6b4a35", None, sw=7))
    pile.append(shp(ell(880, 650, 120, 120), "#a7783f", ell(920, 690, 120, 120), "#000", .25,
                    extra=f'<path d="{ell(880, 650, 55, 55)}" fill="url(#steel)" stroke="{INK}" stroke-width="8"/>'))  # round shield
    fg.append('<g transform="rotate(-7 540 800)">' + "".join(pile) + '</g>')
    fg.append(mitt(370, 800, 1.1, -10))
    fg.append(mitt(710, 800, 1.1, 10))
    # head (smaller kid, looking up straining)
    hx, hy = 540, 1040
    face = (line(f"M{hx-95} {hy-10} L{hx-40} {hy+12} M{hx+95} {hy-10} L{hx+40} {hy+12}", 13) +
            line(f"M{hx-100} {hy-55} L{hx-35} {hy-30} M{hx+100} {hy-55} L{hx+35} {hy-30}", 9) +
            shp(f"M{hx-45} {hy+70} H{hx+45} Q{hx+45} {hy+115} {hx} {hy+112} Q{hx-45} {hy+115} {hx-45} {hy+70} Z", "#fff", None, sw=7, air=False,
                extra=line(f"M{hx-45} {hy+90} H{hx+45} M{hx-15} {hy+70} V{hy+115} M{hx+15} {hy+70} V{hy+115}", 4)) +
            shp(f"M{hx+140} {hy-80} Q{hx+170} {hy-30} {hx+140} {hy-10} Q{hx+110} {hy-30} {hx+140} {hy-80} Z", "#a9dcff", None, sw=6, air=False) +
            shp(f"M{hx-160} {hy-40} Q{hx-140} {hy} {hx-160} {hy+15} Q{hx-180} {hy} {hx-160} {hy-40} Z", "#a9dcff", None, sw=6, air=False))
    fg.append(head(hx, hy, 190, 175, face))
    fg.append(line("M180 1000 q-30 20 0 40 M150 1080 q-30 20 0 40 M900 980 q30 20 0 40 M930 1060 q30 20 0 40", 8))  # shake marks
    return background + "".join(fg)


# ---------------------------------------------------------------- SCENE 3: squire strike
def scene3():
    bg = ['<rect width="1080" height="1920" fill="url(#sky3)"/>',
          f'<circle cx="820" cy="560" r="300" fill="url(#glow)"/>',
          shp(ell(820, 560, 120, 120), "#fff2c4", None, sw=8, air=False)]
    for i, x in enumerate(range(-40, 1100, 105)):
        h = 330 + (i * 37) % 70
        bg.append(shp(f"M{x} 1140 V{1140-h} L{x+48} {1140-h-70} L{x+96} {1140-h} V1140 Z", "#94683f",
                      f"M{x+62} 1140 V{1140-h-30} L{x+96} {1140-h} V1140 Z", "#000", .25, sw=8))
    bg.append(shp("M-20 1100 H1100 V1920 H-20 Z", "#c49a65", "M-20 1100 H1100 V1160 H-20 Z", "#000", .2))
    background = f'<g filter="url(#dof)">{"".join(bg)}</g>'
    fg = []
    # dummy right, partially cropped
    fg.append(shp("M820 1000 V1920 H880 V1000 Z", "#7a5532", "M855 1000 V1920 H880 V1000 Z", "#000", .3))
    fg.append(shp("M640 1080 H1100 V1130 H640 Z", "#7a5532", "M640 1110 H1100 V1130 H640 Z", "#000", .3))
    fg.append(shp("M700 1000 Q680 1350 760 1480 H960 Q1040 1350 1010 1000 Q850 950 700 1000 Z", "#d9b45e",
                  "M900 980 Q1040 1000 1010 1250 Q1000 1400 960 1480 H900 Q960 1250 900 980 Z", "#6b4a1a", .3,
                  extra=line("M740 1150 l40 30 M960 1200 l-40 25 M780 1330 l50 -10 M900 1100 l30 30 M760 1050 l60 10", 7, "#9b7a2c")))
    fg.append(line("M700 1180 Q855 1215 1010 1180 M705 1330 Q855 1365 1005 1330", 10, "#6b4a35"))
    dface = (line("M800 840 l40 40 M840 840 l-40 40 M910 840 l40 40 M950 840 l-40 40", 9) +
             line("M830 940 Q870 920 920 945", 8))
    fg.append(head(870, 880, 170, 160, dface, skin="#e3c98a"))
    fg.append(line("M720 790 q20 -60 0 -110 M1000 760 q30 -40 20 -100", 7, "#9b7a2c"))  # straw sticking out
    # smear arc
    fg.append('<path d="M350 520 Q760 420 860 860 L800 880 Q720 540 380 600 Z" fill="#fff" opacity=".55" filter="url(#smear)"/>')
    # impact star
    fg.append(shp("M770 700 L800 760 L870 740 L820 790 L880 840 L805 830 L790 900 L760 835 L690 850 L740 795 L690 745 L755 760 Z", "#fff3a0", None, sw=8, air=False))
    fg.append(line("M700 640 l-40 -40 M880 660 l40 -50 M900 900 l50 30", 9))
    # squire body
    fg.append(shp("M-40 1920 Q-20 1500 120 1380 Q330 1290 520 1380 Q620 1500 620 1920 Z", "#d6c4a0",
                  "M420 1330 Q620 1450 620 1920 H460 Q500 1600 420 1330 Z", "#5b4436", .3,
                  extra=line("M-20 1520 H620 M-30 1640 H620 M-40 1760 H620", 7, "#a58f68") + line("M130 1380 V1920 M300 1350 V1920 M450 1380 V1920", 5, "#a58f68", .6)))
    # arm swinging up-right
    fg.append(shp("M430 1420 Q560 1250 620 1000 L700 1030 Q660 1300 520 1480 Z", "#d6c4a0", "M650 1010 L700 1030 Q660 1300 520 1480 L500 1440 Q640 1280 650 1010 Z", "#5b4436", .3))
    # wooden sword
    fg.append(shp("M630 980 L820 700 L860 725 L675 1005 Z", "#b07d45", "M840 712 L860 725 L675 1005 L655 990 Z", "#000", .25, hi="M640 975 L810 715 L820 722 L650 985 Z"))
    fg.append(shp("M590 960 L700 1040 L715 1015 L605 935 Z", "#6b4a35", None, sw=7))
    fg.append(mitt(660, 1010, 1.15, 30))
    hx, hy = 300, 1140
    face = (line(f"M{hx-115} {hy+5} L{hx-40} {hy+20} M{hx+100} {hy+5} L{hx+30} {hy+20}", 15) +
            line(f"M{hx-125} {hy-45} L{hx-40} {hy-5} M{hx+110} {hy-45} L{hx+30} {hy-5}", 10) +
            shp(f"M{hx-60} {hy+75} H{hx+60} Q{hx+60} {hy+130} {hx} {hy+128} Q{hx-60} {hy+130} {hx-60} {hy+75} Z", "#fff", None, sw=8, air=False,
                extra=line(f"M{hx-60} {hy+100} H{hx+60} M{hx-20} {hy+75} V{hy+130} M{hx+20} {hy+75} V{hy+130}", 5)))
    fg.append(head(hx, hy, 230, 210, face))
    fg.append(shp(f"M{hx-232} {hy-110} Q{hx} {hy-210} {hx+225} {hy-120} L{hx+222} {hy-70} Q{hx} {hy-160} {hx-228} {hy-60} Z", "#c8362d",
                  f"M{hx+60} {hy-170} Q{hx+170} {hy-150} {hx+225} {hy-120} L{hx+222} {hy-70} Q{hx+150} {hy-120} {hx+60} {hy-130} Z", "#000", .25))
    fg.append(shp(f"M{hx-225} {hy-90} Q{hx-320} {hy-140} {hx-360} {hy-80} Q{hx-300} {hy-90} {hx-230} {hy-60} Z", "#c8362d", None, sw=7))
    return background + "".join(fg)


# ---------------------------------------------------------------- SCENE 4: dubbing close-up
def scene4():
    bg = ['<rect width="1080" height="1920" fill="#5e2b26"/>',
          '<g fill="#ffd27a" opacity=".22"><path d="M540 760 L-300 -100 L60 -200 Z"/><path d="M540 760 L280 -200 L560 -200 Z"/><path d="M540 760 L780 -200 L1080 -200 Z"/><path d="M540 760 L1400 0 L1400 420 Z"/><path d="M540 760 L-300 380 L-300 760 Z"/></g>',
          '<circle cx="540" cy="760" r="520" fill="url(#glow)"/>']
    for x in (30, 880):
        bg.append(shp(f"M{x} 100 H{x+170} V1500 H{x} Z", "#d2c1a4", f"M{x+110} 100 H{x+170} V1500 H{x+110} Z", "#5b4436", .3,
                      extra=line(f"M{x+50} 100 V1500 M{x+100} 100 V1500", 7, "#a8977d")))
    bg.append(shp("M-20 1920 L380 1250 H700 L1100 1920 Z", "#b52e29", None, sw=8, extra=line("M60 1920 L410 1250 M1020 1920 L670 1250", 16, "#e8b844")))
    background = f'<g filter="url(#dof)">{"".join(bg)}</g>'
    fg = []
    # king sleeve + ermine top-right
    fg.append(shp("M1100 380 Q900 430 800 560 L880 660 Q1000 560 1100 560 Z", "#9c2b3a", "M1100 500 Q1000 540 880 660 L860 630 Q980 520 1100 470 Z", "#000", .3))
    fg.append(shp("M770 540 Q820 500 880 560 Q900 620 860 680 Q800 690 770 640 Q750 590 770 540 Z", "#f3efe6", None, sw=8,
                  extra='<g fill="#3a2a24"><path d="M800 580 l8 18 l8 -18 z"/><path d="M840 630 l8 18 l8 -18 z"/></g>'))
    # sword, blade resting on shoulder
    fg.append(shp("M740 610 L250 1180 L285 1210 L775 640 Z", "url(#steel)", "M758 625 L775 640 L285 1210 L268 1195 Z", "#1c2733", .35, hi="M735 615 L262 1172 L270 1180 L745 622 Z"))
    fg.append(shp("M690 520 L830 660 L850 640 L710 500 Z", "url(#gold)", None, sw=8))
    fg.append(mitt(780, 600, 1.2, 140))
    # knight body in armor
    fg.append(shp("M60 1920 Q80 1500 240 1380 Q540 1270 840 1380 Q1000 1500 1020 1920 Z", "url(#steel)",
                  "M720 1320 Q1000 1450 1020 1920 H800 Q820 1580 720 1320 Z", "#1c2733", .3,
                  hi="M200 1500 Q260 1420 380 1380 Q300 1460 260 1560 Z"))
    fg.append(shp("M420 1300 L660 1300 L640 1920 L440 1920 Z", "#2f4fb0", "M580 1300 H660 L640 1920 H580 Z", "#000", .3))
    fg.append(line("M470 1520 L610 1640 M610 1520 L470 1640", 16, "#e8b844"))
    fg.append(shp("M150 1420 Q240 1330 380 1320 Q330 1420 260 1470 Q200 1480 150 1420 Z M930 1420 Q840 1330 700 1320 Q750 1420 820 1470 Q880 1480 930 1420 Z",
                  "url(#steel)", None, sw=8))
    hx, hy = 520, 1100
    face = (line(f"M{hx-130} {hy+10} Q{hx-90} {hy-35} {hx-45} {hy+10} M{hx+40} {hy+10} Q{hx+85} {hy-35} {hx+125} {hy+10}", 12) +
            shp(f"M{hx-70} {hy+80} Q{hx} {hy+190} {hx+70} {hy+80} Q{hx} {hy+100} {hx-70} {hy+80} Z", "#7a2f2a", None, sw=8, air=False,
                extra=f'<ellipse cx="{hx}" cy="{hy+150}" rx="35" ry="20" fill="#e2706a"/>') +
            f'<ellipse cx="{hx-170}" cy="{hy+80}" rx="42" ry="20" fill="#f19a92" opacity=".55"/><ellipse cx="{hx+165}" cy="{hy+80}" rx="42" ry="20" fill="#f19a92" opacity=".55"/>' +
            shp(f"M{hx-130} {hy+30} Q{hx-150} {hy+90} {hx-130} {hy+130} Q{hx-110} {hy+90} {hx-130} {hy+30} Z", "#a9dcff", None, sw=6, air=False) +
            shp(f"M{hx+125} {hy+30} Q{hx+105} {hy+90} {hx+125} {hy+130} Q{hx+145} {hy+90} {hx+125} {hy+30} Z", "#a9dcff", None, sw=6, air=False))
    fg.append(head(hx, hy, 250, 230, face))
    # sparkles
    for x, y, s in [(170, 900, 1.4), (880, 1050, 1), (230, 1250, .8), (820, 840, .7)]:
        fg.append(f'<g transform="translate({x} {y}) scale({s})">' + shp("M0 -50 L12 -12 L50 0 L12 12 L0 50 L-12 12 L-50 0 L-12 -12 Z", "#fff8d0", None, sw=6, air=False) + '</g>')
    return background + "".join(fg)


DEFS = '''
<linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff1a3"/><stop offset=".5" stop-color="#f4c04a"/><stop offset="1" stop-color="#c47a18"/></linearGradient>
<linearGradient id="steel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#eef2f6"/><stop offset=".5" stop-color="#b3bdc9"/><stop offset="1" stop-color="#6f7a88"/></linearGradient>
<linearGradient id="hudBlue" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6f8cff"/><stop offset="1" stop-color="#2238d6"/></linearGradient>
<linearGradient id="rankGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3a0"/><stop offset=".55" stop-color="#ffcf3f"/><stop offset="1" stop-color="#e3901a"/></linearGradient>
<linearGradient id="air" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".25"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#2a1a10" stop-opacity=".35"/></linearGradient>
<linearGradient id="sky1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fa6bd"/><stop offset="1" stop-color="#cfd9d4"/></linearGradient>
<linearGradient id="sky3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8975a"/><stop offset="1" stop-color="#f6d6a6"/></linearGradient>
<radialGradient id="glow"><stop offset="0" stop-color="#ffcf6b" stop-opacity=".55"/><stop offset="1" stop-color="#ffcf6b" stop-opacity="0"/></radialGradient>
<radialGradient id="vig" cx=".5" cy=".5" r=".72"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#1a0d06" stop-opacity=".6"/></radialGradient>
<filter id="dof" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="5"/></filter>
<filter id="dofFg"><feGaussianBlur stdDeviation="9"/></filter>
<filter id="smear"><feGaussianBlur stdDeviation="12"/></filter>
<filter id="wobble" x="-2%" y="-2%" width="104%" height="104%"><feTurbulence type="fractalNoise" baseFrequency=".018" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="6"/></filter>
<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 .09"/></feComponentTransfer></filter>
<filter id="paper" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".012" numOctaves="3" seed="11"/><feColorMatrix type="matrix" values="0 0 0 0 .35  0 0 0 0 .22  0 0 0 0 .12  0 0 0 .5 0"/></filter>
<filter id="hudGlow"><feDropShadow dx="0" dy="5" stdDeviation="3" flood-color="#1a0d06" flood-opacity=".5"/></filter>
<path id="arc" d="M 50 180 A 170 160 0 0 1 390 180"/>
'''


def scene_div(n, start, art, hud_svg, extras):
    return f'''
<div id="s{n}" class="scene clip" data-start="{start}" data-duration="3" data-track-index="0">
  <svg class="art" id="s{n}art" viewBox="0 0 1080 1920">
    <g filter="url(#wobble)">{art}</g>
    <rect width="1080" height="1920" filter="url(#paper)" opacity=".14" style="mix-blend-mode:multiply"/>
    <rect width="1080" height="1920" fill="url(#vig)"/>
    <rect width="1080" height="1920" filter="url(#grain)"/>
  </svg>
  {extras}
  {hud_svg}
</div>'''


scenes = [
    scene_div(1, 0, scene1(), hud(0, "PEASANT", "#b9ab9c"),
              '<div class="big" id="s1sub" style="top:470px;font-size:70px;color:#fff">How to become a</div>'
              '<div class="big" id="s1title" style="top:545px;font-size:160px;color:#e8322b">Knight?</div>'
              '<div class="cap" id="s1cap">Born in the mud</div>'),
    scene_div(2, 3, scene2(), hud(7, "PAGE", "#8fd0ff"),
              '<div class="cap" id="s2cap">At 7 you carry <b>everything</b></div>'),
    scene_div(3, 6, scene3(), hud(14, "SQUIRE", "#6fe07f"),
              '<div class="big" id="s3pop" style="top:430px;left:90px;right:auto;font-size:92px;color:#7dff6b;transform:rotate(-8deg)">+1 STR</div>'
              '<div class="cap" id="s3cap">Then hit straw for 7 years</div>'),
    scene_div(4, 9, scene4(), hud(21, "KNIGHT", "url(#rankGold)"),
              '<div class="big" id="s4ach" style="top:470px;font-size:104px;line-height:.95;color:#ffd54a">Knighthood<br/><span style="font-size:66px;color:#fff">unlocked!</span></div>'
              '<div class="cap" id="s4cap">And you owe the king <b>forever</b></div>'),
]

HTML = f'''<!doctype html>
<html lang="en" data-resolution="portrait">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=1080, height=1920"/>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
<style>
* {{ margin:0; padding:0; box-sizing:border-box; }}
html, body {{ margin:0; width:1080px; height:1920px; overflow:hidden; background:#000; }}
#root {{ position:relative; width:100%; height:100%; font-family:"Montserrat", sans-serif; }}
.scene {{ position:absolute; inset:0; overflow:hidden; }}
.art {{ position:absolute; inset:0; width:1080px; height:1920px; transform-origin:50% 55%; }}
.cap {{ position:absolute; left:80px; right:80px; top:1330px; text-align:center; color:#fff; font-weight:800; font-size:60px; line-height:1.08;
  text-transform:uppercase; -webkit-text-stroke:9px #1f140e; paint-order:stroke fill; text-shadow:0 5px 8px rgba(0,0,0,.55); }}
.cap b {{ color:#ffd54a; font-weight:900; }}
.hud {{ position:absolute; right:30px; top:180px; width:440px; height:320px; }}
.big {{ position:absolute; left:0; right:0; text-align:center; font-weight:900; text-transform:uppercase;
  -webkit-text-stroke:14px #1f140e; paint-order:stroke fill; text-shadow:0 8px 10px rgba(0,0,0,.5); }}
</style>
</head>
<body>
<svg width="0" height="0" style="position:absolute"><defs>{DEFS}</defs></svg>
<div id="root" data-composition-id="main" data-start="0" data-duration="12" data-width="1080" data-height="1920">
{"".join(scenes)}
</div>
<script>
const tl = gsap.timeline({{ paused: true }});
[["#s1art",0],["#s2art",3],["#s3art",6],["#s4art",9]].forEach(([el,t]) => tl.fromTo(el,{{scale:1}},{{scale:1.06,duration:3,ease:"none"}},t));
[["#s1cap",.15],["#s2cap",3.1],["#s3cap",6.1],["#s4cap",9.1]].forEach(([el,t]) => tl.fromTo(el,{{scale:.6,opacity:0}},{{scale:1,opacity:1,duration:.18,ease:"back.out(3)"}},t));
tl.fromTo("#s1sub",{{y:-40,opacity:0}},{{y:0,opacity:1,duration:.2,ease:"power3.out"}},0);
tl.fromTo("#s1title",{{scale:2.2,opacity:0}},{{scale:1,opacity:1,duration:.22,ease:"back.out(2)"}},.25);
tl.fromTo("#s3pop",{{y:40,opacity:0}},{{y:-30,opacity:1,duration:.5,ease:"power2.out"}},6.4);
tl.fromTo("#s4ach",{{scale:.4,opacity:0}},{{scale:1,opacity:1,duration:.25,ease:"back.out(2.5)"}},9.3);
window.__timelines["main"] = tl;
tl.seek(0);
</script>
</body>
</html>'''

open(sys.argv[1], "w").write(HTML)
print("ok", len(HTML))
