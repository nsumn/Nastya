import numpy as np, sys
from scipy.signal import butter, sosfilt
from scipy.io import wavfile

# "What if spam calls were missing people calling for help?" — phone buzzing on a wooden nightstand, declines, a quiet line,
# a whisper-like voice, one soft piano theme (A minor) through city / map / street / 911 room, office phones trilling, dawn birds.
# Mostly 200 Hz - 3 kHz so it carries on phone speakers. No steady high ticks, no emergency-alert tones.
SR = 44100; DUR = 64.5; N = int(SR * DUR); t = np.arange(N) / SR
rng = np.random.default_rng(911); L = np.zeros(N); Rr = np.zeros(N)
DECLINE, ANSWER, CITY, MAP, DIVIDE, STREET, CENTER, DAWN, TEND = 4.0, 9.0, 15.0, 19.0, 24.0, 33.0, 42.0, 51.0, 58.0
CALLS = [(0.0, 4.6), (5.3, 6.7), (7.3, 8.5), (9.0, 10.1), (55.0, 58.4)]
def filt(x, kind, f, order=2): return sosfilt(butter(order, f, kind, fs=SR, output='sos'), x)
def db(x): return 10 ** (x / 20)
def ramp(a, b, fa, fb): return np.clip((t - a) / max(fa, 1e-3), 0, 1) * np.clip((b - t) / max(fb, 1e-3), 0, 1)
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
def whoosh(at, dur, g, p0=0, p1=0, lo=300, hi=3500):
    x = tt(dur); s = noise(dur, lo, hi) * np.sin(np.pi * x / dur) ** 2; i0 = int(at * SR); s = s[:max(0, N - i0)]; pan = np.linspace(p0, p1, len(s))
    L[i0:i0 + len(s)] += s * g * np.sqrt((1 - pan) / 2); Rr[i0:i0 + len(s)] += s * g * np.sqrt((1 + pan) / 2)
def pad(chord, a, b, fa=1.0, fb=1.0, lp=1600):
    return filt(sum(np.sin(2 * np.pi * hz(n) * t) + 0.4 * np.sin(2 * np.pi * hz(n) * 1.003 * t) for n in chord), 'lowpass', lp) * ramp(a, b, fa, fb)
def buzz(d, f=165):
    x = tt(d); s = np.sign(np.sin(2 * np.pi * f * x)) * 0.6 + np.sin(2 * np.pi * 2 * f * x) * 0.5 + np.sin(2 * np.pi * 3 * f * x) * 0.35
    s = filt(s, 'bandpass', [140, 1800]) * (0.75 + 0.25 * np.sin(2 * np.pi * 31 * x)); return norm(s) * np.clip(x / 0.02, 0, 1) * np.clip((d - x) / 0.03, 0, 1)
def piano(n, d=1.6, bright=1.0):
    x = tt(d); f = hz(n); s = np.sin(2 * np.pi * f * x) + 0.35 * bright * np.sin(4 * np.pi * f * x) + 0.12 * bright * np.sin(6 * np.pi * f * x)
    return s * np.exp(-x * 2.6) * np.clip(x / 0.006, 0, 1)
def trill(d):   # office desk phone: two tones warbling 20 Hz, 1 s on
    x = tt(d); s = (np.sin(2 * np.pi * 440 * x) + np.sin(2 * np.pi * 480 * x)) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 20 * x))); s = filt(s, 'lowpass', 2500)
    return s * np.clip(x / 0.01, 0, 1) * np.clip((d - x) / 0.02, 0, 1)

# ---- 0-15 bedroom at night: room hush, the phone buzzing on wood, taps, a quiet line, a voice
add(norm(filt(rng.standard_normal(N), 'bandpass', [150, 900])) * (ramp(-1, CITY, 0.01, 0.3) + 0.8 * ramp(DAWN, DUR, 0.3, 1)), db(-36))
for a, b in CALLS:
    k = a
    while k < b - 0.05:
        d = min(0.7, b - k); place(k, buzz(d), db(-13) if a < 50 else db(-16), 0.1); place(k, noise(d, 900, 3000) * np.exp(-tt(d) * 1.0) * 0.4, db(-30), 0.1)  # rattle
        k += 1.2
for T, kind in [(4.6, 'd'), (6.7, 'd'), (8.5, 'd'), (10.1, 'a')]:
    x = tt(0.05); place(T, np.sin(2 * np.pi * 700 * x) * np.exp(-x * 90), db(-22))
    notes = [72, 67] if kind == 'd' else [67, 74]
    for i, n in enumerate(notes): place(T + 0.05 + i * 0.12, piano(n, 0.5, 0.4), db(-22))
add(norm(filt(rng.standard_normal(N), 'bandpass', [300, 3400])) * ramp(10.15, CITY, 0.1, 0.3), db(-33))   # open line
for a, b in [(11.6, 12.7), (13.2, 14.7)]:     # whisper: breathy, syllable-shaped noise, no words
    d = b - a; x = tt(d); syl = np.clip(np.sin(2 * np.pi * 4.3 * x + 1.0), 0, 1) ** 0.7 * np.sin(np.pi * x / d)
    s = filt(noise(d, 500, 5000), 'bandpass', [900, 2600]) * syl + 0.4 * noise(d, 2500, 5000) * syl
    place(a, norm(s), db(-17), -0.05)
add(pad([57, 64, 69], ANSWER + 2.0, CITY + 0.2, 2.0, 0.3, 1200), db(-30))
# ---- one theme: soft piano in A minor, 15 -> 51, then resolved at dawn
beat = 60 / 76
motif = [69, 72, 76, 74, 72, 71, 72, 69, 64, 67, 69, 71, 72, 71, 67, 69]
lvl = lambda at: (-21 if at < MAP else -24 if at < STREET else -21 if at < CENTER else -19)
k = 0; at = CITY + 0.2
while at < DAWN - 0.4:
    n = motif[k % 16]; place(at, piano(n), db(lvl(at)), 0.15 if k % 2 else -0.15)
    if k % 4 == 0: place(at, piano(n - 24, 3.0, 0.6), db(lvl(at) - 3))
    at += beat; k += 1
add(pad([57, 60, 64], CITY, STREET, 1.0, 0.5, 1200), db(-30)); add(pad([53, 57, 60], STREET, CENTER, 0.5, 0.5, 1200), db(-30))
add(pad([52, 56, 59, 64], CENTER, DAWN, 0.5, 0.5, 1400), db(-28))
for k, n in enumerate([72, 76, 79, 77, 76, 72, 74, 72]): place(DAWN + 0.6 + k * beat * 1.4, piano(n, 2.2, 0.7), db(-22), 0.1)
add(pad([53, 57, 60, 65], DAWN, TEND + 1.0, 1.5, 1.0, 1200), db(-30))
place(TEND + 0.2, sum(piano(n, 3.0, 0.5) * a for n, a in [(57, 1), (64, 0.6), (69, 0.5)]), db(-18)); add(pad([57, 64, 69, 72], TEND, DUR, 0.4, 2.5, 1400), db(-26))
# ---- transitions
for T in [CITY, MAP, STREET, CENTER, DAWN]: whoosh(T - 0.45, 0.9, db(-22), -0.3, 0.3, 300, 3000)
whoosh(28.4, 3.2, db(-23), 0.4, -0.2, 250, 2500)   # zoom down to one person
# ---- 15-19 night city: traffic hush + phones buzzing in many windows
add(norm(filt(rng.standard_normal(N), 'bandpass', [180, 1200])) * (ramp(CITY, MAP, 0.3, 0.3) + ramp(STREET, CENTER, 0.3, 0.3)), db(-28))
for i in range(40):
    at = CITY + (MAP - CITY) * (i / 40) ** 0.7 + rng.uniform(0, 0.3); place(at, buzz(rng.uniform(0.3, 0.6), rng.uniform(150, 190)), db(-30 + 6 * i / 40), rng.uniform(-0.8, 0.8))
# ---- 19-33 map: sparse soft bubbles for calls (irregular, low-mid), the missing appear, one person buzzing
pt = MAP + 0.2
while pt < DIVIDE + 0.5:
    f = rng.uniform(300, 620); x = tt(0.18); place(pt, np.sin(2 * np.pi * f * x * (1 + 0.3 * x)) * np.exp(-x * 22) * np.clip(x / 0.004, 0, 1), db(-31), rng.uniform(-0.7, 0.7)); pt += rng.exponential(0.12)
x = tt(3.0); place(DIVIDE + 0.6, filt(noise(3.0, 200, 2000), 'lowpass', 1200) * np.sin(np.pi * x / 3.0) ** 2, db(-26))
for k in np.arange(DIVIDE + 5.0, STREET - 0.3, 1.2): place(k, buzz(0.7), db(-20), 0.25)
# ---- 33-42 street: everyone on the phone — murmur, buzzes, a few ringtones
def murmur(d, f0):
    x = tt(d); s = filt(noise(d, 150, 3000), 'bandpass', [f0, f0 * 3.2]) * np.clip(np.sin(2 * np.pi * rng.uniform(3, 5) * x + rng.uniform(0, 6)), 0, 1) ** 0.8; return norm(s)
for i in range(16): place(STREET + rng.uniform(0, 8.0), murmur(rng.uniform(1.5, 3.0), rng.uniform(250, 500)), db(-27), rng.uniform(-0.8, 0.8))
for i in range(14): place(STREET + rng.uniform(0, 8.5), buzz(rng.uniform(0.4, 0.7), rng.uniform(150, 190)), db(-27), rng.uniform(-0.9, 0.9))
for i in range(5):
    at = STREET + 0.8 + i * 1.7 + rng.uniform(0, 0.5); base = [76, 79, 83, 81][i % 4]
    for j, n in enumerate([base, base + 3, base, base + 5]): place(at + j * 0.14, piano(n - 12, 0.3, 0.3), db(-28), rng.uniform(-0.7, 0.7))
# ---- 42-51 911 room: desk phones trilling everywhere, dispatchers talking, a slow low alarm swell (no siren)
add(norm(filt(rng.standard_normal(N), 'bandpass', [120, 700])) * ramp(CENTER, DAWN, 0.3, 0.3), db(-30))
for i in range(26):
    at = CENTER + 0.3 + rng.uniform(0, 8.2) * (0.3 + 0.7 * i / 26); place(at, trill(1.0), db(-30 + 4 * i / 26), rng.uniform(-0.9, 0.9))
for i in range(12): place(CENTER + rng.uniform(0, 8.0), murmur(rng.uniform(1.0, 2.0), rng.uniform(220, 420)), db(-29), rng.uniform(-0.7, 0.7))
sw = (0.5 + 0.5 * np.sin((t - CENTER) * 2.4)) * ramp(CENTER + 1.5, DAWN, 2.0, 0.4)
add(filt(np.sin(2 * np.pi * 220 * t) + 0.5 * np.sin(2 * np.pi * 330 * t), 'lowpass', 900) * sw, db(-31))
# ---- 51-58 dawn: birds, quiet; the phone buzzes once more (you let it go)
pt = DAWN + 0.4
while pt < TEND + 2:
    f0 = rng.uniform(2200, 3200)
    for j in range(rng.integers(2, 4)): x = tt(0.1); f = np.linspace(f0, f0 * rng.uniform(0.8, 1.25), len(x)); place(pt + j * 0.15, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * x / 0.1) ** 1.5, db(-28), rng.uniform(-0.8, 0.8))
    pt += rng.uniform(1.0, 2.2)
out = np.stack([L, Rr], 1); out = sosfilt(butter(2, 60, 'highpass', fs=SR, output='sos'), out.T).T
out *= np.clip((DUR - t) / 0.8, 0, 1)[:, None] * np.clip(t / 0.05, 0, 1)[:, None]
out = np.tanh(out * 1.2) / np.tanh(1.2); out /= np.abs(out).max() / 0.92
wavfile.write(sys.argv[1], SR, (out * 32767).astype(np.int16)); print('ok')
