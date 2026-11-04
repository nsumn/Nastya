"""Video 02 'Je lauter sie wird, desto stiller wird er' in the paper cut-out style (design A).
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

W, H, FPS, SR = 1080, 1920, 30, 44100
rows = list(csv.DictReader(open(os.path.join(HERE, "voice", "alignment.csv"), encoding="utf-8")))
CH = "".join(r["char"] for r in rows); ST = [float(r["start"]) for r in rows]; EN = [float(r["end"]) for r in rows]
DUR = EN[-1] + 1.3


def t_of(p, nth=0):
    i = -1
    for _ in range(nth + 1): i = CH.find(p, i + 1)
    assert i >= 0, p; return ST[i]


def ease(u): u = max(0.0, min(1.0, u)); return u * u * (3 - 2 * u)
def pop(t, t0, d=0.35):
    """0..1 with a small overshoot (paper popping in)"""
    u = max(0.0, min(1.0, (t - t0) / d)); return 1 + 1.70158 * (u - 1) ** 3 + 1.0 * 1.70158 * (u - 1) ** 2 if u < 1 else 1.0
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
def sh_hook(c, t):
    kitchen(c, t); t0 = 0
    P.person(c, True, 330, 760, 105, "shout", talk(t), arms=("hip", "up"), breath=breath(t), tilt=4 * math.sin(t * 5))
    P.person(c, False, 760, 740, 112, "neutral", blink=blink(t), look=-0.3, arms=("cross", "cross"))
    for k, (x, y) in enumerate(((470, 620), (560, 520), (440, 470))):
        P.bubble(c, x, y, 150, 90, "!" * (k + 1), 60, pop(t, 0.3 + 0.5 * k), spiky=True, col=P.ROSE)
def sh_him_quiet(c, t):
    kitchen(c, t); t0 = t_of("desto stiller")
    z = 1 + 0.25 * ease((t - t0) / 1.2); c.translate(760, 800); c.scale(z, z); c.translate(-760, -800)
    P.person(c, False, 760, 740, 112, "neutral", blink=blink(t), look=-0.2, arms=("cross", "cross"), tilt=-4)
    for i in range(3):        # little dots: he says nothing
        P.paper(c, lambda c, i=i: P.ell(c, 900 + i * 40, 560 - i * 20, 10, 10), P.CREAM, 1.3, ease((t - t0 - 0.3 - 0.25 * i) / 0.2))
def sh_her_louder(c, t):
    kitchen(c, t); t0 = t_of("Und je stiller")
    z = 1 + 0.2 * ease((t - t0) / 2.0); c.translate(330, 800); c.scale(z, z); c.translate(-330, -800)
    P.person(c, True, 330, 760, 105, "shout", talk(t), arms=("up", "up"), breath=breath(t), tilt=5 * math.sin(t * 6))
    for k in range(4):
        P.bubble(c, 520 + 70 * k, 560 - 70 * k, 140 + 30 * k, 90 + 15 * k, "!" * (k + 1), 50 + 8 * k, pop(t, t0 + 0.35 * k), spiky=True, col=P.ROSE)
def sh_term(c, t):
    t0 = t_of("In der Psychologie"); term_card(c, t, t0, "", P.ROSE); loop_arrows(c, t, t0 + 0.6)
    P.person(c, True, 430, 1070, 52, "angry", talk(t), arms=("down", "up"), depth=1.3)
    P.person(c, False, 650, 1070, 56, "neutral", blink=blink(t), arms=("cross", "cross"), depth=1.3)
def sh_friendly(c, t):
    living(c, t); sofa(c); t0 = t_of("Am Anfang")
    P.person(c, True, 330, 880, 95, "smile", talk(t, 9), sit=True, arms=("down", "forward"), breath=breath(t), tilt=6)
    P.person(c, False, 740, 870, 100, "neutral", blink=blink(t), sit=True, arms=("phone", "phone"), phone=True, look=0.2)
    P.paper(c, lambda c: P.heart(c, 470, 700 - 40 * ease((t - t0) / 1.5), 26), P.ROSE, 1.4, ease((t - t0) / 0.4))
def sh_twice(c, t):
    living(c, t); t0 = t_of("Dann sagt sie es zweimal")
    for k in range(2):
        P.bubble(c, 330 + 420 * k, 760 + 60 * k, 380, 130, "Kannst du bitte …?", 38, pop(t, t0 + 0.3 * k), tail=1 if k else -1)
    P.paper(c, lambda c: P.ell(c, 540, 1240, 160, 160), P.CREAM, 1.2, pop(t, t0 + 0.2))
    c.select_font_face("Inter", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD); c.set_font_size(170); c.set_source_rgba(*P.INK, pop(t, t0 + 0.2))
    c.move_to(470, 1300); c.show_text("2×")
def sh_tenfold(c, t):
    living(c, t); t0 = t_of("Dann zehnmal")
    for k in range(10):
        x = 230 + (k % 3) * 310 + (k // 3 % 2) * 60; y = 470 + (k // 3) * 220
        P.bubble(c, x, y, 330, 110, "Kannst du bitte …?", 32, pop(t, t0 + 0.09 * k), tail=-1 if k % 2 else 1)
    n = min(10, 2 + int(8 * ease((t - t0) / 0.9)))
    P.paper(c, lambda c: P.ell(c, 540, 1420, 170, 170), P.ROSE, 1.3)
    c.select_font_face("Inter", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD); c.set_font_size(150); c.set_source_rgb(*P.INK)
    e = c.text_extents(f"{n}×"); c.move_to(540 - e[4] / 2, 1475); c.show_text(f"{n}×")
def sh_reproach(c, t):
    kitchen(c, t); t0 = t_of("Irgendwann klingt")
    u = ease((t - t0 - 0.6) / 0.5)
    P.person(c, True, 330, 760, 105, "angry" if u > 0.5 else "neutral", talk(t), arms=("hip", "forward"), breath=breath(t))
    P.person(c, False, 760, 740, 112, "sad" if u > 0.5 else "neutral", blink=blink(t), arms=("down", "down"), tilt=-6 * u)
    P.bubble(c, 540, 560, 380, 130, "Bitte …" if u < 0.5 else "Immer ich!", 48, pop(t, t0 + 0.2), spiky=u > 0.5, col=P.CREAM if u < 0.5 else P.ROSE)
def sh_criticism(c, t):
    kitchen(c, t); t0 = t_of("Er hört nur")
    back = ease((t - t0 - 1.0) / 0.8)
    P.person(c, False, 700 + 120 * back, 740, 112 * (1 - 0.15 * back), "sad", blink=blink(t), arms=("cross", "cross"), tilt=-8)
    for k, (x, y) in enumerate(((480, 520), (380, 700), (520, 880))):
        P.bubble(c, x, y, 220, 90, "Kritik", 40, pop(t, t0 + 0.2 + 0.25 * k), spiky=True, col=P.ROSE)
def sh_phone(c, t):
    living(c, t, 0.6); sofa(c); t0 = t_of("Er schaut")
    z = 1 + 0.3 * ease((t - t0) / 1.4); c.translate(740, 1000); c.scale(z, z); c.translate(-740, -1000)
    P.person(c, True, 330, 880, 95, "sad", sit=True, arms=("down", "down"), look=0.6, blink=blink(t))
    P.person(c, False, 740, 870, 100, "neutral", blink=blink(t), sit=True, arms=("phone", "phone"), phone=True, look=0.2)
def sh_garage(c, t):
    P.background(c); t0 = t_of("Er geht in")
    P.paper(c, lambda c: P.rrect(c, 160, 600, 760, 900, 30), (0.30, 0.27, 0.42), 1.0)
    door = ease((t - t0 - 0.6) / 0.8)
    x = 540 - 260 * ease((t - t0) / 1.0)
    P.person(c, False, x, 860, 95, "neutral", arms=("down", "down"), look=-0.6)
    P.paper(c, lambda c: P.rrect(c, 200, 640, 680 * door, 820, 20), (0.45, 0.40, 0.55), 1.2)
    for k in range(int(8 * door)): P.paper(c, lambda c, k=k: P.rrect(c, 220, 680 + k * 95, 640 * door, 8, 4), (0.35, 0.30, 0.45), 1.25)
def sh_says(c, t):
    kitchen(c, t); t0 = t_of("Er sagt")
    P.person(c, False, 700, 740, 112, "neutral", talk(t) if t < t_of("Und meint") - 0.3 else 0, blink=blink(t), arms=("cross", "cross"), look=-0.4)
    P.person(c, True, 280, 790, 95, "sad", blink=blink(t, 2.7), arms=("down", "down"), look=0.5)
    P.bubble(c, 600, 560, 520, 150, "Ich habe keine Lust\nauf Streit.", 38, pop(t, t0 + 0.3), tail=1)
def sh_means(c, t):
    kitchen(c, t); t0 = t_of("Und meint")
    z = 1 + 0.25 * ease((t - t0) / 1.4); c.translate(700, 800); c.scale(z, z); c.translate(-700, -800)
    P.person(c, False, 700, 740, 112, "neutral", blink=blink(t), arms=("cross", "cross"), look=0.6, tilt=6)
    P.bubble(c, 600, 560, 520, 150, "Lass mich in Ruhe.", 42, pop(t, t0 + 0.3), tail=1, spiky=True, col=(0.62, 0.78, 1.0))
def sh_unseen(c, t):
    P.background(c); t0 = t_of("Und sie fühlt")
    P.paper(c, lambda c: P.rrect(c, 220, 420, 640, 760, 40), (0.20, 0.22, 0.40), 0.7)      # big window with rain
    for k in range(40):
        x = 240 + (k * 97) % 600; y = 440 + ((k * 151) + t * 700) % 720
        c.set_source_rgba(0.75, 0.85, 1.0, 0.45); c.set_line_width(4); c.move_to(x, y); c.line_to(x - 6, y + 40); c.stroke()
    P.person(c, True, 540, 1060, 120, "sad", blink=blink(t, 2.6), arms=("cross", "cross"), tilt=-6, breath=breath(t))
def sh_louder2(c, t):
    kitchen(c, t); t0 = t_of("Also wird sie")
    P.person(c, True, 330, 760, 115, "shout", talk(t), arms=("up", "up"), breath=breath(t), tilt=6 * math.sin(t * 7))
    P.person(c, False, 790, 760, 100, "neutral", blink=blink(t), arms=("cross", "cross"), look=0.7)
    for k in range(5): P.bubble(c, 500 + 80 * k, 600 - 80 * k, 130 + 25 * k, 90 + 12 * k, "!" * (k % 3 + 1), 50, pop(t, t0 + 0.2 * k), spiky=True, col=P.ROSE)
def sh_circle(c, t):
    t0 = t_of("Und der Kreis"); term_card(c, t, t0, "", P.ROSE); loop_arrows(c, t, t0, 3.0)
    P.person(c, True, 430, 1070, 52, "angry", talk(t), arms=("down", "up"), depth=1.3)
    P.person(c, False, 650, 1070, 56, "sad", blink=blink(t), arms=("cross", "cross"), depth=1.3)
def sh_outside(c, t):
    t0 = t_of("Von außen"); z = 1.25 - 0.25 * ease((t - t0) / 2.4)
    c.translate(540, 1200); c.scale(z, z); c.translate(-540, -1200)
    house(c, t)
    P.bubble(c, 540, 830, 230, 110, "!!!", 60, pop(t, t0 + 0.6), spiky=True, col=P.ROSE)
def sh_fights(c, t):
    living(c, t, 0.5); t0 = t_of("Doch in Wahrheit")
    reach = ease((t - t0 - 0.2) / 0.8)
    P.person(c, True, 300, 800, 105, "sad", blink=blink(t), arms=("down", "reach" if reach > 0.3 else "down"), look=0.7, tilt=8 * reach)
    P.person(c, False, 790, 790, 112, "neutral", blink=blink(t), arms=("cross", "cross"), look=0.6)
    P.paper(c, lambda c: P.heart(c, 560, 640 - 30 * math.sin(t * 2), 34), P.ROSE, 1.4, ease((t - t0 - 0.6) / 0.4))
def sh_torn(c, t):
    P.background(c); t0 = t_of("Jeder Streit")
    gap = 120 * ease((t - t0) / 0.8)
    for s in (-1, 1):
        c.save(); c.translate(s * gap / 2, 0)
        c.rectangle(0 if s < 0 else 540, 0, 540, 1920); c.clip()
        P.paper(c, lambda c: P.heart(c, 540, 1000, 240), P.ROSE, 1.3)
        c.restore()
    reach = ease((t - t0 - 0.8) / 1.2)
    P.person(c, True, 300 - 0 * reach, 1400, 70, "sad", arms=("down", "reach"), look=0.6, depth=1.4)
def sh_silent(c, t):
    t0 = t_of("Und irgendwann wird"); house(c, t, 1 - ease((t - t0 - 0.5) / 1.5))
    for i in range(3): P.paper(c, lambda c, i=i: P.ell(c, 860 + 30 * i, 820 - 40 * i, 8 + 3 * i, 8 + 3 * i), P.CREAM, 1.2, ease((t - t0 - 1.0 - 0.3 * i) / 0.3))
def sh_loud_ok(c, t):
    kitchen(c, t); t0 = t_of("Gefährlich wird es nicht")
    P.person(c, True, 540, 820, 120, "shout", talk(t), arms=("hip", "up"), breath=breath(t), tilt=4 * math.sin(t * 6))
    P.paper(c, lambda c: P.ell(c, 860, 520, 70, 70), (0.62, 0.78, 0.64), 1.4, pop(t, t0 + 0.6))
    c.set_source_rgba(1, 1, 1, pop(t, t0 + 0.6)); c.set_line_width(14); c.set_line_cap(cairo.LINE_CAP_ROUND)
    c.move_to(825, 520); c.line_to(852, 548); c.line_to(900, 495); c.stroke()
def sh_quiet(c, t):
    living(c, t, 0.3); sofa(c); t0 = t_of("Gefährlich wird es, wenn")
    P.person(c, True, 540, 880, 110, "empty", sit=True, arms=("down", "down"), breath=0.3 * breath(t))
    P.paper(c, lambda c: P.ell(c, 860, 520, 70, 70), P.ROSE, 1.4, pop(t, t0 + 1.0))
    c.set_source_rgba(1, 1, 1, pop(t, t0 + 1.0)); c.set_line_width(14); c.set_line_cap(cairo.LINE_CAP_ROUND)
    c.move_to(835, 545); c.line_to(885, 495); c.move_to(835, 495); c.line_to(885, 545); c.stroke()
def sh_bed(c, t):
    bed(c, t); t0 = t_of("Denn eine Frau")
    P.head(c, True, 360, 1030, 95, "empty", look=-0.4)
    P.head(c, False, 720, 1030, 100, "calm")
    duvet(c, 10 * math.sin(t * 1.5))
def sh_hope(c, t):
    P.background(c, (0.08, 0.09, 0.18), (0.13, 0.12, 0.22)); t0 = t_of("Sie hat nur")
    P.paper(c, lambda c: P.ell(c, 820, 560, 70, 70), P.MOON, 0.6)
    P.person(c, True, 540, 1060, 110, "sad", blink=blink(t, 2.4), arms=("cross", "cross"), tilt=-8)
    fade = 1 - ease((t - t0 - 0.4) / 1.6)
    P.paper(c, lambda c: P.heart(c, 540, 690 - 60 * (1 - fade), 40), P.ROSE, 1.3, fade)

SHOTS = [(0.0, sh_hook), (t_of("desto stiller") - 0.1, sh_him_quiet), (t_of("Und je stiller"), sh_her_louder), (t_of("In der Psychologie"), sh_term),
         (t_of("Am Anfang"), sh_friendly), (t_of("Dann sagt sie es zweimal"), sh_twice), (t_of("Dann zehnmal"), sh_tenfold), (t_of("Irgendwann klingt"), sh_reproach),
         (t_of("Er hört nur"), sh_criticism), (t_of("Er schaut"), sh_phone), (t_of("Er geht in"), sh_garage), (t_of("Er sagt"), sh_says),
         (t_of("Und meint"), sh_means), (t_of("Und sie fühlt"), sh_unseen), (t_of("Also wird sie"), sh_louder2), (t_of("Und der Kreis"), sh_circle),
         (t_of("Von außen"), sh_outside), (t_of("Doch in Wahrheit"), sh_fights), (t_of("Jeder Streit"), sh_torn), (t_of("Und irgendwann wird"), sh_silent),
         (t_of("Gefährlich wird es nicht"), sh_loud_ok), (t_of("Gefährlich wird es, wenn"), sh_quiet), (t_of("Denn eine Frau"), sh_bed), (t_of("Sie hat nur"), sh_hope)]
STARTS = [s for s, _ in SHOTS]
XF = 0.25                                                                     # cross-fade length

# ---------------------------------------------------------------- words one by one, coloured keywords
FONT = ImageFont.truetype(os.path.join(HERE, "fonts", "Inter-ExtraBold.otf"), 62)
KEY = {"lauter", "stiller", "Forderungs-Rückzugs-Muster", "freundlich", "zweimal", "zehnmal", "Vorwurf", "Kritik", "Handy", "Garage", "Streit",
       "Ruhe", "gesehen", "Kreis", "meckert", "Nähe", "wiederzufinden", "still", "laut", "ruhig", "zufrieden", "hoffen"}
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
    for k, t0 in enumerate(STARTS):                    # a soft chord on every picture change + a plucked note on the beat
        for j, n in enumerate(prog[(k // 2) % 4]):
            x = note(hz(n), 3.0, 0.32 if j else 0.45); i = int((t0 + 0.04 * j) * SR); out[i:i + len(x)] += x[: max(0, N - i)]
    ir = np.random.default_rng(3).standard_normal(int(1.8 * SR)) * np.exp(-np.arange(int(1.8 * SR)) / SR * 3.5)
    L = len(out) + len(ir); wet = np.fft.irfft(np.fft.rfft(out, L) * np.fft.rfft(ir, L), L)[: len(out)]
    mix = 0.65 * out / (np.abs(out).max() + 1e-9) + 0.35 * wet / (np.abs(wet).max() + 1e-9)
    mix *= np.clip((DUR - np.arange(N) / SR) / 1.5, 0, 1)
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
