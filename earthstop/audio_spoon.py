import numpy as np, sys
from scipy.signal import butter, sosfilt
from scipy.io import wavfile

SR = 44100; DUR = 64.0; N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(91)
L = np.zeros(N); Rr = np.zeros(N)
# "What if Earth was shaped like a spoon?" — built on audio_rocket.py (roulette, fake-out, boing, pads, tilt, cracks, slump) + the catchy theme of audio_fart2.py
SR = 44100
CUBE, LAND, ROUL_END, CAMEO0, CAMEO1, OCEANS, SPACE_END, DIVE_END, UP, TILT, TIP, CRACK, ROUND, TEND = 3.0, 3.95, 5.0, 6.5, 9.0, 11.0, 17.0, 21.0, 28.0, 34.0, 41.0, 47.0, 55.0, 60.0
BACK, FALL = UP, CRACK + 2.0
ROUL = [0, 0.3, 0.6, 0.9, 1.2, 1.5, 1.8, 2.1, 2.4, 2.7, CUBE, LAND]

def filt(x, kind, f, order=2): return sosfilt(butter(order, f, kind, fs=SR, output='sos'), x)
def db(x): return 10 ** (x / 20)
def ramp(a, b, fa, fb): return np.clip((t - a) / max(fa, 1e-3), 0, 1) * np.clip((b - t) / max(fb, 1e-3), 0, 1)
def norm(x): return x / (np.abs(x).max() + 1e-9)
def tt(d): return np.arange(int(d * SR)) / SR
def place(at, sig, g=1.0, pan=0.0):
    global L, Rr
    i0 = int(at * SR)
    if i0 >= N: return
    s = sig[:N - i0]
    L[i0:i0 + len(s)] += s * g * np.sqrt((1 - pan) / 2); Rr[i0:i0 + len(s)] += s * g * np.sqrt((1 + pan) / 2)
def add(sig, g=1.0, pan=0.0):
    global L, Rr
    L += sig * g * np.sqrt((1 - pan) / 2); Rr += sig * g * np.sqrt((1 + pan) / 2)
def hz(n): return 440 * 2 ** ((n - 69) / 12)
def whoosh(at, dur, g, p0, p1, lo=400, hi=4000):
    x = tt(dur); s = filt(rng.standard_normal(len(x)), 'bandpass', [lo, hi]); s = s / (np.abs(s).max() + 1e-9) * np.sin(np.pi * x / dur) ** 2
    i0 = int(at * SR); s = s[:max(0, N - i0)]; pan = np.linspace(p0, p1, len(s))
    L[i0:i0 + len(s)] += s * g * np.sqrt((1 - pan) / 2); Rr[i0:i0 + len(s)] += s * g * np.sqrt((1 + pan) / 2)
def click(): x = tt(0.03); return np.sin(2 * np.pi * 2600 * x) * np.exp(-x * 220) + 0.4 * rng.standard_normal(len(x)) * np.exp(-x * 400)

white = rng.standard_normal(N)
brown = norm(filt(np.cumsum(rng.standard_normal(N)), 'highpass', 20))

# ---------- roulette: wheel clicks, slowing hard on the cube, final click to the tsunami
ct = []; x0 = 0.0
while x0 < CUBE: ct.append(x0); x0 += 1 / 22
for k, c in enumerate([CUBE + 0.08, CUBE + 0.2, CUBE + 0.36, CUBE + 0.56, CUBE + 0.8]): ct.append(c)
for c in ct: place(c, click(), db(-19), rng.uniform(-0.3, 0.3))
for i, a in enumerate(ROUL[1:-1]):
    whoosh(a - 0.08, 0.22, db(-15), -0.5 if i % 2 else 0.5, 0.5 if i % 2 else -0.5, 800, 6000)
    place(a, np.sin(2 * np.pi * (300 + 900 * np.exp(-tt(0.18) * 30)) * tt(0.18)) * np.exp(-tt(0.18) * 25), db(-14))
place(CUBE + 0.85, np.zeros(10))
# suspense hum under the cube, then the final click + whoosh + hit + chime
add(np.sin(2 * np.pi * 110 * t) * ramp(CUBE, LAND, 0.2, 0.02) * (0.5 + 0.5 * np.sin(2 * np.pi * 6 * t)), db(-26))
place(LAND, click(), db(-10)); whoosh(LAND - 0.15, 0.4, db(-9), 0.6, -0.6, 300, 6000)
place(LAND, norm(np.sin(2 * np.pi * (55 * tt(2.5) - 4 * tt(2.5) ** 2)) * np.exp(-tt(2.5) * 2.2)), db(-4))
for k, n in enumerate([76, 81, 88]): place(LAND + 0.03 * k, (np.sin(2 * np.pi * hz(n) * tt(2.8)) + 0.3 * np.sin(2 * np.pi * hz(n) * 2.01 * tt(2.8))) * np.exp(-tt(2.8) * 1.6) * np.clip(tt(2.8) / 0.004, 0, 1), db(-17), (k - 1) * 0.4)
# little 'boing' on the landing
x = tt(0.9); place(LAND + 0.05, np.sin(2 * np.pi * np.cumsum(260 + 160 * np.exp(-x * 3) * np.sin(2 * np.pi * 9 * x)) / SR) * np.exp(-x * 4), db(-16))


whoosh(CAMEO0 + 0.1, CAMEO1 - CAMEO0 - 0.1, db(-13), -0.9, 0.9, 300, 3500)
x = tt(0.5); place((CAMEO0 + CAMEO1) / 2, np.sin(2 * np.pi * np.cumsum(330 + 200 * np.exp(-x * 5) * np.sin(2 * np.pi * 11 * x)) / SR) * np.exp(-x * 6), db(-22), 0.2)

# ---------- music: pad + bell arpeggio through space and city, drops for the collapse
chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
pad = np.zeros(N); bell = np.zeros(N); CH = 4.0
for ci in range(15):
    ch = chords[ci % 4]; a = LAND + ci * CH
    if a > DUR: break
    e = ramp(a - 0.6, a + CH + 0.6, 0.8, 0.8)
    for n in ch + [ch[0] - 12, ch[0] - 24]: pad += e * (np.sin(2 * np.pi * hz(n) * t) + 0.3 * np.sin(2 * np.pi * hz(n) * 2.004 * t))
    for k in range(16):
        at = a + k * 0.25
        if at > DUR - 0.1: break
        n = ch[[0, 1, 2, 1][k % 4]] + 12 + (12 if k % 8 == 7 else 0)
        x = tt(1.2); bell[int(at * SR):int(at * SR) + len(x)] += ((np.sin(2 * np.pi * hz(n) * x) + 0.2 * np.sin(2 * np.pi * hz(n) * 3 * x)) * np.exp(-x * 4) * np.clip(x / 0.004, 0, 1))[:max(0, N - int(at * SR))]
pad = norm(filt(pad, 'lowpass', 1400))
music = np.clip((t - LAND) / 0.3, 0, 1) * (1 - 0.9 * ramp(CRACK - 0.5, 99, 1.5, 1))
add(pad * music * (1 + 0.4 * ramp(BACK, UP, 0.3, 1.5)), db(-19))
add(norm(bell) * music, db(-25), 0.2)

# ---------- space: low drone, drain swoosh, dive
add(np.sin(2 * np.pi * 48 * t) * (ramp(0, DIVE_END, 0.1, 0.4) + ramp(CRACK, TEND, 0.3, 0.6)), db(-24))
add(norm(filt(white, 'bandpass', [150, 1200])) * ramp(OCEANS + 0.3, OCEANS + 3.5, 0.6, 1.0), db(-15))
whoosh(OCEANS + 3.0, 1.6, db(-14), -0.5, 0.5, 2000, 8000)
dive = np.clip((t - SPACE_END) / (DIVE_END - SPACE_END), 0, 1) ** 2.5 * (t < DIVE_END + 0.4)
add(norm(filt(white, 'bandpass', [200, 1800])) * dive * np.exp(-np.clip(t - DIVE_END, 0, None) * 6), db(-8))
whoosh(DIVE_END - 0.5, 1.0, db(-6), -0.3, 0.3, 300, 5000)

# ---------- city ambience
cityE = ramp(DIVE_END, TIP, 0.4, 0.3)
traffic = norm(filt(brown, 'lowpass', 500) + filt(white, 'bandpass', [300, 1500]) * 0.1)
add(traffic * cityE, db(-16))
for k in range(22):
    at = rng.uniform(21, 40.5); f = rng.uniform(2800, 4800)
    place(at, np.sin(2 * np.pi * np.cumsum(f + 900 * np.sin(np.pi * tt(0.12) / 0.12)) / SR) * np.sin(np.pi * tt(0.12) / 0.12), db(-28), rng.uniform(-0.8, 0.8))
# turning around: deep swell for the mountain
place(BACK + 0.4, norm(np.sin(2 * np.pi * 36 * tt(5)) * np.clip(tt(5) / 0.5, 0, 1) * np.exp(-tt(5) * 0.7)), db(-7))
add(norm(filt(white, 'bandpass', [3000, 9000])) * ramp(BACK, BACK + 2.2, 1.8, 0.1) ** 2, db(-24))
# crane up: airy rise
add(norm(filt(white, 'bandpass', [600, 3000])) * ramp(UP, UP + 3.0, 2.5, 0.5), db(-22))
# tilt: groan + cars rolling
place(TILT + 0.5, np.sin(2 * np.pi * np.cumsum(70 - 25 * tt(2.2) / 2.2) / SR) * np.sin(np.pi * tt(2.2) / 2.2), db(-12))
roll = filt(white, 'bandpass', [120, 700]) * (0.6 + 0.4 * np.sin(2 * np.pi * 3 * t))
add(norm(roll) * ramp(TILT + 0.9, TIP, 0.8, 0.3), db(-15))
for k in range(18): place(rng.uniform(TILT + 1.5, TIP - 0.3), np.sin(2 * np.pi * rng.uniform(70, 140) * tt(0.3)) * np.exp(-tt(0.3) * 16), db(-17), rng.uniform(-0.8, 0.8))
# the handle tip: no air, just a hollow tone
add(norm(filt(white, 'bandpass', [400, 1400])) * ramp(TIP, CRACK, 0.5, 0.5) * 0.5, db(-24))
# cracks: rumble building through the softening
add(norm(filt(brown, 'lowpass', 120)) * ramp(CRACK - 2.0, ROUND, 1.5, 1.0) * (0.5 + 0.5 * np.clip((t - CRACK) / 6, 0, 1)), db(-6))
for at in [47.6, 48.6, 49.5, 50.3, 51.0]: place(at, np.sin(2 * np.pi * 48 * tt(0.6)) * np.exp(-tt(0.6) * 8), db(-7))
for k in range(20): place(rng.uniform(47.2, 52.0), filt(rng.standard_normal(int(0.4 * SR)), 'bandpass', [150, 900]) * np.exp(-tt(0.4) * 12), db(-16), rng.uniform(-0.8, 0.8))
# "goes soft": a slow descending slide whistle over the droop, then booms as it slumps
x = tt(3.2); f = 1500 * np.exp(-x * 0.55) + 250
place(FALL + 0.2, np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.6 + 0.4 * np.sin(2 * np.pi * 5.5 * x)) * np.clip(x / 0.05, 0, 1) * np.clip((3.2 - x) / 0.4, 0, 1), db(-15))
for at in [51.6, 52.4, 53.1, 53.7, 54.2]: place(at, norm(np.sin(2 * np.pi * (45 * tt(1.5) - 5 * tt(1.5) ** 2)) * np.exp(-tt(1.5) * 2.5)), db(-6))
add(norm(filt(white, 'bandpass', [300, 3000])) * ramp(50.5, ROUND, 0.5, 1.0), db(-16))
# round again: calm chord
for k, n in enumerate([60, 64, 67, 72]): place(ROUND + 0.4 + 0.05 * k, (np.sin(2 * np.pi * hz(n) * tt(5)) + 0.3 * np.sin(2 * np.pi * hz(n) * 2 * tt(5))) * np.exp(-tt(5) * 0.6) * np.clip(tt(5) / 0.3, 0, 1), db(-19), (k - 1.5) * 0.3)
# end card
place(TEND, np.sin(2 * np.pi * 41 * tt(4.5)) * np.exp(-tt(4.5) * 2.0), db(-5))
x = tt(4.4); place(TEND + 0.1, (np.sin(2 * np.pi * 220 * x) + 0.5 * np.sin(2 * np.pi * 329.6 * x) + 0.35 * np.sin(2 * np.pi * 277.2 * x)) * np.exp(-x * 0.6) * np.clip(x / 0.4, 0, 1), db(-15))

# ---------- background theme (from audio_fart2.py): chiptune-ish lead hook + oom-pah tuba + pizz + soft kick/clap, swung
def lead(n, d, vib=0.006):
    x = tt(d); f = hz(n) * (1 + vib * np.sin(2 * np.pi * 5.5 * x) * np.clip(x / 0.12, 0, 1))
    ph = np.cumsum(f) / SR; sq = np.sign(np.sin(2 * np.pi * ph)) * 0.55 + 0.45 * np.sin(2 * np.pi * ph)
    return filt(sq, 'lowpass', 3200) * np.clip(x / 0.008, 0, 1) * np.clip((d - x) / 0.03, 0, 1) * (0.75 + 0.25 * np.exp(-x * 6))
def tubaN(n, d):
    x = tt(d); f = hz(n); s = sum(np.sin(2 * np.pi * f * k * x) / k ** 1.2 for k in range(1, 6))
    return s * np.clip(x / 0.015, 0, 1) * np.exp(-x * 7)
def pizz2(n, d=0.25): x = tt(d); f = hz(n); return (np.sin(2 * np.pi * f * x) + 0.4 * np.sin(4 * np.pi * f * x)) * np.exp(-x * 18)
def kickM(): x = tt(0.22); return np.sin(2 * np.pi * (55 * x + 70 * (1 - np.exp(-x * 40)) / 40)) * np.exp(-x * 14)
def clapM(): x = tt(0.14); s = filt(rng.standard_normal(len(x)), 'bandpass', [1000, 4000]); return s * (np.exp(-x * 40) + 0.5 * np.exp(-np.abs(x - 0.012) * 300))
def bellM(n, d=1.0): x = tt(d); f = hz(n); return (np.sin(2 * np.pi * f * x) + 0.3 * np.sin(2 * np.pi * f * 2.76 * x)) * np.exp(-x * 5)
MBPM = 122; beat = 60 / MBPM; SW = 0.62
def pos8(i): return (i // 2) * beat + (SW * beat if i % 2 else 0.0)
HOOK_A = [(72, 1), (77, 1), (81, 1), (79, 1), (77, 2), None, (74, 1), (72, 1), None, (72, 1), (74, 1), (77, 2), None, None, None]
HOOK_B = [(72, 1), (77, 1), (81, 1), (84, 1), (81, 2), None, (79, 1), (77, 1), (79, 1), (81, 1), (79, 1), (77, 3), None, None]
PROG = [(53, [0, 4, 7]), (58, [0, 4, 7]), (48, [0, 4, 7, 10]), (53, [0, 4, 7])]
SECTIONS = [(LAND + 0.4, SPACE_END - 0.1, PROG, [HOOK_A, HOOK_B], 0.8, 0.7), (DIVE_END + 0.3, TILT - 0.1, PROG, [HOOK_A, HOOK_B, HOOK_A, None], 0.7, 0.6),
            (TILT + 0.4, TIP - 0.1, PROG, [HOOK_B, HOOK_A], 0.9, 0.7), (ROUND + 0.6, TEND - 0.1, PROG, [HOOK_A], 0.5, 0.55)]
music2 = np.zeros(N)
def put(at, sig, g=1.0):
    i0 = int(at * SR)
    if i0 >= N or i0 < 0: return
    s = sig[:N - i0]; music2[i0:i0 + len(s)] += s * g
for (a, b, prog, mels, dl, lg) in SECTIONS:
    bar = 4 * beat; nb = 0; at = a
    while at < b - 0.05:
        root, ch = prog[nb % len(prog)]
        for k in range(4):
            tk = at + k * beat
            if tk >= b - 0.02: break
            if k % 2 == 0: put(tk, tubaN(root - 12 + (7 if k == 2 else 0), beat * 0.9), 0.85)
            else:
                for iv in ch: put(tk, pizz2(root + 12 + iv), 0.22)
            if dl > 0: put(tk, kickM() if k % 2 == 0 else clapM(), (0.7 if k % 2 == 0 else 0.42) * dl)
        mel = mels[(nb // 2) % len(mels)]
        if mel is not None and lg > 0:
            half = (nb % 2) * 8
            for i in range(8):
                ev = mel[half + i] if half + i < len(mel) else None
                if ev is None: continue
                n, ln = ev; t0 = at + pos8(i); t1 = at + pos8(i + ln)
                if t0 < b - 0.05: put(t0, lead(n, (t1 - t0) * 0.92), lg * 0.5)
        if nb % 4 == 0: put(at, bellM(84), 0.18)
        at += bar; nb += 1
mduck = np.ones(N)
for (a, b, d) in [(CAMEO0, CAMEO1, 0.55), (DIVE_END - 0.8, DIVE_END + 0.6, 0.3), (TILT, TILT + 1.6, 0.5)]:
    mduck *= 1 - (1 - d) * ramp(a, b, 0.15, 0.3)
add(norm(music2) * mduck, db(-17))

out = np.stack([L, Rr], 1)
out = sosfilt(butter(2, 70, 'highpass', fs=SR, output='sos'), out.T).T
out *= np.clip((DUR - t) / 0.6, 0, 1)[:, None]
out = np.tanh(out * 1.2) / np.tanh(1.2)
out /= np.abs(out).max() / 0.92
wavfile.write(sys.argv[1], SR, (out * 32767).astype(np.int16))
print('ok')
