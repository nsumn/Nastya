"""Paper cut-out style (design A): layered paper shapes with soft drop shadows, paper grain, night palette.
Characters: her pink with shoulder-length hair, him blue with short hair; heads + rounded sweater bodies, simple arms.
Every shape is drawn with paper(c, path_fn, colour, depth): shadow first, then the fill. 'depth' moves with the camera
(parallax) and makes the shadow bigger, so near layers look lifted off the page."""
import math
import numpy as np
import cairocffi as cairo

W, H = 1080, 1920
NIGHT0, NIGHT1 = (0.12, 0.13, 0.27), (0.20, 0.17, 0.30)
CREAM, MOON = (0.96, 0.91, 0.86), (0.98, 0.90, 0.72)
PINK, PINK_D, PINK_H = (0.93, 0.55, 0.68), (0.80, 0.42, 0.55), (0.55, 0.22, 0.36)
BLUE, BLUE_D, BLUE_H = (0.45, 0.65, 0.95), (0.33, 0.50, 0.82), (0.22, 0.30, 0.55)
INK = (0.15, 0.10, 0.18)
LILAC, PLUM, ROSE, SAGE, WOOD = (0.85, 0.80, 0.86), (0.26, 0.24, 0.40), (1.0, 0.68, 0.76), (0.62, 0.74, 0.64), (0.55, 0.40, 0.36)

CAM = {"dx": 0.0}            # set per frame by the shot: horizontal camera drift, used for parallax


def paper(c, path_fn, col, depth=1.0, alpha=1.0):
    """shadow (soft: 3 offset copies) + fill. path_fn(c) builds the path."""
    off = CAM["dx"] * (depth - 1.0) * 0.6
    c.save(); c.translate(off, 0)
    for k, (dx, dy, a) in enumerate(((3, 6, 0.10), (6, 11, 0.08), (10, 17, 0.05))):
        c.save(); c.translate(dx * depth, dy * depth); path_fn(c); c.set_source_rgba(0.02, 0.0, 0.05, a * alpha); c.fill(); c.restore()
    path_fn(c); c.set_source_rgba(*col, alpha); c.fill()
    c.restore()


def ell(c, x, y, rx, ry, rot=0.0):
    rx, ry = max(rx, 1e-3), max(ry, 1e-3)                    # a pop-in starts at size 0: keep the matrix invertible
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(rx, ry); c.arc(0, 0, 1, 0, 2 * math.pi); c.restore()


def rrect(c, x, y, w, h, r):
    c.new_sub_path(); c.arc(x + w - r, y + r, r, -math.pi / 2, 0); c.arc(x + w - r, y + h - r, r, 0, math.pi / 2)
    c.arc(x + r, y + h - r, r, math.pi / 2, math.pi); c.arc(x + r, y + r, r, math.pi, 1.5 * math.pi); c.close_path()


def capsule(c, p0, p1, r):
    (x0, y0), (x1, y1) = p0, p1; a = math.atan2(y1 - y0, x1 - x0)
    c.new_sub_path(); c.arc(x0, y0, r, a + math.pi / 2, a + 3 * math.pi / 2); c.arc(x1, y1, r, a - math.pi / 2, a + math.pi / 2); c.close_path()


def background(c, top=NIGHT0, bottom=NIGHT1):
    g = cairo.LinearGradient(0, 0, 0, H); g.add_color_stop_rgb(0, *top); g.add_color_stop_rgb(1, *bottom); c.set_source(g); c.paint()


def star(c, x, y, s):
    c.move_to(x, y - s)
    for i in range(1, 10):
        a = -math.pi / 2 + i * math.pi / 5; r = s if i % 2 == 0 else s * 0.45
        c.line_to(x + r * math.cos(a), y + r * math.sin(a))
    c.close_path()


def heart(c, x, y, s):
    c.move_to(x, y + s * 0.9); c.curve_to(x - s * 1.6, y - s * 0.2, x - s * 0.9, y - s * 1.5, x, y - s * 0.6)
    c.curve_to(x + s * 0.9, y - s * 1.5, x + s * 1.6, y - s * 0.2, x, y + s * 0.9); c.close_path()


# ---------------------------------------------------------------- characters
def face(c, x, y, r, mood="neutral", talk=0.0, blink=False, look=0.0):
    """mood: neutral | smile | sad | angry | shout | calm (eyes closed, peaceful) | empty"""
    lx = look * r * 0.18; ey = y + r * 0.02
    c.set_source_rgb(*INK); c.set_line_cap(cairo.LINE_CAP_ROUND); c.set_line_width(r * 0.075)
    for s in (-1, 1):
        ex = x + s * r * 0.33 + lx
        if mood == "roll" and not blink:                          # eye roll: whites with the pupils up
            ell(c, ex, ey, r * 0.13, r * 0.15); c.set_source_rgb(1, 1, 1); c.fill(); c.set_source_rgb(*INK)
            ell(c, ex + r * 0.03, ey - r * 0.08, r * 0.06, r * 0.06); c.fill(); continue
        if mood == "shock" and not blink:
            ell(c, ex, ey, r * 0.15, r * 0.17); c.set_source_rgb(1, 1, 1); c.fill(); c.set_source_rgb(*INK)
            ell(c, ex, ey, r * 0.07, r * 0.08); c.fill(); continue
        if blink or mood == "calm":
            c.new_sub_path(); c.arc(ex, ey, r * 0.12, 0.15 * math.pi, 0.85 * math.pi); c.stroke()
        else:
            ell(c, ex, ey, r * 0.085, r * (0.12 if mood != "empty" else 0.06)); c.fill()
        if mood in ("sad", "angry", "shout", "empty"):           # brows
            up = -1 if mood in ("angry", "shout") else 1
            c.move_to(ex - r * 0.14, ey - r * 0.24 - (s * up * r * 0.05)); c.line_to(ex + r * 0.14, ey - r * 0.24 + (s * up * r * 0.05)); c.stroke()
    my = y + r * 0.40; mx = x + lx
    if mood == "shout":
        o = 0.6 + 0.4 * talk; ell(c, mx, my + r * 0.04, r * 0.17, r * 0.13 * o); c.fill()
    elif mood in ("roll", "smirk"):                               # one-sided smirk
        c.move_to(mx - r * 0.12, my + r * 0.02); c.curve_to(mx, my + r * 0.04, mx + r * 0.1, my, mx + r * 0.16, my - r * 0.08); c.stroke()
    elif mood == "shock":
        ell(c, mx, my + r * 0.04, r * 0.07, r * 0.09); c.fill()
    elif talk > 0.05:
        ell(c, mx, my, r * 0.12, r * 0.05 + r * 0.08 * talk); c.fill()
    elif mood in ("sad",):
        c.new_sub_path(); c.arc(mx, my + r * 0.14, r * 0.15, 1.2 * math.pi, 1.8 * math.pi); c.stroke()
    elif mood in ("smile", "calm"):
        c.new_sub_path(); c.arc(mx, my - r * 0.08, r * 0.16, 0.2 * math.pi, 0.8 * math.pi); c.stroke()
    else:
        c.move_to(mx - r * 0.1, my); c.line_to(mx + r * 0.1, my); c.stroke()
    if mood in ("smile", "calm", "shout", "angry"):               # cheeks
        for s in (-1, 1):
            g = cairo.RadialGradient(x + s * r * 0.56 + lx, y + r * 0.33, 0, x + s * r * 0.56 + lx, y + r * 0.33, r * 0.2)
            col = (1, 0.45, 0.5) if mood in ("shout", "angry") else (1, 0.55, 0.62)
            g.add_color_stop_rgba(0, *col, 0.55); g.add_color_stop_rgba(1, *col, 0); c.set_source(g); c.arc(x + s * r * 0.56 + lx, y + r * 0.33, r * 0.2, 0, 2 * math.pi); c.fill()


def head(c, her, x, y, r, mood="neutral", talk=0.0, blink=False, look=0.0, tilt=0.0, depth=1.2):
    c.save(); c.translate(x, y); c.rotate(math.radians(tilt)); c.translate(-x, -y)
    if her:
        paper(c, lambda c: (c.move_to(x - r * 1.05, y + r * 1.05), c.curve_to(x - r * 1.25, y - r * 0.4, x - r * 0.7, y - r * 1.2, x, y - r * 1.15),
                            c.curve_to(x + r * 0.7, y - r * 1.2, x + r * 1.25, y - r * 0.4, x + r * 1.05, y + r * 1.05), c.close_path()), PINK_H, depth)
    paper(c, lambda c: ell(c, x, y, r, r), PINK if her else BLUE, depth)
    if her:
        paper(c, lambda c: (c.move_to(x - r * 0.95, y - r * 0.05), c.curve_to(x - r * 0.6, y - r * 0.85, x + r * 0.2, y - r * 1.05, x + r * 0.95, y - r * 0.25),
                            c.curve_to(x + r * 0.6, y - r * 1.15, x - r * 0.9, y - r * 1.15, x - r * 0.95, y - r * 0.05), c.close_path()), PINK_H, depth * 0.6)
    else:
        paper(c, lambda c: (c.move_to(x - r * 0.95, y - r * 0.2), c.curve_to(x - r * 0.85, y - r * 1.15, x + r * 0.85, y - r * 1.15, x + r * 0.95, y - r * 0.2),
                            c.curve_to(x + r * 0.5, y - r * 0.55, x - r * 0.5, y - r * 0.55, x - r * 0.95, y - r * 0.2), c.close_path()), BLUE_H, depth * 0.6)
    face(c, x, y, r, mood, talk, blink, look)
    c.restore()


def person(c, her, x, y, r, mood="neutral", talk=0.0, blink=False, look=0.0, tilt=0.0, arms=("down", "down"),
           sit=False, breath=0.0, depth=1.2, crossed=False, phone=False):
    """x, y = head centre, r = head radius. arms: per side 'down' | 'up' (raised, shouting) | 'forward' | 'cross' |
    'reach' (towards the other side) | 'hip'"""
    body_col, dark = (PINK_D, PINK_H) if her else (BLUE_D, BLUE_H)
    by = y + r * 1.0; bw = r * (1.15 if her else 1.3); bh = r * (1.7 if sit else 2.3)
    sc = 1 + 0.012 * breath
    # legs
    if not sit:
        for s in (-1, 1): paper(c, lambda c, s=s: capsule(c, (x + s * bw * 0.35, by + bh * 0.8), (x + s * bw * 0.38, by + bh + r * 1.5), r * 0.26), PLUM, depth)
    # arms behind the body for 'down'
    sh = [(x - bw * 0.82, by + r * 0.35), (x + bw * 0.82, by + r * 0.35)]
    def arm_end(side, kind):
        s = -1 if side == 0 else 1; sx, sy = sh[side]
        return {"down": (sx + s * r * 0.15, sy + r * 1.5), "up": (sx + s * r * 0.55, sy - r * 1.1), "forward": (sx + s * r * 0.05, sy + r * 0.9),
                "reach": (sx + s * r * 1.5, sy + r * 0.2), "hip": (sx + s * r * 0.35, sy + r * 1.0),
                "cross": (x - s * bw * 0.25, sy + r * 0.75), "phone": (x + s * bw * 0.1, sy + r * 0.7)}[kind]
    for i, kind in enumerate(arms):
        if kind in ("down", "up", "reach", "hip"):
            paper(c, lambda c, i=i, kind=kind: capsule(c, sh[i], arm_end(i, kind), r * 0.24), body_col, depth)
            ex, ey = arm_end(i, kind); paper(c, lambda c, ex=ex, ey=ey: ell(c, ex, ey, r * 0.2, r * 0.2), PINK if her else BLUE, depth)
    # body (sweater): rounded trapezoid
    def body(c):
        c.save(); c.translate(x, by); c.scale(sc, sc); c.translate(-x, -by)
        c.move_to(x - bw * 0.55, by); c.curve_to(x - bw * 1.0, by + r * 0.1, x - bw * 1.05, by + bh * 0.5, x - bw * 0.95, by + bh)
        c.line_to(x + bw * 0.95, by + bh); c.curve_to(x + bw * 1.05, by + bh * 0.5, x + bw * 1.0, by + r * 0.1, x + bw * 0.55, by); c.close_path()
        c.restore()
    paper(c, body, body_col, depth)
    if sit:   # thighs towards the camera
        paper(c, lambda c: rrect(c, x - bw * 0.9, by + bh - r * 0.35, bw * 1.8, r * 0.75, r * 0.35), PLUM, depth * 1.1)
    for i, kind in enumerate(arms):
        if kind in ("forward", "cross", "phone"):
            paper(c, lambda c, i=i, kind=kind: capsule(c, sh[i], arm_end(i, kind), r * 0.24), body_col, depth * 1.1)
            ex, ey = arm_end(i, kind); paper(c, lambda c, ex=ex, ey=ey: ell(c, ex, ey, r * 0.2, r * 0.2), PINK if her else BLUE, depth * 1.1)
    if phone:
        px, py = x, by + r * 0.6
        g = cairo.RadialGradient(px, py - r * 0.6, 0, px, py - r * 0.6, r * 1.6); g.add_color_stop_rgba(0, 0.75, 0.85, 1, 0.45); g.add_color_stop_rgba(1, 0.75, 0.85, 1, 0)
        c.set_source(g); c.arc(px, py - r * 0.6, r * 1.6, 0, 2 * math.pi); c.fill()
        paper(c, lambda c: rrect(c, px - r * 0.28, py - r * 0.25, r * 0.56, r * 0.8, r * 0.08), (0.12, 0.12, 0.18), depth * 1.2)
        c.set_source_rgb(0.80, 0.88, 1.0); rrect(c, px - r * 0.22, py - r * 0.19, r * 0.44, r * 0.66, r * 0.05); c.fill()
    head(c, her, x, y + (r * 0.03 * breath), r, "calm" if (mood == "calm") else mood, talk, blink, look, tilt, depth * 1.05)


def bubble(c, x, y, w, h, txt, size, u=1.0, tail=-1, spiky=False, col=CREAM, tcol=INK):
    """speech bubble made of paper; u = pop-in 0..1"""
    if u <= 0: return
    c.save(); c.translate(x, y); s = 0.6 + 0.4 * u + 0.08 * math.sin(math.pi * u); c.scale(s, s); c.translate(-x, -y)
    def shape(c):
        if spiky:
            n = 18
            for i in range(n + 1):
                a = 2 * math.pi * i / n; rr = 1.0 if i % 2 == 0 else 0.84
                px, py = x + w / 2 * rr * math.cos(a), y + h / 2 * rr * math.sin(a)
                (c.move_to if i == 0 else c.line_to)(px, py)
            c.close_path()
        else:
            rrect(c, x - w / 2, y - h / 2, w, h, min(h / 2, 46))
            c.move_to(x + tail * w * 0.18, y + h / 2 - 2); c.line_to(x + tail * w * 0.30, y + h / 2 + 46); c.line_to(x + tail * w * 0.02, y + h / 2 - 2); c.close_path()
    paper(c, shape, col, 1.4, u)
    c.select_font_face("Inter", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD); c.set_font_size(size)
    lines = txt.split("\n")
    for i, ln in enumerate(lines):
        e = c.text_extents(ln); c.move_to(x - e[4] / 2, y + (i - (len(lines) - 1) / 2) * size * 1.2 + size * 0.35)
        c.set_source_rgba(*tcol, u); c.show_text(ln)
    c.restore()


_GRAIN = None
def grain(arr):
    """paper fibre texture + a soft vignette, applied to the final RGB frame"""
    global _GRAIN
    if _GRAIN is None:
        rng = np.random.default_rng(5)
        n = rng.normal(0, 1, (H // 2, W // 2)).astype(np.float32)
        import cv2
        n = cv2.resize(cv2.GaussianBlur(n, (0, 0), 1.2), (W, H))
        yy, xx = np.mgrid[0:H, 0:W]; v = 1 - 0.35 * (((xx - W / 2) / (W * 0.75)) ** 2 + ((yy - H / 2) / (H * 0.75)) ** 2)
        _GRAIN = (1 + 0.05 * n)[:, :, None] * v[:, :, None]
    return np.clip(arr * _GRAIN, 0, 255)


# ---------------------------------------------------------------- animation cues (every pop-in also places a sound)
CUES = set()          # (time, kind) collected while drawing; the sound pass turns them into SFX


def cue(t0, kind):
    CUES.add((round(t0, 3), kind))


def _ease(u): u = max(0.0, min(1.0, u)); return u * u * (3 - 2 * u)


def pop(t, t0, d=0.32, kind="pop"):
    """0..1 with an overshoot; registers a sound at t0"""
    cue(t0, kind)
    u = (t - t0) / d
    if u <= 0: return 0.0
    if u >= 1: return 1.0
    return 1 + 2.70158 * (u - 1) ** 3 + 1.70158 * (u - 1) ** 2


def slide(t, t0, d=0.45, kind="whoosh"):
    """0..1 smooth arrival with a little settle; registers a whoosh"""
    cue(t0, kind)
    u = (t - t0) / d
    if u <= 0: return 0.0
    if u >= 1: return 1.0
    return 1 - (1 - u) ** 3 * math.cos(u * 4.0)


def squash(t, t0, d=0.5):
    """(sx, sy) bounce for a landing character: squash, stretch, settle"""
    u = (t - t0) / d
    if u <= 0 or u >= 1: return 1.0, 1.0
    k = math.sin(u * math.pi * 3) * (1 - u) * 0.12
    return 1 + k, 1 - k


def mark(c, kind, x, y, s, a=1.0):
    """small comic marks that pop around heads: ! ? heart drop bolt zzz vein star"""
    if a <= 0: return
    c.save(); c.translate(x, y); c.scale(max(s * a, 1e-3), max(s * a, 1e-3))
    if kind == "!":
        paper(c, lambda c: rrect(c, -9, -46, 18, 56, 9), ROSE, 1.3); paper(c, lambda c: ell(c, 0, 26, 10, 10), ROSE, 1.3)
    elif kind == "?":
        c.select_font_face("Inter", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD); c.set_font_size(80)
        paper(c, lambda c: (c.move_to(-22, 28), c.text_path("?")), CREAM, 1.3)
    elif kind == "heart":
        paper(c, lambda c: heart(c, 0, 0, 26), ROSE, 1.3)
    elif kind == "drop":
        paper(c, lambda c: (c.move_to(0, -30), c.curve_to(22, 0, 18, 22, 0, 22), c.curve_to(-18, 22, -22, 0, 0, -30), c.close_path()), (0.65, 0.82, 1.0), 1.3)
    elif kind == "bolt":
        paper(c, lambda c: (c.move_to(8, -44), c.line_to(-16, 4), c.line_to(2, 4), c.line_to(-8, 44), c.line_to(18, -6), c.line_to(0, -6), c.close_path()), MOON, 1.3)
    elif kind == "vein":
        c.set_source_rgb(0.85, 0.20, 0.30); c.set_line_width(7); c.set_line_cap(cairo.LINE_CAP_ROUND)
        for a in (0, 1, 2, 3):
            c.save(); c.rotate(a * math.pi / 2); c.move_to(6, -6); c.curve_to(10, -20, 22, -18, 24, -8); c.stroke(); c.restore()
    elif kind == "zzz":
        c.select_font_face("Inter", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD)
        for i in range(3):
            c.set_font_size(30 + 12 * i); c.move_to(i * 22, -i * 30); c.set_source_rgb(*CREAM); c.show_text("z")
    elif kind == "star":
        paper(c, lambda c: star(c, 0, 0, 24), MOON, 1.3)
    elif kind == "tear":
        paper(c, lambda c: (c.move_to(0, -18), c.curve_to(14, 0, 12, 14, 0, 14), c.curve_to(-12, 14, -14, 0, 0, -18), c.close_path()), (0.65, 0.85, 1.0), 1.2)
    c.restore()


def marks_around(c, t, t0, x, y, r, kinds, step=0.28, kind_sound=None):
    """pop several marks around a head one after another (each with its own sound)"""
    spots = [(-1.15, -1.0), (1.2, -1.05), (-1.45, -0.2), (1.5, -0.25), (0.0, -1.55), (-0.6, -1.5), (0.7, -1.5)]
    for i, k in enumerate(kinds):
        ti = t0 + i * step
        a = pop(t, ti, 0.28, kind_sound or {"heart": "sparkle", "bolt": "zap", "!": "pop", "vein": "buzz", "drop": "drip", "zzz": "soft", "tear": "drip"}.get(k, "pop"))
        wob = 1 + 0.06 * math.sin((t - ti) * 9)
        sx, sy = spots[i % len(spots)]
        mark(c, k, x + sx * r, y + sy * r + 6 * math.sin(t * 3 + i), wob, a)


def enter(c, t, t0, dx, foot, draw, d=0.45, kind="whoosh"):
    """slide a character in from dx pixels away and land with a squash; foot = (x, y) of the feet for the squash pivot"""
    u = slide(t, t0, d, kind)
    sx, sy = squash(t, t0 + d * 0.8)
    c.save(); c.translate((1 - u) * dx, 0)
    c.translate(foot[0], foot[1]); c.scale(sx, sy); c.translate(-foot[0], -foot[1])
    draw(); c.restore()


def shake(t, t0, d=0.4, amp=10):
    """horizontal head-shake / tremble offset"""
    u = (t - t0) / d
    return 0.0 if (u <= 0 or u >= 1) else amp * math.sin(u * math.pi * 6) * (1 - u)


# ---------------------------------------------------------------- animated pieces seen in the reference, in paper style
SAGE_C, VIOLET_C, BLUE_C = (0.55, 0.80, 0.62), (0.72, 0.60, 0.98), (0.55, 0.75, 1.0)


def draw_ring(c, t, t0, x, y, R, col, width=22, d=0.6, kind="swirl"):
    """a ring that draws itself (0 -> 360 deg) with a soft paper rim"""
    cue(t0, kind); u = _ease((t - t0) / d)
    if u <= 0.01: return u
    c.new_sub_path(); c.arc(x, y, R, -math.pi / 2, -math.pi / 2 + 2 * math.pi * u)
    c.set_source_rgba(*col, 0.3); c.set_line_width(width * 2.1); c.set_line_cap(cairo.LINE_CAP_ROUND); c.stroke()
    c.new_sub_path(); c.arc(x, y, R, -math.pi / 2, -math.pi / 2 + 2 * math.pi * u); c.set_source_rgb(*col); c.set_line_width(width); c.stroke()
    return u


def progress_dots(c, x, y, n, k, col):
    for i in range(n):
        ell(c, x + (i - (n - 1) / 2) * 34, y, 9 if i != k else 13, 9 if i != k else 13)
        c.set_source_rgb(*(col if i <= k else (0.35, 0.33, 0.48))); c.fill()


def rays(c, t, t0, x, y, col=MOON, n=18, kind="rise"):
    """light rays bursting out behind something"""
    cue(t0, kind); u = _ease((t - t0) / 0.6)
    if u <= 0: return
    for i in range(n):
        a = i * 2 * math.pi / n + t * 0.25; r0, r1 = 90, 90 + 420 * u
        c.move_to(x + r0 * math.cos(a - 0.05), y + r0 * math.sin(a - 0.05)); c.line_to(x + r1 * math.cos(a), y + r1 * math.sin(a))
        c.line_to(x + r0 * math.cos(a + 0.05), y + r0 * math.sin(a + 0.05)); c.close_path()
        c.set_source_rgba(*col, 0.35 * u); c.fill()


def orbits(c, t, t0, x, y, col):
    cue(t0, "swirl"); u = _ease((t - t0) / 0.5)
    for i, (rx, ry, sp) in enumerate(((200, 70, 1.4), (240, 95, -1.0), (280, 120, 0.8))):
        c.save(); c.translate(x, y); c.rotate(0.3 * i); c.scale(rx * u + 1e-3, ry * u + 1e-3)
        c.new_sub_path(); c.arc(0, 0, 1, 0, 2 * math.pi); c.restore(); c.set_source_rgba(*col, 0.6); c.set_line_width(5); c.stroke()
        a = t * sp + i; c.save(); c.translate(x, y); c.rotate(0.3 * i)
        ell(c, rx * u * math.cos(a), ry * u * math.sin(a), 12, 12); c.set_source_rgb(*col); c.fill(); c.restore()


def phone_big(c, t, x, y, msgs, col_mine=ROSE, a=1.0):
    """msgs: list of (text, mine, t_appear); returns nothing. A paper phone with chat bubbles popping in."""
    paper(c, lambda c: rrect(c, x - 230, y - 400, 460, 800, 60), (0.14, 0.14, 0.22), 1.2)
    paper(c, lambda c: rrect(c, x - 200, y - 360, 400, 720, 40), (0.92, 0.90, 0.95), 1.25)
    yy = y - 300
    c.select_font_face("Inter", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD); c.set_font_size(30)
    for txt, mine, ta in msgs:
        u = pop(t, ta, 0.3, "ping" if not mine else "pop")
        if u <= 0: continue
        w = c.text_extents(txt)[4] + 50; bx = x + 180 - w if mine else x - 180
        c.save(); c.translate(bx + w / 2, yy + 35); c.scale(max(u, 1e-3), max(u, 1e-3)); c.translate(-(bx + w / 2), -(yy + 35))
        rrect(c, bx, yy, w, 70, 30); c.set_source_rgb(*(col_mine if mine else (0.80, 0.80, 0.88))); c.fill()
        c.move_to(bx + 25, yy + 46); c.set_source_rgb(*INK); c.show_text(txt); c.restore()
        yy += 95


def padlock(c, x, y, s, col=MOON):
    c.set_source_rgb(*INK); c.set_line_width(14 * s); c.new_sub_path(); c.arc(x, y - 30 * s, 40 * s, math.pi, 0); c.stroke()
    paper(c, lambda c: rrect(c, x - 60 * s, y - 30 * s, 120 * s, 100 * s, 16 * s), col, 1.4)
    paper(c, lambda c: ell(c, x, y + 15 * s, 12 * s, 12 * s), INK, 1.45)


def snowflake(c, x, y, s, a=1.0):
    c.set_source_rgba(0.85, 0.93, 1.0, a); c.set_line_width(5 * s); c.set_line_cap(cairo.LINE_CAP_ROUND)
    for i in range(6):
        ang = i * math.pi / 3; c.move_to(x, y); c.line_to(x + 30 * s * math.cos(ang), y + 30 * s * math.sin(ang)); c.stroke()


def umbrella(c, x, y, s, col=ROSE):
    paper(c, lambda c: (c.move_to(x - 160 * s, y), c.curve_to(x - 150 * s, y - 150 * s, x + 150 * s, y - 150 * s, x + 160 * s, y),
                        c.curve_to(x + 110 * s, y - 25 * s, x + 50 * s, y - 25 * s, x, y), c.curve_to(x - 50 * s, y - 25 * s, x - 110 * s, y - 25 * s, x - 160 * s, y),
                        c.close_path()), col, 1.3)
    c.set_source_rgb(*INK); c.set_line_width(8 * s); c.move_to(x, y - 10 * s); c.line_to(x, y + 170 * s); c.stroke()


def rain(c, t, x0, y0, w, h, n=40, a=0.5):
    for k in range(n):
        x = x0 + (k * 97) % w; y = y0 + ((k * 151) + t * 800) % h
        c.set_source_rgba(0.75, 0.85, 1.0, a); c.set_line_width(4); c.move_to(x, y); c.line_to(x - 5, y + 36); c.stroke()


def magnet(c, x, y, s):
    c.set_line_width(46 * s); c.set_line_cap(cairo.LINE_CAP_BUTT)
    c.new_sub_path(); c.arc(x, y, 70 * s, 0, math.pi); c.set_source_rgb(0.85, 0.30, 0.35); c.stroke()
    for sd in (-1, 1):
        c.set_source_rgb(0.85, 0.30, 0.35); c.move_to(x + sd * 70 * s, y); c.line_to(x + sd * 70 * s, y - 60 * s); c.stroke()
        c.set_source_rgb(*CREAM); c.move_to(x + sd * 70 * s, y - 60 * s); c.line_to(x + sd * 70 * s, y - 100 * s); c.stroke()


def chain(c, t, t0, x, y, col=(0.70, 0.70, 0.78)):
    """a chain across the frame that snaps in the middle at t0"""
    cue(t0, "clang"); g = _ease((t - t0) / 0.4)
    for i in range(-5, 6):
        if i == 0: continue
        off = (-1 if i < 0 else 1) * 120 * g; drop = 40 * g * abs(i) / 5
        c.save(); c.translate(x + i * 90 + off, y + drop); c.rotate(0.3 * g * (-1 if i < 0 else 1))
        c.set_source_rgb(*col); c.set_line_width(14); ell(c, 0, 0, 52 if i % 2 else 30, 30 if i % 2 else 52); c.stroke(); c.restore()


def stairs(c, t, t0, x0, y0, n, step, col, d=0.9):
    """stairs drawing themselves step by step (tick per step); returns positions of the step tops"""
    tops = []
    c.set_source_rgb(*col); c.set_line_width(14); c.set_line_cap(cairo.LINE_CAP_ROUND); c.set_line_join(cairo.LINE_JOIN_ROUND)
    u = (t - t0) / d * n; c.move_to(x0, y0); x, y = x0, y0
    for i in range(n):
        cue(t0 + i * d / n, "tick")
        k = max(0.0, min(1.0, u - i))
        if k <= 0: break
        c.line_to(x + step * k, y); x += step * k
        if k >= 1: c.line_to(x, y - step * 0.8); y -= step * 0.8; tops.append((x - step / 2, y))
    c.stroke(); return tops
