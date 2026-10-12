import numpy as np, sys
from scipy.signal import butter, sosfilt
from scipy.io import wavfile

# "What if a 1-mile asteroid hit Times Square?" — street hum, rising roar, the hit, tinnitus, rumble bed, quake, wind, rock rain, calm finale
SR = 44100; DUR = 65.0; N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(42)
L = np.zeros(N); Rr = np.zeros(N)
T_SCALE, T_SPACE, T_DESC, IMPACT, T_MAP, T_FIREB, T_CRATER, T_HEAT, T_QUAKE, T_BLAST, T_EJECT, T_DUST, T_CALM, T_END = 3.2, 8.0, 11.2, 12.6, 13.6, 20.0, 26.0, 33.0, 39.0, 45.0, 52.0, 54.5, 57.0, 61.0

def filt(x, kind, f, order=2): return sosfilt(butter(order, f, kind, fs=SR, output='sos'), x)
def db(x): return 10 ** (x / 20)
def ramp(a, b, fa, fb): return np.clip((t - a) / max(fa, 1e-3), 0, 1) * np.clip((b - t) / max(fb, 1e-3), 0, 1)
def norm(x): return x / (np.abs(x).max() + 1e-9)
def tt(d): return np.arange(int(d * SR)) / SR
def place(at, sig, g=1.0, pan=0.0):
    i0 = int(at * SR)
    if i0 >= N or i0 < 0: return
    s = sig[:N - i0]
    L[i0:i0 + len(s)] += s * g * np.sqrt((1 - pan) / 2); Rr[i0:i0 + len(s)] += s * g * np.sqrt((1 + pan) / 2)
def add(sig, g=1.0, pan=0.0):
    global L, Rr
    L += sig * g * np.sqrt((1 - pan) / 2); Rr += sig * g * np.sqrt((1 + pan) / 2)
def hz(n): return 440 * 2 ** ((n - 69) / 12)
def whoosh(at, dur, g, p0, p1, lo=300, hi=5000):
    x = tt(dur); s = filt(rng.standard_normal(len(x)), 'bandpass', [lo, hi]); s = s / (np.abs(s).max() + 1e-9) * np.sin(np.pi * x / dur) ** 2
    i0 = int(at * SR); s = s[:max(0, N - i0)]; pan = np.linspace(p0, p1, len(s))
    L[i0:i0 + len(s)] += s * g * np.sqrt((1 - pan) / 2); Rr[i0:i0 + len(s)] += s * g * np.sqrt((1 + pan) / 2)
def boom(d=3.0, f0=42):
    x = tt(d); return np.sin(2 * np.pi * (f0 * x + 60 * (1 - np.exp(-x * 12)) / 12)) * np.exp(-x * 1.6)
def thud(d=0.35, f0=70):
    x = tt(d); return (np.sin(2 * np.pi * (f0 * x + 40 * (1 - np.exp(-x * 25)) / 25)) + 0.3 * rng.standard_normal(len(x)) * np.exp(-x * 40)) * np.exp(-x * 12)
def bell(n, d=4.0):
    x = tt(d); f = hz(n); return sum(a * np.sin(2 * np.pi * f * r * x) * np.exp(-x * dd) for a, r, dd in [(1, 1, 0.8), (0.6, 2.76, 1.6), (0.4, 5.4, 2.6), (0.3, 0.5, 0.6)]) * np.clip(x / 0.003, 0, 1)
def pad(notes, a, b, fa=1.0, fb=1.0, bright=900):
    x = np.zeros(N)
    for n in notes:
        for det in (-0.07, 0.0, 0.07): x += np.sin(2 * np.pi * hz(n + det) * t + rng.uniform(0, 6)) + 0.35 * np.sin(2 * np.pi * hz(n + det) * 2 * t)
    return norm(filt(x, 'lowpass', bright)) * ramp(a, b, fa, fb)

white = rng.standard_normal(N)
brown = norm(filt(np.cumsum(rng.standard_normal(N)), 'highpass', 20))
street = (t < T_SCALE + 0.2) | ((t >= T_DESC) & (t < IMPACT))

# ---------- Times Square: traffic hum, crowd murmur, a couple of horns
hum = norm(filt(brown, 'lowpass', 500)) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.3 * t))
murmur = norm(filt(white, 'bandpass', [300, 2500]) * (0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 1.7 * t) * np.sin(2 * np.pi * 0.9 * t + 1))))
add(hum * (ramp(0, T_SCALE + 0.2, 0.2, 0.3) + ramp(T_DESC, IMPACT, 0.1, 0.02)), db(-21))
add(murmur * (ramp(0, T_SCALE + 0.2, 0.3, 0.3) + ramp(T_DESC, IMPACT, 0.1, 0.02) * 1.4), db(-27))
for at, f, pan in [(0.9, 392, -0.5), (2.2, 330, 0.6)]:
    x = tt(0.35); place(at, np.sign(np.sin(2 * np.pi * f * x)) * 0.4 * np.clip(x / 0.02, 0, 1) * np.clip((0.35 - x) / 0.05, 0, 1), db(-30), pan)
# title sting
place(0.15, boom(3.5, 36), db(-10)); place(0.15, bell(38, 5), db(-16))
# ---------- tension bed (D minor), from the scale shot to the calm
bed = pad([38, 45, 50, 53], T_SCALE - 0.3, T_CALM + 0.2, 1.2, 1.0, 700)
duck = 1 - 0.85 * ramp(IMPACT - 0.05, T_MAP + 0.8, 0.02, 1.2)
add(bed * duck, db(-20))
BPM = 100; b = 60 / BPM
for i in range(int((T_CALM - T_SCALE) / b)):
    at = T_SCALE + i * b
    if IMPACT - 0.3 < at < T_MAP + 1.2: continue
    g = db(-15) if at > T_MAP else db(-19)
    place(at, thud(0.5, 48), g)
    if at > T_HEAT and i % 2 == 0: place(at + b / 2, thud(0.3, 62), g * 0.5)
# ostinato on the map
seq = [62, 65, 69, 65, 62, 65, 70, 65, 61, 64, 69, 64, 62, 65, 69, 72]
for i in range(int((T_DUST - T_HEAT) / (b / 2))):
    at = T_HEAT + i * b / 2; x = tt(0.4); f = hz(seq[i % len(seq)])
    place(at, sum(np.sin(2 * np.pi * f * k * x) / k ** 1.3 * np.exp(-x * (7 + 3 * k)) for k in range(1, 5)), db(-27), 0.25 * np.sin(i))
# ---------- scale shot / space: airy whoosh transitions
whoosh(T_SCALE - 0.4, 1.0, db(-12), -0.5, 0.5)
whoosh(T_SPACE - 0.4, 1.0, db(-12), 0.5, -0.5)
whoosh(T_DESC - 0.3, 0.7, db(-14), -0.3, 0.3)
# plasma: hiss + crackle, rising from entry to impact
plasma = filt(white, 'bandpass', [1500, 9000]) * (1 + 3 * (rng.random(N) < 0.002))
add(norm(plasma) * ramp(T_SPACE, IMPACT, 0.4, 0.02) * np.clip((t - T_SPACE) / (IMPACT - T_SPACE), 0, 1) ** 2, db(-22))
# the roar of the fall: band sweeping upward + sub
x = np.clip((t - T_SPACE) / (IMPACT - T_SPACE), 0, 1)
roar = filt(brown, 'lowpass', 1400) * x ** 2.5 + 0.5 * filt(white, 'bandpass', [200, 2000]) * x ** 4
add(norm(roar) * (t < IMPACT) * (t > T_SPACE), db(-9))
add(np.sin(2 * np.pi * (30 + 25 * x) * t) * x ** 3 * (t < IMPACT) * (t > T_SPACE), db(-12))
# ---------- IMPACT
place(IMPACT, boom(6.0, 30), db(-1))
place(IMPACT, norm(filt(rng.standard_normal(int(SR * 5)), 'lowpass', 900)) * np.exp(-tt(5) * 0.9), db(-4))
place(IMPACT, norm(rng.standard_normal(int(SR * 0.4))) * np.exp(-tt(0.4) * 9), db(-6))
# tinnitus during the white flash
x = tt(3.5); place(IMPACT + 0.25, np.sin(2 * np.pi * 3950 * x) * np.clip(x / 0.3, 0, 1) * np.exp(-x * 0.9), db(-30))
# rumble bed after the impact (fireball, crater)
rumble = norm(filt(brown, 'lowpass', 160)) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.21 * t))
add(rumble * ramp(T_MAP - 0.5, T_HEAT + 1, 1.0, 1.5), db(-12))
add(norm(filt(white, 'bandpass', [80, 600])) * ramp(T_MAP, T_CRATER, 0.6, 2.5), db(-22))
# energy counter ticks
for i in range(int(1.6 * 14)):
    xx = tt(0.02); place(T_MAP + 0.2 + i / 14, np.sin(2 * np.pi * 2600 * xx) * np.exp(-xx * 300), db(-30), 0.4)
for at in [16.8, 18.4, T_FIREB, T_CRATER]: place(at, boom(2.5, 44), db(-11)); place(at, bell(50, 3), db(-22))
# melt bubbling in the crater
for k in range(70):
    at = rng.uniform(T_CRATER - 1, T_HEAT); xx = tt(0.12); place(at, np.sin(2 * np.pi * np.cumsum(rng.uniform(150, 400) * (1 + 2 * xx)) / SR) * np.exp(-xx * 30), db(-30), rng.uniform(-0.6, 0.6))
# heat: bright sizzle swell
add(norm(filt(white, 'highpass', 3000)) * ramp(T_HEAT, T_QUAKE, 0.3, 1.5) * (0.6 + 0.4 * np.sin(2 * np.pi * 6 * t)), db(-29))
whoosh(T_HEAT - 0.2, 1.2, db(-11), -0.4, 0.4, 600, 8000)
# quake: shaking sub, two swells (passes New York area, then Boston)
qenv = ramp(T_QUAKE, T_BLAST, 0.3, 0.8) * (0.5 + 0.5 * np.clip(np.sin(np.pi * (t - T_QUAKE) / (T_BLAST - T_QUAKE)), 0, 1))
shake = filt(brown, 'lowpass', 90) * (1 + 0.6 * np.sin(2 * np.pi * 7 * t))
add(norm(shake) * qenv, db(-8))
for i in range(int((T_BLAST - T_QUAKE) * 4)):
    xx = tt(0.03); place(T_QUAKE + i / 4, np.sin(2 * np.pi * 1800 * xx) * np.exp(-xx * 200), db(-31), -0.4)
place(T_QUAKE + 0.1, boom(3.0, 34), db(-6))
place(T_QUAKE + 0.3 + (60 / 70) * (T_BLAST - T_QUAKE - 0.6), boom(2.0, 40), db(-10))
# air blast: wind roar + front whoosh
wind = filt(white, 'bandpass', [150, 1600]) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.5 * t) * np.sin(2 * np.pi * 0.23 * t + 1))
add(norm(wind) * ramp(T_BLAST, T_EJECT + 0.5, 0.4, 0.8), db(-12))
whoosh(T_BLAST - 0.1, 2.2, db(-6), -0.6, 0.6, 150, 3000)
for i in range(int((T_EJECT - T_BLAST) * 4)):
    xx = tt(0.03); place(T_BLAST + i / 4, np.sin(2 * np.pi * 1800 * xx) * np.exp(-xx * 200), db(-31), -0.4)
for at in [T_BLAST + 0.3 + 419 / 1000 * (T_EJECT - T_BLAST - 0.8), T_BLAST + 0.3 + 920 / 1000 * (T_EJECT - T_BLAST - 0.8)]: place(at, boom(2.0, 46), db(-9)); place(at, bell(57, 2.5), db(-22))
# rock rain: lots of small thuds and hisses
for k in range(160):
    at = rng.uniform(T_EJECT + 0.1, T_DUST); place(at, thud(0.3, rng.uniform(55, 110)), db(-22) * rng.uniform(0.4, 1), rng.uniform(-0.8, 0.8))
    if k % 4 == 0: whoosh(at - 0.25, 0.3, db(-30), rng.uniform(-0.8, 0.8), 0, 2000, 8000)
# dust: hollow wind, dark pad
add(norm(filt(white, 'bandpass', [200, 900])) * ramp(T_DUST, T_CALM + 0.3, 0.6, 0.6), db(-19))
whoosh(T_DUST - 0.4, 1.0, db(-12), 0.4, -0.4)
# ---------- calm: hopeful major pad + soft bells
add(pad([50, 57, 62, 66], T_CALM - 0.2, T_END + 0.5, 1.0, 0.8, 1400), db(-17))
for i, n in enumerate([74, 78, 81, 86, 81, 78, 74, 78]):
    place(T_CALM + 0.3 + i * 0.45, bell(n, 2.2) * 0.5, db(-22), 0.3 * np.sin(i))
# ---------- end card toll
place(T_END + 0.1, bell(38, 4.5), db(-11)); place(T_END + 0.1, boom(3.5, 36), db(-8))

out = np.stack([L, Rr], 1)
out *= np.clip((DUR - t) / 0.8, 0, 1)[:, None]
out = np.tanh(out * 1.2) / np.tanh(1.2)
out /= np.abs(out).max() / 0.92
wavfile.write(sys.argv[1], SR, (out * 32767).astype(np.int16))
print('ok')
