# Music + effects for "What if every American jumped into the ocean at once?" (timeline = parts_sea/w_head.js).
# One bright surf-pop melody (126 BPM, E major, pluck + bass + light drums) that builds to the countdown, drops out for "3… 2… 1…" (only drum hits),
# bursts back on JUMP; floaty under water / macro / space; thin and chilly on the cold beat; end chord. Effects: crowd murmur swell (filtered noise, no voices),
# map whooshes, car door + engine, horns in the jam (short, mid), waves, the jump whoosh + huge splash, bubbles, a tiny "tink" for 0.00006 mm, teeth chatter (soft), wind.
# python3 audio_sea.py [--no-music]  ->  out/sea/audio_raw.wav | audio_raw_nomusic.wav
import sys, os, numpy as np, scipy.io.wavfile as wf
from scipy.signal import butter, sosfilt
MUSIC = '--no-music' not in sys.argv
SR = 44100
MAP, ALLEN, JAM, COAST, COUNT, JUMP, SPLASH, MACRO, SPACE, COLD, BACK, ENDC, T_END = 4.0, 10.0, 16.0, 22.0, 28.0, 31.6, 34.0, 40.0, 46.0, 52.0, 58.0, 61.0, 64.0
N = int(T_END * SR) + SR; L = np.zeros(N); R = np.zeros(N); rng = np.random.default_rng(41)
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
def waves(d): t = tt(d); n = rng.standard_normal(len(t)); env = 0.55 + 0.45 * np.sin(2 * np.pi * 0.18 * t) ** 2; return (lp(n, 900) * 0.5 + bp(n, 900, 3500) * 0.2) * env * np.minimum(1, t / 1.0) * np.minimum(1, (d - t) / 1.0) * 0.35
def crowd(d): t = tt(d); n = rng.standard_normal(len(t)); return bp(n, 300, 1600) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.9 * t)) * np.minimum(1, t / 0.8) * np.minimum(1, (d - t) / 0.6) * 0.18
def horn(f=380, d=0.35): t = tt(d); x = sum(np.sign(np.sin(2 * np.pi * f * k * t)) / k for k in (1, 1.26)); return lp(x, 2200) * np.minimum(1, t / 0.01) * np.minimum(1, (d - t) / 0.03) * 0.06
def engine(d): t = tt(d); f = 55 + 40 * np.minimum(1, t / 2); ph = 2 * np.pi * np.cumsum(f) / SR; x = sum(np.sin(k * ph) / k for k in range(1, 7)); return lp(x, 700) * np.minimum(1, t / 0.3) * np.minimum(1, (d - t) / 1.0) * 0.18
def door(): t = tt(0.25); return (np.sin(2 * np.pi * 120 * t) * np.exp(-t * 25) + 0.5 * bp(rng.standard_normal(len(t)), 400, 2500) * np.exp(-t * 40)) * 0.4
def splash(d=2.5): t = tt(d); n = rng.standard_normal(len(t)); return (bp(n, 300, 6000) * np.exp(-t * 1.6) + 0.6 * lp(n, 500) * np.exp(-t * 1.0)) * np.minimum(1, t / 0.03) * 0.7
def bubbles(d):
    out = np.zeros(int(d * SR))
    for k in range(int(d * 14)):
        i = int(rng.random() * (len(out) - 4000)); f0 = 500 + 900 * rng.random(); tb = tt(0.06); out[i:i + len(tb)] += np.sin(2 * np.pi * f0 * (1 + 4 * tb) * tb) * np.exp(-tb * 60) * 0.1
    return out
def tink(): t = tt(0.8); return (np.sin(2 * np.pi * 2400 * t) + 0.3 * np.sin(2 * np.pi * 5600 * t)) * np.exp(-t * 6) * 0.12
def wind(d): t = tt(d); return bp(rng.standard_normal(len(t)), 300, 1800) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.3 * t)) * np.minimum(1, t / 0.8) * np.minimum(1, (d - t) / 0.8) * 0.16
def chatter(d): t = tt(d); env = (np.sin(2 * np.pi * 9 * t) > 0.6).astype(float); return bp(rng.standard_normal(len(t)), 1500, 4500) * env * 0.05
if MUSIC:
    BEAT = 60 / 126; BAR = 4 * BEAT
    CH = [(52, [64, 68, 71, 76]), (49, [61, 64, 68, 73]), (45, [57, 61, 64, 69]), (47, [59, 63, 66, 71])]   # E C#m A B
    MOT = [0, 1, 2, 3, 2, 1, 2, None]
    def sec(t):
        if t < COUNT: return 'main'
        if t < JUMP: return 'count'
        if t < SPLASH + 2.8: return 'big'
        if t < COLD: return 'float'
        if t < ENDC: return 'cold'
        return 'none'
    b = 0
    while b * BAR < ENDC:
        t0 = b * BAR; s = sec(t0 + 0.01); root, tones = CH[b % 4]
        if s == 'count': b += 1; continue
        g = {'main': 0.9 + 0.1 * min(1, t0 / COUNT), 'big': 1.15, 'float': 0.8, 'cold': 0.7}.get(s, 0)
        if g == 0: b += 1; continue
        put(t0, bass(root, BAR * 0.95), 0.9 * g)
        for q in range(4):
            if s in ('main', 'big'): put(t0 + q * BEAT, kick() if q % 2 == 0 else snare(), 0.7 * g)
        for i, ix in enumerate(MOT):
            tn = t0 + i * BEAT / 2
            if ix is None or (s in ('float', 'cold') and i % 2) or (s == 'main' and COUNT <= tn) or (s == 'big' and tn < JUMP): continue
            put(tn, pluck(tones[ix] + (12 if s == 'big' else 0), 0.6 if s != 'float' else 1.2, 0.9), 0.85 * g, pan=-0.15)
        b += 1
    for k in range(3): put(COUNT + 0.2 + k * 1.1, kick(), 1.2); put(COUNT + 0.2 + k * 1.1, snare(), 0.8)   # 3… 2… 1…
    for m in (52, 64, 68, 71, 76): put(ENDC + 0.4, pluck(m, 3.0, 0.6), 0.6)
    put(ENDC + 0.4, bass(40, 3.0), 0.8)
put(0, crowd(MAP), 1.0); put(0, waves(MAP + 0.2), 0.9)
put(MAP - 0.3, whoosh(), 0.8); put(ALLEN - 0.3, whoosh(), 0.6); put(JAM - 0.3, whoosh(), 0.6); put(COAST - 0.3, whoosh(), 0.6)
put(ALLEN + 3.5, door(), 0.9); put(ALLEN + 3.7, engine(2.6), 1.0)
for k in range(9): put(JAM + 0.4 + k * 0.6 + 0.2 * np.sin(k), horn(330 + 40 * (k % 3), 0.25 + 0.2 * (k % 2)), 0.8, pan=(k % 3 - 1) * 0.4)
put(COAST, crowd(COUNT + 0.2 - COAST), 1.2); put(COAST, waves(SPLASH - COAST), 0.8)
put(JUMP - 0.2, whoosh(), 1.0); put(JUMP + 1.9, splash(3.0), 1.2); put(JUMP + 2.4, splash(2.5), 0.8, pan=0.3)
put(SPLASH + 2.8, bubbles(MACRO - SPLASH - 2.8), 1.0)
put(MACRO + 0.3, tink(), 1.0); put(SPACE - 0.3, whoosh(), 0.6)
put(COLD, waves(BACK - COLD + 3), 0.8); put(COLD, wind(ENDC - COLD), 1.0); put(COLD + 2.4, chatter(BACK - COLD - 2.4), 1.0)
mix = np.stack([L, R], 1)[:int(T_END * SR)]; mix = hp(mix.T, 70).T
mix /= np.abs(mix).max() / 0.9
os.makedirs('out/sea', exist_ok=True)
wf.write('out/sea/audio_raw.wav' if MUSIC else 'out/sea/audio_raw_nomusic.wav', SR, (mix * 32767).astype(np.int16))
print('ok')
