import numpy as np, sys
from scipy.signal import butter, sosfilt
from scipy.io import wavfile

# "What if you took off your helmet in space?" — suit breathing + radio hush, the helmet unlatches, a hiss, then SILENCE except your own
# body (heartbeat, a fizz of boiling spit, a creak of swelling); heartbeat slows into the blackout; rescue radio, airlock air rushing back,
# a gasp, one gentle theme. Mostly 200 Hz - 3 kHz. No steady high ticks.
SR = 44100; DUR = 66.5; N = int(SR * DUR); t = np.arange(N) / SR
rng = np.random.default_rng(87); L = np.zeros(N); Rr = np.zeros(N)
OFF, EXHALE, SPIT, SWELL, SUNB, FADE, DARK, RESCUE, LOCK, BACK, TEND = 4.0, 9.0, 15.0, 21.0, 27.0, 33.0, 40.0, 43.5, 48.0, 57.0, 61.0
def filt(x, kind, f, order=2): return sosfilt(butter(order, f, kind, fs=SR, output='sos'), x)
def db(x): return 10 ** (x / 20)
def ramp(a, b, fa=0.4, fb=0.4): return np.clip((t - a) / max(fa, 1e-3), 0, 1) * np.clip((b - t) / max(fb, 1e-3), 0, 1)
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
BN = lambda lo, hi: norm(filt(rng.standard_normal(N), 'bandpass', [lo, hi]))
def piano(n, d=2.5, b=1.0): x = tt(d); f = hz(n); return (np.sin(2 * np.pi * f * x) + 0.35 * b * np.sin(4 * np.pi * f * x) + 0.12 * b * np.sin(6 * np.pi * f * x)) * np.exp(-x * 1.8) * np.clip(x / 0.006, 0, 1)
def pad(chord, a, b, fa=1.0, fb=1.0, lp=1400): return filt(sum(np.sin(2 * np.pi * hz(n) * t) + 0.4 * np.sin(2 * np.pi * hz(n) * 1.004 * t) for n in chord), 'lowpass', lp) * ramp(a, b, fa, fb)
def beat(at, g):  # heartbeat lub-dub, given harmonics so phones hear it
    for k, (dt, a) in enumerate([(0, 1.0), (0.22, 0.7)]):
        x = tt(0.25); s = (np.sin(2 * np.pi * 70 * x) + 0.8 * np.sin(2 * np.pi * 140 * x) + 0.5 * np.sin(2 * np.pi * 280 * x)) * np.exp(-x * 22); place(at + dt, s * a, g)
# ---- inside the suit: breathing + soft radio hiss
for k in range(4): x = tt(1.6); place(0.2 + k * 1.0 - (0.5 if k else 0), filt(noise(1.6, 300, 2500), 'bandpass', [500, 1600]) * np.sin(np.pi * x / 1.6) ** 2, db(-26), 0.0)
add(BN(800, 3000) * ramp(0, OFF, 0.2, 0.05), db(-38))
x = tt(0.2); place(0.6, np.sin(2 * np.pi * 1200 * x) * np.exp(-x * 40), db(-30)); place(0.8, np.sin(2 * np.pi * 900 * x) * np.exp(-x * 40), db(-30))  # radio blip
# ---- the latch clicks, a burst of air, then silence
for at in [3.2, 3.5]: x = tt(0.12); place(at, (np.sin(2 * np.pi * 600 * x) + noise(0.12, 800, 3000)) * np.exp(-x * 50), db(-18))
x = tt(1.4); place(OFF - 0.05, noise(1.4, 300, 4000) * np.exp(-x * 3.2) * np.clip(x / 0.01, 0, 1), db(-10))
# ---- your own body, the only thing you hear
hb_times = []; at = OFF + 0.8; period = 0.62
while at < LOCK + 4:
    if at < DARK: period = 0.62 + 0.4 * max(0, (at - FADE) / (DARK - FADE))
    elif at < LOCK: period = 1.2
    else: period = max(0.8, period - 0.05)
    hb_times.append(at); at += period
for a in hb_times: beat(a, db(-17 if a < LOCK else -22))
x = tt(3.0); place(EXHALE + 0.1, filt(noise(3.0, 200, 2000), 'lowpass', 900) * np.exp(-x * 1.2) * np.clip(x / 0.05, 0, 1), db(-22))   # the exhale (muffled, bone-conducted)
fz = BN(1500, 5000) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 3.3 * t))); add(fz * ramp(SPIT + 0.2, SWELL + 1.5, 0.6, 1.0), db(-31))           # spit fizz
for at in [21.8, 23.6, 25.4]: x = tt(1.0); f = rng.uniform(140, 200); place(at, filt(np.sign(np.sin(2 * np.pi * f * x)), 'lowpass', 800) * np.sin(np.pi * x / 1.0) * (0.6 + 0.4 * np.sin(2 * np.pi * 11 * x)), db(-29))
add(filt(np.sin(2 * np.pi * 1760 * t) + 0.5 * np.sin(2 * np.pi * 880 * t), 'lowpass', 2200) * ramp(FADE + 2, DARK + 2.5, 3.0, 1.0), db(-36))       # faint ringing as you fade
# ---- rescue: muffled radio voices, the hatch, air rushing back, a gasp
for i in range(6): x = tt(0.7); s = filt(noise(0.7, 300, 3000), 'bandpass', [500, 2000]) * np.clip(np.sin(2 * np.pi * 4.5 * x), 0, 1) * np.sin(np.pi * x / 0.7); place(RESCUE + 0.3 + i * 0.75, s, db(-27), 0.3)
x = tt(0.5); place(LOCK - 0.3, (np.sin(2 * np.pi * 180 * x) + noise(0.5, 200, 1500)) * np.exp(-x * 9), db(-15))
air = BN(250, 3500) * np.clip((t - LOCK) / 0.8, 0, 1) * (1 - np.clip((t - (LOCK + 2.5)) / 2.0, 0, 1)) * (t > LOCK); add(air, db(-15))
x = tt(0.9); place(LOCK + 2.3, filt(noise(0.9, 300, 3000), 'bandpass', [400, 1800]) * np.sin(np.pi * x / 0.9) ** 1.5, db(-17))     # gasp
add(BN(150, 800) * ramp(LOCK, BACK, 0.3, 0.3), db(-33))
# ---- one theme: gentle piano, A minor -> C major; out during the silence
beat_s = 60 / 70; mel = [69, 72, 76, 74, 72, 71, 69, 64, 69, 72, 76, 79, 77, 76, 74, 72]
def theme(a, z, lv):
    k = 0; at = a
    while at < z: place(at, piano(mel[k % 16]), db(lv), 0.15 if k % 2 else -0.15); at += beat_s; k += 1
theme(0.3, OFF - 0.2, -27); theme(EXHALE + 1.0, FADE, -29); theme(LOCK + 2.5, TEND + 0.5, -24)
add(pad([57, 64, 69], EXHALE, DARK - 0.5, 2.0, 1.5), db(-31)); add(pad([48, 55, 64, 67], LOCK + 2, DUR, 2.0, 2.5), db(-28))
place(TEND + 0.2, sum(piano(n, 5.0, 0.5) * a for n, a in [(48, 1), (55, 0.7), (64, 0.6), (67, 0.5), (72, 0.4)]), db(-20))
out = np.stack([L, Rr], 1); out = sosfilt(butter(2, 60, 'highpass', fs=SR, output='sos'), out.T).T
out *= np.clip((DUR - t) / 0.8, 0, 1)[:, None] * np.clip(t / 0.05, 0, 1)[:, None]
out = np.tanh(out * 1.2) / np.tanh(1.2); out /= np.abs(out).max() / 0.92
wavfile.write(sys.argv[1], SR, (out * 32767).astype(np.int16)); print('ok')
