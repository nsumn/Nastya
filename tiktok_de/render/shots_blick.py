"""'Sie geht wegen vieler kleiner Blicke' (contempt, Gottman). liebe.beziehung structure.

Render with:  SHOTS=shots_blick python video_v5.py <alignment.csv> <out_dir> <worker> <n_workers> [--preview t1,...]
"""
import math
import video_shots as VB
import shots_tasse as UI
import shots_schlaf as SL
import shots_common as SC
import sets2 as Z
import character2 as C2
from storybook import glow

V, A = VB.V, VB.A
ease, ramp, t_of, DUR = V.ease, V.ramp, V.t_of, V.DUR
A, SF, W, H, FPS = VB.A, VB.SF, V.W, V.H, V.FPS
sofa, bg, text_c, kitchen_both = VB.sofa, VB.bg, VB.text_c, VB.kitchen_both
SUB_Y = VB.SUB_Y
ROSE_RGB = (255, 255, 255)
hands_on_phone = VB.hands_on_phone

K = ["Sie geht wegen", "In der Paarforschung", "Laut John Gottman", "Es beginnt", "Ein Augenrollen", "Ein spöttisches", "Ein Seufzer",
     "Ein Satz wie", "Er sagt", "Aber sie hört", "Also erzählt", "Sie teilt", "Sie lacht nicht", "Sie macht sich klein", "Streit kann",
     "Verachtung frisst", "Denn eine Frau", "Aber nicht das Gefühl", "Und wenn sie eines", "Es hat mit"]
try:
    T = {k: t_of(k) for k in K}
except AssertionError:
    T = None

ROLL = dict(emo="neutral", look=(0.3, -1.0), head_tilt=-6)          # eye roll: eyes up and aside, head turned away
def s_hook(c, t): Z.counter_kitchen(c, t, her=dict(emo="sad", look=(0.8, 0.0), head_tilt=-6, arm_l=(8, 20), arm_r=(8, 20)), him=dict(ROLL, arm_l=(8, 20), arm_r=(8, 20)))
def s_roll_cu(c, t): Z.counter_kitchen(c, t, her=dict(emo="sad", look=(0.8, 0.0), arm_l=(8, 20), arm_r=(8, 20)), him=Z.arms_crossed(dict(ROLL)))
def s_term(c, t):
    SC.term_card(c, t, T["In der Paarforschung"] + 1.0, "Verachtung")
    SC.cracked_heart(c, 540, 920, 1.3, ease((t - T["In der Paarforschung"] - 1.2) / 1.5))
def s_gottman(c, t):
    SC.term_card(c, t, T["Laut John Gottman"], "John Gottman", "stärkstes Warnsignal")
    c.move_to(540, 800); c.line_to(660, 1010); c.line_to(420, 1010); c.close_path(); C2.finish(c, (0.95, 0.78, 0.40), 6)
    text_c(c, "!", 540, 990, 130, (0.2, 0.15, 0.1))
def s_begins(c, t): sofa(c, t, lamp=0.8, her=dict(phone=0, emo="smile", talk=SC.talk(t, 8), look=(0.9, 0.1), tilt=4), him=dict(phone=1))
def s_roll(c, t): sofa(c, t, lamp=0.8, her=dict(phone=0, emo="neutral", talk=SC.talk(t, 8), look=(0.9, 0.1), tilt=4), him=dict(phone=0, emo="neutral", look=(0.3, -1.0), tilt=-6))
def s_friends(c, t):
    kitchen_both(c, t, her=dict(phone=0, emo="sad", look=(0.6, 0.3), tilt=-4), him=dict(phone=0, emo="smile", look=(-0.9, 0.0), tilt=-6), plates=True)
    for x, col in ((150, (0.35, 0.36, 0.45)), (930, (0.40, 0.36, 0.42))):        # friends at the table, seen from behind
        C2.ellipse(c, x, 1260, 95, 105); C2.finish(c, (0.20, 0.17, 0.16), 4)
        Z.rbox(c, x - 150, 1350, 300, 400, 90, col)
def s_sigh(c, t):
    Z.hallway(c, t, her=dict(emo="neutral", talk=SC.talk(t, 8), look=(0.7, 0.1), arm_l=(8, 10), arm_r=(10, 40)),
              him=dict(emo="closed", look=(0, -0.6), head_tilt=-8, arm_l=(6, 10), arm_r=(6, 10)))
def s_sentence(c, t):
    Z.car(c, t, her=SL.lap_hands(dict(emo="sad", look=(0.6, 0.1))), him=SL.drive_pose(dict(emo="neutral", talk=SC.talk(t) if t < T["Er sagt"] - 0.4 else 0, look=(-0.2, -0.3))))
    UI.bubble(c, 690, 640, "Du übertreibst\nmal wieder.", 42, ease((t - T["Ein Satz wie"] - 0.4) / 0.25), (1, 0))
def s_joke(c, t):
    Z.counter_kitchen(c, t, her=dict(emo="sad", look=(0.8, 0.1), arm_l=(8, 20), arm_r=(8, 20)),
                      him=dict(emo="smile", talk=SC.talk(t) if t < T["Aber sie hört"] - 0.3 else 0, look=(-0.7, 0.1), arm_l=(8, 20), arm_r=(8, 20)))
    UI.bubble(c, 700, 640, "Das war doch\nnur ein Witz.", 28, ease((t - T["Er sagt"] - 0.3) / 0.25), (1, 0))
def s_hears(c, t):
    Z.bedroom(c, t, her=dict(emo="cry", look=(0.1, 0.2), head_tilt=-6), him=None)
    UI.bubble(c, 330, 820, "Du bist mir\nnicht viel wert.", 20, ease((t - T["Aber sie hört"] - 0.8) / 0.25), (-1, 0))
def s_tells_less(c, t): sofa(c, t, lamp=0.4, her=dict(phone=1, emo="neutral"), him=dict(phone=1))
def s_ideas(c, t): Z.office(c, t, her=dict(emo="neutral", look=(0, 0.5), arm_l=(10, 60), arm_r=(10, 60)), laptop=0.3)
def s_no_laugh(c, t):
    Z.counter_kitchen(c, t, her=dict(emo="neutral", look=(0.6, 0.3), arm_l=(8, 20), arm_r=(8, 20)),
                      him=dict(emo="happy", talk=0.5 + 0.4 * abs(math.sin(t * 9)), look=(-0.5, 0.1), arm_l=(30, -100), arm_r=(10, 20)))
def s_small(c, t): Z.stairs(c, t, her=dict(emo="sad", look=(0.3, 0.5), head_tilt=6))
def s_fight(c, t): Z.park(c, t, her=SC.shout(t), him=dict(emo="angry", talk=SC.talk(t, 9), look=(-0.7, 0.1), arm_l=(10, 60), arm_r=(10, 60)))
def s_eats(c, t):
    bg(c); SC.cracked_heart(c, 540, 820, 2.0, ease((t - T["Verachtung frisst"]) / 2.2))
def s_alone(c, t): Z.balcony(c, t, her=dict(emo="sad", look=(0.0, 0.3), arm_l=(6, 10), arm_r=(6, 10)), him=None)
def s_ridiculous(c, t): Z.bathroom(c, t, her=dict(emo="sad", look=(0, 0.6)))
def s_gone(c, t): Z.hallway(c, t, her=None, him=dict(emo="worried", look=(-0.6, 0.2), arm_l=(6, 10), arm_r=(6, 10)))
def s_end(c, t): Z.counter_kitchen(c, t, her=None, him=dict(emo="sad", look=(0, 0.6), head_tilt=4, arm_l=(8, 20), arm_r=(8, 20)))

WIDE = (540, 950, 1.0); BED_HER = (330, 1000, 2.3)
KIT_HER = (330, 1000, 2.0); KIT_HIM = (770, 960, 1.9)
SHOTS = [
    (0.0, s_hook, KIT_HER), (T["Sie geht wegen"], s_roll_cu, KIT_HIM), (T["In der Paarforschung"], s_term, WIDE), (T["Laut John Gottman"], s_gottman, WIDE),
    (T["Es beginnt"], s_begins, VB.MED), (T["Ein Augenrollen"], s_roll, (790, 820, 1.8)), (T["Ein spöttisches"], s_friends, VB.MED), (T["Ein Seufzer"], s_sigh, WIDE),
    (T["Ein Satz wie"], s_sentence, (540, 1040, 1.15)), (T["Er sagt"], s_joke, KIT_HIM), (T["Aber sie hört"], s_hears, BED_HER), (T["Also erzählt"], s_tells_less, VB.MED),
    (T["Sie teilt"], s_ideas, (540, 980, 1.2)), (T["Sie lacht nicht"], s_no_laugh, WIDE), (T["Sie macht sich klein"], s_small, (560, 1150, 1.15)),
    (T["Streit kann"], s_fight, WIDE), (T["Verachtung frisst"], s_eats, WIDE), (T["Denn eine Frau"], s_alone, (480, 1000, 1.3)),
    (T["Aber nicht das Gefühl"], s_ridiculous, (540, 1050, 1.1)), (T["Und wenn sie eines"], s_gone, WIDE), (T["Es hat mit"], s_end, (770, 1000, 1.7)),
] if T else []
frame = SC.make_frame(SHOTS)
