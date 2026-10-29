"""TikTok profile picture variants (1080x1080, safe inside the round crop) with our couple."""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
sys.path.insert(0, HERE)
import cairocffi as cairo, numpy as np
from PIL import Image, ImageDraw
import character2 as C2
from storybook import glow
C2.PROP["name"] = "oval"
N = 1080

def base(c, warm=1.0):
    g = cairo.RadialGradient(540, 470, 40, 540, 540, 760)
    g.add_color_stop_rgb(0, 0.20, 0.21, 0.32); g.add_color_stop_rgb(1, 0.07, 0.07, 0.12)
    c.set_source(g); c.paint()
    glow(c, 540, 430, 520, (1.0, 0.72, 0.42), 0.30 * warm)

def heart(c, x, y, s, col):
    c.save(); c.translate(x, y); c.scale(s, s)
    c.move_to(0, 30); c.curve_to(-70, -20, -45, -80, 0, -45); c.curve_to(45, -80, 70, -20, 0, 30); c.close_path()
    c.set_source_rgb(*col); c.fill_preserve(); c.set_source_rgb(*C2.LINE); c.set_line_width(5 / s); c.stroke(); c.restore()

def couple(c, gy, h, tilt=14, her_emo="closed", him_emo="smile", dx=70):
    C2.person(c, 610 + dx, gy, h * 1.05, "m", dict(emo=him_emo, look=(-0.4, 0.2), head_tilt=-6, skip_arms=("arm_l",), arm_r=(6, 8), hide_legs=True))
    C2.person(c, 455 + dx, gy, h, "w", dict(emo=her_emo, look=(0.3, 0.1), head_tilt=tilt, lean=-6, skip_arms=("arm_r",), arm_l=(6, 8), hide_legs=True))

def v1(c):   # A: the couple, her head on his shoulder, warm lamp light
    base(c); couple(c, 1900, 1500); heart(c, 860, 260, 1.0, (0.90, 0.72, 0.36))
def v2(c):   # B: the same, both smiling, slightly wider
    base(c, 0.8); couple(c, 1780, 1350, 10, "smile", "smile"); heart(c, 540, 170, 0.8, (0.90, 0.72, 0.36))
def v3(c):   # C: a single golden heart between two simple head silhouettes (logo-like)
    base(c, 0.6)
    for x, col in ((380, (0.79, 0.54, 0.57)), (700, (0.58, 0.69, 0.59))):
        c.arc(x, 470, 150, 0, 2 * math.pi); c.set_source_rgb(*col); c.fill_preserve(); c.set_source_rgb(*C2.LINE); c.set_line_width(8); c.stroke()
        c.move_to(x - 240, 1200); c.line_to(x - 240, 1000); c.curve_to(x - 230, 700, x + 230, 700, x + 240, 1000); c.line_to(x + 240, 1200); c.close_path(); c.set_source_rgb(*col); c.fill_preserve(); c.set_source_rgb(*C2.LINE); c.stroke()
    glow(c, 540, 600, 260, (1.0, 0.75, 0.40), 0.6); heart(c, 540, 600, 1.4, (0.95, 0.76, 0.38))

ims = []
for k, fn in enumerate((v1, v2, v3)):
    s = cairo.ImageSurface(cairo.FORMAT_RGB24, N, N); c = cairo.Context(s); fn(c); s.flush()
    im = Image.fromarray(np.frombuffer(s.get_data(), np.uint8).reshape(N, N, 4)[:, :, [2, 1, 0]].copy())
    im.save(f"{OUT}/avatar_{'ABC'[k]}.png"); ims.append(im)
# preview: big round crop + small size like in the app
prev = Image.new("RGB", (3 * 420, 560), (245, 245, 247)); d = ImageDraw.Draw(prev)
mask = Image.new("L", (380, 380), 0); ImageDraw.Draw(mask).ellipse((0, 0, 379, 379), fill=255)
small = Image.new("L", (110, 110), 0); ImageDraw.Draw(small).ellipse((0, 0, 109, 109), fill=255)
for k, im in enumerate(ims):
    prev.paste(im.resize((380, 380)), (20 + k * 420, 20), mask)
    prev.paste(im.resize((110, 110)), (155 + k * 420, 430), small)
    d.text((20 + k * 420, 420), "ABC"[k], fill=(30, 30, 40))
prev.save(f"{OUT}/avatar_preview.png")
