"""Adult (30+) characters in the storybook style — stills only."""
import math, sys
OUT = sys.argv[1]
sys.argv = [sys.argv[0], OUT]
import numpy as np
import cairocffi as cairo
from PIL import Image, ImageDraw
from storybook import (Pen, shape, ellipse_pts, glow, finish, caption, F_TOP, F_SUB, LINE, W, H)

SKIN, SKIN_SH, CHEEK = (0.92, 0.77, 0.66), (0.84, 0.67, 0.57), (0.90, 0.55, 0.52)
HAIR_W, HAIR_W2 = (0.33, 0.21, 0.16), (0.26, 0.16, 0.12)
HAIR_M = (0.20, 0.16, 0.15)
SWEATER_W, SWEATER_W_SH = (0.69, 0.50, 0.55), (0.60, 0.42, 0.47)
SWEATER_M, SWEATER_M_SH = (0.40, 0.48, 0.52), (0.33, 0.40, 0.44)
LIP, GOLD = (0.74, 0.40, 0.42), (0.93, 0.78, 0.45)

def screen_lines(c, px, top, w, h, scroll, s):
    c.save(); c.rectangle(px - w / 2, top, w, h); c.clip()
    for k in range(-1, 7):
        yy = top + 10 * s + ((k * 22 * s + scroll * 22 * s) % (8 * 22 * s)) - 22 * s
        c.set_source_rgba(0.3, 0.32, 0.42, 0.5); c.rectangle(px - w / 2 + 8 * s, yy, (w - 16 * s) * (0.6 + 0.4 * ((k * 7) % 3) / 2), 7 * s); c.fill()
    c.restore()

def face_pts(x, y, rx, ry, chin=0.62):
    pts = []
    for a in np.linspace(0, 2 * math.pi, 30, endpoint=False):
        sx, sy = math.cos(a), math.sin(a)
        k = 1.0 if sy < 0.2 else 1 - (1 - chin) * ((sy - 0.2) / 0.8) ** 1.2      # taper towards the chin
        pts.append((x + rx * sx * k, y + ry * sy))
    return pts

def eyes(c, pen, x, y, s, look=(0, 0), sad=0.0, blink=False, lashes=True, gap=34):
    for side in (-1, 1):
        ex, ey = x + side * gap * s, y
        if blink:
            shape(c, pen, [(ex - 13 * s, ey + 2 * s), (ex, ey + 5 * s), (ex + 13 * s, ey + 2 * s)], None, lw=2.8, close=False); continue
        shape(c, pen, [(ex - 14 * s, ey), (ex, ey - 7 * s), (ex + 14 * s, ey), (ex, ey + 6 * s)], (0.97, 0.95, 0.92), lw=2.2)
        c.set_source_rgb(0.24, 0.16, 0.12); c.arc(ex + look[0] * 4 * s, ey + look[1] * 3 * s, 5.4 * s, 0, 2 * math.pi); c.fill()
        c.set_source_rgb(1, 1, 1); c.arc(ex + look[0] * 4 * s + 2 * s, ey + look[1] * 3 * s - 2 * s, 1.4 * s, 0, 2 * math.pi); c.fill()
        lid = 4 * sad
        shape(c, pen, [(ex - 15 * s, ey + 1 * s - lid * s * 0.3), (ex, ey - 8 * s + lid * s), (ex + 15 * s, ey - 1 * s)], None, lw=3.4, close=False)
        if lashes:
            o = ex + side * 15 * s
            shape(c, pen, [(o, ey - 1 * s), (o + side * 6 * s, ey - 6 * s)], None, lw=2.2, close=False, smooth=False)
        # brow: inner end raised when sad
        shape(c, pen, [(ex + side * 18 * s, ey - 17 * s), (ex + side * 2 * s, ey - 22 * s), (ex - side * 14 * s, ey - 21 * s - 8 * sad * s)],
              None, lw=2.6 if lashes else 4.0, close=False)

def woman(c, pen, x, y, s, p):
    """x, y = centre of the face. Medium shot: head, shoulders, arms holding a phone."""
    ph = p.get("phone", 1.0); sad = p.get("sad", 0.5)
    sh_y = y + 150 * s + p.get("breath", 0.0) * s
    # hair back mass to the shoulders (wavy bob)
    back = []
    for a in np.linspace(math.pi * 1.05, math.pi * 1.95, 9):
        back.append((x + 102 * s * math.cos(a), y - 10 * s + 115 * s * math.sin(a)))
    back += [(x + 112 * s, y + 60 * s), (x + 118 * s, y + 130 * s), (x + 98 * s, y + 150 * s), (x - 98 * s, y + 150 * s), (x - 118 * s, y + 130 * s), (x - 112 * s, y + 60 * s)]
    shape(c, pen, back, HAIR_W2)
    # torso: knitted sweater with rib collar
    shape(c, pen, [(x - 128 * s, sh_y + 30 * s), (x - 100 * s, sh_y - 6 * s), (x + 100 * s, sh_y - 6 * s), (x + 128 * s, sh_y + 30 * s),
                   (x + 150 * s, sh_y + 560 * s), (x - 150 * s, sh_y + 560 * s)], SWEATER_W)
    for k in range(9):   # knit texture: soft vertical ribs
        kx = x - 110 * s + k * 27.5 * s
        shape(c, pen, [(kx, sh_y + 60 * s), (kx + 3 * s, sh_y + 540 * s)], None, line=SWEATER_W_SH, lw=2.4, close=False)
    # neck
    shape(c, pen, [(x - 24 * s, y + 70 * s), (x + 24 * s, y + 70 * s), (x + 27 * s, sh_y + 4 * s), (x - 27 * s, sh_y + 4 * s)], SKIN_SH, smooth=False, lw=2.4)
    shape(c, pen, [(x - 52 * s, sh_y - 6 * s), (x + 52 * s, sh_y - 6 * s), (x + 44 * s, sh_y + 22 * s), (x - 44 * s, sh_y + 22 * s)], SWEATER_W_SH, lw=2.6)
    # arms + hands holding the phone
    for side in (-1, 1):
        shx, shy = x + side * 112 * s, sh_y + 30 * s
        elx, ely = shx + side * 30 * s, shy + (230 - 30 * ph) * s
        hx, hy = x + side * (36 + 100 * (1 - ph)) * s, shy + (190 + 250 * (1 - ph)) * s
        shape(c, pen, [(shx - 30 * s, shy - 4 * s), (shx + 30 * s, shy - 4 * s), (elx + 27 * s, ely), (hx + 20 * s, hy - 6 * s), (hx - 20 * s, hy - 6 * s), (elx - 27 * s, ely)],
              SWEATER_W_SH if side < 0 else SWEATER_W)
        shape(c, pen, ellipse_pts(hx, hy + 10 * s, 19 * s, 21 * s, 14), SKIN, lw=2.4)
    if ph > 0.02:
        px, py = x, sh_y + (190 + 240 * (1 - ph)) * s
        glow(c, px, py - 20 * s, 300 * s, (0.75, 0.85, 1.0), 0.30 * ph)
        shape(c, pen, [(px - 36 * s, py - 66 * s), (px + 36 * s, py - 66 * s), (px + 36 * s, py + 34 * s), (px - 36 * s, py + 34 * s)], (0.12, 0.12, 0.15), smooth=False, lw=2.4)
        c.set_source_rgb(0.86, 0.9, 0.98); c.rectangle(px - 29 * s, py - 58 * s, 58 * s, 84 * s); c.fill()
        screen_lines(c, px, py - 58 * s, 58 * s, 84 * s, p.get("scroll", 0.0), s)
        for side in (-1, 1): shape(c, pen, ellipse_pts(px + side * 34 * s, py + 4 * s, 13 * s, 18 * s, 12), SKIN, lw=2.2)
    c.save(); c.translate(x, y + 90 * s); c.rotate(math.radians(p.get("tilt", 0.0))); c.translate(-x, -(y + 90 * s))
    # face
    shape(c, pen, face_pts(x, y, 78 * s, 98 * s), SKIN)
    glow(c, x, y + 70 * s, 150 * s, (0.7, 0.8, 1.0), 0.16 * ph)
    look = p.get("look", (0, 0.8))
    eyes(c, pen, x, y + 4 * s, s, look=look, sad=sad, blink=p.get("blink", False), lashes=True)
    shape(c, pen, [(x + 2 * s, y + 18 * s), (x + 8 * s, y + 38 * s), (x - 2 * s, y + 42 * s)], None, line=SKIN_SH, lw=3, close=False)
    my = y + 62 * s
    sm = p.get("smile", 0.0); tk = p.get("talk", 0.0)
    if tk > 0.05:   # talking: open mouth
        shape(c, pen, ellipse_pts(x, my + 3 * s, 13 * s, (3 + 9 * tk) * s, 14), (0.45, 0.18, 0.2), line=(0.5, 0.25, 0.25), lw=2)
    else:
        cy = 2 * sad - 6 * sm
        shape(c, pen, [(x - 18 * s, my + cy * s), (x - 6 * s, my - 4 * s), (x, my - 2 * s), (x + 6 * s, my - 4 * s), (x + 18 * s, my + cy * s),
                       (x + 6 * s, my + (8 + 2 * sm) * s), (x - 6 * s, my + (8 + 2 * sm) * s)], LIP, line=(0.5, 0.25, 0.25), lw=1.8)
    c.set_source_rgba(*CHEEK, 0.35)
    for side in (-1, 1): c.save(); c.translate(x + side * 50 * s, y + 38 * s); c.scale(16 * s, 9 * s); c.arc(0, 0, 1, 0, 2 * math.pi); c.restore(); c.fill()
    # front hair: side part, sweeping fringe, strands framing the face
    shape(c, pen, [(x - 96 * s, y + 70 * s), (x - 100 * s, y - 40 * s), (x - 60 * s, y - 100 * s), (x + 10 * s, y - 112 * s), (x + 70 * s, y - 98 * s),
                   (x + 100 * s, y - 40 * s), (x + 98 * s, y + 80 * s), (x + 84 * s, y + 10 * s), (x + 66 * s, y - 52 * s), (x + 20 * s, y - 74 * s),
                   (x - 30 * s, y - 60 * s), (x - 70 * s, y - 20 * s), (x - 80 * s, y + 30 * s)], HAIR_W)
    for side in (-1, 1):  # earrings
        c.set_source_rgb(*GOLD); c.arc(x + side * 80 * s, y + 46 * s, 4.5 * s, 0, 2 * math.pi); c.fill()
    c.restore()

def man(c, pen, x, y, s, p):
    ph = p.get("phone", 1.0)
    sh_y = y + 158 * s + p.get("breath", 0.0) * s
    shape(c, pen, [(x - 165 * s, sh_y + 40 * s), (x - 130 * s, sh_y - 8 * s), (x + 130 * s, sh_y - 8 * s), (x + 165 * s, sh_y + 40 * s),
                   (x + 180 * s, sh_y + 560 * s), (x - 180 * s, sh_y + 560 * s)], SWEATER_M)
    shape(c, pen, [(x - 32 * s, y + 70 * s), (x + 32 * s, y + 70 * s), (x + 36 * s, sh_y + 4 * s), (x - 36 * s, sh_y + 4 * s)], SKIN_SH, smooth=False, lw=2.6)
    shape(c, pen, [(x - 60 * s, sh_y - 8 * s), (x + 60 * s, sh_y - 8 * s), (x + 50 * s, sh_y + 20 * s), (x - 50 * s, sh_y + 20 * s)], SWEATER_M_SH, lw=2.6)
    for side in (-1, 1):
        shx, shy = x + side * 145 * s, sh_y + 40 * s
        elx, ely = shx + side * 30 * s, shy + (230 - 30 * ph) * s
        hx, hy = x + side * (40 + 110 * (1 - ph)) * s, shy + (190 + 250 * (1 - ph)) * s
        shape(c, pen, [(shx - 36 * s, shy - 4 * s), (shx + 36 * s, shy - 4 * s), (elx + 32 * s, ely), (hx + 24 * s, hy - 6 * s), (hx - 24 * s, hy - 6 * s), (elx - 32 * s, ely)],
              SWEATER_M_SH if side < 0 else SWEATER_M)
        shape(c, pen, ellipse_pts(hx, hy + 12 * s, 23 * s, 24 * s, 14), SKIN, lw=2.4)
    if ph > 0.02:
        px, py = x, sh_y + (200 + 240 * (1 - ph)) * s
        glow(c, px, py - 20 * s, 300 * s, (0.75, 0.85, 1.0), 0.30 * ph)
        shape(c, pen, [(px - 38 * s, py - 68 * s), (px + 38 * s, py - 68 * s), (px + 38 * s, py + 36 * s), (px - 38 * s, py + 36 * s)], (0.12, 0.12, 0.15), smooth=False, lw=2.4)
        c.set_source_rgb(0.86, 0.9, 0.98); c.rectangle(px - 31 * s, py - 60 * s, 62 * s, 88 * s); c.fill()
        screen_lines(c, px, py - 60 * s, 62 * s, 88 * s, p.get("scroll", 0.0), s)
        for side in (-1, 1): shape(c, pen, ellipse_pts(px + side * 36 * s, py + 4 * s + p.get("thumb", 0.0) * s, 15 * s, 20 * s, 12), SKIN, lw=2.2)
    c.save(); c.translate(x, y + 90 * s); c.rotate(math.radians(p.get("tilt", 0.0))); c.translate(-x, -(y + 90 * s))
    for side in (-1, 1):  # ears
        shape(c, pen, ellipse_pts(x + side * 84 * s, y + 12 * s, 14 * s, 22 * s, 12), SKIN_SH, lw=2.4)
    shape(c, pen, face_pts(x, y, 84 * s, 102 * s, chin=0.72), SKIN)
    glow(c, x, y + 70 * s, 150 * s, (0.7, 0.8, 1.0), 0.14 * ph)
    # stubble: soft shade on the jaw + dots
    c.save(); c.new_path()
    fp = face_pts(x, y, 84 * s, 102 * s, chin=0.72); c.move_to(*fp[0]); [c.line_to(*q) for q in fp[1:]]; c.close_path(); c.clip()
    c.set_source_rgba(0.35, 0.27, 0.24, 0.20); c.save(); c.translate(x, y + 82 * s); c.scale(84 * s, 46 * s); c.arc(0, 0, 1, 0, 2 * math.pi); c.restore(); c.fill()
    r = np.random.default_rng(3)
    for k in range(140):
        a = r.uniform(0.15, 0.85) * math.pi; rr = r.uniform(0.55, 1.0)
        c.set_source_rgba(0.25, 0.19, 0.17, 0.35); c.arc(x + math.cos(a) * 80 * s * rr, y + 40 * s + math.sin(a) * 60 * s * rr, 1.3 * s, 0, 2 * math.pi); c.fill()
    c.restore()
    eyes(c, pen, x, y + 2 * s, s, look=p.get("look", (0, 0.8)), sad=p.get("sad", 0.3), blink=p.get("blink", False), lashes=False, gap=36)
    shape(c, pen, [(x + 2 * s, y + 16 * s), (x + 9 * s, y + 40 * s), (x - 3 * s, y + 44 * s)], None, line=SKIN_SH, lw=3.2, close=False)
    sm = p.get("smile", 0.0)
    shape(c, pen, [(x - 20 * s, y + 66 * s - 4 * sm * s), (x, y + 64 * s + 3 * p.get("sad", 0.3) * s + 8 * sm * s), (x + 20 * s, y + 67 * s - 4 * sm * s)], None, lw=3.2, close=False)
    # short hair with a side part
    shape(c, pen, [(x - 88 * s, y + 10 * s), (x - 92 * s, y - 60 * s), (x - 50 * s, y - 112 * s), (x + 20 * s, y - 120 * s), (x + 78 * s, y - 96 * s),
                   (x + 92 * s, y - 40 * s), (x + 86 * s, y + 6 * s), (x + 74 * s, y - 44 * s), (x + 30 * s, y - 70 * s), (x - 40 * s, y - 64 * s),
                   (x - 76 * s, y - 30 * s)], HAIR_M)
    c.restore()

def sofa_room(c, pen):
    g = cairo.LinearGradient(0, 0, 0, H)
    g.add_color_stop_rgb(0, 0.24, 0.20, 0.26); g.add_color_stop_rgb(1, 0.14, 0.12, 0.17)
    c.set_source(g); c.paint()
    # framed picture + floor lamp with warm light
    shape(c, pen, [(330, 420), (690, 420), (690, 660), (330, 660)], (0.30, 0.26, 0.32), smooth=False, lw=3.4)
    shape(c, pen, [(355, 445), (665, 445), (665, 635), (355, 635)], (0.38, 0.40, 0.48), smooth=False, lw=2.4)
    shape(c, pen, [(470, 560), (520, 500), (560, 540), (610, 480), (650, 560)], None, line=(0.3, 0.32, 0.4), lw=3, close=False)
    shape(c, pen, [(960, 1500), (960, 640)], None, lw=6, close=False, smooth=False)
    shape(c, pen, [(900, 640), (1020, 640), (995, 560), (925, 560)], (0.78, 0.66, 0.52), smooth=False, lw=3)
    glow(c, 960, 660, 520, (1.0, 0.75, 0.45), 0.28)
    # sofa back
    shape(c, pen, [(60, 780), (1020, 780), (1020, 1260), (60, 1260)], (0.42, 0.36, 0.42), smooth=False, lw=3.4)
    shape(c, pen, [(540, 790), (540, 1250)], None, line=(0.34, 0.28, 0.34), lw=3, close=False, smooth=False)

def sofa_front(c, pen):
    # seat and armrests in front of the people
    shape(c, pen, [(30, 1200), (1050, 1200), (1050, 1330), (30, 1330)], (0.47, 0.40, 0.47), smooth=False, lw=3.4)
    shape(c, pen, [(540, 1205), (540, 1325)], None, line=(0.36, 0.30, 0.36), lw=3, close=False, smooth=False)
    for x0 in (0, 950):
        shape(c, pen, [(x0, 980), (x0 + 130, 980), (x0 + 130, 1340), (x0, 1340)], (0.38, 0.32, 0.38), smooth=False, lw=3.4)
    shape(c, pen, [(80, 1330), (110, 1330), (110, 1400), (80, 1400)], (0.25, 0.2, 0.2), smooth=False, lw=2.4)
    shape(c, pen, [(970, 1330), (1000, 1330), (1000, 1400), (970, 1400)], (0.25, 0.2, 0.2), smooth=False, lw=2.4)

def render(fn, name):
    s = cairo.ImageSurface(cairo.FORMAT_RGB24, W, H); c = cairo.Context(s)
    fn(c)
    s.flush(); arr = np.frombuffer(s.get_data(), np.uint8).reshape(H, W, 4)[:, :, [2, 1, 0]]
    im = Image.fromarray(finish(arr, 3)); return im

def kitchen_night(c, pen):
    g = cairo.LinearGradient(0, 0, 0, H)
    g.add_color_stop_rgb(0, 0.22, 0.19, 0.25); g.add_color_stop_rgb(1, 0.13, 0.11, 0.16)
    c.set_source(g); c.paint()
    # upper cabinets + wall clock showing 23:47
    shape(c, pen, [(40, 380), (430, 380), (430, 560), (40, 560)], (0.30, 0.27, 0.32), smooth=False, lw=3.2)
    shape(c, pen, [(235, 384), (235, 556)], None, lw=3, close=False, smooth=False)
    cx, cy = 800, 470
    shape(c, pen, ellipse_pts(cx, cy, 92, 92, 26), (0.90, 0.86, 0.78), lw=4)
    for k in range(12):
        a = k / 12 * 2 * math.pi
        shape(c, pen, [(cx + math.sin(a) * 74, cy - math.cos(a) * 74), (cx + math.sin(a) * 84, cy - math.cos(a) * 84)], None, lw=3, close=False, smooth=False)
    for frac, ln, lw in ((47 / 60, 70, 4), ((11 + 47 / 60) / 12, 46, 6)):
        a = frac * 2 * math.pi
        shape(c, pen, [(cx, cy), (cx + math.sin(a) * ln, cy - math.cos(a) * ln)], None, lw=lw, close=False, smooth=False)
    # hanging lamp with warm light over the table
    shape(c, pen, [(520, 0), (520, 600)], None, lw=3, close=False, smooth=False)
    shape(c, pen, [(450, 660), (590, 660), (560, 600), (480, 600)], (0.78, 0.62, 0.45), smooth=False, lw=3)
    glow(c, 520, 700, 620, (1.0, 0.74, 0.45), 0.30)
    # table edge in the foreground (she sits behind it); a cold plate for him
    shape(c, pen, [(-20, 1180), (1100, 1180), (1100, 1500), (-20, 1500)], (0.40, 0.32, 0.30), smooth=False, lw=3.4)
    shape(c, pen, [(-20, 1180), (1100, 1180)], None, line=(0.52, 0.42, 0.38), lw=8, close=False, smooth=False)
    shape(c, pen, ellipse_pts(800, 1215, 120, 28, 24), (0.88, 0.86, 0.82), lw=3)
    shape(c, pen, ellipse_pts(800, 1212, 76, 17, 20), (0.80, 0.78, 0.74), lw=2)

def scene_kitchen(c):
    kitchen_night(c, Pen(7))
    woman(c, Pen(11), 400, 760, 1.0, dict(phone=1.0, sad=0.8, look=(0, 0.9)))
    # redraw the table edge over her body so she sits behind it
    shape(c, Pen(19), [(-20, 1180), (1100, 1180), (1100, 1500), (-20, 1500)], (0.40, 0.32, 0.30), smooth=False, lw=3.4)
    shape(c, Pen(19), [(-20, 1180), (1100, 1180)], None, line=(0.52, 0.42, 0.38), lw=8, close=False, smooth=False)
    shape(c, Pen(19), ellipse_pts(800, 1215, 120, 28, 24), (0.88, 0.86, 0.82), lw=3)
    shape(c, Pen(19), ellipse_pts(800, 1212, 76, 17, 20), (0.80, 0.78, 0.74), lw=2)

def scene_sofa(c):
    sofa_room(c, Pen(5))
    woman(c, Pen(11), 300, 790, 0.82, dict(phone=1.0, sad=0.4, look=(0.2, 0.9)))
    man(c, Pen(13), 790, 760, 0.82, dict(phone=1.0, sad=0.2, look=(-0.1, 0.9)))
    # a cushion between them as the 'distance'
    shape(c, Pen(17), [(468, 1080), (612, 1070), (622, 1205), (462, 1212)], (0.62, 0.52, 0.42), lw=3)
    sofa_front(c, Pen(5))

if __name__ == "__main__":
    a = render(scene_kitchen, "kitchen"); d = ImageDraw.Draw(a)
    caption(d, [("Warum", 0), ("er", 0), ("dir", 0), ("nicht", 0)], 220, F_TOP); caption(d, [("aus", 0), ("dem", 0), ("Kopf", 1), ("geht", 0)], 310, F_TOP)
    caption(d, [("UND", 0), ("DU", 0), ("WARTEST", 1)], 1235, F_SUB); a.save(f"{OUT}/adult_kitchen.png")
    b = render(scene_sofa, "sofa"); d = ImageDraw.Draw(b)
    caption(d, [("Wenn", 0), ("ihr", 0), ("nur", 0), ("noch", 0)], 220, F_TOP); caption(d, [("wie", 0), ("Mitbewohner", 1), ("lebt", 0)], 310, F_TOP)
    caption(d, [("JEDER", 0), ("FÜR", 0), ("SICH", 1)], 1235, F_SUB); b.save(f"{OUT}/adult_sofa.png")
    sheet = Image.new("RGB", (1080, 960)); sheet.paste(a.resize((540, 960)), (0, 0)); sheet.paste(b.resize((540, 960)), (540, 0)); sheet.save(f"{OUT}/adult_sheet.png")
