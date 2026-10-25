import numpy as np, sys
from scipy.signal import butter, sosfilt
from scipy.io import wavfile

# "Was wäre, wenn der Rhein austrocknet?" (20 s German short): river ambience with water lapping, a barge horn, truck and train passes, a soft shop murmur, a closing chord.
# No ticking. Mids only. Stereo pan follows the trucks.
SR = 44100; DUR = 20.0; N = int(SR * DUR); t = np.arange(N) / SR
rng = np.random.default_rng(808); L = np.zeros(N); R = np.zeros(N)
TRUCK, SHOP, CARD = 8.4, 14.2, 19.4
def filt(x, kind, f, order=2): return sosfilt(butter(order, f, kind, fs=SR, output='sos'), x)
def db(x): return 10 ** (x / 20)
def norm(x): return x / (np.abs(x).max() + 1e-9)
def sm(a, b): k = np.clip((t - a) / (b - a), 0, 1); return k * k * (3 - 2 * k)
def win(a, b, f=0.4): return sm(a, a + f) * (1 - sm(b - f, b))
def add(sig, g=1.0, pan=0.0):
    global L, R
    L += sig * g * np.sqrt((1 - pan) / 2); R += sig * g * np.sqrt((1 + pan) / 2)
def pass_by(at, d, g, direction):   # a vehicle passes: noise swelling and fading, pan sweeps across
    x = tt(d); s = filt(rng.standard_normal(len(x)), 'bandpass', [180, 1400]) * np.sin(np.pi * x / d) ** 1.4
    pan = np.zeros(len(x)) + direction * (2 * x / d - 1) * 0.8
    seg = np.zeros(N); i0 = int(at * SR); seg[i0:i0 + len(s)] = s[:N - i0] * g
    pn = np.zeros(N); pn[i0:i0 + len(s)] = pan[:N - i0]
    L[:] += seg * np.sqrt((1 - pn) / 2); R[:] += seg * np.sqrt((1 + pn) / 2)
def tt(d): return np.arange(int(d * SR)) / SR
def place(at, sig, g=1.0, pan=0.0):
    i0 = int(at * SR)
    if i0 >= N: return
    s = sig[:N - i0]; L[i0:i0 + len(s)] += s * g * np.sqrt((1 - pan) / 2); R[i0:i0 + len(s)] += s * g * np.sqrt((1 + pan) / 2)
# river ambience: low water noise with slow swell, lapping at the bar
river = filt(rng.standard_normal(N), 'bandpass', [140, 900]) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.25 * t))
add(norm(river) * win(0, TRUCK + 0.6, 0.6), db(-27))
for k in range(9): at = 0.6 + k * 0.85 + rng.uniform(0, 0.25); x = tt(0.5); place(at, filt(rng.standard_normal(len(x)), 'bandpass', [400, 1600]) * np.sin(np.pi * x / 0.5) * 0.6, db(-31), rng.uniform(-0.4, 0.4))
# barge horn, low, once, as the title ends
x = tt(1.6); horn = (np.sin(2 * np.pi * 110 * x) + 0.4 * np.sin(2 * np.pi * 165 * x)) * np.clip(x / 0.05, 0, 1) * np.exp(-x * 0.9); place(3.4, horn, db(-22), -0.2)
# trucks and a freight train pass on the highway and the line
pass_by(TRUCK + 0.2, 4.0, db(-21), +1); pass_by(TRUCK + 2.2, 4.0, db(-22), -1); pass_by(TRUCK + 4.0, 3.5, db(-23), +1)
add(filt(rng.standard_normal(N), 'bandpass', [200, 900]) * win(TRUCK, SHOP + 0.4, 0.5) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.8 * t)), db(-31))
# shop: soft room tone and a few muffled voices, no clicks
add(filt(rng.standard_normal(N), 'bandpass', [250, 1200]) * win(SHOP - 0.3, CARD + 0.4, 0.5), db(-35))
for k in range(4): x = tt(0.8); place(SHOP + 0.6 + k * 1.1, filt(np.sign(np.sin(2 * np.pi * 180 * (1 + 0.1 * x) * x)) * 0.5 + np.sin(2 * np.pi * 190 * x), 'bandpass', [400, 1400]) * np.sin(np.pi * x / 0.8) ** 0.6, db(-29), rng.uniform(-0.5, 0.5))
# closing chord (D minor, soft) under the card
chord = sum(np.sin(2 * np.pi * f * t) for f in [146.8, 174.6, 220.0]) / 3
add(filt(chord, 'lowpass', 900) * win(CARD + 0.2, DUR - 0.2, 0.6), db(-26))
out = np.stack([L, R], 1); out = sosfilt(butter(2, 70, 'highpass', fs=SR, output='sos'), out.T).T
out *= np.clip((DUR - t) / 0.6, 0, 1)[:, None] * np.clip(t / 0.05, 0, 1)[:, None]
out = np.tanh(out * 1.2) / np.tanh(1.2); out /= np.abs(out).max() / 0.92
wavfile.write(sys.argv[1], SR, (out * 32767).astype(np.int16)); print('ok')
