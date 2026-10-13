import numpy as np, sys, json, os
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io import wavfile

# "What if you dug a hole through the Earth?" — realistic sound design: evening yard, the shaft (drips, pipe clank, rock burst,
# groaning hot rock), the fall (wind roar following the PREM speed), weightless hush, splash out into the Indian Ocean.
SR = 44100; DUR = 71.5; N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(7741)
L = np.zeros(N); Rr = np.zeros(N)
SHAFT, CUT, FALL, OCEAN, DRAIN, WAVE, TEND = 4.0, 27.0, 32.0, 52.0, 58.0, 62.0, 66.5
FALL_LEN, FALL_MIN = 20.0, 38.1

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
def noise(d, lo, hi): return norm(filt(rng.standard_normal(int(d * SR)), 'bandpass', [lo, hi]))
def whoosh(at, dur, g, p0, p1, lo=250, hi=3000):
    x = tt(dur); s = noise(dur, lo, hi) * np.sin(np.pi * x / dur) ** 2
    i0 = int(at * SR); s = s[:max(0, N - i0)]; pan = np.linspace(p0, p1, len(s))
    L[i0:i0 + len(s)] += s * g * np.sqrt((1 - pan) / 2); Rr[i0:i0 + len(s)] += s * g * np.sqrt((1 + pan) / 2)
# small "shaft" reverb: exponentially decaying noise impulse
ir = rng.standard_normal(int(SR * 0.9)) * np.exp(-np.arange(int(SR * 0.9)) / SR * 6.0); ir = filt(ir, 'lowpass', 3500); ir /= np.abs(ir).sum() * 0.02
def verb(x): return fftconvolve(x, ir)[:len(x)]

# ---------- 0-4 s: evening yard — breeze, a few birds, two shovel scoops off-screen
yard = ramp(-1, SHAFT + 0.2, 0.01, 0.5)
add(norm(filt(rng.standard_normal(N), 'bandpass', [200, 1400])) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.15 * t) ** 2) * yard, db(-26))
def chirp(f0, f1, d):
    x = tt(d); f = f0 + (f1 - f0) * (x / d); ph = 2 * np.pi * np.cumsum(f) / SR; return np.sin(ph) * np.sin(np.pi * x / d) ** 1.5
for at, f0, f1, d, p in [(0.3, 2600, 3300, 0.14, -0.6), (0.5, 3100, 2500, 0.12, -0.6), (1.4, 2200, 2900, 0.25, 0.5), (2.3, 3000, 2600, 0.1, -0.3), (2.45, 2900, 3400, 0.12, -0.3), (3.1, 2400, 2000, 0.3, 0.6)]:
    place(at, chirp(f0, f1, d), db(-27), p)
def scoop():
    x = tt(0.45); grit = noise(0.45, 300, 4500) * np.exp(-x * 7) * np.clip(x / 0.01, 0, 1)
    thud = np.sin(2 * np.pi * 140 * x) * np.exp(-x * 25); return grit * 0.8 + thud * 0.5
for at in [0.15, 1.35]: place(at, scoop(), db(-15), 0.25)
place(1.9, noise(0.6, 400, 3000) * np.exp(-tt(0.6) * 5), db(-24), 0.3)      # dirt sliding off the heap
whoosh(2.9, 1.4, db(-16), 0.0, 0.0, 200, 2200)                              # drop into the hole

# ---------- 4-27 s: the shaft
shaft = ramp(SHAFT - 0.1, CUT + 0.1, 0.3, 0.3)
deep = np.clip((t - SHAFT) / (CUT - SHAFT), 0, 1)
rum = norm(filt(rng.standard_normal(N), 'bandpass', [90, 520])) * (0.35 + 0.65 * deep ** 1.5)
add(rum * shaft, db(-20))
add(verb(norm(filt(rng.standard_normal(N), 'bandpass', [600, 2500])) * 0.15) * shaft * (1 - deep) ** 2, db(-30))     # dry air hiss near the top
# descent "air" that follows the speed of the camera (keyframes as in the scene)
DK = [(4.0, 0.6), (8.0, 3.0), (12.0, 18.0), (14.6, 26.0), (17.2, 600), (18.3, 3800), (20.6, 3835), (22.0, 4150), (25.0, 11700), (27.0, 12262)]
kt = np.array([k[0] for k in DK]); kd = np.log(np.array([k[1] for k in DK]))
dl = np.interp(t, kt, kd); sp = np.abs(np.gradient(np.exp(dl), 1 / SR)); spn = np.clip(np.log1p(sp) / np.log1p(3000), 0, 1)
add(norm(filt(rng.standard_normal(N), 'bandpass', [300, 3000])) * spn * shaft, db(-19))
# pipe: a hollow clank as we brush past the gas line
x = tt(1.2); place(5.6, verb((np.sin(2 * np.pi * 523 * x) + 0.6 * np.sin(2 * np.pi * 1340 * x) + 0.3 * np.sin(2 * np.pi * 2210 * x)) * np.exp(-x * 6)), db(-18), -0.2)
# groundwater: trickles + sparse drips with echo, rising flood
trk = norm(filt(rng.standard_normal(N), 'bandpass', [700, 3200])) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.7 * t) ** 2)
add(trk * ramp(8.0, 12.8, 0.6, 0.6), db(-25))
at = 8.1
for k in range(11):
    at += rng.uniform(0.2, 0.6); f0 = rng.uniform(900, 1600); x = tt(0.25)
    d = np.sin(2 * np.pi * f0 * (x + 3 * x * x)) * np.exp(-x * 28) * np.clip(x / 0.004, 0, 1)
    place(at, verb(d), db(-21), rng.uniform(-0.6, 0.6))
# limestone: hollow knocks of the rock passing by (soft)
for at in [12.6, 13.4, 14.1]: x = tt(0.6); place(at, verb(np.sin(2 * np.pi * 190 * x) * np.exp(-x * 12)), db(-20), rng.uniform(-0.4, 0.4))
# rock burst at 18.75: sharp crack, blast, debris rain
x = tt(0.25); crack = noise(0.25, 1500, 9000) * np.exp(-x * 30); place(18.72, crack, db(-6), 0.4)
x = tt(2.5); blast = norm(filt(rng.standard_normal(len(x)), 'lowpass', 1200)) * np.exp(-x * 2.2) * np.clip(x / 0.005, 0, 1); place(18.75, blast, db(-7), 0.3)
place(18.75, np.sin(2 * np.pi * 70 * x) * np.exp(-x * 3) + 0.6 * np.sin(2 * np.pi * 140 * x) * np.exp(-x * 4), db(-10))
for k in range(26):
    at = 18.85 + rng.uniform(0, 1.6); x = tt(0.08); place(at, noise(0.08, 1200, 6000) * np.exp(-x * 60), db(rng.uniform(-24, -17)), rng.uniform(-0.8, 0.8))
# heat: steam hiss + deep groans and creaks of rock that flows
add(norm(filt(rng.standard_normal(N), 'bandpass', [2500, 7000])) * ramp(22.2, CUT, 1.5, 0.3), db(-30))
for at, f in [(23.2, 82), (24.8, 70), (25.9, 61)]:
    x = tt(1.6); g = np.sin(2 * np.pi * np.cumsum(f * (1 + 0.15 * np.sin(2 * np.pi * 3 * x)) * (1 - 0.2 * x / 1.6)) / SR)
    g += 0.5 * np.sin(2 * np.pi * np.cumsum(2 * f * (1 + 0.1 * np.sin(2 * np.pi * 5 * x))) / SR); g *= np.sin(np.pi * x / 1.6) ** 2
    place(at, filt(g, 'lowpass', 900), db(-14), rng.uniform(-0.3, 0.3))
# music bed for the dig: dark pad (no melody), slowly swelling
def pad(chord, a, b, fa=1.2, fb=1.2):
    e = ramp(a, b, fa, fb); s = sum(np.sin(2 * np.pi * hz(n) * t) + 0.4 * np.sin(2 * np.pi * hz(n) * 1.004 * t) for n in chord); return filt(s, 'lowpass', 1500) * e
add(pad([45, 52, 57, 60], SHAFT, 15.0) + pad([43, 50, 55, 58], 14.0, CUT + 0.5), db(-33))

# ---------- 27-32 s: cutaway — hush, airy swell, reveal chord
whoosh(CUT - 0.2, 1.6, db(-18), 0.4, -0.4, 300, 4000)
add(pad([48, 55, 59, 64, 67], CUT + 0.2, FALL + 0.3, 1.5, 0.6), db(-27))
x = tt(3); place(FALL - 2.2, (np.sin(2 * np.pi * 98 * x) + 0.5 * np.sin(2 * np.pi * 147 * x)) * (x / 3) ** 2, db(-20))   # the tube appears

# ---------- 32-52 s: the fall — wind roar follows the real speed (PREM table), layer whooshes, weightless hush at the center
F = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'hole_fall.json')))
half = F['t'][-1]; tm = np.clip((t - FALL) / FALL_LEN, 0, 1) * FALL_MIN; ttm = np.where(tm > half, FALL_MIN - tm, tm)
mph = np.interp(ttm, F['t'], F['mph']); spd = np.clip(mph / 22188, 0, 1)
fall = ramp(FALL - 0.1, OCEAN, 0.3, 0.2)
center = np.exp(-((t - (FALL + FALL_LEN / 2)) / 1.0) ** 2)
lowroar = norm(filt(rng.standard_normal(N), 'bandpass', [120, 900])); hiroar = norm(filt(rng.standard_normal(N), 'bandpass', [900, 4500]))
add((lowroar * (0.4 + 0.6 * spd) + hiroar * spd ** 2 * 0.6) * fall * (1 - 0.85 * center), db(-15))
for b in [38.7, 40.9, 43.1, 45.3]: whoosh(b - 0.5, 1.1, db(-14), -0.7, 0.7, 300, 5000)
x = tt(4.0); place(FALL + FALL_LEN / 2 - 1.8, sum(np.sin(2 * np.pi * hz(n) * x + i) for i, n in enumerate([76, 83, 88])) * np.sin(np.pi * x / 4.0) ** 2, db(-23))   # weightless shimmer
add(pad([40, 47, 52, 56], FALL, OCEAN, 1.0, 0.5) * (0.6 + 0.4 * spd), db(-30))

# ---------- 52-60 s: under water, bubbles, splash out, waves at sunrise
uw = ramp(OCEAN - 0.1, OCEAN + 1.3, 0.2, 0.05)
add(norm(filt(rng.standard_normal(N), 'lowpass', 400)) * uw, db(-20))
for k in range(28):
    at = OCEAN + rng.uniform(0, 1.25); f0 = rng.uniform(250, 700); x = tt(0.06)
    place(at, np.sin(2 * np.pi * f0 * (x + 6 * x * x)) * np.sin(np.pi * x / 0.06), db(-24), rng.uniform(-0.6, 0.6))
x = tt(1.4); place(OCEAN + 1.3, noise(1.4, 400, 7000) * np.exp(-x * 3.5) * np.clip(x / 0.01, 0, 1), db(-9))       # splash
waves = np.zeros(N); sea = ramp(OCEAN + 1.3, DRAIN + 1.5, 0.3, 1.5)
wn = norm(filt(rng.standard_normal(N), 'bandpass', [150, 2500]))
for k in range(9):
    a = OCEAN + 1.6 + k * 1.15 + rng.uniform(-0.2, 0.2); e = np.clip((t - a) / 0.6, 0, 1) * np.exp(-np.clip(t - a - 0.6, 0, None) * 1.8) * (t > a)
    waves += wn * e * rng.uniform(0.6, 1.0)
add(waves * sea, db(-18)); add(norm(filt(rng.standard_normal(N), 'bandpass', [300, 1500])) * sea, db(-30))
add(pad([50, 57, 62, 66], OCEAN + 1.6, DRAIN + 0.6, 1.5, 0.6), db(-28))
# ---------- 58-62: the sea drains into your hole — swirling gurgle, bubbles, one huge slurp
dr = ramp(DRAIN, WAVE + 0.5, 0.8, 0.6)
swirl = norm(filt(rng.standard_normal(N), 'bandpass', [120, 900])) * (0.6 + 0.4 * np.sin(2 * np.pi * (1.2 + 0.8 * np.clip((t - DRAIN) / 4, 0, 1)) * t))
add(swirl * dr, db(-14))
for k in range(60):
    at = DRAIN + rng.uniform(0.2, 4.2); f0 = rng.uniform(150, 500); x = tt(0.09)
    place(at, np.sin(2 * np.pi * f0 * (x + 5 * x * x)) * np.sin(np.pi * x / 0.09), db(-20), rng.uniform(-0.7, 0.7))
x = tt(1.4); place(60.4, np.sin(2 * np.pi * np.cumsum(420 * np.exp(-x * 2.2) + 60) / SR) * np.sin(np.pi * x / 1.4) ** 0.7, db(-11))   # the big slurp
x = tt(4); place(DRAIN + 0.2, (np.sin(2 * np.pi * hz(57) * x) + np.sin(2 * np.pi * hz(60) * x) + 0.6 * np.sin(2 * np.pi * hz(63) * x)) * np.sin(np.pi * x / 4) ** 2, db(-26))  # uneasy chord
# ---------- 62-66.5: the tsunami — a growing roar (mids so phones hear it), then the hit
x = tt(TEND - WAVE); roar = norm(filt(rng.standard_normal(len(x)), 'bandpass', [90, 2500])) * (x / x[-1]) ** 2.2
place(WAVE, roar, db(-6)); place(WAVE, norm(filt(rng.standard_normal(len(x)), 'bandpass', [2500, 7000])) * (x / x[-1]) ** 3, db(-16))
place(WAVE, np.sin(2 * np.pi * 55 * x) * (x / x[-1]) ** 2 + 0.6 * np.sin(2 * np.pi * 110 * x) * (x / x[-1]) ** 2, db(-12))
x = tt(2.0); place(TEND - 0.35, norm(filt(rng.standard_normal(len(x)), 'lowpass', 2500)) * np.exp(-x * 2.5) * np.clip(x / 0.01, 0, 1), db(-4))
# end card: warm chord
x = tt(5); place(TEND + 0.2, sum(np.sin(2 * np.pi * hz(n) * x) * a for n, a in [(45, 1), (52, 0.6), (61, 0.5), (64, 0.3)]) * np.exp(-x * 0.55) * np.clip(x / 0.4, 0, 1), db(-15))

out = np.stack([L, Rr], 1)
out = sosfilt(butter(2, 60, 'highpass', fs=SR, output='sos'), out.T).T
out *= np.clip((DUR - t) / 0.8, 0, 1)[:, None] * np.clip(t / 0.05, 0, 1)[:, None]
out = np.tanh(out * 1.2) / np.tanh(1.2)
out /= np.abs(out).max() / 0.92
wavfile.write(sys.argv[1], SR, (out * 32767).astype(np.int16))
print('ok')
