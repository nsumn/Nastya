"""Style test frames for video 09 (glow silhouettes). python style_test.py <outdir>"""
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import glowlib as G
from PIL import ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
FONT = os.path.join(os.path.dirname(HERE), "08_entzug", "fonts", "Inter-ExtraBold.otf")
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)


def caption(im, words):
    d = ImageDraw.Draw(im); f = ImageFont.truetype(FONT, 68)
    parts = [(w.strip("*"), w.startswith("*")) for w in words.split()]
    widths = [d.textlength(w + " ", font=f) for w, _ in parts]; x = (G.W - sum(widths)) / 2; y = 1330
    for (w, key), ww in zip(parts, widths):
        d.text((x, y), w, font=f, fill=G.KEY_RGB if key else (255, 255, 255), stroke_width=6, stroke_fill=(0, 0, 0)); x += ww


def f_hook(t=1.0):
    s, c, g, gc = G.surfaces(); G.room(c)
    G.spot(c, 540, 900, 700, 0.18)
    G.spot(c, 780, 560, 260, 0.45)
    G.frames_wall(c, gc, [140, 300, 880], 330, 1.0)
    G.figure(c, gc, 800, 860, 0.5, her=True, mood="sad", arms=((0.1, 0.05), (-0.1, -0.05)))
    G.figure(c, gc, 430, 2050, 1.55, mood="worried", heart=1.0, arms=((0.25, 0.3), (-0.25, -0.3)), look=0.6)
    G.particles(gc, t, 430, 1100, 420, 22)
    im = G.compose(s, g); caption(im, "WAS IN *SEINEM* *KOPF* PASSIERT"); return im


def f_flood(t=6.0):
    s, c, g, gc = G.surfaces(); G.room(c)
    G.spot(c, 540, 1000, 600, 0.22)
    # heart-rate line over his head
    gc.set_line_width(9); gc.set_line_cap(1); gc.set_source_rgba(*G.GOLD, 1)
    x0, y0 = 120, 430
    pts = [(0, 0), (160, 0), (200, -40), (240, 90), (290, -230), (340, 140), (380, 0), (560, 0), (600, -40), (640, 90), (690, -230), (740, 140), (780, 0), (840, 0)]
    gc.move_to(x0 + pts[0][0], y0 + pts[0][1])
    for p in pts[1:]: gc.line_to(x0 + p[0], y0 + p[1])
    gc.stroke()
    gc.select_font_face("Inter", 0, 1); gc.set_font_size(150); gc.move_to(380, 760); gc.set_source_rgba(*G.GOLD_L, 1); gc.show_text("100+")
    G.bed(c, 120, 1330, 840, 1.2)
    G.figure(c, gc, 540, 1900, 1.25, mood="angry", heart=1.0, arms=((0.55, 2.2), (-0.55, -2.2)), head_tilt=0.0)
    im = G.compose(s, g); caption(im, "SEIN *HERZ* RAST"); return im


def f_apart(t=20.0):
    s, c, g, gc = G.surfaces(); G.room(c)
    G.spot(c, 250, 950, 380, 0.25); G.spot(c, 830, 950, 380, 0.25)
    G.frames_wall(c, gc, [540], 380, 1.1)
    a = G.figure(c, gc, 260, 1700, 1.0, her=True, mood="sad", heart=0.5, arms=((0.1, 0.05), (-0.6, -1.2)), look=0.6)
    b = G.figure(c, gc, 820, 1700, 1.08, mood="worried", heart=0.5, phone=1.0, arms=((0.1, 0.05), (-0.35, 2.4)), look=-0.4)
    G.thought(gc, 900, 520, 0.9, 0.9)
    im = G.compose(s, g); caption(im, "ER BRAUCHT *20* *MINUTEN*"); return im


for name, fn in (("hook", f_hook), ("flood", f_flood), ("apart", f_apart)):
    fn().save(os.path.join(OUT, f"{name}_{G.PAL}.png")); print("ok", name, G.PAL)
