"""Poses for figlib.figure(pose=...). Each function returns pose(P, k, sw) that moves the joints in place.
The figure faces -Y, +X is her/his left-to-right on screen when seen from the front camera.
All heights are absolute (metres above the floor) because the scenes place furniture in metres."""
import math

UPPER = ("pelvis", "waist", "chest", "neck", "shL", "elL", "haL", "shR", "elR", "haR")


def _rot_y(p, c, a):
    """rotate point p around the Y axis through c by angle a (radians): leans the torso sideways"""
    x, y, z = p[0] - c[0], p[1], p[2] - c[2]
    return (c[0] + x * math.cos(a) + z * math.sin(a), y, c[2] - x * math.sin(a) + z * math.cos(a))


def _rot_x(p, c, a):
    """rotate around the X axis through c: leans the torso forward (a > 0) or back"""
    x, y, z = p[0], p[1] - c[1], p[2] - c[2]
    return (x, c[1] + y * math.cos(a) - z * math.sin(a), c[2] + y * math.sin(a) + z * math.cos(a))


def _lean(P, side_deg, fwd_deg):
    c = P["pelvis"]
    for n in UPPER[1:]:
        p = P[n]
        if fwd_deg: p = _rot_x(p, c, math.radians(-fwd_deg))
        if side_deg: p = _rot_y(p, c, math.radians(side_deg))
        P[n] = p


def _arm(P, side, hand, elbow=None):
    """place one arm: side 'L' or 'R', hand = (x, y, z); the elbow defaults to a soft bend between shoulder and hand"""
    sh = P["sh" + side]
    if elbow is None:
        s = -1 if side == "L" else 1
        elbow = ((sh[0] + hand[0]) / 2 + s * 0.04, (sh[1] + hand[1]) / 2 + 0.03, (sh[2] + hand[2]) / 2 - 0.04)
    P["el" + side] = elbow; P["ha" + side] = hand


def stand(arms=None, lean=(0, 0), legs=None, stride=0.0):
    """arms: dict(L=(hand, elbow|None), R=...) in absolute coords; lean = (sideways deg, forward deg);
    stride: walking step length (+ = left foot forward)"""
    def f(P, k, sw):
        if stride:
            for side, s in (("L", 1), ("R", -1)):
                d = s * stride
                P["knee" + side] = (P["knee" + side][0], P["knee" + side][1] - d * 0.5, P["knee" + side][2] + abs(d) * 0.08)
                P["ank" + side] = (P["ank" + side][0], P["ank" + side][1] - d, P["ank" + side][2] + (0.03 if d < 0 else 0.0))
            # arms swing opposite to the legs
            for side, s in (("L", -1), ("R", 1)):
                d = s * stride * 0.6
                P["el" + side] = (P["el" + side][0], P["el" + side][1] - d * 0.4, P["el" + side][2])
                P["ha" + side] = (P["ha" + side][0], P["ha" + side][1] - d, P["ha" + side][2] + abs(d) * 0.2)
        _lean(P, *lean)
        for side, v in (arms or {}).items():
            if isinstance(v[0], tuple): _arm(P, side, v[0], v[1])        # (hand, elbow)
            else: _arm(P, side, v)                                       # hand only
    return f


def sit(seat_h, arms="lap", cross=None, lean=(0, 0), knees_y=-0.40, arm_targets=None):
    """seated on a seat of height seat_h (top of the cushion).
    arms: 'lap' (hands on thighs) | 'side' (hands on the cushion) | dict(L=hand or (hand, elbow), R=...)
    cross: None | 'R' (right leg over left) | 'L'"""
    def f(P, k, sw):
        pz = seat_h + 0.07
        dz = pz - P["pelvis"][2]
        for n in UPPER: P[n] = (P[n][0], P[n][1] + 0.02, P[n][2] + dz)
        for side, s in (("L", -1), ("R", 1)):
            P["hip" + side] = (s * 0.075, -0.01, pz - 0.02)
            P["knee" + side] = (s * 0.085, knees_y * k, seat_h + 0.06)
            P["ank" + side] = (s * 0.08, knees_y * k - 0.03, 0.07)
            P["foot_pitch_ank" + side] = 0.0
        if cross:
            top, s = cross, (1 if cross == "R" else -1)
            other = "L" if top == "R" else "R"
            P["knee" + top] = (s * 0.0, knees_y * k + 0.02, seat_h + 0.16)
            P["ank" + top] = (-s * 0.12, knees_y * k - 0.10, seat_h - 0.10)
            P["foot_pitch_ank" + top] = 0.5
            P["knee" + other] = (-s * 0.06, knees_y * k + 0.02, seat_h + 0.06)
        _lean(P, *lean)
        if arms == "lap":
            for side, s in (("L", -1), ("R", 1)):
                _arm(P, side, (s * 0.10, -0.24, seat_h + 0.13))
        elif arms == "side":
            for side, s in (("L", -1), ("R", 1)):
                _arm(P, side, (s * (sw + 0.07), -0.04, seat_h + 0.04), (s * (sw + 0.07), 0.02, seat_h + 0.24))
        elif isinstance(arms, dict):
            for side, v in arms.items():
                if isinstance(v[0], tuple): _arm(P, side, v[0], v[1])
                else: _arm(P, side, v)
    return f


def lie(knee_bend=0.12, arms="body"):
    """lying straight (the scene rotates the whole group onto the bed); knees a little bent"""
    def f(P, k, sw):
        for side, s in (("L", -1), ("R", 1)):
            P["knee" + side] = (P["knee" + side][0], P["knee" + side][1] - knee_bend, P["knee" + side][2])
        if arms == "hug":                       # arms forward, as if holding someone / a pillow
            for side, s in (("L", -1), ("R", 1)):
                _arm(P, side, (s * 0.05, -0.22, P["chest"][2] - 0.02), (s * (sw + 0.03), -0.12, P["chest"][2] - 0.1))
        elif arms == "pillow":                  # hands together under the cheek
            for side, s in (("L", -1), ("R", 1)):
                _arm(P, side, (s * 0.04, -0.12, P["neck"][2] + 0.08), (s * (sw + 0.02), -0.14, P["chest"][2] - 0.02))
    return f
