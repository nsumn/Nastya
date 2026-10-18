import numpy as np, sys
from scipy.signal import butter, sosfilt
from scipy.io import wavfile

# "What if the ocean drained?" — surf + gulls, the plug pops and its chain clanks, a whirlpool roar and gurgle, fish slaps and shouting,
# ship-hull groans, seabed wind, a rolling salt storm, quiet space, a waterfall that dwindles, a supermarket hum, trucks on the ice road,
# the Mediterranean flood. One slow piano theme (E minor). Mostly 200 Hz - 3 kHz; no steady high ticks.
SR = 44100; DUR = 68.5; N = int(SR * DUR); t = np.arange(N) / SR
rng = np.random.default_rng(1335); L = np.zeros(N); Rr = np.zeros(N)
RECEDE, FISH, SHIPS, CABLES, SALT, GLOBE, RIVER, STORE, ICE, MED, TEND = 4.0, 10.0, 17.0, 23.0, 29.0, 36.0, 43.0, 50.0, 55.0, 60.0, 63.0
def filt(x, kind, f, order=2): return sosfilt(butter(order, f, kind, fs=SR, output='sos'), x)
def db(x): return 10 ** (x / 20)
def ramp(a, b, fa=0.4, fb=0.4): return np.clip((t - a) / max(fa, 1e-3), 0, 1) * np.clip((b - t) / max(fb, 1e-3), 0, 1)
def norm(x): return x / (np.abs(x).max() + 1e-9)
def tt(d): return np.arange(int(d * SR)) / SR
def place(at, sig, g=1.0, pan=0.0):
    i0 = int(at * SR)
    if i0 >= N or i0 < 0: return
    s = sig[:N - i0]; L[i0:i0 + len(s)] += s * g * np.sqrt((1 - pan) / 2); Rr[i0:i0 + len(s)] += s * g * np.sqrt((1 + pan) / 2)
def add(sig, g=1.0, pan=0.0):
    global L, Rr
    L += sig * g * np.sqrt((1 - pan) / 2); Rr += sig * g * np.sqrt((1 + pan) / 2)
def hz(n): return 440 * 2 ** ((n - 69) / 12)
def noise(d, lo, hi): return norm(filt(rng.standard_normal(int(d * SR)), 'bandpass', [lo, hi]))
BN = lambda lo, hi: norm(filt(rng.standard_normal(N), 'bandpass', [lo, hi]))
def whoosh(at, dur, g, lo=300, hi=3000, p0=0, p1=0):
    x = tt(dur); s = noise(dur, lo, hi) * np.sin(np.pi * x / dur) ** 2; i0 = int(at * SR); s = s[:max(0, N - i0)]; pan = np.linspace(p0, p1, len(s))
    L[i0:i0 + len(s)] += s * g * np.sqrt((1 - pan) / 2); Rr[i0:i0 + len(s)] += s * g * np.sqrt((1 + pan) / 2)
def thud(d=0.5, f=100): x = tt(d); return (np.sin(2 * np.pi * f * x * (1 - 0.3 * x)) + 0.7 * np.sin(2 * np.pi * 2.3 * f * x)) * np.exp(-x * 8) + 0.6 * noise(d, 200, 1500) * np.exp(-x * 12)
def piano(n, d=2.5, b=1.0): x = tt(d); f = hz(n); return (np.sin(2 * np.pi * f * x) + 0.35 * b * np.sin(4 * np.pi * f * x) + 0.12 * b * np.sin(6 * np.pi * f * x)) * np.exp(-x * 1.8) * np.clip(x / 0.006, 0, 1)
def pad(chord, a, b, fa=1.0, fb=1.0, lp=1500): return filt(sum(np.sin(2 * np.pi * hz(n) * t) + 0.4 * np.sin(2 * np.pi * hz(n) * 1.004 * t) for n in chord), 'lowpass', lp) * ramp(a, b, fa, fb)
# ---- beach: surf + gulls; the surf thins out as the water leaves
surf = filt(BN(150, 2500), 'lowpass', 1500) * (0.55 + 0.45 * np.sin(2 * np.pi * 0.14 * t) ** 2)
add(surf * ramp(-1, FISH, 0.01, 2.5), db(-20))
for at in [0.6, 1.9, 3.1, 7.4, 11.8]:
    x = tt(0.45); f = 1400 + 500 * np.sin(np.pi * x / 0.45) - 300 * x; place(at, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * x / 0.45) ** 1.2 * (0.6 + 0.4 * np.sin(2 * np.pi * 9 * x)), db(-27), rng.uniform(-0.7, 0.7))
# ---- the plug: chain clanks, a deep pop, then the whirlpool roar + draining gurgle
for at in np.linspace(0.8, 3.0, 9) + rng.uniform(-0.05, 0.05, 9): x = tt(0.25); place(at, sum(np.sin(2 * np.pi * f * x) * a for f, a in [(620, 1), (1130, 0.5), (1710, 0.25)]) * np.exp(-x * 18), db(-27), 0.1)
place(3.25, thud(0.9, 70) + 0.6 * noise(0.9, 300, 2000) * np.exp(-tt(0.9) * 5), db(-12))
roar = filt(BN(80, 900), 'lowpass', 700) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.8 * t))
add(roar * ramp(3.3, SHIPS + 1, 1.0, 2.5), db(-20))
pt = RECEDE
while pt < FISH + 3: x = tt(0.18); f = rng.uniform(180, 420); place(pt, np.sin(2 * np.pi * f * x * (1 + 1.6 * x)) * np.exp(-x * 16), db(-26), rng.uniform(-0.5, 0.5)); pt += rng.exponential(0.16)
# ---- fish slaps (irregular, soft) + shouting volunteers
pt = FISH - 1
while pt < SHIPS: x = tt(0.07); place(pt, noise(0.07, 400, 2200) * np.exp(-x * 60) + 0.5 * np.sin(2 * np.pi * 240 * x) * np.exp(-x * 50), db(-24), rng.uniform(-0.8, 0.8)); pt += rng.exponential(0.11)
def shout(d, f0):
    x = tt(d); f = f0 * (1 + 0.15 * np.sin(2 * np.pi * 3 * x)); s = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.4 + np.sin(2 * np.pi * np.cumsum(f) / SR); s = filt(s, 'bandpass', [400, 2200]); return s * np.sin(np.pi * x / d) ** 1.5
for i in range(9): place(FISH + rng.uniform(0, 6.5), shout(rng.uniform(0.4, 0.8), rng.uniform(220, 340)), db(-28), rng.uniform(-0.7, 0.7))
# ---- ships: hull groans and a container toppling
for at in [17.6, 19.4, 21.2]: x = tt(1.6); f = rng.uniform(110, 160) * (1 - 0.2 * x / 1.6); place(at, filt(np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)), 'lowpass', 900) * np.sin(np.pi * x / 1.6) * (0.6 + 0.4 * np.sin(2 * np.pi * 7 * x)), db(-24), rng.uniform(-0.5, 0.5))
place(20.3, thud(0.8, 90), db(-16), 0.3)
# ---- seabed wind, then the salt storm rolling in
add(BN(300, 1600) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.21 * t) ** 2) * ramp(SHIPS, GLOBE, 1.0, 0.6), db(-27))
storm = BN(200, 2200) * np.clip((t - SALT) / 5.0, 0, 1) ** 1.3 * ramp(SALT, GLOBE, 0.5, 0.8); add(storm, db(-19))
# ---- space: hush; a soft swirl as the hurricane falls apart
whoosh(GLOBE + 0.6, 3.0, db(-24), 300, 2200, 0.5, -0.5)
# ---- waterfall roar that dwindles
fallsnd = BN(200, 3000) * (1 - 0.85 * np.clip((t - (RIVER + 3)) / 4.0, 0, 1)) * ramp(RIVER, STORE, 0.5, 0.5); add(fallsnd, db(-19))
# ---- supermarket: fridge hum + murmur + a cart squeak or two (soft, irregular)
add(filt(np.sin(2 * np.pi * 240 * t) + 0.5 * np.sin(2 * np.pi * 360 * t), 'lowpass', 900) * ramp(STORE, ICE), db(-32)); add(BN(250, 1500) * ramp(STORE, ICE), db(-29))
for at in [51.2, 53.0]: x = tt(0.25); place(at, np.sin(2 * np.pi * np.cumsum(900 + 200 * np.sin(2 * np.pi * 11 * x)) / SR) * np.sin(np.pi * x / 0.25), db(-31), 0.4)
# ---- Antarctica: wind + truck engines (harmonics so phones hear them)
eng = filt(sum(np.sin(2 * np.pi * f * t) * a for f, a in [(110, 0.6), (220, 1), (330, 0.6), (440, 0.3)]) * (0.8 + 0.2 * np.sin(2 * np.pi * 9 * t)), 'lowpass', 1200)
add(eng * ramp(ICE, MED, 0.5, 0.5), db(-27)); add(BN(400, 2000) * ramp(ICE, MED), db(-27))
# ---- the Mediterranean flood
add(filt(BN(120, 2500), 'lowpass', 1600) * np.clip((t - MED - 0.3) / 1.5, 0, 1) * ramp(MED, TEND + 0.5, 0.3, 0.8), db(-18))
# ---- theme: 72 bpm, E minor, one melody from the drain to the end
beat = 60 / 72; mel = [64, 67, 71, 69, 67, 66, 64, 59, 64, 67, 71, 74, 72, 71, 69, 67]
k = 0; at = RECEDE + 0.3
while at < TEND:
    lv = -24 + 5 * min(1, (at - RECEDE) / 30)
    place(at, piano(mel[k % 16]), db(lv), 0.15 if k % 2 else -0.15)
    if k % 4 == 0: place(at, piano(mel[k % 16] - 24, 3.5, 0.5), db(lv - 1))
    at += beat; k += 1
for a, b, c in [(RECEDE, SALT, [52, 59, 64]), (SALT, RIVER, [48, 55, 60]), (RIVER, ICE, [45, 52, 57]), (ICE, DUR, [52, 59, 64, 67])]: add(pad(c, a, b, 0.6, 0.6), db(-29))
place(TEND + 0.2, sum(piano(n, 5.0, 0.5) * a for n, a in [(52, 1), (59, 0.7), (64, 0.6), (67, 0.5)]), db(-21)); add(pad([52, 59, 64, 67], TEND, DUR, 0.3, 2.5), db(-25))
for T in [GLOBE, RIVER, STORE, ICE, MED]: whoosh(T - 0.4, 0.9, db(-22), 300, 2800, -0.3, 0.3)
out = np.stack([L, Rr], 1); out = sosfilt(butter(2, 60, 'highpass', fs=SR, output='sos'), out.T).T
out *= np.clip((DUR - t) / 0.8, 0, 1)[:, None] * np.clip(t / 0.05, 0, 1)[:, None]
out = np.tanh(out * 1.2) / np.tanh(1.2); out /= np.abs(out).max() / 0.92
wavfile.write(sys.argv[1], SR, (out * 32767).astype(np.int16)); print('ok')
