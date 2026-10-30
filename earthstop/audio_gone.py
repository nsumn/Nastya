# Music + effects for "What if everyone disappeared… except you and your best friend?" (timeline = parts_gone/x_head.js).
# One playful pluck melody (120 BPM, C major; minor and sparse while things fall apart; soft at the couch), bass + light drums, and cartoon effects
# on the beats: poofs, chip crunches, the supercar, power-down, rushing water, sad trombone, sputtering engine, bike bell, drum roll. No voices, no ticking.
import sys, numpy as np, scipy.io.wavfile as wf
MUSIC = '--no-music' not in sys.argv   # --no-music: sound effects only (no song, no end chord) → out/gone/audio_raw_nomusic.wav
from scipy.signal import butter, sosfilt
SR = 44100
GONE, HOMES, MARKET, CAR, GRID, SUBWAY, ROT, GAS, PRES, COUCH, ENDC, T_END = 4.0, 9.0, 15.0, 21.0, 27.0, 33.0, 39.0, 45.0, 51.0, 56.5, 60.5, 64.0
N = int(T_END * SR) + SR; L = np.zeros(N); R = np.zeros(N); rng = np.random.default_rng(3)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def put(t, x, g=1.0, pan=0.0):
    i = int(round(t * SR)); x = x[:max(0, N - i)]; L[i:i + len(x)] += x * g * (1 - max(pan, 0)); R[i:i + len(x)] += x * g * (1 + min(pan, 0))
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
tt = lambda d: np.arange(int(d * SR)) / SR
# ---- instruments ----
def pluck(m, d=0.35, bright=1.0):   # Karplus-Strong-ish: decaying harmonics
    t = tt(d); f = hz(m); x = sum((0.6 ** k) * np.sin(2 * np.pi * f * (k + 1) * t) * np.exp(-t * (6 + 5 * k / bright)) for k in range(6)); return x * np.minimum(1, t / 0.003) * 0.35
def bass(m, d):
    t = tt(d); f = hz(m); x = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) + 0.15 * np.sin(6 * np.pi * f * t)   # harmonics so phones hear it
    return x * np.minimum(1, t / 0.01) * np.exp(-t * 2.5) * np.minimum(1, (d - t) / 0.03) * 0.4
def kick(): t = tt(0.25); f = 60 + 90 * np.exp(-t * 30); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 12) * 0.7
def snare(): t = tt(0.18); return (bp(rng.standard_normal(len(t)), 1200, 6000) * np.exp(-t * 25) + 0.3 * np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30)) * 0.35
def hat(): t = tt(0.04); return hp(rng.standard_normal(len(t)), 8000) * np.exp(-t * 110) * 0.08
# ---- effects ----
def poof(): t = tt(0.45); n = rng.standard_normal(len(t)); return (bp(n, 300, 2500) * np.exp(-t * 9) * np.minimum(1, t / 0.02) + 0.3 * np.sin(2 * np.pi * (500 - 400 * t) * t) * np.exp(-t * 14)) * 0.55
def crunch(): t = tt(0.12); return bp(rng.standard_normal(len(t)) * (rng.random(len(t)) < 0.25), 1500, 7000) * np.exp(-t * 18) * 0.6
def ding(m=84): t = tt(1.2); return (np.sin(2 * np.pi * hz(m) * t) + 0.4 * np.sin(2 * np.pi * hz(m) * 2.76 * t)) * np.exp(-t * 3) * 0.25
def engine(d, rpm0, rpm1):
    t = tt(d); f = np.linspace(rpm0, rpm1, len(t)) * (1 + 0.02 * np.sin(2 * np.pi * 7 * t)); ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sign(np.sin(ph)) * 0.4 + np.sin(2 * ph) * 0.3 + 0.2 * np.sin(3 * ph); return lp(x, 1800) * np.minimum(1, t / 0.2) * np.minimum(1, (d - t) / 0.3) * 0.32
def wind(d, lo=400, hi=2500): t = tt(d); return bp(rng.standard_normal(len(t)), lo, hi) * np.minimum(1, t / 0.4) * np.minimum(1, (d - t) / 0.4) * 0.12
def powerdown(): t = tt(1.6); f = 220 * np.exp(-t * 1.6) + 30; x = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.5 * np.sign(np.sin(2 * np.pi * np.cumsum(f * 2) / SR)); return lp(x, 2000) * np.exp(-t * 1.2) * 0.35
def thud(): t = tt(0.3); return (np.sin(2 * np.pi * (140 - 60 * t) * t) * np.exp(-t * 14) + 0.2 * bp(rng.standard_normal(len(t)), 300, 1500) * np.exp(-t * 30)) * 0.4
def water(d): t = tt(d); n = rng.standard_normal(len(t)); x = lp(n, 900) * 0.6 + bp(n, 900, 4000) * 0.25 * (0.6 + 0.4 * np.sin(2 * np.pi * 3 * t)); return x * np.minimum(1, t / 1.5) * np.minimum(1, (d - t) / 0.6) * np.linspace(0.4, 1.0, len(t)) * 0.45
def trombone(m, d, bend=0.0):
    t = tt(d); f = hz(m) * (1 + bend * t / d) * (1 + 0.012 * np.sin(2 * np.pi * 5.5 * t)); ph = 2 * np.pi * np.cumsum(f) / SR
    x = sum(np.sin(k * ph) / k ** 0.8 for k in range(1, 8)); return lp(x, 1600) * np.minimum(1, t / 0.05) * np.minimum(1, (d - t) / 0.08) * 0.16
def sputter(): t = tt(0.9); env = sum(np.exp(-np.maximum(t - k * 0.13, 0) * 25) * (t >= k * 0.13) for k in range(6)); return lp(np.sign(np.sin(2 * np.pi * 45 * t)) + 0.4 * rng.standard_normal(len(t)), 900) * env * 0.35
def bell(): t = tt(0.6); x = sum(np.sin(2 * np.pi * f * t) for f in (2100, 2960, 4200)) / 3; return x * np.exp(-t * 7) * 0.22
def roll(d):   # snare roll that speeds up
    t = tt(d); x = np.zeros(len(t)); s = 0.0
    while True:
        i = int(s * SR)
        if i >= len(t): break
        seg = snare()[:len(t) - i] * (0.25 + 0.75 * s / d); x[i:i + len(seg)] += seg; s += 0.07 - 0.035 * s / d
    return x
def whoosh(up=True):   # for the whip-pan cuts: a band-passed noise sweep, its peak on the cut (each one pitched a little differently)
    t = tt(0.5); n = rng.standard_normal(len(t)); out = np.zeros(len(t)); seg = int(0.02 * SR)
    for i in range(0, len(t), seg): k = i / len(t); fc = (600 + 3800 * k) if up else (4400 - 3800 * k); out[i:i + seg] = bp(n[i:i + seg + 300], fc * 0.7, fc * 1.4)[:len(out[i:i + seg])]
    return out * np.sin(np.pi * t / 0.5) ** 2 * 0.5
def cymbal(): t = tt(1.5); return hp(rng.standard_normal(len(t)), 5000) * np.exp(-t * 2.5) * 0.25
# ---- the song: chords per 2 s bar, melody from chord tones in eighths ----
BAR, E8 = 2.0, 0.25
MAJ = [(48, [60, 64, 67, 72]), (43, [59, 62, 67, 71]), (45, [57, 60, 64, 69]), (41, [57, 60, 65, 69])]   # C G Am F
MIN = [(45, [57, 60, 64, 69]), (41, [57, 60, 65, 69]), (48, [60, 64, 67, 72]), (40, [59, 64, 68, 71])]   # Am F C E (falling apart)
MOTIF = [0, 2, 1, 3, 2, None, 1, 0]   # indices into the chord tones (None = rest)
def section(t):
    if t < GONE: return 'happy'
    if t < 6.0: return 'stop'
    if t < GRID: return 'happy'
    if t < GAS: return 'minor'
    if t < COUCH: return 'happy'
    return 'soft'
for b in range(int(T_END / BAR) if MUSIC else 0):
    t0 = b * BAR; sec = section(t0 + 0.01)
    if sec == 'stop' or t0 >= ENDC + 1.5: continue
    root, tones = (MIN if sec == 'minor' else MAJ)[b % 4]; g = {'happy': 1.0, 'minor': 0.7, 'soft': 0.45}[sec]
    put(t0, bass(root, BAR * 0.95), 0.9 * g)
    for q in range(4):
        if sec != 'soft': put(t0 + q * 0.5, kick() if q % 2 == 0 else snare(), (0.8 if sec == 'happy' else 0.55))
        if sec == 'happy': put(t0 + q * 0.5 + 0.25, hat(), 1.0, pan=0.3)
    for i, ix in enumerate(MOTIF):
        if ix is None or (sec == 'minor' and i % 2): continue
        m = tones[(ix + (b // 4) % 2) % 4] + (12 if sec == 'happy' and b % 8 >= 4 and i in (3, 4) else 0)
        put(t0 + i * E8, pluck(m, 0.4 if sec != 'soft' else 0.7, 0.7 if sec == 'soft' else 1.0), 0.95 * g, pan=-0.15)
# ending chord
if MUSIC:
    for m in (48, 60, 64, 67, 72): put(ENDC + 1.5, pluck(m, 2.2, 0.6), 0.6)
    put(ENDC + 1.5, bass(36, 2.2), 0.7)
# ---- effects on the picture ----
for i in range(7): put(1.4 + i * 0.3, poof(), 0.9, pan=(i - 3) * 0.12)
for tv in (1.6, 2.3, 3.0): put(tv, poof(), 1.1)
put(GONE, wind(2.1, 300, 1600), 1.0)   # the empty street: just wind, then the music kicks back in on "Just you two"
put(6.0, cymbal(), 0.8)
put(11.6, ding(84), 1.0); put(14.6, ding(88), 1.0)   # counters land
for k in range(int((CAR - MARKET) * 9 / (2 * np.pi)) + 1):
    tb = MARKET + (np.pi / 2 + 2 * np.pi * k) / 9
    if MARKET < tb < CAR: put(tb, crunch(), 0.9, pan=-0.3)
put(CAR - 0.3, engine(GRID - CAR + 0.2, 70, 150), 1.0); put(CAR, wind(GRID - CAR, 800, 4000), 1.2)
put(GRID + 0.2, powerdown(), 1.0)
for k in range(6): put(GRID + 1.0 + k * 0.75, thud(), 0.7, pan=(k % 3 - 1) * 0.4)   # regions dropping off, one by one
put(SUBWAY + 0.2, water(ROT - SUBWAY), 1.0)
put(ROT + 0.3, trombone(58, 0.45), 1.0); put(ROT + 0.8, trombone(57, 0.45), 1.0); put(ROT + 1.3, trombone(56, 0.45), 1.0); put(ROT + 1.8, trombone(55, 1.1, -0.06), 1.0)
for k in range(3): put(GAS + 0.3 + k * 0.7, sputter(), 1.0)
put(47.6, bell(), 1.0); put(47.85, bell(), 0.8)
put(PRES + 0.6, ding(76), 0.6); put(PRES + 1.3, ding(79), 0.6)   # two ballots drop in
put(PRES + 1.4, roll(53.8 - PRES - 1.4), 1.0); put(53.8, cymbal(), 1.0); put(53.85, trombone(53, 0.6, -0.04), 1.0)
put(COUCH, ding(72), 0.4)
for c, up in ((CAR, True), (GAS, False), (47.5, True), (PRES, False)): put(c - 0.25, whoosh(up), 0.9)   # whip-pan cuts (x_main.js opts.whip)
mix = np.stack([L, R], 1)[:int(T_END * SR)]; mix = hp(mix.T, 60).T
mix /= np.abs(mix).max() / 0.9
wf.write('out/gone/audio_raw.wav' if MUSIC else 'out/gone/audio_raw_nomusic.wav', SR, (mix * 32767).astype(np.int16))
print('ok')
