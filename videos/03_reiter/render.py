"""Video 03 'Die vier apokalyptischen Reiter' (Gottman) in the paper cut-out style (design A).
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
rows = list(csv.DictReader(open(os.path.join(HERE, "voice", "alignment.csv"), encoding="utf-8")))
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
        c.new_sub_path(); c.arc(540, 1000, 230, -math.pi / 2, -math.pi / 2 + 2 * math.pi * u)
        c.set_source_rgba(*col, 0.35); c.set_line_width(46); c.stroke()
        c.new_sub_path(); c.arc(540, 1000, 230, -math.pi / 2, -math.pi / 2 + 2 * math.pi * u)
        c.set_source_rgb(*col); c.set_line_width(22); c.set_line_cap(cairo.LINE_CAP_ROUND); c.stroke()
    a = pop(t, t0 + 0.35, 0.35, "thud")
    scaled(c, 540, 1000, a, lambda: (P.paper(c, lambda c: P.ell(c, 540, 1000, 190, 190), P.CREAM, 1.2), label(c, str(n), 540, 1075, 220, P.INK)))
    b = pop(t, t0 + 0.7, 0.35, "pop")
    scaled(c, 540, 680, b, lambda: icon(c, 540, 680))
    w = slide(t, t0 + 0.9, 0.4, "swish")
    label(c, word, 540, 1380 + 60 * (1 - w), 92, col, w)


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


def sh_four(c, t):
    P.background(c); t0 = 0.0
    for k in range(4):
        a = pop(t, t0 + 0.35 + 0.35 * k, 0.35, "thud")
        x = 200 + k * 227; y = 760 + 18 * math.sin(t * 3 + k)
        scaled(c, x, y, a, lambda x=x, y=y, k=k: (P.paper(c, lambda c: P.rrect(c, x - 95, y - 120, 190, 240, 26), (0.30, 0.28, 0.44), 1.2),
                                                   label(c, str(k + 1), x, y + 50, 140, P.ROSE)))
    P.person(c, True, 380, 1180, 80, "sad", blink=blink(t), arms=("down", "down"), look=0.5)
    P.person(c, False, 700, 1170, 86, "sad", blink=blink(t, 2.9), arms=("cross", "cross"), look=-0.5)
def sh_research(c, t):
    living(c, t); t0 = t_of("an denen")
    P.person(c, True, 360, 860, 100, "neutral", blink=blink(t), arms=("down", "down"), look=-0.3)
    P.person(c, False, 720, 850, 106, "neutral", blink=blink(t, 2.9), arms=("cross", "cross"), look=0.3)
    gx = 200 + 680 * ease((t - t0 - 0.2) / 1.6); cue(t0 + 0.2, "whoosh")
    c.set_source_rgba(1, 1, 1, 0.12); c.arc(gx, 900, 150, 0, 2 * math.pi); c.fill()
    P.paper(c, lambda c: (c.new_sub_path(), c.arc(gx, 900, 150, 0, 2 * math.pi), c.new_sub_path(), c.arc_negative(gx, 900, 128, 2 * math.pi, 0)), P.CREAM, 1.5)
    P.paper(c, lambda c: P.capsule(c, (gx + 110, 1010), (gx + 220, 1130), 22), P.WOOD, 1.5)
    marks(c, t, t0 + 0.8, 540, 860, 100, ["?", "?"], 0.4)
def sh_breaks(c, t):
    P.background(c); t0 = t_of("ob eine")
    a = pop(t, t0, kind="thud"); g = ease((t - t0 - 0.9) / 0.5); cue(t0 + 0.9, "rip")
    for s in (-1, 1):
        c.save(); c.translate(s * 70 * g, 40 * g); c.rotate(s * 0.10 * g)
        c.rectangle(0 if s < 0 else 540, 0, 540, 1920); c.clip()
        scaled(c, 540, 1000, a, lambda: P.paper(c, lambda c: P.heart(c, 540, 1000, 250), P.ROSE, 1.3)); c.restore()
    if g > 0.1:
        c.set_source_rgb(*P.NIGHT0); c.set_line_width(10)
        c.move_to(540, 760); c.line_to(500, 860); c.line_to(570, 960); c.line_to(510, 1080); c.line_to(560, 1200); c.stroke()
def sh_gottman(c, t):
    P.background(c); t0 = t_of("Der Psychologe")
    a = pop(t, t0, 0.4, "pop")
    scaled(c, 540, 1000, a, lambda: P.paper(c, lambda c: P.rrect(c, 230, 700, 620, 600, 40), P.CREAM, 1.2))
    label(c, "John Gottman", 540, 900, 70, P.INK, min(1, a))
    w = ease((t - t0 - 0.6) / 0.8); cue(t0 + 0.6, "scribble")
    c.set_source_rgba(*P.ROSE, 1); c.set_line_width(10); c.set_line_cap(cairo.LINE_CAP_ROUND)
    if w > 0: c.move_to(300, 950); c.line_to(300 + 480 * w, 950); c.stroke()
    for k in range(4):
        b = pop(t, t0 + 1.2 + 0.25 * k, 0.25, "tick")
        scaled(c, 330 + k * 140, 1120, b, lambda k=k: P.paper(c, lambda c: P.rrect(c, 280 + k * 140, 1060, 100, 120, 14), (0.75, 0.72, 0.82), 1.25))
def sh_riders(c, t):
    P.background(c, (0.08, 0.08, 0.18), (0.16, 0.12, 0.24)); t0 = t_of("die vier")
    house_x = 540
    P.paper(c, lambda c: P.rrect(c, 380, 1180, 320, 330, 10), (0.36, 0.30, 0.46), 1.0)
    P.paper(c, lambda c: (c.move_to(350, 1200), c.line_to(540, 1040), c.line_to(730, 1200), c.close_path()), (0.50, 0.34, 0.44), 1.05)
    for k in range(4):
        u = slide(t, t0 + 0.25 * k, 0.6, "whoosh")
        x = (-200 if k % 2 == 0 else 1280) + ((300 + 160 * k) - (-200 if k % 2 == 0 else 1280)) * u
        y = 640 + 90 * (k // 2) + 10 * math.sin(t * 4 + k)
        cloud(c, x, y, 0.75, (0.26, 0.24, 0.38)); label(c, str(k + 1), x, y + 30, 64, P.ROSE)
        if u > 0.9 and int(t * 6 + k) % 5 == 0: P.mark(c, "bolt", x, y + 110, 1.0)
    for k in range(4): cue(t0 + 0.8 + 0.4 * k, "zap")
def sh_kritik(c, t): number_ring(c, t, t_of("Der erste"), 1, "Kritik", P.ROSE, ic_cloud_bolt)
def sh_dishes(c, t):
    kitchen(c, t); t0 = t_of("Nicht:")
    for k in range(6):
        a = pop(t, t0 + 0.12 * k, 0.25, "clink")
        scaled(c, 540, 1180 - k * 26, a, lambda k=k: P.paper(c, lambda c: P.ell(c, 540, 1180 - k * 26, 120, 22), P.CREAM, 1.3))
    P.person(c, True, 280, 790, 95, "neutral", talk(t), arms=("down", "forward"), look=0.4)
    P.person(c, False, 800, 780, 100, "neutral", blink=blink(t), arms=("down", "down"), look=-0.4)
    P.bubble(c, 400, 560, 470, 140, "Mich stört,\ndas Geschirr steht noch da.", 32, pop(t, t0 + 0.5))
def sh_never(c, t):
    kitchen(c, t); t0 = t_of("Sondern")
    P.person(c, True, 280 + shake(t, t0 + 0.9, 0.5, 12), 790, 95, "angry", talk(t), arms=("hip", "up"), breath=breath(t))
    P.person(c, False, 800, 780, 100, "shock" if t > t0 + 1.0 else "neutral", blink=blink(t), arms=("down", "down"), look=-0.4)
    P.bubble(c, 470, 560, 470, 150, "Du denkst\nnie an mich!", 46, pop(t, t0 + 0.8, kind="buzz"), spiky=True, col=P.ROSE)
    marks(c, t, t0 + 1.3, 800, 780, 100, ["!", "drop"], 0.3)
def sh_character(c, t):
    living(c, t); t0 = t_of("Ein Fehler")
    P.person(c, False, 540, 980, 110, "sad", blink=blink(t), arms=("down", "down"), tilt=-6)
    s_ = 0.5 + 1.6 * ease((t - t0 - 0.3) / 1.0); cue(t0 + 0.3, "zoom"); cue(t0 + 1.3, "thud")
    P.bubble(c, 540, 640, 260 * s_, 100 * s_, "Fehler", 44 * s_, 1.0, spiky=s_ > 1.4, col=P.ROSE)
def sh_verachtung(c, t): number_ring(c, t, t_of("Der zweite"), 2, "Verachtung", (0.75, 0.62, 1.0), ic_eye)
def sh_roll(c, t):
    living(c, t); t0 = t_of("Augenrollen")
    z = 1 + 0.25 * ease((t - t0) / 0.8); c.translate(760, 900); c.scale(z, z); c.translate(-760, -900); cue(t0, "zoom")
    sp = t_of("Spott"); sm = t_of("ein abfälliges")
    mood = "roll" if t < sp else ("smirk" if t >= sm else "smile")
    P.person(c, True, 300, 880, 100, "sad", blink=blink(t), arms=("down", "down"), look=0.6)
    P.person(c, False, 760, 860, 108, mood, talk(t) if sp <= t < sm else 0, arms=("cross", "cross"), look=-0.5, tilt=-8 if mood == "roll" else 4)
    cue(t0 + 0.1, "boing")
    P.bubble(c, 820, 560, 220, 100, "Haha", 48, pop(t, sp + 0.1), tail=1)
    if t >= sm: marks(c, t, sm + 0.2, 300, 880, 100, ["tear"], 0.3)
def sh_chart(c, t):
    P.background(c); t0 = t_of("Laut Gottman")
    labs = [("Kritik", 0.55, P.ROSE), ("Verachtung", 1.0, (0.75, 0.62, 1.0)), ("Rechtf.", 0.6, (0.62, 0.78, 1.0)), ("Mauern", 0.7, (0.62, 0.42, 0.40))]
    for k, (lab, h, col) in enumerate(labs):
        u = ease((t - t0 - 0.2 - 0.25 * k) / 0.6); cue(t0 + 0.2 + 0.25 * k, "tick")
        x = 170 + k * 230; top = 1350 - 650 * h * u
        P.paper(c, lambda c, x=x, top=top: P.rrect(c, x, top, 160, max(1, 1350 - top), 18), col, 1.2)
        label(c, lab, x + 80, 1420, 36, P.CREAM)
    a = pop(t, t0 + 1.4, 0.35, "ding"); P.mark(c, "star", 170 + 230 + 80, 1350 - 650 - 80, 2.0, a)
def sh_rechtf(c, t): number_ring(c, t, t_of("Der dritte"), 3, "Rechtfertigung", (0.62, 0.78, 1.0), ic_shield)
def sh_aber(c, t):
    kitchen(c, t); t0 = t_of("Auf jeden")
    P.person(c, True, 260, 790, 92, "angry", talk(t), arms=("hip", "forward"))
    P.person(c, False, 820, 780, 98, "angry", talk(t + 0.3), arms=("cross", "cross"))
    seq = [("Du …!", 0, P.ROSE), ("Aber …!", 1, (0.62, 0.78, 1.0)), ("Du …!", 0, P.ROSE), ("Aber …!", 1, (0.62, 0.78, 1.0))]
    for k, (txt, side, col) in enumerate(seq):
        P.bubble(c, 380 + 320 * side, 600 + 70 * k - 140, 230, 100, txt, 42, pop(t, t0 + 0.2 + 0.55 * k, kind="buzz"), tail=1 if side else -1, spiky=True, col=col)
def sh_shields(c, t):
    kitchen(c, t); t0 = t_of("Niemand")
    P.person(c, True, 260, 790, 92, "shout", talk(t), arms=("up", "up"))
    P.person(c, False, 820, 780, 98, "shout", talk(t + 0.2), arms=("up", "up"))
    for k, x in enumerate((420, 660)):
        a = pop(t, t0 + 0.4 + 0.3 * k, 0.3, "clang"); scaled(c, x, 980, a, lambda x=x: ic_shield(c, x, 960))
def sh_mauern(c, t): number_ring(c, t, t_of("Der vierte"), 4, "Mauern", (0.62, 0.42, 0.40), ic_wall)
def sh_wall(c, t):
    living(c, t, 0.5); t0 = t_of("Einer schweigt")
    P.person(c, True, 260, 860, 95, "sad", blink=blink(t), arms=("down", "reach"), look=0.6)
    P.person(c, False, 820, 850, 100, "neutral", blink=blink(t), arms=("cross", "cross"), look=0.8, tilt=8)
    for k in range(12):
        r_, col = divmod(k, 2); tb = t0 + 0.2 + 0.18 * k
        u = ease((t - tb) / 0.25); cue(tb + 0.25, "brick")
        y = 1400 - r_ * 90 - 400 * (1 - u)
        if u > 0: P.paper(c, lambda c, col=col, y=y: P.rrect(c, 450 + col * 92 - (r_ % 2) * 46 + 23, y, 86, 82, 8), (0.62, 0.42, 0.40), 1.3)
def sh_good(c, t):
    P.background(c, (0.18, 0.16, 0.32), (0.32, 0.22, 0.34)); t0 = t_of("Das Gute")
    u = ease((t - t0) / 1.4); cue(t0, "rise")
    g = cairo.RadialGradient(540, 1400 - 500 * u, 0, 540, 1400 - 500 * u, 600); g.add_color_stop_rgba(0, 1, 0.8, 0.5, 0.6); g.add_color_stop_rgba(1, 1, 0.8, 0.5, 0)
    c.set_source(g); c.paint()
    P.paper(c, lambda c: P.ell(c, 540, 1400 - 500 * u, 150, 150), P.MOON, 0.9)
    a = pop(t, t0 + 1.0, 0.35, "sparkle")
    scaled(c, 540, 820, a, lambda: (P.paper(c, lambda c: P.rrect(c, 410, 740, 260, 180, 26), P.CREAM, 1.3),
                                     P.paper(c, lambda c: P.rrect(c, 520, 770, 40, 120, 8), P.ROSE, 1.35), P.paper(c, lambda c: P.rrect(c, 480, 810, 120, 40, 8), P.ROSE, 1.35)))
def swap_card(c, t, t0, bad, good, col):
    P.background(c)
    a = pop(t, t0, 0.3, "pop"); x = ease((t - t0 - 0.6) / 0.25); cue(t0 + 0.6, "rip")
    scaled(c, 540, 800, a, lambda: P.paper(c, lambda c: P.rrect(c, 260, 720, 560, 150, 40), (0.36, 0.32, 0.48), 1.2))
    label(c, bad, 540, 820, 58, P.CREAM, min(1, a))
    if x > 0:
        c.set_source_rgb(*P.ROSE); c.set_line_width(12); c.move_to(280, 795); c.line_to(280 + 520 * x, 795); c.stroke()
    b = pop(t, t0 + 0.9, 0.35, "ding")
    scaled(c, 540, 1060, b, lambda: P.paper(c, lambda c: P.rrect(c, 220, 980, 640, 170, 50), col, 1.3))
    label(c, good, 540, 1090, 66, P.INK, min(1, b))
def sh_wish(c, t):
    t0 = t_of("Wünsche"); swap_card(c, t, t0, "Vorwürfe", "Wünsche", P.ROSE)
    P.person(c, True, 540, 1380, 70, "smile", talk(t), arms=("down", "forward"), depth=1.4)
def sh_value(c, t):
    living(c, t); t0 = t_of("Wertschätzung")
    P.person(c, True, 330, 860, 100, "smile", blink=blink(t), arms=("down", "down"), look=0.5, tilt=6)
    P.person(c, False, 740, 850, 106, "smile", blink=blink(t, 2.8), arms=("reach", "down"), look=-0.5)
    a = pop(t, t0 + 0.3, 0.35, "sparkle"); P.paper(c, lambda c: P.heart(c, 540, 820 - 20 * math.sin(t * 3), 50 * max(a, 1e-3)), P.ROSE, 1.4)
    marks(c, t, t0 + 0.8, 330, 860, 100, ["heart", "heart"], 0.3)
def sh_sorry(c, t):
    kitchen(c, t); t0 = t_of("Verantwortung")
    P.person(c, False, 760, 780, 104, "sad", talk(t), arms=("forward", "down"), look=-0.5)
    P.person(c, True, 290, 800, 96, "smile", blink=blink(t), arms=("down", "down"), look=0.5)
    P.bubble(c, 660, 560, 420, 140, "Du hast recht.\nTut mir leid.", 38, pop(t, t0 + 0.3), tail=1)
    a = pop(t, t0 + 1.2, 0.3, "ding")
    P.paper(c, lambda c: P.ell(c, 290, 560, 60 * max(a, 1e-3), 60 * max(a, 1e-3)), (0.62, 0.78, 0.64), 1.4)
    if a > 0.5:
        c.set_source_rgb(1, 1, 1); c.set_line_width(12); c.set_line_cap(cairo.LINE_CAP_ROUND); c.move_to(262, 560); c.line_to(284, 582); c.line_to(322, 540); c.stroke()
def sh_pause(c, t):
    living(c, t, 0.9); sofa(c); t0 = t_of("Und eine Pause")
    P.person(c, True, 330, 880, 95, "calm", sit=True, arms=("down", "down"), breath=breath(t))
    P.person(c, False, 740, 870, 100, "calm", sit=True, arms=("down", "down"), breath=breath(t + 1))
    a = pop(t, t0 + 0.3, 0.35, "pop")
    scaled(c, 540, 560, a, lambda: (P.paper(c, lambda c: P.ell(c, 540, 560, 110, 110), P.CREAM, 1.4),
                                     P.paper(c, lambda c: P.rrect(c, 495, 505, 30, 110, 10), P.INK, 1.45), P.paper(c, lambda c: P.rrect(c, 555, 505, 30, 110, 10), P.INK, 1.45)))
    marks(c, t, t0 + 1.0, 540, 880, 100, ["heart"], 0.3)
def sh_end(c, t):
    P.background(c, (0.10, 0.10, 0.22), (0.20, 0.16, 0.30)); t0 = t_of("Denn nicht")
    P.paper(c, lambda c: P.ell(c, 820, 560, 70, 70), P.MOON, 0.6)
    for i in range(6): P.paper(c, lambda c, i=i: P.star(c, 150 + i * 150, 420 + (i % 2) * 90, 14 + 4 * math.sin(t * 3 + i)), P.MOON, 0.6)
    P.person(c, True, 450, 1000, 105, "calm", arms=("down", "reach"), tilt=10, breath=breath(t))
    P.person(c, False, 650, 990, 110, "smile", arms=("reach", "down"), tilt=-8, breath=breath(t + 1))
    s_ = 1 + 0.08 * math.sin(t * 5); a = pop(t, t0 + 0.6, 0.4, "sparkle")
    P.paper(c, lambda c: P.heart(c, 550, 760, 60 * s_ * max(a, 1e-3)), P.ROSE, 1.4)
    marks(c, t, t0 + 1.4, 550, 1000, 110, ["heart", "star", "heart"], 0.35)

SHOTS = [(0.0, sh_four), (t_of("an denen"), sh_research), (t_of("ob eine"), sh_breaks), (t_of("Der Psychologe"), sh_gottman), (t_of("die vier"), sh_riders),
         (t_of("Der erste"), sh_kritik), (t_of("Nicht:"), sh_dishes), (t_of("Sondern"), sh_never), (t_of("Ein Fehler"), sh_character),
         (t_of("Der zweite"), sh_verachtung), (t_of("Augenrollen"), sh_roll), (t_of("Laut Gottman"), sh_chart),
         (t_of("Der dritte"), sh_rechtf), (t_of("Auf jeden"), sh_aber), (t_of("Niemand"), sh_shields),
         (t_of("Der vierte"), sh_mauern), (t_of("Einer schweigt"), sh_wall), (t_of("Das Gute"), sh_good), (t_of("Wünsche"), sh_wish),
         (t_of("Wertschätzung"), sh_value), (t_of("Verantwortung"), sh_sorry), (t_of("Und eine Pause"), sh_pause), (t_of("Denn nicht"), sh_end)]
STARTS = [s for s, _ in SHOTS]
XF = 0.25                                                                     # cross-fade length

# ---------------------------------------------------------------- words one by one, coloured keywords
FONT = ImageFont.truetype(os.path.join(HERE, "fonts", "Inter-ExtraBold.otf"), 62)
KEY = {"vier", "zerbricht", "Gottman", "Reiter", "Kritik", "nie", "Charakterfehler", "Verachtung", "Augenrollen", "Spott", "Trennung",
       "Rechtfertigung", "Aber", "verteidigt", "Mauern", "schweigt", "Gegenmittel", "Wünsche", "Wertschätzung", "Verantwortung", "Pause", "streitet"}
def words():
    out = []
    for m in re.finditer(r"\S+", CH):
        if m.group(0).startswith("{{"): continue
        out.append((m.group(0), ST[m.start()], EN[m.end() - 1]))
    return out
WORDS = words()
def groups(ws, mx=3, mc=20):
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
    d = ImageDraw.Draw(im)
    for i, g in enumerate(GROUPS):
        end = GROUPS[i + 1][0][1] if i + 1 < len(GROUPS) else g[-1][2] + 0.8
        if g[0][1] - 0.05 <= t < end:
            toks = [w[0] for w in g]; tot = FONT.getlength(" ".join(toks)); x = (W - tot) / 2
            if tot > 940:                                        # very long word: shrink
                f = ImageFont.truetype(FONT.path, int(62 * 940 / tot)); tot = f.getlength(" ".join(toks)); x = (W - tot) / 2
            else: f = FONT
            for tok, s0, e0 in g:
                a = max(0.0, min(1.0, (t - s0 + 0.05) / 0.12))
                if a <= 0: x += f.getlength(tok + " "); continue
                core = re.sub(r"[.,:;!?]", "", tok)
                col = (255, 172, 196) if core in KEY else (250, 244, 236)
                y = 250 + 18 * (1 - a)
                d.text((x + 3, y + 5), tok, font=f, fill=(15, 10, 30))
                d.text((x, y), tok, font=f, fill=tuple(int(v * a + 30 * (1 - a)) for v in col))
                x += f.getlength(tok + " ")
            return


def collect_cues(step=1 / 15):
    """draw every shot cheaply at 15 fps to collect the animation cues (each pop/whoosh registers its own time)"""
    P.CUES.clear()
    s = cairo.ImageSurface(cairo.FORMAT_RGB24, 54, 96); c = cairo.Context(s); c.scale(0.05, 0.05)
    for k, (t0, fn) in enumerate(SHOTS):
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
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", OUT + ".video.mp4", "-i", os.path.join(HERE, "voice", "result.mp3"), "-i", OUT + ".music.wav", "-filter_complex",
                    "[2:a]volume=0.20[m];[1:a]asplit=2[v][sc];[m][sc]sidechaincompress=threshold=0.03:ratio=4:attack=20:release=400[md];"
                    "[v][md]amix=inputs=2:duration=longest:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=44100[a]",
                    "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-t", f"{DUR:.2f}", OUT], check=True)
    for p in paths + [lst, OUT + ".video.mp4", OUT + ".music.wav"]: os.remove(p)
    print("DONE", OUT)
