import numpy as np, sys, math
from scipy.signal import butter, sosfilt
from scipy.io import wavfile

# "What if you watched Times Square since Earth was born?" — city bed, a tape-rewind sweep, then one slow theme (D minor -> D major)
# under era ambiences: lava rumble + meteor impacts, ocean surf, mountain groans, volcanoes, desert wind, rift lake + dino calls,
# ice creaks and cracks, 1609 forest birds and a stream, 1904 hooves + trolley bell, today's crowd. Mostly 200 Hz - 3 kHz; no ticking.
SR = 44100; DUR = 64.5; N = int(SR * DUR); t = np.arange(N) / SR
rng = np.random.default_rng(1609); L = np.zeros(N); Rr = np.zeros(N)
REW, LAVA, OCEAN, GREN, TACO, PANG, RIFT, ICE, WOODS, OLD, NOW, TEND = 3.5, 4.3, 9.0, 14.0, 19.0, 26.0, 31.5, 37.5, 43.5, 49.5, 55.5, 58.5
def filt(x, kind, f, order=2): return sosfilt(butter(order, f, kind, fs=SR, output='sos'), x)
def db(x): return 10 ** (x / 20)
def ramp(a, b, fa=0.15, fb=0.15): return np.clip((t - a) / max(fa, 1e-3), 0, 1) * np.clip((b - t) / max(fb, 1e-3), 0, 1)
def norm(x): return x / (np.abs(x).max() + 1e-9)
def tt(d): return np.arange(int(d * SR)) / SR
def place(at, sig, g=1.0, pan=0.0):
    i0 = int(at * SR)
    if i0 >= N or i0 < 0: return
    s = sig[:N - i0]; L[i0:i0 + len(s)] += s * g * np.sqrt((1 - pan) / 2); Rr[i0:i0 + len(s)] += s * g * np.sqrt((1 + pan) / 2)
def add(sig, g=1.0, pan=0.0):
    global L, Rr
    L += sig * g * np.sqrt((1 - pan) / 2); Rr += sig * g * np.sqrt((1 + pan) / 2)
def hz(n): return 440 * 2 ** ((n - 69) / 12)
def noise(d, lo, hi): return norm(filt(rng.standard_normal(int(d * SR)), 'bandpass', [lo, hi]))
BN = lambda lo, hi: norm(filt(rng.standard_normal(N), 'bandpass', [lo, hi]))
def whoosh(at, dur, g, lo=300, hi=3500, p0=0, p1=0):
    x = tt(dur); s = noise(dur, lo, hi) * np.sin(np.pi * x / dur) ** 2; i0 = int(at * SR); s = s[:max(0, N - i0)]; pan = np.linspace(p0, p1, len(s))
    L[i0:i0 + len(s)] += s * g * np.sqrt((1 - pan) / 2); Rr[i0:i0 + len(s)] += s * g * np.sqrt((1 + pan) / 2)
def thud(d=0.6, f=90): x = tt(d); return (np.sin(2 * np.pi * f * x * (1 - 0.3 * x)) + 0.7 * np.sin(2 * np.pi * 2.4 * f * x)) * np.exp(-x * 6) + 0.8 * noise(d, 200, 1800) * np.exp(-x * 9)
def piano(n, d=2.5, b=1.0): x = tt(d); f = hz(n); return (np.sin(2 * np.pi * f * x) + 0.35 * b * np.sin(4 * np.pi * f * x) + 0.12 * b * np.sin(6 * np.pi * f * x)) * np.exp(-x * 1.8) * np.clip(x / 0.006, 0, 1)
def pad(chord, a, b, fa=1.0, fb=1.0, lp=1600): return filt(sum(np.sin(2 * np.pi * hz(n) * t) + 0.4 * np.sin(2 * np.pi * hz(n) * 1.004 * t) for n in chord), 'lowpass', lp) * ramp(a, b, fa, fb)
jhash = lambda n: (math.sin(n * 127.1 + 311.7) * 43758.5453) % 1.0
# ---- city (today) at both ends
city = ramp(-1, REW, 0.01, 0.2) + ramp(NOW, DUR, 0.3, 1.0)
add(BN(250, 1800) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.3 * t) ** 2) * city, db(-26))
for at in [0.8, 2.3, NOW + 0.6, NOW + 1.9]: x = tt(0.4); place(at, filt(np.sign(np.sin(2 * np.pi * 392 * x)) + np.sign(np.sin(2 * np.pi * 466 * x)), 'lowpass', 1800) * np.clip(x / 0.01, 0, 1) * np.clip((0.4 - x) / 0.04, 0, 1), db(-29), rng.uniform(-0.7, 0.7))
# ---- rewind: rising sweep + tape chirps
x = tt(LAVA - REW + 0.2); f = np.linspace(300, 1600, len(x)); place(REW, np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.4 * (x / x[-1]) + noise(len(x) / SR, 400, 3000) * (x / x[-1]), db(-15))
# ---- theme: 70 bpm, one melody, chords per era, grows toward the end
beat = 60 / 70; mel = [62, 65, 69, 67, 65, 64, 62, 57, 62, 65, 69, 72, 70, 69, 67, 65]
ch = [(LAVA, OCEAN, [50, 57, 62]), (OCEAN, GREN, [50, 57, 62]), (GREN, TACO, [46, 53, 58]), (TACO, PANG, [48, 55, 60]), (PANG, RIFT, [45, 52, 57]), (RIFT, ICE, [46, 53, 58]), (ICE, WOODS, [43, 50, 55]), (WOODS, OLD, [48, 55, 60]), (OLD, NOW, [45, 52, 57]), (NOW, DUR, [50, 57, 62, 66])]
for a, b, c in ch: add(pad(c, a, b, 0.3, 0.3, 1300), db(-28 + 4 * (a - LAVA) / (NOW - LAVA)))
k = 0; at = LAVA + 0.4
while at < TEND:
    n = mel[k % 16] + (4 if at >= NOW and mel[k % 16] % 12 == 5 else 0)   # F -> F# in the final D major
    place(at, piano(n), db(-24 + 6 * (at - LAVA) / (TEND - LAVA)), 0.15 if k % 2 else -0.15)
    if k % 4 == 0: place(at, piano(n - 24, 3.5, 0.5), db(-24 + 5 * (at - LAVA) / (TEND - LAVA)))
    at += beat; k += 1
place(TEND + 0.2, sum(piano(n, 5.5, 0.6) * a for n, a in [(50, 1), (57, 0.7), (62, 0.6), (66, 0.5), (69, 0.4)]), db(-17)); add(pad([50, 57, 62, 66, 69], TEND, DUR, 0.3, 3.0, 1600), db(-24))
for T in [LAVA, OCEAN, GREN, TACO, PANG, RIFT, ICE, WOODS, OLD, NOW]: whoosh(T - 0.35, 0.8, db(-20), 300, 3000, -0.3, 0.3)
# ---- lava: rumble, bubbling pops (irregular, low-mid), meteors
add(BN(120, 600) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.7 * t)) * ramp(LAVA, OCEAN), db(-22))
pt = LAVA
while pt < OCEAN - 0.2: x = tt(0.12); place(pt, np.sin(2 * np.pi * rng.uniform(180, 380) * x * (1 + 2 * x)) * np.exp(-x * 30), db(-27), rng.uniform(-0.7, 0.7)); pt += rng.exponential(0.22)
for i in range(7):
    t0 = LAVA + 0.3 + i * 0.68 + jhash(i) * 0.2; whoosh(t0 - 0.15, 0.7, db(-19), 400, 3500, -0.5, 0.2); place(t0 + 0.5, thud(1.0, 80), db(-12), rng.uniform(-0.4, 0.4))
# ---- ocean: surf
add(filt(BN(150, 2500), 'lowpass', 1400) * (0.55 + 0.45 * np.sin(2 * np.pi * 0.17 * t) ** 2) * ramp(OCEAN, GREN), db(-21)); add(BN(400, 2500) * ramp(OCEAN, GREN), db(-33))
# ---- Grenville: rising groan + wind
x = tt(GREN - TACO + 10)[: int((TACO - GREN) * SR)]; f = np.linspace(110, 170, len(x)); place(GREN, filt(np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.5 * np.sin(2 * np.pi * np.cumsum(f * 2.01) / SR), 'lowpass', 900) * np.sin(np.pi * x / x[-1]), db(-22))
add(BN(300, 1500) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.23 * t) ** 2) * ramp(GREN, TACO), db(-27))
for at in [15.2, 16.9, 18.1]: place(at, thud(1.2, 70) * 0.8, db(-18), rng.uniform(-0.5, 0.5))
# ---- Taconic: surf + volcano rumble + booms
add(filt(BN(150, 2500), 'lowpass', 1200) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.2 * t) ** 2) * ramp(TACO, PANG), db(-25)); add(BN(100, 500) * ramp(TACO, PANG), db(-25))
for at in [20.2, 22.0, 23.7, 25.2]: place(at, thud(1.4, 60), db(-15), 0.5)
# ---- Pangaea: dry wind howl
w = BN(400, 1800) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.31 * t + 1) ** 2); add(w * ramp(PANG, RIFT), db(-22), 0.2)
x = tt(5.0); place(PANG + 0.3, filt(noise(5.0, 500, 2000), 'bandpass', [700, 1100]) * np.sin(np.pi * x / 5.0), db(-25), -0.3)
# ---- rift: lake lapping, distant magma rumble, dinosaur calls (low-mid hoots)
add(filt(BN(200, 1800), 'lowpass', 1000) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.5 * t) ** 2) * ramp(RIFT, ICE), db(-28)); add(BN(90, 400) * ramp(RIFT, ICE), db(-29))
for at, f0 in [(32.6, 300), (34.0, 240), (35.4, 330), (36.6, 270)]:
    x = tt(0.7); f = f0 * (1 + 0.25 * np.sin(np.pi * x / 0.7)); place(at, (np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.5 * np.sin(2 * np.pi * np.cumsum(f * 2) / SR)) * np.sin(np.pi * x / 0.7) ** 1.5, db(-19), rng.uniform(-0.5, 0.5))
# ---- ice: wind, creaks and cracks, muffled inside, meltwater
add(BN(300, 2000) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.27 * t) ** 2) * ramp(ICE, ICE + 3.5), db(-25))
for at in [38.4, 39.3, 40.1, 40.7]:
    x = tt(0.9); f = rng.uniform(180, 320) * (1 + 0.3 * x); place(at, filt(np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * np.abs(np.sin(2 * np.pi * 23 * x)), 'lowpass', 1500) * np.sin(np.pi * x / 0.9), db(-24), rng.uniform(-0.6, 0.6))
place(ICE + 3.45, thud(1.6, 55) + 0.5 * noise(1.6, 300, 3000) * np.exp(-tt(1.6) * 3), db(-11))
add(filt(BN(100, 600), 'lowpass', 400) * ramp(ICE + 3.5, ICE + 4.8), db(-24))
add(BN(800, 3000) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 3.1 * t))) * ramp(ICE + 4.8, WOODS), db(-30))
# ---- 1609: forest — birds, rustle, stream
add(BN(300, 2500) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.2 * t) ** 2) * ramp(WOODS, OLD), db(-31)); add(filt(BN(500, 3000), 'bandpass', [600, 2200]) * ramp(WOODS, OLD), db(-31), 0.5)
pt = WOODS + 0.3
while pt < OLD - 0.5:
    f0 = rng.uniform(2000, 3000)
    for j in range(rng.integers(2, 4)): x = tt(0.12); f = np.linspace(f0, f0 * rng.uniform(0.8, 1.25), len(x)); place(pt + j * 0.16, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * x / 0.12) ** 1.5, db(-27), rng.uniform(-0.8, 0.8))
    pt += rng.uniform(0.9, 1.8)
# ---- 1904: crowd murmur, soft hooves (low-mid, uneven), a trolley bell
add(BN(250, 1500) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.4 * t) ** 2) * ramp(OLD, NOW), db(-28))
pt = OLD + 0.2
while pt < NOW - 0.2:
    x = tt(0.08); place(pt, np.sin(2 * np.pi * 380 * x) * np.exp(-x * 60) + 0.4 * noise(0.08, 300, 1200) * np.exp(-x * 70), db(-27), -0.3); pt += 0.36 + rng.uniform(-0.05, 0.08)
for at in [50.6, 53.4]: x = tt(1.6); place(at, sum(np.sin(2 * np.pi * f * x) * a for f, a in [(880, 1), (1320, 0.4), (2200, 0.15)]) * np.exp(-x * 2.5), db(-22), 0.3)
out = np.stack([L, Rr], 1); out = sosfilt(butter(2, 60, 'highpass', fs=SR, output='sos'), out.T).T
out *= np.clip((DUR - t) / 0.8, 0, 1)[:, None] * np.clip(t / 0.05, 0, 1)[:, None]
out = np.tanh(out * 1.2) / np.tanh(1.2); out /= np.abs(out).max() / 0.92
wavfile.write(sys.argv[1], SR, (out * 32767).astype(np.int16)); print('ok')
