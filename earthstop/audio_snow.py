import numpy as np, sys
from scipy.signal import butter, sosfilt
from scipy.io import wavfile

# "What if you got stuck in your car in a snowstorm?" (64 s): wind with gusts all through, wipers + brakes, a distant horn in the jam, a tense low drone + hiss
# while the tailpipe is blocked, brushing snow + the window motor, the engine starting/stopping in bursts, flapping cloth at night, shivering breaths and a slow heartbeat,
# a whiteout roar, the plow scraping in at dawn. ONE theme: A minor, quiet; the same line in C major at dawn. Mids only, no ticking.
SR = 44100; DUR = 64.5; N = int(SR * DUR); t = np.arange(N) / SR
MUSIC = '--no-music' not in sys.argv   # --no-music: sound effects only (no theme, pads or end chord)
rng = np.random.default_rng(1212); L = np.zeros(N); Rr = np.zeros(N)
JAM, PIPE, CLEAR, FUEL, NIGHT, COLD, WALK, DAWN, T_END = 4.0, 10.0, 17.0, 24.0, 31.0, 38.0, 45.0, 52.0, 60.0
def filt(x, kind, f, order=2): return sosfilt(butter(order, f, kind, fs=SR, output='sos'), x)
def db(x): return 10 ** (x / 20)
def norm(x): return x / (np.abs(x).max() + 1e-9)
def tt(d): return np.arange(int(d * SR)) / SR
def place(at, sig, g=1.0, pan=0.0, buf=None):
    i0 = int(at * SR)
    if i0 >= N or i0 < 0: return
    s = sig[:N - i0]
    if buf is not None: buf[i0:i0 + len(s)] += s * g; return
    L[i0:i0 + len(s)] += s * g * np.sqrt((1 - pan) / 2); Rr[i0:i0 + len(s)] += s * g * np.sqrt((1 + pan) / 2)
def add(sig, g=1.0, pan=0.0):
    global L, Rr
    L += sig * g * np.sqrt((1 - pan) / 2); Rr += sig * g * np.sqrt((1 + pan) / 2)
def hz(n): return 440 * 2 ** ((n - 69) / 12)
BN = lambda lo, hi: norm(filt(rng.standard_normal(N), 'bandpass', [lo, hi]))
def bpn(x, lo, hi): return filt(x, 'bandpass', [lo, hi])
def sm(a, b): k = np.clip((t - a) / (b - a), 0, 1); return k * k * (3 - 2 * k)
def win(a, b, f=0.5): return sm(a, a + f) * (1 - sm(b - f, b))
def piano(n, d=2.5, b=1.0): x = tt(d); f = hz(n); return (np.sin(2 * np.pi * f * x) + 0.35 * b * np.sin(4 * np.pi * f * x) + 0.12 * b * np.sin(6 * np.pi * f * x)) * np.exp(-x * 1.8) * np.clip(x / 0.006, 0, 1)
def pad(chord, a, b, fa=1.0, fb=1.0, lp=1400): return filt(sum(np.sin(2 * np.pi * hz(n) * t) + 0.4 * np.sin(2 * np.pi * hz(n) * 1.004 * t) for n in chord), 'lowpass', lp) * win(a, b, max(fa, fb))
def breath(d, kind='out', voice=0.0, f0=130):
    x = tt(d); n = rng.standard_normal(len(x))
    if kind == 'in': s = 0.8 * norm(bpn(n, 1400, 3600)) + 0.6 * norm(bpn(n, 600, 1300)); env = np.clip(x / (0.75 * d), 0, 1) ** 1.6 * np.clip((d - x) / 0.06, 0, 1)
    else: s = 0.9 * norm(bpn(n, 450, 1100)) + 0.5 * norm(bpn(n, 1100, 2200)); env = np.clip(x / 0.08, 0, 1) * np.exp(-x * 2.2 / d) * np.clip((d - x) / 0.15, 0, 1)
    if voice: s = s + voice * norm(filt(np.sign(np.sin(2 * np.pi * f0 * (1 - 0.08 * x / d) * x)), 'bandpass', [180, 1200]))
    return norm(s * env)
def rustle(at, d, g, pan=0.0): x = tt(d); s = filt(rng.standard_normal(len(x)), 'bandpass', [700, 3200]) * np.sin(np.pi * x / d) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * rng.uniform(5, 9) * x))); place(at, s, g, pan)
def thud(at, g, f=110, d=0.3, pan=0.0): x = tt(d); place(at, filt(np.sin(2 * np.pi * f * x) + 0.6 * np.sin(2 * np.pi * 2.1 * f * x) + 0.5 * rng.standard_normal(len(x)), 'lowpass', 1400) * np.exp(-x * 14), g, pan)
def beat(at, g):
    for dt, a in [(0, 1.0), (0.22, 0.7)]:
        x = tt(0.25); s = (np.sin(2 * np.pi * 70 * x) + 0.8 * np.sin(2 * np.pi * 140 * x) + 0.5 * np.sin(2 * np.pi * 280 * x)) * np.exp(-x * 22); place(at + dt, s * a, g)
def voice(at, d, f0, g, pan=0.0, vowels=((700, 1200), (500, 1700)), rate=4.0):   # wordless murmur: buzz through moving formants
    x = tt(d); f = f0 * (1 + 0.12 * np.sin(2 * np.pi * rate * 0.5 * x + rng.uniform(0, 6))); src = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR))
    a = 0.5 + 0.5 * np.sin(2 * np.pi * rate * x + rng.uniform(0, 6)); s = sum(norm(bpn(src, lo * 0.8, lo * 1.2)) * (1 - a if k else a) + 0.6 * norm(bpn(src, hi * 0.85, hi * 1.15)) for k, (lo, hi) in enumerate(vowels))
    syl = np.clip(np.abs(np.sin(np.pi * rate * x)) * 1.6, 0, 1); place(at, norm(s) * syl * np.clip(x / 0.04, 0, 1) * np.clip((d - x) / 0.08, 0, 1), g, pan)

def crunch(at, g, pan=0.0):   # one bite: a short burst of crackles in the mids
    x = tt(0.14); place(at, filt(rng.standard_normal(len(x)), 'bandpass', [500, 2400]) * np.exp(-x * 28) * (0.5 + 0.5 * (rng.random(len(x)) < 0.15)), g, pan)
def chew(a, b, rate, g, pan=0.0):
    at = a
    while at < b: x = tt(0.12); place(at, filt(rng.standard_normal(len(x)), 'bandpass', [250, 900]) * np.sin(np.pi * x / 0.12), g, pan); at += 1 / rate + rng.uniform(-0.03, 0.03)
def step(at, g, pan=0.0): thud(at, g, 90, 0.18, pan); x = tt(0.08); place(at, filt(rng.standard_normal(len(x)), 'bandpass', [400, 1600]) * np.exp(-x * 40), g * 0.5, pan)
def plop(at, g, f=300, pan=0.0): x = tt(0.25); ff = f * (1 + 1.2 * np.exp(-x * 25)); place(at, np.sin(2 * np.pi * np.cumsum(ff) / SR) * np.exp(-x * 14), g, pan)
def sweep(at, d, f0, f1, g, pan=0.0): x = tt(d); f = f0 * (f1 / f0) ** (x / d); place(at, (np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.3 * np.sin(4 * np.pi * np.cumsum(f) / SR)) * np.sin(np.pi * x / d), g, pan)
# wind: always there, gusting; louder at night and in the whiteout
gust = 0.6 + 0.4 * np.sin(2 * np.pi * 0.13 * t) * np.sin(2 * np.pi * 0.37 * t + 1)
wind = filt(rng.standard_normal(N), 'bandpass', [250, 1600]) * gust
lvl = 0.55 + 0.25 * sm(NIGHT, NIGHT + 1) - 0.1 * sm(COLD, COLD + 1) + 0.6 * win(WALK, DAWN, 0.8) - 0.3 * sm(DAWN, DAWN + 1.5)
add(norm(wind) * lvl, db(-23))
# 0-4: wipers swish, then the brakes
for at in np.arange(0.2, JAM, 0.63): x = tt(0.35); place(at, filt(rng.standard_normal(len(x)), 'bandpass', [500, 2000]) * np.sin(np.pi * x / 0.35), db(-27), 0.1)
x = tt(1.2); place(2.6, filt(rng.standard_normal(len(x)), 'bandpass', [300, 900]) * np.exp(-x * 2.5), db(-24))
add(norm(filt(np.sign(np.sin(2 * np.pi * 34 * t)) + np.sin(2 * np.pi * 34 * t), 'bandpass', [80, 600])) * win(0, JAM + 0.4, 0.3), db(-30))
# the jam: one distant horn, idling engines
x = tt(0.7); place(JAM + 2.2, filt(np.sin(2 * np.pi * 410 * x) + np.sin(2 * np.pi * 520 * x), 'bandpass', [300, 1800]) * np.clip(x / 0.03, 0, 1) * np.clip((0.7 - x) / 0.05, 0, 1), db(-30), 0.6)
add(filt(rng.standard_normal(N), 'bandpass', [90, 500]) * win(JAM, PIPE + 0.3, 0.4), db(-33))
# the blocked pipe: a low tense drone + a hiss of gas
add(np.sin(2 * np.pi * 110 * t + 0.6 * np.sin(2 * np.pi * 0.7 * t)) * win(PIPE + 1.5, CLEAR + 0.5, 0.8), db(-28)); add(filt(rng.standard_normal(N), 'bandpass', [1200, 3000]) * win(PIPE + 2.0, CLEAR + 1.5, 0.8), db(-36))
for k in range(4): beat(PIPE + 3.0 + k * 0.9, db(-22))
# clearing: brushing snow, then the window motor
for at in np.arange(CLEAR + 0.7, CLEAR + 3.1, 0.3): x = tt(0.22); place(at + rng.uniform(0, 0.05), filt(rng.standard_normal(len(x)), 'bandpass', [600, 2600]) * np.sin(np.pi * x / 0.22), db(-23), -0.2)
x = tt(0.8); place(CLEAR + 3.4, filt(np.sign(np.sin(2 * np.pi * 140 * x)), 'bandpass', [200, 1200]) * np.sin(np.pi * x / 0.8) * 0.6, db(-27), -0.3)
# the engine: on for a burst, off again (fuel beat), soft
eng = filt(np.sign(np.sin(2 * np.pi * 32 * t)) + np.sin(2 * np.pi * 32 * t), 'bandpass', [70, 500])
add(norm(eng) * (win(CLEAR + 3.6, FUEL + 3.4, 0.4) + win(FUEL + 4.0, FUEL + 5.2, 0.3)), db(-28))
# night: flapping cloth, a little louder wind
for at in np.arange(NIGHT + 0.3, COLD, 0.21): x = tt(0.09); place(at + rng.uniform(0, 0.04), filt(rng.standard_normal(len(x)), 'bandpass', [400, 1800]) * np.exp(-x * 30), db(-31), 0.3)
# cold: shivering breaths, a slow heartbeat
for k, at in enumerate(np.arange(COLD + 0.4, WALK, 2.2)): place(at, breath(0.7, 'in', 0.0), db(-22)); place(at + 0.8, breath(1.0, 'out', 0.2, 120) * (1 + 0.3 * np.sin(2 * np.pi * 9 * tt(1.0))), db(-21))
for at in np.arange(COLD + 1.0, WALK, 1.1): beat(at, db(-23))
# dawn: the plow scraping closer, one horn
add(filt(rng.standard_normal(N), 'bandpass', [150, 900]) * sm(DAWN + 0.5, DAWN + 6) * win(DAWN, T_END + 0.3, 0.5), db(-29), 0.4)
x = tt(0.9); place(DAWN + 4.6, filt(np.sin(2 * np.pi * 300 * x) + np.sin(2 * np.pi * 377 * x), 'bandpass', [200, 1600]) * np.clip(x / 0.03, 0, 1) * np.clip((0.9 - x) / 0.06, 0, 1), db(-25), 0.4)
# ONE theme: A minor, quiet; the same line in C major at dawn
mel = np.zeros(N); beat_s = 60 / 68; minor = [69, 72, 76, 74, 72, 71, 69, 64]; major = [72, 76, 79, 77, 76, 74, 72, 67]
k = 0; at = 0.4
while at < T_END - 0.3:
    place(at, piano((major if at >= DAWN else minor)[k % 8], 2.4), db(-27 if at < DAWN else -24), buf=mel); at += beat_s; k += 1
if MUSIC: add(mel, 1.0)
if MUSIC: add(pad([57, 60, 64], 0.0, DAWN + 0.2, 1.5, 1.0), db(-39)); add(pad([60, 64, 67], DAWN - 0.2, DUR, 1.5, 2.0), db(-34))
if MUSIC: place(T_END + 0.2, sum(piano(n, 4.5, 0.5) * a for n, a in [(48, 1), (55, 0.7), (60, 0.6), (64, 0.5), (67, 0.4)]), db(-19))
out = np.stack([L, Rr], 1); out = sosfilt(butter(2, 60, 'highpass', fs=SR, output='sos'), out.T).T
out *= np.clip((DUR - t) / 0.8, 0, 1)[:, None] * np.clip(t / 0.05, 0, 1)[:, None]
out = np.tanh(out * 1.2) / np.tanh(1.2); out /= np.abs(out).max() / 0.92
wavfile.write(sys.argv[1], SR, (out * 32767).astype(np.int16)); print('ok')
