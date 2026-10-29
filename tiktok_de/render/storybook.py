"""Storybook-style test (hand-drawn look): girl with phone at a night window, a shadow creature appears.

Look: thin brown outlines with 'boiling' jitter, muted dusty palette, paper texture, vignette, haze,
character poses updated on twos (12 fps) like hand animation.
"""
import math, os, subprocess, sys
import numpy as np
import cairocffi as cairo
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT = sys.argv[1]
PREVIEW = "--preview" in sys.argv
W, H, FPS, DUR = 1080, 1920, 24, 6.0
LINE = (0.22, 0.15, 0.13)
SKIN, CHEEK = (0.93, 0.78, 0.66), (0.93, 0.55, 0.52)
HAIR = (0.27, 0.18, 0.15)
HOODIE, HOODIE_SH = (0.50, 0.53, 0.63), (0.42, 0.44, 0.54)
BAND = (0.86, 0.55, 0.62)
rng = np.random.default_rng(5)

def ease(u): u = max(0.0, min(1.0, u)); return u * u * (3 - 2 * u)

# ---------------------------------------------------------------- paper texture + vignette (static)
def make_texture():
    t = np.zeros((H, W), np.float32)
    for scale, amp in ((6, 0.5), (24, 0.35), (90, 0.25), (300, 0.2)):
        n = rng.normal(0, 1, (H // scale + 2, W // scale + 2)).astype(np.float32)
        t += amp * np.asarray(Image.fromarray(n).resize((W, H), Image.BICUBIC))
    t = (t - t.mean()) / t.std()
    yy, xx = np.mgrid[0:H, 0:W]
    v = ((xx - W / 2) / (W * 0.62)) ** 2 + ((yy - H * 0.45) / (H * 0.62)) ** 2
    vig = np.clip(1 - 0.75 * v, 0.25, 1.0)
    return t, vig
TEX, VIG = make_texture()
GRAIN = [rng.normal(0, 1, (H // 2, W // 2)).astype(np.float32) for _ in range(4)]

def finish(rgb, frame_i):
    a = rgb.astype(np.float32)
    a *= (1 + 0.04 * TEX)[..., None]                      # paper fibres
    g = np.asarray(Image.fromarray(GRAIN[frame_i % 4]).resize((W, H), Image.NEAREST))
    a += 3 * g[..., None]                                 # film grain
    a *= VIG[..., None]
    return np.clip(a, 0, 255).astype(np.uint8)

# ---------------------------------------------------------------- hand-drawn helpers
class Pen:
    """jittered outlines that 'boil' (change slightly every drawing)."""
    def __init__(self, seed): self.r = np.random.default_rng(seed)
    def j(self, v=1.2): return float(self.r.normal(0, v))

def shape(c, pen, pts, fill, line=LINE, lw=3.2, close=True, smooth=True):
    pts = [(x + pen.j(), y + pen.j()) for x, y in pts]
    c.move_to(*pts[0])
    if smooth and len(pts) > 2:
        n = len(pts); seq = pts + ([pts[0], pts[1]] if close else [pts[-1]])
        for i in range(1, len(seq) - (1 if close else 0)):
            p0, p1 = seq[i - 1], seq[i]
            if i + 1 < len(seq):
                p2 = seq[i + 1]; m1 = ((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2); m2 = ((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2)
                if i == 1 and not close: c.line_to(*m1)
                c.curve_to(p1[0], p1[1], p1[0], p1[1], *m2)
            else: c.line_to(*p1)
    else:
        for p in pts[1:]: c.line_to(*p)
    if close: c.close_path()
    if fill:
        c.set_source_rgb(*fill); c.fill_preserve()
    c.set_source_rgb(*line); c.set_line_width(lw); c.set_line_join(cairo.LINE_JOIN_ROUND); c.set_line_cap(cairo.LINE_CAP_ROUND); c.stroke()

def ellipse_pts(cx, cy, rx, ry, n=22, rot=0.0):
    return [(cx + rx * math.cos(a) * math.cos(rot) - ry * math.sin(a) * math.sin(rot),
             cy + rx * math.cos(a) * math.sin(rot) + ry * math.sin(a) * math.cos(rot)) for a in np.linspace(0, 2 * math.pi, n, endpoint=False)]

def glow(c, x, y, r, col, a):
    g = cairo.RadialGradient(x, y, 0, x, y, r)
    g.add_color_stop_rgba(0, *col, a); g.add_color_stop_rgba(0.4, *col, a * 0.35); g.add_color_stop_rgba(1, *col, 0)
    c.save(); c.set_operator(cairo.OPERATOR_ADD); c.set_source(g); c.arc(x, y, r, 0, 2 * math.pi); c.fill(); c.restore()

# ---------------------------------------------------------------- set
def room(c, pen, t):
    g = cairo.LinearGradient(0, 0, 0, H)
    g.add_color_stop_rgb(0, 0.20, 0.17, 0.27); g.add_color_stop_rgb(1, 0.13, 0.11, 0.18)
    c.set_source(g); c.paint()
    # window with night sky and curtains (behind the girl, right side)
    wx, wy, ww, wh = 520, 300, 470, 760
    shape(c, pen, [(wx, wy), (wx + ww, wy), (wx + ww, wy + wh), (wx, wy + wh)], (0.16, 0.19, 0.32), smooth=False, lw=4)
    for k in range(40):  # city lights far away
        lx, ly = wx + 30 + (k * 97) % (ww - 60), wy + wh - 160 + (k * 37) % 120
        c.set_source_rgba(1.0, 0.82, 0.55, 0.35 + 0.3 * ((k * 13) % 5) / 5); c.rectangle(lx, ly, 6, 9); c.fill()
    glow(c, wx + ww * 0.7, wy + 150, 160, (0.8, 0.85, 1.0), 0.25)
    shape(c, pen, ellipse_pts(wx + ww * 0.7, wy + 150, 34, 34), (0.93, 0.92, 0.85), lw=2.5)
    shape(c, pen, [(wx + ww / 2, wy), (wx + ww / 2, wy + wh)], None, lw=6, close=False, smooth=False)
    shape(c, pen, [(wx, wy + wh * 0.55), (wx + ww, wy + wh * 0.55)], None, lw=6, close=False, smooth=False)
    for side in (0, 1):  # curtains with folds
        x0 = wx - 70 if side == 0 else wx + ww - 50
        pts = [(x0, wy - 40), (x0 + 120, wy - 40)] + [(x0 + 120 + 10 * math.sin(k), wy + k * 90) for k in range(10)] + [(x0, wy + 860)]
        shape(c, pen, pts, (0.36, 0.26, 0.40), lw=3)
        for f in range(3):
            fx = x0 + 25 + f * 32
            shape(c, pen, [(fx, wy - 20), (fx + 4, wy + 400), (fx - 2, wy + 840)], None, line=(0.26, 0.18, 0.30), lw=3, close=False)
    # moonlight beam
    c.save(); c.set_operator(cairo.OPERATOR_ADD)
    g = cairo.LinearGradient(wx + ww, wy, 200, 1700); g.add_color_stop_rgba(0, 0.7, 0.75, 1.0, 0.10); g.add_color_stop_rgba(1, 0.7, 0.75, 1.0, 0.0)
    c.set_source(g); c.move_to(wx + 60, wy + 40); c.line_to(wx + ww - 20, wy + 40); c.line_to(520, 1750); c.line_to(-100, 1750); c.close_path(); c.fill()
    c.restore()

def creature(c, pen, x, y, s, a, t, blink):
    """scribbly shadow figure: irregular silhouette (head, shoulders, ragged bottom) built from many fur strokes."""
    if a <= 0.01: return
    r = np.random.default_rng(int(t * 12) + 99)
    def outline(ang):
        # radius of the silhouette at angle `ang` (0 = right, pi/2 = down)
        dy = math.sin(ang); dx = math.cos(ang)
        head = 0.55 if dy < -0.75 else 0.0
        base = 1.0 + 0.18 * math.sin(3 * ang + 1.3) + 0.08 * math.sin(7 * ang + 0.4)
        return base * (140 if abs(dx) > 0.3 else 120) * s, base * (290 if dy > 0 else 250 + 60 * head) * s
    c.push_group()
    # dense core
    pts = []
    for ang in np.linspace(0, 2 * math.pi, 48, endpoint=False):
        rx, ry = outline(ang); k = 0.78 + 0.06 * r.normal()
        pts.append((x + math.cos(ang) * rx * k, y + math.sin(ang) * ry * k))
    c.move_to(*pts[0]); [c.line_to(*q) for q in pts[1:]]; c.close_path()
    c.set_source_rgba(0.05, 0.035, 0.045, 0.92); c.fill()
    # fur strokes concentrated on the edge, pointing outward
    for k in range(1400):
        ang = r.uniform(0, 2 * math.pi); rx, ry = outline(ang)
        rad = r.uniform(0.55, 1.05) ** 0.6
        px, py = x + math.cos(ang) * rx * rad, y + math.sin(ang) * ry * rad
        th = ang + r.normal(0, 0.45) + (0.6 if math.sin(ang) > 0.6 else 0) * r.normal(0, 1)
        ln = r.uniform(12, 46) * s * (1.4 if math.sin(ang) > 0.5 else 1.0)
        c.set_source_rgba(0.07, 0.05, 0.06, r.uniform(0.35, 0.8)); c.set_line_width(r.uniform(1.2, 3.2))
        c.move_to(px, py); c.line_to(px + math.cos(th) * ln, py + math.sin(th) * ln); c.stroke()
    ey = y - 175 * s
    for dx in (-32, 32):
        glow(c, x + dx * s, ey, 50 * s, (1.0, 0.85, 0.45), 0.85)
        if blink: c.set_source_rgb(1.0, 0.92, 0.6); c.rectangle(x + dx * s - 9 * s, ey - 1.5 * s, 18 * s, 3 * s); c.fill()
        else: c.set_source_rgb(1.0, 0.95, 0.75); c.save(); c.translate(x + dx * s, ey); c.scale(8 * s, 10 * s); c.arc(0, 0, 1, 0, 2 * math.pi); c.restore(); c.fill()
    c.pop_group_to_source(); c.paint_with_alpha(a)

# ---------------------------------------------------------------- girl (front view, medium shot)
def girl(c, pen, x, y, s, p):
    """x, y = centre of the head. p: phone (0 down .. 1 at chest), head_tilt, look_down, blink, sad, sigh."""
    sigh = p.get("sigh", 0.0)
    sh_y = y + 150 * s + 10 * sigh
    # braids behind shoulders? (in front, drawn later) — hood behind the neck
    shape(c, pen, ellipse_pts(x, sh_y - 18 * s, 120 * s, 46 * s), HOODIE_SH)
    # torso / hoodie
    shape(c, pen, [(x - 150 * s, sh_y + 20 * s), (x - 120 * s, sh_y - 15 * s), (x + 120 * s, sh_y - 15 * s), (x + 150 * s, sh_y + 20 * s),
                   (x + 175 * s, sh_y + 520 * s), (x - 175 * s, sh_y + 520 * s)], HOODIE)
    # drawstrings
    for dx in (-26, 26):
        shape(c, pen, [(x + dx * s, sh_y - 5 * s), (x + dx * 1.1 * s, sh_y + 95 * s)], None, lw=2.6, close=False, smooth=False)
        shape(c, pen, ellipse_pts(x + dx * 1.1 * s, sh_y + 102 * s, 5 * s, 9 * s, 10), (0.9, 0.9, 0.92), lw=2)
    # arms: phone up at chest (p=1) or hanging (p=0)
    ph = p.get("phone", 1.0)
    for side in (-1, 1):
        shx, shy = x + side * 128 * s, sh_y + 18 * s
        elx = shx + side * (40 - 10 * ph) * s; ely = shy + (210 - 20 * ph) * s
        hx = x + side * (40 + 110 * (1 - ph)) * s; hy = shy + (180 + 240 * (1 - ph)) * s
        shape(c, pen, [(shx - 34 * s, shy), (shx + 34 * s, shy), (elx + 30 * s, ely), (hx + 24 * s, hy), (hx - 24 * s, hy), (elx - 30 * s, ely)], HOODIE_SH if side < 0 else HOODIE)
        shape(c, pen, ellipse_pts(hx, hy + 12 * s, 24 * s, 22 * s, 14), SKIN, lw=2.6)
    # phone
    if ph > 0.02:
        px, py = x, sh_y + (170 + 230 * (1 - ph)) * s
        glow(c, px, py - 20 * s, 300 * s, (0.75, 0.85, 1.0), 0.32 * ph)
        shape(c, pen, [(px - 42 * s, py - 70 * s), (px + 42 * s, py - 70 * s), (px + 42 * s, py + 40 * s), (px - 42 * s, py + 40 * s)], (0.12, 0.12, 0.15), smooth=False, lw=2.6)
        c.set_source_rgb(0.86, 0.9, 0.98); c.rectangle(px - 34 * s, py - 62 * s, 68 * s, 92 * s); c.fill()
        for k in range(3): c.set_source_rgba(0.3, 0.32, 0.4, 0.5); c.rectangle(px - 24 * s, py - 48 * s + k * 18 * s, (48 - 14 * k) * s, 6 * s); c.fill()
        for side in (-1, 1):  # thumbs over the phone
            shape(c, pen, ellipse_pts(px + side * 40 * s, py + 5 * s, 16 * s, 20 * s, 12), SKIN, lw=2.4)
    # neck
    shape(c, pen, [(x - 30 * s, y + 70 * s), (x + 30 * s, y + 70 * s), (x + 32 * s, sh_y - 5 * s), (x - 32 * s, sh_y - 5 * s)], (0.86, 0.70, 0.59), smooth=False, lw=2.6)
    # head (tilt)
    tilt = math.radians(p.get("tilt", 0.0))
    c.save(); c.translate(x, y + 60 * s); c.rotate(tilt); c.translate(-x, -(y + 60 * s))
    # back hair
    shape(c, pen, ellipse_pts(x, y + 6 * s, 112 * s, 116 * s), HAIR)
    shape(c, pen, ellipse_pts(x, y + 12 * s, 100 * s, 106 * s), SKIN)
    # glow from phone on the face
    glow(c, x, y + 70 * s, 140 * s, (0.7, 0.8, 1.0), 0.18 * ph)
    # hair cap with middle part
    shape(c, pen, [(x - 104 * s, y + 10 * s), (x - 98 * s, y - 60 * s), (x - 50 * s, y - 104 * s), (x, y - 112 * s), (x + 50 * s, y - 104 * s),
                   (x + 98 * s, y - 60 * s), (x + 104 * s, y + 10 * s), (x + 80 * s, y - 40 * s), (x + 30 * s, y - 70 * s), (x, y - 78 * s),
                   (x - 30 * s, y - 70 * s), (x - 80 * s, y - 40 * s)], HAIR)
    # face
    ld = p.get("look_down", 0.0); eyy = y + (18 + 10 * ld) * s
    c.set_source_rgb(*LINE)
    for side in (-1, 1):
        ex = x + side * 38 * s
        if p.get("blink"):
            shape(c, pen, [(ex - 11 * s, eyy), (ex + 11 * s, eyy)], None, lw=3, close=False, smooth=False)
        else:
            shape(c, pen, ellipse_pts(ex, eyy, 7.5 * s, 9 * s, 12), LINE, lw=1.5)
            if p.get("sad", 0) > 0.3:  # heavy upper lid
                shape(c, pen, [(ex - 14 * s, eyy - 6 * s), (ex + 14 * s, eyy - 4 * s)], None, lw=3, close=False, smooth=False)
        # brows: inner ends up when sad
        sd = p.get("sad", 0.0)
        shape(c, pen, [(x + side * 58 * s, eyy - 30 * s), (x + side * 22 * s, eyy - 32 * s - 10 * sd * s)], None, lw=3, close=False, smooth=False)
        c.set_source_rgba(*CHEEK, 0.45); c.save(); c.translate(x + side * 62 * s, eyy + 34 * s); c.scale(18 * s, 10 * s); c.arc(0, 0, 1, 0, 2 * math.pi); c.restore(); c.fill()
    shape(c, pen, [(x - 4 * s, eyy + 22 * s), (x + 4 * s, eyy + 30 * s), (x - 3 * s, eyy + 34 * s)], None, lw=2.4, close=False)
    m = p.get("sad", 0.0)
    shape(c, pen, [(x - 16 * s, eyy + 58 * s + 4 * m * s), (x, eyy + 54 * s - 2 * m * s + 6 * (1 - m) * s), (x + 16 * s, eyy + 58 * s + 4 * m * s)], None, lw=3, close=False)
    c.restore()
    # braids in front of the shoulders
    for side in (-1, 1):
        bx = x + side * 92 * s
        for k in range(6):
            by = y + 100 * s + k * 46 * s + 8 * sigh
            shape(c, pen, ellipse_pts(bx + side * 4 * s * (k % 2), by, 26 * s - k * 1.2 * s, 28 * s, 14), HAIR, lw=2.6)
        shape(c, pen, ellipse_pts(bx, y + 100 * s + 6 * 46 * s - 14 * s + 8 * sigh, 16 * s, 9 * s, 10), BAND, lw=2.2)

# ---------------------------------------------------------------- text
F_TOP = ImageFont.truetype(os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts", "Inter-Black.otf"), 74)
F_SUB = ImageFont.truetype(os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts", "Inter-Black.otf"), 80)
ACC = (247, 196, 120)
def caption(d, words, y, font):
    sp = font.getlength(" "); tw = sum(font.getlength(w) for w, _ in words) + sp * (len(words) - 1); xx = 500 - tw / 2
    for w, k in words:
        d.text((xx, y), w, font=font, fill=ACC if k else (250, 245, 238), stroke_width=7, stroke_fill=(28, 20, 26)); xx += font.getlength(w) + sp

# ---------------------------------------------------------------- frame
def frame(i):
    t = i / FPS
    td = math.floor(t * 12) / 12          # animate the drawing on twos (12 drawings per second)
    pen = Pen(int(td * 12) + 1)
    s = cairo.ImageSurface(cairo.FORMAT_RGB24, W, H); c = cairo.Context(s)
    z = 1 + 0.05 * ease(t / DUR)
    c.translate(500, 900); c.scale(z, z); c.translate(-500, -900)
    room(c, Pen(7 + int(td * 12) % 3), td)
    ca = ease((td - 2.6) / 1.4)
    creature(c, pen, 760, 860, 1.05, ca * 0.95, td, blink=(4.6 <= td < 4.75))
    lower = ease((td - 1.4) / 0.9)
    girl(c, pen, 430, 640, 1.0, dict(phone=1 - 0.85 * lower, tilt=-4 * lower + 1.5 * math.sin(td * 1.3), look_down=0.6 + 0.4 * lower,
                                    blink=(0.9 <= td < 1.05) or (3.6 <= td < 3.75), sad=0.3 + 0.7 * lower, sigh=ease((td - 3.0) / 0.8) * (1 - ease((td - 4.2) / 0.8))))
    s.flush()
    arr = np.frombuffer(s.get_data(), np.uint8).reshape(H, W, 4)[:, :, [2, 1, 0]]
    im = Image.fromarray(finish(arr, int(td * 12)))
    d = ImageDraw.Draw(im)
    caption(d, [("Warum", 0), ("er", 0), ("dir", 0), ("nicht", 0)], 220, F_TOP)
    caption(d, [("aus", 0), ("dem", 0), ("Kopf", 1), ("geht", 0)], 310, F_TOP)
    if t < 2.4: caption(d, [("ER", 0), ("SCHREIBT", 1), ("NICHT", 0)], 1235, F_SUB)
    else: caption(d, [("UND", 0), ("DU", 0), ("WARTEST", 1)], 1235, F_SUB)
    return im

if __name__ == "__main__":
    if PREVIEW:
        for t in (0.5, 2.0, 4.0, 5.5): frame(int(t * FPS)).resize((432, 768)).save(f"{OUT}/sb_{t}.png")
        sys.exit()
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                          "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", f"{OUT}/storybook_video.mp4"], stdin=subprocess.PIPE)
    for i in range(int(DUR * FPS)): p.stdin.write(frame(i).tobytes())
    p.stdin.close(); p.wait()
