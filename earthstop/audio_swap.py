import numpy as np, sys
from scipy.signal import butter, sosfilt
from scipy.io import wavfile

# "What if every American and every Brit swapped places?" — comedic march (oom-pah + pizzicato), Westminster chimes,
# Yankee Doodle on a lonely whistle in empty Times Square, crowd + horns in London, sad trombone at the empty shelves.
# Mix kept in the mids (phone speakers) and no repeating clicks under counters.
SR = 44100; DUR = 65.0; N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(7)
L = np.zeros(N); Rr = np.zeros(N)
T_RATIO, T_AIR, T_TELE, T_UKMAP, T_LONDON, T_SHOP, T_TIMES, T_USMAP, T_TALK, T_MID, T_END = 3.0, 8.0, 14.0, 16.0, 26.0, 34.0, 40.0, 45.0, 50.0, 57.0, 61.0

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
def env(x, a=0.005, d=0.3): return np.clip(x / a, 0, 1) * np.exp(-x / d)
def pizz(n, d=0.35): x = tt(d); f = hz(n); return sum(np.sin(2 * np.pi * f * k * x) / k ** 1.1 * np.exp(-x * (9 + 4 * k)) for k in range(1, 6)) * np.clip(x / 0.002, 0, 1)
def tuba(n, d=0.3):
    x = tt(d); f = hz(n); ph = 2 * np.pi * f * x
    s = sum(np.sin(ph * k) / k * (0.9 ** k) for k in range(1, 9))          # rich harmonics so it reads on phone speakers
    return filt(s, 'lowpass', 1400) * np.clip(x / 0.02, 0, 1) * np.exp(-x * 5)
def brass(n, d=0.5, vib=0.0):
    x = tt(d); f = hz(n) * (1 + vib * np.sin(2 * np.pi * 5.5 * x)); ph = 2 * np.pi * np.cumsum(f) / SR
    s = sum(np.sin(ph * k) / k ** 0.9 for k in range(1, 10)); s = filt(s, 'lowpass', 2600)
    return s * np.clip(x / 0.03, 0, 1) * np.clip((d - x) / 0.06, 0, 1)
def whistle(n, d=0.3):
    x = tt(d); f = hz(n) * (1 + 0.006 * np.sin(2 * np.pi * 6 * x)); s = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.05 * rng.standard_normal(len(x))
    return s * np.clip(x / 0.03, 0, 1) * np.clip((d - x) / 0.05, 0, 1)
def bell(n, d=3.0):
    x = tt(d); f = hz(n); return sum(a * np.sin(2 * np.pi * f * r * x) * np.exp(-x * dd) for a, r, dd in [(1, 1, 0.9), (0.55, 2.0, 1.4), (0.35, 2.76, 2.0), (0.25, 5.4, 3.0)]) * np.clip(x / 0.003, 0, 1)
def brush(d=0.12): x = tt(d); return filt(rng.standard_normal(len(x)), 'bandpass', [900, 3500]) * np.exp(-x * 30)
def whoosh(at, dur, g, p0, p1, lo=300, hi=4000):
    x = tt(dur); s = filt(rng.standard_normal(len(x)), 'bandpass', [lo, hi]); s = s / (np.abs(s).max() + 1e-9) * np.sin(np.pi * x / dur) ** 2
    i0 = int(at * SR); s = s[:max(0, N - i0)]; pan = np.linspace(p0, p1, len(s))
    L[i0:i0 + len(s)] += s * g * np.sqrt((1 - pan) / 2); Rr[i0:i0 + len(s)] += s * g * np.sqrt((1 + pan) / 2)

BPM = 116; B = 60 / BPM
# ---------- march bed: oom-pah + pizzicato chords (F major / C7), with gaps for the special moments
PROG = [(53, [65, 69, 72]), (48, [64, 67, 70]), (53, [65, 69, 72]), (48, [64, 67, 70]), (50, [62, 65, 69]), (46, [65, 70, 74]), (48, [64, 67, 72]), (53, [65, 69, 72])]
def march(a, b, g=1.0, drums=True):
    nb = int((b - a) / B)
    for i in range(nb):
        at = a + i * B; bar = (i // 4) % len(PROG); root, ch = PROG[bar]
        if i % 2 == 0: place(at, tuba(root - 12 + (7 if (i // 2) % 2 else 0), 0.35), db(-15) * g)
        else:
            for n in ch: place(at, pizz(n, 0.3), db(-19) * g, rng.uniform(-0.3, 0.3))
        if drums and i % 2 == 1: place(at, brush(), db(-31) * g, 0.2)
march(T_RATIO, T_TELE - 0.2, 1.0)
march(T_UKMAP + 3.6, T_SHOP - 0.2, 0.75)
march(T_USMAP, T_MID - 0.3, 0.85)
# ---------- intro fanfare
for i, (n, d) in enumerate([(65, 0.22), (69, 0.22), (72, 0.22), (77, 0.9)]):
    at = 0.15 + sum(dd for _, dd in [(65, 0.22), (69, 0.22), (72, 0.22), (77, 0.9)][:i])
    for o in (0, -12): place(at, brass(n + o, d + 0.05, 0.004), db(-15 if o == 0 else -19))
whoosh(1.9, 1.2, db(-16), -0.5, 0.5)
# ---------- airlift: jets passing by
for k, at in enumerate([8.4, 9.6, 10.9, 12.2]):
    x = tt(2.2); s = filt(rng.standard_normal(len(x)), 'bandpass', [400, 3000]) * np.sin(np.pi * x / 2.2) ** 3
    place(at, s, db(-19), [-0.8, 0.8][k % 2])
# ---------- teleport: rising sparkle + shimmer
for i in range(16):
    place(T_TELE - 0.3 + i * 0.08, bell(72 + [0, 4, 7, 12][i % 4] + 12 * (i // 8), 1.2), db(-24), np.sin(i))
x = tt(2.5); place(T_TELE + 0.4, filt(rng.standard_normal(len(x)), 'highpass', 2500) * np.sin(np.pi * x / 2.5) ** 2, db(-22))
whoosh(T_TELE + 0.2, 1.6, db(-12), 0.6, -0.6, 300, 6000)
# ---------- Britain: Westminster quarters, then the march returns
WQ = [68, 66, 64, 59, 64, 68, 66, 59, 64, 66, 68, 64, 68, 64, 66, 59]
for i, n in enumerate(WQ):
    if T_UKMAP + 0.3 + i * 0.22 > T_UKMAP + 3.6: break
    place(T_UKMAP + 0.3 + i * 0.22, bell(n, 2.0), db(-16), 0.15)
# ---------- London street: crowd murmur, horns, a bus
murmur = filt(rng.standard_normal(N), 'bandpass', [300, 2200]) * (0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 1.3 * t) * np.sin(2 * np.pi * 0.7 * t + 1)))
add(norm(murmur) * (ramp(T_LONDON, T_SHOP, 0.3, 0.3) + 0.7 * ramp(T_TALK, T_MID, 0.3, 0.3)), db(-19))
def horn(f1, f2, d=0.45): x = tt(d); s = np.sign(np.sin(2 * np.pi * f1 * x)) + np.sign(np.sin(2 * np.pi * f2 * x)); return filt(s, 'lowpass', 2500) * np.clip(x / 0.02, 0, 1) * np.clip((d - x) / 0.05, 0, 1)
for at, f1, f2, p in [(26.8, 392, 494, -0.5), (28.6, 349, 440, 0.6), (29.4, 392, 494, -0.3), (31.5, 330, 415, 0.4), (32.6, 349, 440, -0.6)]: place(at, horn(f1, f2), db(-23), p)
# ---------- shop: shelves emptying (descending pizzicato run), then the sad trombone
for i in range(24): place(T_SHOP + 0.5 + i * 0.18, pizz(84 - i, 0.25), db(-24), np.sin(i * 0.7) * 0.5)
for i, (n, d) in enumerate([(58, 0.5), (57, 0.5), (56, 0.5), (55, 1.4)]):
    place(37.4 + i * 0.52, brass(n, d, 0.012 if i == 3 else 0.004), db(-13))
# ---------- empty Times Square: wind + Yankee Doodle on a lonely whistle
add(norm(filt(rng.standard_normal(N), 'bandpass', [250, 1200])) * ramp(T_TIMES, T_USMAP + 0.2, 0.5, 0.5) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.3 * t)), db(-21))
YD = [(72, 1), (72, 1), (74, 1), (76, 1), (72, 1), (76, 1), (74, 2), (72, 1), (72, 1), (74, 1), (76, 1), (72, 2), (71, 2)]
e8 = 0.27; at = T_TIMES + 0.4
for n, k in YD:
    place(at, whistle(n + 12, e8 * k * 0.95), db(-17), 0.1); at += e8 * k
# ---------- USA map: Yankee Doodle on brass over the march
YD2 = [(72, 1), (72, 1), (74, 1), (76, 1), (72, 1), (76, 1), (74, 1), (67, 1), (72, 1), (72, 1), (74, 1), (76, 1), (72, 2), (71, 2),
       (72, 1), (72, 1), (74, 1), (76, 1), (77, 1), (76, 1), (74, 1), (72, 1), (71, 1), (67, 1), (69, 1), (71, 1), (72, 2), (72, 2)]
at = T_USMAP + 0.1
for n, k in YD2:
    if at > T_TALK - 0.3: break
    place(at, brass(n, B / 2 * k * 0.9, 0.003), db(-17), -0.15); at += B / 2 * k
# ---------- talk: little "boing" on each line
def boing(f0=300, d=0.35): x = tt(d); f = f0 * (1 + 0.6 * np.exp(-x * 12) * np.sin(2 * np.pi * 14 * x)); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 7)
for at in [50.4, 51.9, 53.8, 55.2]: place(at, boing(330 if at in (50.4, 53.8) else 440), db(-20))
# ---------- midnight: chimes + three strikes, everyone flies home
for i, n in enumerate([64, 68, 66, 59]): place(T_MID + 0.1 + i * 0.45, bell(n, 2.5), db(-15), -0.1)
for i in range(3): place(T_MID + 2.1 + i * 0.6, bell(52, 2.4), db(-14))
whoosh(T_MID + 0.4, 2.0, db(-15), -0.6, 0.6, 300, 5000)
# ---------- end card: final cadence (F major) + bell
for n in [53, 65, 69, 72, 77]: place(T_END + 0.15, brass(n, 2.2, 0.004), db(-19))
place(T_END + 0.15, bell(77, 3.5), db(-17))

out = np.stack([L, Rr], 1)
out = filt(out.T, 'highpass', 70).T                                       # nothing useful for phones below ~70 Hz
out *= np.clip((DUR - t) / 0.8, 0, 1)[:, None]
out = np.tanh(out * 1.2) / np.tanh(1.2)
out /= np.abs(out).max() / 0.92
wavfile.write(sys.argv[1], SR, (out * 32767).astype(np.int16))
print('ok')
