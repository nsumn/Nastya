# Effects for the beat-synced cut of "What if you overthought every night for a month?" — posted under HER TikTok sound (Grieg, "In the Hall of the Mountain King",
# 59.0 s clip; NOT in the repo). Every effect sits on the beat grid in data/mk_beats.json (same as parts_think/k_head.js). The music is added in TikTok, so this track
# is effects only; after the song ends (59 s) there is silence and one breath out. Optional preview: python3 audio_think_mk.py [song.wav] → also mixes her clip in.
import sys, os, json, numpy as np, scipy.io.wavfile as wf
from scipy.signal import butter, sosfilt
SR = 44100; D = json.load(open('data/mk_beats.json')); BEATS, HITS = D['beats'], D['hits']
beat = lambda k: BEATS[min(k, len(BEATS) - 1)]
THINK, CORT, HEART, FORCE, MID, MORN, FOG, WALL, LIST, T_END = beat(5), beat(17), beat(24), beat(31), beat(41), beat(49), beat(57), beat(65), 59.3, 67.0
N = int(T_END * SR) + SR; L = np.zeros(N); R = np.zeros(N); rng = np.random.default_rng(11)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def put(t, x, g=1.0, pan=0.0):
    i = int(round(t * SR)); x = x[:max(0, N - i)]; L[i:i + len(x)] += x * g * (1 - max(pan, 0)); R[i:i + len(x)] += x * g * (1 + min(pan, 0))
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
tt = lambda d: np.arange(int(d * SR)) / SR
def pop(f0=700): t = tt(0.18); f = f0 * (1 + 0.8 * np.exp(-t * 40)); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 22) * 0.35
def thud(): t = tt(0.5); x = np.sin(2 * np.pi * 150 * t) + 0.5 * np.sin(2 * np.pi * 300 * t) + 0.25 * np.sin(2 * np.pi * 455 * t); return x * np.exp(-t * 7) * 0.28
def lubdub():
    t = tt(0.45); x = np.zeros(len(t))
    for off, a in ((0.0, 1.0), (0.16, 0.7)): s = np.maximum(t - off, 0); x += a * (np.sin(2 * np.pi * 70 * s) + 0.7 * np.sin(2 * np.pi * 140 * s) + 0.3 * np.sin(2 * np.pi * 210 * s)) * np.exp(-s * 18) * (t >= off)
    return x * 0.35
def zip_(d): t = tt(d); f = 1800 * np.exp(-t * 1.4 / d) + 300; return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / d) * 0.12
def fizz(d): t = tt(d); return bp(rng.standard_normal(len(t)), 1500, 5000) * np.minimum(1, t / 0.6) * np.minimum(1, (d - t) / 0.5) * 0.08
def boing(): t = tt(0.35); f = 260 + 200 * np.sin(np.pi * t / 0.35) * np.exp(-t * 2); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6) * 0.22
def marimba(m, d=0.35): t = tt(d); f = hz(m); return (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * f * 4 * t)) * np.exp(-t * 9) * 0.3
def pour(d): t = tt(d); n = rng.standard_normal(len(t)); g = 0.6 + 0.4 * np.sin(2 * np.pi * 11 * t + 3 * np.sin(2 * np.pi * 1.3 * t)); return bp(n, 500, 2500) * g * np.minimum(1, t / 0.2) * np.minimum(1, (d - t) / 0.3) * 0.13
def tap(): t = tt(0.06); return bp(rng.standard_normal(len(t)), 800, 3500) * np.exp(-t * 70) * 0.25
def swish(): t = tt(0.14); return bp(rng.standard_normal(len(t)), 1500, 6000) * np.sin(np.pi * t / 0.14) ** 2 * 0.14
def scribble(d): t = tt(d); env = (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 4.3 * t))) * (0.6 + 0.4 * np.sin(2 * np.pi * 13 * t)); return bp(rng.standard_normal(len(t)), 1200, 5000) * env * 0.07
def click(): t = tt(0.05); return bp(rng.standard_normal(len(t)), 1000, 4000) * np.exp(-t * 120) * 0.35
def swoosh(): t = tt(0.6); return bp(rng.standard_normal(len(t)), 400, 2400) * np.sin(np.pi * t / 0.6) ** 2 * 0.22
def exhale(): t = tt(1.6); return bp(rng.standard_normal(len(t)), 300, 2200) * np.sin(np.pi * np.minimum(t / 1.6, 1)) ** 1.5 * np.exp(-t * 0.5) * 0.3   # air only, no voice
for k in (5, 7, 9, 11, 13, 15): put(beat(k), pop(650 + 90 * (k % 4)), 0.9, pan=0.3 if k % 4 == 1 else -0.3)
for k in (42, 44, 46, 48): put(beat(k), thud(), 0.9)
put(CORT - 0.3, swoosh(), 0.7); put(FORCE - 0.3, swoosh(), 0.5)
put(beat(21), zip_(beat(23) - beat(21)), 0.9); put(beat(23), pop(420), 0.9); put(beat(23), fizz(HEART - beat(23)), 1.0)
for k in range(24, 31): put(beat(k), lubdub(), 0.7)                      # the heart beats with the music
for k in range(31, 39): put(beat(k) - 0.05, boing(), 0.6, pan=-0.2 + 0.05 * (k % 6))   # a sheep over the fence on every beat
for j, m in enumerate((71, 74, 78, 74)): put(MORN + 0.1 + j * 0.15, marimba(m), 0.6)
put(FOG + 0.3, pour(4.0), 0.9)
for i in range(30): k = 65 + (i >> 1); put(beat(k) + (i & 1) * 0.5 * (beat(k + 1) - beat(k)), tap(), 0.5, pan=(i % 6 - 2.5) * 0.12)
for h in HITS: put(h + 0.02, swish(), 0.6)
put(59.15, exhale(), 1.0)                                                 # the music stops: breathe out
put(LIST + 0.3, scribble(2.5), 1.0); put(LIST + 2.9, click(), 0.8)
fx = np.stack([L, R], 1)[:int(T_END * SR)]; fx = hp(fx.T, 70).T
os.makedirs('out/think', exist_ok=True)
wf.write('out/think/audio_mk_fx.wav', SR, (fx / np.abs(fx).max() * 0.9 * 32767).astype(np.int16))
if len(sys.argv) > 1:   # preview: her clip + effects (effects ~6 dB under the music)
    from scipy.signal import resample_poly
    sr2, s = wf.read(sys.argv[1]); s = s.astype(float) / 32768
    if s.ndim == 1: s = np.stack([s, s], 1)
    if sr2 != SR: s = resample_poly(s, SR, sr2, axis=0)
    mix = fx / np.abs(fx).max() * 0.5; n = min(len(s), len(mix)); mix[:n] += s[:n] / np.abs(s).max() * 0.9
    wf.write('out/think/audio_mk_preview.wav', SR, (mix / np.abs(mix).max() * 0.9 * 32767).astype(np.int16))
print('ok')
