import numpy as np, sys
from scipy.signal import butter, sosfilt
from scipy.io import wavfile

# "What if you ate only fast food for 30 days?" (64 s): night drive-thru (neon hum, speaker voice, paper bag), slurp + fries + a yawn and a power-down,
# the artery (heartbeat 70 -> 92 bpm with salt pouring in), day-5 desk (muted typing, sigh, laptop slam, "ugh"), the gut garden (gurgles, species popping out),
# fast eating + steps + the scale (a rising "whoop"), sugar cubes plopping into the liver, the couch (TV murmur, phone swipes, a rat squeak + tiny snores),
# a sunny morning (birds, apple crunches, stretch breath, jogging steps). ONE theme: minor on fast food, the same line in major with real food. Mids only.
SR = 44100; DUR = 64.5; N = int(SR * DUR); t = np.arange(N) / SR
MUSIC = '--no-music' not in sys.argv   # --no-music: sound effects only (no theme, pads or end chord)
rng = np.random.default_rng(606); L = np.zeros(N); Rr = np.zeros(N)
HOUR, ART, SALT, DAY5, GUT, WT, LIV, LAZY, FIX, T_END = 4.0, 10.0, 13.6, 17.0, 24.0, 32.0, 40.0, 46.0, 53.0, 60.0
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
# --- 0-4: night lot: traffic hum, neon buzz, the speaker voice, idle engine, the paper bag
add(BN(120, 700) * win(-1, ART + 0.3, 0.4), db(-32)); add(BN(400, 2000) * win(-1, HOUR + 0.2, 0.4), db(-40))
add(filt(np.sign(np.sin(2 * np.pi * 120 * t)) * 0.3 + np.sin(2 * np.pi * 240 * t), 'bandpass', [180, 900]) * win(-1, HOUR + 0.3, 0.4), db(-38), 0.3)   # neon hum
eng = np.sin(2 * np.pi * np.cumsum(np.full(N, 34.0) + 2 * np.sin(2 * np.pi * 0.7 * t)) / SR); add(norm(filt(np.sign(eng) + eng, 'bandpass', [80, 600])) * win(-1, ART + 0.3, 0.5), db(-33))
voice(0.3, 1.5, 175, db(-24), -0.5, rate=5.5); x = tt(1.6); place(0.3, filt(rng.standard_normal(len(x)), 'bandpass', [1500, 3500]) * 0.15, db(-30), -0.5)   # crackly drive-thru speaker
for k in range(10): rustle(2.1 + k * 0.17, 0.2, db(-24), -0.3)   # the bag
# --- 4-10: slurp, fries, a yawn, a soft power-down
for k in range(14): x = tt(0.07); place(4.6 + k * 0.08, filt(rng.standard_normal(len(x)), 'bandpass', [600, 2500]) * np.sin(np.pi * x / 0.07) * rng.uniform(0.4, 1), db(-23))   # straw
for at in [5.3, 5.8, 6.3, 6.8, 7.2]: crunch(at, db(-20))
chew(5.4, 7.5, 3.0, db(-28))
place(7.6, breath(1.2, 'in', 0.6, 200), db(-18)); place(8.7, breath(1.4, 'out', 0.5, 150), db(-18))
sweep(8.6, 1.4, 520, 170, db(-27))
# --- 10-17: inside the artery: heartbeat 70 -> 92 bpm, blood whoosh; salt pours in
at = ART - 0.2
while at < DAY5 + 0.2:
    bpm = 70 + 22 * min(1, max(0, (at - SALT) / 2.0)); beat(at, db(-15 + 2 * min(1, max(0, (at - SALT) / 2)))); w = tt(0.5); place(at + 0.05, filt(rng.standard_normal(len(w)), 'bandpass', [200, 800]) * np.exp(-w * 6), db(-25)); at += 60 / bpm
add(filt(rng.standard_normal(N), 'bandpass', [1500, 5000]) * (0.6 + 0.4 * (rng.random(N) < 0.02)) * win(SALT, SALT + 2.6, 0.3), db(-30))   # salt pouring (a granular hiss)
# --- 17-24: day 5 at the desk: room tone, muted typing, sigh, laptop slam, "ugh"
add(BN(150, 900) * win(DAY5 - 0.3, GUT + 0.3, 0.4), db(-38))
at = DAY5 + 0.2
while at < DAY5 + 3.4: x = tt(0.05); place(at, filt(rng.standard_normal(len(x)), 'bandpass', [300, 1300]) * np.exp(-x * 60), db(-31), 0.1); at += rng.uniform(0.09, 0.22)
place(DAY5 + 3.6, breath(1.4, 'out', 0.3, 120), db(-19))
thud(DAY5 + 5.2, db(-13), 120, 0.3); x = tt(0.12); place(DAY5 + 5.2, filt(rng.standard_normal(len(x)), 'bandpass', [600, 2500]) * np.exp(-x * 40), db(-19))
voice(DAY5 + 5.4, 0.7, 140, db(-17), 0, vowels=((700, 1150), (600, 1000)), rate=2.5)
# --- 24-32: the gut garden: squelchy gurgles; species blink out (soft falling pops); the nerve hum fades
add(filt(rng.standard_normal(N), 'lowpass', 500) * win(GUT - 0.3, WT + 0.3, 0.4) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.4 * t)), db(-26))
for k in range(18): at = GUT + rng.uniform(0, 7.6); x = tt(0.3); f = rng.uniform(150, 300) * (1 + 0.8 * np.sin(2 * np.pi * 6 * x)); place(at, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 8), db(-28), rng.uniform(-0.6, 0.6))
for k in range(16): sweep(GUT + 3.2 + k * 0.225 + rng.uniform(0, 0.08), 0.22, rng.uniform(700, 900), 250, db(-28), rng.uniform(-0.6, 0.6))
add(np.sin(2 * np.pi * 330 * t + 0.3 * np.sin(2 * np.pi * 5 * t)) * win(GUT, WT + 0.2, 0.5) * (1 - 0.7 * sm(GUT + 3.2, GUT + 6.8)), db(-33))
# --- 32-40: fast eating, steps round the island, the scale clunk, the needle "whoop"
add(BN(150, 900) * win(WT - 0.3, LIV + 0.3, 0.4), db(-38))
for at in np.arange(WT + 0.2, WT + 3.3, 0.48): crunch(at, db(-21)); rustle(at + 0.12, 0.15, db(-30), 0.3)
chew(WT + 0.3, WT + 3.4, 4.5, db(-27))
for k in range(4): step(WT + 3.5 + k * 0.33, db(-19), 0.2)
thud(WT + 4.8, db(-15), 150, 0.2); x = tt(0.4); place(WT + 4.85, np.sin(2 * np.pi * 220 * x) * np.exp(-x * 9) * np.sin(2 * np.pi * 9 * x), db(-27))
sweep(WT + 3.3, 1.5, 200, 330, db(-26)); sweep(WT + 5.6, 1.8, 330, 700, db(-23))
# --- 40-46: the liver: sugar cubes plop in; a stressed tremolo drone
for k in range(28): plop(LIV - 0.2 + k * 0.2 + rng.uniform(0, 0.08), db(-27), rng.uniform(280, 420), rng.uniform(-0.5, 0.5))
add(filt(rng.standard_normal(N), 'bandpass', [180, 650]) * win(LIV, LAZY + 0.3, 0.5) * (0.6 + 0.4 * np.sin(2 * np.pi * 6 * t)) * sm(LIV + 0.8, LIV + 4), db(-25))
# --- 46-53: the couch: TV murmur, phone swipes, a sigh; the rat: lever, one squeak, tiny snores
add(BN(150, 900) * win(LAZY - 0.3, FIX + 0.3, 0.4), db(-40))
for k in range(9): voice(LAZY + k * 0.75, 0.7, rng.uniform(120, 220), db(-31), -0.6)
for at in [LAZY + 0.6, LAZY + 1.7, LAZY + 2.6]: x = tt(0.15); place(at, filt(rng.standard_normal(len(x)), 'bandpass', [800, 2600]) * np.sin(np.pi * x / 0.15), db(-28), 0.2)
place(LAZY + 1.0, breath(1.6, 'out', 0.25, 115), db(-20))
thud(LAZY + 3.9, db(-24), 300, 0.08, 0.3); sweep(LAZY + 4.0, 0.12, 2200, 2600, db(-30), 0.3)
for at in np.arange(LAZY + 4.8, FIX + 0.2, 1.1): place(at, breath(0.5, 'in'), db(-34), 0.3); place(at + 0.5, breath(0.5, 'out'), db(-34), 0.3)
# --- 53-60: morning: birds, apple crunches, the stretch, jogging steps
for k in range(10): at = FIX + 0.2 + k * 0.6 + rng.uniform(0, 0.2); x = tt(0.2); f0 = rng.uniform(1900, 2700); place(at, np.sin(2 * np.pi * np.cumsum(f0 * (1 + 0.3 * np.sin(2 * np.pi * 11 * x))) / SR) * np.sin(np.pi * x / 0.2), db(-31), rng.uniform(-0.6, 0.6))
for at in [FIX + 0.9, FIX + 1.7, FIX + 2.4]: crunch(at, db(-17), -0.1)
place(FIX + 2.9, breath(1.0, 'in'), db(-18)); place(FIX + 4.0, breath(1.0, 'out', 0.2, 150), db(-20))
for at in np.arange(FIX + 4.1, T_END - 0.3, 0.36): step(at, db(-22), 0.3)
# --- ONE theme: E minor on fast food, the same line in G major once real food arrives
mel = np.zeros(N); beat_s = 60 / 92; minor = [64, 67, 71, 69, 67, 66, 64, 59]; major = [67, 71, 74, 72, 71, 69, 67, 62]
k = 0; at = 0.3
while at < T_END - 0.3:
    if ART <= at < DAY5: at += beat_s; k += 1; continue   # the artery keeps only the heartbeat
    place(at, piano((major if at >= FIX else minor)[k % 8], 2.0), db(-25), buf=mel); at += beat_s; k += 1
if MUSIC: add(mel, 1.0)
if MUSIC: add(pad([64, 67, 71], 0.0, FIX + 0.2, 1.5, 1.0), db(-39)); add(pad([67, 71, 74], FIX - 0.2, DUR, 1.5, 2.0), db(-34))
if MUSIC: place(T_END + 0.2, sum(piano(n, 4.5, 0.5) * a for n, a in [(55, 1), (62, 0.7), (67, 0.6), (71, 0.5), (74, 0.4)]), db(-19))
out = np.stack([L, Rr], 1); out = sosfilt(butter(2, 60, 'highpass', fs=SR, output='sos'), out.T).T
out *= np.clip((DUR - t) / 0.8, 0, 1)[:, None] * np.clip(t / 0.05, 0, 1)[:, None]
out = np.tanh(out * 1.2) / np.tanh(1.2); out /= np.abs(out).max() / 0.92
wavfile.write(sys.argv[1], SR, (out * 32767).astype(np.int16)); print('ok')
