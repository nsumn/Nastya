import numpy as np, sys
from scipy.signal import butter, sosfilt
from scipy.io import wavfile
# "What if your IQ jumped to 500?" (64 s): the bonk on the PULL door (thud + boing), the IQ jump (rising whoosh + bright ding + sparkle chimes),
# the curve (a long dolly whoosh), the test (pencil scribble, paper slap), the library (page flips), the bulb (a rising glow tone, then a glass pop),
# small talk and the argument (soft speech-bubble pops — no synthetic voices), the second bonk. ONE theme: a playful pizzicato line, cooler after the jump.
SR = 44100; DUR = 64.5; N = int(SR * DUR); t = np.arange(N) / SR
MUSIC = '--no-music' not in sys.argv   # --no-music: sound effects only (no theme, pads or end chord)
rng = np.random.default_rng(500); L = np.zeros(N); Rr = np.zeros(N)
POP, CURVE, TEST, LIB, BULB, TALK, ARGUE, DOOR, CTA, T_END = 3.0, 4.0, 12.0, 20.0, 28.0, 36.0, 44.0, 52.0, 58.0, 61.0
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

CUTS = [CURVE, TEST, LIB, BULB, TALK, ARGUE, DOOR]
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
for c in CUTS: whoosh(c, db(-31), 0.8, pan=0.3 if CUTS.index(c) % 2 else -0.3)
def bonk(at, g): thud(at, g, 160, 0.25); x = tt(0.12); place(at, filt(rng.standard_normal(len(x)), 'bandpass', [800, 3000]) * np.exp(-x * 40), g * 0.6); sweep(at + 0.03, 0.5, 520, 180, g * 0.5)   # glass knock + a cartoon boing
def ding(at, g): chime(at, g, (88, 95, 100))
def popb(at, g, pan=0.0): x = tt(0.12); f = 500 * (1 + 2 * np.exp(-x * 30)); place(at, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 20), g, pan)
def scribble(a, b, g): x = tt(b - a); place(a, filt(rng.standard_normal(len(x)), 'bandpass', [1500, 4000]) * (0.4 + 0.6 * np.abs(np.sin(2 * np.pi * 7 * x))) * np.sin(np.pi * x / (b - a)), g, 0.2)
def flip(at, g, pan=0.0): x = tt(0.18); place(at, filt(rng.standard_normal(len(x)), 'bandpass', [900, 3500]) * np.sin(np.pi * x / 0.18) ** 2, g, pan)
# --- 0-4: steps up, BONK, the jump
for k in range(4): step(0.25 + k * 0.33, db(-25), -0.1)
bonk(1.95, db(-13))
x = tt(1.0); f = 200 * (1 + 6 * (x / 1.0) ** 2); place(POP - 0.9, (np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.5 + filt(rng.standard_normal(len(x)), 'bandpass', [1500, 5000]) * 0.5) * (x / 1.0) ** 2, db(-20))   # power-up rise
ding(POP, db(-15)); [chime(POP + 0.1 + k * 0.11, db(-28), (100 + (k % 3) * 3,), 0.4 * (k % 2 * 2 - 1)) for k in range(6)]
# --- the jump extras: lightning crackle, street cars passing
for k in range(9): x = tt(0.05); place(POP + 0.05 + k * 0.09 + rng.uniform(0, 0.04), filt(rng.standard_normal(len(x)), 'bandpass', [1800, 6000]) * np.exp(-x * 60), db(-27), rng.uniform(-0.5, 0.5))
for a0 in [0.6, 2.6]: x = tt(1.6); place(a0, filt(rng.standard_normal(len(x)), 'bandpass', [300, 1500]) * np.sin(np.pi * x / 1.6) ** 2, db(-33), 0.6)
# --- the curve: a long dolly whoosh to the far right, a soft spotlight "thunk"
x = tt(6.0); place(CURVE + 0.3, filt(rng.standard_normal(len(x)), 'bandpass', [400, 1800]) * np.sin(np.pi * x / 6.0) ** 2, db(-28), 0.3); thud(CURVE + 4.2, db(-24), 220, 0.2); chime(CURVE + 6.2, db(-26), (76,))
# --- the test: scribble 1 s, the paper up (slap), a chime for 100%
scribble(TEST + 0.3, TEST + 1.3, db(-24)); flip(TEST + 1.4, db(-20)); chime(TEST + 1.7, db(-23), (84, 88, 91)); popb(TEST + 2.0, db(-26), -0.3)
x = tt(0.3); place(TEST + 2.25, filt(rng.standard_normal(len(x)), 'bandpass', [1500, 5000]) * np.exp(-x * 14), db(-20), 0.3); thud(TEST + 2.25, db(-24), 300, 0.1, 0.3)   # the teacher's mug hits the floor
# --- the library: page flips as books fly in and out
for i in range(14): flip(LIB + i * 0.55 + 0.15, db(-25), 0.3 * np.sin(i)); flip(LIB + i * 0.55 + 0.42, db(-29), -0.3 * np.sin(i))
x = tt(5.6); place(LIB + 2.2, filt(rng.standard_normal(len(x)), 'bandpass', [500, 2500]) * np.sin(np.pi * x / 5.6) * (0.6 + 0.4 * np.sin(2 * np.pi * 2.4 * x)), db(-28))   # the book tornado
# --- the bulb: a rising glow tone, then a glass pop + tinkle
x = tt(4.8); f = 300 * (1 + 2.2 * x / 4.8); place(BULB + 0.5, np.sin(2 * np.pi * np.cumsum(f) / SR) * (x / 4.8) ** 1.5 * 0.6, db(-24))
x = tt(0.25); place(BULB + 5.4, filt(rng.standard_normal(len(x)), 'bandpass', [1200, 5000]) * np.exp(-x * 18), db(-14)); [chime(BULB + 5.5 + k * 0.07, db(-30), (96 + k % 4,), 0.3) for k in range(6)]
# --- small talk + the argument: speech-bubble pops
for a in [TALK + 0.6, TALK + 2.6, ARGUE + 0.5, ARGUE + 3.4]: popb(a, db(-20), 0.2)
chime(ARGUE + 3.6, db(-24), (79, 86)); place(TALK + 5.0, breath(1.2, 'in'), db(-24))
sweep(BULB + 3.0, 2.2, 420, 160, db(-30))   # the lights draining
for k in range(6): step(ARGUE + 5.0 + k * 0.38, db(-21), -0.2)   # the sibling stomps off
# --- the second door: confident steps, BONK
for k in range(5): step(DOOR + 0.6 + k * 0.3, db(-24), 0.1)
bonk(DOOR + 2.35, db(-12))
# --- ONE theme: a playful pizzicato line (A minor, 104 bpm) — before the jump a clumsy version, after it the same line with a cool bass
mel = np.zeros(N); beat_s = 60 / 104; line = [69, 72, 76, 72, 74, 71, 67, 71, 69, 72, 76, 79, 77, 74, 72, 71]; cache = {}
k = 0; at = 0.2
while at < T_END - 0.2:
    n = line[k % len(line)] - (12 if at < POP else 0); g = db(-26) if at < POP else db(-24)
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
