"""Glow-silhouette style (black figures with golden light, dark room), inspired by the listicle format of kopfgefluester_.
Two layers per frame: `c` = the scene (black silhouettes, dark set), `g` = light (gold elements that glow).
compose() blurs the light layer and adds it on top.
"""
import math
import numpy as np
import cairocffi as cairo
from PIL import Image, ImageFilter

W, H = 1080, 1920
import os
# glow palettes: (main light, bright core, rim on the silhouettes, caption key colour)
PALETTES = {
    "gold": ((1.0, 0.78, 0.32), (1.0, 0.92, 0.62), (0.55, 0.42, 0.18), (255, 228, 60)),
    "rose": ((1.0, 0.42, 0.62), (1.0, 0.78, 0.86), (0.55, 0.22, 0.33), (255, 120, 170)),
    "teal": ((0.25, 0.92, 0.88), (0.75, 1.0, 0.98), (0.12, 0.45, 0.44), (90, 240, 225)),
    "violet": ((0.68, 0.48, 1.0), (0.88, 0.80, 1.0), (0.34, 0.24, 0.55), (190, 150, 255)),
}
PAL = os.environ.get("GLOW_PAL", "gold")
GOLD, GOLD_L, RIM, KEY_RGB = PALETTES[PAL]
INK = (0.02, 0.02, 0.025)


def surfaces():
    s = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H); g = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H)
    return s, cairo.Context(s), g, cairo.Context(g)


def room(c, floor_y=1380, warm=0.0):
    gr = cairo.LinearGradient(0, 0, 0, H)
    gr.add_color_stop_rgb(0, 0.03, 0.03, 0.035); gr.add_color_stop_rgb(floor_y / H, 0.09 + warm * 0.05, 0.085 + warm * 0.035, 0.08)
    gr.add_color_stop_rgb(1, 0.05, 0.05, 0.05); c.set_source(gr); c.paint()
    c.set_source_rgba(0.16, 0.15, 0.13, 1); c.rectangle(0, floor_y, W, 4); c.fill()


def spot(c, x, y, r, a=0.35, col=GOLD):
    gr = cairo.RadialGradient(x, y, 0, x, y, r); gr.add_color_stop_rgba(0, *col, a); gr.add_color_stop_rgba(1, *col, 0)
    c.set_source(gr); c.arc(x, y, r, 0, 2 * math.pi); c.fill()


def limb(c, pts, w, col=INK, rim=None):
    c.set_line_cap(cairo.LINE_CAP_ROUND); c.set_line_join(cairo.LINE_JOIN_ROUND)
    c.move_to(*pts[0])
    for p in pts[1:]: c.line_to(*p)
    if rim: c.set_source_rgba(*rim, 0.8); c.set_line_width(w + 5); c.stroke_preserve()
    c.set_source_rgb(*col); c.set_line_width(w); c.stroke()


def P(a, L, ang):
    return (a[0] + L * math.sin(ang), a[1] + L * math.cos(ang))


def figure(c, g, x, y, s, her=False, mood="neutral", arms=((0.15, 0.1), (-0.15, -0.1)), legs=((0.08, 0), (-0.08, 0)),
           heart=0.0, look=0.0, blink=False, lean=0.0, head_tilt=0.0, phone=0.0, rim=True):
    """stick silhouette. (x, y) = feet. s = scale (1 = 1.6 m tall on screen ~ 820 px). angles in radians from straight down."""
    leg, torso, arm, hr = 210 * s, 250 * s, 175 * s, 72 * s
    hip = (x, y - 2 * leg)
    neck = (hip[0] + math.sin(lean) * torso, hip[1] - math.cos(lean) * torso)
    rc = RIM if rim else None
    for a1, a2 in legs:
        k = P(hip, leg, a1); f = P(k, leg, a1 + a2); limb(c, [hip, k, f], 26 * s, rim=rc)
    if her:   # simple dress silhouette
        c.move_to(neck[0] - 32 * s, neck[1] + 20 * s); c.line_to(neck[0] + 32 * s, neck[1] + 20 * s)
        c.line_to(hip[0] + 78 * s, hip[1] + 120 * s); c.line_to(hip[0] - 78 * s, hip[1] + 120 * s); c.close_path()
        if rc: c.set_source_rgba(*rc, 0.8); c.set_line_width(5); c.stroke_preserve()
        c.set_source_rgb(*INK); c.fill()
    limb(c, [hip, neck], 34 * s, rim=rc)
    sh = (neck[0], neck[1] + 16 * s); hands = []
    for a1, a2 in arms:
        e = P(sh, arm, a1); h = P(e, arm, a1 + a2); limb(c, [sh, e, h], 22 * s, rim=rc); hands.append(h)
    hc = (neck[0] + math.sin(lean + head_tilt) * (hr + 8 * s), neck[1] - math.cos(lean + head_tilt) * (hr + 8 * s))
    if rc: c.set_source_rgba(*rc, 0.85); c.arc(*hc, hr + 3, 0, 2 * math.pi); c.fill()
    c.set_source_rgb(*INK); c.arc(*hc, hr, 0, 2 * math.pi); c.fill()
    if her:   # bun
        c.arc(hc[0] + 18 * s, hc[1] - hr * 0.95, hr * 0.38, 0, 2 * math.pi); c.fill()
    face(c, g, hc, hr, mood, look, blink)
    if heart > 0:
        hx, hy = neck[0] + (hip[0] - neck[0]) * 0.28, neck[1] + (hip[1] - neck[1]) * 0.28
        hs_ = 64 * s * (0.9 + 0.1 * heart)
        spot(c, hx, hy, 260 * s, 0.35 * heart)
        heart_shape(g, hx, hy, hs_, GOLD_L, heart)
        heart_shape(c, hx, hy, hs_, GOLD, heart)
    if phone > 0:
        px, py = hands[1]
        c.set_source_rgb(0.05, 0.05, 0.06); rr(c, px - 30 * s, py - 52 * s, 60 * s, 100 * s, 10 * s); c.fill()
        g.set_source_rgba(*GOLD_L, 0.9 * phone); rr(g, px - 24 * s, py - 46 * s, 48 * s, 88 * s, 7 * s); g.fill()
        spot(c, px, py - 40 * s, 230 * s, 0.32 * phone)
    return {"head": hc, "hr": hr, "hands": hands, "neck": neck, "hip": hip}


def face(c, g, hc, r, mood, look=0.0, blink=False):
    x, y = hc[0] + look * r * 0.25, hc[1]
    c.set_source_rgb(*(v * 0.7 for v in GOLD)); c.set_line_width(max(2.5, r * 0.06)); c.set_line_cap(cairo.LINE_CAP_ROUND)
    for s in (-1, 1):
        ex = x + s * r * 0.33
        if blink: c.move_to(ex - r * 0.1, y - r * 0.05); c.line_to(ex + r * 0.1, y - r * 0.05); c.stroke()
        else: c.arc(ex, y - r * 0.06, r * 0.075, 0, 2 * math.pi); c.fill()
        if mood in ("sad", "worried"): c.move_to(ex - s * r * 0.18, y - r * 0.38); c.line_to(ex + s * r * 0.1, y - r * 0.28); c.stroke()
        if mood == "angry": c.move_to(ex - s * r * 0.18, y - r * 0.3); c.line_to(ex + s * r * 0.12, y - r * 0.22); c.stroke()
    if mood == "smile": c.arc(x, y + r * 0.18, r * 0.25, 0.2 * math.pi, 0.8 * math.pi); c.stroke()
    elif mood in ("sad", "worried"): c.arc(x, y + r * 0.5, r * 0.22, 1.2 * math.pi, 1.8 * math.pi); c.stroke()
    else: c.move_to(x - r * 0.14, y + r * 0.32); c.line_to(x + r * 0.14, y + r * 0.32); c.stroke()


def heart_shape(c, x, y, s, col, a=1.0):
    c.save(); c.translate(x, y); c.scale(s / 30, s / 30)
    c.move_to(0, 10); c.curve_to(-30, -12, -14, -34, 0, -16); c.curve_to(14, -34, 30, -12, 0, 10); c.close_path()
    c.restore(); c.set_source_rgba(*col, a); c.fill()


def rr(c, x, y, w, h, r):
    c.new_sub_path(); c.arc(x + w - r, y + r, r, -math.pi / 2, 0); c.arc(x + w - r, y + h - r, r, 0, math.pi / 2)
    c.arc(x + r, y + h - r, r, math.pi / 2, math.pi); c.arc(x + r, y + r, r, math.pi, 1.5 * math.pi); c.close_path()


def particles(g, t, x, y, R, n=14, a=0.8, seed=0):
    rng = np.random.default_rng(seed)
    ang = rng.uniform(0, 2 * math.pi, n); rad = rng.uniform(0.3, 1.0, n) * R; sp = rng.uniform(0.3, 1.0, n); ph = rng.uniform(0, 6, n)
    for i in range(n):
        yy = y + rad[i] * math.sin(ang[i]) - ((t * 40 * sp[i]) % (R * 0.6))
        xx = x + rad[i] * math.cos(ang[i]) + 8 * math.sin(t * 1.5 + ph[i])
        g.set_source_rgba(*GOLD_L, a * (0.5 + 0.5 * math.sin(t * 3 + ph[i]))); g.arc(xx, yy, 3 + 3 * sp[i], 0, 2 * math.pi); g.fill()


def compose(s, g, glow_px=26, strength=1.25):
    """scene + blurred light layer + sharp light layer -> PIL RGB"""
    sc = np.frombuffer(s.get_data(), np.uint8).reshape(H, W, 4)[..., [2, 1, 0]].astype(np.float32)
    li = np.frombuffer(g.get_data(), np.uint8).reshape(H, W, 4)
    lrgb = li[..., [2, 1, 0]].astype(np.float32)
    small = Image.fromarray(lrgb.astype(np.uint8)).resize((W // 4, H // 4), Image.BILINEAR).filter(ImageFilter.GaussianBlur(glow_px / 4))
    blur = np.asarray(small.resize((W, H), Image.BILINEAR)).astype(np.float32)
    small2 = Image.fromarray(lrgb.astype(np.uint8)).resize((W // 8, H // 8), Image.BILINEAR).filter(ImageFilter.GaussianBlur(glow_px / 3))
    blur2 = np.asarray(small2.resize((W, H), Image.BILINEAR)).astype(np.float32)
    a = li[..., 3:4].astype(np.float32) / 255
    out = sc * (1 - a) + lrgb + blur * strength + blur2 * strength * 0.8
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


def frames_wall(c, g, xs, y, s=1.0):
    """picture frames on the wall with a dim silhouette inside"""
    for i, x in enumerate(xs):
        w, h = 120 * s, 150 * s
        c.set_source_rgb(0.13, 0.12, 0.11); rr(c, x - w / 2, y, w, h, 6); c.fill()
        c.set_source_rgb(0.2, 0.18, 0.15); rr(c, x - w / 2 + 10, y + 10, w - 20, h - 20, 4); c.fill()
        c.set_source_rgb(0.05, 0.05, 0.05); c.arc(x, y + h * 0.42, 18 * s, 0, 2 * math.pi); c.fill()
        c.rectangle(x - 22 * s, y + h * 0.55, 44 * s, h * 0.35 - 10); c.fill()


def bed(c, x, y, w=620, s=1.0):
    """dark bed silhouette, (x, y) = left end of the mattress top"""
    c.set_source_rgb(0.07, 0.07, 0.075); rr(c, x, y, w, 110 * s, 24); c.fill()
    c.set_source_rgb(0.11, 0.105, 0.1); rr(c, x + 10, y - 30 * s, 170 * s, 50 * s, 22); c.fill()
    c.set_source_rgb(0.05, 0.05, 0.055); rr(c, x - 30, y - 210 * s, 40, 320 * s, 14); c.fill()
    c.rectangle(x + 20, y + 110 * s, 22, 60 * s); c.rectangle(x + w - 42, y + 110 * s, 22, 60 * s); c.fill()


def thought(g, x, y, s, a=1.0):
    for dx, dy, r in ((0, 0, 80), (-80, 20, 58), (80, 18, 62), (-40, -40, 60), (45, -45, 64), (-120, 90, 14), (-150, 130, 9)):
        g.set_source_rgba(*GOLD_L, 0.85 * a); g.arc(x + dx * s, y + dy * s, r * s, 0, 2 * math.pi); g.fill()
