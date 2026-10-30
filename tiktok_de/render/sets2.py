"""Set library 2: many different places + body-language poses, so every shot is a new picture
(bedroom, car, home office, laundry, balcony, park bench, hallway, stairs, bathroom, kitchen counter).
All sets are drawn in the 1080x1920 frame; characters come from character2 (standing, seated with legs, lying in bed).
"""
import math
import cairocffi as cairo
import character2 as C2
from storybook import Pen, shape, ellipse_pts, glow

W, H = 1080, 1920
OUTL = C2.LINE
WALL0, WALL1 = (0.16, 0.17, 0.25), (0.11, 0.11, 0.17)
FLOOR = (0.13, 0.12, 0.16)
WOOD, WOOD_D = (0.33, 0.27, 0.28), (0.25, 0.20, 0.22)
GREYF, GREYF_D = (0.27, 0.28, 0.36), (0.20, 0.21, 0.28)
WARM = (1.0, 0.72, 0.42)

def ease(u): u = max(0.0, min(1.0, u)); return u * u * (3 - 2 * u)
def box(c, pts, fill, lw=3.5): shape(c, Pen(3), pts, fill, smooth=False, lw=lw, line=OUTL)
def rect(c, x, y, w, h, fill, lw=3.5): box(c, [(x, y), (x + w, y), (x + w, y + h), (x, y + h)], fill, lw)
def rrect(c, x, y, w, h, r):
    c.new_sub_path()
    c.arc(x + w - r, y + r, r, -math.pi / 2, 0); c.arc(x + w - r, y + h - r, r, 0, math.pi / 2)
    c.arc(x + r, y + h - r, r, math.pi / 2, math.pi); c.arc(x + r, y + r, r, math.pi, 1.5 * math.pi); c.close_path()
def rbox(c, x, y, w, h, r, fill, lw=3.5): rrect(c, x, y, w, h, r); C2.finish(c, fill, lw)

def wall(c, floor_y=1500, top=WALL0, bot=WALL1):
    g = cairo.LinearGradient(0, 0, 0, floor_y); g.add_color_stop_rgb(0, *top); g.add_color_stop_rgb(1, *bot)
    c.set_source(g); c.rectangle(0, 0, W, floor_y); c.fill()
    g = cairo.LinearGradient(0, floor_y, 0, H); g.add_color_stop_rgb(0, *FLOOR); g.add_color_stop_rgb(1, 0.08, 0.08, 0.11)
    c.set_source(g); c.rectangle(0, floor_y, W, H - floor_y); c.fill()
    c.set_source_rgb(*OUTL); c.set_line_width(3); c.move_to(0, floor_y); c.line_to(W, floor_y); c.stroke()

def night_window(c, x, y, w, h, curtains=True, city=True):
    rect(c, x, y, w, h, (0.10, 0.13, 0.24))
    if city:
        for k in range(14):
            bx = x + 10 + (k * 61) % (w - 40); bh = 60 + (k * 37) % 120
            c.set_source_rgb(0.13, 0.15, 0.26); c.rectangle(bx, y + h - bh, 34, bh); c.fill()
            for j in range(3):
                if (k + j) % 3 == 0: c.set_source_rgb(0.85, 0.66, 0.40); c.rectangle(bx + 8, y + h - bh + 12 + j * 26, 8, 10); c.fill()
    c.set_source_rgb(*OUTL); c.set_line_width(3); c.move_to(x + w / 2, y); c.line_to(x + w / 2, y + h); c.stroke()
    if curtains:
        for sd, cx in ((-1, x), (1, x + w)):
            box(c, [(cx - 30 * -sd, y - 30), (cx + 70 * -sd, y - 30), (cx + 50 * -sd, y + h + 40), (cx - 40 * -sd, y + h + 40)], (0.30, 0.30, 0.40))

# ---------------------------------------------------------------- characters
def stand(c, kind, x, gy, height, pose):
    return C2.person(c, x, gy, height, kind, pose)

def sit(c, kind, x, seat_y, height, pose, knees_up=False, shin=None):
    """seated, front view, legs visible: hips at seat_y, shins down to the floor (or knees pulled up)"""
    S = C2.Spec(kind); s = height / 1000.0
    gy = seat_y + (S.hip_y + 20) * s
    shin = shin if shin is not None else 300 * s
    if not knees_up:
        for sd in (-1, 1):
            kx = x + sd * 52 * s
            C2.limb(c, [(kx, seat_y + 10 * s), (kx + sd * 6 * s, seat_y + shin)], S.leg_w[0] * 1.9 * s, S.pants, 3.2 * s / 0.62)
            C2.ellipse(c, kx + sd * 14 * s, seat_y + shin + 14 * s, 42 * s, 18 * s); C2.finish(c, S.shoe, 3.2 * s / 0.62)
    hands = C2.person(c, x, gy, height, kind, dict(pose, hide_legs=True))
    # lap: thighs coming towards the camera
    hem = gy - S.hem_y * s
    rbox(c, x - 112 * s, hem - 6 * s, 224 * s, 70 * s, 26 * s, S.pants, 3.2 * s / 0.62)
    if knees_up:   # knees pulled up to the chest, shins in front
        for sd in (-1, 1):
            C2.ellipse(c, x + sd * 48 * s, hem - 120 * s, 58 * s, 150 * s); C2.finish(c, S.pants, 3.2 * s / 0.62)
    return hands

def head_xy(kind, x, gy, height):
    S = C2.Spec(kind); s = height / 1000.0
    return x, gy - S.head_y * s, S.head_r * s

def reach_pose(kind, x, gy, height, targets, base=None, elbow=True):
    """pose dict with arms placed by IK: targets = {'arm_l': (x, y), 'arm_r': (x, y)}; elbow='down' for reaching forward"""
    p = dict(base or {}); fk = {}
    for key, tgt in targets.items():
        side = -1 if key == "arm_l" else 1
        (o, b), f = C2.reach(x, gy, height, kind, side, tgt, elbow); p[key] = (o, b); fk[key] = f
    p["fore_k"] = fk
    return p

def face_in_hands(kind, x, gy, height, base=None):
    hx, hy, r = head_xy(kind, x, gy, height)
    p = reach_pose(kind, x, gy, height, {"arm_l": (hx - 0.28 * r, hy + 0.32 * r), "arm_r": (hx + 0.28 * r, hy + 0.32 * r)}, base)
    p.update(hands_front=True, emo=p.get("emo", "cry"), thumbs=False); return p

def hand_on_forehead(kind, x, gy, height, side=1, base=None, other=None):
    hx, hy, r = head_xy(kind, x, gy, height)
    t = {("arm_r" if side > 0 else "arm_l"): (hx + side * 0.25 * r, hy - 0.45 * r)}
    if other: t[("arm_l" if side > 0 else "arm_r")] = other
    p = reach_pose(kind, x, gy, height, t, base); p.update(hands_front=True, thumbs=False); return p

def arms_crossed(base=None):
    p = dict(base or {}); p.update(arm_l=(20, 106), arm_r=(20, 110), fore_k=1.08, thumbs=False); return p

# ---------------------------------------------------------------- sets
def bedroom(c, t, her=None, him=None, lamp=1.0):
    wall(c, 1500)
    night_window(c, 620, 330, 340, 420)
    rbox(c, 120, 640, 840, 420, 40, (0.24, 0.24, 0.33))           # headboard
    for k in range(4): c.set_source_rgba(0, 0, 0, 0.18); c.rectangle(170 + k * 200, 690, 140, 330); c.fill()
    rect(c, -20, 980, 140, 220, WOOD); rect(c, 960, 980, 140, 220, WOOD)   # night stands
    box(c, [(20, 980), (90, 980), (80, 900), (30, 900)], (1.0, 0.78, 0.5)); glow(c, 55, 930, 360, WARM, 0.35 * lamp)
    rbox(c, 110, 1010, 860, 520, 30, (0.86, 0.85, 0.88))           # mattress / sheet
    for x in (330, 750): rbox(c, x - 150, 940, 300, 140, 50, (0.95, 0.94, 0.96))   # pillows
    # heads on the pillows (bodies under the duvet)
    if her is not None: C2.person(c, 330, 1690, 760, "w", dict(dict(hide_legs=True, arm_l=(6, 8), arm_r=(6, 8)), **her))
    if him is not None: C2.person(c, 750, 1690, 780, "m", dict(dict(hide_legs=True, arm_l=(6, 8), arm_r=(6, 8)), **him))
    # duvet
    c.move_to(90, 1110); c.curve_to(300, 1080, 780, 1080, 990, 1110); c.line_to(1010, 1560); c.line_to(70, 1560); c.close_path()
    C2.finish(c, (0.40, 0.42, 0.55), 3.5)
    for k in range(5):
        c.move_to(160 + k * 180, 1120); c.curve_to(150 + k * 180, 1250, 180 + k * 180, 1400, 160 + k * 180, 1540)
        c.set_source_rgba(0, 0, 0, 0.15); c.set_line_width(6); c.stroke()

def car(c, t, her=None, him=None):
    g = cairo.LinearGradient(0, 0, 0, H); g.add_color_stop_rgb(0, 0.10, 0.10, 0.14); g.add_color_stop_rgb(1, 0.06, 0.06, 0.09)
    c.set_source(g); c.paint()
    rbox(c, 120, 420, 840, 330, 60, (0.12, 0.15, 0.26))            # rear window: night road behind
    for k in range(6):
        x = 200 + k * 130 + 40 * math.sin(t * 0.7 + k)
        glow(c, x, 640, 60, (1.0, 0.85, 0.6), 0.5)
    for x in (300, 780):                                            # seats
        rbox(c, x - 190, 700, 380, 820, 80, (0.20, 0.20, 0.26))
        rbox(c, x - 110, 640, 220, 150, 50, (0.22, 0.22, 0.29))
    if her is not None: sit(c, "w", 300, 1330, 800, her)
    if him is not None: sit(c, "m", 780, 1330, 830, him)
    # dashboard + wheel in front
    c.move_to(-20, 1330); c.curve_to(300, 1290, 780, 1290, 1100, 1330); c.line_to(1100, H); c.line_to(-20, H); c.close_path(); C2.finish(c, (0.15, 0.15, 0.20), 4)
    glow(c, 540, 1360, 200, (0.4, 0.7, 1.0), 0.25)
    for col, wdt in ((OUTL, 40), ((0.26, 0.26, 0.32), 28)):
        c.set_source_rgb(*col); c.set_line_width(wdt); c.new_sub_path(); c.arc(780, 1330, 175, 0, 2 * math.pi); c.stroke()
    if him is not None and him.get("drive"):          # hands on the wheel, over the rim
        for hx in (640, 920): C2.ellipse(c, hx, 1250, 22, 28); C2.finish(c, C2.SKIN, 4)

def office(c, t, her=None, laptop=1.0):
    wall(c, 1450)
    rect(c, 90, 420, 420, 26, WOOD); rect(c, 590, 520, 400, 26, WOOD)   # shelves
    for k in range(7): rect(c, 110 + k * 50, 300 + (k % 3) * 20, 40, 120 - (k % 3) * 20, [(0.45, 0.32, 0.30), (0.30, 0.36, 0.45), (0.50, 0.45, 0.35)][k % 3], 2.5)
    for k in range(4): rect(c, 620 + k * 80, 430, 60, 90, (0.35, 0.38, 0.30) if k % 2 else (0.42, 0.30, 0.34), 2.5)
    glow(c, 540, 1050, 380, (0.70, 0.82, 1.0), 0.16 * laptop)
    if her is not None: sit(c, "w", 540, 1240, 860, her, shin=0)
    rect(c, -20, 1200, 1120, 60, WOOD); rect(c, 0, 1260, 1080, 400, WOOD_D)   # desk
    # laptop seen from behind-ish (screen facing her)
    box(c, [(380, 1200), (700, 1200), (680, 1040), (400, 1040)], (0.30, 0.31, 0.38))
    box(c, [(820, 1200), (900, 1200), (880, 1060), (840, 1060)], (0.55, 0.50, 0.42))     # mug of pens
    c.set_source_rgb(*OUTL); c.set_line_width(10); c.move_to(160, 1200); c.line_to(160, 1000); c.line_to(260, 930); c.stroke()
    box(c, [(230, 900), (330, 950), (300, 990), (210, 950)], (1.0, 0.80, 0.50)); glow(c, 280, 990, 300, WARM, 0.35)

def laundry(c, t, her=None, basket_hold=True):
    wall(c, 1480)
    for i in range(6):
        for j in range(5): c.set_source_rgba(1, 1, 1, 0.03 + 0.02 * ((i + j) % 2)); c.rectangle(i * 180, 300 + j * 160, 172, 152); c.fill()
    rect(c, 600, 1020, 400, 460, (0.80, 0.80, 0.84))                # washing machine
    rect(c, 600, 1020, 400, 80, (0.70, 0.70, 0.75))
    C2.ellipse(c, 800, 1290, 140, 140); C2.finish(c, (0.45, 0.48, 0.58), 5)
    C2.ellipse(c, 800, 1290, 100, 100); C2.finish(c, (0.25, 0.30, 0.42), 4)
    rect(c, 620, 860, 360, 24, WOOD)
    for k, col in enumerate(((0.45, 0.60, 0.80), (0.85, 0.85, 0.88), (0.80, 0.55, 0.45))): rect(c, 650 + k * 100, 760, 70, 100, col, 2.5)
    if her is not None:
        x, gy, h = 330, 1600, 900
        p = reach_pose("w", x, gy, h, {"arm_l": (x - 150, gy - 470), "arm_r": (x + 150, gy - 470)}, her) if basket_hold else her
        stand(c, "w", x, gy, h, p)
        if basket_hold:
            box(c, [(x - 190, gy - 520), (x + 190, gy - 520), (x + 160, gy - 300), (x - 160, gy - 300)], (0.75, 0.62, 0.45))
            for k in range(5): c.set_source_rgba(0, 0, 0, 0.2); c.rectangle(x - 150 + k * 68, gy - 490, 30, 160); c.fill()
            for k, col in enumerate(((0.55, 0.65, 0.80), (0.88, 0.86, 0.80), (0.75, 0.45, 0.50))):
                C2.ellipse(c, x - 90 + k * 90, gy - 535, 80, 34); C2.finish(c, col, 3)

def balcony(c, t, her=None, him=None, hug=0.0):
    g = cairo.LinearGradient(0, 0, 0, H); g.add_color_stop_rgb(0, 0.06, 0.07, 0.13); g.add_color_stop_rgb(1, 0.15, 0.13, 0.20)
    c.set_source(g); c.paint()
    for k in range(70):                                              # city lights bokeh
        x, y = (k * 151) % W, 820 + (k * 97) % 420; r = 6 + (k * 7) % 14
        glow(c, x, y, r * 2.5, (1.0, 0.75, 0.45) if k % 3 else (0.6, 0.75, 1.0), 0.35)
    for k in range(12):
        bx = (k * 97) % W; bh = 200 + (k * 53) % 300
        c.set_source_rgba(0.05, 0.05, 0.09, 0.8); c.rectangle(bx, 1250 - bh, 90, bh); c.fill()
    rect(c, -20, 1250, 1120, 700, (0.18, 0.18, 0.24))               # balcony floor/wall
    xh, xw, gyy = 640, 380, 1720
    if him is not None:
        stand(c, "m", xh, gyy, 1040, dict(him, skip_arms=("arm_l",) if hug else ()))
    if her is not None:
        hp = dict(her)
        if hug: hp.update(skip_arms=("arm_r",), lean=-5 * hug, head_tilt=hp.get("head_tilt", 0) + 14 * hug)
        stand(c, "w", xw + 50 * hug, gyy, 980, hp)
    # railing in front
    rect(c, -20, 1280, 1120, 26, (0.10, 0.10, 0.14))
    for k in range(14): rect(c, k * 80, 1300, 12, 380, (0.10, 0.10, 0.14), 2)
    rect(c, -20, 1680, 1120, 26, (0.10, 0.10, 0.14))

def park(c, t, her=None, him=None, xs=(280, 800)):
    g = cairo.LinearGradient(0, 0, 0, H); g.add_color_stop_rgb(0, 0.07, 0.08, 0.13); g.add_color_stop_rgb(1, 0.12, 0.12, 0.17)
    c.set_source(g); c.paint()
    for k in range(9):                                              # bushes / trees
        C2.ellipse(c, (k * 137) % W, 980 + (k * 41) % 120, 160, 120); c.set_source_rgb(0.10, 0.14, 0.14); c.fill()
    # street lamp
    c.set_source_rgb(*OUTL); c.set_line_width(14); c.move_to(900, 1500); c.line_to(900, 560); c.stroke()
    box(c, [(860, 560), (940, 560), (925, 500), (875, 500)], (1.0, 0.82, 0.55)); glow(c, 900, 600, 520, WARM, 0.35)
    rect(c, -20, 1300, 1120, 700, (0.16, 0.16, 0.20))                # path
    for i in range(12):
        for j in range(6): c.set_source_rgba(1, 1, 1, 0.03); c.rectangle(i * 95 + (j % 2) * 45, 1320 + j * 100, 86, 90); c.fill()
    # bench back
    for k in range(3): rect(c, 100, 1000 + k * 50, 880, 34, WOOD)
    if him is not None: sit(c, "m", xs[1], 1230, 830, him)
    if her is not None: sit(c, "w", xs[0], 1230, 800, her)
    rect(c, 80, 1210, 920, 40, WOOD)                                  # seat
    for x in (140, 940): rect(c, x - 14, 1250, 28, 280, (0.12, 0.12, 0.16), 2)

def hallway(c, t, her=None, him=None, her_bag=False, kids=False, him_front=False):
    wall(c, 1520)
    rect(c, 380, 380, 330, 1140, (0.30, 0.25, 0.26))                 # front door
    rect(c, 430, 440, 230, 300, (0.18, 0.22, 0.34)); C2.ellipse(c, 670, 1000, 14, 14); C2.finish(c, (0.85, 0.72, 0.45), 3)
    rect(c, 60, 560, 220, 20, WOOD)                                    # coat rack
    for k, col in enumerate(((0.30, 0.32, 0.40), (0.45, 0.35, 0.30))):
        box(c, [(90 + k * 90, 575), (150 + k * 90, 575), (170 + k * 90, 920), (70 + k * 90, 920)], col)
    rect(c, 780, 1300, 240, 220, WOOD)                                 # sideboard + key bowl
    glow(c, 540, 380, 500, WARM, 0.18)
    if kids:   # two small school backpacks and kids' shoes by the door
        for k, (x, col) in enumerate(((610, (0.75, 0.45, 0.45)), (720, (0.45, 0.58, 0.78)))):
            rbox(c, x - 55, 1420, 110, 120, 26, col); rbox(c, x - 35, 1470, 70, 40, 12, tuple(v * 0.8 for v in col))
        for x in (520, 560): C2.ellipse(c, x, 1540, 24, 11); C2.finish(c, (0.85, 0.55, 0.40), 3)
    if him is not None and not him_front: stand(c, "m", 830, 1760, 1040, him)
    if her is not None:
        hands = stand(c, "w", 400, 1780, 1000, her)
        if her_bag:
            (bx, by), _ = hands["arm_l"]
            c.set_source_rgb(*OUTL); c.set_line_width(8); c.move_to(bx - 40, by + 60); c.curve_to(bx - 40, by - 10, bx + 40, by - 10, bx + 40, by + 60); c.stroke()
            box(c, [(bx - 85, by + 50), (bx + 85, by + 50), (bx + 100, by + 230), (bx - 100, by + 230)], (0.42, 0.30, 0.26))
    if him is not None and him_front: stand(c, "m", 830, 1760, 1040, him)

def stairs(c, t, her=None):
    wall(c, 1700)
    for k in range(9):                                                 # steps rising to the right
        y = 1700 - k * 120; x = 120 + k * 110
        box(c, [(x, y), (1100, y), (1100, y - 120), (x, y - 120)], (0.28, 0.25, 0.27) if k % 2 else (0.25, 0.22, 0.25))
    c.set_source_rgb(*OUTL); c.set_line_width(12); c.move_to(80, 1300); c.line_to(1080, 300); c.stroke()
    for k in range(10): c.set_line_width(6); c.move_to(120 + k * 100, 1260 - k * 100); c.line_to(120 + k * 100, 1400 - k * 100); c.stroke()
    glow(c, 900, 300, 500, WARM, 0.15)
    if her is not None:
        p = dict(her); x, seat = 470, 1460
        S = C2.Spec("w"); s = 0.86; gy = seat + (S.hip_y + 20) * s; hem = gy - S.hem_y * s
        p = reach_pose("w", x, gy, 860, {"arm_l": (x + 30, hem - 190 * s), "arm_r": (x - 30, hem - 190 * s)}, p)
        p.update(thumbs=False)
        sit(c, "w", x, seat, 860, p, knees_up=True)
        for sd in (-1, 1):   # her forearms wrapped around the knees, drawn over them
            C2.limb(c, [(x + sd * 120 * s, hem - 230 * s), (x - sd * 10 * s, hem - 175 * s)], 52 * s, C2.W_TOP_SH, 3.2 * s / 0.62)
        for sd in (-1, 1): C2.ellipse(c, x - sd * 18 * s, hem - 175 * s, 19 * s, 24 * s); C2.finish(c, C2.SKIN, 3.2 * s / 0.62)

def bathroom(c, t, her=None):
    wall(c, 1520, (0.18, 0.20, 0.27), (0.13, 0.14, 0.20))
    for i in range(8):
        for j in range(8): c.set_source_rgba(1, 1, 1, 0.025 + 0.02 * ((i + j) % 2)); c.rectangle(i * 140, 200 + j * 140, 134, 134); c.fill()
    rbox(c, 300, 300, 480, 560, 40, (0.42, 0.48, 0.58))                # mirror
    c.set_source_rgba(1, 1, 1, 0.12); c.move_to(360, 360); c.line_to(460, 360); c.line_to(360, 520); c.close_path(); c.fill()
    glow(c, 540, 280, 400, (0.9, 0.92, 1.0), 0.25)
    if her is not None:
        x, gy, h = 540, 1820, 1000
        hx, hy, r = head_xy("w", x, gy, h)
        p = reach_pose("w", x, gy, h, {"arm_l": (x - 230, 1240), "arm_r": (x + 230, 1240)}, her)
        stand(c, "w", x, gy, h, p)
    rect(c, 180, 1230, 720, 60, (0.85, 0.86, 0.90))                    # sink counter
    rect(c, 220, 1290, 640, 300, (0.30, 0.30, 0.38))

def counter_kitchen(c, t, her=None, him=None, hug=0.0):
    wall(c, 1560)
    for k in range(4): rect(c, 60 + k * 250, 380, 220, 300, (0.22, 0.24, 0.32))   # upper cabinets
    rect(c, -20, 1180, 1120, 40, (0.36, 0.33, 0.36)); rect(c, -20, 1220, 1120, 340, (0.22, 0.22, 0.30))
    glow(c, 540, 700, 600, WARM, 0.22)
    if hug:    # she leans into him, the arms between them are hidden behind the bodies
        if him is not None: stand(c, "m", 600, 1800, 1050, dict(him, skip_arms=("arm_l",)))
        if her is not None: stand(c, "w", 450, 1800, 1000, dict(her, skip_arms=("arm_r",), lean=-6 * hug, head_tilt=her.get("head_tilt", 0) + 14 * hug))
        return
    if her is not None: stand(c, "w", 330, 1800, 1000, her)
    if him is not None: stand(c, "m", 770, 1800, 1050, him)
