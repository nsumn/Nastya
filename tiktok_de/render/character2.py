"""Rigged characters drawn in code, styled after the Nano Banana reference sheet.

person(c, x, gy, height, kind, pose) — kind 'w' or 'm'; front view.
pose keys (all optional):
  arm_l / arm_r : (shoulder_out_deg, elbow_bend_deg)   0 = hanging; out = away from the body; bend = forearm towards the chest
  leg_l / leg_r : (hip_out_deg, knee_bend_deg)
  lean (deg), head_tilt (deg), look (-1..1 horizontal, -1..1 vertical)
  emo: calm | smile | happy | sad | worried | angry | cry | closed
  blink (bool), talk (0..1 mouth open), hide_legs (bool)
"""
import math
import cairocffi as cairo

def hexc(h): h = h.lstrip("#"); return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
LINE = hexc("2A1F22")
SKIN, SKIN_SH, BLUSH = hexc("F8D2B8"), hexc("E7B49B"), hexc("F49A92")
W_TOP, W_TOP_SH, W_TOP_DK = hexc("C98A92"), hexc("B5767F"), hexc("A6676F")     # dusty rose sweater
M_TOP, M_TOP_SH, M_TOP_DK = hexc("93B096"), hexc("7E9C82"), hexc("6F8C73")     # sage sweater
W_PANTS, M_PANTS = hexc("23233A"), hexc("3B4561")
W_SHOE, M_SHOE = hexc("5B3A3E"), hexc("26263A")
W_HAIR, W_HAIR_D, W_HAIR_L = hexc("5A3626"), hexc("43271B"), hexc("8A6250")
M_HAIR, M_HAIR_D, M_HAIR_L = hexc("3A2A24"), hexc("2A1E1A"), hexc("6A544A")
IRIS, LIP = hexc("3B2620"), hexc("D48B8E")
GOLD = hexc("E6B85C")

DEFAULT = dict(arm_l=(6, 8), arm_r=(6, 8), leg_l=(2, 0), leg_r=(2, 0), lean=0.0, head_tilt=0.0, look=(0.0, 0.0),
               emo="calm", blink=False, talk=0.0, hide_legs=False, fore_k=1.0, thumbs=True)

# ---------------------------------------------------------------- primitives
def finish(c, fill, lw, line=LINE):
    if fill is not None: c.set_source_rgb(*fill); c.fill_preserve()
    c.set_source_rgb(*line); c.set_line_width(lw); c.set_line_join(cairo.LINE_JOIN_ROUND); c.set_line_cap(cairo.LINE_CAP_ROUND); c.stroke()

def ellipse(c, x, y, rx, ry, rot=0.0):
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(rx, ry); c.arc(0, 0, 1, 0, 2 * math.pi); c.restore()

def capsule_path(c, p0, p1, r0, r1):
    (x0, y0), (x1, y1) = p0, p1
    a = math.atan2(y1 - y0, x1 - x0)
    nx, ny = -math.sin(a), math.cos(a)
    c.move_to(x0 + nx * r0, y0 + ny * r0); c.line_to(x1 + nx * r1, y1 + ny * r1)
    c.arc_negative(x1, y1, r1, a + math.pi / 2, a - math.pi / 2)
    c.line_to(x0 - nx * r0, y0 - ny * r0)
    c.arc_negative(x0, y0, r0, a - math.pi / 2, a - 1.5 * math.pi)
    c.close_path()

def limb(c, pts, width, col, lw):
    """one smooth tube through the joints: dark outline stroke, then the colour on top (no seams at the joints)"""
    for wdt, cc in ((width + 2 * lw, LINE), (width, col)):
        c.move_to(*pts[0]); [c.line_to(*q) for q in pts[1:]]
        c.set_source_rgb(*cc); c.set_line_width(wdt); c.set_line_cap(cairo.LINE_CAP_ROUND); c.set_line_join(cairo.LINE_JOIN_ROUND); c.stroke()

def seg_end(p, ang_deg, length):
    a = math.radians(ang_deg)
    return p[0] + math.sin(a) * length, p[1] + math.cos(a) * length

# ---------------------------------------------------------------- figure
class Spec:
    def __init__(self, kind):
        w = kind == "w"
        self.w = w
        self.head_y, self.head_r = (872, 94) if w else (874, 98)
        self.neck_y = 752 if w else 748
        self.sh_x, self.sh_y = (100, 738) if w else (124, 742)
        self.hem_y = 470 if w else 478
        self.hip_x, self.hip_y = (40, 470) if w else (50, 478)
        self.upper, self.fore = (175, 165) if w else (185, 170)
        self.thigh, self.shin = (230, 215) if w else (235, 220)
        self.sleeve = (36, 33) if w else (38, 34)
        self.leg_w = (34, 24) if w else (40, 34)
        self.top, self.top_sh, self.top_dk = (W_TOP, W_TOP_SH, W_TOP_DK) if w else (M_TOP, M_TOP_SH, M_TOP_DK)
        self.pants, self.shoe = (W_PANTS, W_SHOE) if w else (M_PANTS, M_SHOE)

def person(c, x, gy, height, kind, pose=None):
    p = dict(DEFAULT); p.update(pose or {})
    hands = {}
    S = Spec(kind); s = height / 1000.0
    lw = 3.2 * s / 0.62
    def P(lx, ly): return (x + lx * s, gy - ly * s)
    c.save()
    c.translate(x, gy); c.rotate(math.radians(p["lean"])); c.translate(-x, -gy)

    # ---- back hair (woman): long wavy mass behind the shoulders
    hx, hy = P(0, S.head_y); r = S.head_r * s
    tilt = math.radians(p["head_tilt"])
    if S.w:
        c.save(); c.translate(hx, hy + r); c.rotate(tilt); c.translate(-hx, -(hy + r))
        hair_back_path(c, hx, hy, r); finish(c, W_HAIR_D, lw)
        c.restore()

    # ---- joints
    shL, shR = P(-S.sh_x + 12, S.sh_y - 18), P(S.sh_x - 12, S.sh_y - 18)
    hpL, hpR = P(-S.hip_x, S.hip_y + 20), P(S.hip_x, S.hip_y + 20)

    # ---- legs
    if not p["hide_legs"]:
        for side, hp, key in ((-1, hpL, "leg_l"), (1, hpR, "leg_r")):
            out, bend = p[key]
            a1 = side * out; a2 = a1 - side * bend * 0.3
            knee = seg_end(hp, a1, S.thigh * s); ank = seg_end(knee, a2, S.shin * s)
            limb(c, [hp, knee, ank], (S.leg_w[0] + S.leg_w[1]) * s, S.pants, lw)
            if S.w:  # ankle skin + ballet flat
                ellipse(c, ank[0], ank[1] + 6 * s, 15 * s, 14 * s); finish(c, SKIN, lw * 0.8)
                ellipse(c, ank[0] + side * 6 * s, ank[1] + 22 * s, 34 * s, 15 * s); finish(c, S.shoe, lw)
            else:
                ellipse(c, ank[0] + side * 8 * s, ank[1] + 18 * s, 44 * s, 20 * s); finish(c, S.shoe, lw)

    # ---- neck (behind the sweater so its lower end is hidden)
    nk0, nk1 = P(0, S.neck_y - 10), P(0, S.head_y - S.head_r * 0.55)
    capsule_path(c, nk0, nk1, (26 if S.w else 33) * s, (24 if S.w else 31) * s); finish(c, SKIN_SH, lw)
    # ---- torso: oversized sweater
    sx, sy, hy_ = S.sh_x, S.sh_y, S.hem_y
    def torso_path():
        c.move_to(*P(-36, S.neck_y + 4))
        c.curve_to(*P(-60, S.neck_y + 2), *P(-sx + 10, sy + 4), *P(-sx, sy - 22))
        c.curve_to(*P(-sx - 14, sy - 120), *P(-sx - 20, hy_ + 140), *P(-sx - 12, hy_ + 30))
        c.line_to(*P(-sx + 2, hy_)); c.line_to(*P(sx - 2, hy_)); c.line_to(*P(sx + 12, hy_ + 30))
        c.curve_to(*P(sx + 20, hy_ + 140), *P(sx + 14, sy - 120), *P(sx, sy - 22))
        c.curve_to(*P(sx - 10, sy + 4), *P(60, S.neck_y + 2), *P(36, S.neck_y + 4))
        c.curve_to(*P(22, S.neck_y - 20), *P(-22, S.neck_y - 20), *P(-36, S.neck_y + 4)); c.close_path()
    torso_path(); finish(c, S.top, lw)
    # side shading
    c.save(); torso_path(); c.clip()
    c.set_source_rgb(*S.top_sh); c.move_to(*P(sx - 45, sy)); c.curve_to(*P(sx - 30, sy - 150), *P(sx - 40, hy_ + 120), *P(sx - 25, hy_)); c.line_to(*P(sx + 60, hy_)); c.line_to(*P(sx + 60, sy)); c.close_path(); c.fill()
    c.restore()
    # ribbed hem band
    band = [P(-sx + 2, hy_), P(sx - 2, hy_), P(sx - 6, hy_ + 30), P(-sx + 6, hy_ + 30)]
    c.move_to(*band[0]); [c.line_to(*q) for q in band[1:]]; c.close_path(); finish(c, S.top_dk if False else S.top_sh, lw)
    c.set_source_rgb(*S.top_dk); c.set_line_width(lw * 0.5)
    for k in range(int(2 * sx / 14)):
        bx = -sx + 10 + k * 14; c.move_to(*P(bx, hy_ + 4)); c.line_to(*P(bx, hy_ + 26)); c.stroke()

    # ---- neck + ribbed collar
    nw = 40 if S.w else 48
    def collar():
        c.move_to(*P(-nw, S.neck_y + 6)); c.curve_to(*P(-nw * 0.6, S.neck_y - 22), *P(nw * 0.6, S.neck_y - 22), *P(nw, S.neck_y + 6))
    collar(); c.set_source_rgb(*LINE); c.set_line_width(11 * s + 2 * lw); c.set_line_cap(cairo.LINE_CAP_ROUND); c.stroke()
    collar(); c.set_source_rgb(*S.top_sh); c.set_line_width(11 * s); c.stroke()

    # ---- arms (puffy sleeves, ribbed cuffs, hands)
    for side, sh, key in ((-1, shL, "arm_l"), (1, shR, "arm_r")):
        out, bend = p[key]
        a1 = side * out; a2 = a1 - side * bend
        fk = p["fore_k"]                               # < 1: forearm foreshortened (pointing towards the camera)
        el = seg_end(sh, a1, S.upper * s); wr = seg_end(el, a2, S.fore * s * fk)
        cuff0 = seg_end(el, a2, S.fore * s * fk * 0.78)
        r0, r1 = S.sleeve[0] * s, S.sleeve[1] * s
        limb(c, [sh, el, cuff0], (r0 + r1) * 1.0, S.top if side < 0 else S.top_sh, lw)
        limb(c, [cuff0, wr], r1 * 1.3, S.top_sh, lw)
        hand = seg_end(wr, a2, 26 * s); hands[key] = (hand, a2)
        ellipse(c, hand[0], hand[1], 19 * s, 27 * s, -math.radians(a2)); finish(c, SKIN, lw * 0.9)
        th = seg_end(wr, a2 - side * 35, 18 * s)
        if p["thumbs"]: ellipse(c, th[0] - side * 10 * s, th[1], 7 * s, 13 * s, -math.radians(a2 - side * 35)); finish(c, SKIN, lw * 0.8)

    # ---- back hair over the shoulders (woman): drawn on top of the sweater, but not over the neck/chest
    if S.w:
        c.save()
        c.rectangle(x - 3000, 0, 6000, 6000)
        c.rectangle(hx + 0.62 * r, hy + 0.55 * r, -1.24 * r, 3 * r)      # cut-out for the neck and chest (opposite winding)
        c.set_fill_rule(cairo.FILL_RULE_EVEN_ODD); c.clip()
        c.translate(hx, hy + r); c.rotate(tilt); c.translate(-hx, -(hy + r))
        hair_back_path(c, hx, hy, r); finish(c, W_HAIR_D, lw)
        c.restore()

    # ---- head
    c.save(); c.translate(hx, hy + r); c.rotate(tilt); c.translate(-hx, -(hy + r))
    head(c, hx, hy, r, S.w, p, lw)
    c.restore()
    c.restore()
    return hands

# ---------------------------------------------------------------- head
def hair_back_path(c, hx, hy, r):
    """shoulder-length soft waves, one continuous mass"""
    c.move_to(hx, hy - 1.18 * r)
    c.curve_to(hx + 1.15 * r, hy - 1.2 * r, hx + 1.35 * r, hy - 0.2 * r, hx + 1.28 * r, hy + 0.45 * r)
    c.curve_to(hx + 1.5 * r, hy + 0.75 * r, hx + 1.25 * r, hy + 1.0 * r, hx + 1.42 * r, hy + 1.3 * r)
    c.curve_to(hx + 1.55 * r, hy + 1.6 * r, hx + 1.3 * r, hy + 1.85 * r, hx + 1.05 * r, hy + 1.8 * r)
    c.curve_to(hx + 0.9 * r, hy + 1.75 * r, hx + 0.8 * r, hy + 1.7 * r, hx + 0.65 * r, hy + 1.72 * r)
    c.line_to(hx - 0.65 * r, hy + 1.72 * r)
    c.curve_to(hx - 0.8 * r, hy + 1.7 * r, hx - 0.9 * r, hy + 1.75 * r, hx - 1.05 * r, hy + 1.8 * r)
    c.curve_to(hx - 1.3 * r, hy + 1.85 * r, hx - 1.55 * r, hy + 1.6 * r, hx - 1.42 * r, hy + 1.3 * r)
    c.curve_to(hx - 1.25 * r, hy + 1.0 * r, hx - 1.5 * r, hy + 0.75 * r, hx - 1.28 * r, hy + 0.45 * r)
    c.curve_to(hx - 1.35 * r, hy - 0.2 * r, hx - 1.15 * r, hy - 1.2 * r, hx, hy - 1.18 * r); c.close_path()

PRESETS = {
    #            H     widest  jaw   jaw_y  chin  | eye_y  gap   eye_k | nose_y  mouth_y | ear_y
    "now":     (1.16, 0.12, 0.72, 0.70, 0.28,   0.02, 0.36, 1.00,   0.14, 0.63,   0.12),
    "oval":    (1.06, 0.00, 0.66, 0.62, 0.26,   0.10, 0.34, 1.12,   0.22, 0.60,   0.16),
    "soft":    (1.00, 0.05, 0.78, 0.60, 0.36,   0.12, 0.35, 1.15,   0.25, 0.60,   0.18),
    "heart":   (1.08, -0.05, 0.58, 0.58, 0.22,  0.08, 0.35, 1.12,   0.20, 0.58,   0.14),
}
PROP = {"name": "oval"}
MAN = {"adult": True, "beard": "stubble"}      # adult = longer face, square jaw, narrow hooded eyes; beard: none | stubble | short
def prop(w):
    H, wid, jw, jy, chw, ey, gap, ek, ny, my, ary = PRESETS[PROP["name"]]
    if not w and MAN["adult"]: H, wid, jw, jy, chw, ary = 1.13, 0.05, 0.90, 0.66, 0.40, 0.14
    elif not w: H += 0.08; jw += 0.10; chw += 0.06; jy += 0.04; my += 0.04; ny += 0.02
    elif PROP["name"] == "oval": jw, chw = 0.76, 0.36          # her: softer, wider chin
    Rk = 1.0 if w else (0.88 if MAN["adult"] else 0.98)
    return dict(H=H, wid=wid, jw=jw, jy=jy, chw=chw, ey=ey, gap=gap, ek=ek, ny=ny, my=my, ary=ary, Rk=Rk)

JAW = [((0.55, -1.03), (0.88, -0.72), (0.88, -0.20)),     # right half, top -> chin (r units); mirrored for the left
       ((0.88, 0.25), (0.86, 0.50), (0.80, 0.70)),
       ((0.72, 0.88), (0.45, 1.02), (0.30, 1.07)),
       ((0.18, 1.11), (0.08, 1.11), (0.00, 1.11))]
def face_path(c, x, y, r, w):
    if not w and MAN["adult"]:
        c.move_to(x, y - 1.03 * r)
        for seg in JAW: c.curve_to(*[v for (a, b) in seg for v in (x + a * r, y + b * r)])
        pts = [(0.0, -1.03)] + [q for seg in JAW for q in seg]
        rev = pts[::-1]
        for i in range(1, len(rev), 3):
            c.curve_to(*[v for (a, b) in rev[i:i + 3] for v in (x - a * r, y + b * r)])
        c.close_path(); return
    q = prop(w)
    R = r * q["Rk"]; H = r * q["H"]
    jw, chw, wid, jy = q["jw"], q["chw"], q["wid"], q["jy"]
    top = y - H * 0.92
    c.move_to(x, top)
    c.curve_to(x + R * 0.62, top, x + R, y - H * 0.55, x + R, y + wid * r)
    c.curve_to(x + R, y + (wid + 0.3) * r, x + R * jw * 1.08, y + (jy - 0.1) * r, x + R * jw, y + jy * r)
    c.curve_to(x + R * jw * 0.85, y + (jy + 0.22) * r, x + R * chw, y + H * 0.98, x, y + H * 0.98)
    c.curve_to(x - R * chw, y + H * 0.98, x - R * jw * 0.85, y + (jy + 0.22) * r, x - R * jw, y + jy * r)
    c.curve_to(x - R * jw * 1.08, y + (jy - 0.1) * r, x - R, y + (wid + 0.3) * r, x - R, y + wid * r)
    c.curve_to(x - R, y - H * 0.55, x - R * 0.62, top, x, top); c.close_path()

def head(c, x, y, r, w, p, lw):
    emo = p["emo"]; lx, ly = p["look"]
    # ears
    for sd in (-1, 1):
        ellipse(c, x + sd * (prop(w)["Rk"] + 0.02 * (not w)) * r, y + prop(w)["ary"] * r, 0.15 * r, 0.22 * r); finish(c, SKIN_SH, lw * 0.9)
    face_path(c, x, y, r, w); finish(c, SKIN, lw)
    fx = x + lx * 0.14 * r; fy = y + ly * 0.06 * r          # features follow the gaze (head turn feel)
    adult = not w and MAN["adult"] and p.get("style", "dots") == "dots"
    if adult:
        man_face(c, x, y, fx, fy, r, p, lw)
    # stubble (man)
    if not w and not adult:
        c.save(); face_path(c, x, y, r, w); c.clip()
        g = cairo.LinearGradient(0, fy + 0.40 * r, 0, fy + 1.1 * r)
        g.add_color_stop_rgba(0, 0.45, 0.33, 0.30, 0.0); g.add_color_stop_rgba(0.4, 0.45, 0.33, 0.30, 0.09); g.add_color_stop_rgba(1, 0.45, 0.33, 0.30, 0.11)
        c.set_source(g); c.rectangle(x - 2 * r, fy + 0.38 * r, 4 * r, r); c.fill()
        c.restore()
    # blush
    for sd in ((-1, 1) if not adult else ()):
        g = cairo.RadialGradient(fx + sd * 0.52 * r, fy + 0.30 * r, 0, fx + sd * 0.52 * r, fy + 0.30 * r, 0.2 * r)
        a = 0.55 if w else 0.22
        if emo in ("cry", "angry"): a += 0.15
        g.add_color_stop_rgba(0, *BLUSH, a); g.add_color_stop_rgba(1, *BLUSH, 0)
        c.set_source(g); c.arc(fx + sd * 0.52 * r, fy + 0.30 * r, 0.2 * r, 0, 2 * math.pi); c.fill()
    style = p.get("style", "dots")
    if adult:
        pass
    elif style != "dots":
        FACE_STYLES[style](c, fx, fy, r, w, p, lw)
    else:
        # eyes
        q = prop(w); gap = q["gap"] * r; ey = fy + q["ey"] * r; ek = q["ek"]
        closed = p["blink"] or emo in ("closed", "happy")
        lid = {"sad": 0.38, "cry": 0.42, "worried": 0.1, "angry": 0.3}.get(emo, 0.0)
        for sd in (-1, 1):
            ex = fx + sd * gap
            if closed:
                c.move_to(ex - 0.13 * r, ey)
                if emo == "happy": c.curve_to(ex - 0.05 * r, ey - 0.1 * r, ex + 0.05 * r, ey - 0.1 * r, ex + 0.13 * r, ey)
                else: c.curve_to(ex - 0.05 * r, ey + 0.07 * r, ex + 0.05 * r, ey + 0.07 * r, ex + 0.13 * r, ey)
                c.set_source_rgb(*LINE); c.set_line_width(lw * 1.1); c.stroke()
            else:
                ellipse(c, ex, ey, 0.105 * r * ek, 0.13 * r * ek); c.set_source_rgb(*IRIS); c.fill()
                c.set_source_rgb(1, 1, 1); c.arc(ex + 0.035 * r + lx * 0.02 * r, ey - 0.045 * r, 0.035 * r, 0, 2 * math.pi); c.fill()
                c.arc(ex - 0.03 * r, ey + 0.05 * r, 0.015 * r, 0, 2 * math.pi); c.fill()
                rx_, ry_ = 0.105 * r * ek, 0.13 * r * ek
                if lid:
                    # lowered eyelid: one clean slanted edge; sad/cry droop at the outer corner, angry at the inner one
                    base = ey - ry_ + lid * 2 * ry_
                    d_in, d_out = {"sad": (-0.015, 0.035), "cry": (-0.015, 0.04), "worried": (-0.02, 0.02), "angry": (0.04, -0.02)}.get(emo, (0, 0))
                    xi, xo = ex - sd * rx_ * 1.35, ex + sd * rx_ * 1.35
                    yi, yo = base + d_in * r, base + d_out * r
                    c.save(); ellipse(c, ex, ey, rx_ * 1.05, ry_ * 1.05); c.clip()
                    c.move_to(xi, yi); c.curve_to(ex - sd * rx_ * 0.4, (yi + yo) / 2 - 0.02 * r, ex + sd * rx_ * 0.4, (yi + yo) / 2 - 0.02 * r, xo, yo)
                    c.line_to(xo, ey - 0.4 * r); c.line_to(xi, ey - 0.4 * r); c.close_path()
                    c.set_source_rgb(*SKIN); c.fill(); c.restore()
                    c.move_to(xi + sd * 0.02 * r, yi); c.curve_to(ex - sd * rx_ * 0.4, (yi + yo) / 2 - 0.02 * r, ex + sd * rx_ * 0.4, (yi + yo) / 2 - 0.02 * r, xo, yo)
                    c.set_source_rgb(*LINE); c.set_line_width(lw * (1.15 if w else 1.0)); c.set_line_cap(cairo.LINE_CAP_ROUND); c.stroke()
                    if w:
                        c.move_to(xo, yo); c.line_to(xo + sd * 0.05 * r, yo + (0.02 if emo in ("sad", "cry") else -0.04) * r); c.set_line_width(lw * 0.8); c.stroke()
                else:
                    # upper lid line + lash flick
                    c.move_to(ex - 0.14 * r, ey - 0.02 * r); c.curve_to(ex - 0.06 * r, ey - 0.15 * r, ex + 0.06 * r, ey - 0.15 * r, ex + 0.15 * r, ey - 0.05 * r)
                    c.set_source_rgb(*LINE); c.set_line_width(lw * (1.05 if w else 0.9)); c.stroke()
                    if w:
                        c.move_to(ex + sd * 0.14 * r, ey - 0.05 * r); c.line_to(ex + sd * 0.21 * r, ey - 0.11 * r); c.set_line_width(lw * 0.8); c.stroke()
            # brows
            up = {"sad": 0.10, "cry": 0.12, "worried": 0.13, "angry": -0.10, "happy": 0.03, "smile": 0.02}.get(emo, 0.0)
            bx_in, bx_out = ex - sd * 0.08 * r, ex + sd * 0.17 * r
            by = ey - 0.27 * r
            c.move_to(bx_in, by - up * r); c.curve_to(ex, by - 0.06 * r - up * 0.4 * r, ex + sd * 0.1 * r, by - 0.05 * r, bx_out, by + 0.02 * r)
            c.set_source_rgb(*(W_HAIR_D if w else M_HAIR_D)); c.set_line_width(lw * (1.2 if w else 2.0)); c.stroke()
        # tear
        if emo == "cry":
            tx, ty = fx + gap * 0.95, ey + 0.16 * r
            c.move_to(tx, ty); c.curve_to(tx - 0.06 * r, ty + 0.1 * r, tx - 0.05 * r, ty + 0.17 * r, tx, ty + 0.17 * r)
            c.curve_to(tx + 0.05 * r, ty + 0.17 * r, tx + 0.06 * r, ty + 0.1 * r, tx, ty); c.set_source_rgb(0.62, 0.82, 0.98); c.fill()
        # nose
        ny = q["ny"]; c.move_to(fx + 0.02 * r, fy + ny * r); c.curve_to(fx + 0.06 * r, fy + (ny + 0.1) * r, fx + 0.05 * r, fy + (ny + 0.15) * r, fx - 0.03 * r, fy + (ny + 0.16) * r)
        c.set_source_rgb(*SKIN_SH); c.set_line_width(lw * 0.9); c.stroke()
        # mouth
        my = fy + q["my"] * r; mw = 0.15 * r if w else 0.17 * r
        talk = p["talk"]
        if talk > 0.05 or emo == "happy":
            o = max(talk, 0.7 if emo == "happy" else 0)
            c.move_to(fx - mw, my - 0.01 * r); c.curve_to(fx - mw * 0.6, my + (0.04 + 0.16 * o) * r, fx + mw * 0.6, my + (0.04 + 0.16 * o) * r, fx + mw, my - 0.01 * r)
            c.curve_to(fx + mw * 0.5, my - 0.03 * r, fx - mw * 0.5, my - 0.03 * r, fx - mw, my - 0.01 * r); c.close_path()
            finish(c, hexc("7E3B3E"), lw * 0.8)
            if emo == "happy":
                c.move_to(fx - mw * 0.75, my); c.line_to(fx + mw * 0.75, my); c.line_to(fx + mw * 0.6, my + 0.04 * r); c.line_to(fx - mw * 0.6, my + 0.04 * r); c.close_path()
                c.set_source_rgb(1, 1, 1); c.fill()
        else:
            curve = {"neutral": 0.0, "calm": 0.03, "smile": 0.07, "closed": 0.05, "sad": -0.06, "cry": -0.07, "worried": -0.03, "angry": -0.05}.get(emo, 0.03)
            if w:  # soft lips
                c.move_to(fx - mw, my); c.curve_to(fx - mw * 0.4, my + 0.03 * r + curve * r, fx + mw * 0.4, my + 0.03 * r + curve * r, fx + mw, my)
                c.curve_to(fx + mw * 0.4, my + 0.09 * r + curve * 0.6 * r, fx - mw * 0.4, my + 0.09 * r + curve * 0.6 * r, fx - mw, my); c.close_path()
                c.set_source_rgb(*LIP); c.fill()
            c.move_to(fx - mw, my - curve * 0.3 * r); c.curve_to(fx - mw * 0.4, my + curve * r, fx + mw * 0.4, my + curve * r, fx + mw, my - curve * 0.3 * r)
            c.set_source_rgb(*LINE); c.set_line_width(lw * 0.85); c.stroke()
    # front hair
    if w:
        c.move_to(x - 0.15 * r, y - 1.2 * r)
        c.curve_to(x + 0.7 * r, y - 1.25 * r, x + 1.2 * r, y - 0.75 * r, x + 1.15 * r, y + 0.1 * r)
        c.curve_to(x + 1.12 * r, y + 0.55 * r, x + 1.05 * r, y + 0.85 * r, x + 0.95 * r, y + 1.05 * r)
        c.curve_to(x + 0.97 * r, y + 0.45 * r, x + 0.92 * r, y - 0.1 * r, x + 0.78 * r, y - 0.42 * r)
        c.curve_to(x + 0.45 * r, y - 0.55 * r, x + 0.05 * r, y - 0.62 * r, x - 0.2 * r, y - 0.92 * r)
        c.curve_to(x - 0.5 * r, y - 0.55 * r, x - 0.85 * r, y - 0.3 * r, x - 0.97 * r, y + 0.2 * r)
        c.curve_to(x - 1.0 * r, y + 0.55 * r, x - 0.98 * r, y + 0.85 * r, x - 0.92 * r, y + 1.05 * r)
        c.curve_to(x - 1.17 * r, y + 0.5 * r, x - 1.22 * r, y - 0.3 * r, x - 1.02 * r, y - 0.8 * r)
        c.curve_to(x - 0.82 * r, y - 1.15 * r, x - 0.5 * r, y - 1.22 * r, x - 0.15 * r, y - 1.2 * r); c.close_path()
        finish(c, W_HAIR, lw)
        c.set_source_rgb(*W_HAIR_L); c.set_line_width(lw * 0.6)
        for a, b, d in (((0.1, -1.08), (0.85, -0.5), 0.15), ((0.4, -1.1), (1.0, -0.05), 0.12), ((-0.6, -1.0), (-0.92, -0.15), -0.1), ((-0.9, 0.3), (-0.95, 0.9), -0.05)):
            c.move_to(x + a[0] * r, y + a[1] * r); c.curve_to(x + ((a[0] + b[0]) / 2 + d) * r, y + (a[1] + b[1]) / 2 * r, x + ((a[0] + b[0]) / 2 + d) * r, y + (a[1] + b[1]) / 2 * r, x + b[0] * r, y + b[1] * r); c.stroke()
        for sd in (-1, 1):
            c.set_source_rgb(*GOLD); c.arc(x + sd * 0.99 * r, y + 0.4 * r, 0.05 * r, 0, 2 * math.pi); c.fill()
    elif MAN["adult"]:
        c.move_to(x - 0.84 * r, y + 0.02 * r)
        c.curve_to(x - 0.99 * r, y - 0.25 * r, x - 1.02 * r, y - 0.9 * r, x - 0.72 * r, y - 1.22 * r)
        c.curve_to(x - 0.45 * r, y - 1.45 * r, x + 0.25 * r, y - 1.48 * r, x + 0.62 * r, y - 1.32 * r)
        c.curve_to(x + 0.92 * r, y - 1.18 * r, x + 1.02 * r, y - 0.8 * r, x + 0.98 * r, y - 0.4 * r)
        c.curve_to(x + 0.97 * r, y - 0.2 * r, x + 0.95 * r, y - 0.05 * r, x + 0.84 * r, y + 0.02 * r)    # right sideburn
        c.curve_to(x + 0.82 * r, y - 0.2 * r, x + 0.83 * r, y - 0.38 * r, x + 0.80 * r, y - 0.50 * r)    # temple
        c.curve_to(x + 0.55 * r, y - 0.66 * r, x + 0.05 * r, y - 0.70 * r, x - 0.30 * r, y - 0.86 * r)    # swept fringe
        c.curve_to(x - 0.42 * r, y - 0.74 * r, x - 0.65 * r, y - 0.62 * r, x - 0.80 * r, y - 0.50 * r)    # side part
        c.curve_to(x - 0.84 * r, y - 0.40 * r, x - 0.84 * r, y - 0.2 * r, x - 0.84 * r, y + 0.02 * r); c.close_path()
        finish(c, M_HAIR, lw)
        c.set_source_rgb(*M_HAIR_L); c.set_line_width(lw * 0.6)
        for a, b in (((-0.38, -1.28), (0.45, -0.95)), ((-0.15, -1.36), (0.75, -0.95)), ((0.2, -1.38), (0.92, -0.75))):
            c.move_to(x + a[0] * r, y + a[1] * r); c.curve_to(x + (a[0] + 0.35) * r, y + (a[1] - 0.02) * r, x + (b[0] - 0.15) * r, y + (b[1] - 0.18) * r, x + b[0] * r, y + b[1] * r); c.stroke()
        c.move_to(x - 0.30 * r, y - 0.86 * r); c.curve_to(x - 0.36 * r, y - 1.05 * r, x - 0.40 * r, y - 1.25 * r, x - 0.42 * r, y - 1.36 * r)   # parting
        c.set_source_rgb(*M_HAIR_D); c.set_line_width(lw * 0.8); c.stroke()
    else:
        c.move_to(x - 1.02 * r, y + 0.0 * r)
        c.curve_to(x - 1.15 * r, y - 0.9 * r, x - 0.65 * r, y - 1.42 * r, x + 0.05 * r, y - 1.42 * r)
        c.curve_to(x + 0.55 * r, y - 1.45 * r, x + 0.95 * r, y - 1.35 * r, x + 1.05 * r, y - 1.1 * r)     # quiff lifts
        c.curve_to(x + 1.15 * r, y - 0.8 * r, x + 1.1 * r, y - 0.3 * r, x + 1.03 * r, y + 0.0 * r)
        c.curve_to(x + 0.96 * r, y - 0.35 * r, x + 0.88 * r, y - 0.55 * r, x + 0.72 * r, y - 0.62 * r)
        c.curve_to(x + 0.45 * r, y - 0.55 * r, x + 0.1 * r, y - 0.62 * r, x - 0.1 * r, y - 0.82 * r)      # fringe swoop
        c.curve_to(x - 0.3 * r, y - 0.62 * r, x - 0.6 * r, y - 0.62 * r, x - 0.8 * r, y - 0.48 * r)
        c.curve_to(x - 0.92 * r, y - 0.32 * r, x - 0.98 * r, y - 0.15 * r, x - 1.02 * r, y + 0.0 * r); c.close_path()
        finish(c, M_HAIR, lw)
        c.set_source_rgb(*M_HAIR_L); c.set_line_width(lw * 0.6)
        for a, b in (((-0.5, -1.25), (0.15, -0.75)), ((0.05, -1.35), (0.7, -0.75)), ((0.5, -1.35), (0.98, -0.8))):
            c.move_to(x + a[0] * r, y + a[1] * r); c.curve_to(x + (a[0] + 0.3) * r, y + (a[1] + 0.05) * r, x + (b[0] - 0.1) * r, y + (b[1] - 0.2) * r, x + b[0] * r, y + b[1] * r); c.stroke()


# ---------------------------------------------------------------- alternative face styles
def _brows(c, fx, ey, r, w, lw, emo, gap, thick=1.0, arch=0.06, length=0.17, y_off=0.27):
    up = {"sad": 0.10, "cry": 0.12, "worried": 0.13, "angry": -0.10, "happy": 0.03, "smile": 0.02}.get(emo, 0.0)
    for sd in (-1, 1):
        ex = fx + sd * gap
        bx_in, bx_out = ex - sd * 0.09 * r, ex + sd * length * r
        by = ey - y_off * r
        c.move_to(bx_in, by - up * r); c.curve_to(ex, by - arch * r - up * 0.4 * r, ex + sd * 0.1 * r, by - arch * 0.8 * r, bx_out, by + 0.02 * r)
        c.set_source_rgb(*(W_HAIR_D if w else M_HAIR_D)); c.set_line_width(lw * thick); c.set_line_cap(cairo.LINE_CAP_ROUND); c.stroke()

def _closed(c, ex, ey, r, lw, happy):
    c.move_to(ex - 0.13 * r, ey)
    if happy: c.curve_to(ex - 0.05 * r, ey - 0.1 * r, ex + 0.05 * r, ey - 0.1 * r, ex + 0.13 * r, ey)
    else: c.curve_to(ex - 0.05 * r, ey + 0.07 * r, ex + 0.05 * r, ey + 0.07 * r, ex + 0.13 * r, ey)
    c.set_source_rgb(*LINE); c.set_line_width(lw * 1.1); c.set_line_cap(cairo.LINE_CAP_ROUND); c.stroke()

def _lid(c, ex, ey, r, sd, emo, rx, ry):
    lid = {"sad": 0.38, "cry": 0.42, "worried": 0.1, "angry": 0.3}.get(emo, 0.0)
    if not lid: return
    c.save(); ellipse(c, ex, ey, rx * 1.1, ry * 1.1); c.clip()
    tilt_in = {"sad": 1, "cry": 1, "worried": 1, "angry": -1}.get(emo, 0) * 0.04 * r
    yo = ey - ry + lid * 2 * ry
    c.move_to(ex - 0.3 * r, ey - 0.3 * r); c.line_to(ex + 0.3 * r, ey - 0.3 * r)
    c.line_to(ex + sd * 0.3 * r, yo - tilt_in * 0); c.line_to(ex - sd * 0.3 * r, yo + tilt_in); c.close_path()
    c.set_source_rgb(*SKIN); c.fill(); c.restore()

def _tear(c, tx, ty, r):
    c.move_to(tx, ty); c.curve_to(tx - 0.06 * r, ty + 0.1 * r, tx - 0.05 * r, ty + 0.17 * r, tx, ty + 0.17 * r)
    c.curve_to(tx + 0.05 * r, ty + 0.17 * r, tx + 0.06 * r, ty + 0.1 * r, tx, ty); c.set_source_rgb(0.62, 0.82, 0.98); c.fill()

def _mouth(c, fx, my, r, w, lw, emo, talk, mw, lips=True, full=1.0):
    if talk > 0.05 or emo == "happy":
        o = max(talk, 0.7 if emo == "happy" else 0)
        c.move_to(fx - mw, my - 0.01 * r); c.curve_to(fx - mw * 0.6, my + (0.04 + 0.16 * o) * r, fx + mw * 0.6, my + (0.04 + 0.16 * o) * r, fx + mw, my - 0.01 * r)
        c.curve_to(fx + mw * 0.5, my - 0.03 * r, fx - mw * 0.5, my - 0.03 * r, fx - mw, my - 0.01 * r); c.close_path()
        finish(c, hexc("7E3B3E"), lw * 0.8)
        if emo == "happy":
            c.move_to(fx - mw * 0.75, my); c.line_to(fx + mw * 0.75, my); c.line_to(fx + mw * 0.6, my + 0.04 * r); c.line_to(fx - mw * 0.6, my + 0.04 * r); c.close_path()
            c.set_source_rgb(1, 1, 1); c.fill()
        return
    curve = {"neutral": 0.0, "calm": 0.03, "smile": 0.07, "closed": 0.05, "sad": -0.06, "cry": -0.07, "worried": -0.03, "angry": -0.05}.get(emo, 0.03)
    if lips and w:
        # upper lip with cupid's bow + fuller lower lip
        c.move_to(fx - mw, my); c.curve_to(fx - mw * 0.5, my - 0.05 * r * full, fx - 0.03 * r, my - 0.06 * r * full, fx, my - 0.035 * r * full)
        c.curve_to(fx + 0.03 * r, my - 0.06 * r * full, fx + mw * 0.5, my - 0.05 * r * full, fx + mw, my)
        c.curve_to(fx + mw * 0.5, my + (0.09 * full + curve * 0.5) * r, fx - mw * 0.5, my + (0.09 * full + curve * 0.5) * r, fx - mw, my); c.close_path()
        c.set_source_rgb(*LIP); c.fill()
    c.move_to(fx - mw, my - curve * 0.3 * r); c.curve_to(fx - mw * 0.4, my + curve * r, fx + mw * 0.4, my + curve * r, fx + mw, my - curve * 0.3 * r)
    c.set_source_rgb(*LINE); c.set_line_width(lw * 0.8); c.stroke()

def style_almond(c, fx, fy, r, w, p, lw):
    """B: almond eyes with whites, iris + pupil, crease; straight nose; soft lips"""
    emo = p["emo"]; lx, ly = p["look"]; gap = 0.36 * r; ey = fy + 0.02 * r
    for sd in (-1, 1):
        ex = fx + sd * gap
        if p["blink"] or emo in ("closed", "happy"): _closed(c, ex, ey, r, lw, emo == "happy"); continue
        wd, hh = 0.19 * r, 0.085 * r
        def almond():
            c.move_to(ex - wd, ey + 0.01 * r); c.curve_to(ex - wd * 0.5, ey - hh * 1.4, ex + wd * 0.5, ey - hh * 1.4, ex + wd, ey - 0.02 * r)
            c.curve_to(ex + wd * 0.5, ey + hh, ex - wd * 0.5, ey + hh, ex - wd, ey + 0.01 * r); c.close_path()
        almond(); c.set_source_rgb(0.99, 0.97, 0.95); c.fill_preserve(); c.save(); c.clip()
        ix, iy = ex + lx * 0.05 * r, ey + 0.005 * r
        c.set_source_rgb(*IRIS); c.arc(ix, iy, 0.085 * r, 0, 2 * math.pi); c.fill()
        c.set_source_rgb(0.07, 0.05, 0.05); c.arc(ix, iy, 0.04 * r, 0, 2 * math.pi); c.fill()
        c.set_source_rgb(1, 1, 1); c.arc(ix + 0.03 * r, iy - 0.03 * r, 0.02 * r, 0, 2 * math.pi); c.fill()
        c.restore(); _lid(c, ex, ey, r, sd, emo, wd, hh * 1.2)
        c.move_to(ex - wd * 1.05, ey + 0.015 * r); c.curve_to(ex - wd * 0.5, ey - hh * 1.5, ex + wd * 0.5, ey - hh * 1.5, ex + wd * 1.08, ey - 0.03 * r)
        c.set_source_rgb(*LINE); c.set_line_width(lw * 1.1); c.stroke()
        if w: c.move_to(ex + sd * wd, ey - 0.03 * r); c.line_to(ex + sd * wd * 1.35, ey - 0.08 * r); c.set_line_width(lw * 0.8); c.stroke()
        c.move_to(ex - wd * 0.7, ey - hh * 1.7); c.curve_to(ex - wd * 0.2, ey - hh * 2.4, ex + wd * 0.4, ey - hh * 2.3, ex + wd * 0.8, ey - hh * 1.6)
        c.set_source_rgb(*SKIN_SH); c.set_line_width(lw * 0.6); c.stroke()
    _brows(c, fx, ey, r, w, lw, emo, gap, 1.2 if w else 2.0, 0.07, 0.2, 0.28)
    if emo == "cry": _tear(c, fx + gap, ey + 0.13 * r, r)
    c.move_to(fx + 0.02 * r, fy + 0.05 * r); c.curve_to(fx + 0.07 * r, fy + 0.22 * r, fx + 0.07 * r, fy + 0.3 * r, fx - 0.02 * r, fy + 0.33 * r)
    c.set_source_rgb(*SKIN_SH); c.set_line_width(lw * 0.9); c.stroke()
    _mouth(c, fx, fy + 0.6 * r, r, w, lw, emo, p["talk"], 0.17 * r)

def style_minimal(c, fx, fy, r, w, p, lw):
    """C: calm minimal — small soft-arc eyes looking down, tiny nose, thin smile (Scandinavian illustration)"""
    emo = p["emo"]; gap = 0.33 * r; ey = fy + 0.04 * r
    for sd in (-1, 1):
        ex = fx + sd * gap
        if p["blink"] or emo in ("closed", "happy", "smile"):
            _closed(c, ex, ey, r, lw, emo in ("happy", "smile")); continue
        ellipse(c, ex, ey + 0.01 * r, 0.05 * r, 0.06 * r); c.set_source_rgb(*LINE); c.fill()
        if emo in ("sad", "cry", "worried", "angry"):
            c.move_to(ex - 0.09 * r, ey - 0.06 * r + (0.03 if emo == "angry" else 0) * sd * r); c.line_to(ex + 0.09 * r, ey - 0.06 * r - (0.03 if emo == "angry" else -0.0) * sd * r)
            c.set_line_width(lw); c.stroke()
        if w: c.move_to(ex + sd * 0.07 * r, ey - 0.03 * r); c.line_to(ex + sd * 0.13 * r, ey - 0.07 * r); c.set_line_width(lw * 0.8); c.stroke()
    _brows(c, fx, ey, r, w, lw, emo, gap, 0.9 if w else 1.6, 0.04, 0.13, 0.22)
    if emo == "cry": _tear(c, fx + gap, ey + 0.1 * r, r)
    c.move_to(fx - 0.03 * r, fy + 0.3 * r); c.curve_to(fx, fy + 0.33 * r, fx + 0.03 * r, fy + 0.33 * r, fx + 0.05 * r, fy + 0.3 * r)
    c.set_source_rgb(*SKIN_SH); c.set_line_width(lw * 0.9); c.stroke()
    _mouth(c, fx, fy + 0.55 * r, r, w, lw, emo, p["talk"], 0.12 * r, lips=False)

def style_big(c, fx, fy, r, w, p, lw):
    """D: expressive — big round eyes with whites and double highlight (Pixar-like but adult)"""
    emo = p["emo"]; lx, ly = p["look"]; gap = 0.37 * r; ey = fy + 0.02 * r
    for sd in (-1, 1):
        ex = fx + sd * gap
        if p["blink"] or emo in ("closed", "happy"): _closed(c, ex, ey, r, lw, emo == "happy"); continue
        ellipse(c, ex, ey, 0.17 * r, 0.15 * r); finish(c, (0.99, 0.97, 0.95), lw * 0.9)
        c.save(); ellipse(c, ex, ey, 0.17 * r, 0.15 * r); c.clip()
        ix = ex + lx * 0.05 * r
        c.set_source_rgb(*IRIS); c.arc(ix, ey + 0.01 * r, 0.11 * r, 0, 2 * math.pi); c.fill()
        c.set_source_rgb(0.07, 0.05, 0.05); c.arc(ix, ey + 0.01 * r, 0.055 * r, 0, 2 * math.pi); c.fill()
        c.set_source_rgb(1, 1, 1); c.arc(ix + 0.04 * r, ey - 0.04 * r, 0.03 * r, 0, 2 * math.pi); c.fill(); c.arc(ix - 0.035 * r, ey + 0.05 * r, 0.014 * r, 0, 2 * math.pi); c.fill()
        c.restore(); _lid(c, ex, ey, r, sd, emo, 0.17 * r, 0.15 * r)
        c.move_to(ex - 0.18 * r, ey - 0.01 * r); c.curve_to(ex - 0.1 * r, ey - 0.19 * r, ex + 0.1 * r, ey - 0.19 * r, ex + 0.18 * r, ey - 0.02 * r)
        c.set_source_rgb(*LINE); c.set_line_width(lw * 1.3); c.stroke()
        if w:
            for k in range(2): c.move_to(ex + sd * (0.15 + 0.03 * k) * r, ey - (0.07 + 0.04 * k) * r); c.line_to(ex + sd * (0.21 + 0.03 * k) * r, ey - (0.12 + 0.04 * k) * r); c.set_line_width(lw * 0.8); c.stroke()
    _brows(c, fx, ey, r, w, lw, emo, gap, 1.3 if w else 2.2, 0.08, 0.2, 0.33)
    if emo == "cry": _tear(c, fx + gap, ey + 0.17 * r, r)
    ellipse(c, fx, fy + 0.3 * r, 0.06 * r, 0.04 * r); c.set_source_rgb(*SKIN_SH); c.fill()
    _mouth(c, fx, fy + 0.58 * r, r, w, lw, emo, p["talk"], 0.16 * r)

def style_elegant(c, fx, fy, r, w, p, lw):
    """E: elegant / fashion illustration — half-lidded long eyes, heavy lash line, defined nose, no blush look"""
    emo = p["emo"]; lx, ly = p["look"]; gap = 0.37 * r; ey = fy + 0.03 * r
    for sd in (-1, 1):
        ex = fx + sd * gap
        if p["blink"] or emo in ("closed", "happy"): _closed(c, ex, ey, r, lw, emo == "happy"); continue
        wd = 0.2 * r
        c.move_to(ex - wd, ey); c.curve_to(ex - wd * 0.4, ey - 0.07 * r, ex + wd * 0.4, ey - 0.07 * r, ex + wd, ey - 0.015 * r)
        c.curve_to(ex + wd * 0.4, ey + 0.06 * r, ex - wd * 0.4, ey + 0.06 * r, ex - wd, ey); c.close_path()
        c.set_source_rgb(0.99, 0.97, 0.95); c.fill_preserve(); c.save(); c.clip()
        ix = ex + lx * 0.05 * r
        c.set_source_rgb(*IRIS); c.arc(ix, ey + 0.015 * r, 0.065 * r, 0, 2 * math.pi); c.fill()
        c.set_source_rgb(0.07, 0.05, 0.05); c.arc(ix, ey + 0.015 * r, 0.03 * r, 0, 2 * math.pi); c.fill()
        c.set_source_rgb(1, 1, 1); c.arc(ix + 0.022 * r, ey - 0.01 * r, 0.014 * r, 0, 2 * math.pi); c.fill()
        c.restore(); _lid(c, ex, ey, r, sd, emo, wd, 0.06 * r)
        c.move_to(ex - wd * 1.05, ey + 0.005 * r); c.curve_to(ex - wd * 0.4, ey - 0.085 * r, ex + wd * 0.4, ey - 0.085 * r, ex + wd * 1.15, ey - 0.04 * r)
        c.set_source_rgb(*LINE); c.set_line_width(lw * (1.6 if w else 1.1)); c.stroke()
        c.move_to(ex - wd * 0.7, ey - 0.12 * r); c.curve_to(ex - wd * 0.1, ey - 0.16 * r, ex + wd * 0.5, ey - 0.15 * r, ex + wd * 0.9, ey - 0.09 * r)
        c.set_source_rgb(*SKIN_SH); c.set_line_width(lw * 0.7); c.stroke()
    _brows(c, fx, ey, r, w, lw, emo, gap, 1.1 if w else 2.0, 0.05, 0.22, 0.25)
    if emo == "cry": _tear(c, fx + gap, ey + 0.1 * r, r)
    c.move_to(fx + 0.0 * r, fy - 0.02 * r); c.curve_to(fx + 0.04 * r, fy + 0.18 * r, fx + 0.09 * r, fy + 0.3 * r, fx + 0.03 * r, fy + 0.34 * r)
    c.curve_to(fx, fy + 0.35 * r, fx - 0.04 * r, fy + 0.34 * r, fx - 0.06 * r, fy + 0.32 * r)
    c.set_source_rgb(*SKIN_SH); c.set_line_width(lw * 0.9); c.stroke()
    _mouth(c, fx, fy + 0.62 * r, r, w, lw, emo, p["talk"], 0.17 * r, full=1.25)

def style_soft(c, fx, fy, r, w, p, lw):
    """F: soft storybook — oval dark eyes with lower lash line, rosy cheeks, button nose, gentle smile"""
    emo = p["emo"]; lx, ly = p["look"]; gap = 0.35 * r; ey = fy + 0.05 * r
    for sd in (-1, 1):
        ex = fx + sd * gap
        if p["blink"] or emo in ("closed", "happy"): _closed(c, ex, ey, r, lw, emo == "happy"); continue
        ellipse(c, ex + lx * 0.03 * r, ey, 0.075 * r, 0.1 * r); c.set_source_rgb(*IRIS); c.fill()
        c.set_source_rgb(1, 1, 1); c.arc(ex + lx * 0.03 * r + 0.025 * r, ey - 0.035 * r, 0.025 * r, 0, 2 * math.pi); c.fill()
        _lid(c, ex, ey, r, sd, emo, 0.075 * r, 0.1 * r)
        c.move_to(ex - 0.13 * r, ey - 0.06 * r); c.curve_to(ex - 0.05 * r, ey - 0.15 * r, ex + 0.06 * r, ey - 0.15 * r, ex + 0.14 * r, ey - 0.08 * r)
        c.set_source_rgb(*LINE); c.set_line_width(lw * 1.0); c.stroke()
        if w: c.move_to(ex + sd * 0.13 * r, ey - 0.09 * r); c.line_to(ex + sd * 0.19 * r, ey - 0.14 * r); c.set_line_width(lw * 0.8); c.stroke()
    _brows(c, fx, ey, r, w, lw, emo, gap, 1.0 if w else 1.8, 0.05, 0.15, 0.3)
    if emo == "cry": _tear(c, fx + gap, ey + 0.12 * r, r)
    c.move_to(fx - 0.04 * r, fy + 0.32 * r); c.curve_to(fx - 0.02 * r, fy + 0.36 * r, fx + 0.03 * r, fy + 0.36 * r, fx + 0.05 * r, fy + 0.32 * r)
    c.set_source_rgb(*SKIN_SH); c.set_line_width(lw * 1.0); c.stroke()
    _mouth(c, fx, fy + 0.58 * r, r, w, lw, emo, p["talk"], 0.13 * r, full=0.9)

FACE_STYLES = {"almond": style_almond, "minimal": style_minimal, "big": style_big, "elegant": style_elegant, "soft": style_soft}


# ---------------------------------------------------------------- adult man face
SHADE = hexc("C9927C")
def _stroke(c, col, width, a=1.0):
    c.set_source_rgba(*col, a); c.set_line_width(width); c.set_line_cap(cairo.LINE_CAP_ROUND); c.set_line_join(cairo.LINE_JOIN_ROUND); c.stroke()

def man_face(c, x, y, fx, fy, r, p, lw):
    """30+ man: square jaw, beard shadow, narrow hooded eyes, heavy straight brows, defined nose, wide flat mouth"""
    emo = p["emo"]; lx, ly = p["look"]; talk = p["talk"]
    # beard shadow / short beard on jaw, chin and upper lip
    bd = MAN["beard"]
    if bd != "none":
        c.save(); face_path(c, x, y, r, False); c.clip()
        top = fy + 0.30 * r
        c.move_to(x - 1.2 * r, top - 0.1 * r)
        c.curve_to(x - 0.8 * r, top + 0.05 * r, x - 0.55 * r, fy + 0.58 * r, x - 0.28 * r, fy + 0.53 * r)   # cheek line down to the moustache
        c.curve_to(x - 0.15 * r, fy + 0.47 * r, x + 0.15 * r, fy + 0.47 * r, x + 0.28 * r, fy + 0.53 * r)
        c.curve_to(x + 0.55 * r, fy + 0.58 * r, x + 0.8 * r, top + 0.05 * r, x + 1.2 * r, top - 0.1 * r)
        c.line_to(x + 1.2 * r, y + 2 * r); c.line_to(x - 1.2 * r, y + 2 * r); c.close_path()
        if bd == "short":
            c.set_source_rgba(*M_HAIR, 0.78); c.fill_preserve()
            c.set_source_rgba(*M_HAIR_L, 0.5); c.set_line_width(lw * 0.5); c.stroke()
        else:
            c.new_path()
            g = cairo.LinearGradient(0, fy + 0.36 * r, 0, fy + 1.0 * r)
            for k in range(11): u = k / 10; g.add_color_stop_rgba(u, 0.36, 0.27, 0.25, 0.22 * u * u * (3 - 2 * u))
            c.set_source(g); c.rectangle(x - 2 * r, fy + 0.36 * r, 4 * r, 2 * r); c.fill()
            mx_, my_ = fx, fy + 0.55 * r
            c.save(); c.translate(mx_, my_); c.scale(1, 0.45)
            g = cairo.RadialGradient(0, 0, 0, 0, 0, 0.26 * r); g.add_color_stop_rgba(0, 0.36, 0.27, 0.25, 0.10); g.add_color_stop_rgba(1, 0.36, 0.27, 0.25, 0)
            c.set_source(g); c.arc(0, 0, 0.26 * r, 0, 2 * math.pi); c.fill(); c.restore()
        c.restore()
    gap = 0.35 * r; ey = fy + 0.10 * r
    closed = p["blink"] or emo in ("closed", "happy")
    brow_up = {"sad": 0.08, "cry": 0.10, "worried": 0.10, "angry": -0.07, "happy": 0.02, "smile": 0.01}.get(emo, 0.0)
    for sd in (-1, 1):
        ex = fx + sd * gap
        rx, ry = 0.105 * r, 0.12 * r
        if closed:
            c.move_to(ex - sd * 0.13 * r, ey + 0.01 * r)
            if emo == "happy": c.curve_to(ex - sd * 0.04 * r, ey - 0.07 * r, ex + sd * 0.05 * r, ey - 0.07 * r, ex + sd * 0.14 * r, ey + 0.01 * r)
            else: c.curve_to(ex - sd * 0.04 * r, ey + 0.06 * r, ex + sd * 0.05 * r, ey + 0.06 * r, ex + sd * 0.14 * r, ey + 0.02 * r)
            _stroke(c, LINE, lw * 1.2)
        else:
            ix = ex + lx * 0.03 * r; iy = ey + ly * 0.015 * r
            ellipse(c, ix, iy, rx, ry); c.set_source_rgb(*IRIS); c.fill()
            c.set_source_rgb(1, 1, 1); c.arc(ix + 0.035 * r, iy - 0.005 * r, 0.03 * r, 0, 2 * math.pi); c.fill()
            # heavy upper lid: skin cuts the top of the eye (lower when sad/tired)
            drop = {"sad": 0.06, "cry": 0.065, "worried": 0.025, "angry": 0.05}.get(emo, 0.0)
            d_in, d_out = {"sad": (-0.015, 0.035), "cry": (-0.015, 0.04), "worried": (-0.015, 0.012), "angry": (0.04, -0.01)}.get(emo, (0.0, 0.0))
            xi, xo = ex - sd * 0.14 * r, ex + sd * 0.15 * r
            yi, yo = ey - 0.06 * r + (drop + d_in) * r, ey - 0.05 * r + (drop + d_out) * r
            ym = ey - 0.09 * r + drop * r
            c.save(); ellipse(c, ix, iy, rx * 1.15, ry * 1.15); c.clip()
            c.move_to(xi, yi); c.curve_to(ex - sd * 0.05 * r, ym, ex + sd * 0.05 * r, ym, xo, yo)
            c.line_to(xo, ey - 0.4 * r); c.line_to(xi, ey - 0.4 * r); c.close_path(); c.set_source_rgb(*SKIN); c.fill()
            if emo == "smile":   # cheeks push the lower lid up
                c.move_to(xi, ey + 0.11 * r); c.curve_to(ex - sd * 0.05 * r, ey + 0.06 * r, ex + sd * 0.05 * r, ey + 0.06 * r, xo, ey + 0.10 * r)
                c.line_to(xo, ey + 0.4 * r); c.line_to(xi, ey + 0.4 * r); c.close_path(); c.set_source_rgb(*SKIN); c.fill()
            c.restore()
            c.move_to(xi, yi); c.curve_to(ex - sd * 0.05 * r, ym, ex + sd * 0.05 * r, ym, xo, yo)
            _stroke(c, LINE, lw * 1.3)
        # heavy, nearly straight brow (filled, tapering outwards), close to the eye
        by = ey - 0.215 * r
        bi, bo = ex - sd * 0.15 * r, ex + sd * 0.19 * r
        yi_ = by - brow_up * r; yo_ = by + 0.02 * r + (0.02 if emo in ("sad", "cry", "worried") else 0) * r
        c.move_to(bi, yi_ + 0.035 * r)
        c.curve_to(bi - sd * 0.015 * r, yi_ - 0.045 * r, ex, by - 0.06 * r - brow_up * 0.4 * r, bo, yo_ - 0.02 * r)
        c.curve_to(bo + sd * 0.012 * r, yo_ + 0.012 * r, ex, by + 0.015 * r - brow_up * 0.4 * r, bi, yi_ + 0.035 * r); c.close_path()
        c.set_source_rgb(*M_HAIR_D); c.fill_preserve(); c.set_line_width(lw * 0.4); c.stroke()
    if emo == "cry":
        _tear(c, fx + gap * 0.95, ey + 0.16 * r, r)
    # nose: one confident curve like hers, a bit longer, plus a nostril hint
    nb = fy + 0.42 * r
    c.move_to(fx + 0.03 * r, ey + 0.08 * r); c.curve_to(fx + 0.09 * r, nb - 0.12 * r, fx + 0.10 * r, nb - 0.02 * r, fx + 0.04 * r, nb + 0.01 * r)
    c.curve_to(fx + 0.0 * r, nb + 0.025 * r, fx - 0.04 * r, nb + 0.015 * r, fx - 0.06 * r, nb - 0.01 * r)
    _stroke(c, SKIN_SH, lw * 1.0); c.move_to(fx + 0.04 * r, nb + 0.01 * r); c.curve_to(fx + 0.0 * r, nb + 0.025 * r, fx - 0.04 * r, nb + 0.015 * r, fx - 0.06 * r, nb - 0.01 * r); _stroke(c, SHADE, lw * 1.0)
    # mouth: wide, thin, lower-lip shadow
    my = fy + 0.67 * r; mw = 0.18 * r
    if talk > 0.05 or emo == "happy":
        o = max(talk, 0.6 if emo == "happy" else 0)
        def mpath():
            c.move_to(fx - mw, my - 0.01 * r); c.curve_to(fx - mw * 0.55, my + (0.03 + 0.13 * o) * r, fx + mw * 0.55, my + (0.03 + 0.13 * o) * r, fx + mw, my - 0.01 * r)
            c.curve_to(fx + mw * 0.5, my - 0.02 * r, fx - mw * 0.5, my - 0.02 * r, fx - mw, my - 0.01 * r); c.close_path()
        mpath(); finish(c, hexc("6E3436"), lw * 0.9)
        if emo == "happy" or o > 0.35:
            c.save(); mpath(); c.clip(); c.rectangle(fx - mw, my - 0.03 * r, 2 * mw, 0.05 * r); c.set_source_rgb(0.97, 0.95, 0.93); c.fill(); c.restore()
        lo = my + (0.07 + 0.13 * o) * r
    else:
        curve = {"calm": 0.01, "smile": 0.06, "closed": 0.03, "sad": -0.05, "cry": -0.06, "worried": -0.03, "angry": -0.04}.get(emo, 0.0)
        c.move_to(fx - mw, my - curve * 0.6 * r); c.curve_to(fx - mw * 0.4, my + curve * 0.5 * r, fx + mw * 0.4, my + curve * 0.5 * r, fx + mw, my - curve * 0.6 * r)
        _stroke(c, LINE, lw * 1.0)
        lo = my + 0.07 * r
    c.move_to(fx - 0.06 * r, lo); c.curve_to(fx - 0.02 * r, lo + 0.025 * r, fx + 0.02 * r, lo + 0.025 * r, fx + 0.06 * r, lo)
    _stroke(c, SHADE, lw * 0.8, 0.6)
