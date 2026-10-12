import numpy as np, sys
from scipy.signal import butter, sosfilt
from scipy.io import wavfile

SR = 44100; DUR = 16.0; N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(7)
L = np.zeros(N); Rch = np.zeros(N)

def bp(x, lo, hi, order=2): return sosfilt(butter(order, [lo, hi], 'bandpass', fs=SR, output='sos'), x)
def lp(x, f, order=2): return sosfilt(butter(order, f, 'lowpass', fs=SR, output='sos'), x)
def hp(x, f, order=2): return sosfilt(butter(order, f, 'highpass', fs=SR, output='sos'), x)
def env(a, b, fa, fb):
    e = np.clip((t - a) / max(fa, 1e-3), 0, 1) * np.clip((b - t) / max(fb, 1e-3), 0, 1); return e
def add(sig, gain=1.0, pan=0.0):
    global L, Rch
    L += sig * gain * np.sqrt((1 - pan) / 2); Rch += sig * gain * np.sqrt((1 + pan) / 2)
def db(x): return 10 ** (x / 20)

white = rng.standard_normal(N)
brown = np.cumsum(rng.standard_normal(N)); brown = hp(brown, 20); brown /= np.abs(brown).max()

# city ambience 0-3
amb = bp(white, 200, 2500) * 0.25 + lp(brown, 400)
add(amb / np.abs(amb).max() * env(0, 3.05, 0.4, 0.05), db(-21))
# birds
for bt in [0.4, 0.9, 1.6, 2.2]:
    for k in range(3):
        st = bt + k * 0.11; d = 0.07; m = (t >= st) & (t < st + d); tt = t[m] - st
        f = 3200 + 1600 * np.sin(np.pi * tt / d)
        sig = np.zeros(N); sig[m] = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / d)
        add(sig, db(-25), pan=rng.uniform(-0.6, 0.6))
# countdown ticks
for k in [0.0, 1.0, 2.0]:
    m = (t >= k) & (t < k + 0.06); tt = t[m] - k
    sig = np.zeros(N); sig[m] = np.sin(2 * np.pi * 1800 * tt) * np.exp(-tt * 70)
    add(sig, db(-7))
# riser into the event
rise = bp(white, 300, 6000) * np.clip((t - 1.2) / 1.8, 0, 1) ** 3 * (t < 3.0)
add(rise / np.abs(rise).max(), db(-18))

# pad drone (whole video), darker after event
pad = np.zeros(N)
for f, a in [(55, 1), (110, .6), (164.8, .35), (220, .25), (261.6, .18)]:
    pad += a * np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.2 * t + f))
pad = lp(pad, 900) * np.clip(t / 1.5, 0, 1) * (1 - 0.6 * np.clip((t - 13.0) / 3, 0, 1))
add(pad / np.abs(pad).max(), db(-17))

# BOOM at 3.0
m = t >= 3.0; tt = t[m] - 3.0
boom = np.zeros(N)
boom[m] = np.sin(2 * np.pi * (48 * tt - 6 * tt ** 2)) * np.exp(-tt * 1.4) + 0.6 * lp(white, 180)[m] * np.exp(-tt * 3)
crack = np.zeros(N); crack[m] = hp(white, 1500)[m] * np.exp(-tt * 14)
add(boom / np.abs(boom).max(), db(-3)); add(crack, db(-16))

# wind roar 3-13
wenv = np.clip((t - 3.0) / 0.6, 0, 1) * (1 - np.clip((t - 12.8) / 0.5, 0, 1))
mod = 0.75 + 0.25 * np.sin(2 * np.pi * 0.37 * t) * np.sin(2 * np.pi * 0.11 * t + 1)
roar = lp(brown, 500) * 1.0 + bp(white, 250, 900) * 0.08
roar /= np.abs(roar).max()
# shot B (6.5-10) is closer and louder
loud = 1 + 0.5 * env(6.5, 10, 0.05, 0.05)
wl = roar * wenv * mod * loud
add(wl, db(-6), pan=-0.15); add(np.roll(wl, 900), db(-6), pan=0.15)
# howl: resonant band sweeping
howl = np.zeros(N)
seg = 4096
for i in range(0, N - seg, seg // 2):
    c = 500 + 300 * np.sin(2 * np.pi * 0.13 * i / SR) + 150 * np.sin(2 * np.pi * 0.41 * i / SR)
    w = np.hanning(seg); x = bp(white[i:i + seg], c * 0.9, c * 1.1) * w
    howl[i:i + seg] += x
howl = howl / np.abs(howl).max() * wenv
add(howl, db(-20))

# whooshes at cuts and for passing objects in shot B
def whoosh(at, dur, gain, p0, p1):
    m = (t >= at) & (t < at + dur); tt = (t[m] - at) / dur
    sig = np.zeros(N); sig[m] = bp(white, 400, 4000)[m] * np.sin(np.pi * tt) ** 2
    for s in range(6):
        sl = m.copy(); pan = p0 + (p1 - p0) * (s / 5)
    l = sig * np.interp(t, [at, at + dur], [np.sqrt((1 - p0) / 2), np.sqrt((1 - p1) / 2)])
    r = sig * np.interp(t, [at, at + dur], [np.sqrt((1 + p0) / 2), np.sqrt((1 + p1) / 2)])
    global L, Rch
    L += l * gain; Rch += r * gain
whoosh(6.25, 0.5, db(-8), -0.3, 0.3)
whoosh(9.75, 0.5, db(-8), -0.3, 0.3)
for at in [6.9, 7.5, 8.1, 8.6, 9.2]:
    whoosh(at + rng.uniform(-0.1, 0.1), 0.45, db(-13), -0.9, 0.9)

# end: low hit + soft tone
m = t >= 13.0; tt = t[m] - 13.0
hit = np.zeros(N); hit[m] = np.sin(2 * np.pi * 40 * tt) * np.exp(-tt * 2.2)
add(hit, db(-3))
tone = np.zeros(N); tone[m] = (np.sin(2 * np.pi * 220 * tt) + 0.5 * np.sin(2 * np.pi * 329.6 * tt)) * np.exp(-tt * 0.7) * np.clip(tt / 0.3, 0, 1)
add(tone, db(-14))

out = np.stack([L, Rch], 1)
out *= np.clip((DUR - t) / 0.4, 0, 1)[:, None]
out = np.tanh(out * 1.2) / np.tanh(1.2)
out /= np.abs(out).max() / 0.92
wavfile.write(sys.argv[1], SR, (out * 32767).astype(np.int16))
print('ok')
