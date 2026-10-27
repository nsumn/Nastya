import numpy as np, sys
from scipy.signal import butter, sosfilt
from scipy.io import wavfile
# "What your dad's texts actually mean" (64 s): message pops (his = a soft two-note bloop, yours = an upward swish), whooshes on every whip cut,
# a snowy-night wind, Mom's surprised "oh!", the dog, porch birds + two phone buzzes, the grill sizzle + a shutter, the storage alert and three deletes.
# ONE theme: a warm plucked melody in G major (Karplus-Strong), softer under the sad beats. Mids only, no ticking (typing = soft irregular thumps).
SR = 44100; DUR = 64.5; N = int(SR * DUR); t = np.arange(N) / SR
MUSIC = '--no-music' not in sys.argv   # --no-music: sound effects only (no theme, pads or end chord)
rng = np.random.default_rng(2016); L = np.zeros(N); Rr = np.zeros(N)
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

CUTS = [B2, B3, B4, B5, B6, TW]   # soft dissolves between the years (each beat is one continuous take)
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
# --- room tones per place
add(BN(150, 900) * (win(-1, B2 + 0.2, 0.3) + win(B3 - 0.2, B5 + 0.2, 0.3) + win(TW - 0.2, DUR, 0.3)), db(-41))
add(BN(250, 1100) * win(B2 - 0.2, B3 + 0.2, 0.3) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.23 * t)), db(-33))   # snowy wind
add(BN(300, 1500) * win(B5 - 0.2, TW + 0.2, 0.3), db(-42))   # evening air outside
for c in CUTS: whoosh(c, db(-31), 0.9, pan=0.3 if CUTS.index(c) % 2 else -0.3)
def creak(at, g): x = tt(0.5); f = 180 * (1 + 0.4 * x / 0.5); place(at, filt(np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * (0.5 + 0.5 * np.sin(2 * np.pi * 23 * x)), 'bandpass', [200, 900]) * np.sin(np.pi * x / 0.5), g)
for a, b in [(B2 + 3.9, B2 + 5.6), (B3 + 3.5, B3 + 5.0)]:
    for at in np.arange(a, b, 0.42): step(at, db(-24), 0.2)
creak(B2 + 3.2, db(-26)); creak(B3 + 3.0, db(-26))
thud(B5 + 3.9, db(-24), 260, 0.08)   # phone set down on the table
x = tt(0.2); place(B6 + 3.5, filt(rng.standard_normal(len(x)), 'bandpass', [800, 2500]) * np.exp(-x * 25), db(-28))   # spatula off the hook
# --- intro: a puzzled "hm?", one-finger taps
voice(1.2, 0.5, 115, db(-23), 0, vowels=((500, 900), (450, 850)), rate=2.0); taps(1.9, 3.6, 2.5, db(-27))
# --- B1: "Hello this is Dad." / contacts, his laugh
taps(B1 + 0.0, B1 + 0.6, 3, db(-27)); bloop(B1 + 0.7, db(-17)); swish(B1 + 4.1, db(-28)); chime(B1 + 5.0, db(-27))
voice(B1 + 4.3, 0.9, 140, db(-21), 0, vowels=((750, 1200), (650, 1100)), rate=6.0)
# --- B2: the weather, snow; keys jingle
bloop(B2 + 0.6, db(-18)); bloop(B2 + 1.5, db(-18)); taps(B2 + 2.0, B2 + 3.5, 2.5, db(-28))
for k in range(5): x = tt(0.18); place(B2 + 4.8 + k * 0.11, np.sin(2 * np.pi * rng.uniform(2200, 3200) * x) * np.exp(-x * 30), db(-34), 0.2)   # keys
place(B2 + 5.6, breath(1.4, 'out', 0.2, 110), db(-22))
# --- B3: your long text, his 👍, Mom's "oh!" and a laugh
bloop(B3 + 0.5, db(-18)); thud(B3 + 1.7, db(-24), 420, 0.06); thud(B3 + 2.25, db(-24), 420, 0.06); swish(B3 + 2.45, db(-17))
voice(B3 + 4.4, 0.45, 260, db(-19), 0.2, vowels=((600, 1000), (500, 900)), rate=2.0); voice(B3 + 5.8, 0.9, 230, db(-22), 0.2, vowels=((750, 1250), (650, 1100)), rate=6.5)
# --- B4: your news, the endless typing, the draft typed and erased, "ok", sent; the dog
swish(B4 + 0.5, db(-20)); taps(B4 + 1.2, B4 + 3.6, 2.2, db(-30)); taps(B4 + 4.0, B4 + 5.7, 4.0, db(-26)); taps(B4 + 6.1, B4 + 7.0, 4.5, db(-29)); taps(B4 + 7.05, B4 + 7.3, 6, db(-26)); swish(B4 + 7.45, db(-22))
for k in range(6): thud(B4 + 4.4 + k * 0.32, db(-30), 160, 0.12, 0.3)   # tail on the floor
voice(B4 + 6.4, 0.6, 330, db(-28), 0.35, vowels=((900, 1500), (800, 1300)), rate=3.0)   # a tiny dog whine
# --- B5: "Call me. Not urgent."; porch birds; two buzzes (not you), two sighs
bloop(B5 + 0.6, db(-17)); taps(B5 + 1.2, B5 + 3.2, 2.5, db(-29))
for k in range(9): at = B5 + 0.3 + k * 0.85 + rng.uniform(0, 0.3); x = tt(0.22); f0 = rng.uniform(1700, 2400); place(at, np.sin(2 * np.pi * np.cumsum(f0 * (1 + 0.25 * np.sin(2 * np.pi * 9 * x))) / SR) * np.sin(np.pi * x / 0.22), db(-34), rng.uniform(-0.7, 0.7))
for b in [B5 + 4.6, B5 + 6.3]: buzz(b, db(-18)); place(b + 0.9, breath(1.1, 'out', 0.2, 105), db(-23))
# --- B6: shutter, the photo arrives, the grill sizzle, spatula
x = tt(0.12); place(B6 + 0.35, filt(rng.standard_normal(len(x)), 'bandpass', [700, 2600]) * np.exp(-x * 45), db(-22)); bloop(B6 + 0.6, db(-17))
add(filt(rng.standard_normal(N), 'bandpass', [1200, 4200]) * (0.7 + 0.3 * (rng.random(N) < 0.03)) * win(B6 - 0.1, TW + 0.2, 0.3), db(-34))
for k in range(4): x = tt(0.25); place(B6 + 4.6 + k * 0.9, filt(rng.standard_normal(len(x)), 'bandpass', [500, 1800]) * np.sin(np.pi * x / 0.25), db(-30))
# --- TW: storage full alert, three deletes, the kept chat (a warm chime)
chime(TW + 0.5, db(-24), (76, 72)); 
for d in [TW + 1.6, TW + 2.3, TW + 3.0]: whoosh(d + 0.15, db(-27), 0.3, -0.3)
chime(TW + 3.6, db(-22), (79, 83, 86, 91))
# --- REP: you, 👍, "Love you too. – Dad", his chuckle
swish(REP + 0.3, db(-20)); bloop(REP + 1.0, db(-17)); bloop(REP + 1.8, db(-17)); voice(REP + 1.4, 0.8, 130, db(-22), 0, vowels=((700, 1150), (600, 1000)), rate=5.5)
# --- ONE theme: a warm plucked line in G major, 88 bpm; softer during the sad beats; a last chord on the end card
mel = np.zeros(N); beat_s = 60 / 88; line = [67, 71, 74, 71, 72, 76, 74, 71, 69, 72, 71, 67, 66, 69, 67, 62]; cache = {}
k = 0; at = 0.2
while at < T_END - 0.2:
    n = line[k % len(line)]; g = db(-27) if (B5 + 4 <= at < B6) or (B6 + 6 <= at < TW) else db(-23)
    if n not in cache: cache[n] = pluck(n)
    place(at, cache[n], g, buf=mel)
    if k % 4 == 0: n2 = n - 12; cache.setdefault(n2, pluck(n2, 3.0)); place(at, cache[n2], g * 0.6, buf=mel)
    at += beat_s; k += 1
if MUSIC: add(mel, 1.0, -0.05)
if MUSIC: add(pad([55, 59, 62], 0.0, T_END, 1.5, 1.0, 900), db(-41))
if MUSIC: place(T_END + 0.2, sum(pluck(n, 4.0) * a for n, a in [(43, 1), (55, 0.8), (59, 0.6), (62, 0.6), (67, 0.5)]), db(-17))
out = np.stack([L, Rr], 1); out = sosfilt(butter(2, 60, 'highpass', fs=SR, output='sos'), out.T).T
out *= np.clip((DUR - t) / 0.8, 0, 1)[:, None] * np.clip(t / 0.05, 0, 1)[:, None]
out = np.tanh(out * 1.2) / np.tanh(1.2); out /= np.abs(out).max() / 0.92
wavfile.write(sys.argv[1], SR, (out * 32767).astype(np.int16)); print('ok')
