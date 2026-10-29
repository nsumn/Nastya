"""'Wie Mitbewohner' with the new rigged characters (character2): same 25 shots, white captions.

Usage: python video_v5.py <alignment.csv> <out_dir> <worker> <n_workers> [--preview t1,t2,...]
"""
import math, os, subprocess, sys
ALIGN, OUT = sys.argv[1], sys.argv[2]
ARGS = sys.argv[3:]
sys.argv = [sys.argv[0], ALIGN, OUT]
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import video_shots as VS
import character2 as C2
import numpy as np, cairocffi as cairo

A, V = VS.A, VS.V
C2.PROP["name"] = "oval"
WHITE = (255, 255, 255)
V.ACC = WHITE; VS.ROSE_RGB = WHITE

def emo_of(p):
    sad = p.get("sad", 0.3)
    if p.get("smile", 0) > 0.85: return "smile"   # shared laugh moments only
    if p.get("phone", 1.0) > 0.5:          # staring at the phone: neutral face, no smile
        return "sad" if sad >= 0.75 else ("worried" if sad >= 0.5 else "neutral")
    if p.get("talk", 0) > 0.05: return "neutral"
    if p.get("smile", 0) > 0.85: return "happy" if p.get("laugh") else "smile"
    if p.get("smile", 0) > 0.35: return "smile"
    if sad >= 0.75: return "sad"
    if sad >= 0.5: return "worried"
    return "neutral"

def draw_phone(c, hands, ph, p, hs):
    """phone held in both hands: hands grip the lower sides"""
    (l, _), (r_, _) = hands["arm_l"], hands["arm_r"]
    px, py = (l[0] + r_[0]) / 2, (l[1] + r_[1]) / 2 - 30 * hs
    pw, ph_ = 66 * hs, 116 * hs
    g = cairo.RadialGradient(px, py, 0, px, py, 260 * hs)
    g.add_color_stop_rgba(0, 0.75, 0.85, 1.0, 0.26 * ph); g.add_color_stop_rgba(1, 0.75, 0.85, 1.0, 0)
    c.set_source(g); c.arc(px, py, 260 * hs, 0, 2 * math.pi); c.fill()
    lw = 2.6 * hs / 0.5
    c.save(); c.translate(px, py); A_round(c, -pw / 2, -ph_ / 2, pw, ph_, 9 * hs); c.restore()
    C2.finish(c, (0.12, 0.12, 0.16), lw)
    sx, sy, sw, sh_ = px - pw / 2 + 6 * hs, py - ph_ / 2 + 9 * hs, pw - 12 * hs, ph_ - 18 * hs
    c.set_source_rgb(0.86, 0.9, 0.98); c.rectangle(sx, sy, sw, sh_); c.fill()
    c.save(); c.rectangle(sx, sy, sw, sh_); c.clip()
    A.screen_lines(c, px, sy, sw, sh_ * 0.8, p.get("scroll", 0.0), 0.9 * hs); c.restore()

def A_round(c, x, y, w, h, r):
    c.new_sub_path()
    c.arc(x + w - r, y + r, r, -math.pi / 2, 0); c.arc(x + w - r, y + h - r, r, 0, math.pi / 2)
    c.arc(x + r, y + h - r, r, math.pi / 2, math.pi); c.arc(x + r, y + r, r, math.pi, 1.5 * math.pi); c.close_path()

def seated(c, kind, x, y, s, p):
    """x, y = face centre in the old coordinates, s = old scale"""
    r_old = (78 if kind == "w" else 84) * s
    spec = C2.Spec(kind)
    hs = r_old / spec.head_r
    gy = y + spec.head_y * hs
    ph = p.get("phone", 1.0)
    # lap (seated: thighs come towards the camera) under the sweater
    hem = gy - spec.hem_y * hs
    c.save(); c.rectangle(x - 118 * hs, hem - 20, 236 * hs, 1240 - hem); C2.finish(c, spec.pants, 3); c.restore()
    bend = 25 + 112 * ph
    pose = dict(arm_l=(18 * ph + 10 * (1 - ph), bend), arm_r=(18 * ph + 10 * (1 - ph), bend), fore_k=1 - 0.4 * ph, thumbs=ph < 0.5, hide_legs=True, emo=emo_of(p), blink=p.get("blink", False),
                talk=p.get("talk", 0.0), look=((0.0, 0.9) if ph > 0.5 else (p.get("look", (0, 0))[0], 0.6 * p.get("look", (0, 0))[1])),
                head_tilt=p.get("tilt", 0.0), lean=0.15 * p.get("breath", 0.0))
    hands = C2.person(c, x, gy, 1000 * hs, kind, pose)
    if ph > 0.05: draw_phone(c, hands, ph, p, hs)

def hands_on_phone(c, kind, px=540, py=1000, pw=560, ph=1040):
    """close-up: sleeves from the bottom, palms around the lower edges"""
    lw = 4.5; bot = py + ph / 2
    sc = C2.W_TOP if kind == "w" else C2.M_TOP
    for sd in (-1, 1):
        ex = px + sd * pw / 2
        C2.capsule_path(c, (ex + sd * 70, bot + 120), (ex + sd * 140, 2100), 95, 110); C2.finish(c, sc, lw)
        C2.ellipse(c, ex + sd * 18, bot - 70, 78, 150, sd * 0.22); C2.finish(c, C2.SKIN, lw)
        c.move_to(ex + sd * 10, bot - 40); c.curve_to(ex + sd * 40, bot - 50, ex + sd * 60, bot - 90, ex + sd * 62, bot - 130)
        c.set_source_rgb(*C2.SKIN_SH); c.set_line_width(4); c.stroke()
VS.hands_on_phone = lambda c, _col: hands_on_phone(c, "m")   # his Bundesliga phone
V.HANDS_CLOSE = hands_on_phone                                # her chat phone

A.woman = lambda c, pen, x, y, s, p: seated(c, "w", x, y, s, p)
A.man = lambda c, pen, x, y, s, p: seated(c, "m", x, y, s, p)

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    if "--preview" in ARGS:
        from PIL import Image
        ts = [float(x) for x in ARGS[ARGS.index("--preview") + 1].split(",")]
        for t in ts: VS.frame(t).resize((360, 640)).save(f"{OUT}/v5_{t:05.1f}.png")
        sys.exit()
    wi, nw = int(ARGS[0]), int(ARGS[1]); n = int(math.ceil(VS.DUR * VS.FPS)); per = math.ceil(n / nw)
    pr = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{VS.W}x{VS.H}", "-r", str(VS.FPS), "-i", "-",
                           "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", f"{OUT}/part_{wi}.mp4"], stdin=subprocess.PIPE)
    for i in range(wi * per, min(n, (wi + 1) * per)): pr.stdin.write(VS.frame(i / VS.FPS).tobytes())
    pr.stdin.close(); pr.wait(); print("done", wi)
