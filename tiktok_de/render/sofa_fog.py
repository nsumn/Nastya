"""Sofa scene with the reference's look, measured frame by frame:
- living fog: big soft cloudy blotches over the whole frame, swapped every 2 frames
- line boil: smooth 1-2 px warp of the drawing, a different warp field every frame (no random jitter)
- softness: slight blur, light bloom, lifted blacks
"""
import math, subprocess, sys
OUT = sys.argv[1]
PREVIEW = "--preview" in sys.argv
FOG_STATIC = "--static" in sys.argv
NO_BOIL = "--noboil" in sys.argv
sys.argv = [sys.argv[0], OUT]
import numpy as np, cv2
import cairocffi as cairo
from PIL import Image, ImageDraw
import sofa_anim as SA
import adult as A
from storybook import Pen, shape

W, H, FPS, DUR = 1080, 1920, 24, 6.0
ease = SA.ease
rng = np.random.default_rng(11)

def smooth_noise(sigma, seed):
    r = np.random.default_rng(seed).normal(0, 1, (H // 4, W // 4)).astype(np.float32)
    r = cv2.GaussianBlur(r, (0, 0), sigma / 4)
    r = cv2.resize(r, (W, H), interpolation=cv2.INTER_CUBIC)
    return (r - r.mean()) / (r.std() + 1e-6)

# fog / paper blotches: 3 variants, swapped every 2 frames
FOG = [0.65 * smooth_noise(70, 100 + k) + 0.45 * smooth_noise(200, 200 + k) + 0.25 * smooth_noise(18, 300 + k) for k in range(3)]
FOG = [(f - f.mean()) / f.std() for f in FOG]
# line-boil warp fields: 4 variants, one per frame
WARP = []
for k in range(4):
    dx = smooth_noise(60, 400 + k) * 1.6; dy = smooth_noise(60, 500 + k) * 1.6
    gx, gy = np.meshgrid(np.arange(W, dtype=np.float32), np.arange(H, dtype=np.float32))
    WARP.append((gx + dx, gy + dy))
GRAIN = [np.random.default_rng(600 + k).normal(0, 1, (H, W)).astype(np.float32) for k in range(3)]
_yy, _xx = np.mgrid[0:H, 0:W]
VIG = np.clip(1 - 0.5 * (((_xx - W / 2) / (W * 0.62)) ** 2 + ((_yy - H * 0.45) / (H * 0.66)) ** 2), 0.5, 1).astype(np.float32)
HAZE = np.array([0.36, 0.34, 0.44], np.float32) * 255          # lavender-grey haze colour

def draw_scene(t):
    td = t                                            # smooth motion; the 'hand-drawn' feel comes from boil + fog
    pen = Pen(3)
    s = cairo.ImageSurface(cairo.FORMAT_RGB24, W, H); c = cairo.Context(s)
    z = 1 + 0.05 * ease(t / DUR)
    c.translate(540, 950); c.scale(z, z); c.translate(-540, -950)
    SA.room(c, Pen(3))
    m = dict(phone=1.0, sad=0.0, look=(0, 0.9), scroll=td * 2.2, thumb=-4 * abs(math.sin(td * 6)),
             smile=ease((td - 1.2) / 0.4) * (1 - ease((td - 4.6) / 0.5)), breath=3 * math.sin(td * 2.0),
             tilt=-2 + 1.5 * math.sin(td * 0.9), blink=(2.1 <= td < 2.2) or (4.9 <= td < 5.0))
    A.man(c, Pen(13), 790, 760, 0.82, m)
    look_him = ease((td - 1.0) / 0.35) * (1 - ease((td - 3.6) / 0.35))
    lower = ease((td - 3.6) / 0.8)
    sigh = ease((td - 3.2) / 0.4) * (1 - ease((td - 4.0) / 0.6))
    w = dict(phone=1.0 - 0.75 * lower, sad=0.3 + 0.6 * ease((td - 2.6) / 0.8), look=(0.95 * look_him - 0.6 * lower, 0.9 * (1 - look_him) + 0.2 * look_him + 0.5 * lower),
             tilt=6 * look_him - 4 * lower, breath=3 * math.sin(td * 1.8) + 10 * sigh, scroll=0.6 * min(td, 1.0),
             blink=(0.6 <= td < 0.7) or (2.8 <= td < 2.9) or (5.2 <= td < 5.3))
    A.woman(c, Pen(11), 300, 790, 0.82, w)
    shape(c, Pen(17), [(468, 1080), (612, 1070), (622, 1205), (462, 1212)], (0.93, 0.70, 0.40), lw=3, line=SA.OUTL)
    SA.sofa_front(c, Pen(5))
    s.flush()
    return np.frombuffer(s.get_data(), np.uint8).reshape(H, W, 4)[:, :, [2, 1, 0]].copy()

def look(arr, i):
    # 1) line boil: smooth warp, new field every frame
    if NO_BOIL:
        a = arr.astype(np.float32)
    else:
        mx, my = WARP[i % 4]
        a = cv2.remap(arr, mx, my, interpolation=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT).astype(np.float32)
    # 2) softness + light bloom
    soft = cv2.GaussianBlur(a, (0, 0), 1.1)
    bright = np.clip(soft - 195, 0, 255)
    bloom = cv2.GaussianBlur(bright, (0, 0), 28)
    a = soft + 0.55 * bloom
    # 3) living fog: cloudy blotches that slowly drift and morph (no flicker)
    t = i / FPS
    ph = t / 3.0; k = int(ph) % 3; u = ph - int(ph); u = u * u * (3 - 2 * u)
    fog = (1 - u) * FOG[k] + u * FOG[(k + 1) % 3]
    fog = np.roll(fog, int(t * 10), axis=1)
    if FOG_STATIC: fog = FOG[0]
    a = a * (1 + 0.09 * fog)[..., None]
    lift = np.clip(0.10 + 0.06 * fog, 0, 1)[..., None]
    a = a * (1 - lift) + HAZE * lift
    # 4) grain + vignette
    a += 1.6 * (GRAIN[0] if FOG_STATIC else GRAIN[(i // 2) % 3])[..., None]
    a *= VIG[..., None]
    return np.clip(a, 0, 255).astype(np.uint8)

def frame(i):
    t = i / FPS
    im = Image.fromarray(look(draw_scene(t), i))
    d = ImageDraw.Draw(im)
    SA.caption(d, [("Wenn", 0), ("ihr", 0), ("nur", 0), ("noch", 0)], 220, SA.F_TOP)
    SA.caption(d, [("wie", 0), ("Mitbewohner", 1), ("lebt", 0)], 312, SA.F_TOP)
    if t < 2.4: SA.caption(d, [("JEDER", 0), ("FÜR", 0), ("SICH", 1)], 1360, SA.F_SUB)
    else: SA.caption(d, [("SIE", 0), ("WARTET", 0), ("AUF", 0), ("EINEN", 0), ("BLICK", 1)], 1360, SA.F_SUB)
    return im

if __name__ == "__main__":
    if PREVIEW:
        frame(48).save(f"{OUT}/fog_full.png")
        frame(48).resize((432, 768)).save(f"{OUT}/fog_2.0.png"); frame(110).resize((432, 768)).save(f"{OUT}/fog_4.6.png")
        sys.exit()
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                          "-c:v", "libx264", "-crf", "17", "-pix_fmt", "yuv420p", f"{OUT}/fog_video.mp4"], stdin=subprocess.PIPE)
    for i in range(int(DUR * FPS)): p.stdin.write(frame(i).tobytes())
    p.stdin.close(); p.wait()
