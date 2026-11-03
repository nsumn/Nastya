"""Video 01 'Chamäleon-Effekt': stills from blender_figures/scenes.py + voice -> 1080x1920 30 fps MP4.
Like the reference (les.zamours2): a hard cut on the phrase, a slow camera move inside every shot, short white subtitles
in the upper third, soft piano under the voice.

python compose.py <shots_dir> <out.mp4>
"""
import csv, math, os, re, subprocess, sys, wave
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SHOTS_DIR, OUT = sys.argv[1], sys.argv[2]
W, H, FPS = 1080, 1920, 30
SR = 44100

# ---------------------------------------------------------------- timing from the voice
rows = list(csv.DictReader(open(os.path.join(HERE, "voice", "alignment.csv"), encoding="utf-8")))
CH = "".join(r["char"] for r in rows); ST = [float(r["start"]) for r in rows]; EN = [float(r["end"]) for r in rows]
VOICE_END = EN[-1]; DUR = VOICE_END + 1.2


def t_of(phrase):
    i = CH.find(phrase); assert i >= 0, phrase; return ST[i]


# shot name, phrase where it starts, camera move: (zoom0, zoom1, dx0, dx1, dy0, dy1) in screen fractions
CUTS = [
    ("s01_mirror_sofa", None, (1.10, 1.0, 0.0, 0.0, 0.02, 0.0)),
    ("s02_table_chin", "Viele halten", (1.0, 1.08, -0.02, 0.02, 0.0, 0.0)),
    ("s03_shoulder", "Doch dahinter", (1.04, 1.12, 0.0, -0.02, 0.0, 0.01)),
    ("s04_bed_same", "In der Psychologie", (1.0, 1.10, 0.0, 0.0, 0.0, -0.03)),
    ("s05_table_mirror", "Menschen, die", (1.08, 1.0, 0.02, -0.02, 0.0, 0.0)),
    ("s06_breath", "Ihre Haltung", (1.0, 1.07, 0.0, 0.0, -0.01, 0.01)),
    ("s07_bench", "Die Forscher", (1.0, 1.08, -0.03, 0.02, 0.0, 0.0)),
    ("s08_understood", "Wer gespiegelt", (1.1, 1.02, 0.0, 0.0, 0.0, 0.0)),
    ("s09_cup", "Es ist das Paar", (1.0, 1.10, 0.0, 0.0, 0.02, 0.0)),
    ("s10_legs", "Das auf dem Sofa", (1.06, 1.0, 0.02, -0.02, 0.0, 0.0)),
    ("s11_walk", "Das beim", (1.0, 1.08, 0.03, -0.03, 0.0, 0.0)),
    ("s12_bed_spoon", "Und abends", (1.08, 1.0, 0.0, 0.0, -0.02, 0.0)),
    ("s13_he_starts", "Und oft", (1.0, 1.08, 0.0, 0.02, 0.0, 0.0)),
    ("s14_hands", "Niemand", (1.0, 1.08, 0.0, 0.0, 0.0, 0.0)),
    ("s15_turn_away", "Aufmerksam", (1.08, 1.0, 0.0, 0.0, 0.0, 0.0)),
    ("s16_bed_away", "Wenn einer", (1.0, 1.08, 0.02, 0.0, 0.0, 0.0)),
    ("s17_end", "Denn manchmal", (1.12, 1.0, 0.0, 0.0, 0.0, 0.0)),
]
STARTS = [0.0 if p is None else t_of(p) - 0.12 for _, p, _ in CUTS]


def smooth(u):
    u = max(0.0, min(1.0, u)); return u * u * (3 - 2 * u)


IMGS = {}
def still(name):
    if name not in IMGS:
        im = Image.open(os.path.join(SHOTS_DIR, name + ".png")).convert("RGB")
        IMGS[name] = np.asarray(im.resize((int(W * 1.2), int(H * 1.2)), Image.LANCZOS)).astype(np.float32)
    return IMGS[name]


def shot_frame(k, t):
    name, _, (z0, z1, x0, x1, y0, y1) = CUTS[k]
    t0 = STARTS[k]; t1 = STARTS[k + 1] if k + 1 < len(CUTS) else DUR
    u = smooth((t - t0) / max(0.1, t1 - t0))
    z = z0 + (z1 - z0) * u; dx = x0 + (x1 - x0) * u; dy = y0 + (y1 - y0) * u
    src = still(name); sh, sw = src.shape[:2]
    # crop window in the 1.2x still: zoom 1.0 = the full original frame
    cw, chh = sw / 1.2 / z * 1.0, sh / 1.2 / z
    cx, cy = sw / 2 + dx * sw, sh / 2 + dy * sh
    M = np.float32([[W / cw, 0, -(cx - cw / 2) * W / cw], [0, H / chh, -(cy - chh / 2) * H / chh]])
    return cv2.warpAffine(src, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)


# ---------------------------------------------------------------- subtitles: short chunks, upper third, white
FONT = ImageFont.truetype(os.path.join(HERE, "fonts", "Inter-SemiBold.otf"), 46)
def words():
    out = []
    for m in re.finditer(r"\S+", CH):
        if m.group(0).startswith("{{"): continue
        out.append((m.group(0), ST[m.start()], EN[m.end() - 1]))
    return out
def chunks(ws, max_words=5, max_chars=26):
    gs, cur = [], []
    for w in ws:
        txt = " ".join(x[0] for x in cur + [w])
        if cur and (len(cur) >= max_words or len(txt) > max_chars): gs.append(cur); cur = []
        cur.append(w)
        if re.search(r"[.?!,:;]$", w[0]): gs.append(cur); cur = []
    if cur: gs.append(cur)
    res = []
    for i, g in enumerate(gs):
        s0 = g[0][1]; e0 = min(gs[i + 1][0][1] if i + 1 < len(gs) else g[-1][2] + 0.6, g[-1][2] + 0.5)
        res.append((s0, e0, " ".join(x[0] for x in g).rstrip(",;:")))
    return res
CAPS = chunks(words())


def wrap(txt, maxw=860):
    lines, cur = [], ""
    for w in txt.split():
        tst = (cur + " " + w).strip()
        if FONT.getlength(tst) > maxw and cur: lines.append(cur); cur = w
        else: cur = tst
    return lines + [cur]


def caption(im, t):
    for s0, e0, txt in CAPS:
        if s0 - 0.03 <= t < e0:
            a = min(1.0, (t - s0 + 0.03) / 0.12)
            layer = Image.new("RGBA", (W, H)); d = ImageDraw.Draw(layer)
            for i, ln in enumerate(wrap(txt)):
                w = FONT.getlength(ln); x, y = (W - w) / 2, 330 + i * 60
                d.text((x, y + 3), ln, font=FONT, fill=(0, 0, 0, int(140 * a)))
                d.text((x, y), ln, font=FONT, fill=(255, 255, 255, int(255 * a)))
            sh = layer.split()[3].filter(ImageFilter.GaussianBlur(6)).point(lambda v: int(v * 0.5))
            im.paste((0, 0, 0), (0, 0), sh); im.paste(layer, (0, 0), layer)
            return


# ---------------------------------------------------------------- music: slow soft piano, one chord per shot
def piano(f, dur, vel):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for h in range(1, 7): x += (vel / h ** 1.4) * np.sin(2 * np.pi * f * h * t) * np.exp(-t * (0.8 + 0.5 * h))
    return (x * np.minimum(1, t / 0.006)).astype(np.float32)


def music():
    N = int(DUR * SR) + SR; out = np.zeros(N, np.float32)
    hz = lambda n: 440 * 2 ** (n / 12)
    prog = [(-12, -5, 0, 3), (-16, -9, -4, 0), (-19, -12, -7, -3), (-14, -7, -2, 2)]          # Am F C G
    for k, t0 in enumerate(STARTS):
        ch = prog[k % 4]
        for j, n in enumerate(ch):
            x = piano(hz(n), 5.0, 0.35 if j else 0.5); i = int((t0 + 0.06 * j) * SR); out[i:i + len(x)] += x[: max(0, N - i)]
    ir = np.random.default_rng(3).standard_normal(int(2.2 * SR)) * np.exp(-np.arange(int(2.2 * SR)) / SR * 3)
    L = len(out) + len(ir); wet = np.fft.irfft(np.fft.rfft(out, L) * np.fft.rfft(ir, L), L)[: len(out)]
    mix = 0.65 * out / (np.abs(out).max() + 1e-9) + 0.35 * wet / (np.abs(wet).max() + 1e-9)
    fade = np.minimum(1, (DUR - np.arange(N) / SR) / 2.0).clip(0, 1)
    return (mix * fade).astype(np.float32)


if __name__ == "__main__":
    tmp = OUT + ".music.wav"
    x = music(); pcm = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    with wave.open(tmp, "wb") as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    vid = OUT + ".video.mp4"
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                          "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", vid], stdin=subprocess.PIPE)
    n = int(DUR * FPS)
    for i in range(n):
        t = i / FPS
        k = max(j for j, s0 in enumerate(STARTS) if s0 <= t)
        arr = shot_frame(k, t)
        if t > DUR - 1.0: arr = arr * max(0.0, (DUR - t) / 1.0)
        im = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)); caption(im, t)
        p.stdin.write(im.tobytes())
    p.stdin.close(); p.wait()
    # voice + quiet music (ducked under speech by sidechain compression), loudness for TikTok
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", vid, "-i", os.path.join(HERE, "voice", "result.mp3"), "-i", tmp, "-filter_complex",
                    "[2:a]volume=0.22[m];[1:a]asplit=2[v][sc];[m][sc]sidechaincompress=threshold=0.03:ratio=4:attack=20:release=400[md];"
                    "[v][md]amix=inputs=2:duration=longest:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=44100[a]",
                    "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-t", f"{DUR:.2f}", OUT], check=True)
    os.remove(tmp); os.remove(vid); print("DONE", OUT)
