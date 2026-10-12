import numpy as np, sys
from scipy.signal import butter, sosfilt
from scipy.io import wavfile

SR = 44100; DUR = 65.0; N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(67)
L = np.zeros(N); Rr = np.zeros(N)
HOOK, MEME, NPC, BALL, SB, TABLE, COMET, SIX8, CHAIN, TEND = 4, 11, 19, 26, 34, 38, 42, 45, 56, 60.5
SPIKES = [[2.55, 3.25, 1.0], [10.9, 11.6, 0.8], [22.5, 23.1, 0.9], [27.4, 29.7, 0.55], [34.0, 34.35, 0.6], [36.1, 36.6, 0.7], [39.6, 40.2, 0.8], [41.8, 42.2, 0.7], [44.9, 45.5, 1.0], [48.3, 48.8, 0.9], [51.3, 51.8, 0.9], [55.6, 56.4, 1.0], [58.4, 58.9, 1.0]]

def filt(x, kind, f, order=2): return sosfilt(butter(order, f, kind, fs=SR, output='sos'), x)
def db(x): return 10 ** (x / 20)
def ramp(a, b, fa, fb): return np.clip((t - a) / max(fa, 1e-3), 0, 1) * np.clip((b - t) / max(fb, 1e-3), 0, 1)
def norm(x): return x / (np.abs(x).max() + 1e-9)
def place(buf, at, sig, g=1.0, pan=0.0):
    i0 = int(at * SR)
    if i0 >= N or i0 + len(sig) <= 0: return
    s = sig[:max(0, N - i0)]
    buf[0][i0:i0 + len(s)] += s * g * np.sqrt((1 - pan) / 2); buf[1][i0:i0 + len(s)] += s * g * np.sqrt((1 + pan) / 2)
OUT = [L, Rr]
MUS = [np.zeros(N), np.zeros(N)]   # music bus (gets filtered / gated)
def tt(d): return np.arange(int(d * SR)) / SR

# ---------- instruments
def k808(f0=49, d=0.75):
    x = tt(d); f = f0 * (1 + 1.6 * np.exp(-x * 30)); ph = 2 * np.pi * np.cumsum(f) / SR
    return np.tanh(2.2 * np.sin(ph) * np.exp(-x * 3.2)) * np.clip(x / 0.002, 0, 1)
def clap():
    x = tt(0.25); n = rng.standard_normal(len(x)); env = sum(np.exp(-np.clip(x - o, 0, None) * 60) * (x >= o) for o in (0, 0.011, 0.022)) + 0.6 * np.exp(-x * 14)
    return filt(n, 'bandpass', [900, 3200]) * env
def hat(d=0.04):
    x = tt(d); return filt(rng.standard_normal(len(x)), 'highpass', 7500) * np.exp(-x * 90)
def blip(f, d=0.09):
    x = tt(d); return np.sign(np.sin(2 * np.pi * f * x)) * 0.5 * np.exp(-x * 25)

BPM = 140; B = 60 / BPM
def beat_section(a, b, hats=True, eighthat=True, roll=True, kick=True, clp=True, dbl=False, f0=49):
    k = 0; t0 = a
    while t0 < b - 1e-3:
        bar_t = t0;
        for i in range(16):   # 16th grid, one bar
            at = bar_t + i * B / 4
            if at >= b: break
            if kick and i in (0, 7, 10): place(MUS, at, k808(f0 if i != 10 else f0 * 1.19), db(-5))
            if clp and i == 8: place(MUS, at, clap(), db(-9))
            if hats:
                step = 1 if dbl else 2
                if i % step == 0: place(MUS, at, hat(), db(-17 if i % 4 else -14), 0.3)
                if roll and i in (13, 14, 15) and k % 2 == 1:
                    for r in range(3): place(MUS, at + r * B / 12, hat(0.025), db(-19), 0.3)
        t0 += 16 * B / 4; k += 1

beat_section(0.0, 2.55, kick=False, clp=False, roll=False)
place(MUS, 0.0, k808(), db(-6)); place(MUS, 0.85, k808(52), db(-6)); place(MUS, 1.7, k808(55), db(-6)); place(MUS, 1.7, clap(), db(-9)); place(MUS, 2.12, k808(58), db(-7))
beat_section(34.35, 38.0, kick=False, roll=False)
L += np.sin(2 * np.pi * 55 * t) * ramp(27.4, 29.7, 0.1, 0.2) * db(-16); Rr += np.sin(2 * np.pi * 55.4 * t) * ramp(27.4, 29.7, 0.1, 0.2) * db(-16)
beat_section(4.3, 10.9)
beat_section(11.6, 19.0, roll=False)
beat_section(19.0, 26.0)
beat_section(26.0, 27.4)
beat_section(29.7, 34.0)
beat_section(42.3, 44.9, kick=False, clp=False, dbl=True)
beat_section(45.5, 55.6, dbl=True, f0=46)
# pad: minor chords, dark
def hz(n): return 440 * 2 ** ((n - 69) / 12)
pad = np.zeros(N)
for ci, ch in enumerate([[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]] * 9):
    a = 4.3 + ci * 16 * B / 4 * 1
    if a > CHAIN: break
    e = ramp(a - 0.2, a + 4 * B + 0.2, 0.3, 0.3)
    for n in ch: pad += e * (np.sin(2 * np.pi * hz(n) * t) + 0.4 * np.sin(2 * np.pi * hz(n) * 2.01 * t))
pad = norm(filt(pad, 'lowpass', 1600))
MUS[0] += pad * db(-24); MUS[1] += pad * db(-24)
# bell melody (meme-ish, minor pentatonic)
mel = [69, 72, 74, 76, 74, 72, 69, 67]
for k in range(80):
    at = 4.3 + k * B
    if at > CHAIN: break
    if k % 8 in (3, 7): continue
    n = mel[k % 8] + 12
    place(MUS, at, np.sin(2 * np.pi * hz(n) * tt(0.5)) * np.exp(-tt(0.5) * 6), db(-24), -0.2)
# music shaping: NPC section lowpassed (underwater), drops at glitches, space silent
mL, mR = MUS
lp = lambda x: filt(x, 'lowpass', 500, 4)
wet = ramp(11.6, 19.0, 0.2, 0.3)
mL = mL * (1 - wet) + lp(mL) * wet * 1.6; mR = mR * (1 - wet) + lp(mR) * wet * 1.6
gate = np.ones(N)
for a, b, k in SPIKES: gate *= 1 - ramp(a, b, 0.02, 0.05) * 0.85
gate *= 1 - ramp(TABLE, COMET, 0.2, 0.2) * 0.9
gate *= 1 - ramp(CHAIN, 99, 0.05, 1)
# tape-stop feel on 67: pitch-down by time-warp of the last 0.5 s before 3.0
L += mL * gate; Rr += mR * gate
seg = (mL[int(2.5 * SR):int(3.0 * SR)] + mR[int(2.5 * SR):int(3.0 * SR)]) / 2
warp = np.cumsum(np.linspace(1, 0.15, int(0.6 * SR))); warp = warp[warp < len(seg) - 1]
place(OUT, 2.55, np.interp(warp, np.arange(len(seg)), seg) * np.linspace(1, 0, len(warp)), 1.0)

# ---------- SFX
white = rng.standard_normal(N)
def glitch_burst(a, b, k):
    d = b - a; x = tt(d); n = len(x)
    crush = np.round(rng.standard_normal(n) * 3) / 3
    sq = np.sign(np.sin(2 * np.pi * np.cumsum(rng.choice([220, 440, 880, 1760, 3520], n // 800 + 1).repeat(800)[:n]) / SR))
    gatec = (np.sin(2 * np.pi * 28 * x) > 0)
    s = (0.5 * crush + 0.5 * sq) * gatec * k
    s = filt(s, 'highpass', 300)
    place(OUT, a, s, db(-15), rng.uniform(-0.5, 0.5))
for a, b, k in SPIKES: glitch_burst(a, b, k)
# counter blips
for at, f in [(0.0, 880), (0.85, 988), (1.7, 1109)]: place(OUT, at, blip(f, 0.12), db(-16))
place(OUT, 3.15, blip(1175, 0.2), db(-14))
# freeze: sub hit + reverse swell
place(OUT, 3.0, k808(38, 2.0), db(-3))
# error chime at the simulation crash
for at, f in [(11.0, 1318), (11.18, 988)]: place(OUT, at, np.sin(2 * np.pi * f * tt(0.35)) * np.exp(-tt(0.35) * 8), db(-14))
# NPCs floating: rising sine whoosh
place(OUT, 11.6, filt(rng.standard_normal(int(7 * SR)), 'bandpass', [300, 1200]) * np.sin(np.pi * tt(7) / 7) ** 2, db(-22))
# dribble
for k in range(int(19 * 1.45), int(26 * 1.45)):
    at = k / 1.45 + 0.0
    if 19.05 < at < 25.95: place(OUT, at, np.sin(2 * np.pi * 95 * tt(0.15)) * np.exp(-tt(0.15) * 30) + 0.2 * filt(rng.standard_normal(int(0.15 * SR)), 'bandpass', [600, 2500]) * np.exp(-tt(0.15) * 50), db(-12), 0.15)
# stadium crowd
crowd = filt(white, 'bandpass', [300, 2500]) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.9 * t))
L += crowd * ramp(BALL, 27.5, 0.3, 0.05) * db(-24); Rr += np.roll(crowd, 777) * ramp(BALL, 27.5, 0.3, 0.05) * db(-24)
# periodic table: whoosh in, cell falls (whistle down) + thud
place(OUT, 33.8, filt(rng.standard_normal(int(0.8 * SR)), 'bandpass', [500, 5000]) * np.sin(np.pi * tt(0.8) / 0.8) ** 2, db(-14))
x = tt(1.3); place(OUT, 36.3, np.sin(2 * np.pi * np.cumsum(1800 * np.exp(-x * 1.6) + 200) / SR) * 0.6 * np.clip(1 - x / 1.3, 0, 1), db(-20))
place(OUT, 37.6, k808(44, 0.6), db(-6))
# space hum + dissolve crackle
L += np.sin(2 * np.pi * 46 * t) * ramp(TABLE, COMET, 0.3, 0.2) * db(-20); Rr += np.sin(2 * np.pi * 46.5 * t) * ramp(TABLE, COMET, 0.3, 0.2) * db(-20)
for k in range(300):
    at = rng.uniform(39.6, 41.6); place(OUT, at, blip(rng.choice([1500, 2200, 3000, 4400]), 0.03), db(-24), rng.uniform(-0.9, 0.9))
# "SIX… EIGHT!" chant: two crowd shouts (formant-ish noise) + bass
def shout(d, f1, f2):
    x = tt(d); n = rng.standard_normal(len(x)) + 0.6 * np.sign(np.sin(2 * np.pi * 180 * x))
    return (filt(n, 'bandpass', [f1 * 0.8, f1 * 1.2]) + 0.6 * filt(n, 'bandpass', [f2 * 0.85, f2 * 1.15])) * np.sin(np.pi * x / d) ** 0.5
place(OUT, 43.0, shout(0.32, 600, 1900), db(-8), -0.1); place(OUT, 43.55, shout(0.45, 700, 1500), db(-7), 0.1)
place(OUT, 43.55, k808(41, 1.2), db(-4))
# chain reaction: riser 51.4 -> 55.6
x = tt(4.2); riser = (filt(rng.standard_normal(len(x)), 'bandpass', [400, 6000]) * (x / 4.2) ** 2 + 0.4 * np.sin(2 * np.pi * np.cumsum(200 + 1800 * (x / 4.2) ** 2) / SR) * (x / 4.2))
place(OUT, 51.4, riser, db(-10))
L += filt(white, 'lowpass', 160) * ramp(46, 55.6, 2, 0.05) * db(-14); Rr += np.roll(filt(white, 'lowpass', 160), 999) * ramp(46, 55.6, 2, 0.05) * db(-14)
place(OUT, 48.45, np.sin(2 * np.pi * 1568 * tt(0.4)) * np.exp(-tt(0.4) * 9), db(-18))   # "nice" ding
# void: big boom, then near silence + ringing; crack
place(OUT, 55.65, np.tanh(3 * np.sin(2 * np.pi * np.cumsum(30 * (1 + np.exp(-tt(4) * 4))) / SR) * np.exp(-tt(4) * 0.9)), db(-1))
L += filt(white, 'lowpass', 90) * ramp(56, TEND, 0.5, 0.5) * db(-24); Rr += filt(white, 'lowpass', 90) * ramp(56, TEND, 0.5, 0.5) * db(-24)
place(OUT, 58.5, rng.standard_normal(int(0.4 * SR)) * np.exp(-tt(0.4) * 30), db(-6))
for k in range(24): place(OUT, 58.52 + rng.uniform(0, 0.6), np.sin(2 * np.pi * rng.uniform(3000, 7000) * tt(0.3)) * np.exp(-tt(0.3) * 18), db(-24), rng.uniform(-0.8, 0.8))
L += np.sin(2 * np.pi * 3400 * t) * np.exp(-np.clip(t - 58.5, 0, None) * 0.7) * (t >= 58.5) * ramp(58.5, TEND + 1, 0.3, 0.6) * db(-36)
# end card
place(OUT, TEND, np.sin(2 * np.pi * 41 * tt(4.5)) * np.exp(-tt(4.5) * 2.0), db(-5))
x = tt(4.4); place(OUT, TEND + 0.1, (np.sin(2 * np.pi * 220 * x) + 0.5 * np.sin(2 * np.pi * 261.6 * x) + 0.35 * np.sin(2 * np.pi * 329.6 * x)) * np.exp(-x * 0.6) * np.clip(x / 0.4, 0, 1), db(-16))

out = np.stack([L, Rr], 1)
out *= np.clip((DUR - t) / 0.6, 0, 1)[:, None]
out = np.tanh(out * 1.2) / np.tanh(1.2)
out /= np.abs(out).max() / 0.92
wavfile.write(sys.argv[1], SR, (out * 32767).astype(np.int16))
print('ok')
