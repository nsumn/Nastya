# Music + effects for "What if you could fly for one day?" (timeline = parts_fly/f_head.js). A bouncy, sunny pluck tune (124 BPM, G major) with light drums;
# effects: the fan whirr + BONK (with a cartoon wobble), wind rushing in the flight shots, pigeons (wing flaps + a coo-less flutter), bug "tik" splats (3, not a ticking stream),
# a cold wind, the JET roar passing, an office "ding" + a sip, the phone dying (two descending beeps), a big SPLASH, the power fading (a downward sweep) + a soft plop. No voices.
# python3 audio_fly.py [--no-music]  ->  out/fly/audio_raw.wav | audio_raw_nomusic.wav
import sys, os, numpy as np, scipy.io.wavfile as wf
from scipy.signal import butter, sosfilt
MUSIC = '--no-music' not in sys.argv
SR = 44100
OUT, PIGEON, BUGS, COLD, JET, COFFEE, LOST, POOL, ROOF, ENDC, T_END = 3.0, 9.0, 15.0, 20.5, 26.0, 33.0, 40.0, 45.5, 52.0, 61.0, 64.0
N = int(T_END * SR) + SR; L = np.zeros(N); R = np.zeros(N); rng = np.random.default_rng(71)
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
def swish(): t = tt(0.5); return bp(rng.standard_normal(len(t)), 800, 5000) * np.sin(np.pi * t / 0.5) ** 2 * 0.2
def ding(m): t = tt(0.9); return (np.sin(2 * np.pi * hz(m) * t) + 0.35 * np.sin(2 * np.pi * hz(m) * 2.76 * t)) * np.exp(-t * 4) * 0.22
def bonk(): t = tt(0.6); f = 220 * (1 + 0.3 * np.sin(2 * np.pi * 9 * t) * np.exp(-t * 5)); return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6) + 0.6 * bp(rng.standard_normal(len(t)), 600, 3000) * np.exp(-t * 40)) * 0.5
def whirr(d): t = tt(d); return bp(rng.standard_normal(len(t)), 200, 900) * (0.6 + 0.4 * np.sin(2 * np.pi * 7 * t)) * 0.06
def wind(d, g=0.18): t = tt(d); return bp(rng.standard_normal(len(t)), 300, 2400) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.5 * t)) * np.minimum(1, t / 0.6) * np.minimum(1, (d - t) / 0.6) * g
def flap(): t = tt(0.12); return bp(rng.standard_normal(len(t)), 400, 2500) * np.exp(-t * 35) * 0.25
def splat(): t = tt(0.08); return bp(rng.standard_normal(len(t)), 1500, 5000) * np.exp(-t * 60) * 0.35
def jet(d): t = tt(d); n = rng.standard_normal(len(t)); env = np.exp(-((t - d * 0.45) / (d / 4)) ** 2); return (bp(n, 150, 3000) * 0.6 + lp(n, 250) * 0.6) * env * 0.6
def sip(): t = tt(0.4); return bp(rng.standard_normal(len(t)), 600, 3000) * np.sin(np.pi * t / 0.4) * 0.15
def beep(m): t = tt(0.18); return np.sin(2 * np.pi * hz(m) * t) * np.minimum(1, t / 0.01) * np.minimum(1, (0.18 - t) / 0.02) * 0.15
def splash(): t = tt(2.0); n = rng.standard_normal(len(t)); return (bp(n, 300, 6000) * np.exp(-t * 2.2) + 0.5 * lp(n, 400) * np.exp(-t * 1.5)) * 0.8
def fade(): t = tt(1.4); f = 900 * np.exp(-t * 1.8) + 120; return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / 1.4) * 0.14
def plop(): t = tt(0.3); return np.sin(2 * np.pi * (180 - 100 * t) * t) * np.exp(-t * 14) * 0.4
if MUSIC:
    BEAT = 60 / 124; BAR = 4 * BEAT
    CH = [(55, [67, 71, 74, 79]), (52, [64, 67, 71, 76]), (48, [64, 67, 72, 76]), (50, [62, 66, 69, 74])]   # G Em C D
    MOT = [0, 2, 1, 3, 2, None, 1, 2]
    b = 0
    while 1.6 + b * BAR < ENDC + 0.2:
        t0 = 1.6 + b * BAR; root, tones = CH[b % 4]; drop = ROOF + 2.5 <= t0 < ROOF + 4.5
        if not drop:
            put(t0, bass(root, BAR * 0.95), 0.9)
            for q in range(4): put(t0 + q * BEAT, kick() if q % 2 == 0 else snare(), 0.6)
            for i, ix in enumerate(MOT):
                if ix is not None: put(t0 + i * BEAT / 2, pluck(tones[ix] + (12 if b % 8 >= 4 else 0), 0.4, 1.0), 0.85, pan=-0.15)
        b += 1
    for m in (55, 67, 71, 74, 79): put(ENDC + 0.3, pluck(m, 3.0, 0.6), 0.6)
    put(ENDC + 0.3, bass(43, 3.0), 0.8)
put(0, whirr(1.6), 1.0); put(1.55, bonk(), 1.4)
for c in (OUT, PIGEON + 3, COLD, COFFEE, LOST, ROOF): put(c - 0.2, swish(), 1.0)
put(OUT, wind(COFFEE - OUT), 1.0)
for k in range(18): put(PIGEON + 0.2 + k * 0.32, flap(), 0.9, pan=(k % 3 - 1) * 0.5)
for k in range(3): put(BUGS + 1.8 + k * 0.5, splat(), 1.0)
put(COLD, wind(JET - COLD, 0.14), 1.0); put(JET + 1.2, jet(4.4), 1.2)
put(COFFEE + 0.3, ding(84), 0.8); put(COFFEE + 4.9, sip(), 1.0)
put(LOST + 2.0, beep(76), 1.0); put(LOST + 2.25, beep(69), 1.0)
put(POOL + 1.9, splash(), 1.2); put(ROOF + 2.5, fade(), 1.0); put(ROOF + 4.15, plop(), 1.0)
mix = np.stack([L, R], 1)[:int(T_END * SR)]; mix = hp(mix.T, 70).T
mix /= np.abs(mix).max() / 0.9
os.makedirs('out/fly', exist_ok=True)
wf.write('out/fly/audio_raw.wav' if MUSIC else 'out/fly/audio_raw_nomusic.wav', SR, (mix * 32767).astype(np.int16))
print('ok')
