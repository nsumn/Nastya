"""Synthesized sound effects + background music, mixed under the voice (no samples, no licences).
  python3 sfx.py <video_dir>            # reads <video_dir>/sfx.json + voice/voice_fast.mp3 -> <video_dir>/voice/mix.mp3
  python3 sfx.py demo                   # writes sfx_demo.wav with every sound once
sfx.json: {"end": 63.2, "music": "musicbox", "events": [[t, "pop", gain], ...], "beds": [[t0, t1, "wind", gain], ...]}
The scene exports it (window.SFX) so every sound sits on the exact word/animation time."""
import json, subprocess, sys, numpy as np
from scipy.signal import butter, sosfilt

SR = 44100
R = np.random.default_rng(3)
t_ = lambda d: np.arange(int(d * SR)) / SR
def env(n, a=.005, r=None, d=None):
    t = np.arange(n) / SR; e = np.minimum(1, t / max(a, 1e-4))
    if d: e *= np.exp(-t / d)
    if r: e *= np.clip((n / SR - t) / r, 0, 1)
    return e
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def sweep(f0, f1, d, shape=np.sin):
    t = t_(d); f = f0 * (f1 / f0) ** (t / d); return shape(2 * np.pi * np.cumsum(f) / SR)
noise = lambda d: R.standard_normal(int(d * SR))
norm = lambda x, p=.9: x / (np.abs(x).max() + 1e-9) * p

def s_pop():      x = sweep(1100, 380, .09) * env(int(.09 * SR), .002, d=.035); return norm(x + .3 * hp(noise(.09), 3000) * env(int(.09 * SR), .001, d=.006))
def s_clack():    # brick set down: thump + click
    th = sweep(180, 70, .16) * env(int(.16 * SR), .002, d=.05); cl = bp(noise(.16), 1500, 5000) * env(int(.16 * SR), .001, d=.012)
    return norm(th + .8 * cl)
def s_whoosh():
    d = .55; n = noise(d); t = t_(d); f = 300 + 2500 * np.sin(np.pi * t / d) ** 2
    out = np.zeros_like(n); seg = 512
    for i in range(0, len(n), seg): out[i:i + seg] = bp(n[max(0, i - 2048):i + seg], max(80, f[i] * .6), f[i] * 1.4)[-len(n[i:i + seg]):]
    return norm(out * np.sin(np.pi * t / d) ** 1.5, .7)
def bell(f, d=1.4):
    t = t_(d); x = sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t / (d * k)) for m, a, k in [(1, 1, .5), (2.0, .5, .3), (3.0, .25, .2), (4.2, .15, .12), (5.4, .08, .08)])
    return x * env(len(t), .002)
def s_ding():     return norm(bell(1318) + .6 * bell(1975), .75)
def s_sparkle():
    out = np.zeros(int(.8 * SR))
    for i, f in enumerate([1568, 1976, 2349, 2637, 3136, 3951]): b = bell(f, .5) * .5; o = int(i * .06 * SR); out[o:o + len(b)] += b[:len(out) - o]
    return norm(out, .6)
def s_tada():
    out = np.zeros(int(1.6 * SR))
    for i, f in enumerate([523, 659, 784, 1047]):
        d = 1.2 if i == 3 else .14; t = t_(d); x = (np.sign(np.sin(2 * np.pi * f * t)) * .3 + np.sin(2 * np.pi * f * t)) * env(len(t), .004, r=.05, d=.6 if i == 3 else None)
        o = int(i * .12 * SR); out[o:o + len(x)] += lp(x, 4000)
    return norm(out, .7)
def s_meow(pitch=1.0, d=.75):
    t = t_(d); u = t / d
    f0 = pitch * (520 + 380 * np.sin(np.pi * np.clip(u * 1.2, 0, 1)) ** 1.2 - 120 * u)
    ph = 2 * np.pi * np.cumsum(f0 * (1 + .012 * np.sin(2 * np.pi * 6 * t))) / SR
    src = sum(np.sin(k * ph) / k for k in range(1, 16))
    # formants glide  "m-i" -> "a" -> "u"
    F1 = np.interp(u, [0, .25, .6, 1], [300, 850, 700, 380]); F2 = np.interp(u, [0, .25, .6, 1], [2200, 1600, 1100, 800])
    out = np.zeros_like(src); seg = 256
    for i in range(0, len(src), seg):
        blk = src[max(0, i - 2048):i + seg]
        y = bp(blk, F1[i] * .75, F1[i] * 1.3) + .6 * bp(blk, F2[i] * .8, F2[i] * 1.25)
        out[i:i + seg] = y[-len(src[i:i + seg]):]
    e = np.sin(np.pi * np.clip(u * 1.05, 0, 1)) ** .6 * np.minimum(1, u * 30)
    return norm(out * e, .8)
def s_meow_sad():  return s_meow(.85, 1.1)
def s_meow_happy(): return s_meow(1.25, .45)
def s_brr():
    d = .9; t = t_(d); x = np.sin(2 * np.pi * 150 * t) * (.5 + .5 * np.sign(np.sin(2 * np.pi * 22 * t)))
    return norm(lp(x, 1200) * env(len(t), .02, r=.25), .55)
def s_boing():
    d = .6; t = t_(d); f = 220 + 160 * np.exp(-t / .12) * np.sin(2 * np.pi * 9 * t)
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), .003, d=.25), .7)
def s_boom():     # low tension hit
    d = 2.2; t = t_(d); x = sweep(70, 38, d) * np.exp(-t / .7) + .4 * lp(noise(d), 200) * np.exp(-t / .3)
    return norm(x, .95)
def s_tick():     d = .03; return norm(bp(noise(d), 2000, 6000) * env(int(d * SR), .0005, d=.004), .6)
def s_heart():
    out = np.zeros(int(.6 * SR))
    for o in (0, .17): x = sweep(120, 55, .15) * env(int(.15 * SR), .002, d=.04); i = int(o * SR); out[i:i + len(x)] += x
    return norm(out, .8)
def s_crackle():
    d = 1.5; out = .15 * lp(noise(d), 600) * env(int(d * SR), .1, r=.4)
    for _ in range(40): i = R.integers(0, len(out) - 400); out[i:i + 300] += hp(noise(300 / SR), 2500) * np.exp(-np.arange(300) / 40) * R.uniform(.3, 1)
    return norm(out, .6)
def s_swoosh_up():
    d = .4; return norm(hp(noise(d), 1500) * np.linspace(0, 1, int(d * SR)) ** 2 * env(int(d * SR), .01, r=.05), .5)
def s_stamp():    return norm(s_clack() * 1.0 + .5 * np.concatenate([sweep(90, 45, .3) * np.exp(-t_(.3) / .1), np.zeros(max(0, int(.16 * SR) - int(.3 * SR)))])[:int(.16 * SR)] if False else s_clack(), .9)

def s_buzz():     # "wrong" buzzer for crossed-out items
    d = .35; t = t_(d); x = np.sign(np.sin(2 * np.pi * 140 * t)) * .5 + np.sign(np.sin(2 * np.pi * 147 * t)) * .5
    return norm(lp(x, 2500) * env(len(t), .005, r=.08), .5)
def s_tweet():
    out = np.zeros(int(.7 * SR))
    for i in range(3): x = sweep(2600, 4200, .09) * env(int(.09 * SR), .003, r=.03); o = int(i * .16 * SR); out[o:o + len(x)] += x
    return norm(out, .55)
def bed_rain(d):
    n = noise(d); x = hp(n, 900) * .5 + lp(n, 400) * .3
    for _ in range(int(d * 30)): i = R.integers(0, len(x) - 300); x[i:i + 200] += hp(noise(200 / SR), 3000) * np.exp(-np.arange(200) / 30) * R.uniform(.2, .8)
    return norm(x, .5)
def s_bark(pitch=1.0):    # small cartoon "wuff": two short formant bursts
    out = np.zeros(int(.45 * SR))
    for o, f0 in ((0, 620), (.17, 560)):
        d = .12; t = t_(d); f = pitch * f0 * (1.25 - .5 * t / d); ph = 2 * np.pi * np.cumsum(f) / SR
        src = sum(np.sin(k * ph) / k for k in range(1, 12)) + .3 * noise(d)
        y = bp(src, 500, 1400) + .5 * bp(src, 1800, 3200)
        x = y * env(len(t), .004, d=.05); i = int(o * SR); out[i:i + len(x)] += x
    return norm(out, .8)
def s_whine():
    d = 1.0; t = t_(d); f = 900 + 250 * np.sin(np.pi * t / d) - 200 * t
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) + .3 * np.sin(4 * np.pi * np.cumsum(f) / SR)
    return norm(lp(x, 3000) * np.sin(np.pi * t / d) ** .8 * (1 + .1 * np.sin(2 * np.pi * 7 * t)), .5)
def s_splash():
    d = .7; n = noise(d); x = hp(n, 800) * env(int(d * SR), .005, d=.18) + .5 * bp(n, 300, 900) * env(int(d * SR), .01, d=.1)
    for _ in range(12): i = R.integers(int(.05 * SR), int(.6 * SR)); b = sweep(R.uniform(900, 1800), R.uniform(2500, 4000), .03) * env(int(.03 * SR), .001, d=.01); x[i:i + len(b)] += .4 * b
    return norm(x, .6)
def s_sniff():
    out = np.zeros(int(.8 * SR))
    for o in (0, .2, .4): x = bp(noise(.12), 1500, 5000) * np.sin(np.pi * t_(.12) / .12); i = int(o * SR); out[i:i + len(x)] += x
    return norm(out, .55)
def s_poof():     d = .5; return norm(lp(noise(d), 900) * env(int(d * SR), .01, d=.12), .6)
def bed_rustle(d):
    n = noise(d); t = t_(d); x = bp(n, 1500, 6000) * (.3 + .7 * np.abs(np.sin(2 * np.pi * 3.3 * t)) ** 3)
    return norm(x, .45)
def s_hiss():
    d = .6; return norm(hp(noise(d), 2500) * env(int(d * SR), .03, r=.2), .45)
def bed_wind(d):
    n = noise(d); x = lp(n, 500) * .6 + bp(n, 700, 1400) * .25
    t = t_(d); m = .55 + .45 * np.sin(2 * np.pi * .23 * t) * np.sin(2 * np.pi * .07 * t + 1)
    return norm(x * m, .5)
def bed_fire(d):
    out = .3 * lp(noise(d), 500)
    for _ in range(int(d * 25)): i = R.integers(0, len(out) - 400); out[i:i + 300] += hp(noise(300 / SR), 2500) * np.exp(-np.arange(300) / 40) * R.uniform(.2, 1)
    return norm(out, .5)
def bed_purr(d):
    t = t_(d); x = lp(noise(d), 300) * (.5 + .5 * np.sin(2 * np.pi * 26 * t)) * (.6 + .4 * np.sin(2 * np.pi * .5 * t) ** 2)
    return norm(x, .5)

def bed_heli(d):   # rotor chop: low noise pulsed at ~18 Hz, slowly rising
    t = t_(d); x = lp(noise(d), 260) * (.35 + .65 * np.abs(np.sin(np.pi * 18 * t)) ** 4) + .25 * np.sin(2 * np.pi * 72 * t) * .3
    return norm(x * np.minimum(1, .3 + t / 1.2), .55)

def music_box(d, bpm=96):
    """Cozy music-box loop: F - Dm - Bb - C, arpeggios + soft pad."""
    beat = 60 / bpm; out = np.zeros(int((d + 2) * SR))
    prog = [[65, 69, 72, 77], [62, 65, 69, 74], [58, 62, 65, 70], [60, 64, 67, 72]]
    mel = [77, 76, 74, 72, 74, 72, 69, 70, 72, 74, 72, 69, 67, 69, 72, 76]
    hz = lambda m: 440 * 2 ** ((m - 69) / 12)
    nbar = int(d / (4 * beat)) + 1
    for b in range(nbar):
        ch = prog[b % 4]
        for i in range(8):     # eighth-note arpeggio
            m = ch[[0, 1, 2, 3, 2, 1, 2, 3][i]] + 12; x = bell(hz(m), .9) * .22
            o = int((b * 4 + i * .5) * beat * SR); out[o:o + len(x)] += x[:max(0, len(out) - o)] if o < len(out) else 0
        for i in range(2):
            m = mel[(b * 2 + i) % len(mel)] + 12; x = bell(hz(m), 1.4) * .32
            o = int((b * 4 + i * 2) * beat * SR); out[o:o + len(x)] += x[:max(0, len(out) - o)] if o < len(out) else 0
        t = t_(4 * beat); pad = sum(np.sin(2 * np.pi * hz(m - 12) * t) for m in ch[:3]) * .05 * np.sin(np.pi * t / (4 * beat))
        o = int(b * 4 * beat * SR); out[o:o + len(pad)] += lp(pad, 900)[:max(0, len(out) - o)] if o < len(out) else 0
        x = sweep(hz(ch[0] - 24), hz(ch[0] - 24), .5) * np.exp(-t_(.5) / .25) * .18; out[o:o + len(x)] += x
    return out[:int(d * SR)]

SFX = {k[2:]: v for k, v in globals().items() if k.startswith('s_')}
BEDS = {k[4:]: v for k, v in globals().items() if k.startswith('bed_')}

def load(p):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", p, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).astype(np.float64)

def mix(d):
    cfg = json.load(open(f"{d}/sfx.json")); voice = load(f"{d}/voice/voice_fast.mp3")
    N = int(max(cfg["end"], len(voice) / SR) * SR) + SR
    v = np.zeros(N); v[:len(voice)] = voice
    fx = np.zeros(N); cache = {}
    for t, name, g in cfg["events"]:
        if name not in cache: cache[name] = SFX[name]()
        x = cache[name] * g; i = int(t * SR)
        if 0 <= i < N: fx[i:i + len(x)] += x[:N - i]
    for t0, t1, name, g in cfg.get("beds", []):
        x = BEDS[name](t1 - t0); fade = np.minimum(1, np.minimum(np.arange(len(x)), len(x) - np.arange(len(x))) / (.6 * SR))
        i = int(t0 * SR); fx[i:i + len(x)] += (x * fade * g)[:N - i]
    mus = np.zeros(N); m = music_box(N / SR); mus[:len(m)] = m
    # duck music under the voice (smooth envelope follower)
    ve = np.abs(v); k = int(.12 * SR); ve = np.convolve(ve, np.ones(k) / k, 'same'); ve = ve / (ve.max() + 1e-9)
    duck = 1 - .55 * np.clip(ve * 6, 0, 1)
    out = v * 1.0 + fx * .38 + mus * cfg.get("music_gain", .16) * duck
    out = out / max(1, np.abs(out).max() / .97)
    pcm = (out * 32767).astype(np.int16).tobytes()
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "-", "-b:a", "192k", f"{d}/voice/mix.mp3"], input=pcm, check=True)
    print("wrote", f"{d}/voice/mix.mp3", round(N / SR, 2), "s,", len(cfg["events"]), "events")

if __name__ == "__main__":
    if sys.argv[1] == "demo":
        parts = []
        for k, f in SFX.items(): print(k); parts += [f(), np.zeros(int(.35 * SR))]
        for k, f in BEDS.items(): print(k); parts += [f(2.0), np.zeros(int(.35 * SR))]
        parts.append(music_box(8) * .6)
        x = np.concatenate(parts); subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "-", sys.argv[2] if len(sys.argv) > 2 else "sfx_demo.mp3"], input=(norm(x) * 32767).astype(np.int16).tobytes(), check=True)
    else: mix(sys.argv[1])
