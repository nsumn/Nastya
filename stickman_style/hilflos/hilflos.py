"""Adult stick-figure video for script 10 (erlernte Hilflosigkeit). Dark stage, rigged figures, GSAP poses.
Usage: python3 hilflos.py <scratch_dir>   -> writes <scratch>/hilf/index.html
"""
import json, math, sys

S = sys.argv[1]
WORDS = json.load(open(f"{S}/v10/words.json"))
END = 67.6
OUT = f"{S}/hilf/index.html"

INK = "#0f1016"
SKIN = "#efece6"
PINK = "#c98b8f"      # her sweater
SAGE = "#8fa58a"      # his sweater
MAUVE = "#8d7aa8"     # friend
HAIR_HER = "#7a4a2e"
HAIR_HIM = "#3a2c25"
LIGHT = "#d9dde6"
ROSE = "#e8919c"      # accent text
WARM = "#ffd9a0"

tweens = []          # GSAP lines
sets = []            # gsap.set lines (static init)


def t2(x):
    return f"{x:.3f}"


# ------------------------------------------------------------------ rigged figure
class Fig:
    def __init__(self, fid, x, ground, s=1.0, torso=PINK, who="her", sit=False, seat=None):
        self.id, self.x, self.s, self.torso, self.who = fid, x, s, torso, who
        self.leg, self.arm, self.tl, self.hr = 95 * s, 80 * s, 150 * s, 56 * s
        hip_y = (seat if sit else ground - 2 * self.leg)
        self.hip = (x, hip_y)
        self.neck = (x, hip_y - self.tl)
        self.sh = (x, self.neck[1] + 20 * s)
        self.hc = (x, self.neck[1] - self.hr - 4 * s)
        self.ang = {}

    def j(self, name):
        return f"{self.id}_{name}"

    def seg(self, a, L, w, col):
        x, y = a
        d = f"M{x:.1f} {y:.1f} L{x:.1f} {y+L:.1f}"
        return (f'<path d="{d}" stroke="{INK}" stroke-width="{w+9*self.s:.1f}" stroke-linecap="round"/>'
                f'<path d="{d}" stroke="{col}" stroke-width="{w:.1f}" stroke-linecap="round"/>')

    def limb(self, name, origin, L, w, col, end):
        x, y = origin
        knee = (x, y + L)
        sets.append(f'gsap.set("#{self.j(name+"1")}",{{svgOrigin:"{x:.1f} {y:.1f}",rotation:0}});')
        sets.append(f'gsap.set("#{self.j(name+"2")}",{{svgOrigin:"{knee[0]:.1f} {knee[1]:.1f}",rotation:0}});')
        self.ang[name + "1"] = 0; self.ang[name + "2"] = 0
        return (f'<g id="{self.j(name+"1")}">{self.seg(origin, L, w, col)}'
                f'<g id="{self.j(name+"2")}">{self.seg(knee, L, w, col)}{end(knee[0], knee[1] + L)}</g></g>')

    def svg(self):
        s = self.s
        hand = lambda x, y: f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{14*s:.1f}" fill="{SKIN}" stroke="{INK}" stroke-width="{5*s:.1f}"/>'
        foot = lambda x, y: f'<ellipse cx="{x:.1f}" cy="{y+4*s:.1f}" rx="{19*s:.1f}" ry="{10*s:.1f}" fill="#2a2d38" stroke="{INK}" stroke-width="{5*s:.1f}"/>'
        hx, hy = self.hip
        legs = (self.limb("la", (hx - 8 * s, hy), self.leg, 24 * s, "#2f3442", foot) +
                self.limb("lb", (hx + 8 * s, hy), self.leg, 24 * s, "#2f3442", foot))
        armA = self.limb("aa", (self.sh[0] - 14 * s, self.sh[1]), self.arm, 21 * s, SKIN, hand)
        armB = self.limb("ab", (self.sh[0] + 14 * s, self.sh[1]), self.arm, 21 * s, SKIN, hand)
        # sleeves: colour upper arm by drawing torso colour over the first segment
        nx, ny = self.neck
        torso = (f'<path d="M{nx-30*s:.1f} {ny+8*s:.1f} Q{nx} {ny-6*s:.1f} {nx+30*s:.1f} {ny+8*s:.1f} L{hx+26*s:.1f} {hy+6*s:.1f} Q{hx} {hy+16*s:.1f} {hx-26*s:.1f} {hy+6*s:.1f} Z" '
                 f'fill="{self.torso}" stroke="{INK}" stroke-width="{7*s:.1f}" stroke-linejoin="round"/>'
                 f'<path d="M{nx-14*s:.1f} {ny+6*s:.1f} Q{nx} {ny+16*s:.1f} {nx+14*s:.1f} {ny+6*s:.1f}" fill="none" stroke="{INK}" stroke-width="{4*s:.1f}" opacity=".5"/>')
        head = self.head_svg()
        sets.append(f'gsap.set("#{self.j("up")}",{{svgOrigin:"{hx:.1f} {hy:.1f}",rotation:0}});')
        sets.append(f'gsap.set("#{self.j("hd")}",{{svgOrigin:"{nx:.1f} {ny:.1f}",rotation:0}});')
        self.ang["up"] = 0; self.ang["hd"] = 0
        return (f'<g id="{self.j("all")}">'
                f'<g id="{self.j("legs")}">{legs}</g>'
                f'<g id="{self.j("up")}">{armB}{torso}<g id="{self.j("hd")}">{head}</g>{armA}</g>'
                f'</g>')

    def head_svg(self):
        s = self.s; cx, cy = self.hc; r = self.hr
        out = []
        if self.who == "her":
            out.append(f'<path d="M{cx-r-10*s:.1f} {cy+52*s:.1f} Q{cx-r-18*s:.1f} {cy-r-4*s:.1f} {cx:.1f} {cy-r-12*s:.1f} Q{cx+r+18*s:.1f} {cy-r-4*s:.1f} {cx+r+10*s:.1f} {cy+52*s:.1f} '
                       f'Q{cx+r-6*s:.1f} {cy+64*s:.1f} {cx+r-14*s:.1f} {cy+48*s:.1f} L{cx-r+14*s:.1f} {cy+48*s:.1f} Q{cx-r+6*s:.1f} {cy+64*s:.1f} {cx-r-10*s:.1f} {cy+52*s:.1f} Z" '
                       f'fill="{HAIR_HER}" stroke="{INK}" stroke-width="{6*s:.1f}"/>')
        out.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.1f}" fill="{SKIN}" stroke="{INK}" stroke-width="{7*s:.1f}"/>')
        if self.who == "her":
            out.append(f'<path d="M{cx-r+4*s:.1f} {cy-6*s:.1f} Q{cx-r+10*s:.1f} {cy-r-8*s:.1f} {cx+6*s:.1f} {cy-r-2*s:.1f} Q{cx+r+4*s:.1f} {cy-r+6*s:.1f} {cx+r-2*s:.1f} {cy-2*s:.1f} '
                       f'Q{cx+r-14*s:.1f} {cy-r+24*s:.1f} {cx+4*s:.1f} {cy-r+20*s:.1f} Q{cx-r+18*s:.1f} {cy-r+26*s:.1f} {cx-r+4*s:.1f} {cy-6*s:.1f} Z" fill="{HAIR_HER}" stroke="{INK}" stroke-width="{5*s:.1f}"/>')
            out.append(f'<circle cx="{cx-r+3*s:.1f}" cy="{cy+18*s:.1f}" r="{5*s:.1f}" fill="#e2b545" stroke="{INK}" stroke-width="{2*s:.1f}"/>')
        elif self.who in ("him", "doc"):
            col = HAIR_HIM if self.who == "him" else "#9a9aa0"
            out.append(f'<path d="M{cx-r+2*s:.1f} {cy-4*s:.1f} Q{cx-r:.1f} {cy-r-8*s:.1f} {cx+4*s:.1f} {cy-r-4*s:.1f} Q{cx+r+4*s:.1f} {cy-r:.1f} {cx+r-2*s:.1f} {cy-6*s:.1f} '
                       f'Q{cx+r-20*s:.1f} {cy-r+18*s:.1f} {cx-12*s:.1f} {cy-r+16*s:.1f} Q{cx-r+12*s:.1f} {cy-r+20*s:.1f} {cx-r+2*s:.1f} {cy-4*s:.1f} Z" fill="{col}" stroke="{INK}" stroke-width="{5*s:.1f}"/>')
            if self.who == "him":
                out.append("".join(f'<circle cx="{cx+dx*s:.1f}" cy="{cy+dy*s:.1f}" r="{2.2*s:.1f}" fill="{INK}" opacity=".45"/>'
                                   for dx, dy in [(-30, 30), (-20, 40), (-8, 44), (8, 44), (20, 40), (30, 30), (-36, 18), (36, 18)]))
        elif self.who == "friend":
            out.append(f'<path d="M{cx-r+2*s:.1f} {cy-4*s:.1f} Q{cx-r:.1f} {cy-r-10*s:.1f} {cx:.1f} {cy-r-6*s:.1f} Q{cx+r:.1f} {cy-r-10*s:.1f} {cx+r-2*s:.1f} {cy-4*s:.1f} Q{cx:.1f} {cy-r+14*s:.1f} {cx-r+2*s:.1f} {cy-4*s:.1f} Z" fill="#c9a36a" stroke="{INK}" stroke-width="{5*s:.1f}"/>'
                       f'<circle cx="{cx+r-6*s:.1f}" cy="{cy-r+4*s:.1f}" r="{16*s:.1f}" fill="#c9a36a" stroke="{INK}" stroke-width="{5*s:.1f}"/>')
        ey = cy + 8 * s
        out.append(f'<g id="{self.j("eyes")}"><ellipse cx="{cx-18*s:.1f}" cy="{ey:.1f}" rx="{5*s:.1f}" ry="{7*s:.1f}" fill="{INK}"/>'
                   f'<ellipse cx="{cx+18*s:.1f}" cy="{ey:.1f}" rx="{5*s:.1f}" ry="{7*s:.1f}" fill="{INK}"/></g>')
        sets.append(f'gsap.set("#{self.j("eyes")}",{{transformOrigin:"50% 50%"}});')
        # brows: neutral and sad (crossfade)
        out.append(f'<path id="{self.j("bn")}" d="M{cx-28*s:.1f} {cy-12*s:.1f} L{cx-10*s:.1f} {cy-12*s:.1f} M{cx+10*s:.1f} {cy-12*s:.1f} L{cx+28*s:.1f} {cy-12*s:.1f}" stroke="{INK}" stroke-width="{4.5*s:.1f}" stroke-linecap="round"/>')
        out.append(f'<path id="{self.j("bs")}" d="M{cx-28*s:.1f} {cy-8*s:.1f} L{cx-10*s:.1f} {cy-16*s:.1f} M{cx+10*s:.1f} {cy-16*s:.1f} L{cx+28*s:.1f} {cy-8*s:.1f}" stroke="{INK}" stroke-width="{4.5*s:.1f}" stroke-linecap="round" opacity="0"/>')
        # mouths: line / open / sad
        out.append(f'<path id="{self.j("ml")}" d="M{cx-11*s:.1f} {cy+30*s:.1f} L{cx+11*s:.1f} {cy+30*s:.1f}" stroke="{INK}" stroke-width="{4.5*s:.1f}" stroke-linecap="round"/>')
        out.append(f'<ellipse id="{self.j("mo")}" cx="{cx:.1f}" cy="{cy+31*s:.1f}" rx="{9*s:.1f}" ry="{7*s:.1f}" fill="{INK}" opacity="0"/>')
        out.append(f'<path id="{self.j("ms")}" d="M{cx-12*s:.1f} {cy+34*s:.1f} Q{cx:.1f} {cy+24*s:.1f} {cx+12*s:.1f} {cy+34*s:.1f}" fill="none" stroke="{INK}" stroke-width="{4.5*s:.1f}" stroke-linecap="round" opacity="0"/>')
        return "".join(out)

    # ---- animation helpers
    def pose(self, t, d, ease="power2.inOut", **angles):
        for k, v in angles.items():
            a0 = self.ang.get(k, 0)
            if a0 == v:
                continue
            if d == 0:
                tweens.append(f'tl.set("#{self.j(k)}",{{rotation:{v}}},{t2(t)});')
            else:
                tweens.append(f'tl.fromTo("#{self.j(k)}",{{rotation:{a0}}},{{rotation:{v},duration:{d},ease:"{ease}"}},{t2(t)});')
            self.ang[k] = v

    def init(self, **angles):
        for k, v in angles.items():
            sets.append(f'gsap.set("#{self.j(k)}",{{rotation:{v}}});')
            self.ang[k] = v

    def mood(self, t, sad=None, mouth=None):
        if sad is not None:
            tweens.append(f'tl.to("#{self.j("bs")}",{{opacity:{1 if sad else 0},duration:.25}},{t2(t)});')
            tweens.append(f'tl.to("#{self.j("bn")}",{{opacity:{0 if sad else 1},duration:.25}},{t2(t)});')
        if mouth:
            for m in ("ml", "mo", "ms"):
                tweens.append(f'tl.to("#{self.j(m)}",{{opacity:{1 if m == mouth else 0},duration:.12}},{t2(t)});')

    def talk(self, t0, t1, rate=0.18):
        t = t0
        while t < t1 - 0.05:
            self.mood(t, mouth="mo"); self.mood(t + rate * 0.55, mouth="ml")
            t += rate

    def blink(self, t):
        tweens.append(f'tl.to("#{self.j("eyes")}",{{scaleY:.1,duration:.06,yoyo:true,repeat:1}},{t2(t)});')

    def nod(self, t, n=2):
        tweens.append(f'tl.to("#{self.j("hd")}",{{y:{10*self.s:.1f},duration:.16,yoyo:true,repeat:{2*n-1},ease:"sine.inOut"}},{t2(t)});')

    def move(self, t, d, dx=0, dy=0, x0=0, y0=0, ease="sine.inOut"):
        tweens.append(f'tl.fromTo("#{self.j("all")}",{{x:{x0},y:{y0}}},{{x:{dx},y:{dy},duration:{d},ease:"{ease}"}},{t2(t)});')


def phone_at(f, s=.7):
    a = hand_pos(f, "aa"); b = hand_pos(f, "ab")
    return phone((a[0]+b[0])/2, (a[1]+b[1])/2 - 30*f.s, s)


def hand_pos(f, arm):
    """World position of the hand of arm 'aa'/'ab' for current angles (approx, used to place props)."""
    sx = f.sh[0] + (-14 if arm == "aa" else 14) * f.s
    a1 = math.radians(f.ang.get(arm + "1", 0)); a2 = math.radians(f.ang.get(arm + "1", 0) + f.ang.get(arm + "2", 0))
    ex, ey = sx - f.arm * math.sin(a1), f.sh[1] + f.arm * math.cos(a1)
    return ex - f.arm * math.sin(a2), ey + f.arm * math.cos(a2)


# ------------------------------------------------------------------ props
def stage(ground=1560):
    return (f'<rect width="1080" height="1920" fill="url(#bgG)"/>'
            f'<path d="M430 0 L650 0 L1010 {ground+40} L70 {ground+40} Z" fill="url(#beam)"/>'
            f'<ellipse cx="540" cy="{ground}" rx="520" ry="110" fill="url(#spot)"/>'
            f'<path d="M-20 {ground} H1100" stroke="{LIGHT}" stroke-width="4" opacity=".55"/>')


def sofa(x, y, w=520):
    return (f'<g stroke="{INK}" stroke-width="7" stroke-linejoin="round">'
            f'<rect x="{x}" y="{y-150}" width="{w}" height="120" rx="26" fill="#3b4256"/>'
            f'<rect x="{x}" y="{y-60}" width="{w}" height="60" rx="16" fill="#454d63"/>'
            f'<rect x="{x-34}" y="{y-120}" width="64" height="120" rx="22" fill="#3b4256"/><rect x="{x+w-30}" y="{y-120}" width="64" height="120" rx="22" fill="#3b4256"/>'
            f'<path d="M{x+20} {y} v26 M{x+w-20} {y} v26" stroke-width="10"/></g>')


def table(x, y, w=360, h=170):
    return (f'<g stroke="{INK}" stroke-width="7"><rect x="{x}" y="{y-h}" width="{w}" height="22" rx="6" fill="#6b5442"/>'
            f'<path d="M{x+24} {y-h+22} V{y} M{x+w-24} {y-h+22} V{y}" stroke="#6b5442" stroke-width="16"/>'
            f'<path d="M{x+24} {y-h+22} V{y} M{x+w-24} {y-h+22} V{y}" stroke="{INK}" stroke-width="3" opacity=".4"/></g>')


def chair(x, y, face=1):
    bx = x - 50 * face
    return (f'<g stroke="{INK}" stroke-width="6" fill="#5a4636"><rect x="{x-50}" y="{y-110}" width="100" height="16" rx="5"/>'
            f'<path d="M{x-42} {y-94} V{y} M{x+42} {y-94} V{y}" stroke="#5a4636" stroke-width="12"/>'
            f'<rect x="{bx-8}" y="{y-250}" width="16" height="150" rx="6"/></g>')


def phone(x, y, s=1.0, rot=0, glow=True):
    g = f'<ellipse cx="0" cy="0" rx="{90}" ry="{120}" fill="#9fc4ff" opacity=".12"/>' if glow else ""
    return (f'<g transform="translate({x} {y}) rotate({rot}) scale({s})">{g}<rect x="-34" y="-60" width="68" height="120" rx="12" fill="#14161d" stroke="{LIGHT}" stroke-width="5"/>'
            f'<rect x="-26" y="-50" width="52" height="96" rx="5" fill="#9fc4ff" opacity=".85"/></g>')


def clock(x, y, r=70, cid="clk"):
    sets.append(f'gsap.set("#{cid}m",{{svgOrigin:"{x} {y}"}});gsap.set("#{cid}h",{{svgOrigin:"{x} {y}"}});')
    return (f'<circle cx="{x}" cy="{y}" r="{r}" fill="#e8e3d8" stroke="{INK}" stroke-width="8"/>' +
            "".join(f'<path d="M{x+math.sin(math.radians(a))*r*.78:.1f} {y-math.cos(math.radians(a))*r*.78:.1f} L{x+math.sin(math.radians(a))*r*.9:.1f} {y-math.cos(math.radians(a))*r*.9:.1f}" stroke="{INK}" stroke-width="5"/>' for a in range(0, 360, 30)) +
            f'<path id="{cid}h" d="M{x} {y} V{y-r*.45}" stroke="{INK}" stroke-width="9" stroke-linecap="round"/>'
            f'<path id="{cid}m" d="M{x} {y} V{y-r*.72}" stroke="{INK}" stroke-width="6" stroke-linecap="round"/>'
            f'<circle cx="{x}" cy="{y}" r="7" fill="{INK}"/>')


def window(x, y, w=260, h=320, lit=False):
    fill = "#f3c983" if lit else "#1b2a44"
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="{fill}" stroke="{INK}" stroke-width="9"/>'
            f'<path d="M{x+w/2} {y} V{y+h} M{x} {y+h/2} H{x+w}" stroke="{INK}" stroke-width="8"/>' +
            ("" if lit else f'<circle cx="{x+w*.72}" cy="{y+h*.24}" r="18" fill="#e8e3d8" opacity=".85"/>'))


def bubble(bid, x, y, w=210, h=90, lines=3):
    ls = "".join(f'<path d="M{x+24} {y+24+i*20} H{x+w-24-(i==lines-1)*60}" stroke="{INK}" stroke-width="7" stroke-linecap="round" opacity=".55"/>' for i in range(lines))
    return (f'<g id="{bid}"><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="26" fill="{LIGHT}" stroke="{INK}" stroke-width="6"/>'
            f'<path d="M{x+30} {y+h-4} l-18 30 l40 -26" fill="{LIGHT}" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>{ls}</g>')


def wall(x, y0, y1, w=150):
    out = [f'<rect x="{x}" y="{y0}" width="{w}" height="{y1-y0}" fill="#4a3f3c" stroke="{INK}" stroke-width="8"/>']
    for r, yy in enumerate(range(int(y0), int(y1), 60)):
        off = 0 if r % 2 == 0 else w / 2
        out.append(f'<path d="M{x} {yy} H{x+w}" stroke="{INK}" stroke-width="5" opacity=".6"/>')
        out.append(f'<path d="M{x+off} {yy} V{min(yy+60, y1)}" stroke="{INK}" stroke-width="5" opacity=".6"/>')
    return "".join(out)


def bulb(bid, x, y, s=1.0):
    return (f'<g id="{bid}" transform="translate({x} {y}) scale({s})"><circle id="{bid}g" cx="0" cy="0" r="120" fill="url(#glowW)"/>'
            f'<path id="{bid}b" d="M-38 10 Q-60 -20 -40 -52 Q-20 -78 0 -78 Q20 -78 40 -52 Q60 -20 38 10 Q26 24 24 40 H-24 Q-26 24 -38 10 Z" fill="#ffe7a8" stroke="{INK}" stroke-width="7"/>'
            f'<rect x="-24" y="40" width="48" height="30" rx="6" fill="#8a8f9c" stroke="{INK}" stroke-width="6"/></g>')


# ------------------------------------------------------------------ captions
def chunks():
    out, cur = [], []
    for w, s_, e in WORDS:
        for part in w.replace("versuchen.Selbst", "versuchen. Selbst").split(" "):
            cur.append((part, s_, e))
            if len(cur) >= 3 or part[-1] in ".,:!?" or sum(len(p) for p, _, _ in cur) > 15:
                out.append(cur); cur = []
    if cur: out.append(cur)
    return out


ACCENT = {"Hilflosigkeit", "erlernte", "nichts", "Frieden", "Aufgeben", "Seligman", "Martin", "hoffen", "fühlen", "allein", "gleich", "vorher"}

# ------------------------------------------------------------------ shots
SHOTS = []   # (t0, t1, svg_inner, cam(scale0, scale1, ox, oy))


def shot(t0, t1, inner, z0=1.0, z1=1.05, ox=540, oy=1100):
    SHOTS.append((t0, t1, inner, z0, z1, ox, oy))


G = 1560

# 1  0–1.9  she speaks (close)
f = Fig("a1", 540, G + 520, s=1.9)
inner = stage(G) + f.svg() + bubble("a1b", 640, 380, 260, 110)
f.init(aa1=14, ab1=-30, ab2=-60)
f.talk(0.1, 1.8); f.blink(1.2)
tweens.append('tl.fromTo("#a1b",{scale:.3,opacity:0,transformOrigin:"0% 100%"},{scale:1,opacity:1,duration:.3,ease:"back.out(2)"},0.35);')
shot(0, 1.9, inner, 1.0, 1.08, 540, 900)

# 2  1.9–3.4  her words bounce off a wall
f = Fig("a2", 260, G, s=1.15)
inner = stage(G) + wall(820, 620, G) + f.svg()
for i in range(3):
    inner += bubble(f"a2b{i}", 330, 760 + i * 30, 170, 76, 2)
f.init(ab1=-60, ab2=-20)
f.talk(1.95, 3.3)
for i in range(3):
    t = 2.0 + i * 0.4
    tweens.append(f'tl.fromTo("#a2b{i}",{{x:0,y:0,rotation:0,opacity:1}},{{x:290,y:-40,duration:.35,ease:"power1.in"}},{t2(t)});')
    tweens.append(f'tl.to("#a2b{i}",{{x:160,y:{720-i*30},rotation:{-40+i*30},duration:.55,ease:"bounce.out"}},{t2(t+.35)});')
shot(1.9, 3.4, inner, 1.0, 1.04)

# 3  3.4–6.3  bubbles get smaller, she goes quiet
f = Fig("a3", 540, G, s=1.3)
inner = stage(G) + f.svg()
for i, (sc, t) in enumerate([(1.0, 3.5), (.7, 4.2), (.45, 4.9), (.25, 5.5)]):
    inner += f'<g transform="translate(600 640) scale({sc})">{bubble(f"a3b{i}", 0, 0, 230, 96, 3)}</g>'
    tweens.append(f'tl.fromTo("#a3b{i}",{{opacity:0,y:30}},{{opacity:1,y:0,duration:.2}},{t2(t)});')
    tweens.append(f'tl.to("#a3b{i}",{{opacity:0,duration:.25}},{t2(t+.55)});')
f.init(ab1=-40, ab2=-30)
f.talk(3.5, 5.3, .22)
f.pose(5.4, .6, ab1=-6, ab2=0); f.mood(5.4, sad=True, mouth="ml"); f.blink(4.4)
shot(3.4, 6.3, inner, 1.02, 1.1, 540, 1000)

# 4  6.3–10.4  term: erlernte Hilflosigkeit — she slowly sags
f = Fig("a4", 540, G, s=1.35)
inner = stage(G) + f.svg()
f.init(aa1=8, ab1=-8)
f.mood(6.3, sad=True)
f.pose(7.6, 1.6, up=0); f.pose(7.6, 1.8, aa1=2, ab1=-2)
tweens.append('tl.fromTo("#a4_hd",{y:0},{y:22},7.6).duration(0);')
tweens.pop()
tweens.append('tl.fromTo("#a4_hd",{y:0},{y:22,duration:1.8,ease:"sine.inOut"},7.6);')
tweens.append('tl.fromTo("#a4_up",{y:0},{y:10,duration:1.8,ease:"sine.inOut"},7.6);')
f.blink(6.8); f.blink(9.4)
shot(6.3, 10.4, inner, 1.0, 1.08, 540, 1150)

# 5  10.4–14.3  she explains to him (he on sofa with phone)
inner = stage(G) + sofa(560, G - 10, 420)
he = Fig("b5", 760, G, s=1.1, torso=SAGE, who="him", sit=True, seat=G - 70)
sh = Fig("a5", 300, G, s=1.1)
inner += he.svg() + sh.svg()
he.init(la1=-82, la2=82, lb1=-82, lb2=82, aa1=24, aa2=-120, ab1=-24, ab2=120)
inner += phone_at(he, .6)
sh.init(ab1=-50, ab2=-40, aa1=10)
sh.talk(10.6, 13.9, .2)
sh.pose(11.2, .4, ab1=-70, ab2=-20); sh.pose(11.8, .4, ab1=-45, ab2=-50)
sh.pose(12.4, .35, ab1=-75, ab2=-10)
sh.pose(13.1, .25, ab1=-110, ab2=-10, aa1=60, aa2=40, ease="back.out(2)")
he.blink(12.2)
shot(10.4, 14.3, inner, 1.0, 1.05, 540, 1200)

# 6  14.3–15.2  she asks (hands together)
f = Fig("a6", 540, G + 380, s=1.75)
inner = stage(G) + f.svg()
f.init(aa1=-20, aa2=-140, ab1=20, ab2=140)
f.mood(14.3, sad=True, mouth="ms"); f.blink(14.8)
shot(14.3, 15.2, inner, 1.05, 1.1, 540, 900)

# 7  15.2–16.9  long messages on her phone
msgs = "".join(f'<g id="m7_{i}"><rect x="{420 if i%2 else 300}" y="{560+i*150}" width="{360 if i%2 else 470}" height="{120}" rx="30" fill="{"#c98b8f" if i%2==0 else "#3a4054"}" stroke="{INK}" stroke-width="6"/>' +
               "".join(f'<path d="M{(420 if i%2 else 300)+30} {600+i*150+k*26} H{(420 if i%2 else 300)+(300 if i%2 else 420)-k*60}" stroke="#fff" stroke-width="9" stroke-linecap="round" opacity=".7"/>' for k in range(3)) + '</g>'
               for i in (0, 2, 4))
inner = (stage(G) + f'<rect x="230" y="380" width="620" height="1180" rx="80" fill="#14161d" stroke="{LIGHT}" stroke-width="10"/>'
         f'<rect x="262" y="440" width="556" height="1060" rx="40" fill="#1f2433"/>' + msgs +
         f'<g id="m7t"><rect x="300" y="1340" width="200" height="90" rx="30" fill="#3a4054" stroke="{INK}" stroke-width="6"/>' +
         "".join(f'<circle id="m7d{k}" cx="{350+k*50}" cy="1385" r="12" fill="#fff"/>' for k in range(3)) + '</g>')
for k, i in enumerate((0, 2, 4)):
    tweens.append(f'tl.fromTo("#m7_{i}",{{opacity:0,y:40}},{{opacity:1,y:0,duration:.25,ease:"power2.out"}},{t2(15.25+k*.45)});')
for k in range(3):
    tweens.append(f'tl.fromTo("#m7d{k}",{{opacity:.3}},{{opacity:1,duration:.2,yoyo:true,repeat:3}},{t2(15.3+k*.12)});')
shot(15.2, 16.9, inner, 1.0, 1.06, 540, 900)

# 8  16.9–19.0  she waits for the right moment: kitchen table, clock spins
f = Fig("a8", 420, G, s=1.15, sit=True, seat=G - 110)
inner = stage(G) + clock(780, 560, 90, "c8") + table(520, G, 380) + chair(400, G, 1) + f.svg() + phone(700, G - 182, .5, 90, False)
f.init(la1=-85, la2=85, lb1=-85, lb2=85, ab1=-60, ab2=-50, aa1=10)
tweens.append('tl.fromTo("#c8m",{rotation:0},{rotation:1440,duration:2.1,ease:"power1.inOut"},16.9);')
tweens.append('tl.fromTo("#c8h",{rotation:0},{rotation:120,duration:2.1,ease:"power1.inOut"},16.9);')
f.blink(17.6); f.blink(18.5)
shot(16.9, 19.0, inner, 1.0, 1.05)

# 9  19.0–21.1  every time the same: loop arrow around them
he = Fig("b9", 700, G, s=1.0, torso=SAGE, who="him")
sh = Fig("a9", 380, G, s=1.0)
inner = (stage(G) + sh.svg() + he.svg() +
         f'<g id="lp9"><path d="M540 560 A300 300 0 1 1 539 560" fill="none" stroke="{ROSE}" stroke-width="12" stroke-dasharray="40 26" opacity=".85"/>'
         f'<path d="M520 540 l40 20 l-40 22" fill="none" stroke="{ROSE}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/></g>')
sets.append('gsap.set("#lp9",{svgOrigin:"540 860"});')
tweens.append('tl.fromTo("#lp9",{rotation:0,opacity:0},{rotation:360,opacity:1,duration:2.1,ease:"none"},19.0);')
sh.init(ab1=-40, ab2=-40); sh.talk(19.1, 20.8, .22)
he.init(aa1=20, aa2=-110, ab1=-20, ab2=110)
shot(19.0, 21.1, inner, 1.0, 1.04, 540, 1000)

# 10 21.1–22.1 he nods, eyes on phone
he = Fig("b10", 540, G + 420, s=1.8, torso=SAGE, who="him")
inner = stage(G) + he.svg()
he.init(aa1=20, aa2=-115, ab1=-20, ab2=115)
inner += phone_at(he, 1.0)
he.nod(21.25, 2)
tweens.append('tl.set("#b10_eyes",{y:10},21.1);')
shot(21.1, 22.1, inner, 1.05, 1.1, 540, 900)

# 11 22.1–23.6 he promises (raises hand)
he = Fig("b11", 540, G + 420, s=1.8, torso=SAGE, who="him")
inner = stage(G) + he.svg() + bubble("b11b", 620, 380, 230, 96, 2)
he.init(aa1=14, ab1=-20, ab2=110)
he.pose(22.2, .35, ab1=-150, ab2=20, ease="back.out(2)")
he.talk(22.3, 23.0, .18)
tweens.append('tl.fromTo("#b11b",{scale:.3,opacity:0,transformOrigin:"0% 100%"},{scale:1,opacity:1,duration:.3,ease:"back.out(2)"},22.35);')
shot(22.1, 23.6, inner, 1.04, 1.08, 540, 900)

# 12 23.6–25.6 maybe he means it: hand on chest
he = Fig("b12", 540, G + 420, s=1.8, torso=SAGE, who="him")
inner = stage(G) + he.svg()
he.init(aa1=-20, aa2=-140, ab1=-10)
he.blink(24.4)
shot(23.6, 25.6, inner, 1.08, 1.02, 540, 900)

# 13 25.6–28.5 a week later all as before: calendar flips, dishes pile up again
cal = (f'<g transform="translate(540 760)"><rect x="-200" y="-220" width="400" height="440" rx="24" fill="#e8e3d8" stroke="{INK}" stroke-width="9"/>'
       f'<rect x="-200" y="-220" width="400" height="110" rx="24" fill="{ROSE}" stroke="{INK}" stroke-width="9"/>'
       f'<circle cx="-110" cy="-220" r="16" fill="{INK}"/><circle cx="110" cy="-220" r="16" fill="{INK}"/>')
for d in range(7):
    cal += f'<text id="c13_{d}" x="0" y="140" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="230" fill="{INK}" opacity="{1 if d==0 else 0}">{d+1}</text>'
cal += '</g>'
dishes = "".join(f'<g id="d13_{k}"><ellipse cx="{540+(k%2)*14-7}" cy="{G-30-k*26}" rx="110" ry="22" fill="#e8e3d8" stroke="{INK}" stroke-width="6"/></g>' for k in range(6))
inner = stage(G) + cal + dishes
for d in range(1, 7):
    t = 25.7 + d * 0.28
    tweens.append(f'tl.set("#c13_{d-1}",{{opacity:0}},{t2(t)});tl.set("#c13_{d}",{{opacity:1}},{t2(t)});')
for k in range(6):
    tweens.append(f'tl.fromTo("#d13_{k}",{{y:-500,opacity:0}},{{y:0,opacity:1,duration:.3,ease:"bounce.out"}},{t2(26.6+k*.22)});')
shot(25.6, 28.5, inner, 1.0, 1.04)

# 14 28.5–32.8 her head learns a rule: the bulb inside dims and goes out
f = Fig("a14", 540, G + 760, s=2.5)
inner = stage(G) + f.svg() + bulb("bl14", 540, 520, 1.0)
f.init(aa1=8, ab1=-8)
f.mood(28.5, sad=True)
tweens.append('tl.to("#bl14g",{opacity:.15,duration:1.6},29.6);')
tweens.append('tl.to("#bl14b",{fill:"#5d5a52",duration:.2},31.6);tl.to("#bl14g",{opacity:0,duration:.2},31.6);')
tweens.append('tl.fromTo("#bl14b",{x:0},{x:4,duration:.05,yoyo:true,repeat:7},30.9);')
f.blink(30.2)
shot(28.5, 32.8, inner, 1.0, 1.08, 540, 800)

# 15 32.8–35.8 Martin Seligman (1967): scientist with clipboard + falling chart
doc = Fig("d15", 360, G, s=1.2, torso="#e8e3d8", who="doc")
inner = (stage(G) + doc.svg() +
         f'<g transform="translate(560 620)"><rect x="0" y="0" width="420" height="320" rx="16" fill="#1f2433" stroke="{LIGHT}" stroke-width="7"/>'
         f'<path d="M40 280 H390 M40 280 V30" stroke="{LIGHT}" stroke-width="6"/>'
         f'<path id="ch15" d="M60 90 L140 120 L220 180 L300 230 L380 260" fill="none" stroke="{ROSE}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="600" stroke-dashoffset="600"/></g>'
         f'<text x="770" y="1030" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="40" fill="{LIGHT}" id="lb15" opacity="0">Martin Seligman · 1967</text>')
doc.init(ab1=-80, ab2=-30, aa1=-20, aa2=-120)
tweens.append('tl.to("#ch15",{strokeDashoffset:0,duration:1.4,ease:"power1.inOut"},33.2);')
tweens.append('tl.to("#lb15",{opacity:1,duration:.4},33.7);')
doc.blink(34.6)
shot(32.8, 35.8, inner, 1.0, 1.04)

# 16 35.8–40.4 pressing a button that does nothing, then stops trying
f = Fig("a16", 380, G, s=1.2)
inner = (stage(G) + f'<rect x="600" y="{G-300}" width="160" height="300" rx="14" fill="#3b4256" stroke="{INK}" stroke-width="8"/>'
         f'<circle id="bt16" cx="680" cy="{G-210}" r="40" fill="{ROSE}" stroke="{INK}" stroke-width="8"/>'
         f'<circle cx="840" cy="560" r="60" fill="#3a3a40" stroke="{INK}" stroke-width="8"/><path d="M820 620 h40 v30 h-40 z" fill="#8a8f9c" stroke="{INK}" stroke-width="6"/>' + f.svg())
f.init(ab1=-75, ab2=-15)
for k in range(5):
    t = 36.0 + k * 0.55
    f.pose(t, .14, ab1=-85, ab2=-5, ease="power2.out"); f.pose(t + .16, .2, ab1=-75, ab2=-15)
    tweens.append(f'tl.fromTo("#bt16",{{scale:1,transformOrigin:"50% 50%"}},{{scale:.85,duration:.1,yoyo:true,repeat:1}},{t2(t+.08)});')
f.pose(39.3, .9, ab1=-6, ab2=0, ease="sine.inOut"); f.mood(39.3, sad=True)
tweens.append('tl.fromTo("#a16_up",{y:0},{y:12,duration:.9,ease:"sine.inOut"},39.4);')
shot(35.8, 40.4, inner, 1.0, 1.04)

# 17 40.4–44.6 even when a door opens behind her, she doesn't turn
f = Fig("a17", 640, G, s=1.25)
inner = (stage(G) + f'<rect x="170" y="{G-470}" width="250" height="470" fill="#ffe2b0" opacity=".9"/>'
         f'<rect id="dr17" x="170" y="{G-470}" width="250" height="470" fill="#5a4636" stroke="{INK}" stroke-width="9"/>'
         f'<path d="M420 {G-470} V{G}" stroke="{INK}" stroke-width="9"/>'
         f'<path id="lt17" d="M420 {G} L170 {G} L-60 {G+200} L700 {G+200} Z" fill="#ffe2b0" opacity="0"/>' + f.svg())
sets.append(f'gsap.set("#dr17",{{transformOrigin:"0% 50%"}});')
tweens.append('tl.to("#dr17",{scaleX:.15,duration:1.2,ease:"power2.inOut"},41.0);tl.to("#lt17",{opacity:.25,duration:1.2},41.0);')
f.init(aa1=4, ab1=-4); f.mood(40.4, sad=True); f.blink(42.6)
shot(40.4, 44.6, inner, 1.0, 1.05)

# 18 44.6–46.3 so she becomes quiet: sits on the floor, knees up
f = Fig("a18", 540, G, s=1.3, sit=True, seat=G - 10)
inner = stage(G) + f.svg()
f.init(la1=-120, la2=150, lb1=-110, lb2=140, aa1=-30, aa2=-100, ab1=-50, ab2=-80)
f.mood(44.6, sad=True); f.blink(45.5)
shot(44.6, 46.3, inner, 1.02, 1.08, 540, 1250)

# 19 46.3–47.9 she tidies up alone; he on the sofa in the back with his phone
he = Fig("b19", 800, G - 120, s=.8, torso=SAGE, who="him", sit=True, seat=G - 190)
sh = Fig("a19", 380, G, s=1.2)
he.init(la1=-82, la2=82, lb1=-82, lb2=82, aa1=24, aa2=-120, ab1=-24, ab2=120)
inner = stage(G) + sofa(660, G - 120, 300) + he.svg() + phone_at(he, .45) + sh.svg() + f'<g id="pl19">' + "".join(f'<ellipse cx="{380}" cy="{1180-k*18}" rx="80" ry="16" fill="#e8e3d8" stroke="{INK}" stroke-width="5"/>' for k in range(5)) + '</g>'
he.init(la1=-82, la2=82, lb1=-82, lb2=82, aa1=24, aa2=-120, ab1=-24, ab2=120)
sh.init(aa1=-30, aa2=-110, ab1=30, ab2=110)
sh.move(46.3, 1.6, dx=-120)
tweens.append('tl.fromTo("#pl19",{x:0},{x:-120,duration:1.6,ease:"sine.inOut"},46.3);')
shot(46.3, 47.9, inner, 1.0, 1.03)

# 20 47.9–49.8 she decides alone: papers, empty chair opposite
f = Fig("a20", 330, G, s=1.15, sit=True, seat=G - 110)
inner = (stage(G) + table(420, G, 330) + chair(310, G, 1) + chair(840, G, -1) + f.svg() +
         f'<rect x="500" y="{G-200}" width="160" height="34" fill="#e8e3d8" stroke="{INK}" stroke-width="5" transform="rotate(-4 580 {G-180})"/>'
         f'<path id="pn20" d="M560 {G-260} l60 50" stroke="{ROSE}" stroke-width="12" stroke-linecap="round"/>')
f.init(la1=-85, la2=85, lb1=-85, lb2=85, ab1=-70, ab2=-30, aa1=10)
tweens.append('tl.fromTo("#pn20",{x:0},{x:30,duration:.18,yoyo:true,repeat:5},48.2);')
shot(47.9, 49.8, inner, 1.0, 1.04)

# 21 49.8–52.7 she tells her friend instead (bench, two cups)
sh = Fig("a21", 420, G, s=1.1, sit=True, seat=G - 120)
fr = Fig("f21", 680, G, s=1.1, torso=MAUVE, who="friend", sit=True, seat=G - 120)
inner = (stage(G) + f'<rect x="260" y="{G-140}" width="560" height="30" rx="10" fill="#6b5442" stroke="{INK}" stroke-width="7"/><path d="M300 {G-110} V{G} M780 {G-110} V{G}" stroke="#6b5442" stroke-width="14"/>' +
         sh.svg() + fr.svg())
sh.init(la1=-82, la2=82, lb1=-82, lb2=82, aa1=20, aa2=-110, ab1=-40, ab2=-40)
fr.init(la1=82, la2=-82, lb1=82, lb2=-82, aa1=20, aa2=-110, ab1=-20, ab2=110)
sh.talk(50.0, 52.4, .22); fr.nod(51.0, 2); fr.mood(49.8, sad=True)
shot(49.8, 52.7, inner, 1.0, 1.05)

# 22 52.7–55.3 from outside it looks like peace: house at night
inner = (f'<rect width="1080" height="1920" fill="url(#bgG)"/>' +
         "".join(f'<circle cx="{x}" cy="{y}" r="3" fill="#fff" opacity=".7"/>' for x, y in [(120, 300), (300, 220), (520, 340), (760, 260), (930, 380), (200, 520), (860, 560)]) +
         f'<path d="M180 820 L540 520 L900 820 Z" fill="#2c3244" stroke="{INK}" stroke-width="10" stroke-linejoin="round"/>'
         f'<rect x="230" y="820" width="620" height="{G-820}" fill="#3b4256" stroke="{INK}" stroke-width="10"/>' +
         window(300, 920, 200, 240, True) + window(580, 920, 200, 240, True) +
         f'<rect x="470" y="{G-300}" width="140" height="300" fill="#5a4636" stroke="{INK}" stroke-width="9"/>'
         f'<path d="M-20 {G} H1100" stroke="{LIGHT}" stroke-width="4" opacity=".5"/>'
         f'<path d="M640 520 V420 h60 v150" fill="#2c3244" stroke="{INK}" stroke-width="9"/>')
shot(52.7, 55.3, inner, 1.0, 1.06, 540, 1000)

# 23 55.3–58.8 but it's no peace — it is giving up: inside, she alone, white flag lowers
f = Fig("a23", 420, G, s=1.2, sit=True, seat=G - 70)
inner = stage(G) + sofa(260, G - 10, 380) + f.svg() + (
    f'<g id="fl23"><path d="M{0} 0 V-300" stroke="{LIGHT}" stroke-width="10"/><path d="M0 -300 h150 l-20 50 l20 50 h-150 z" fill="#f3f1ec" stroke="{INK}" stroke-width="6"/></g>')
f.init(la1=-82, la2=82, lb1=-82, lb2=82, ab1=-120, ab2=-40, aa1=10)
hx, hy = hand_pos(f, "ab")
sets.append(f'gsap.set("#fl23",{{x:{hx:.0f},y:{hy+20:.0f}}});')
f.mood(55.3, sad=True)
f.pose(57.1, 1.2, ab1=-30, ab2=-20, ease="sine.inOut")
tweens.append(f'tl.to("#fl23",{{y:{G-40},x:{hx+60:.0f},rotation:70,duration:1.2,ease:"sine.inOut"}},57.1);')
shot(55.3, 58.8, inner, 1.0, 1.05)

# 24 58.8–63.1 she hasn't stopped feeling: soft glow in her chest
f = Fig("a24", 540, G + 380, s=1.8)
cy24 = f.neck[1] + 95
inner = stage(G) + f'<circle id="gl24" cx="540" cy="{cy24}" r="220" fill="url(#glowR)" opacity="0"/>' + f.svg() + (
    f'<path id="ht24" transform="translate(540 {cy24-15}) scale(.9)" d="M0 -12 C-18 -42 -62 -22 -42 12 C-30 32 -10 44 0 56 C10 44 30 32 42 12 C62 -22 18 -42 0 -12 Z" fill="{ROSE}" stroke="{INK}" stroke-width="6" opacity="0"/>')
f.init(aa1=8, ab1=-8); f.mood(58.8, sad=True)
tweens.append('tl.to("#gl24",{opacity:1,duration:1.2},59.6);tl.to("#ht24",{opacity:1,duration:.8},59.8);')
tweens.append('tl.fromTo("#ht24",{scale:.9,transformOrigin:"50% 50%"},{scale:1,duration:.5,yoyo:true,repeat:3,ease:"sine.inOut"},60.6);')
f.blink(61.5)
shot(58.8, 63.1, inner, 1.02, 1.08, 540, 1000)

# 25 63.1–END she stopped hoping it interests him: opposite ends of the sofa, his phone light
inner = stage(G) + sofa(170, G - 10, 740)
sh = Fig("a25", 300, G, s=1.0, sit=True, seat=G - 70)
he = Fig("b25", 780, G, s=1.0, torso=SAGE, who="him", sit=True, seat=G - 70)
sh.init(la1=-82, la2=82, lb1=-82, lb2=82, aa1=10, ab1=-10)
he.init(la1=82, la2=-82, lb1=82, lb2=-82, aa1=24, aa2=-120, ab1=-24, ab2=120)
inner += sh.svg() + he.svg() + phone_at(he, .55) + f'<path id="th25" d="M330 {G-200} Q540 {G-150} 750 {G-200}" fill="none" stroke="{ROSE}" stroke-width="5" opacity=".9"/>'
sh.mood(63.1, sad=True)
tweens.append('tl.to("#th25",{opacity:0,duration:1.6},64.6);')
sh.blink(65.0)
tweens.append('tl.to("#fade",{opacity:1,duration:1.4},66.2);')
shot(63.1, END, inner, 1.0, 1.1, 540, 1300)

# ------------------------------------------------------------------ assemble
shots_html = []
for i, (t0, t1, inner, z0, z1, ox, oy) in enumerate(SHOTS):
    d = round(t1 - t0, 3)
    shots_html.append(f'<div id="sh{i}" class="shot clip" data-start="{t0}" data-duration="{d}" data-track-index="0">'
                      f'<svg viewBox="0 0 1080 1920" width="1080" height="1920"><g id="cam{i}">{inner}</g></svg></div>')
    tweens.append(f'tl.fromTo("#cam{i}",{{scale:{z0}}},{{scale:{z1},duration:{d},ease:"none"}},{t0});')
    sets.append(f'gsap.set("#cam{i}",{{svgOrigin:"{ox} {oy}"}});')

caps = []
ch = chunks()
for i, c in enumerate(ch):
    t0 = c[0][1]
    nxt = ch[i + 1][0][1] if i + 1 < len(ch) else END
    t1 = min(nxt, c[-1][2] + 0.7)
    d = round(max(t1 - t0, .25), 3)
    words = " ".join((f'<span class="ac">{p}</span>' if p.strip(".,:!?") in ACCENT else p) for p, _, _ in c)
    caps.append(f'<div id="cp{i}" class="cap clip" data-start="{t0:.3f}" data-duration="{d}" data-track-index="2"><span id="cp{i}t">{words}</span></div>')
    tweens.append(f'tl.fromTo("#cp{i}t",{{y:14,opacity:0}},{{y:0,opacity:1,duration:.14,ease:"power2.out"}},{t0:.3f});')

DEFS = f'''<defs>
<radialGradient id="bgG" cx=".5" cy=".42" r=".8"><stop offset="0" stop-color="#262b3a"/><stop offset=".6" stop-color="#171a24"/><stop offset="1" stop-color="#0b0c11"/></radialGradient>
<radialGradient id="spot" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="{WARM}" stop-opacity=".2"/><stop offset="1" stop-color="{WARM}" stop-opacity="0"/></radialGradient>
<linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{WARM}" stop-opacity="0"/><stop offset="1" stop-color="{WARM}" stop-opacity=".07"/></linearGradient>
<radialGradient id="glowW"><stop offset="0" stop-color="#ffe7a8" stop-opacity=".7"/><stop offset="1" stop-color="#ffe7a8" stop-opacity="0"/></radialGradient>
<radialGradient id="glowR"><stop offset="0" stop-color="{ROSE}" stop-opacity=".55"/><stop offset="1" stop-color="{ROSE}" stop-opacity="0"/></radialGradient>
</defs>'''

html = f'''<!doctype html>
<html lang="de" data-resolution="portrait">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=1080, height=1920"/>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
<style>
* {{ margin:0; padding:0; box-sizing:border-box; }}
html, body {{ margin:0; width:1080px; height:1920px; overflow:hidden; background:#0b0c11; }}
#root {{ position:relative; width:100%; height:100%; font-family:"Montserrat", sans-serif; overflow:hidden; }}
.shot {{ position:absolute; inset:0; }}
.shot svg {{ position:absolute; inset:0; }}
.cap {{ position:absolute; left:70px; right:70px; top:250px; text-align:center; z-index:10; }}
.cap span {{ display:inline-block; color:#f3f1ec; font-weight:800; font-size:74px; line-height:1.1; text-transform:uppercase; text-shadow:0 4px 18px rgba(0,0,0,.65); }}
.cap .ac {{ color:{ROSE}; }}
#fade {{ position:absolute; inset:0; background:#0b0c11; opacity:0; z-index:20; }}
</style>
</head>
<body>
<svg width="0" height="0" style="position:absolute">{DEFS}</svg>
<div id="root" data-composition-id="main" data-start="0" data-duration="{END}" data-width="1080" data-height="1920">
{chr(10).join(shots_html)}
{chr(10).join(caps)}
<div id="fade" class="clip" data-start="0" data-duration="{END}" data-track-index="3"></div>
<audio id="voice" src="assets/voice.mp3" data-start="0" data-track-index="5"></audio>
<audio id="bed" src="assets/bed.wav" data-start="0" data-duration="{END}" data-track-index="6"></audio>
</div>
<script>
{chr(10).join(sets)}
const tl = gsap.timeline({{ paused: true }});
{chr(10).join(tweens)}
window.__timelines["main"] = tl;
tl.seek(0);
</script>
</body>
</html>'''
open(OUT, "w").write(html)
print("shots", len(SHOTS), "caps", len(caps), "tweens", len(tweens))
