import numpy as np, sys
from scipy.signal import butter, sosfilt
from scipy.io import wavfile

# "Was wäre, wenn die Deutsche Bahn immer pünktlich wäre?" (20 s German short): platform murmur, a station gong, soft whooshes as the board rows flip,
# a low "late" blip when the clock passes +6:00, the train rolling in and braking, people boarding, a closing chord. No ticking (the clock sweeps silently).
SR = 44100; DUR = 20.0; N = int(SR * DUR); t = np.arange(N) / SR
rng = np.random.default_rng(909); L = np.zeros(N); R = np.zeros(N)
BOARD, CLOCK, ARRIVE, CARD = 3.0, 8.0, 13.0, 18.0
def filt(x, kind, f, order=2): return sosfilt(butter(order, f, kind, fs=SR, output='sos'), x)
def db(x): return 10 ** (x / 20)
def norm(x): return x / (np.abs(x).max() + 1e-9)
def sm(a, b): k = np.clip((t - a) / (b - a), 0, 1); return k * k * (3 - 2 * k)
def win(a, b, f=0.4): return sm(a, a + f) * (1 - sm(b - f, b))
def tt(d): return np.arange(int(d * SR)) / SR
def add(sig, g=1.0, pan=0.0):
    global L, R
    L += sig * g * np.sqrt((1 - pan) / 2); R += sig * g * np.sqrt((1 + pan) / 2)
def place(at, sig, g=1.0, pan=0.0):
    i0 = int(at * SR)
    if i0 >= N: return
    s = sig[:N - i0]; L[i0:i0 + len(s)] += s * g * np.sqrt((1 - pan) / 2); R[i0:i0 + len(s)] += s * g * np.sqrt((1 + pan) / 2)
def tone(f, d, decay=2.0): x = tt(d); return (np.sin(2 * np.pi * f * x) + 0.4 * np.sin(4 * np.pi * f * x) * np.exp(-x * 3)) * np.exp(-x * decay) * np.clip(x / 0.004, 0, 1)
def voice(at, d, f0, g, pan=0.0):   # wordless murmur
    x = tt(d); f = f0 * (1 + 0.12 * np.sin(2 * np.pi * 2 * x + rng.uniform(0, 6))); src = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR))
    s = filt(src, 'bandpass', [500, 1300]) + 0.6 * filt(src, 'bandpass', [1400, 2200]); syl = np.clip(np.abs(np.sin(np.pi * 4 * x)) * 1.6, 0, 1)
    place(at, norm(s) * syl * np.clip(x / 0.04, 0, 1) * np.clip((d - x) / 0.08, 0, 1), g, pan)
# platform room tone + murmur (sighing at first), a soft breeze
add(norm(filt(rng.standard_normal(N), 'bandpass', [150, 1000])) * win(0, DUR, 0.3), db(-33))
for k in range(16): voice(rng.uniform(0, 17), rng.uniform(0.6, 1.3), rng.uniform(110, 220), db(-34), rng.uniform(-0.8, 0.8))
for at in [0.6, 1.5]: x = tt(1.0); place(at, filt(rng.standard_normal(len(x)), 'bandpass', [450, 1500]) * np.exp(-x * 2.4) * np.clip(x / 0.08, 0, 1), db(-24), rng.uniform(-0.5, 0.5))   # sighs
# station gong (three notes) right after the title
for n, dt in [(659.3, 0), (523.3, 0.42), (392.0, 0.84)]: place(2.6 + dt, tone(n, 1.6, 2.2), db(-23), -0.2)
# the board rows flip: soft airy whooshes, one per row
for r in range(4): x = tt(0.3); place(BOARD + 0.6 + r * 0.45, filt(rng.standard_normal(len(x)), 'bandpass', [600, 2400]) * np.sin(np.pi * x / 0.3), db(-27), 0.2)
# a happy little two-note when the whole board is green
place(BOARD + 2.5, tone(784, 0.8, 3), db(-26)); place(BOARD + 2.68, tone(1046.5, 0.9, 3), db(-27))
# the "late" blip when the clock passes +6:00 (low, short)
x = tt(0.6); place(CLOCK + 4.17, (np.sin(2 * np.pi * 180 * x) + 0.5 * np.sign(np.sin(2 * np.pi * 180 * x))) * np.exp(-x * 7) * 0.6, db(-21))
# the train: rumble growing, wheels over joints (soft, low), brake hiss, doors
roll = filt(rng.standard_normal(N), 'bandpass', [90, 700]) * win(ARRIVE - 0.6, ARRIVE + 4.6, 0.4) * (sm(ARRIVE - 0.6, ARRIVE + 1.0) * (1 - 0.7 * sm(ARRIVE + 1.6, ARRIVE + 2.8)))
add(norm(roll), db(-20), -0.4)
for k in range(10): at = ARRIVE + 0.2 + k * 0.26 * (1 + k * 0.08); x = tt(0.12); place(at, filt(rng.standard_normal(len(x)), 'lowpass', 600) * np.exp(-x * 30), db(-24), -0.4)
x = tt(1.6); place(ARRIVE + 2.0, filt(rng.standard_normal(len(x)), 'bandpass', [1500, 4000]) * np.exp(-x * 1.8) * np.clip(x / 0.1, 0, 1), db(-28), -0.3)
for at in [ARRIVE + 3.0, ARRIVE + 3.2]: x = tt(0.4); place(at, filt(rng.standard_normal(len(x)), 'bandpass', [400, 1600]) * np.exp(-x * 9), db(-26), -0.2)
# ONE light theme (G major, plucky piano) under everything, so the quiet clock part never feels empty
def piano(f, d=1.4): x = tt(d); return (np.sin(2 * np.pi * f * x) + 0.35 * np.sin(4 * np.pi * f * x) + 0.12 * np.sin(6 * np.pi * f * x)) * np.exp(-x * 2.2) * np.clip(x / 0.005, 0, 1)
line = [392.0, 493.9, 587.3, 493.9, 523.3, 440.0, 392.0, 349.2]; at, k = 0.3, 0
while at < CARD - 0.2: place(at, piano(line[k % 8]), db(-27), 0.15 if k % 2 else -0.15); at += 60 / 112; k += 1
# closing chord under the card
chord = sum(np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t) for f in [196.0, 246.9, 293.7]) / 3
add(filt(chord, 'lowpass', 1200) * win(CARD + 0.1, DUR - 0.1, 0.5), db(-25))
out = np.stack([L, R], 1); out = sosfilt(butter(2, 70, 'highpass', fs=SR, output='sos'), out.T).T
out *= np.clip((DUR - t) / 0.5, 0, 1)[:, None] * np.clip(t / 0.05, 0, 1)[:, None]
out = np.tanh(out * 1.2) / np.tanh(1.2); out /= np.abs(out).max() / 0.92
wavfile.write(sys.argv[1], SR, (out * 32767).astype(np.int16)); print('ok')
