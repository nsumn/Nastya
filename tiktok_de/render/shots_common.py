"""Shared pieces for the liebe.beziehung-style videos: frame() with a strong first push-in, cards and small graphics."""
import math
import video_shots as VB
import shots_tasse as UI
import sets2 as Z
import numpy as np
import cairocffi as cairo
from PIL import Image
from storybook import glow
import character2 as C2

V, A, SF = VB.V, VB.A, VB.SF
W, H, FPS = V.W, V.H, V.FPS
ease, ramp, DUR = V.ease, V.ramp, V.DUR
bg, text_c = VB.bg, VB.text_c
OUTL = V.OUTL

def talk(t, f=10): return 0.45 + 0.45 * abs(math.sin(t * f))
def shout(t):
    g = math.sin(t * 6.5)
    return dict(emo="angry", talk=talk(t), look=(0.8, 0.1), head_tilt=4 + 2 * g, arm_r=(26 + 8 * g, -112 - 14 * g), arm_l=(10, 25))

def fit_text(c, txt, x, y, size, col=(1, 1, 1), a=1.0, maxw=920):
    c.select_font_face("Inter", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD)
    while size > 30:
        c.set_font_size(size)
        if c.text_extents(txt)[4] <= maxw: break
        size -= 4
    text_c(c, txt, x, y, size, col, a)

def term_card(c, t, t0, l1, l2=None):
    bg(c); glow(c, 540, 640, 420, (1.0, 0.85, 0.6), 0.12)
    fit_text(c, l1, 540, 600, 96, (1, 1, 1), ramp(t, t0))
    if l2: fit_text(c, l2, 540, 700, 60, (0.85, 0.86, 0.92), ramp(t, t0 + 0.4))

def heart_path(c, x, y, s):
    c.save(); c.translate(x, y); c.scale(s, s)
    c.move_to(0, 60); c.curve_to(-140, -40, -90, -160, 0, -90); c.curve_to(90, -160, 140, -40, 0, 60); c.close_path(); c.restore()

def cracked_heart(c, x, y, s, crack):
    """crack 0..1: a zigzag crack grows, at 1 the halves drift apart"""
    gap = 40 * max(0.0, crack - 0.7) / 0.3
    zig = [(0, -90), (-18, -50), (14, -15), (-12, 20), (8, 45), (0, 60)]
    for sd in (-1, 1):
        c.save(); c.translate(sd * gap * s, 0)
        heart_path(c, x, y, s)
        c.save(); c.clip()
        c.move_to(x + (sd * 400) * s, y - 200 * s)
        for zx, zy in zig: c.line_to(x + zx * s, y + zy * s)
        c.line_to(x + (sd * 400) * s, y + 200 * s); c.close_path()
        c.set_source_rgb(0.85, 0.42, 0.45); c.fill(); c.restore()
        heart_path(c, x, y, s); c.set_source_rgb(*OUTL); c.set_line_width(6); c.stroke()
        c.restore()
    n = int(len(zig) * min(1, crack / 0.7))
    if n > 1:
        c.move_to(x + zig[0][0] * s, y + zig[0][1] * s)
        for zx, zy in zig[1:n]: c.line_to(x + zx * s, y + zy * s)
        c.set_source_rgb(*OUTL); c.set_line_width(7); c.stroke()

def slot_machine(c, t, t0):
    bg(c); glow(c, 540, 820, 460, (1.0, 0.8, 0.5), 0.15)
    Z.rbox(c, 230, 500, 620, 700, 60, (0.45, 0.20, 0.25)); Z.rbox(c, 280, 640, 520, 280, 24, (0.95, 0.94, 0.90))
    lt = t - t0
    syms = ["heart", "x", "heart", "x", "x", "heart"]
    for k in range(3):
        x = 370 + k * 170
        stop = 0.8 + 0.5 * k
        if lt < stop: idx = int(lt * 14 + k * 3) % len(syms)
        else: idx = [0, 0, 1][k] if lt < 3.2 else 0
        sym = syms[idx]
        if sym == "heart":
            c.save(); c.translate(x, 790); V.heart(c, 0, 0, 44); c.set_source_rgb(0.85, 0.42, 0.45); c.fill(); c.restore()
        else:
            c.set_source_rgb(0.45, 0.47, 0.55); c.set_line_width(16); c.set_line_cap(cairo.LINE_CAP_ROUND)
            c.move_to(x - 36, 754); c.line_to(x + 36, 826); c.move_to(x + 36, 754); c.line_to(x - 36, 826); c.stroke()
        if k < 2: c.set_source_rgba(0, 0, 0, 0.25); c.rectangle(x + 82, 650, 6, 260); c.fill()
    # lever
    c.set_source_rgb(*OUTL); c.set_line_width(18); c.move_to(850, 820); c.line_to(940, 820); c.line_to(940, 600 + 120 * ease(min(1, lt / 0.4))); c.stroke()
    C2.ellipse(c, 940, 590 + 120 * ease(min(1, lt / 0.4)), 34, 34); C2.finish(c, (0.85, 0.42, 0.45), 5)

def lock_screen(c, t, cards, when, time_txt, empty_txt=None, hands="w"):
    UI.lock_phone(c, t, cards, when, time_txt, hands)
    if empty_txt: text_c(c, empty_txt, 540, 900, 30, (0.85, 0.86, 0.92))

def make_frame(SHOTS):
    def frame(t):
        k = max(i for i, s in enumerate(SHOTS) if s[0] <= t)
        t0, fn, (cx, cy, z) = SHOTS[k]; t1 = SHOTS[k + 1][0] if k + 1 < len(SHOTS) else DUR
        s = cairo.ImageSurface(cairo.FORMAT_RGB24, W, H); c = cairo.Context(s)
        push = 0.10 if k == 0 else 0.05
        zz = z * (1 + push * ease((t - t0) / max(0.1, t1 - t0)))
        c.translate(540, 950); c.scale(zz, zz); c.translate(-cx, -cy)
        fn(c, t)
        c.identity_matrix()
        f = min(ease((t - t0) / 0.08) if k else 1.0, ease((t1 - t) / 0.08) if k + 1 < len(SHOTS) else ease((DUR - t) / 0.8))
        if f < 1: c.set_source_rgba(0, 0, 0, 0.6 * (1 - f) if k + 1 < len(SHOTS) else 1 - f); c.paint()
        s.flush()
        arr = np.frombuffer(s.get_data(), np.uint8).reshape(H, W, 4)[:, :, [2, 1, 0]].copy()
        im = Image.fromarray(SF.look(arr, int(t * FPS)))
        for s0, e0, ws, hl in V.CAPS:
            if s0 - 0.02 <= t < e0:
                V.draw_caption(im, ws, hl, VB.SUB_Y, V.F_SUB, ease((t - s0 + 0.02) / 0.09)); break
        return im
    return frame
