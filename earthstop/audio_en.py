import numpy as np, sys
from scipy.signal import butter, sosfilt
from scipy.io import wavfile

SR = 44100; DUR = 65.0; N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(11)
L = np.zeros(N); Rr = np.zeros(N)
T0, T1, TEND = 5.0, 55.0, 60.5
CUTS = [10, 15.5, 21, 26.5, 32, 37.5, 43, 49.5]

def filt(x, kind, f, order=2): return sosfilt(butter(order, f, kind, fs=SR, output='sos'), x)
def db(x): return 10 ** (x / 20)
def ramp(a, b, fa, fb): return np.clip((t - a) / max(fa, 1e-3), 0, 1) * np.clip((b - t) / max(fb, 1e-3), 0, 1)
def add(sig, g=1.0, pan=0.0):
    global L, Rr
    L += sig * g * np.sqrt((1 - pan) / 2); Rr += sig * g * np.sqrt((1 + pan) / 2)
def norm(x): return x / (np.abs(x).max() + 1e-9)
def event(at, dur, fn):
    s = np.zeros(N); i0 = int(at * SR); i1 = min(N, int((at + dur) * SR)); tt = np.arange(i1 - i0) / SR; s[i0:i1] = fn(tt); return s

white = rng.standard_normal(N)
brown = norm(filt(np.cumsum(rng.standard_normal(N)), 'highpass', 20))

# --- intro ambience
amb = norm(filt(white, 'bandpass', [200, 2500]) * 0.25 + filt(brown, 'lowpass', 400))
add(amb * ramp(0, T0 + 0.02, 0.5, 0.02), db(-16))
add(norm(filt(brown, 'lowpass', 600)) * ramp(T1 + 0.3, TEND, 0.8, 0.6), db(-14))
for bt in [0.5, 1.4, 2.3, 3.1, 3.9]:
    for k in range(3):
        st = bt + k * 0.11 + rng.uniform(0, 0.05)
        add(event(st, 0.07, lambda tt: np.sin(2 * np.pi * np.cumsum(3200 + 1600 * np.sin(np.pi * tt / 0.07)) / SR) * np.sin(np.pi * tt / 0.07)), db(-25), rng.uniform(-0.6, 0.6))
for k in range(5): add(event(k, 0.06, lambda tt: np.sin(2 * np.pi * 1800 * tt) * np.exp(-tt * 70)), db(-8))
add(norm(filt(white, 'bandpass', [300, 6000])) * np.clip((t - 2.8) / 2.2, 0, 1) ** 3 * (t < T0), db(-15))

# --- music: slow chord pad + soft bell arpeggio
def hz(n): return 440 * 2 ** ((n - 69) / 12)
chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]  # Am F C G
pad = np.zeros(N); bell = np.zeros(N)
for ci in range(int(DUR // 8) + 1):
    ch = chords[ci % 4]; a = ci * 8.0
    e = ramp(a - 1, a + 9, 1.5, 1.5)
    for n in ch + [ch[0] - 12]:
        pad += e * (np.sin(2 * np.pi * hz(n) * t) + 0.3 * np.sin(2 * np.pi * hz(n) * 2.003 * t))
    for k in range(16):
        at = a + k * 0.5; n = ch[k % 3] + (12 if k % 4 == 3 else 0) + 12
        bell += event(at, 1.6, lambda tt, f=hz(n): (np.sin(2 * np.pi * f * tt) + 0.25 * np.sin(2 * np.pi * f * 3 * tt)) * np.exp(-tt * 3.2) * np.clip(tt / 0.005, 0, 1))
pad = norm(filt(pad, 'lowpass', 1200))
music_env = np.clip(t / 2, 0, 1) * (1 - 0.55 * ramp(T1, 99, 0.05, 1)) * (1 - ramp(TEND - 0.3, 99, 0.3, 1))
add(pad * music_env, db(-19))
add(norm(bell) * music_env * (1 - 0.6 * ramp(T0, T1, 0.5, 0.5)), db(-24), 0.2)

# --- the stop: boom
add(norm(event(T0, 4, lambda tt: np.sin(2 * np.pi * (48 * tt - 6 * tt ** 2)) * np.exp(-tt * 1.3))), db(-2))
add(norm(filt(white, 'lowpass', 180)) * np.exp(-np.clip(t - T0, 0, None) * 3) * (t >= T0), db(-8))
add(filt(white, 'highpass', 1500) * np.exp(-np.clip(t - T0, 0, None) * 14) * (t >= T0) * 0.4, db(-10))

# --- wind roar during slow motion (muffled), shaped per shot
loud = np.ones(N)
for a, b, g in [(10, 15.5, 1.35), (15.5, 21, 1.5), (26.5, 32, 1.35), (43, 49.5, 0.12)]: loud *= 1 + (g - 1) * ramp(a, b, 0.08, 0.08)
wenv = ramp(T0, T1, 0.6, 0.05) * (0.75 + 0.25 * np.sin(2 * np.pi * 0.37 * t) * np.sin(2 * np.pi * 0.11 * t + 1)) * loud
roar = norm(filt(brown, 'lowpass', 450) + filt(white, 'bandpass', [250, 900]) * 0.06)
add(roar * wenv, db(-7), -0.15); add(np.roll(roar, 900) * wenv, db(-7), 0.15)
howl = np.zeros(N); seg = 4096
for i in range(0, N - seg, seg // 2):
    c = 480 + 260 * np.sin(2 * np.pi * 0.13 * i / SR) + 140 * np.sin(2 * np.pi * 0.41 * i / SR)
    howl[i:i + seg] += filt(white[i:i + seg], 'bandpass', [c * 0.9, c * 1.1]) * np.hanning(seg)
add(norm(howl) * wenv, db(-20))

# --- whooshes at every cut + passing objects
def whoosh(at, dur, g, p0, p1):
    global L, Rr
    s = norm(filt(white, 'bandpass', [400, 4000])) * (np.clip((t - at) / dur, 0, 1) * (t < at + dur))
    s = s * np.sin(np.pi * np.clip((t - at) / dur, 0, 1)) ** 2
    pan = np.interp(t, [at, at + dur], [p0, p1])
    L += s * g * np.sqrt((1 - pan) / 2); Rr += s * g * np.sqrt((1 + pan) / 2)
for c in CUTS: whoosh(c - 0.3, 0.55, db(-9), -0.4, 0.4)
for at in np.arange(16, 21, 0.55): whoosh(at + rng.uniform(-0.1, 0.1), 0.45, db(-14), -0.9, 0.9)
for at in np.arange(10.4, 15.3, 0.9): whoosh(at, 0.6, db(-15), 0.6, -0.6)

# --- glass (skyline) and water (river)
for k in range(70):
    at = rng.uniform(21, 26.5); f = rng.uniform(2500, 6500)
    add(event(at, 0.4, lambda tt: np.sin(2 * np.pi * f * tt) * np.exp(-tt * 14)), db(-26), rng.uniform(-0.8, 0.8))
for at in np.arange(32.2, 37.5, 1.3):
    add(norm(filt(white, 'lowpass', 900)) * np.sin(np.pi * np.clip((t - at) / 1.2, 0, 1)) ** 2 * (t < at + 1.2), db(-11), rng.uniform(-0.5, 0.5))
# space: low hum
add(np.sin(2 * np.pi * 55 * t) * ramp(43, 49.5, 0.3, 0.3), db(-20))
# tension heartbeat before restart
for at in [50.0, 51.0, 51.9, 52.7, 53.4, 54.0, 54.5]:
    add(event(at, 0.4, lambda tt: np.sin(2 * np.pi * 50 * tt) * np.exp(-tt * 12)), db(-6))

# --- restart: huge boom, crack, debris landing, ringing
add(norm(event(T1, 5, lambda tt: np.sin(2 * np.pi * (42 * tt - 5 * tt ** 2)) * np.exp(-tt * 1.0))), db(-1))
add(filt(white, 'highpass', 2000) * np.exp(-np.clip(t - T1, 0, None) * 6) * (t >= T1), db(-12))
for k in range(30):
    at = T1 + rng.uniform(0.15, 0.7);
    add(event(at, 0.05, lambda tt: rng.standard_normal(len(tt)) * np.exp(-tt * 90)), db(-16), rng.uniform(-0.9, 0.9))
for k in range(26):
    at = T1 + rng.uniform(0.4, 3.0); f = rng.uniform(60, 140)
    add(event(at, 0.35, lambda tt: np.sin(2 * np.pi * f * tt) * np.exp(-tt * 18) + 0.3 * rng.standard_normal(len(tt)) * np.exp(-tt * 40)), db(-12), rng.uniform(-0.8, 0.8))
add(np.sin(2 * np.pi * 3600 * t) * np.exp(-np.clip(t - T1, 0, None) * 0.6) * (t >= T1) * ramp(T1, TEND, 0.4, 0.5), db(-34))

# --- end card
add(event(TEND, 4, lambda tt: np.sin(2 * np.pi * 40 * tt) * np.exp(-tt * 2.2)), db(-4))
add(event(TEND + 0.1, 4.4, lambda tt: (np.sin(2 * np.pi * 220 * tt) + 0.5 * np.sin(2 * np.pi * 329.6 * tt) + 0.35 * np.sin(2 * np.pi * 277.2 * tt)) * np.exp(-tt * 0.6) * np.clip(tt / 0.4, 0, 1)), db(-15))

out = np.stack([L, Rr], 1)
out *= np.clip((DUR - t) / 0.5, 0, 1)[:, None]
out = np.tanh(out * 1.2) / np.tanh(1.2)
out /= np.abs(out).max() / 0.92
wavfile.write(sys.argv[1], SR, (out * 32767).astype(np.int16))
print('ok')
