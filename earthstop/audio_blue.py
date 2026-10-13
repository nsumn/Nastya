import numpy as np, sys
from scipy.signal import butter, sosfilt
from scipy.io import wavfile

# "What if the Sun was a blue star?" — opens on pure nature (birds, a stream, breeze), soft pads, a calm supernova.
SR = 44100; DUR = 65.0; N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(2531)
L = np.zeros(N); Rr = np.zeros(N)
SWAP, SPACE1, HOT, MAP, MEADOW2, DUSK, AGE, SN, TEND = 6.0, 10.0, 17.0, 24.0, 31.0, 40.0, 46.0, 53.0, 60.0

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
def whoosh(at, dur, g, p0, p1, lo=300, hi=3000):
    x = tt(dur); s = filt(rng.standard_normal(len(x)), 'bandpass', [lo, hi]); s = s / (np.abs(s).max() + 1e-9) * np.sin(np.pi * x / dur) ** 2
    i0 = int(at * SR); s = s[:max(0, N - i0)]; pan = np.linspace(p0, p1, len(s))
    L[i0:i0 + len(s)] += s * g * np.sqrt((1 - pan) / 2); Rr[i0:i0 + len(s)] += s * g * np.sqrt((1 + pan) / 2)

# nature on/off: full at the start and in the second meadow, softer at dusk, gone in space
nat = ramp(-1, SPACE1 - 0.2, 0.01, 0.6) + ramp(MEADOW2 - 0.2, AGE - 0.2, 0.8, 0.8) * (1 - 0.45 * ramp(DUSK + 2, 99, 3, 1))
birdsOn = ramp(-1, SWAP + 2.2, 0.01, 1.5) + ramp(MEADOW2, DUSK + 3.5, 1.0, 2.0)

# ---------- stream: filtered noise with slow swells + soft bubbles
w = rng.standard_normal(N)
st = filt(w, 'bandpass', [350, 2600], 2)
lfo = 0.6 + 0.25 * np.sin(2 * np.pi * 0.31 * t) + 0.15 * np.sin(2 * np.pi * 0.83 * t + 1) + 0.1 * np.sin(2 * np.pi * 1.9 * t + 2)
st = norm(st * lfo)
stR = norm(filt(rng.standard_normal(N), 'bandpass', [350, 2600], 2) * lfo[::-1])
L += st * nat * db(-22); Rr += stR * nat * db(-22)
for k in range(int(DUR * 26)):
    at = rng.uniform(0, DUR); f0 = rng.uniform(380, 1100); d = rng.uniform(0.03, 0.07); x = tt(d)
    b = np.sin(2 * np.pi * f0 * (x + 2.2 * x * x / d)) * np.sin(np.pi * x / d) ** 2
    g = float(np.interp(at, t[::441], nat[::441])) * db(rng.uniform(-38, -31))
    if g > 1e-4: place(at, b, g, rng.uniform(0.1, 0.7))
# ---------- breeze in the grass
br = norm(filt(np.cumsum(rng.standard_normal(N)) * 0.02 + rng.standard_normal(N) * 0.4, 'bandpass', [180, 900]))
breeze = 0.55 + 0.45 * np.sin(2 * np.pi * 0.09 * t) ** 2
add(br * breeze * nat, db(-27))

# ---------- birds: warbling phrases (soft glides, never a steady tick), plus a far-away two-note call
def chirp(f0, f1, d, vib=0.0):
    x = tt(d); f = f0 + (f1 - f0) * (x / d) ** 0.8; f = f * (1 + vib * np.sin(2 * np.pi * 38 * x))
    ph = 2 * np.pi * np.cumsum(f) / SR; env = np.sin(np.pi * x / d) ** 1.5
    return (np.sin(ph) + 0.18 * np.sin(2 * ph)) * env
def phrase(kind):
    out = np.zeros(int(SR * 1.6)); p = 0.0
    if kind == 0:                          # robin-like warble
        for _ in range(rng.integers(3, 7)):
            f0 = rng.uniform(2100, 3400); s = chirp(f0, f0 * rng.uniform(0.8, 1.3), rng.uniform(0.07, 0.16), 0.02)
            i = int(p * SR); out[i:i + len(s)] += s[:len(out) - i]; p += len(s) / SR + rng.uniform(0.03, 0.09)
    elif kind == 1:                        # rising whistle + trill down
        s = chirp(1800, 2900, 0.35); out[:len(s)] += s; p = 0.4
        for j in range(4):
            s = chirp(3000 - j * 180, 2600 - j * 180, 0.08); i = int(p * SR); out[i:i + len(s)] += s * 0.8; p += 0.11
    else:                                  # far-away soft two-note call
        for j, f in enumerate([760, 610]):
            s = chirp(f * 1.02, f, 0.28); i = int((j * 0.36) * SR); out[i:i + len(s)] += s
    return out
pt = 0.25
while pt < DUR:
    g = float(np.interp(pt, t[::441], birdsOn[::441]))
    if g > 0.02:
        kind = rng.choice([0, 0, 1, 2], p=[0.35, 0.25, 0.25, 0.15])
        place(pt, phrase(kind), g * db(-20 if kind != 2 else -24), rng.uniform(-0.8, 0.8))
    pt += rng.uniform(0.7, 2.0)

# ---------- music: warm pad (Cmaj7 · Am9 · Fmaj7 · G6sus) + sparse music-box notes
CH = [[48, 55, 59, 64], [45, 52, 59, 60], [41, 48, 57, 64], [43, 50, 57, 62]]
pad = np.zeros(N); box = np.zeros(N); BAR = 4.0
for ci in range(int(DUR / BAR) + 1):
    a = ci * BAR; ch = CH[ci % 4]
    e = np.clip((t - a + 0.8) / 1.6, 0, 1) * np.clip((a + BAR + 0.8 - t) / 1.6, 0, 1)
    for n in ch: pad += e * (np.sin(2 * np.pi * hz(n + 12) * t) + 0.5 * np.sin(2 * np.pi * hz(n + 12) * 1.003 * t) + 0.25 * np.sin(2 * np.pi * hz(n + 24) * t))
    for k, (dt, n) in enumerate([(0.0, ch[2] + 24), (1.0, ch[3] + 24), (2.0, ch[1] + 24), (3.0, ch[3] + 12 + 12)]):
        at = a + dt
        if at > DUR - 0.5: break
        x = tt(2.5); s = (np.sin(2 * np.pi * hz(n) * x) + 0.25 * np.sin(2 * np.pi * hz(n) * 2 * x)) * np.exp(-x * 1.8) * np.clip(x / 0.006, 0, 1)
        i = int(at * SR); box[i:i + len(s)] += s[:max(0, N - i)]
pad = norm(filt(pad, 'lowpass', 1800)); box = norm(box)
mus = np.clip((t - 4.0) / 3.0, 0, 1) * (1 - 0.65 * ramp(SN - 0.4, SN + 2.0, 0.3, 0.5)) * (1 - 0.35 * ramp(HOT + 2, MAP, 1, 0.5))
boxOn = ramp(5.5, HOT, 2, 1) + ramp(MAP + 1, AGE, 1, 1) + ramp(SN + 2.5, DUR, 2, 1)
add(pad * mus, db(-21)); add(box * boxOn * mus, db(-27), 0.15)

# ---------- the swap: shimmering rise into the white flash
x = tt(4.2); f = 300 * 2 ** (x / 4.2 * 1.6)
sh = sum(np.sin(2 * np.pi * np.cumsum(f * m) / SR) * a for m, a in [(1, 1), (1.5, 0.5), (2, 0.4), (3, 0.2)]) * (x / 4.2) ** 1.6 * np.clip((4.2 - x) / 0.2, 0, 1)
place(SWAP, sh, db(-20)); whoosh(SPACE1 - 1.6, 2.2, db(-17), -0.5, 0.5, 400, 4000)
x = tt(5); place(SPACE1, (np.sin(2 * np.pi * 196 * x) + 0.5 * np.sin(2 * np.pi * 294 * x) + 0.4 * np.sin(2 * np.pi * 392 * x)) * np.exp(-x * 0.8) * np.clip(x / 0.05, 0, 1), db(-17))
# ---------- space: soft hum (mid partials so phones hear it)
hum = sum(np.sin(2 * np.pi * f * t + p) * a for f, p, a in [(110, 0, 1), (165, 1, 0.6), (220, 2, 0.5), (330, 3, 0.25)])
hum *= 0.8 + 0.2 * np.sin(2 * np.pi * 0.2 * t)
spaceOn = ramp(SPACE1, MEADOW2, 0.5, 0.5) + ramp(AGE, TEND, 0.5, 1.5)
add(hum * spaceOn, db(-30))
place(SPACE1 + 3.4, (np.sin(2 * np.pi * 523 * tt(3)) + 0.4 * np.sin(2 * np.pi * 784 * tt(3))) * np.exp(-tt(3) * 1.2), db(-22), 0.3)     # "20,500x" sparkle
# ---------- Earth heating up: rising rumble (mids), steam hiss, a glow swell
x = tt(7); rum = filt(rng.standard_normal(len(x)), 'bandpass', [120, 700]) ; rum = norm(rum) * (x / 7) ** 1.5 * np.clip((7 - x) / 0.4, 0, 1)
place(HOT, rum, db(-17)); place(HOT + 0.6, norm(filt(rng.standard_normal(int(SR * 4)), 'bandpass', [1500, 5000])) * np.sin(np.pi * tt(4) / 4) ** 2, db(-28))
x = tt(3.4); place(HOT + 3.6, (np.sin(2 * np.pi * 146.8 * x) + 0.6 * np.sin(2 * np.pi * 220 * x)) * np.sin(np.pi * x / 3.4), db(-20))
# ---------- map: outward whoosh as Earth glides away, a calm resolve
whoosh(MAP + 1.5, 4.5, db(-22), -0.6, 0.6, 250, 2500)
x = tt(4); place(MAP + 4.0, sum(np.sin(2 * np.pi * hz(n) * x) for n in [67, 71, 74]) * np.exp(-x * 0.7) * np.clip(x / 0.3, 0, 1), db(-24))
# ---------- dusk: warm low chord swelling in
x = tt(6); place(DUSK + 1.5, sum(np.sin(2 * np.pi * hz(n) * x) * a for n, a in [(53, 1), (60, 0.7), (64, 0.6), (69, 0.4)]) * np.sin(np.pi * x / 6) ** 2, db(-22))
# ---------- ageing: a slow, soft pulse that speeds up (no clicks: rounded low-mid thumps)
pt = AGE + 0.6
while pt < SN - 0.2:
    k = (pt - AGE) / (SN - AGE); x = tt(0.35)
    th = (np.sin(2 * np.pi * (90 + 40 * k) * x) + 0.5 * np.sin(2 * np.pi * (180 + 80 * k) * x)) * np.exp(-x * 9) * np.clip(x / 0.01, 0, 1)
    place(pt, th, db(-17 + 6 * k)); pt += 1.1 - 0.75 * k
x = tt(SN - AGE); place(AGE, np.sin(2 * np.pi * np.cumsum(220 + 220 * (x / x[-1]) ** 2) / SR) * (x / x[-1]) ** 2 * 0.6, db(-26))
# ---------- supernova: big but rounded bloom (mids, not sub), shimmer, then calm
x = tt(5.5); boom = norm(filt(rng.standard_normal(len(x)), 'lowpass', 900)) * np.exp(-x * 0.9) * np.clip(x / 0.02, 0, 1)
place(SN, boom, db(-8)); place(SN, (np.sin(2 * np.pi * 98 * x) + 0.6 * np.sin(2 * np.pi * 147 * x) + 0.4 * np.sin(2 * np.pi * 196 * x)) * np.exp(-x * 0.7), db(-13))
whoosh(SN - 0.5, 1.2, db(-14), -0.3, 0.3, 500, 6000)
x = tt(6.5); shimmer = sum(np.sin(2 * np.pi * hz(n) * x + i) * np.exp(-x * 0.5) for i, n in enumerate([76, 79, 83, 88, 91])) * np.clip(x / 0.8, 0, 1)
place(SN + 0.4, shimmer, db(-26))
# ---------- end card: soft resolving chord
x = tt(5); place(TEND + 0.2, sum(np.sin(2 * np.pi * hz(n) * x) * a for n, a in [(48, 1), (55, 0.6), (64, 0.5), (71, 0.3)]) * np.exp(-x * 0.55) * np.clip(x / 0.4, 0, 1), db(-15))

out = np.stack([L, Rr], 1)
out = sosfilt(butter(2, 70, 'highpass', fs=SR, output='sos'), out.T).T
out *= np.clip((DUR - t) / 0.8, 0, 1)[:, None] * np.clip(t / 0.25, 0, 1)[:, None]
out = np.tanh(out * 1.2) / np.tanh(1.2)
out /= np.abs(out).max() / 0.92
wavfile.write(sys.argv[1], SR, (out * 32767).astype(np.int16))
print('ok')
