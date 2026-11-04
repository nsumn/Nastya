"""Video 05 'Kaffee / Liebeslandkarte' in the paper cut-out style, paced like the fakedrake15 reference (see ../fakedrake_analyse.md).
Fast pace: a new picture every ~2 s (soft 0.25 s cross-fades), something moves in every shot (pop-ins, draw-ons, bouncing,
floating hearts, camera push), words appear one by one at the top with a coloured keyword.

python render.py <out.mp4> [--preview t1,t2,...]     (frames are rendered in 4 processes)
"""
import csv, math, os, re, subprocess, sys, wave
from multiprocessing import Pool
import numpy as np
import cairocffi as cairo
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import paperlib as P
import sfx

W, H, FPS, SR = 1080, 1920, 30, 44100
TIGHT = os.path.exists(os.path.join(HERE, "voice", "tight.wav"))             # pauses removed by ../tighten.py
VOICE = os.path.join(HERE, "voice", "tight.wav" if TIGHT else "result.mp3")
rows = list(csv.DictReader(open(os.path.join(HERE, "voice", "alignment_tight.csv" if TIGHT else "alignment.csv"), encoding="utf-8")))
CH = "".join(r["char"] for r in rows); ST = [float(r["start"]) for r in rows]; EN = [float(r["end"]) for r in rows]
DUR = EN[-1] + 1.3


def t_of(p, nth=0):
    i = -1
    for _ in range(nth + 1): i = CH.find(p, i + 1)
    assert i >= 0, p; return ST[i]


def ease(u): u = max(0.0, min(1.0, u)); return u * u * (3 - 2 * u)
def talk(t, f=11): return 0.4 + 0.6 * abs(math.sin(t * f))
def blink(t, period=3.3, off=0.0): return ((t + off) % period) < 0.12
def breath(t): return math.sin(t * 2.2)


# ---------------------------------------------------------------- sets
def kitchen(c, t):
    P.background(c, (0.13, 0.13, 0.26), (0.19, 0.16, 0.28))
    P.paper(c, lambda c: P.rrect(c, 140, 380, 300, 260, 20), (0.20, 0.22, 0.40), 0.7)          # window
    P.paper(c, lambda c: P.ell(c, 360, 450, 34, 34), P.MOON, 0.7)
    P.paper(c, lambda c: P.rrect(c, 620, 420, 330, 150, 18), (0.30, 0.27, 0.42), 0.8)          # shelf cupboard
    P.paper(c, lambda c: (c.move_to(-20, 1520), c.line_to(1100, 1490), c.line_to(1100, 1940), c.line_to(-20, 1940), c.close_path()), P.PLUM, 0.9)


def living(c, t, lamp=1.0):
    P.background(c)
    P.paper(c, lambda c: P.rrect(c, 700, 330, 240, 340, 120), (0.20, 0.22, 0.40), 0.6)          # arched window
    P.paper(c, lambda c: P.ell(c, 820, 440, 36, 36), P.MOON, 0.6)
    g = cairo.RadialGradient(170, 760, 0, 170, 760, 420); g.add_color_stop_rgba(0, 1, 0.8, 0.5, 0.35 * lamp); g.add_color_stop_rgba(1, 1, 0.8, 0.5, 0)
    c.set_source(g); c.paint()
    P.paper(c, lambda c: (c.move_to(110, 700), c.line_to(230, 700), c.line_to(200, 620), c.line_to(140, 620), c.close_path()), P.MOON, 0.8)
    P.paper(c, lambda c: P.rrect(c, 166, 700, 8, 600, 4), P.INK, 0.8)


def sofa(c):
    P.paper(c, lambda c: P.rrect(c, 90, 1180, 900, 330, 70), (0.55, 0.42, 0.62), 1.1)
    P.paper(c, lambda c: P.rrect(c, 60, 1330, 960, 260, 60), (0.62, 0.48, 0.68), 1.25)


def bed(c, t):
    P.background(c)
    P.paper(c, lambda c: P.rrect(c, 140, 900, 800, 200, 40), P.LILAC, 1.0)
    for x in (360, 720): P.paper(c, lambda c, x=x: P.rrect(c, x - 150, 1020, 300, 110, 50), P.CREAM, 1.05)


def duvet(c, sag=0.0):
    P.paper(c, lambda c: (c.move_to(110, 1130), c.curve_to(380, 1080 + sag, 700, 1170 - sag, 970, 1100), c.line_to(970, 1640), c.line_to(110, 1640), c.close_path()),
            P.CREAM, 1.5)


def house(c, t, lights=1.0):
    P.background(c, (0.08, 0.09, 0.20), (0.15, 0.13, 0.25))
    for i, (x, y) in enumerate(((180, 420), (350, 300), (900, 360), (760, 520))):
        P.paper(c, lambda c, x=x, y=y, i=i: P.star(c, x, y, 18 + 6 * math.sin(t * 3 + i)), P.MOON, 0.6)
    P.paper(c, lambda c: P.ell(c, 860, 640, 60, 60), P.MOON, 0.6)
    P.paper(c, lambda c: (c.move_to(-20, 1500), c.curve_to(300, 1420, 800, 1460, 1100, 1400), c.line_to(1100, 1940), c.line_to(-20, 1940), c.close_path()), P.PLUM, 0.9)
    P.paper(c, lambda c: P.rrect(c, 300, 960, 480, 560, 10), (0.36, 0.30, 0.46), 1.0)
    P.paper(c, lambda c: (c.move_to(260, 980), c.line_to(540, 740), c.line_to(820, 980), c.close_path()), (0.50, 0.34, 0.44), 1.05)
    for (x, y) in ((360, 1060), (590, 1060), (360, 1260), (590, 1260)):
        col = tuple(0.18 + (P.MOON[k] - 0.18) * lights for k in range(3))
        P.paper(c, lambda c, x=x, y=y: P.rrect(c, x, y, 130, 140, 12), col, 1.1)


def term_card(c, t, t0, words, keycol):
    P.background(c)
    for i in range(14):
        P.paper(c, lambda c, i=i: P.star(c, 80 + (i * 173) % 920, 420 + (i * 271) % 1000, 10), P.MOON, 0.6, 0.6)


def loop_arrows(c, t, t0, speed=1.6):
    """two paper arrows chasing each other round a circle: 'Druck' (pink) and 'Rückzug' (blue)"""
    a0 = (t - t0) * speed; cx, cy, R = 540, 1050, 250
    u = ease((t - t0) / 0.6)
    for k, (col, lab) in enumerate(((P.ROSE, "Druck"), ((0.62, 0.78, 1.0), "Rückzug"))):
        a = a0 + k * math.pi
        def arc_shape(c, a=a):
            c.arc(cx, cy, R + 34, a, a + 2.3 * u); c.arc_negative(cx, cy, R - 34, a + 2.3 * u, a); c.close_path()
            ex, ey = cx + R * math.cos(a + 2.3 * u), cy + R * math.sin(a + 2.3 * u); tx, ty = -math.sin(a + 2.3 * u), math.cos(a + 2.3 * u)
            nx, ny = math.cos(a + 2.3 * u), math.sin(a + 2.3 * u)
            c.move_to(ex + nx * 62, ey + ny * 62); c.line_to(ex + tx * 80, ey + ty * 80); c.line_to(ex - nx * 62, ey - ny * 62); c.close_path()
        if u > 0.05: P.paper(c, arc_shape, col, 1.2)
        lx, ly = cx + (R + 120) * math.cos(a + 1.1), cy + (R + 120) * math.sin(a + 1.1)
        if u > 0.6:
            c.select_font_face("Inter", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD); c.set_font_size(42); e = c.text_extents(lab)
            c.move_to(lx - e[4] / 2, ly + 14); c.set_source_rgb(*col); c.show_text(lab)


# ---------------------------------------------------------------- shots (start phrase, draw function)
pop, slide, enter, marks, shake, cue = P.pop, P.slide, P.enter, P.marks_around, P.shake, P.cue


def her_at(c, t, t0, x, y, r, mood, dx=-500, **kw):
    enter(c, t, t0, dx, (x, y + r * 4.3), lambda: P.person(c, True, x, y, r, mood, **kw))
def him_at(c, t, t0, x, y, r, mood, dx=500, **kw):
    enter(c, t, t0, dx, (x, y + r * 4.3), lambda: P.person(c, False, x, y, r, mood, **kw))
def scaled(c, x, y, a, fn):
    a = max(a, 1e-3); c.save(); c.translate(x, y); c.scale(a, a); c.translate(-x, -y); fn(); c.restore()
def label(c, txt, x, y, size, col=P.CREAM, a=1.0):
    c.select_font_face("Inter", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD); c.set_font_size(size); e = c.text_extents(txt)
    c.move_to(x - e[4] / 2, y); c.set_source_rgba(*col, a); c.show_text(txt)


def cloud(c, x, y, s, col=(0.30, 0.28, 0.44)):
    P.paper(c, lambda c: (P.ell(c, x - 70 * s, y + 10 * s, 70 * s, 50 * s), P.ell(c, x, y - 20 * s, 85 * s, 70 * s), P.ell(c, x + 75 * s, y + 10 * s, 70 * s, 50 * s),
                         P.rrect(c, x - 130 * s, y, 260 * s, 60 * s, 30 * s)), col, 1.2)


def number_ring(c, t, t0, n, word, col, icon):
    """big step number: the ring draws itself, the number pops, the icon drops in, the word slides up"""
    P.background(c)
    for i in range(12): P.paper(c, lambda c, i=i: P.star(c, 80 + (i * 173) % 920, 420 + (i * 271) % 1100, 9), P.MOON, 0.6, 0.6)
    u = ease((t - t0) / 0.6); cue(t0, "swirl")
    if u > 0.01:
        c.new_sub_path(); c.arc(540, 960, 230, -math.pi / 2, -math.pi / 2 + 2 * math.pi * u)
        c.set_source_rgba(*col, 0.35); c.set_line_width(46); c.stroke()
        c.new_sub_path(); c.arc(540, 960, 230, -math.pi / 2, -math.pi / 2 + 2 * math.pi * u)
        c.set_source_rgb(*col); c.set_line_width(22); c.set_line_cap(cairo.LINE_CAP_ROUND); c.stroke()
    a = pop(t, t0 + 0.35, 0.35, "thud")
    scaled(c, 540, 960, a, lambda: (P.paper(c, lambda c: P.ell(c, 540, 960, 190, 190), P.CREAM, 1.2), label(c, str(n), 540, 1035, 220, P.INK)))
    b = pop(t, t0 + 0.7, 0.35, "pop")
    scaled(c, 540, 600, b, lambda: icon(c, 540, 600))
    w = slide(t, t0 + 0.9, 0.4, "swish")
    label(c, word, 540, 1275 + 60 * (1 - w), 92, col, w)


def ic_cloud_bolt(c, x, y):
    cloud(c, x, y, 0.8); P.mark(c, "bolt", x, y + 90, 1.4)
def ic_eye(c, x, y):
    P.paper(c, lambda c: P.ell(c, x, y, 110, 60), P.CREAM, 1.2); P.paper(c, lambda c: P.ell(c, x, y - 28, 34, 34), P.INK, 1.25)
def ic_shield(c, x, y):
    P.paper(c, lambda c: (c.move_to(x - 90, y - 90), c.line_to(x + 90, y - 90), c.line_to(x + 90, y), c.curve_to(x + 90, y + 70, x, y + 110, x, y + 110),
                         c.curve_to(x, y + 110, x - 90, y + 70, x - 90, y), c.close_path()), (0.62, 0.78, 1.0), 1.2)
def ic_wall(c, x, y):
    for r_ in range(3):
        for k in range(3): P.paper(c, lambda c, r_=r_, k=k: P.rrect(c, x - 135 + k * 92 + (r_ % 2) * 40, y - 60 + r_ * 50, 84, 42, 6), (0.62, 0.42, 0.40), 1.2)



ROSE, SAGE, VIOLET, BLUE, MOON = P.ROSE, P.SAGE_C, P.VIOLET_C, P.BLUE_C, P.MOON
def ring_shot(c, t, t0, n, word, col, icon):
    number_ring(c, t, t0, n, "", col, icon)                     # the word itself comes in the caption, in the ring colour
    P.progress_dots(c, 540, 1240, 4, n - 1, col)
def ic_house(c, x, y):
    P.paper(c, lambda c: (c.move_to(x - 90, y), c.line_to(x, y - 80), c.line_to(x + 90, y), c.close_path()), (0.50, 0.34, 0.44), 1.2)
    P.paper(c, lambda c: P.rrect(c, x - 65, y, 130, 90, 8), P.CREAM, 1.2); P.paper(c, lambda c: P.heart(c, x, y + 45, 18), ROSE, 1.3)
def ic_phone(c, x, y):
    P.paper(c, lambda c: P.rrect(c, x - 55, y - 90, 110, 180, 20), (0.14, 0.14, 0.22), 1.2); P.mark(c, "!", x, y, 1.1)
def ic_heart_bolt(c, x, y):
    P.paper(c, lambda c: P.heart(c, x - 20, y, 50), ROSE, 1.2); P.mark(c, "bolt", x + 60, y - 10, 1.2)



COFFEE, MILK, SKY = (0.62, 0.42, 0.30), (0.95, 0.93, 0.88), (0.55, 0.75, 1.0)


def cup(c, t, x, y, s=1.0, steam=True, col=P.CREAM):
    """paper coffee cup with a saucer and curling steam"""
    P.paper(c, lambda c: P.ell(c, x, y + 95 * s, 170 * s, 34 * s), (0.80, 0.78, 0.86), 1.2)
    P.paper(c, lambda c: (c.move_to(x - 120 * s, y - 70 * s), c.line_to(x + 120 * s, y - 70 * s), c.curve_to(x + 115 * s, y + 60 * s, x + 70 * s, y + 95 * s, x, y + 95 * s),
                         c.curve_to(x - 70 * s, y + 95 * s, x - 115 * s, y + 60 * s, x - 120 * s, y - 70 * s), c.close_path()), col, 1.25)
    c.set_source_rgb(*col); c.set_line_width(22 * s); c.new_sub_path(); c.arc(x + 130 * s, y, 45 * s, -1.2, 1.2); c.stroke()
    P.paper(c, lambda c: P.ell(c, x, y - 70 * s, 120 * s, 26 * s), COFFEE, 1.3)
    if steam:
        for k in range(3):
            c.set_source_rgba(1, 1, 1, 0.5); c.set_line_width(10 * s); c.set_line_cap(cairo.LINE_CAP_ROUND)
            xx = x + (k - 1) * 50 * s; c.move_to(xx, y - 100 * s)
            for j in range(1, 6): c.line_to(xx + 18 * s * math.sin(t * 3 + j + k), y - 100 * s - j * 30 * s)
            c.stroke()


def map_sheet(c, t, t0, x, y, w, h, pins):
    """folded paper map that opens; pins = [(dx, dy, kind, label)] pop on it one by one"""
    u = P.slide(t, t0, 0.5, "whoosh")
    for k in range(3):
        xx = x - w / 2 + k * w / 3; tilt = (0.06 if k % 2 else -0.06) * (1 - u)
        c.save(); c.translate(xx + w / 6, y); c.rotate(tilt); c.scale(max(u, 0.05), 1); c.translate(-(xx + w / 6), -y)
        P.paper(c, lambda c, xx=xx: P.rrect(c, xx, y - h / 2, w / 3, h, 10), (0.93, 0.89, 0.80) if k % 2 else (0.88, 0.84, 0.76), 1.1)
        c.restore()
    if u > 0.9:
        c.set_source_rgba(0.55, 0.45, 0.40, 0.5); c.set_line_width(5); c.set_dash([14, 10])
        c.move_to(x - w * 0.4, y + h * 0.25); c.curve_to(x - w * 0.1, y - h * 0.3, x + w * 0.1, y + h * 0.3, x + w * 0.4, y - h * 0.25); c.stroke(); c.set_dash([])
    for i, (dx, dy, kind, lab) in enumerate(pins):
        a = pop(t, t0 + 0.6 + 0.3 * i, kind="pop")
        if a <= 0: continue
        px, py = x + dx, y + dy
        P.paper(c, lambda c, px=px, py=py, a=a: (c.move_to(px, py), c.curve_to(px - 40 * a, py - 50 * a, px - 30 * a, py - 90 * a, px, py - 95 * a),
                                                 c.curve_to(px + 30 * a, py - 90 * a, px + 40 * a, py - 50 * a, px, py), c.close_path()), P.ROSE, 1.3)
        P.mark(c, kind, px, py - 62, 0.55, a)
        if lab: label(c, lab, px, py + 40, 28, P.INK, min(1, a))


def sh_cup(c, t):
    kitchen(c, t); t0 = 0.0
    a = pop(t, 0.2, kind="clink"); scaled(c, 540, 1050, a, lambda: cup(c, t, 540, 1050, 1.3))
    him_at(c, t, 0.6, 820, 760, 100, "smile", arms=("down", "forward"), look=-0.5)
    marks(c, t, 1.4, 820, 760, 100, ["heart"], 0.3)
def sh_milk(c, t):
    kitchen(c, t); t0 = t_of("Mit Hafermilch")
    cup(c, t, 540, 1080, 1.2)
    a = pop(t, t0, kind="pop"); scaled(c, 300, 760, a, lambda: (P.paper(c, lambda c: P.rrect(c, 230, 620, 140, 260, 16), MILK, 1.3), label(c, "HAFER", 300, 760, 30, P.INK)))
    b = pop(t, t_of("ohne Zucker"), kind="pop")
    scaled(c, 780, 760, b, lambda: P.paper(c, lambda c: P.rrect(c, 720, 700, 120, 120, 12), P.CREAM, 1.3))
    if t > t_of("ohne Zucker") + 0.3:
        cue(t_of("ohne Zucker") + 0.3, "zap"); c.set_source_rgb(*P.ROSE); c.set_line_width(14); c.move_to(700, 690); c.line_to(860, 840); c.move_to(860, 690); c.line_to(700, 840); c.stroke()
    th = pop(t, t_of("nicht zu"), kind="tick")
    scaled(c, 540, 600, th, lambda: (P.paper(c, lambda c: P.rrect(c, 515, 470, 50, 220, 25), P.CREAM, 1.3), P.paper(c, lambda c: P.ell(c, 540, 690, 45, 45), P.ROSE, 1.35)))
def sh_term(c, t):
    P.background(c); t0 = t_of("Der Paarforscher")
    map_sheet(c, t, t0, 540, 960, 760, 560, [(-200, -60, "heart", ""), (60, 80, "star", ""), (220, -110, "heart", "")])
def sh_inner(c, t):
    P.background(c); t0 = t_of("Gemeint ist")
    P.person(c, False, 540, 1100, 110, "calm", arms=("down", "down"), breath=breath(t))
    z = ease((t - t0 - 0.3) / 0.5); cue(t0 + 0.3, "zoom")
    P.paper(c, lambda c: P.ell(c, 540, 650, 300 * max(z, 1e-3), 210 * max(z, 1e-3)), P.CREAM, 1.3)
    for i in range(3): P.paper(c, lambda c, i=i: P.ell(c, 540 + 20 * i, 870 + 40 * i, (16 - 4 * i) * z + 1e-3, (16 - 4 * i) * z + 1e-3), P.CREAM, 1.3)
    if z > 0.6:
        P.head(c, True, 540, 650, 85 * z, "smile", depth=1.4)
        for k, kind in enumerate(("heart", "star", "heart")): P.mark(c, kind, 380 + 160 * k, 560 + 40 * (k % 2), 0.7, pop(t, t0 + 0.9 + 0.2 * k, kind="sparkle"))
def sh_colleague(c, t):
    living(c, t); t0 = t_of("Ein Mann mit")
    P.person(c, True, 330, 820, 100, "angry", talk(t), arms=("hip", "forward"), look=0.6)
    P.person(c, False, 760, 810, 106, "smile", blink=blink(t), arms=("down", "down"), look=-0.5)
    a = pop(t, t0 + 1.0, kind="pop")
    scaled(c, 330, 560, a, lambda: (P.paper(c, lambda c: P.rrect(c, 180, 500, 300, 110, 20), (0.62, 0.78, 1.0), 1.3), label(c, "Sabine 🙄" if False else "SABINE", 330, 572, 46, P.INK)))
    marks(c, t, t0 + 1.8, 330, 820, 100, ["vein"], 0.3)
    P.bubble(c, 780, 560, 300, 110, "Wieder Sabine?", 34, pop(t, t0 + 2.6), tail=1)
def sh_dentist(c, t):
    P.background(c); t0 = t_of("Er weiß, dass")
    P.person(c, True, 540, 900, 110, "shock", blink=blink(t), arms=("cross", "cross"), tilt=2 * math.sin(t * 20))
    a = pop(t, t0 + 0.3, kind="thud")
    scaled(c, 540, 560, a, lambda: P.paper(c, lambda c: (c.move_to(470, 470), c.curve_to(470, 420, 610, 420, 610, 470), c.curve_to(615, 560, 590, 650, 570, 650),
                                                             c.curve_to(555, 650, 555, 580, 540, 580), c.curve_to(525, 580, 525, 650, 510, 650), c.curve_to(490, 650, 465, 560, 470, 470),
                                                             c.close_path()), P.CREAM, 1.3))
    marks(c, t, t0 + 0.7, 540, 900, 110, ["drop", "drop", "!"], 0.25)
def sh_song(c, t):
    living(c, t, 0.9); t0 = t_of("Und er erinnert")
    P.person(c, True, 450, 900, 100, "calm", arms=("down", "reach"), tilt=8, breath=breath(t))
    P.person(c, False, 650, 890, 106, "smile", arms=("reach", "down"), tilt=-6)
    for k in range(5):
        a = pop(t, t0 + 0.2 + 0.35 * k, kind="sparkle")
        x = 300 + 120 * k; y = 560 - 40 * math.sin(t * 2 + k)
        if a > 0:
            P.paper(c, lambda c, x=x, y=y, a=a: P.ell(c, x, y, 26 * a, 20 * a), P.ROSE if k % 2 else P.MOON, 1.4)
            c.set_source_rgb(*(P.ROSE if k % 2 else P.MOON)); c.set_line_width(8); c.move_to(x + 22 * a, y); c.line_to(x + 22 * a, y - 80 * a); c.stroke()
def sh_storms(c, t):
    P.background(c); t0 = t_of("Laut Gottman")
    for k, (lab, x) in enumerate((("STRESS", 260), ("KRISE", 540), ("BABY", 820))):
        u = slide(t, t0 + 0.4 * k, 0.5, "whoosh")
        cloud(c, x, 560 + 200 * (1 - u), 0.7)
        label(c, lab, x, 580 + 200 * (1 - u), 34, P.CREAM, u)
    a = pop(t, t0 + 1.6, kind="whoosh"); scaled(c, 540, 1100, a, lambda: P.umbrella(c, 540, 980, 1.8, P.SAGE_C))
    P.person(c, True, 450, 1140, 70, "smile", arms=("down", "down"), depth=1.3); P.person(c, False, 640, 1135, 74, "smile", arms=("down", "down"), depth=1.3)
    P.rain(c, t, 120, 650, 840, 300, 30, 0.35)
def sh_seen(c, t):
    P.background(c); t0 = t_of("Denn wer")
    g = cairo.RadialGradient(540, 800, 0, 540, 900, 520); g.add_color_stop_rgba(0, 1, 0.9, 0.6, 0.45 * ease((t - t0) / 0.6)); g.add_color_stop_rgba(1, 1, 0.9, 0.6, 0)
    c.set_source(g); c.paint(); cue(t0, "rise")
    P.person(c, True, 540, 880, 115, "smile", arms=("down", "down"), breath=breath(t))
    a = pop(t, t0 + 0.8, kind="ding"); scaled(c, 540, 520, a, lambda: ic_eye(c, 540, 520))
def sh_no_fight(c, t):
    living(c, t); sofa(c); t0 = t_of("Und wer sich")
    P.person(c, True, 420, 880, 95, "calm", sit=True, arms=("down", "reach"), tilt=10, breath=breath(t))
    P.person(c, False, 660, 870, 100, "smile", sit=True, arms=("reach", "down"), tilt=-6)
    for k in range(3):
        a = pop(t, t0 + 0.3 + 0.25 * k, kind="pop"); x = 260 + 280 * k
        scaled(c, x, 560, a, lambda x=x: P.paper(c, lambda c: P.rrect(c, x - 60, 520, 120, 80, 20), P.ROSE, 1.3))
        if t > t0 + 1.4: P.paper(c, lambda c, x=x: P.ell(c, x, 560, 1, 1), P.ROSE, 1.3)
    if t > t0 + 1.2:
        cue(t0 + 1.2, "rip"); c.set_source_rgb(*P.CREAM); c.set_line_width(12); c.move_to(180, 520); c.line_to(900, 610); c.stroke()
def sh_forget(c, t):
    kitchen(c, t); t0 = t_of("Gefährlich wird es nicht")
    P.person(c, False, 540, 800, 112, "shock", blink=blink(t), arms=("down", "up"), look=0.0)
    marks(c, t, t0 + 0.3, 540, 800, 112, ["?", "?"], 0.3)
    a = pop(t, t0 + 1.2, kind="ding")
    P.paper(c, lambda c: P.ell(c, 860, 520, 70 * max(a, 1e-3), 70 * max(a, 1e-3)), P.SAGE_C, 1.4)
    if a > 0.5:
        c.set_source_rgb(1, 1, 1); c.set_line_width(14); c.set_line_cap(cairo.LINE_CAP_ROUND); c.move_to(825, 520); c.line_to(852, 548); c.line_to(900, 495); c.stroke()
def sh_stops(c, t):
    living(c, t, 0.4); sofa(c); t0 = t_of("Gefährlich wird es, wenn")
    P.person(c, True, 330, 880, 95, "sad", sit=True, arms=("down", "down"), look=0.6, blink=blink(t))
    P.person(c, False, 740, 870, 100, "neutral", blink=blink(t), sit=True, arms=("phone", "phone"), phone=True, look=0.2)
    a = pop(t, t0 + 1.0, kind="buzzer")
    P.paper(c, lambda c: P.ell(c, 860, 520, 70 * max(a, 1e-3), 70 * max(a, 1e-3)), P.ROSE, 1.4)
    if a > 0.5:
        c.set_source_rgb(1, 1, 1); c.set_line_width(14); c.set_line_cap(cairo.LINE_CAP_ROUND); c.move_to(835, 545); c.line_to(885, 495); c.move_to(835, 495); c.line_to(885, 545); c.stroke()
def sh_questions(c, t):
    kitchen(c, t)
    qs = [("Wie war dein Tag?", t_of("Wie war")), ("Was beschäftigt dich?", t_of("Was beschäftigt")), ("Wovon träumst du?", t_of("Wovon"))]
    P.person(c, False, 780, 800, 104, "smile", talk(t), arms=("down", "forward"), look=-0.5)
    P.person(c, True, 280, 820, 96, "smile", blink=blink(t), arms=("down", "down"), look=0.5)
    for k, (q, tq) in enumerate(qs): P.bubble(c, 600 - 40 * k, 500 + 130 * k, 430, 110, q, 36, pop(t, tq), tail=1, col=(P.CREAM, P.MOON, P.ROSE)[k])
def sh_gestures(c, t):
    P.background(c); t0 = t_of("Denn Liebe")
    a = pop(t, t0 + 0.1, kind="thud")
    scaled(c, 540, 900, a, lambda: (P.paper(c, lambda c: P.rrect(c, 340, 760, 400, 300, 20), P.ROSE, 1.2), P.paper(c, lambda c: P.rrect(c, 520, 760, 40, 300, 6), P.MOON, 1.25),
                                     P.paper(c, lambda c: P.rrect(c, 320, 720, 440, 70, 16), (0.85, 0.45, 0.58), 1.25)))
    s_ = 1 - 0.55 * ease((t - t0 - 1.2) / 0.6); cue(t0 + 1.2, "zoomout")
    if t > t0 + 1.2:
        c.set_source_rgb(*P.CREAM); c.set_line_width(14); c.move_to(300, 700); c.line_to(780, 1100); c.stroke()
def sh_final_cup(c, t):
    living(c, t, 1.0); t0 = t_of("Meistens")
    P.person(c, True, 330, 860, 100, "smile", blink=blink(t), arms=("down", "forward"), look=0.6, tilt=6)
    u = slide(t, t0 + 0.2, 0.7, "whoosh")
    P.person(c, False, 760, 850, 106, "smile", arms=("reach", "down"), look=-0.6)
    cup(c, t, 760 - 300 * u, 1000, 0.6)
    marks(c, t, t0 + 1.0, 330, 860, 100, ["heart", "heart", "star"], 0.3)
def sh_share(c, t):
    kitchen(c, t); t0 = t_of("Schick das")
    for k, x in enumerate((370, 710)):
        a = pop(t, t0 + 0.2 + 0.25 * k, kind="clink"); scaled(c, x, 1050, a, lambda x=x: cup(c, t, x, 1050, 0.9, True, (P.ROSE, (0.62, 0.78, 1.0))[k]))
    b = pop(t, t0 + 0.9, kind="sparkle"); P.paper(c, lambda c: P.heart(c, 540, 760 - 20 * math.sin(t * 3), 60 * max(b, 1e-3)), P.ROSE, 1.4)
    c2 = pop(t, t0 + 1.3, kind="whoosh")
    scaled(c, 540, 560, c2, lambda: (P.paper(c, lambda c: (c.move_to(470, 600), c.line_to(640, 520), c.line_to(600, 660), c.line_to(570, 610), c.close_path()), P.MOON, 1.4)))

ROSE_, SAGE_, VIOLET_, BLUE_, MOON_, COF = P.ROSE, P.SAGE_C, P.VIOLET_C, P.BLUE_C, P.MOON, (0.85, 0.62, 0.45)
SHOTS = [(0.0, sh_cup, COF), (t_of("Mit Hafermilch"), sh_milk, COF), (t_of("Der Paarforscher"), sh_term, ROSE_), (t_of("Gemeint ist"), sh_inner, ROSE_),
         (t_of("Ein Mann mit"), sh_colleague, BLUE_), (t_of("Er weiß, dass"), sh_dentist, BLUE_), (t_of("Und er erinnert"), sh_song, ROSE_),
         (t_of("Laut Gottman"), sh_storms, SAGE_), (t_of("Denn wer"), sh_seen, MOON_), (t_of("Und wer sich"), sh_no_fight, ROSE_),
         (t_of("Gefährlich wird es nicht"), sh_forget, SAGE_), (t_of("Gefährlich wird es, wenn"), sh_stops, ROSE_), (t_of("Wie war"), sh_questions, MOON_),
         (t_of("Denn Liebe"), sh_gestures, ROSE_), (t_of("Meistens"), sh_final_cup, COF), (t_of("Schick das"), sh_share, ROSE_)]

STARTS = [s[0] for s in SHOTS]
XF = 0.25                                                                     # cross-fade length

# ---------------------------------------------------------------- words one by one, coloured keywords
FONT = ImageFont.truetype(os.path.join(HERE, "fonts", "Inter-ExtraBold.otf"), 60)
KEY = {"genau", "Kaffee", "Zufall", "Hafermilch", "Zucker", "heiß", "Gottman", "Liebeslandkarte", "Bild", "Welt", "Kollegin", "ärgert",
       "Zahnarzt", "Angst", "Song", "geküsst", "Stress", "Krisen", "Kindes", "besser", "gesehen", "Aufmerksamkeit", "vergisst", "fragen",
       "Tag", "beschäftigt", "träumst", "Gesten", "Tasse", "mag", "trinkst"}
def words():
    out = []
    for m in re.finditer(r"\S+", CH):
        if m.group(0).startswith("{{"): continue
        out.append((m.group(0), ST[m.start()], EN[m.end() - 1]))
    return out
WORDS = words()
def groups(ws, mx=3, mc=18):
    gs, cur = [], []
    for w in ws:
        txt = " ".join(x[0] for x in cur + [w])
        if cur and (len(cur) >= mx or len(txt) > mc): gs.append(cur); cur = []
        cur.append(w)
        if re.search(r"[.?!,:;]$", w[0]): gs.append(cur); cur = []
    if cur: gs.append(cur)
    return gs
GROUPS = groups(WORDS)


def caption(im, t):
    """CAPS, words appear one by one; keywords take the accent colour of the shot that is on screen"""
    d = ImageDraw.Draw(im)
    k = max(i for i, s0 in enumerate(STARTS) if s0 <= t); acc = tuple(int(v * 255) for v in SHOTS[k][2])
    for i, g in enumerate(GROUPS):
        end = GROUPS[i + 1][0][1] if i + 1 < len(GROUPS) else g[-1][2] + 0.8
        if g[0][1] - 0.05 <= t < end:
            toks = [w[0].upper() for w in g]; f = FONT; tot = f.getlength(" ".join(toks))
            if tot > 940: f = ImageFont.truetype(FONT.path, int(FONT.size * 940 / tot)); tot = f.getlength(" ".join(toks))
            x = (W - tot) / 2
            for (tok, s0, e0), up in zip(g, toks):
                a = max(0.0, min(1.0, (t - s0 + 0.05) / 0.12))
                if a <= 0: x += f.getlength(up + " "); continue
                core = re.sub(r"[.,:;!?]", "", tok)
                col = acc if core in KEY else (250, 244, 236)
                sc = 1 + 0.25 * (1 - a)                                 # each word pops in
                y = 1330 + 10 * (1 - a)
                for ox, oy in ((-3, 0), (3, 0), (0, -3), (0, 3), (3, 6)): d.text((x + ox, y + oy), up, font=f, fill=(15, 10, 30))
                d.text((x, y), up, font=f, fill=tuple(int(v * a + 30 * (1 - a)) for v in col))
                x += f.getlength(up + " ")
            return


def collect_cues(step=1 / 15):
    """draw every shot cheaply at 15 fps to collect the animation cues (each pop/whoosh registers its own time)"""
    P.CUES.clear()
    s = cairo.ImageSurface(cairo.FORMAT_RGB24, 54, 96); c = cairo.Context(s); c.scale(0.05, 0.05)
    for k, (t0, fn, _acc) in enumerate(SHOTS):
        t1 = STARTS[k + 1] if k + 1 < len(STARTS) else DUR
        t = t0
        while t < t1:
            c.save(); fn(c, t); c.restore(); t += step
    cues = sorted((t, kind) for t, kind in P.CUES if 0 <= t < DUR)
    cues += [(s0 - 0.05, "swish") for s0 in STARTS[1:]]                                 # every picture change
    for g in GROUPS:                                                                    # soft click on keywords
        for tok, s0, e0 in g:
            if re.sub(r"[.,:;!?]", "", tok) in KEY: cues.append((s0, "key"))
    return sorted(cues)


def draw(t, k):
    s = cairo.ImageSurface(cairo.FORMAT_RGB24, W, H); c = cairo.Context(s)
    t0 = STARTS[k]; t1 = STARTS[k + 1] if k + 1 < len(STARTS) else DUR
    u = ease((t - t0) / max(0.5, t1 - t0)); z = 1.0 + 0.05 * u                  # slow push in every shot
    P.CAM["dx"] = 30 * (u - 0.5) * (1 if k % 2 else -1)
    c.translate(540, 1000); c.scale(z, z); c.translate(-540 + P.CAM["dx"], -1000)
    SHOTS[k][1](c, t)
    s.flush()
    return np.frombuffer(s.get_data(), np.uint8).reshape(H, W, 4)[:, :, [2, 1, 0]].astype(np.float32)


def frame(t):
    k = max(i for i, s0 in enumerate(STARTS) if s0 <= t)
    arr = draw(t, k)
    if k + 1 < len(STARTS) and t > STARTS[k + 1] - XF:                          # cross-fade into the next shot
        a = ease((t - (STARTS[k + 1] - XF)) / XF); arr = arr * (1 - a) + draw(t, k + 1) * a
    if t > DUR - 0.8: arr = arr * max(0.0, (DUR - t) / 0.8)
    im = Image.fromarray(P.grain(arr).astype(np.uint8)); caption(im, t)
    return np.asarray(im)


def render_range(args):
    i0, i1, path = args
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                          "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", path], stdin=subprocess.PIPE)
    for i in range(i0, i1): p.stdin.write(frame(i / FPS).tobytes())
    p.stdin.close(); p.wait(); return path


def music(path):
    N = int(DUR * SR) + SR; out = np.zeros(N, np.float32); hz = lambda n: 440 * 2 ** (n / 12)
    def note(f, d, v):
        n = int(d * SR); tt = np.arange(n) / SR; x = sum((v / h ** 1.5) * np.sin(2 * np.pi * f * h * tt) * np.exp(-tt * (1.2 + 0.6 * h)) for h in range(1, 6))
        return (x * np.minimum(1, tt / 0.005)).astype(np.float32)
    prog = [(-12, -5, 0, 3), (-16, -9, -4, 0), (-19, -12, -7, -3), (-14, -7, -2, 2)]
    for k, t0 in enumerate(STARTS[::2]):                # a soft chord on every second picture change
        for j, n in enumerate(prog[k % 4]):
            x = note(hz(n), 3.0, 0.32 if j else 0.45); i = int((t0 + 0.04 * j) * SR); out[i:i + len(x)] += x[: max(0, N - i)]
    ir = np.random.default_rng(3).standard_normal(int(1.8 * SR)) * np.exp(-np.arange(int(1.8 * SR)) / SR * 3.5)
    L = len(out) + len(ir); wet = np.fft.irfft(np.fft.rfft(out, L) * np.fft.rfft(ir, L), L)[: len(out)]
    mix = 0.65 * out / (np.abs(out).max() + 1e-9) + 0.35 * wet / (np.abs(wet).max() + 1e-9)
    mix *= np.clip((DUR - np.arange(N) / SR) / 1.5, 0, 1)
    mix = 0.55 * mix                                                         # music under the effects
    fx = sfx.render(collect_cues(), DUR); mix[: len(fx)] += 0.9 * fx         # animation sounds on their exact frames
    with wave.open(path, "wb") as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(mix, -1, 1) * 32767).astype(np.int16).tobytes())


if __name__ == "__main__":
    OUT = sys.argv[1]
    if "--preview" in sys.argv:
        ts = [float(x) for x in sys.argv[sys.argv.index("--preview") + 1].split(",")]
        for t in ts: Image.fromarray(frame(t)).resize((360, 640)).save(f"{OUT}_{t:05.1f}.png")
        sys.exit()
    n = int(DUR * FPS); parts = 4; per = math.ceil(n / parts)
    paths = [f"{OUT}.part{i}.mp4" for i in range(parts)]
    with Pool(parts) as pool: pool.map(render_range, [(i * per, min(n, (i + 1) * per), paths[i]) for i in range(parts)])
    lst = OUT + ".list.txt"; open(lst, "w").write("".join(f"file '{p}'\n" for p in paths))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", OUT + ".video.mp4"], check=True)
    music(OUT + ".music.wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", OUT + ".video.mp4", "-i", VOICE, "-i", OUT + ".music.wav", "-filter_complex",
                    "[2:a]volume=0.20[m];[1:a]asplit=2[v][sc];[m][sc]sidechaincompress=threshold=0.03:ratio=4:attack=20:release=400[md];"
                    "[v][md]amix=inputs=2:duration=longest:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=44100[a]",
                    "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-t", f"{DUR:.2f}", OUT], check=True)
    for p in paths + [lst, OUT + ".video.mp4", OUT + ".music.wav"]: os.remove(p)
    print("DONE", OUT)
