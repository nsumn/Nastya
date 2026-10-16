import numpy as np, sys
from scipy.signal import butter, sosfilt
from scipy.io import wavfile

# "What if everyone had the new Tesla Roadster?" — city morning, a riser at the red light, one driving synth theme that drops
# on GREEN, cold-gas blasts + EV whine, hop hisses and landings, air-station compressor, a mid-air "bonk", the dark arena demo
# with a crowd cheer on the landing. Mix kept in the mids (phone speakers), no repeating high ticks, no hi-hats.
SR = 44100; DUR = 64.5; N = int(SR * DUR); t = np.arange(N) / SR
rng = np.random.default_rng(2028); L = np.zeros(N); Rr = np.zeros(N)
GREEN, JAM, SKY, AIR, BUMP, REAL, TEND = 4.0, 12.0, 22.0, 32.0, 42.0, 50.0, 58.0
def filt(x, kind, f, order=2): return sosfilt(butter(order, f, kind, fs=SR, output='sos'), x)
def db(x): return 10 ** (x / 20)
def ramp(a, b, fa, fb): return np.clip((t - a) / max(fa, 1e-3), 0, 1) * np.clip((b - t) / max(fb, 1e-3), 0, 1)
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
def hiss(d, lo=350, hi=3200, att=0.02, dec=3.0):
    x = tt(d); return noise(d, lo, hi) * np.clip(x / att, 0, 1) * np.exp(-x * dec)
def thud(d=0.35, f=120):
    x = tt(d); return (np.sin(2 * np.pi * f * x * (1 - 0.3 * x)) + 0.6 * np.sin(2 * np.pi * 2.3 * f * x)) * np.exp(-x * 14) + 0.5 * noise(d, 200, 1500) * np.exp(-x * 25)
def whine(d, f0, f1):
    x = tt(d); f = f0 + (f1 - f0) * (1 - np.exp(-x * 2.5)); ph = 2 * np.pi * np.cumsum(f) / SR; return (np.sin(ph) + 0.4 * np.sin(2 * ph)) * np.clip(x / 0.05, 0, 1) * np.exp(-x * 0.8)
def pad(chord, a, b, fa=1.0, fb=1.0, lp=1600):
    return filt(sum(np.sin(2 * np.pi * hz(n) * t) + 0.4 * np.sin(2 * np.pi * hz(n) * 1.003 * t) for n in chord), 'lowpass', lp) * ramp(a, b, fa, fb)

# ---- city bed (day + sunset), arena room tone
city = ramp(-1, AIR, 0.01, 0.3) + ramp(BUMP, REAL, 0.3, 0.3)
add(norm(filt(rng.standard_normal(N), 'bandpass', [200, 1300])) * city, db(-31))
for at in rng.uniform(0.3, 3.6, 5): x = tt(0.12); f = np.linspace(2600, 3100, len(x)); place(at, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * x / 0.12), db(-30), rng.uniform(-0.7, 0.7))
# ---- 0-4: idle hum of the queue + a riser into the green light
add(filt(np.sin(2 * np.pi * 330 * t) + 0.5 * np.sin(2 * np.pi * 495 * t), 'lowpass', 1500) * ramp(0, GREEN, 0.5, 0.05), db(-34))
x = tt(3.4); place(GREEN - 3.4, filt(noise(3.4, 300, 4000), 'lowpass', 2500) * (x / 3.4) ** 2.5, db(-21)); place(GREEN - 3.4, whine(3.4, 200, 600) * (x / 3.4) ** 2, db(-28))
# ---- the theme: 124 bpm, E minor, starts on GREEN, runs through the sunset; bass with harmonics, a plucky lead, soft snare
bpm = 124; b = 60 / bpm; e = b / 2
def pl(n, d, bright=1.0):
    x = tt(d); f = hz(n); s = np.sign(np.sin(2 * np.pi * f * x)) * 0.35 + np.sin(2 * np.pi * f * x) + 0.3 * bright * np.sin(4 * np.pi * f * x); return filt(s, 'lowpass', 2600) * np.exp(-x * 7) * np.clip(x / 0.004, 0, 1)
def bs(n, d): x = tt(d); f = hz(n); return (np.sin(2 * np.pi * f * x) + 0.6 * np.sin(4 * np.pi * f * x) + 0.35 * np.sin(6 * np.pi * f * x)) * np.exp(-x * 5) * np.clip(x / 0.006, 0, 1)
bassline = [52, 52, 64, 52, 55, 55, 57, 59]; lead = [64, 67, 71, 69, 67, 64, 62, 64, 64, 67, 71, 74, 72, 71, 69, 67]
def theme(a, z, lv=0.0):
    k = 0; at = a
    while at < z - 0.05:
        place(at, bs(bassline[k % 8], e * 0.95), db(-14 + lv))
        if k % 2 == 0: place(at, pl(lead[(k // 2) % 16], b * 0.9), db(-20 + lv), 0.2 if (k // 2) % 2 else -0.2)
        if k % 4 == 0: x = tt(0.25); place(at, np.sin(2 * np.pi * 150 * x * (1 - 0.5 * x)) * np.exp(-x * 20) + 0.5 * noise(0.25, 200, 1100) * np.exp(-x * 40), db(-17 + lv))
        if k % 4 == 2: place(at, noise(0.18, 250, 1600) * np.exp(-tt(0.18) * 22), db(-23 + lv))
        at += e; k += 1
theme(GREEN, AIR - 0.3); theme(AIR + 0.2, BUMP - 0.3, -5); theme(BUMP + 0.2, REAL - 0.3, -1)
add(pad([52, 55, 59], GREEN, REAL, 0.3, 0.5, 1200), db(-32))
# ---- 4-12: launch — staggered cold-gas blasts, EV whines, pass-bys, chase wind
for k in range(9):
    for lane, pan in [(0, -0.5), (1, -0.2), (2, 0.3), (3, 0.6)]:
        at = GREEN + k * 0.16 + (0.07 if lane in (1, 3) else 0); g = db(-14 - k * 1.2)
        place(at, hiss(1.4, 300, 3000, 0.01, 2.2), g, pan); place(at, whine(2.0, 260, 900 + 60 * k), g * 0.35, pan)
        if k < 4: whoosh_at = at + 0.55 + k * 0.05; x = tt(0.9); place(whoosh_at, noise(0.9, 200, 2200) * np.sin(np.pi * x / 0.9) ** 2, db(-17), pan * -1)
add(norm(filt(rng.standard_normal(N), 'bandpass', [250, 1800])) * ramp(8.0, JAM, 0.2, 0.3), db(-24))
place(8.0, whine(4.0, 700, 1100), db(-27), -0.2)
# ---- 12-22: hops over the semis
for k in range(22):
    th = JAM + 0.5 + k * 0.42; pan = -0.2 if k % 2 else 0.2
    place(th, hiss(0.7, 300, 2500, 0.01, 4), db(-19), pan); place(th + 2.1 * 0.82, hiss(0.5, 300, 2200, 0.01, 6), db(-22), pan); place(th + 2.1, thud(0.35, 110), db(-17), pan)
# ---- 22-32: the whole street hopping: dense, quieter hiss bursts
pt = SKY + 0.2
while pt < AIR - 0.4: place(pt, hiss(rng.uniform(0.6, 1.2), 350, 2600, 0.02, 2.5), db(-27), rng.uniform(-0.8, 0.8)); pt += rng.exponential(0.11)
# ---- 32-42: air station: compressor hum + refill hiss, impatient queue (a couple of soft horn toots, mid range)
cmp = (np.sin(2 * np.pi * 240 * t) + 0.5 * np.sin(2 * np.pi * 360 * t) + 0.3 * np.sin(2 * np.pi * 480 * t)) * (0.8 + 0.2 * np.sin(2 * np.pi * 7 * t))
add(filt(cmp, 'lowpass', 1400) * ramp(AIR, BUMP, 0.3, 0.3), db(-27))
add(norm(filt(rng.standard_normal(N), 'bandpass', [600, 3000])) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.5 * t) ** 2) * ramp(AIR, BUMP, 0.3, 0.3), db(-31))
for at in [34.6, 37.3, 40.2]: x = tt(0.35); place(at, filt(np.sign(np.sin(2 * np.pi * 415 * x)) + np.sign(np.sin(2 * np.pi * 523 * x)), 'lowpass', 1800) * np.clip(x / 0.01, 0, 1) * np.clip((0.35 - x) / 0.03, 0, 1), db(-27), rng.uniform(-0.6, 0.6))
# ---- 42-50: sunset hops + the mid-air "bonk"
pt = BUMP + 0.2
while pt < REAL - 0.4: place(pt, hiss(rng.uniform(0.6, 1.1), 350, 2400, 0.02, 2.5), db(-29), rng.uniform(-0.8, 0.8)); pt += rng.exponential(0.16)
BT = BUMP + 2.6; x = tt(0.8); bonk = sum(np.sin(2 * np.pi * f * x) * a for f, a in [(420, 1), (690, 0.6), (1130, 0.4), (1560, 0.25)]) * np.exp(-x * 7)
place(BT, bonk + 0.5 * noise(0.8, 300, 2500) * np.exp(-x * 18), db(-11)); place(BT + 0.05, np.sin(2 * np.pi * np.cumsum(300 + 200 * np.exp(-x * 6) * np.sin(2 * np.pi * 9 * x)) / SR) * np.exp(-x * 3), db(-22))
for at in [BT + 0.85, BT + 0.9]: place(at, thud(0.4, 100), db(-14))
# ---- 50-58: the real demo (dark arena): room tone, approach, the climb, a held breath, drop, landing, crowd cheer
add(norm(filt(rng.standard_normal(N), 'bandpass', [150, 800])) * ramp(REAL, DUR, 0.3, 1.0), db(-33))
R_IN, R_TOP, R_DROP, R_LAND = REAL + 2.0, REAL + 3.4, REAL + 4.4, REAL + 5.95
place(REAL + 0.6, whine(2.8, 250, 900), db(-22), -0.4); place(REAL + 0.6, hiss(1.6, 300, 2500, 0.3, 1.2), db(-24), -0.3)
place(R_IN, whine(1.4, 600, 1000), db(-24), 0.2)
add(pad([52, 59, 64], R_IN, R_DROP + 0.2, 0.6, 0.2, 1400), db(-27))
place(R_DROP, hiss(1.2, 300, 3000, 0.01, 2), db(-14)); place(R_LAND, thud(0.5, 95), db(-11))
def cheer(d):
    x = tt(d); s = sum(filt(noise(d, 300, 3500), 'bandpass', [f, f * 2.2]) * (0.6 + 0.4 * np.sin(2 * np.pi * rng.uniform(2, 5) * x + rng.uniform(0, 6))) for f in [400, 700, 1100])
    return norm(s) * np.clip(x / 0.3, 0, 1) * np.clip((d - x) / 1.5, 0, 1)
place(R_LAND + 0.1, cheer(3.2), db(-15)); place(R_LAND + 0.3, cheer(2.8), db(-19), 0.5)
place(R_LAND + 0.2, sum(pl(n, 1.6) for n in [64, 71, 76]), db(-18))
place(TEND + 0.2, sum(bs(n, 4.0) * a for n, a in [(40, 1), (52, 0.5)]) + sum(pl(n, 4.0, 0.5) * 0.6 for n in [64, 67, 71]), db(-15)); add(pad([52, 59, 64, 67], TEND, DUR, 0.4, 2.5, 1400), db(-26))
out = np.stack([L, Rr], 1); out = sosfilt(butter(2, 60, 'highpass', fs=SR, output='sos'), out.T).T
out *= np.clip((DUR - t) / 0.8, 0, 1)[:, None] * np.clip(t / 0.05, 0, 1)[:, None]
out = np.tanh(out * 1.2) / np.tanh(1.2); out /= np.abs(out).max() / 0.92
wavfile.write(sys.argv[1], SR, (out * 32767).astype(np.int16)); print('ok')
