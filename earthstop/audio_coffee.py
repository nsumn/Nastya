import numpy as np, sys
from scipy.signal import butter, sosfilt
from scipy.io import wavfile
# "What if you quit caffeine today?" (64 s): kitchen (machine gurgle, the mug set down, a grumpy "hmph"), the brain (a soft neural hum, blue adenosine
# blips, caffeine docking as soft low plops, new receptors sprouting), the yawn, the couch headache (a dull throb that slows and fades), a calm night,
# the split (two sips, the meter sinking and rising), morning (curtains, birds, a stretch). ONE theme: minor while hooked, the same line in major at the end. Mids only.
SR = 44100; DUR = 64.5; N = int(SR * DUR); t = np.arange(N) / SR
MUSIC = '--no-music' not in sys.argv   # --no-music: sound effects only (no theme, pads or end chord)
rng = np.random.default_rng(1313); L = np.zeros(N); Rr = np.zeros(N)
BRAIN, ADAPT, QUIT, PEAK, FADE, SLEEP, TWIST, BOOST, FREE, T_END = 4.0, 11.0, 17.0, 24.0, 31.0, 37.0, 43.0, 50.0, 56.0, 61.0
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
def slurp(at, g, d=0.6): x = tt(d); place(at, filt(rng.standard_normal(len(x)), 'bandpass', [500, 2200]) * np.sin(np.pi * x / d) * (0.6 + 0.4 * np.sin(2 * np.pi * 14 * x)), g)
def throb(at, g, f=150): x = tt(0.5); place(at, filt(np.sin(2 * np.pi * f * x) + 0.5 * np.sin(2 * np.pi * 2 * f * x) + 0.3 * rng.standard_normal(len(x)), 'lowpass', 900) * np.sin(np.pi * np.clip(x / 0.5, 0, 1)) ** 2, g)   # a swell, not a click
def fizz(a, b, g, lo=1200, hi=3200, pan=0.0): add(filt(rng.standard_normal(N), 'bandpass', [lo, hi]) * (0.5 + 0.5 * filt(rng.standard_normal(N), 'lowpass', 12) / 0.02).clip(0, 1.5) * win(a, b, 0.3), g, pan)
# --- 0-4: the kitchen: fridge hum, the machine's last gurgle, the mug set down and pushed away, a grumpy "hmph"
add(BN(150, 900) * win(-1, BRAIN + 0.3, 0.4), db(-38)); add(np.sin(2 * np.pi * 120 * t) * win(-1, BRAIN + 0.3, 0.4), db(-42))
for k in range(9): x = tt(0.18); f = rng.uniform(180, 320) * (1 + 0.6 * np.sin(2 * np.pi * 7 * x)); place(0.05 + k * 0.11, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 10), db(-27), 0.3)
thud(2.2, db(-17), 240, 0.12, 0.2); x = tt(0.35); place(2.25, filt(rng.standard_normal(len(x)), 'bandpass', [300, 1400]) * np.sin(np.pi * x / 0.35), db(-26), 0.25)   # ceramic down + slide
voice(2.75, 0.45, 125, db(-17), 0, vowels=((500, 900), (450, 800)), rate=2.0)
# --- 4-17: the brain: a soft neural hum; adenosine bubbles; caffeine docks in as a warm fizz; new receptors sprout (a rising shimmer), then fill again
hum = np.sin(2 * np.pi * 220 * t + 0.4 * np.sin(2 * np.pi * 0.3 * t)) + 0.5 * np.sin(2 * np.pi * 330.5 * t); add(filt(hum, 'lowpass', 900) * win(BRAIN - 0.3, QUIT + 0.3, 0.5), db(-34))
for k in range(26): plop(BRAIN + 0.3 + k * 0.48 + rng.uniform(0, 0.2), db(-33), rng.uniform(500, 760), rng.uniform(-0.6, 0.6))
fizz(BRAIN + 0.4, BRAIN + 2.7, db(-30), 700, 2200); sweep(BRAIN + 0.4, 2.2, 260, 390, db(-29))
sweep(ADAPT + 0.8, 3.0, 300, 900, db(-30), -0.2); add(filt(rng.standard_normal(N), 'bandpass', [2000, 4500]) * win(ADAPT + 0.8, ADAPT + 3.9, 0.6), db(-38), 0.2)
fizz(ADAPT + 3.6, ADAPT + 5.9, db(-31), 700, 2200)
# --- 17-24: the table: a huge yawn, rubbing the temples, a sigh
add(BN(150, 900) * win(QUIT - 0.3, SLEEP + 0.3, 0.4), db(-40))
place(QUIT + 1.1, breath(1.7, 'in', 0.7, 210), db(-16)); place(QUIT + 2.6, breath(1.0, 'out', 0.4, 150), db(-19))
for at in np.arange(QUIT + 3.7, QUIT + 6.6, 0.55): rustle(at, 0.4, db(-30))
place(QUIT + 6.3, breath(1.2, 'out', 0.25, 120), db(-20))
# --- 24-37: the couch: a dull throb in step with the red rings (1.6/s), a groan; then it slows and fades away; a relieved exhale
at = PEAK - 0.2
while at < FADE + 4.5:
    k = 0 if at < FADE else min(1, (at - FADE) / 4.0); amp = 1 if at < FADE else max(0, 1 - (at - FADE - 1) / 3.5)
    if amp > 0.03: throb(at, db(-21) * amp)
    at += 1 / (1.6 + (0.5 - 1.6) * k)
voice(PEAK + 1.2, 0.9, 110, db(-21), 0, vowels=((550, 900), (500, 850)), rate=1.5); voice(PEAK + 4.6, 0.7, 105, db(-23), 0, vowels=((550, 900), (500, 850)), rate=1.5)
place(FADE + 3.4, breath(1.6, 'out', 0.3, 140), db(-18))
# --- 37-43: night: soft room air, slow sleepy breathing
add(BN(200, 700) * win(SLEEP - 0.3, TWIST + 0.3, 0.5), db(-38))
for at in np.arange(SLEEP + 0.3, TWIST, 2.2): place(at, breath(0.9, 'in'), db(-29)); place(at + 0.95, breath(1.1, 'out', 0.15, 95), db(-29))
# --- 43-56: the split: room tone; the morning sip; the meter sinks (a falling tone), a tired sigh, the sip, the meter climbs back to "normal"
add(BN(150, 900) * win(TWIST - 0.3, FREE + 0.3, 0.4), db(-40))
slurp(TWIST + 1.0, db(-22)); sweep(TWIST + 3.2, 0.5, 520, 660, db(-30), -0.3); sweep(TWIST + 3.5, 0.5, 520, 660, db(-30), 0.3)   # the two bars land on the same mark
sweep(BOOST - 0.1, 1.1, 500, 200, db(-26), -0.3); place(BOOST + 0.9, breath(1.2, 'out', 0.3, 115), db(-20))
slurp(BOOST + 2.3, db(-21)); sweep(BOOST + 2.6, 1.6, 200, 520, db(-26), -0.3)
# --- 56-61: morning: curtains swoosh open, birds, a happy stretch
add(BN(200, 1200) * win(FREE - 0.3, DUR, 0.4), db(-41))
x = tt(1.3); place(FREE + 0.4, filt(rng.standard_normal(len(x)), 'bandpass', [600, 3000]) * np.sin(np.pi * x / 1.3) ** 2, db(-22))
for k in range(9): at = FREE + 1.0 + k * 0.55 + rng.uniform(0, 0.2); x = tt(0.2); f0 = rng.uniform(1900, 2700); place(at, np.sin(2 * np.pi * np.cumsum(f0 * (1 + 0.3 * np.sin(2 * np.pi * 11 * x))) / SR) * np.sin(np.pi * x / 0.2), db(-31), rng.uniform(-0.6, 0.6))
place(FREE + 2.2, breath(1.0, 'in', 0.5, 190), db(-18)); place(FREE + 3.3, breath(1.0, 'out', 0.4, 170), db(-20))
# --- ONE theme: a sleepy A-minor line while hooked, the same line in C major on the free morning
mel = np.zeros(N); beat_s = 60 / 84; minor = [69, 72, 76, 74, 72, 71, 69, 64]; major = [72, 76, 79, 77, 76, 74, 72, 67]
k = 0; at = 0.3
while at < T_END - 0.3:
    g = db(-28) if PEAK <= at < FADE else db(-25)   # quieter under the headache
    place(at, piano((major if at >= FREE else minor)[k % 8], 2.0), g, buf=mel); at += beat_s; k += 1
if MUSIC: add(mel, 1.0)
if MUSIC: add(pad([57, 60, 64], 0.0, FREE + 0.2, 1.5, 1.0), db(-39)); add(pad([60, 64, 67], FREE - 0.2, DUR, 1.5, 2.0), db(-34))
if MUSIC: place(T_END + 0.2, sum(piano(n, 4.5, 0.5) * a for n, a in [(48, 1), (55, 0.7), (60, 0.6), (64, 0.5), (67, 0.4)]), db(-19))
out = np.stack([L, Rr], 1); out = sosfilt(butter(2, 60, 'highpass', fs=SR, output='sos'), out.T).T
out *= np.clip((DUR - t) / 0.8, 0, 1)[:, None] * np.clip(t / 0.05, 0, 1)[:, None]
out = np.tanh(out * 1.2) / np.tanh(1.2); out /= np.abs(out).max() / 0.92
wavfile.write(sys.argv[1], SR, (out * 32767).astype(np.int16)); print('ok')
