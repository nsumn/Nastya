import numpy as np, sys
from scipy.signal import butter, sosfilt
from scipy.io import wavfile

# "What if you only slept 5 hours a night?" (64 s): night room + slow sleep breathing, the brain wash (fluid swells, gurgles) that stops early,
# a short alarm, groan + coffee pours, the drive (engine, rumble strip, horn, near-miss whoosh), office murmur + the outburst (desk slam, heart thumps),
# the 2:40 am fridge raid (door, hum, wrappers, crunch), the sneeze, brain fog (everything muffled), a rested morning (birds, a deep stretch breath).
# ONE theme: minor while short on sleep (muffled in the fog), the same line in major after a full night. Mids only, no repeating high ticks.
SR = 44100; DUR = 64.5; N = int(SR * DUR); t = np.arange(N) / SR
MUSIC = '--no-music' not in sys.argv   # --no-music: sound effects only (no theme, pads or end chord)
rng = np.random.default_rng(505); L = np.zeros(N); Rr = np.zeros(N)
BRAIN, MORN, DRIVE, OFFICE, SNACK, COLD, FOG, FIX, T_END = 4.0, 10.0, 17.0, 25.0, 32.0, 39.0, 46.0, 54.0, 60.0
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
# --- 0-4: night room, slow sleep breathing, duvet
add(BN(150, 900) * win(0, BRAIN + 0.4, 0.4), db(-38))
for at, kind, d in [(0.3, 'in', 1.4), (1.8, 'out', 1.8)]: place(at, breath(d, kind, 0.12, 110), db(-23))
rustle(2.6, 0.8, db(-27), -0.3)
# --- brain wash: fluid swells along the channels + gurgles; it stops early (the alarm cuts it off)
wash = (0.6 + 0.4 * np.sin(2 * np.pi * 0.45 * (t - BRAIN))) * win(BRAIN - 0.2, BRAIN + 3.9, 0.5)
add(filt(rng.standard_normal(N), 'bandpass', [250, 1300]) * wash, db(-22))
for k in range(16):
    at = BRAIN + 0.3 + rng.uniform(0, 3.3); x = tt(0.18); f = rng.uniform(220, 420) * (1 + 1.5 * x); place(at, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 18), db(-27), rng.uniform(-0.5, 0.5))
if MUSIC: add(pad([57, 62, 65], BRAIN, BRAIN + 4.2, 0.8, 0.8, lp=1600), db(-34))
x = tt(1.2); place(BRAIN + 3.7, filt(rng.standard_normal(len(x)), 'bandpass', [300, 900]) * np.exp(-x * 3) * np.linspace(1, 0, len(x)), db(-28))   # flow drains away
# --- alarm: a short phone-style two-tone pattern (mid pitch), three bursts only
for k in range(3):
    for j in range(4): x = tt(0.09); place(MORN - 0.25 + k * 0.7 + j * 0.11, (np.sin(2 * np.pi * 880 * x) + 0.4 * np.sin(2 * np.pi * 1320 * x)) * np.clip(x / 0.005, 0, 1) * np.clip((0.09 - x) / 0.01, 0, 1), db(-20), -0.3)
thud(MORN + 1.9, db(-20), 140, 0.2, -0.3)   # slaps it off
place(MORN + 0.9, breath(1.3, 'out', 0.5, 105), db(-18))   # groan
for k in range(3):   # coffee pours (rising pitch as the mug fills), then a sip
    at = MORN + 3.2 + k * 0.9; x = tt(0.7); f = 500 + 900 * x / 0.7; s = filt(rng.standard_normal(len(x)), 'bandpass', [400, 2400]) * (0.6 + 0.4 * np.sin(2 * np.pi * np.cumsum(f) / SR)) * np.sin(np.pi * x / 0.7); place(at, s, db(-26), 0.3)
for at in [MORN + 5.6, MORN + 6.4]: place(at, breath(0.6, 'in', 0.0), db(-27))
add(BN(150, 900) * win(MORN - 0.3, DRIVE + 0.3, 0.4), db(-40))
# --- drive: engine, road, rumble strip while drifting, horn, near-miss whoosh
eng = np.sin(2 * np.pi * np.cumsum(np.full(N, 95.0) + 8 * np.sin(2 * np.pi * 0.3 * t)) / SR); eng = filt(np.sign(eng) * 0.6 + eng, 'bandpass', [90, 800])
add(norm(eng) * win(DRIVE - 0.3, OFFICE + 0.3, 0.4), db(-27)); add(BN(300, 1600) * win(DRIVE - 0.3, OFFICE + 0.3, 0.4), db(-32))
add(filt(np.sign(np.sin(2 * np.pi * 38 * t)) * (0.7 + 0.3 * rng.standard_normal(N)), 'bandpass', [120, 900]) * win(DRIVE + 3.5, DRIVE + 4.6, 0.15), db(-21), -0.3)   # rumble strip / centre line
horn = (np.sin(2 * np.pi * 405 * t) + np.sin(2 * np.pi * 510 * t) + 0.5 * np.sign(np.sin(2 * np.pi * 405 * t))) * win(DRIVE + 3.4, DRIVE + 4.4, 0.06)
add(filt(horn, 'bandpass', [250, 2500]) * (0.4 + 0.6 * sm(DRIVE + 3.4, DRIVE + 4.3)), db(-18), -0.5)
x = tt(1.0); place(DRIVE + 3.85, filt(rng.standard_normal(len(x)), 'bandpass', [250, 2500]) * np.exp(-((x - 0.45) / 0.18) ** 2), db(-15), -0.6)   # whoosh past
place(DRIVE + 4.6, breath(0.5, 'in', 0.0), db(-17))   # gasp
for k in range(4): beat(DRIVE + 4.9 + k * 0.42, db(-18))
# --- office: murmur, a coworker talking, the outburst, heart thumps under the red flash
add(BN(200, 1200) * win(OFFICE - 0.3, SNACK + 0.3, 0.4), db(-34))
for k in range(10): voice(OFFICE + rng.uniform(0, 6.5), rng.uniform(0.6, 1.4), rng.uniform(110, 210), db(-35), rng.uniform(-0.7, 0.7))
voice(OFFICE + 0.2, 1.9, 190, db(-24), 0.4, rate=5.0)   # the coworker, close
thud(OFFICE + 2.2, db(-12), 90, 0.4); thud(OFFICE + 2.26, db(-18), 160, 0.25)   # chair back, hands on the desk
voice(OFFICE + 2.35, 0.8, 150, db(-16), -0.1, vowels=((800, 1250), (650, 1100)), rate=3.0)   # "HEY—"
for k in range(5): beat(OFFICE + 2.3 + k * 0.4, db(-15))
add(np.sin(2 * np.pi * 220 * t + 0.5 * np.sin(2 * np.pi * 3 * t)) * win(OFFICE + 2.0, OFFICE + 4.2, 0.4), db(-31))
for k in range(4): voice(OFFICE + 4.6 + rng.uniform(0, 2), 0.8, rng.uniform(120, 200), db(-36), rng.uniform(-0.7, 0.7))   # people whisper after
# --- 2:40 am fridge raid: door, hum, wrappers, crunching
add(BN(150, 900) * win(SNACK - 0.3, COLD + 0.3, 0.4), db(-40))
thud(SNACK + 0.3, db(-20), 150, 0.25, 0.4)
add(filt(np.sin(2 * np.pi * 120 * t) + 0.5 * np.sin(2 * np.pi * 240 * t) + 0.3 * rng.standard_normal(N), 'bandpass', [100, 600]) * win(SNACK + 0.3, COLD - 0.2, 0.3), db(-30), 0.4)
for i in range(22): rustle(SNACK + 0.8 + i * 0.22 + rng.uniform(0, 0.06), 0.16, db(-28), 0.3)
for k in range(9):
    at = SNACK + 1.5 + k * 0.6 + rng.uniform(0, 0.15); x = tt(0.12); place(at, filt(rng.standard_normal(len(x)), 'bandpass', [500, 2200]) * np.exp(-x * 30) * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 40 * x))), db(-24))
thud(COLD - 0.35, db(-22), 150, 0.25, 0.4)   # door shuts
# --- the sneeze: sniff, "ah-", "CHOO", sniffle; the virus spray hisses
add(BN(200, 1200) * win(COLD - 0.3, FOG + 0.3, 0.4), db(-35))
place(COLD + 0.3, breath(0.35, 'in'), db(-22)); place(COLD + 0.7, breath(0.5, 'in', 0.5, 220), db(-20))
x = tt(0.45); s = norm(bpn(rng.standard_normal(len(x)), 900, 4000)) + 0.7 * norm(bpn(np.sign(np.sin(2 * np.pi * 230 * (1 - 0.3 * x) * x)), 300, 1500)); place(COLD + 1.22, s * np.clip(x / 0.012, 0, 1) * np.exp(-x * 7), db(-8))
x = tt(1.6); place(COLD + 1.3, filt(rng.standard_normal(len(x)), 'bandpass', [1200, 3800]) * np.exp(-x * 2.5), db(-31))
for at in [COLD + 3.2, COLD + 4.8]: place(at, breath(0.3, 'in'), db(-25))
x = tt(0.35); place(COLD + 5.6, norm(bpn(rng.standard_normal(len(x)), 300, 2600) + 0.6 * filt(np.sign(np.sin(2 * np.pi * 150 * x)), 'bandpass', [200, 1000])) * np.clip(x / 0.01, 0, 1) * np.exp(-x * 9), db(-21))   # cough
# --- fog: low hollow drone, papers drifting
add(filt(rng.standard_normal(N), 'bandpass', [200, 700]) * win(FOG - 0.2, FIX - 0.2, 1.2) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.25 * t)), db(-26))
add(np.sin(2 * np.pi * 196 * t + 0.3 * np.sin(2 * np.pi * 0.7 * t)) * win(FOG, FIX - 0.2, 1.5), db(-34))
for k in range(14): rustle(FOG + 0.8 + rng.uniform(0, 6.5), 0.4, db(-33), rng.uniform(-0.6, 0.6))
# --- rested morning: birds, a long stretch breath
for k in range(10): at = FIX + 0.3 + k * 0.5 + rng.uniform(0, 0.2); x = tt(0.2); f0 = rng.uniform(1900, 2700); place(at, np.sin(2 * np.pi * np.cumsum(f0 * (1 + 0.3 * np.sin(2 * np.pi * 11 * x))) / SR) * np.sin(np.pi * x / 0.2), db(-31), rng.uniform(-0.6, 0.6))
place(FIX + 0.5, breath(1.3, 'in'), db(-17)); place(FIX + 1.9, breath(1.6, 'out', 0.25, 140), db(-18))
# --- ONE theme: D minor while short on sleep (muffled in the fog), the same line in F major after a full night
mel = np.zeros(N); beat_s = 60 / 72; minor = [62, 65, 69, 67, 65, 64, 62, 57]; major = [65, 69, 72, 70, 69, 67, 65, 60]
k = 0; at = 0.4
while at < T_END - 0.3:
    if DRIVE + 3.2 <= at < DRIVE + 5.0 or COLD + 0.6 <= at < COLD + 1.9: at += beat_s; k += 1; continue   # rests under the near-miss and the sneeze
    place(at, piano((major if at >= FIX else minor)[k % 8], 2.2), db(-24), buf=mel); at += beat_s; k += 1
fogk = win(FOG, FIX - 0.1, 1.2); mel = mel * (1 - fogk) + filt(mel, 'lowpass', 420) * fogk * 1.6
if MUSIC: add(mel, 1.0)
if MUSIC: add(pad([62, 65, 69], 0.0, FIX + 0.2, 1.5, 1.0), db(-38)); add(pad([65, 69, 72], FIX - 0.2, DUR, 1.5, 2.0), db(-34))
if MUSIC: place(T_END + 0.2, sum(piano(n, 4.5, 0.5) * a for n, a in [(53, 1), (60, 0.7), (65, 0.6), (69, 0.5), (72, 0.4)]), db(-19))
out = np.stack([L, Rr], 1); out = sosfilt(butter(2, 60, 'highpass', fs=SR, output='sos'), out.T).T
out *= np.clip((DUR - t) / 0.8, 0, 1)[:, None] * np.clip(t / 0.05, 0, 1)[:, None]
out = np.tanh(out * 1.2) / np.tanh(1.2); out /= np.abs(out).max() / 0.92
wavfile.write(sys.argv[1], SR, (out * 32767).astype(np.int16)); print('ok')
