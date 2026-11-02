"""Stick-figure metaphor stills (Love Bombing). Writes stick/index.html with 6 scenes, 2 s each."""
import math, sys

INK = "#1e1a1a"
RED = "#d42a2a"
RED_D = "#9e1717"
WHITE = "#ffffff"
HAIR = "#7a4a2a"


def P(x, y, ang, L):
    a = math.radians(ang)
    return x + L * math.sin(a), y + L * math.cos(a)


def tube(pts, fill, w=30):
    d = "M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in pts)
    return (f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="{w+10}" stroke-linecap="round" stroke-linejoin="round"/>'
            f'<path d="{d}" fill="none" stroke="{fill}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>')


def face(cx, cy, kind, s=1.0):
    e = lambda dx, dy, rx=5.5, ry=8: f'<ellipse cx="{cx+dx*s}" cy="{cy+dy*s}" rx="{rx*s}" ry="{ry*s}" fill="{INK}"/>'
    L = lambda d, w=4.5: f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="{w*s}" stroke-linecap="round"/>'
    def p(*pts):  # relative points -> path
        return "M" + " ".join(f"{cx+x*s:.1f} {cy+y*s:.1f}" + ("" if i else "") for i, (x, y) in enumerate(pts))
    if kind == "happy":
        return e(-17, -4) + e(17, -4) + \
            f'<path d="M{cx-20*s} {cy+16*s} Q{cx} {cy+38*s} {cx+20*s} {cy+16*s}" fill="none" stroke="{INK}" stroke-width="{4.5*s}" stroke-linecap="round"/>' \
            f'<ellipse cx="{cx-32*s}" cy="{cy+12*s}" rx="{9*s}" ry="{5*s}" fill="#f4a3a3"/><ellipse cx="{cx+32*s}" cy="{cy+12*s}" rx="{9*s}" ry="{5*s}" fill="#f4a3a3"/>'
    if kind == "love":
        h = lambda dx: f'<path transform="translate({cx+dx*s} {cy-4*s}) scale({.55*s})" d="M0 8 C-14 -6 -24 6 0 22 C24 6 14 -6 0 8 Z" fill="{RED}" stroke="{INK}" stroke-width="3"/>'
        return h(-18) + h(18) + f'<path d="M{cx-20*s} {cy+18*s} Q{cx} {cy+40*s} {cx+20*s} {cy+18*s}" fill="none" stroke="{INK}" stroke-width="{4.5*s}" stroke-linecap="round"/>'
    if kind == "smug":
        return (L(f"M{cx-28*s} {cy-6*s} L{cx-8*s} {cy-2*s} M{cx+28*s} {cy-6*s} L{cx+8*s} {cy-2*s}", 6) +
                e(-17, 4, 5, 5) + e(17, 4, 5, 5) +
                f'<path d="M{cx-14*s} {cy+22*s} Q{cx+6*s} {cy+30*s} {cx+20*s} {cy+16*s}" fill="none" stroke="{INK}" stroke-width="{4.5*s}" stroke-linecap="round"/>')
    if kind == "cold":
        return (L(f"M{cx-26*s} {cy-14*s} L{cx-8*s} {cy-10*s} M{cx+26*s} {cy-14*s} L{cx+8*s} {cy-10*s}", 5) +
                e(-17, 0, 5, 5) + e(17, 0, 5, 5) + L(f"M{cx-12*s} {cy+24*s} H{cx+12*s}"))
    if kind == "sad":
        return (L(f"M{cx-28*s} {cy-12*s} L{cx-8*s} {cy-20*s} M{cx+28*s} {cy-12*s} L{cx+8*s} {cy-20*s}", 4.5) +
                e(-17, -2) + e(17, -2) +
                f'<path d="M{cx-16*s} {cy+28*s} Q{cx} {cy+16*s} {cx+16*s} {cy+28*s}" fill="none" stroke="{INK}" stroke-width="{4.5*s}" stroke-linecap="round"/>' +
                f'<path d="M{cx+20*s} {cy+8*s} q{6*s} {12*s} 0 {18*s} q{-6*s} {-6*s} 0 {-18*s}" fill="#8fd0ff" stroke="{INK}" stroke-width="{2.5*s}"/>')
    if kind == "unsure":
        return (L(f"M{cx-28*s} {cy-16*s} L{cx-8*s} {cy-12*s} M{cx+28*s} {cy-20*s} L{cx+8*s} {cy-14*s}", 4.5) +
                e(-17, 0) + e(17, 0) +
                f'<path d="M{cx-14*s} {cy+24*s} Q{cx-4*s} {cy+18*s} {cx+4*s} {cy+24*s} Q{cx+10*s} {cy+30*s} {cx+16*s} {cy+22*s}" fill="none" stroke="{INK}" stroke-width="{4*s}" stroke-linecap="round"/>')
    return ""


def figure(x, ground, col, f="happy", la=(20, 10), ra=(-20, -10), ll=(8, 0), rl=(-8, 0), lean=0, hair=False, s=1.3, extra_hand=""):
    """Stick figure. Arm/leg angles: (upper, lower) degrees from straight down (+ = towards figure's left/screen-left? -> sin)."""
    leg, arm, torso, hr = 100 * s, 82 * s, 150 * s, 58 * s
    hip = (x, ground - 2 * leg)
    neck = P(*hip, 180 + lean, torso)
    out = []
    for (a1, a2) in (ll, rl):
        k = P(*hip, a1, leg); ft = P(*k, a2, leg)
        out.append(tube([hip, k, ft], col, 30 * s))
        out.append(f'<ellipse cx="{ft[0]+ (10*s if a1 <= 0 else -10*s):.1f}" cy="{ft[1]+4*s:.1f}" rx="{20*s}" ry="{11*s}" fill="{col}" stroke="{INK}" stroke-width="{5*s}"/>')
    out.append(tube([hip, neck], col, 46 * s))
    hands = []
    for (a1, a2) in (la, ra):
        sh = neck[0], neck[1] + 18 * s
        e = P(*sh, a1, arm); h = P(*e, a2, arm)
        out.append(tube([sh, e, h], col, 26 * s))
        hands.append(h)
    for h in hands:
        out.append(f'<circle cx="{h[0]:.1f}" cy="{h[1]:.1f}" r="{16*s}" fill="{col}" stroke="{INK}" stroke-width="{5*s}"/>')
    hc = P(*neck, 180 + lean, hr + 6 * s)
    if hair:
        out.append(f'<path d="M{hc[0]-hr-8*s} {hc[1]+30*s} Q{hc[0]-hr-14*s} {hc[1]-hr} {hc[0]} {hc[1]-hr-10*s} Q{hc[0]+hr+14*s} {hc[1]-hr} {hc[0]+hr+8*s} {hc[1]+30*s} Q{hc[0]+hr-4*s} {hc[1]+50*s} {hc[0]+hr-10*s} {hc[1]+44*s} L{hc[0]-hr+10*s} {hc[1]+44*s} Q{hc[0]-hr+4*s} {hc[1]+50*s} {hc[0]-hr-8*s} {hc[1]+30*s} Z" fill="{HAIR}" stroke="{INK}" stroke-width="{5*s}"/>')
    out.append(f'<circle cx="{hc[0]:.1f}" cy="{hc[1]:.1f}" r="{hr}" fill="{col}" stroke="{INK}" stroke-width="{6*s}"/>')
    if hair:
        out.append(f'<path d="M{hc[0]-hr+2*s} {hc[1]-10*s} Q{hc[0]-10*s} {hc[1]-hr-6*s} {hc[0]+hr-2*s} {hc[1]-14*s} Q{hc[0]+20*s} {hc[1]-hr+16*s} {hc[0]-hr+2*s} {hc[1]-10*s} Z" fill="{HAIR}" stroke="{INK}" stroke-width="{5*s}"/>')
        out.append(f'<circle cx="{hc[0]+hr-2*s}" cy="{hc[1]+12*s}" r="{6*s}" fill="#f0c24a" stroke="{INK}" stroke-width="{2.5*s}"/>')
    out.append(face(hc[0], hc[1] + 6 * s, f, s * (1 if col == WHITE else 1)))
    return "".join(out), hands, hc


def heart(x, y, s=1.0, fill=RED, rot=0):
    return (f'<path transform="translate({x} {y}) rotate({rot}) scale({s})" d="M0 -12 C-18 -42 -62 -22 -42 12 C-30 32 -10 44 0 56 C10 44 30 32 42 12 C62 -22 18 -42 0 -12 Z" '
            f'fill="{fill}" stroke="{INK}" stroke-width="{6/s:.1f}" stroke-linejoin="round"/>')


def ground(y=1440):
    tufts = "".join(f'<path d="M{x} {y} l6 -16 M{x+8} {y} l2 -20 M{x+16} {y} l-4 -14" stroke="{INK}" stroke-width="3" fill="none"/>' for x in (90, 300, 520, 760, 980))
    return f'<path d="M-20 {y} H1100" stroke="{INK}" stroke-width="6"/>' + tufts


def scene(title, body):
    return f'''<svg viewBox="0 0 1080 1920" width="1080" height="1920">
<rect width="1080" height="1920" fill="#f7f6f2"/>
{body}
</svg>
<div class="ttl">{title}</div>'''


