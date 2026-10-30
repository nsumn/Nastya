"""'Je lauter sie wird, desto stiller wird er' (demand-withdraw pattern). liebe.beziehung structure:
hook 'Je … desto …', real term, short lines, aphorism; no title/HUD/CTA, emotional close-up first, cut every ~2.3 s.

Render with:  SHOTS=shots_streit python video_v5.py <alignment.csv> <out_dir> <worker> <n_workers> [--preview t1,...]
"""
import math
import video_shots as VB
import shots_tasse as UI
import shots_schlaf as SL
import shots_kosten as KO                # memory tint
import sets2 as Z
import numpy as np
import cairocffi as cairo
from PIL import Image
from storybook import glow
import character2 as C2

V, A, SF = VB.V, VB.A, VB.SF
W, H, FPS = V.W, V.H, V.FPS
ease, ramp, t_of, DUR = V.ease, V.ramp, V.t_of, V.DUR
bg, text_c, sofa = VB.bg, VB.text_c, VB.sofa
SUB_Y = VB.SUB_Y
ROSE_RGB = (255, 255, 255)
hands_on_phone = VB.hands_on_phone
OUTL = V.OUTL

K = ["desto stiller", "Und je stiller", "desto lauter wird sie", "In der Psychologie", "Am Anfang", "Dann sagt sie es zweimal", "Dann zehnmal",
     "Irgendwann klingt", "Er hört nur", "und zieht sich", "Er schaut", "Er geht in die", "Er sagt", "Und meint", "Und sie fühlt",
     "Also wird sie", "Und der Kreis", "Von außen", "Doch in Wahrheit", "Jeder Streit", "Und irgendwann wird", "Gefährlich wird es nicht",
     "Gefährlich wird es, wenn", "Denn eine Frau", "Sie hat nur"]
try:
    T = {k: t_of(k) for k in K}
except AssertionError:
    T = None

def talk(t, f=10): return 0.45 + 0.45 * abs(math.sin(t * f))
def shout(t, k=1.0):
    g = math.sin(t * 6.5)
    return dict(emo="angry", talk=talk(t), look=(0.8, 0.1), head_tilt=4 + 2 * g, arm_r=(26 + 8 * g, -112 - 14 * g), arm_l=(10, 25))

# ---------------------------------------------------------------- graphics
def loop_graphic(c, t, t0):
    """two pills (more pressure / more withdrawal) joined by a closed loop of arrows; a dot runs around it"""
    bg(c); glow(c, 540, 820, 420, (1.0, 0.8, 0.6), 0.10)
    cx, cy, r = 540, 820, 230
    c.set_source_rgba(1, 1, 1, 0.55); c.set_line_width(10); c.set_line_cap(cairo.LINE_CAP_ROUND)
    for a0, a1 in ((-1.15, 1.15), (math.pi - 1.15, math.pi + 1.15)):
        c.new_sub_path(); c.arc(cx, cy, r, a0, a1); c.stroke()
        x, y = cx + r * math.cos(a1), cy + r * math.sin(a1); tx, ty = -math.sin(a1), math.cos(a1)      # arrow head along the tangent
        for sd in (-1, 1):
            c.move_to(x, y); c.line_to(x - 34 * tx + sd * 22 * math.cos(a1), y - 34 * ty + sd * 22 * math.sin(a1)); c.stroke()
    a = (t - t0) * 2.2
    glow(c, cx + r * math.cos(a), cy + r * math.sin(a), 60, (1.0, 0.85, 0.6), 0.8)
    for lab, y, col in (("mehr Druck", cy - r, (0.85, 0.55, 0.58)), ("mehr Rückzug", cy + r, (0.58, 0.69, 0.59))):
        Z.rbox(c, cx - 190, y - 55, 380, 110, 55, col); text_c(c, lab, cx, y + 15, 44, (1, 1, 1))
def s_term(c, t):
    loop_graphic(c, t, T["In der Psychologie"])
    text_c(c, "Forderung & Rückzug", 540, 470, 70, (1, 1, 1), ramp(t, T["In der Psychologie"] + 1.3))
def s_circle(c, t): loop_graphic(c, t, T["Und der Kreis"] - 3)
def s_repeat(c, t):
    bg(c)
    n = 2 if t < T["Dann zehnmal"] else 2 + int(8 * ease((t - T["Dann zehnmal"]) / 1.0))
    for k in range(n):
        x = 320 + (k % 2) * 440 + ((k // 2) % 2) * 30; y = 470 + (k // 2) * 125
        UI.bubble(c, x, y, "Kannst du bitte ...?", 32, 1.0, (1 if k % 2 else -1, 0))
    text_c(c, f"{n}×", 540, 1200, 150, (0.95, 0.80, 0.50))

# ---------------------------------------------------------------- shots
KIT_HER = (330, 1000, 2.0); KIT_HIM = (770, 960, 1.9)
def s_hook(c, t): Z.counter_kitchen(c, t, her=shout(t), him=dict(emo="neutral", look=(-0.3, 0.6), arm_l=(8, 20), arm_r=(8, 20)))
def s_him_silent(c, t): Z.counter_kitchen(c, t, her=shout(t), him=Z.arms_crossed(dict(emo="neutral", look=(0.2, 0.7), head_tilt=5)))
def s_hall_fight(c, t):
    Z.hallway(c, t, her=shout(t), him=Z.arms_crossed(dict(emo="neutral", look=(0.6, 0.3), head_tilt=6)))
def s_sweet(c, t): sofa(c, t, lamp=0.8, her=dict(phone=0, emo="smile", talk=talk(t, 8), look=(0.9, 0.1), tilt=4), him=dict(phone=1))
def s_reproach(c, t):
    Z.counter_kitchen(c, t, her=shout(t), him=dict(emo="worried", look=(-0.6, 0.1), arm_l=(8, 20), arm_r=(8, 20)))
    UI.bubble(c, 470, 620, "Immer ich!", 44, ease((t - T["Irgendwann klingt"] - 0.4) / 0.25), (-1, 0))
def s_criticism(c, t):
    Z.counter_kitchen(c, t, her=shout(t), him=dict(emo="worried", look=(-0.5, 0.3), head_tilt=-6, arm_l=(8, 20), arm_r=(8, 20)))
    for k, (x, y) in enumerate(((640, 640), (900, 600), (690, 760))):
        UI.bubble(c, x, y, "Kritik", 30, ease((t - T["Er hört nur"] - 0.2 - 0.3 * k) / 0.2), (1, 0))
def s_retreat(c, t): Z.car(c, t, her=None, him=SL.lap_hands(dict(emo="neutral", look=(0.2, 0.6), head_tilt=4)))
def s_phone(c, t): sofa(c, t, her=dict(phone=0, emo="sad", look=(0.9, 0.2), tilt=5), him=dict(phone=1))
def s_garage(c, t):
    Z.hallway(c, t, her=dict(emo="sad", look=(0.8, 0.1), arm_l=(8, 10), arm_r=(6, 10)),
              him=dict(emo="neutral", look=(-0.2, 0.0), arm_l=(6, 10), arm_r=(6, 10)), him_front=True)
def s_says(c, t):
    Z.counter_kitchen(c, t, her=dict(emo="sad", look=(0.8, 0.1), arm_l=(8, 20), arm_r=(8, 20)),
                      him=Z.arms_crossed(dict(emo="neutral", talk=talk(t) if t < T["Und meint"] - 0.3 else 0, look=(-0.7, 0.1))))
    UI.bubble(c, 700, 640, "Ich habe keine Lust\nauf Streit.", 26, ease((t - T["Er sagt"] - 0.3) / 0.25), (1, 0))
def s_means(c, t):
    Z.park(c, t, her=dict(emo="sad", look=(0.6, 0.2), arm_l=(10, 60), arm_r=(10, 60)), him=Z.arms_crossed(dict(emo="neutral", look=(0.7, 0.0))))
    UI.bubble(c, 800, 820, "Lass mich in Ruhe.", 30, ease((t - T["Und meint"] - 0.2) / 0.25), (1, 0))
def s_unseen(c, t): Z.bathroom(c, t, her=dict(emo="sad", look=(0, 0.6)))
def s_louder(c, t): Z.counter_kitchen(c, t, her=shout(t), him=Z.arms_crossed(dict(emo="neutral", look=(0.3, 0.7))))
def s_outside(c, t): UI.building(c, t, T["Von außen"], T["Doch in Wahrheit"] + 0.5)
def s_fights_for(c, t): Z.bedroom(c, t, her=dict(emo="cry", look=(0.1, 0.2), head_tilt=-6), him=None)
def s_memory(c, t):
    Z.balcony(c, t, her=dict(emo="smile", look=(0.6, 0.2), head_tilt=6), him=dict(emo="smile", look=(-0.6, 0.3), head_tilt=-4), hug=1.0)
    KO.memory(c)
def s_silent_house(c, t): Z.bedroom(c, t, her=dict(emo="neutral", look=(-0.8, 0.0), head_tilt=-6), him=dict(emo="neutral", look=(0.8, 0), head_tilt=8))
def s_car_fight(c, t): Z.car(c, t, her=SL.lap_hands(dict(emo="angry", talk=talk(t), look=(0.8, 0.1), head_tilt=4)), him=SL.drive_pose(dict(emo="neutral", look=(0, 0))))
def s_quiet(c, t):
    gy = SL.seat_gy("w", 1240, 860)
    Z.office(c, t, her=dict(emo="neutral", look=(0, 0.5), arm_l=(10, 60), arm_r=(10, 60)))
def s_apart(c, t): sofa(c, t, lamp=0.3, her=dict(phone=1, emo="neutral"), him=dict(phone=1))
def s_end(c, t): Z.bedroom(c, t, her=dict(emo="closed", look=(0, 0), head_tilt=-4), him=None)

WIDE = (540, 950, 1.0)
BED = (540, 1060, 1.25)
BED_HER = (330, 1000, 2.3)
SHOTS = [
    (0.0, s_hook, KIT_HER), (T["desto stiller"], s_him_silent, KIT_HIM), (T["Und je stiller"], s_hall_fight, WIDE), (T["desto lauter wird sie"], s_hall_fight, (400, 980, 2.0)),
    (T["In der Psychologie"], s_term, WIDE), (T["Am Anfang"], s_sweet, VB.MED), (T["Dann sagt sie es zweimal"], s_repeat, WIDE), (T["Dann zehnmal"], s_repeat, (540, 900, 1.1)),
    (T["Irgendwann klingt"], s_reproach, WIDE), (T["Er hört nur"], s_criticism, KIT_HIM), (T["und zieht sich"], s_retreat, (700, 1000, 1.5)), (T["Er schaut"], s_phone, VB.MED),
    (T["Er geht in die"], s_garage, WIDE), (T["Er sagt"], s_says, KIT_HIM), (T["Und meint"], s_means, (700, 1060, 1.5)), (T["Und sie fühlt"], s_unseen, (540, 1050, 1.1)),
    (T["Also wird sie"], s_louder, WIDE), (T["Und der Kreis"], s_circle, WIDE), (T["Von außen"], s_outside, WIDE), (T["Doch in Wahrheit"], s_fights_for, BED_HER),
    (T["Jeder Streit"], s_memory, (520, 1050, 1.15)), (T["Und irgendwann wird"], s_silent_house, BED), (T["Gefährlich wird es nicht"], s_car_fight, (540, 1040, 1.15)),
    (T["Gefährlich wird es, wenn"], s_quiet, (540, 980, 1.2)), (T["Denn eine Frau"], s_apart, VB.MED), (T["Sie hat nur"], s_end, BED_HER),
] if T else []

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
            V.draw_caption(im, ws, hl, SUB_Y, V.F_SUB, ease((t - s0 + 0.02) / 0.09)); break
    return im
