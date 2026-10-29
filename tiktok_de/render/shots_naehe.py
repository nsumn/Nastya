"""'Wenn sie seiner Nähe ausweicht' (Basson's responsive desire, stress, hugs without expectation; Light/Grewen/Amico 2005).
Neutral third-person narration; fast cuts with a new place in almost every shot.

Render with:  SHOTS=shots_naehe python video_v5.py <alignment.csv> <out_dir> <worker> <n_workers> [--preview t1,...]
"""
import math
import video_shots as VB
import shots_tasse as UI
import shots_schlaf as SL                # card, zzz, lap_hands, drive_pose, seat_gy
import sets2 as Z
import numpy as np
import cairocffi as cairo
from PIL import Image, ImageDraw
from storybook import glow
import character2 as C2

V, A, SF = VB.V, VB.A, VB.SF
W, H, FPS = V.W, V.H, V.FPS
ease, ramp, t_of, DUR = V.ease, V.ramp, V.t_of, V.DUR
bg, text_c, sofa = VB.bg, VB.text_c, VB.sofa
SUB_Y = VB.SUB_Y
ROSE_RGB = (255, 255, 255)
hands_on_phone = VB.hands_on_phone
GOLD, SAGE, RED, INK = UI.GOLD, UI.SAGE, UI.RED, UI.INK

K = ["dass die Liebe", "Oft steckt", "Für viele Frauen", "Die Sexualmedizinerin", "dass bei vielen", "sondern erst", "Aber wie soll",
     "bei der Wäsche", "bei den Kindern", "bei der Arbeit", "Dauerstress", "Und dann gibt", "Wenn jede Umarmung", "weicht sie",
     "Nicht aus Kälte", "Forscher der", "Frauen, die von", "haben einen", "Nähe ohne", "Eine Umarmung, die", "Eine Hand",
     "Genau daraus", "Schick das"]
try:
    T = {k: t_of(k) for k in K}
except AssertionError:
    T = None

# ---------------------------------------------------------------- graphics
def s_switch(c, t):
    bg(c)
    u = ease((t - T["Für viele Frauen"] - 0.3) / 0.3)
    Z.rbox(c, 420, 640, 240, 360, 30, (0.86, 0.85, 0.88))
    Z.rbox(c, 490, 700, 100, 240, 20, (0.70, 0.70, 0.75))
    Z.rbox(c, 500, 710 + 120 * u, 80, 100, 16, (0.95, 0.95, 0.97))
    text_c(c, "AN", 540, 680, 30, (0.25, 0.25, 0.3)); text_c(c, "AUS", 540, 990, 30, (0.25, 0.25, 0.3))
    x = ease((t - T["Für viele Frauen"] - 0.9) / 0.3)
    if x > 0:
        c.set_source_rgba(*[v / 255 for v in RED], 0.95); c.set_line_width(24); c.set_line_cap(cairo.LINE_CAP_ROUND)
        c.move_to(360, 600); c.line_to(360 + 360 * x, 600 + 440 * x); c.stroke()

def s_basson(c, t): SL.card(c, "Rosemary Basson", "Sexualmedizin, 2000")

def s_cycle(c, t):
    bg(c); glow(c, 540, 860, 420, (1.0, 0.8, 0.6), 0.10)
    nodes = [("Nähe", 540, 600, T["sondern erst"] + 0.3), ("Entspannung", 760, 980, T["sondern erst"] + 0.9), ("Lust", 320, 980, T["sondern erst"] + 1.6)]
    if t < T["sondern erst"]:
        text_c(c, "nicht spontan", 540, 820, 70, (0.85, 0.86, 0.92), ramp(t, T["dass bei vielen"] + 0.6))
        return
    for k, (lab, x, y, t0) in enumerate(nodes):
        u = ramp(t, t0, 0.3)
        if u <= 0: continue
        Z.rbox(c, x - 170, y - 60, 340, 120, 60, (0.58, 0.69, 0.59) if lab != "Lust" else (0.85, 0.55, 0.58))
        text_c(c, lab, x, y + 18, 50, (1, 1, 1), u)
        if k:
            px, py = nodes[k - 1][1], nodes[k - 1][2]
            c.set_source_rgba(1, 1, 1, 0.7 * u); c.set_line_width(8); c.move_to(px + (x - px) * 0.3, py + (y - py) * 0.3 + 60); c.line_to(px + (x - px) * 0.7, py + (y - py) * 0.7 + 10); c.stroke()

def s_battery(c, t):
    bg(c)
    text_c(c, "Dauerstress", 540, 560, 96, (1, 1, 1))
    Z.rbox(c, 340, 700, 400, 200, 30, (0.20, 0.20, 0.28)); Z.rbox(c, 740, 760, 30, 80, 8, (0.20, 0.20, 0.28))
    lvl = 0.7 - 0.6 * ease((t - T["Dauerstress"]) / 1.6)
    c.set_source_rgb(*([v / 255 for v in RED] if lvl < 0.3 else (0.58, 0.69, 0.59))); Z.rrect(c, 360, 720, 360 * lvl, 160, 20); c.fill()

def s_unc(c, t): SL.card(c, "University of North Carolina", "Paarstudie, 2005")

def s_values(c, t):
    bg(c)
    for x, lab, up, col, t0 in ((330, "Blutdruck", False, SAGE, T["haben einen"]), (750, "Oxytocin", True, GOLD, T["haben einen"] + 1.4)):
        u = ramp(t, t0, 0.4)
        if u <= 0: continue
        c.set_source_rgba(*[v / 255 for v in col], u)
        c.save(); c.translate(x, 820); c.scale(1, -1 if up else 1)
        c.move_to(-90, -120); c.line_to(90, -120); c.line_to(90, 20); c.line_to(150, 20); c.line_to(0, 170); c.line_to(-150, 20); c.line_to(-90, 20); c.close_path(); c.fill()
        c.restore()
        text_c(c, lab, x, 1080, 54, (1, 1, 1), u)

# ---------------------------------------------------------------- shots
def touch_pose_hallway(base):
    tgt = (400 + 115, 1780 - 720)                      # her shoulder
    return Z.reach_pose("m", 830, 1760, 1040, {"arm_l": tgt}, base, elbow="down")
def s_open(c, t):
    Z.hallway(c, t, her=dict(emo="worried", look=(0.6, 0.1), lean=-6, head_tilt=-6, arm_l=(8, 10), arm_r=(10, 40)),
              him=touch_pose_hallway(dict(emo="calm", look=(-0.8, 0.1), head_tilt=-4)), him_front=True)
def s_open_cu(c, t):
    Z.bedroom(c, t, her=dict(emo="sad", look=(-0.8, 0.2), head_tilt=-8), him=dict(emo="worried", look=(-0.7, 0.1), head_tilt=-6))
def s_car(c, t): Z.car(c, t, her=SL.lap_hands(dict(emo="neutral", look=(-0.9, 0.1), head_tilt=-6)), him=SL.drive_pose(dict(emo="neutral", look=(0, 0))))
def s_relax_q(c, t):
    Z.bedroom(c, t, her=dict(emo="worried", look=(0.0, -0.7)), him=dict(emo="closed", look=(0.7, 0), head_tilt=8))
def s_laundry(c, t): Z.laundry(c, t, her=dict(emo="sad", look=(0.5, 0.3), head_tilt=-4))
def s_kids(c, t): Z.hallway(c, t, her=dict(emo="worried", look=(0.6, 0.6), head_tilt=6, arm_l=(8, 10), arm_r=(6, 10)), kids=True)
def s_work(c, t):
    gy = SL.seat_gy("w", 1240, 860)
    Z.office(c, t, her=Z.hand_on_forehead("w", 540, gy, 860, 1, dict(emo="worried", look=(0, 0.6)), other=(420, 1180)))
def s_apart(c, t):
    Z.park(c, t, her=Z.arms_crossed(dict(emo="sad", look=(-0.6, 0.3), head_tilt=-5)), him=dict(emo="neutral", look=(0.4, 0.5), arm_l=(10, 60), arm_r=(10, 60)))
def s_invite(c, t):
    sofa(c, t, lamp=0.8, her=dict(phone=0, emo="worried", look=(-0.5, 0.4), tilt=-5), him=dict(phone=0, emo="smile", look=(-0.8, 0.0), tilt=-6))
    UI.bubble(c, 700, 560, "Und jetzt ...?", 40, ease((t - T["Wenn jede Umarmung"] - 0.6) / 0.25), (1, 0))
def s_dodge(c, t):
    tgt = (330 + 110, 1800 - 715)
    Z.counter_kitchen(c, t, her=dict(emo="worried", look=(0.8, 0.0), lean=-7, head_tilt=-8, arm_l=(8, 10), arm_r=(10, 30)),
                      him=Z.reach_pose("m", 770, 1800, 1050, {"arm_l": tgt}, dict(emo="calm", look=(-0.8, 0.1), arm_r=(8, 10)), elbow="down"))
def s_tired(c, t): Z.stairs(c, t, her=dict(emo="sad", look=(0.3, 0.5), head_tilt=6))
def s_hugged(c, t): Z.balcony(c, t, her=dict(emo="smile", look=(0.5, 0.2), head_tilt=6), him=dict(emo="calm", look=(-0.6, 0.3), head_tilt=-4), hug=1.0)
def s_no_expect(c, t):
    sofa(c, t, lamp=1.0, lean=0.5, her=dict(phone=0, emo="smile", look=(0.6, 0.3), tilt=6), him=dict(phone=0, emo="calm", look=(-0.6, 0.3), tilt=-4))
def s_kitchen_hug(c, t):
    Z.counter_kitchen(c, t, hug=1.0, her=dict(emo="closed", head_tilt=4), him=dict(emo="smile", look=(-0.5, 0.3), head_tilt=-6))
def s_hand_back(c, t):
    Z.park(c, t, xs=(450, 650), her=SL.lap_hands(dict(emo="smile", look=(0.4, 0.2), head_tilt=10, lean=4)),
           him=dict(emo="calm", look=(-0.5, 0.3), head_tilt=-6, skip_arms=("arm_l",), arm_r=(10, 60)))
def s_more(c, t):
    Z.bedroom(c, t, lamp=1.0, her=dict(emo="smile", look=(0.6, 0.1), head_tilt=8), him=dict(emo="smile", look=(-0.6, 0.1), head_tilt=-8))
    for k in range(4):
        u = ((t * 0.35 + k / 4) % 1)
        c.save(); c.translate(470 + 50 * k, 900 - 240 * u); s = 0.6 + 0.4 * u; c.scale(s, s); V.heart(c, 0, 0, 24)
        c.set_source_rgba(0.95, 0.70, 0.72, 0.8 * math.sin(math.pi * u)); c.fill(); c.restore()
def s_house(c, t): UI.building(c, t, T["Schick das"], DUR)

WIDE = (540, 950, 1.0)
SHOTS = [
    (0.0, s_open, WIDE), (T["dass die Liebe"], s_open_cu, (540, 1060, 1.25)), (T["Oft steckt"], s_car, (540, 1040, 1.15)),
    (T["Für viele Frauen"], s_switch, WIDE), (T["Die Sexualmedizinerin"], s_basson, WIDE), (T["dass bei vielen"], s_cycle, WIDE),
    (T["Aber wie soll"], s_relax_q, (540, 1060, 1.25)), (T["bei der Wäsche"], s_laundry, WIDE), (T["bei den Kindern"], s_kids, (560, 1150, 1.1)),
    (T["bei der Arbeit"], s_work, (540, 980, 1.2)), (T["Dauerstress"], s_battery, WIDE), (T["Und dann gibt"], s_apart, WIDE),
    (T["Wenn jede Umarmung"], s_invite, VB.MED), (T["weicht sie"], s_dodge, WIDE), (T["Nicht aus Kälte"], s_tired, (560, 1150, 1.15)),
    (T["Forscher der"], s_unc, WIDE), (T["Frauen, die von"], s_hugged, (520, 1050, 1.15)), (T["haben einen"], s_values, WIDE),
    (T["Nähe ohne"], s_no_expect, VB.MED), (T["Eine Umarmung, die"], s_kitchen_hug, (530, 1100, 1.2)), (T["Eine Hand"], s_hand_back, (550, 1080, 1.35)),
    (T["Genau daraus"], s_more, (540, 1060, 1.25)), (T["Schick das"], s_house, WIDE),
] if T else []

def overlays(im, t):
    if t < T["dass die Liebe"] - 0.3: return
    if T["Die Sexualmedizinerin"] <= t < T["Aber wie soll"]: UI.hud(im, "Studie", "Rosemary Basson")
    elif T["Forscher der"] <= t < T["Nähe ohne"]: UI.hud(im, "Studie", "UNC, 2005")
    elif T["Aber wie soll"] <= t < T["Und dann gibt"]: UI.hud(im, "Dienstag", "23:05")
    else: UI.hud(im, "Dienstag", "21:30")
    if T["Aber wie soll"] <= t < T["bei der Wäsche"]:
        UI.thoughts(im, int(3 + 12 * ease((t - T["Aber wie soll"]) / 1.5)), 1.0, min_y=420)
    if t >= T["Schick das"]:
        u = ease((t - T["Schick das"]) / 0.3)
        if u > 0:
            layer = Image.new("RGBA", (220, 220)); d = ImageDraw.Draw(layer)
            d.ellipse((10, 10, 210, 210), fill=(25, 25, 36, 230), outline=GOLD + (255,), width=6)
            d.polygon([(60, 115), (165, 60), (125, 165), (105, 120)], fill=GOLD + (255,))
            sz = int(160 * u); layer = layer.resize((max(1, sz), max(1, sz))); im.paste(layer, (540 - sz // 2, 420 - sz // 2), layer)

def title(im):
    d = ImageDraw.Draw(im)
    for i, line in enumerate(("Wenn sie seiner", "Nähe ausweicht")):
        f = V.F_TOP; w_ = f.getlength(line)
        d.text((540 - w_ / 2, 220 + i * 92), line, font=f, fill=(255, 255, 255), stroke_width=7, stroke_fill=INK)

def frame(t):
    k = max(i for i, s in enumerate(SHOTS) if s[0] <= t)
    t0, fn, (cx, cy, z) = SHOTS[k]; t1 = SHOTS[k + 1][0] if k + 1 < len(SHOTS) else DUR
    s = cairo.ImageSurface(cairo.FORMAT_RGB24, W, H); c = cairo.Context(s)
    zz = z * (1 + 0.05 * ease((t - t0) / max(0.1, t1 - t0)))
    c.translate(540, 950); c.scale(zz, zz); c.translate(-cx, -cy)
    fn(c, t)
    c.identity_matrix()
    f = min(ease((t - t0) / 0.10) if k else 1.0, ease((t1 - t) / 0.10) if k + 1 < len(SHOTS) else ease((DUR - t) / 0.8))
    if f < 1: c.set_source_rgba(0, 0, 0, 0.7 * (1 - f) if k + 1 < len(SHOTS) else 1 - f); c.paint()
    s.flush()
    arr = np.frombuffer(s.get_data(), np.uint8).reshape(H, W, 4)[:, :, [2, 1, 0]].copy()
    im = Image.fromarray(SF.look(arr, int(t * FPS)))
    if t < T["dass die Liebe"] - 0.3: title(im)
    overlays(im, t)
    for s0, e0, ws, hl in V.CAPS:
        if s0 - 0.02 <= t < e0:
            V.draw_caption(im, ws, hl, SUB_Y, V.F_SUB, ease((t - s0 + 0.02) / 0.09)); break
    return im
