import numpy as np, sys
from scipy.signal import butter, sosfilt
from scipy.io import wavfile

# "What if you took off your helmet in space?" (FIRST-PERSON version, timed to parts_pov) — suit breathing + radio hush, the helmet unlatches, a hiss, then SILENCE except your own
# body (heartbeat, a fizz of boiling spit, a creak of swelling); heartbeat slows into the blackout; rescue radio, airlock air rushing back,
# a gasp, one gentle theme. Mostly 200 Hz - 3 kHz. No steady high ticks.
SR = 44100; DUR = 64.5; N = int(SR * DUR); t = np.arange(N) / SR
VN = sys.argv[2] if len(sys.argv) > 2 else '1'; V2 = VN in ('2', '3'); V3 = VN == '3'   # 3 = German version: its own melody/key   # re-upload variant: other noise seed, other melody/key, a space shimmer in the opening
rng = np.random.default_rng(1990 if V3 else 2024 if V2 else 87); L = np.zeros(N); Rr = np.zeros(N)
OFF, EXHALE, SPIT, SWELL, SUNB, FADE, DARK, RESCUE, LOCK, BACK, TEND = 4.0, 5.2, 9.0, 15.0, 21.0, 27.0, 36.0, 40.0, 48.0, 54.0, 60.0
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
# ---- breathing: formant-filtered noise; inhale = airier and rising, exhale = lower and falling; HELM() adds the small-helmet colour
def bpn(x, lo, hi): return filt(x, 'bandpass', [lo, hi])
def breath(d, kind='out', voice=0.0, f0=130):
    x = tt(d); n = rng.standard_normal(len(x))
    if kind == 'in': s = 0.8 * norm(bpn(n, 1400, 3600)) + 0.6 * norm(bpn(n, 600, 1300)); env = np.clip(x / (0.75 * d), 0, 1) ** 1.6 * np.clip((d - x) / 0.06, 0, 1)
    else: s = 0.9 * norm(bpn(n, 450, 1100)) + 0.5 * norm(bpn(n, 1100, 2200)); env = np.clip(x / 0.08, 0, 1) * np.exp(-x * 2.2 / d) * np.clip((d - x) / 0.15, 0, 1)
    if voice: s = s + voice * norm(filt(np.sign(np.sin(2 * np.pi * f0 * (1 - 0.08 * x / d) * x)), 'bandpass', [180, 1200]))
    return norm(s * env)
def HELM(x):
    y = x.copy()
    for ms, g in [(5.5, 0.45), (9.0, 0.3), (14.0, 0.18)]: k = int(SR * ms / 1000); y[k:] += g * x[:-k]
    return filt(y, 'lowpass', 3200)
def MUF(x): return filt(x, 'lowpass', 700)   # bone-conducted, no air around you
def cough(at, g, pan=0.0):
    x = tt(0.35); s = norm(bpn(rng.standard_normal(len(x)), 300, 2600) + 0.6 * filt(np.sign(np.sin(2 * np.pi * 150 * x)), 'bandpass', [200, 1000])) * np.clip(x / 0.01, 0, 1) * np.exp(-x * 9); place(at, s, g, pan)
def gulp(at, g):
    x = tt(0.22); f = 260 * np.exp(-x * 3); s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 14) + 0.3 * norm(bpn(rng.standard_normal(len(x)), 300, 900)) * np.exp(-x * 20); place(at, s, g)
# inside the suit, calm then nervous (hands go up to the latches ~1.4 s)
for at, kind, d, g in [(0.15, 'in', 1.0, -21), (1.2, 'out', 1.3, -22), (2.45, 'in', 0.7, -20), (3.15, 'out', 0.5, -22), (3.55, 'in', 0.45, -18)]:
    place(at, HELM(breath(d, kind)), db(g))
rus = BN(700, 3000) * (0.5 + 0.5 * np.sin(2 * np.pi * 1.7 * t) ** 2); add(rus * ramp(1.3, OFF + 0.8, 0.3, 0.4), db(-34))          # suit fabric rustle as the arms lift
x = tt(0.18); place(3.0, filt(np.sin(2 * np.pi * 210 * x) + 0.5 * noise(0.18, 200, 1200), 'lowpass', 1500) * np.exp(-x * 25), db(-20))   # glove knocks the helmet ring
# helmet off: air leaves your mouth/nose on its own, a gulp, then futile chest heaves (no air -> only muffled throat sounds)
gulp(OFF + 0.6, db(-22)); place(EXHALE + 3.6, MUF(breath(0.6, 'in', 0.5, 110)), db(-24))
for k, at in enumerate([SPIT + 0.4, SPIT + 1.6, SPIT + 4.2, SWELL + 0.9, SWELL + 3.4, SUNB + 0.6, SUNB + 3.5, FADE + 1.0, FADE + 4.0]):
    place(at, MUF(breath(0.7 + 0.05 * k, 'in', 0.6, 105 - 2 * k)), db(-22 - 0.7 * k))
for at in [SPIT + 3.0, SWELL + 2.3, SUNB + 2.2]: gulp(at, db(-23))
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
place(EXHALE + 0.1, filt(breath(3.0, 'out', 0.35, 115), 'lowpass', 1100), db(-17))   # the long exhale (muffled, bone-conducted)
fz = BN(1500, 5000) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 3.3 * t))); add(fz * ramp(SPIT + 0.2, SWELL + 1.5, 0.6, 1.0), db(-31))           # spit fizz
for at in [SWELL + 0.8, SWELL + 2.6, SWELL + 4.4]: x = tt(1.0); f = rng.uniform(140, 200); place(at, filt(np.sign(np.sin(2 * np.pi * f * x)), 'lowpass', 800) * np.sin(np.pi * x / 1.0) * (0.6 + 0.4 * np.sin(2 * np.pi * 11 * x)), db(-29))
add(filt(np.sin(2 * np.pi * 1760 * t) + 0.5 * np.sin(2 * np.pi * 880 * t), 'lowpass', 2200) * ramp(FADE + 2, DARK + 2.5, 3.0, 1.0), db(-36))       # faint ringing as you fade
# ---- rescue: muffled radio voices, the hatch, air rushing back, a gasp
for i in range(6): x = tt(0.7); s = filt(noise(0.7, 300, 3000), 'bandpass', [500, 2000]) * np.clip(np.sin(2 * np.pi * 4.5 * x), 0, 1) * np.sin(np.pi * x / 0.7); place(RESCUE + 0.3 + i * 0.75, s, db(-27), 0.3)
for k in range(5): place(RESCUE + 0.6 + k * 0.9, bpn(breath(0.45 if k % 2 == 0 else 0.4, 'in' if k % 2 == 0 else 'out'), 400, 2200), db(-27), 0.3)   # crewmate breathing hard on the radio
x = tt(0.5); place(LOCK - 0.3, (np.sin(2 * np.pi * 180 * x) + noise(0.5, 200, 1500)) * np.exp(-x * 9), db(-15))
air = BN(250, 3500) * np.clip((t - LOCK) / 0.8, 0, 1) * (1 - np.clip((t - (LOCK + 2.5)) / 2.0, 0, 1)) * (t > LOCK); add(air, db(-15))
x = tt(0.9); place(LOCK + 2.3, filt(noise(0.9, 300, 3000), 'bandpass', [400, 1800]) * np.sin(np.pi * x / 0.9) ** 1.5, db(-17))     # gasp
add(BN(150, 800) * ramp(LOCK, TEND, 0.3, 0.6), db(-35))
at = LOCK + 3.3; per = 1.1
while at < TEND - 1.0:
    place(at, breath(per * 0.45, 'in', 0.25, 140), db(-19)); place(at + per * 0.45, breath(per * 0.55, 'out', 0.2, 125), db(-20)); at += per; per = min(2.8, per * 1.18)
cough(LOCK + 3.0, db(-18), 0.05); cough(LOCK + 3.45, db(-21), 0.05); cough(LOCK + 5.6, db(-22)); gulp(LOCK + 7.4, db(-22))

# ---- one theme: gentle piano, A minor -> C major; out during the silence
beat_s = 60 / (72 if V3 else 76 if V2 else 70); mel = [62, 69, 67, 65, 64, 65, 60, 62, 65, 69, 72, 70, 69, 67, 65, 64] if V3 else [64, 71, 69, 67, 66, 67, 62, 64, 67, 71, 74, 72, 71, 69, 67, 66] if V2 else [69, 72, 76, 74, 72, 71, 69, 64, 69, 72, 76, 79, 77, 76, 74, 72]
def theme(a, z, lv):
    k = 0; at = a
    while at < z: place(at, piano(mel[k % 16]), db(lv), 0.15 if k % 2 else -0.15); at += beat_s; k += 1
theme(0.3, OFF - 0.2, -27); theme(EXHALE + 1.0, FADE, -29); theme(LOCK + 2.5, TEND + 0.5, -24)
add(pad([50, 57, 62] if V3 else [52, 59, 64] if V2 else [57, 64, 69], EXHALE, DARK - 0.5, 2.0, 1.5), db(-40)); add(pad([41, 48, 57, 60] if V3 else [43, 50, 59, 62] if V2 else [48, 55, 64, 67], LOCK + 2, DUR, 2.0, 2.5) * (1 - 0.55 * ramp(LOCK + 2, TEND, 1.0, 1.5)), db(-34))
place(TEND + 0.2, sum(piano(n, 5.0, 0.5) * a for n, a in ([(41, 1), (48, 0.7), (57, 0.6), (60, 0.5), (65, 0.4)] if V3 else [(43, 1), (50, 0.7), (59, 0.6), (62, 0.5), (67, 0.4)] if V2 else [(48, 1), (55, 0.7), (64, 0.6), (67, 0.5), (72, 0.4)])), db(-20))
if V2: add(pad([62, 69, 74, 81] if V3 else [64, 71, 76, 83], 0, OFF + 0.1, 0.8, 0.15, lp=3200) * (0.75 + 0.25 * np.sin(2 * np.pi * 0.35 * t)), db(-37))   # soft space shimmer while you look at the Milky Way
out = np.stack([L, Rr], 1); out = sosfilt(butter(2, 60, 'highpass', fs=SR, output='sos'), out.T).T
out *= np.clip((DUR - t) / 0.8, 0, 1)[:, None] * np.clip(t / 0.05, 0, 1)[:, None]
out = np.tanh(out * 1.2) / np.tanh(1.2); out /= np.abs(out).max() / 0.92
wavfile.write(sys.argv[1], SR, (out * 32767).astype(np.int16)); print('ok')
