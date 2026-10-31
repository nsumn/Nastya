# Music + effects for "What if you ate ALL your Halloween candy at once?" (timeline = parts_candy/y_head.js).
# One playful spooky pluck melody (120 BPM, D minor) with bass + light drums; it STOPS on the record scratch (the sugar-rush myth), crawls during the crash,
# turns creepy on the tooth, bright on the dentist twist, marches on the treadmill, sags into the stomach ache; end chord. No voices, no ticking.
# python3 audio_candy.py [--no-music]  ->  out/candy/audio_raw.wav | audio_raw_nomusic.wav
import sys, os, numpy as np, scipy.io.wavfile as wf
from scipy.signal import butter, sosfilt
MUSIC = '--no-music' not in sys.argv
SR = 44100
EAT, XRAY, RUSH, CRASH, TOOTH, DENT, WALK, ACHE, ENDC, T_END = 4.0, 12.0, 20.0, 27.0, 34.0, 42.0, 50.0, 58.0, 61.0, 64.0
N = int(T_END * SR) + SR; L = np.zeros(N); R = np.zeros(N); rng = np.random.default_rng(31)
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
# ---- the song: 120 BPM, a bar = 2 s; one melody (D minor), sections follow the story ----
if MUSIC:
    BAR, E8 = 2.0, 0.25
    MIN = [(50, [62, 65, 69, 74]), (46, [62, 65, 70, 74]), (48, [60, 64, 67, 72]), (45, [61, 64, 69, 73])]   # Dm Bb C A — spooky-playful
    MAJ = [(50, [62, 66, 69, 74]), (55, [62, 67, 71, 74]), (57, [61, 64, 69, 73]), (50, [62, 66, 69, 74])]   # D G A D — the bright twist
    MOT = [0, 2, 1, 3, 2, None, 1, 0]
    def sec(t):
        if t < RUSH + 3.3: return 'play'
        if t < CRASH: return 'stop'
        if t < TOOTH: return 'slow'
        if t < DENT: return 'creep'
        if t < WALK: return 'bright'
        if t < ACHE: return 'march'
        return 'none'
    for b in range(int(T_END / BAR)):
        t0 = b * BAR; s = sec(t0 + 0.01)
        if s in ('stop', 'none'): continue
        root, tones = (MAJ if s == 'bright' else MIN)[b % 4]; g = {'play': 1.0, 'slow': 0.5, 'creep': 0.6, 'bright': 0.95, 'march': 1.0}[s]
        put(t0, bass(root, BAR * 0.95), 0.9 * g)
        for q in range(4):
            if s in ('play', 'march', 'bright'): put(t0 + q * 0.5, kick() if q % 2 == 0 else snare(), 0.7)
        for i, ix in enumerate(MOT):
            if ix is None or (s in ('slow', 'creep') and i % 2): continue
            tn = t0 + i * E8 * (2 if s == 'slow' else 1)
            if tn >= t0 + BAR or (s == 'play' and tn >= RUSH + 3.3): continue
            put(tn, pluck(tones[ix] - (12 if s == 'creep' else 0), 0.5 if s != 'slow' else 0.9, 0.9), 0.9 * g, pan=-0.15)
    for m in (50, 62, 65, 69, 74): put(ENDC + 0.4, pluck(m, 3.0, 0.6), 0.6)
    put(ENDC + 0.4, bass(38, 3.0), 0.8)
# ---- effects on the picture ----
t, k = EAT + 0.2, 0                               # eating: a crunch per bite, faster and faster; wrappers crinkle
while t < XRAY - 0.3:
    put(t, crunch(), 0.7, pan=0.2 * np.sin(k)); k += 1; t += 1 / (1.0 + 0.8 * min(1, (t - EAT) / 5))
put(EAT, crinkle(XRAY - EAT - 0.3), 0.8)
put(XRAY - 0.3, whoosh(), 0.8); put(XRAY + 0.3, fizz(3.5), 1.0)
for i in range(8): put(XRAY + 4.2 + i * 0.35, blip(900 + 60 * i), 0.8)   # insulin pops out of the pancreas
put(RUSH - 0.3, whoosh(), 0.6)
for i in range(6): put(RUSH + 0.3 + i * 0.57, boing(), 0.8)
put(RUSH + 3.3, scratch(), 1.0)
put(CRASH + 1.0, trombone(55, 2.5, -0.25), 1.0)  # sliding down into the crash
put(TOOTH - 0.3, whoosh(), 0.7); put(TOOTH + 0.3, sizzle(DENT - TOOTH - 0.6), 1.0)
for i in range(10): put(TOOTH + 0.5 + i * 0.75, drip(), 0.7)
for d in range(7): put(DENT + 0.4 + d * 0.35, ding(72 + d), 0.6)   # a tooth a day…
put(DENT + 3.4, ding(86), 0.9)                    # …vs one
for i in range(int((ACHE - WALK) / 0.39)): put(WALK + 0.2 + i * 0.39, step(), 0.6, pan=0.15 if i % 2 else -0.15)
put(ACHE + 0.2, growl(2.4), 1.0); put(ACHE + 0.4, trombone(53, 0.6, -0.05), 0.8)
mix = np.stack([L, R], 1)[:int(T_END * SR)]; mix = hp(mix.T, 70).T
mix /= np.abs(mix).max() / 0.9
os.makedirs('out/candy', exist_ok=True)
wf.write('out/candy/audio_raw.wav' if MUSIC else 'out/candy/audio_raw_nomusic.wav', SR, (mix * 32767).astype(np.int16))
print('ok')
