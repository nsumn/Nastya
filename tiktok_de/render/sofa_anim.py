"""'Wie Mitbewohner' — 6 s sofa scene in our own look (graphite night room, coral her / teal him)."""
import math, os, subprocess, sys
OUT = sys.argv[1]
PREVIEW = "--preview" in sys.argv
sys.argv = [sys.argv[0], OUT]
import numpy as np
import cairocffi as cairo
from PIL import Image, ImageDraw, ImageFont
import storybook as SB
import adult as A
from storybook import Pen, shape, ellipse_pts, glow

W, H, FPS, DUR = 1080, 1920, 24, 6.0
def ease(u): u = max(0.0, min(1.0, u)); return u * u * (3 - 2 * u)

# ---- our palette: graphite night + coral / teal, crisp dark outlines
OUTL = (0.07, 0.07, 0.10)
SB.LINE = OUTL
A.SWEATER_W, A.SWEATER_W_SH = (1.0, 0.49, 0.40), (0.87, 0.38, 0.32)
A.SWEATER_M, A.SWEATER_M_SH = (0.16, 0.62, 0.60), (0.11, 0.49, 0.48)
A.HAIR_W, A.HAIR_W2 = (0.36, 0.21, 0.15), (0.27, 0.15, 0.11)
A.SKIN, A.SKIN_SH = (0.97, 0.82, 0.71), (0.88, 0.70, 0.60)
WALL0, WALL1 = (0.15, 0.17, 0.26), (0.10, 0.11, 0.17)
SOFA, SOFA_SH, SOFA_HI = (0.25, 0.28, 0.40), (0.19, 0.21, 0.31), (0.31, 0.34, 0.47)

PAPER = SB.TEX.copy()
_fib = np.random.default_rng(21).normal(0, 1, (H, W)).astype(np.float32)
_fib = np.asarray(Image.fromarray(_fib).resize((W // 3, H), Image.BILINEAR).resize((W, H), Image.BILINEAR))   # vertical paper fibres
PAPER = (0.85 * PAPER + 0.25 * _fib); PAPER = (PAPER - PAPER.mean()) / PAPER.std()
SB.GRAIN_UP = [np.asarray(Image.fromarray(g).resize((W, H), Image.NEAREST)) for g in SB.GRAIN]
_yy, _xx = np.mgrid[0:H, 0:W]
VIG = np.clip(1 - 0.55 * (((_xx - W / 2) / (W * 0.62)) ** 2 + ((_yy - H * 0.45) / (H * 0.66)) ** 2), 0.45, 1).astype(np.float32)

def room(c, pen):
    g = cairo.LinearGradient(0, 0, 0, H); g.add_color_stop_rgb(0, *WALL0); g.add_color_stop_rgb(1, *WALL1)
    c.set_source(g); c.paint()
    shape(c, pen, [(330, 420), (690, 420), (690, 660), (330, 660)], (0.20, 0.22, 0.32), smooth=False, lw=3, line=OUTL)
    shape(c, pen, [(352, 442), (668, 442), (668, 638), (352, 638)], (0.27, 0.31, 0.44), smooth=False, lw=2.2, line=OUTL)
    shape(c, pen, [(380, 600), (470, 520), (530, 570), (600, 500), (650, 600)], None, line=(0.42, 0.47, 0.62), lw=4, close=False)
    shape(c, pen, [(960, 1500), (960, 640)], None, lw=6, close=False, smooth=False, line=OUTL)
    shape(c, pen, [(900, 640), (1020, 640), (995, 560), (925, 560)], (1.0, 0.70, 0.45), smooth=False, lw=3, line=OUTL)
    glow(c, 960, 660, 560, (1.0, 0.72, 0.42), 0.30)
    shape(c, pen, [(60, 780), (1020, 780), (1020, 1260), (60, 1260)], SOFA, smooth=False, lw=3, line=OUTL)
    shape(c, pen, [(60, 780), (1020, 780), (1020, 806), (60, 806)], SOFA_HI, smooth=False, lw=0.1, line=SOFA_HI)
    shape(c, pen, [(540, 800), (540, 1250)], None, line=SOFA_SH, lw=3, close=False, smooth=False)

def sofa_front(c, pen):
    shape(c, pen, [(30, 1200), (1050, 1200), (1050, 1330), (30, 1330)], SOFA_HI, smooth=False, lw=3, line=OUTL)
    shape(c, pen, [(540, 1205), (540, 1325)], None, line=SOFA_SH, lw=3, close=False, smooth=False)
    for x0 in (0, 950):
        shape(c, pen, [(x0, 980), (x0 + 130, 980), (x0 + 130, 1340), (x0, 1340)], SOFA_SH, smooth=False, lw=3, line=OUTL)

F_TOP = ImageFont.truetype(os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts", "Inter-Black.otf"), 76)
F_SUB = ImageFont.truetype(os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts", "Inter-Black.otf"), 80)
ACC = (255, 132, 108)
def caption(d, words, y, font):
    sp = font.getlength(" "); tw = sum(font.getlength(w) for w, _ in words) + sp * (len(words) - 1)
    if tw > 800:
        font = ImageFont.truetype(font.path, int(font.size * 800 / tw)); sp = font.getlength(" ")
        tw = sum(font.getlength(w) for w, _ in words) + sp * (len(words) - 1)
    xx = 500 - tw / 2
    for w, k in words:
        d.text((xx, y), w, font=font, fill=ACC if k else (255, 255, 255), stroke_width=7, stroke_fill=(16, 16, 22)); xx += font.getlength(w) + sp

def frame(i):
    t = i / FPS
    td = math.floor(t * 12) / 12                     # character drawings on twos
    pen_bg = Pen(3)                                   # background lines stay put
    pen = Pen(int(td * 12) + 11)                      # character lines 'boil': redrawn 12x per second
    s = cairo.ImageSurface(cairo.FORMAT_RGB24, W, H); c = cairo.Context(s)
    z = 1 + 0.05 * ease(t / DUR)
    c.translate(540, 950); c.scale(z, z); c.translate(-540, -950)
    room(c, Pen(3 + int(td * 6) % 2))
    # --- him: scrolling and smiling at his phone the whole time
    m = dict(phone=1.0, sad=0.0, look=(0, 0.9), scroll=td * 2.2, thumb=-4 * abs(math.sin(td * 6)),
             smile=ease((td - 1.2) / 0.4) * (1 - ease((td - 4.6) / 0.5)), breath=3 * math.sin(td * 2.0),
             tilt=-2 + 1.5 * math.sin(td * 0.9), blink=(2.1 <= td < 2.2) or (4.9 <= td < 5.0))
    A.man(c, pen, 790, 760, 0.82, m)
    # --- her: looks up at him, waits, sighs, lowers the phone and looks away
    look_him = ease((td - 1.0) / 0.35) * (1 - ease((td - 3.6) / 0.35))
    lower = ease((td - 3.6) / 0.8)
    sigh = ease((td - 3.2) / 0.4) * (1 - ease((td - 4.0) / 0.6))
    w = dict(phone=1.0 - 0.75 * lower, sad=0.3 + 0.6 * ease((td - 2.6) / 0.8), look=(0.95 * look_him - 0.6 * lower, 0.9 * (1 - look_him) + 0.2 * look_him + 0.5 * lower),
             tilt=6 * look_him - 4 * lower, breath=3 * math.sin(td * 1.8) + 10 * sigh, scroll=0.6 * min(td, 1.0),
             blink=(0.6 <= td < 0.7) or (2.8 <= td < 2.9) or (5.2 <= td < 5.3))
    A.woman(c, pen, 300, 790, 0.82, w)
    shape(c, pen, [(468, 1080), (612, 1070), (622, 1205), (462, 1212)], (0.93, 0.70, 0.40), lw=3, line=OUTL)
    sofa_front(c, Pen(5 + int(td * 6) % 2))
    s.flush()
    arr = np.frombuffer(s.get_data(), np.uint8).reshape(H, W, 4)[:, :, [2, 1, 0]].astype(np.float32)
    k = int(td * 12)
    tex = np.roll(PAPER, (k % 3) * 2, axis=1)                    # paper fibres shimmer slightly between drawings
    arr = arr * (1 + 0.035 * tex)[..., None] + 3.5 * tex[..., None] + 2.5 * SB.GRAIN_UP[k % 4][..., None]
    arr *= VIG[..., None]
    im = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    d = ImageDraw.Draw(im)
    caption(d, [("Wenn", 0), ("ihr", 0), ("nur", 0), ("noch", 0)], 220, F_TOP)
    caption(d, [("wie", 0), ("Mitbewohner", 1), ("lebt", 0)], 312, F_TOP)
    if t < 2.4: caption(d, [("JEDER", 0), ("FÜR", 0), ("SICH", 1)], 1360, F_SUB)
    else: caption(d, [("SIE", 0), ("WARTET", 0), ("AUF", 0), ("EINEN", 0), ("BLICK", 1)], 1360, F_SUB)
    return im

if __name__ == "__main__":
    if PREVIEW:
        for t in (0.5, 2.0, 3.2, 5.0): frame(int(t * FPS)).resize((432, 768)).save(f"{OUT}/sofa_{t}.png")
        sys.exit()
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                          "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", f"{OUT}/sofa_video.mp4"], stdin=subprocess.PIPE)
    for i in range(int(DUR * FPS)): p.stdin.write(frame(i).tobytes())
    p.stdin.close(); p.wait()
