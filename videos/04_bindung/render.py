"""Video 04 'Vier Bindungsstile' in the paper cut-out style, paced like the fakedrake15 reference (see ../fakedrake_analyse.md).
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


def sh_child(c, t):
    P.background(c); t0 = 0.0
    g = 0.45 + 0.55 * ease((t - 1.0) / 1.2); cue(1.0, "rise")
    P.person(c, True, 540, 1300 - 420 * g, 110 * g, "smile", blink=blink(t), arms=("down", "down"), breath=breath(t), depth=1.2)
    a = pop(t, 0.3, kind="sparkle"); P.paper(c, lambda c: P.heart(c, 540, 1300 - 420 * g - 230 * g, 40 * max(a, 1e-3)), ROSE, 1.4)
    for i in range(3): P.mark(c, "star", 300 + 240 * i, 520 + 60 * (i % 2), 0.9, pop(t, 0.6 + 0.25 * i, kind="tick"))
def sh_drawing(c, t):
    P.background(c); t0 = t_of("entscheidet")
    a = pop(t, t0, kind="pop")
    scaled(c, 540, 950, a, lambda: P.paper(c, lambda c: P.rrect(c, 230, 640, 620, 640, 30), P.CREAM, 1.2))
    w = ease((t - t0 - 0.3) / 1.0); cue(t0 + 0.3, "scribble")
    c.set_source_rgb(*ROSE); c.set_line_width(10); c.set_line_cap(cairo.LINE_CAP_ROUND)
    if w > 0:   # crayon house + two little people drawn on the paper
        pts = [(380, 1000), (380, 860), (540, 760), (700, 860), (700, 1000), (380, 1000)]
        n = int(len(pts) * w) + 1; c.move_to(*pts[0]); [c.line_to(*p) for p in pts[1:n]]; c.stroke()
    if w > 0.7:
        for k, (x, col) in enumerate(((460, ROSE), (620, BLUE))):
            c.set_source_rgb(*col); c.new_sub_path(); c.arc(x, 1100, 26, 0, 2 * math.pi); c.stroke(); c.move_to(x, 1126); c.line_to(x, 1190); c.stroke()
def sh_four(c, t):
    P.background(c); t0 = t_of("Psychologen")
    cols = [SAGE, ROSE, BLUE, VIOLET]; icons = [ic_house, ic_phone, ic_wall, ic_heart_bolt]
    for k in range(4):
        x, y = 330 + 420 * (k % 2), 720 + 440 * (k // 2); tk = t0 + 0.35 * k
        P.draw_ring(c, t, tk, x, y, 150, cols[k], 16, 0.5)
        a = pop(t, tk + 0.3, kind="pop"); scaled(c, x, y, a * 0.8, lambda x=x, y=y, k=k: icons[k](c, x, y))
def sh_mirror(c, t):
    living(c, t); t0 = t_of("und fast")
    P.paper(c, lambda c: P.rrect(c, 600, 560, 300, 620, 140), (0.75, 0.82, 0.95), 1.0)
    c.save(); P.rrect(c, 620, 580, 260, 580, 120); c.clip()
    P.person(c, True, 750, 820, 70, "neutral", blink=blink(t), arms=("down", "down"), depth=1.0); c.restore()
    P.person(c, True, 330, 820, 100, "neutral", blink=blink(t), arms=("down", "down"), look=0.7)
    marks(c, t, t0 + 0.6, 330, 820, 100, ["?"], 0.3)
def sh_secure(c, t): ring_shot(c, t, t_of("Der erste"), 1, "sicher", SAGE, ic_house)
def sh_close(c, t):
    living(c, t); sofa(c); t0 = t_of("Diese Menschen")
    P.person(c, True, 420, 880, 95, "smile", sit=True, arms=("down", "reach"), tilt=8, breath=breath(t))
    P.person(c, False, 660, 870, 100, "smile", sit=True, arms=("reach", "down"), tilt=-6, breath=breath(t + 1))
    marks(c, t, t0 + 0.3, 540, 880, 100, ["heart", "heart", "heart"], 0.3)
def sh_own_space(c, t):
    bed(c, t); t0 = t_of("und trotzdem")
    P.head(c, True, 360, 1030, 95, "calm"); P.head(c, False, 720, 1030, 100, "smile")
    duvet(c, 8 * math.sin(t * 1.5))
    for k, (x, col) in enumerate(((360, ROSE), (720, BLUE))): P.draw_ring(c, t, t0 + 0.3 + 0.4 * k, x, 1030, 150, col, 10, 0.5)
def sh_storm(c, t):
    P.background(c); t0 = t_of("Ein Streit")
    cloud(c, 540, 600 + 10 * math.sin(t * 2), 1.1); P.rain(c, t, 260, 680, 560, 500)
    if int(t * 5) % 7 == 0: P.mark(c, "bolt", 600, 720, 1.2)
    cue(t0 + 0.1, "rain")
    a = pop(t, t0 + 0.6, kind="whoosh"); scaled(c, 540, 1000, a, lambda: P.umbrella(c, 540, 900, 1.6, SAGE))
    P.person(c, True, 440, 1080, 70, "smile", arms=("down", "down"), depth=1.3)
    P.person(c, False, 640, 1075, 75, "smile", arms=("down", "down"), depth=1.3)
def sh_anxious(c, t): ring_shot(c, t, t_of("Der zweite"), 2, "ängstlich", ROSE, ic_phone)
def sh_nachricht(c, t):
    P.background(c); t0 = t_of("Eine Nachricht")
    P.phone_big(c, t, 540, 960, [("Bist du da?", True, t0 + 0.2), ("Hallo?", True, t0 + 0.9), ("??", True, t0 + 1.5)])
    a = pop(t, t0 + 1.9, kind="drip"); P.paper(c, lambda c: P.rrect(c, 560, 1250, 160, 50, 20), (0.62, 0.62, 0.70), 1.4, min(1, a))
    label(c, "Gelesen", 640, 1287, 28, P.INK, min(1, a))
def sh_kopfkino(c, t):
    P.background(c); t0 = t_of("im Kopf")
    P.person(c, True, 540, 1150, 110, "shock", blink=blink(t), arms=("cross", "cross"), breath=breath(t))
    z = 1 + 0.15 * ease((t - t0) / 1.2); cue(t0, "zoom")
    for k, (x, y, kind) in enumerate(((320, 640, "?"), (540, 540, "bolt"), (760, 640, "!"), (430, 780, "tear"), (660, 790, "?"))):
        a = pop(t, t0 + 0.2 + 0.22 * k, kind="pop")
        P.paper(c, lambda c, x=x, y=y, a=a: P.ell(c, x, y, 85 * max(a, 1e-3), 70 * max(a, 1e-3)), P.CREAM, 1.3)
        P.mark(c, kind, x, y + 8, 1.2 * z, a)
def sh_confirm(c, t):
    P.background(c); t0 = t_of("Sie brauchen")
    for k in range(7):
        x = 250 + (k % 3) * 290 + (k // 3 % 2) * 70; y = 520 + (k // 3) * 230
        P.bubble(c, x, y, 330, 110, "Liebst du mich?", 34, pop(t, t0 + 0.18 * k), tail=1 if k % 2 else -1, col=ROSE if k % 2 else P.CREAM)
    n = min(7, int(1 + 6 * ease((t - t0) / 1.3)))
    P.paper(c, lambda c: P.ell(c, 540, 1180, 110, 110), ROSE, 1.3); label(c, f"{n}×", 540, 1215, 96, P.INK)
def sh_left(c, t):
    living(c, t, 0.6); t0 = t_of("Angst, verlassen")
    P.person(c, True, 330, 820, 100, "sad", blink=blink(t), arms=("down", "reach"), look=0.8)
    u = slide(t, t0 + 0.2, 1.0, "steps")
    P.person(c, False, 720 + 500 * u, 810, 106, "neutral", arms=("down", "down"), look=0.6)
    marks(c, t, t0 + 0.9, 330, 820, 100, ["tear", "tear"], 0.4)
def sh_avoid(c, t): ring_shot(c, t, t_of("Der dritte"), 3, "vermeidend", BLUE, ic_wall)
def sh_too_close(c, t):
    kitchen(c, t); t0 = t_of("Sobald es")
    u = slide(t, t0, 0.8, "whoosh"); v = slide(t, t0 + 0.6, 0.6, "whoosh")
    P.person(c, True, 250 + 200 * u, 790, 95, "smile", arms=("down", "reach"), look=0.6)
    P.person(c, False, 700 + 170 * v, 780, 100, "shock" if v < 0.8 else "neutral", arms=("cross", "cross"), look=-0.5)
    marks(c, t, t0 + 0.7, 700 + 170 * v, 780, 100, ["!", "drop"], 0.3)
def sh_lock(c, t):
    P.background(c); t0 = t_of("Gefühle zu zeigen")
    P.person(c, False, 540, 840, 115, "neutral", blink=blink(t), arms=("cross", "cross"))
    a = pop(t, t0 + 0.3, kind="sparkle"); P.paper(c, lambda c: P.heart(c, 540, 1240, 60 * max(a, 1e-3)), ROSE, 1.4)
    b = pop(t, t0 + 0.9, kind="clang"); scaled(c, 540, 1250, b, lambda: P.padlock(c, 540, 1280, 1.3))
def sh_cold(c, t):
    P.background(c, (0.12, 0.16, 0.30), (0.16, 0.20, 0.34)); t0 = t_of("deshalb wirken")
    P.person(c, False, 540, 900, 115, "neutral", blink=blink(t), arms=("cross", "cross"), tilt=3 * math.sin(t * 8))
    for k in range(8):
        a = pop(t, t0 + 0.12 * k, kind="tick"); P.snowflake(c, 250 + (k * 137) % 600, 520 + (k * 211) % 700, 1.3 * a, min(1, a))
def sh_disorg(c, t): ring_shot(c, t, t_of("Der vierte"), 4, "desorganisiert", VIOLET, ic_heart_bolt)
def sh_pushpull(c, t):
    living(c, t); t0 = t_of("Sie wünschen")
    ph = math.sin((t - t0) * 3.2)                                        # forward / back
    for k in range(4): cue(t0 + 0.5 + k * math.pi / 3.2, "whoosh")
    P.person(c, True, 380 + 140 * max(0, ph), 820, 100, "smile" if ph > 0 else "shock", arms=("down", "reach" if ph > 0 else "cross"), look=0.7)
    P.person(c, False, 780, 810, 106, "neutral", blink=blink(t), arms=("down", "down"), look=-0.5)
    P.paper(c, lambda c: P.heart(c, 600, 580, 30 + 10 * max(0, ph)), ROSE, 1.4)
def sh_today(c, t):
    P.background(c); t0 = t_of("Heute ganz")
    flip = t >= t_of("morgen"); cue(t_of("morgen"), "whoosh")
    P.paper(c, lambda c: P.rrect(c, 300, 520, 480, 220, 30), VIOLET, 1.2); label(c, "MORGEN" if flip else "HEUTE", 540, 660, 80, P.INK)
    P.person(c, True, 420, 1000, 90, "sad" if flip else "smile", arms=("down", "down" if flip else "reach"))
    if not flip: P.person(c, False, 650, 990, 95, "smile", arms=("reach", "down"))
    else: P.paper(c, lambda c: P.ell(c, 650, 1000, 95, 95), (0.30, 0.28, 0.44), 1.0, 0.5)
def sh_spannend(c, t):
    P.background(c); t0 = t_of("Und genau")
    z = 1 + 0.3 * ease((t - t0) / 1.2); cue(t0, "zoom")
    a = pop(t, t0 + 0.4, kind="thud"); scaled(c, 540, 950, a * z, lambda: P.magnet(c, 540, 1000, 1.8))
    for i in range(6): P.mark(c, "star", 540 + 260 * math.cos(i + t), 950 + 260 * math.sin(i + t), 0.7, pop(t, t0 + 0.6 + 0.1 * i, kind="tick"))
def sh_attract(c, t):
    P.background(c); t0 = t_of("Ängstliche und")
    u = slide(t, t0 + 0.3, 1.2, "whoosh")
    P.person(c, True, 200 + 200 * u, 900, 95, "smile", arms=("down", "reach"), look=0.6)
    P.person(c, False, 880 - 200 * u, 890, 100, "neutral", arms=("reach", "down"), look=-0.6)
    P.magnet(c, 540, 600, 0.8); marks(c, t, t0 + 1.3, 540, 900, 100, ["heart"], 0.3)
def sh_chase(c, t):
    t0 = t_of("Der eine"); term_card(c, t, t0, "", ROSE); loop_arrows(c, t, t0, 2.6)
    P.person(c, True, 430, 1070, 52, "sad", talk(t), arms=("down", "reach"), depth=1.3)
    P.person(c, False, 650, 1070, 56, "neutral", blink=blink(t), arms=("cross", "cross"), depth=1.3)
def sh_hurt(c, t):
    P.background(c); t0 = t_of("und beide")
    P.person(c, True, 330, 860, 100, "sad", blink=blink(t), arms=("cross", "cross"))
    P.person(c, False, 750, 850, 106, "sad", blink=blink(t, 2.7), arms=("cross", "cross"))
    for k, (x, y) in enumerate(((330, 1120), (750, 1110))):
        a = pop(t, t0 + 0.4 + 0.4 * k, kind="pop")
        c.save(); c.translate(x, y); c.rotate(0.6); c.scale(max(a, 1e-3), max(a, 1e-3))
        P.paper(c, lambda c: P.rrect(c, -70, -24, 140, 48, 20), P.CREAM, 1.4); c.restore()
    marks(c, t, t0 + 0.2, 330, 860, 100, ["tear"], 0.3); marks(c, t, t0 + 0.5, 750, 850, 106, ["drop"], 0.3)
def sh_good(c, t):
    P.background(c, (0.20, 0.16, 0.34), (0.36, 0.24, 0.34)); t0 = t_of("Die gute")
    P.rays(c, t, t0, 540, 1000, MOON)
    a = pop(t, t0 + 0.3, kind="sparkle"); P.paper(c, lambda c: P.ell(c, 540, 1000, 150 * max(a, 1e-3), 150 * max(a, 1e-3)), MOON, 1.2)
def sh_chain(c, t):
    P.background(c); t0 = t_of("kein Schicksal")
    P.chain(c, t, t0 + 0.4, 540, 960)
    P.person(c, True, 540, 1180, 70, "smile" if t > t0 + 0.6 else "neutral", arms=("up", "up") if t > t0 + 0.6 else ("down", "down"), depth=1.3)
def sh_partner(c, t):
    living(c, t, 1.0); t0 = t_of("Mit einem")
    P.person(c, True, 450, 900, 100, "calm", arms=("down", "reach"), tilt=10, breath=breath(t))
    P.person(c, False, 650, 890, 106, "smile", arms=("reach", "down"), tilt=-8, breath=breath(t + 1))
    P.draw_ring(c, t, t0 + 0.3, 550, 1050, 330, SAGE, 12, 0.7)
def sh_learn(c, t):
    P.background(c); t0 = t_of("kann jeder")
    tops = P.stairs(c, t, t0, 160, 1450, 5, 150, SAGE, 1.2)
    if tops:
        x, y = tops[-1]; P.person(c, True, x - 20, y - 330 * 0.55, 55, "smile", arms=("up", "down"), depth=1.3)
        P.person(c, False, x + 60, y - 330 * 0.55, 58, "smile", arms=("down", "up"), depth=1.3)
    marks(c, t, t0 + 1.4, 760, 650, 60, ["heart", "star"], 0.3)
def sh_which(c, t):
    P.background(c); t0 = t_of("Welcher")
    cols = [SAGE, ROSE, BLUE, VIOLET]; icons = [ic_house, ic_phone, ic_wall, ic_heart_bolt]
    for k in range(4):
        x, y = 330 + 420 * (k % 2), 760 + 440 * (k // 2); a = pop(t, t0 + 0.15 * k, kind="pop")
        scaled(c, x, y, a, lambda x=x, y=y, k=k: (P.paper(c, lambda c: P.ell(c, x, y, 150, 150), (0.24, 0.22, 0.38), 1.2), icons[k](c, x, y)))
        label(c, str(k + 1), x, y + 230, 70, cols[k], min(1, a))
    marks(c, t, t0 + 0.8, 540, 980, 60, ["?"], 0.3)

SHOTS = [(0.0, sh_child, ROSE), (t_of("entscheidet"), sh_drawing, MOON), (t_of("Psychologen"), sh_four, VIOLET), (t_of("und fast"), sh_mirror, ROSE),
         (t_of("Der erste"), sh_secure, SAGE), (t_of("Diese Menschen"), sh_close, SAGE), (t_of("und trotzdem"), sh_own_space, SAGE), (t_of("Ein Streit"), sh_storm, SAGE),
         (t_of("Der zweite"), sh_anxious, ROSE), (t_of("Eine Nachricht"), sh_nachricht, ROSE), (t_of("im Kopf"), sh_kopfkino, ROSE), (t_of("Sie brauchen"), sh_confirm, ROSE),
         (t_of("Angst, verlassen"), sh_left, ROSE), (t_of("Der dritte"), sh_avoid, BLUE), (t_of("Sobald es"), sh_too_close, BLUE), (t_of("Gefühle zu zeigen"), sh_lock, BLUE),
         (t_of("deshalb wirken"), sh_cold, BLUE), (t_of("Der vierte"), sh_disorg, VIOLET), (t_of("Sie wünschen"), sh_pushpull, VIOLET), (t_of("Heute ganz"), sh_today, VIOLET),
         (t_of("Und genau"), sh_spannend, MOON), (t_of("Ängstliche und"), sh_attract, ROSE), (t_of("Der eine"), sh_chase, BLUE), (t_of("und beide"), sh_hurt, ROSE),
         (t_of("Die gute"), sh_good, MOON), (t_of("kein Schicksal"), sh_chain, SAGE), (t_of("Mit einem"), sh_partner, SAGE), (t_of("kann jeder"), sh_learn, SAGE),
         (t_of("Welcher"), sh_which, VIOLET)]

STARTS = [s[0] for s in SHOTS]
XF = 0.25                                                                     # cross-fade length

# ---------------------------------------------------------------- words one by one, coloured keywords
FONT = ImageFont.truetype(os.path.join(HERE, "fonts", "Inter-ExtraBold.otf"), 60)
KEY = {"liebt", "Kindheit", "vier", "Bindungsstile", "erkennt", "sichere", "Nähe", "allein", "Streit", "ängstliche", "Antwort", "Kopfkino",
       "Bestätigung", "verlassen", "vermeidende", "nah", "zurück", "gefährlich", "kühl", "desorganisierte", "Angst", "weg", "spannend",
       "Ängstliche", "vermeidende", "anziehen", "an", "flieht", "verletzen", "gute", "Schicksal", "sicheren", "lernen", "sicherer", "Bindungsstil"}
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
