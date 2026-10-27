import numpy as np, sys
from scipy.signal import butter, sosfilt
from scipy.io import wavfile
# "What your mom does on your birthday every year" (64 s): notification bloops, a baby's giggles, balloon blowing, a backyard party, the bathtub-photo groan,
# late-night laptop search, the 20th-birthday texts, a missed call + her off-key voicemail song, a match, and at 25 your text arriving first.
# ONE theme: a warm plucked melody in G major (Karplus-Strong), softer under the sad beats. Mids only, no ticking (typing = soft irregular thumps).
SR = 44100; DUR = 64.5; N = int(SR * DUR); t = np.arange(N) / SR
MUSIC = '--no-music' not in sys.argv   # --no-music: sound effects only (no theme, pads or end chord)
rng = np.random.default_rng(1999); L = np.zeros(N); Rr = np.zeros(N)
B1, B2, B3, B4, B5, B6, TW, REP, T_END = 4.0, 12.0, 20.0, 28.0, 36.0, 44.0, 52.0, 58.0, 61.0
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

CUTS = [B1, B2, B3, B4, B5, B6, TW]   # soft dissolves between the birthdays
def bloop(at, g, pan=-0.2):   # his message arrives: two soft sine notes
    for dt, f in [(0, 660), (0.07, 990)]: x = tt(0.22); place(at + dt, np.sin(2 * np.pi * f * x) * np.exp(-x * 18) * np.clip(x / 0.004, 0, 1), g, pan)
def swish(at, g, pan=0.2): x = tt(0.25); f = 500 * (1 + 3 * x / 0.25); place(at, filt(rng.standard_normal(len(x)), 'bandpass', [900, 3200]) * np.sin(np.pi * x / 0.25) * 0.6 + 0.4 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 9), g, pan)
def whoosh(at, g, d=0.45, pan=0.0): x = tt(d); env = np.sin(np.pi * x / d) ** 2; n = rng.standard_normal(len(x)); place(at - d / 2, (0.6 * filt(n, 'bandpass', [300, 1400]) + 0.4 * filt(n, 'bandpass', [1400, 3500])) * env, g, pan)
def taps(a, b, rate, g, pan=0.0):   # soft thumb taps on glass: low, muffled, irregular — not clicks
    at = a
    while at < b: x = tt(0.06); place(at, filt(rng.standard_normal(len(x)), 'bandpass', [350, 900]) * np.exp(-x * 70), g * rng.uniform(0.6, 1), pan); at += 1 / rate * rng.uniform(0.6, 1.5)
def buzz(at, g, d=0.55): x = tt(d); s = np.sign(np.sin(2 * np.pi * 170 * x)) * (0.5 + 0.5 * (np.sin(2 * np.pi * 7 * x) > -0.3)); place(at, filt(s, 'bandpass', [170, 1200]) * np.clip(x / 0.01, 0, 1) * np.clip((d - x) / 0.03, 0, 1), g, 0.15)
def chime(at, g, notes=(79, 83, 86), pan=0.0):
    for k, n in enumerate(notes): x = tt(1.2); f = hz(n); place(at + k * 0.09, (np.sin(2 * np.pi * f * x) + 0.3 * np.sin(2 * np.pi * 2.01 * f * x)) * np.exp(-x * 4), g, pan)
def pluck(n, d=2.4, b=0.996):   # Karplus-Strong string
    f = hz(n); p = int(SR / f); buf = rng.uniform(-1, 1, p); out = np.zeros(int(d * SR))
    for i in range(len(out)): out[i] = buf[i % p]; buf[i % p] = b * 0.5 * (buf[i % p] + buf[(i + 1) % p])
    return filt(out, 'lowpass', 3000) * np.clip(np.arange(len(out)) / SR / 0.003, 0, 1)
# --- room tones
add(BN(150, 900) * (win(-1, B2 + 0.3, 0.3) + win(B3 - 0.3, B4 + 0.3, 0.3) + win(B5 - 0.3, DUR, 0.3)), db(-41)); add(BN(300, 1500) * win(B2 - 0.3, B3 + 0.3, 0.3), db(-37)); add(BN(120, 600) * win(B4 - 0.3, B5 + 0.3, 0.3), db(-44))
for c in CUTS: whoosh(c, db(-32), 0.9, pan=0.3 if CUTS.index(c) % 2 else -0.3)
def shutter(at, g): x = tt(0.09); place(at, filt(rng.standard_normal(len(x)), 'bandpass', [600, 2200]) * np.exp(-x * 50), g, 0.25)
def giggle(at, g, n=4): voice(at, 0.18 * n, 420, g, -0.2, vowels=((900, 1500), (800, 1300)), rate=7.0)
def laugh(at, g, f0=230, d=0.8): voice(at, d, f0, g, 0.15, vowels=((750, 1250), (650, 1100)), rate=6.0)
# --- intro: she types, your phone lights up
taps(0.2, 0.8, 3, db(-28)); bloop(0.9, db(-16))
# --- B1: the smash cake
for a in [B1 + 0.6, B1 + 2.0, B1 + 3.4]: shutter(a, db(-25))
for a in [B1 + 1.1, B1 + 1.7, B1 + 2.3]: thud(a, db(-27), 180, 0.15); x = tt(0.2); place(a, filt(rng.standard_normal(len(x)), 'bandpass', [300, 1200]) * np.exp(-x * 20), db(-30))
giggle(B1 + 1.3, db(-21)); giggle(B1 + 3.0, db(-22), 5); giggle(B1 + 5.6, db(-23)); laugh(B1 + 1.8, db(-22))
# --- B2: thirty balloons — a breath into each one, a rubbery squeak; kids, Dad's grill
for k in range(6): a = B2 + k * 1.3; place(a + 0.05, breath(1.0, 'out', 0.1, 140), db(-25)); sweep(a + 1.05, 0.15, 650, 980, db(-31), -0.2)
for k in range(10): voice(B2 + 0.3 + k * 0.75, 0.6, rng.uniform(300, 420), db(-33), rng.uniform(-0.7, 0.7), vowels=((900, 1500), (750, 1300)), rate=5.0)
add(filt(rng.standard_normal(N), 'bandpass', [1200, 4000]) * win(B2, B3, 0.4), db(-41), 0.4)
giggle(B2 + 5.0, db(-24))
# --- B3: the bathtub photo — posted, two likes land, the teen groans, she laughs
swish(B3 + 1.0, db(-21))
for a in [B3 + 3.4, B3 + 4.4]: chime(a, db(-31), (84,), 0.2)
voice(B3 + 4.7, 0.7, 175, db(-24), -0.2, vowels=((550, 900), (500, 850)), rate=1.6); laugh(B3 + 5.2, db(-21))
# --- B4: 11:48 PM — typing on the laptop, scrolling, "aha!", order placed
taps(B4 + 0.4, B4 + 2.0, 4.0, db(-29))
for a in [B4 + 2.4, B4 + 3.1, B4 + 3.8]: whoosh(a, db(-33), 0.3)
voice(B4 + 4.7, 0.4, 260, db(-25), 0, vowels=((700, 1200), (600, 1000)), rate=2.0); chime(B4 + 5.6, db(-24), (79, 83, 86))
# --- B5: the texts on your 20th: hers first, then a second one, then your friends hours later
taps(B5 + 0.0, B5 + 0.4, 3, db(-28)); bloop(B5 + 0.5, db(-16)); bloop(B5 + 4.2, db(-18)); bloop(B5 + 5.4, db(-24), 0.3); bloop(B5 + 6.0, db(-24), 0.3); laugh(B5 + 4.6, db(-22))
# --- B6: a video call at 7 a.m. — you pick up, she sings off-key, you laugh; a match, a candle, she blows it out for you
x = tt(0.45); place(B6 + 0.2, (np.sin(2 * np.pi * 523 * x) + np.sin(2 * np.pi * 659 * x)) * 0.5 * np.clip(x / 0.02, 0, 1) * np.clip((0.45 - x) / 0.05, 0, 1), db(-25), 0.3); bloop(B6 + 0.5, db(-24))
song = [(67, 0.3), (67, 0.15), (69, 0.45), (67, 0.45), (72, 0.45), (71, 0.8)]; a = B6 + 0.8
for n, d in song: f0 = hz(n) * 2 ** (35 / 1200) * 0.5; voice(a, d, f0, db(-22), 0, vowels=((750, 1200), (700, 1150)), rate=1.0 / d); a += d + 0.05
laugh(B6 + 3.6, db(-23), 200, 0.9)
x = tt(0.35); place(B6 + 4.5, filt(rng.standard_normal(len(x)), 'bandpass', [800, 3000]) * np.exp(-x * 9), db(-26)); place(B6 + 5.85, breath(0.6, 'out'), db(-19)); laugh(B6 + 6.5, db(-22))
# --- TW: 6:58 AM — the phone buzzes on the counter before she reaches it; your text; she cries and laughs; she texts back
buzz(TW + 0.9, db(-19)); place(TW + 1.05, breath(0.4, 'in', 0.4, 260), db(-22)); bloop(TW + 1.9, db(-16))
voice(TW + 3.4, 1.2, 240, db(-21), 0, vowels=((650, 1100), (550, 950)), rate=3.0); swish(REP + 0.4, db(-19)); laugh(REP + 1.1, db(-22), 250, 1.0)
# --- ONE theme: a warm plucked line in D major, 84 bpm, quieter under the missed call; a last chord on the end card
mel = np.zeros(N); beat_s = 60 / 84; line = [62, 66, 69, 66, 67, 71, 69, 66, 64, 67, 66, 62, 61, 64, 62, 57]; cache = {}
k = 0; at = 0.2
while at < T_END - 0.2:
    n = line[k % len(line)]; g = db(-28) if (B6 + 0.6 <= at < B6 + 3.8) else db(-23)
    if n not in cache: cache[n] = pluck(n)
    place(at, cache[n], g, buf=mel)
    if k % 4 == 0: n2 = n - 12; cache.setdefault(n2, pluck(n2, 3.0)); place(at, cache[n2], g * 0.6, buf=mel)
    at += beat_s; k += 1
if MUSIC: add(mel, 1.0, -0.05)
if MUSIC: add(pad([50, 54, 57], 0.0, T_END, 1.5, 1.0, 900), db(-41))
if MUSIC: place(T_END + 0.2, sum(pluck(n, 4.0) * a for n, a in [(38, 1), (50, 0.8), (54, 0.6), (57, 0.6), (62, 0.5)]), db(-17))
out = np.stack([L, Rr], 1); out = sosfilt(butter(2, 60, 'highpass', fs=SR, output='sos'), out.T).T
out *= np.clip((DUR - t) / 0.8, 0, 1)[:, None] * np.clip(t / 0.05, 0, 1)[:, None]
out = np.tanh(out * 1.2) / np.tanh(1.2); out /= np.abs(out).max() / 0.92
wavfile.write(sys.argv[1], SR, (out * 32767).astype(np.int16)); print('ok')
