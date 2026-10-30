"""Cinematic frame builder (vizavi_motion principles) on top of our look:
- every shot has a camera path cam0 -> cam1 = (cx, cy, zoom, rot_deg) with soft acceleration, plus a slow drift;
- an optional foreground layer (drops, leaves, plant, door frame, lamp, rail) drawn in screen space, moved with a stronger
  parallax than the scene and blurred (depth of field);
- 'whip' transitions: both shots slide fast sideways for ~0.14 s each, rendered with sub-frame motion blur;
- 30 fps.
"""
import math
import numpy as np
import cairocffi as cairo
from PIL import Image, ImageFilter
import character2 as C2
from storybook import glow

W, H = 1080, 1920
WHIP = 0.14              # seconds on each side of a whip cut
SUBS = 5                 # sub-frames for motion blur inside a whip

def smooth(u):
    u = max(0.0, min(1.0, u)); return u * u * u * (u * (6 * u - 15) + 10)     # smootherstep: soft start and landing

def cam_at(shot, t, t1):
    t0, fn, cam0, cam1 = shot[:4]
    u = smooth((t - t0) / max(0.1, t1 - t0))
    cx = cam0[0] + (cam1[0] - cam0[0]) * u + 6 * math.sin(t * 0.7)
    cy = cam0[1] + (cam1[1] - cam0[1]) * u + 4 * math.sin(t * 0.53 + 1)
    z = cam0[2] + (cam1[2] - cam0[2]) * u
    r = cam0[3] + (cam1[3] - cam0[3]) * u + 0.25 * math.sin(t * 0.4)
    return cx, cy, z, r, u

# ---------------------------------------------------------------- foreground layers (screen space)
def fg_drops(c, t, dx):
    for k in range(26):
        x = (k * 173 + dx * 1.0) % (W + 200) - 100; y = (k * 311) % H
        r = 18 + (k * 7) % 30
        c.set_source_rgba(0.75, 0.85, 1.0, 0.18); c.arc(x, y, r, 0, 2 * math.pi); c.fill()
        c.set_source_rgba(1, 1, 1, 0.25); c.arc(x - r * 0.3, y - r * 0.3, r * 0.25, 0, 2 * math.pi); c.fill()
    for k in range(14):                       # running streaks
        x = (k * 97 + dx) % W; y = (k * 223 + t * 160 * (1 + k % 3)) % (H + 300) - 300
        c.set_source_rgba(0.8, 0.88, 1.0, 0.22); c.set_line_width(5); c.move_to(x, y); c.line_to(x + 4, y + 120); c.stroke()
def fg_leaves(c, t, dx):
    for k in range(9):
        x = (k * 157 + dx * 1.2 + 40 * math.sin(t * 1.3 + k)) % (W + 300) - 150
        y = (k * 263 + t * (120 + 30 * (k % 3))) % (H + 400) - 200
        c.save(); c.translate(x, y); c.rotate(t * (1 + k % 2) + k)
        s = 1.5 + (k % 3) * 0.6
        c.move_to(0, -40 * s); c.curve_to(30 * s, -20 * s, 30 * s, 20 * s, 0, 40 * s); c.curve_to(-30 * s, 20 * s, -30 * s, -20 * s, 0, -40 * s)
        c.set_source_rgba(*[(0.80, 0.45, 0.25), (0.85, 0.62, 0.30), (0.60, 0.30, 0.22)][k % 3], 0.85); c.fill(); c.restore()
def fg_plant(c, t, dx):
    for k in range(6):
        c.save(); c.translate(-60 + dx, 1700 - k * 90); c.rotate(-0.9 + k * 0.25 + 0.03 * math.sin(t + k))
        c.move_to(0, 0); c.curve_to(120, -60, 260, -40, 360, 0); c.curve_to(260, 40, 120, 60, 0, 0)
        c.set_source_rgba(0.06, 0.09, 0.08, 0.95); c.fill(); c.restore()
def fg_frame(c, t, dx):
    c.set_source_rgba(0.05, 0.05, 0.07, 0.96); c.rectangle(W - 150 + dx, -50, 260, H + 100); c.fill()
def fg_lamp(c, t, dx):
    glow(c, 160 + dx, 140, 260, (1.0, 0.75, 0.45), 0.55); c.set_source_rgba(1.0, 0.85, 0.6, 0.9); c.arc(160 + dx, 140, 60, 0, 2 * math.pi); c.fill()
def fg_rail(c, t, dx):
    c.set_source_rgba(0.05, 0.05, 0.07, 0.95); c.rectangle(-50, 1700, W + 100, 40); c.fill()
    for k in range(-1, 9): c.rectangle(k * 150 + dx % 150, 1700, 26, 300); c.fill()
FG = dict(drops=fg_drops, leaves=fg_leaves, plant=fg_plant, frame=fg_frame, lamp=fg_lamp, rail=fg_rail)

def render_scene(SHOTS, k, t, DUR, extra_dx=0.0):
    shot = SHOTS[k]; t1 = SHOTS[k + 1][0] if k + 1 < len(SHOTS) else DUR
    opts = shot[4] if len(shot) > 4 else {}
    cx, cy, z, rot, u = cam_at(shot, t, t1)
    s = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H); c = cairo.Context(s)
    c.set_source_rgb(0, 0, 0); c.paint()
    c.translate(540 + extra_dx, 950); c.rotate(math.radians(rot)); c.scale(z, z); c.translate(-cx, -cy)
    shot[1](c, t)
    c.identity_matrix()
    s.flush()
    arr = np.frombuffer(s.get_data(), np.uint8).reshape(H, W, 4)[:, :, [2, 1, 0]].astype(np.float32)
    fg = opts.get("fg")
    if fg:
        fs = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H); fc = cairo.Context(fs)
        dx = -(cx - shot[2][0]) * z * 1.8 + extra_dx * 1.6           # stronger parallax than the scene
        FG[fg](fc, t, dx); fs.flush()
        f = np.frombuffer(fs.get_data(), np.uint8).reshape(H, W, 4)
        im = Image.fromarray(f[:, :, [2, 1, 0, 3]].copy(), "RGBA").filter(ImageFilter.GaussianBlur(opts.get("dof", 10)))
        f = np.asarray(im).astype(np.float32)
        a = f[:, :, 3:4] / 255.0
        arr = arr * (1 - a) + f[:, :, :3]             # cairo colours are premultiplied (and stay so through the blur): 'over' = dst*(1-a) + src
    return arr

def _motion_blur(arr, px):
    """directional (horizontal) motion blur: the whip is a pure sideways translation, so a box blur along x of the
    distance travelled during the exposure is the physically right smear"""
    import cv2
    k = int(abs(px))
    if k < 3: return arr
    return cv2.blur(arr, (k, 1), borderType=cv2.BORDER_REPLICATE)

def make_frame(SHOTS, DUR, SF, V, FPS, SUB_Y, overlays=None):
    starts = [s[0] for s in SHOTS]
    whips = [k for k in range(1, len(SHOTS)) if (SHOTS[k][4] if len(SHOTS[k]) > 4 else {}).get("whip")]
    def push_e(t, ts):
        return smooth((t - (ts - WHIP)) / (2 * WHIP))
    def frame(t):
        k = max(i for i, s0 in enumerate(starts) if s0 <= t)
        w = next((j for j in whips if abs(t - starts[j]) < WHIP), None)
        if w is not None:
            # push: the outgoing shot slides out to the left while the incoming one slides in from the right
            e = push_e(t, starts[w]); off = W * e
            a = render_scene(SHOTS, w - 1, min(t, starts[w] - 1e-3), DUR, -off)
            b = render_scene(SHOTS, w, max(t, starts[w]), DUR, W - off)
            cut = int(round(W - off))
            arr = np.concatenate([a[:, :max(0, min(W, cut))], b[:, max(0, min(W, cut)):]], axis=1) if 0 < cut < W else (a if cut >= W else b)
            v = W * (push_e(t + 0.5 / FPS, starts[w]) - push_e(t - 0.5 / FPS, starts[w]))      # px per frame
            arr = _motion_blur(arr, 0.8 * v)                                                    # shutter 0.8 frame
        else:
            arr = render_scene(SHOTS, k, t, DUR)
            if k and t - starts[k] < 0.06: arr = arr * 0.8                                    # tiny dip on hard cuts
        if k == len(SHOTS) - 1: arr = arr * min(1.0, max(0.0, (DUR - t) / 0.8))               # fade out at the very end
        im = Image.fromarray(SF.look(np.clip(arr, 0, 255).astype(np.uint8), int(t * FPS)))
        if overlays: overlays(im, t)
        for s0, e0, ws, hl in V.CAPS:
            if s0 - 0.02 <= t < e0:
                V.draw_caption(im, ws, hl, SUB_Y, V.F_SUB, min(1.0, (t - s0 + 0.02) / 0.09)); break
        return im
    return frame
