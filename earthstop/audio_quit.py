import numpy as np, sys
from scipy.signal import butter, sosfilt
from scipy.io import wavfile

# "What if you quit nicotine today?" (64 s): snap + crumple + bin, X-ray heartbeat slowing 88 -> 74 bpm, restless nights (rustle, sighs, fridge),
# the day-3 peak (fast heart, pressure drone), craving waves fading, morning birds + deep breaths, cash-register dings, reversed sand, mountain wind.
# ONE theme: minor while it is hard, the same line in major from the morning on. Mids only, no repeating high ticks (no clock ticking).
SR = 44100; DUR = 64.5; N = int(SR * DUR); t = np.arange(N) / SR
rng = np.random.default_rng(2026); L = np.zeros(N); Rr = np.zeros(N)
XRAY, NIGHT, PEAK, WEEKS, MORNING, LUNGS, MONEY, YEARS, MOUNT, T_END = 4.2, 9.0, 13.5, 17.5, 21.0, 24.5, 28.0, 42.0, 51.5, 60.0
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
def sm(a, b): k = np.clip((t - a) / (b - a), 0, 1); return k * k * (3 - 2 * k)
def win(a, b, f=0.5): return sm(a, a + f) * (1 - sm(b - f, b))
def bell(n, d=2.5): x = tt(d); f = hz(n); return (np.sin(2 * np.pi * f * x) + 0.5 * np.sin(2 * np.pi * f * 2.76 * x) * np.exp(-x * 3)) * np.exp(-x * 1.6) * np.clip(x / 0.004, 0, 1)
def rustle(at, d, g, pan=0.0): x = tt(d); s = filt(rng.standard_normal(len(x)), 'bandpass', [700, 3200]) * np.sin(np.pi * x / d) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * rng.uniform(5, 9) * x))); place(at, s, g, pan)
# --- room tone + the quit
add(BN(150, 900) * win(0, NIGHT, 0.4), db(-36))
x = tt(0.18); place(1.6, filt(rng.standard_normal(len(x)), 'bandpass', [900, 3500]) * np.exp(-x * 40) + 0.6 * np.sin(2 * np.pi * 520 * x) * np.exp(-x * 60), db(-15))   # snap
for k in range(9): rustle(1.25 + k * 0.08, 0.12, db(-27), -0.3)   # crumpling the pack
x = tt(0.3); place(2.82, filt(np.sin(2 * np.pi * 160 * x) + 0.5 * rng.standard_normal(len(x)), 'lowpass', 1200) * np.exp(-x * 16), db(-16))   # into the bin
rustle(3.0, 0.5, db(-24), 0.2)
# --- X-ray: heartbeat 88 -> 74 bpm, blood whoosh
at = XRAY + 0.1
while at < NIGHT - 0.2:
    bpm = 88 if at < XRAY + 1.5 else 88 - 14 * min(1, (at - XRAY - 1.5) / 1.5)
    beat(at, db(-15)); w = tt(0.5); place(at + 0.05, filt(rng.standard_normal(len(w)), 'bandpass', [200, 800]) * np.exp(-w * 6), db(-26)); at += 60 / bpm
add(pad([57, 64, 69], XRAY, NIGHT, 0.6, 0.6, lp=1800) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.5 * t)), db(-34))
# --- nights: tossing, sighs, fridge
for at in [NIGHT + 0.4, NIGHT + 1.3, NIGHT + 2.0]: rustle(at, 0.7, db(-23), -0.4)
for at in [NIGHT + 0.9, NIGHT + 1.9]: place(at, breath(1.1, 'out', 0.3, 120), db(-20))
x = tt(0.25); place(NIGHT + 2.35, filt(np.sin(2 * np.pi * 140 * x) + 0.4 * rng.standard_normal(len(x)), 'lowpass', 900) * np.exp(-x * 14), db(-19), 0.4)   # fridge door
add(filt(np.sin(2 * np.pi * 120 * t) + 0.5 * np.sin(2 * np.pi * 240 * t) + 0.3 * rng.standard_normal(N), 'bandpass', [100, 600]) * win(NIGHT + 2.3, PEAK + 0.2, 0.3), db(-30), 0.4)
for k in range(6): rustle(NIGHT + 2.7 + k * 0.28 + rng.uniform(0, 0.1), 0.22, db(-25), 0.4)   # snack bags
# --- day-3 peak: fast heart, pressure drone; then craving waves that fade
at = PEAK + 0.1
while at < WEEKS + 0.6: beat(at, db(-13)); at += 0.5
add(filt(rng.standard_normal(N), 'bandpass', [180, 700]) * win(PEAK, WEEKS + 0.8, 0.5) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.9 * t)), db(-22))
add(np.sin(2 * np.pi * 220 * t + 0.4 * np.sin(2 * np.pi * 3 * t)) * win(PEAK + 0.3, WEEKS + 0.6, 0.8), db(-33))
waves = np.maximum(0, np.sin(2 * np.pi * 0.7 * (t - WEEKS))) ** 2 * (1 - sm(WEEKS, MORNING)) * win(WEEKS, MORNING + 0.3, 0.4)
add(filt(rng.standard_normal(N), 'bandpass', [250, 1400]) * waves, db(-23))
# --- morning: birds, deep breaths
for k in range(8): at = MORNING + 0.4 + k * 0.42 + rng.uniform(0, 0.2); x = tt(0.2); f0 = rng.uniform(1900, 2700); place(at, np.sin(2 * np.pi * np.cumsum(f0 * (1 + 0.3 * np.sin(2 * np.pi * 11 * x))) / SR) * np.sin(np.pi * x / 0.2), db(-31), rng.uniform(-0.6, 0.6))
for at, kind, d in [(LUNGS + 0.3, 'in', 1.2), (LUNGS + 1.6, 'out', 1.4), (LUNGS + 3.1, 'in', 0.9)]: place(at, breath(d, kind), db(-17))
# --- money: bills fluttering + a cash-register ding at each milestone
for k in range(60): at = MONEY + 0.3 + rng.uniform(0, 11.8); rustle(at, 0.09, db(-33), rng.uniform(-0.5, 0.5))
for at in [MONEY + 0.8, MONEY + 4.3, MONEY + 7.8, MONEY + 11.2]: place(at, bell(84, 1.5), db(-21)); place(at + 0.09, bell(88, 1.5), db(-23))
# --- time: sand flowing back up (rising hiss), pages; then the mountain wind
add(filt(rng.standard_normal(N), 'bandpass', [600, 3000]) * win(YEARS, MOUNT, 0.6) * (0.4 + 0.6 * sm(YEARS, MOUNT)), db(-32))
for k in range(30): rustle(YEARS + 0.4 + k * 0.13 + rng.uniform(0, 0.05), 0.08, db(-31), rng.uniform(-0.6, 0.6))
add(filt(rng.standard_normal(N), 'bandpass', [250, 1500]) * win(MOUNT, T_END + 0.5, 1.0) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.17 * t)), db(-28))
# --- ONE theme: A minor while it is hard; the same line in C major from the morning
beat_s = 60 / 76; minor = [69, 72, 76, 74, 72, 71, 69, 64]; major = [72, 76, 79, 77, 76, 74, 72, 67]
k = 0; at = 0.4
while at < T_END - 0.3:
    if NIGHT <= at < WEEKS: at += beat_s; k += 1; continue   # the nights: only body sounds
    n = (major if at >= MORNING else minor)[k % 8]; lv = -26 if at < MORNING else -24
    place(at, piano(n, 2.2), db(lv), 0.15 if k % 2 else -0.15); at += beat_s; k += 1
add(pad([60, 64, 67], MORNING, DUR, 2.0, 2.0), db(-35))
place(T_END + 0.2, sum(piano(n, 4.5, 0.5) * a for n, a in [(48, 1), (55, 0.7), (60, 0.6), (64, 0.5), (67, 0.4)]), db(-19))
out = np.stack([L, Rr], 1); out = sosfilt(butter(2, 60, 'highpass', fs=SR, output='sos'), out.T).T
out *= np.clip((DUR - t) / 0.8, 0, 1)[:, None] * np.clip(t / 0.05, 0, 1)[:, None]
out = np.tanh(out * 1.2) / np.tanh(1.2); out /= np.abs(out).max() / 0.92
wavfile.write(sys.argv[1], SR, (out * 32767).astype(np.int16)); print('ok')
