"""Video 06 'Der Vogel-Test' (Gottman: bids for connection) in the lit paper style.
The first frame is already a full scene (couple, window, glowing bird) and the first sentence stands big at the top;
a new picture every ~2-4 s, pop-ins with their own sounds, CAPS captions at the bottom, glow pass on every frame.

python render.py <out.mp4> [--preview t1,t2,...]
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

pop, slide, enter, marks, shake, cue, rays = P.pop, P.slide, P.enter, P.marks_around, P.shake, P.cue, P.rays


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


# ---------------------------------------------------------------- sets and props
BIRD, BIRD_D = (1.0, 0.78, 0.30), (0.95, 0.60, 0.20)
SKY, GREEN, RED_ = (0.62, 0.78, 1.0), (0.45, 0.85, 0.60), (1.0, 0.45, 0.55)


def room(c, t, win=(560, 520, 420, 520), lamp=1.0):
    """living room at night: a big window with a branch outside, a floor lamp on the left"""
    P.background(c, (0.09, 0.10, 0.22), (0.17, 0.14, 0.27))
    x, y, w, h = win
    P.paper(c, lambda c: P.rrect(c, x - 18, y - 18, w + 36, h + 36, 30), (0.30, 0.26, 0.42), 0.6)
    P.paper(c, lambda c: P.rrect(c, x, y, w, h, 22), (0.14, 0.17, 0.36), 0.6)
    P.paper(c, lambda c: P.ell(c, x + w * 0.75, y + h * 0.22, 34, 34), P.MOON, 0.62)
    for i in range(5): P.paper(c, lambda c, i=i: P.star(c, x + 40 + (i * 97) % (w - 60), y + 40 + (i * 61) % (h // 2), 7), P.MOON, 0.62, 0.7)
    c.set_source_rgb(0.30, 0.22, 0.26); c.set_line_width(16); c.set_line_cap(cairo.LINE_CAP_ROUND)
    c.move_to(x, y + h * 0.62); c.curve_to(x + w * 0.3, y + h * 0.58, x + w * 0.6, y + h * 0.66, x + w, y + h * 0.55); c.stroke()
    c.set_source_rgb(0.30, 0.26, 0.42); c.set_line_width(12); c.move_to(x + w / 2, y); c.line_to(x + w / 2, y + h); c.stroke()
    g = cairo.RadialGradient(150, 820, 0, 150, 820, 420); g.add_color_stop_rgba(0, 1, 0.8, 0.5, 0.30 * lamp); g.add_color_stop_rgba(1, 1, 0.8, 0.5, 0)
    c.set_source(g); c.paint()
    P.paper(c, lambda c: (c.move_to(90, 760), c.line_to(210, 760), c.line_to(180, 680), c.line_to(120, 680), c.close_path()), P.MOON, 0.8)
    P.paper(c, lambda c: P.rrect(c, 146, 760, 8, 640, 4), P.INK, 0.8)
    P.paper(c, lambda c: (c.move_to(-20, 1560), c.line_to(1100, 1540), c.line_to(1100, 1940), c.line_to(-20, 1940), c.close_path()), P.PLUM, 0.9)


def sofa(c, x=540, w=760):
    P.paper(c, lambda c: P.rrect(c, x - w / 2 + 30, 1170, w - 60, 300, 60), (0.50, 0.38, 0.58), 1.1)
    P.paper(c, lambda c: P.rrect(c, x - w / 2, 1320, w, 230, 55), (0.58, 0.44, 0.64), 1.25)


def bird(c, t, x, y, s=1.0, flap=True, a=1.0):
    """small round paper bird (glows in the dark): body, head, beak, flapping wing, eye"""
    if a <= 0: return
    s *= max(a, 1e-3); w = math.sin(t * 22) if flap else 0.3
    P.paper(c, lambda c: (c.move_to(x - 60 * s, y), c.line_to(x - 110 * s, y - 25 * s), c.line_to(x - 105 * s, y + 20 * s), c.close_path()), BIRD_D, 1.3)
    P.paper(c, lambda c: P.ell(c, x, y, 70 * s, 55 * s), BIRD, 1.35)
    P.paper(c, lambda c: P.ell(c, x + 55 * s, y - 40 * s, 38 * s, 38 * s), BIRD, 1.4)
    P.paper(c, lambda c: (c.move_to(x + 88 * s, y - 45 * s), c.line_to(x + 120 * s, y - 35 * s), c.line_to(x + 88 * s, y - 28 * s), c.close_path()), (1.0, 0.55, 0.35), 1.4)
    P.paper(c, lambda c: P.ell(c, x + 65 * s, y - 48 * s, 7 * s, 7 * s), P.INK, 1.45)
    P.paper(c, lambda c: (c.move_to(x - 30 * s, y - 5 * s), c.curve_to(x - 10 * s, y - 70 * s * w, x + 30 * s, y - 60 * s * w, x + 25 * s, y), c.close_path()), BIRD_D, 1.45)


def newspaper(c, x, y, r, flip=0.0):
    """open newspaper held in front of the chest"""
    P.paper(c, lambda c: P.rrect(c, x - r * 1.25, y, r * 2.5, r * 1.6, 8), P.CREAM, 1.5)
    c.set_source_rgba(0.45, 0.42, 0.50, 0.8); c.set_line_width(5)
    for k in range(5):
        for side in (-1, 1):
            xx = x + side * r * 0.65; c.move_to(xx - r * 0.45, y + r * (0.3 + 0.24 * k)); c.line_to(xx + r * 0.45, y + r * (0.3 + 0.24 * k)); c.stroke()
    c.set_source_rgba(0.45, 0.42, 0.50, 0.9); c.move_to(x, y + 8); c.line_to(x, y + r * 1.6 - 8); c.stroke()
    if 0 < flip < 1:
        c.save(); c.translate(x, y); c.scale(math.cos(flip * math.pi), 1)
        P.paper(c, lambda c: P.rrect(c, 0, 0, r * 1.25, r * 1.6, 8), (0.90, 0.86, 0.80), 1.55); c.restore()


def heart_ring(c, t, t0, pct, col, x=540, y=900, R=250):
    """percent ring: fills to pct, the number counts up in the middle"""
    u = ease((t - t0) / 1.0); cue(t0, "swirl")
    c.new_sub_path(); c.arc(x, y, R, 0, 2 * math.pi); c.set_source_rgba(0.35, 0.33, 0.48, 0.6); c.set_line_width(40); c.stroke()
    if u > 0.01:
        c.new_sub_path(); c.arc(x, y, R, -math.pi / 2, -math.pi / 2 + 2 * math.pi * pct / 100 * u)
        c.set_source_rgb(*col); c.set_line_width(40); c.set_line_cap(cairo.LINE_CAP_ROUND); c.stroke()
    label(c, f"{int(round(pct * u))}%", x, y + 45, 125, col)
    if u >= 1: cue(t0 + 1.0, "ding")


def checkmark(c, x, y, s, a, col=GREEN):
    if a <= 0: return
    P.paper(c, lambda c: P.ell(c, x, y, 70 * s * a, 70 * s * a), col, 1.4)
    if a > 0.5:
        c.set_source_rgb(1, 1, 1); c.set_line_width(14 * s); c.set_line_cap(cairo.LINE_CAP_ROUND)
        c.move_to(x - 35 * s, y); c.line_to(x - 8 * s, y + 28 * s); c.line_to(x + 40 * s, y - 25 * s); c.stroke()


def cross(c, x, y, s, a, col=RED_):
    if a <= 0: return
    P.paper(c, lambda c: P.ell(c, x, y, 70 * s * a, 70 * s * a), col, 1.4)
    if a > 0.5:
        c.set_source_rgb(1, 1, 1); c.set_line_width(14 * s); c.set_line_cap(cairo.LINE_CAP_ROUND)
        c.move_to(x - 25 * s, y - 25 * s); c.line_to(x + 25 * s, y + 25 * s); c.move_to(x + 25 * s, y - 25 * s); c.line_to(x - 25 * s, y + 25 * s); c.stroke()


# ---------------------------------------------------------------- shots
def sh_hook(c, t):
    """frame 0 is already the whole scene; the bird lands on the branch at 0.15 s"""
    room(c, t, (520, 560, 460, 480)); sofa(c, 560, 640)
    u = slide(t, 0.0, 0.5, "whoosh")
    bird(c, t, 640 + 260 * (1 - u), 820 - 120 * (1 - u) - 6 * math.sin(t * 4), 0.9, flap=u < 1)
    P.person(c, True, 330, 820, 108, "smile", talk(t) if t > 0.6 else 0, blink=blink(t), arms=("down", "reach"), look=0.6, tilt=-6, breath=breath(t))
    P.person(c, False, 700, 1090, 104, "neutral", blink=blink(t, 2.7), sit=True, arms=("forward", "forward"), look=0.0, depth=1.4)
    newspaper(c, 700, 1180, 104)
    marks(c, t, 0.5, 640, 800, 60, ["!", "heart"], 0.35)


def sh_window(c, t):
    room(c, t, (420, 470, 560, 600)); t0 = t_of("Eine Frau steht")
    bird(c, t, 700, 840 - 8 * math.sin(t * 4), 1.3, flap=(t * 2) % 2 < 0.4)
    P.person(c, True, 300, 860, 120, "smile", talk(t), blink=blink(t), arms=("down", "reach"), look=0.7, breath=breath(t))
    P.bubble(c, 330, 560, 420, 120, "Schau mal!", 50, pop(t, t_of("Schau mal")), tail=-1, col=P.MOON)
    marks(c, t, t_of("schöner") , 700, 840, 80, ["heart", "star", "heart"], 0.2)


def sh_reader(c, t):
    room(c, t, (600, 420, 380, 420), 0.8); sofa(c); t0 = t_of("Ihr Mann sitzt")
    P.person(c, False, 540, 1020, 120, "neutral", blink=blink(t, 2.5), sit=True, arms=("forward", "forward"), look=0.0, depth=1.4)
    newspaper(c, 540, 1130, 120, (t - t0 - 0.9) / 0.4)
    if t > t0 + 0.9: cue(t0 + 0.9, "rip")
    marks(c, t, t0 + 0.4, 540, 1000, 120, ["zzz"], 0.3)


def sh_two(c, t):
    P.background(c); t0 = t_of("Jetzt hat er")
    for i in range(12): P.paper(c, lambda c, i=i: P.star(c, 80 + (i * 173) % 920, 300 + (i * 271) % 1100, 9), P.MOON, 0.6, 0.6)
    P.person(c, False, 540, 1000, 105, "neutral", blink=blink(t), arms=("down", "down"), look=0.0)
    for k, (sx, col) in enumerate(((-1, GREEN), (1, RED_))):
        u = slide(t, t0 + 0.3 + 0.35 * k, 0.45, "swish")
        def arrow(c, sx=sx, u=u):
            x0 = 540 + sx * 150; x1 = 540 + sx * (150 + 220 * max(u, 0.02))
            c.move_to(x0, 660); c.line_to(x1, 600); c.line_to(x1, 560); c.line_to(x1 + sx * 80, 640); c.line_to(x1, 720); c.line_to(x1, 680); c.line_to(x0, 740); c.close_path()
        P.paper(c, arrow, col, 1.3)
    a = pop(t, t0 + 1.0, kind="thud"); scaled(c, 540, 600, a, lambda: (P.paper(c, lambda c: P.ell(c, 540, 600, 90, 90), P.CREAM, 1.4), label(c, "2", 540, 645, 120, P.INK)))


def sh_turn(c, t):
    room(c, t, (560, 440, 420, 440)); t0 = t_of("Er schaut auf")
    bird(c, t, 780, 740, 0.8)
    P.person(c, True, 300, 860, 110, "smile", blink=blink(t), arms=("down", "reach"), look=0.7)
    up = ease((t - t0) / 0.4)
    P.person(c, False, 760, 900 - 40 * up, 112, "smile" if up > 0.5 else "neutral", talk(t) if t > t_of("Wo denn") else 0, arms=("down", "reach"), look=-0.6 * up)
    if up > 0.5: cue(t0 + 0.2, "boing")
    P.bubble(c, 760, 560, 330, 120, "Wo denn?", 50, pop(t, t_of("Wo denn")), tail=1, col=GREEN)
    marks(c, t, t_of("lächelt"), 530, 760, 90, ["heart", "heart", "star"], 0.25)
    checkmark(c, 540, 1300, 1.2, pop(t, t_of("Wo denn") + 0.5, kind="ding"))


def sh_hm(c, t):
    room(c, t, (560, 440, 420, 440), 0.5); sofa(c, 700, 600); t0 = t_of("Oder er brummt")
    u = slide(t, t0 + 0.6, 0.8, "whoosh"); bird(c, t, 780 + 500 * u, 740 - 300 * u, 0.8)
    P.person(c, True, 280, 860, 110, "sad" if t > t0 + 0.9 else "smile", blink=blink(t), arms=("down", "down"), look=0.7)
    P.person(c, False, 720, 1060, 104, "neutral", sit=True, arms=("forward", "forward"), depth=1.4)
    newspaper(c, 720, 1150, 104)
    P.bubble(c, 760, 860, 200, 100, "Hm.", 50, pop(t, t_of("brummt")), tail=1, col=(0.70, 0.70, 0.80))
    marks(c, t, t0 + 1.0, 280, 860, 110, ["drop"], 0.3)
    cross(c, 540, 1350, 1.2, pop(t, t_of("liest weiter"), kind="buzzer"))


def sh_offer(c, t):
    P.background(c); t0 = t_of("Der Paarforscher")
    rays(c, t, t0 + 0.2, 640, 820, P.ROSE)
    P.person(c, True, 330, 860, 115, "smile", blink=blink(t), arms=("down", "reach"), look=0.8, breath=breath(t))
    a = pop(t, t0 + 0.4, kind="sparkle")
    P.paper(c, lambda c: P.heart(c, 640, 900 - 12 * math.sin(t * 4), 70 * max(a, 1e-3)), P.ROSE, 1.5)
    b = pop(t, t_of("ein Angebot"), kind="pop")
    scaled(c, 540, 520, b, lambda: (P.paper(c, lambda c: P.rrect(c, 290, 450, 500, 130, 30), P.ROSE, 1.3), label(c, "ANGEBOT", 540, 540, 70, P.INK)))


def sh_kinds(c, t):
    P.background(c); t0 = t_of("Ein Blick")
    items = [("Ein Blick", lambda x, y: ic_eye(c, x, y)), ("ein Seufzer", lambda x, y: cloud(c, x, y, 0.75, (0.70, 0.72, 0.90))),
             ("eine Frage", lambda x, y: P.mark(c, "?", x, y, 2.4)), ("ein Foto", lambda x, y: phone_photo(c, x, y))]
    for k, (ph, fn) in enumerate(items):
        a = pop(t, t_of(ph), kind="pop"); x, y = (300, 760) if k % 2 == 0 else (780, 760)
        if k >= 2: y = 1180
        scaled(c, x, y, a, lambda fn=fn, x=x, y=y: fn(x, y))


def ic_eye(c, x, y):
    P.paper(c, lambda c: P.ell(c, x, y, 130, 72), P.CREAM, 1.2); P.paper(c, lambda c: P.ell(c, x, y, 52, 52), SKY, 1.25)
    P.paper(c, lambda c: P.ell(c, x, y, 24, 24), P.INK, 1.3)


def phone_photo(c, x, y):
    P.paper(c, lambda c: P.rrect(c, x - 85, y - 140, 170, 280, 26), (0.14, 0.14, 0.22), 1.2)
    P.paper(c, lambda c: P.rrect(c, x - 70, y - 115, 140, 210, 14), (0.25, 0.30, 0.55), 1.25)
    bird(c, 0, x, y - 10, 0.55, flap=False)


def sh_lab(c, t):
    P.background(c, (0.10, 0.12, 0.22), (0.16, 0.16, 0.28)); t0 = t_of("In seinem Labor")
    P.paper(c, lambda c: P.rrect(c, 100, 560, 880, 640, 30), (0.22, 0.24, 0.38), 0.8)
    P.paper(c, lambda c: P.rrect(c, 160, 1000, 760, 170, 50), (0.55, 0.42, 0.62), 1.0)
    P.person(c, True, 420, 870, 85, "smile", blink=blink(t), sit=True, arms=("down", "reach"), look=0.6)
    P.person(c, False, 660, 865, 90, "smile", blink=blink(t, 2.9), sit=True, arms=("reach", "down"), look=-0.6)
    a = pop(t, t0 + 0.3, kind="click")
    scaled(c, 870, 470, a, lambda: (P.paper(c, lambda c: P.rrect(c, 790, 420, 160, 100, 18), (0.20, 0.20, 0.28), 1.3),
                                    P.paper(c, lambda c: P.ell(c, 870, 470, 34, 34), SKY, 1.35),
                                    P.paper(c, lambda c: P.ell(c, 935, 432, 10, 10), RED_, 1.35)))
    b = pop(t, t_of("und sah sechs"), kind="thud")
    scaled(c, 230, 470, b, lambda: (P.paper(c, lambda c: P.rrect(c, 120, 380, 220, 200, 20), P.CREAM, 1.3),
                                    P.paper(c, lambda c: P.rrect(c, 120, 380, 220, 50, 20), RED_, 1.32),
                                    label(c, str(min(6, 1 + int(max(0, t - t_of("und sah sechs")) / 0.18))), 230, 540, 90, P.INK),
                                    label(c, "JAHRE", 230, 620, 40, P.CREAM)))
    if t > t_of("und sah sechs"):
        for k in range(6): cue(t_of("und sah sechs") + 0.18 * k, "tick")


def sh_87(c, t):
    P.background(c); t0 = t_of("Die Paare, die noch")
    heart_ring(c, t, t0 + 0.2, 87, GREEN, 540, 760, 230)
    P.person(c, True, 450, 1160, 70, "smile", blink=blink(t), arms=("down", "reach"), tilt=8, depth=1.3)
    P.person(c, False, 630, 1155, 74, "smile", arms=("reach", "down"), tilt=-6, depth=1.3)
    marks(c, t, t0 + 1.2, 540, 1140, 90, ["heart", "heart", "star"], 0.25)


def sh_33(c, t):
    P.background(c); t0 = t_of("Bei den geschiedenen")
    heart_ring(c, t, t0 + 0.1, 33, RED_, 540, 760, 230)
    u = slide(t, t0 + 0.6, 0.6, "rip")
    P.person(c, True, 450 - 120 * u, 1160, 70, "sad", blink=blink(t), arms=("down", "down"), look=-0.5, depth=1.3)
    P.person(c, False, 630 + 120 * u, 1155, 74, "neutral", arms=("down", "down"), look=0.5, depth=1.3)
    a = pop(t, t0 + 1.0, kind="clang")
    scaled(c, 540, 1170, a, lambda: (P.paper(c, lambda c: (c.move_to(540, 1230), c.curve_to(450, 1170, 470, 1100, 532, 1130), c.line_to(515, 1170), c.line_to(540, 1200), c.close_path()), P.ROSE, 1.4),
                                     P.paper(c, lambda c: (c.move_to(548, 1230), c.curve_to(630, 1170, 610, 1100, 552, 1130), c.line_to(535, 1170), c.line_to(560, 1200), c.close_path()), P.ROSE, 1.4)))


def sh_big(c, t):
    P.background(c); t0 = t_of("Es geht also nicht")
    a = pop(t, t0 + 0.1, kind="thud")
    scaled(c, 540, 860, a, lambda: P.paper(c, lambda c: P.heart(c, 540, 860, 260), P.ROSE, 1.3))
    for k in range(8):
        b = pop(t, t0 + 0.3 + 0.08 * k, kind="sparkle")
        ang = k * math.pi / 4 + t * 0.4
        P.paper(c, lambda c, ang=ang, b=b: P.star(c, 540 + 360 * math.cos(ang), 860 + 360 * math.sin(ang), 24 * max(b, 1e-3)), P.MOON, 1.3)
    if t > t0 + 1.2:
        cue(t0 + 1.2, "scribble"); u = ease((t - t0 - 1.2) / 0.3)
        c.set_source_rgb(*P.CREAM); c.set_line_width(22); c.set_line_cap(cairo.LINE_CAP_ROUND)
        c.move_to(260, 560); c.line_to(260 + 560 * u, 560 + 600 * u); c.stroke()


def sh_bird(c, t):
    P.background(c, (0.08, 0.09, 0.20), (0.15, 0.13, 0.25)); t0 = t_of("Es geht um den")
    rays(c, t, t0, 540, 860, BIRD)
    a = pop(t, t0 + 0.1, kind="boing"); bird(c, t, 520, 880 - 15 * math.sin(t * 5), 2.4, a=a)
    marks(c, t, t0 + 0.5, 540, 860, 230, ["heart", "star", "heart"], 0.15)


def sh_void(c, t):
    room(c, t, (600, 440, 380, 420), 0.4); t0 = t_of("Eine Frau, die immer")
    P.person(c, True, 330, 880, 112, "neutral", talk(t) if t < t0 + 1.6 else 0, blink=blink(t), arms=("down", "reach"), look=0.7)
    for k in range(3):
        t1 = t0 + 0.2 + 0.45 * k; a = pop(t, t1, kind="pop"); fade = max(0.0, 1 - max(0.0, t - t1 - 0.5) / 0.5)
        if a > 0 and fade > 0.5: P.bubble(c, 620 + 60 * k, 620 + 150 * k, 240, 90, "...", 50, a, tail=-1)
    P.paper(c, lambda c: P.rrect(c, 650, 1000, 260, 420, 60), (0.22, 0.22, 0.34), 1.2, 0.7)     # empty dark shape where he should be
    marks(c, t, t_of("hört irgendwann"), 330, 880, 112, ["drop", "?"], 0.3)


def sh_hurt(c, t):
    P.background(c); t0 = t_of("Nicht, weil die")
    P.person(c, True, 540, 940, 125, "sad" if t > t_of("Sondern") else "calm", blink=blink(t), arms=("cross", "cross"), breath=breath(t))
    a = pop(t, t0 + 0.2, kind="sparkle")
    P.paper(c, lambda c: P.heart(c, 540, 600 - 10 * math.sin(t * 3), 70 * max(a, 1e-3)), P.ROSE, 1.4)
    if t > t_of("Sondern") + 0.3:
        cue(t_of("Sondern") + 0.3, "zap"); c.set_source_rgb(*P.INK); c.set_line_width(10)
        c.move_to(545, 540); c.line_to(525, 590); c.line_to(560, 615); c.line_to(535, 660); c.stroke()
    marks(c, t, t_of("übersehen"), 540, 940, 125, ["tear", "tear"], 0.3)


def sh_seconds(c, t):
    P.background(c); t0 = t_of("Das Gute daran")
    rays(c, t, t0, 540, 860, GREEN)
    a = pop(t, t0 + 0.2, kind="thud")
    scaled(c, 540, 860, a, lambda: (P.paper(c, lambda c: P.ell(c, 540, 860, 220, 220), P.CREAM, 1.3), P.paper(c, lambda c: P.ell(c, 540, 860, 190, 190), (0.92, 0.96, 0.92), 1.32)))
    if a > 0.5:
        ang = -math.pi / 2 + min(1.0, max(0.0, t - t0 - 0.5) / 2.0) * 2 * math.pi * 3 / 60 * 10
        c.set_source_rgb(*P.INK); c.set_line_width(14); c.set_line_cap(cairo.LINE_CAP_ROUND); c.move_to(540, 860); c.line_to(540 + 150 * math.cos(ang), 860 + 150 * math.sin(ang)); c.stroke()
        label(c, "3 SEKUNDEN", 540, 1180, 70, GREEN)
        for k in range(3): cue(t0 + 0.6 + 0.5 * k, "tick")


def sh_steps(c, t):
    room(c, t, (600, 440, 380, 420)); sofa(c, 700, 640); t0 = t_of("Aufschauen")
    t1, t2 = t_of("Nachfragen"), t_of("Das Handy weg")
    up = ease((t - t0) / 0.35)
    P.person(c, True, 280, 860, 108, "smile", blink=blink(t), arms=("down", "reach"), look=0.7)
    P.person(c, False, 720, 1030 - 25 * up, 104, "smile" if up > 0.5 else "neutral", talk(t) if t1 < t < t2 else 0, sit=True,
             arms=("forward", "down") if t < t2 else ("reach", "down"), look=-0.6 * up, depth=1.4, phone=t < t2 + 0.3)
    checkmark(c, 280, 520, 0.8, pop(t, t0, kind="ding"))
    P.bubble(c, 700, 640, 280, 100, "Und dann?", 42, pop(t, t1), tail=1, col=GREEN)
    if t > t2:
        u = slide(t, t2, 0.5, "whoosh"); cue(t2, "whoosh")
        P.paper(c, lambda c: P.rrect(c, 820 + 260 * u, 1180 + 200 * u, 60, 100, 10), (0.14, 0.14, 0.22), 1.5)
    marks(c, t, t2 + 0.4, 500, 860, 90, ["heart", "heart"], 0.25)


def sh_end(c, t):
    room(c, t, (360, 470, 600, 560)); t0 = t_of("Schreib in")
    bird(c, t, 700, 870 - 8 * math.sin(t * 4), 1.1, flap=(t * 2) % 2 < 0.4)
    P.person(c, True, 330, 1080, 105, "smile", blink=blink(t), arms=("down", "reach"), look=0.8, tilt=6)
    P.person(c, False, 560, 1070, 110, "smile", blink=blink(t, 2.6), arms=("reach", "down"), look=0.6, tilt=-4)
    marks(c, t, t0 + 0.3, 450, 1060, 110, ["heart", "heart", "star"], 0.25)
    a = pop(t, t_of("Würde dein"), kind="pop")
    scaled(c, 540, 1560, a, lambda: (P.paper(c, lambda c: P.rrect(c, 380, 1510, 320, 110, 50), P.CREAM, 1.4), P.mark(c, "?", 540, 1565, 1.0)))


G_, R_, M_, B_, ROSE_ = GREEN, RED_, BIRD, SKY, P.ROSE
SHOTS = [(0.0, sh_hook, BIRD), (t_of("Eine Frau steht"), sh_window, BIRD), (t_of("Ihr Mann sitzt"), sh_reader, B_), (t_of("Jetzt hat er"), sh_two, M_),
         (t_of("Er schaut auf"), sh_turn, G_), (t_of("Oder er brummt"), sh_hm, R_), (t_of("Der Paarforscher"), sh_offer, ROSE_), (t_of("Ein Blick"), sh_kinds, B_),
         (t_of("In seinem Labor"), sh_lab, B_), (t_of("Die Paare, die noch"), sh_87, G_), (t_of("Bei den geschiedenen"), sh_33, R_),
         (t_of("Es geht also nicht"), sh_big, ROSE_), (t_of("Es geht um den"), sh_bird, M_), (t_of("Eine Frau, die immer"), sh_void, B_),
         (t_of("Nicht, weil die"), sh_hurt, ROSE_), (t_of("Das Gute daran"), sh_seconds, G_), (t_of("Aufschauen"), sh_steps, G_), (t_of("Schreib in"), sh_end, M_)]

P.LIT["on"] = True
P.GLOW_COLS.update({BIRD, BIRD_D, SKY, GREEN, RED_})
STARTS = [s[0] for s in SHOTS]
XF = 0.25                                                                     # cross-fade length

# ---------------------------------------------------------------- words one by one, coloured keywords
FONT = ImageFont.truetype(os.path.join(HERE, "fonts", "Inter-ExtraBold.otf"), 60)
KEY = {"Vogel", "Ehe", "Fenster", "schöner", "liest", "zwei", "lächelt", "brummt", "weiter", "Gottman", "Angebot", "Nähe", "Blick",
       "Seufzer", "Frage", "Foto", "Labor", "sechs", "zusammen", "siebenundachtzig", "geschiedenen", "dreiunddreißig", "Liebeserklärungen",
       "Leere", "fragen", "Liebe", "weh", "übersehen", "Sekunden", "Aufschauen", "Nachfragen", "Handy", "Kommentare"}
BIG_HOOK = False                                   # big first sentence at the top: switched off (user: no huge text)
HOOK_END = t_of("Eine Frau steht")
BIG = ImageFont.truetype(os.path.join(HERE, "fonts", "Inter-ExtraBold.otf"), 92)
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
    if BIG_HOOK and t < HOOK_END - 0.05: return hook_title(d, t)
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


def hook_title(d, t):
    """the first sentence big at the top, words popping in one by one, keywords in the bird colour"""
    ws = [w for w in WORDS if w[1] < HOOK_END - 0.05]; lines, cur = [], []
    for w in ws:
        if cur and BIG.getlength(" ".join(x[0].upper() for x in cur + [w])) > 960: lines.append(cur); cur = []
        cur.append(w)
    lines.append(cur)
    for li, ln in enumerate(lines):
        toks = [w[0].upper() for w in ln]; x = (W - BIG.getlength(" ".join(toks))) / 2; y = 170 + li * 112
        for (tok, s0, e0), up in zip(ln, toks):
            a = max(0.0, min(1.0, (t - s0 + 0.1) / 0.15))          # whole sentence is there on frame 0; spoken words light up
            key = re.sub(r"[.,:;!?]", "", tok) in KEY
            col = tuple(int(v * 255) for v in BIRD) if key and a > 0 else (250, 244, 236)
            col = tuple(int(v * (0.72 + 0.28 * a)) for v in col)
            for ox, oy in ((-4, 0), (4, 0), (0, -4), (0, 4), (4, 8)): d.text((x + ox, y + oy), up, font=BIG, fill=(15, 10, 30))
            d.text((x, y), up, font=BIG, fill=col)
            x += BIG.getlength(up + " ")


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
    """the shot at time t with its glow: drawn twice, normally and as the glow mask"""
    a = draw_raw(t, k); P.MASK["on"] = True
    try: m = draw_raw(t, k)
    finally: P.MASK["on"] = False
    return P.glow(a, m)


def draw_raw(t, k):
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

