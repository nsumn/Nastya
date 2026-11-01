"""10 'erlernte Hilflosigkeit' in 2.5D: every shot is a stack of depth layers (layers25) in a NEW place (sets25),
filmed by a moving camera with parallax and depth of field. Voice, anchors, captions and the term/name cards come from
shots_hilflos; this module only replaces the pictures.

Render with:  ./render.sh projects/10_hilflos shots25_hilflos out/DE_10_Hilflosigkeit.mp4
"""
import math
import numpy as np
from PIL import Image
from shots_hilflos import *            # T, V, SF, DUR, SUB_Y, overlays, cards, talk(), the renderer hooks video_v5 expects
import shots_hilflos as H1
import layers25 as L25
import sets25 as P
import cine

FPS = 30

def flat(draw, z=6.0):
    """a full-frame 2D card (term, name, phone) as one layer, so the camera can still push/drift on it"""
    return [L25.layer(z, draw, pad=0.12, animated=True)]

def lt(key, t): return t - T[key]
def calm(t, **k): return P.her_pose(emo="neutral", blink=P.blink(t), **k)
def sad(t, **k): return P.her_pose(emo="sad", blink=P.blink(t), **k)

def bubble_at(key, x, y, text, size=50, tail=(-1, 1), fade=(1.0, 0.8)):
    def draw(c, t):
        u = lt(key, t); P.UI.bubble(c, x, y, text, size, ease(u / 0.25) * (1 - 0.6 * ease((u - fade[0]) / fade[1])), tail=tail)
    return draw

if T:
    SC = [
        # (anchor, layers, cam0, cam1, focus_z, opts)
        (0.0, P.elevator(lambda t: dict(emo="worried", look=(0.2, 0.1), head_tilt=-5, blink=P.blink(t, 2.7), talk=0.35 * H1.talk(t) if 0.3 < t < 0.8 else 0.0),
                         doors=lambda t: ease((t - 1.4) / 0.6) * 0.0), (0.0, 0.05, 0.0), (0.05, 0.0, 0.9), 3.0, {}),
        ("dass ihre Worte", P.dining(lambda t: P.her_pose(emo="worried", look=(0.6, -0.1), head_tilt=4, talk=H1.talk(t) if lt("dass ihre Worte", t) < 1.0 else 0.0,
                                                          arm_l=(8, 70), arm_r=(22, 95), blink=P.blink(t)),
                                     lambda t: dict(emo="neutral", look=(0.0, 0.9), head_tilt=-4, blink=P.blink(t, 3.7)),
                                     bubble=bubble_at("dass ihre Worte", 330, 1000, "Können wir\nreden?", 50)),
         (0.3, -0.05, 0.0), (-0.25, 0.05, 0.8), 3.6, {}),
        ("desto seltener", P.floating_bubbles([("Hast du heute Abend\nkurz Zeit?", 54, 420, 640, 7.0, T["desto seltener"]),
                                               ("Können wir reden?", 50, 640, 900, 5.0, T["desto seltener"] + 0.45),
                                               ("Du, wegen …", 46, 430, 1130, 3.6, T["desto seltener"] + 0.9),
                                               ("…", 44, 600, 1330, 2.6, T["desto seltener"] + 1.35)]),
         (-0.2, 0.0, 0.0), (0.2, 0.1, 1.0), 3.6, {}),
        ("In der Psychologie", flat(H1.s_term), (0, 0, 0), (0, 0, 0.5), None, dict(whip=True)),
        ("Am Anfang", P.terrace(lambda t: P.her_pose(emo="worried", talk=H1.talk(t), look=(0.7, 0.0), arm_r=(30 + 10 * math.sin(t * 5), -70 - 15 * math.sin(t * 5)),
                                                     arm_l=(12, 40), blink=P.blink(t)),
                                lambda t: dict(emo="neutral", look=(-0.3, 0.5), blink=P.blink(t, 3.1))),
         (-0.3, 0.0, 0.0), (0.2, 0.05, 0.9), 3.4, dict(whip=True)),
        ("Sie bittet", P.porch(lambda t: P.her_pose(emo="sad", look=(0.8, 0.2), arm_r=(40 + 15 * ease(lt("Sie bittet", t) / 0.6), -30), arm_l=(8, 10),
                                                    talk=H1.talk(t) if lt("Sie bittet", t) < 0.6 else 0, blink=P.blink(t)),
                               lambda t: dict(emo="neutral", look=(0.6, 0.0), lean=-3, blink=P.blink(t, 2.9))),
         (0.25, 0.0, 0.0), (-0.1, -0.05, 0.8), 5.5, {}),
        ("Sie schreibt", P.desk_letter(lambda t: P.her_pose(emo="worried", look=(0.4, 0.8), head_tilt=8, arm_l=(10, 80), arm_r=(16, 96), blink=P.blink(t)),
                                       lambda t: ease(lt("Sie schreibt", t) / 1.6)),
         (0.3, 0.05, 0.0), (0.0, 0.0, 1.0), 3.2, {}),
        ("Sie wartet", P.doorway_tea(lambda t: P.her_pose(emo="worried", look=(0.6, 0.0), arm_l=(14, 120), arm_r=(14, 120), blink=P.blink(t)),
                                     lambda t: dict(emo="neutral", look=(0.6, 0.2), blink=P.blink(t, 3.4))),
         (-0.1, 0.0, 0.0), (0.15, 0.0, 0.8), 3.4, {}),
        ("Doch jedes Mal", P.roundabout(T["Doch jedes Mal"]), (0.0, 0.2, 0.0), (0.0, -0.1, 1.6), 6.0, dict(whip=True)),
        ("Er nickt", P.armchair_tv(lambda t: dict(emo="calm", look=(0.0, 0.8), head_tilt=6 * math.sin(lt("Er nickt", t) * 9) * math.exp(-max(0, lt("Er nickt", t) - 0.6) * 2),
                                                  blink=P.blink(t)),
                                   bubble=bubble_at("Er nickt", 760, 640, "Mach ich.", 54, tail=(1, 1), fade=(9, 1))),
         (-0.2, 0.0, 0.0), (0.15, -0.05, 0.9), 4.0, {}),
        ("Vielleicht meint", flat(H1.s_reply), (0, 0, 0), (0, 0, 0.6), None, {}),
        ("Und nach einer Woche", P.fridge_notes(T["Und nach einer Woche"] + 0.1, [(380, 520, "Reden?", (0.98, 0.90, 0.50)), (690, 700, "Reden?", (0.95, 0.70, 0.75)),
                                                                                  (400, 960, "Reden??", (0.70, 0.88, 0.95)), (700, 1180, "…", (0.98, 0.90, 0.50))]),
         (0.2, 0.05, 0.0), (-0.1, 0.0, 1.0), 4.0, {}),
        ("Irgendwann lernt", P.kitchen_floor(lambda t: P.her_pose(emo="sad", look=(0.1, 0.5), head_tilt=-8, arm_l=(20, 120), arm_r=(20, 120), blink=P.blink(t))),
         (-0.15, 0.1, 0.0), (0.1, 0.1, 0.7), 3.0, {}),
        ("Der Psychologe", flat(H1.s_seligman), (0, 0, 0), (0, 0, 0.4), None, dict(whip=True)),
        ("Wer immer wieder", P.bus_stop(lambda t: P.her_pose(emo="sad", look=(0.7, 0.1), arm_l=(10, 70), arm_r=(10, 70), blink=P.blink(t)),
                                        lambda t: ease((lt("Wer immer wieder", t) - 0.3) / 2.6)),
         (0.2, 0.0, 0.0), (-0.15, 0.0, 0.8), 3.2, {}),
        ("Selbst dann", P.garden_gate(lambda t: P.her_pose(emo="neutral", look=(0.6, 0.3), arm_l=(10, 70), arm_r=(10, 70), blink=P.blink(t)),
                                      lambda t: ease((lt("Selbst dann", t) - 0.3) / 1.0)),
         (-0.2, 0.0, 0.0), (0.2, 0.05, 0.8), 3.2, {}),
        ("Also wird sie", P.ironing(lambda t: P.her_pose(emo="neutral", look=(0.1, 0.8), arm_l=(14, 40), arm_r=(24, 60), blink=P.blink(t))),
         (0.15, 0.0, 0.0), (-0.1, 0.0, 0.9), 3.4, dict(whip=True)),
        ("Sie räumt", P.cellar(lambda t: P.her_pose(emo="neutral", look=(0.2, 0.3), arm_l=(30, 100), arm_r=(30, 100), blink=P.blink(t))),
         (-0.1, 0.0, 0.0), (0.15, 0.0, 0.8), 3.3, {}),
        ("Sie entscheidet", P.supermarket(lambda t: P.her_pose(emo="neutral", look=(0.6, 0.3), arm_l=(12, 30), arm_r=(40, 70), blink=P.blink(t)),
                                          lambda t: -60 + 80 * lt("Sie entscheidet", t)),
         (-0.2, 0.0, 0.0), (0.15, 0.0, 0.7), 3.4, {}),
        ("Ihren Kummer", P.cafe(lambda t: P.her_pose(emo="sad", talk=H1.talk(t, 7), look=(0.7, 0.0), arm_l=(10, 80), arm_r=(10, 80), blink=P.blink(t)),
                                lambda t: dict(emo="worried", look=(-0.7, 0.0), head_tilt=-6, arm_l=(10, 80), arm_r=(10, 80), blink=P.blink(t, 2.8))),
         (0.25, 0.0, 0.0), (-0.1, 0.0, 0.9), 3.4, {}),
        ("Von außen", P.facade(), (0.0, -0.15, 0.0), (0.0, 0.0, 1.2), 7.0, {}),
        ("Doch es ist kein", P.cold_cup(), (0.1, 0.0, 0.0), (-0.05, 0.05, 0.6), 2.6, {}),
        ("Es ist Aufgeben", flat(H1.s_typing), (0, 0, 0), (0, 0, 0.5), None, {}),
        ("Eine Frau, die nicht", P.elevator(lambda t: dict(emo="cry", look=(0.2, 0.1), head_tilt=-7, blink=P.blink(t, 3.1)),
                                            doors=lambda t: ease((lt("Eine Frau, die nicht", t) - 2.2) / 0.9)),
         (0.0, 0.0, 0.6), (0.0, 0.05, 1.1), 3.0, {}),
        ("Sie hat nur", P.dining(lambda t: P.her_pose(emo="sad", look=(0.9, -0.3), head_tilt=-4, arm_l=(8, 70), arm_r=(10, 75), blink=P.blink(t)),
                                 lambda t: dict(emo="neutral", look=(0.0, 0.9), head_tilt=-4, blink=P.blink(t, 3.7))),
         (-0.3, 0.05, 1.0), (0.2, -0.05, 0.0), 3.6, {}),
    ]
    STARTS = [0.0 if a == 0.0 else T[a] for a, *_ in SC]
    # shots_hilflos-style list (start, fn, cam0, cam1, opts) so audio/events code can read cut times and whips
    SHOTS = [(STARTS[i], None, None, None, SC[i][5]) for i in range(len(SC))]
else:
    SC, STARTS, SHOTS = [], [], []

def _cam(i, t):
    t0 = STARTS[i]; t1 = STARTS[i + 1] if i + 1 < len(STARTS) else DUR
    return L25.cam_path(t, t0, t1, SC[i][2], SC[i][3])

_live = [None]
def _render(i, t, dx=0.0):
    if _live[0] != i:                                   # keep only the current shot's layers cached (memory)
        if _live[0] is not None:
            for L in SC[_live[0]][1]: L._cache = None
        _live[0] = i
    cx, cy, cz = _cam(i, t)
    arr = L25.render(SC[i][1], t, (cx, cy, cz), focus_z=SC[i][4], dof=4.0)
    if dx: arr = np.roll(arr, int(round(dx)), axis=1)
    return arr

def frame(t):
    k = max(i for i, s0 in enumerate(STARTS) if s0 <= t)
    w = next((j for j in range(1, len(SC)) if SC[j][5].get("whip") and abs(t - STARTS[j]) < cine.WHIP), None)
    if w is not None:                                    # whip push: outgoing slides left, incoming from the right, motion blur
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
    overlays(im, t)
    for s0, e0, ws, hl in V.CAPS:
        if s0 - 0.02 <= t < e0:
            V.draw_caption(im, ws, hl, SUB_Y, V.F_SUB, min(1.0, (t - s0 + 0.02) / 0.09)); break
    return im

def events():
    ev = [(0.0, "tick")]
    ev += [(T["desto seltener"] + 0.45 * k, "ping") for k in range(4)]
    ev += [(T["Sie schreibt"] + 0.3 * k, "tick") for k in range(5)]                 # pen strokes
    ev += [(T["Sie wartet"] + 0.3, "cup")]
    ev += [(T["Vielleicht meint"] + 0.3, "ping_dry")]
    ev += [(T["Und nach einer Woche"] + 0.1 + 0.35 * k, "tick") for k in range(4)]
    ev += [(T["Irgendwann lernt"] + 1.2, "thud")]
    ev += [(T["Wer immer wieder"] + 0.3, "train")]                                  # the bus passing
    ev += [(T["Selbst dann"] + 0.3, "door")]
    ev += [(T["Sie räumt"] + k * 0.45, "step") for k in range(3)]
    ev += [(T["Eine Frau, die nicht"], "rain_start")]
    ev += [(STARTS[k], "whoosh") for k in range(1, len(SC)) if SC[k][5].get("whip")]
    return ev
