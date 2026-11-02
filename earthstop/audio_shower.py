# Music + effects for "What if you stopped showering for a month?" (timeline = parts_shower/q_head.js).
# One cheeky pluck melody (112 BPM, F major → a "grosser" minor from day 7, bright again in the shower), bass + light drums. Effects: curtain swish, day "ding",
# the skin bacteria (soft squelchy blips, no ticking), stink "pfff" (filtered air), subway rumble + people shuffling away, flies as a LOW soft hum that comes and goes
# (not a constant buzz), a calendar flip, the shower (water noise) + a happy chord. No voices.
# python3 audio_shower.py [--no-music]  ->  out/shower/audio_raw.wav | audio_raw_nomusic.wav
import sys, os, numpy as np, scipy.io.wavfile as wf
from scipy.signal import butter, sosfilt
MUSIC = '--no-music' not in sys.argv
SR = 44100
HOOK = 3.0
DAY1, MICRO, DAY3, DAY7, DAY14, DAY30, DOC, SHOWER, ENDC, T_END = 7.0, 13.0, 20.0, 26.0, 33.0, 41.0, 49.0, 57.0, 63.0, 67.0
N = int(T_END * SR) + SR; L = np.zeros(N); R = np.zeros(N); rng = np.random.default_rng(61)
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
def swish(): t = tt(0.5); return bp(rng.standard_normal(len(t)), 800, 5000) * np.sin(np.pi * t / 0.5) ** 2 * 0.18
def squelch(f0): t = tt(0.16); f = f0 * (1 - 0.5 * t / 0.16); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 18) * 0.16
def pfff(): t = tt(0.7); return bp(rng.standard_normal(len(t)), 300, 1600) * np.sin(np.pi * t / 0.7) ** 2 * np.exp(-t * 1.5) * 0.3
def rumble(d): t = tt(d); n = rng.standard_normal(len(t)); return (lp(n, 500) * 0.6 + bp(n, 500, 2000) * 0.25 * (0.6 + 0.4 * np.sin(2 * np.pi * 1.7 * t))) * np.minimum(1, t / 0.5) * np.minimum(1, (d - t) / 0.5) * 0.3
def flies(d):
    t = tt(d); f = 210 + 25 * np.sin(2 * np.pi * 3.1 * t) + 15 * np.sin(2 * np.pi * 7.3 * t); x = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.3 * np.sin(4 * np.pi * np.cumsum(f) / SR)
    return lp(x, 900) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.6 * t)) ** 2 * np.minimum(1, t / 0.4) * np.minimum(1, (d - t) / 0.4) * 0.05
def flip(): t = tt(0.12); return bp(rng.standard_normal(len(t)), 1500, 6000) * np.exp(-t * 30) * 0.3
def water(d): t = tt(d); n = rng.standard_normal(len(t)); return (bp(n, 600, 7000) * 0.35 + lp(n, 600) * 0.15) * np.minimum(1, t / 0.4) * np.minimum(1, (d - t) / 0.6) * 0.35
def ding(m): t = tt(0.9); return (np.sin(2 * np.pi * hz(m) * t) + 0.35 * np.sin(2 * np.pi * hz(m) * 2.76 * t)) * np.exp(-t * 4) * 0.2
if MUSIC:
    put(0.0, bass(38, 2.4), 1.2); put(0.0, kick(), 1.4); put(0.0, snare(), 1.0); put(1.4, kick(), 1.2)   # hook stinger (the song starts after the rewind)
    BEAT = 60 / 112; BAR = 4 * BEAT
    MAJ = [(53, [65, 69, 72, 77]), (50, [62, 65, 69, 74]), (46, [62, 65, 70, 74]), (48, [64, 67, 70, 72])]   # F Dm Bb C
    MIN = [(50, [62, 65, 69, 74]), (46, [62, 65, 70, 74]), (45, [61, 64, 69, 73]), (50, [62, 65, 69, 74])]   # Dm Bb A Dm
    MOT = [0, None, 2, 1, 3, None, 2, 0]
    b = 0
    while HOOK + b * BAR < ENDC + 0.2:
        t0 = HOOK + b * BAR; gross = DAY7 <= t0 + 0.01 < SHOWER; root, tones = (MIN if gross else MAJ)[b % 4]; g = 0.85 if gross else 1.0
        put(t0, bass(root, BAR * 0.95), 0.85 * g)
        for q in range(4): put(t0 + q * BEAT, kick() if q % 2 == 0 else snare(), 0.55 * g)
        for i, ix in enumerate(MOT):
            if ix is None: continue
            put(t0 + i * BEAT / 2, pluck(tones[ix] + (12 if t0 >= SHOWER else 0), 0.4, 1.0), 0.85 * g, pan=-0.15)
        b += 1
    for m in (53, 65, 69, 72, 77): put(ENDC + 0.3, pluck(m, 3.0, 0.6), 0.6)
    put(ENDC + 0.3, bass(41, 3.0), 0.8)
put(HOOK + 1.6, swish(), 1.0)
# the cold open: a stinger hit, flies, the subway gasp (air), a tape-rewind sweep into day 0
def rewind(): t = tt(0.6); f = 2400 * (1 - t / 0.6) ** 2 + 200; return (np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.15 + bp(rng.standard_normal(len(t)), 800, 5000) * 0.12) * np.sin(np.pi * t / 0.6)
put(0.0, pfff(), 1.2); put(0.0, flies(2.4), 2.0); put(1.4, rumble(1.0), 1.2); put(1.45, pfff(), 1.0); put(2.4, rewind(), 1.2)
for c in (DAY3, DAY7, DAY14, DOC, SHOWER): put(c - 0.18, swish(), 1.3)   # whip-pan cuts
for c in (DAY1, DAY3, DAY7, DAY14, DAY30): put(c + 0.15, ding(84), 0.8)
for k in range(14): put(MICRO + 3.0 + k * 0.28, squelch(320 + 60 * (k % 4)), 0.8, pan=(k % 3 - 1) * 0.3)
for c in (MICRO + 4.4, DAY3 + 0.8, DAY7 + 1.2, DAY14 + 0.6): put(c, pfff(), 1.0)
put(DAY7, rumble(DAY14 - DAY7), 1.0); put(DAY14 + 0.3, flies(DAY30 - DAY14 - 0.6), 1.0)
for k in range(6): put(DOC + 0.3 + k * 0.45, flip(), 0.9)
put(SHOWER - 0.2, swish(), 1.0); put(SHOWER, water(ENDC - SHOWER + 0.5), 1.0)
mix = np.stack([L, R], 1)[:int(T_END * SR)]; mix = hp(mix.T, 70).T
mix /= np.abs(mix).max() / 0.9
os.makedirs('out/shower', exist_ok=True)
wf.write('out/shower/audio_raw.wav' if MUSIC else 'out/shower/audio_raw_nomusic.wav', SR, (mix * 32767).astype(np.int16))
print('ok')
