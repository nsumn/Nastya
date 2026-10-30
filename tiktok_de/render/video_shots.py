"""'Wie Mitbewohner' v2: one shot per sentence (~25 shots), every picture shows what the voice says.

Usage: python video_shots.py <alignment.csv> <out_dir> <worker> <n_workers> [--preview t1,t2,...]
"""
import math, os, subprocess, sys
ALIGN, OUT = sys.argv[1], sys.argv[2]
ARGS = sys.argv[3:]
sys.argv = [sys.argv[0], ALIGN, OUT]
import video60 as V                      # timing (E, t_of, CAPS), sets, look(), captions
import numpy as np
import cairocffi as cairo
from PIL import Image, ImageDraw
from storybook import Pen, shape, ellipse_pts, glow

A, SA, SF = V.A, V.SA, V.SF
W, H, FPS = V.W, V.H, V.FPS
OUTL = V.OUTL
ease, ramp, t_of, DUR = V.ease, V.ramp, V.t_of, V.DUR
breath, blink = V.breath, V.blink
CORAL, TEAL = (0.90, 0.55, 0.63), (0.56, 0.72, 0.60)        # accent colours: dusty rose / sage
ROSE_RGB = (240, 158, 172)
A.SWEATER_W, A.SWEATER_W_SH = (0.89, 0.66, 0.71), (0.77, 0.56, 0.61)   # her: dusty rose
A.SWEATER_M, A.SWEATER_M_SH = (0.60, 0.74, 0.63), (0.51, 0.64, 0.54)   # him: sage
V.ACC = ROSE_RGB; SA.ACC = ROSE_RGB
SUB_Y = 1330
def title(im):
    d = ImageDraw.Draw(im)
    for i, words in enumerate((("Wenn", "ihr", "nur", "noch"), ("wie", "Mitbewohner", "lebt"))):
        f = V.F_TOP; sp = f.getlength(" "); tw = sum(f.getlength(w) for w in words) + sp * (len(words) - 1); x = 540 - tw / 2
        for w in words:
            d.text((x, 220 + i * 92), w, font=f, fill=ROSE_RGB if w == "Mitbewohner" else (255, 255, 255), stroke_width=7, stroke_fill=(16, 16, 22)); x += f.getlength(w) + sp

def bg(c):
    g = cairo.LinearGradient(0, 0, 0, H); g.add_color_stop_rgb(0, *SA.WALL0); g.add_color_stop_rgb(1, *SA.WALL1)
    c.set_source(g); c.paint()

def text_c(c, txt, x, y, size, col=(1, 1, 1), a=1.0):
    c.select_font_face("Inter", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD); c.set_font_size(size)
    ext = c.text_extents(txt); c.move_to(x - ext[4] / 2, y); c.set_source_rgba(*col, a); c.show_text(txt)

# ---------------------------------------------------------------- building blocks
def sofa(c, t, her=None, him=None, cushion_x=0, lamp=0.0, cal=False, lean=0.0, her_x=300, him_x=790, heart_glow=0.0):
    SA.room(c, Pen(3))
    if cal:   # small wall calendar showing 'Di'
        shape(c, Pen(3), [(150, 470), (270, 470), (270, 600), (150, 600)], (0.95, 0.93, 0.88), smooth=False, lw=3, line=OUTL)
        c.set_source_rgb(*CORAL); c.rectangle(150, 470, 120, 34); c.fill(); text_c(c, "DI", 210, 580, 54, (0.15, 0.15, 0.2))
    if lamp: glow(c, 960, 660, 700, (1.0, 0.70, 0.40), 0.35 * lamp)
    A.man(c, Pen(13), him_x, 760, 0.82, dict(dict(phone=1, look=(0, 0.9), scroll=t * 2.0, thumb=-4 * abs(math.sin(t * 6)), breath=breath(t, 2.0),
                                                  tilt=-2 + 1.5 * math.sin(t * 0.9), blink=blink(t, 4.1)), **(him or {})))
    c.save(); c.translate(her_x, 1500); c.rotate(math.radians(9 * lean)); c.translate(-her_x, -1500)
    A.woman(c, Pen(11), her_x + 60 * lean, 790, 0.82, dict(dict(phone=1, sad=0.3, look=(0, 0.9), breath=breath(t), blink=blink(t, 3.3, 1.0)), **(her or {})))
    c.restore()
    if heart_glow > 0:   # she holds out a small glowing heart (a 'bid for connection')
        hx, hy = her_x + 120 + 120 * heart_glow, 820 - 120 * heart_glow     # floats from her hands towards him
        glow(c, hx, hy, 160, (1.0, 0.55, 0.45), 0.6 * heart_glow)
        c.save(); c.translate(hx, hy); s = 1 + 0.08 * math.sin(t * 5)
        c.scale(s * heart_glow, s * heart_glow); V.heart(c, 0, 0, 46); c.set_source_rgb(*CORAL); c.fill_preserve()
        c.set_source_rgb(*OUTL); c.set_line_width(3); c.stroke(); c.restore()
    if lean < 0.95: V.cushion(c, Pen(17), cushion_x - 120 * lean)
    SA.sofa_front(c, Pen(5))

def kitchen_both(c, t, her=None, him=None, plates=False):
    V.kitchen(c, Pen(3), 20, 15)
    A.woman(c, Pen(11), 300, 780, 0.82, dict(dict(phone=0, sad=0.2, look=(0.9, 0.1), tilt=3, breath=breath(t), blink=blink(t, 3.0)), **(her or {})))
    A.man(c, Pen(13), 790, 760, 0.82, dict(dict(phone=1, look=(0, 0.9), scroll=t * 1.5, breath=breath(t, 2.0), tilt=-2, blink=blink(t, 4.0)), **(him or {})))
    V.table(c, Pen(19))
    if plates:
        for x in (300, 790):
            shape(c, Pen(19), ellipse_pts(x, 1225, 120, 28, 24), (0.88, 0.86, 0.82), lw=3, line=OUTL)
            shape(c, Pen(19), ellipse_pts(x, 1222, 70, 15, 20), (0.85, 0.55, 0.35), lw=2, line=OUTL)

def big_phone(c, header, header_col):
    bg(c)
    px, py, pw, ph = 540, 1000, 560, 1040
    glow(c, px, py, 700, (0.75, 0.85, 1.0), 0.25)
    shape(c, Pen(3), [(px - pw / 2, py - ph / 2), (px + pw / 2, py - ph / 2), (px + pw / 2, py + ph / 2), (px - pw / 2, py + ph / 2)], (0.10, 0.10, 0.13), smooth=False, lw=4, line=OUTL)
    sx, sy, sw, sh = px - pw / 2 + 22, py - ph / 2 + 60, pw - 44, ph - 120
    c.set_source_rgb(0.93, 0.94, 0.97); c.rectangle(sx, sy, sw, sh); c.fill()
    c.set_source_rgb(*header_col); c.rectangle(sx, sy, sw, 90); c.fill()
    text_c(c, header, px, sy + 60, 38, (1, 1, 1))
    return sx, sy, sw, sh

def hands_on_phone(c, side_col, px=540, py=1000, pw=560, ph=1040):
    for side in (-1, 1):
        shape(c, Pen(11), ellipse_pts(px + side * (pw / 2 - 10), py + ph / 2 - 120, 60, 110, 18, rot=side * 0.4), side_col, lw=3, line=OUTL)

# ---------------------------------------------------------------- shots
def s_sofa_wide(c, t): sofa(c, t)
def s_gap(c, t): sofa(c, t, her=dict(look=(0.3, 0.9)))
def s_eat(c, t): kitchen_both(c, t, her=dict(phone=0, look=(0, 1.0), sad=0.2), him=dict(phone=0, look=(0, 1.0)), plates=True)
def s_his_phone(c, t):
    sx, sy, sw, sh = big_phone(c, "Bundesliga", (0.16, 0.45, 0.70))
    for k, (a, b, sc) in enumerate((("Dortmund", "Bayern", "2 : 1"), ("Leipzig", "Bremen", "0 : 0"), ("Köln", "Mainz", "1 : 3"), ("Hamburg", "Kiel", "2 : 2"))):
        y = sy + 170 + k * 130 - (t * 30) % 130 * 0
        c.set_source_rgb(1, 1, 1); c.rectangle(sx + 20, y - 60, sw - 40, 100); c.fill()
        c.select_font_face("Inter", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD); c.set_font_size(30); c.set_source_rgb(0.15, 0.15, 0.2)
        c.move_to(sx + 40, y); c.show_text(a); ext = c.text_extents(b); c.move_to(sx + sw - 40 - ext[4], y); c.show_text(b)
        text_c(c, sc, sx + sw / 2, y, 34, (0.16, 0.45, 0.70))
    hands_on_phone(c, A.SKIN)
def s_faces(c, t): sofa(c, t, her=dict(look=(0, 1.0), sad=0.5), him=dict(look=(0, 1.0)))
def s_term(c, t):
    bg(c); lt = t - t_of("Psychologen")
    apart = ease((lt - 0.3) / 2.2)
    text_c(c, "Emotionale", 540, 560, 92, (1, 1, 1), ramp(t, t_of("Psychologen")))
    text_c(c, "Entfremdung", 540, 670, 92, (0.95, 0.66, 0.73), ramp(t, t_of("Entfremdung") - 0.2))
    for x0, col, d in ((470, CORAL, -1), (610, TEAL, 1)):
        x = x0 + d * 170 * apart
        glow(c, x, 900, 180, col, 0.35); shape(c, Pen(3), ellipse_pts(x, 900, 80, 80, 26), col, lw=4, line=OUTL)
    c.set_source_rgba(1, 1, 1, 0.5 * (1 - apart)); c.set_line_width(5); c.move_to(470 - 170 * apart + 80, 900); c.line_to(610 + 170 * apart - 80, 900); c.stroke()
def s_days(c, t):
    bg(c); lt = t - t_of("Sie entsteht")
    days = ["MONTAG", "DIENSTAG", "MITTWOCH", "DONNERSTAG", "FREITAG", "SAMSTAG", "SONNTAG", "MONTAG", "DIENSTAG"]
    k = min(len(days) - 1, int(lt / 0.42))
    for j in range(3, 0, -1):    # stacked pages behind
        shape(c, Pen(3), [(330 + j * 10, 470 + j * 10), (750 + j * 10, 470 + j * 10), (750 + j * 10, 1000 + j * 10), (330 + j * 10, 1000 + j * 10)], (0.82, 0.80, 0.76), smooth=False, lw=3, line=OUTL)
    shape(c, Pen(3), [(330, 470), (750, 470), (750, 1000), (330, 1000)], (0.96, 0.95, 0.92), smooth=False, lw=3, line=OUTL)
    c.set_source_rgb(*CORAL); c.rectangle(330, 470, 420, 110); c.fill()
    text_c(c, days[k], 540, 548, 50, (1, 1, 1)); text_c(c, str(12 + k), 540, 860, 230, (0.15, 0.15, 0.2))
    fl = (lt / 0.42) % 1                          # page flying away
    if fl < 0.5 and k > 0:
        c.save(); c.translate(540, 470); c.rotate(-1.2 * fl); c.translate(-540 + 400 * fl, -470 - 500 * fl)
        shape(c, Pen(3), [(330, 470), (750, 470), (750, 1000), (330, 1000)], (0.96, 0.95, 0.92), smooth=False, lw=3, line=OUTL)
        c.restore()
def s_turn(c, t):
    lk = ramp(t, t_of("zugeht") - 0.3) * (1 - ramp(t, t_of("keine Antwort") + 0.8))
    sofa(c, t, her=dict(look=(0.95 * lk, 0.9 * (1 - lk)), tilt=6 * lk, sad=0.4 + 0.4 * ramp(t, t_of("keine Antwort"))))
def s_tell(c, t):
    tk = 0.5 + 0.5 * abs(math.sin(t * 9))
    kitchen_both(c, t, her=dict(talk=tk, smile=0.5, look=(0.9, 0.1), tilt=4))
def s_hm(c, t):
    kitchen_both(c, t, her=dict(sad=0.6, look=(0.9, 0.1)), him=dict(look=(0, 0.9)))
    u = ease((t - t_of("Hm") + 0.1) / 0.2)
    if u > 0:
        bx, by = 890, 560
        c.save(); c.translate(bx, by); c.scale(u, u)
        shape(c, Pen(3), ellipse_pts(0, 0, 110, 70, 24), (1, 1, 1), lw=4, line=OUTL)
        c.move_to(-50, 55); c.line_to(-90, 110); c.line_to(-10, 66); c.set_source_rgb(1, 1, 1); c.fill()
        text_c(c, "Hm.", 0, 18, 64, (0.15, 0.15, 0.2)); c.restore()
def s_chat(c, t): V.sc_phone(c, t)
def s_bid(c, t):
    hg = ramp(t, t_of("Angebote") - 0.5, 0.6)
    sofa(c, t, her=dict(phone=0, look=(0.9, 0.2), tilt=5, smile=0.4), heart_glow=hg)
    text_c(c, "Angebote für Nähe", 540, 470, 58, (0.97, 0.76, 0.81), ramp(t, t_of("Angebote") - 0.2))
def s_hearts(c, t): V.sc_gottman(c, t)
def s_stops(c, t):
    lt = t - t_of("Irgendwann")
    tk = (0.5 + 0.5 * abs(math.sin(t * 9))) if 0.3 < lt < 1.1 else 0
    away = ramp(t, t_of("Irgendwann") + 1.3, 0.6)
    sofa(c, t, her=dict(phone=0.3, talk=tk, look=(0.9 * (1 - away) - 0.8 * away, 0.2 + 0.6 * away), tilt=5 * (1 - away) - 5 * away, sad=0.5 + 0.4 * away))
def s_tear(c, t):
    lt = t - t_of("Nicht, weil")
    sofa(c, t, her=dict(phone=0.2, sad=1.0, look=(-0.4, 0.7), tilt=-4, blink=blink(t, 2.6)))
    # tear running down her cheek (face centre 300,790 at scale .82)
    ty = 812 + min(60, 22 * max(0.0, lt - 0.8))
    if lt > 0.6:
        c.set_source_rgba(0.65, 0.85, 1.0, 0.95); x = 300 - 28
        c.move_to(x, ty - 10); c.curve_to(x - 7, ty + 2, x - 6, ty + 10, x, ty + 10); c.curve_to(x + 6, ty + 10, x + 7, ty + 2, x, ty - 10); c.fill()
def s_alone(c, t): V.sc_alone(c, t)
def s_good(c, t): sofa(c, t, lamp=ramp(t, t_of("Die gute"), 1.0), her=dict(sad=0.2))
def s_simple(c, t): sofa(c, t, lamp=1.0, her=dict(sad=0.1), him=dict())
def s_putdown(c, t):
    down = ramp(t, t_of("Leg das") + 0.2, 0.8); turn = ramp(t, t_of("Leg das") + 0.9, 0.6)
    sofa(c, t, lamp=1.0, him=dict(phone=1 - down, look=(-0.9 * turn, 0.9 * (1 - turn)), tilt=-6 * turn, smile=0.4 * turn, scroll=t * 2 * (1 - down)),
         her=dict(phone=0, talk=0.5 + 0.5 * abs(math.sin(t * 9)) if t > t_of("wenn sie etwas") else 0, look=(0.9, 0.1), tilt=4, sad=0, smile=0.3))
def s_laugh(c, t):
    sofa(c, t, lamp=1.0, him=dict(phone=0, look=(-0.9, 0.3), tilt=-7, smile=1.0, sad=0), her=dict(phone=1, look=(0.6, 0.6), smile=0.9, sad=0, tilt=4), lean=0.25)
def s_vacation(c, t):
    bg(c)
    glow(c, 540, 820, 500, (1.0, 0.75, 0.45), 0.25)
    shape(c, Pen(3), ellipse_pts(700, 640, 90, 90, 24), (1.0, 0.82, 0.45), lw=4, line=OUTL)
    shape(c, Pen(3), [(220, 980), (860, 980), (860, 1180), (220, 1180)], (0.35, 0.62, 0.78), smooth=False, lw=4, line=OUTL)
    shape(c, Pen(3), [(220, 1090), (860, 1090), (860, 1180), (220, 1180)], (0.93, 0.83, 0.62), smooth=False, lw=3, line=OUTL)
    shape(c, Pen(3), [(380, 1100), (395, 760), (410, 760), (400, 1100)], (0.55, 0.38, 0.25), smooth=False, lw=3, line=OUTL)
    for a in (-2.4, -1.9, -1.2, -0.7):
        shape(c, Pen(3), [(400, 760), (400 + 130 * math.cos(a), 760 + 90 * math.sin(a) + 40), (400 + 160 * math.cos(a), 760 + 60 * math.sin(a) + 80)], None, line=(0.25, 0.55, 0.35), lw=14, close=False)
    x = ease((t - t_of("Urlaub") - 0.1) / 0.3)
    if x > 0:
        c.set_source_rgba(0.95, 0.25, 0.25, 0.95); c.set_line_width(26); c.set_line_cap(cairo.LINE_CAP_ROUND)
        c.move_to(250, 560); c.line_to(250 + 580 * x, 560 + 640 * x); c.stroke()
        if x > 0.5:
            y2 = (x - 0.5) * 2; c.move_to(830, 560); c.line_to(830 - 580 * y2, 560 + 640 * y2); c.stroke()
    text_c(c, "Urlaub", 540, 470, 70, (1, 1, 1))
def s_tuesday(c, t):
    lean = ramp(t, t_of("Dienstagabend") - 0.4, 1.0)
    sofa(c, t, lamp=1.0, cal=True, lean=lean, him=dict(phone=0, look=(-0.6, 0.6), tilt=-3 + 3 * lean, smile=0.8, blink=False),
         her=dict(phone=0, smile=0.8, sad=0, look=(0.6, 0.4), tilt=8 * lean, blink=lean > 0.8))
def s_cta(c, t):
    s_tuesday(c, t)
    for x, t0, kind in ((360, t_of("Schick das"), "send"), (720, t_of("speichere"), "save")):
        u = ease((t - t0) / 0.3)
        if u <= 0: continue
        sc = 1 + 0.25 * math.exp(-(t - t0) * 5) * math.sin((t - t0) * 18)
        glow(c, x, 470, 200, (1.0, 0.72, 0.42), 0.35 * u)
        c.save(); c.translate(x, 470); c.scale(sc * u, sc * u); c.set_source_rgb(*CORAL)
        if kind == "send": c.move_to(-70, -10); c.line_to(80, -70); c.line_to(20, 80); c.line_to(0, 10)
        else: c.move_to(-50, -70); c.line_to(50, -70); c.line_to(50, 75); c.line_to(0, 40); c.line_to(-50, 75)
        c.close_path(); c.fill(); c.restore()

# camera presets: (cx, cy, zoom)  — what part of the 1080x1920 set fills the screen
WIDE = (540, 950, 1.0)
GAP = (540, 1080, 2.0)            # cushion + hands between them
FACES = (545, 870, 1.45)
HIM_CU = (760, 860, 1.9)
HER_CU = (330, 930, 2.4)          # her face lands above the centred captions
MED = (540, 930, 1.2)
try:   # anchored on the 'Wie Mitbewohner' script; when another script is loaded only the building blocks are used
    SHOTS = [
        (0.0, s_sofa_wide, WIDE), (t_of("aber nicht"), s_gap, GAP), (t_of("Kein großer"), s_eat, MED), (t_of("Keine Affäre"), s_his_phone, WIDE),
        (t_of("Nur zwei"), s_sofa_wide, WIDE), (t_of("und jeder"), s_faces, FACES), (t_of("Psychologen"), s_term, WIDE),
        (t_of("Sie entsteht"), s_days, WIDE), (t_of("sondern in hundert"), s_turn, MED), (t_of("Sie erzählt"), s_tell, MED),
        (t_of("und er sagt") + 0.4, s_hm, HIM_CU), (t_of("Sie schickt"), s_chat, WIDE), (t_of("Der Beziehungsforscher"), s_bid, MED),
        (t_of("In seiner"), s_hearts, WIDE), (t_of("Irgendwann"), s_stops, MED), (t_of("Nicht, weil"), s_tear, HER_CU),
        (t_of("Und genau"), s_alone, WIDE), (t_of("Die gute"), s_good, WIDE), (t_of("Ihr müsst"), s_simple, MED),
        (t_of("Leg das"), s_putdown, FACES), (t_of("Antworte"), s_laugh, FACES), (t_of("Nähe entsteht") , s_vacation, WIDE),
        (t_of("sondern an einem"), s_tuesday, MED), (t_of("Schick das"), s_cta, WIDE),
    ]
except AssertionError:
    SHOTS = []

def frame(t):
    k = max(i for i, s in enumerate(SHOTS) if s[0] <= t)
    t0, fn, (cx, cy, z) = SHOTS[k]; t1 = SHOTS[k + 1][0] if k + 1 < len(SHOTS) else DUR
    s = cairo.ImageSurface(cairo.FORMAT_RGB24, W, H); c = cairo.Context(s)
    zz = z * (1 + 0.04 * ease((t - t0) / max(0.1, t1 - t0)))
    c.translate(540, 950); c.scale(zz, zz); c.translate(-cx, -cy)
    fn(c, t)
    c.identity_matrix()
    f = min(ease((t - t0) / 0.12) if k else 1.0, ease((t1 - t) / 0.12) if k + 1 < len(SHOTS) else ease((DUR - t) / 0.8))
    if f < 1: c.set_source_rgba(0, 0, 0, 0.7 * (1 - f)); c.paint()
    s.flush()
    arr = np.frombuffer(s.get_data(), np.uint8).reshape(H, W, 4)[:, :, [2, 1, 0]].copy()
    im = Image.fromarray(SF.look(arr, int(t * FPS)))
    if t < t_of("Kein großer") - 0.2:
        title(im)
    for s0, e0, ws, hl in V.CAPS:
        if s0 - 0.02 <= t < e0:
            V.draw_caption(im, ws, hl, SUB_Y, V.F_SUB, ease((t - s0 + 0.02) / 0.09)); break
    return im

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    if "--preview" in ARGS:
        ts = [float(x) for x in ARGS[ARGS.index("--preview") + 1].split(",")]
        for t in ts: frame(t).resize((360, 640)).save(f"{OUT}/shot_{t:05.1f}.png")
        sys.exit()
    wi, nw = int(ARGS[0]), int(ARGS[1]); n = int(math.ceil(DUR * FPS)); per = math.ceil(n / nw)
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                          "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", f"{OUT}/part_{wi}.mp4"], stdin=subprocess.PIPE)
    for i in range(wi * per, min(n, (wi + 1) * per)): p.stdin.write(frame(i / FPS).tobytes())
    p.stdin.close(); p.wait(); print("done", wi)
