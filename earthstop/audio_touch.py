import numpy as np, sys
from scipy.signal import butter, sosfilt
from scipy.io import wavfile

# "What if we could actually touch each other?" — cold dive, pause on the switch, playful fall, riser to fusion, warm piano outro
SR = 44100; DUR = 67.0; N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(17)
L = np.zeros(N); Rr = np.zeros(N)
HOOK, DIVE_END, ATOM_END, BENCH_END, HUG_END, FLIP, SWITCH_END, SLOWMO_END, SINK_END, CUT, ARRIVE, EARTH_END, FUSE, FUSE_END, T_END = 2.6, 7.0, 15.0, 22.0, 28.0, 29.0, 30.0, 31.5, 34.0, 35.6, 41.8, 50.0, 56.4, 58.0, 63.6

def filt(x, kind, f, order=2): return sosfilt(butter(order, f, kind, fs=SR, output='sos'), x)
def db(x): return 10 ** (x / 20)
def ramp(a, b, fa, fb): return np.clip((t - a) / max(fa, 1e-3), 0, 1) * np.clip((b - t) / max(fb, 1e-3), 0, 1)
def norm(x): return x / (np.abs(x).max() + 1e-9)
def tt(d): return np.arange(int(d * SR)) / SR
def place(at, sig, g=1.0, pan=0.0):
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
def bellnote(n, d=1.4, dec=3.5, h3=0.2):
    x = tt(d); return (np.sin(2 * np.pi * hz(n) * x) + h3 * np.sin(2 * np.pi * hz(n) * 3 * x)) * np.exp(-x * dec) * np.clip(x / 0.004, 0, 1)
def piano(n, d=2.5):
    x = tt(d); f = hz(n); s = sum(np.sin(2 * np.pi * f * k * 1.0008 ** k * x) / k ** 1.4 * np.exp(-x * (1.2 + 0.7 * k)) for k in range(1, 7))
    return s * np.clip(x / 0.003, 0, 1)
def kick(): x = tt(0.35); return np.sin(2 * np.pi * (48 * x + 90 * (1 - np.exp(-x * 30)) / 30)) * np.exp(-x * 9)
def hat(): x = tt(0.06); return filt(rng.standard_normal(len(x)), 'highpass', 7000) * np.exp(-x * 70)

white = rng.standard_normal(N)
brown = norm(filt(np.cumsum(rng.standard_normal(N)), 'highpass', 20))

# ---------- hook: hum + heartbeat while the hands approach, then the dive
add(np.sin(2 * np.pi * 55 * t) * ramp(0, 7.2, 0.3, 0.6) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.5 * t)), db(-24))
for k in range(4):
    for d in [0, 0.22]: place(0.15 + k * 0.72 + d, np.sin(2 * np.pi * 52 * tt(0.25)) * np.exp(-tt(0.25) * 18), db(-9 - 3 * (d > 0)))
add(norm(filt(white, 'bandpass', [2500, 8000])) * ramp(0.5, HOOK, 1.9, 0.05) ** 2, db(-28))
# dive: descending filtered rush through the scales + ticks at each layer change
sweep = filt(white, 'bandpass', [300, 3000]) * ramp(HOOK - 0.2, DIVE_END + 0.2, 0.3, 0.4)
add(norm(sweep) * (0.5 + 0.5 * np.sin(2 * np.pi * 3 * t)), db(-17))
for at in [HOOK, 4.35, 6.2]: whoosh(at - 0.35, 0.8, db(-9), 0.5, -0.5, 200, 5000); place(at, bellnote(88, 1.2, 4), db(-22))
place(DIVE_END - 0.1, np.sin(2 * np.pi * (60 * tt(2.5) - 6 * tt(2.5) ** 2)) * np.exp(-tt(2.5) * 1.6), db(-6))

# ---------- cold pads + arpeggio (atoms, bench, hug); warms up slightly at the hug
chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
pad = np.zeros(N); arp = np.zeros(N); CH = 3.5
for ci in range(9):
    ch = chords[ci % 4]; a = DIVE_END + ci * CH
    e = ramp(a - 0.6, a + CH + 0.6, 0.9, 0.9)
    for n in ch + [ch[0] - 12, ch[0] - 24]: pad += e * (np.sin(2 * np.pi * hz(n) * t) + 0.3 * np.sin(2 * np.pi * hz(n) * 2.004 * t))
    for k in range(14):
        at = a + k * 0.25
        if at > FLIP - 0.2: break
        n = ch[[0, 1, 2, 1][k % 4]] + 12 + (12 if k % 8 == 7 else 0)
        s = bellnote(n, 1.2, 4.2); i0 = int(at * SR); arp[i0:i0 + len(s)] += s[:max(0, N - i0)]
pad = norm(filt(pad, 'lowpass', 1300)); arp = norm(arp)
mus1 = np.clip((t - DIVE_END + 0.5) / 1.0, 0, 1) * (1 - np.clip((t - (FLIP - 0.6)) / 0.6, 0, 1))
add(pad * mus1 * (1 + 0.4 * ramp(BENCH_END, FLIP, 1.5, 0.5)), db(-18))
add(arp * mus1 * np.clip((t - 9) / 2, 0, 1), db(-25), 0.2)
# electrons pushing back: soft thump + springy wobble
place(11.4, np.sin(2 * np.pi * 70 * tt(0.5)) * np.exp(-tt(0.5) * 9), db(-8))
x = tt(1.6); place(11.45, np.sin(2 * np.pi * np.cumsum(420 + 140 * np.exp(-x * 1.4) * np.sin(2 * np.pi * 5 * x)) / SR) * np.exp(-x * 2.2), db(-24))
# electron shimmer in the atom shots
shim = filt(white, 'bandpass', [5000, 11000]) * (0.5 + 0.5 * np.sin(2 * np.pi * 7.3 * t))
add(norm(shim) * (ramp(DIVE_END - 0.5, ATOM_END, 0.6, 0.3) + ramp(EARTH_END, FUSE, 0.3, 0.1)), db(-34))
# cut atoms -> street, street ambience (bench/hug/sink)
whoosh(ATOM_END - 0.45, 0.9, db(-11), -0.4, 0.4, 300, 4000)
traffic = norm(filt(brown, 'lowpass', 500) + filt(white, 'bandpass', [300, 1500]) * 0.1)
add(traffic * (ramp(ATOM_END, SLOWMO_END + 0.5, 0.3, 0.8) + ramp(0, HOOK, 0.1, 0.3) * 0.6 + ramp(FUSE_END, DUR, 0.8, 1.0) * 0.5), db(-21))
for k in range(10):
    at = rng.uniform(15.5, 28); f = rng.uniform(2800, 4800)
    place(at, np.sin(2 * np.pi * np.cumsum(f + 900 * np.sin(np.pi * tt(0.12) / 0.12)) / SR) * np.sin(np.pi * tt(0.12) / 0.12), db(-30), rng.uniform(-0.8, 0.8))
# glow swell on the hug
add(norm(filt(white, 'bandpass', [1500, 6000])) * ramp(22.6, 25.0, 2.0, 0.6) ** 2, db(-30))

# ---------- the switch: everything stops, click, glitch
place(FLIP, np.sin(2 * np.pi * 2400 * tt(0.03)) * np.exp(-tt(0.03) * 200) + 0.5 * rng.standard_normal(int(0.03 * SR)) * np.exp(-tt(0.03) * 300), db(-4))
place(FLIP + 0.01, np.sin(2 * np.pi * 900 * tt(0.08)) * np.exp(-tt(0.08) * 60), db(-12))
g = np.sign(np.sin(2 * np.pi * 37 * tt(0.35))) * filt(rng.standard_normal(int(0.35 * SR)), 'bandpass', [600, 4000]); place(FLIP + 0.05, norm(g) * np.exp(-tt(0.35) * 7), db(-16))
place(FLIP + 0.45, np.sin(2 * np.pi * (80 * tt(1.2) - 25 * tt(1.2) ** 2)) * np.exp(-tt(1.2) * 3), db(-10))

# ---------- sink: slow-mo drone, then wind + rock rush underground
add(np.sin(2 * np.pi * 41 * t) * ramp(SWITCH_END, SLOWMO_END + 0.3, 0.3, 0.3) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.8 * t)), db(-12))
place(SWITCH_END + 0.1, norm(filt(rng.standard_normal(int(1.4 * SR)), 'lowpass', 400)) * np.sin(np.pi * tt(1.4) / 1.4), db(-12))
wind = norm(filt(white, 'bandpass', [250, 2500]))
add(wind * ramp(SLOWMO_END, SINK_END + 0.3, 0.6, 0.3) * np.clip((t - SLOWMO_END) / 2.5, 0, 1) ** 1.5, db(-10))
add(norm(filt(brown, 'lowpass', 160)) * ramp(SLOWMO_END, SINK_END, 0.4, 0.2), db(-9))
for k in range(26): place(rng.uniform(SLOWMO_END + 0.3, SINK_END - 0.1), filt(rng.standard_normal(int(0.25 * SR)), 'bandpass', [200, 1500]) * np.exp(-tt(0.25) * 20), db(-17), rng.uniform(-0.9, 0.9))
whoosh(SINK_END - 0.5, 1.0, db(-7), 0.4, -0.4, 200, 6000)

# ---------- through the planet: playful beat + falling melody, time-lapse whoops
BPM = 112; beat = 60 / BPM; A0 = SINK_END + 0.15
mel = [76, 74, 72, 69, 67, 69, 72, 74, 76, 79, 76, 74, 72, 74, 69, 67]
pl = np.zeros(N); bass = np.zeros(N)
nb = int((EARTH_END - A0) / beat)
for i in range(nb):
    at = A0 + i * beat
    if i % 2 == 0: place(at, kick(), db(-8))
    place(at + beat / 2, hat(), db(-21), 0.3)
    if i % 4 == 2: place(at, filt(rng.standard_normal(int(0.15 * SR)), 'bandpass', [1200, 5000]) * np.exp(-tt(0.15) * 30), db(-18))
    n = mel[i % len(mel)]; x = tt(0.45); s = (np.sign(np.sin(2 * np.pi * hz(n) * x)) * 0.25 + np.sin(2 * np.pi * hz(n) * x)) * np.exp(-x * 7) * np.clip(x / 0.003, 0, 1)
    i0 = int(at * SR); pl[i0:i0 + len(s)] += s[:max(0, N - i0)]
    bn = [45, 45, 41, 41, 36, 36, 43, 43][(i // 2) % 8]; x = tt(beat); s = np.sin(2 * np.pi * hz(bn) * x) * np.exp(-x * 3); bass[i0:i0 + len(s)] += s[:max(0, N - i0)]
add(norm(filt(pl, 'lowpass', 3500)) * ramp(A0, EARTH_END - 0.1, 0.2, 0.3), db(-20), -0.15)
add(norm(bass) * ramp(A0, EARTH_END - 0.1, 0.2, 0.3), db(-15))
# cut-away reveal: deep swoosh
whoosh(CUT - 0.1, 1.2, db(-9), -0.6, 0.6, 120, 2500)
# arrival: splash + chime
place(ARRIVE, norm(filt(rng.standard_normal(int(1.2 * SR)), 'bandpass', [300, 3500])) * np.exp(-tt(1.2) * 3.5), db(-12))
for k, n in enumerate([84, 88, 91]): place(ARRIVE + 0.05 * k, bellnote(n, 2.0, 2.0), db(-20), (k - 1) * 0.4)
# time-lapse oscillation: whoops that speed up (pitch follows the fall)
FK = 0.537; rate = np.where(t > ARRIVE, np.exp(FK * (t - ARRIVE)), 0.0); ph = np.cumsum(rate) / SR * (2 * np.pi / 10.4)
whoop = np.sin(2 * np.pi * np.cumsum(300 + 260 * np.cos(ph)) / SR) * (0.5 + 0.5 * np.abs(np.sin(ph)))
add(whoop * ramp(43.0, EARTH_END, 1.0, 0.3), db(-27))

# ---------- squeeze -> fusion: riser, heartbeat-like pressure pulses, boom
rz = np.clip((t - EARTH_END) / (FUSE - EARTH_END), 0, 1)
riser = np.sin(2 * np.pi * np.cumsum(90 + 700 * rz ** 2.2) / SR) + 0.5 * np.sin(2 * np.pi * np.cumsum(181 + 1400 * rz ** 2.2) / SR)
add(riser * ramp(EARTH_END, FUSE, 0.4, 0.02) * rz ** 1.2, db(-17))
add(norm(filt(white, 'bandpass', [800, 8000])) * ramp(EARTH_END, FUSE, 1.5, 0.02) * rz ** 3, db(-15))
for k in range(12):
    at = EARTH_END + 0.4 + k * (FUSE - EARTH_END - 0.5) / 12 * (1 - 0.03 * k)
    place(at, np.sin(2 * np.pi * 50 * tt(0.4)) * np.exp(-tt(0.4) * 10), db(-10 + k * 0.4))
place(FUSE - 0.25, np.zeros(10))
place(FUSE, norm(np.sin(2 * np.pi * (38 * tt(5) - 3 * tt(5) ** 2)) * np.exp(-tt(5) * 0.9)), db(-1))
place(FUSE, rng.standard_normal(int(0.6 * SR)) * np.exp(-tt(0.6) * 12), db(-7))
for k in range(20): place(FUSE + 0.02 + rng.uniform(0, 0.5), np.sin(2 * np.pi * rng.uniform(3000, 7000) * tt(0.3)) * np.exp(-tt(0.3) * 18), db(-25), rng.uniform(-0.8, 0.8))
add(np.sin(2 * np.pi * 3100 * t) * np.exp(-np.clip(t - FUSE, 0, None) * 1.1) * (t >= FUSE) * ramp(FUSE, FUSE_END + 0.8, 0.05, 0.6), db(-34))

# ---------- warm outro: piano + soft pad
prog = [(FUSE_END + 0.1, [48, 55, 64, 67], [72, 74, 76]), (FUSE_END + 2.0, [45, 52, 60, 64], [76, 74, 72]), (FUSE_END + 3.9, [41, 48, 57, 60], [69, 72, 74]), (FUSE_END + 5.7, [43, 50, 59, 62], [74, 72, 71])]
opad = np.zeros(N)
for at, ch, me in prog:
    for n in ch: place(at, piano(n, 3.5), db(-20))
    for j, n in enumerate(me): place(at + 0.15 + j * 0.55, piano(n, 2.2), db(-15))
    e = ramp(at - 0.2, at + 2.2, 0.6, 0.8)
    for n in ch: opad += e * np.sin(2 * np.pi * hz(n + 12) * t)
add(norm(filt(opad, 'lowpass', 1500)) * np.clip((t - FUSE_END) / 1.0, 0, 1), db(-26))
# end card: resolving chord
for n in [48, 55, 60, 64, 67, 72]: place(T_END + 0.15, piano(n, 3.2), db(-17))
place(T_END, np.sin(2 * np.pi * 41 * tt(3.0)) * np.exp(-tt(3.0) * 2.0), db(-9))

out = np.stack([L, Rr], 1)
out *= np.clip((DUR - t) / 0.8, 0, 1)[:, None]
out = np.tanh(out * 1.2) / np.tanh(1.2)
out /= np.abs(out).max() / 0.92
wavfile.write(sys.argv[1], SR, (out * 32767).astype(np.int16))
print('ok')
