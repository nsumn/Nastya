import numpy as np, sys
from scipy.signal import butter, sosfilt
from scipy.io import wavfile
# "What if your IQ jumped to 500?" (64 s): the bonk on the PULL door (thud + boing), the IQ jump (rising whoosh + bright ding + sparkle chimes),
# fast cuts (a short swish on every shot change), the curve markers pinging past, the test + the teacher's mug, the cube clacking into place, the argument,
# the flood of "help me" texts, the chess knock + the king tipping, a sad "womp" for the joke nobody gets, the second bonk. No synthetic voices. ONE playful pluck theme.
SR = 44100; DUR = 69.5; N = int(SR * DUR); t = np.arange(N) / SR
MUSIC = '--no-music' not in sys.argv   # --no-music: sound effects only (no theme, pads or end chord)
rng = np.random.default_rng(500); L = np.zeros(N); Rr = np.zeros(N)
POP, CURVE, TEST, RUBIK, ARGUE, NOTIF, CHESS, RICH, TALK, DOOR, CTA, T_END = 3.0, 6.0, 14.0, 22.0, 30.0, 38.0, 41.6, 46.0, 51.0, 57.0, 63.0, 66.0
def filt(x, kind, f, order=2): return sosfilt(butter(order, f, kind, fs=SR, output='sos'), x)
def db(x): return 10 ** (x / 20)
def norm(x): return x / (np.abs(x).max() + 1e-9)
def tt(d): return np.arange(int(d * SR)) / SR
def place(at, sig, g=1.0, pan=0.0, buf=None):
    i0 = int(at * SR)
    if i0 >= N or i0 < 0: return
    s = sig[:N - i0]
    if buf is not None: buf[i0:i0 + len(s)] += s * g; return
    L[i0:i0 + len(s)] += s * g * np.sqrt((1 - pan) / 2); Rr[i0:i0 + len(s)] += s * g * np.sqrt((1 + pan) / 2)
def add(sig, g=1.0, pan=0.0):
    global L, Rr
    L += sig * g * np.sqrt((1 - pan) / 2); Rr += sig * g * np.sqrt((1 + pan) / 2)
def hz(n): return 440 * 2 ** ((n - 69) / 12)
BN = lambda lo, hi: norm(filt(rng.standard_normal(N), 'bandpass', [lo, hi]))
def bpn(x, lo, hi): return filt(x, 'bandpass', [lo, hi])
def sm(a, b): k = np.clip((t - a) / (b - a), 0, 1); return k * k * (3 - 2 * k)
def win(a, b, f=0.5): return sm(a, a + f) * (1 - sm(b - f, b))
def piano(n, d=2.5, b=1.0): x = tt(d); f = hz(n); return (np.sin(2 * np.pi * f * x) + 0.35 * b * np.sin(4 * np.pi * f * x) + 0.12 * b * np.sin(6 * np.pi * f * x)) * np.exp(-x * 1.8) * np.clip(x / 0.006, 0, 1)
def pad(chord, a, b, fa=1.0, fb=1.0, lp=1400): return filt(sum(np.sin(2 * np.pi * hz(n) * t) + 0.4 * np.sin(2 * np.pi * hz(n) * 1.004 * t) for n in chord), 'lowpass', lp) * win(a, b, max(fa, fb))
def breath(d, kind='out', voice=0.0, f0=130):
    x = tt(d); n = rng.standard_normal(len(x))
    if kind == 'in': s = 0.8 * norm(bpn(n, 1400, 3600)) + 0.6 * norm(bpn(n, 600, 1300)); env = np.clip(x / (0.75 * d), 0, 1) ** 1.6 * np.clip((d - x) / 0.06, 0, 1)
    else: s = 0.9 * norm(bpn(n, 450, 1100)) + 0.5 * norm(bpn(n, 1100, 2200)); env = np.clip(x / 0.08, 0, 1) * np.exp(-x * 2.2 / d) * np.clip((d - x) / 0.15, 0, 1)
    if voice: s = s + voice * norm(filt(np.sign(np.sin(2 * np.pi * f0 * (1 - 0.08 * x / d) * x)), 'bandpass', [180, 1200]))
    return norm(s * env)
def rustle(at, d, g, pan=0.0): x = tt(d); s = filt(rng.standard_normal(len(x)), 'bandpass', [700, 3200]) * np.sin(np.pi * x / d) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * rng.uniform(5, 9) * x))); place(at, s, g, pan)
def thud(at, g, f=110, d=0.3, pan=0.0): x = tt(d); place(at, filt(np.sin(2 * np.pi * f * x) + 0.6 * np.sin(2 * np.pi * 2.1 * f * x) + 0.5 * rng.standard_normal(len(x)), 'lowpass', 1400) * np.exp(-x * 14), g, pan)
def beat(at, g):
    for dt, a in [(0, 1.0), (0.22, 0.7)]:
        x = tt(0.25); s = (np.sin(2 * np.pi * 70 * x) + 0.8 * np.sin(2 * np.pi * 140 * x) + 0.5 * np.sin(2 * np.pi * 280 * x)) * np.exp(-x * 22); place(at + dt, s * a, g)
def voice(at, d, f0, g, pan=0.0, vowels=((700, 1200), (500, 1700)), rate=4.0):   # wordless murmur: buzz through moving formants
    x = tt(d); f = f0 * (1 + 0.12 * np.sin(2 * np.pi * rate * 0.5 * x + rng.uniform(0, 6))); src = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR))
    a = 0.5 + 0.5 * np.sin(2 * np.pi * rate * x + rng.uniform(0, 6)); s = sum(norm(bpn(src, lo * 0.8, lo * 1.2)) * (1 - a if k else a) + 0.6 * norm(bpn(src, hi * 0.85, hi * 1.15)) for k, (lo, hi) in enumerate(vowels))
    syl = np.clip(np.abs(np.sin(np.pi * rate * x)) * 1.6, 0, 1); place(at, norm(s) * syl * np.clip(x / 0.04, 0, 1) * np.clip((d - x) / 0.08, 0, 1), g, pan)

def crunch(at, g, pan=0.0):   # one bite: a short burst of crackles in the mids
    x = tt(0.14); place(at, filt(rng.standard_normal(len(x)), 'bandpass', [500, 2400]) * np.exp(-x * 28) * (0.5 + 0.5 * (rng.random(len(x)) < 0.15)), g, pan)
def chew(a, b, rate, g, pan=0.0):
    at = a
    while at < b: x = tt(0.12); place(at, filt(rng.standard_normal(len(x)), 'bandpass', [250, 900]) * np.sin(np.pi * x / 0.12), g, pan); at += 1 / rate + rng.uniform(-0.03, 0.03)
def step(at, g, pan=0.0): thud(at, g, 90, 0.18, pan); x = tt(0.08); place(at, filt(rng.standard_normal(len(x)), 'bandpass', [400, 1600]) * np.exp(-x * 40), g * 0.5, pan)
def plop(at, g, f=300, pan=0.0): x = tt(0.25); ff = f * (1 + 1.2 * np.exp(-x * 25)); place(at, np.sin(2 * np.pi * np.cumsum(ff) / SR) * np.exp(-x * 14), g, pan)
def sweep(at, d, f0, f1, g, pan=0.0): x = tt(d); f = f0 * (f1 / f0) ** (x / d); place(at, (np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.3 * np.sin(4 * np.pi * np.cumsum(f) / SR)) * np.sin(np.pi * x / d), g, pan)

CUTS = [1.9, 3.0, 4.4, CURVE, CURVE + 2.6, CURVE + 5.0, TEST, TEST + 2.4, TEST + 5.0, RUBIK, RUBIK + 2.6, RUBIK + 5.2, ARGUE, ARGUE + 3.2, ARGUE + 5.1, NOTIF, CHESS, CHESS + 2.2, RICH, RICH + 2.4, TALK, TALK + 3.0, DOOR, DOOR + 2.3, DOOR + 4.0]   # every shot change
def bloop(at, g, pan=-0.2):   # his message arrives: two soft sine notes
    for dt, f in [(0, 660), (0.07, 990)]: x = tt(0.22); place(at + dt, np.sin(2 * np.pi * f * x) * np.exp(-x * 18) * np.clip(x / 0.004, 0, 1), g, pan)
def swish(at, g, pan=0.2): x = tt(0.25); f = 500 * (1 + 3 * x / 0.25); place(at, filt(rng.standard_normal(len(x)), 'bandpass', [900, 3200]) * np.sin(np.pi * x / 0.25) * 0.6 + 0.4 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 9), g, pan)
def whoosh(at, g, d=0.45, pan=0.0): x = tt(d); env = np.sin(np.pi * x / d) ** 2; n = rng.standard_normal(len(x)); place(at - d / 2, (0.6 * filt(n, 'bandpass', [300, 1400]) + 0.4 * filt(n, 'bandpass', [1400, 3500])) * env, g, pan)
def taps(a, b, rate, g, pan=0.0):   # soft thumb taps on glass: low, muffled, irregular — not clicks
    at = a
    while at < b: x = tt(0.06); place(at, filt(rng.standard_normal(len(x)), 'bandpass', [350, 900]) * np.exp(-x * 70), g * rng.uniform(0.6, 1), pan); at += 1 / rate * rng.uniform(0.6, 1.5)
def buzz(at, g, d=0.55): x = tt(d); s = np.sign(np.sin(2 * np.pi * 170 * x)) * (0.5 + 0.5 * (np.sin(2 * np.pi * 7 * x) > -0.3)); place(at, filt(s, 'bandpass', [170, 1200]) * np.clip(x / 0.01, 0, 1) * np.clip((d - x) / 0.03, 0, 1), g, 0.15)
def chime(at, g, notes=(79, 83, 86), pan=0.0):
    for k, n in enumerate(notes): x = tt(1.2); f = hz(n); place(at + k * 0.09, (np.sin(2 * np.pi * f * x) + 0.3 * np.sin(2 * np.pi * 2.01 * f * x)) * np.exp(-x * 4), g, pan)
def pluck(n, d=2.4, b=0.996):   # Karplus-Strong string
    f = hz(n); p = int(SR / f); buf = rng.uniform(-1, 1, p); out = np.zeros(int(d * SR))
    for i in range(len(out)): out[i] = buf[i % p]; buf[i % p] = b * 0.5 * (buf[i % p] + buf[(i + 1) % p])
    return filt(out, 'lowpass', 3000) * np.clip(np.arange(len(out)) / SR / 0.003, 0, 1)
for c in CUTS: whoosh(c, db(-30), 0.35, pan=0.3 if CUTS.index(c) % 2 else -0.3)
def bonk(at, g): thud(at, g, 160, 0.25); x = tt(0.12); place(at, filt(rng.standard_normal(len(x)), 'bandpass', [800, 3000]) * np.exp(-x * 40), g * 0.6); sweep(at + 0.03, 0.5, 520, 180, g * 0.5)
def ding(at, g): chime(at, g, (88, 95, 100))
def popb(at, g, pan=0.0, f0=500): x = tt(0.12); f = f0 * (1 + 2 * np.exp(-x * 30)); place(at, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 20), g, pan)
def scribble(a, b, g): x = tt(b - a); place(a, filt(rng.standard_normal(len(x)), 'bandpass', [1500, 4000]) * (0.4 + 0.6 * np.abs(np.sin(2 * np.pi * 7 * x))) * np.sin(np.pi * x / (b - a)), g, 0.2)
def clack(at, g): x = tt(0.07); place(at, filt(rng.standard_normal(len(x)), 'bandpass', [400, 1200]) * np.exp(-x * 60), g, 0.1)
# --- SECOND 1: steps, BONK, the jump (rise, ding, sparkles, crackle), cars outside
for k in range(4): step(0.25 + k * 0.33, db(-25), -0.1)
bonk(1.95, db(-13))
x = tt(1.0); f = 200 * (1 + 6 * (x / 1.0) ** 2); place(POP - 0.9, (np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.5 + filt(rng.standard_normal(len(x)), 'bandpass', [1500, 5000]) * 0.5) * (x / 1.0) ** 2, db(-20))
ding(POP, db(-15)); [chime(POP + 0.1 + k * 0.11, db(-28), (100 + (k % 3) * 3,), 0.4 * (k % 2 * 2 - 1)) for k in range(6)]
for k in range(9): x = tt(0.05); place(POP + 0.05 + k * 0.09 + rng.uniform(0, 0.04), filt(rng.standard_normal(len(x)), 'bandpass', [1800, 6000]) * np.exp(-x * 60), db(-27), rng.uniform(-0.5, 0.5))
for a0 in [0.6, 4.0]: x = tt(1.6); place(a0, filt(rng.standard_normal(len(x)), 'bandpass', [300, 1500]) * np.sin(np.pi * x / 1.6) ** 2, db(-33), 0.6)
# --- MINUTE 1: the crowd, the markers ping past, the spotlight on you
for a in [CURVE + 2.9, CURVE + 3.3, CURVE + 3.7, CURVE + 4.5]: chime(a, db(-27), (84,), 0.2)
thud(CURVE + 5.0, db(-22), 220, 0.2); ding(CURVE + 5.1, db(-24))
# --- HOUR 1: the test in seconds, the teacher's mug
scribble(TEST + 0.3, TEST + 1.3, db(-24)); x = tt(0.18); place(TEST + 1.4, filt(rng.standard_normal(len(x)), 'bandpass', [900, 3500]) * np.sin(np.pi * x / 0.18) ** 2, db(-20)); chime(TEST + 1.7, db(-23), (84, 88, 91))
x = tt(0.3); place(TEST + 2.25, filt(rng.standard_normal(len(x)), 'bandpass', [1500, 5000]) * np.exp(-x * 14), db(-19), 0.3); thud(TEST + 2.25, db(-24), 300, 0.1, 0.3)
# --- DAY 1: the cube clacks into place, a ding, a toss
for k in range(6): clack(RUBIK + 3.0 + k * 0.3, db(-21))
ding(RUBIK + 4.7, db(-19)); whoosh(RUBIK + 5.6, db(-26), 0.5)
# --- WEEK 1: the argument (bubble pops), the win (chime), the stomps
popb(ARGUE + 0.4, db(-20), 0.2); popb(ARGUE + 3.3, db(-20), -0.2, 620); chime(ARGUE + 3.6, db(-24), (79, 86))
for k in range(6): step(ARGUE + 5.0 + k * 0.38, db(-21), -0.2)
# --- MONTH 1: the flood of texts (bloops, rising pitch), the chess knock, the king tips
for k in range(8): popb(NOTIF + 0.6 + k * 0.38, db(-21), 0.25 * np.sin(k), 520 + 40 * k)
x = tt(0.8); place(CHESS + 0.8, filt(rng.standard_normal(len(x)), 'bandpass', [600, 2000]) * np.sin(np.pi * x / 0.8) * 0.5, db(-28)); thud(CHESS + 1.6, db(-18), 340, 0.1)
clack(CHESS + 2.8, db(-18)); chime(CHESS + 2.9, db(-22), (72, 79, 84))
# --- MONTH 6: the chart climbs (a rising tone), cha-ching, money raining
x = tt(2.1); f = 300 * (1 + 2 * (x / 2.1) ** 2); place(RICH + 0.3, np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.5 * (x / 2.1), db(-24))
thud(RICH + 2.5, db(-20), 330, 0.08); chime(RICH + 2.55, db(-15), (86, 91, 98)); x = tt(2.3); place(RICH + 2.6, filt(rng.standard_normal(len(x)), 'bandpass', [1500, 4500]) * (0.5 + 0.5 * (rng.random(len(x)) < 0.05)) * np.sin(np.pi * x / 2.3), db(-30))
# --- YEAR 1: the joke — a bubble pop, then a sad "womp womp" in soft tones
popb(TALK + 0.4, db(-20)); x = tt(0.5)
for k, n in enumerate([62, 61, 60, 59]): x = tt(0.42 if k < 3 else 0.9); f = hz(n) * (1 - (0.03 * x if k == 3 else 0)); place(TALK + 2.5 + k * 0.45, (np.sin(2 * np.pi * f * x) + 0.35 * np.sin(4 * np.pi * f * x) + 0.15 * np.sin(6 * np.pi * f * x)) * np.clip(x / 0.03, 0, 1) * np.exp(-x * 2.2), db(-21))   # pure tones, no square wave (no buzz)
# --- EVERY DAY: confident steps, BONK, the formulas fall away
for k in range(5): step(DOOR + 0.6 + k * 0.3, db(-24), 0.1)
bonk(DOOR + 2.35, db(-12)); [chime(DOOR + 2.5 + k * 0.08, db(-28), (96 - k * 3,), 0.3 * (k % 2 * 2 - 1)) for k in range(6)]
# --- ONE theme: a playful pizzicato line (A minor, 108 bpm) — clumsy and low before the jump, with a cool bass after; hushed for "lonely"
mel = np.zeros(N); beat_s = 60 / 108; line = [69, 72, 76, 72, 74, 71, 67, 71, 69, 72, 76, 79, 77, 74, 72, 71]; cache = {}
k = 0; at = 0.2
while at < T_END - 0.2:
    n = line[k % len(line)] - (12 if at < POP else 0); g = db(-26) if at < POP else db(-30) if TALK + 2.4 <= at < DOOR else db(-24)
    if n not in cache: cache[n] = pluck(n, 0.9)
    place(at, cache[n], g, buf=mel)
    if at >= POP and k % 2 == 0: n2 = line[(k // 4 * 4) % len(line)] - 24; cache.setdefault(n2, pluck(n2, 1.2)); place(at, cache[n2], g * 0.8, buf=mel)
    at += beat_s * (1.0 if at >= POP else 1.3); k += 1
if MUSIC: add(mel, 1.0, -0.05)
if MUSIC: place(T_END + 0.2, sum(pluck(n, 4.0) * a for n, a in [(45, 1), (57, 0.8), (60, 0.6), (64, 0.6), (69, 0.5)]), db(-17))
out = np.stack([L, Rr], 1); out = sosfilt(butter(2, 60, 'highpass', fs=SR, output='sos'), out.T).T
out *= np.clip((DUR - t) / 0.8, 0, 1)[:, None] * np.clip(t / 0.05, 0, 1)[:, None]
out = np.tanh(out * 1.2) / np.tanh(1.2); out /= np.abs(out).max() / 0.92
wavfile.write(sys.argv[1], SR, (out * 32767).astype(np.int16)); print('ok')
