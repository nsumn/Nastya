"""New places for 2.5D shots (none of them used in videos 01-09). Every place returns a list of depth layers
(layers25.layer) drawn in the usual 2D style; characters come from character2 / sets2 like everywhere else.
Depth convention: z ~ 30 far outside, 8-10 back wall, 4-6 middle, 2.5-3.5 the hero, 1.4-2 blurred foreground."""
import math
import cairocffi as cairo
import character2 as C2
import sets2 as Z
import shots_tasse as UI
from storybook import glow
from layers25 import layer

W, H = 1080, 1920
NAVY0, NAVY1 = (0.15, 0.16, 0.24), (0.11, 0.11, 0.17)
ease = Z.ease

def fill_bg(c, col, x0=-600, y0=-800, w=2300, h=3600): c.set_source_rgb(*col); c.rectangle(x0, y0, w, h); c.fill()
def back_wall(c, floor_y=1500, top=NAVY0, bot=NAVY1):
    g = cairo.LinearGradient(0, -600, 0, floor_y); g.add_color_stop_rgb(0, *top); g.add_color_stop_rgb(1, *bot)
    c.set_source(g); c.rectangle(-600, -800, 2300, floor_y + 800); c.fill()
    g = cairo.LinearGradient(0, floor_y, 0, H + 600); g.add_color_stop_rgb(0, *Z.FLOOR); g.add_color_stop_rgb(1, 0.07, 0.07, 0.10)
    c.set_source(g); c.rectangle(-600, floor_y, 2300, H); c.fill()
    c.set_source_rgb(*Z.OUTL); c.set_line_width(3); c.move_to(-600, floor_y); c.line_to(1700, floor_y); c.stroke()
def city(c, t, bright=1.0):
    fill_bg(c, (0.11, 0.13, 0.24))
    for k in range(40):
        bx = -400 + (k * 97) % 1900; bh = 300 + (k * 53) % 700
        c.set_source_rgb(0.13 + 0.02 * (k % 3), 0.14, 0.24); c.rectangle(bx, 1300 - bh, 80, bh + 900); c.fill()
        for j in range(9):
            if (k + j) % 3 == 0: c.set_source_rgba(0.98, 0.75, 0.45, bright); c.rectangle(bx + 14 + (j % 2) * 34, 1320 - bh + 30 + j * 60, 14, 18); c.fill()
    glow(c, 820, 380, 90, (1.0, 0.95, 0.85), 0.55)
def leaves_fg(c, t, side=1, y=1750):
    x0 = 1000 if side > 0 else 80
    for k, (dx, dy, rx, ry, a) in enumerate(((0, 0, 120, 260, -0.5), (90, -110, 110, 240, -0.9), (-80, 130, 100, 230, -0.2), (70, 130, 130, 250, -0.7))):
        C2.ellipse(c, x0 + side * dx, y + dy, rx, ry, a * side); C2.finish(c, (0.18 + 0.03 * (k % 2), 0.33, 0.26), 4)
def her_pose(**k): d = dict(emo="sad", look=(0.0, 0.3)); d.update(k); return d
def blink(t, period=3.3, off=0.0): return ((t + off) % period) < 0.12
def friend_colors(on):
    """recolour the woman rig for her friend (teal cardigan, dark hair) — call with True before drawing, False after"""
    if on:
        friend_colors.saved = (C2.W_TOP, C2.W_TOP_SH, C2.W_TOP_DK, C2.W_HAIR, C2.W_HAIR_D, C2.W_HAIR_L)
        C2.W_TOP, C2.W_TOP_SH, C2.W_TOP_DK = C2.hexc("5E8C8C"), C2.hexc("4F7A7A"), C2.hexc("436A6A")
        C2.W_HAIR, C2.W_HAIR_D, C2.W_HAIR_L = C2.hexc("2B2220"), C2.hexc("1E1716"), C2.hexc("4A3A36")
    else:
        C2.W_TOP, C2.W_TOP_SH, C2.W_TOP_DK, C2.W_HAIR, C2.W_HAIR_D, C2.W_HAIR_L = friend_colors.saved

# ---------------------------------------------------------------- places
def elevator(face, doors=lambda t: 0.0):
    """close-up in a lift: steel walls, floor display, doors sliding in from both sides (foreground)"""
    def back(c, t):
        fill_bg(c, (0.30, 0.31, 0.36))
        for k in range(-3, 6): Z.rect(c, -200 + k * 220, -300, 210, 2600, (0.34 + 0.02 * (k % 2), 0.35, 0.40), 2)
        Z.rbox(c, 420, 180, 240, 90, 16, (0.08, 0.08, 0.10));
        c.select_font_face("Inter", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD); c.set_font_size(56); c.set_source_rgb(1.0, 0.45, 0.35)
        c.move_to(500, 245); c.show_text("4"); glow(c, 540, 230, 160, (1.0, 0.5, 0.4), 0.25)
        glow(c, 540, -100, 900, (1.0, 0.92, 0.80), 0.35)
    def hero(c, t):
        C2.person(c, 540, 3050, 2700, "w", face(t))
    def doors_fg(c, t):
        u = doors(t)
        if u <= 0: return
        for sd in (-1, 1):
            x = 540 + sd * (900 - 900 * u)
            Z.rect(c, x - 900 if sd < 0 else x, -400, 900, 2800, (0.52, 0.53, 0.58), 5)
            c.set_source_rgba(1, 1, 1, 0.08); c.rectangle(x - 860 if sd < 0 else x + 60, -400, 40, 2800); c.fill()
    return [layer(8, back, pad=0.3), layer(3.0, hero, pad=0.3, animated=True), layer(1.8, doors_fg, pad=0.3, animated=True)]

def dining(her, him, bubble=None):
    def far(c, t): city(c, t)
    def wall_l(c, t):
        back_wall(c, 1380)
        c.set_operator(cairo.OPERATOR_CLEAR); c.rectangle(560, 380, 420, 640); c.fill(); c.set_operator(cairo.OPERATOR_OVER)
        Z.rect(c, 550, 370, 440, 20, (0.30, 0.30, 0.40)); Z.rect(c, 550, 1020, 440, 24, (0.30, 0.30, 0.40))
        c.set_source_rgb(*Z.OUTL); c.set_line_width(5); c.move_to(770, 380); c.line_to(770, 1020); c.stroke()
        for x, y, w, h in ((120, 470, 220, 170), (170, 700, 140, 190)):
            Z.rect(c, x, y, w, h, (0.85, 0.80, 0.70)); Z.rect(c, x + 14, y + 14, w - 28, h - 28, (0.45, 0.52, 0.62), 2)
    def table(c, t):
        glow(c, 540, 820, 700, Z.WARM, 0.28)
        c.set_source_rgb(*Z.OUTL); c.set_line_width(4); c.move_to(540, -400); c.line_to(540, 660); c.stroke()
        Z.box(c, [(440, 660), (640, 660), (700, 760), (380, 760)], (0.95, 0.78, 0.48)); glow(c, 540, 780, 260, (1, 0.85, 0.55), 0.45)
        if him: C2.person(c, 640, 1560, 760, "m", dict(dict(hide_legs=True, arm_l=(10, 100), arm_r=(10, 100)), **him(t)))
        if him and him(t).get("phone", 1):
            Z.rbox(c, 590, 1105, 90, 130, 14, (0.12, 0.12, 0.16)); glow(c, 640, 1100, 120, (0.7, 0.85, 1.0), 0.35)
        Z.box(c, [(150, 1240), (930, 1240), (1000, 1330), (80, 1330)], (0.40, 0.31, 0.30))
        Z.rect(c, 120, 1330, 30, 300, Z.WOOD_D); Z.rect(c, 930, 1330, 30, 300, Z.WOOD_D)
        for x in (330, 700):
            C2.ellipse(c, x, 1280, 95, 26); C2.finish(c, (0.92, 0.91, 0.94), 3); C2.ellipse(c, x, 1280, 60, 15); C2.finish(c, (0.85, 0.84, 0.88), 2)
        Z.rect(c, 470, 1190, 40, 80, (0.75, 0.82, 0.92))
    def hero(c, t):
        Z.sit(c, "w", 260, 1390, 900, her(t)); Z.rbox(c, 120, 1500, 300, 60, 20, (0.30, 0.25, 0.27))
        if bubble: bubble(c, t)
    def fg(c, t): leaves_fg(c, t, 1)
    return [layer(30, far, pad=0.4), layer(9, wall_l, pad=0.4), layer(5.5, table, pad=0.35, animated=True),
            layer(3.6, hero, pad=0.35, animated=True), layer(1.6, fg, pad=0.35)]

def floating_bubbles(items):
    """items: [(text, size, x, y, z, t_in)] — speech bubbles hanging at different depths in the dark"""
    def bgl(c, t): fill_bg(c, (0.10, 0.10, 0.16)); glow(c, 540, 900, 800, (0.6, 0.7, 1.0), 0.10)
    Ls = [layer(12, bgl, pad=0.3)]
    for txt, size, x, y, z, t_in in items:
        def draw(c, t, txt=txt, size=size, x=x, y=y, t_in=t_in): UI.bubble(c, x, y, txt, size, ease((t - t_in) / 0.25) * (1 - 0.35 * ease((t - t_in - 1.2) / 0.6)))
        Ls.append(layer(z, draw, pad=0.3, animated=True))
    return Ls

def terrace(her, him):
    """evening terrace: string lights, garden chairs, hedge and sky"""
    def sky(c, t):
        g = cairo.LinearGradient(0, -600, 0, 1300); g.add_color_stop_rgb(0, 0.12, 0.13, 0.26); g.add_color_stop_rgb(1, 0.42, 0.30, 0.38)
        c.set_source(g); c.paint()
        for k in range(30): C2.ellipse(c, (k * 131) % 1600 - 250, 1150 + (k * 37) % 120, 120, 90); C2.finish(c, (0.12, 0.17, 0.17), 0)
    def deck(c, t):
        c.set_source_rgb(0.24, 0.19, 0.20); c.rectangle(-600, 1300, 2300, 1400); c.fill()
        for k in range(14): c.set_source_rgba(0, 0, 0, 0.25); c.rectangle(-600, 1300 + k * 60, 2300, 4); c.fill()
        Z.rect(c, -600, 1220, 2300, 80, (0.20, 0.16, 0.18))
        for k in range(-4, 16): Z.rect(c, k * 120, 1050, 18, 250, (0.22, 0.18, 0.20), 2)
        Z.rect(c, -600, 1040, 2300, 22, (0.22, 0.18, 0.20))
        # string lights
        c.set_source_rgb(*Z.OUTL); c.set_line_width(3); c.move_to(-400, 380); c.curve_to(200, 640, 800, 640, 1500, 360); c.stroke()
        for k in range(16):
            u = k / 15; x = -400 + 1900 * u; y = 380 + 4 * 260 * u * (1 - u)
            glow(c, x, y + 20, 60, (1.0, 0.85, 0.5), 0.6); C2.ellipse(c, x, y + 20, 12, 16); C2.finish(c, (1.0, 0.9, 0.6), 2)
    def people(c, t):
        Z.sit(c, "m", 760, 1330, 820, dict(dict(arm_l=(10, 60), arm_r=(10, 60)), **him(t)))
        Z.sit(c, "w", 330, 1350, 840, her(t))
        for x in (330, 760): Z.rect(c, x - 140, 1350, 280, 30, (0.55, 0.50, 0.45))
        Z.rbox(c, 480, 1500, 140, 20, 8, (0.5, 0.45, 0.42)); Z.rect(c, 540, 1520, 20, 200, (0.5, 0.45, 0.42))
        Z.rect(c, 500, 1450, 40, 50, (0.85, 0.82, 0.78))
    def fg(c, t): leaves_fg(c, t, -1, 1800)
    return [layer(25, sky, pad=0.4), layer(7, deck, pad=0.4), layer(3.4, people, pad=0.35, animated=True), layer(1.7, fg, pad=0.35)]

def porch(her, him):
    """front door from outside at night: he leaves with his jacket, she stands in the lit doorway"""
    def night(c, t):
        fill_bg(c, (0.08, 0.09, 0.17))
        for k in range(60): c.set_source_rgba(1, 1, 1, 0.3 + 0.3 * (k % 3) / 2); c.arc((k * 173) % 1700 - 300, (k * 89) % 700 - 300, 2.5, 0, 6.3); c.fill()
    def house(c, t):
        fill_bg(c, (0.20, 0.19, 0.26), -600, -200, 2300, 1700)
        for k in range(30): c.set_source_rgba(0, 0, 0, 0.15); c.rectangle(-600, -200 + k * 56, 2300, 3); c.fill()
        Z.rect(c, 300, 500, 480, 980, (0.32, 0.28, 0.30), 5)          # door frame
        c.set_source_rgb(1.0, 0.80, 0.52); c.rectangle(330, 530, 420, 950); c.fill(); glow(c, 540, 1000, 700, (1, 0.8, 0.5), 0.35)
        Z.box(c, [(330, 530), (430, 560), (430, 1450), (330, 1480)], (0.40, 0.30, 0.30))   # door leaf open inwards
        Z.rect(c, -600, 1480, 2300, 1300, (0.17, 0.16, 0.20))
        for k in range(3): Z.rect(c, 230 - k * 40, 1480 + k * 70, 620 + k * 80, 70, (0.30, 0.29, 0.34))
        glow(c, 900, 520, 120, (1, 0.85, 0.6), 0.6); Z.rect(c, 880, 470, 40, 60, (1.0, 0.9, 0.7))
    def her_l(c, t): C2.person(c, 560, 1480, 860, "w", her(t))
    def him_l(c, t): C2.person(c, 880, 1900, 980, "m", him(t)); Z.box(c, [(820, 1150), (950, 1150), (970, 1450), (800, 1450)], (0.25, 0.28, 0.36))
    def fg(c, t):
        for k in range(5): C2.ellipse(c, -60 + k * 70, 1900 - (k % 2) * 90, 150, 110); C2.finish(c, (0.12, 0.22, 0.18), 3)
    return [layer(30, night, pad=0.4), layer(8, house, pad=0.4), layer(5.5, her_l, pad=0.35, animated=True),
            layer(3.2, him_l, pad=0.35, animated=True), layer(1.6, fg, pad=0.35)]

def desk_letter(her, lines_u):
    """she writes a long letter by hand at a desk under a lamp"""
    def wall_l(c, t):
        back_wall(c, 1600)
        for k in range(5): Z.rect(c, 640 + (k % 3) * 120, 420 + (k // 3) * 160, 100, 130, (0.85 - 0.08 * k, 0.80, 0.70), 2)
        Z.rect(c, 120, 360, 300, 360, (0.10, 0.12, 0.22)); city_mini(c, 120, 360, 300, 360)
    def desk(c, t):
        glow(c, 760, 1050, 600, Z.WARM, 0.32)
        c.set_source_rgb(*Z.OUTL); c.set_line_width(6); c.move_to(860, 1300); c.line_to(820, 980); c.line_to(700, 900); c.stroke()
        Z.box(c, [(640, 860), (760, 860), (790, 930), (610, 930)], (0.95, 0.78, 0.48))
        Z.rect(c, -200, 1300, 1500, 60, (0.40, 0.31, 0.30)); Z.rect(c, 820, 1360, 40, 400, Z.WOOD_D)
    def hero(c, t):
        Z.sit(c, "w", 330, 1330, 860, her(t))
        Z.box(c, [(380, 1250), (700, 1240), (720, 1300), (370, 1310)], (0.97, 0.96, 0.93), 3)
        n = int(7 * lines_u(t))
        for k in range(n): c.set_source_rgba(0.2, 0.2, 0.3, 0.7); c.rectangle(400 + k * 2, 1258 + k * 6, 260 - (40 if k == n - 1 else 0), 3); c.fill()
        for k in range(3): Z.box(c, [(700 + k * 30, 1270 - k * 6), (800 + k * 30, 1262 - k * 6), (806 + k * 30, 1292 - k * 6), (704 + k * 30, 1300 - k * 6)], (0.92, 0.91, 0.88), 2)
    def fg(c, t): leaves_fg(c, t, 1, 1820)
    return [layer(9, wall_l, pad=0.35), layer(5, desk, pad=0.35), layer(3.2, hero, pad=0.35, animated=True), layer(1.7, fg, pad=0.35)]
def city_mini(c, x, y, w, h):
    for k in range(8):
        bx = x + 10 + (k * 41) % (w - 40); bh = 80 + (k * 37) % 160
        c.set_source_rgb(0.14, 0.16, 0.27); c.rectangle(bx, y + h - bh, 34, bh); c.fill()
        if k % 2 == 0: c.set_source_rgb(0.9, 0.7, 0.4); c.rectangle(bx + 10, y + h - bh + 20, 8, 10); c.fill()

def doorway_tea(her, him):
    """seen from the corridor through a door frame: she holds two mugs; he sits in an armchair lit by the TV"""
    def room(c, t):
        back_wall(c, 1450)
        glow(c, 860, 1000, 520, (0.55, 0.70, 1.0), 0.35)
        Z.rect(c, 980, 820, 260, 170, (0.75, 0.85, 1.0))                # TV edge
        Z.rbox(c, 520, 980, 420, 420, 60, (0.30, 0.30, 0.42))         # armchair
        C2.person(c, 730, 1600, 760, "m", dict(dict(hide_legs=True, arm_l=(10, 100), arm_r=(10, 100)), **him(t)))
        Z.rbox(c, 480, 1200, 500, 260, 60, (0.33, 0.33, 0.46))
    def hero(c, t):
        p = her(t); C2.person(c, 300, 1780, 900, "w", p)
        for x in (230, 370):
            Z.rbox(c, x - 34, 1230, 68, 80, 10, (0.93, 0.92, 0.88), 3)
            for k in range(2):
                c.set_source_rgba(1, 1, 1, 0.25); c.set_line_width(5); y0 = 1220 - ((t * 40 + k * 30) % 80)
                c.move_to(x - 8 + k * 14, y0); c.curve_to(x - 20 + k * 14, y0 - 30, x + 6 + k * 14, y0 - 50, x - 6 + k * 14, y0 - 80); c.stroke()
    def frame_fg(c, t):
        fill_bg(c, (0.07, 0.07, 0.11), -600, -800, 560, 3600); fill_bg(c, (0.07, 0.07, 0.11), 1120, -800, 1200, 3600)
        fill_bg(c, (0.07, 0.07, 0.11), -600, -800, 2300, 900)
        Z.rect(c, -40, 100, 60, 2000, (0.20, 0.19, 0.26)); Z.rect(c, 1060, 100, 60, 2000, (0.20, 0.19, 0.26))
    return [layer(7, room, pad=0.35, animated=True), layer(3.4, hero, pad=0.35, animated=True), layer(1.5, frame_fg, pad=0.35)]

def roundabout(t0):
    """top view: a little car goes round and round a roundabout — every talk ends in the same place"""
    def ground(c, t):
        fill_bg(c, (0.17, 0.26, 0.22))
        for k in range(50): C2.ellipse(c, (k * 137) % 1700 - 300, (k * 211) % 2600 - 300, 70, 70); C2.finish(c, (0.14, 0.23, 0.19), 0)
        for ang in (0, 90, 180, 270):
            c.save(); c.translate(540, 960); c.rotate(math.radians(ang)); c.set_source_rgb(0.30, 0.30, 0.36); c.rectangle(-110, 330, 220, 1400); c.fill(); c.restore()
        c.set_source_rgb(0.30, 0.30, 0.36); c.arc(540, 960, 420, 0, 6.3); c.fill()
        c.set_source_rgb(0.17, 0.30, 0.24); c.arc(540, 960, 220, 0, 6.3); c.fill_preserve(); c.set_source_rgb(*Z.OUTL); c.set_line_width(4); c.stroke()
        c.set_source_rgba(1, 1, 1, 0.6); c.set_line_width(6); c.set_dash([30, 30]); c.arc(540, 960, 320, 0, 6.3); c.stroke(); c.set_dash([])
    def car(c, t):
        a = (t - t0) * 2.6
        x, y = 540 + 320 * math.cos(a), 960 + 320 * math.sin(a)
        c.save(); c.translate(x, y); c.rotate(a + math.pi / 2)
        Z.rbox(c, -45, -75, 90, 150, 22, (0.79, 0.54, 0.57), 4); Z.rbox(c, -34, -40, 68, 60, 12, (0.30, 0.36, 0.50), 2)
        c.restore()
        for k in range(1, 5):                                          # trail = the same loop again
            a2 = a - 0.25 * k; c.set_source_rgba(0.79, 0.54, 0.57, 0.18 / k); c.arc(540 + 320 * math.cos(a2), 960 + 320 * math.sin(a2), 40, 0, 6.3); c.fill()
    def sign(c, t):
        c.save(); c.translate(860, 1400); C2.ellipse(c, 0, 0, 110, 110); C2.finish(c, (0.25, 0.45, 0.80), 6)
        c.set_source_rgb(1, 1, 1); c.set_line_width(14)
        for k in range(3):
            a = k * 2.09; c.arc(0, 0, 60, a, a + 1.4); c.stroke()
        c.restore(); Z.rect(c, 852, 1510, 16, 600, (0.6, 0.6, 0.65))
    return [layer(9, ground, pad=0.35), layer(6, car, pad=0.35, animated=True), layer(2.4, sign, pad=0.35)]

def armchair_tv(him, bubble=None):
    def wall_l(c, t):
        back_wall(c, 1500)
        for k in range(6): Z.rect(c, 120 + k * 50, 600, 40, 160 + (k * 37) % 60, ((0.5, 0.3, 0.3), (0.3, 0.4, 0.5), (0.6, 0.55, 0.4))[k % 3], 2)
        Z.rect(c, 100, 780, 360, 20, Z.WOOD)
    def chair(c, t):
        glow(c, 300, 1100, 700, (0.55, 0.70, 1.0), 0.30)
        Z.rbox(c, 300, 900, 520, 640, 80, (0.36, 0.30, 0.42))
        C2.person(c, 560, 1700, 900, "m", dict(dict(hide_legs=True, arm_l=(10, 100), arm_r=(10, 100)), **him(t)))
        Z.rbox(c, 505, 1210, 110, 160, 16, (0.12, 0.12, 0.16)); glow(c, 560, 1200, 140, (0.7, 0.85, 1.0), 0.4)
        Z.rbox(c, 250, 1330, 620, 330, 70, (0.40, 0.34, 0.47))
        for x in (250, 790): Z.rbox(c, x, 1200, 90, 360, 40, (0.33, 0.28, 0.40))
        if bubble: bubble(c, t)
    def lamp_fg(c, t):
        Z.box(c, [(-100, 300), (160, 300), (220, 520), (-160, 520)], (0.95, 0.78, 0.48)); glow(c, 30, 500, 300, Z.WARM, 0.4)
        c.set_source_rgb(*Z.OUTL); c.set_line_width(14); c.move_to(30, 520); c.line_to(30, 2200); c.stroke()
    return [layer(9, wall_l, pad=0.35), layer(4, chair, pad=0.35, animated=True), layer(1.8, lamp_fg, pad=0.35)]

def fridge_notes(t0, notes):
    """fridge door with sticky notes that pile up week after week"""
    def kitchen(c, t):
        back_wall(c, 1700, (0.20, 0.21, 0.29), (0.15, 0.15, 0.21))
        for k in range(8): Z.rect(c, -300 + k * 220, 400, 200, 160, (0.24, 0.25, 0.33), 2)
    def door(c, t):
        Z.rbox(c, 200, 120, 680, 1700, 40, (0.86, 0.87, 0.90), 5); Z.rect(c, 820, 500, 26, 380, (0.65, 0.66, 0.70))
        for k, (x, y, txt, col) in enumerate(notes):
            u = ease((t - t0 - 0.35 * k) / 0.2)
            if u <= 0: continue
            c.save(); c.translate(x, y); c.rotate(math.radians((k % 3 - 1) * 6)); c.scale(u, u)
            Z.rect(c, -95, -95, 190, 190, col, 3)
            c.select_font_face("Inter", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD); c.set_font_size(36); c.set_source_rgb(0.2, 0.18, 0.2)
            w = c.text_extents(txt)[4]; c.move_to(-w / 2, 12); c.show_text(txt)
            C2.ellipse(c, 0, -80, 16, 16); C2.finish(c, (0.85, 0.35, 0.35), 2); c.restore()
    def magnet_fg(c, t): leaves_fg(c, t, -1, 1850)
    return [layer(8, kitchen, pad=0.35), layer(4, door, pad=0.35, animated=True), layer(1.7, magnet_fg, pad=0.35)]

def kitchen_floor(her):
    """late at night she sits on the kitchen floor against the cabinets, knees up"""
    def win(c, t):
        back_wall(c, 1200, (0.18, 0.19, 0.28), (0.13, 0.13, 0.20))
        Z.rect(c, 600, 260, 380, 460, (0.10, 0.13, 0.24)); city_mini(c, 600, 260, 380, 460)
        glow(c, 790, 480, 500, (0.6, 0.7, 1.0), 0.25)
    def cabinets(c, t):
        for k in range(5): Z.rect(c, -120 + k * 270, 1100, 260, 560, (0.30, 0.31, 0.40)); Z.rect(c, -20 + k * 270, 1200, 60, 14, (0.6, 0.6, 0.65))
        Z.rect(c, -200, 1060, 1500, 50, (0.45, 0.45, 0.52))
        c.set_source_rgb(0.15, 0.14, 0.19); c.rectangle(-600, 1660, 2300, 1300); c.fill()
        for k in range(12): c.set_source_rgba(0, 0, 0, 0.3); c.rectangle(-600 + k * 200, 1660, 4, 1300); c.fill()
    def hero(c, t): Z.sit(c, "w", 500, 1640, 1050, her(t), knees_up=True)
    def fg(c, t): Z.rbox(c, 820, 1650, 300, 400, 40, (0.20, 0.18, 0.24))   # a chair leg close to the camera
    return [layer(9, win, pad=0.35), layer(5, cabinets, pad=0.35), layer(3.0, hero, pad=0.35, animated=True), layer(1.6, fg, pad=0.35)]

def bus_stop(her, bus_u):
    """night bus stop: she sits alone; a lit bus slides past and she stays"""
    def far(c, t): city(c, t, 0.7)
    def street(c, t):
        c.set_source_rgb(0.16, 0.16, 0.21); c.rectangle(-600, 1300, 2300, 1500); c.fill()
        c.set_source_rgba(1, 1, 1, 0.5); c.set_line_width(8); c.set_dash([60, 50]); c.move_to(-600, 1420); c.line_to(1700, 1420); c.stroke(); c.set_dash([])
        u = bus_u(t)
        if 0 < u < 1:
            x = 1700 - 3000 * u
            Z.rbox(c, x, 900, 1400, 460, 40, (0.85, 0.55, 0.30), 5)
            for k in range(8): Z.rect(c, x + 60 + k * 165, 960, 130, 170, (1.0, 0.92, 0.65), 3)
            glow(c, x + 700, 1100, 700, (1.0, 0.8, 0.5), 0.35)
    def shelter(c, t):
        Z.rect(c, 60, 700, 960, 30, (0.55, 0.57, 0.62)); Z.rect(c, 80, 730, 22, 900, (0.55, 0.57, 0.62)); Z.rect(c, 980, 730, 22, 900, (0.55, 0.57, 0.62))
        c.set_source_rgba(0.7, 0.8, 1.0, 0.10); c.rectangle(100, 730, 880, 900); c.fill()
        Z.rect(c, 760, 760, 200, 300, (0.92, 0.88, 0.75)); glow(c, 860, 900, 260, (1, 0.95, 0.8), 0.3)
        Z.rect(c, 200, 1420, 560, 30, (0.40, 0.40, 0.46))
        Z.sit(c, "w", 470, 1420, 820, her(t))
    def fg(c, t):
        Z.rect(c, 1000, -300, 34, 2600, (0.35, 0.36, 0.42)); glow(c, 1017, 320, 260, (1.0, 0.85, 0.6), 0.6)
    return [layer(30, far, pad=0.4), layer(8, street, pad=0.4, animated=True), layer(3.2, shelter, pad=0.35, animated=True), layer(1.7, fg, pad=0.35)]

def garden_gate(her, gate_u):
    """dusk, garden bench; the gate swings open and light falls on the path — she stays seated"""
    def sky(c, t):
        g = cairo.LinearGradient(0, -600, 0, 1300); g.add_color_stop_rgb(0, 0.13, 0.13, 0.26); g.add_color_stop_rgb(1, 0.50, 0.36, 0.40)
        c.set_source(g); c.paint()
    def garden(c, t):
        for k in range(26): C2.ellipse(c, (k * 97) % 1800 - 350, 1000 + (k * 41) % 200, 140, 110); C2.finish(c, (0.13, 0.20, 0.18), 0)
        c.set_source_rgb(0.15, 0.22, 0.18); c.rectangle(-600, 1150, 2300, 1600); c.fill()
        Z.box(c, [(700, 1150), (860, 1150), (1300, 2400), (500, 2400)], (0.38, 0.34, 0.33))
        for k in range(-5, 14):
            if 6 <= k <= 8: continue
            Z.rect(c, k * 90, 1000, 24, 200, (0.75, 0.72, 0.68), 2)
        Z.rect(c, -600, 1050, 1200, 16, (0.75, 0.72, 0.68)); Z.rect(c, 860, 1050, 900, 16, (0.75, 0.72, 0.68))
        u = gate_u(t)
        Z.box(c, [(700, 1000), (700 + 160 * (1 - u), 1000 + 40 * u), (700 + 160 * (1 - u), 1200 + 30 * u), (700, 1200)], (0.75, 0.72, 0.68))
        if u > 0: glow(c, 780, 1150, 380, (1.0, 0.85, 0.6), 0.45 * u)
    def hero(c, t):
        Z.rect(c, 100, 1450, 520, 34, Z.WOOD); Z.rect(c, 100, 1300, 520, 26, Z.WOOD)
        for x in (130, 570): Z.rect(c, x, 1484, 24, 160, Z.WOOD_D)
        Z.sit(c, "w", 360, 1450, 820, her(t))
    def fg(c, t): leaves_fg(c, t, -1, 1780)
    return [layer(25, sky, pad=0.4), layer(7, garden, pad=0.4, animated=True), layer(3.2, hero, pad=0.35, animated=True), layer(1.6, fg, pad=0.35)]

def ironing(her):
    def wall_l(c, t):
        back_wall(c, 1520)
        Z.rect(c, 600, 380, 340, 420, (0.10, 0.13, 0.24)); city_mini(c, 600, 380, 340, 420)
        for k in range(4): Z.rect(c, 120 + k * 90, 560, 70, 180, ((0.6, 0.5, 0.55), (0.45, 0.55, 0.65), (0.8, 0.8, 0.82))[k % 3], 2)
        c.set_source_rgb(*Z.OUTL); c.set_line_width(5); c.move_to(80, 560); c.line_to(520, 560); c.stroke()
    def hero(c, t):
        C2.person(c, 520, 1800, 920, "w", her(t))
        Z.box(c, [(180, 1420), (900, 1390), (960, 1430), (200, 1460)], (0.80, 0.82, 0.88), 4)
        c.set_source_rgb(*Z.OUTL); c.set_line_width(8); c.move_to(400, 1460); c.line_to(760, 1800); c.move_to(760, 1430); c.line_to(400, 1800); c.stroke()
        x = 560 + 90 * math.sin(t * 2.2)
        Z.box(c, [(x - 70, 1400), (x + 60, 1392), (x + 80, 1370), (x - 50, 1350)], (0.85, 0.86, 0.90), 3); Z.rect(c, x - 30, 1330, 70, 22, (0.4, 0.4, 0.5))
        for k in range(2):
            c.set_source_rgba(1, 1, 1, 0.25); c.set_line_width(6); y0 = 1330 - ((t * 50 + k * 40) % 90); c.move_to(x - 10 + k * 20, y0); c.line_to(x - 20 + k * 20, y0 - 40); c.stroke()
    def fg(c, t):
        for k in range(3): Z.rbox(c, -120 + k * 30, 1500 + k * 40, 300, 120, 30, ((0.6, 0.5, 0.55), (0.85, 0.85, 0.88), (0.45, 0.55, 0.65))[k], 3)
    return [layer(8, wall_l, pad=0.35), layer(3.4, hero, pad=0.35, animated=True), layer(1.7, fg, pad=0.35)]

def cellar(her):
    """she carries a box down in the basement storage, alone"""
    def wall_l(c, t):
        back_wall(c, 1550, (0.22, 0.22, 0.26), (0.16, 0.16, 0.19))
        for k in range(30): c.set_source_rgba(0, 0, 0, 0.12); c.rectangle(-600 + (k % 6) * 380 + (k // 6 % 2) * 190, -200 + (k // 6) * 120, 370, 110); c.fill()
        for k in range(3):
            Z.rect(c, -100 + k * 420, 600, 380, 24, (0.45, 0.40, 0.38))
            for j in range(3): Z.rect(c, -80 + k * 420 + j * 120, 480, 100, 120, (0.62, 0.50, 0.38))
        glow(c, 540, 300, 500, (1.0, 0.95, 0.8), 0.35); C2.ellipse(c, 540, 300, 30, 40); C2.finish(c, (1.0, 0.95, 0.8), 3)
    def hero(c, t):
        p = her(t); C2.person(c, 520, 1800, 920, "w", p)
        Z.rect(c, 380, 1180, 280, 220, (0.65, 0.52, 0.40), 4); c.set_source_rgba(0, 0, 0, 0.2); c.rectangle(380, 1270, 280, 16); c.fill()
    def fg(c, t): Z.rect(c, 880, 900, 300, 1200, (0.58, 0.47, 0.36)); Z.rect(c, 880, 1300, 300, 18, (0.4, 0.32, 0.25))
    return [layer(7, wall_l, pad=0.35), layer(3.3, hero, pad=0.35, animated=True), layer(1.6, fg, pad=0.35)]

def supermarket(her, push):
    def shelves(c, t):
        back_wall(c, 1500, (0.80, 0.82, 0.86), (0.70, 0.72, 0.78))
        for r in range(4):
            Z.rect(c, -600, 500 + r * 260, 2300, 22, (0.55, 0.57, 0.62))
            for k in range(26):
                col = ((0.85, 0.40, 0.35), (0.35, 0.55, 0.80), (0.95, 0.80, 0.35), (0.45, 0.70, 0.50), (0.90, 0.90, 0.92))[(k + r) % 5]
                Z.rect(c, -580 + k * 90, 400 + r * 260, 70, 100, col, 2)
        c.set_source_rgb(0.85, 0.85, 0.88); c.rectangle(-600, 1500, 2300, 1300); c.fill()
        for k in range(10): c.set_source_rgba(0, 0, 0, 0.06); c.rectangle(-600, 1500 + k * 90, 2300, 4); c.fill()
        for k in range(4): glow(c, -200 + k * 500, 120, 300, (1, 1, 1), 0.4)
    def hero(c, t):
        x = 440 + push(t)
        C2.person(c, x, 1780, 900, "w", her(t))
        Z.rect(c, x + 130, 1240, 340, 260, (0.70, 0.72, 0.78), 4)
        for k in range(6): c.set_source_rgba(0, 0, 0, 0.2); c.rectangle(x + 150 + k * 52, 1250, 6, 240); c.fill()
        for k, col in enumerate(((0.9, 0.5, 0.4), (0.4, 0.6, 0.85), (0.95, 0.85, 0.4))): Z.rect(c, x + 170 + k * 90, 1180, 70, 90, col, 2)
        for dx in (150, 450): C2.ellipse(c, x + dx, 1640, 30, 30); C2.finish(c, (0.2, 0.2, 0.25), 3)
        c.set_source_rgb(*Z.OUTL); c.set_line_width(6); c.move_to(x + 130, 1500); c.line_to(x + 150, 1640); c.move_to(x + 470, 1500); c.line_to(x + 450, 1640); c.stroke()
    def fg(c, t):
        for k in range(5): Z.rect(c, -200 + k * 80, 1300 + (k % 2) * 60, 70, 110, ((0.85, 0.4, 0.35), (0.95, 0.8, 0.35), (0.35, 0.55, 0.8))[k % 3], 3)
    return [layer(8, shelves, pad=0.4), layer(3.4, hero, pad=0.35, animated=True), layer(1.6, fg, pad=0.35)]

def cafe(her, friend):
    def street(c, t): city(c, t, 0.8)
    def window_wall(c, t):
        fill_bg(c, (0.22, 0.17, 0.18), -600, -800, 2300, 900)
        c.set_operator(cairo.OPERATOR_CLEAR); c.rectangle(-600, 100, 2300, 950); c.fill(); c.set_operator(cairo.OPERATOR_OVER)
        for k in range(-3, 9): Z.rect(c, k * 260, 100, 20, 950, (0.22, 0.17, 0.18))
        c.select_font_face("Inter", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD); c.set_font_size(70); c.set_source_rgba(0.95, 0.85, 0.65, 0.5)
        c.move_to(560, 260); c.show_text("CAFÉ")
        fill_bg(c, (0.25, 0.19, 0.20), -600, 1050, 2300, 2000)
        for k in range(6): glow(c, -100 + k * 260, 60, 160, Z.WARM, 0.5); C2.ellipse(c, -100 + k * 260, 60, 40, 30); C2.finish(c, (1, 0.85, 0.55), 2)
    def table(c, t):
        friend_colors(True); Z.sit(c, "w", 790, 1330, 840, friend(t)); friend_colors(False)
        Z.sit(c, "w", 300, 1350, 860, her(t))
        Z.box(c, [(120, 1390), (960, 1390), (1010, 1460), (70, 1460)], (0.55, 0.42, 0.36)); Z.rect(c, 520, 1460, 40, 400, Z.WOOD_D)
        for x in (330, 760):
            Z.rbox(c, x - 40, 1320, 80, 80, 12, (0.95, 0.94, 0.90), 3); C2.ellipse(c, x, 1322, 34, 10); C2.finish(c, (0.45, 0.30, 0.22), 2)
        C2.ellipse(c, 545, 1380, 50, 14); C2.finish(c, (0.9, 0.7, 0.5), 2)
    def fg(c, t): leaves_fg(c, t, 1, 1820)
    return [layer(30, street, pad=0.4), layer(7, window_wall, pad=0.4), layer(3.4, table, pad=0.35, animated=True), layer(1.7, fg, pad=0.35)]

def facade():
    """the house from the street at night: two lit windows, one person in each, far apart; looks peaceful"""
    def sky(c, t):
        fill_bg(c, (0.08, 0.09, 0.18))
        for k in range(70): c.set_source_rgba(1, 1, 1, 0.25 + 0.3 * (k % 3) / 2); c.arc((k * 173) % 1800 - 350, (k * 89) % 800 - 400, 2.5, 0, 6.3); c.fill()
        glow(c, 860, 120, 120, (1.0, 0.96, 0.88), 0.6)
    def house(c, t):
        Z.box(c, [(40, 640), (540, 260), (1040, 640)], (0.28, 0.22, 0.26))
        Z.rect(c, 90, 640, 900, 1000, (0.24, 0.23, 0.31), 5)
        for x, who in ((180, "w"), (640, "m")):
            Z.rect(c, x, 800, 260, 320, (1.0, 0.80, 0.52), 4); glow(c, x + 130, 960, 300, Z.WARM, 0.35)
            c.set_source_rgba(0.16, 0.12, 0.14, 0.85)
            hx = x + (90 if who == "w" else 170)
            c.arc(hx, 980, 34, 0, 6.3); c.fill(); C2.ellipse(c, hx, 1090, 60, 70); c.fill()
            c.set_source_rgb(*Z.OUTL); c.set_line_width(4); c.move_to(x + 130, 800); c.line_to(x + 130, 1120); c.move_to(x, 960); c.line_to(x + 260, 960); c.stroke()
        Z.rect(c, 450, 1300, 180, 340, (0.35, 0.28, 0.28), 4)
        for x in (180, 640): Z.rect(c, x, 1340, 260, 220, (0.16, 0.17, 0.25), 3)
        c.set_source_rgb(0.12, 0.17, 0.15); c.rectangle(-600, 1640, 2300, 1200); c.fill()
    def fence(c, t):
        for k in range(-4, 16): Z.box(c, [(k * 100, 1600), (k * 100 + 40, 1560), (k * 100 + 80, 1600), (k * 100 + 80, 2100), (k * 100, 2100)], (0.75, 0.72, 0.68), 3)
        Z.rect(c, -600, 1700, 2300, 26, (0.75, 0.72, 0.68)); Z.rect(c, -600, 1900, 2300, 26, (0.75, 0.72, 0.68))
    return [layer(30, sky, pad=0.4), layer(7, house, pad=0.4), layer(2.4, fence, pad=0.35)]

def cold_cup():
    """close on her hands around a mug that went cold — no steam any more"""
    def table(c, t):
        fill_bg(c, (0.12, 0.12, 0.18)); glow(c, 760, 300, 700, (0.6, 0.7, 1.0), 0.18)
        c.set_source_rgb(0.36, 0.28, 0.28); c.rectangle(-600, 1100, 2300, 1800); c.fill()
        for k in range(8): c.set_source_rgba(0, 0, 0, 0.12); c.rectangle(-600, 1150 + k * 90, 2300, 5); c.fill()
    def mug(c, t):
        for sd in (-1, 1):
            c.save(); c.translate(540 + sd * 250, 1350); C2.ellipse(c, 0, 0, 120, 170, sd * 0.4); C2.finish(c, C2.W_TOP, 5); c.restore()
        Z.rbox(c, 380, 1080, 320, 380, 50, (0.93, 0.92, 0.88), 6)
        C2.ellipse(c, 540, 1095, 150, 34); C2.finish(c, (0.50, 0.34, 0.26), 4)
        for sd in (-1, 1): C2.ellipse(c, 540 + sd * 200, 1300, 90, 70, sd * 0.3); C2.finish(c, C2.SKIN, 5)
    def fg(c, t): leaves_fg(c, t, -1, 1800)
    return [layer(7, table, pad=0.35), layer(2.6, mug, pad=0.35), layer(1.5, fg, pad=0.35)]
