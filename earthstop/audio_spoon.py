import numpy as np, sys
from scipy.signal import butter, sosfilt
from scipy.io import wavfile

# "What if Earth was shaped like a spoon?" — wooden roulette knocks (no high clicks), fork fake-out "boing", spoon "ting",
# playful marimba bed, airy space pad, astronaut breathing in the suit, beach (waves, crowd, stream), collapse rumble, final chime.
# Mix kept in the mids for phone speakers; high-passed at 70 Hz.
SR = 44100; DUR = 65.0; N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(23)
L = np.zeros(N); Rr = np.zeros(N)
FORK, LAND, ROUL_END, T_SIZE, T_SEA, T_HANDLE, T_TILT, T_BEACH, T_SUIT, T_COLL, T_BALL, T_END = 3.0, 3.95, 5.0, 5.0, 11.0, 17.0, 24.0, 31.0, 40.0, 48.0, 56.0, 61.0
ROUL = [0, 0.3, 0.55, 0.85, 1.15, 1.45, 1.8, 2.1, 2.4, 2.7, FORK, LAND]

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
def marimba(n, d=0.6): x = tt(d); f = hz(n); return (np.sin(2 * np.pi * f * x) + 0.35 * np.sin(2 * np.pi * f * 4 * x) * np.exp(-x * 30)) * np.exp(-x * 7) * np.clip(x / 0.002, 0, 1)
def knock(f=820): x = tt(0.09); return (np.sin(2 * np.pi * f * x) + 0.5 * np.sin(2 * np.pi * f * 1.6 * x)) * np.exp(-x * 60)
def bell(n, d=3.0): x = tt(d); f = hz(n); return sum(a * np.sin(2 * np.pi * f * r * x) * np.exp(-x * dd) for a, r, dd in [(1, 1, 0.9), (0.55, 2.0, 1.4), (0.35, 2.76, 2.0), (0.25, 5.4, 3.0)]) * np.clip(x / 0.003, 0, 1)
def boing(f0=260, d=0.6): x = tt(d); f = f0 * (1 + 0.5 * np.exp(-x * 9) * np.sin(2 * np.pi * 13 * x)); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 5)
def whoosh(at, dur, g, p0, p1, lo=300, hi=4000):
    x = tt(dur); s = filt(rng.standard_normal(len(x)), 'bandpass', [lo, hi]); s = s / (np.abs(s).max() + 1e-9) * np.sin(np.pi * x / dur) ** 2
    i0 = int(at * SR); s = s[:max(0, N - i0)]; pan = np.linspace(p0, p1, len(s))
    L[i0:i0 + len(s)] += s * g * np.sqrt((1 - pan) / 2); Rr[i0:i0 + len(s)] += s * g * np.sqrt((1 + pan) / 2)
def pad(notes, a, b, fa=1.0, fb=1.0, bright=1600):
    x = np.zeros(N)
    for n in notes:
        for det in (-0.06, 0.0, 0.06): x += np.sin(2 * np.pi * hz(n + det) * t + rng.uniform(0, 6)) + 0.3 * np.sin(2 * np.pi * hz(n + det) * 2 * t)
    return norm(filt(x, 'lowpass', bright)) * ramp(a, b, fa, fb)

# ---------- roulette: wooden knocks rising in pitch with each shape (no high clicks), fork "boing", spoon "ting"
for i, a in enumerate(ROUL[:-2]): place(a, knock(560 + 40 * i), db(-14), np.sin(i) * 0.3); place(a, marimba(72 + [0, 2, 4, 7, 9][i % 5], 0.35), db(-20))
whoosh(1.1, 2.4, db(-15), -0.8, 0.8, 300, 3500); place(2.3, boing(300, 0.45), db(-22))   # the meme rocket flying past
place(FORK, knock(500), db(-12)); place(FORK + 0.05, boing(220, 0.9), db(-14))
for k in range(5): place(FORK + 0.15 + k * 0.17, marimba(67 - k, 0.3), db(-24))
place(LAND, bell(88, 2.5), db(-13)); place(LAND, bell(76, 2.5), db(-17)); whoosh(LAND - 0.15, 0.5, db(-12), 0.6, -0.6, 400, 6000)
# ---------- playful bed (C major marimba ostinato) in space shots and the beach; pad under everything
BPM = 108; B = 60 / BPM
SEQ = [72, 76, 79, 76, 74, 77, 81, 77, 72, 76, 79, 84, 79, 76, 74, 71]
def ostinato(a, b, g):
    for i in range(int((b - a) / (B / 2))): place(a + i * B / 2, marimba(SEQ[i % len(SEQ)], 0.45), g, 0.3 * np.sin(i * 0.7))
ostinato(ROUL_END, T_TILT - 0.3, db(-22)); ostinato(T_BEACH, T_SUIT - 0.3, db(-23))
add(pad([48, 55, 60, 64], ROUL_END - 0.2, T_TILT, 1.0, 0.5), db(-24))
add(pad([45, 52, 57, 60], T_COLL, T_BALL + 0.5, 1.0, 0.3, 1200), db(-21))
add(pad([48, 55, 60, 67], T_BALL, DUR, 0.5, 1.0), db(-21))
for at, n in [(T_SIZE + 0.3, 60), (T_SEA, 64), (T_HANDLE, 57)]: place(at, bell(n + 12, 3), db(-21))
whoosh(T_SEA + 0.2, 1.6, db(-17), -0.4, 0.4); whoosh(T_HANDLE - 0.2, 1.4, db(-17), 0.4, -0.4)
# ---------- in the suit: breathing + soft radio beeps (tilt walk and the handle)
def breath(d=2.4):
    x = tt(d); env = np.sin(np.pi * np.clip(x / (d * 0.45), 0, 1)) ** 2 * (x < d * 0.45) + 0.7 * np.sin(np.pi * np.clip((x - d * 0.5) / (d * 0.45), 0, 1)) ** 2 * (x >= d * 0.5)
    return filt(rng.standard_normal(len(x)), 'bandpass', [300, 1800]) * env
for a, b in [(T_TILT, T_BEACH), (T_SUIT, T_COLL)]:
    at = a + 0.3
    while at < b - 2.0: place(at, breath(2.4 if a == T_TILT else 2.9), db(-21) * (1.3 if a == T_TILT else 1.0)); at += 2.6 if a == T_TILT else 3.1
    place(a + 0.15, np.sin(2 * np.pi * 1200 * tt(0.12)) * np.exp(-tt(0.12) * 10), db(-26)); place(a + 0.32, np.sin(2 * np.pi * 900 * tt(0.12)) * np.exp(-tt(0.12) * 10), db(-26))
add(pad([50, 57, 62], T_TILT, T_BEACH, 0.6, 0.4, 900), db(-26)); add(pad([47, 54, 59], T_SUIT, T_COLL, 0.6, 0.4, 900), db(-26))
for k, at in enumerate([T_SUIT + 1.6 + i * (2 * np.sqrt(2 * 9.81 * 0.5) / (0.24 * 9.81) + 0.9) for i in range(2)]): place(at, boing(180, 0.5), db(-23)); place(at + 2.66, knock(300), db(-18))
# ---------- beach: waves, crowd, the stream
waves = filt(rng.standard_normal(N), 'bandpass', [250, 2500]) * (0.35 + 0.65 * np.clip(np.sin(2 * np.pi * t / 4.3), 0, 1) ** 2)
add(norm(waves) * ramp(T_BEACH, T_SUIT, 0.3, 0.3), db(-19), -0.3)
crowd = filt(rng.standard_normal(N), 'bandpass', [350, 2400]) * (0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 1.1 * t) * np.sin(2 * np.pi * 0.43 * t + 1)))
add(norm(crowd) * ramp(T_BEACH, T_SUIT, 0.3, 0.3), db(-21), 0.3)
trickle = filt(rng.standard_normal(N), 'bandpass', [1500, 5000]) * (rng.random(N) < 0.02)
add(norm(filt(trickle, 'lowpass', 6000)) * ramp(T_BEACH, T_SUIT, 0.3, 0.3), db(-31), 0.5)
# ---------- collapse: mid-range groaning rumble, cracks, then the ball
groan = filt(rng.standard_normal(N), 'bandpass', [120, 700]) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.7 * t))
add(norm(groan) * ramp(T_COLL + 0.6, T_BALL + 0.3, 1.5, 0.3) * np.clip((t - T_COLL) / 6, 0, 1), db(-12))
for k in range(26): x = tt(0.25); place(rng.uniform(T_COLL + 1.5, T_BALL - 0.2), filt(rng.standard_normal(len(x)), 'bandpass', [400, 3000]) * np.exp(-x * 18), db(-20), rng.uniform(-0.7, 0.7))
place(T_BALL, bell(72, 4), db(-12)); place(T_BALL, bell(60, 4), db(-15)); whoosh(T_BALL - 0.3, 1.0, db(-12), -0.5, 0.5, 300, 5000)
# ---------- end card
for n in [60, 64, 67, 72]: place(T_END + 0.15, marimba(n, 1.5), db(-17))
place(T_END + 0.15, bell(84, 3.5), db(-18))

out = np.stack([L, Rr], 1)
out = filt(out.T, 'highpass', 70).T
out *= np.clip((DUR - t) / 0.8, 0, 1)[:, None]
out = np.tanh(out * 1.2) / np.tanh(1.2)
out /= np.abs(out).max() / 0.92
wavfile.write(sys.argv[1], SR, (out * 32767).astype(np.int16))
print('ok')
