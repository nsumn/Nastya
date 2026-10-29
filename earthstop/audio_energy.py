import numpy as np, sys
from scipy.signal import butter, sosfilt
from scipy.io import wavfile
# "What happens if you drink an energy drink every day?" (67.5 s): the can cracks (click + hiss), gulps, the jolt, a heartbeat that speeds up, a rising note per
# teaspoon of sugar, the crash (power-down), the second can, 2 AM, acid drips, the headache throb, sugar bags thumping down + cha-ching, a distant siren,
# lights off, morning birds, the stretch. No synthetic voices, no buzz, no constant beds. ONE pluck theme.
SR = 44100; DUR = 67.5; N = int(SR * DUR); t = np.arange(N) / SR
MUSIC = '--no-music' not in sys.argv   # --no-music: sound effects only (no theme, pads or end chord)
rng = np.random.default_rng(160); L = np.zeros(N); Rr = np.zeros(N)
CRACK, MIN30, HOUR1, HOUR4, NIGHT, WEEK, MONTH, YEAR, ER, SLEEP, CTA, T_END = 1.8, 4.0, 9.0, 15.0, 21.0, 28.0, 34.0, 40.0, 47.0, 54.0, 61.0, 64.0
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
def rustle(at, d, g, pan=0.0): x = tt(d); s = filt(rng.standard_normal(len(x)), 'bandpass', [700, 3200]) * np.sin(np.pi * x / d) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * rng.uniform(5, 9) * x))); place(at, s, g, pan)
def thud(at, g, f=110, d=0.3, pan=0.0): x = tt(d); place(at, filt(np.sin(2 * np.pi * f * x) + 0.6 * np.sin(2 * np.pi * 2.1 * f * x) + 0.5 * rng.standard_normal(len(x)), 'lowpass', 1400) * np.exp(-x * 14), g, pan)
def beat(at, g):
    for dt, a in [(0, 1.0), (0.22, 0.7)]:
        x = tt(0.25); s = (np.sin(2 * np.pi * 70 * x) + 0.8 * np.sin(2 * np.pi * 140 * x) + 0.5 * np.sin(2 * np.pi * 280 * x)) * np.exp(-x * 22); place(at + dt, s * a, g)
def crunch(at, g, pan=0.0):   # one bite: a short burst of crackles in the mids
    x = tt(0.14); place(at, filt(rng.standard_normal(len(x)), 'bandpass', [500, 2400]) * np.exp(-x * 28) * (0.5 + 0.5 * (rng.random(len(x)) < 0.15)), g, pan)
def chew(a, b, rate, g, pan=0.0):
    at = a
    while at < b: x = tt(0.12); place(at, filt(rng.standard_normal(len(x)), 'bandpass', [250, 900]) * np.sin(np.pi * x / 0.12), g, pan); at += 1 / rate + rng.uniform(-0.03, 0.03)
def step(at, g, pan=0.0): thud(at, g, 90, 0.18, pan); x = tt(0.08); place(at, filt(rng.standard_normal(len(x)), 'bandpass', [400, 1600]) * np.exp(-x * 40), g * 0.5, pan)
def plop(at, g, f=300, pan=0.0): x = tt(0.25); ff = f * (1 + 1.2 * np.exp(-x * 25)); place(at, np.sin(2 * np.pi * np.cumsum(ff) / SR) * np.exp(-x * 14), g, pan)
def sweep(at, d, f0, f1, g, pan=0.0): x = tt(d); f = f0 * (f1 / f0) ** (x / d); place(at, (np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.3 * np.sin(4 * np.pi * np.cumsum(f) / SR)) * np.sin(np.pi * x / d), g, pan)

def bloop(at, g, pan=-0.2):   # his message arrives: two soft sine notes
    for dt, f in [(0, 660), (0.07, 990)]: x = tt(0.22); place(at + dt, np.sin(2 * np.pi * f * x) * np.exp(-x * 18) * np.clip(x / 0.004, 0, 1), g, pan)
def swish(at, g, pan=0.2): x = tt(0.25); f = 500 * (1 + 3 * x / 0.25); place(at, filt(rng.standard_normal(len(x)), 'bandpass', [900, 3200]) * np.sin(np.pi * x / 0.25) * 0.6 + 0.4 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 9), g, pan)
def whoosh(at, g, d=0.45, pan=0.0): x = tt(d); env = np.sin(np.pi * x / d) ** 2; n = rng.standard_normal(len(x)); place(at - d / 2, (0.6 * filt(n, 'bandpass', [300, 1400]) + 0.4 * filt(n, 'bandpass', [1400, 3500])) * env, g, pan)
def taps(a, b, rate, g, pan=0.0):   # soft thumb taps on glass: low, muffled, irregular — not clicks
    at = a
    while at < b: x = tt(0.06); place(at, filt(rng.standard_normal(len(x)), 'bandpass', [350, 900]) * np.exp(-x * 70), g * rng.uniform(0.6, 1), pan); at += 1 / rate * rng.uniform(0.6, 1.5)
def chime(at, g, notes=(79, 83, 86), pan=0.0):
    for k, n in enumerate(notes): x = tt(1.2); f = hz(n); place(at + k * 0.09, (np.sin(2 * np.pi * f * x) + 0.3 * np.sin(2 * np.pi * 2.01 * f * x)) * np.exp(-x * 4), g, pan)
def pluck(n, d=2.4, b=0.996):   # Karplus-Strong string
    f = hz(n); p = int(SR / f); buf = rng.uniform(-1, 1, p); out = np.zeros(int(d * SR))
    for i in range(len(out)): out[i] = buf[i % p]; buf[i % p] = b * 0.5 * (buf[i % p] + buf[(i + 1) % p])
    return filt(out, 'lowpass', 3000) * np.clip(np.arange(len(out)) / SR / 0.003, 0, 1)
def bonk(at, g): thud(at, g, 160, 0.25); x = tt(0.12); place(at, filt(rng.standard_normal(len(x)), 'bandpass', [800, 3000]) * np.exp(-x * 40), g * 0.6); sweep(at + 0.03, 0.5, 520, 180, g * 0.5)
def ding(at, g): chime(at, g, (88, 95, 100))
def popb(at, g, pan=0.0, f0=500): x = tt(0.12); f = f0 * (1 + 2 * np.exp(-x * 30)); place(at, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 20), g, pan)
def scribble(a, b, g): x = tt(b - a); place(a, filt(rng.standard_normal(len(x)), 'bandpass', [1500, 4000]) * (0.4 + 0.6 * np.abs(np.sin(2 * np.pi * 7 * x))) * np.sin(np.pi * x / (b - a)), g, 0.2)
def clack(at, g): x = tt(0.07); place(at, filt(rng.standard_normal(len(x)), 'bandpass', [400, 1200]) * np.exp(-x * 60), g, 0.1)

CUTS = [1.6, 2.7, MIN30, MIN30 + 2.6, HOUR1, HOUR1 + 2.4, HOUR1 + 4.0, HOUR4, HOUR4 + 2.6, HOUR4 + 4.0, NIGHT, NIGHT + 2.5, NIGHT + 4.2, WEEK, WEEK + 2.8, MONTH, MONTH + 2.8,
        YEAR, YEAR + 2.6, YEAR + 4.0, ER, ER + 3.4, SLEEP, SLEEP + 3.2, SLEEP + 4.6, CTA]   # every shot change (parts_energy/e_main.js SHOTS)
for k, c in enumerate(CUTS): whoosh(c, db(-31), 0.35, pan=0.3 if k % 2 else -0.3)
def crack(at, g):   # tab click + the pssht of the gas
    x = tt(0.05); place(at, filt(rng.standard_normal(len(x)), 'bandpass', [900, 3500]) * np.exp(-x * 90), g)
    x = tt(0.7); place(at + 0.03, filt(rng.standard_normal(len(x)), 'bandpass', [2200, 7000]) * np.exp(-x * 5.5) * np.clip(x / 0.01, 0, 1), g * 0.8)
def fizz(a, d, g):   # tiny bubbles popping: sparse soft crackle, fading
    x = tt(d); place(a, filt(rng.standard_normal(len(x)) * (rng.random(len(x)) < 0.012), 'bandpass', [2500, 7000]) * np.exp(-x * 2.5 / d), g, 0.15)
def gulp(at, g): x = tt(0.22); f = 320 * (1 - 0.5 * x / 0.22); place(at, filt(np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.3 * rng.standard_normal(len(x)), 'lowpass', 1200) * np.sin(np.pi * x / 0.22) ** 1.5, g)
def heart(at, g):   # lub-dub with enough mids to be heard on a phone
    for dt, a in [(0, 1.0), (0.2, 0.7)]: x = tt(0.22); s = (np.sin(2 * np.pi * 75 * x) + 0.9 * np.sin(2 * np.pi * 150 * x) + 0.6 * np.sin(2 * np.pi * 300 * x)) * np.exp(-x * 20); place(at + dt, s * a, g)
def drip(at, g, pan=0.0): plop(at, g, rng.uniform(500, 800), pan)
def sizzle(a, d, g): x = tt(d); place(a, filt(rng.standard_normal(len(x)), 'bandpass', [3000, 7000]) * (0.4 + 0.6 * (rng.random(len(x)) < 0.05)) * np.sin(np.pi * x / d), g, -0.1)
def chirp(at, g, pan): x = tt(0.09); f = 3200 + 1600 * np.sin(np.pi * x / 0.09); place(at, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * x / 0.09), g, pan)
# --- 12 PM: the crack, fizz, three gulps, the jolt
crack(CRACK, db(-14)); fizz(CRACK + 0.05, 1.3, db(-30))
for k in range(3): gulp(CRACK + 0.5 + k * 0.38, db(-19))
x = tt(0.9); f = 250 * (1 + 5 * (x / 0.9) ** 2); place(CRACK + 0.85, (np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.5 + filt(rng.standard_normal(len(x)), 'bandpass', [1500, 5000]) * 0.5) * (x / 0.9) ** 2, db(-21))
ding(CRACK + 1.72, db(-16))
# --- 12:30: the heart speeds up (72 -> ~100 bpm), under the X-ray
at = MIN30 + 0.2
while at < HOUR1 - 0.2: heart(at, db(-17)); at += 60 / (72 + 28 * np.clip((at - MIN30 - 0.6) / 2.4, 0, 1))
# --- 1 PM: one rising note per teaspoon (a melody, not a ticking counter), the sugar pouring, sparkles in the blood
scale = [60, 62, 64, 67, 69, 72, 74, 76, 79, 81, 84, 86, 88]
for k in range(13): place(HOUR1 + 0.3 + k * 0.18, pluck(scale[k], 0.6) , db(-24), 0.3 * np.sin(k))
x = tt(0.7); place(HOUR1 + 3.0, filt(rng.standard_normal(len(x)), 'bandpass', [1200, 5000]) * np.sin(np.pi * x / 0.7), db(-26), 0.2)
[chime(HOUR1 + 4.2 + k * 0.35, db(-29), (91 + (k % 3) * 2,), 0.4 * (k % 2 * 2 - 1)) for k in range(4)]
# --- 4 PM: the crash (power-down), the reach, the second can
x = tt(1.4); f = 700 * (0.18 / 1) ** (x / 1.4); place(HOUR4 + 0.3, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 1.2) * 0.8, db(-20))
crack(HOUR4 + 3.85, db(-16)); fizz(HOUR4 + 3.9, 1.2, db(-31)); gulp(HOUR4 + 4.6, db(-21)); gulp(HOUR4 + 4.95, db(-22))
# --- 2 AM: eyes snap open (a soft low hit), the clock, a sigh-free hush
thud(NIGHT + 0.1, db(-22), 180, 0.3); chime(NIGHT + 2.6, db(-24), (76, 72)); thud(NIGHT + 4.25, db(-24), 160, 0.25)
# --- WEEK 1: acid drips + a short sizzle on the enamel
for k in range(9): drip(WEEK + 0.4 + k * 0.62 + rng.uniform(-0.08, 0.08), db(-22), 0.3 * np.sin(k))
sizzle(WEEK + 1.0, 4.6, db(-31))
# --- MONTH 1: the headache throbs with the red rings
for k in range(9): x = tt(0.5); place(MONTH + 0.2 + k * 0.667, (np.sin(2 * np.pi * 220 * x) + 0.5 * np.sin(2 * np.pi * 330 * x)) * np.sin(np.pi * x / 0.5) ** 2 * (1 + 0.5 * np.sin(2 * np.pi * 9 * x)), db(-25))
# --- YEAR 1: 11 bags of sugar thump down, then cha-ching
for k in range(11): thud(YEAR + 0.2 + k * 0.2, db(-21), 130 + 6 * k, 0.22, 0.25 * np.sin(k))
thud(YEAR + 3.6, db(-20), 330, 0.08); chime(YEAR + 3.65, db(-15), (86, 91, 98)); x = tt(1.6); place(YEAR + 3.7, filt(rng.standard_normal(len(x)), 'bandpass', [1500, 4500]) * (0.5 + 0.5 * (rng.random(len(x)) < 0.05)) * np.sin(np.pi * x / 1.6), db(-30))
# --- 2011: a distant US wail siren, the crowd counter rising (a soft rising tone, no ticks)
x = tt(6.4); f = 950 + 450 * np.sin(2 * np.pi * x / 3.2 - np.pi / 2); place(ER + 0.2, filt(np.sin(2 * np.pi * np.cumsum(f) / SR), 'lowpass', 2500) * win(ER + 0.2, ER + 6.6, 1.2)[int((ER + 0.2) * SR):int((ER + 0.2) * SR) + len(x)], db(-31), -0.4)
x = tt(3.0); f = 220 * (1 + 1.5 * x / 3.0); place(ER + 0.3, np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.5 * np.sin(np.pi * x / 3.0), db(-27))
ding(ER + 3.3, db(-22))
# --- TONIGHT: lights off, calm; morning birds; the stretch (whoosh + happy chime)
thud(SLEEP + 0.15, db(-24), 300, 0.06)
for k in range(7): chirp(SLEEP + 3.3 + k * 0.23 + rng.uniform(0, 0.08), db(-30), 0.5 * np.sin(k * 2))
whoosh(SLEEP + 4.65, db(-22), 0.5); chime(SLEEP + 4.75, db(-18), (79, 83, 86, 91))
popb(CTA + 0.25, db(-21))
# --- ONE theme: a pluck line in E minor, 116 bpm — slow and low before the first sip, bright after; it drags at the crash, hushed at 2 AM, warm at the end
mel = np.zeros(N); beat_s = 60 / 116; line = [64, 67, 71, 67, 69, 66, 62, 66, 64, 67, 71, 74, 72, 69, 67, 66]; cache = {}
k = 0; at = 0.2
while at < T_END - 0.2:
    tired = at < CRACK + 1.7 or HOUR4 + 0.3 <= at < HOUR4 + 4.2 or MONTH <= at < MONTH + 5.5
    n = line[k % len(line)] - (12 if tired else 0) + (3 if at >= SLEEP + 4.6 else 0)
    g = db(-25) if tired else db(-31) if NIGHT <= at < WEEK or SLEEP <= at < SLEEP + 4.6 else db(-24)
    if n not in cache: cache[n] = pluck(n, 0.9)
    place(at, cache[n], g, buf=mel)
    if not tired and k % 2 == 0: n2 = line[(k // 4 * 4) % len(line)] - 24 + (3 if at >= SLEEP + 4.6 else 0); cache.setdefault(n2, pluck(n2, 1.2)); place(at, cache[n2], g * 0.8, buf=mel)
    at += beat_s * (1.35 if tired else 1.0); k += 1
if MUSIC: add(mel, 1.0, -0.05)
if MUSIC: place(T_END + 0.2, sum(pluck(n, 3.2) * a for n, a in [(43, 1), (55, 0.8), (59, 0.6), (62, 0.6), (67, 0.5)]), db(-17))
out = np.stack([L, Rr], 1); out = sosfilt(butter(2, 60, 'highpass', fs=SR, output='sos'), out.T).T
out *= np.clip((DUR - t) / 0.8, 0, 1)[:, None] * np.clip(t / 0.05, 0, 1)[:, None]
out = np.tanh(out * 1.2) / np.tanh(1.2); out /= np.abs(out).max() / 0.92
wavfile.write(sys.argv[1], SR, (out * 32767).astype(np.int16)); print('ok')
