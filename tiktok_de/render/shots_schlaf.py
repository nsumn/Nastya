"""'Warum sie neben dir so schnell einschläft' (first-night effect, bed-sharing and REM sleep).
Fast cuts like liebe.beziehung: ~26 shots, a new place or angle in every shot (sets2), body language.

Render with:  SHOTS=shots_schlaf python video_v5.py <alignment.csv> <out_dir> <worker> <n_workers> [--preview t1,...]
"""
import math
import video_shots as VB
import shots_tasse as UI                 # overlay helpers: hud, ring, thoughts, bubble, building, rrect, tw, font
import sets2 as Z
import numpy as np
import cairocffi as cairo
from PIL import Image, ImageDraw, ImageFilter
from storybook import Pen, shape, glow
import character2 as C2

V, A, SF = VB.V, VB.A, VB.SF
W, H, FPS = V.W, V.H, V.FPS
ease, ramp, t_of, DUR = V.ease, V.ramp, V.t_of, V.DUR
breath, blink, bg, text_c, sofa = V.breath, V.blink, VB.bg, VB.text_c, VB.sofa
SUB_Y = VB.SUB_Y
ROSE_RGB = (255, 255, 255)
hands_on_phone = VB.hands_on_phone
font, GOLD, SAGE, RED, GREY, INK = UI.font, UI.GOLD, UI.SAGE, UI.RED, UI.GREY, UI.INK

K = ["kein Zufall", "Einschlafen bedeutet", "Und das tut", "Forscher der", "In einer fremden", "eine Hälfte", "wie ein Nachtwächter",
     "Man nennt", "Viele Frauen", "Sie liegt wach", "Sie hört", "Ihr Kopf", "Aber neben", "darf ihr", "Im Auto", "Auf dem Sofa",
     "An deiner", "Eine Studie", "Paare, die", "also die Phase", "Wenn sie also", "sagt ihr Körper", "Bei dir muss", "Und wenn sie",
     "dann hör", "Schick das"]
try:
    T = {k: t_of(k) for k in K}
except AssertionError:
    T = None

# ---------------------------------------------------------------- helpers
def seat_gy(kind, seat_y, height): return seat_y + (C2.Spec(kind).hip_y + 20) * height / 1000.0
def drive_pose(base=None):
    return Z.reach_pose("m", 780, seat_gy("m", 1330, 830), 830, {"arm_l": (640, 1250), "arm_r": (920, 1250)}, dict(base or {}, drive=True))
def lap_hands(base=None): return dict(base or {}, arm_l=(8, 70), arm_r=(8, 70), fore_k=0.7, thumbs=False)
def zzz(c, x, y, t, s=1.0):
    for k in range(3):
        u = ((t * 0.6 + k / 3) % 1)
        c.select_font_face("Inter", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD); c.set_font_size((26 + 14 * k) * s)
        c.move_to(x + 30 * k * s + 10 * u, y - 40 * k * s - 30 * u); c.set_source_rgba(1, 1, 1, 0.7 * math.sin(math.pi * u)); c.show_text("z")

def card(c, title, sub, icon=None):
    bg(c); glow(c, 540, 700, 420, (1.0, 0.85, 0.6), 0.12)
    text_c(c, title, 540, 640, 84, (1, 1, 1)); text_c(c, sub, 540, 720, 40, (0.78, 0.79, 0.86))
    if icon == "moon":
        c.arc(540, 930, 90, 0, 2 * math.pi); c.set_source_rgb(0.95, 0.88, 0.70); c.fill()
        c.arc(585, 900, 82, 0, 2 * math.pi); c.set_source_rgb(*Z.WALL0); c.fill()

# ---------------------------------------------------------------- shots
def s_title(c, t): Z.bedroom(c, t, her=dict(emo="closed", look=(0.3, 0), head_tilt=8), him=dict(emo="smile", look=(-0.7, 0.2), head_tilt=-6))
def s_car(c, t): Z.car(c, t, her=lap_hands(dict(emo="closed", head_tilt=-14, lean=-3)), him=drive_pose(dict(emo="calm", look=(-0.4, 0.1))))
def s_close_eyes(c, t):
    e = "closed" if t > T["Einschlafen bedeutet"] + 1.2 or (t > T["Einschlafen bedeutet"] + 0.5 and int(t * 4) % 2) else "calm"
    Z.bedroom(c, t, her=dict(emo=e, look=(0.1, 0.2), head_tilt=-5), him=None)
def s_safe(c, t): Z.balcony(c, t, her=dict(emo="smile", look=(0.6, 0.2), head_tilt=6), him=dict(emo="calm", look=(-0.6, 0.3), head_tilt=-4), hug=1.0)
def s_brown(c, t): card(c, "Brown University", "Schlafforschung, 2016", "moon")
def s_strange(c, t):
    lk = math.sin(t * 1.3)
    Z.hallway(c, t, her=dict(emo="worried", look=(0.8 * lk, 0.0), arm_l=(8, 10), arm_r=(6, 10)), her_bag=True)
def s_brain(c, t):
    bg(c); glow(c, 400, 860, 360, (1.0, 0.80, 0.45), 0.22 + 0.06 * math.sin(t * 4))
    for sd, col in ((-1, (0.92, 0.72, 0.50)), (1, (0.30, 0.33, 0.48))):
        c.save(); c.translate(540 + sd * 12, 860)
        c.move_to(0, -230); c.curve_to(sd * 160, -250, sd * 290, -150, sd * 290, 10); c.curve_to(sd * 290, 170, sd * 150, 240, 0, 220); c.close_path()
        C2.finish(c, col, 5)
        for k in range(3):
            c.move_to(sd * 40, -150 + k * 120); c.curve_to(sd * 120, -190 + k * 120, sd * 200, -110 + k * 120, sd * 250, -150 + k * 120)
            c.set_source_rgba(0, 0, 0, 0.25); c.set_line_width(6); c.stroke()
        c.restore()
    # an open eye on the awake half, zzz on the sleeping half
    C2.ellipse(c, 400, 860, 70, 40); C2.finish(c, (1, 1, 1), 4); C2.ellipse(c, 400, 860, 26, 26); c.set_source_rgb(0.15, 0.12, 0.12); c.fill()
    zzz(c, 640, 880, t, 1.3)
    text_c(c, "wach", 400, 1140, 44, (1.0, 0.85, 0.6)); text_c(c, "schläft", 680, 1140, 44, (0.7, 0.72, 0.85))
def s_watch(c, t):
    g = cairo.LinearGradient(0, 0, 0, H); g.add_color_stop_rgb(0, 0.05, 0.06, 0.12); g.add_color_stop_rgb(1, 0.12, 0.11, 0.18)
    c.set_source(g); c.paint()
    c.arc(820, 380, 70, 0, 2 * math.pi); c.set_source_rgb(0.95, 0.88, 0.70); c.fill(); c.arc(850, 360, 64, 0, 2 * math.pi); c.set_source_rgb(0.06, 0.07, 0.13); c.fill()
    z = 1.15 - 0.15 * ease((t - T["wie ein Nachtwächter"]) / 2.5)
    c.save(); c.translate(540, 1000); c.scale(z, z); c.translate(-540, -1000)
    Z.rect(c, 260, 560, 560, 1500, (0.13, 0.13, 0.20))
    for i in range(9):
        for j in range(4):
            lit = (i, j) == (4, 2)
            c.set_source_rgb(*((0.95, 0.75, 0.42) if lit else (0.08, 0.08, 0.12))); c.rectangle(300 + j * 130, 610 + i * 140, 80, 90); c.fill()
    glow(c, 600, 1225, 160, (1.0, 0.75, 0.4), 0.5 + 0.1 * math.sin(t * 3))
    c.restore()
def s_term(c, t):
    bg(c); glow(c, 540, 640, 420, (1.0, 0.85, 0.6), 0.12)
    text_c(c, "Erste-Nacht-", 540, 640, 104, (1, 1, 1), ramp(t, T["Man nennt"] + 0.2)); text_c(c, "Effekt", 540, 760, 104, (1, 1, 1), ramp(t, T["Man nennt"] + 0.5))
    for k in range(3): zzz(c, 470 + k * 60, 960, t + k * 0.3)
def s_distance(c, t):
    Z.park(c, t, her=Z.arms_crossed(dict(emo="sad", look=(-0.6, 0.3), head_tilt=-5)), him=dict(emo="neutral", look=(0.3, 0.6), arm_l=(10, 60), arm_r=(10, 60)))
def s_awake(c, t): Z.bedroom(c, t, her=dict(emo="worried", look=(0.0, -0.8)), him=dict(emo="closed", look=(0.7, 0), head_tilt=8))
def s_hears(c, t): Z.stairs(c, t, her=dict(emo="worried", look=(0.8 * math.sin(t * 1.6), 0.0), head_tilt=4))
def s_head(c, t):
    gy = seat_gy("w", 1240, 860)
    Z.office(c, t, her=Z.hand_on_forehead("w", 540, gy, 860, 1, dict(emo="worried", look=(0, 0.6)), other=(420, 1180)))
def s_sofa_warm(c, t):
    lean = 0.4 * ramp(t, T["Aber neben"] + 0.6, 1.2)
    sofa(c, t, lamp=1.0, lean=lean, her=dict(phone=0, emo="smile", look=(0.6, 0.3), tilt=5), him=dict(phone=0, emo="smile", look=(-0.6, 0.3), tilt=-3))
def s_let_go(c, t):
    Z.park(c, t, xs=(450, 650), her=lap_hands(dict(emo="closed", head_tilt=16, lean=5)), him=dict(emo="calm", look=(-0.4, 0.3), head_tilt=-6, arm_l=(10, 60), arm_r=(10, 60)))
def s_car_cu(c, t):
    Z.car(c, t, her=lap_hands(dict(emo="closed", head_tilt=-16, lean=-3)), him=drive_pose(dict(emo="smile", look=(-0.6, 0.1))))
    zzz(c, 360, 760, t)
def s_sofa_film(c, t):
    sofa(c, t, lamp=0.0, lean=1.0, her=dict(phone=0, emo="closed", tilt=10), him=dict(phone=0, emo="smile", look=(0, -0.2), tilt=-3))
    glow(c, 540, 300, 700, (0.55, 0.70, 1.0), 0.28 + 0.05 * math.sin(t * 5))
def s_shoulder(c, t): Z.balcony(c, t, her=dict(emo="closed", head_tilt=8), him=dict(emo="smile", look=(-0.5, 0.4), head_tilt=-6), hug=1.0)
def s_mannheim(c, t): card(c, "Studie aus Mannheim", "Paare im Schlaflabor, 2020", "moon")
def s_rem(c, t):
    bg(c)
    text_c(c, "REM-Schlaf", 540, 520, 84, (1, 1, 1))
    for x, hgt, col, lab in ((360, 300, (0.40, 0.42, 0.55), "allein"), (720, 470, (0.58, 0.69, 0.59), "zu zweit")):
        u = ramp(t, T["Paare, die"] + (0.2 if lab == "allein" else 0.8), 0.6)
        Z.rbox(c, x - 100, 1150 - hgt * u, 200, max(1, hgt * u), 20, col)
        text_c(c, lab, x, 1220, 44, (0.85, 0.86, 0.92))
    if t > T["Paare, die"] + 1.2:
        c.save(); c.translate(720, 620); V.heart(c, 0, 0, 34); c.set_source_rgb(0.85, 0.42, 0.45); c.fill(); c.restore()
def s_dream(c, t):
    Z.bedroom(c, t, her=dict(emo="closed", head_tilt=10), him=dict(emo="closed", head_tilt=-8))
    for k in range(4):
        u = ((t * 0.35 + k / 4) % 1)
        c.save(); c.translate(430 + 70 * k, 880 - 260 * u); s = 0.6 + 0.4 * u; c.scale(s, s); V.heart(c, 0, 0, 24)
        c.set_source_rgba(0.95, 0.70, 0.72, 0.8 * math.sin(math.pi * u)); c.fill(); c.restore()
def s_sofa_sleep(c, t):
    sofa(c, t, lamp=1.0, lean=1.0, her=dict(phone=0, emo="closed", tilt=10), him=dict(phone=0, emo="calm", look=(-0.6, 0.6), tilt=-5))
def s_body(c, t): Z.bedroom(c, t, her=dict(emo="smile", look=(0, 0), head_tilt=-6, blink=True), him=None)
def s_quote(c, t):
    bg(c); glow(c, 540, 720, 460, (1.0, 0.80, 0.55), 0.18)
    text_c(c, "Bei dir muss ich", 540, 680, 76, (1, 1, 1), ramp(t, T["Bei dir muss"]))
    text_c(c, "nicht aufpassen.", 540, 780, 76, (1, 1, 1), ramp(t, T["Bei dir muss"] + 0.5))
    c.save(); c.translate(540, 940); s = 1 + 0.06 * math.sin(t * 6); c.scale(s, s); V.heart(c, 0, 0, 40)
    c.set_source_rgb(0.85, 0.42, 0.45); c.fill(); c.restore()
def s_cant_sleep(c, t): Z.bathroom(c, t, her=dict(emo="sad", look=(0, 0.8)))
def s_listen(c, t):
    Z.counter_kitchen(c, t, her=dict(emo="sad", talk=0.5 + 0.4 * abs(math.sin(t * 9)), look=(0.8, 0.1), arm_l=(8, 20), arm_r=(8, 20)),
                      him=dict(emo="calm", look=(-0.8, 0.1), head_tilt=-6, arm_l=(10, 20), arm_r=(10, 20)))
def s_house(c, t): UI.building(c, t, T["Schick das"], DUR)

WIDE = (540, 950, 1.0)
BED = (540, 1060, 1.25)
BED_HER = (330, 1000, 2.3)
CAR = (540, 1040, 1.15)
CAR_HER = (330, 1000, 1.75)
SHOTS = [
    (0.0, s_title, BED), (T["kein Zufall"] - 0.3, s_car, CAR), (T["Einschlafen bedeutet"], s_close_eyes, BED_HER), (T["Und das tut"], s_safe, (520, 1050, 1.15)),
    (T["Forscher der"], s_brown, WIDE), (T["In einer fremden"], s_strange, WIDE), (T["eine Hälfte"], s_brain, WIDE), (T["wie ein Nachtwächter"], s_watch, WIDE),
    (T["Man nennt"], s_term, WIDE), (T["Viele Frauen"], s_distance, WIDE), (T["Sie liegt wach"], s_awake, BED), (T["Sie hört"], s_hears, (560, 1150, 1.15)),
    (T["Ihr Kopf"], s_head, (540, 980, 1.2)), (T["Aber neben"], s_sofa_warm, VB.MED), (T["darf ihr"], s_let_go, (550, 1080, 1.35)),
    (T["Im Auto"], s_car_cu, CAR_HER), (T["Auf dem Sofa"], s_sofa_film, VB.FACES), (T["An deiner"], s_shoulder, (500, 900, 1.6)),
    (T["Eine Studie"], s_mannheim, WIDE), (T["Paare, die"], s_rem, WIDE), (T["also die Phase"], s_dream, BED), (T["Wenn sie also"], s_sofa_sleep, VB.MED),
    (T["sagt ihr Körper"], s_body, BED_HER), (T["Bei dir muss"], s_quote, WIDE), (T["Und wenn sie"], s_cant_sleep, (540, 1050, 1.1)),
    (T["dann hör"], s_listen, WIDE), (T["Schick das"], s_house, WIDE),
] if T else []

# ---------------------------------------------------------------- overlays
def overlays(im, t):
    if t < T["kein Zufall"] - 0.5: return
    if T["Forscher der"] <= t < T["Viele Frauen"]: UI.hud(im, "Studie", "Brown University")
    elif T["Eine Studie"] <= t < T["Wenn sie also"]: UI.hud(im, "Studie", "Mannheim, 2020")
    elif T["Viele Frauen"] <= t < T["Aber neben"] or T["Und wenn sie"] <= t < T["Schick das"]: UI.hud(im, "Nacht", "03:14")
    else: UI.hud(im, "Abend", "22:40")
    if T["Ihr Kopf"] <= t < T["Aber neben"]:
        n = int(4 + 14 * ease((t - T["Ihr Kopf"]) / 1.6)); UI.thoughts(im, n, 1.0, min_y=420)
    if T["darf ihr"] <= t < T["Im Auto"]:
        u = ease((t - T["darf ihr"]) / max(0.5, T["Im Auto"] - T["darf ihr"] - 0.3)); b = int(92 - 30 * u)
        UI.ring(im, 540, 390, 95, str(b), (b - 50) / 60, "Puls / Minute", SAGE if b < 75 else (240, 240, 245), 90)
    if t >= T["Schick das"]:
        u = ease((t - T["Schick das"]) / 0.3)
        if u > 0:
            layer = Image.new("RGBA", (220, 220)); d = ImageDraw.Draw(layer)
            d.ellipse((10, 10, 210, 210), fill=(25, 25, 36, 230), outline=GOLD + (255,), width=6)
            d.polygon([(60, 115), (165, 60), (125, 165), (105, 120)], fill=GOLD + (255,))
            sz = int(160 * u); layer = layer.resize((max(1, sz), max(1, sz))); im.paste(layer, (540 - sz // 2, 420 - sz // 2), layer)

def title(im):
    d = ImageDraw.Draw(im)
    for i, line in enumerate(("Warum sie neben dir", "so schnell einschläft")):
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
    if t < T["kein Zufall"] - 0.5: title(im)
    overlays(im, t)
    for s0, e0, ws, hl in V.CAPS:
        if s0 - 0.02 <= t < e0:
            V.draw_caption(im, ws, hl, SUB_Y, V.F_SUB, ease((t - s0 + 0.02) / 0.09)); break
    return im
