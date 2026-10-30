"""Movement for the rig: walking (front view, toward the camera or across), parallax streets, people entering and hugging.
walk() draws its own legs: the lifted leg bends at the knee (foot rises), the body bobs, the arms swing."""
import math
import cairocffi as cairo
import character2 as C2
import sets2 as Z
from storybook import glow

W, H = 1080, 1920
OUTL = C2.LINE

def walk(c, kind, x, gy, height, phase, pose=None, swing=1.0):
    """phase grows with time (one step = pi). gy = ground under the feet."""
    S = C2.Spec(kind); s = height / 1000.0; lw = 3.2 * s / 0.62
    bob = 10 * s * abs(math.sin(phase))
    body_gy = gy - bob
    for side in (-1, 1):
        lift = max(0.0, math.sin(phase + (0 if side < 0 else math.pi)))       # 0..1, which foot is in the air
        hip = (x + side * S.hip_x * s, body_gy - (S.hip_y + 20) * s)
        foot_y = gy - 45 * s - 70 * s * lift
        knee = (hip[0] + side * 8 * s, (hip[1] + foot_y) / 2 + 10 * s * lift)
        ank = (hip[0] + side * 4 * s, foot_y)
        C2.limb(c, [hip, knee, ank], (S.leg_w[0] + S.leg_w[1]) * s, S.pants, lw)
        if S.w:
            C2.ellipse(c, ank[0], ank[1] + 6 * s, 15 * s, 14 * s); C2.finish(c, C2.SKIN, lw * 0.8)
            C2.ellipse(c, ank[0] + side * 6 * s, ank[1] + 22 * s, 34 * s, 15 * s - 4 * s * lift); C2.finish(c, S.shoe, lw)
        else:
            C2.ellipse(c, ank[0] + side * 8 * s, ank[1] + 18 * s, 44 * s, 20 * s - 5 * s * lift); C2.finish(c, S.shoe, lw)
    p = dict(pose or {})
    sw = 14 * swing * math.sin(phase)
    p.setdefault("arm_l", (8 + max(0, sw), 10 + max(0, -sw) * 2))
    p.setdefault("arm_r", (8 + max(0, -sw), 10 + max(0, sw) * 2))
    p.setdefault("lean", 1.5 * math.sin(phase))
    p["hide_legs"] = True
    return C2.person(c, x, body_gy, height, kind, p)

def street(c, t, cam_x=0.0, rain=0.0):
    """night street with three parallax layers; cam_x moves the camera sideways"""
    g = cairo.LinearGradient(0, 0, 0, H); g.add_color_stop_rgb(0, 0.05, 0.06, 0.12); g.add_color_stop_rgb(1, 0.13, 0.12, 0.18)
    c.set_source(g); c.paint()
    def layer(k, fn):
        c.save(); c.translate(-cam_x * k, 0); fn(); c.restore()
    def far():
        for i in range(-4, 16):
            bx = i * 140; bh = 380 + (i * 97 % 5) * 90
            c.set_source_rgb(0.09, 0.10, 0.17); c.rectangle(bx, 1150 - bh, 128, bh); c.fill()
            for j in range(int(bh / 70)):
                if (i * 3 + j) % 4 == 0: c.set_source_rgb(0.80, 0.62, 0.38); c.rectangle(bx + 20 + (j % 2) * 50, 1150 - bh + 30 + j * 70, 22, 28); c.fill()
    def mid():
        for i in range(-3, 12):
            lx = i * 420 + 120
            c.set_source_rgb(*OUTL); c.set_line_width(12); c.move_to(lx, 1560); c.line_to(lx, 760); c.stroke()
            Z.box(c, [(lx - 40, 760), (lx + 40, 760), (lx + 26, 705), (lx - 26, 705)], (1.0, 0.82, 0.55))
            glow(c, lx, 800, 380, (1.0, 0.72, 0.42), 0.30)
    layer(0.3, far)
    Z.rect(c, -20, 1150, W + 40, 420, (0.18, 0.18, 0.24))                 # pavement
    c.save(); c.translate(-(cam_x * 1.0) % 200, 0)
    for i in range(-1, 8): c.set_source_rgba(1, 1, 1, 0.04); c.rectangle(i * 200, 1200, 190, 340); c.fill()
    c.restore()
    layer(0.6, mid)
    Z.rect(c, -20, 1560, W + 40, 400, (0.12, 0.12, 0.16))                 # road
    if rain:
        for k in range(160):
            x = (k * 73 + t * 300) % W; y = (k * 131 + t * 1700) % H
            c.set_source_rgba(0.75, 0.82, 1.0, 0.25 * rain); c.set_line_width(2); c.move_to(x, y); c.line_to(x - 6, y + 34); c.stroke()

def door_scene(c, t, t0, kind_in="m"):
    """hallway: the door opens, he walks in from the door towards her, they hug"""
    lt = t - t0
    Z.wall(c, 1520)
    Z.rect(c, 380, 380, 330, 1140, (0.18, 0.15, 0.18))                   # door frame / dark outside
    open_u = Z.ease(lt / 0.6)
    glow(c, 545, 950, 360, (1.0, 0.85, 0.6), 0.35 * open_u)
    Z.box(c, [(380, 380), (710 - 280 * open_u, 380 + 40 * open_u), (710 - 280 * open_u, 1520 - 40 * open_u), (380, 1520)], (0.30, 0.25, 0.26))
    Z.rect(c, 60, 560, 220, 20, Z.WOOD)
    # him: walks out of the door towards the camera and to the left, then stops next to her
    u = Z.ease((lt - 0.5) / 1.6)
    hx = 545 + 90 * u; hgy = 1520 + 260 * u; hh = 760 + 280 * u
    hug = Z.ease((lt - 2.2) / 0.6)
    her_x = 300 + 170 * hug
    if lt < 2.1:
        walk(c, "m", hx, hgy, hh, lt * 5.5, dict(emo="smile", look=(-0.5, 0.1)))
        C2.person(c, her_x, 1780, 1000, "w", dict(emo="smile", look=(0.8, 0.0), arm_l=(8, 10), arm_r=(8, 10), head_tilt=4))
    else:
        C2.person(c, hx, hgy, hh, "m", dict(emo="smile", look=(-0.6, 0.2), head_tilt=-6, skip_arms=("arm_l",)))
        C2.person(c, her_x, 1780, 1000, "w", dict(emo="closed" if hug > 0.6 else "smile", look=(0.6, 0.0), head_tilt=4 + 12 * hug,
                                                   lean=-6 * hug, skip_arms=("arm_r",)))
