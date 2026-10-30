"""Set library 3: rainy window, candle, living room with a door, chat phone, wall calendar, dollhouse cut-away,
balance scale, autumn alley, station platform. Same look as sets2 (graphite night, soft lines)."""
import math
import cairocffi as cairo
import character2 as C2
import sets2 as Z
import motion as M
from storybook import glow

W, H = 1080, 1920
OUTL = C2.LINE
ease = Z.ease

def rain_streaks(c, t, x0, y0, w, h, n=60, a=0.35):
    c.save(); c.rectangle(x0, y0, w, h); c.clip()
    for k in range(n):
        x = x0 + (k * 97) % w; y = y0 + (k * 151 + t * 900 * (1 + k % 3) * 0.5) % (h + 200) - 200
        c.set_source_rgba(0.75, 0.85, 1.0, a); c.set_line_width(2); c.move_to(x, y); c.line_to(x - 4, y + 40); c.stroke()
    c.restore()

def rainy_window(c, t, her=None, scale=1000):
    """she stands at a big window, rainy city lights behind the glass"""
    Z.wall(c, 1600)
    wx, wy, ww, wh = 140, 260, 800, 1100
    Z.rect(c, wx, wy, ww, wh, (0.08, 0.10, 0.18))
    for k in range(40):
        x, y = wx + (k * 137) % ww, wy + 500 + (k * 89) % 500
        glow(c, x, y, 40 + (k % 4) * 15, (1.0, 0.72, 0.42) if k % 3 else (0.6, 0.75, 1.0), 0.35)
    rain_streaks(c, t, wx, wy, ww, wh, 70, 0.30)
    c.set_source_rgb(*OUTL); c.set_line_width(14); c.move_to(wx + ww / 2, wy); c.line_to(wx + ww / 2, wy + wh); c.move_to(wx, wy + wh * 0.45); c.line_to(wx + ww, wy + wh * 0.45); c.stroke()
    Z.rect(c, wx - 30, wy + wh, ww + 60, 40, Z.WOOD)
    if her is not None: C2.person(c, 540, 1900, scale, "w", dict(dict(hide_legs=True, arm_l=(6, 10), arm_r=(6, 10)), **her))

def candle(c, t, burn, lit=True, smoke=0.0):
    Z.wall(c, 1300, (0.10, 0.10, 0.15), (0.06, 0.06, 0.09))
    Z.rect(c, -20, 1300, W + 40, 700, (0.20, 0.16, 0.17))
    h = 520 * (1 - 0.82 * burn); top = 1300 - h
    if lit:
        fl = 1 + 0.08 * math.sin(t * 17) + 0.05 * math.sin(t * 29)
        glow(c, 540, top - 60, 520 * fl, (1.0, 0.70, 0.35), 0.45)
    Z.rbox(c, 470, top, 140, h, 14, (0.93, 0.89, 0.80))
    c.set_source_rgba(0.85, 0.80, 0.70, 1); c.move_to(470, top + 10); c.curve_to(480, top + 70, 455, top + 120, 470, top + 140); c.line_to(472, top + 10); c.fill()  # wax drip
    c.set_source_rgb(*OUTL); c.set_line_width(5); c.move_to(540, top); c.line_to(540, top - 24); c.stroke()
    if lit:
        fl = 1 + 0.10 * math.sin(t * 13)
        c.move_to(540, top - 24 - 90 * fl); c.curve_to(575, top - 60, 565, top - 18, 540, top - 18); c.curve_to(515, top - 18, 505, top - 60, 540, top - 24 - 90 * fl)
        c.set_source_rgb(1.0, 0.80, 0.40); c.fill()
        C2.ellipse(c, 540, top - 40, 10, 22); c.set_source_rgb(1.0, 0.97, 0.85); c.fill()
    if smoke > 0:
        for k in range(5):
            u = (t * 0.6 + k / 5) % 1
            c.set_source_rgba(0.75, 0.75, 0.8, 0.35 * (1 - u) * smoke); c.set_line_width(10 + 20 * u)
            c.move_to(540, top - 24); c.curve_to(540 + 60 * math.sin(k + t), top - 150 * u - 40, 540 - 50 * math.sin(k * 2 + t), top - 300 * u - 60, 540 + 30 * math.sin(k), top - 420 * u - 80); c.stroke()

def living_room(c, t, door_u=0.0, her=None, him_in=None, memory=False):
    """sofa in front, front door in the back-left; door_u 0..1 opens it"""
    Z.wall(c, 1450)
    Z.rect(c, 120, 640, 260, 810, (0.16, 0.13, 0.15))
    glow(c, 250, 1050, 300, (1.0, 0.85, 0.6), 0.4 * door_u)
    Z.box(c, [(120, 640), (380 - 220 * door_u, 640 + 30 * door_u), (380 - 220 * door_u, 1450 - 30 * door_u), (120, 1450)], (0.30, 0.25, 0.26))
    if him_in is not None: C2.person(c, 250, 1450, 560, "m", him_in)
    Z.rect(c, 700, 560, 240, 170, (0.18, 0.22, 0.34)); glow(c, 900, 720, 300, (1.0, 0.72, 0.42), 0.25)
    # sofa back
    Z.rbox(c, 120, 1150, 840, 260, 40, (0.30, 0.31, 0.42))
    if her is not None: Z.sit(c, "w", 560, 1420, 860, her)
    Z.rbox(c, 80, 1400, 920, 200, 40, (0.34, 0.35, 0.46))
    Z.rbox(c, 60, 1250, 120, 380, 40, (0.30, 0.31, 0.42)); Z.rbox(c, 900, 1250, 120, 380, 40, (0.30, 0.31, 0.42))

def chat_phone(c, t, msgs, when, header="Jonas", hands="w"):
    """msgs = [(text, mine, heart)], each appears at when[i]"""
    Z.wall(c, 1920, (0.12, 0.13, 0.20), (0.07, 0.07, 0.11))
    px, py, pw, ph = 540, 1000, 560, 1040
    glow(c, px, py, 700, (0.75, 0.85, 1.0), 0.22)
    Z.rbox(c, px - pw / 2, py - ph / 2, pw, ph, 60, (0.08, 0.08, 0.11))
    sx, sy, sw, sh = px - pw / 2 + 20, py - ph / 2 + 20, pw - 40, ph - 40
    c.save(); Z.rrect(c, sx, sy, sw, sh, 44); c.clip(); c.set_source_rgb(0.94, 0.94, 0.96); c.paint()
    c.set_source_rgb(0.98, 0.98, 1.0); c.rectangle(sx, sy, sw, 120); c.fill(); c.restore()
    c.set_source_rgb(0.58, 0.69, 0.59); c.arc(sx + 70, sy + 70, 30, 0, 2 * math.pi); c.fill()
    c.select_font_face("Inter", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD); c.set_font_size(32); c.set_source_rgb(0.12, 0.12, 0.16)
    c.move_to(sx + 120, sy + 82); c.show_text(header)
    y = sy + 170
    for (txt, mine, heart), t0 in zip(msgs, when):
        u = ease((t - t0) / 0.22)
        if u <= 0: continue
        c.set_font_size(40); w = c.text_extents(txt)[4] + (90 if heart else 50)
        bx = sx + sw - 30 - w if mine else sx + 30
        c.save(); c.translate(bx + w / 2, y + 40); c.scale(u, u); c.translate(-(bx + w / 2), -(y + 40))
        Z.rbox(c, bx, y, w, 96, 34, (0.79, 0.54, 0.57) if mine else (1, 1, 1), 2)
        c.set_source_rgb(1, 1, 1) if mine else c.set_source_rgb(0.15, 0.15, 0.2); c.move_to(bx + 24, y + 62); c.show_text(txt)
        if heart:
            c.save(); c.translate(bx + w - 40, y + 48); c.scale(0.6, 0.6)
            c.move_to(0, 30); c.curve_to(-70, -20, -45, -80, 0, -45); c.curve_to(45, -80, 70, -20, 0, 30); c.set_source_rgb(1, 0.9, 0.9); c.fill(); c.restore()
        c.restore()
        y += 130
    import video60 as V
    V.HANDS_CLOSE(c, hands, px, py, pw, ph)

def wall_calendar(c, t, t0, entries):
    Z.wall(c, 1920, (0.16, 0.17, 0.25), (0.11, 0.11, 0.17))
    Z.rect(c, 170, 420, 740, 900, (0.96, 0.95, 0.92))
    c.set_source_rgb(0.79, 0.54, 0.57); c.rectangle(170, 420, 740, 120); c.fill()
    c.select_font_face("Inter", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD); c.set_font_size(54); c.set_source_rgb(1, 1, 1)
    c.move_to(420, 500); c.show_text("November")
    for i in range(5):
        for j in range(7):
            x, y = 190 + j * 102, 560 + i * 148
            c.set_source_rgba(0, 0, 0, 0.12); c.rectangle(x, y, 96, 140); c.stroke()
            c.set_font_size(22); c.set_source_rgb(0.4, 0.4, 0.45); c.move_to(x + 8, y + 26); c.show_text(str(i * 7 + j + 1))
    for k, (cell, txt) in enumerate(entries):
        u = ease((t - t0 - 0.12 * k) / 0.15)
        if u <= 0: continue
        i, j = divmod(cell, 7); x, y = 190 + j * 102, 560 + i * 148
        c.set_source_rgba(0.79, 0.54, 0.57, 0.9 * u); c.rectangle(x + 6, y + 40, 84, 60); c.fill()
        c.set_font_size(18); c.set_source_rgba(1, 1, 1, u); c.move_to(x + 10, y + 76); c.show_text(txt)

def dollhouse(c, t, rooms_u=1.0):
    """house cut open: four rooms, she is busy in three of them, he is on the sofa in the fourth"""
    Z.wall(c, 1920, (0.07, 0.08, 0.13), (0.10, 0.10, 0.15))
    c.move_to(140, 520); c.line_to(540, 260); c.line_to(940, 520); c.close_path(); C2.finish(c, (0.30, 0.22, 0.24), 5)
    rooms = [(140, 520, "kitchen"), (540, 520, "kids"), (140, 940, "laundry"), (540, 940, "sofa")]
    for k, (x, y, kind) in enumerate(rooms):
        u = ease(rooms_u * 4 - k)
        Z.rect(c, x, y, 400, 420, (0.20, 0.21, 0.30) if kind != "sofa" else (0.17, 0.18, 0.26))
        glow(c, x + 200, y + 120, 240, (1.0, 0.75, 0.45), 0.25 * u)
        if u <= 0: continue
        gy = y + 400
        if kind == "kitchen":
            Z.rect(c, x + 20, y + 250, 360, 150, (0.30, 0.28, 0.32)); C2.ellipse(c, x + 300, y + 245, 50, 14); C2.finish(c, (0.25, 0.25, 0.3), 3)
            C2.person(c, x + 160, gy, 330, "w", dict(emo="worried", look=(0.6, 0.4), arm_r=(30, 60), arm_l=(10, 20)))
        elif kind == "kids":
            Z.rect(c, x + 230, y + 300, 150, 100, (0.45, 0.55, 0.75)); C2.ellipse(c, x + 300, y + 290, 40, 16); C2.finish(c, (0.95, 0.95, 0.97), 3)
            C2.person(c, x + 130, gy, 330, "w", dict(emo="neutral", look=(0.6, 0.3), arm_l=(10, 70), arm_r=(10, 70)))
        elif kind == "laundry":
            Z.rect(c, x + 250, y + 260, 130, 140, (0.80, 0.80, 0.84)); C2.ellipse(c, x + 315, y + 335, 40, 40); C2.finish(c, (0.35, 0.40, 0.52), 3)
            C2.person(c, x + 140, gy, 330, "w", dict(emo="sad", look=(0.5, 0.4), arm_l=(30, 40), arm_r=(30, 40)))
            Z.box(c, [(x + 80, gy - 170), (x + 200, gy - 170), (x + 190, gy - 110), (x + 90, gy - 110)], (0.75, 0.62, 0.45))
        else:
            Z.rbox(c, x + 40, y + 280, 320, 120, 20, (0.30, 0.31, 0.42))
            Z.sit(c, "m", x + 200, y + 330, 300, dict(emo="neutral", look=(0, 0.8), arm_l=(10, 140), arm_r=(10, 140), fore_k=0.6))
            glow(c, x + 200, y + 230, 80, (0.7, 0.85, 1.0), 0.6)
    c.set_source_rgb(*OUTL); c.set_line_width(8)
    c.rectangle(140, 520, 800, 840); c.move_to(540, 520); c.line_to(540, 1360); c.move_to(140, 940); c.line_to(940, 940); c.stroke()

def balance(c, t, tilt):
    """'geben' (many hearts) vs 'bekommen' (one heart); tilt 0..1"""
    Z.wall(c, 1920, (0.14, 0.15, 0.22), (0.08, 0.08, 0.12))
    a = math.radians(14 * tilt)
    Z.rect(c, 525, 720, 30, 560, (0.55, 0.45, 0.30)); Z.box(c, [(440, 1280), (640, 1280), (600, 1240), (480, 1240)], (0.55, 0.45, 0.30))
    for sd, lab, n in ((-1, "geben", 7), (1, "bekommen", 1)):
        ex = 540 + sd * 330 * math.cos(a); ey = 720 - sd * 330 * math.sin(a)      # left end goes down when tilted
        c.set_source_rgb(*OUTL); c.set_line_width(4); c.move_to(ex, ey); c.line_to(ex - 90, ey + 230); c.move_to(ex, ey); c.line_to(ex + 90, ey + 230); c.stroke()
        c.save(); c.translate(ex, ey + 240); c.scale(1, 0.25); c.arc(0, 0, 130, 0, math.pi); c.restore(); C2.finish(c, (0.80, 0.68, 0.40), 4)
        for k in range(n):
            hx = ex - 70 + (k % 4) * 46; hy = ey + 205 - (k // 4) * 40
            c.save(); c.translate(hx if n > 1 else ex, hy); c.scale(0.35, 0.35)
            c.move_to(0, 30); c.curve_to(-70, -20, -45, -80, 0, -45); c.curve_to(45, -80, 70, -20, 0, 30); c.set_source_rgb(0.85, 0.42, 0.45); c.fill(); c.restore()
        c.select_font_face("Inter", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD); c.set_font_size(40); c.set_source_rgb(1, 1, 1)
        w = c.text_extents(lab)[4]; c.move_to(ex - w / 2, ey + 330); c.show_text(lab)
    c.set_source_rgb(*OUTL); c.set_line_width(16); c.move_to(540 - 330 * math.cos(a), 720 + 330 * math.sin(a)); c.line_to(540 + 330 * math.cos(a), 720 - 330 * math.sin(a)); c.stroke()

def alley(c, t, cam_x=0.0):
    """autumn park alley receding into the distance"""
    g = cairo.LinearGradient(0, 0, 0, H); g.add_color_stop_rgb(0, 0.10, 0.10, 0.16); g.add_color_stop_rgb(1, 0.16, 0.13, 0.15)
    c.set_source(g); c.paint()
    c.move_to(480, 900); c.line_to(600, 900); c.line_to(1100, 1920); c.line_to(-20, 1920); c.close_path(); c.set_source_rgb(0.24, 0.20, 0.20); c.fill()
    for k in range(7):
        d = 1 / (1 + k * 0.6)
        for sd in (-1, 1):
            x = 540 + sd * (110 + 520 * d) - cam_x * d; top = 900 - 820 * d; base = 900 + 1000 * d
            c.set_source_rgb(0.12, 0.09, 0.09); c.set_line_width(40 * d); c.move_to(x, base); c.line_to(x, top + 200 * d); c.stroke()
            C2.ellipse(c, x, top + 120 * d, 230 * d, 200 * d); c.set_source_rgb(*[(0.55, 0.30, 0.20), (0.62, 0.40, 0.22), (0.45, 0.25, 0.20)][k % 3]); c.fill()
    for k in range(40):                          # leaves on the path
        x = 540 + ((k * 137) % 900 - 450) * (0.3 + (k % 7) / 7); y = 950 + (k * 97) % 950
        C2.ellipse(c, x, y, 14, 7, k); c.set_source_rgba(0.75, 0.45, 0.25, 0.8); c.fill()

def platform(c, t, train_u=0.0):
    """station platform at night; a train passes behind (light streaks)"""
    Z.wall(c, 1500, (0.10, 0.11, 0.17), (0.08, 0.08, 0.12))
    Z.rect(c, -20, 700, W + 40, 480, (0.12, 0.12, 0.16))
    if 0 < train_u < 1:
        off = -2400 + 4800 * train_u
        Z.rect(c, off, 760, 2600, 380, (0.22, 0.24, 0.30))
        for k in range(16):
            x = off + 60 + k * 160
            c.set_source_rgb(1.0, 0.92, 0.75); c.rectangle(x, 820, 110, 90); c.fill()
            glow(c, x + 55, 865, 120, (1.0, 0.85, 0.6), 0.35)
    for k in range(5): glow(c, 120 + k * 220, 300, 160, (0.85, 0.90, 1.0), 0.25); Z.rect(c, 90 + k * 220, 290, 60, 16, (0.9, 0.92, 1.0), 2)
    Z.rect(c, -20, 1180, W + 40, 40, (0.85, 0.78, 0.30))          # yellow platform edge
    Z.rect(c, -20, 1220, W + 40, 700, (0.20, 0.20, 0.25))
    Z.rect(c, 230, 1380, 620, 30, Z.WOOD)
