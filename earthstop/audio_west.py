import numpy as np, sys
from scipy.signal import butter, sosfilt
from scipy.io import wavfile

# "What if the Sun rose in the West?" (64 s): dawn city (traffic hum, a horn, murmurs, steam), crane whoosh, "backwards" reverse-swell spin,
# a soft bell at LA's and at NYC's sunrise, winds + jet pass, a hurricane panning in circles, dry desert wind, icy wind + ice cracks,
# birds/rain for the green Sahara, bubbles for the ocean bloom, rocket rumble; ONE warm sunrise piano theme. Mostly 200 Hz - 3 kHz, no ticks.
SR = 44100; DUR = 64.5; N = int(SR * DUR); t = np.arange(N) / SR
rng = np.random.default_rng(1811); L = np.zeros(N); Rr = np.zeros(N)
CRANE, SPIN, ZONES, WINDS, HURR, DRY, EURO, SAHARA, INDIAN, ROCKET, T_END = 4.2, 6.0, 10.5, 16.0, 23.0, 28.0, 36.0, 43.0, 49.0, 54.0, 60.0
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
def sm(a, b): k = np.clip((t - a) / (b - a), 0, 1); return k * k * (3 - 2 * k)
def win(a, b, f=0.6): return sm(a, a + f) * (1 - sm(b - f, b))
def bell(n, d=3.0): x = tt(d); f = hz(n); return (np.sin(2 * np.pi * f * x) + 0.5 * np.sin(2 * np.pi * f * 2.76 * x) * np.exp(-x * 3) + 0.25 * np.sin(2 * np.pi * f * 5.4 * x) * np.exp(-x * 6)) * np.exp(-x * 1.4) * np.clip(x / 0.004, 0, 1)
# --- dawn city
add(BN(180, 1400) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.3 * t)) * win(0, 6.0, 0.4), db(-27))
for at, f1, f2 in [(2.2, 415, 494), (4.6, 392, 466)]: x = tt(0.45); s = filt(np.sign(np.sin(2 * np.pi * f1 * x)) + np.sign(np.sin(2 * np.pi * f2 * x)), 'bandpass', [300, 2200]) * np.clip(x / 0.02, 0, 1) * np.clip((0.45 - x) / 0.05, 0, 1); place(at, s, db(-33), 0.4)
for i in range(9): x = tt(0.5); s = filt(rng.standard_normal(len(x)), 'bandpass', [350, 1500]) * np.sin(np.pi * x / 0.5) ** 2 * (0.6 + 0.4 * np.sin(2 * np.pi * rng.uniform(3, 6) * x)); place(0.9 + i * 0.42 + rng.uniform(0, 0.2), s, db(-33), rng.uniform(-0.6, 0.6))   # "whoa" murmurs
add(BN(1500, 5000) * win(0.2, 5.6, 0.5), db(-44))   # steam
# --- crane whoosh up into the sky + shimmer into the globe
sw = filt(rng.standard_normal(N), 'bandpass', [250, 2500]) * win(CRANE - 0.2, 6.6, 0.9) * (0.4 + 0.6 * sm(CRANE, 5.6)); add(sw, db(-22))
# --- backwards spin: reverse-swell "whooshes" (attack at the END) — the sound of things running in reverse
for i in range(5): d = 0.85; x = tt(d); s = filt(rng.standard_normal(len(x)), 'bandpass', [200, 1800]) * (x / d) ** 3 * np.clip((d - x) / 0.03, 0, 1); place(SPIN + 0.4 + i * 0.85, s, db(-21), -0.5 + 0.25 * i)
for i in range(4): x = tt(1.2); s = piano(74 - 2 * i, 1.2)[::-1] * np.clip(x / 0.02, 0, 1); place(SPIN + 0.6 + i * 1.0, s, db(-28), 0.2)
# --- sunrise bells: LA at ~11.1 s, New York at ~15.4 s
place(11.1, bell(81), db(-24), -0.5); place(11.1, bell(74), db(-30), -0.5); place(15.4, bell(81), db(-24), 0.5); place(15.4, bell(76), db(-30), 0.5)
# --- winds flowing + jet pass
wind = filt(rng.standard_normal(N), 'bandpass', [250, 2200]) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.45 * t + np.sin(2 * np.pi * 0.13 * t))); add(wind * win(WINDS - 0.2, HURR + 0.5, 1.0), db(-25))
jet = filt(rng.standard_normal(N), 'bandpass', [300, 3000]) * np.exp(-((t - 19.6) / 1.6) ** 2); add(jet, db(-22), 0.0)
# --- hurricane: deeper swirl, panning in circles (clockwise)
hw = filt(rng.standard_normal(N), 'bandpass', [200, 1400]) * win(HURR - 0.3, DRY + 0.4, 0.8) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.7 * t))
pan = np.sin(-2 * np.pi * 0.35 * t); L += hw * db(-21) * np.sqrt((1 - pan) / 2); Rr += hw * db(-21) * np.sqrt((1 + pan) / 2)
# --- dry: hot dusty wind; cold: thin icy whistle + two low ice cracks
add(filt(rng.standard_normal(N), 'bandpass', [400, 2600]) * win(DRY + 0.4, EURO, 0.8) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.2 * t)), db(-28))
add(filt(rng.standard_normal(N), 'bandpass', [800, 1600]) * win(EURO + 2.8, SAHARA, 1.0) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.25 * t) ** 2), db(-29))
for at in [EURO + 3.6, EURO + 5.1]: x = tt(0.4); place(at, filt(rng.standard_normal(len(x)), 'bandpass', [180, 1200]) * np.exp(-x * 14), db(-19))
# --- green Sahara: light rain + a few birds; ocean bloom: soft bubbles
add(filt(rng.standard_normal(N), 'bandpass', [900, 4000]) * win(SAHARA + 0.3, INDIAN, 0.8), db(-36))
for i in range(7): at = SAHARA + 1.2 + i * 0.7 + rng.uniform(0, 0.3); x = tt(0.22); f0 = rng.uniform(1900, 2600); s = np.sin(2 * np.pi * np.cumsum(f0 * (1 + 0.25 * np.sin(2 * np.pi * 9 * x))) / SR) * np.sin(np.pi * x / 0.22); place(at, s, db(-33), rng.uniform(-0.7, 0.7))
for i in range(26): at = INDIAN + 0.3 + rng.uniform(0, 4.4); x = tt(0.09); f0 = rng.uniform(300, 700); s = np.sin(2 * np.pi * np.cumsum(f0 * (1 + 1.5 * x / 0.09)) / SR) * np.exp(-x * 40); place(at, s, db(-28), rng.uniform(-0.6, 0.6))
# --- rocket: crackling rumble that rises and fades (kept above ~150 Hz for phones)
rk = filt(rng.standard_normal(N), 'bandpass', [150, 1100]) * (0.7 + 0.3 * np.abs(filt(rng.standard_normal(N), 'lowpass', 30)) * 3)
add(rk * sm(ROCKET + 0.6, ROCKET + 1.4) * (1 - sm(ROCKET + 3.5, T_END)), db(-17))
# --- ONE theme: warm sunrise piano (D major), quieter under the effects, resolving on the end card
beat_s = 60 / 72; mel = [74, 78, 81, 78, 76, 74, 73, 69, 71, 74, 78, 76, 74, 73, 71, 69]
k = 0; at = 0.4
while at < T_END - 0.3:
    lv = -24 if at < 6 else -29; place(at, piano(mel[k % 16], 2.4), db(lv), 0.15 if k % 2 else -0.15); at += beat_s; k += 1
add(pad([62, 66, 69], 0, T_END + 0.5, 2.0, 1.5), db(-36))
place(T_END + 0.2, sum(piano(n, 4.5, 0.5) * a for n, a in [(50, 1), (57, 0.7), (62, 0.6), (66, 0.5), (69, 0.4)]), db(-19))
out = np.stack([L, Rr], 1); out = sosfilt(butter(2, 60, 'highpass', fs=SR, output='sos'), out.T).T
out *= np.clip((DUR - t) / 0.8, 0, 1)[:, None] * np.clip(t / 0.05, 0, 1)[:, None]
out = np.tanh(out * 1.2) / np.tanh(1.2); out /= np.abs(out).max() / 0.92
wavfile.write(sys.argv[1], SR, (out * 32767).astype(np.int16)); print('ok')
