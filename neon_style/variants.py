"""Four OWN design directions for the 2D channel (same scene in each: the two of them in bed + the title),
so the style can be chosen before a video is made.  python variants.py <out_dir>
A paper cut-out at night   B chalk on a dark board   C flat warm editorial   D frosted glass on a soft gradient"""
import math, os, sys, random
import numpy as np
import cairocffi as cairo
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT = sys.argv[1] if len(sys.argv) > 1 else "out"; os.makedirs(OUT, exist_ok=True)
W, H = 1080, 1920
FD = "/usr/share/fonts/opentype/inter/"
TITLE = ["Sie schläft neben ihm", "sofort ein"]


def surface():
    s = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H); return s, cairo.Context(s)


def to_img(s):
    s.flush(); a = np.frombuffer(s.get_data(), np.uint8).reshape(H, W, 4).copy()
    return Image.fromarray(a[:, :, [2, 1, 0, 3]], "RGBA")


def ell(c, x, y, rx, ry):
    c.save(); c.translate(x, y); c.scale(rx, ry); c.arc(0, 0, 1, 0, 2 * math.pi); c.restore()


def face(c, x, y, r, col, sleep=True, lw=None):
    c.set_source_rgb(*col); c.set_line_width(lw or r * 0.07); c.set_line_cap(cairo.LINE_CAP_ROUND)
    for s in (-1, 1):
        if sleep: c.new_sub_path(); c.arc(x + s * r * 0.32, y + r * 0.05, r * 0.13, 0.15 * math.pi, 0.85 * math.pi); c.stroke()
        else: ell(c, x + s * r * 0.32, y, r * 0.08, r * 0.11); c.fill()
    c.new_sub_path(); c.arc(x, y + r * 0.32, r * 0.15, 0.2 * math.pi, 0.8 * math.pi); c.stroke()


def hair_her(c, x, y, r):
    """shoulder-length hair: one mass behind the head + a soft side fringe"""
    c.move_to(x - r * 1.05, y + r * 0.9); c.curve_to(x - r * 1.25, y - r * 0.4, x - r * 0.7, y - r * 1.2, x, y - r * 1.15)
    c.curve_to(x + r * 0.7, y - r * 1.2, x + r * 1.25, y - r * 0.4, x + r * 1.05, y + r * 0.9); c.close_path()


def fringe(c, x, y, r):
    c.move_to(x - r * 0.95, y - r * 0.05); c.curve_to(x - r * 0.6, y - r * 0.85, x + r * 0.2, y - r * 1.05, x + r * 0.95, y - r * 0.25)
    c.curve_to(x + r * 0.6, y - r * 1.15, x - r * 0.9, y - r * 1.15, x - r * 0.95, y - r * 0.05); c.close_path()


def cap_him(c, x, y, r):
    c.move_to(x - r * 0.95, y - r * 0.2); c.curve_to(x - r * 0.85, y - r * 1.15, x + r * 0.85, y - r * 1.15, x + r * 0.95, y - r * 0.2)
    c.curve_to(x + r * 0.5, y - r * 0.55, x - r * 0.5, y - r * 0.55, x - r * 0.95, y - r * 0.2); c.close_path()


def text(im, lines, font, size, col, y0, key=None, keycol=None, upper=False, spacing=1.25, shadow=None):
    d = ImageDraw.Draw(im); f = ImageFont.truetype(font, size)
    for i, ln in enumerate(lines):
        t = ln.upper() if upper else ln; w = f.getlength(t); x = (W - w) / 2; y = y0 + i * size * spacing
        if shadow: d.text((x + 4, y + 5), t, font=f, fill=shadow)
        if key and key in ln:
            pre, post = t.split(key.upper() if upper else key, 1); kk = key.upper() if upper else key
            d.text((x, y), pre, font=f, fill=col); x += f.getlength(pre)
            d.text((x, y), kk, font=f, fill=keycol); x += f.getlength(kk)
            d.text((x, y), post, font=f, fill=col)
        else:
            d.text((x, y), t, font=f, fill=col)


# ---------------------------------------------------------------- A: paper cut-out at night
def var_a():
    s, c = surface()
    g = cairo.LinearGradient(0, 0, 0, H); g.add_color_stop_rgb(0, 0.12, 0.13, 0.27); g.add_color_stop_rgb(1, 0.20, 0.17, 0.30); c.set_source(g); c.paint()
    base = to_img(s)
    def layer(fn, col, shadow=14):
        ls, lc = surface(); fn(lc); lc.set_source_rgb(*col); lc.fill(); im = to_img(ls)
        sh = Image.new("RGBA", im.size, (0, 0, 0, 0)); sh.putalpha(im.split()[3].point(lambda v: v * 0.45))
        sh = sh.filter(ImageFilter.GaussianBlur(shadow))
        nonlocal base; base.alpha_composite(sh, (6, 12)); base.alpha_composite(im)
        # paper grain
        n = (np.random.default_rng(1).random((H, W)) * 18).astype(np.uint8)
    layer(lambda c: ell(c, 830, 470, 70, 70), (0.98, 0.90, 0.72))                                           # moon
    layer(lambda c: (c.move_to(-20, 1150), c.curve_to(300, 1000, 700, 1120, 1100, 980), c.line_to(1100, 1920), c.line_to(-20, 1920), c.close_path()), (0.26, 0.24, 0.40))
    layer(lambda c: (c.rectangle(150, 860, 780, 140)), (0.85, 0.80, 0.86))                                  # headboard
    layer(lambda c: hair_her(c, 640, 1010, 95), (0.55, 0.22, 0.36))
    layer(lambda c: ell(c, 640, 1010, 95, 95), (0.93, 0.55, 0.68))
    layer(lambda c: fringe(c, 640, 1010, 95), (0.55, 0.22, 0.36))
    layer(lambda c: ell(c, 430, 1010, 100, 100), (0.45, 0.65, 0.95))
    layer(lambda c: cap_him(c, 430, 1010, 100), (0.22, 0.30, 0.55))
    layer(lambda c: (c.move_to(120, 1080), c.curve_to(400, 1030, 700, 1110, 960, 1050), c.line_to(960, 1560), c.line_to(120, 1560), c.close_path()), (0.96, 0.91, 0.86), 22)
    for x in (300, 620, 830):                                                                               # stars
        layer(lambda c, x=x: (c.move_to(x, 380), c.line_to(x + 12, 410), c.line_to(x + 42, 412), c.line_to(x + 18, 430), c.line_to(x + 26, 460), c.line_to(x, 442),
                              c.line_to(x - 26, 460), c.line_to(x - 18, 430), c.line_to(x - 42, 412), c.line_to(x - 12, 410), c.close_path()), (0.98, 0.90, 0.72), 6)
    fs, fc = surface()
    for x, y, r in ((430, 1010, 100), (640, 1010, 95)): face(fc, x, y, r, (0.15, 0.10, 0.18))
    base.alpha_composite(to_img(fs))
    im = base.convert("RGB"); text(im, TITLE, FD + "Inter-ExtraBold.otf", 66, (250, 240, 228), 220, "sofort", (255, 170, 190), shadow=(20, 18, 40))
    return im


# ---------------------------------------------------------------- B: chalk on a dark board
def chalk_stroke(c, pts, col, w=7, seed=0):
    rnd = random.Random(seed)
    for k in range(3):
        c.move_to(*[p + rnd.uniform(-2.5, 2.5) for p in pts[0]])
        for p in pts[1:]: c.line_to(p[0] + rnd.uniform(-2.5, 2.5), p[1] + rnd.uniform(-2.5, 2.5))
        c.set_source_rgba(*col, 0.45); c.set_line_width(w * (1 - 0.25 * k)); c.set_line_cap(cairo.LINE_CAP_ROUND); c.stroke()


def circle_pts(x, y, rx, ry, a0=0, a1=2 * math.pi, n=60):
    return [(x + rx * math.cos(a0 + (a1 - a0) * i / n), y + ry * math.sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]


def var_b():
    s, c = surface()
    c.set_source_rgb(0.13, 0.15, 0.15); c.paint()
    rnd = np.random.default_rng(2)
    for _ in range(9000):                                    # board dust
        x, y = rnd.uniform(0, W), rnd.uniform(0, H); c.set_source_rgba(1, 1, 1, rnd.uniform(0.01, 0.05)); c.rectangle(x, y, 2, 2); c.fill()
    PINK, BLUE, CREAM = (1.0, 0.62, 0.75), (0.55, 0.78, 1.0), (0.95, 0.94, 0.88)
    chalk_stroke(c, [(150, 1500), (150, 900), (930, 900), (930, 1500)], CREAM, 8, 1)
    chalk_stroke(c, [(150, 1080), (400, 1030), (700, 1110), (930, 1050)], CREAM, 8, 2)
    for x, y, r, col, her in ((420, 1000, 95, BLUE, False), (650, 1000, 90, PINK, True)):
        chalk_stroke(c, circle_pts(x, y, r, r), col, 8, int(x))
        if her: chalk_stroke(c, circle_pts(x, y + 15, r * 1.18, r * 1.15, math.pi * 0.95, math.pi * 2.05), col, 7, 5)
        else: chalk_stroke(c, circle_pts(x, y, r * 0.95, r * 0.95, math.pi * 1.1, math.pi * 1.9), col, 10, 6)
        for sd in (-1, 1): chalk_stroke(c, circle_pts(x + sd * r * 0.32, y + 5, r * 0.13, r * 0.1, 0.15 * math.pi, 0.85 * math.pi, 12), CREAM, 6, sd + 9)
        chalk_stroke(c, circle_pts(x, y + r * 0.3, r * 0.15, r * 0.12, 0.2 * math.pi, 0.8 * math.pi, 12), CREAM, 6, 11)
    for i, (x, y) in enumerate(((760, 620), (800, 560), (850, 500))):
        f = 1 + i * 0.4; chalk_stroke(c, [(x, y), (x + 30 * f, y), (x, y + 30 * f), (x + 30 * f, y + 30 * f)], CREAM, 5, 20 + i)
    for t in range(40):                                      # hatch shading on the blanket
        x = 170 + t * 19; chalk_stroke(c, [(x, 1130), (x + 60, 1480)], (0.75, 0.75, 0.85), 3, 40 + t)
    im = to_img(s).convert("RGB")
    text(im, TITLE, FD + "Inter-SemiBold.otf", 64, (240, 238, 228), 220, "sofort", (255, 160, 190))
    return im


# ---------------------------------------------------------------- C: flat warm editorial (light background)
def var_c():
    s, c = surface()
    c.set_source_rgb(0.96, 0.90, 0.82); c.paint()
    c.set_source_rgb(0.90, 0.48, 0.38); ell(c, 540, 1080, 470, 470); c.fill()                               # big terracotta sun disc
    c.set_source_rgb(0.20, 0.22, 0.36); c.rectangle(110, 1160, 860, 520); c.fill()                         # bed
    c.set_source_rgb(0.98, 0.96, 0.92); c.rectangle(160, 1010, 760, 170); c.fill()                         # pillow strip
    for x, y, r, col, dark, her in ((410, 1060, 100, (0.40, 0.58, 0.92), (0.18, 0.24, 0.48), False), (670, 1060, 95, (0.95, 0.56, 0.68), (0.55, 0.20, 0.33), True)):
        if her: hair_her(c, x, y, r); c.set_source_rgb(*dark); c.fill()
        ell(c, x, y, r, r); c.set_source_rgb(*col); c.fill()
        (fringe if her else cap_him)(c, x, y, r); c.set_source_rgb(*dark); c.fill()
        face(c, x, y, r, (0.12, 0.10, 0.14))
    c.set_source_rgb(0.98, 0.84, 0.55); c.move_to(110, 1200); c.curve_to(400, 1140, 700, 1240, 970, 1170); c.line_to(970, 1680); c.line_to(110, 1680); c.close_path(); c.fill()
    c.set_source_rgb(0.20, 0.22, 0.36)
    for x in range(140, 970, 90): ell(c, x, 1420, 14, 14); c.fill()                                         # dots on the blanket
    im = to_img(s).convert("RGB")
    text(im, TITLE, FD + "Inter-ExtraBold.otf", 70, (40, 38, 60), 230, "sofort", (214, 92, 76))
    return im


# ---------------------------------------------------------------- D: frosted glass on a soft gradient
def var_d():
    s, c = surface()
    for (x, y, r, col) in ((200, 400, 900, (0.42, 0.25, 0.62)), (950, 1500, 1000, (0.18, 0.30, 0.65)), (700, 900, 700, (0.75, 0.32, 0.52))):
        g = cairo.RadialGradient(x, y, 0, x, y, r); g.add_color_stop_rgba(0, *col, 1); g.add_color_stop_rgba(1, *col, 0)
        c.set_source(g); c.paint()
    base = to_img(s).filter(ImageFilter.GaussianBlur(40))
    bg = Image.new("RGBA", (W, H), (22, 18, 40, 255)); bg.alpha_composite(base); base = bg
    # glass card
    card = Image.new("RGBA", (W, H), (0, 0, 0, 0)); cd = ImageDraw.Draw(card)
    cd.rounded_rectangle((110, 720, 970, 1560), 70, fill=(255, 255, 255, 38), outline=(255, 255, 255, 90), width=3)
    blurred = base.filter(ImageFilter.GaussianBlur(30)); mask = card.split()[3].point(lambda v: 255 if v else 0)
    base.paste(blurred, (0, 0), mask); base.alpha_composite(card)
    cs, cc = surface()
    for x, y, r, col, her in ((420, 1080, 105, (0.45, 0.68, 1.0), False), (660, 1080, 100, (1.0, 0.55, 0.72), True)):
        if her:
            hair_her(cc, x, y, r); cc.set_source_rgb(0.62, 0.25, 0.45); cc.fill()
        g = cairo.RadialGradient(x - r * 0.4, y - r * 0.45, r * 0.1, x, y, r * 1.1)
        g.add_color_stop_rgb(0, min(1, col[0] + 0.3), min(1, col[1] + 0.3), min(1, col[2] + 0.2)); g.add_color_stop_rgb(1, col[0] * 0.6, col[1] * 0.6, col[2] * 0.8)
        ell(cc, x, y, r, r); cc.set_source(g); cc.fill()
        (fringe if her else cap_him)(cc, x, y, r); cc.set_source_rgb(*((0.62, 0.25, 0.45) if her else (0.20, 0.32, 0.62))); cc.fill()
        face(cc, x, y, r, (0.12, 0.10, 0.18))
    cc.move_to(160, 1170); cc.curve_to(420, 1120, 680, 1210, 920, 1150); cc.line_to(920, 1500); cc.line_to(160, 1500); cc.close_path()
    g = cairo.LinearGradient(0, 1150, 0, 1500); g.add_color_stop_rgba(0, 1, 1, 1, 0.55); g.add_color_stop_rgba(1, 1, 1, 1, 0.15); cc.set_source(g); cc.fill()
    ch = to_img(cs); base.alpha_composite(ch.filter(ImageFilter.GaussianBlur(25))); base.alpha_composite(ch)
    im = base.convert("RGB")
    text(im, TITLE, FD + "Inter-Bold.otf", 64, (255, 255, 255), 250, "sofort", (255, 190, 215))
    return im


frames = [("A", var_a()), ("B", var_b()), ("C", var_c()), ("D", var_d())]
sheet = Image.new("RGB", (4 * 405 + 30, 780), (240, 240, 244)); d = ImageDraw.Draw(sheet); f = ImageFont.truetype(FD + "Inter-ExtraBold.otf", 40)
for i, (n, im) in enumerate(frames):
    im.save(f"{OUT}/variant_{n}.png"); sheet.paste(im.resize((405, 720)), (i * 415, 0)); d.text((i * 415 + 180, 728), n, font=f, fill=(30, 30, 40))
sheet.save(f"{OUT}/variants_sheet.png")
