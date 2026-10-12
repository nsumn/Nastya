import numpy as np, sys
from scipy.signal import butter, sosfilt
from scipy.io import wavfile

# "What if everything that can fart… farted at once?" — countdown, the big chorus, tuba groove, cow burp, herring ticks, sad trombone
SR = 44100; DUR = 63.0; N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(44)
L = np.zeros(N); Rr = np.zeros(N)
GLOBE, NYC, WEIGH, SOUND, COW, FISH, SLOTH, BIRDS, LIGHT, T_END = 3.0, 8.0, 15.0, 21.0, 27.0, 34.0, 40.0, 47.0, 51.0, 58.5

def filt(x, kind, f, order=2): return sosfilt(butter(order, f, kind, fs=SR, output='sos'), x)
def db(x): return 10 ** (x / 20)
def ramp(a, b, fa, fb): return np.clip((t - a) / max(fa, 1e-3), 0, 1) * np.clip((b - t) / max(fb, 1e-3), 0, 1)
def norm(x): return x / (np.abs(x).max() + 1e-9)
def tt(d): return np.arange(int(d * SR)) / SR
def place(at, sig, g=1.0, pan=0.0):
    i0 = int(at * SR)
    if i0 >= N or i0 < 0: return
    s = sig[:N - i0]
    L[i0:i0 + len(s)] += s * g * np.sqrt((1 - pan) / 2); Rr[i0:i0 + len(s)] += s * g * np.sqrt((1 + pan) / 2)
def add(sig, g=1.0, pan=0.0):
    global L, Rr
    L += sig * g * np.sqrt((1 - pan) / 2); Rr += sig * g * np.sqrt((1 + pan) / 2)
def hz(n): return 440 * 2 ** ((n - 69) / 12)
def whoosh(at, dur, g, p0, p1, lo=400, hi=4000):
    x = tt(dur); s = filt(rng.standard_normal(len(x)), 'bandpass', [lo, hi]); s = s / (np.abs(s).max() + 1e-9) * np.sin(np.pi * x / dur) ** 2
    i0 = int(at * SR); s = s[:max(0, N - i0)]; pan = np.linspace(p0, p1, len(s))
    L[i0:i0 + len(s)] += s * g * np.sqrt((1 - pan) / 2); Rr[i0:i0 + len(s)] += s * g * np.sqrt((1 + pan) / 2)
def fart(d=0.7, f0=95, wob=1.0):
    # lip-reed style: buzzy pulse train with jittery pitch + flutter, through a soft low-pass
    x = tt(d); f = f0 * (1 + 0.25 * wob * np.sin(2 * np.pi * rng.uniform(4, 9) * x) + 0.08 * np.cumsum(rng.standard_normal(len(x))) / np.sqrt(SR) * 40) * (1 - 0.25 * x / d)
    ph = np.cumsum(np.clip(f, 30, 400)) / SR; pulse = (np.mod(ph, 1.0) < 0.28).astype(float) - 0.28
    flutter = 0.6 + 0.4 * np.abs(np.sin(2 * np.pi * rng.uniform(11, 19) * x))
    s = filt(pulse * flutter + 0.15 * rng.standard_normal(len(x)), 'lowpass', 900) * np.clip(x / 0.02, 0, 1) * np.clip((d - x) / 0.08, 0, 1)
    return norm(s)
def beep(f, d=0.12): x = tt(d); return np.sin(2 * np.pi * f * x) * np.exp(-x * 18)
def tuba(n, d): x = tt(d); f = hz(n); s = sum(np.sin(2 * np.pi * f * k * x) / k ** 1.1 for k in range(1, 7)); return s * np.clip(x / 0.02, 0, 1) * np.exp(-x * 4)

white = rng.standard_normal(N)
# ---------- countdown + the moment
for k in range(3): place(0.15 + k, beep(880 if k < 2 else 880), db(-14))
place(GLOBE - 0.05, beep(1320, 0.25), db(-10))
for k in range(70):  # 8 billion, one moment: a chorus that sweeps left->right with the wave
    a = 3.35 + 3.2 * (k / 70) + rng.uniform(-0.15, 0.15); place(a, fart(rng.uniform(0.35, 0.9), rng.uniform(70, 160), rng.uniform(0.6, 1.4)), db(-20 + rng.uniform(-4, 3)), np.clip(-0.9 + 1.8 * k / 70 + rng.uniform(-0.2, 0.2), -1, 1))
place(3.3, fart(1.6, 85, 0.8), db(-9))
whoosh(3.4, 3.4, db(-16), -0.8, 0.8, 200, 2000)

# ---------- harbor: gas rush into the cube, comedic tuba groove
whoosh(NYC + 0.3, 5.0, db(-12), 0.6, -0.6, 150, 1500)
place(NYC + 5.2, np.sin(2 * np.pi * (60 * tt(2.5) - 6 * tt(2.5) ** 2)) * np.exp(-tt(2.5) * 1.8), db(-8))
BPM = 104; b = 60 / BPM; line = [40, 47, 45, 43, 40, 47, 48, 47, 41, 48, 47, 45, 43, 38, 40, 43]
groove = np.zeros(N)
for start, end in [(NYC + 0.2, COW - 0.2), (BIRDS - 0.1, LIGHT + 3.4)]:
    i = 0; at = start
    while at < end:
        s = tuba(line[i % len(line)], b * 0.8); i0 = int(at * SR); groove[i0:i0 + len(s)] += s[:max(0, N - i0)]
        if i % 2 == 1: x = tt(0.05); s2 = filt(rng.standard_normal(len(x)), 'highpass', 6000) * np.exp(-x * 80); groove[i0:i0 + len(s2)] += 0.6 * s2[:max(0, N - i0)]
        at += b; i += 1
add(norm(filt(groove, 'lowpass', 2500)), db(-17))
# sound section: little distant ones popping all over the world
for k in range(26): place(rng.uniform(SOUND + 0.3, COW - 0.4), fart(rng.uniform(0.2, 0.45), rng.uniform(110, 200)), db(-30 + rng.uniform(-3, 3)), rng.uniform(-1, 1))
# ---------- pasture: birds, tiny "pfft", then the burp
add(norm(filt(white, 'bandpass', [300, 1500])) * ramp(COW, FISH, 0.3, 0.3), db(-32))
for k in range(8): x = tt(0.18); place(rng.uniform(COW, FISH - 1), np.sin(2 * np.pi * np.cumsum(3200 + 900 * np.sin(2 * np.pi * 14 * x)) / SR) * np.sin(np.pi * x / 0.18), db(-30), rng.uniform(-0.8, 0.8))
place(COW + 1.0, fart(0.25, 180, 0.5), db(-20), -0.2)
x = tt(1.6); f = 62 * (1 + 0.15 * np.sin(2 * np.pi * 7 * x)) * (1 - 0.2 * x / 1.6); src = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) + 0.3 * rng.standard_normal(len(x))
burp = filt(src, 'bandpass', [120, 700]) + 0.5 * filt(src, 'bandpass', [700, 1400]); place(COW + 2.7, norm(burp) * np.sin(np.pi * x / 1.6) ** 0.5, db(-8))
place(COW + 4.6, beep(660, 0.1), db(-22)); place(COW + 4.75, beep(990, 0.14), db(-22))
# ---------- underwater: muffled ambience, bubbles, fast repetitive ticks
add(norm(filt(white, 'lowpass', 300)) * ramp(FISH, SLOTH, 0.2, 0.2), db(-15))
for k in range(60): x = tt(0.06); place(rng.uniform(FISH + 0.2, SLOTH - 0.2), np.sin(2 * np.pi * np.cumsum(500 + 2500 * x / 0.06) / SR) * np.exp(-x * 60), db(-22), rng.uniform(-0.8, 0.8))
for burst in [FISH + 1.2, FISH + 2.8, FISH + 4.1]:
    for k in range(int(rng.uniform(14, 24))): x = tt(0.012); place(burst + k * 0.03, np.sin(2 * np.pi * 3600 * x) * np.exp(-x * 400), db(-16), 0.2)
# ---------- jungle: chirps, one soft breath
add(norm(filt(white, 'bandpass', [2000, 6000])) * (0.5 + 0.5 * np.sin(2 * np.pi * 9 * t)) * ramp(SLOTH, BIRDS, 0.3, 0.3), db(-36))
for k in range(10): x = tt(0.25); place(rng.uniform(SLOTH, BIRDS - 0.5), np.sin(2 * np.pi * np.cumsum(2400 + 1400 * np.sin(2 * np.pi * 6 * x)) / SR) * np.sin(np.pi * x / 0.25), db(-30), rng.uniform(-0.8, 0.8))
place(SLOTH + 3.2, filt(rng.standard_normal(int(1.4 * SR)), 'bandpass', [300, 1200]) * np.sin(np.pi * tt(1.4) / 1.4) ** 2, db(-22))
# ---------- birds: flaps
for k in range(30): x = tt(0.08); place(BIRDS + rng.uniform(0, 3.8), filt(rng.standard_normal(len(x)), 'bandpass', [400, 1800]) * np.exp(-x * 40), db(-24), rng.uniform(-0.9, 0.9))
# ---------- the lighter: flint clicks, flame, nothing, sad trombone
for a in [LIGHT + 1.0, LIGHT + 1.45]: x = tt(0.04); place(a, rng.standard_normal(len(x)) * np.exp(-x * 120) + np.sin(2 * np.pi * 2800 * x) * np.exp(-x * 160), db(-10))
place(LIGHT + 1.55, filt(rng.standard_normal(int(2.6 * SR)), 'bandpass', [300, 2500]) * np.clip(tt(2.6) / 0.05, 0, 1) * np.exp(-tt(2.6) * 0.6), db(-26))
for k, (n, d) in enumerate([(55, 0.45), (54, 0.45), (53, 0.45), (52, 1.3)]):
    x = tt(d); f = hz(n) * (1 + (0.03 * np.sin(2 * np.pi * 6 * x) if k == 3 else 0)); s = sum(np.sin(2 * np.pi * f * j * x) / j for j in range(1, 8)) * np.clip(x / 0.03, 0, 1) * np.clip((d - x) / 0.1, 0, 1)
    place(LIGHT + 3.7 + k * 0.48, filt(s, 'lowpass', 1800), db(-14))
# ---------- end card: one last tiny one + chime
place(T_END + 0.3, fart(0.35, 150, 0.6), db(-14))
x = tt(3.0); place(T_END + 0.9, (np.sin(2 * np.pi * 784 * x) + 0.4 * np.sin(2 * np.pi * 1175 * x)) * np.exp(-x * 1.5), db(-20))

out = np.stack([L, Rr], 1)
out *= np.clip((DUR - t) / 0.8, 0, 1)[:, None]
out = np.tanh(out * 1.2) / np.tanh(1.2)
out /= np.abs(out).max() / 0.92
wavfile.write(sys.argv[1], SR, (out * 32767).astype(np.int16))
print('ok')
