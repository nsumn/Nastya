"""10 'Je öfter eine Frau erlebt, dass ihre Worte nichts ändern …' (erlernte Hilflosigkeit). Storyboard: projects/10_hilflos/storyboard.md.
Same look and machinery as 09 (cine.py camera moves, blurred foreground, whip pushes, music + SFX from audio_hilflos.py).

Render with:  SHOTS=shots_hilflos python video_v5.py <alignment.csv> <out_dir> <worker> <n_workers> [--preview t1,...]
"""
import math
import video_shots as VB
import shots_tasse as UI
import shots_schlaf as SL
import shots_kosten as KO
import shots_common as CO
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


K = ["dass ihre Worte", "desto seltener", "In der Psychologie", "Am Anfang", "Sie bittet", "Sie schreibt", "Sie wartet", "Doch jedes Mal",
     "Er nickt", "Vielleicht meint", "Und nach einer Woche", "Irgendwann lernt", "Der Psychologe", "Wer immer wieder", "Selbst dann",
     "Also wird sie", "Sie räumt", "Sie entscheidet", "Ihren Kummer", "Von außen", "Doch es ist kein", "Es ist Aufgeben",
     "Eine Frau, die nicht", "Sie hat nur"]
try:
    T = {k: t_of(k) for k in K}
except AssertionError:
    T = None

def word(c, txt, x, y, size, col=(1, 1, 1), a=1.0):
    c.select_font_face("Inter", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD); c.set_font_size(size)
    w = c.text_extents(txt)[4]; c.move_to(x - w / 2, y); c.set_source_rgba(*col, a); c.show_text(txt); return w
def cine_pen():
    from storybook import Pen
    return Pen(3)
def talk(t, f=9): return 0.45 + 0.45 * abs(math.sin(t * f))

# ---------------------------------------------------------------- shots
def s_hook(c, t):            # close face: she starts to say something … and closes her mouth again
    Z3.rainy_window(c, t, her=dict(emo="worried", look=(0.3, 0.2), head_tilt=-6, talk=0.35 * talk(t) if 0.3 < t < 0.8 else 0.0))
def s_sofa_talk(c, t):       # she talks, he scrolls; her speech bubble shrinks away unanswered
    lt = t - T["dass ihre Worte"]
    sofa(c, t, lamp=0.8, her=dict(phone=0, emo="worried", look=(0.6, 0.0), tilt=3, talk=talk(t) if lt < 1.0 else 0.0),
         him=dict(phone=1, emo="neutral", look=(0.0, 0.9)))
    UI.bubble(c, 330, 560, "Können wir\nreden?", 50, ease(lt / 0.25) * (1 - 0.6 * ease((lt - 1.0) / 0.8)))
def s_shrink(c, t):          # her questions get shorter and smaller
    bg(c); lt = t - T["desto seltener"]
    for k, (txt, size) in enumerate((("Hast du heute Abend\nkurz Zeit?", 58), ("Können wir reden?", 52), ("Du, wegen …", 46), ("…", 42))):
        u = ease((lt - 0.45 * k) / 0.25)
        UI.bubble(c, 540 + (k % 2) * 80 - 40, 500 + 240 * k, txt, size, u * (1 - 0.15 * k))
def s_term(c, t):            # 'Hilflosigkeit' — the letters lose their footing and sag one by one
    bg(c); lt = t - T["In der Psychologie"]
    glow(c, 540, 860, 520, (0.75, 0.80, 1.0), 0.12)
    word(c, "erlernte", 540, 720, 84, (0.85, 0.86, 0.92), ramp(t, T["In der Psychologie"] + 1.0))
    c.select_font_face("Inter", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD); c.set_font_size(128)
    letters = "Hilflosigkeit"; total = c.text_extents(letters)[4]; x = 540 - total / 2
    for i, ch in enumerate(letters):
        w = c.text_extents(ch)[4]
        appear = ramp(t, T["In der Psychologie"] + 1.6 + 0.04 * i, 0.18)
        sag = ease((lt - 2.6 - 0.07 * i) / 0.6)                              # each letter slumps down a little, then stays
        wob = 6 * math.exp(-max(0, lt - 2.6 - 0.07 * i) * 5) * math.sin((lt - 0.07 * i) * 20) if sag > 0 else 0
        if appear > 0:
            c.save(); c.translate(x + w / 2, 900 + 30 * (1 - appear) + 34 * sag + wob); c.rotate(math.radians((i % 3 - 1) * 7 * sag))
            c.move_to(-w / 2, 0); c.set_source_rgba(1, 1 - 0.1 * sag, 1 - 0.05 * sag, appear * (1 - 0.35 * sag)); c.show_text(ch); c.restore()
        x += w
def s_explain(c, t):         # kitchen: she explains with her hands, he half listens
    g = math.sin(t * 5.0)
    Z.counter_kitchen(c, t, her=dict(emo="worried", talk=talk(t), look=(0.7, 0.0), arm_r=(30 + 10 * g, -70 - 15 * g), arm_l=(12, 40)),
                      him=dict(emo="neutral", look=(-0.2, 0.6), arm_l=(8, 20), arm_r=(8, 20)))
def s_ask(c, t):             # hallway: she reaches out to him, he is already at the door
    lt = t - T["Sie bittet"]
    Z.hallway(c, t, her=dict(emo="sad", look=(0.8, 0.0), arm_r=(40 + 15 * ease(lt / 0.6), -30), arm_l=(8, 10), talk=talk(t) if lt < 0.6 else 0),
              him=dict(emo="neutral", look=(0.6, 0.3), arm_l=(6, 8), arm_r=(6, 8)))
def s_long(c, t):            # her long messages pile up
    t0 = T["Sie schreibt"]
    Z3.chat_phone(c, t, [("Mir ist das wichtig.", True, False), ("Ich fühle mich allein.", True, False), ("Können wir reden?", True, False),
                         ("Bitte. Nur 10 Minuten.", True, False)], [t0 + 0.1, t0 + 0.5, t0 + 0.9, t0 + 1.3])
def s_wait(c, t): Z3.candle(c, t, 0.15 + 0.4 * ease((t - T["Sie wartet"]) / 2.2))
def s_slot(c, t): CO.slot_machine(c, t, T["Doch jedes Mal"])
def s_nod(c, t):             # he nods at the phone: 'Mach ich.'
    lt = t - T["Er nickt"]
    nod = 6 * math.sin(lt * 9) * math.exp(-max(0, lt - 0.6) * 2)
    sofa(c, t, lamp=0.8, her=dict(phone=0, emo="neutral", look=(0.7, 0.1), tilt=3), him=dict(phone=1, emo="calm", look=(0.0, 0.8), tilt=nod))
    UI.bubble(c, 760, 560, "Mach ich.", 52, ease((lt - 0.9) / 0.25), tail=(1, 1))
def s_reply(c, t):           # the same short promise in the chat
    t0 = T["Vielleicht meint"]
    Z3.chat_phone(c, t, [("Können wir reden?", True, False), ("Ja klar. Morgen.", False, False)], [t0 - 5, t0 + 0.3])
def s_week(c, t):            # a week goes by: 'reden?' written on every Sunday
    Z3.wall_calendar(c, t, T["Und nach einer Woche"] + 0.1, [(4, "reden?"), (11, "reden?"), (18, "reden?"), (25, "reden?")])
def s_rule(c, t):            # the rule card (yellow tag, overlay) over her sitting on the bed edge in the dark
    Z.bedroom(c, t, her=dict(emo="sad", look=(0.0, 0.4), head_tilt=-6), him=None, lamp=0.5)
def s_seligman(c, t):
    bg(c); glow(c, 540, 700, 420, (1.0, 0.85, 0.6), 0.12)
    lt = t - T["Der Psychologe"]
    word(c, "Psychologe", 540, 560, 44, (0.85, 0.86, 0.92), ramp(t, T["Der Psychologe"] + 0.2))
    c.save(); c.rectangle(0, 0, 120 + 900 * ease((lt - 0.5) / 1.1), H); c.clip()
    word(c, "Martin Seligman", 540, 690, 100, (1, 1, 1)); c.restore()
    c.set_source_rgba(0.95, 0.80, 0.50, 0.9); c.set_line_width(6); c.move_to(200, 730); c.line_to(200 + 680 * ease((lt - 1.4) / 0.8), 730); c.stroke()
    word(c, "1967", 540, 820, 46, (0.85, 0.86, 0.92), ramp(t, T["Der Psychologe"] + 1.6))
def s_stairs(c, t):          # she stops trying: sits down on the stairs
    Z.stairs(c, t, her=dict(emo="sad", look=(0.2, 0.5), head_tilt=6))
def s_door(c, t):            # the door is open, light falls in — she doesn't get up
    lt = t - T["Selbst dann"]
    Z3.living_room(c, t, door_u=ease((lt - 0.2) / 0.8), her=dict(emo="neutral", look=(-0.2, 0.6), arm_l=(10, 60), arm_r=(10, 60)), him_in=None)
def s_quiet(c, t): Z.bathroom(c, t, her=dict(emo="neutral", look=(0.0, 0.2), head_tilt=-3))
def s_tidy(c, t): Z.laundry(c, t, her=dict(emo="neutral", look=(0.3, 0.3)), basket_hold=True)
def s_alone(c, t): Z.office(c, t, her=dict(emo="neutral", look=(0.2, 0.5)), laptop=1.0)
def s_friend(c, t):          # on the balcony she finally talks — to her friend on the phone
    Z.balcony(c, t, her=dict(emo="sad", talk=talk(t, 7), look=(0.4, 0.1), arm_r=(20, 150), arm_l=(10, 60)), him=None)
def s_house(c, t): Z3.dollhouse(c, t, ease((t - T["Von außen"]) / 1.5))
def s_car(c, t): Z.car(c, t, her=dict(emo="sad", look=(0.0, 0.3), head_tilt=-5), him=None)
def s_typing(c, t):          # she types … and deletes; the typing dots vanish
    lt = t - T["Es ist Aufgeben"]
    Z3.chat_phone(c, t, [("Können wir reden?", True, False), ("Ja klar. Morgen.", False, False)], [-10, -10])
    a = 1 - ease((lt - 1.0) / 0.5)
    if a > 0:
        Z.rbox(c, 530, 930, 220, 96, 34, (0.79, 0.54, 0.57), 2)
        for k in range(3):
            c.set_source_rgba(1, 1, 1, a * (0.5 + 0.5 * abs(math.sin(lt * 6 - k * 0.7)))); c.arc(590 + k * 50, 978, 12, 0, 2 * math.pi); c.fill()
def s_tear(c, t): Z3.rainy_window(c, t, her=dict(emo="cry", look=(0.3, 0.1), head_tilt=-8))
def s_end(c, t):             # rhyme with shot 2: same sofa, but she no longer turns to him
    sofa(c, t, lamp=0.7, her=dict(phone=0, emo="sad", look=(-0.9, 0.1), tilt=-4), him=dict(phone=1, emo="neutral", look=(0.0, 0.9)))

def overlays(im, t):
    if T and T["Irgendwann lernt"] <= t < T["Der Psychologe"]:
        UI.rule_tag(im, 1, "Es bringt nichts.", ramp(t, T["Irgendwann lernt"] + 1.2, 0.25), y=420)

# camera: (cx, cy, zoom, rot)
SHOTS = [
    (0.0, s_hook, (540, 1080, 2.1, -1.5), (540, 1050, 2.4, 0.5), dict(fg="drops", dof=8)),
    (T["dass ihre Worte"], s_sofa_talk, (420, 900, 1.25, 0), (560, 900, 1.3, 0), dict(fg="lamp", dof=14)),
    (T["desto seltener"], s_shrink, (540, 880, 1.0, -1.0), (540, 900, 1.08, 1.0), {}),
    (T["In der Psychologie"], s_term, (540, 860, 1.0, -1.5), (540, 860, 1.06, 1.5), dict(whip=True)),
    (T["Am Anfang"], s_explain, (500, 1100, 1.2, 0), (560, 1080, 1.32, 0.5), dict(fg="plant", dof=12, whip=True)),
    (T["Sie bittet"], s_ask, (540, 1150, 1.15, 0), (520, 1120, 1.3, -0.5), dict(fg="frame", dof=12)),
    (T["Sie schreibt"], s_long, (540, 920, 1.0, -1.0), (540, 880, 1.12, 0.5), {}),
    (T["Sie wartet"], s_wait, (540, 1000, 1.0, 0), (540, 980, 1.25, 1.0), {}),
    (T["Doch jedes Mal"], s_slot, (540, 860, 1.05, 1.0), (540, 850, 1.15, -0.5), dict(whip=True)),
    (T["Er nickt"], s_nod, (700, 900, 1.5, 0), (760, 880, 1.7, 0), dict(fg="lamp", dof=14)),
    (T["Vielleicht meint"], s_reply, (540, 880, 1.15, 0.5), (540, 900, 1.0, -0.5), {}),
    (T["Und nach einer Woche"], s_week, (540, 860, 1.05, 1.0), (540, 860, 1.2, -0.5), {}),
    (T["Irgendwann lernt"], s_rule, (540, 1250, 1.25, 0), (540, 1250, 1.4, 0), {}),
    (T["Der Psychologe"], s_seligman, (540, 700, 1.0, 0), (540, 700, 1.08, 0), dict(whip=True)),
    (T["Wer immer wieder"], s_stairs, (560, 1200, 1.1, 0), (520, 1160, 1.3, 0), {}),
    (T["Selbst dann"], s_door, (520, 1100, 1.15, 0), (560, 1180, 1.3, 0), dict(fg="plant", dof=12)),
    (T["Also wird sie"], s_quiet, (540, 1050, 1.2, 0), (540, 1020, 1.35, 0.5), dict(whip=True)),
    (T["Sie räumt"], s_tidy, (420, 1150, 1.15, 0), (380, 1120, 1.3, 0), {}),
    (T["Sie entscheidet"], s_alone, (540, 1100, 1.15, 0), (540, 1080, 1.3, 0), {}),
    (T["Ihren Kummer"], s_friend, (420, 1100, 1.5, -2.0), (520, 1050, 1.35, 2.0), dict(fg="rail", dof=8)),
    (T["Von außen"], s_house, (540, 820, 1.6, 0), (540, 830, 1.0, 0), {}),
    (T["Doch es ist kein"], s_car, (540, 1050, 1.3, 0), (540, 1030, 1.45, 0), dict(fg="drops", dof=10)),
    (T["Es ist Aufgeben"], s_typing, (560, 860, 1.35, 0), (560, 880, 1.2, 0), {}),
    (T["Eine Frau, die nicht"], s_tear, (540, 1050, 2.4, 0.5), (540, 1050, 2.0, -0.5), dict(fg="drops", dof=8)),
    (T["Sie hat nur"], s_end, (620, 900, 1.6, 0), (560, 920, 1.15, 0), dict(fg="lamp", dof=14)),
] if T else []

# sound events (time, kind) for audio_hilflos.py; accents = cuts that get a piano note
def events():
    ev = [(0.0, "rain_start")]
    ev += [(T["desto seltener"] + 0.45 * k, "ping") for k in range(4)]
    ev += [(T["Sie schreibt"] + d, "ping") for d in (0.1, 0.5, 0.9, 1.3)]
    ev += [(T["Sie wartet"] + 0.3 * k, "tick") for k in range(6)]
    ev += [(T["Vielleicht meint"] + 0.3, "ping_dry")]
    ev += [(T["Und nach einer Woche"] + 0.1 + 0.12 * k, "tick") for k in range(4)]
    ev += [(T["Irgendwann lernt"] + 1.2, "thud")]
    ev += [(T["Wer immer wieder"] + k * 0.45, "step") for k in range(3)]
    ev += [(T["Selbst dann"] + 0.2, "door")]
    ev += [(T["Doch es ist kein"], "rain_start")]
    ev += [(T["Eine Frau, die nicht"], "rain_start")]
    ev += [(SHOTS[k][0], "whoosh") for k in range(1, len(SHOTS)) if SHOTS[k][4].get("whip")]
    return ev
ACCENTS = ["In der Psychologie", "Doch jedes Mal", "Irgendwann lernt", "Der Psychologe", "Selbst dann", "Von außen", "Es ist Aufgeben", "Sie hat nur"]

frame = cine.make_frame(SHOTS, DUR, SF, V, FPS, SUB_Y, overlays=overlays) if T else None
