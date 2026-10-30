"""Contact sheet: 12 different places / poses / emotions from sets2 (style test)."""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
sys.path.insert(0, HERE)
sys.argv = [sys.argv[0], OUT, "--static", "--noboil"]
import sofa_fog as SF
import numpy as np, cairocffi as cairo
from PIL import Image, ImageDraw, ImageFont
import character2 as C2
import sets2 as Z
C2.PROP["name"] = "oval"
F = ImageFont.truetype(HERE + "/fonts/Inter-Black.otf", 70)

def shot(fn, cam, cap, t=5.0):
    s = cairo.ImageSurface(cairo.FORMAT_RGB24, 1080, 1920); c = cairo.Context(s)
    cx, cy, z = cam; c.translate(540, 950); c.scale(z, z); c.translate(-cx, -cy)
    fn(c, t); s.flush()
    arr = np.frombuffer(s.get_data(), np.uint8).reshape(1920, 1080, 4)[:, :, [2, 1, 0]].copy()
    im = Image.fromarray(SF.look(arr, 0)); d = ImageDraw.Draw(im); w = F.getlength(cap)
    d.text((540 - w / 2, 1330), cap, font=F, fill=(255, 255, 255), stroke_width=8, stroke_fill=(16, 16, 22))
    return im

WIDE = (540, 950, 1.0)
x_her, gy_her = 400, 1780
shots = [
    (lambda c, t: Z.bedroom(c, t, her=dict(emo="sad", look=(0.2, -0.6)), him=dict(emo="closed")), (540, 1060, 1.25), "liegt wach"),
    (lambda c, t: Z.car(c, t, her=dict(emo="sad", look=(-0.9, 0.1), tilt=-5, arm_l=(8, 70), arm_r=(8, 70), fore_k=0.7),
                        him=Z.reach_pose("m", 780, 1330 + (C2.Spec("m").hip_y + 20) * 0.83, 830, {"arm_l": (640, 1250), "arm_r": (920, 1250)}, dict(emo="neutral", look=(0, 0), drive=True))), (540, 1040, 1.15), "im Auto"),
    (lambda c, t: Z.office(c, t, her=Z.hand_on_forehead("w", 540, 1240 + (C2.Spec("w").hip_y + 20) * 0.86, 860, 1, dict(emo="worried", look=(0, 0.6)), other=(420, 1180))), (540, 980, 1.2), "To-do-Listen"),
    (lambda c, t: Z.laundry(c, t, her=dict(emo="sad", look=(0.5, 0.3), tilt=-4)), WIDE, "schon wieder"),
    (lambda c, t: Z.balcony(c, t, her=dict(emo="smile", look=(0.6, 0.2), tilt=6), him=dict(emo="calm", look=(-0.6, 0.3), tilt=-4), hug=1.0), (520, 1050, 1.15), "hält sie"),
    (lambda c, t: Z.park(c, t, her=Z.arms_crossed(dict(emo="angry", look=(-0.8, 0.0), tilt=-4)), him=dict(emo="sad", look=(0.2, 0.7), arm_l=(10, 60), arm_r=(10, 60))), WIDE, "Distanz"),
    (lambda c, t: Z.hallway(c, t, her=Z.face_in_hands("w", 400, 1780, 1000, dict(tilt=6)), him=Z.arms_crossed(dict(emo="angry", look=(-0.8, 0.1)))), WIDE, "zu viel"),
    (lambda c, t: Z.stairs(c, t, her=dict(emo="sad", look=(0.3, 0.4), tilt=5)), (560, 1150, 1.15), "allein"),
    (lambda c, t: Z.bathroom(c, t, her=dict(emo="worried", look=(0, 0.8))), (540, 1050, 1.1), "erschöpft"),
    (lambda c, t: Z.counter_kitchen(c, t, her=dict(emo="angry", talk=0.7, look=(0.9, 0.1), arm_r=(30, -115), arm_l=(10, 25)),
                                    him=dict(emo="worried", look=(-0.9, 0.1), arm_l=(10, 20), arm_r=(10, 20))), WIDE, "Streit"),
    (lambda c, t: Z.bedroom(c, t, her=dict(emo="cry", look=(0.2, 0.2), tilt=-6), him=None), (330, 900, 2.3), "Tränen"),
    (lambda c, t: Z.hallway(c, t, her=dict(emo="sad", look=(0.7, 0.1), arm_l=(8, 10), arm_r=(6, 10)), him=None, her_bag=True), WIDE, "geht"),
]
ims = [shot(fn, cam, cap) for fn, cam, cap in shots]
for k, im in enumerate(ims): im.save(f"{OUT}/d_{k:02d}.png")
sheet = Image.new("RGB", (6 * 300, 2 * 534), (10, 10, 14))
for k, im in enumerate(ims): sheet.paste(im.resize((300, 534)), ((k % 6) * 300, (k // 6) * 534))
sheet.save(f"{OUT}/demo2_sheet.png")
