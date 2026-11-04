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
