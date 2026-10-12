import numpy as np, sys
from scipy.signal import butter, sosfilt
from scipy.io import wavfile

# "What if a real zombie showed up on Halloween?" — muffled party, cartoon bites, spooky ostinato over the map, wind in the Rockies
SR = 44100; DUR = 66.0; N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(31)
L = np.zeros(N); Rr = np.zeros(N)
NOTICE, BLOCK, RISE, MAP, CITIES, RURAL, ROCKIES, BACKMAP, T_END = 4.0, 10.0, 16.6, 17.4, 24.0, 31.0, 40.0, 55.0, 62.0
TINF = [5.6, 8.1, 8.9, 10.4, 10.9, 11.6, 12.1, 12.6, 13.0, 13.4, 13.8, 14.1, 14.4, 14.7, 15.0, 15.3, 15.6, 15.9, 16.1, 16.3]

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
def whoosh(at, dur, g, p0, p1, lo=400, hi=4000):
    x = tt(dur); s = filt(rng.standard_normal(len(x)), 'bandpass', [lo, hi]); s = s / (np.abs(s).max() + 1e-9) * np.sin(np.pi * x / dur) ** 2
    i0 = int(at * SR); s = s[:max(0, N - i0)]; pan = np.linspace(p0, p1, len(s))
    L[i0:i0 + len(s)] += s * g * np.sqrt((1 - pan) / 2); Rr[i0:i0 + len(s)] += s * g * np.sqrt((1 + pan) / 2)
def kick(): x = tt(0.3); return np.sin(2 * np.pi * (50 * x + 80 * (1 - np.exp(-x * 30)) / 30)) * np.exp(-x * 10)
def groan(d=1.4, f0=95):
    x = tt(d); f = f0 * (1 + 0.15 * np.sin(2 * np.pi * 0.9 * x) - 0.2 * x / d)
    src = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.5 + 0.3 * rng.standard_normal(len(x))
    v = filt(src, 'bandpass', [250, 900]) + 0.6 * filt(src, 'bandpass', [900, 1600])
    return norm(v) * np.sin(np.pi * x / d) ** 0.7
def pluck(n, d=0.5):
    x = tt(d); f = hz(n); s = sum(np.sin(2 * np.pi * f * k * x) / k ** 1.2 * np.exp(-x * (6 + 3 * k)) for k in range(1, 5)); return s * np.clip(x / 0.002, 0, 1)
def bell(n, d=4.0):
    x = tt(d); f = hz(n); return sum(a * np.sin(2 * np.pi * f * r * x) * np.exp(-x * dd) for a, r, dd in [(1, 1, 0.8), (0.6, 2.76, 1.6), (0.4, 5.4, 2.6), (0.3, 0.5, 0.6)]) * np.clip(x / 0.003, 0, 1)

white = rng.standard_normal(N)
brown = norm(filt(np.cumsum(rng.standard_normal(N)), 'highpass', 20))

# ---------- night street: crickets-free city hum, muffled party (4-on-the-floor through a wall), groans
add(norm(filt(brown, 'lowpass', 400)) * ramp(0, RISE + 0.4, 0.2, 0.4), db(-22))
party = np.zeros(N); beat = 60 / 118
for i in range(int(RISE / beat) + 1):
    at = i * beat; place_k = kick(); i0 = int(at * SR); party[i0:i0 + len(place_k)] += place_k[:max(0, N - i0)]
    for n in ([45, 52, 57] if (i // 4) % 2 == 0 else [43, 50, 55]):
        s = pluck(n + 12, 0.35); party[i0:i0 + len(s)] += 0.25 * s[:max(0, N - i0)]
party = filt(party, 'lowpass', 700)
slow = 1 - 0.75 * np.clip((t - BLOCK) / (RISE - BLOCK), 0, 1)
add(norm(party) * ramp(0, RISE, 0.5, 0.6) * slow, db(-15))
# title sting: low bell + theremin glide
place(0.25, bell(45, 5), db(-12))
x = tt(3.4); f = hz(69) * (1 + 0.5 * np.sin(np.pi * x / 3.4)) * (1 + 0.012 * np.sin(2 * np.pi * 6 * x)); place(0.4, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * x / 3.4) ** 1.5, db(-24), 0.2)
place(2.4, groan(1.6, 90), db(-16), -0.3)
# bites: cartoon chomp + green shimmer per infection (getting denser)
for k, a in enumerate(TINF):
    g = db(-10) if k < 3 else db(-17)
    x = tt(0.09); place(a - 0.05, (np.sin(2 * np.pi * 180 * x) * np.exp(-x * 60) + 0.5 * rng.standard_normal(len(x)) * np.exp(-x * 120)), g)
    x = tt(0.6); place(a, np.sin(2 * np.pi * np.cumsum(900 + 1200 * x / 0.6) / SR) * np.exp(-x * 5) * 0.6 + filt(rng.standard_normal(len(x)), 'bandpass', [4000, 9000]) * np.exp(-x * 7) * 0.4, g * 0.8, rng.uniform(-0.5, 0.5))
    if k % 3 == 0: place(a + 0.35, groan(1.2, rng.uniform(80, 120)), db(-19), rng.uniform(-0.7, 0.7))
# rise to the map
whoosh(RISE - 0.5, 1.4, db(-7), -0.4, 0.4, 200, 6000)
place(MAP, np.sin(2 * np.pi * (55 * tt(3) - 4 * tt(3) ** 2)) * np.exp(-tt(3) * 1.6), db(-6))

# ---------- the map: spooky minor ostinato + drone, low hits as cities fall
BPM = 120; b = 60 / BPM; seq = [57, 60, 64, 60, 57, 60, 65, 60, 56, 59, 64, 59, 55, 59, 62, 59]
ost = np.zeros(N); drone = np.zeros(N)
for i in range(int((ROCKIES - MAP) / (b / 2))):
    at = MAP + 0.2 + i * b / 2; s = pluck(seq[i % len(seq)] + 12, 0.4); i0 = int(at * SR); ost[i0:i0 + len(s)] += s[:max(0, N - i0)]
for i in range(int((T_END - BACKMAP) / (b / 2))):
    at = BACKMAP + 0.2 + i * b / 2; s = pluck(seq[i % len(seq)] + 12, 0.4); i0 = int(at * SR); ost[i0:i0 + len(s)] += s[:max(0, N - i0)]
for n in [33, 40, 45]: drone += np.sin(2 * np.pi * hz(n) * t) + 0.3 * np.sin(2 * np.pi * hz(n) * 2.003 * t)
mapE = ramp(MAP, ROCKIES, 0.4, 0.4) + ramp(BACKMAP, T_END + 0.3, 0.4, 0.5)
add(norm(ost) * mapE * (1 + 0.5 * ramp(RURAL, ROCKIES, 2, 0.3)), db(-20), 0.15)
add(norm(filt(drone, 'lowpass', 600)) * mapE, db(-21))
for k in range(16): place(rng.uniform(CITIES - 0.5, RURAL + 1), np.sin(2 * np.pi * (48 * tt(1.0) - 4 * tt(1.0) ** 2)) * np.exp(-tt(1.0) * 4), db(-14), rng.uniform(-0.6, 0.6))
# counter ticks
for i in range(int((ROCKIES - MAP) * 6)):
    at = MAP + i / 6; x = tt(0.02); place(at, np.sin(2 * np.pi * 2800 * x) * np.exp(-x * 300), db(-33), 0.4)
whoosh(ROCKIES - 0.5, 1.2, db(-9), 0.4, -0.4, 200, 4000)

# ---------- the Rockies: wind, a lonely music-box line, far groans
wind = filt(white, 'bandpass', [180, 1400]) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.17 * t) * np.sin(2 * np.pi * 0.11 * t + 1))
add(norm(wind) * ramp(ROCKIES, BACKMAP, 0.6, 0.5), db(-16))
mb = [76, 79, 83, 81, 79, 76, 74, 76]
for i, n in enumerate(mb * 2):
    at = ROCKIES + 1.0 + i * 0.85
    if at > BACKMAP - 0.6: break
    place(at, bell(n, 2.0) * 0.5, db(-22), 0.2 * np.sin(i))
for a in [47.3, 50.8, 53.1]: place(a, filt(groan(1.8, 85), 'lowpass', 900), db(-25), rng.uniform(-0.6, 0.6))
place(BACKMAP - 0.3, np.sin(2 * np.pi * (50 * tt(2.5) - 4 * tt(2.5) ** 2)) * np.exp(-tt(2.5) * 1.8), db(-8))
# final swell + "comment your state" hit
add(norm(filt(white, 'bandpass', [600, 5000])) * ramp(BACKMAP + 1, 58.6, 3, 0.05) ** 2, db(-22))
place(58.6, kick() * 1.5, db(-4)); place(58.6, bell(57, 4), db(-14))
# end card: toll
place(T_END + 0.1, bell(45, 4.5), db(-10)); place(T_END + 0.1, np.sin(2 * np.pi * 41 * tt(3.5)) * np.exp(-tt(3.5) * 2.0), db(-9))

out = np.stack([L, Rr], 1)
out *= np.clip((DUR - t) / 0.8, 0, 1)[:, None]
out = np.tanh(out * 1.2) / np.tanh(1.2)
out /= np.abs(out).max() / 0.92
wavfile.write(sys.argv[1], SR, (out * 32767).astype(np.int16))
print('ok')
