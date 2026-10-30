"""'Je mehr sie investiert hat' (sunk cost effect). Built on the liebe.beziehung structure:
bold 'Je … desto …' hook, 'In der Psychologie nennt man das …', her inner world in short lines, aphorism at the end;
no title, no HUD, no CTA, first cut after ~1.5 s, a new picture every ~2.3 s.

Render with:  SHOTS=shots_kosten python video_v5.py <alignment.csv> <out_dir> <worker> <n_workers> [--preview t1,...]
"""
import math
import video_shots as VB
import shots_tasse as UI
import shots_schlaf as SL
import sets2 as Z
import numpy as np
import cairocffi as cairo
from PIL import Image
from storybook import Pen, glow, shape, ellipse_pts
import character2 as C2

V, A, SF = VB.V, VB.A, VB.SF
W, H, FPS = V.W, V.H, V.FPS
ease, ramp, t_of, DUR = V.ease, V.ramp, V.t_of, V.DUR
bg, text_c, sofa = VB.bg, VB.text_c, VB.sofa
SUB_Y = VB.SUB_Y
ROSE_RGB = (255, 255, 255)
hands_on_phone = VB.hands_on_phone
OUTL = V.OUTL

K = ["investiert", "desto schwerer", "Selbst wenn", "In der Psychologie", "Sie denkt", "An die Abende", "An all die", "Und ihr Kopf",
     "Also bleibt", "Sie hofft", "Sie erinnert", "übersieht", "Sie wird stiller", "Sie lacht", "Sie funktioniert", "Von außen",
     "aber innen", "Und je länger", "Doch irgendwann", "Die Jahre sind", "Sie gehen verloren", "Denn eine Frau", "an dem sie die Tür",
     "Sie geht leise", "Stück für", "Lange vorher"]
try:
    T = {k: t_of(k) for k in K}
except AssertionError:
    T = None

def memory(c, a=0.32):
    """warm faded 'memory' tint over a scene"""
    c.identity_matrix(); c.set_source_rgba(0.95, 0.75, 0.50, a); c.set_operator(cairo.OPERATOR_SOFT_LIGHT); c.paint()
    c.set_operator(cairo.OPERATOR_OVER); c.set_source_rgba(0.85, 0.70, 0.55, 0.12); c.paint()

def coin(c, x, y, r, a=1.0):
    C2.ellipse(c, x, y, r, r * 0.9); c.set_source_rgba(0.92, 0.74, 0.36, a); c.fill_preserve(); c.set_source_rgba(*OUTL, a); c.set_line_width(4); c.stroke()
    C2.ellipse(c, x, y, r * 0.62, r * 0.55); c.set_source_rgba(0.80, 0.60, 0.28, a); c.set_line_width(4); c.stroke()

# ---------------------------------------------------------------- shots
def s_hook(c, t): Z.car(c, t, her=SL.lap_hands(dict(emo="cry", look=(-0.6, 0.2), head_tilt=-8)), him=SL.drive_pose(dict(emo="neutral", look=(0, 0))))
def s_bed_awake(c, t): Z.bedroom(c, t, her=dict(emo="sad", look=(0.0, -0.7)), him=dict(emo="closed", look=(0.8, 0), head_tilt=8))
def s_door_hesitate(c, t):
    Z.hallway(c, t, her=dict(emo="worried", look=(0.8 * math.sin(t * 1.4), 0.1), arm_l=(8, 10), arm_r=(6, 10)), her_bag=True)
def s_mirror(c, t): Z.bathroom(c, t, her=dict(emo="sad", look=(0, 0.6)))
def s_term(c, t):
    bg(c)
    g = cairo.LinearGradient(0, 900, 0, H); g.add_color_stop_rgba(0, 0.10, 0.16, 0.30, 0.0); g.add_color_stop_rgba(0.1, 0.10, 0.16, 0.30, 0.9); g.add_color_stop_rgb(1, 0.03, 0.05, 0.10)
    c.set_source(g); c.rectangle(0, 900, W, H - 900); c.fill()
    text_c(c, "Effekt der", 540, 520, 80, (0.85, 0.86, 0.92), ramp(t, T["In der Psychologie"] + 1.2))
    text_c(c, "versunkenen Kosten", 540, 620, 86, (1, 1, 1), ramp(t, T["In der Psychologie"] + 1.6))
    lt = t - T["In der Psychologie"]
    for k in range(7):                        # coins dropping and sinking
        t0 = 0.35 * k; u = lt - t0
        if u < 0: continue
        x = 300 + (k * 97) % 480
        y = 700 + min(u, 0.5) / 0.5 * 220 + max(0, u - 0.5) * 140
        a = 1.0 if y < 920 else max(0.0, 1 - (y - 920) / 380)
        coin(c, x, y, 42, a)
def s_years(c, t):
    bg(c); lt = t - T["Sie denkt"]
    years = list(range(2004, 2026)); k = min(len(years) - 1, int(lt / 0.12))
    for j in range(3, 0, -1): Z.rect(c, 330 + j * 10, 520 + j * 10, 420, 470, (0.82, 0.80, 0.76))
    Z.rect(c, 330, 520, 420, 470, (0.96, 0.95, 0.92))
    c.set_source_rgb(0.79, 0.54, 0.57); c.rectangle(330, 520, 420, 100); c.fill()
    text_c(c, "JAHRE", 540, 588, 46, (1, 1, 1)); text_c(c, str(years[k]), 540, 860, 150, (0.15, 0.15, 0.2))
def s_waiting(c, t):
    V.kitchen(c, Pen(3), 23, 10, 0.6)
    A.woman(c, Pen(11), 300, 780, 0.82, dict(phone=0, emo="sad", look=(0.9, 0.1), tilt=4, blink=V.blink(t, 3.0)))
    V.table(c, Pen(19), plate=300)
    for x in (300, 790):
        shape(c, Pen(19), ellipse_pts(x, 1225, 120, 28, 24), (0.88, 0.86, 0.82), lw=3, line=OUTL)
    shape(c, Pen(3), [(700, 760), (880, 760), (880, 1180), (700, 1180)], (0.24, 0.22, 0.26), smooth=False, lw=3, line=OUTL)   # empty chair
def s_forgave(c, t): Z.stairs(c, t, her=dict(emo="cry", look=(0.3, 0.5), head_tilt=6))
def s_head(c, t):
    Z.bedroom(c, t, her=dict(emo="worried", look=(0.2, -0.3), head_tilt=-4), him=None)
    UI.bubble(c, 330, 820, "Wenn ich jetzt gehe,\nwar alles umsonst.", 20, ease((t - T["Und ihr Kopf"] - 0.5) / 0.25), (-1, 0))
def s_stays(c, t):
    Z.hallway(c, t, her=dict(emo="sad", look=(0.2, 0.7), head_tilt=8, arm_l=(8, 10), arm_r=(6, 10)))
    Z.box(c, [(560, 1620), (720, 1620), (735, 1780), (545, 1780)], (0.42, 0.30, 0.26))          # bag put down
def s_hope(c, t):
    Z.balcony(c, t, her=dict(emo="smile", look=(0.6, 0.2), head_tilt=6), him=dict(emo="smile", look=(-0.6, 0.3), head_tilt=-4), hug=1.0)
    memory(c)
def s_good_moments(c, t):
    Z.park(c, t, xs=(450, 650), her=SL.lap_hands(dict(emo="smile", look=(0.4, 0.2), head_tilt=10, lean=4)),
           him=dict(emo="smile", look=(-0.5, 0.3), head_tilt=-6, skip_arms=("arm_l",), arm_r=(10, 60)))
    memory(c)
def s_empty_days(c, t):
    bg(c); text_c(c, "Oktober", 540, 470, 64, (1, 1, 1))
    lt = t - T["übersieht"]
    for i in range(5):
        for j in range(7):
            n = i * 7 + j
            if n >= 31: continue
            x, y = 210 + j * 110, 560 + i * 120
            u = ramp(lt, n * 0.04, 0.2)
            Z.rbox(c, x - 46, y - 46, 92, 92, 14, (0.30, 0.31, 0.40) if n not in (4, 19) else (0.85, 0.55, 0.58))
            if n in (4, 19):
                c.save(); c.translate(x, y + 4); V.heart(c, 0, 0, 20); c.set_source_rgb(1, 1, 1); c.fill(); c.restore()
            c.set_source_rgba(0, 0, 0, 0.5 * (1 - u)); c.rectangle(x - 48, y - 48, 96, 96); c.fill()
def s_quiet(c, t): sofa(c, t, her=dict(phone=1, sad=0.6), him=dict(phone=1))
def s_no_laugh(c, t):
    Z.counter_kitchen(c, t, her=dict(emo="neutral", look=(0.6, 0.3), arm_l=(8, 20), arm_r=(8, 20)),
                      him=dict(emo="happy", talk=0.5 + 0.4 * abs(math.sin(t * 9)), look=(-0.5, 0.1), arm_l=(30, -100), arm_r=(10, 20)))
def s_functions(c, t): Z.laundry(c, t, her=dict(emo="neutral", look=(0.5, 0.3), head_tilt=-4))
def s_outside(c, t): UI.building(c, t, T["Von außen"], T["aber innen"] + 0.5)
def s_alone(c, t): Z.bedroom(c, t, her=dict(emo="sad", look=(-0.6, 0.0), head_tilt=-6), him=dict(emo="closed", look=(0.8, 0), head_tilt=10))
def s_hourglass(c, t):
    bg(c); lt = t - T["Und je länger"]; u = ease(lt / 3.4)
    x, y = 540, 860
    c.move_to(x - 160, y - 300); c.line_to(x + 160, y - 300); c.line_to(x + 18, y); c.line_to(x + 160, y + 300); c.line_to(x - 160, y + 300); c.line_to(x - 18, y); c.close_path()
    c.set_source_rgba(0.85, 0.90, 1.0, 0.10); c.fill_preserve(); c.set_source_rgb(*OUTL); c.set_line_width(8); c.stroke()
    top = 0.85 * (1 - u); bot = 0.85 * u
    if top > 0.02:
        h = 300 * top; w = 18 + (160 - 18) * top
        c.move_to(x - w, y - h); c.line_to(x + w, y - h); c.line_to(x + 18, y); c.line_to(x - 18, y); c.close_path(); c.set_source_rgb(0.92, 0.74, 0.36); c.fill()
    h = 300 * bot; w = 160 - (160 - 18) * (1 - bot) * 0 if False else 160
    c.move_to(x - 160, y + 300); c.line_to(x + 160, y + 300); c.line_to(x + 160 - 142 * bot, y + 300 - h); c.line_to(x - 160 + 142 * bot, y + 300 - h); c.close_path()
    c.set_source_rgb(0.92, 0.74, 0.36); c.fill()
    if u < 1: c.set_source_rgb(0.92, 0.74, 0.36); c.rectangle(x - 4, y, 8, 300 - h); c.fill()
    Z.rect(c, x - 200, y - 330, 400, 30, Z.WOOD); Z.rect(c, x - 200, y + 300, 400, 30, Z.WOOD)
def s_moment(c, t): Z.bathroom(c, t, her=dict(emo="neutral", look=(0, -0.1)))
def s_dawn(c, t):
    Z.balcony(c, t, her=dict(emo="calm", look=(0.0, -0.4), arm_l=(6, 10), arm_r=(6, 10)), him=None)
    glow(c, 540, 1150, 700, (1.0, 0.70, 0.45), 0.35 * ramp(t, T["Die Jahre sind"], 2.0))
def s_quote(c, t):
    bg(c); glow(c, 540, 720, 460, (1.0, 0.80, 0.55), 0.15)
    text_c(c, "Sie gehen verloren,", 540, 690, 70, (1, 1, 1), ramp(t, T["Sie gehen verloren"]))
    text_c(c, "wenn sie bleibt.", 540, 790, 70, (1, 1, 1), ramp(t, T["Sie gehen verloren"] + 0.6))
def s_leaves(c, t):
    Z.hallway(c, t, her=dict(emo="neutral", look=(0.4, 0.0), arm_l=(8, 10), arm_r=(6, 10)), her_bag=True)
def s_door(c, t):
    bg(c); lt = t - T["an dem sie die Tür"]; u = ease(lt / 1.4)
    Z.rect(c, 290, 380, 500, 1100, (0.30, 0.25, 0.26))
    gap = 220 * (1 - u)
    if gap > 1:
        glow(c, 540 + 250 - gap / 2, 930, 300, (1.0, 0.85, 0.6), 0.5 * (1 - u))
        c.set_source_rgb(1.0, 0.88, 0.65); c.rectangle(790 - gap, 384, gap, 1092); c.fill()
    Z.rect(c, 290, 380, 500 - gap, 1100, (0.36, 0.30, 0.31))
    C2.ellipse(c, 740 - gap, 960, 16, 16); C2.finish(c, (0.85, 0.72, 0.45), 3)
def s_quiet_leave(c, t):
    Z.hallway(c, t, her=None)            # coats gone, hallway empty
def s_piece(c, t): Z.bedroom(c, t, her=None, him=dict(emo="closed", look=(0.8, 0), head_tilt=8))
def s_end(c, t): Z.bedroom(c, t, her=dict(emo="closed", look=(0, 0), head_tilt=-4), him=None)

WIDE = (540, 950, 1.0)
BED = (540, 1060, 1.25)
BED_HER = (330, 1000, 2.3)
CAR_HER = (330, 1000, 1.75)
SHOTS = [
    (0.0, s_hook, CAR_HER), (T["investiert"] + 0.3, s_bed_awake, BED), (T["desto schwerer"], s_door_hesitate, WIDE), (T["Selbst wenn"], s_mirror, (540, 1050, 1.1)),
    (T["In der Psychologie"], s_term, WIDE), (T["Sie denkt"], s_years, WIDE), (T["An die Abende"], s_waiting, VB.MED), (T["An all die"], s_forgave, (560, 1150, 1.15)),
    (T["Und ihr Kopf"], s_head, BED_HER), (T["Also bleibt"], s_stays, WIDE), (T["Sie hofft"], s_hope, (520, 1050, 1.15)), (T["Sie erinnert"], s_good_moments, (550, 1080, 1.35)),
    (T["übersieht"], s_empty_days, WIDE), (T["Sie wird stiller"], s_quiet, VB.MED), (T["Sie lacht"], s_no_laugh, WIDE), (T["Sie funktioniert"], s_functions, WIDE),
    (T["Von außen"], s_outside, WIDE), (T["aber innen"], s_alone, BED), (T["Und je länger"], s_hourglass, WIDE), (T["Doch irgendwann"], s_moment, (540, 1000, 1.25)),
    (T["Die Jahre sind"], s_dawn, (480, 1000, 1.3)), (T["Sie gehen verloren"], s_quote, WIDE), (T["Denn eine Frau"], s_leaves, WIDE),
    (T["an dem sie die Tür"], s_door, WIDE), (T["Sie geht leise"], s_quiet_leave, WIDE), (T["Stück für"], s_piece, BED), (T["Lange vorher"], s_end, BED_HER),
] if T else []

def frame(t):
    k = max(i for i, s in enumerate(SHOTS) if s[0] <= t)
    t0, fn, (cx, cy, z) = SHOTS[k]; t1 = SHOTS[k + 1][0] if k + 1 < len(SHOTS) else DUR
    s = cairo.ImageSurface(cairo.FORMAT_RGB24, W, H); c = cairo.Context(s)
    push = 0.10 if k == 0 else 0.05                    # the hook shot pushes in harder
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
