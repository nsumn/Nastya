# Music + effects for "What if you took an elevator from New York to space?" (timeline = parts_lift/l_head.js).
# One rising synth-pluck theme (100 BPM, D minor → D major in space) over a pad that climbs with the altitude; it drops to near-silence in space (thin, airy),
# cuts dead on the wink, then a rumble + wind roar for the fall, a pop for the parachute, the city coming back. No voices, no ticking.
# Effects: city murmur + horns at street level, the elevator hum (mid, rising), whooshes on cuts, cloud wind, a jet passing, the ISS whoosh, re-entry rumble, canopy pop.
# python3 audio_lift.py [--no-music]  ->  out/lift/audio_raw.wav | audio_raw_nomusic.wav
import sys, os, numpy as np, scipy.io.wavfile as wf
from scipy.signal import butter, sosfilt
MUSIC = '--no-music' not in sys.argv
SR = 44100
UP, CLOUD, EVER, JET, ARM, KAR, ISS, FLOAT, JUMP, DROP, LAND, ENDC, T_END = 4.0, 9.0, 14.0, 20.0, 26.0, 32.0, 38.0, 44.0, 50.0, 53.0, 59.0, 61.0, 64.0
N = int(T_END * SR) + SR; L = np.zeros(N); R = np.zeros(N); rng = np.random.default_rng(51)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def put(t, x, g=1.0, pan=0.0):
    i = int(round(t * SR)); x = x[:max(0, N - i)]; L[i:i + len(x)] += x * g * (1 - max(pan, 0)); R[i:i + len(x)] += x * g * (1 + min(pan, 0))
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
tt = lambda d: np.arange(int(d * SR)) / SR
def pluck(m, d=0.35, bright=1.0): t = tt(d); f = hz(m); x = sum((0.6 ** k) * np.sin(2 * np.pi * f * (k + 1) * t) * np.exp(-t * (6 + 5 * k / bright)) for k in range(6)); return x * np.minimum(1, t / 0.003) * 0.35
def bass(m, d): t = tt(d); f = hz(m); x = np.sin(2 * np.pi * f * t) + 0.4 * np.sin(4 * np.pi * f * t) + 0.18 * np.sin(6 * np.pi * f * t); return x * np.minimum(1, t / 0.02) * np.exp(-t * 1.5) * 0.24
def kick(): t = tt(0.25); f = 60 + 90 * np.exp(-t * 30); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 12) * 0.6
def snare(): t = tt(0.18); return (bp(rng.standard_normal(len(t)), 1200, 6000) * np.exp(-t * 25) + 0.3 * np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30)) * 0.3
def crunch(): t = tt(0.12); return bp(rng.standard_normal(len(t)) * (rng.random(len(t)) < 0.3), 900, 5000) * np.exp(-t * 20) * 0.45
def crinkle(d): t = tt(d); n = rng.standard_normal(len(t)) * (rng.random(len(t)) < 0.06); return bp(n, 2000, 7000) * np.minimum(1, t / 0.1) * np.minimum(1, (d - t) / 0.2) * 0.5
def whoosh(): t = tt(0.6); return bp(rng.standard_normal(len(t)), 400, 2400) * np.sin(np.pi * t / 0.6) ** 2 * 0.22
def fizz(d): t = tt(d); return bp(rng.standard_normal(len(t)), 1500, 5000) * np.minimum(1, t / 0.6) * np.minimum(1, (d - t) / 0.5) * 0.08
def blip(f0): t = tt(0.12); f = f0 * (1 + 0.5 * np.exp(-t * 40)); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 25) * 0.2
def boing(): t = tt(0.35); f = 260 + 220 * np.sin(np.pi * t / 0.35) * np.exp(-t * 2); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6) * 0.25
def scratch(): t = tt(0.45); f = 900 * (1 - t / 0.45) + 200; return bp(rng.standard_normal(len(t)), 400, 3000) * (0.5 + 0.5 * np.sin(2 * np.pi * np.cumsum(f / 60) / SR * 60)) * np.exp(-t * 4) * 0.45
def trombone(m, d, bend=0.0):
    t = tt(d); f = hz(m) * (1 + bend * t / d) * (1 + 0.012 * np.sin(2 * np.pi * 5.5 * t)); ph = 2 * np.pi * np.cumsum(f) / SR
    return lp(sum(np.sin(k * ph) / k ** 0.8 for k in range(1, 8)), 1600) * np.minimum(1, t / 0.05) * np.minimum(1, (d - t) / 0.08) * 0.16
def sizzle(d): t = tt(d); n = rng.standard_normal(len(t)); return bp(n, 2500, 7000) * (0.5 + 0.5 * np.sin(2 * np.pi * 7 * t) ** 2) * np.minimum(1, t / 0.3) * np.minimum(1, (d - t) / 0.4) * 0.07
def drip(): t = tt(0.15); f = 900 + 1400 * t / 0.15; return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 30) * 0.2
def ding(m): t = tt(0.9); return (np.sin(2 * np.pi * hz(m) * t) + 0.35 * np.sin(2 * np.pi * hz(m) * 2.76 * t)) * np.exp(-t * 4) * 0.22
def step(): t = tt(0.12); return (np.sin(2 * np.pi * 110 * t) + 0.5 * np.sin(2 * np.pi * 220 * t)) * np.exp(-t * 30) * 0.3 + bp(rng.standard_normal(len(t)), 300, 1500) * np.exp(-t * 40) * 0.12
def growl(d):
    t = tt(d); f = 140 + 60 * np.sin(2 * np.pi * 1.7 * t) + 30 * np.sin(2 * np.pi * 5.3 * t); x = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.5 * np.sin(4 * np.pi * np.cumsum(f) / SR)
    return lp(x * (0.5 + 0.5 * np.sin(2 * np.pi * 3.1 * t) ** 2), 900) * np.minimum(1, t / 0.2) * np.minimum(1, (d - t) / 0.3) * 0.18
def pad(m, d, bright=1.0):
    t = tt(d); x = sum(np.sin(2 * np.pi * hz(m) * k * t * (1 + 0.002 * (k % 2))) / k ** 1.5 for k in range(1, 7)) + sum(np.sin(2 * np.pi * hz(m + 7) * k * t) / k ** 1.7 for k in range(1, 4)) * 0.6
    return lp(x, 900 + 1500 * bright) * np.minimum(1, t / 1.0) * np.minimum(1, (d - t) / 1.0) * 0.06
def hum(d, f0, f1): t = tt(d); f = np.linspace(f0, f1, len(t)); ph = 2 * np.pi * np.cumsum(f) / SR; x = np.sin(ph) + 0.5 * np.sin(2 * ph) + 0.3 * np.sin(3 * ph); return lp(x, 1200) * np.minimum(1, t / 0.5) * np.minimum(1, (d - t) / 0.5) * 0.06
def wind(d, lo=300, hi=1800, g=0.16): t = tt(d); return bp(rng.standard_normal(len(t)), lo, hi) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.4 * t)) * np.minimum(1, t / 0.8) * np.minimum(1, (d - t) / 0.6) * g
def jet(d): t = tt(d); n = rng.standard_normal(len(t)); env = np.exp(-((t - d / 2) / (d / 4)) ** 2); return (bp(n, 200, 2500) * 0.6 + lp(n, 300) * 0.5) * env * 0.45
def city(d): t = tt(d); return bp(rng.standard_normal(len(t)), 250, 1500) * np.minimum(1, t / 0.5) * np.minimum(1, (d - t) / 0.8) * 0.12
def horn(f=380, d=0.3): t = tt(d); x = sum(np.sign(np.sin(2 * np.pi * f * k * t)) / k for k in (1, 1.26)); return lp(x, 2200) * np.minimum(1, t / 0.01) * np.minimum(1, (d - t) / 0.03) * 0.05
def rumble(d): t = tt(d); n = rng.standard_normal(len(t)); return (lp(n, 400) * 0.8 + bp(n, 400, 3000) * 0.4) * np.linspace(0.1, 1.0, len(t)) ** 1.5 * np.minimum(1, (d - t) / 0.3) * 0.5
def pop(): t = tt(0.5); return (bp(rng.standard_normal(len(t)), 150, 1500) * np.exp(-t * 12) + 0.6 * np.sin(2 * np.pi * 90 * t) * np.exp(-t * 10)) * 0.7
def ding(m): t = tt(1.0); return (np.sin(2 * np.pi * hz(m) * t) + 0.35 * np.sin(2 * np.pi * hz(m) * 2.76 * t)) * np.exp(-t * 3.5) * 0.18
if MUSIC:
    BEAT = 60 / 100; BAR = 4 * BEAT
    MINC = [(50, [62, 65, 69, 74]), (46, [62, 65, 70, 74]), (48, [60, 64, 67, 72]), (45, [61, 64, 69, 73])]
    MAJC = [(50, [62, 66, 69, 74]), (55, [62, 67, 71, 74]), (47, [59, 62, 66, 71]), (57, [61, 64, 69, 73])]
    b = 0
    while b * BAR < JUMP + 1.0:
        t0 = b * BAR; space = t0 >= KAR; root, tones = (MAJC if space else MINC)[b % 4]; rise = min(1, t0 / KAR)
        put(t0, pad(root + 12, BAR + 0.6, 0.3 + 0.7 * rise), 1.0 if not space else 0.8)
        if not space: put(t0, bass(root, BAR * 0.95), 0.6 + 0.4 * rise)
        for q in range(4):
            if UP <= t0 < KAR and rise > 0.2: put(t0 + q * BEAT, kick() if q % 2 == 0 else snare(), 0.35 + 0.45 * rise)
        for i in range(8):
            tn = t0 + i * BEAT / 2
            if tn >= JUMP + 0.9 or (space and i % 2) or tn < 1.0: continue
            put(tn, pluck(tones[(i * 3) % 4] + (12 if rise > 0.5 else 0), 0.5 if not space else 1.4, 0.9), (0.5 + 0.4 * rise) * (0.7 if space else 1.0), pan=-0.15)
        b += 1
    for m in (50, 62, 66, 69, 74): put(LAND + 0.2, pluck(m, 3.0, 0.6), 0.6)
    put(LAND + 0.2, bass(38, 3.0), 0.8); put(LAND + 0.2, pad(62, 4.5, 0.7), 1.0)
put(0, city(UP + 0.5), 1.0)
for k in range(5): put(0.5 + k * 0.7, horn(330 + 40 * (k % 3), 0.2 + 0.15 * (k % 2)), 0.6, pan=(k % 3 - 1) * 0.5)
put(UP - 0.1, hum(KAR - UP, 70, 140), 1.0)
for c in (UP, CLOUD, EVER, JET, ARM, KAR, ISS): put(c - 0.3, whoosh(), 0.6)
put(CLOUD, wind(EVER - CLOUD + 1, 300, 2000, 0.2), 1.0); put(EVER, wind(ARM - EVER, 500, 2500, 0.1), 1.0)
put(JET + 1.0, jet(4.5), 1.0)
for i, c in enumerate((CLOUD, EVER, JET, ARM, KAR, ISS)): put(c + 0.3, ding(81 + 2 * i), 0.7)
put(ISS + 1.3, whoosh(), 1.2)
put(DROP, rumble(LAND - DROP - 0.3), 1.0); put(DROP + 1.5, wind(LAND - DROP - 1.6, 400, 3000, 0.28), 1.0)
put(LAND - 0.05, pop(), 1.0); put(LAND, city(T_END - LAND), 1.0)
mix = np.stack([L, R], 1)[:int(T_END * SR)]; mix = hp(mix.T, 70).T
mix /= np.abs(mix).max() / 0.9
os.makedirs('out/lift', exist_ok=True)
wf.write('out/lift/audio_raw.wav' if MUSIC else 'out/lift/audio_raw_nomusic.wav', SR, (mix * 32767).astype(np.int16))
print('ok')
