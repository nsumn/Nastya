"""Video 07 'Stille' (nobody writes first: Liu et al. 2022 'reaching out', Boothby et al. 2018 'liking gap') in the lit paper style.
A glowing golden thread is the connection between the two: it dims in the silence and lights up when one of them writes.
Frame 0 is a full scene with the first sentence big at the top; CAPS captions at the bottom; glow pass on every frame.

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
GOLD, GOLD_D = (1.0, 0.80, 0.35), (0.95, 0.62, 0.22)
SKY, GREEN, RED_, GREY = (0.62, 0.78, 1.0), (0.45, 0.85, 0.60), (1.0, 0.45, 0.55), (0.55, 0.55, 0.66)


def night(c, t, n=16, top=(0.07, 0.08, 0.19), bottom=(0.15, 0.12, 0.25)):
    P.background(c, top, bottom)
    for i in range(n): P.paper(c, lambda c, i=i: P.star(c, 60 + (i * 173) % 960, 120 + (i * 271) % 1500, 6 + 3 * math.sin(t * 2 + i)), P.MOON, 0.5, 0.6)


def window_room(c, x, y, w, h, lamp_col=GOLD, lamp=1.0):
    """a lit window frame (her flat / his flat) standing in the night"""
    g = cairo.RadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, w * 0.9)
    g.add_color_stop_rgba(0, *lamp_col, 0.18 * lamp); g.add_color_stop_rgba(1, *lamp_col, 0); c.set_source(g); c.paint()
    P.paper(c, lambda c: P.rrect(c, x - 16, y - 16, w + 32, h + 32, 26), (0.30, 0.26, 0.42), 0.8)
    P.paper(c, lambda c: P.rrect(c, x, y, w, h, 20), (0.20, 0.18, 0.34), 0.8)


def thread(c, t, p0, p1, s=1.0, sag=120, col=GOLD):
    """the connection: a glowing golden thread that sags between two hearts, with light running along it.
    s: 0 = dark/grey, 1 = fully lit"""
    (x0, y0), (x1, y1) = p0, p1; mx, my = (x0 + x1) / 2, (y0 + y1) / 2 + sag
    cc = tuple(GREY[k] + (col[k] - GREY[k]) * s for k in range(3))
    c.set_line_cap(cairo.LINE_CAP_ROUND)
    c.move_to(x0, y0); c.curve_to(mx - (x1 - x0) * 0.2, my, mx + (x1 - x0) * 0.2, my, x1, y1)
    c.set_source_rgba(*cc, 0.25 + 0.2 * s); c.set_line_width(18); c.stroke_preserve()
    c.set_source_rgba(*cc, 0.55 + 0.45 * s); c.set_line_width(6); c.stroke()
    if s > 0.2:
        for k in range(4):
            u = ((t * 0.45 + k / 4) % 1.0); v = 1 - u
            px = v ** 3 * x0 + 3 * v * v * u * (mx - (x1 - x0) * 0.2) + 3 * v * u * u * (mx + (x1 - x0) * 0.2) + u ** 3 * x1
            py = v ** 3 * y0 + 3 * v * v * u * my + 3 * v * u * u * my + u ** 3 * y1
            c.arc(px, py, 9 * s, 0, 2 * math.pi); c.set_source_rgba(1, 0.95, 0.8, s); c.fill()


def heart_dot(c, t, x, y, s=1.0, col=P.ROSE):
    P.paper(c, lambda c: P.heart(c, x, y, 26 * s * (1 + 0.08 * math.sin(t * 5))), col, 1.5)


def gauge(c, t, t0, x, y, h_target, col, lab, sound=True):
    """a bar that grows from the floor line, with a label below"""
    u = ease((t - t0) / 0.8)
    if sound: cue(t0, "rise")
    hh = max(2, h_target * u)
    P.paper(c, lambda c: P.rrect(c, x - 90, y - hh, 180, hh, 20), col, 1.3)
    label(c, lab, x, y + 70, 46, col)


def envelope(c, x, y, s=1.0):
    P.paper(c, lambda c: P.rrect(c, x - 80 * s, y - 52 * s, 160 * s, 104 * s, 12 * s), P.CREAM, 1.5)
    c.set_source_rgb(0.75, 0.62, 0.55); c.set_line_width(6 * s)
    c.move_to(x - 76 * s, y - 48 * s); c.line_to(x, y + 8 * s); c.line_to(x + 76 * s, y - 48 * s); c.stroke()
    P.paper(c, lambda c: P.heart(c, x, y + 20 * s, 16 * s), P.ROSE, 1.55)


def typing(c, t, x, y, a=1.0):
    if a <= 0: return
    P.paper(c, lambda c: P.rrect(c, x - 90 * a, y - 40 * a, 180 * a, 80 * a, 40 * a), P.CREAM, 1.5)
    for k in range(3):
        b = 0.5 + 0.5 * math.sin(t * 9 - k)
        c.arc(x + (k - 1) * 45 * a, y - 6 * b * a, 11 * a, 0, 2 * math.pi); c.set_source_rgb(0.45, 0.42, 0.55); c.fill()


# ---------------------------------------------------------------- shots
LX, RX = 270, 810                       # her side / his side in the split shots


def two_windows(c, t, lit=1.0, moods=("calm", "calm"), phones=(True, True), thread_s=1.0, y=900, r=88):
    night(c, t)
    wh = 640 * r / 88
    window_room(c, LX - 200, y - 260 * r / 88, 400, wh, P.ROSE, lit); window_room(c, RX - 200, y - 260 * r / 88, 400, wh, SKY, lit)
    P.person(c, True, LX, y, r, moods[0], blink=blink(t), arms=("phone", "phone") if phones[0] else ("down", "down"), phone=phones[0], look=0.3, breath=breath(t))
    P.person(c, False, RX, y + 4, r * 1.05, moods[1], blink=blink(t, 2.8), arms=("phone", "phone") if phones[1] else ("down", "down"), phone=phones[1], look=-0.3)
    thread(c, t, (LX + 40, y + 120), (RX - 40, y + 120), thread_s, 160)
    heart_dot(c, t, LX + 40, y + 120, 0.8 + 0.2 * thread_s); heart_dot(c, t, RX - 40, y + 120, 0.8 + 0.2 * thread_s, SKY)


def sh_hook(c, t):
    s = 1.0 if t < t_of("Und keiner") else 0.55 + 0.45 * abs(math.sin(t * 6)) * max(0, 1 - (t - t_of("Und keiner")) / 1.5)
    two_windows(c, t, 1.0, ("calm", "calm"), (True, True), s, 900, 100)
    if t > t_of("Und keiner"): cue(t_of("Und keiner"), "buzz")
    marks(c, t, t_of("keiner von"), LX, 900, 100, ["?"], 0.3); marks(c, t, t_of("keiner von") + 0.2, RX, 900, 100, ["?"], 0.3)


def sh_her(c, t):
    night(c, t); t0 = t_of("Sie hält das Handy")
    window_room(c, 140, 640, 800, 900, P.ROSE)
    P.person(c, True, 540, 920, 135, "calm", blink=blink(t), arms=("phone", "phone"), phone=True, look=0.0, breath=breath(t))
    z = pop(t, t_of("und denkt"), kind="zoom")
    scaled(c, 540, 520, z, lambda: (P.paper(c, lambda c: P.ell(c, 540, 520, 230, 150), P.CREAM, 1.4),
                                    [P.paper(c, lambda c, i=i: P.ell(c, 600 + 30 * i, 690 + 40 * i, 18 - 5 * i, 18 - 5 * i), P.CREAM, 1.4) for i in range(3)],
                                    P.head(c, False, 540, 520, 70, "neutral", depth=1.5)))
    typing(c, t, 800, 1240, pop(t, t0 + 0.3, kind="tick") * (0 if t > t_of("meldet er") else 1))
    if t > t_of("meldet er"): cue(t_of("meldet er"), "fade")


def sh_him(c, t):
    night(c, t); t0 = t_of("Er sitzt ein paar")
    window_room(c, 140, 640, 800, 900, SKY)
    P.person(c, False, 540, 930, 135, "calm", blink=blink(t, 2.6), arms=("phone", "phone"), phone=True, look=0.0)
    z = pop(t, t_of("genau dasselbe"), kind="zoom")
    scaled(c, 540, 520, z, lambda: (P.paper(c, lambda c: P.ell(c, 540, 520, 230, 150), P.CREAM, 1.4),
                                    P.head(c, True, 540, 520, 70, "neutral", depth=1.5)))
    a = pop(t, t_of("genau dasselbe") + 0.4, kind="ding")
    scaled(c, 860, 400, a, lambda: (P.paper(c, lambda c: P.ell(c, 860, 400, 60, 60), GOLD, 1.5), label(c, "=", 860, 432, 90, P.INK)))


def sh_houses(c, t):
    night(c, t); t0 = t_of("Psychologen kennen")
    P.paper(c, lambda c: (c.move_to(-20, 1380), c.curve_to(300, 1330, 800, 1360, 1100, 1320), c.line_to(1100, 1940), c.line_to(-20, 1940), c.close_path()), P.PLUM, 0.9)
    for k, (x, col) in enumerate(((230, P.ROSE), (850, SKY))):
        u = slide(t, t0 + 0.15 * k, 0.45, "whoosh"); yy = 900 + 300 * (1 - u)
        P.paper(c, lambda c, x=x, yy=yy: P.rrect(c, x - 150, yy, 300, 420, 10), (0.34, 0.30, 0.46), 1.0)
        P.paper(c, lambda c, x=x, yy=yy: (c.move_to(x - 185, yy + 20), c.line_to(x, yy - 160), c.line_to(x + 185, yy + 20), c.close_path()), (0.48, 0.34, 0.44), 1.05)
        P.paper(c, lambda c, x=x, yy=yy, col=col: P.rrect(c, x - 55, yy + 80, 110, 120, 12), col, 1.1)
    if t > t0 + 0.6: thread(c, t, (230, 1040), (850, 1040), ease((t - t0 - 0.6) / 0.6), 180); cue(t0 + 0.6, "sparkle")
    marks(c, t, t0 + 1.0, 540, 900, 100, ["!"], 0.3)


def sh_study(c, t):
    night(c, t, 10); t0 = t_of("In einer Studie")
    a = pop(t, t0 + 0.1, kind="thud")
    scaled(c, 540, 800, a, lambda: (P.paper(c, lambda c: P.rrect(c, 330, 600, 420, 400, 30), P.CREAM, 1.3),
                                    P.paper(c, lambda c: P.rrect(c, 330, 600, 420, 100, 30), RED_, 1.32), label(c, "2022", 540, 900, 130, P.INK)))
    b = pop(t, t_of("sollten Menschen"), kind="pop")
    scaled(c, 540, 1180, b, lambda: label(c, "STUDIE", 540, 1200, 80, GOLD))


def sh_send(c, t):
    two_windows(c, t, 1.0, ("calm", "neutral"), (True, True), 0.8); t0 = t_of("einfach so eine")
    u = slide(t, t0 + 0.2, 1.0, "whoosh")
    x = LX + (RX - LX) * u; y = 900 + 120 + 160 * math.sin(math.pi * u) * 0.75 - 140
    envelope(c, x, y, 0.8)


def sh_guess(c, t):
    night(c, t, 10); t0 = t_of("Vorher schätzten")
    c.set_source_rgba(*P.CREAM, 0.5); c.set_line_width(6); c.move_to(160, 1150); c.line_to(920, 1150); c.stroke()
    gauge(c, t, t0 + 0.3, 330, 1150, 220, SKY, "GESCHÄTZT")
    P.person(c, True, 750, 820, 95, "calm", blink=blink(t), arms=("down", "hip"), look=-0.6)
    marks(c, t, t0 + 0.8, 750, 820, 95, ["?"], 0.3)


def sh_real(c, t):
    night(c, t, 10); t0 = t_of("Im Schnitt lagen")
    c.set_source_rgba(*P.CREAM, 0.5); c.set_line_width(6); c.move_to(160, 1150); c.line_to(920, 1150); c.stroke()
    gauge(c, t, t0 - 5, 330, 1150, 220, SKY, "GESCHÄTZT", False)
    gauge(c, t, t_of("Die Empfänger"), 750, 1150, 560, GOLD, "ECHT")
    if t > t_of("Die Empfänger") + 0.8:
        marks(c, t, t_of("Die Empfänger") + 0.8, 750, 520, 80, ["heart", "star", "heart"], 0.2)
    a = pop(t, t0 + 0.4, kind="buzzer")
    scaled(c, 330, 800, a, lambda: P.mark(c, "!", 330, 800, 1.6))


def sh_surprise(c, t):
    night(c, t, 10); t0 = t_of("Und je überraschender")
    lid = ease((t - t0 - 0.9) / 0.4)
    P.paper(c, lambda c: P.rrect(c, 360, 900, 360, 300, 20), P.ROSE, 1.3)
    P.paper(c, lambda c: P.rrect(c, 525, 900, 30, 300, 6), GOLD, 1.32)
    c.save(); c.translate(540, 900 - 220 * lid); c.rotate(-0.5 * lid)
    P.paper(c, lambda c: P.rrect(c, -200, -70, 400, 80, 16), (0.85, 0.45, 0.58), 1.35); c.restore()
    if lid > 0: cue(t0 + 0.9, "sparkle"); rays(c, t, t0 + 0.9, 540, 860, GOLD)
    for k in range(5):
        a = pop(t, t0 + 1.1 + 0.12 * k, kind="pop")
        P.paper(c, lambda c, k=k, a=a: P.heart(c, 400 + 70 * k, 760 - 120 * a - 40 * (k % 2), 28 * max(a, 1e-3)), (P.ROSE, GOLD)[k % 2], 1.5)


def sh_gap(c, t):
    night(c, t, 10); t0 = t_of("Forscher kennen")
    P.person(c, True, 300, 560, 80, "smile", talk(t) if t < t_of("die Sympathie") else 0, blink=blink(t), arms=("down", "forward"), look=0.6)
    P.person(c, False, 780, 560, 84, "smile", blink=blink(t, 2.9), arms=("forward", "down"), look=-0.6)
    tg = t_of("die Sympathie")
    c.set_source_rgba(*P.CREAM, 0.5); c.set_line_width(6); c.move_to(160, 1220); c.line_to(920, 1220); c.stroke()
    if t > tg:
        gauge(c, t, tg, 330, 1220, 110, SKY, "")
        gauge(c, t, tg + 0.3, 750, 1220, 300, GOLD, "")
        if t > tg + 1.1:
            cue(tg + 1.1, "ding"); c.set_source_rgb(*P.ROSE); c.set_line_width(8); c.set_dash([16, 10])
            c.move_to(430, 1110); c.line_to(650, 1110); c.move_to(430, 920); c.line_to(650, 920); c.stroke(); c.set_dash([])
            label(c, "LÜCKE", 540, 1035, 54, P.ROSE)


def sh_silence(c, t):
    t0 = t_of("So entsteht")
    two_windows(c, t, 0.4, ("sad", "sad"), (False, False), max(0.0, 1 - (t - t0) / 1.2))
    if t > t0: cue(t0 + 0.3, "fade")
    P.mark(c, "zzz", 540, 640, 1.2, ease((t - t0 - 0.8) / 0.4))


def sh_reasons(c, t):
    night(c, t, 10)
    items = [("Aus Stolz", "STOLZ", (0.85, 0.65, 1.0), 560), ("Aus Angst", "ANGST", SKY, 860), ("Aus der Sorge", "ZU VIEL GEFÜHL", P.ROSE, 1160)]
    for k, (ph, lab, col, y) in enumerate(items):
        a = pop(t, t_of(ph), kind="thud")
        def card(lab=lab, col=col, y=y):
            P.paper(c, lambda c: P.rrect(c, 160, y - 95, 760, 190, 40), col, 1.3); label(c, lab, 540, y + 30, 78, P.INK)
        scaled(c, 540, y, a, card)


def sh_still_there(c, t):
    t0 = t_of("Dabei ist die Verbindung")
    two_windows(c, t, 1.0, ("calm", "calm"), (False, False), ease((t - t0) / 0.8))
    rays(c, t, t0 + 0.2, 540, 1160, GOLD)
    marks(c, t, t0 + 0.6, 540, 1100, 80, ["heart", "star", "heart"], 0.2)


def sh_step(c, t):
    night(c, t); t0 = t_of("Sie wartet nur")
    P.paper(c, lambda c: (c.move_to(-20, 1420), c.line_to(1100, 1400), c.line_to(1100, 1940), c.line_to(-20, 1940), c.close_path()), P.PLUM, 0.9)
    u = slide(t, t_of("den ersten Schritt"), 0.6, "steps")
    P.person(c, True, 330 + 200 * u, 860, 105, "calm" if u < 0.5 else "smile", blink=blink(t), arms=("down", "reach"), look=0.6)
    P.person(c, False, 820, 865, 110, "calm", blink=blink(t, 2.7), arms=("down", "down"), look=-0.6)
    thread(c, t, (380 + 200 * u, 1000), (780, 1000), 0.6 + 0.4 * u, 120 * (1 - u) + 20)
    for k in range(3):
        a = pop(t, t_of("den ersten Schritt") + 0.15 * k, kind="pop")
        P.paper(c, lambda c, k=k, a=a: P.ell(c, 300 + 70 * k, 1500 + 20 * (k % 2), 26 * max(a, 1e-3), 14 * max(a, 1e-3)), P.ROSE, 1.2)


def sh_message(c, t):
    night(c, t); t0 = t_of("Manchmal reicht")
    window_room(c, 140, 640, 800, 900, P.ROSE)
    P.person(c, True, 540, 940, 130, "smile", blink=blink(t), arms=("phone", "phone"), phone=True, breath=breath(t))
    typing(c, t, 540, 560, pop(t, t0 + 0.2, kind="tick") * (1 if t < t_of("Ich habe an") else 0))
    P.bubble(c, 540, 560, 620, 130, "Ich habe an dich gedacht.", 44, pop(t, t_of("Ich habe an"), kind="ping"), tail=-1, col=GOLD)


def sh_share(c, t):
    t0 = t_of("Schick das")
    two_windows(c, t, 1.0, ("smile", "smile"), (True, True), 1.0)
    a = pop(t, t0 + 0.2, kind="ping")
    scaled(c, RX, 640, a, lambda: envelope(c, RX, 640, 0.8))
    marks(c, t, t0 + 0.6, RX, 900, 92, ["heart", "!"], 0.25)
    marks(c, t, t0 + 1.0, LX, 900, 88, ["heart", "star"], 0.25)


ROSE_ = P.ROSE
SHOTS = [(0.0, sh_hook, GOLD), (t_of("Sie hält das Handy"), sh_her, ROSE_), (t_of("Er sitzt ein paar"), sh_him, SKY), (t_of("Psychologen kennen"), sh_houses, GOLD),
         (t_of("In einer Studie"), sh_study, GOLD), (t_of("einfach so eine"), sh_send, GOLD), (t_of("Vorher schätzten"), sh_guess, SKY),
         (t_of("Im Schnitt lagen"), sh_real, GOLD), (t_of("Und je überraschender"), sh_surprise, ROSE_), (t_of("Forscher kennen"), sh_gap, GOLD),
         (t_of("So entsteht"), sh_silence, SKY), (t_of("Aus Stolz"), sh_reasons, ROSE_), (t_of("Dabei ist die Verbindung"), sh_still_there, GOLD),
         (t_of("Sie wartet nur"), sh_step, ROSE_), (t_of("Manchmal reicht"), sh_message, GOLD), (t_of("Schick das"), sh_share, GOLD)]

STARTS = [s[0] for s in SHOTS]
XF = 0.25                                                                     # cross-fade length

# ---------------------------------------------------------------- words one by one, coloured keywords
FONT = ImageFont.truetype(os.path.join(HERE, "fonts", "Inter-ExtraBold.otf"), 60)
KEY = {"Abend", "aneinander", "keiner", "zuerst", "Handy", "meldet", "dasselbe", "Muster", "Studie", "Nachricht", "schätzten", "niedrig",
       "mehr", "überraschender", "Freude", "Sympathie-Lücke", "unterschätzen", "mochte", "Stille", "Stolz", "Angst", "aufdringlich", "fühlen",
       "Verbindung", "ersten", "Schritt", "Satz", "gedacht", "gedacht.", "Person"}
BIG_HOOK = False                                   # big first sentence at the top: switched off (user: no huge text)
HOOK_END = t_of("Sie hält das Handy")
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
        toks = [w[0].upper() for w in ln]; x = (W - BIG.getlength(" ".join(toks))) / 2; y = 130 + li * 100
        for (tok, s0, e0), up in zip(ln, toks):
            a = max(0.0, min(1.0, (t - s0 + 0.1) / 0.15))          # whole sentence is there on frame 0; spoken words light up
            key = re.sub(r"[.,:;!?]", "", tok) in KEY
            col = tuple(int(v * 255) for v in GOLD) if key and a > 0 else (250, 244, 236)
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
    arr = P.glow(arr)
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

