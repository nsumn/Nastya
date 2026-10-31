# Music + effects for "What if you overthought every night for a month?" (timeline = parts_think/k_head.js).
# One soft night melody on a pluck (76 BPM, A minor; darker after midnight; brighter mornings; resolves to C major on the to-do list), bass, no drums at night.
# Effects: bubble pops for each thought (dark thuds after midnight), the alarm-centre pulse, the signal zip + cortisol fizz, a heartbeat that speeds up,
# sheep boings + a record scratch, a gentle alarm melody, coffee pouring, sticky notes + marker strikes, pen scribbles, the lamp click. No voices, no ticking.
# python3 audio_think.py [--no-music]  ->  out/think/audio_raw.wav | audio_raw_nomusic.wav
import sys, os, numpy as np, scipy.io.wavfile as wf
from scipy.signal import butter, sosfilt
MUSIC = '--no-music' not in sys.argv
SR = 44100
THINK, CORT, HEART, FORCE, MID, MORN, FOG, WALL, LIST, ENDC, T_END = 4.0, 10.0, 16.0, 22.0, 28.0, 34.0, 40.0, 48.0, 55.0, 60.0, 64.0
N = int(T_END * SR) + SR; L = np.zeros(N); R = np.zeros(N); rng = np.random.default_rng(7)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def put(t, x, g=1.0, pan=0.0):
    i = int(round(t * SR)); x = x[:max(0, N - i)]; L[i:i + len(x)] += x * g * (1 - max(pan, 0)); R[i:i + len(x)] += x * g * (1 + min(pan, 0))
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
tt = lambda d: np.arange(int(d * SR)) / SR
# ---- instruments ----
def pluck(m, d=0.6, bright=1.0):
    t = tt(d); f = hz(m); x = sum((0.55 ** k) * np.sin(2 * np.pi * f * (k + 1) * t) * np.exp(-t * (4 + 4 * k / bright)) for k in range(6)); return x * np.minimum(1, t / 0.004) * 0.33
def bass(m, d):
    t = tt(d); f = hz(m); x = np.sin(2 * np.pi * f * t) + 0.4 * np.sin(4 * np.pi * f * t) + 0.18 * np.sin(6 * np.pi * f * t)
    return x * np.minimum(1, t / 0.02) * np.exp(-t * 1.2) * 0.22
def pop(f0=700): t = tt(0.18); f = f0 * (1 + 0.8 * np.exp(-t * 40)); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 22) * 0.35
def thud(): t = tt(0.5); x = np.sin(2 * np.pi * 150 * t) + 0.5 * np.sin(2 * np.pi * 300 * t) + 0.25 * np.sin(2 * np.pi * 455 * t); return x * np.exp(-t * 7) * 0.28
def beat():   # lub-dub with mid body (phones), no sub-only boom
    t = tt(0.45); x = np.zeros(len(t))
    for off, a in ((0.0, 1.0), (0.16, 0.7)): s = np.maximum(t - off, 0); x += a * (np.sin(2 * np.pi * 70 * s) + 0.7 * np.sin(2 * np.pi * 140 * s) + 0.3 * np.sin(2 * np.pi * 210 * s)) * np.exp(-s * 18) * (t >= off)
    return x * 0.35
def wub(): t = tt(0.6); return np.sin(2 * np.pi * (220 - 80 * t) * t) * np.sin(np.pi * t / 0.6) ** 2 * 0.18 + 0.08 * bp(rng.standard_normal(len(t)), 300, 900) * np.sin(np.pi * t / 0.6) ** 2
def zip_(d=1.4): t = tt(d); f = 1800 * np.exp(-t * 1.4) + 300; return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / d) * 0.12
def fizz(d): t = tt(d); return bp(rng.standard_normal(len(t)), 1500, 5000) * np.minimum(1, t / 0.6) * np.minimum(1, (d - t) / 0.5) * 0.08
def boing(): t = tt(0.35); f = 260 + 200 * np.sin(np.pi * t / 0.35) * np.exp(-t * 2); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6) * 0.22
def scratch(): t = tt(0.45); f = 900 * (1 - t / 0.45) + 200; n = rng.standard_normal(len(t)); return bp(n, 400, 3000) * (0.5 + 0.5 * np.sin(2 * np.pi * np.cumsum(f / 60) / SR * 60)) * np.exp(-t * 4) * 0.35
def marimba(m, d=0.35): t = tt(d); f = hz(m); return (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * f * 4 * t)) * np.exp(-t * 9) * 0.3
def pour(d): t = tt(d); n = rng.standard_normal(len(t)); g = 0.6 + 0.4 * np.sin(2 * np.pi * 11 * t + 3 * np.sin(2 * np.pi * 1.3 * t)); return bp(n, 500, 2500) * g * np.minimum(1, t / 0.2) * np.minimum(1, (d - t) / 0.3) * 0.13
def tap(): t = tt(0.06); return bp(rng.standard_normal(len(t)), 800, 3500) * np.exp(-t * 70) * 0.25
def swish(): t = tt(0.14); n = rng.standard_normal(len(t)); return bp(n, 1500, 6000) * np.sin(np.pi * t / 0.14) ** 2 * 0.12
def scribble(d): t = tt(d); n = rng.standard_normal(len(t)); env = (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 4.3 * t))) * (0.6 + 0.4 * np.sin(2 * np.pi * 13 * t)); return bp(n, 1200, 5000) * env * 0.07
def click(): t = tt(0.05); return bp(rng.standard_normal(len(t)), 1000, 4000) * np.exp(-t * 120) * 0.35
def swoosh(): t = tt(0.6); n = rng.standard_normal(len(t)); return bp(n, 400, 2400) * np.sin(np.pi * t / 0.6) ** 2 * 0.22
def chime(m): t = tt(1.6); return (np.sin(2 * np.pi * hz(m) * t) + 0.35 * np.sin(2 * np.pi * hz(m) * 2.76 * t)) * np.exp(-t * 2.5) * 0.2
# ---- the song: 76 BPM, a bar = 4 beats = 3.158 s; one melody line + bass, sections follow the story ----
if MUSIC:
    BEAT = 60 / 76; BAR = 4 * BEAT
    NIGHT = [(45, [57, 60, 64, 69]), (41, [57, 60, 65, 69]), (48, [60, 64, 67, 72]), (43, [59, 62, 67, 71])]   # Am F C G
    DARK = [(45, [57, 60, 64, 69]), (41, [56, 60, 65, 68]), (40, [56, 59, 64, 68]), (45, [57, 60, 64, 69])]   # Am Fm-ish E Am
    WARM = [(48, [60, 64, 67, 72]), (43, [59, 62, 67, 71]), (45, [57, 60, 64, 69]), (41, [57, 60, 65, 69])]   # C G Am F
    MOT = [0, 2, 3, 2, 1, None, 2, None]
    b = 0
    while b * BAR < ENDC + 0.5:
        t0 = b * BAR; sec = 'dark' if MID <= t0 + 0.1 < MORN else 'warm' if t0 + 0.1 >= LIST - 0.3 else 'night'
        root, tones = (DARK if sec == 'dark' else WARM if sec == 'warm' else NIGHT)[b % 4]; g = {'night': 0.85, 'dark': 0.7, 'warm': 0.9}[sec]
        put(t0, bass(root, BAR * 0.95), g)
        for i, ix in enumerate(MOT):
            if ix is None or (sec == 'dark' and i % 2): continue
            put(t0 + i * BEAT / 2, pluck(tones[ix] + (12 if sec != 'dark' and b % 4 == 3 and i == 3 else 0), 0.9, 0.8), 0.8 * g, pan=-0.12)
        b += 1
    for m in (48, 60, 64, 67, 72): put(ENDC + 0.4, pluck(m, 3.0, 0.6), 0.6)   # the final chord under the end card
    put(ENDC + 0.4, bass(36, 3.0), 0.8)
# ---- effects on the picture ----
for t0 in (THINK + 0.2, THINK + 1.1, THINK + 2.0, THINK + 2.9, THINK + 3.8, THINK + 4.7): put(t0, pop(650 + 180 * ((t0 * 7) % 3)), 0.9, pan=0.3 if int(t0 * 10) % 2 else -0.3)
for t0 in (MID + 0.4, MID + 1.4, MID + 2.4, MID + 3.4): put(t0, thud(), 0.9)
put(CORT - 0.3, swoosh(), 0.8); put(FORCE - 0.3, swoosh(), 0.6)
for k in range(5): put(CORT + 0.5 + k * 0.85, wub(), 0.8)                      # the alarm centre pulsing
put(CORT + 1.6, zip_(1.4), 0.9); put(CORT + 3.0, pop(420), 0.9); put(CORT + 3.1, fizz(HEART - CORT - 3.2), 1.0)   # signal → adrenals → cortisol
t = HEART
while t < FORCE - 0.2:                                                         # the heartbeat speeds up (62 → 92 bpm)
    bpm = 62 + 30 * min(1, max(0, (t - HEART - 0.5) / 2.5)); put(t, beat(), 0.9); t += 60 / bpm
per, stop = 1.6, FORCE + 3.4                                                   # a boing each time a sheep clears the fence (same timing as k_world.js)
for i in range(6):
    for c in range(5):
        th = FORCE + c * per + per * (3.0 - 1.3) / 3.2 - i * per / 6   # the hop peaks at z = 1.3, i.e. u = (3.0 - 1.3) / 3.2
        if FORCE <= th < stop: put(th, boing(), 0.7, pan=-0.2 + 0.08 * i)
put(stop, scratch(), 0.9)
for k in range(3):   # the wake-up alarm: a soft marimba phrase, three times
    for j, m in enumerate((72, 76, 79, 76)): put(MORN + 0.2 + k * 0.9 + j * 0.15, marimba(m), 0.8)
put(FOG + 0.4, pour(5.8), 1.0); put(FOG + 3.0, tap(), 0.5)
for i in range(0, 30, 2): put(WALL + 0.1 + i * 0.09, tap(), 0.6, pan=(i % 6 - 2.5) * 0.12)   # sticky notes slap on (every other one, so it doesn't rattle)
for i in range(30):
    if i not in (4, 17, 26): put(WALL + 3.6 + i * 0.075, swish(), 0.55, pan=(i % 6 - 2.5) * 0.12)
put(WALL + 5.6, chime(76), 0.9); put(WALL + 5.75, chime(79), 0.7)            # relief
put(LIST + 0.3, scribble(2.5), 1.0); put(LIST + 2.9, click(), 0.8); put(LIST + 3.0, chime(72), 0.6)
mix = np.stack([L, R], 1)[:int(T_END * SR)]; mix = hp(mix.T, 70).T
mix /= np.abs(mix).max() / 0.9
os.makedirs('out/think', exist_ok=True)
wf.write('out/think/audio_raw.wav' if MUSIC else 'out/think/audio_raw_nomusic.wav', SR, (mix * 32767).astype(np.int16))
print('ok')
