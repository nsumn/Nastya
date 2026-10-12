import numpy as np, sys
from scipy.signal import butter, sosfilt
from scipy.io import wavfile

SR = 44100; DUR = 65.0; N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(91)
L = np.zeros(N); Rr = np.zeros(N)
CUBE, LAND, ROUL_END, SPACE_END, DIVE_END, REVEAL, TILT, OCEAN, CRACK, FALL, WALL, IMPACT, TEND = 3.0, 3.95, 5.0, 11.0, 14.8, 21, 27.5, 35, 42, 49, 53, 59.3, 60.5
ROUL = [0, 0.3, 0.55, 1.15, 1.4, 1.65, 1.9, 2.15, 2.42, 2.72, CUBE, LAND]

def filt(x, kind, f, order=2): return sosfilt(butter(order, f, kind, fs=SR, output='sos'), x)
def db(x): return 10 ** (x / 20)
def ramp(a, b, fa, fb): return np.clip((t - a) / max(fa, 1e-3), 0, 1) * np.clip((b - t) / max(fb, 1e-3), 0, 1)
def norm(x): return x / (np.abs(x).max() + 1e-9)
def tt(d): return np.arange(int(d * SR)) / SR
def place(at, sig, g=1.0, pan=0.0):
    global L, Rr
    i0 = int(at * SR)
    if i0 >= N: return
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
def click(): x = tt(0.03); return np.sin(2 * np.pi * 2600 * x) * np.exp(-x * 220) + 0.4 * rng.standard_normal(len(x)) * np.exp(-x * 400)

white = rng.standard_normal(N)
brown = norm(filt(np.cumsum(rng.standard_normal(N)), 'highpass', 20))

# ---------- roulette: wheel clicks, slowing hard on the cube, final click to the tsunami
ct = []; x0 = 0.0
while x0 < CUBE: ct.append(x0); x0 += 1 / 22
for k, c in enumerate([CUBE + 0.08, CUBE + 0.2, CUBE + 0.36, CUBE + 0.56, CUBE + 0.8]): ct.append(c)
for c in ct: place(c, click(), db(-19), rng.uniform(-0.3, 0.3))
for i, a in enumerate(ROUL[1:-1]):
    whoosh(a - 0.08, 0.22, db(-15), -0.5 if i % 2 else 0.5, 0.5 if i % 2 else -0.5, 800, 6000)
    place(a, np.sin(2 * np.pi * (300 + 900 * np.exp(-tt(0.18) * 30)) * tt(0.18)) * np.exp(-tt(0.18) * 25), db(-14))
place(CUBE + 0.85, np.zeros(10))
# suspense hum under the cube, then the final click + whoosh + hit + chime
add(np.sin(2 * np.pi * 110 * t) * ramp(CUBE, LAND, 0.2, 0.02) * (0.5 + 0.5 * np.sin(2 * np.pi * 6 * t)), db(-26))
place(LAND, click(), db(-10)); whoosh(LAND - 0.15, 0.4, db(-9), 0.6, -0.6, 300, 6000)
place(LAND, norm(np.sin(2 * np.pi * (55 * tt(2.5) - 4 * tt(2.5) ** 2)) * np.exp(-tt(2.5) * 2.2)), db(-4))
for k, n in enumerate([76, 81, 88]): place(LAND + 0.03 * k, (np.sin(2 * np.pi * hz(n) * tt(2.8)) + 0.3 * np.sin(2 * np.pi * hz(n) * 2.01 * tt(2.8))) * np.exp(-tt(2.8) * 1.6) * np.clip(tt(2.8) / 0.004, 0, 1), db(-17), (k - 1) * 0.4)
# ocean-wave whoosh on the landing (it's a tsunami)
place(LAND + 0.1, filt(rng.standard_normal(int(2.2 * SR)), 'bandpass', [200, 2500]) * np.sin(np.pi * tt(2.2) / 2.2) ** 1.5, db(-14))

# ---------- music: pad + bell arpeggio, drops before the reveal, fades for the collapse
chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
pad = np.zeros(N); bell = np.zeros(N); CH = 4.0
for ci in range(18):
    ch = chords[ci % 4]; a = LAND + ci * CH
    if a > DUR: break
    e = ramp(a - 0.6, a + CH + 0.6, 0.8, 0.8)
    for n in ch + [ch[0] - 12, ch[0] - 24]: pad += e * (np.sin(2 * np.pi * hz(n) * t) + 0.3 * np.sin(2 * np.pi * hz(n) * 2.004 * t))
    for k in range(16):
        at = a + k * 0.25
        if at > DUR - 0.1: break
        n = ch[[0, 1, 2, 1][k % 4]] + 12 + (12 if k % 8 == 7 else 0)
        x = tt(1.2); bell[int(at * SR):int(at * SR) + len(x)] += ((np.sin(2 * np.pi * hz(n) * x) + 0.2 * np.sin(2 * np.pi * hz(n) * 3 * x)) * np.exp(-x * 4) * np.clip(x / 0.004, 0, 1))[:max(0, N - int(at * SR))]
pad = norm(filt(pad, 'lowpass', 1400))
music = np.clip((t - LAND) / 0.3, 0, 1) * (1 - 0.85 * ramp(18.0, 21.0, 0.6, 0.15)) * (1 - 0.6 * ramp(TILT + 0.5, OCEAN, 0.5, 0.5)) * (1 - 0.9 * ramp(CRACK + 1, 99, 3, 1))
add(pad * music * (1 + 0.5 * ramp(REVEAL, TILT, 0.1, 2)), db(-19))
add(norm(bell) * music, db(-25), 0.2)

# ---------- space / dive
add(np.sin(2 * np.pi * 48 * t) * (ramp(0, DIVE_END, 0.1, 0.4) + ramp(OCEAN, CRACK, 0.3, 0.3) + ramp(FALL, WALL, 0.2, 0.2)), db(-24))
dive = np.clip((t - SPACE_END) / (DIVE_END - SPACE_END), 0, 1) ** 2.5 * (t < DIVE_END + 0.4)
add(norm(filt(white, 'bandpass', [200, 1800])) * dive * np.exp(-np.clip(t - DIVE_END, 0, None) * 6), db(-8))
whoosh(DIVE_END - 0.5, 1.0, db(-6), -0.3, 0.3, 300, 5000)

# ---------- city ambience
cityE = ramp(DIVE_END, OCEAN, 0.4, 0.2) + ramp(CRACK, FALL, 0.3, 0.2) + ramp(WALL, IMPACT, 0.2, 0.05)
traffic = norm(filt(brown, 'lowpass', 500) + filt(white, 'bandpass', [300, 1500]) * 0.1)
add(traffic * cityE * (1 - 0.6 * ramp(19, 27, 1.5, 1.5)), db(-16))
for k in range(26):
    at = rng.uniform(15, 27); f = rng.uniform(2800, 4800)
    place(at, np.sin(2 * np.pi * np.cumsum(f + 900 * np.sin(np.pi * tt(0.12) / 0.12)) / SR) * np.sin(np.pi * tt(0.12) / 0.12), db(-28), rng.uniform(-0.8, 0.8))
for k in range(8): p = rng.uniform(-0.8, 0.8); whoosh(15.5 + k * 1.4 + rng.uniform(-0.4, 0.4), rng.uniform(1.2, 2.0), db(-18), p, -p, 120, 1500)
# reveal swell
place(REVEAL - 0.2, norm(np.sin(2 * np.pi * 36 * tt(6)) * np.clip(tt(6) / 0.4, 0, 1) * np.exp(-tt(6) * 0.6)), db(-6))
add(norm(filt(white, 'bandpass', [3000, 9000])) * ramp(19.5, REVEAL + 0.1, 1.4, 0.05) ** 2, db(-22))
# tilt: deep groan + everything sliding (scrapes, tumbling)
add(norm(filt(brown, 'lowpass', 90)) * ramp(28, OCEAN, 1.0, 0.3), db(-8))
place(28.0, np.sin(2 * np.pi * np.cumsum(70 - 30 * tt(2.6) / 2.6) / SR) * np.sin(np.pi * tt(2.6) / 2.6), db(-12))
scrape = filt(white, 'bandpass', [900, 3500]) * (0.5 + 0.5 * np.sin(2 * np.pi * 7 * t) * np.sin(2 * np.pi * 2.3 * t))
add(norm(scrape) * ramp(30.4, OCEAN, 0.6, 0.3), db(-18))
for k in range(40): place(rng.uniform(30.6, 34.8), np.sin(2 * np.pi * rng.uniform(60, 140) * tt(0.3)) * np.exp(-tt(0.3) * 16) + 0.3 * rng.standard_normal(int(0.3 * SR)) * np.exp(-tt(0.3) * 40), db(-14), rng.uniform(-0.8, 0.8))
# draining: long water rush
add(norm(filt(white, 'bandpass', [150, 1200])) * ramp(35.4, 40, 0.8, 1.2), db(-14))
# cracks: rumble + rock falls
add(norm(filt(brown, 'lowpass', 120)) * ramp(CRACK, FALL, 2.0, 0.3) * (0.5 + 0.5 * np.clip((t - CRACK) / 6, 0, 1)), db(-5))
for at in [43.5, 44.6, 45.9, 46.8, 47.6, 48.3]: place(at, np.sin(2 * np.pi * 48 * tt(0.6)) * np.exp(-tt(0.6) * 8), db(-6))
for k in range(30): place(rng.uniform(43, 48.8), filt(rng.standard_normal(int(0.4 * SR)), 'bandpass', [150, 900]) * np.exp(-tt(0.4) * 12), db(-15), rng.uniform(-0.8, 0.8))
# time-lapse collapse: booms
for at in [49.8, 50.6, 51.3, 51.9, 52.4]: place(at, norm(np.sin(2 * np.pi * (45 * tt(1.5) - 5 * tt(1.5) ** 2)) * np.exp(-tt(1.5) * 2.5)), db(-5))
add(norm(filt(white, 'bandpass', [300, 3000])) * ramp(51.2, WALL, 0.3, 0.3), db(-14))
# the wall: rising roar, then impact
roar = norm(filt(brown, 'lowpass', 400) + 0.25 * filt(white, 'bandpass', [200, 1200]))
add(roar * ramp(WALL, IMPACT, 0.5, 0.02) * np.clip((t - WALL) / (IMPACT - WALL), 0, 1) ** 1.6, db(-2))
add(norm(filt(white, 'bandpass', [1500, 7000])) * ramp(WALL, IMPACT, 1.0, 0.02) * np.clip((t - WALL) / (IMPACT - WALL), 0, 1) ** 2, db(-14))
for at in [54.0, 55.2, 56.2, 57.0, 57.7, 58.3, 58.8]: place(at, np.sin(2 * np.pi * 50 * tt(0.4)) * np.exp(-tt(0.4) * 12), db(-6))
place(IMPACT, norm(np.sin(2 * np.pi * (40 * tt(5) - 4 * tt(5) ** 2)) * np.exp(-tt(5) * 1.0)), db(-1))
place(IMPACT, rng.standard_normal(int(0.4 * SR)) * np.exp(-tt(0.4) * 30), db(-6), -0.2)
for k in range(24): place(IMPACT + 0.02 + rng.uniform(0, 0.6), np.sin(2 * np.pi * rng.uniform(3000, 7000) * tt(0.3)) * np.exp(-tt(0.3) * 18), db(-24), rng.uniform(-0.8, 0.8))
add(np.sin(2 * np.pi * 3400 * t) * np.exp(-np.clip(t - IMPACT, 0, None) * 0.7) * (t >= IMPACT) * ramp(IMPACT, TEND + 1, 0.3, 0.6), db(-36))
# end card
place(TEND, np.sin(2 * np.pi * 41 * tt(4.5)) * np.exp(-tt(4.5) * 2.0), db(-5))
x = tt(4.4); place(TEND + 0.1, (np.sin(2 * np.pi * 220 * x) + 0.5 * np.sin(2 * np.pi * 329.6 * x) + 0.35 * np.sin(2 * np.pi * 277.2 * x)) * np.exp(-x * 0.6) * np.clip(x / 0.4, 0, 1), db(-15))

out = np.stack([L, Rr], 1)
out *= np.clip((DUR - t) / 0.6, 0, 1)[:, None]
out = np.tanh(out * 1.2) / np.tanh(1.2)
out /= np.abs(out).max() / 0.92
wavfile.write(sys.argv[1], SR, (out * 32767).astype(np.int16))
print('ok')
