"""'Warum sie wegen einer Tasse explodiert' (Mental Load + Gottman flooding): shots and screen overlays
(HUD badge, rule tags, counters) in our look.

Render with:  SHOTS=shots_tasse python video_v5.py <alignment.csv> <out_dir> <worker> <n_workers> [--preview t1,...]
"""
import math, sys
import video_shots as VB                 # building blocks: sofa, kitchen_both, bg, text_c, ...
import numpy as np
import cairocffi as cairo
from PIL import Image, ImageDraw, ImageFont
from storybook import Pen, shape, ellipse_pts, glow
import character2 as C2

V, A, SF = VB.V, VB.A, VB.SF
W, H, FPS = V.W, V.H, V.FPS
OUTL = V.OUTL
ease, ramp, t_of, DUR = V.ease, V.ramp, V.t_of, V.DUR
breath, blink, bg, text_c, sofa, kitchen_both = V.breath, V.blink, VB.bg, VB.text_c, VB.sofa, VB.kitchen_both
SUB_Y = VB.SUB_Y
ROSE_RGB = (255, 255, 255)
hands_on_phone = VB.hands_on_phone        # replaced by video_v5
FD = V.F_SUB.path.rsplit("/", 1)[0]
def font(name, size): return ImageFont.truetype(f"{FD}/Inter-{name}.otf", size)
GOLD = (230, 184, 92); SAGE = (147, 176, 150); RED = (214, 92, 92); GREY = (170, 172, 190); INK = (16, 16, 22)

def tw(c, x, y, txt, size, col=(1, 1, 1), bold=True, a=1.0):
    c.select_font_face("Inter", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD if bold else cairo.FONT_WEIGHT_NORMAL)
    c.set_font_size(size); c.move_to(x, y); c.set_source_rgba(*col, a); c.show_text(txt)

def rrect(c, x, y, w, h, r):
    c.new_sub_path()
    c.arc(x + w - r, y + r, r, -math.pi / 2, 0); c.arc(x + w - r, y + h - r, r, 0, math.pi / 2)
    c.arc(x + r, y + h - r, r, math.pi / 2, math.pi); c.arc(x + r, y + r, r, math.pi, 1.5 * math.pi); c.close_path()

# ---------------------------------------------------------------- anchors
T = dict(tasse=t_of("in der Spüle"), denkst=t_of("Und du denkst"), aber=t_of("Aber es geht"), kopf=t_of("In ihrem Kopf"),
         arzt=t_of("Der Arzttermin"), geschenk=t_of("Das Geschenk"), essen=t_of("Was es morgen"), rechnung=t_of("Die Rechnung"),
         psych=t_of("Psychologen"), unsichtbar=t_of("die unsichtbare"), tropfen_s=t_of("Und die Tasse"), tropfen=t_of("Tropfen"),
         gottman=t_of("Der Paarforscher"), puls=t_of("Wenn der Puls"), steigt=t_of("steigt"), gehirn=t_of("kann das Gehirn"),
         sinnlos=t_of("Dann ist jedes"), drei=t_of("Deshalb drei"), erstens=t_of("Erstens"), ruhig=t_of("Sag ruhig"), bin_da=t_of("Ich bin da"),
         lass=t_of("Lass uns"), zweitens=t_of("Zweitens"), denn=t_of("Denn genau"), drittens=t_of("Drittens"), komplett=t_of("komplett"),
         nicht_nur=t_of("Nicht nur"), helfer=t_of("Sie braucht keinen"), partner=t_of("Sie braucht einen"), schick=t_of("Schick das"),
         speicher=t_of("Oder speicher"), abend=t_of("an dem eine"))

# ---------------------------------------------------------------- set pieces (cairo, scene coordinates)
def mug(c, x, y, s=1.0, tilt=0.0, col=(0.93, 0.90, 0.84)):
    c.save(); c.translate(x, y); c.rotate(tilt); c.scale(s, s)
    c.arc(70, 0, 46, -1.25, 1.25); c.set_source_rgb(*OUTL); c.set_line_width(26); c.stroke()
    c.arc(70, 0, 46, -1.25, 1.25); c.set_source_rgb(*col); c.set_line_width(16); c.stroke()
    c.move_to(-80, -90); c.line_to(80, -90); c.line_to(72, 90); c.curve_to(40, 110, -40, 110, -72, 90); c.close_path()
    C2.finish(c, col, 5)
    C2.ellipse(c, 0, -90, 80, 20); C2.finish(c, (0.45, 0.32, 0.26), 4)
    c.set_source_rgba(1, 1, 1, 0.35); c.rectangle(-58, -60, 14, 120); c.fill()
    c.restore()

def sink(c, t, push=0.0, dim=0.0):
    bg(c)
    for i in range(7):            # wall tiles
        for j in range(4):
            c.rectangle(60 + i * 140, 300 + j * 120, 132, 112); c.set_source_rgba(1, 1, 1, 0.035 + 0.02 * ((i + j) % 2)); c.fill()
    glow(c, 540, 600, 620, (1.0, 0.72, 0.42), 0.22 * (1 - dim))
    c.save(); c.translate(540, 1000); z = 1 + 0.08 * push; c.scale(z, z); c.translate(-540, -1000)
    shape(c, Pen(3), [(-40, 780), (1120, 780), (1120, 1700), (-40, 1700)], (0.30, 0.25, 0.27), smooth=False, lw=4, line=OUTL)   # counter
    shape(c, Pen(3), [(-40, 780), (1120, 780)], None, line=(0.42, 0.34, 0.34), lw=10, close=False, smooth=False)
    c.save(); rrect(c, 170, 830, 740, 420, 60); C2.finish(c, (0.52, 0.55, 0.62), 5); c.restore()                    # basin rim
    c.save(); rrect(c, 210, 865, 660, 350, 46); C2.finish(c, (0.36, 0.39, 0.46), 4); c.restore()                    # basin
    C2.ellipse(c, 540, 1150, 34, 12); C2.finish(c, (0.20, 0.21, 0.26), 3)                                          # drain
    # tap
    c.move_to(540, 840); c.line_to(540, 640); c.curve_to(540, 560, 700, 560, 700, 640); c.line_to(700, 700)
    c.set_source_rgb(*OUTL); c.set_line_width(44); c.set_line_cap(cairo.LINE_CAP_ROUND); c.stroke()
    c.move_to(540, 840); c.line_to(540, 640); c.curve_to(540, 560, 700, 560, 700, 640); c.line_to(700, 700)
    c.set_source_rgb(0.62, 0.65, 0.72); c.set_line_width(32); c.stroke()
    mug(c, 610, 1060, 1.0, -0.25)
    for k in range(5):            # water drops on the steel
        C2.ellipse(c, 300 + k * 97 % 400, 940 + k * 53 % 220, 9, 6); c.set_source_rgba(0.85, 0.92, 1, 0.5); c.fill()
    c.restore()
    if dim: c.set_source_rgba(0, 0, 0, 0.35 * dim); c.paint()

def lock_phone(c, t, cards, when, time_txt="19:12", hands="w"):
    """lock screen; cards = [(title, sub, rgb)], each appears at when[k]"""
    bg(c)
    px, py, pw, ph = 540, 1000, 560, 1040
    glow(c, px, py, 700, (0.75, 0.85, 1.0), 0.22)
    rrect(c, px - pw / 2, py - ph / 2, pw, ph, 60); C2.finish(c, (0.08, 0.08, 0.11), 5)
    sx, sy, sw, sh = px - pw / 2 + 20, py - ph / 2 + 20, pw - 40, ph - 40
    g = cairo.LinearGradient(0, sy, 0, sy + sh); g.add_color_stop_rgb(0, 0.16, 0.18, 0.30); g.add_color_stop_rgb(1, 0.30, 0.22, 0.30)
    c.save(); rrect(c, sx, sy, sw, sh, 44); c.clip(); c.set_source(g); c.paint(); c.restore()
    text_c(c, "Mittwoch, 15. Oktober", px, sy + 110, 28, (0.9, 0.9, 0.95))
    text_c(c, time_txt, px, sy + 240, 120, (1, 1, 1))
    shown = [k for k in range(len(cards)) if t >= when[k]]
    for n, k in enumerate(reversed(shown)):          # newest on top, older ones slide down
        title, sub, col = cards[k]
        u = ease((t - when[k]) / 0.25)
        nx, nw, nh = sx + 24, sw - 48, 128
        ny = sy + 300 + n * 142 - (1 - u) * 60
        c.save(); rrect(c, nx, ny, nw, nh, 24); c.set_source_rgba(1, 1, 1, 0.86 * u); c.fill(); c.restore()
        c.set_source_rgba(*col, u); c.arc(nx + 52, ny + 50, 26, 0, 2 * math.pi); c.fill()
        tw(c, nx + 96, ny + 50, title, 28, (0.12, 0.12, 0.16), a=u)
        tw(c, nx + 96, ny + 92, sub, 25, (0.25, 0.25, 0.3), bold=False, a=u)
    V.HANDS_CLOSE(c, hands, px, py, pw, ph)

def tasks_phone(c, t):
    bg(c)
    px, py, pw, ph = 540, 1000, 560, 1040
    glow(c, px, py, 700, (0.75, 0.85, 1.0), 0.22)
    rrect(c, px - pw / 2, py - ph / 2, pw, ph, 60); C2.finish(c, (0.08, 0.08, 0.11), 5)
    sx, sy, sw, sh = px - pw / 2 + 20, py - ph / 2 + 20, pw - 40, ph - 40
    c.save(); rrect(c, sx, sy, sw, sh, 44); c.clip(); c.set_source_rgb(0.95, 0.95, 0.97); c.paint()
    c.set_source_rgb(0.30, 0.42, 0.36); c.rectangle(sx, sy, sw, 130); c.fill(); c.restore()
    text_c(c, "Unsere Aufgaben", px, sy + 88, 36, (1, 1, 1))
    sw_t = T["komplett"] + 0.2; u = ease((t - sw_t) / 0.35)
    items = [("Kinderarzt", "Do, 8:30", True), ("Geschenk Mama", "bis Samstag", False), ("Einkaufen", "morgen", False), ("Stromrechnung", "in 2 Tagen", False)]
    for k, (a, b, moving) in enumerate(items):
        y = sy + 170 + k * 150
        c.save(); rrect(c, sx + 22, y, sw - 44, 126, 20); c.set_source_rgb(1, 1, 1); c.fill(); c.restore()
        tw(c, sx + 50, y + 54, a, 30, (0.12, 0.12, 0.16)); tw(c, sx + 50, y + 94, b, 24, (0.45, 0.45, 0.5), bold=False)
        who, col = ("Lena", (0.79, 0.54, 0.57)) if not (moving and u > 0.5) else ("Jonas", (0.58, 0.69, 0.59))
        bx = sx + sw - 170
        sc = 1 + 0.25 * math.sin(math.pi * u) if moving else 1
        c.save(); c.translate(bx + 60, y + 63); c.scale(sc, sc)
        rrect(c, -60, -24, 120, 48, 24); c.set_source_rgb(*col); c.fill()
        tw(c, -42, 10, who, 24, (1, 1, 1)); c.restore()
        if moving and u > 0.5:
            c.set_source_rgb(0.30, 0.62, 0.42); c.arc(sx + sw - 220 - 20, y + 63, 22, 0, 2 * math.pi); c.fill()
            c.set_source_rgb(1, 1, 1); c.set_line_width(6); c.move_to(sx + sw - 250, y + 63); c.line_to(sx + sw - 242, y + 72); c.line_to(sx + sw - 228, y + 54); c.stroke()
    V.HANDS_CLOSE(c, "m", px, py, pw, ph)

def bubble(c, x, y, text, size=46, u=1.0, tail=(-1, 1), crossed=0.0):
    if u <= 0: return
    c.select_font_face("Inter", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD); c.set_font_size(size)
    lines = text.split("\n"); wd = max(c.text_extents(l)[4] for l in lines) + 70; ht = len(lines) * size * 1.25 + 46
    c.save(); c.translate(x, y); c.scale(u, u)
    rrect(c, -wd / 2, -ht / 2, wd, ht, 36); C2.finish(c, (1, 1, 1), 4)
    c.move_to(tail[0] * wd * 0.15, ht / 2 - 4); c.line_to(tail[0] * wd * 0.15 + tail[0] * 40 + tail[1] * 0, ht / 2 + 46); c.line_to(tail[0] * wd * 0.15 + tail[0] * 70, ht / 2 - 4)
    c.set_source_rgb(1, 1, 1); c.fill()
    for i, l in enumerate(lines):
        ex = c.text_extents(l); c.move_to(-ex[4] / 2, -ht / 2 + 23 + size * 1.0 + i * size * 1.25); c.set_source_rgb(0.15, 0.15, 0.2); c.show_text(l)
    if crossed > 0:
        c.set_source_rgba(*[v / 255 for v in RED], 0.95); c.set_line_width(14); c.set_line_cap(cairo.LINE_CAP_ROUND)
        k = min(1, crossed * 2); c.move_to(-wd / 2 + 10, -ht / 2 + 10); c.line_to(-wd / 2 + 10 + (wd - 20) * k, -ht / 2 + 10 + (ht - 20) * k); c.stroke()
        if crossed > 0.5:
            k = (crossed - 0.5) * 2; c.move_to(wd / 2 - 10, -ht / 2 + 10); c.line_to(wd / 2 - 10 - (wd - 20) * k, -ht / 2 + 10 + (ht - 20) * k); c.stroke()
    c.restore()

def building(c, t, t0, t1):
    g = cairo.LinearGradient(0, 0, 0, H); g.add_color_stop_rgb(0, 0.07, 0.08, 0.14); g.add_color_stop_rgb(1, 0.14, 0.13, 0.20)
    c.set_source(g); c.paint()
    z = 1.35 - 0.35 * ease((t - t0) / max(0.1, t1 - t0))          # camera pulls back: from one window to the whole house
    c.save(); c.translate(540, 980); c.scale(z, z); c.translate(-540, -980)
    for k in range(60):
        x, y = (k * 397) % W, (k * 211) % 700
        c.set_source_rgba(1, 1, 1, 0.25 + 0.3 * ((k * 7) % 3) / 2); c.arc(x, y, 1.6, 0, 2 * math.pi); c.fill()
    def block(x0, y0, w, h, dpt, cols, rows, lit, main=False):
        a = dpt * 0.5
        c.move_to(x0 + w, y0); c.line_to(x0 + w + dpt, y0 - a); c.line_to(x0 + w + dpt, y0 + h - a); c.line_to(x0 + w, y0 + h); c.close_path()
        C2.finish(c, (0.13, 0.13, 0.20) if main else (0.10, 0.10, 0.16), 3)
        c.move_to(x0, y0); c.line_to(x0 + dpt, y0 - a); c.line_to(x0 + w + dpt, y0 - a); c.line_to(x0 + w, y0); c.close_path()
        C2.finish(c, (0.22, 0.22, 0.32) if main else (0.16, 0.16, 0.24), 3)
        c.rectangle(x0, y0, w, h); C2.finish(c, (0.19, 0.19, 0.29) if main else (0.14, 0.14, 0.22), 3)
        cw, rh = w / cols, h / rows
        for i in range(rows):
            for j in range(cols):
                wx, wy, ww, wh = x0 + j * cw + cw * 0.18, y0 + i * rh + rh * 0.2, cw * 0.64, rh * 0.6
                kind = lit(i, j)
                c.set_source_rgb(*{"dark": (0.08, 0.08, 0.12), "warm": (0.85, 0.66, 0.40), "cool": (0.30, 0.38, 0.58)}[kind])
                c.rectangle(wx, wy, ww, wh); c.fill()
                if kind == "warm" and main:      # a couple close together in the warm windows
                    for sx_ in (0.42, 0.58):
                        hx, hy = wx + ww * sx_, wy + wh * 0.5
                        c.set_source_rgb(0.30, 0.20, 0.14); c.arc(hx, hy - wh * 0.06, ww * 0.08, 0, 2 * math.pi); c.fill()
                        c.rectangle(hx - ww * 0.1, hy + wh * 0.04, ww * 0.2, wh * 0.5); c.fill()
                c.set_source_rgba(0, 0, 0, 0.35); c.set_line_width(2); c.rectangle(wx, wy, ww, wh); c.stroke()
    rnd = lambda i, j, m: (i * 31 + j * 17 + m) % 7
    block(-80, 820, 260, 1200, 120, 3, 12, lambda i, j: "dark" if rnd(i, j, 1) < 4 else ("warm" if rnd(i, j, 2) < 3 else "cool"))
    block(860, 700, 300, 1300, 120, 3, 13, lambda i, j: "dark" if rnd(i, j, 3) < 4 else ("warm" if rnd(i, j, 4) < 3 else "cool"))
    block(250, 520, 540, 1500, 170, 4, 10, lambda i, j: "warm" if rnd(i, j, 5) < 4 else ("cool" if rnd(i, j, 6) < 3 else "dark"), main=True)
    c.restore()
    g = cairo.LinearGradient(0, 1600, 0, H); g.add_color_stop_rgba(0, 0, 0, 0, 0); g.add_color_stop_rgba(1, 0.04, 0.04, 0.06, 0.9)
    c.set_source(g); c.rectangle(0, 1600, W, H - 1600); c.fill()

def kitchen_noclock(c, pen, hour=19, minute=12, lamp=1.0):
    g = cairo.LinearGradient(0, 0, 0, H); g.add_color_stop_rgb(0, *VB.SA.WALL0); g.add_color_stop_rgb(1, *VB.SA.WALL1)
    c.set_source(g); c.paint()
    shape(c, pen, [(40, 380), (430, 380), (430, 560), (40, 560)], (0.21, 0.23, 0.33), smooth=False, lw=3, line=OUTL)
    shape(c, pen, [(235, 384), (235, 556)], None, lw=3, close=False, smooth=False, line=OUTL)
    shape(c, pen, [(540, 0), (540, 600)], None, lw=3, close=False, smooth=False, line=OUTL)
    shape(c, pen, [(470, 660), (610, 660), (580, 600), (500, 600)], (1.0, 0.70, 0.45), smooth=False, lw=3, line=OUTL)
    glow(c, 540, 700, 620, (1.0, 0.72, 0.42), 0.30 * lamp)
V.kitchen = kitchen_noclock

# ---------------------------------------------------------------- shots
def talk(t, f=9): return 0.45 + 0.45 * abs(math.sin(t * f))
def s_explode(c, t):
    g = math.sin(t * 6.5)
    kitchen_both(c, t, her=dict(phone=0, emo="angry", talk=talk(t, 10), look=(0.9, 0.1), tilt=5 + 2 * g,
                                arm_r=(26 + 8 * g, -112 - 14 * g), arm_l=(10, 30)),
                 him=dict(phone=1))
def s_cup(c, t): sink(c, t, push=ease((t - T["tasse"]) / 2.5))
def s_puzzled(c, t):
    kitchen_both(c, t, her=dict(phone=0, emo="angry", look=(0.9, 0.1), tilt=4), him=dict(phone=0, emo="worried", look=(-0.9, 0.0), tilt=-6))
def s_notcup(c, t): sink(c, t, push=1 + ease((t - T["aber"]) / 2.0), dim=ramp(t, T["aber"] + 0.6, 1.2))
def s_head(c, t):
    kitchen_both(c, t, her=dict(phone=0, emo="worried", look=(-0.2, 0.5), tilt=-3, blink=blink(t, 2.4)), him=dict(phone=1))
def s_lock(c, t):
    lock_phone(c, t, [("Kinderarzt", "Do, 8:30 · Impfung", (0.85, 0.45, 0.45)), ("Geschenk für Mama", "Geburtstag am Samstag", (0.85, 0.66, 0.40)),
                      ("Abendessen morgen?", "Kühlschrank ist fast leer", (0.45, 0.62, 0.50)), ("Stromrechnung", "Fällig in 2 Tagen", (0.45, 0.52, 0.75))],
               [T["arzt"], T["geschenk"], T["essen"], T["rechnung"]])
def s_term(c, t):
    bg(c)
    heap = [(-230, 0), (0, 0), (230, 0), (-115, -66), (115, -66), (0, -132), (-230, -132), (230, -132)]
    for k, (dx, dy) in enumerate(heap):   # the invisible pile of things to think of
        u = ramp(t, T["psych"] + 0.12 * k, 0.3)
        if u <= 0: continue
        c.save(); c.translate(540 + dx, 1150 + dy - 40 * (1 - u)); c.rotate(((k * 37) % 14 - 7) / 100)
        rrect(c, -105, -28, 210, 56, 22); c.set_source_rgba(0.95, 0.95, 0.98, u); c.fill_preserve(); c.set_source_rgba(*OUTL, u); c.set_line_width(3); c.stroke()
        c.select_font_face("Inter", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD); c.set_font_size(24); ex = c.text_extents(THOUGHTS[k])
        c.move_to(-ex[4] / 2, 9); c.set_source_rgba(0.15, 0.15, 0.2, u); c.show_text(THOUGHTS[k]); c.restore()
    glow(c, 540, 600, 420, (1.0, 0.85, 0.6), 0.12)
    text_c(c, "Mental Load", 540, 640, 118, (1, 1, 1), ramp(t, T["psych"] + 0.3))
    text_c(c, "die unsichtbare Arbeit,", 540, 750, 48, (0.80, 0.81, 0.88), ramp(t, T["unsichtbar"]))
    text_c(c, "an alles zu denken", 540, 812, 48, (0.80, 0.81, 0.88), ramp(t, T["unsichtbar"] + 0.5))
def s_drop(c, t):
    bg(c); glow(c, 540, 900, 520, (0.6, 0.75, 1.0), 0.14)
    gx, top, bot, wt, wb = 540, 640, 1160, 330, 260
    hit = T["tropfen"] + 0.15; lt = t - hit
    c.move_to(gx - wt / 2, top); c.line_to(gx + wt / 2, top); c.line_to(gx + wb / 2, bot); c.line_to(gx - wb / 2, bot); c.close_path()
    c.set_source_rgba(0.85, 0.90, 1.0, 0.10); c.fill()
    lvl = top + 14
    c.move_to(gx - wt / 2 + 8, lvl); c.line_to(gx + wt / 2 - 8, lvl); c.line_to(gx + wb / 2 - 6, bot - 6); c.line_to(gx - wb / 2 + 6, bot - 6); c.close_path()
    c.set_source_rgba(0.45, 0.62, 0.90, 0.75); c.fill()
    # meniscus bulge
    C2.ellipse(c, gx, lvl, wt / 2 - 8, 10); c.set_source_rgba(0.60, 0.75, 0.98, 0.9); c.fill()
    c.move_to(gx - wt / 2, top); c.line_to(gx - wb / 2, bot); c.line_to(gx + wb / 2, bot); c.line_to(gx + wt / 2, top)
    c.set_source_rgb(*OUTL); c.set_line_width(6); c.stroke()
    c.move_to(gx - wt / 2, top); c.line_to(gx - wb / 2, bot); c.line_to(gx + wb / 2, bot); c.line_to(gx + wt / 2, top)
    c.set_source_rgba(0.85, 0.90, 1.0, 0.8); c.set_line_width(2.5); c.stroke()
    def drop(x, y, s):
        c.move_to(x, y - 26 * s); c.curve_to(x + 18 * s, y, x + 16 * s, y + 18 * s, x, y + 18 * s); c.curve_to(x - 16 * s, y + 18 * s, x - 18 * s, y, x, y - 26 * s)
        c.set_source_rgb(0.62, 0.78, 1.0); c.fill_preserve(); c.set_source_rgb(*OUTL); c.set_line_width(3); c.stroke()
    if lt < 0:
        u = ease((t - T["tropfen_s"]) / max(0.2, hit - T["tropfen_s"]))
        drop(gx, 300 + (lvl - 300) * u * u, 1.2)
    else:
        for sd in (-1, 1):            # overflow running down both sides
            k = min(1.0, lt / 0.9)
            c.move_to(gx + sd * (wt / 2 - 4), top); c.line_to(gx + sd * (wt / 2 + 6 - (wt - wb) / 2 * k), top + (bot - top) * k)
            c.set_source_rgba(0.55, 0.72, 1.0, 0.9); c.set_line_width(12); c.set_line_cap(cairo.LINE_CAP_ROUND); c.stroke()
        for k in range(6):            # splash
            a = -math.pi / 2 + (k - 2.5) * 0.45; r = 120 * ease(lt / 0.4)
            if lt < 0.9: drop(gx + math.cos(a) * r, lvl + math.sin(a) * r * 0.8 + 200 * max(0, lt - 0.3) ** 2, 0.45)
def s_gottman(c, t):
    bg(c)
    lt = t - T["gottman"]
    text_c(c, "John Gottman", 540, 620, 96, (1, 1, 1), ramp(t, T["gottman"] + 0.1))
    text_c(c, "Paar- und Beziehungsforschung", 540, 700, 42, (0.78, 0.79, 0.86), ramp(t, T["gottman"] + 0.5))
    # heart + ECG line drawing in
    c.save(); c.translate(540, 900); s_ = 1 + 0.06 * math.sin(lt * 7.5); c.scale(s_, s_); V.heart(c, 0, 0, 70)
    c.set_source_rgb(0.85, 0.42, 0.45); c.fill_preserve(); c.set_source_rgb(*OUTL); c.set_line_width(4); c.stroke(); c.restore()
    ecg(c, 120, 1080, 840, 90, lt, 72)
def ecg(c, x0, y0, wdt, amp, lt, bpm, col=(1, 1, 1)):
    per = 60 / bpm; n = 240
    c.move_to(x0, y0)
    for i in range(n + 1):
        x = x0 + wdt * i / n; ph = ((i / n) * 2.2 - lt) / per % 1
        y = y0 - amp * (1.0 if 0.30 < ph < 0.33 else (-0.4 if 0.33 <= ph < 0.36 else (0.15 * math.sin((ph - 0.5) * 12) if 0.5 < ph < 0.76 else 0)))
        c.line_to(x, y)
    c.set_source_rgba(*col, 0.9); c.set_line_width(5); c.set_line_join(cairo.LINE_JOIN_ROUND); c.stroke()
def bpm_at(t):
    u = ease((t - T["puls"]) / max(0.5, T["steigt"] + 0.6 - T["puls"])); return int(74 + 38 * u)
def s_pulse(c, t):
    kitchen_both(c, t, her=dict(phone=0, emo="angry" if bpm_at(t) > 100 else "worried", look=(0.8, 0.1), tilt=4, blink=blink(t, 2.0)), him=dict(phone=0, emo="neutral", talk=talk(t), look=(-0.9, 0)))
def s_noise(c, t):
    g = math.sin(t * 6)
    kitchen_both(c, t, her=dict(phone=0, emo="sad", look=(-0.5, 0.5), tilt=-6), him=dict(phone=0, emo="neutral", talk=talk(t, 11), look=(-0.9, 0), tilt=-4,
                                                                                  arm_l=(30 + 8 * g, -110 - 12 * g), arm_r=(10, 30)))
    fade = ramp(t, T["sinnlos"], 1.0)
    for k, (bx, by) in enumerate(((650, 560), (530, 470), (420, 560))):   # his words dissolve before they reach her
        u = ramp(t, T["gehirn"] + 0.35 * k, 0.3) * (1 - fade)
        if u > 0:
            bubble(c, bx, by, "bla bla", 38, u, (1 if k == 0 else -1, 0))
def s_three(c, t):
    bg(c); glow(c, 540, 760, 420, (1.0, 0.85, 0.6), 0.14)
    u = ease((t - T["drei"]) / 0.3)
    c.save(); c.translate(540, 760); c.scale(0.8 + 0.2 * u, 0.8 + 0.2 * u); text_c(c, "3", 0, 120, 420, (1, 1, 1), u); c.restore()
    text_c(c, "Regeln", 540, 1000, 92, (0.85, 0.86, 0.92), ramp(t, T["drei"] + 0.3))
def s_rule1(c, t):
    kitchen_both(c, t, her=dict(phone=0, emo="sad", look=(-0.3, 0.5), tilt=-4), him=dict(phone=0, emo="calm", look=(-0.8, 0.1), tilt=-3))
def s_iamhere(c, t):
    kitchen_both(c, t, her=dict(phone=0, emo="sad", look=(0.6, 0.3)), him=dict(phone=0, emo="calm", talk=talk(t) if T["bin_da"] - 0.1 < t < T["lass"] - 0.3 else 0, look=(-0.9, 0.1), tilt=-5))
    bubble(c, 690, 640, "Ich bin da.", 32, ease((t - T["bin_da"]) / 0.25), (1, 0))
def s_timer(c, t):
    sofa(c, t, lamp=0.8, her=dict(phone=0, emo="closed", look=(0, 0.2), tilt=3), him=dict(phone=0, emo="calm", look=(-0.6, 0.3), tilt=-3))
def s_rule2(c, t):
    kitchen_both(c, t, her=dict(phone=0, emo="sad", look=(0.6, 0.2)), him=dict(phone=0, emo="neutral", look=(-0.9, 0.1), tilt=-4))
    cr = ramp(t, t_of("fragen können") + 0.4, 0.6)
    bubble(c, 715, 640, "Du hättest doch\nfragen können!", 28, ease((t - T["zweitens"] - 0.5) / 0.25), (1, 0), crossed=cr)
def s_asking(c, t):
    kitchen_both(c, t, her=dict(phone=0, emo="worried", look=(-0.2, 0.5), tilt=-3, blink=blink(t, 2.2)), him=dict(phone=0, emo="calm", look=(-0.8, 0.1)))
def s_rule3(c, t): tasks_phone(c, t)
def s_think(c, t):
    kitchen_both(c, t, her=dict(phone=0, emo="calm", look=(0.5, 0.2)), him=dict(phone=0, emo="calm", look=(0.2, -0.8), tilt=-4))
    u = ease((t - T["nicht_nur"] - 0.2) / 0.3)
    if u > 0:                      # thought cloud with a calendar page
        for k, (x, y, r) in enumerate(((838, 690, 8), (856, 660, 12))):
            C2.ellipse(c, x, y, r * u, r * u); C2.finish(c, (1, 1, 1), 3)
        c.save(); c.translate(890, 590); c.scale(0.62 * u, 0.62 * u)
        for dx, dy, r in ((-90, 0, 70), (0, -30, 85), (90, 0, 70), (0, 40, 80)):
            C2.ellipse(c, dx, dy, r * 1.2, r); c.set_source_rgb(1, 1, 1); c.fill()
        rrect(c, -80, -70, 160, 140, 14); C2.finish(c, (0.97, 0.96, 0.93), 3)
        c.set_source_rgb(0.85, 0.45, 0.45); c.rectangle(-80, -70, 160, 38); c.fill()
        tw(c, -28, -40, "DO", 26, (1, 1, 1)); tw(c, -58, 40, "8:30", 52, (0.15, 0.15, 0.2))
        c.restore()
def s_helper(c, t):
    kitchen_both(c, t, her=dict(phone=0, emo="calm", look=(0.8, 0.1), tilt=3), him=dict(phone=0, mug=True, emo="calm", look=(-0.7, 0.1), tilt=-3,
                                                                                       arm_l=(14, 110), arm_r=(14, 110), fore_k=0.6))
def s_partner(c, t):
    lean = ramp(t, T["partner"] + 0.2, 1.0)
    sofa(c, t, lamp=1.0, lean=lean, him=dict(phone=0, look=(-0.6, 0.6), tilt=-3 + 3 * lean, smile=0.8, blink=False),
         her=dict(phone=0, smile=0.8, sad=0, look=(0.6, 0.4), tilt=8 * lean, blink=lean > 0.8))
def s_house(c, t): building(c, t, T["schick"], T["abend"])
def s_lastcup(c, t): sink(c, t, push=ease((t - T["abend"]) / 3.0), dim=0.2)

# camera presets: (cx, cy, zoom)
WIDE, MED, FACES = VB.WIDE, VB.MED, VB.FACES
HIM_CU = (760, 820, 1.7)
HER_CU = (330, 840, 1.8)
HER_MCU = (360, 900, 1.45)
SHOTS = [
    (0.0, s_explode, MED), (T["tasse"], s_cup, WIDE), (T["denkst"], s_puzzled, HIM_CU), (T["aber"], s_notcup, WIDE),
    (T["kopf"], s_head, HER_MCU), (T["arzt"], s_lock, WIDE), (T["psych"], s_term, WIDE), (T["tropfen_s"], s_drop, WIDE),
    (T["gottman"], s_gottman, WIDE), (T["puls"], s_pulse, HER_CU), (T["gehirn"], s_noise, MED), (T["drei"], s_three, WIDE),
    (T["erstens"], s_rule1, MED), (T["ruhig"], s_iamhere, HIM_CU), (T["lass"], s_timer, WIDE), (T["zweitens"], s_rule2, HIM_CU),
    (T["denn"], s_asking, HER_MCU), (T["drittens"], s_rule3, WIDE), (T["nicht_nur"], s_think, HIM_CU), (T["helfer"], s_helper, MED),
    (T["partner"], s_partner, FACES), (T["schick"], s_house, WIDE), (T["abend"], s_lastcup, WIDE),
]

# ---------------------------------------------------------------- screen overlays (after the look, crisp)
def hud(im, day, sub):
    d = ImageDraw.Draw(im); x, y = 70, 170
    hs = Image.new("RGBA", (60, 60)); hd = ImageDraw.Draw(hs)
    hd.ellipse((6, 10, 30, 34), fill=GOLD); hd.ellipse((26, 10, 50, 34), fill=GOLD); hd.polygon([(8, 27), (48, 27), (28, 50)], fill=GOLD)
    im.paste(hs, (x, y - 4), hs)
    d.text((x + 66, y - 2), day, font=font("Black", 44), fill=(255, 255, 255), stroke_width=5, stroke_fill=INK)
    d.text((x + 68, y + 50), sub, font=font("Bold", 26), fill=GREY, stroke_width=3, stroke_fill=INK)

def rule_tag(im, n, header, u, y=300):
    if u <= 0: return
    layer = Image.new("RGBA", im.size); d = ImageDraw.Draw(layer)
    f = font("Black", 34); tag = f"Regel {n}"; w_ = f.getlength(tag)
    d.rounded_rectangle((540 - w_ / 2 - 22, y, 540 + w_ / 2 + 22, y + 56), 12, fill=GOLD + (255,))
    d.text((540 - w_ / 2, y + 8), tag, font=f, fill=(30, 24, 20))
    f2 = font("Black", 64); w2 = f2.getlength(header)
    d.text((540 - w2 / 2, y + 78), header, font=f2, fill=(255, 255, 255), stroke_width=7, stroke_fill=INK)
    a = layer.split()[3].point(lambda v: int(v * u)); layer.putalpha(a); im.paste(layer, (0, 0), layer)

def ring(im, x, y, r, txt, frac, label, col=RED, big=52):
    d = ImageDraw.Draw(im)
    d.ellipse((x - r - 8, y - r - 8, x + r + 8, y + r + 8), fill=(20, 20, 30))
    d.arc((x - r, y - r, x + r, y + r), 0, 360, fill=(70, 70, 90), width=max(8, r // 7))
    if frac > 0: d.arc((x - r, y - r, x + r, y + r), -90, -90 + 360 * min(1, frac), fill=col, width=max(8, r // 7))
    f = font("Black", big); w_ = f.getlength(txt); d.text((x - w_ / 2, y - big * 0.72), txt, font=f, fill=(255, 255, 255))
    f2 = font("Bold", max(18, big // 2.6)); w_ = f2.getlength(label); d.text((x - w_ / 2, y + big * 0.38), label, font=f2, fill=GREY)

THOUGHTS = ["Kinderarzt", "Geschenk Mama", "Einkaufen", "Elternabend", "Wäsche", "Zahnarzt", "Rechnung", "Kita-Fest",
            "Abendessen", "Turnbeutel", "Handwerker", "Müll raus", "Lisas Geburtstag", "Bank-Termin", "Hausaufgaben",
            "Arzt anrufen", "Urlaub buchen", "Schuhe zu klein", "Katzenfutter", "Oma anrufen"]
SPOTS = [(250, 520), (820, 560), (180, 700), (880, 760), (300, 1120), (780, 1140), (160, 920), (920, 960), (540, 470), (420, 1200),
         (680, 1220), (860, 1060), (220, 1040), (640, 520), (400, 620), (950, 640), (130, 600), (560, 1260), (760, 680), (330, 840)]
def thoughts(im, n, a=1.0, min_y=0):
    layer = Image.new("RGBA", im.size); d = ImageDraw.Draw(layer); f = font("Bold", 28)
    for k in range(min(n, len(THOUGHTS))):
        x, y = SPOTS[k]; txt = THOUGHTS[k]; w_ = f.getlength(txt)
        if y < min_y: continue
        x = max(30 + w_ / 2 + 14, min(1050 - w_ / 2 - 14, x))
        d.rounded_rectangle((x - w_ / 2 - 18, y - 26, x + w_ / 2 + 18, y + 26), 20, fill=(245, 245, 250, 225))
        d.text((x - w_ / 2, y - 17), txt, font=f, fill=(30, 30, 40, 255))
    layer.putalpha(layer.split()[3].point(lambda v: int(v * a))); im.paste(layer, (0, 0), layer)

RULES = [(T["erstens"], T["zweitens"], 1, "Nicht diskutieren"), (T["zweitens"], T["drittens"], 2, "Das nicht sagen"),
         (T["drittens"], T["helfer"], 3, "Ganz übernehmen")]
def overlays(im, t):
    if t >= T["aber"] - 0.2:
        if T["gottman"] <= t < T["drei"]: hud(im, "Studie", "John Gottman")
        elif t >= T["lass"] + 1.2 and t < T["zweitens"]: hud(im, "Mittwoch", "19:32")
        elif t >= T["schick"]: hud(im, "Mittwoch", "23:10")
        else: hud(im, "Mittwoch", "19:12")
    for t0, t1, n, head in RULES:
        if t0 <= t < t1: rule_tag(im, n, head, ease((t - t0) / 0.25))
    if T["kopf"] <= t < T["arzt"]:
        n = int(1 + 19 * ease((t - T["kopf"]) / max(0.5, T["arzt"] - T["kopf"] - 0.4)))
        thoughts(im, n); ring(im, 880, 330, 62, str(n), n / 20, "Gedanken", GOLD)
    if T["denn"] <= t < T["drittens"]:
        thoughts(im, 20, ramp(t, T["denn"], 0.4), min_y=560)
    if T["puls"] <= t < T["drei"]:
        b = bpm_at(t); col = RED if b > 100 else (240, 240, 245)
        if t < T["gehirn"]:
            ring(im, 540, 470, 120, str(b), (b - 60) / 60, "Puls / Minute", col, 96)
        else:
            ring(im, 880, 340, 62, str(b), (b - 60) / 60, "Puls", col)
    if T["lass"] <= t < T["zweitens"]:
        ring(im, 540, 610, 105, "20", ease((t - T["lass"]) / 2.2), "Minuten", SAGE, 92)
    if t >= T["schick"]:
        for x, t0, kind in ((380, T["schick"], "send"), (700, T["speicher"], "save")):
            u = ease((t - t0) / 0.3)
            if u <= 0: continue
            layer = Image.new("RGBA", (220, 220)); d = ImageDraw.Draw(layer)
            d.ellipse((10, 10, 210, 210), fill=(25, 25, 36, 230), outline=GOLD + (255,), width=6)
            if kind == "send": d.polygon([(60, 115), (165, 60), (125, 165), (105, 120)], fill=GOLD + (255,))
            else: d.polygon([(75, 55), (145, 55), (145, 165), (110, 135), (75, 165)], fill=GOLD + (255,))
            sz = int(150 * u); layer = layer.resize((max(1, sz), max(1, sz)))
            im.paste(layer, (x - sz // 2, 420 - sz // 2), layer)

def title(im):
    d = ImageDraw.Draw(im)
    for i, line in enumerate(("Warum sie wegen einer", "Tasse explodiert")):
        f = V.F_TOP; w_ = f.getlength(line)
        d.text((540 - w_ / 2, 220 + i * 92), line, font=f, fill=(255, 255, 255), stroke_width=7, stroke_fill=INK)

def frame(t):
    k = max(i for i, s in enumerate(SHOTS) if s[0] <= t)
    t0, fn, (cx, cy, z) = SHOTS[k]; t1 = SHOTS[k + 1][0] if k + 1 < len(SHOTS) else DUR
    s = cairo.ImageSurface(cairo.FORMAT_RGB24, W, H); c = cairo.Context(s)
    zz = z * (1 + 0.04 * ease((t - t0) / max(0.1, t1 - t0)))
    c.translate(540, 950); c.scale(zz, zz); c.translate(-cx, -cy)
    fn(c, t)
    c.identity_matrix()
    f = min(ease((t - t0) / 0.12) if k else 1.0, ease((t1 - t) / 0.12) if k + 1 < len(SHOTS) else ease((DUR - t) / 0.8))
    if f < 1: c.set_source_rgba(0, 0, 0, 0.7 * (1 - f) if k + 1 < len(SHOTS) else 1 - f); c.paint()
    s.flush()
    arr = np.frombuffer(s.get_data(), np.uint8).reshape(H, W, 4)[:, :, [2, 1, 0]].copy()
    im = Image.fromarray(SF.look(arr, int(t * FPS)))
    if t < T["aber"] - 0.2: title(im)
    overlays(im, t)
    for s0, e0, ws, hl in V.CAPS:
        if s0 - 0.02 <= t < e0:
            V.draw_caption(im, ws, hl, SUB_Y, V.F_SUB, ease((t - s0 + 0.02) / 0.09)); break
    return im
