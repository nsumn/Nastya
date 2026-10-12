import numpy as np, sys
from scipy.signal import butter, sosfilt
from scipy.io import wavfile

SR = 44100; DUR = 65.0; N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(21)
L = np.zeros(N); Rr = np.zeros(N)
T0, TEND = 4.0, 61.0
CUTS = [9, 15, 21, 27, 33, 39, 46, 53, 58]

def filt(x, kind, f, order=2): return sosfilt(butter(order, f, kind, fs=SR, output='sos'), x)
def db(x): return 10 ** (x / 20)
def ramp(a, b, fa, fb): return np.clip((t - a) / max(fa, 1e-3), 0, 1) * np.clip((b - t) / max(fb, 1e-3), 0, 1)
def add(sig, g=1.0, pan=0.0):
    global L, Rr
    L += sig * g * np.sqrt((1 - pan) / 2); Rr += sig * g * np.sqrt((1 + pan) / 2)
def norm(x): return x / (np.abs(x).max() + 1e-9)
def event(at, dur, fn):
    s = np.zeros(N); i0 = int(at * SR); i1 = min(N, int((at + dur) * SR)); tt = np.arange(i1 - i0) / SR; s[i0:i1] = fn(tt); return s
def hz(n): return 440 * 2 ** ((n - 69) / 12)

white = rng.standard_normal(N)
brown = norm(filt(np.cumsum(rng.standard_normal(N)), 'highpass', 20))

# park ambience, birds, countdown
amb = norm(filt(white, 'bandpass', [200, 2500]) * 0.25 + filt(brown, 'lowpass', 400))
add(amb * ramp(0, T0 + 0.05, 0.4, 0.05), db(-17))
for bt in [0.4, 1.2, 2.0, 2.9]:
    for k in range(3):
        st = bt + k * 0.11
        add(event(st, 0.07, lambda tt: np.sin(2 * np.pi * np.cumsum(3200 + 1600 * np.sin(np.pi * tt / 0.07)) / SR) * np.sin(np.pi * tt / 0.07)), db(-25), rng.uniform(-0.6, 0.6))
for k in range(4): add(event(k, 0.06, lambda tt: np.sin(2 * np.pi * 1800 * tt) * np.exp(-tt * 70)), db(-8))
add(norm(filt(white, 'bandpass', [300, 6000])) * np.clip((t - 2.0) / 2.0, 0, 1) ** 3 * (t < T0), db(-15))

# appearance: sub whomp + reverse swell
add(norm(event(T0, 3, lambda tt: np.sin(2 * np.pi * (34 * tt + 8 * np.exp(-tt * 6))) * np.exp(-tt * 1.2))), db(-2))
add(norm(filt(white, 'lowpass', 300)) * np.exp(-np.clip(t - T0, 0, None) * 4) * (t >= T0), db(-10))

# eerie black-hole drone: detuned low tones rising slowly until the flash
dr = np.zeros(N)
f0 = 41 * (1 + 0.5 * np.clip((t - T0) / 29, 0, 1) ** 2)
ph = 2 * np.pi * np.cumsum(f0) / SR
for m, a in [(1, 1), (1.007, 0.8), (2.003, 0.35), (3.01, 0.15)]: dr += a * np.sin(ph * m)
dr = norm(dr) * ramp(T0, 33.0, 1.0, 0.05)
add(dr, db(-11))
# glassy shimmer around the lens
sh = norm(filt(white, 'bandpass', [5000, 9000])) * (0.5 + 0.5 * np.sin(2 * np.pi * 6 * t))
add(sh * ramp(T0, 15, 0.8, 1.0), db(-30))

# suction roar growing through the city shots
roarEnv = ramp(9, 33.0, 2.0, 0.05) * np.clip((t - 9) / 24, 0, 1) ** 1.3
roar = norm(filt(brown, 'lowpass', 600) + filt(white, 'bandpass', [300, 1200]) * 0.08)
add(roar * roarEnv, db(-4), -0.1); add(np.roll(roar, 1200) * roarEnv, db(-4), 0.1)
howl = np.zeros(N); seg = 4096
for i in range(0, N - seg, seg // 2):
    c = 300 + 900 * np.clip((i / SR - 9) / 24, 0, 1) + 120 * np.sin(2 * np.pi * 0.4 * i / SR)
    howl[i:i + seg] += filt(white[i:i + seg], 'bandpass', [c * 0.92, c * 1.08]) * np.hanning(seg)
add(norm(howl) * roarEnv, db(-15))

# whooshes at cuts (city part)
def whoosh(at, dur, g, p0, p1):
    global L, Rr
    k = np.clip((t - at) / dur, 0, 1); s = norm(filt(white, 'bandpass', [400, 4000])) * np.sin(np.pi * k) ** 2 * (t < at + dur) * (t >= at)
    pan = np.interp(t, [at, at + dur], [p0, p1]); L += s * g * np.sqrt((1 - pan) / 2); Rr += s * g * np.sqrt((1 + pan) / 2)
for c in CUTS[:4]: whoosh(c - 0.3, 0.55, db(-8), -0.4, 0.4)
for at in np.arange(9.6, 15, 0.8): whoosh(at, 0.5, db(-14), 0.7, -0.7)
# debris / crumbling
for k in range(70):
    at = rng.uniform(15, 32); f = rng.uniform(50, 130)
    add(event(at, 0.5, lambda tt: np.sin(2 * np.pi * f * tt) * np.exp(-tt * 9) + 0.4 * rng.standard_normal(len(tt)) * np.exp(-tt * 25)), db(-14), rng.uniform(-0.9, 0.9))
for k in range(120):
    at = rng.uniform(21, 32)
    add(event(at, 0.04, lambda tt: rng.standard_normal(len(tt)) * np.exp(-tt * 120)), db(-20), rng.uniform(-0.9, 0.9))

# the flash + blast (33)
add(norm(filt(white, 'highpass', 3000)) * ramp(31.8, 33.0, 1.2, 0.02) ** 2, db(-14))
add(norm(event(33.0, 6, lambda tt: np.sin(2 * np.pi * (38 * tt - 3 * tt ** 2)) * np.exp(-tt * 0.7))), db(0))
blast = norm(filt(brown, 'lowpass', 250)) * np.exp(-np.clip(t - 33, 0, None) * 0.55) * (t >= 33) * (t < 39.2)
add(blast, db(-3), -0.1); add(np.roll(blast, 700), db(-3), 0.1)
add(filt(white, 'highpass', 1500) * np.exp(-np.clip(t - 33, 0, None) * 5) * (t >= 33) * 0.5, db(-8))

# space: dark pad, magma crackle, swell
chords = [[50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52]]
pad = np.zeros(N)
for ci in range(9):
    a = 39 + ci * 3.5; ch = chords[ci % 4]; e = ramp(a - 0.8, a + 4.3, 1.0, 1.0)
    for n in ch + [ch[0] - 12]: pad += e * (np.sin(2 * np.pi * hz(n) * t) + 0.3 * np.sin(2 * np.pi * hz(n) * 2.002 * t))
pad = norm(filt(pad, 'lowpass', 1100)) * ramp(39, TEND + 0.3, 1.2, 0.6)
add(pad, db(-15))
add(np.sin(2 * np.pi * 36 * t) * ramp(39, 58, 1, 1) * (0.4 + 0.6 * np.clip((t - 39) / 19, 0, 1)), db(-12))
for k in range(160):
    at = rng.uniform(46, 58)
    add(event(at, 0.05, lambda tt: rng.standard_normal(len(tt)) * np.exp(-tt * 80)), db(-22), rng.uniform(-0.9, 0.9))
add(norm(filt(brown, 'lowpass', 300)) * ramp(52, 58.2, 4.5, 0.3) ** 2, db(-5))
add(norm(event(53.0, 4, lambda tt: np.sin(2 * np.pi * (45 * tt - 4 * tt ** 2)) * np.exp(-tt * 1.0))), db(-4))
# ending: quiet bells
for k, n in enumerate([62, 65, 69, 74, 72, 69]):
    add(event(58.2 + k * 0.45, 2.0, lambda tt, f=hz(n): (np.sin(2 * np.pi * f * tt) + 0.25 * np.sin(2 * np.pi * f * 3 * tt)) * np.exp(-tt * 2.5) * np.clip(tt / 0.005, 0, 1)), db(-17), 0.2)
add(event(TEND, 4, lambda tt: np.sin(2 * np.pi * 40 * tt) * np.exp(-tt * 2.2)), db(-4))
add(event(TEND + 0.1, 4.4, lambda tt: (np.sin(2 * np.pi * hz(50) * tt) + 0.5 * np.sin(2 * np.pi * hz(57) * tt) + 0.35 * np.sin(2 * np.pi * hz(53) * tt)) * np.exp(-tt * 0.6) * np.clip(tt / 0.4, 0, 1)), db(-14))

out = np.stack([L, Rr], 1)
out *= np.clip((DUR - t) / 0.5, 0, 1)[:, None]
out = np.tanh(out * 1.2) / np.tanh(1.2)
out /= np.abs(out).max() / 0.92
wavfile.write(sys.argv[1], SR, (out * 32767).astype(np.int16))
print('ok')
