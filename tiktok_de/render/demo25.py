"""2.5D test: a new place (dining room at night, never used before) as depth layers with a moving camera.

  .venv/bin/python render/demo25.py <out_dir>    -> <out_dir>/demo25.mp4 (5 s, 30 fps) + a few stills
"""
import math, os, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
sys.argv = ["x", os.path.join(HERE, "..", "projects", "10_hilflos", "voice", "alignment.csv"), OUT]
sys.path.insert(0, HERE)
os.environ.setdefault("SHOTS", "shots_hilflos")
import video_v5 as V5                     # sets up the rig, the look and the fonts exactly as the real renderer
import video_shots as VB
import sets2 as Z
import character2 as C2
import layers25 as L25
import cairocffi as cairo
from storybook import glow
from PIL import Image
import numpy as np

SF = VB.SF
W, H, FPS, DUR = 1080, 1920, 30, 5.0

def far_city(c, t):                       # z = 30: night city behind the window, barely moves
    c.set_source_rgb(0.10, 0.12, 0.22); c.paint()
    for k in range(40):
        bx = -200 + (k * 97) % 1500; bh = 300 + (k * 53) % 600
        c.set_source_rgb(0.10 + 0.02 * (k % 3), 0.11, 0.20); c.rectangle(bx, 1300 - bh, 80, bh + 400); c.fill()
        for j in range(8):
            if (k + j) % 3 == 0: c.set_source_rgb(0.95, 0.72, 0.42); c.rectangle(bx + 14 + (j % 2) * 34, 1320 - bh + 30 + j * 60, 14, 18); c.fill()
    glow(c, 820, 420, 90, (1.0, 0.95, 0.85), 0.5)                       # moon

def back_wall(c, t):                      # z = 9: wall with a big window (cut out) and pictures
    c.set_source_rgb(0.15, 0.16, 0.24); c.rectangle(-400, -600, 1900, 3200); c.fill()
    c.set_operator(cairo.OPERATOR_CLEAR); c.rectangle(560, 380, 420, 640); c.fill(); c.set_operator(cairo.OPERATOR_OVER)
    Z.rect(c, 550, 370, 440, 20, (0.30, 0.30, 0.40)); Z.rect(c, 550, 1020, 440, 24, (0.30, 0.30, 0.40))
    c.set_source_rgb(*Z.OUTL); c.set_line_width(5); c.move_to(770, 380); c.line_to(770, 1020); c.stroke()
    for sd, x in ((-1, 560), (1, 980)):                                  # curtains
        Z.box(c, [(x - 40, 340), (x + 40, 340), (x + 30 * sd + 20, 1100), (x - 30 * -sd - 20, 1100)], (0.32, 0.30, 0.42))
    for x, y, w, h in ((120, 470, 220, 170), (170, 700, 140, 190)):
        Z.rect(c, x, y, w, h, (0.85, 0.80, 0.70)); Z.rect(c, x + 14, y + 14, w - 28, h - 28, (0.45, 0.52, 0.62), 2)
    c.set_source_rgb(0.11, 0.10, 0.15); c.rectangle(-400, 1380, 1900, 1300); c.fill()   # floor
    c.set_source_rgb(*Z.OUTL); c.set_line_width(3); c.move_to(-400, 1380); c.line_to(1500, 1380); c.stroke()

def table_and_him(c, t):                  # z = 5.5: pendant lamp, table, him on the far side on his phone
    glow(c, 540, 820, 700, Z.WARM, 0.28)
    c.set_source_rgb(*Z.OUTL); c.set_line_width(4); c.move_to(540, -300); c.line_to(540, 660); c.stroke()
    Z.box(c, [(440, 660), (640, 660), (700, 760), (380, 760)], (0.95, 0.78, 0.48)); glow(c, 540, 780, 260, (1, 0.85, 0.55), 0.45)
    C2.person(c, 640, 1560, 760, "m", dict(emo="neutral", look=(0.0, 0.9), head_tilt=-4, arm_l=(10, 100), arm_r=(10, 100), hide_legs=True))
    Z.rbox(c, 590, 1105, 90, 130, 14, (0.12, 0.12, 0.16))              # his phone
    glow(c, 640, 1100, 120, (0.7, 0.85, 1.0), 0.35)
    Z.box(c, [(150, 1240), (930, 1240), (1000, 1330), (80, 1330)], (0.40, 0.31, 0.30))   # table top
    Z.rect(c, 120, 1330, 30, 300, Z.WOOD_D); Z.rect(c, 930, 1330, 30, 300, Z.WOOD_D)
    for x in (330, 700):                                                 # plates, glasses
        C2.ellipse(c, x, 1280, 95, 26); C2.finish(c, (0.92, 0.91, 0.94), 3)
        C2.ellipse(c, x, 1280, 60, 15); C2.finish(c, (0.85, 0.84, 0.88), 2)
    Z.rect(c, 470, 1190, 40, 80, (0.75, 0.82, 0.92))

def her(c, t):                            # z = 3.6: she sits at the near corner, turned to him, waiting
    Z.sit(c, "w", 260, 1390, 900, dict(emo="worried", look=(0.6, -0.1), head_tilt=4, talk=0.0, blink=(t % 3.1) < 0.12,
                                        arm_l=(8, 70), arm_r=(10, 75)))
    Z.rbox(c, 120, 1500, 300, 60, 20, (0.30, 0.25, 0.27))               # chair seat edge

def foreground(c, t):                     # z = 1.6: soft plant leaves in the lower right corner, out of focus
    for k, (x, y, rx, ry, a) in enumerate(((980, 1750, 120, 260, -0.5), (1080, 1640, 110, 240, -0.9), (900, 1880, 100, 230, -0.2),
                                           (1060, 1880, 130, 250, -0.7))):
        C2.ellipse(c, x, y, rx, ry, a); C2.finish(c, (0.18 + 0.03 * (k % 2), 0.33, 0.26), 4)
        c.set_source_rgba(0.1, 0.2, 0.15, 0.6); c.set_line_width(5); c.move_to(x - ry * 0.8 * math.sin(-a), y + ry * 0.8 * math.cos(a)); c.line_to(x + ry * 0.8 * math.sin(-a), y - ry * 0.8 * math.cos(a)); c.stroke()

LAYERS = [L25.layer(30, far_city, pad=0.4), L25.layer(9, back_wall, pad=0.4), L25.layer(5.5, table_and_him, pad=0.35),
          L25.layer(3.6, her, pad=0.35, animated=True), L25.layer(1.6, foreground, pad=0.35)]

def frame(t):
    cam = L25.cam_path(t, 0, DUR, (0.25, -0.05, 0.0), (-0.35, 0.05, 1.0))   # slide towards her while dollying in
    arr = L25.render(LAYERS, t, cam, focus_z=3.6, dof=4.0)
    return Image.fromarray(SF.look(arr, int(t * FPS)))

if __name__ == "__main__":
    for t in (0.0, 2.5, 4.9): frame(t).save(f"{OUT}/demo25_{t:.1f}.png")
    pr = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                           "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", f"{OUT}/demo25.mp4"], stdin=subprocess.PIPE)
    for i in range(int(DUR * FPS)): pr.stdin.write(np.asarray(frame(i / FPS)).tobytes())
    pr.stdin.close(); pr.wait(); print("done")
