"""'Je unberechenbarer er zwischen Wärme und Kälte wechselt' (intermittent reinforcement). liebe.beziehung structure.

Render with:  SHOTS=shots_waerme python video_v5.py <alignment.csv> <out_dir> <worker> <n_workers> [--preview t1,...]
"""
import math
import video_shots as VB
import shots_tasse as UI
import shots_schlaf as SL
import shots_kosten as KO
import shots_common as SC
import sets2 as Z
from storybook import glow

V = VB.V
ease, ramp, t_of, DUR = V.ease, V.ramp, V.t_of, V.DUR
A, SF, W, H, FPS = VB.A, VB.SF, V.W, V.H, V.FPS
sofa, bg, text_c = VB.sofa, VB.bg, VB.text_c
SUB_Y = VB.SUB_Y
ROSE_RGB = (255, 255, 255)
hands_on_phone = VB.hands_on_phone

K = ["desto schwerer", "In der Psychologie", "Heute schreibt", "Morgen antwortet", "Am Wochenende", "Am Montag", "Und genau diese",
     "Ihr Gehirn", "wie bei einem", "Jede kleine", "Sie fängt an", "Sie ist leiser", "Sie fragt nicht", "Sie verwechselt", "Von außen",
     "Doch es ist keine", "Es ist ein Mechanismus", "Echte Liebe", "Sie fühlt sich an wie", "Und eine Frau", "dass sie nie"]
try:
    T = {k: t_of(k) for k in K}
except AssertionError:
    T = None

def s_hook(c, t): Z.stairs(c, t, her=dict(emo="cry", look=(0.2, 0.3), head_tilt=6))
def s_hesitate(c, t): Z.hallway(c, t, her=dict(emo="worried", look=(0.8 * math.sin(t * 1.4), 0.1), arm_l=(8, 10), arm_r=(6, 10)), her_bag=True)
def s_term(c, t):
    SC.term_card(c, t, T["In der Psychologie"] + 1.0, "Intermittierende", "Verstärkung")
    hot = int((t - T["In der Psychologie"]) * 2.5) % 2 == 0
    glow(c, 540, 930, 220, (1.0, 0.75, 0.4) if hot else (0.6, 0.8, 1.0), 0.6)
    text_c(c, "warm" if hot else "kalt", 540, 950, 64, (1.0, 0.85, 0.6) if hot else (0.75, 0.88, 1.0))
def s_sweet_msgs(c, t):
    SC.lock_screen(c, t, [("Jonas", "Du fehlst mir.", (0.58, 0.69, 0.59)), ("Jonas", "Ich denk an dich.", (0.58, 0.69, 0.59))],
                   [T["Heute schreibt"] + 0.3, T["Heute schreibt"] + 1.2], "12:40")
def s_no_answer(c, t): SC.lock_screen(c, t, [], [], "23:48", "Keine neuen Mitteilungen")
def s_weekend(c, t): Z.balcony(c, t, her=dict(emo="smile", look=(0.6, 0.2), head_tilt=6), him=dict(emo="smile", look=(-0.6, 0.3), head_tilt=-4), hug=1.0)
def s_monday(c, t): Z.counter_kitchen(c, t, her=dict(emo="worried", look=(0.8, 0.1), arm_l=(8, 20), arm_r=(8, 20)), him=Z.arms_crossed(dict(emo="neutral", look=(0.4, 0.6))))
def s_holds(c, t): Z.bedroom(c, t, her=dict(emo="worried", look=(0.0, -0.7)), him=dict(emo="closed", look=(0.8, 0), head_tilt=8))
def s_slot(c, t): SC.slot_machine(c, t, T["Ihr Gehirn"])
def s_small(c, t): sofa(c, t, lamp=0.9, her=dict(phone=0, emo="smile", look=(0.8, 0.1), tilt=5), him=dict(phone=0, emo="smile", look=(-0.8, 0.1), tilt=-4),
                         heart_glow=ramp(t, T["Jede kleine"] + 0.3, 0.8))
def s_adapt(c, t): Z.laundry(c, t, her=dict(emo="neutral", look=(0.5, 0.3), head_tilt=-4))
def s_quiet(c, t): Z.counter_kitchen(c, t, her=dict(emo="neutral", look=(0.6, 0.4), arm_l=(8, 20), arm_r=(8, 20)), him=dict(emo="neutral", look=(-0.2, 0.6), arm_l=(8, 20), arm_r=(8, 20)))
def s_no_ask(c, t): Z.car(c, t, her=SL.lap_hands(dict(emo="worried", look=(0.8, 0.1))), him=SL.drive_pose(dict(emo="neutral", look=(0, 0))))
def s_confuse(c, t): SC.term_card(c, t, T["Sie verwechselt"] + 0.4, "Anspannung ≠ Liebe")
def s_outside(c, t): UI.building(c, t, T["Von außen"], T["Doch es ist keine"] + 0.5)
def s_mirror(c, t): Z.bathroom(c, t, her=dict(emo="neutral", look=(0, -0.1)))
def s_mechanism(c, t): SC.slot_machine(c, t, T["Es ist ein Mechanismus"])
def s_waiting(c, t): KO.s_waiting(c, t)
def s_calm(c, t): sofa(c, t, lamp=1.0, lean=1.0, her=dict(phone=0, emo="closed", tilt=10), him=dict(phone=0, emo="calm", look=(-0.6, 0.6), tilt=-5))
def s_dawn(c, t):
    Z.balcony(c, t, her=dict(emo="calm", look=(0.0, -0.4), arm_l=(6, 10), arm_r=(6, 10)), him=None)
    glow(c, 540, 1150, 700, (1.0, 0.70, 0.45), 0.35 * ramp(t, T["Und eine Frau"], 2.0))
def s_end(c, t): Z.bedroom(c, t, her=dict(emo="smile", look=(0, 0), head_tilt=-4, blink=True), him=None)

WIDE = (540, 950, 1.0); BED = (540, 1060, 1.25); BED_HER = (330, 1000, 2.3)
SHOTS = [
    (0.0, s_hook, (470, 1120, 2.0)), (T["desto schwerer"], s_hesitate, WIDE), (T["In der Psychologie"], s_term, WIDE),
    (T["Heute schreibt"], s_sweet_msgs, WIDE), (T["Morgen antwortet"], s_no_answer, WIDE), (T["Am Wochenende"], s_weekend, (520, 1050, 1.15)),
    (T["Am Montag"], s_monday, WIDE), (T["Und genau diese"], s_holds, BED), (T["Ihr Gehirn"], s_slot, WIDE), (T["Jede kleine"], s_small, VB.MED),
    (T["Sie fängt an"], s_adapt, WIDE), (T["Sie ist leiser"], s_quiet, WIDE), (T["Sie fragt nicht"], s_no_ask, (540, 1040, 1.15)),
    (T["Sie verwechselt"], s_confuse, WIDE), (T["Von außen"], s_outside, WIDE), (T["Doch es ist keine"], s_mirror, (540, 1000, 1.25)),
    (T["Es ist ein Mechanismus"], s_mechanism, (540, 860, 1.15)), (T["Echte Liebe"], s_waiting, VB.MED), (T["Sie fühlt sich an wie"], s_calm, VB.FACES),
    (T["Und eine Frau"], s_dawn, (480, 1000, 1.3)), (T["dass sie nie"], s_end, BED_HER),
] if T else []
frame = SC.make_frame(SHOTS)
