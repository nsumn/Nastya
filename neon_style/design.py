"""Neon style test (idea from fakedrake15, own characters): dark navy, glowing line icons, two soft characters
(her: pink, long hair to the shoulders; him: blue, short hair), bold uppercase words at the top with one coloured keyword.
python design.py <out_dir>   -> design_sheet.png + single frames"""
import math, os, sys
import numpy as np
import cairocffi as cairo
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT = sys.argv[1] if len(sys.argv) > 1 else "out"; os.makedirs(OUT, exist_ok=True)
W, H = 1080, 1920
PINK, BLUE, GOLD, VIOLET, WHITE = (1.0, 0.42, 0.66), (0.33, 0.66, 1.0), (1.0, 0.72, 0.30), (0.70, 0.52, 1.0), (1, 1, 1)
FONT = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"


def bg(c):
    g = cairo.RadialGradient(540, 900, 50, 540, 960, 1300)
    g.add_color_stop_rgb(0, 0.07, 0.08, 0.20); g.add_color_stop_rgb(1, 0.015, 0.02, 0.06)
    c.set_source(g); c.paint()


def neon(draw_fn, col, width=7, glow=24):
    """draw a path twice: a wide soft glow layer and a crisp core line"""
    s = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H); c = cairo.Context(s)
    c.set_line_cap(cairo.LINE_CAP_ROUND); c.set_line_join(cairo.LINE_JOIN_ROUND)
    draw_fn(c); c.set_source_rgba(*col, 1); c.set_line_width(width); c.stroke()
    s.flush()
    a = np.frombuffer(s.get_data(), np.uint8).reshape(H, W, 4).copy()
    core = Image.fromarray(a[:, :, [2, 1, 0, 3]], "RGBA")
    def boost(img, k):                                   # blurred alpha is faint: lift it so the glow reads
        r, g_, b, al = img.split(); return Image.merge("RGBA", (r, g_, b, al.point(lambda v: min(255, int(v * k)))))
    g = boost(core.filter(ImageFilter.GaussianBlur(glow)), 3.0); g2 = boost(core.filter(ImageFilter.GaussianBlur(glow / 3)), 2.0)
    return [g, g2, core]


def blob_char(c, x, y, r, col, her, face="smile", look=0.0):
    """the character: round soft head + small bean body, filled with a radial gradient"""
    def fill(path_fn, cx, cy, rr):
        g = cairo.RadialGradient(cx - rr * 0.35, cy - rr * 0.4, rr * 0.1, cx, cy, rr * 1.25)
        g.add_color_stop_rgb(0, min(1, col[0] + 0.35), min(1, col[1] + 0.35), min(1, col[2] + 0.25)); g.add_color_stop_rgb(1, col[0] * 0.55, col[1] * 0.55, col[2] * 0.7)
        path_fn(); c.set_source(g); c.fill()
    # body (bean)
    by = y + r * 1.75
    fill(lambda: (c.save(), c.translate(x, by), c.scale(r * 0.78, r * 0.95), c.arc(0, 0, 1, 0, 2 * math.pi), c.restore()), x, by, r)
    if her:   # hair mass behind the head, down to the shoulders
        c.save(); c.translate(x, y + r * 0.35); c.scale(r * 1.12, r * 1.2); c.arc(0, 0, 1, 0, 2 * math.pi); c.restore()
        c.set_source_rgb(col[0] * 0.62, col[1] * 0.45, col[2] * 0.55); c.fill()
    fill(lambda: c.arc(x, y, r, 0, 2 * math.pi), x, y, r)
    if her:   # side-parted fringe line over the forehead
        c.move_to(x - r * 0.95, y - r * 0.05); c.curve_to(x - r * 0.6, y - r * 0.9, x + r * 0.2, y - r * 1.05, x + r * 0.95, y - r * 0.2)
        c.curve_to(x + r * 0.7, y - r * 1.15, x - r * 0.9, y - r * 1.2, x - r * 0.95, y - r * 0.05)
        c.set_source_rgb(col[0] * 0.62, col[1] * 0.45, col[2] * 0.55); c.fill()
    else:     # short hair cap
        c.move_to(x - r * 0.92, y - r * 0.25); c.curve_to(x - r * 0.8, y - r * 1.15, x + r * 0.8, y - r * 1.15, x + r * 0.92, y - r * 0.25)
        c.curve_to(x + r * 0.5, y - r * 0.6, x - r * 0.5, y - r * 0.6, x - r * 0.92, y - r * 0.25)
        c.set_source_rgb(col[0] * 0.35, col[1] * 0.4, col[2] * 0.6); c.fill()
    # face
    ex = r * 0.32; ey = y + r * 0.08; lx = look * r * 0.12
    c.set_source_rgb(0.08, 0.06, 0.12); c.set_line_width(r * 0.07); c.set_line_cap(cairo.LINE_CAP_ROUND)
    for s in (-1, 1):
        if face == "sleep":
            c.arc(x + s * ex + lx, ey, r * 0.13, 0.15 * math.pi, 0.85 * math.pi); c.stroke()
        else:
            c.save(); c.translate(x + s * ex + lx, ey); c.scale(r * 0.085, r * 0.12); c.arc(0, 0, 1, 0, 2 * math.pi); c.restore(); c.fill()
    my = y + r * 0.42
    if face == "sad": c.arc(x + lx, my + r * 0.16, r * 0.17, 1.15 * math.pi, 1.85 * math.pi)
    else: c.arc(x + lx, my - r * 0.06, r * 0.17, 0.15 * math.pi, 0.85 * math.pi)
    c.stroke()
    for s in (-1, 1):   # cheeks
        g = cairo.RadialGradient(x + s * r * 0.55 + lx, y + r * 0.35, 0, x + s * r * 0.55 + lx, y + r * 0.35, r * 0.2)
        g.add_color_stop_rgba(0, 1, 0.5, 0.6, 0.5); g.add_color_stop_rgba(1, 1, 0.5, 0.6, 0)
        c.set_source(g); c.arc(x + s * r * 0.55 + lx, y + r * 0.35, r * 0.2, 0, 2 * math.pi); c.fill()


def heart_path(c, x, y, s):
    c.move_to(x, y + s * 0.9); c.curve_to(x - s * 1.6, y - s * 0.2, x - s * 0.9, y - s * 1.5, x, y - s * 0.6)
    c.curve_to(x + s * 0.9, y - s * 1.5, x + s * 1.6, y - s * 0.2, x, y + s * 0.9); c.close_path()


def title(im, words, key_col):
    """bold uppercase, centred, the word in [brackets] gets the colour"""
    d = ImageDraw.Draw(im); f = ImageFont.truetype(FONT, 58)
    lines, cur = [], []
    for p in words.split():                               # wrap to the safe width
        if cur and f.getlength(" ".join(q.strip("[]") for q in cur + [p]).upper()) > 880: lines.append(cur); cur = []
        cur.append(p)
    lines.append(cur)
    for li, parts in enumerate(lines):
        tot = f.getlength(" ".join(q.strip("[]") for q in parts).upper()); x = (W - tot) / 2; y = 300 + li * 74
        for p in parts:
            col = tuple(int(v * 255) for v in key_col) if p.startswith("[") else (255, 255, 255)
            t = p.strip("[]").upper(); d.text((x, y), t, font=f, fill=col); x += f.getlength(t + " ")


def compose(layers_fn, chars_fn, words, key_col):
    s = cairo.ImageSurface(cairo.FORMAT_RGB24, W, H); c = cairo.Context(s); bg(c); s.flush()
    base = Image.fromarray(np.frombuffer(s.get_data(), np.uint8).reshape(H, W, 4)[:, :, [2, 1, 0]].copy()).convert("RGBA")
    for lay in layers_fn():
        for l in lay: base = Image.alpha_composite(base, l)
    if chars_fn:
        cs = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H); cc = cairo.Context(cs); chars_fn(cc); cs.flush()
        a = np.frombuffer(cs.get_data(), np.uint8).reshape(H, W, 4).copy()
        ch = Image.fromarray(a[:, :, [2, 1, 0, 3]], "RGBA")
        glow = ch.filter(ImageFilter.GaussianBlur(30)); base = Image.alpha_composite(base, glow); base = Image.alpha_composite(base, ch)
    im = base.convert("RGB"); title(im, words, key_col); return im


# ---------------------------------------------------------------- four sample frames
def f1():   # hook: stairs of the relationship, the couple on step 3
    def stairs(c):
        x, y = 160, 1400
        c.move_to(x, y)
        for i in range(6): c.line_to(x + 110, y); x += 110; c.line_to(x, y - 110); y -= 110
    lay = lambda: [neon(stairs, VIOLET), neon(lambda c: heart_path(c, 840, 760, 40), PINK, 7)]
    return compose(lay, lambda c: (blob_char(c, 430, 760, 80, PINK, True), blob_char(c, 600, 760, 86, BLUE, False)),
                   "Die meisten Paare geben bei [Phase] 3 auf", BLUE)

def f2():   # step number in a glowing ring
    lay = lambda: [neon(lambda c: c.arc(540, 960, 200, 0, 2 * math.pi), GOLD, 9, 30), neon(lambda c: heart_path(c, 540, 660, 40), PINK, 7)]
    im = compose(lay, None, "Phase eins: [Verliebtheit]", GOLD)
    d = ImageDraw.Draw(im); f = ImageFont.truetype(FONT, 230); t = "1"; d.text((540 - f.getlength(t) / 2, 820), t, font=f, fill=(255, 200, 120))
    for i in range(6): d.ellipse((440 + i * 36, 1210, 456 + i * 36, 1226), fill=(255, 200, 120) if i == 0 else (60, 64, 90))
    return im

def f3():   # in bed, a window with the moon
    def bedlines(c):
        c.rectangle(240, 860, 600, 600); c.move_to(240, 1010); c.curve_to(450, 950, 650, 1060, 840, 990)
    def window(c):
        c.move_to(700, 760); c.line_to(700, 600); c.curve_to(700, 530, 840, 530, 840, 600); c.line_to(840, 760); c.close_path()
        c.move_to(770, 540); c.line_to(770, 760); c.move_to(700, 670); c.line_to(840, 670)
    lay = lambda: [neon(bedlines, BLUE, 6), neon(window, VIOLET, 5), neon(lambda c: c.arc(805, 610, 18, 0.5, 4.2), GOLD, 5)]
    def chars(c):
        blob_char(c, 420, 900, 86, BLUE, False, "sleep"); blob_char(c, 660, 900, 80, PINK, True, "sleep")
        c.move_to(240, 1010); c.curve_to(450, 950, 650, 1060, 840, 990); c.line_to(840, 1460); c.line_to(240, 1460); c.close_path()
        g = cairo.LinearGradient(0, 990, 0, 1460); g.add_color_stop_rgb(0, 0.20, 0.22, 0.52); g.add_color_stop_rgb(1, 0.06, 0.07, 0.20)
        c.set_source(g); c.fill()                                                         # duvet over the bodies
    return compose(lay, chars, "Sie schläft neben ihm [sofort] ein", PINK)

def f4():   # conflict: apart, a broken loop between them
    def loop(c):
        c.arc(540, 1000, 250, 0.2 * math.pi, 0.8 * math.pi); c.new_sub_path(); c.arc(540, 1000, 250, 1.2 * math.pi, 1.8 * math.pi)
    lay = lambda: [neon(loop, PINK, 6), neon(lambda c: (c.move_to(560, 600), c.line_to(515, 680), c.line_to(565, 680), c.line_to(520, 760)), GOLD, 8)]
    return compose(lay, lambda c: (blob_char(c, 330, 900, 92, BLUE, False, "sad", 0.6), blob_char(c, 750, 900, 86, PINK, True, "sad", -0.6)),
                   "Phase drei: [Konflikte]", PINK)

frames = [f1(), f2(), f3(), f4()]
for i, im in enumerate(frames): im.save(f"{OUT}/neon_{i + 1}.png")
sheet = Image.new("RGB", (4 * 405 + 30, 720), (5, 6, 12))
for i, im in enumerate(frames): sheet.paste(im.resize((405, 720)), (i * 415, 0))
sheet.save(f"{OUT}/design_sheet.png")
