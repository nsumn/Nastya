import numpy as np, sys
from scipy.signal import butter, sosfilt
from scipy.io import wavfile

# "POV: Du springst aus 39 km Höhe" (15.6 s): helmet breathing + faint radio at the capsule door, push-off, wind that grows with speed and
# air density (silent dip at Mach 1 — you hear nothing), whooshing flat spin with fast heartbeat + panting, stabilise, one tense piano line.
SR = 44100; DUR = 15.8; N = int(SR * DUR); t = np.arange(N) / SR
rng = np.random.default_rng(39); L = np.zeros(N); Rr = np.zeros(N)
JUMP, MACH, SPIN, STAB, CARD, J_END = 3.4, 7.4, 9.0, 12.2, 14.0, 15.6
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
def piano(n, d=2.5, b=1.0): x = tt(d); f = hz(n); return (np.sin(2 * np.pi * f * x) + 0.35 * b * np.sin(4 * np.pi * f * x) + 0.12 * b * np.sin(6 * np.pi * f * x)) * np.exp(-x * 1.8) * np.clip(x / 0.006, 0, 1)
def pad(chord, a, b, fa=1.0, fb=1.0, lp=1400): return filt(sum(np.sin(2 * np.pi * hz(n) * t) + 0.4 * np.sin(2 * np.pi * hz(n) * 1.004 * t) for n in chord), 'lowpass', lp) * ramp(a, b, fa, fb)
def beat(at, g):  # heartbeat lub-dub, given harmonics so phones hear it
    for k, (dt, a) in enumerate([(0, 1.0), (0.22, 0.7)]):
        x = tt(0.25); s = (np.sin(2 * np.pi * 70 * x) + 0.8 * np.sin(2 * np.pi * 140 * x) + 0.5 * np.sin(2 * np.pi * 280 * x)) * np.exp(-x * 22); place(at + dt, s * a, g)
# ---- breathing: formant-filtered noise; inhale = airier and rising, exhale = lower and falling; HELM() adds the small-helmet colour
def bpn(x, lo, hi): return filt(x, 'bandpass', [lo, hi])
def breath(d, kind='out', voice=0.0, f0=130):
    x = tt(d); n = rng.standard_normal(len(x))
    if kind == 'in': s = 0.8 * norm(bpn(n, 1400, 3600)) + 0.6 * norm(bpn(n, 600, 1300)); env = np.clip(x / (0.75 * d), 0, 1) ** 1.6 * np.clip((d - x) / 0.06, 0, 1)
    else: s = 0.9 * norm(bpn(n, 450, 1100)) + 0.5 * norm(bpn(n, 1100, 2200)); env = np.clip(x / 0.08, 0, 1) * np.exp(-x * 2.2 / d) * np.clip((d - x) / 0.15, 0, 1)
    if voice: s = s + voice * norm(filt(np.sign(np.sin(2 * np.pi * f0 * (1 - 0.08 * x / d) * x)), 'bandpass', [180, 1200]))
    return norm(s * env)
def HELM(x):
    y = x.copy()
    for ms, g in [(5.5, 0.45), (9.0, 0.3), (14.0, 0.18)]: k = int(SR * ms / 1000); y[k:] += g * x[:-k]
    return filt(y, 'lowpass', 3200)
def MUF(x): return filt(x, 'lowpass', 700)   # bone-conducted, no air around you
def cough(at, g, pan=0.0):
    x = tt(0.35); s = norm(bpn(rng.standard_normal(len(x)), 300, 2600) + 0.6 * filt(np.sign(np.sin(2 * np.pi * 150 * x)), 'bandpass', [200, 1000])) * np.clip(x / 0.01, 0, 1) * np.exp(-x * 9); place(at, s, g, pan)
def gulp(at, g):
    x = tt(0.22); f = 260 * np.exp(-x * 3); s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 14) + 0.3 * norm(bpn(rng.standard_normal(len(x)), 300, 900)) * np.exp(-x * 20); place(at, s, g)
def sm(a, b): return np.clip((t - a) / (b - a), 0, 1) ** 2 * (3 - 2 * np.clip((t - a) / (b - a), 0, 1))
# capsule door: calm then tense helmet breathing, radio hiss and two low radio blips, a suit rustle + push-off
for at, kind, d, g in [(0.1, 'in', 0.9, -21), (1.05, 'out', 1.0, -22), (2.15, 'in', 0.6, -20), (2.8, 'out', 0.4, -23), (3.05, 'in', 0.32, -18)]: place(at, HELM(breath(d, kind)), db(g))
add(BN(800, 3000) * ramp(0, CARD, 0.2, 0.5), db(-41))
for at, f in [(1.6, 620), (1.75, 470)]: x = tt(0.16); place(at, np.sin(2 * np.pi * f * x) * np.exp(-x * 30), db(-30))
x = tt(0.25); place(JUMP - 0.05, filt(np.sin(2 * np.pi * 170 * x) + 0.6 * noise(0.25, 200, 1500), 'lowpass', 1600) * np.exp(-x * 18), db(-17))
add(BN(700, 3000) * (0.5 + 0.5 * np.sin(2 * np.pi * 1.9 * t) ** 2) * ramp(JUMP - 0.3, JUMP + 1.2, 0.2, 0.5), db(-30))
# wind: grows with speed and denser air; flutters; drops out around Mach 1 (the sound can't catch you), then returns; whooshes with the spin
w = filt(rng.standard_normal(N), 'bandpass', [300, 2600]); w = norm(w) * (0.75 + 0.25 * np.sin(2 * np.pi * 3.1 * t + 2 * np.sin(2 * np.pi * 0.7 * t)))
env = sm(JUMP, JUMP + 3.5) * 0.6 + 0.4 * sm(MACH + 0.8, STAB + 1.5)
env *= 1 - 0.9 * np.exp(-((t - (MACH + 0.35)) / 0.5) ** 2)
spin = sm(SPIN - 0.3, SPIN + 0.9) * (1 - sm(STAB - 0.9, STAB + 0.4)); env *= 1 + 0.9 * spin * np.maximum(0, np.sin(2 * np.pi * 1.0 * (t - SPIN))) ** 2
add(w * env * (1 - sm(CARD - 0.2, CARD + 0.6)), db(-19), 0.0)
add(filt(rng.standard_normal(N), 'bandpass', [1500, 4000]) * env * 0.4 * (1 - sm(CARD - 0.2, CARD + 0.6)), db(-34), 0.2)
# body: heartbeat speeds up into the spin; panting during the spin, a long relieved exhale after
at = JUMP + 0.3; per = 0.66
while at < CARD:
    beat(at, db(-18 + 3 * float(SPIN < at < STAB))); per = 0.42 if SPIN < at < STAB + 0.5 else max(0.48, per - 0.01); at += per
at = SPIN + 0.3
while at < STAB - 0.2: place(at, HELM(breath(0.3, 'in', 0.2, 150)), db(-20)); place(at + 0.32, HELM(breath(0.34, 'out', 0.2, 140)), db(-21)); at += 0.72
place(STAB + 0.2, HELM(breath(1.5, 'out', 0.25, 120)), db(-18)); place(STAB + 1.8, HELM(breath(0.9, 'in')), db(-22))
# one tense piano line: A minor arpeggio pulse, rising one step at the spin; resolves on the end card
beat_s = 60 / 104 / 2; seq = [57, 64, 69, 64, 57, 64, 69, 72]
k = 0; at = 0.3
while at < CARD - 0.2:
    shift = 2 if SPIN <= at < STAB else 0; place(at, piano(seq[k % 8] + shift, 1.2), db(-31 + 4 * float(at > JUMP)), 0.15 if k % 2 else -0.15); at += beat_s; k += 1
place(CARD + 0.1, sum(piano(n, 3.0, 0.5) * a for n, a in [(45, 1), (52, 0.7), (57, 0.6), (60, 0.5), (64, 0.4)]), db(-19))
out = np.stack([L, Rr], 1); out = sosfilt(butter(2, 60, 'highpass', fs=SR, output='sos'), out.T).T
out *= np.clip((DUR - t) / 0.4, 0, 1)[:, None] * np.clip(t / 0.05, 0, 1)[:, None]
out = np.tanh(out * 1.2) / np.tanh(1.2); out /= np.abs(out).max() / 0.92
wavfile.write(sys.argv[1], SR, (out * 32767).astype(np.int16)); print('ok')
