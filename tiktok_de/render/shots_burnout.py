"""09 'Je liebevoller sie war …' (Beziehungs-Burnout). Built with the vizavi_motion approach (see projects/09_burnout/storyboard.md):
moving camera in every shot, blurred foreground parallax, whip transitions with motion blur, kinetic typography, 30 fps,
music + SFX placed on the EVENTS below (see audio_burnout.py).

Render with:  SHOTS=shots_burnout python video_v5.py <alignment.csv> <out_dir> <worker> <n_workers> [--preview t1,...]
"""
import math
import video_shots as VB
import shots_tasse as UI
import shots_schlaf as SL
import shots_kosten as KO
import shots_common as SC
import sets2 as Z
import sets3 as Z3
import motion as M
import cine
import character2 as C2
import cairocffi as cairo
from storybook import glow

V = VB.V
A, SF, W, H = VB.A, VB.SF, V.W, V.H
FPS = 30
ease, ramp, t_of, DUR = V.ease, V.ramp, V.t_of, V.DUR
sofa, bg, text_c = VB.sofa, VB.bg, VB.text_c
SUB_Y = VB.SUB_Y
ROSE_RGB = (255, 255, 255)
hands_on_phone = VB.hands_on_phone

K = ["desto stiller", "wenn sie innerlich", "In der Psychologie", "Früher ist sie", "Heute hört", "Früher hat sie", "Heute schreibt",
     "Sie trägt", "Sie plant", "Sie hält", "und niemand", "Die Psychologin", "als körperliche", "Sie entsteht", "wenn die Liebe",
     "Also hört", "Nicht aus Bosheit", "Ihre Zärtlichkeit", "Sie ist nur", "dass jemand", "Und wenn er", "liegt die Antwort"]
try:
    T = {k: t_of(k) for k in K}
except AssertionError:
    T = None

def word(c, txt, x, y, size, col=(1, 1, 1), a=1.0):
    c.select_font_face("Inter", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD); c.set_font_size(size)
    w = c.text_extents(txt)[4]; c.move_to(x - w / 2, y); c.set_source_rgba(*col, a); c.show_text(txt); return w

# ---------------------------------------------------------------- shots
def s_hook(c, t): Z3.rainy_window(c, t, her=dict(emo="sad", look=(0.3, 0.2), head_tilt=-6))
def s_table(c, t):
    V.kitchen(c, cine_pen(), 22, 40, 0.5)
    A.woman(c, cine_pen(), 300, 780, 0.82, dict(phone=0, emo="neutral", look=(0.0, 0.6), tilt=-3, blink=V.blink(t, 3.0)))
    A.man(c, cine_pen(), 790, 760, 0.82, dict(phone=1))
    V.table(c, cine_pen(), plate=300)
def cine_pen():
    from storybook import Pen
    return Pen(3)
def s_candle(c, t): Z3.candle(c, t, 0.15 + 0.55 * ease((t - T["wenn sie innerlich"]) / 2.0))
def s_term(c, t):
    bg(c); lt = t - T["In der Psychologie"]
    glow(c, 540, 1300, 520, (1.0, 0.55, 0.25), 0.22)
    for j in range(36):                                   # sparks rising from below, the word is made of this fire
        u = (lt * (0.35 + 0.1 * (j % 4)) + j / 36) % 1
        x = 540 + ((j * 137) % 700 - 350) * (1 - 0.5 * u) + 30 * math.sin(lt * 2 + j)
        c.set_source_rgba(1.0, 0.65 + 0.2 * (j % 2), 0.3, 0.8 * (1 - u)); c.arc(x, 1500 - 900 * u, 4 + 3 * (j % 3), 0, 2 * math.pi); c.fill()
    word(c, "Beziehungs-", 540, 760, 96, (1, 1, 1), ramp(t, T["In der Psychologie"] + 1.0))
    c.select_font_face("Inter", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD); c.set_font_size(150)
    letters = "Burnout"; total = c.text_extents(letters)[4]; x = 540 - total / 2
    for i, ch in enumerate(letters):
        w = c.text_extents(ch)[4]
        appear = ramp(t, T["In der Psychologie"] + 1.8 + 0.06 * i, 0.2)
        cool = ease((lt - 2.7 - 0.12 * (len(letters) - i)) / 0.5)                   # embers die out right to left
        col = (1.0 - 0.45 * cool, 0.62 - 0.12 * cool, 0.30 + 0.20 * cool)
        if appear > 0:
            glow(c, x + w / 2, 900, 110, (1.0, 0.55, 0.2), 0.35 * appear * (1 - cool))
            c.move_to(x, 960 + 30 * (1 - appear)); c.set_source_rgba(*col, appear); c.show_text(ch)
            if cool > 0.2:                                                            # a little ash drifting up
                for j in range(2):
                    u = (lt * 0.8 + j * 0.5 + i * 0.13) % 1
                    c.set_source_rgba(0.7, 0.7, 0.75, 0.5 * (1 - u) * cool); c.arc(x + w / 2 + 20 * math.sin(i + j + lt), 880 - 160 * u, 5, 0, 2 * math.pi); c.fill()
        x += c.text_extents(ch)[4]
def s_ran(c, t):
    lt = t - T["Früher ist sie"]
    Z.hallway(c, t, her=None)
    u = ease(lt / 2.6)
    M.walk(c, "w", 540 - 60 * u, 1560 + 300 * u, 640 + 420 * u, lt * 8.0, dict(emo="happy", look=(0, 0), arm_l=(30 + 20 * u, 30), arm_r=(30 + 20 * u, 30)))
    KO.memory(c, 0.36)
def s_stays(c, t):
    lt = t - T["Heute hört"]
    du = ease((lt - 0.4) / 0.6)
    Z3.living_room(c, t, door_u=du, her=dict(emo="neutral", look=(0.1, 0.6), arm_l=(10, 60), arm_r=(10, 60)),
                   him_in=dict(emo="calm", look=(0.4, 0.2), arm_l=(6, 10), arm_r=(6, 10)) if du > 0.5 else None)
def s_hearts(c, t):
    t0 = T["Früher hat sie"]
    Z3.chat_phone(c, t, [("Ich vermisse dich", True, True), ("Bis gleich, Liebling", True, True), ("Freu mich auf dich", True, True)],
                  [t0 + 0.2, t0 + 1.0, t0 + 1.8])
    KO.memory(c, 0.30)
def s_milk(c, t):
    t0 = T["Heute schreibt"]
    Z3.chat_phone(c, t, [("Brauchen Milch.", True, False)], [t0 + 1.2])
def s_bags(c, t):
    lt = t - T["Sie trägt"]; u = lt / 2.0
    M.street(c, t, cam_x=200 * lt, rain=0.7)
    hands = M.walk(c, "w", 560 - 40 * u, 1420 + 200 * u, 700 + 240 * u, lt * 6.0, dict(emo="sad", look=(0, 0.3), arm_l=(10, 8), arm_r=(10, 8)), swing=0.3)
    for key, col in (("arm_l", (0.85, 0.82, 0.74)), ("arm_r", (0.78, 0.72, 0.62))):
        (hx, hy), _ = hands[key]; s = (700 + 240 * u) / 1000
        Z.box(c, [(hx - 60 * s, hy + 10 * s), (hx + 60 * s, hy + 10 * s), (hx + 70 * s, hy + 180 * s), (hx - 70 * s, hy + 180 * s)], col)
def s_calendar(c, t):
    Z3.wall_calendar(c, t, T["Sie plant"] + 0.2, [(2, "Zahnarzt"), (5, "Eltern-"), (9, "Kita"), (13, "Oma 80"), (15, "Arzt"), (20, "Bank"), (23, "Fest"), (26, "Reifen")])
def s_house(c, t): Z3.dollhouse(c, t, ease((t - T["Sie hält"]) / 1.5))
def s_self_hug(c, t):
    Z.balcony(c, t, her=Z.arms_crossed(dict(emo="sad", look=(0.0, 0.3), head_tilt=-6)), him=None)
def s_pines(c, t):
    bg(c); glow(c, 540, 700, 420, (1.0, 0.85, 0.6), 0.12)
    lt = t - T["Die Psychologin"]
    word(c, "Psychologin", 540, 560, 44, (0.85, 0.86, 0.92), ramp(t, T["Die Psychologin"] + 0.2))
    c.save(); c.rectangle(0, 0, 140 + 900 * ease((lt - 0.6) / 1.2), H); c.clip()               # the name writes itself left to right
    word(c, "Ayala Pines", 540, 690, 110, (1, 1, 1)); c.restore()
    c.set_source_rgba(0.95, 0.80, 0.50, 0.9); c.set_line_width(6); c.move_to(240, 730); c.line_to(240 + 600 * ease((lt - 1.6) / 0.8), 730); c.stroke()
def s_heavy(c, t):
    bg(c); lt = t - T["als körperliche"]
    for k, (txt, size) in enumerate((("körperliche", 76), ("und emotionale", 76), ("Erschöpfung", 112))):
        t0 = 0.0 + 0.9 * k
        u = lt - t0
        if u < 0: continue
        drop = 1 - ease(u / 0.3); sag = 14 * math.exp(-u * 4) * math.sin(u * 18) + (16 if k == 2 else 5) * ease(u / 1.5)
        word(c, txt, 540, 560 + k * 160 - 40 * drop + sag, size, (1, 1, 1) if k < 2 else (0.95, 0.80, 0.55), 1 - drop)
def s_years(c, t):
    bg(c); lt = t - T["Sie entsteht"]
    k = min(17, int(lt / 0.09)); yr = 2008 + k
    for j in range(3, 0, -1): Z.rect(c, 330 + j * 10, 520 + j * 10, 420, 470, (0.82, 0.80, 0.76))
    Z.rect(c, 330, 520, 420, 470, (0.96, 0.95, 0.92))
    c.set_source_rgb(0.79, 0.54, 0.57); c.rectangle(330, 520, 420, 100); c.fill()
    word(c, "JAHRE", 540, 588, 46, (1, 1, 1)); word(c, str(yr), 540, 860, 150, (0.15, 0.15, 0.2))
def s_balance(c, t): Z3.balance(c, t, ease((t - T["wenn die Liebe"] - 0.6) / 1.4))
def s_stops(c, t):
    Z.stairs(c, t, her=dict(emo="sad", look=(0.2, 0.5), head_tilt=6))
    mx, my = 760, 1290
    Z.box(c, [(mx - 40, my - 90), (mx + 40, my - 90), (mx + 36, my), (mx - 36, my)], (0.93, 0.90, 0.84))
def s_out(c, t):
    lt = t - T["Nicht aus Bosheit"]
    out = lt > 1.4
    Z3.candle(c, t, 0.82, lit=not out, smoke=ease((lt - 1.4) / 0.4) if out else 0.0)
def s_alley(c, t):
    lt = t - T["Ihre Zärtlichkeit"]; u = lt / 2.5
    Z3.alley(c, t, cam_x=60 * lt)
    M.walk(c, "w", 540, 1180 + 380 * u, 420 + 420 * u, lt * 5.0, dict(emo="neutral", look=(0, 0.4), arm_l=(8, 10), arm_r=(8, 10)), swing=0.6)
def s_station(c, t):
    lt = t - T["Sie ist nur"]
    Z3.platform(c, t, train_u=ease((lt - 0.4) / 1.6))
    Z.sit(c, "w", 540, 1360, 820, dict(emo="sad", look=(0.0, 0.2), head_tilt=-4, arm_l=(8, 70), arm_r=(8, 70), fore_k=0.7))
def s_notice(c, t):
    u = ease((t - T["dass jemand"] - 0.3) / 0.6)
    sofa(c, t, lamp=0.8, her=dict(phone=0, emo="neutral", look=(-0.2, 0.6), tilt=-3),
         him=dict(phone=1 - u, emo="worried" if u > 0.5 else "neutral", look=(-0.9 * u, 0.9 * (1 - u)), tilt=-5 * u))
def s_he_wonders(c, t): Z.counter_kitchen(c, t, her=None, him=dict(emo="sad", look=(-0.6, -0.2), head_tilt=-4, arm_l=(8, 20), arm_r=(8, 20)))
def s_end(c, t):
    lt = t - T["liegt die Antwort"]
    Z3.rainy_window(c, t, her=dict(emo="closed" if lt > 2.0 else "sad", look=(0.2, 0.2), head_tilt=-8))

# camera: (cx, cy, zoom, rot)
SHOTS = [
    (0.0, s_hook, (540, 1080, 2.1, -1.5), (540, 1050, 2.35, 0.5), dict(fg="drops", dof=8)),
    (T["desto stiller"], s_table, (420, 900, 1.25, 0), (620, 900, 1.3, 0), dict(fg="lamp", dof=14)),
    (T["wenn sie innerlich"], s_candle, (540, 1000, 1.0, 0), (540, 980, 1.25, 1.0), {}),
    (T["In der Psychologie"], s_term, (540, 880, 1.0, -1.5), (540, 880, 1.06, 1.5), dict(whip=True)),
    (T["Früher ist sie"], s_ran, (540, 1250, 1.2, 0), (520, 1350, 1.35, -1.0), dict(fg="frame", dof=12, whip=True)),
    (T["Heute hört"], s_stays, (520, 1100, 1.15, 0), (560, 1180, 1.3, 0), dict(fg="plant", dof=12)),
    (T["Früher hat sie"], s_hearts, (540, 900, 1.0, -1.0), (540, 880, 1.1, 0.5), {}),
    (T["Heute schreibt"], s_milk, (540, 880, 1.15, 0.5), (540, 900, 1.0, -0.5), {}),
    (T["Sie trägt"], s_bags, (540, 1250, 1.15, 0), (560, 1300, 1.25, 1.0), dict(fg="drops", dof=10, whip=True)),
    (T["Sie plant"], s_calendar, (540, 860, 1.05, 1.0), (540, 860, 1.2, -0.5), {}),
    (T["Sie hält"], s_house, (540, 820, 1.6, 0), (540, 830, 1.0, 0), {}),
    (T["und niemand"], s_self_hug, (420, 1100, 1.5, -2.0), (560, 1050, 1.35, 2.0), dict(fg="rail", dof=8)),
    (T["Die Psychologin"], s_pines, (540, 700, 1.0, 0), (540, 700, 1.08, 0), dict(whip=True)),
    (T["als körperliche"], s_heavy, (540, 820, 1.0, 0), (540, 830, 1.05, 0.6), {}),
    (T["Sie entsteht"], s_years, (540, 760, 1.0, 0), (540, 760, 1.15, 0), {}),
    (T["wenn die Liebe"], s_balance, (540, 950, 1.1, 2.0), (540, 950, 1.0, -1.0), {}),
    (T["Also hört"], s_stops, (560, 1200, 1.1, 0), (520, 1160, 1.3, 0), {}),
    (T["Nicht aus Bosheit"], s_out, (540, 900, 1.1, 0), (540, 880, 1.3, 0), {}),
    (T["Ihre Zärtlichkeit"], s_alley, (540, 1200, 1.1, 0), (540, 1350, 1.25, 0), dict(fg="leaves", dof=6, whip=True)),
    (T["Sie ist nur"], s_station, (380, 1100, 1.2, 0), (700, 1100, 1.25, 0), {}),
    (T["dass jemand"], s_notice, (700, 900, 1.6, 0), (760, 880, 1.9, 0), dict(fg="lamp", dof=14)),
    (T["Und wenn er"], s_he_wonders, (770, 980, 1.9, 0), (770, 1000, 1.4, 0), {}),
    (T["liegt die Antwort"], s_end, (540, 1050, 2.4, 0.5), (540, 1050, 1.6, -1.0), dict(fg="drops", dof=8)),
] if T else []

# sound events (time, kind) for audio_burnout.py; accents = cuts that get a piano note
def events():
    ev = [(0.0, "rain_start")]
    for k in range(int(2.6 * 8.0 / math.pi) + 1): ev.append((T["Früher ist sie"] + k * math.pi / 8.0, "step_light"))
    ev += [(T["Heute hört"] + 0.25, "keys"), (T["Heute hört"] + 0.4, "door")]
    ev += [(T["Früher hat sie"] + d, "ping") for d in (0.2, 1.0, 1.8)] + [(T["Heute schreibt"] + 1.2, "ping_dry")]
    ev += [(T["Sie trägt"], "rain_start")] + [(T["Sie trägt"] + k * math.pi / 6.0, "step") for k in range(int(2.0 * 6.0 / math.pi) + 1)]
    ev += [(T["Sie plant"] + 0.2 + 0.12 * k, "tick") for k in range(8)]
    ev += [(T["als körperliche"] + 0.9 * k + 0.3, "thud") for k in range(3)]
    ev += [(T["Also hört"] + 0.3, "cup")]
    ev += [(T["Nicht aus Bosheit"] + 1.4, "blow")]
    ev += [(T["Ihre Zärtlichkeit"] + k * math.pi / 5.0, "step_leaves") for k in range(int(2.5 * 5.0 / math.pi) + 1)]
    ev += [(T["Sie ist nur"] + 0.4, "train")]
    ev += [(T["liegt die Antwort"], "rain_start")]
    ev += [(SHOTS[k][0], "whoosh") for k in range(1, len(SHOTS)) if SHOTS[k][4].get("whip")]
    return ev
ACCENTS = (["wenn sie innerlich", "In der Psychologie", "Heute hört", "Heute schreibt", "Sie hält", "Die Psychologin", "wenn die Liebe",
            "Nicht aus Bosheit", "dass jemand", "liegt die Antwort"])

frame = cine.make_frame(SHOTS, DUR, SF, V, FPS, SUB_Y) if T else None
