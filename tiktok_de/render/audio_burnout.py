"""Music + sound design for video 09, synthesised with numpy (no samples):
- soft piano (additive partials, hammer attack, decay, simple FFT reverb): a slow A-minor progression, one chord per
  section, and a single higher note on each ACCENT cut so the important cuts land on a note;
- SFX from shots_burnout.events(): rain beds, footsteps (leaves), keys, door, message pings, calendar ticks, thuds,
  cup, blowing out the candle, a passing train, whooshes on whip cuts;
- the music ducks ~5 dB under the voice. Output: <out_dir>/bed.wav (music+SFX, 44.1 kHz mono float)."""
import math, os, subprocess, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.join(HERE, "..", "projects", "09_burnout", "voice")
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
os.environ["SHOTS"] = "shots_burnout"
sys.argv = ["x", PROJ + "/alignment.csv", OUT]
sys.path.insert(0, HERE)
import video_v5 as V5
SH = V5.VS
SR = 44100
DUR = SH.DUR
N = int(DUR * SR) + SR
rng = np.random.default_rng(7)

def voice():
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", PROJ + "/result.mp3", "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True).stdout
    v = np.frombuffer(raw, np.float32).copy(); out = np.zeros(N, np.float32); out[:len(v)] = v[:N]; return out

def shaped_noise(n, lo, hi, tilt=0.0):
    spec = np.fft.rfft(rng.standard_normal(n)); f = np.fft.rfftfreq(n, 1 / SR)
    g = ((f >= lo) & (f <= hi)).astype(float) * (1.0 / np.maximum(f, 20) ** tilt)
    x = np.fft.irfft(spec * g, n); return (x / (np.abs(x).max() + 1e-9)).astype(np.float32)

def env(n, a, d):
    t = np.arange(n) / SR; return (np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / max(d, 1e-4))).astype(np.float32)

def put(buf, x, t, gain):
    i = int(t * SR); j = min(len(buf), i + len(x))
    if i < len(buf) and j > i: buf[i:j] += gain * x[: j - i]

def piano(freq, dur=3.5, vel=1.0):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for h in range(1, 8):
        fh = freq * h * (1 + 0.0004 * h * h)                     # slight inharmonicity
        x += (vel / h ** 1.3) * np.sin(2 * np.pi * fh * t) * np.exp(-t * (0.9 + 0.55 * h))
    x *= np.minimum(1, t / 0.004)
    x += 0.02 * vel * shaped_noise(n, 1500, 6000) * np.exp(-t * 60)    # hammer
    return x.astype(np.float32)

def reverb(x, secs=2.2, mix=0.35):
    n = int(secs * SR); ir = rng.standard_normal(n) * np.exp(-np.arange(n) / SR * 3.2); ir[0] = 0
    L = len(x) + n; fx = np.fft.rfft(x, L) * np.fft.rfft(ir, L); wet = np.fft.irfft(fx, L)[: len(x)]
    wet /= (np.abs(wet).max() + 1e-9); dry = x / (np.abs(x).max() + 1e-9)
    return ((1 - mix) * dry + mix * wet).astype(np.float32)

def hz(note):                     # 'A3' style
    names = {"C": -9, "D": -7, "E": -5, "F": -4, "G": -2, "A": 0, "B": 2}
    return 440.0 * 2 ** ((names[note[0]] + 12 * (int(note[-1]) - 4)) / 12)

# ---------------------------------------------------------------- music
music = np.zeros(N, np.float32)
chords = [("A2", "E3", "A3", "C4"), ("F2", "C3", "F3", "A3"), ("C3", "G3", "C4", "E4"), ("G2", "D3", "G3", "B3")]
melody = {0: ["E5", "C5", "A4"], 1: ["A4", "F4", "C5"], 2: ["G4", "E5", "C5"], 3: ["D5", "B4", "G4"]}
starts = [s[0] for s in SH.SHOTS]
sections = [0.0] + [SH.T[k] for k in ("In der Psychologie", "Sie trägt", "Die Psychologin", "Also hört", "Ihre Zärtlichkeit", "Und wenn er", "liegt die Antwort")]
for i, t0 in enumerate(sections):
    ch = chords[i % 4]
    for j, nt in enumerate(ch): put(music, piano(hz(nt), 5.5, 0.45 if j else 0.6), t0 + 0.12 * j, 1.0)
for k, key in enumerate(SH.ACCENTS):
    t = SH.T[key]; sec = max(i for i, s0 in enumerate(sections) if s0 <= t)
    put(music, piano(hz(melody[sec % 4][k % 3]), 3.0, 0.55), t, 1.0)
put(music, piano(hz("A3"), 6.0, 0.5) + piano(hz("E4"), 6.0, 0.35) + piano(hz("A4"), 6.0, 0.3), DUR - 4.2, 1.0)   # closing chord
music = reverb(music, 2.4, 0.40)

# ---------------------------------------------------------------- SFX
sfx = np.zeros(N, np.float32)
def rain(t0, t1):
    n = int((t1 - t0) * SR); x = shaped_noise(n, 300, 9000, 0.6)
    fade = np.minimum(1, np.minimum(np.arange(n), n - np.arange(n)) / (0.4 * SR)); put(sfx, x * fade, t0, 0.05)
def step(t, kind):
    n = int(0.12 * SR); x = shaped_noise(n, 40, 600) * env(n, 0.002, 0.03)
    if kind == "step_leaves": x = x + 0.6 * shaped_noise(n, 2000, 8000) * env(n, 0.002, 0.05)
    if kind == "step_light": x *= 0.7
    put(sfx, x, t, 0.10)
def keys(t):
    for j in range(7):
        n = int(0.18 * SR); tt = np.arange(n) / SR; f = 2800 + 2400 * rng.random()
        put(sfx, (np.sin(2 * np.pi * f * tt) * env(n, 0.001, 0.05)).astype(np.float32), t + 0.04 * j + 0.02 * rng.random(), 0.035)
def door(t):
    n = int(0.6 * SR); tt = np.arange(n) / SR; f = 260 - 70 * tt / 0.6
    creak = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * (0.5 + 0.5 * np.sin(2 * np.pi * 23 * tt)) * env(n, 0.05, 0.4)
    put(sfx, shaped_noise(int(0.05 * SR), 1000, 6000) * env(int(0.05 * SR), 0.001, 0.01), t, 0.12)
    put(sfx, creak.astype(np.float32), t + 0.05, 0.015)
def ping(t, dry=False):
    n = int(0.5 * SR); tt = np.arange(n) / SR
    x = np.sin(2 * np.pi * (880 if dry else 1318.5) * tt) * env(n, 0.002, 0.12)
    if not dry: x = x + 0.7 * np.sin(2 * np.pi * 1760 * np.maximum(0, tt - 0.07)) * env(n, 0.07, 0.15)
    put(sfx, x.astype(np.float32), t, 0.05)
def tick(t): put(sfx, shaped_noise(int(0.02 * SR), 1500, 5000) * env(int(0.02 * SR), 0.001, 0.004), t, 0.08)
def thud(t):
    n = int(0.4 * SR); tt = np.arange(n) / SR
    put(sfx, (np.sin(2 * np.pi * 65 * tt) * env(n, 0.003, 0.12) + 0.3 * shaped_noise(n, 30, 300) * env(n, 0.002, 0.05)).astype(np.float32), t, 0.16)
def cup(t):
    n = int(0.4 * SR); tt = np.arange(n) / SR
    put(sfx, ((np.sin(2 * np.pi * 2550 * tt) + 0.6 * np.sin(2 * np.pi * 3720 * tt)) * env(n, 0.001, 0.08)).astype(np.float32), t, 0.04)
def blow(t):
    n = int(0.5 * SR); tt = np.arange(n) / SR
    put(sfx, shaped_noise(n, 400, 3000) * (np.sin(np.pi * tt / 0.5) ** 2).astype(np.float32), t - 0.15, 0.06)
def train(t):
    n = int(2.2 * SR); tt = np.arange(n) / SR
    put(sfx, shaped_noise(n, 30, 900, 0.3) * (np.sin(np.pi * tt / 2.2) ** 2).astype(np.float32), t, 0.10)
def whoosh(t):
    n = int(0.32 * SR); tt = np.arange(n) / SR
    x = shaped_noise(n, 300, 5000, 0.4) * (np.sin(np.pi * tt / 0.32) ** 3).astype(np.float32)
    put(sfx, x, t - 0.16, 0.05)

ev = SH.events()
rain_ranges = [(0.0, SH.T["desto stiller"] + 0.2), (SH.T["Sie trägt"], SH.T["Sie plant"] + 0.2), (SH.T["liegt die Antwort"], DUR)]
for a, b in rain_ranges: rain(a, b)
for t, kind in ev:
    if kind.startswith("step"): step(t, kind)
    elif kind == "keys": keys(t)
    elif kind == "door": door(t)
    elif kind == "ping": ping(t)
    elif kind == "ping_dry": ping(t, True)
    elif kind == "tick": tick(t)
    elif kind == "thud": thud(t)
    elif kind == "cup": cup(t)
    elif kind == "blow": blow(t)
    elif kind == "train": train(t)
    elif kind == "whoosh": whoosh(t)

# ---------------------------------------------------------------- duck the music under the voice, write the bed
v = voice()
win = int(0.2 * SR); e = np.sqrt(np.convolve(v ** 2, np.ones(win) / win, mode="same"))
duck = 1 - 0.45 * np.clip(e / (e.max() * 0.25 + 1e-9), 0, 1)
k = int(0.15 * SR); duck = np.convolve(duck, np.ones(k) / k, mode="same")
bed = 0.18 * music * duck + sfx
def db(x): return 20 * math.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
print("rms dB  voice %.1f  music %.1f  sfx %.1f  bed %.1f   peak bed %.2f" % (db(v), db(0.18 * music), db(sfx), db(bed), np.abs(bed).max()))
import wave
x = np.clip(bed, -1, 1); pcm = (x * 32767).astype(np.int16)
with wave.open(f"{OUT}/bed.wav", "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print("bed", len(x) / SR, "s")
