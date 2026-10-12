import numpy as np, sys
from scipy.signal import butter, sosfilt
from scipy.io import wavfile

# "What if everything that can fart… farted at once?" — countdown, the big chorus, tuba groove, cow burp, herring ticks, sad trombone
SR = 44100; DUR = 65.0; N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(44)
L = np.zeros(N); Rr = np.zeros(N)
POP, AWK, SMELL, PLANE, EARTH, COW, FISH, SLOTH, CUBE, LIGHT, HOLD, T_END = 3.0, 6.0, 10.0, 15.0, 22.0, 27.0, 32.0, 36.0, 40.0, 47.0, 53.0, 61.0

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
brown = norm(filt(np.cumsum(rng.standard_normal(N)), 'highpass', 20))
# ---------- bus: engine + road, countdown, the chorus, silence, awkwardness
busE = ramp(0, PLANE, 0.1, 0.3) + ramp(HOLD, T_END, 0.3, 0.6)
add(norm(filt(brown, 'lowpass', 180)) * busE * (0.8 + 0.2 * np.sin(2 * np.pi * 0.4 * t)), db(-17))
add(np.sin(2 * np.pi * 48 * t + 2 * np.sin(2 * np.pi * 0.5 * t)) * busE, db(-26))
for k in range(3): place(0.15 + k, beep(880), db(-14))
for k in range(50): place(POP + rng.uniform(0, 0.55), fart(rng.uniform(0.3, 0.9), rng.uniform(70, 170), rng.uniform(0.6, 1.4)), db(-17 + rng.uniform(-4, 3)), rng.uniform(-0.9, 0.9))
place(POP, fart(1.3, 80, 0.8), db(-8))
# awkward silence: everything ducks, one cough, one cricket
duck = 1 - 0.8 * ramp(POP + 1.5, AWK + 2.9, 0.3, 0.4)
# smell: queasy low pad + window slide
for n in [38, 45, 49]: add(np.sin(2 * np.pi * hz(n) * t * (1 + 0.004 * np.sin(2 * np.pi * 0.3 * t))) * ramp(SMELL, PLANE, 0.8, 0.3), db(-25))
whoosh(SMELL + 2.5, 0.9, db(-14), 0.6, 0.9, 1500, 7000)
# ---------- plane: cabin roar, chime, muffled chorus
add(norm(filt(white, 'lowpass', 500)) * ramp(PLANE, EARTH, 0.2, 0.3), db(-15))
x = tt(1.6); place(PLANE + 0.4, (np.sin(2 * np.pi * 1046 * x) * np.exp(-x * 2.5) * (x < 0.6) + np.sin(2 * np.pi * 784 * x) * np.exp(-(x - 0.6).clip(0) * 2.5) * (x >= 0.6)), db(-17))
for k in range(40): place(PLANE + 2.2 + rng.uniform(0, 1.0), filt(fart(rng.uniform(0.3, 0.8), rng.uniform(70, 160)), 'lowpass', 500), db(-22), rng.uniform(-0.8, 0.8))
whoosh(PLANE + 4.3, 0.8, db(-14), -0.4, 0.4, 300, 3000)
# ---------- Earth: the global chorus sweeping across
for k in range(60): a = EARTH + 1.1 + 3.2 * (k / 60) + rng.uniform(-0.15, 0.15); place(a, fart(rng.uniform(0.35, 0.9), rng.uniform(70, 160), rng.uniform(0.6, 1.4)), db(-21 + rng.uniform(-4, 3)), np.clip(-0.9 + 1.8 * k / 60, -1, 1))
whoosh(EARTH + 1.1, 3.4, db(-16), -0.8, 0.8, 200, 2000)
# ---------- cow: pfft at the back, BURP at the front
place(COW + 1.4, fart(0.25, 180, 0.5), db(-19), -0.2)
x = tt(1.6); f = 62 * (1 + 0.15 * np.sin(2 * np.pi * 7 * x)) * (1 - 0.2 * x / 1.6); src = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) + 0.3 * rng.standard_normal(len(x))
place(COW + 3.1, norm(filt(src, 'bandpass', [120, 700]) + 0.5 * filt(src, 'bandpass', [700, 1400])) * np.sin(np.pi * x / 1.6) ** 0.5, db(-8))
# ---------- herring: underwater + fast repetitive ticks
add(norm(filt(white, 'lowpass', 300)) * ramp(FISH, SLOTH, 0.2, 0.2), db(-15))
for k in range(40): x = tt(0.06); place(rng.uniform(FISH + 0.2, SLOTH - 0.2), np.sin(2 * np.pi * np.cumsum(500 + 2500 * x / 0.06) / SR) * np.exp(-x * 60), db(-22), rng.uniform(-0.8, 0.8))
for burst in [FISH + 0.8, FISH + 2.2]:
    for k in range(18): x = tt(0.012); place(burst + k * 0.03, np.sin(2 * np.pi * 3600 * x) * np.exp(-x * 400), db(-15), 0.2)
# ---------- sloth: jungle, nothing happens
add(norm(filt(white, 'bandpass', [2000, 6000])) * (0.5 + 0.5 * np.sin(2 * np.pi * 9 * t)) * ramp(SLOTH, CUBE, 0.3, 0.3), db(-36))
for k in range(6): x = tt(0.25); place(rng.uniform(SLOTH, CUBE - 0.5), np.sin(2 * np.pi * np.cumsum(2400 + 1400 * np.sin(2 * np.pi * 6 * x)) / SR) * np.sin(np.pi * x / 0.25), db(-30), rng.uniform(-0.8, 0.8))
# ---------- cube: gas rush + thud
whoosh(CUBE + 0.3, 4.6, db(-12), 0.6, -0.6, 150, 1500)
place(CUBE + 4.8, np.sin(2 * np.pi * (60 * tt(2.5) - 6 * tt(2.5) ** 2)) * np.exp(-tt(2.5) * 1.8), db(-8))
# ---------- lighter: flint, flame, sad trombone
for a in [LIGHT + 1.0, LIGHT + 1.45]: x = tt(0.04); place(a, rng.standard_normal(len(x)) * np.exp(-x * 120) + np.sin(2 * np.pi * 2800 * x) * np.exp(-x * 160), db(-10))
place(LIGHT + 1.55, filt(rng.standard_normal(int(2.2 * SR)), 'bandpass', [300, 2500]) * np.clip(tt(2.2) / 0.05, 0, 1) * np.exp(-tt(2.2) * 0.7), db(-26))
for k, (n, d) in enumerate([(55, 0.42), (54, 0.42), (53, 0.42), (52, 1.2)]):
    x = tt(d); f = hz(n) * (1 + (0.03 * np.sin(2 * np.pi * 6 * x) if k == 3 else 0)); s = sum(np.sin(2 * np.pi * f * j * x) / j for j in range(1, 8)) * np.clip(x / 0.03, 0, 1) * np.clip((d - x) / 0.1, 0, 1)
    place(LIGHT + 3.0 + k * 0.45, filt(s, 'lowpass', 1800), db(-14))
# ---------- hold it in: tension, straining, then the breath out
add(np.sin(2 * np.pi * np.cumsum(220 + 160 * np.clip((t - HOLD) / 5.2, 0, 1) ** 2) / SR) * ramp(HOLD + 0.5, HOLD + 5.35, 1.5, 0.03), db(-26))
for k in range(9): place(HOLD + 0.8 + k * (4.5 / 9) * (1 - 0.04 * k), np.sin(2 * np.pi * 55 * tt(0.3)) * np.exp(-tt(0.3) * 14), db(-12))
x = tt(1.8); place(HOLD + 5.4, filt(rng.standard_normal(len(x)), 'bandpass', [400, 2400]) * np.sin(np.pi * x / 1.8) ** 0.8, db(-12))
place(HOLD + 5.45, fart(0.4, 140, 0.4) * 0.5, db(-20))
x = tt(3.0); place(T_END + 0.4, (np.sin(2 * np.pi * 784 * x) + 0.4 * np.sin(2 * np.pi * 1175 * x)) * np.exp(-x * 1.5), db(-18))


# ---------- background music: a catchy comedy theme with a hook (chiptune-ish lead + oom-pah tuba + pizz + claps, swung)
def lead(n, d, vib=0.006):
    x = tt(d); f = hz(n) * (1 + vib * np.sin(2 * np.pi * 5.5 * x) * np.clip(x / 0.12, 0, 1))
    ph = np.cumsum(f) / SR; sq = np.sign(np.sin(2 * np.pi * ph)) * 0.55 + 0.45 * np.sin(2 * np.pi * ph)
    return filt(sq, 'lowpass', 3200) * np.clip(x / 0.008, 0, 1) * np.clip((d - x) / 0.03, 0, 1) * (0.75 + 0.25 * np.exp(-x * 6))
def tubaN(n, d):
    x = tt(d); f = hz(n); s = sum(np.sin(2 * np.pi * f * k * x) / k ** 1.2 for k in range(1, 6))
    return s * np.clip(x / 0.015, 0, 1) * np.exp(-x * 7)
def pizz2(n, d=0.25): x = tt(d); f = hz(n); return (np.sin(2 * np.pi * f * x) + 0.4 * np.sin(4 * np.pi * f * x)) * np.exp(-x * 18)
def kickM(): x = tt(0.22); return np.sin(2 * np.pi * (55 * x + 70 * (1 - np.exp(-x * 40)) / 40)) * np.exp(-x * 14)
def clapM(): x = tt(0.14); s = filt(rng.standard_normal(len(x)), 'bandpass', [1000, 4000]); return s * (np.exp(-x * 40) + 0.5 * np.exp(-np.abs(x - 0.012) * 300))
def shk(): x = tt(0.06); return filt(rng.standard_normal(len(x)), 'highpass', 6500) * np.exp(-x * 70)
def bellM(n, d=1.0): x = tt(d); f = hz(n); return (np.sin(2 * np.pi * f * x) + 0.3 * np.sin(2 * np.pi * f * 2.76 * x)) * np.exp(-x * 5)
MBPM = 122; beat = 60 / MBPM; SW = 0.62            # swing: first 8th takes 62% of the beat
def pos8(i): return (i // 2) * beat + (SW * beat if i % 2 else 0.0)
# the hook (F major), 2 bars = 16 swung eighths; None = rest, (note, length in 8ths)
HOOK_A = [(72, 1), (77, 1), (81, 1), (79, 1), (77, 2), None, (74, 1), (72, 1), None, (72, 1), (74, 1), (77, 2), None, None, None]
HOOK_B = [(72, 1), (77, 1), (81, 1), (84, 1), (81, 2), None, (79, 1), (77, 1), (79, 1), (81, 1), (79, 1), (77, 3), None, None]
SNEAK  = [(62, 1), None, (65, 1), None, (67, 1), (68, 1), (67, 1), None, (62, 1), None, (60, 1), None, (62, 2), None, None, None]
PROG = [(53, [0, 4, 7]), (58, [0, 4, 7]), (48, [0, 4, 7, 10]), (53, [0, 4, 7])]          # F  Bb  C7  F
PROG_M = [(50, [0, 3, 7]), (50, [0, 3, 7]), (45, [0, 4, 7]), (50, [0, 3, 7])]           # Dm Dm A Dm (sneaky)
SECTIONS = [  # start, end, progression, melody list cycling per 2 bars, drums 0..1, lead gain
  (0.0, POP - 0.05, PROG_M, [SNEAK], 0.6, 0.55),
  (AWK + 2.9, PLANE - 0.05, PROG_M, [SNEAK], 0.8, 0.55),
  (PLANE, EARTH + 1.0, PROG, [HOOK_A, HOOK_B], 1.0, 0.8),
  (EARTH + 4.4, CUBE, PROG, [HOOK_A, HOOK_B, HOOK_A, None], 1.0, 0.8),
  (CUBE, LIGHT + 0.9, PROG, [HOOK_B, HOOK_A], 1.1, 0.85),
  (LIGHT + 5.0, HOLD - 0.1, PROG, [None], 0.5, 0.0),
]
music = np.zeros(N)
def put(at, sig, g=1.0):
    i0 = int(at * SR)
    if i0 >= N or i0 < 0: return
    s = sig[:N - i0]; music[i0:i0 + len(s)] += s * g
for (a, b, prog, mels, dl, lg) in SECTIONS:
    bar = 4 * beat; nb = 0; at = a
    while at < b - 0.05:
        root, ch = prog[nb % len(prog)]
        for k in range(4):                                   # oom-pah: tuba on 1/3, pizz chord on 2/4
            tk = at + k * beat
            if tk >= b - 0.02: break
            if k % 2 == 0: put(tk, tubaN(root - 12 + (7 if k == 2 else 0), beat * 0.9), 0.85)
            else:
                for iv in ch: put(tk, pizz2(root + 12 + iv), 0.22)
            if dl > 0:
                if k % 2 == 0: put(tk, kickM(), 0.7 * dl)
                else: put(tk, clapM(), 0.42 * dl)
                put(tk, shk(), 0.16 * dl); put(tk + SW * beat, shk(), 0.12 * dl)
        mel = mels[(nb // 2) % len(mels)]
        if mel is not None and lg > 0:
            half = (nb % 2) * 8
            for i in range(8):
                ev = mel[half + i] if half + i < len(mel) else None
                if ev is None: continue
                n, ln = ev; t0 = at + pos8(i); t1 = at + pos8(i + ln)
                if t0 < b - 0.05: put(t0, lead(n, (t1 - t0) * 0.92), lg * 0.5)
        if nb % 4 == 0 and prog is PROG: put(at, bellM(84), 0.18)
        at += bar; nb += 1
# tiny "ta-da" stinger on the end card
for k, n in enumerate([72, 77, 81, 84]): put(T_END + 0.15 + k * 0.09, lead(n, 0.5 if k == 3 else 0.12), 0.45)
put(T_END + 0.42, tubaN(41, 0.8), 0.9)
mus = norm(music)
mduck = np.ones(N)
for (a, b, d) in [(POP, POP + 1.6, 0.25), (PLANE + 2.1, PLANE + 3.4, 0.5), (COW + 3.0, COW + 4.6, 0.4)]:
    mduck *= 1 - (1 - d) * ramp(a, b, 0.08, 0.25)
MUSIC_GAIN = float(__import__('os').environ.get('MUSIC_GAIN', '1'))
add(mus * mduck * MUSIC_GAIN, db(-14))
out = np.stack([L, Rr], 1) * np.stack([duck, duck], 1)
L[:] = 0; Rr[:] = 0
x = tt(0.35); place(AWK + 1.6, filt(rng.standard_normal(len(x)), 'bandpass', [300, 2500]) * np.exp(-x * 14), db(-16), 0.4)
for k in range(3): x = tt(0.09); place(AWK + 2.4 + k * 0.22, np.sin(2 * np.pi * 4300 * x) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 60 * x))) * np.sin(np.pi * x / 0.09), db(-24), -0.5)
out += np.stack([L, Rr], 1)
out *= np.clip((DUR - t) / 0.8, 0, 1)[:, None]
out = np.tanh(out * 1.2) / np.tanh(1.2)
out /= np.abs(out).max() / 0.92
wavfile.write(sys.argv[1], SR, (out * 32767).astype(np.int16))
print('ok')
