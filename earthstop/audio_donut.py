import numpy as np, sys
from scipy.signal import butter, sosfilt
from scipy.io import wavfile

SR = 44100; DUR = 65.0; N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(23)
L = np.zeros(N); Rr = np.zeros(N)
LAND, ROUL_END, SPACE_END, DIVE_END, REVEAL, GRAV, TL, NIGHT, OUT, OUT_SPACE, SPIN, CRUSH, TEND = 3.07, 4.4, 10.5, 14.5, 21, 27.5, 35, 42.5, 49, 51.6, 55, 59.3, 60.5
ROUL = [0, 0.3, 0.55, 1.2, 1.45, 1.7, 1.97, 2.27, 2.63, LAND]

def filt(x, kind, f, order=2): return sosfilt(butter(order, f, kind, fs=SR, output='sos'), x)
def db(x): return 10 ** (x / 20)
def ramp(a, b, fa, fb): return np.clip((t - a) / max(fa, 1e-3), 0, 1) * np.clip((b - t) / max(fb, 1e-3), 0, 1)
def add(sig, g=1.0, pan=0.0):
    global L, Rr
    L += sig * g * np.sqrt((1 - pan) / 2); Rr += sig * g * np.sqrt((1 + pan) / 2)
def norm(x): return x / (np.abs(x).max() + 1e-9)
def event(at, dur, fn):
    s = np.zeros(N); i0 = int(at * SR); i1 = min(N, int((at + dur) * SR))
    if i1 <= i0: return s
    tt = np.arange(i1 - i0) / SR; s[i0:i1] = fn(tt); return s
def hz(n): return 440 * 2 ** ((n - 69) / 12)

white = rng.standard_normal(N)
brown = norm(filt(np.cumsum(rng.standard_normal(N)), 'highpass', 20))
pink = norm(filt(white, 'lowpass', 3000) + filt(white, 'lowpass', 600) * 2)

def whoosh(at, dur, g, p0, p1, lo=400, hi=4000):
    global L, Rr
    seg = norm(filt(white, 'bandpass', [lo, hi]))
    e = np.sin(np.pi * np.clip((t - at) / dur, 0, 1)) ** 2 * ((t >= at) & (t < at + dur))
    s = seg * e; pan = np.interp(t, [at, at + dur], [p0, p1])
    L += s * g * np.sqrt((1 - pan) / 2); Rr += s * g * np.sqrt((1 + pan) / 2)

# ---------------- roulette: wheel clicks + whoosh/pop on every shape, chime on landing
click_t = []; tt0 = 0.0
while tt0 < LAND + 0.9:
    rate = 22 if tt0 < 2.0 else 22 * np.exp(-(tt0 - 2.0) * 1.6) + 3
    click_t.append(tt0); tt0 += 1 / rate
for c in click_t:
    g = db(-20) if c < LAND else db(-20) * np.exp(-(c - LAND) * 3)
    add(event(c, 0.03, lambda x: np.sin(2 * np.pi * 2600 * x) * np.exp(-x * 220) + 0.4 * rng.standard_normal(len(x)) * np.exp(-x * 400)), g, rng.uniform(-0.3, 0.3))
for i, a in enumerate(ROUL[1:]):
    whoosh(a - 0.08, 0.22, db(-15), -0.5 if i % 2 else 0.5, 0.5 if i % 2 else -0.5, 800, 6000)
    add(event(a, 0.18, lambda x: np.sin(2 * np.pi * (300 + 900 * np.exp(-x * 30)) * x) * np.exp(-x * 25)), db(-14))
# the "rocket": a cheeky slide-whistle up + boing
add(event(0.58, 0.55, lambda x: np.sin(2 * np.pi * np.cumsum(500 + 900 * x / 0.55) / SR) * np.sin(np.pi * x / 0.55) ** 0.6), db(-19), 0.1)
add(event(0.95, 0.35, lambda x: np.sin(2 * np.pi * np.cumsum(180 + 70 * np.sin(2 * np.pi * 14 * x)) / SR) * np.exp(-x * 7)), db(-16))
# landing
add(norm(event(LAND, 2.5, lambda x: np.sin(2 * np.pi * (55 * x - 4 * x ** 2)) * np.exp(-x * 2.2))), db(-4))
for k, n in enumerate([76, 81, 88]):
    add(event(LAND + 0.03 * k, 2.8, lambda x, f=hz(n): (np.sin(2 * np.pi * f * x) + 0.3 * np.sin(2 * np.pi * f * 2.01 * x)) * np.exp(-x * 1.6) * np.clip(x / 0.004, 0, 1)), db(-17), (k - 1) * 0.4)

# ---------------- music: pad + bell arpeggio (C  G  Am  F), lifts at the reveal, drops for the crush
chords = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]]
pad = np.zeros(N); bell = np.zeros(N)
CH = 4.0
for ci in range(int(DUR // CH) + 2):
    ch = chords[ci % 4]; a = LAND + ci * CH
    if a > DUR: break
    e = ramp(a - 0.6, a + CH + 0.6, 0.8, 0.8)
    for n in ch + [ch[0] - 12, ch[0] - 24]:
        pad += e * (np.sin(2 * np.pi * hz(n) * t) + 0.3 * np.sin(2 * np.pi * hz(n) * 2.004 * t) + 0.15 * np.sin(2 * np.pi * hz(n) * 0.998 * t))
    for k in range(16):
        at = a + k * 0.25
        if at > DUR - 0.1: break
        n = ch[[0, 1, 2, 1][k % 4]] + 12 + (12 if k % 8 == 7 else 0)
        bell += event(at, 1.2, lambda x, f=hz(n): (np.sin(2 * np.pi * f * x) + 0.2 * np.sin(2 * np.pi * f * 3 * x)) * np.exp(-x * 4.0) * np.clip(x / 0.004, 0, 1))
pad = norm(filt(pad, 'lowpass', 1400))
music = np.clip((t - LAND) / 0.3, 0, 1) * (1 - 0.85 * ramp(17.9, 21.0, 0.6, 0.15)) * (1 - 0.9 * ramp(SPIN + 0.5, 99, 2.5, 1)) * (1 - ramp(TEND + 2.5, 99, 1.5, 1))
add(pad * music * (1 + 0.5 * ramp(REVEAL, 27.5, 0.1, 2)), db(-19))
add(norm(bell) * music * (1 - 0.6 * ramp(NIGHT, OUT, 0.5, 0.5)), db(-25), 0.2)

# ---------------- space ambience + dive / rise
add(np.sin(2 * np.pi * 48 * t) * (ramp(0, DIVE_END, 0.1, 0.4) + ramp(OUT_SPACE, TEND, 0.3, 0.3)), db(-24))
add(norm(filt(brown, 'lowpass', 300)) * ramp(ROUL_END, SPACE_END, 0.5, 0.5), db(-22))
dive = np.clip((t - SPACE_END) / (DIVE_END - SPACE_END), 0, 1) ** 2.5 * (t < DIVE_END + 0.4)
add(norm(filt(white, 'bandpass', [200, 1800])) * dive * np.exp(-np.clip(t - DIVE_END, 0, None) * 6), db(-8))
whoosh(DIVE_END - 0.5, 1.0, db(-6), -0.3, 0.3, 300, 5000)
rise = np.clip((t - OUT) / (OUT_SPACE - OUT), 0, 1) ** 2 * (t < OUT_SPACE + 0.4)
add(norm(filt(white, 'bandpass', [250, 2200])) * rise * np.exp(-np.clip(t - OUT_SPACE, 0, None) * 5), db(-9))
whoosh(OUT_SPACE - 0.5, 1.0, db(-7), 0.3, -0.3, 300, 5000)

# ---------------- city ambience (street level)
cityE = ramp(DIVE_END, OUT_SPACE, 0.4, 0.3)
dayE = cityE * (1 - ramp(37.5, 99, 2.5, 1))
nightE = cityE * ramp(39.5, 99, 2.5, 1)
traffic = norm(filt(brown, 'lowpass', 500) + filt(pink, 'bandpass', [300, 1500]) * 0.3)
add(traffic * (0.25 + 0.75 * dayE) * cityE * (1 - 0.6 * ramp(19, 27, 1.5, 1.5)), db(-15))
crowd = norm(filt(white, 'bandpass', [350, 2500]) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.7 * t) * np.sin(2 * np.pi * 1.9 * t + 1)))
add(crowd * dayE, db(-27))
for at in np.arange(15.2, 37, 2.6):
    at = at + rng.uniform(-0.6, 0.6); p = rng.uniform(-0.8, 0.8)
    whoosh(at, rng.uniform(1.2, 2.0), db(-17), p, -p, 120, 1500)
for k in range(30):  # birds
    at = rng.uniform(14.8, 36); f = rng.uniform(2800, 4800)
    add(event(at, 0.12, lambda x: np.sin(2 * np.pi * np.cumsum(f + 900 * np.sin(np.pi * x / 0.12)) / SR) * np.sin(np.pi * x / 0.12)), db(-28), rng.uniform(-0.8, 0.8))
add(event(16.5, 0.3, lambda x: np.sin(2 * np.pi * 420 * x) * (x < 0.12) + np.sin(2 * np.pi * 330 * x) * (x >= 0.14)), db(-30), 0.5)  # distant horn
# reveal swell
add(norm(event(REVEAL - 0.2, 6, lambda x: np.sin(2 * np.pi * 36 * x) * np.clip(x / 0.4, 0, 1) * np.exp(-x * 0.6))), db(-6))
add(norm(filt(white, 'bandpass', [3000, 9000])) * ramp(19.5, REVEAL + 0.1, 1.4, 0.05) ** 2, db(-22))
# jumps: soft lift + landing thud (per 2.75 s, nearest jumpers)
per = 2 * np.sqrt(2 * 9.81 * 0.5) / (0.29 * 9.81) + 0.55
for off in [0.0, 0.37, 0.74]:
    k0 = int(np.floor((GRAV - 0.5 + off) / per))
    for k in range(k0, k0 + 5):
        take = k * per + 0.55 - off
        if GRAV < take < TL - 0.3:
            whoosh(take - 0.05, 1.0, db(-21), -0.2, 0.2, 500, 2500)
            land = take + per - 0.55
            if land < TL: add(event(land, 0.25, lambda x: np.sin(2 * np.pi * 70 * x) * np.exp(-x * 18) + 0.2 * rng.standard_normal(len(x)) * np.exp(-x * 60)), db(-16), 0.1)
# time-lapse: fast clock + rising sweeps
for k, at in enumerate(np.arange(TL, NIGHT - 0.2, 0.09)):
    add(event(at, 0.02, lambda x: np.sin(2 * np.pi * 3800 * x) * np.exp(-x * 300)), db(-27), 0.3 if k % 2 else -0.3)
for at in [TL + 0.2, TL + 2.4, TL + 4.6]: whoosh(at, 2.2, db(-14), -0.7, 0.7, 300, 3000)
# night: crickets
cr = np.zeros(N)
for k in range(8):
    f = rng.uniform(4200, 5200); rate = rng.uniform(2.5, 4.0); ph = rng.uniform(0, 1)
    gate = (np.sin(2 * np.pi * rate * t + ph * 6) > 0.6) * (np.sin(2 * np.pi * 45 * t) > 0)
    cr += np.sin(2 * np.pi * f * t) * gate * rng.uniform(0.4, 1)
add(norm(filt(cr, 'bandpass', [3500, 6500])) * nightE, db(-28), 0.2)
add(norm(filt(brown, 'lowpass', 250)) * nightE, db(-20))

# ---------------- the crush
rum = norm(filt(brown, 'lowpass', 120) + 0.4 * filt(white, 'lowpass', 300))
add(rum * ramp(SPIN, TEND, 2.5, 0.4) * (0.4 + 0.6 * np.clip((t - SPIN) / 3.7, 0, 1)), db(-4))
for at in [56.0, 56.9, 57.6, 58.1, 58.45]:
    add(event(at, 0.45, lambda x: np.sin(2 * np.pi * 52 * x) * np.exp(-x * 10)), db(-5))
for k in range(40):
    at = rng.uniform(56.5, 58.7)
    add(event(at, 0.3, lambda x: filt(rng.standard_normal(len(x)), 'bandpass', [150, 900]) * np.exp(-x * 14)), db(-15), rng.uniform(-0.8, 0.8))
add(norm(event(58.72, 5, lambda x: np.sin(2 * np.pi * (40 * x - 4 * x ** 2)) * np.exp(-x * 1.0))), db(-1))
add(filt(white, 'highpass', 1500) * np.exp(-np.clip(t - 58.72, 0, None) * 5) * (t >= 58.72), db(-11))
# screen crack
add(event(59.2, 0.4, lambda x: rng.standard_normal(len(x)) * np.exp(-x * 30)), db(-6), -0.2)
for k in range(24):
    at = 59.22 + rng.uniform(0, 0.6); f = rng.uniform(3000, 7000)
    add(event(at, 0.3, lambda x: np.sin(2 * np.pi * f * x) * np.exp(-x * 18)), db(-24), rng.uniform(-0.8, 0.8))
add(np.sin(2 * np.pi * 3400 * t) * np.exp(-np.clip(t - 59.2, 0, None) * 0.7) * (t >= 59.2) * ramp(59.2, TEND + 1, 0.3, 0.6), db(-36))
# end card
add(event(TEND, 4.5, lambda x: np.sin(2 * np.pi * 41 * x) * np.exp(-x * 2.0)), db(-5))
add(event(TEND + 0.1, 4.4, lambda x: (np.sin(2 * np.pi * 261.6 * x) + 0.5 * np.sin(2 * np.pi * 392 * x) + 0.35 * np.sin(2 * np.pi * 329.6 * x)) * np.exp(-x * 0.6) * np.clip(x / 0.4, 0, 1)), db(-16))

out = np.stack([L, Rr], 1)
out *= np.clip((DUR - t) / 0.6, 0, 1)[:, None]
out = np.tanh(out * 1.2) / np.tanh(1.2)
out /= np.abs(out).max() / 0.92
wavfile.write(sys.argv[1], SR, (out * 32767).astype(np.int16))
print('ok')
