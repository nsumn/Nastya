# Sound for "만약 수능 시험장에서 방귀 위력이 2초마다 2배가 된다면?" (timeline = parts_suneung/s_main.js: doubling k at 2 + 2(k−1) s, lift-off 16 s, end 30 s).
# Quiet exam room (pencils, a cough) → every doubling a bigger, lower, longer "pfft" + growing wind; paper rustle, desks scraping, glass burst (12 s), double sonic boom (16 s),
# rocket roar thinning with altitude, then a soft space pad + a bell when escape velocity is passed (26 s). Quirky pizzicato music from 2 s. No voices, no ticking.
import sys, numpy as np, scipy.io.wavfile as wf
from scipy.signal import butter, sosfilt
MUSIC = '--no-music' not in sys.argv
SR = 44100; T_END = 33.0; N = int(T_END * SR) + SR; L = np.zeros(N); R = np.zeros(N); rng = np.random.default_rng(11)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def put(t, x, g=1.0, pan=0.0):
    i = int(round(t * SR)); x = x[:max(0, N - i)]; L[i:i + len(x)] += x * g * (1 - max(pan, 0)); R[i:i + len(x)] += x * g * (1 + min(pan, 0))
hz = lambda m: 440 * 2 ** ((m - 69) / 12); tt = lambda d: np.arange(int(d * SR)) / SR
env = lambda t, a, d: np.minimum(1, t / a) * np.minimum(1, (d - t) / max(1e-3, d * 0.3))
def pfft(k):   # rubbery fart: pulsed low saw through a lowpass, gets longer/lower/louder with k
    d = 0.25 + 0.09 * k; t = tt(d); f0 = 150 * 0.92 ** k * (1 + 0.25 * np.sin(2 * np.pi * 7 * t)); ph = 2 * np.pi * np.cumsum(f0) / SR
    x = 2 * (ph / (2 * np.pi) % 1) - 1; x = lp(x * (0.7 + 0.3 * np.sign(np.sin(2 * np.pi * (19 + k) * t))), 900 + 60 * k) + 0.15 * bp(rng.standard_normal(len(t)), 200, 1200)
    return x * env(t, 0.01, d) * np.exp(-t * (2.0 / d)) * min(1.0, 0.35 + 0.05 * k)
def windbed(t0, t1, g0, g1):
    d = t1 - t0; t = tt(d); n = rng.standard_normal(len(t)); g = np.linspace(g0, g1, len(t)); return (lp(n, 700) * 0.8 + bp(n, 700, 2600) * 0.35) * g * env(t, 0.3, d)
def rustle(d=0.5): t = tt(d); return bp(rng.standard_normal(len(t)) * (rng.random(len(t)) < 0.3), 1500, 6000) * env(t, 0.02, d) * 0.15
def scrape(d=0.6): t = tt(d); f = 180 + 60 * np.sin(2 * np.pi * 3 * t); return lp(np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.3 + rng.standard_normal(len(t)) * 0.4, 1500) * env(t, 0.03, d) * 0.25
def glass(): t = tt(1.4); x = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * (5 + i)) for i, f in enumerate(rng.uniform(2500, 6000, 12))) * 0.05; return x + bp(rng.standard_normal(len(t)), 2000, 8000) * np.exp(-t * 6) * 0.45
def boom(): t = tt(1.5); return (np.sin(2 * np.pi * (70 - 30 * t) * t) * np.exp(-t * 3) + 0.6 * lp(rng.standard_normal(len(t)), 900) * np.exp(-t * 4)) * 0.8
def roar(d): t = tt(d); n = rng.standard_normal(len(t)); return (lp(n, 500) * 0.9 + bp(n, 500, 2000) * 0.4) * env(t, 0.05, d) * np.exp(-t * 0.25) * 0.55
def pad(ms, d): t = tt(d); return lp(sum(np.sin(2 * np.pi * hz(m) * t) + 0.3 * np.sin(4 * np.pi * hz(m) * t) for m in ms), 2200) * env(t, 0.8, d) * 0.06
def bell(m, d=2.0): t = tt(d); return (np.sin(2 * np.pi * hz(m) * t) + 0.4 * np.sin(2 * np.pi * hz(m) * 2.76 * t) * np.exp(-t * 4)) * np.exp(-t * 2) * 0.25
def pizz(m): t = tt(0.3); return sum(0.5 ** k * np.sin(2 * np.pi * hz(m) * (k + 1) * t) for k in range(4)) * np.exp(-t * 14) * np.minimum(1, t / 0.002) * 0.3
def cough(): t = tt(0.25); return bp(rng.standard_normal(len(t)), 300, 1800) * np.exp(-t * 18) * 0.25
# room: pencil scratches (soft, irregular), a cough
for i in range(14): put(0.1 + i * 0.13 + rng.uniform(0, 0.08), bp(rng.standard_normal(int(0.07 * SR)), 1800, 5000) * 0.03, 1.0, rng.uniform(-0.5, 0.5))
put(1.2, cough(), 1.0, 0.4)
for k in range(1, 8): put(2.0 + 2 * (k - 1) - 0.02, pfft(k), 1.0)
put(2.0 + 2 * 7 - 0.02, pfft(9), 1.2)
put(4.0, windbed(4.0, 16.0, 0.05, 0.6), 1.0)
for i in range(30): put(6.0 + i * 0.32 + rng.uniform(0, 0.2), rustle(), 1.0, rng.uniform(-0.7, 0.7))
for tt0 in [8.1, 8.6, 9.3, 10.1, 10.5]: put(tt0, scrape(), 1.0, rng.uniform(-0.5, 0.5))
put(12.0, glass(), 1.2, -0.4)
put(16.0, boom(), 1.0); put(16.18, boom(), 0.7)
put(16.0, roar(8.0), 1.0)
put(16.2, windbed(16.2, 26.0, 0.5, 0.1), 1.0)
if MUSIC:
    B = 60 / 132; line = [62, 65, 69, 65, 62, 65, 69, 72, 70, 69, 65, 62, 64, 65, 67, 69]
    for i in range(int((16 - 2) / (B / 2))): put(2.0 + i * B / 2, pizz(line[i % 16] + (12 if i % 8 == 7 else 0)), 0.9, 0.2 * ((-1) ** i))
    for i in range(int((16 - 2) / B)): put(2.0 + i * B, pizz(38 + [0, 0, 3, 5][(i // 2) % 4]), 1.1)
    for i, ch in enumerate([[62, 69, 74], [65, 72, 77], [60, 67, 72], [67, 74, 79]]): put(16.5 + i * 3.4, pad(ch, 4.0), 1.6)
    for m in [62, 66, 69, 74]: put(30.0, pad([m], 3.0) * 2.0, 1.0)
put(26.0, bell(86, 2.5), 1.0); put(26.12, bell(93, 2.2), 0.7)
put(30.0, bell(81, 2.6), 0.9)
x = np.stack([L, R], 1)[:int(T_END * SR)]; x /= max(1e-9, np.abs(x).max()) / 0.9
out = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('--') else 'out/suneung/audio_raw.wav'
wf.write(out, SR, (x * 32767).astype(np.int16)); print('wrote', out)
