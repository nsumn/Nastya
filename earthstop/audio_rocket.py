import numpy as np, sys
from scipy.signal import butter, sosfilt
from scipy.io import wavfile

SR = 44100; DUR = 65.0; N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(91)
L = np.zeros(N); Rr = np.zeros(N)
CUBE, LAND, ROUL_END, OCEANS, SPACE_END, DIVE_END, BACK, UP, TILT, CRACK, FALL, ROUND, TEND = 3.0, 3.95, 5.0, 11.0, 17.0, 20.8, 26.0, 31.0, 36.0, 42.0, 49.0, 55.0, 60.5
ROUL = [0, 0.3, 0.55, 0.85, 1.12, 1.38, 1.62, 1.86, 2.1, 2.38, 2.68, CUBE, LAND]

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
# little 'boing' on the landing
x = tt(0.9); place(LAND + 0.05, np.sin(2 * np.pi * np.cumsum(260 + 160 * np.exp(-x * 3) * np.sin(2 * np.pi * 9 * x)) / SR) * np.exp(-x * 4), db(-16))


# ---------- music: pad + bell arpeggio through space and city, drops for the collapse
chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
pad = np.zeros(N); bell = np.zeros(N); CH = 4.0
for ci in range(15):
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
music = np.clip((t - LAND) / 0.3, 0, 1) * (1 - 0.9 * ramp(CRACK - 0.5, 99, 1.5, 1))
add(pad * music * (1 + 0.4 * ramp(BACK, UP, 0.3, 1.5)), db(-19))
add(norm(bell) * music, db(-25), 0.2)

# ---------- space: low drone, drain swoosh, dive
add(np.sin(2 * np.pi * 48 * t) * (ramp(0, DIVE_END, 0.1, 0.4) + ramp(CRACK, TEND, 0.3, 0.6)), db(-24))
add(norm(filt(white, 'bandpass', [150, 1200])) * ramp(OCEANS + 0.3, OCEANS + 3.5, 0.6, 1.0), db(-15))
whoosh(OCEANS + 3.0, 1.6, db(-14), -0.5, 0.5, 2000, 8000)
dive = np.clip((t - SPACE_END) / (DIVE_END - SPACE_END), 0, 1) ** 2.5 * (t < DIVE_END + 0.4)
add(norm(filt(white, 'bandpass', [200, 1800])) * dive * np.exp(-np.clip(t - DIVE_END, 0, None) * 6), db(-8))
whoosh(DIVE_END - 0.5, 1.0, db(-6), -0.3, 0.3, 300, 5000)

# ---------- city ambience
cityE = ramp(DIVE_END, CRACK, 0.4, 0.3)
traffic = norm(filt(brown, 'lowpass', 500) + filt(white, 'bandpass', [300, 1500]) * 0.1)
add(traffic * cityE, db(-16))
for k in range(22):
    at = rng.uniform(21, 41); f = rng.uniform(2800, 4800)
    place(at, np.sin(2 * np.pi * np.cumsum(f + 900 * np.sin(np.pi * tt(0.12) / 0.12)) / SR) * np.sin(np.pi * tt(0.12) / 0.12), db(-28), rng.uniform(-0.8, 0.8))
# turning around: deep swell for the mountain
place(BACK + 0.4, norm(np.sin(2 * np.pi * 36 * tt(5)) * np.clip(tt(5) / 0.5, 0, 1) * np.exp(-tt(5) * 0.7)), db(-7))
add(norm(filt(white, 'bandpass', [3000, 9000])) * ramp(BACK, BACK + 2.2, 1.8, 0.1) ** 2, db(-24))
# crane up: airy rise
add(norm(filt(white, 'bandpass', [600, 3000])) * ramp(UP, UP + 3.0, 2.5, 0.5), db(-22))
# tilt: groan + cars rolling
place(TILT + 0.5, np.sin(2 * np.pi * np.cumsum(70 - 25 * tt(2.2) / 2.2) / SR) * np.sin(np.pi * tt(2.2) / 2.2), db(-12))
roll = filt(white, 'bandpass', [120, 700]) * (0.6 + 0.4 * np.sin(2 * np.pi * 3 * t))
add(norm(roll) * ramp(TILT + 0.9, CRACK, 0.8, 0.3), db(-18))
for k in range(12): place(rng.uniform(TILT + 1.5, CRACK - 0.3), np.sin(2 * np.pi * rng.uniform(70, 140) * tt(0.3)) * np.exp(-tt(0.3) * 16), db(-17), rng.uniform(-0.8, 0.8))
# cracks: rumble building through the softening
add(norm(filt(brown, 'lowpass', 120)) * ramp(CRACK - 2.0, ROUND, 1.5, 1.0) * (0.5 + 0.5 * np.clip((t - CRACK) / 6, 0, 1)), db(-6))
for at in [43.5, 44.8, 46.0, 47.1, 48.0]: place(at, np.sin(2 * np.pi * 48 * tt(0.6)) * np.exp(-tt(0.6) * 8), db(-7))
for k in range(20): place(rng.uniform(43, 48.8), filt(rng.standard_normal(int(0.4 * SR)), 'bandpass', [150, 900]) * np.exp(-tt(0.4) * 12), db(-16), rng.uniform(-0.8, 0.8))
# "goes soft": a slow descending slide whistle over the droop, then booms as it slumps
x = tt(3.2); f = 1500 * np.exp(-x * 0.55) + 250
place(FALL + 0.2, np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.6 + 0.4 * np.sin(2 * np.pi * 5.5 * x)) * np.clip(x / 0.05, 0, 1) * np.clip((3.2 - x) / 0.4, 0, 1), db(-15))
for at in [50.6, 51.6, 52.4, 53.1, 53.7]: place(at, norm(np.sin(2 * np.pi * (45 * tt(1.5) - 5 * tt(1.5) ** 2)) * np.exp(-tt(1.5) * 2.5)), db(-6))
add(norm(filt(white, 'bandpass', [300, 3000])) * ramp(50.0, ROUND, 0.5, 1.0), db(-16))
# round again: calm chord
for k, n in enumerate([60, 64, 67, 72]): place(ROUND + 0.4 + 0.05 * k, (np.sin(2 * np.pi * hz(n) * tt(5)) + 0.3 * np.sin(2 * np.pi * hz(n) * 2 * tt(5))) * np.exp(-tt(5) * 0.6) * np.clip(tt(5) / 0.3, 0, 1), db(-19), (k - 1.5) * 0.3)
# end card
place(TEND, np.sin(2 * np.pi * 41 * tt(4.5)) * np.exp(-tt(4.5) * 2.0), db(-5))
x = tt(4.4); place(TEND + 0.1, (np.sin(2 * np.pi * 220 * x) + 0.5 * np.sin(2 * np.pi * 329.6 * x) + 0.35 * np.sin(2 * np.pi * 277.2 * x)) * np.exp(-x * 0.6) * np.clip(x / 0.4, 0, 1), db(-15))

out = np.stack([L, Rr], 1)
out *= np.clip((DUR - t) / 0.6, 0, 1)[:, None]
out = np.tanh(out * 1.2) / np.tanh(1.2)
out /= np.abs(out).max() / 0.92
wavfile.write(sys.argv[1], SR, (out * 32767).astype(np.int16))
print('ok')
