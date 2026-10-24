import numpy as np, sys
from scipy.signal import butter, sosfilt
from scipy.io import wavfile

# "What if you could REALLY touch someone?" — remake (64 s + card), all-new sound: café murmur + one cup clink, a rising scope zoom, buzzing electrons that crackle and
# bounce, a backyard (birds, breeze, hammock rope creak), airport arrivals (PA chime, crowd, rolling suitcase, running steps, a happy sigh), the push powering down,
# the fall (wind + rock swooshes), space hum with a whoosh that peaks at the centre each pass, fusion (tension, a bounce, a warm boom), the café at sunset.
# ONE theme in A major, gentle; it thins out during the fall. Mids only, no repeating high ticks.
SR = 44100; DUR = 67.5; N = int(SR * DUR); t = np.arange(N) / SR
MUSIC = '--no-music' not in sys.argv   # --no-music: sound effects only (no theme, pads or end chord)
rng = np.random.default_rng(707); L = np.zeros(N); Rr = np.zeros(N)
LENS, ATOM, HAM, HUG, OFF, SINK, EARTH, FUSE, ENDS, T_END = 4.0, 8.0, 15.0, 22.0, 28.0, 31.0, 37.0, 49.0, 56.0, 64.0
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
# --- 0-4 and 56-64: café: murmur, one cup clink, warm room; a soft breath as the fingers lock
for a, b in [(0, LENS + 0.6), (ENDS - 0.4, DUR)]: add(BN(150, 1000) * win(a, b, 0.5), db(-36))
for k in range(8): voice(rng.uniform(0, 3.4), rng.uniform(0.6, 1.2), rng.uniform(120, 220), db(-37), rng.uniform(-0.8, 0.8))
for k in range(8): voice(ENDS + rng.uniform(0, 7), rng.uniform(0.6, 1.2), rng.uniform(120, 220), db(-38), rng.uniform(-0.8, 0.8))
x = tt(0.8); place(0.9, (np.sin(2 * np.pi * 1320 * x) + 0.5 * np.sin(2 * np.pi * 2210 * x)) * np.exp(-x * 7), db(-30), 0.5)   # cup on saucer
place(2.5, breath(1.2, 'out', 0.15, 160), db(-24))
# --- 4-8: the scope: a rising shimmer-whoosh, louder as the circle opens
x = tt(4.2); f = 180 * (6 ** (x / 4.2)); place(LENS + 0.2, filt(rng.standard_normal(len(x)), 'bandpass', [300, 3000]) * (x / 4.2) ** 1.5 * np.clip((4.2 - x) / 0.2, 0, 1), db(-24)); place(LENS + 0.2, np.sin(2 * np.pi * np.cumsum(f) / SR) * (x / 4.2) ** 2 * np.clip((4.2 - x) / 0.3, 0, 1), db(-30))
# --- 8-15: atoms: an electron buzz that thickens as the lattices close; the push: crackles + a springy bounce
buzz = np.sin(2 * np.pi * 330 * t + 2 * np.sin(2 * np.pi * 37 * t)) + 0.5 * np.sin(2 * np.pi * 495 * t + 1.5 * np.sin(2 * np.pi * 29 * t))
add(filt(buzz, 'bandpass', [250, 1500]) * win(ATOM - 0.2, HAM + 0.2, 0.4) * (0.5 + 0.5 * sm(ATOM, ATOM + 2.9)), db(-29))
for k in range(26): at = ATOM + 2.9 + rng.uniform(0, 4); x = tt(0.06); place(at, filt(rng.standard_normal(len(x)), 'bandpass', [900, 3200]) * np.exp(-x * 60), db(-25), rng.uniform(-0.6, 0.6))
x = tt(0.7); f = 260 * (1 + 0.5 * np.exp(-x * 5) * np.sin(2 * np.pi * 9 * x)); place(ATOM + 2.95, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 4), db(-20))
# --- 15-22: backyard: breeze, birds, the hammock rope creaking slowly
add(BN(300, 1600) * win(HAM - 0.3, HUG + 0.3, 0.5) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.2 * t)), db(-33))
for k in range(9): at = HAM + 0.3 + k * 0.75 + rng.uniform(0, 0.3); x = tt(0.2); f0 = rng.uniform(1900, 2700); place(at, np.sin(2 * np.pi * np.cumsum(f0 * (1 + 0.3 * np.sin(2 * np.pi * 11 * x))) / SR) * np.sin(np.pi * x / 0.2), db(-31), rng.uniform(-0.6, 0.6))
for at in np.arange(HAM + 0.6, HUG, 2.25): x = tt(0.5); f = 240 + 60 * np.sin(np.pi * x / 0.5); place(at, filt(np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)), 'bandpass', [300, 1400]) * np.sin(np.pi * x / 0.5) * 0.5, db(-31), 0.2)
# --- 22-28: arrivals: PA chime, crowd, suitcase wheels, his running steps, the hug sigh
add(BN(150, 1100) * win(HUG - 0.3, SINK + 0.5, 0.4), db(-33))
for k in range(12): voice(HUG + rng.uniform(0, 8), rng.uniform(0.6, 1.4), rng.uniform(110, 230), db(-36), rng.uniform(-0.8, 0.8))
for n, dt in [(76, 0), (72, 0.45)]: x = tt(1.4); place(HUG + 0.3 + dt, (np.sin(2 * np.pi * hz(n) * x) + 0.3 * np.sin(4 * np.pi * hz(n) * x)) * np.exp(-x * 2.5), db(-24))
add(filt(rng.standard_normal(N), 'bandpass', [120, 500]) * win(HUG, HUG + 1.6, 0.2), db(-30), -0.4)
for k in range(5): step(HUG + 0.4 + k * 0.24, db(-21), 0.4)
place(HUG + 1.8, breath(1.2, 'out', 0.45, 210), db(-20), -0.1); place(HUG + 2.1, breath(1.1, 'out', 0.3, 130), db(-21), 0.1)
# --- 28-31: the push powers down: a falling sweep + a short glitch; the floor gives way
sweep(OFF + 0.3, 1.8, 900, 120, db(-22))
for k in range(8): x = tt(0.05); place(OFF + 1.9 + k * 0.07, filt(rng.standard_normal(len(x)), 'bandpass', [400, 2400]), db(-28))
# --- 31-37: the fall: wind rising with speed, swooshes past rock layers
fall = sm(OFF + 2.4, SINK + 2) * win(OFF + 2.3, EARTH + 0.3, 0.3)
add(filt(rng.standard_normal(N), 'bandpass', [250, 1500]) * fall * (0.6 + 0.4 * sm(SINK, EARTH)), db(-22))
for at in [SINK - 0.4, SINK + 0.6, SINK + 1.4, SINK + 2.1, SINK + 2.7, SINK + 3.2, SINK + 3.7, SINK + 4.1, SINK + 4.5, SINK + 4.9, SINK + 5.3]: x = tt(0.4); place(at, filt(rng.standard_normal(len(x)), 'bandpass', [200, 1200]) * np.exp(-((x - 0.15) / 0.07) ** 2), db(-20), rng.uniform(-0.5, 0.5))
# --- 37-49: space: low hum; each pass a whoosh that peaks at the centre (fastest)
add((np.sin(2 * np.pi * 110 * t) + 0.5 * np.sin(2 * np.pi * 165 * t)) * win(EARTH - 0.3, FUSE + 0.3, 0.8), db(-34))
FALL0, LEG = EARTH + 3.4, 4.0
spd = np.abs(np.sin(np.pi * np.clip(t - FALL0, 0, None) / LEG)) * (t > FALL0) * win(FALL0, FUSE, 0.4)
add(filt(rng.standard_normal(N), 'bandpass', [300, 2200]) * spd ** 2, db(-22))
# --- 49-56: fusion: rising tension, the bounce, the warm boom of a tiny sun
add(filt(rng.standard_normal(N), 'bandpass', [200, 900]) * win(FUSE, FUSE + 3.9, 0.4) * sm(FUSE, FUSE + 3.8), db(-26))
thud(FUSE + 1.6, db(-19), 200, 0.25); x = tt(0.6); f = 300 * (1 + 0.4 * np.exp(-x * 6) * np.sin(2 * np.pi * 8 * x)); place(FUSE + 1.62, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 5), db(-22))
x = tt(2.5); place(FUSE + 3.9, filt(rng.standard_normal(len(x)), 'bandpass', [150, 1200]) * np.exp(-x * 2.2) + 0.6 * np.sin(2 * np.pi * 220 * x) * np.exp(-x * 1.8), db(-18))
add(pad([57, 64, 69], FUSE + 4.0, ENDS + 0.4, 0.3, 0.6, lp=2000), db(-34))
# --- ONE theme: A major, gentle piano; thins during the fall and space (every other note)
mel = np.zeros(N); beat_s = 60 / 80; line = [69, 73, 76, 73, 71, 74, 78, 76, 74, 73, 71, 69]
k = 0; at = 0.4
while at < T_END - 0.3:
    if (OFF + 2.2 <= at < FUSE and k % 2) or ATOM + 2.7 <= at < ATOM + 3.4: at += beat_s; k += 1; continue
    place(at, piano(line[k % len(line)], 2.2), db(-25), buf=mel); at += beat_s; k += 1
if MUSIC: add(mel, 1.0)
if MUSIC: add(pad([57, 61, 64], 0.0, DUR, 2.0, 2.0), db(-38))
if MUSIC: place(T_END + 0.2, sum(piano(n, 4.5, 0.5) * a for n, a in [(45, 1), (52, 0.7), (57, 0.6), (61, 0.5), (64, 0.4)]), db(-19))
out = np.stack([L, Rr], 1); out = sosfilt(butter(2, 60, 'highpass', fs=SR, output='sos'), out.T).T
out *= np.clip((DUR - t) / 0.8, 0, 1)[:, None] * np.clip(t / 0.05, 0, 1)[:, None]
out = np.tanh(out * 1.2) / np.tanh(1.2); out /= np.abs(out).max() / 0.92
wavfile.write(sys.argv[1], SR, (out * 32767).astype(np.int16)); print('ok')
