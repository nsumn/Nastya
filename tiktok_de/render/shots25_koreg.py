"""11 'Ko-Regulation' (Wenn eine Frau seine Hand hält …) in 2.5D: depth layers in new places (sets25b), moving camera,
parallax and depth of field; cards (ECG, term, name, warning, brains, curve) are flat layers the camera drifts over.
Storyboard: projects/11_koregulation/storyboard.md.

Render with:  ./render.sh projects/11_koregulation shots25_koreg out/DE_11_Koregulation.mp4
"""
import math
import numpy as np
import cairocffi as cairo
from PIL import Image
import video_shots as VB
import shots_tasse as UI
import cine
import character2 as C2
import layers25 as L25
import sets25 as P
import sets25b as Q
from storybook import glow

V = VB.V
A, SF, W, H = VB.A, VB.SF, V.W, V.H
FPS = 30
ease, ramp, t_of, DUR = V.ease, V.ramp, V.t_of, V.DUR
bg, text_c = VB.bg, VB.text_c
SUB_Y = VB.SUB_Y
ROSE_RGB = (255, 255, 255)
hands_on_phone = VB.hands_on_phone

K = ["Messbar", "In der Psychologie", "Ihr Nervensystem", "An seinem Atem", "An seiner Stimme", "An seinem Herzschlag", "An seiner Ruhe",
     "Sie spürt es", "Der Psychologe", "während ihnen", "Stromschlag", "Hielten sie", "als mit der Hand", "Und je glücklicher",
     "Darum wird sie", "Darum schläft", "Darum reicht", "und der Tag", "Nähe ist", "Sie ist der Ort", "Ein Mann, bei dem"]
try:
    T = {k: t_of(k) for k in K}
except AssertionError:
    T = None

def word(c, txt, x, y, size, col=(1, 1, 1), a=1.0):
    c.select_font_face("Inter", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD); c.set_font_size(size)
    w = c.text_extents(txt)[4]; c.move_to(x - w / 2, y); c.set_source_rgba(*col, a); c.show_text(txt); return w
def lt(key, t): return t - T[key]
def talk(t, f=9): return 0.45 + 0.45 * abs(math.sin(t * f))
def her(emo="calm", **k): return lambda t: P.her_pose(emo=emo, blink=P.blink(t), **k)
def him(emo="calm", **k):
    def f(t): d = dict(emo=emo, blink=P.blink(t, 3.6)); d.update(k); return d
    return f

# ---------------------------------------------------------------- cards (flat)
def s_ecg(c, t):             # a racing pulse line that slows down and smooths out
    bg(c); lt0 = lt("Messbar", t)
    for k in range(12): c.set_source_rgba(0.5, 0.9, 0.7, 0.06); c.rectangle(0, 400 + k * 100, W, 2); c.fill()
    calm = ease(lt0 / 1.6); bpm = int(118 - 50 * calm)
    c.set_source_rgb(0.45, 0.95, 0.70); c.set_line_width(7); c.set_line_join(cairo.LINE_JOIN_ROUND)
    period = 70 + 150 * calm
    for i, x in enumerate(range(0, W, 4)):
        ph = ((x + lt0 * 420) % period) / period
        y = 960 - (math.exp(-((ph - 0.5) / 0.03) ** 2) * (260 - 120 * calm) - math.exp(-((ph - 0.58) / 0.03) ** 2) * 80) + 6 * math.sin(x / 7) * (1 - calm)
        (c.move_to if i == 0 else c.line_to)(x, y)
    c.stroke(); glow(c, 540, 960, 500, (0.45, 0.95, 0.7), 0.12)
    word(c, f"{bpm}", 540, 700, 150, (1, 1, 1)); word(c, "Puls", 540, 770, 44, (0.75, 0.80, 0.85))
def s_term(c, t):            # two breathing waves drift into step, then the word lands
    bg(c); u = lt("In der Psychologie", t); sync = ease((u - 0.6) / 1.6)
    for k, (col, ph0) in enumerate((((0.79, 0.54, 0.57), 1.9), ((0.58, 0.69, 0.59), 0.0))):
        c.set_source_rgba(*col, 0.95); c.set_line_width(10)
        for i, x in enumerate(range(-20, W + 20, 6)):
            y = 1150 + 90 * math.sin(x / 120 + t * 2.4 + ph0 * (1 - sync)) + k * 0
            (c.move_to if i == 0 else c.line_to)(x, y)
        c.stroke()
    word(c, "Ko-Regulation", 540, 820, 116, (1, 1, 1), ramp(t, T["In der Psychologie"] + 1.4))
def s_name(c, t):
    bg(c); glow(c, 540, 700, 420, (1.0, 0.85, 0.6), 0.12); u = lt("Der Psychologe", t)
    word(c, "Psychologe", 540, 560, 44, (0.85, 0.86, 0.92), ramp(t, T["Der Psychologe"] + 0.2))
    c.save(); c.rectangle(0, 0, 160 + 900 * ease((u - 0.4) / 1.0), H); c.clip(); word(c, "James Coan", 540, 690, 110, (1, 1, 1)); c.restore()
    c.set_source_rgba(0.95, 0.80, 0.50, 0.9); c.set_line_width(6); c.move_to(250, 730); c.line_to(250 + 580 * ease((u - 1.2) / 0.7), 730); c.stroke()
    word(c, "Studie, 2006", 540, 820, 46, (0.85, 0.86, 0.92), ramp(t, T["Der Psychologe"] + 1.4))
def s_warning(c, t):         # the announced shock: a yellow sign blinks
    bg(c); u = lt("Stromschlag", t); on = 0.6 + 0.4 * (math.sin(u * 10) > 0)
    c.save(); c.translate(540, 840); c.scale(1 + 0.05 * math.sin(u * 10), 1 + 0.05 * math.sin(u * 10))
    c.move_to(0, -260); c.line_to(250, 190); c.line_to(-250, 190); c.close_path(); C2.finish(c, (0.98, 0.80, 0.25), 10)
    c.move_to(20, -150); c.line_to(-60, 20); c.line_to(10, 20); c.line_to(-30, 140); c.line_to(80, -30); c.line_to(10, -30); c.line_to(50, -150); c.close_path()
    c.set_source_rgb(0.15, 0.12, 0.12); c.fill(); c.restore()
    glow(c, 540, 840, 500, (1.0, 0.8, 0.3), 0.2 * on)
    word(c, "Achtung", 540, 1180, 70, (1, 1, 1), ramp(t, T["Stromschlag"] + 0.2))
def brain(c, x, y, s, col, calm):
    c.save(); c.translate(x, y); c.scale(s, s)
    for k in range(6): C2.ellipse(c, -90 + (k % 3) * 90, -40 + (k // 3) * 80, 90, 80); C2.finish(c, col, 5)
    for k in range(4):
        c.set_source_rgba(1, 1, 1, 0.5); c.set_line_width(5); c.move_to(-150 + k * 90, -60); c.curve_to(-120 + k * 90, 0, -170 + k * 90, 40, -130 + k * 90, 100); c.stroke()
    c.restore()
    glow(c, x, y, 260 * s, col, 0.5 * (1 - calm) + 0.1)
def s_brains(c, t):          # stranger's hand vs. her husband's hand
    bg(c); u = lt("als mit der Hand", t)
    brain(c, 300, 760, 1.0, (0.90, 0.38, 0.38), 0.0); brain(c, 780, 760, 1.0, (0.45, 0.65, 0.90), ease(u / 0.8))
    word(c, "Fremder", 300, 1030, 52, (0.95, 0.75, 0.75), ramp(t, T["als mit der Hand"] + 0.1))
    word(c, "ihr Mann", 780, 1030, 52, (0.75, 0.85, 1.0), ramp(t, T["als mit der Hand"] + 0.3))
def s_curve(c, t):           # happier marriage -> calmer brain
    bg(c); u = ease(lt("Und je glücklicher", t) / 2.0)
    c.set_source_rgb(0.75, 0.78, 0.85); c.set_line_width(5); c.move_to(180, 1150); c.line_to(920, 1150); c.move_to(180, 1150); c.line_to(180, 450); c.stroke()
    word(c, "glücklichere Ehe →", 560, 1230, 44, (0.85, 0.86, 0.92));
    c.save(); c.translate(120, 800); c.rotate(-math.pi / 2); word(c, "mehr Ruhe →", 0, 0, 44, (0.85, 0.86, 0.92)); c.restore()
    c.set_source_rgb(0.95, 0.80, 0.50); c.set_line_width(12)
    for i in range(int(60 * u) + 1):
        x = 180 + 740 * i / 60; y = 1150 - 600 * (i / 60) ** 1.4
        (c.move_to if i == 0 else c.line_to)(x, y)
    c.stroke()
    for k in range(5):
        if u > k / 5: C2.ellipse(c, 180 + 740 * k / 4.2, 1150 - 600 * (k / 4.2) ** 1.4, 16, 16); C2.finish(c, (1, 0.9, 0.6), 3)
def flat(draw, z=6.0): return [L25.layer(z, draw, pad=0.12, animated=True)]

# ---------------------------------------------------------------- shots
if T:
    SC = [
        (0.0, Q.airplane(lambda t: dict(emo="worried", look=(0.5, 0.0), head_tilt=-4, blink=P.blink(t, 2.4)), None, close=True, shake=lambda t: 1.0),
         (0.0, 0.05, 0.0), (0.05, 0.0, 0.9), 3.0, {}),
        ("Messbar", flat(s_ecg), (0, 0, 0), (0, 0, 0.5), None, {}),
        ("In der Psychologie", flat(s_term), (0, 0, 0), (0, 0, 0.5), None, dict(whip=True)),
        ("Ihr Nervensystem", Q.jetty(her("calm", look=(0.4, 0.1), arm_l=(8, 60), arm_r=(8, 60)), him("calm", look=(-0.3, 0.1), arm_l=(8, 60), arm_r=(8, 60))),
         (-0.25, 0.0, 0.0), (0.2, 0.05, 0.9), 3.2, dict(whip=True)),
        ("An seinem Atem", Q.train(her("closed", arm_l=(8, 60), arm_r=(8, 60)), him("calm", look=(-0.4, 0.3), arm_l=(8, 60), arm_r=(8, 60))),
         (0.2, 0.0, 0.0), (-0.1, 0.0, 0.7), 3.2, {}),
        ("An seiner Stimme", Q.campfire(her("smile", look=(0.6, 0.0), arm_l=(10, 70), arm_r=(10, 70)),
                                        lambda t: dict(emo="smile", look=(-0.5, 0.0), talk=talk(t), arm_l=(10, 70), arm_r=(30, -40), blink=P.blink(t, 3.6))),
         (-0.15, 0.0, 0.0), (0.15, 0.0, 0.8), 4.2, {}),
        ("An seinem Herzschlag", Q.hug_close(her("closed"), him("calm", look=(-0.2, 0.6))), (0.1, 0.05, 0.0), (-0.05, 0.0, 0.6), 3.0, {}),
        ("An seiner Ruhe", Q.ferris(her("calm", look=(0.5, 0.0)), him("calm", look=(-0.2, 0.2))), (0.0, -0.1, 0.0), (0.0, 0.05, 0.9), 3.3, {}),
        ("Sie spürt es", Q.hands_hold(T["Sie spürt es"]), (0.1, 0.0, 0.0), (-0.05, 0.0, 0.7), 2.8, {}),
        ("Der Psychologe", flat(s_name), (0, 0, 0), (0, 0, 0.4), None, dict(whip=True)),
        ("während ihnen", Q.mri(), (-0.2, 0.0, 0.0), (0.15, 0.0, 0.8), 4.5, {}),
        ("Stromschlag", flat(s_warning), (0, 0, 0), (0, 0, 0.4), None, {}),
        ("Hielten sie", Q.mri(lambda t: ease((lt("Hielten sie", t) - 0.2) / 0.9)), (0.25, 0.05, 0.3), (0.05, 0.0, 1.2), 4.5, {}),
        ("als mit der Hand", flat(s_brains), (0, 0, 0), (0, 0, 0.4), None, {}),
        ("Und je glücklicher", flat(s_curve), (0, 0, 0), (0, 0, 0.4), None, {}),
        ("Darum wird sie", Q.airplane(her("calm", look=(0.6, 0.0)), him("calm", look=(-0.5, 0.0))), (-0.2, 0.0, 0.0), (0.15, 0.0, 0.8), 3.0, dict(whip=True)),
        ("Darum schläft", Q.attic(her("closed"), him("calm", look=(-0.3, -0.4))), (0.15, 0.0, 0.0), (-0.1, 0.05, 0.8), 3.0, {}),
        ("Darum reicht", Q.waiting_room(her("worried", look=(0.5, 0.2), arm_l=(10, 70), arm_r=(10, 70)), him("calm", look=(-0.6, 0.2))),
         (-0.2, 0.0, 0.0), (0.15, 0.0, 0.8), 3.4, {}),
        ("und der Tag", Q.umbrella(her("smile", look=(0.5, -0.2)), him("smile", look=(-0.5, 0.2))), (0.2, 0.0, 0.0), (-0.1, 0.0, 0.7), 3.2, {}),
        ("Nähe ist", Q.breakfast(her("happy", look=(0.6, -0.1), arm_l=(10, 70), arm_r=(10, 70)), him("smile", look=(-0.6, 0.3))),
         (-0.15, 0.0, 0.0), (0.2, 0.0, 0.8), 3.2, dict(whip=True)),
        ("Sie ist der Ort", Q.airplane(lambda t: dict(emo="closed", head_tilt=10, lean=4), None, close=True), (0.0, 0.0, 0.3), (0.0, 0.05, 1.0), 3.0, {}),
        ("Ein Mann, bei dem", Q.harbor(her("smile", look=(0.5, -0.1), lean=4, head_tilt=8), him("calm", look=(-0.4, 0.1))),
         (0.0, 0.05, 1.3), (0.0, -0.1, 0.0), 3.4, {}),
    ]
    STARTS = [0.0 if a == 0.0 else T[a] for a, *_ in SC]
    SHOTS = [(STARTS[i], None, None, None, SC[i][5]) for i in range(len(SC))]
else:
    SC, STARTS, SHOTS = [], [], []

def _cam(i, t):
    t0 = STARTS[i]; t1 = STARTS[i + 1] if i + 1 < len(STARTS) else DUR
    return L25.cam_path(t, t0, t1, SC[i][2], SC[i][3])
_live = [None]
def _render(i, t):
    if _live[0] != i:
        if _live[0] is not None:
            for L in SC[_live[0]][1]: L._cache = None
        _live[0] = i
    return L25.render(SC[i][1], t, _cam(i, t), focus_z=SC[i][4], dof=4.0)

def frame(t):
    k = max(i for i, s0 in enumerate(STARTS) if s0 <= t)
    w = next((j for j in range(1, len(SC)) if SC[j][5].get("whip") and abs(t - STARTS[j]) < cine.WHIP), None)
    if w is not None:
        e = cine.smooth((t - (STARTS[w] - cine.WHIP)) / (2 * cine.WHIP)); cut = int(round(W - W * e))
        a = _render(w - 1, min(t, STARTS[w] - 1e-3)); b = _render(w, max(t, STARTS[w]))
        arr = np.concatenate([np.roll(a, -int(W * e), axis=1)[:, :max(0, min(W, cut))], np.roll(b, W - int(W * e), axis=1)[:, max(0, min(W, cut)):]], axis=1)
        v = W * (cine.smooth((t + 0.5 / FPS - (STARTS[w] - cine.WHIP)) / (2 * cine.WHIP)) - cine.smooth((t - 0.5 / FPS - (STARTS[w] - cine.WHIP)) / (2 * cine.WHIP)))
        arr = cine._motion_blur(arr, 0.8 * v)
    else:
        arr = _render(k, t).astype(np.float32)
        if k and t - STARTS[k] < 0.06: arr = arr * 0.8
    if k == len(SC) - 1: arr = arr * min(1.0, max(0.0, (DUR - t) / 0.8))
    im = Image.fromarray(SF.look(np.clip(arr, 0, 255).astype(np.uint8), int(t * FPS)))
    for s0, e0, ws, hl in V.CAPS:
        if s0 - 0.02 <= t < e0:
            V.draw_caption(im, ws, hl, SUB_Y, V.F_SUB, min(1.0, (t - s0 + 0.02) / 0.09)); break
    return im

# sound events for audio_koreg.py; accents = cuts that get a piano note
def events():
    ev = [(0.0, "rain_start")]                                                     # cabin hum
    ev += [(T["Messbar"] + k * (0.5 + 0.15 * k), "tick") for k in range(5)]        # heartbeat slowing
    ev += [(T["An seinem Atem"] + 0.2, "train")]
    ev += [(T["Stromschlag"] + 0.2, "thud")]
    ev += [(T["Darum schläft"] + 0.4, "thud")]                                    # distant thunder
    ev += [(T["und der Tag"], "rain_start")]
    ev += [(T["Nähe ist"] + 0.5, "cup")]
    ev += [(STARTS[k], "whoosh") for k in range(1, len(SC)) if SC[k][5].get("whip")]
    return ev
ACCENTS = ["In der Psychologie", "Der Psychologe", "als mit der Hand", "Darum wird sie", "Nähe ist", "Ein Mann, bei dem"]
