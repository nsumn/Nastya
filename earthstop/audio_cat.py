import numpy as np, sys
from scipy.signal import butter, sosfilt
from scipy.io import wavfile

# "What if you were a cat for one day?" — quiet house, ultrasonic mouse squeaks (pitched down so we can hear them), chase groove,
# pounce, colour chimes, cat flap, garden birds, night hush, sniffing, purring nap.  No steady high ticks.
SR = 44100; DUR = 65.0; N = int(SR * DUR); t = np.arange(N) / SR
rng = np.random.default_rng(4242); L = np.zeros(N); Rr = np.zeros(N)
HEAR, CHASE, POUNCE, COLOR, BLUR, OUT, NIGHT, TASTE, SLEEP, TEND = 3.0, 8.0, 14.0, 17.0, 28.0, 32.0, 41.0, 47.0, 52.0, 59.0
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
def whoosh(at, dur, g, p0=0, p1=0, lo=300, hi=3500):
    x = tt(dur); s = noise(dur, lo, hi) * np.sin(np.pi * x / dur) ** 2; i0 = int(at * SR); s = s[:max(0, N - i0)]; pan = np.linspace(p0, p1, len(s))
    L[i0:i0 + len(s)] += s * g * np.sqrt((1 - pan) / 2); Rr[i0:i0 + len(s)] += s * g * np.sqrt((1 + pan) / 2)
def chirp(f0, f1, d):
    x = tt(d); f = f0 + (f1 - f0) * x / d; return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * x / d) ** 1.5
def pad(chord, a, b, fa=1.0, fb=1.0, lp=1600):
    return filt(sum(np.sin(2 * np.pi * hz(n) * t) + 0.4 * np.sin(2 * np.pi * hz(n) * 1.003 * t) for n in chord), 'lowpass', lp) * ramp(a, b, fa, fb)

# room tone (house), outside birds very faint through the window
house = ramp(-1, OUT, 0.01, 0.3) + ramp(TASTE, DUR, 0.3, 1)
add(norm(filt(rng.standard_normal(N), 'bandpass', [120, 700])) * house, db(-34))
# 0-3: a soft "ear twitch" swish, then hush
whoosh(1.6, 0.5, db(-24), -0.4, 0.4, 900, 5000)
# 3-8: the squeaks (pitched down from ultrasound) + sonar-like shimmer per ring
for at in [3.4, 4.6, 5.3, 6.5, 7.3]:
    sq = sum(chirp(3400 + k * 300, 4200 + k * 200, 0.07) * (0.8 ** k) for k in range(2)); place(at, sq, db(-16), 0.55)
    place(at + 0.05, sq * 0.5, db(-22), 0.65)
for k in range(5):
    x = tt(1.0); place(HEAR + 0.2 + k * 1.1, (np.sin(2 * np.pi * 880 * x) + 0.5 * np.sin(2 * np.pi * 1320 * x)) * np.exp(-x * 4) * np.clip(x / 0.02, 0, 1), db(-28), 0.5)
add(pad([57, 64, 69], HEAR, CHASE, 0.8, 0.2), db(-30))
# 8-14: CHASE — playful groove (bass + pizzicato), paw patter on wood, the mouse squeals
beat = 60 / 150
def pluck(n, d=0.25): x = tt(d); f = hz(n); return (np.sin(2 * np.pi * f * x) + 0.4 * np.sin(4 * np.pi * f * x)) * np.exp(-x * 14)
def bassN(n, d): x = tt(d); f = hz(n); return (np.sin(2 * np.pi * f * x) + 0.5 * np.sin(4 * np.pi * f * x) + 0.25 * np.sin(6 * np.pi * f * x)) * np.exp(-x * 4) * np.clip(x / 0.01, 0, 1)
riff = [57, 60, 62, 64, 62, 60, 64, 67]
k = 0; at = CHASE
while at < POUNCE:
    place(at, bassN(33 if k % 4 < 2 else 31, beat * 0.9), db(-12)); place(at, pluck(riff[k % 8] + 12), db(-18), 0.2 if k % 2 else -0.2)
    if k % 2 == 1: place(at, noise(0.12, 1500, 6000) * np.exp(-tt(0.12) * 40), db(-26))
    at += beat; k += 1
for k in range(int((POUNCE - CHASE) * 7)):
    at = CHASE + 0.6 + k / 7 + rng.uniform(-0.02, 0.02); x = tt(0.07); place(at, np.sin(2 * np.pi * 180 * x) * np.exp(-x * 60) + 0.3 * noise(0.07, 300, 1500) * np.exp(-x * 80), db(-19), rng.uniform(-0.2, 0.2))
for at in [9.2, 11.0, 12.6]: place(at, np.concatenate([chirp(3800, 5200, 0.09), chirp(5200, 4000, 0.08)]), db(-19), -0.3)
# 14-17: pounce whoosh, a thud on the floor, comic "nope" (two descending notes)
whoosh(POUNCE - 0.1, 0.8, db(-12), 0, 0, 300, 4000)
x = tt(0.4); place(POUNCE + 0.75, np.sin(2 * np.pi * 90 * x) * np.exp(-x * 14) + 0.5 * noise(0.4, 200, 1200) * np.exp(-x * 20), db(-9))
for i, n in enumerate([67, 61]): x = tt(0.35); place(POUNCE + 1.0 + i * 0.28, (np.sin(2 * np.pi * hz(n) * x) + 0.3 * np.sin(4 * np.pi * hz(n) * x)) * np.exp(-x * 5), db(-17))
# 17-28: colours — calm curious music + a soft chime on each caption
add(pad([60, 64, 67, 71], COLOR, BLUR + 0.5, 0.8, 0.8), db(-27))
for at, n in [(17.4, 76), (20.1, 74), (22.9, 79), (25.4, 72)]:
    x = tt(2.0); place(at, (np.sin(2 * np.pi * hz(n) * x) + 0.25 * np.sin(2 * np.pi * hz(n) * 2.01 * x)) * np.exp(-x * 2.5) * np.clip(x / 0.004, 0, 1), db(-19), 0.2)
# 28-32: trot to the door, flap creak + swing
for k in range(int((OUT - BLUR) * 4.5)):
    at = BLUR + 0.3 + k / 4.5; x = tt(0.06); place(at, np.sin(2 * np.pi * 160 * x) * np.exp(-x * 70), db(-24))
x = tt(0.5); place(OUT - 0.5, np.sin(2 * np.pi * np.cumsum(420 + 140 * np.sin(2 * np.pi * 7 * x)) / SR) * np.exp(-x * 5) * 0.5, db(-22))
whoosh(OUT - 0.25, 0.7, db(-15), 0, 0, 500, 6000)
x = tt(0.25); place(OUT + 0.25, np.sin(2 * np.pi * 220 * x) * np.exp(-x * 20), db(-20))
# 32-41: garden — breeze, birds singing, a flock flutters off
gar = ramp(OUT, NIGHT, 0.4, 0.4)
add(norm(filt(rng.standard_normal(N), 'bandpass', [200, 1400])) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.2 * t) ** 2) * gar, db(-25))
pt = OUT + 0.3
while pt < NIGHT - 0.5:
    f0 = rng.uniform(2200, 3400); s = sum(chirp(f0 * rng.uniform(0.9, 1.1), f0 * rng.uniform(0.8, 1.3), rng.uniform(0.07, 0.15)) for _ in range(1))
    for j in range(rng.integers(2, 5)): place(pt + j * rng.uniform(0.12, 0.2), chirp(f0 * rng.uniform(0.85, 1.15), f0 * rng.uniform(0.8, 1.25), rng.uniform(0.07, 0.14)), db(-24), rng.uniform(-0.8, 0.8))
    pt += rng.uniform(0.8, 1.8)
for k in range(10): x = tt(0.5); place(OUT + 3.0 + k * 0.05, noise(0.5, 300, 2500) * np.abs(np.sin(2 * np.pi * 18 * x)) * np.exp(-x * 4), db(-21), rng.uniform(-0.6, 0.6))
add(pad([62, 66, 69, 74], OUT + 0.3, NIGHT, 1.0, 0.6), db(-29))
# 41-47: night — low hush, a distant car, a soft "wow" pad
nt = ramp(NIGHT, TASTE, 0.3, 0.3)
add(norm(filt(rng.standard_normal(N), 'bandpass', [80, 500])) * nt, db(-27)); whoosh(NIGHT + 2.2, 3.0, db(-26), -0.7, 0.7, 150, 900)
add(pad([50, 57, 62, 65], NIGHT, TASTE, 0.8, 0.5), db(-27))
# 47-52: sniff sniff, a confused "hm"
for at in [47.6, 47.9, 48.3, 49.2, 49.45]: x = tt(0.16); place(at, noise(0.16, 1500, 7000) * np.sin(np.pi * x / 0.16) ** 2, db(-17), 0.1)
for i, n in enumerate([64, 62]): x = tt(0.4); place(50.0 + i * 0.3, np.sin(2 * np.pi * hz(n) * x) * np.exp(-x * 4), db(-20))
# 52-59: purring nap + lullaby pad
purr = norm(filt(rng.standard_normal(N), 'bandpass', [60, 900]) * (0.55 + 0.45 * np.sin(2 * np.pi * 26 * t)) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.42 * t) ** 2))
add(purr * ramp(SLEEP + 0.4, TEND + 0.5, 1.0, 1.0), db(-17))
add(pad([53, 57, 60, 64], SLEEP, TEND + 0.8, 1.5, 1.0, 1200), db(-26))
x = tt(5); place(TEND + 0.2, sum(np.sin(2 * np.pi * hz(n) * x) * a for n, a in [(48, 1), (55, 0.6), (64, 0.5), (71, 0.3)]) * np.exp(-x * 0.55) * np.clip(x / 0.4, 0, 1), db(-15))
out = np.stack([L, Rr], 1); out = sosfilt(butter(2, 60, 'highpass', fs=SR, output='sos'), out.T).T
out *= np.clip((DUR - t) / 0.8, 0, 1)[:, None] * np.clip(t / 0.05, 0, 1)[:, None]
out = np.tanh(out * 1.2) / np.tanh(1.2); out /= np.abs(out).max() / 0.92
wavfile.write(sys.argv[1], SR, (out * 32767).astype(np.int16)); print('ok')
