"""Video 08 'Entzug' (why you can't stop thinking of him: Fisher et al. 2010 fMRI of rejected lovers, Marshall 2012 on
checking an ex's profile). Test video: addressed with 'du', starts with the pain, one short title line on top for 2.5 s.
Paper style without glow; a golden thread runs from her heart to his photo on the phone and fades towards the end.

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
PURPLE = (0.80, 0.65, 1.0)


def phone_him(c, t, x, y, s=1.0, a=1.0):
    """phone with his photo on the screen"""
    if a <= 0: return
    s *= max(a, 1e-3)
    P.paper(c, lambda c: P.rrect(c, x - 110 * s, y - 190 * s, 220 * s, 380 * s, 30 * s), (0.12, 0.12, 0.18), 1.3)
    P.paper(c, lambda c: P.rrect(c, x - 92 * s, y - 165 * s, 184 * s, 320 * s, 18 * s), (0.30, 0.38, 0.62), 1.32)
    P.head(c, False, x, y - 30 * s, 58 * s, "smile", depth=1.35)
    P.paper(c, lambda c: P.rrect(c, x - 60 * s, y + 70 * s, 120 * s, 14 * s, 7 * s), (0.75, 0.80, 0.95), 1.35)
    P.paper(c, lambda c: P.rrect(c, x - 40 * s, y + 96 * s, 80 * s, 12 * s, 6 * s), (0.60, 0.66, 0.85), 1.35)


def brain(c, t, x, y, s=1.0, spots=0.0):
    P.paper(c, lambda c: (P.ell(c, x - 70 * s, y, 120 * s, 100 * s), P.ell(c, x + 70 * s, y, 120 * s, 100 * s),
                         P.ell(c, x - 20 * s, y - 60 * s, 110 * s, 80 * s), P.ell(c, x + 40 * s, y + 50 * s, 120 * s, 70 * s)), (0.95, 0.68, 0.76), 1.2)
    c.set_source_rgba(0.75, 0.42, 0.52, 0.9); c.set_line_width(7 * s); c.set_line_cap(cairo.LINE_CAP_ROUND)
    for k in range(5):
        xx = x - 150 * s + 70 * k * s; c.move_to(xx, y - 50 * s); c.curve_to(xx + 30 * s, y - 10 * s, xx - 20 * s, y + 20 * s, xx + 15 * s, y + 60 * s); c.stroke()
    c.move_to(x, y - 110 * s); c.line_to(x, y + 100 * s); c.stroke()
    for k, (dx, dy) in enumerate(((-60, -20), (50, 10), (0, 50))):
        a = max(0.0, min(1.0, spots * 3 - k))
        if a > 0:
            g = cairo.RadialGradient(x + dx * s, y + dy * s, 0, x + dx * s, y + dy * s, 70 * s); g.add_color_stop_rgba(0, 1, 0.85, 0.3, 0.95 * a); g.add_color_stop_rgba(1, 1, 0.85, 0.3, 0)
            c.set_source(g); c.arc(x + dx * s, y + dy * s, 70 * s, 0, 2 * math.pi); c.fill()


def her_phone(c, t, x, y, r, mood, thread_s=1.0, px=820, py=760, phone_a=1.0):
    P.person(c, True, x, y, r, mood, blink=blink(t), arms=("down", "reach"), look=0.7, breath=breath(t))
    hy = y + r * 2.3
    phone_him(c, t, px, py, 0.9, phone_a)
    if thread_s > 0.02: thread(c, t, (x + r * 0.2, hy), (px - 60, py + 120), thread_s, 90)
    heart_dot(c, t, x, hy, r / 88 * 1.6)


def sh_hook(c, t):
    night(c, t); window_room(c, 90, 560, 900, 980, P.ROSE, 0.8)
    her_phone(c, t, 330, 860, 115, "sad", 1.0, 790, 900)
    marks(c, t, 0.4, 330, 860, 115, ["tear"], 0.3)


def sh_ok(c, t):
    night(c, t); t0 = t_of("Dann ist mit")
    P.person(c, True, 540, 900, 125, "calm", blink=blink(t), arms=("down", "down"), breath=breath(t))
    checkmark(c, 540, 540, 1.3, pop(t, t0 + 0.3, kind="ding"))
    marks(c, t, t0 + 0.9, 540, 900, 125, ["heart", "star"], 0.25)


def sh_brain(c, t):
    night(c, t, 10); t0 = t_of("Dein Gehirn")
    a = pop(t, t0, kind="pop"); scaled(c, 540, 860, a, lambda: brain(c, t, 540, 860, 1.5))
    for k in range(4):
        b = pop(t, t0 + 0.5 + 0.15 * k, kind="sparkle"); ang = k * math.pi / 2 + t
        P.paper(c, lambda c, b=b, ang=ang: P.star(c, 540 + 320 * math.cos(ang), 860 + 260 * math.sin(ang), 22 * max(b, 1e-3)), GOLD, 1.3)


def sh_scanner(c, t):
    night(c, t, 8); t0 = t_of("Die Forscherin")
    P.paper(c, lambda c: P.rrect(c, 80, 1120, 920, 70, 20), (0.70, 0.72, 0.82), 1.0)
    u = slide(t, t0 + 0.6, 1.0, "whoosh")
    x = 760 - 380 * u
    P.paper(c, lambda c: P.rrect(c, x - 260, 1050, 420, 90, 40), P.PINK_D, 1.1)
    P.head(c, True, x + 190, 1060, 60, "calm", depth=1.15)
    P.paper(c, lambda c: (c.arc(300, 1000, 270, 0, 2 * math.pi), c.arc_negative(300, 1000, 170, 2 * math.pi, 0)), (0.85, 0.86, 0.94), 1.25)
    P.paper(c, lambda c: P.ell(c, 300, 760, 16, 16), GREEN, 1.3)
    tf = t_of("ein Foto des")
    a = pop(t, tf, kind="pop")
    scaled(c, 780, 640, a, lambda: (P.paper(c, lambda c: P.rrect(c, 650, 500, 260, 290, 16), P.CREAM, 1.4),
                                    P.paper(c, lambda c: P.rrect(c, 670, 520, 220, 200, 10), (0.30, 0.38, 0.62), 1.42),
                                    P.head(c, False, 780, 620, 60, "smile", depth=1.45)))


def sh_active(c, t):
    night(c, t, 8); t0 = t_of("Aktiv wurden")
    sp = ease((t - t0 - 0.3) / 1.2); cue(t0 + 0.3, "zap"); cue(t0 + 0.7, "zap"); cue(t0 + 1.1, "zap")
    brain(c, t, 540, 860, 1.6, sp)
    a = pop(t, t_of("Sucht"), kind="buzzer")
    scaled(c, 540, 1180, a, lambda: (P.paper(c, lambda c: P.rrect(c, 360, 1120, 360, 110, 40), RED_, 1.3), label(c, "SUCHT", 540, 1198, 64, P.INK)))


def sh_three(c, t):
    night(c, t, 10)
    items = [("Belohnung", "BELOHNUNG", GOLD, 560, "star"), ("Verlangen", "VERLANGEN", P.ROSE, 860, "heart"), ("Entzug", "ENTZUG", PURPLE, 1160, "bolt")]
    for k, (ph, lab, col, y, mk) in enumerate(items):
        a = pop(t, t_of(ph), kind="thud")
        def card(lab=lab, col=col, y=y, mk=mk):
            P.paper(c, lambda c: P.rrect(c, 160, y - 95, 760, 190, 40), col, 1.3); label(c, lab, 590, y + 28, 72, P.INK); P.mark(c, mk, 250, y, 1.0)
        scaled(c, 540, y, a, card)


def sh_pull(c, t):
    night(c, t); t0 = t_of("Deshalb fühlt")
    P.paper(c, lambda c: (c.move_to(-20, 1420), c.line_to(1100, 1400), c.line_to(1100, 1940), c.line_to(-20, 1940), c.close_path()), P.PLUM, 0.9)
    pull = 0.5 + 0.5 * math.sin((t - t0) * 3.0)
    x = 330 - 40 * pull
    P.person(c, True, x, 880, 110, "sad", blink=blink(t), arms=("down", "reach"), look=0.6, tilt=-8 * pull)
    phone_him(c, t, 860, 900, 0.8)
    thread(c, t, (x + 150, 1000), (800, 1000), 1.0, 30 + 60 * (1 - pull))
    if t > t0 + 0.4: cue(t0 + 0.4, "boing")
    marks(c, t, t0 + 1.0, x, 880, 110, ["drop", "!"], 0.3)


def sh_profile(c, t):
    night(c, t); window_room(c, 90, 560, 900, 980, P.ROSE, 0.6); t0 = t_of("Und jedes Mal")
    her_phone(c, t, 330, 860, 112, "sad", 0.4 + 0.6 * ease((t - t0 - 0.8) / 0.4), 790, 860)
    sc = (t - t0) * 2.0
    for k in range(3):
        a = pop(t, t0 + 0.2 + 0.25 * k, kind="tick")
        P.paper(c, lambda c, k=k, a=a: P.heart(c, 900 + 40 * math.sin(sc + k), 640 - 60 * k - 30 * ((sc + k) % 1), 18 * max(a, 1e-3)), P.ROSE, 1.5)
    loop_a = pop(t, t_of("von vorne"), kind="swirl")
    if loop_a > 0:
        c.new_sub_path(); c.arc(540, 420, 90 * loop_a, t * 3, t * 3 + 5.0); c.set_source_rgb(*GOLD); c.set_line_width(16); c.set_line_cap(cairo.LINE_CAP_ROUND); c.stroke()


def sh_study12(c, t):
    night(c, t, 10); t0 = t_of("Eine Studie aus")
    a = pop(t, t0 + 0.1, kind="thud")
    scaled(c, 540, 760, a, lambda: (P.paper(c, lambda c: P.rrect(c, 330, 560, 420, 400, 30), P.CREAM, 1.3),
                                    P.paper(c, lambda c: P.rrect(c, 330, 560, 420, 100, 30), RED_, 1.32), label(c, "2012", 540, 860, 130, P.INK)))
    b = pop(t, t_of("zeigte"), kind="pop"); scaled(c, 540, 1150, b, lambda: label(c, "STUDIE", 540, 1180, 80, GOLD))


def sh_worse(c, t):
    night(c, t, 10); t0 = t_of("Wer das Profil")
    c.set_source_rgba(*P.CREAM, 0.5); c.set_line_width(6); c.move_to(160, 1150); c.line_to(920, 1150); c.stroke()
    gauge(c, t, t_of("vermisst"), 330, 1150, 480, P.ROSE, "VERMISSEN")
    gauge(c, t, t_of("kommt schlechter"), 750, 1150, 150, GREEN, "LOSLASSEN")
    a = pop(t, t0 + 0.1, kind="pop"); scaled(c, 540, 470, a, lambda: phone_him(c, t, 540, 470, 0.65))
    if t > t_of("kommt schlechter") + 0.6: P.mark(c, "!", 750, 900, 1.4, ease((t - t_of("kommt schlechter") - 0.6) / 0.3))


def sh_open(c, t):
    night(c, t, 10); t0 = t_of("Dazu kommt")
    P.person(c, True, 540, 980, 120, "calm", blink=blink(t), arms=("down", "down"), breath=breath(t))
    u = ease((t - t0 - 0.2) / 0.9); cue(t0 + 0.2, "swirl")
    if u > 0.01:
        c.new_sub_path(); c.arc(540, 560, 170, -math.pi / 2, -math.pi / 2 + 2 * math.pi * 0.82 * u)
        c.set_source_rgb(*GOLD); c.set_line_width(28); c.set_line_cap(cairo.LINE_CAP_ROUND); c.stroke()
    P.mark(c, "?", 540, 560, 1.8, pop(t, t_of("nicht abgeschlossen"), kind="pop"))


def sh_talk(c, t):
    night(c, t); t0 = t_of("Ein Gespräch, das nie")
    for k, x in enumerate((330, 750)):
        P.paper(c, lambda c, x=x: P.rrect(c, x - 110, 1080, 220, 50, 14), WOOD_, 1.1)
        P.paper(c, lambda c, x=x: P.rrect(c, x - 100, 860, 30, 380, 10), WOOD_, 1.05)
    P.person(c, True, 330, 820, 100, "sad", blink=blink(t), sit=True, arms=("down", "down"), look=0.6)
    a = pop(t, t0 + 0.4, kind="pop")
    P.bubble(c, 750, 640, 220, 110, "...", 60, a, tail=-1, col=(0.70, 0.70, 0.80))
    marks(c, t, t0 + 1.0, 750, 900, 60, ["?"], 0.3)


def sh_question(c, t):
    night(c, t, 10); t0 = t_of("Eine Frage, auf")
    a = pop(t, t0 + 0.1, kind="thud"); scaled(c, 540, 820, a, lambda: P.mark(c, "?", 540, 820, 5.0))
    b = pop(t, t_of("nie eine Antwort"), kind="buzzer")
    scaled(c, 540, 1180, b, lambda: (P.paper(c, lambda c: P.rrect(c, 340, 1120, 400, 110, 40), (0.40, 0.40, 0.52), 1.3), label(c, "KEINE ANTWORT", 540, 1195, 48, P.CREAM)))


def sh_good(c, t):
    night(c, t, 10, (0.10, 0.12, 0.26), (0.30, 0.22, 0.34)); t0 = t_of("Das Gute daran")
    u = ease((t - t0) / 1.2); cue(t0, "rise")
    P.paper(c, lambda c: P.ell(c, 540, 1300 - 300 * u, 180, 180), GOLD, 0.9)
    rays(c, t, t0 + 0.3, 540, 1300 - 300 * u, GOLD)
    P.paper(c, lambda c: (c.move_to(-20, 1300), c.curve_to(300, 1250, 800, 1280, 1100, 1240), c.line_to(1100, 1940), c.line_to(-20, 1940), c.close_path()), P.PLUM, 1.0)


def sh_days(c, t):
    night(c, t, 10); t0 = t_of("Mit jedem Tag")
    for k in range(7):
        x = 170 + (k % 4) * 245; y = 560 + (k // 4) * 260
        P.paper(c, lambda c, x=x, y=y: P.rrect(c, x - 90, y - 100, 180, 200, 18), P.CREAM, 1.2)
        label(c, str(k + 1), x, y + 30, 80, P.INK)
        if t > t0 + 0.25 * k:
            cue(t0 + 0.25 * k, "scribble"); c.set_source_rgb(*RED_); c.set_line_width(12); c.set_line_cap(cairo.LINE_CAP_ROUND)
            c.move_to(x - 60, y - 60); c.line_to(x + 60, y + 60); c.move_to(x + 60, y - 60); c.line_to(x - 60, y + 60); c.stroke()
    v = 1 - ease((t - t0) / 3.0)
    for k in range(5):
        P.paper(c, lambda c, k=k: P.rrect(c, 340 + k * 85, 1220 - (40 + 25 * k) * v, 60, (40 + 25 * k) * v + 4, 10), GOLD if k < 5 * v else (0.40, 0.40, 0.52), 1.2)


def sh_today(c, t):
    night(c, t); window_room(c, 90, 560, 900, 980, P.ROSE, 0.9); t0 = t_of("Also schau")
    P.person(c, True, 400, 860, 115, "calm" if t < t_of("Nur heute") else "smile", blink=blink(t), arms=("down", "down"), breath=breath(t))
    flip = ease((t - t0 - 0.3) / 0.4); cue(t0 + 0.3, "click")
    P.paper(c, lambda c: P.rrect(c, 700, 1150 - 20 * flip, 220, 60 + 300 * (1 - flip), 20), (0.12, 0.12, 0.18), 1.3)
    checkmark(c, 400, 520, 1.1, pop(t, t_of("Nur heute"), kind="ding"))


def sh_comment(c, t):
    night(c, t); t0 = t_of("Schreib in die")
    P.person(c, True, 540, 820, 120, "smile", blink=blink(t), arms=("down", "forward"), breath=breath(t))
    heart_dot(c, t, 540, 820 + 120 * 2.3, 2.2)
    a = pop(t, t0 + 0.3, kind="pop")
    scaled(c, 540, 1560, a, lambda: (P.paper(c, lambda c: P.rrect(c, 330, 1500, 420, 120, 60), P.CREAM, 1.4), label(c, "Seit ... Tagen", 540, 1578, 46, P.INK)))


def checkmark(c, x, y, s, a, col=GREEN):
    if a <= 0: return
    P.paper(c, lambda c: P.ell(c, x, y, 70 * s * a, 70 * s * a), col, 1.4)
    if a > 0.5:
        c.set_source_rgb(1, 1, 1); c.set_line_width(14 * s); c.set_line_cap(cairo.LINE_CAP_ROUND)
        c.move_to(x - 35 * s, y); c.line_to(x - 8 * s, y + 28 * s); c.line_to(x + 40 * s, y - 25 * s); c.stroke()


WOOD_ = (0.55, 0.40, 0.36)

ROSE_ = P.ROSE
SHOTS = [(0.0, sh_hook, P.ROSE), (t_of("Dann ist mit"), sh_ok, GREEN), (t_of("Dein Gehirn"), sh_brain, GOLD), (t_of("Die Forscherin"), sh_scanner, SKY),
         (t_of("Aktiv wurden"), sh_active, RED_), (t_of("Belohnung"), sh_three, GOLD), (t_of("Deshalb fühlt"), sh_pull, PURPLE),
         (t_of("Und jedes Mal"), sh_profile, P.ROSE), (t_of("Eine Studie aus"), sh_study12, GOLD), (t_of("Wer das Profil"), sh_worse, P.ROSE),
         (t_of("Dazu kommt"), sh_open, GOLD), (t_of("Ein Gespräch, das nie"), sh_talk, SKY), (t_of("Eine Frage, auf"), sh_question, PURPLE),
         (t_of("Das Gute daran"), sh_good, GOLD), (t_of("Mit jedem Tag"), sh_days, GREEN), (t_of("Also schau"), sh_today, GREEN), (t_of("Schreib in die"), sh_comment, P.ROSE)]


GLOW = False                                       # glow look switched off (user: no glow)
P.LIT["on"] = GLOW
P.GLOW_COLS.update({GOLD, GOLD_D, SKY, GREEN, RED_, PURPLE})
STARTS = [s[0] for s in SHOTS]
XF = 0.25                                                                     # cross-fade length

# ---------------------------------------------------------------- words one by one, coloured keywords
FONT = ImageFont.truetype(os.path.join(HERE, "fonts", "Inter-ExtraBold.otf"), 60)
KEY = {"ihn", "vorbei", "falsch", "Gehirn", "Fisher", "verlassen", "Hirnscanner", "Foto", "Sucht", "Belohnung", "Verlangen", "Entzug",
       "Loslassen", "Entscheidung", "Profil", "vorne", "2012", "kontrolliert", "stärker", "schlechter", "abgeschlossen", "Gespräch",
       "Antwort", "vorbei", "Tag", "leiser", "heute", "Kommentare"}
TITLE, TITLE_END = "WARUM DU IHN NICHT VERGISST", 2.6
TITLE_FONT = ImageFont.truetype(os.path.join(HERE, "fonts", "Inter-ExtraBold.otf"), 54)
BIG_HOOK = False                                   # big first sentence at the top: switched off (user: no huge text)
HOOK_END = 0.0
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
    if t < TITLE_END: title_line(im, t)
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


def title_line(im, t):
    """one short title line on a dark pill at the top for the first seconds (not the big full-sentence title)"""
    a = min(1.0, (TITLE_END - t) / 0.3); w = TITLE_FONT.getlength(TITLE); x0, y0 = (W - w) / 2 - 36, 250
    ov = Image.new("RGBA", im.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    d.rounded_rectangle((x0, y0, x0 + w + 72, y0 + 96), 48, fill=(20, 14, 36, int(215 * a)))
    d.text((x0 + 36, y0 + 16), TITLE, font=TITLE_FONT, fill=(255, 205, 90, int(255 * a)))
    im.paste(Image.alpha_composite(im.convert("RGBA"), ov).convert("RGB"))


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
    """the shot at time t with its glow: drawn twice, normally and as the glow mask"""
    a = draw_raw(t, k)
    if not GLOW: return a
    P.MASK["on"] = True
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

