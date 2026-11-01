"""More new 2.5D places (video 11 'Ko-Regulation'); none of them appear in videos 01-10.
Same conventions as sets25: each place returns depth layers; characters from character2 / sets2."""
import math
import cairocffi as cairo
import character2 as C2
import sets2 as Z
from storybook import glow
from layers25 import layer
from sets25 import fill_bg, back_wall, city, leaves_fg, city_mini, ease

W, H = 1080, 1920

def sit_pair(c, her, him, xw, xm, seat_y, h, hold=None, lean_in=0.0):
    """both seated side by side; hold = (x, y) where their hands meet (IK); lean_in tilts her head onto his shoulder"""
    Sw, Sm = C2.Spec("w"), C2.Spec("m"); s = h / 1000.0
    gyw = seat_y + (Sw.hip_y + 20) * s; gym = seat_y + (Sm.hip_y + 20) * s
    pm = dict(him); pw = dict(her)
    if hold:
        pm = Z.reach_pose("m", xm, gym, h * 1.03, {"arm_l": hold}, pm)
        pw = Z.reach_pose("w", xw, gyw, h, {"arm_r": hold}, pw)
    if lean_in: pw.update(lean=pw.get("lean", 0) + 8 * lean_in, head_tilt=pw.get("head_tilt", 0) + 16 * lean_in)
    Z.sit(c, "m", xm, seat_y, h * 1.03, pm)
    Z.sit(c, "w", xw, seat_y, h, pw)

# ---------------------------------------------------------------- airplane
def airplane(her, him, close=False, shake=lambda t: 0.0):
    def sky(c, t):
        g = cairo.LinearGradient(0, -600, 0, 2400); g.add_color_stop_rgb(0, 0.20, 0.25, 0.45); g.add_color_stop_rgb(1, 0.55, 0.50, 0.62); c.set_source(g); c.paint()
        for k in range(14):
            x = ((k * 211 - t * 260) % 2400) - 700; y = 500 + (k * 97) % 900
            for j in range(4): C2.ellipse(c, x + j * 70, y - (j % 2) * 30, 110, 60); C2.finish(c, (0.88, 0.86, 0.92), 0)
    def cabin(c, t):
        fill_bg(c, (0.78, 0.77, 0.80))
        for x in ((60, 640) if not close else (240,)):
            sz = 1.0 if not close else 2.0
            c.save(); c.translate(x, 380); c.scale(sz, sz)
            c.set_operator(cairo.OPERATOR_CLEAR); Z.rrect(c, 0, 0, 300, 420, 140); c.fill(); c.set_operator(cairo.OPERATOR_OVER)
            Z.rrect(c, -20, -20, 340, 460, 160); c.set_source_rgb(*Z.OUTL); c.set_line_width(5); c.stroke()
            c.restore()
        c.set_source_rgb(0.62, 0.62, 0.68); c.rectangle(-600, 1500, 2300, 1400); c.fill()
    def seats(c, t):
        dy = shake(t) * 10 * math.sin(t * 40)
        c.save(); c.translate(0, dy)
        if close:
            Z.rbox(c, 120, 600, 840, 1500, 160, (0.30, 0.36, 0.55))
            C2.person(c, 540, 2900, 2500, "w", her(t))
        else:
            Z.rbox(c, 60, 820, 470, 900, 90, (0.30, 0.36, 0.55)); Z.rbox(c, 560, 820, 470, 900, 90, (0.30, 0.36, 0.55))
            sit_pair(c, her(t), him(t), 300, 790, 1420, 880, hold=(545, 1350))
            for x in (40, 515, 1000): Z.rbox(c, x, 1280, 60, 70, 20, (0.25, 0.30, 0.47))
        c.restore()
    def fg(c, t):
        if close: return
        Z.rbox(c, -200, 1650, 700, 900, 120, (0.26, 0.32, 0.50)); Z.rbox(c, 600, 1680, 700, 900, 120, (0.26, 0.32, 0.50))
    return [layer(30, sky, pad=0.4, animated=True), layer(6, cabin, pad=0.35), layer(3.0, seats, pad=0.35, animated=True), layer(1.6, fg, pad=0.35)]

# ---------------------------------------------------------------- outdoors
def jetty(her, him):
    def sky(c, t):
        g = cairo.LinearGradient(0, -600, 0, 1200); g.add_color_stop_rgb(0, 0.22, 0.22, 0.42); g.add_color_stop_rgb(1, 0.95, 0.62, 0.48); c.set_source(g); c.paint()
        glow(c, 540, 1050, 260, (1.0, 0.75, 0.45), 0.8)
        for k in range(18): C2.ellipse(c, (k * 131) % 1900 - 400, 1100 + (k * 23) % 50, 160, 70); C2.finish(c, (0.20, 0.22, 0.30), 0)
    def lake(c, t):
        g = cairo.LinearGradient(0, 1130, 0, 2600); g.add_color_stop_rgb(0, 0.55, 0.42, 0.50); g.add_color_stop_rgb(1, 0.16, 0.18, 0.30); c.set_source(g)
        c.rectangle(-600, 1130, 2300, 1600); c.fill()
        for k in range(26):
            y = 1160 + k * 40; w = 60 + (k * 37) % 200; x = 540 + ((k * 89) % 300 - 150) + 20 * math.sin(t * 1.5 + k)
            c.set_source_rgba(1.0, 0.8, 0.55, 0.5 * (1 - k / 26)); c.rectangle(x - w / 2, y, w, 6); c.fill()
    def deck(c, t):
        Z.box(c, [(160, 1380), (920, 1380), (1100, 1560), (-20, 1560)], (0.42, 0.33, 0.30))
        for k in range(8): c.set_source_rgba(0, 0, 0, 0.25); c.rectangle(-20 + k * 160, 1380, 4, 180); c.fill()
        for x in (120, 940): Z.rect(c, x, 1560, 40, 400, (0.30, 0.24, 0.24))
        sit_pair(c, her(t), him(t), 400, 680, 1400, 820, lean_in=0.6 * ease((t % 100) / 1.0))
    def fg(c, t):
        for k in range(6):
            x = -80 + k * 46; c.set_source_rgb(0.16, 0.22, 0.18); c.set_line_width(14); c.move_to(x, 2100); c.curve_to(x + 10, 1800, x + 30 + 10 * math.sin(t + k), 1600, x + 40, 1480 + (k % 3) * 60); c.stroke()
    return [layer(30, sky, pad=0.4), layer(8, lake, pad=0.4, animated=True), layer(3.2, deck, pad=0.35, animated=True), layer(1.6, fg, pad=0.35, animated=True)]

def train(her, him):
    def land(c, t):
        g = cairo.LinearGradient(0, 0, 0, 1400); g.add_color_stop_rgb(0, 0.55, 0.62, 0.78); g.add_color_stop_rgb(1, 0.90, 0.78, 0.70); c.set_source(g); c.paint()
        for k in range(24):
            x = ((k * 173 - t * 900) % 2600) - 800
            C2.ellipse(c, x, 1000 + (k % 3) * 40, 120 + (k % 4) * 30, 160); C2.finish(c, (0.32, 0.45, 0.36), 0)
            c.set_source_rgb(0.30, 0.25, 0.25); c.rectangle(x - 8, 1120, 16, 100); c.fill()
    def compartment(c, t):
        fill_bg(c, (0.30, 0.27, 0.33))
        c.set_operator(cairo.OPERATOR_CLEAR); Z.rrect(c, 140, 300, 800, 560, 50); c.fill(); c.set_operator(cairo.OPERATOR_OVER)
        Z.rrect(c, 130, 290, 820, 580, 55); c.set_source_rgb(*Z.OUTL); c.set_line_width(6); c.stroke()
        Z.rect(c, 120, 860, 840, 30, (0.55, 0.52, 0.55))
        Z.rect(c, -600, 160, 2300, 40, (0.45, 0.42, 0.48));
        for x in (60, 760): Z.rect(c, x, 120, 260, 60, (0.6, 0.45, 0.35))
    def seat(c, t):
        Z.rbox(c, 30, 900, 1020, 760, 80, (0.42, 0.24, 0.30))
        sit_pair(c, her(t), him(t), 400, 660, 1500, 860, lean_in=1.0)
    def fg(c, t): Z.rbox(c, 820, 1500, 500, 600, 60, (0.22, 0.20, 0.25)); C2.ellipse(c, 960, 1480, 70, 22); C2.finish(c, (0.85, 0.85, 0.88), 3)
    return [layer(30, land, pad=0.4, animated=True), layer(6, compartment, pad=0.35), layer(3.2, seat, pad=0.35, animated=True), layer(1.6, fg, pad=0.35)]

def campfire(her, him):
    def forest(c, t):
        fill_bg(c, (0.05, 0.06, 0.12))
        for k in range(60): c.set_source_rgba(1, 1, 1, 0.4); c.arc((k * 173) % 1800 - 350, (k * 89) % 600 - 300, 2.5, 0, 6.3); c.fill()
        for k in range(16):
            x = (k * 127) % 1800 - 350; h = 700 + (k * 53) % 300
            Z.box(c, [(x, 1250 - h), (x + 120, 1250), (x - 120, 1250)], (0.07, 0.11, 0.10))
    def ground(c, t):
        c.set_source_rgb(0.12, 0.10, 0.10); c.rectangle(-600, 1230, 2300, 1500); c.fill()
        f = 0.8 + 0.2 * math.sin(t * 13) * math.sin(t * 7.3)
        glow(c, 540, 1450, 900, (1.0, 0.55, 0.25), 0.45 * f)
        sit_pair(c, her(t), him(t), 300, 790, 1380, 800)
        for x in (300, 790): Z.rect(c, x - 150, 1380, 300, 50, (0.36, 0.26, 0.22))
    def fire(c, t):
        for k in range(3): Z.rect(c, 430 + k * 60, 1690 - (k % 2) * 20, 180, 34, (0.36, 0.24, 0.18))
        for k in range(7):
            h = 160 + 60 * math.sin(t * 9 + k * 1.7); x = 470 + k * 24
            c.move_to(x - 30, 1690); c.curve_to(x - 40, 1690 - h * 0.6, x + 10 * math.sin(t * 6 + k), 1690 - h, x, 1690 - h * 1.1)
            c.curve_to(x + 30, 1690 - h * 0.6, x + 40, 1690 - h * 0.3, x + 30, 1690); c.close_path()
            c.set_source_rgba(1.0, 0.55 + 0.1 * (k % 3), 0.2, 0.75); c.fill()
        glow(c, 540, 1560, 260, (1.0, 0.8, 0.4), 0.7)
        for k in range(8):
            u = (t * 0.6 + k / 8) % 1; c.set_source_rgba(1, 0.7, 0.3, 1 - u); c.arc(520 + 60 * math.sin(k + t), 1600 - 600 * u, 5, 0, 6.3); c.fill()
    return [layer(25, forest, pad=0.4), layer(4.2, ground, pad=0.35, animated=True), layer(2.6, fire, pad=0.35, animated=True)]

def ferris(her, him):
    def night(c, t): city(c, t, 1.0); glow(c, 540, 1600, 900, (1.0, 0.6, 0.4), 0.15)
    def wheel(c, t):
        c.set_source_rgba(0.9, 0.85, 1.0, 0.5); c.set_line_width(6); c.arc(540, 700, 900, 0, 6.3); c.stroke()
        for k in range(12):
            a = k / 12 * 6.283 + t * 0.05; c.move_to(540, 700); c.line_to(540 + 900 * math.cos(a), 700 + 900 * math.sin(a)); c.stroke()
            glow(c, 540 + 900 * math.cos(a), 700 + 900 * math.sin(a), 50, (1.0, 0.8, 0.5), 0.6)
    def gondola(c, t):
        Z.rbox(c, 80, 700, 920, 1100, 120, (0.20, 0.25, 0.38))
        c.set_operator(cairo.OPERATOR_CLEAR); Z.rrect(c, 140, 760, 800, 560, 80); c.fill(); c.set_operator(cairo.OPERATOR_OVER)
        Z.rrect(c, 140, 760, 800, 560, 80); c.set_source_rgb(*Z.OUTL); c.set_line_width(6); c.stroke()
        sit_pair(c, her(t), him(t), 380, 680, 1480, 760, hold=(540, 1420), lean_in=0.5)
        Z.rect(c, 120, 1480, 840, 60, (0.30, 0.34, 0.48))
    return [layer(30, night, pad=0.4), layer(9, wheel, pad=0.4, animated=True), layer(3.3, gondola, pad=0.35, animated=True)]

def umbrella(her, him):
    def street(c, t):
        city(c, t, 0.9)
        for k in range(120):
            x = (k * 97 + t * 40) % 1800 - 350; y = ((k * 211) + t * 1600) % 2600 - 400
            c.set_source_rgba(0.8, 0.85, 1.0, 0.35); c.set_line_width(3); c.move_to(x, y); c.line_to(x - 8, y + 50); c.stroke()
    def pavement(c, t):
        c.set_source_rgb(0.18, 0.18, 0.24); c.rectangle(-600, 1500, 2300, 1300); c.fill()
        for k in range(6): glow(c, 200 + k * 160, 1600 + (k % 2) * 60, 120, (1.0, 0.75, 0.45), 0.25)
    def pair(c, t):
        Sm = C2.Spec("m"); h = 980
        pm = Z.reach_pose("m", 680, 1720, h, {"arm_r": (720, 760)}, him(t))
        C2.person(c, 680, 1720, h, "m", pm)
        C2.person(c, 420, 1730, 920, "w", her(t))
        c.set_source_rgb(*Z.OUTL); c.set_line_width(10); c.move_to(720, 760); c.line_to(600, 300); c.stroke()
        c.move_to(120, 420); c.curve_to(300, 140, 900, 140, 1080, 420)
        for k in range(6): c.curve_to(1050 - k * 160, 380, 1000 - k * 160, 380, 1080 - (k + 1) * 160, 420)
        c.close_path(); C2.finish(c, (0.62, 0.30, 0.34), 5)
    def fg(c, t):
        for k in range(30):
            x = (k * 137 + t * 80) % 1800 - 350; y = ((k * 157) + t * 2600) % 2800 - 400
            c.set_source_rgba(0.85, 0.9, 1.0, 0.5); c.set_line_width(7); c.move_to(x, y); c.line_to(x - 14, y + 110); c.stroke()
    return [layer(25, street, pad=0.4, animated=True), layer(7, pavement, pad=0.4), layer(3.2, pair, pad=0.35, animated=True), layer(1.5, fg, pad=0.35, animated=True)]

def harbor(her, him):
    def sky(c, t):
        g = cairo.LinearGradient(0, -600, 0, 1300); g.add_color_stop_rgb(0, 0.15, 0.17, 0.35); g.add_color_stop_rgb(1, 0.92, 0.58, 0.46); c.set_source(g); c.paint()
        glow(c, 300, 1150, 220, (1.0, 0.7, 0.45), 0.7)
        Z.box(c, [(850, 1180), (900, 700), (940, 700), (990, 1180)], (0.90, 0.88, 0.86)); Z.rect(c, 860, 900, 120, 60, (0.75, 0.30, 0.30))
        Z.rect(c, 880, 640, 80, 70, (1.0, 0.92, 0.6)); a = t * 1.2
        c.move_to(920, 675); c.line_to(920 + 1400 * math.cos(a), 675 + 300 * math.sin(a)); c.line_to(920 + 1400 * math.cos(a + 0.12), 675 + 300 * math.sin(a + 0.12)); c.close_path()
        c.set_source_rgba(1.0, 0.95, 0.7, 0.18); c.fill()
    def water(c, t):
        g = cairo.LinearGradient(0, 1180, 0, 2600); g.add_color_stop_rgb(0, 0.55, 0.40, 0.48); g.add_color_stop_rgb(1, 0.12, 0.14, 0.26); c.set_source(g)
        c.rectangle(-600, 1180, 2300, 1600); c.fill()
        for k in range(3):
            x = 100 + k * 300 + 10 * math.sin(t + k)
            Z.box(c, [(x, 1250), (x + 200, 1250), (x + 170, 1300), (x + 30, 1300)], (0.85, 0.82, 0.80)); c.set_source_rgb(*Z.OUTL); c.set_line_width(4); c.move_to(x + 100, 1250); c.line_to(x + 100, 1080); c.stroke()
        for k in range(20):
            y = 1320 + k * 50; c.set_source_rgba(1, 0.8, 0.55, 0.35 * (1 - k / 20)); c.rectangle(250 + 30 * math.sin(t * 1.3 + k), y, 120, 5); c.fill()
    def pier(c, t):
        Z.box(c, [(-200, 1600), (1300, 1600), (1500, 1900), (-400, 1900)], (0.40, 0.32, 0.30))
        for k in range(10): Z.rect(c, -100 + k * 140, 1500, 30, 110, (0.30, 0.24, 0.24))
        C2.person(c, 640, 1700, 900, "m", him(t)); C2.person(c, 420, 1710, 860, "w", her(t))
    return [layer(30, sky, pad=0.45, animated=True), layer(9, water, pad=0.45, animated=True), layer(3.4, pier, pad=0.4, animated=True)]

# ---------------------------------------------------------------- indoors
def hug_close(her, him):
    """close: her cheek against his chest, eyes closed — she listens to his heartbeat"""
    def wall_l(c, t):
        back_wall(c, 1900, (0.24, 0.20, 0.26), (0.18, 0.15, 0.20)); glow(c, 860, 400, 600, (1.0, 0.8, 0.55), 0.35)
    def pair(c, t):
        C2.person(c, 660, 3100, 2700, "m", him(t))
        p = dict(her(t)); p.update(lean=-10, head_tilt=18)
        C2.person(c, 420, 3120, 2500, "w", p)
        k = 0.5 + 0.5 * math.sin(t * 7.5) ** 8
        glow(c, 700, 1450, 160, (1.0, 0.45, 0.45), 0.25 + 0.35 * k)
    return [layer(8, wall_l, pad=0.35), layer(3.0, pair, pad=0.35, animated=True)]

def hands_hold(t0):
    """close-up: her hand slides into his, fingers lace, a soft pulse glow"""
    def bgl(c, t): fill_bg(c, (0.20, 0.17, 0.22)); glow(c, 540, 900, 700, (1.0, 0.75, 0.5), 0.25)
    def hands(c, t):
        u = ease((t - t0) / 1.0)
        c.save(); c.translate(-200 + 260 * u, 0)                        # her hand comes in from the left
        C2.limb(c, [(-300, 1200), (420, 1000)], 170, C2.W_TOP, 6); C2.ellipse(c, 470, 990, 120, 90, -0.3); C2.finish(c, C2.SKIN, 6)
        for k in range(4): C2.ellipse(c, 560 + k * 10, 920 + k * 40, 70, 26, -0.2); C2.finish(c, C2.SKIN, 5)
        c.restore()
        C2.limb(c, [(1400, 820), (720, 980)], 190, C2.M_TOP, 6); C2.ellipse(c, 660, 990, 130, 100, 0.3); C2.finish(c, C2.SKIN, 6)
        for k in range(4): C2.ellipse(c, 560 - k * 6, 930 + k * 42, 74, 28, 0.25); C2.finish(c, C2.SKIN_SH, 5)
        if u > 0.8: glow(c, 600, 990, 220, (1.0, 0.85, 0.6), 0.3 * (0.6 + 0.4 * math.sin(t * 6)))
    return [layer(7, bgl, pad=0.3), layer(2.8, hands, pad=0.3, animated=True)]

def mri(hand_u=lambda t: 0.0):
    """scanner room: the ring, a patient lying in it (only legs and feet visible), the screen with a brain"""
    def room(c, t):
        back_wall(c, 1450, (0.70, 0.74, 0.80), (0.60, 0.64, 0.72))
        Z.rect(c, 640, 300, 360, 260, (0.15, 0.17, 0.22));
        C2.ellipse(c, 820, 430, 110, 80); C2.finish(c, (0.85, 0.55, 0.60), 3)
        for k in range(5): c.set_source_rgba(1, 1, 1, 0.5); c.set_line_width(3); c.move_to(730 + k * 40, 380); c.curve_to(760 + k * 40, 430, 720 + k * 40, 460, 750 + k * 40, 490); c.stroke()
        glow(c, 820, 430, 200, (1.0, 0.4, 0.4), 0.3 * (1 - hand_u(t)) + 0.05)
    def machine(c, t):
        C2.ellipse(c, 360, 1050, 360, 380); C2.finish(c, (0.92, 0.93, 0.95), 6)
        C2.ellipse(c, 360, 1050, 190, 200); C2.finish(c, (0.25, 0.27, 0.33), 5)
        Z.rbox(c, 300, 1150, 760, 120, 30, (0.85, 0.86, 0.90))
        Z.rbox(c, 560, 1100, 360, 70, 30, (0.23, 0.23, 0.36)); C2.ellipse(c, 960, 1110, 50, 34); C2.finish(c, C2.W_SHOE, 3); C2.ellipse(c, 960, 1160, 50, 34); C2.finish(c, C2.W_SHOE, 3)
        u = hand_u(t)
        if u > 0:   # his hand reaches in and holds hers
            C2.limb(c, [(1400, 820), (760 - 0 * u + 300 * (1 - u), 1060)], 70, C2.M_TOP, 4); C2.ellipse(c, 740 + 300 * (1 - u), 1070, 48, 38); C2.finish(c, C2.SKIN, 4)
        C2.ellipse(c, 700, 1090, 40, 30); C2.finish(c, C2.SKIN, 4)
    def fg(c, t): Z.rect(c, -300, 1500, 600, 800, (0.80, 0.82, 0.86)); Z.rect(c, 900, -400, 60, 2600, (0.55, 0.58, 0.64))
    return [layer(9, room, pad=0.35, animated=True), layer(4.5, machine, pad=0.35, animated=True), layer(1.7, fg, pad=0.35)]

def attic(her, him):
    """attic under a skylight in a thunderstorm; lightning flashes, they sit close under one blanket"""
    def storm(c, t):
        fill_bg(c, (0.10, 0.11, 0.20)); fl = max(0.0, math.sin(t * 2.3) ** 30)
        if fl > 0.05:
            c.set_source_rgba(0.9, 0.9, 1.0, fl); c.set_line_width(8); c.move_to(600, -200); c.line_to(520, 200); c.line_to(640, 260); c.line_to(560, 700); c.stroke()
            glow(c, 560, 300, 900, (0.8, 0.85, 1.0), 0.5 * fl)
    def roof(c, t):
        fill_bg(c, (0.24, 0.20, 0.26))
        c.set_operator(cairo.OPERATOR_CLEAR); Z.box(c, [(380, 120), (840, 80), (880, 560), (360, 600)], (0, 0, 0)); c.set_operator(cairo.OPERATOR_OVER)
        Z.box(c, [(-600, -400), (1700, -400), (1700, -100), (-600, 500)], (0.30, 0.24, 0.26))
        for k in range(6): c.set_source_rgb(*Z.OUTL); c.set_line_width(14); c.move_to(-300 + k * 300, -200); c.line_to(-100 + k * 300, 700); c.stroke()
        fl = max(0.0, math.sin(t * 2.3) ** 30); glow(c, 600, 900, 900, (0.8, 0.85, 1.0), 0.25 * fl)
    def bed(c, t):
        Z.rbox(c, 60, 1300, 960, 400, 60, (0.85, 0.84, 0.88))
        sit_pair(c, her(t), him(t), 420, 660, 1350, 860, lean_in=1.0)
        c.move_to(120, 1380); c.curve_to(300, 1200, 800, 1200, 980, 1380); c.line_to(1000, 1700); c.line_to(100, 1700); c.close_path(); C2.finish(c, (0.45, 0.42, 0.62), 4)
    def fg(c, t):
        C2.ellipse(c, 960, 1700, 120, 140); C2.finish(c, (0.95, 0.80, 0.50), 4); glow(c, 960, 1650, 260, (1.0, 0.8, 0.5), 0.45)
    return [layer(30, storm, pad=0.4, animated=True), layer(6, roof, pad=0.4, animated=True), layer(3.0, bed, pad=0.35, animated=True), layer(1.6, fg, pad=0.35)]

def waiting_room(her, him):
    """clinic waiting room: he puts his hand on her shoulder"""
    def wall_l(c, t):
        back_wall(c, 1480, (0.62, 0.70, 0.72), (0.52, 0.60, 0.64))
        Z.rect(c, 640, 380, 300, 200, (0.95, 0.95, 0.96)); c.set_source_rgb(0.85, 0.3, 0.3); c.rectangle(770, 410, 40, 140); c.rectangle(720, 460, 140, 40); c.fill()
        Z.rect(c, 120, 400, 160, 160, (0.95, 0.95, 0.96)); C2.ellipse(c, 200, 480, 60, 60); C2.finish(c, (0.95, 0.95, 0.96), 3)
        c.set_source_rgb(*Z.OUTL); c.set_line_width(4); c.move_to(200, 480); c.line_to(200, 440); c.move_to(200, 480); c.line_to(230, 490); c.stroke()
    def chairs(c, t):
        for x in (120, 420, 720): Z.rbox(c, x, 1150, 260, 300, 30, (0.38, 0.52, 0.62)); Z.rect(c, x, 1440, 260, 30, (0.30, 0.42, 0.52))
        Sw = C2.Spec("w"); s = 0.86; xw = 380; gyw = 1440 + (Sw.hip_y + 20) * s
        Z.sit(c, "w", xw, 1440, 860, her(t))
        Sm = C2.Spec("m"); xm = 700; gym = 1440 + (Sm.hip_y + 20) * 0.9
        hx, hy, hr = Z.head_xy("w", xw, gyw, 860)
        pm = Z.reach_pose("m", xm, gym, 900, {"arm_l": (xw + 80, hy + hr + 80)}, him(t))
        Z.sit(c, "m", xm, 1440, 900, pm)
    def fg(c, t): leaves_fg(c, t, 1, 1800)
    return [layer(8, wall_l, pad=0.35), layer(3.4, chairs, pad=0.35, animated=True), layer(1.6, fg, pad=0.35)]

def breakfast(her, him):
    """morning sun in a small breakfast nook; he puts a cup of coffee in front of her"""
    def outside(c, t):
        g = cairo.LinearGradient(0, -600, 0, 1400); g.add_color_stop_rgb(0, 0.60, 0.75, 0.92); g.add_color_stop_rgb(1, 0.98, 0.90, 0.75); c.set_source(g); c.paint()
        for k in range(10): C2.ellipse(c, (k * 211) % 1800 - 350, 1000 + (k * 37) % 80, 180, 120); C2.finish(c, (0.45, 0.62, 0.42), 0)
    def room(c, t):
        fill_bg(c, (0.90, 0.84, 0.76))
        c.set_operator(cairo.OPERATOR_CLEAR); c.rectangle(160, 260, 760, 700); c.fill(); c.set_operator(cairo.OPERATOR_OVER)
        Z.rect(c, 150, 250, 780, 20, (1, 1, 1)); Z.rect(c, 150, 960, 780, 30, (1, 1, 1)); Z.rect(c, 530, 260, 20, 700, (1, 1, 1))
        c.set_source_rgba(1.0, 0.95, 0.7, 0.25); c.move_to(160, 960); c.line_to(920, 960); c.line_to(1300, 1900); c.line_to(-300, 1900); c.close_path(); c.fill()
        c.set_source_rgb(0.72, 0.62, 0.52); c.rectangle(-600, 1500, 2300, 1300); c.fill()
    def table(c, t):
        Z.sit(c, "w", 330, 1360, 820, her(t))
        p = Z.reach_pose("m", 760, 1820, 960, {"arm_r": (520, 1300)}, him(t)); C2.person(c, 760, 1820, 960, "m", p)
        Z.box(c, [(120, 1350), (960, 1350), (1010, 1420), (70, 1420)], (0.95, 0.94, 0.92)); Z.rect(c, 520, 1420, 40, 400, (0.75, 0.70, 0.65))
        Z.rbox(c, 480, 1270, 80, 80, 12, (0.85, 0.45, 0.40), 3)
        for k in range(2): c.set_source_rgba(1, 1, 1, 0.5); c.set_line_width(5); y0 = 1260 - ((t * 40 + k * 30) % 80); c.move_to(510 + k * 20, y0); c.curve_to(495 + k * 20, y0 - 30, 525 + k * 20, y0 - 50, 510 + k * 20, y0 - 80); c.stroke()
    def fg(c, t): leaves_fg(c, t, -1, 1820)
    return [layer(25, outside, pad=0.4), layer(6, room, pad=0.35), layer(3.2, table, pad=0.35, animated=True), layer(1.6, fg, pad=0.35)]
