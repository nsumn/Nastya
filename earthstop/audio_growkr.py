# Music + effects for "만약 내 키가 1.5초마다 2배가 된다면?" (timeline = parts_growkr/k_main.js: doubling k lands at 2.0 + 1.5·(k−1), space from 20 s, end card 29.5 s).
# One playful pluck melody (120 BPM, D major) over bass + light drums; every doubling = a rising "grow" whoosh + bwoop (a semitone higher each time);
# cup drop, jet pass, space (music thins to a pad), ISS ding, end chord. No voices, no ticking. --no-music: effects only.
import sys, numpy as np, scipy.io.wavfile as wf
from scipy.signal import butter, sosfilt
MUSIC = '--no-music' not in sys.argv
SR = 44100; T_END = 33.0; T0, DT, NDBL = 2.0, 1.5, 18; SPACE, ENDC = 20.0, 29.5
N = int(T_END * SR) + SR; L = np.zeros(N); R = np.zeros(N); rng = np.random.default_rng(7)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def put(t, x, g=1.0, pan=0.0):
    i = int(round(t * SR)); x = x[:max(0, N - i)]; L[i:i + len(x)] += x * g * (1 - max(pan, 0)); R[i:i + len(x)] += x * g * (1 + min(pan, 0))
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
tt = lambda d: np.arange(int(d * SR)) / SR
def pluck(m, d=0.4, bright=1.0):
    t = tt(d); f = hz(m); x = sum((0.6 ** k) * np.sin(2 * np.pi * f * (k + 1) * t) * np.exp(-t * (5 + 5 * k / bright)) for k in range(6)); return x * np.minimum(1, t / 0.003) * 0.33
def bell(m, d=1.6): t = tt(d); return (np.sin(2 * np.pi * hz(m) * t) + 0.45 * np.sin(2 * np.pi * hz(m) * 2.76 * t) * np.exp(-t * 4)) * np.exp(-t * 2.2) * 0.22
def bass(m, d):
    t = tt(d); f = hz(m); x = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) + 0.15 * np.sin(6 * np.pi * f * t)
    return x * np.minimum(1, t / 0.01) * np.exp(-t * 2.2) * np.minimum(1, (d - t) / 0.03) * 0.36
def pad(ms, d):
    t = tt(d); x = sum(np.sin(2 * np.pi * hz(m) * t * (1 + 0.002 * k)) + 0.3 * np.sin(4 * np.pi * hz(m) * t) for k, m in enumerate(ms)); return lp(x, 2400) * np.minimum(1, t / 0.6) * np.minimum(1, (d - t) / 0.8) * 0.06
def kick(): t = tt(0.25); f = 60 + 90 * np.exp(-t * 30); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 12) * 0.6
def snare(): t = tt(0.18); return (bp(rng.standard_normal(len(t)), 1200, 5000) * np.exp(-t * 25) + 0.3 * np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30)) * 0.3
def shaker(): t = tt(0.06); return bp(rng.standard_normal(len(t)), 3000, 7000) * np.exp(-t * 60) * 0.05
# ---- effects ----
def grow(k):   # rising whoosh + "bwoop" (pitch goes up a semitone per doubling)
    d = 0.5; t = tt(d); n = rng.standard_normal(len(t)); f0 = 180 * 2 ** (k / 12)
    sweep = bp(n, 250 + 600 * k / NDBL, 2600) * np.sin(np.pi * t / d) ** 1.5 * 0.35
    ph = 2 * np.pi * np.cumsum(f0 * (1 + 1.2 * t / d)) / SR; tone = (np.sin(ph) + 0.4 * np.sin(2 * ph)) * np.exp(-t * 6) * np.minimum(1, t / 0.01) * 0.28
    return sweep + tone
def thud(): t = tt(0.3); return (np.sin(2 * np.pi * (150 - 70 * t) * t) * np.exp(-t * 16) + 0.25 * bp(rng.standard_normal(len(t)), 300, 1800) * np.exp(-t * 30)) * 0.45
def clatter(): t = tt(0.25); return bp(rng.standard_normal(len(t)) * (rng.random(len(t)) < 0.2), 1500, 5000) * np.exp(-t * 20) * 0.35
def jet(d):
    t = tt(d); n = rng.standard_normal(len(t)); env = np.exp(-((t - d / 2) / (d / 3.2)) ** 2); return (lp(n, 1200) * 0.7 + bp(n, 1200, 3500) * 0.25) * env * 0.35
def swoosh(d=0.9): t = tt(d); return bp(rng.standard_normal(len(t)), 300, 3000) * np.sin(np.pi * t / d) ** 2 * 0.4
def sparkle(): x = np.zeros(int(1.2 * SR)); [x.__setitem__(slice(int(i * 0.07 * SR), int(i * 0.07 * SR) + int(0.6 * SR)), x[int(i * 0.07 * SR):int(i * 0.07 * SR) + int(0.6 * SR)] + bell(86 + [0, 4, 7, 12, 16][i], 0.6)[:int(0.6 * SR)] * 0.5) for i in range(5)]; return x
# ---- music: 120 BPM, D major; full groove until 20 s, then a thin pad + bells in space ----
B = 0.5
if MUSIC:
    prog = [(62, [62, 66, 69]), (67, [67, 71, 74]), (59, [59, 62, 66]), (69, [69, 73, 76])]   # D G Bm A
    mel = [74, 76, 78, 76, 74, 71, 69, 71, 74, 76, 78, 81, 78, 76, 74, 76]
    for bar in range(int(SPACE / (4 * B)) + 1):
        t0 = bar * 4 * B; root, ch = prog[bar % 4]
        if t0 >= SPACE: break
        put(t0, bass(root - 24, 4 * B), 1.0); put(t0, pad(ch, 4 * B), 0.8)
        if bar >= 1:
            for b in range(4): put(t0 + b * B, kick() if b % 2 == 0 else snare(), 0.9)
            for e in range(8): put(t0 + e * B / 2, shaker(), 1.0, 0.3 * (1 if e % 2 else -1))
        for i, b in enumerate([0, 1, 1.5, 2, 3]): put(t0 + b * B, pluck(mel[(bar * 5 + i) % len(mel)] + (12 if t0 > 11 else 0)), 0.9, 0.15)
    # space: pad + slow bells
    for i, (root, ch) in enumerate([(62, [62, 69, 74, 78]), (67, [67, 74, 79, 83]), (59, [59, 66, 71, 74]), (69, [69, 76, 81, 85])]):
        put(SPACE + i * 2.4, pad(ch, 3.0), 1.4)
    for i, m in enumerate([86, 83, 81, 86, 88, 86]): put(SPACE + 0.4 + i * 1.5, bell(m, 1.6), 0.8, 0.3 * (-1) ** i)
    # end chord
    for m in [62, 66, 69, 74]: put(ENDC, pad([m], 3.4) * 2.2, 1.0)
    put(ENDC, bell(86, 2.5), 1.0)
# ---- effects ----
for k in range(1, NDBL + 1): put(T0 + DT * (k - 1) - 0.05, grow(k), 1.0 if k < 13 else 0.8)
put(2.42, thud(), 0.8); put(2.45, clatter(), 0.6, -0.2)
put(SPACE - 0.35, swoosh(0.9), 1.0)
put(20.2, jet(2.8), 1.0, 0.0)
put(27.5, sparkle(), 1.0, 0.2)
x = np.stack([L, R], 1)[:int(T_END * SR)]; x /= max(1e-9, np.abs(x).max()) / 0.9
out = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('--') else 'out/growkr/audio_raw.wav'
wf.write(out, SR, (x * 32767).astype(np.int16)); print('wrote', out)
