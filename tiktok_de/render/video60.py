"""~80 s video 'Wie Mitbewohner' in our look (graphite night, coral her / teal him, static fog, soft).

Usage: python video60.py <alignment.csv> <out_dir> <worker> <n_workers> [--preview t1,t2,...]
"""
import csv, math, os, re, subprocess, sys
ALIGN, OUT = sys.argv[1], sys.argv[2]
ARGS = sys.argv[3:]
sys.argv = [sys.argv[0], OUT, "--static", "--noboil"]
import numpy as np
import cairocffi as cairo
from PIL import Image, ImageDraw, ImageFont
import sofa_fog as SF                     # look(): fog + softness; also imports sofa_anim (palette) and adult
import sofa_anim as SA
import adult as A
from storybook import Pen, shape, ellipse_pts, glow

W, H, FPS = 1080, 1920, 24
OUTL = SA.OUTL
def ease(u): u = max(0.0, min(1.0, u)); return u * u * (3 - 2 * u)
def ramp(t, t0, d=0.4): return ease((t - t0) / d)

# ---------------------------------------------------------------- timing from the alignment
rows = list(csv.DictReader(open(ALIGN, encoding="utf-8")))
CH = "".join(r["char"] for r in rows); ST = [float(r["start"]) for r in rows]; EN = [float(r["end"]) for r in rows]
END = EN[-1]; DUR = END + 1.6
def t_of(phrase, nth=0):
    i = -1
    for _ in range(nth + 1): i = CH.find(phrase, i + 1)
    assert i >= 0, phrase
    return ST[i]
PARA = [0.0]
for m in re.finditer(r"\n\s*\n", CH):
    i = m.end()
    while CH[i].isspace(): i += 1
    PARA.append(ST[i])
try:   # scene anchors of the 'Wie Mitbewohner' script; other scripts don't have them
    E = dict(menschen=t_of("zwei Menschen"), handy=t_of("eigenes Handy"), entfremdung=t_of("Entfremdung"), zugeht=t_of("zugeht"),
             keine_antwort=t_of("keine Antwort"), hm=t_of("Hm"), foto=t_of("schickt ihm"), liest=t_of("Er liest"), gottman=t_of("Gottman"),
             zusammen=t_of("zusammenblieben"), neun=t_of("neun von zehn"), trennten=t_of("trennten"), dritte=t_of("jedes dritte"),
             stille=t_of("diese Stille"), handyweg=t_of("Leg das Handy"), antworte=t_of("Antworte"), dienstag=t_of("Dienstagabend"),
             schick=t_of("Schick das"), speichere=t_of("speichere"))
except AssertionError:
    E = {}

def words():
    out = []
    for m in re.finditer(r"\S+", CH):
        if m.group(0).startswith("{{"): continue
        for q in re.finditer(r".+?(?:[.?!,;:](?=[A-Za-zÄÖÜäöüß])|$)", m.group(0)):
            a0, a1 = m.start() + q.start(), m.start() + q.end()
            out.append((q.group(0), ST[a0], EN[a1 - 1]))
    return out
def groups(ws, max_words=3, max_chars=16):
    gs, cur = [], []
    for w in ws:
        txt = " ".join(x[0] for x in cur + [w])
        if cur and (len(cur) >= max_words or len(txt) > max_chars): gs.append(cur); cur = []
        cur.append(w)
        if re.search(r"[.?!,:;]$", w[0]): gs.append(cur); cur = []
    if cur: gs.append(cur)
    res = []
    for k, g in enumerate(gs):
        s0 = g[0][1]; e0 = gs[k + 1][0][1] if k + 1 < len(gs) else g[-1][2] + 0.5
        e0 = min(e0, g[-1][2] + 0.6)
        clean = [re.sub(r"[.,:;]", "", x[0]) for x in g]
        hl = max(range(len(clean)), key=lambda j: len(clean[j]))
        res.append((s0, e0, clean, hl if len(clean[hl]) >= 4 else -1))
    return res
CAPS = groups(words())

# ---------------------------------------------------------------- sets
def kitchen(c, pen, hour=21, minute=40, lamp=1.0):
    g = cairo.LinearGradient(0, 0, 0, H); g.add_color_stop_rgb(0, *SA.WALL0); g.add_color_stop_rgb(1, *SA.WALL1)
    c.set_source(g); c.paint()
    shape(c, pen, [(40, 380), (430, 380), (430, 560), (40, 560)], (0.21, 0.23, 0.33), smooth=False, lw=3, line=OUTL)
    shape(c, pen, [(235, 384), (235, 556)], None, lw=3, close=False, smooth=False, line=OUTL)
    cx, cy = 820, 470
    shape(c, pen, ellipse_pts(cx, cy, 88, 88, 26), (0.90, 0.88, 0.82), lw=4, line=OUTL)
    for k in range(12):
        a = k / 12 * 2 * math.pi
        shape(c, pen, [(cx + math.sin(a) * 70, cy - math.cos(a) * 70), (cx + math.sin(a) * 80, cy - math.cos(a) * 80)], None, lw=3, close=False, smooth=False, line=OUTL)
    for frac, ln, lw in ((minute / 60, 66, 4), (((hour % 12) + minute / 60) / 12, 44, 6)):
        a = frac * 2 * math.pi
        shape(c, pen, [(cx, cy), (cx + math.sin(a) * ln, cy - math.cos(a) * ln)], None, lw=lw, close=False, smooth=False, line=OUTL)
    shape(c, pen, [(540, 0), (540, 600)], None, lw=3, close=False, smooth=False, line=OUTL)
    shape(c, pen, [(470, 660), (610, 660), (580, 600), (500, 600)], (1.0, 0.70, 0.45), smooth=False, lw=3, line=OUTL)
    glow(c, 540, 700, 620, (1.0, 0.72, 0.42), 0.30 * lamp)

def table(c, pen, plate=None, phone_down=None):
    shape(c, pen, [(-20, 1180), (1100, 1180), (1100, 1560), (-20, 1560)], (0.30, 0.25, 0.27), smooth=False, lw=3, line=OUTL)
    shape(c, pen, [(-20, 1180), (1100, 1180)], None, line=(0.42, 0.34, 0.34), lw=8, close=False, smooth=False)
    if plate:
        shape(c, pen, ellipse_pts(plate, 1215, 120, 28, 24), (0.88, 0.86, 0.82), lw=3, line=OUTL)
        shape(c, pen, ellipse_pts(plate, 1212, 76, 17, 20), (0.80, 0.78, 0.74), lw=2, line=OUTL)
    if phone_down:
        shape(c, pen, [(phone_down - 40, 1200), (phone_down + 40, 1196), (phone_down + 44, 1226), (phone_down - 44, 1230)], (0.10, 0.10, 0.13), lw=2.4, line=OUTL)

def cushion(c, pen, x=0):
    shape(c, pen, [(468 + x, 1080), (612 + x, 1070), (622 + x, 1205), (462 + x, 1212)], (0.86, 0.76, 0.58), lw=3, line=OUTL)

def lamp_dim(c, a):
    if a > 0: c.set_source_rgba(0.02, 0.02, 0.05, a); c.paint()

# ---------------------------------------------------------------- scenes (each draws the whole frame)
def breath(t, f=1.9, k=3): return k * math.sin(t * f)
def blink(t, period=3.7, off=0.0): return ((t + off) % period) < 0.11

def sc_sofa_intro(c, t):            # P0 + P1: both on phones; she looks at him, he doesn't notice
    pen = Pen(3); SA.room(c, pen)
    lk = ramp(t, E["menschen"] - 0.2) * (1 - ramp(t, E["handy"] + 0.3))
    A.man(c, Pen(13), 790, 760, 0.82, dict(phone=1, sad=0, look=(0, 0.9), scroll=t * 2.0, thumb=-4 * abs(math.sin(t * 6)), breath=breath(t, 2.0),
                                           smile=0.6 * ramp(t, 8.0) * (1 - ramp(t, 12.0)), tilt=-2 + 1.5 * math.sin(t * 0.9), blink=blink(t, 4.1)))
    A.woman(c, Pen(11), 300, 790, 0.82, dict(phone=1, sad=0.3 + 0.3 * lk, look=(0.95 * lk, 0.9 * (1 - lk) + 0.2 * lk), tilt=6 * lk,
                                             breath=breath(t), scroll=0.5 * min(t, 1.2), blink=blink(t, 3.3, 1.0)))
    cushion(c, Pen(17)); SA.sofa_front(c, Pen(5))

def sc_sofa_drift(c, t):            # P2: they drift apart, light dims; she reaches out with her eyes, no answer
    lt = t - PARA[2]; apart = ease(lt / 8)
    pen = Pen(3); SA.room(c, pen)
    lk = ramp(t, E["zugeht"] - 0.3) * (1 - ramp(t, E["keine_antwort"] + 0.8))
    A.man(c, Pen(13), 790 + 40 * apart, 760, 0.82, dict(phone=1, sad=0.1, look=(0.1, 0.9), scroll=t * 2.0, thumb=-4 * abs(math.sin(t * 6)),
                                                          breath=breath(t, 2.0), tilt=-2, blink=blink(t, 4.1)))
    A.woman(c, Pen(11), 300 - 30 * apart, 790, 0.82, dict(phone=1 - 0.6 * ramp(t, E["keine_antwort"]), sad=0.5 + 0.4 * apart,
                                                          look=(0.95 * lk, 0.9 * (1 - lk)), tilt=5 * lk - 3 * ramp(t, E["keine_antwort"]),
                                                          breath=breath(t), blink=blink(t, 3.3, 1.0)))
    cushion(c, Pen(17), 5 * apart); SA.sofa_front(c, Pen(5))
    lamp_dim(c, 0.28 * apart)

def sc_kitchen_talk(c, t):          # P3a: she tells about her day, he stays on his phone ('Hm')
    kitchen(c, Pen(3), 20, 15)
    talking = t < E["hm"] - 0.1
    tk = (0.5 + 0.5 * abs(math.sin(t * 9))) * (1 if talking else 0)
    A.woman(c, Pen(11), 300, 780, 0.82, dict(phone=0, sad=0.1 + 0.6 * ramp(t, E["hm"] + 0.2), smile=0.5 * (1 - ramp(t, E["hm"])), talk=tk,
                                             look=(0.9, 0.1), tilt=4, breath=breath(t), blink=blink(t, 3.0)))
    A.man(c, Pen(13), 790, 760, 0.82, dict(phone=1, look=(0, 0.9), scroll=t * 1.5, breath=breath(t, 2.0), tilt=-2, blink=blink(t, 4.0)))
    table(c, Pen(19), plate=None)

def _hands_close(c, kind, px, py, pw, ph):
    for side in (-1, 1):
        shape(c, Pen(11), ellipse_pts(px + side * (pw / 2 - 10), py + ph / 2 - 120, 60, 110, 18, rot=side * 0.4), A.SKIN, lw=3, line=OUTL)
HANDS_CLOSE = _hands_close

def sc_phone(c, t):                 # P3b: close-up of her phone: photo sent, read, he starts typing ... and stops
    lt = t - E["foto"] + 0.3
    g = cairo.LinearGradient(0, 0, 0, H); g.add_color_stop_rgb(0, *SA.WALL0); g.add_color_stop_rgb(1, *SA.WALL1)
    c.set_source(g); c.paint()
    pen = Pen(3)
    px, py, pw, ph = 540, 1000, 560, 1040
    glow(c, px, py, 700, (0.75, 0.85, 1.0), 0.25)
    shape(c, pen, [(px - pw / 2, py - ph / 2), (px + pw / 2, py - ph / 2), (px + pw / 2, py + ph / 2), (px - pw / 2, py + ph / 2)], (0.10, 0.10, 0.13), smooth=False, lw=4, line=OUTL)
    sx, sy, sw, sh = px - pw / 2 + 22, py - ph / 2 + 60, pw - 44, ph - 120
    c.set_source_rgb(0.93, 0.94, 0.97); c.rectangle(sx, sy, sw, sh); c.fill()
    c.set_source_rgb(0.86, 0.88, 0.93); c.rectangle(sx, sy, sw, 90); c.fill()
    shape(c, pen, ellipse_pts(sx + 60, sy + 45, 28, 28, 18), (0.56, 0.72, 0.60), lw=2.4, line=OUTL)
    c.select_font_face("Inter", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD); c.set_font_size(34); c.set_source_rgb(0.12, 0.12, 0.16)
    c.move_to(sx + 105, sy + 57); c.show_text("Jonas")
    # earlier message from him (old) and her new photo bubble
    shape(c, pen, [(sx + 24, sy + 130), (sx + 300, sy + 130), (sx + 300, sy + 200), (sx + 24, sy + 200)], (1, 1, 1), lw=2, line=(0.75, 0.76, 0.8))
    c.set_font_size(28); c.set_source_rgb(0.2, 0.2, 0.25); c.move_to(sx + 44, sy + 175); c.show_text("Bin später da.")
    pop = ease(lt / 0.35)
    if pop > 0:
        bx0, by0, bx1, by1 = sx + sw - 330, sy + 260, sx + sw - 24, sy + 600
        c.save(); c.translate(bx1, by1); c.scale(pop, pop); c.translate(-bx1, -by1)
        shape(c, pen, [(bx0, by0), (bx1, by0), (bx1, by1), (bx0, by1)], (1.0, 0.86, 0.80), smooth=False, lw=2, line=(0.8, 0.6, 0.55))
        c.set_source_rgb(0.98, 0.78, 0.55); c.rectangle(bx0 + 16, by0 + 16, bx1 - bx0 - 32, 220); c.fill()       # little sunset photo
        c.set_source_rgb(1.0, 0.95, 0.7); c.arc(bx0 + 200, by0 + 120, 34, 0, 2 * math.pi); c.fill()
        c.set_source_rgb(0.30, 0.40, 0.55); c.move_to(bx0 + 16, by0 + 236); c.line_to(bx0 + 100, by0 + 160); c.line_to(bx0 + 170, by0 + 200)
        c.line_to(bx0 + 240, by0 + 150); c.line_to(bx1 - 16, by0 + 210); c.line_to(bx1 - 16, by0 + 236); c.close_path(); c.fill()
        c.set_font_size(28); c.set_source_rgb(0.25, 0.2, 0.2); c.move_to(bx0 + 22, by0 + 290); c.show_text("Schau mal, wie schön!")
        read = t >= E["liest"]
        c.set_font_size(22); c.set_source_rgb(*((0.20, 0.55, 0.95) if read else (0.55, 0.55, 0.6)))
        c.move_to(bx1 - 140, by1 - 14); c.show_text("21:14  ✓✓" if read else "21:14  ✓")
        c.restore()
        if read:
            c.set_font_size(24); c.set_source_rgb(0.45, 0.45, 0.5); c.move_to(bx1 - 110, by1 + 40); c.show_text("Gelesen")
    # typing indicator: appears after he read it, then disappears without a message
    ty = t - E["liest"]
    if 0.5 < ty < 2.2:
        bx, by = sx + 24, sy + 700
        shape(c, pen, [(bx, by), (bx + 130, by), (bx + 130, by + 64), (bx, by + 64)], (1, 1, 1), lw=2, line=(0.75, 0.76, 0.8))
        for k in range(3):
            a = 0.35 + 0.65 * (0.5 + 0.5 * math.sin(t * 8 - k * 0.9))
            c.set_source_rgba(0.4, 0.4, 0.45, a); c.arc(bx + 35 + k * 30, by + 32, 9, 0, 2 * math.pi); c.fill()
    # her thumbs at the bottom of the phone
    HANDS_CLOSE(c, "w", px, py, pw, ph)

def heart(c, x, y, s):
    c.move_to(x, y + 0.35 * s)
    c.curve_to(x - 1.0 * s, y - 0.25 * s, x - 0.45 * s, y - 0.95 * s, x, y - 0.45 * s)
    c.curve_to(x + 0.45 * s, y - 0.95 * s, x + 1.0 * s, y - 0.25 * s, x, y + 0.35 * s); c.close_path()

def sc_gottman(c, t):               # P4: 9 of 10 vs 1 of 3, drawn as hearts
    g = cairo.LinearGradient(0, 0, 0, H); g.add_color_stop_rgb(0, *SA.WALL0); g.add_color_stop_rgb(1, *SA.WALL1)
    c.set_source(g); c.paint()
    glow(c, 540, 900, 700, (1.0, 0.72, 0.42), 0.12)
    c.select_font_face("Inter", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD)
    # header: who did the research
    ha = ramp(t, PARA[4], 0.5)
    c.set_font_size(40); c.set_source_rgba(1, 1, 1, 0.75 * ha)
    hdr = "John Gottman · Beziehungsforschung"; ext = c.text_extents(hdr); c.move_to(540 - ext[4] / 2, 330); c.show_text(hdr)
    def row(y, n, filled, t0, t1, label, col, appear):
        a = ramp(t, appear, 0.5)
        if a <= 0: return
        c.set_font_size(50); c.set_source_rgba(1, 1, 1, 0.92 * a)
        ext = c.text_extents(label); c.move_to(540 - ext[4] / 2, y - 110); c.show_text(label)
        sp = 88 if n > 5 else 170; x0 = 540 - sp * (n - 1) / 2
        for k in range(n):
            x = x0 + k * sp
            on = k < filled and t >= t0 + (t1 - t0) * k / max(1, filled)
            pop = 1 + 0.25 * math.exp(-max(0.0, t - (t0 + (t1 - t0) * k / max(1, filled))) * 8) if on else 1
            c.save(); c.translate(x, y); c.scale(pop, pop)
            heart(c, 0, 0, 40 if n > 5 else 70)
            if on: c.set_source_rgba(*col, a); c.fill_preserve()
            c.set_source_rgba(0.95, 0.95, 1, 0.55 * a); c.set_line_width(3); c.stroke(); c.restore()
    row(540, 10, 9, E["neun"], E["neun"] + 2.0, "Paare, die zusammenbleiben", (0.90, 0.55, 0.63), PARA[4] + 0.6)
    row(930, 3, 1, E["dritte"], E["dritte"] + 0.3, "Paare, die sich trennen", (0.55, 0.62, 0.75), E["trennten"] - 0.6)

def sc_alone(c, t):                 # P5: she alone at night, phone face down, the silence
    lt = t - PARA[5]
    kitchen(c, Pen(3), 23, 47, lamp=1 - 0.4 * ramp(t, E["stille"], 1.2))
    A.woman(c, Pen(11), 400, 760, 1.0, dict(phone=0, sad=0.9, look=(0, 1.0), tilt=-4 + 1.5 * math.sin(lt * 0.7), breath=breath(t, 1.5, 4),
                                            blink=blink(t, 3.6)))
    table(c, Pen(19), plate=800, phone_down=560)
    lamp_dim(c, 0.25 * ramp(t, E["stille"], 1.2))

def sc_together(c, t):              # P6 + P7: he puts the phone down, turns to her; she talks, smiles, leans on him
    pen = Pen(3); SA.room(c, pen)
    down = ramp(t, E["handyweg"], 0.8); turn = ramp(t, E["handyweg"] + 0.6, 0.6)
    lean = ramp(t, E["dienstag"] - 0.6, 1.2)
    talking = E["antworte"] - 0.5 < t < E["dienstag"] - 0.8
    tk = (0.5 + 0.5 * abs(math.sin(t * 9))) if talking else 0
    glow(c, 540, 900, 600, (1.0, 0.72, 0.42), 0.10 * lean)
    A.man(c, Pen(13), 790 - 70 * lean, 760, 0.82, dict(phone=1 - down, sad=0, look=(-0.9 * turn, 0.9 * (1 - turn)), tilt=-6 * turn + 3 * lean,
                                                      smile=0.8 * ramp(t, E["antworte"]), breath=breath(t, 2.0), blink=blink(t, 4.1) and lean < 0.5,
                                                      scroll=t * 2.0 * (1 - down)))
    c.save(); c.translate(300, 1500); c.rotate(math.radians(9 * lean)); c.translate(-300, -1500)
    A.woman(c, Pen(11), 300 + 60 * lean, 790, 0.82, dict(phone=0, sad=0.3 * (1 - turn), smile=0.7 * turn, talk=tk,
                                                         look=(0.9 * turn, 0.1), tilt=4 * turn + 8 * lean, breath=breath(t), blink=blink(t, 3.3, 1.0) and lean < 0.5))
    c.restore()
    if lean < 0.95: cushion(c, Pen(17), -120 * lean)
    SA.sofa_front(c, Pen(5))
    # CTA icons
    for x, t0, kind in ((360, E["schick"], "send"), (720, E["speichere"], "save")):
        u = ease((t - t0) / 0.3)
        if u <= 0: continue
        sc = 1 + 0.25 * math.exp(-(t - t0) * 5) * math.sin((t - t0) * 18)
        glow(c, x, 470, 200, (1.0, 0.72, 0.42), 0.35 * u)
        c.save(); c.translate(x, 470); c.scale(sc * u, sc * u)
        c.set_source_rgb(1.0, 0.49, 0.40)
        if kind == "send":
            c.move_to(-70, -10); c.line_to(80, -70); c.line_to(20, 80); c.line_to(0, 10); c.close_path(); c.fill()
        else:
            c.move_to(-50, -70); c.line_to(50, -70); c.line_to(50, 75); c.line_to(0, 40); c.line_to(-50, 75); c.close_path(); c.fill()
        c.restore()

SCENES = [(0.0, sc_sofa_intro), (PARA[2], sc_sofa_drift), (PARA[3], sc_kitchen_talk), (E["foto"] - 0.3, sc_phone),
          (PARA[4], sc_gottman), (PARA[5], sc_alone), (PARA[6], sc_together)] if E else []

# ---------------------------------------------------------------- captions (centre of the screen)
F_SUB = ImageFont.truetype(os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts", "Inter-Black.otf"), 70)
F_TOP = ImageFont.truetype(os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts", "Inter-Black.otf"), 76)
ACC = (255, 132, 108)
def caption(d, words_, y, font, alpha=255):
    sp = font.getlength(" "); tw = sum(font.getlength(w) for w in words_) + sp * (len(words_) - 1)
    if tw > 820:
        font = ImageFont.truetype(font.path, int(font.size * 820 / tw)); sp = font.getlength(" "); tw = sum(font.getlength(w) for w in words_) + sp * (len(words_) - 1)
    return font, sp, tw
def draw_caption(im, words_, hl, y, font, pop):
    d = ImageDraw.Draw(im)
    font, sp, tw = caption(d, words_, y, font)
    x = 540 - tw / 2; y = y + 10 * (1 - pop)
    for k, w in enumerate(words_):
        d.text((x, y), w, font=font, fill=ACC if k == hl else (255, 255, 255), stroke_width=8, stroke_fill=(16, 16, 22)); x += font.getlength(w) + sp

def frame(t):
    k = max(i for i, (t0, _) in enumerate(SCENES) if t0 <= t)
    t0 = SCENES[k][0]; t1 = SCENES[k + 1][0] if k + 1 < len(SCENES) else DUR
    s = cairo.ImageSurface(cairo.FORMAT_RGB24, W, H); c = cairo.Context(s)
    z = 1 + 0.06 * ease((t - t0) / max(0.1, t1 - t0))
    c.translate(540, 950); c.scale(z, z); c.translate(-540, -950)
    SCENES[k][1](c, t)
    c.identity_matrix()
    f = min(ease((t - t0) / 0.18) if k else 1.0, ease((t1 - t) / 0.18) if k + 1 < len(SCENES) else ease((DUR - t) / 0.8))
    if f < 1: c.set_source_rgba(0, 0, 0, 1 - f); c.paint()
    s.flush()
    arr = np.frombuffer(s.get_data(), np.uint8).reshape(H, W, 4)[:, :, [2, 1, 0]].copy()
    im = Image.fromarray(SF.look(arr, int(t * FPS)))
    if t < PARA[1] - 0.2:
        d = ImageDraw.Draw(im)
        SA.caption(d, [("Wenn", 0), ("ihr", 0), ("nur", 0), ("noch", 0)], 220, F_TOP)
        SA.caption(d, [("wie", 0), ("Mitbewohner", 1), ("lebt", 0)], 312, F_TOP)
    for s0, e0, ws, hl in CAPS:
        if s0 - 0.02 <= t < e0:
            draw_caption(im, ws, hl, 905, F_SUB, ease((t - s0 + 0.02) / 0.09)); break
    return im

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    if "--preview" in ARGS:
        ts = [float(x) for x in ARGS[ARGS.index("--preview") + 1].split(",")]
        for t in ts: frame(t).resize((432, 768)).save(f"{OUT}/v60_{t:05.1f}.png")
        sys.exit()
    wi, nw = int(ARGS[0]), int(ARGS[1]); n = int(math.ceil(DUR * FPS)); per = math.ceil(n / nw)
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                          "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", f"{OUT}/part_{wi}.mp4"], stdin=subprocess.PIPE)
    for i in range(wi * per, min(n, (wi + 1) * per)): p.stdin.write(frame(i / FPS).tobytes())
    p.stdin.close(); p.wait(); print("done", wi)
