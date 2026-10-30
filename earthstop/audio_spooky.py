# Our own continuation for the SPOOKY challenge video (TikTok mutes an "original sound" that re-uses the song, so after 25.08 s the music is ours):
# a phonk groove in the song's tempo and key (130 BPM, C# minor) on the same beat grid — four-on-the-floor kick + saturated 808, clap on 2 & 4,
# soft 16th hats, and ONE melody: a phonk cowbell riff (our own notes). Sections follow the video: drop → break → build → drop 2 → end hit.
#   out/spooky/music_tail2.wav — silence while the official sound plays (0–25.08 s), then ours  (POST THIS with the challenge sound)
#   out/spooky/music_full2.wav — the clip 0–25.08 s + ours (preview)
import numpy as np, scipy.io.wavfile as wf
from scipy.signal import butter, sosfilt
SR = 44100
P, T0 = 0.4613, 0.126                       # beat period / first beat (same grid as the scene)
SONG_END, T_END = 25.08, 63.0
beat = lambda k: T0 + k * P
S16 = P / 4
N = int(T_END * SR) + SR
L = np.zeros(N); Rr = np.zeros(N)
rng = np.random.default_rng(7)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def put(t, x, g=1.0, pan=0.0):
    i = int(round(t * SR)); x = x[:max(0, N - i)]
    L[i:i + len(x)] += x * g * (1 - max(pan, 0)); Rr[i:i + len(x)] += x * g * (1 + min(pan, 0))
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
NOTE = {n: i for i, n in enumerate(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'])}
def midi(s): n, o = s[:-1], int(s[-1]); return 12 * (o + 1) + NOTE[n]
# ---- instruments ----
def kick():
    d = 0.32; t = np.arange(int(d * SR)) / SR; f = 50 + 110 * np.exp(-t * 28); ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t * 9); x += 0.5 * bp(rng.standard_normal(len(t)), 1500, 5000) * np.exp(-t * 160)   # click
    return np.tanh(2.2 * x) * 0.9
def b808(note, d):
    t = np.arange(int(d * SR)) / SR; f0 = hz(note); f = f0 * (1 + 0.6 * np.exp(-t * 40)); ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.minimum(1, t / 0.004) * np.exp(-t * 2.2) * np.minimum(1, (d - t) / 0.03)
    return np.tanh(3.0 * x) * 0.55            # saturation: harmonics a phone speaker can play
def clap():
    d = 0.25; t = np.arange(int(d * SR)) / SR; n = rng.standard_normal(len(t)); env = np.zeros(len(t))
    for k, o in enumerate([0, 0.011, 0.022]): env += (t >= o) * np.exp(-np.maximum(t - o, 0) * (90 if k < 2 else 22))
    return bp(n, 900, 4200) * env * 1.1
def hat(open_=False):
    d = 0.22 if open_ else 0.05; t = np.arange(int(d * SR)) / SR
    return hp(rng.standard_normal(len(t)), 7500) * np.exp(-t * (14 if open_ else 90)) * 0.45
def cowbell(note, d=0.16):
    # phonk cowbell: two detuned pulse-ish partials (ratio ~1.48), band-passed, fast decay
    t = np.arange(int(d * SR)) / SR; f = hz(note)
    x = np.sign(np.sin(2 * np.pi * f * t)) * 0.6 + np.sign(np.sin(2 * np.pi * f * 1.483 * t)) * 0.45
    x = bp(x, f * 0.9, f * 4.5) * (np.exp(-t * 16) * 0.85 + 0.15 * np.exp(-t * 4))
    return x * 1.3
def pad(notes, d):
    t = np.arange(int(d * SR)) / SR; x = sum(np.sin(2 * np.pi * hz(m) * t * (1 + dt)) for m in notes for dt in (-0.004, 0.004))
    return lp(x, 1800) * np.minimum(1, t / 0.6) * np.minimum(1, (d - t) / 0.8) * 0.06
def riser(d):
    t = np.arange(int(d * SR)) / SR; n = rng.standard_normal(len(t)); out = np.zeros(len(t)); seg = int(0.05 * SR)
    for i in range(0, len(t), seg): fc = 400 + 7000 * (i / len(t)) ** 2; out[i:i + seg] = bp(n[i:i + seg + 400], fc * 0.7, fc * 1.3)[:len(out[i:i + seg])]
    return out * (t / d) ** 2 * 0.25
# ---- our riff: 4 bars on a 16th grid (None = rest), C# minor; the bass roots follow it ----
R = [['C#5', None, 'C#5', 'E5', None, None, 'G#4', None, 'C#5', None, 'C#5', 'E5', None, 'F#5', 'E5', None],
     ['C#5', None, 'C#5', 'E5', None, None, 'G#4', None, 'B4', None, 'B4', 'C#5', None, 'E5', 'C#5', None],
     ['A4', None, 'A4', 'C#5', None, None, 'E4', None, 'A4', None, 'A4', 'C#5', None, 'E5', 'C#5', None],
     ['G#4', None, 'G#4', 'B4', None, None, 'D#4', None, 'G#4', None, 'B4', 'C#5', None, 'D#5', 'B4', None]]
ROOT = ['C#2', 'C#2', 'A1', 'G#1']
BASS16 = [0, 3, 6, 10, 12]                    # 808 hits on the 16th grid (with the kick + syncopation)
def bar(b, sect, k_in):
    """one bar starting at beat b; sect: 'drop' | 'break' | 'build' | 'drop2'; k_in = 0..1 position inside the section"""
    t0 = beat(b); ri = int(round((b - 50) / 4)) % 4
    full = sect in ('drop', 'drop2')
    for q in range(4):
        tq = t0 + q * P
        if full or (sect == 'build' and (k_in > 0.25 or q % 2 == 0)): put(tq, kick(), 0.95 if full else 0.7)
        if full and q % 2 == 1: put(tq, clap(), 0.9)
    for s in range(16):
        ts = t0 + s * S16
        if full or sect == 'build': put(ts, hat(open_=(s % 4 == 2 and full)), (1.0 if s % 2 else 0.55) * (1 if full else 0.6), pan=0.25 if s % 2 else -0.15)
        n = R[ri][s]
        if n:
            g = 1.0 if full else 0.75; x = cowbell(midi(n))
            if sect == 'break': x = lp(x, 1200)
            if sect == 'build': x = lp(x, 900 + 5000 * k_in)
            put(ts, x, g, pan=-0.1)
            if sect == 'drop2' and k_in >= 0.5: put(ts, cowbell(midi(n) + 12, 0.1), 0.35, pan=0.2)   # second half of drop 2: octave on top
        if s in BASS16 and (full or sect == 'build'):
            nxt = [x for x in BASS16 if x > s]; d = ((nxt[0] if nxt else 16) - s) * S16
            put(ts, b808(midi(ROOT[ri]) + (12 if s == 10 and full else 0), d), 0.8 if full else 0.55)
    if sect == 'break': put(t0, pad([midi(ROOT[ri]) + 24, midi(ROOT[ri]) + 27 + (1 if ri == 3 else 0), midi(ROOT[ri]) + 31], 4 * P + 0.3), 1.0); put(t0, b808(midi(ROOT[ri]), 4 * P * 0.9), 0.45)
# sections (beats): 50–66 drop (the clip ends at beat 54.09 inside it), 66–82 break, 82–98 build, 98–130 drop 2, 130 end hit
for b in range(50, 130, 4):
    sect, a, z = ('drop', 50, 66) if b < 66 else ('break', 66, 82) if b < 82 else ('build', 82, 98) if b < 98 else ('drop2', 98, 130)
    bar(b, sect, (b - a) / (z - a))
# build: snare roll 8ths -> 16ths over the last 2 bars + riser
for i, s in enumerate(np.arange(beat(90), beat(98), S16)):
    if s < beat(94) and i % 2: continue
    put(s, clap(), 0.25 + 0.6 * (s - beat(90)) / (8 * P))
put(beat(90), riser(8 * P), 1.0)
# end hit: kick + long 808 + cowbell stab, ringing out
put(beat(130), kick(), 1.0); put(beat(130), b808(midi('C#2'), 2.6), 0.9); put(beat(130), clap(), 0.8)
for n in ('C#5', 'E5', 'G#5'): put(beat(130), cowbell(midi(n), 0.9), 0.55)
mix = np.stack([L, Rr], 1)[:int(T_END * SR)]
mix = hp(mix.T, 35).T                         # nothing useless below 35 Hz
fade = int(1.4 * SR); mix[-fade:] *= np.linspace(1, 0, fade)[:, None] ** 2
# level: match the clip's drop loudness (RMS of 15.81–23.19 s) with our drop
sr, song = wf.read('out/spooky/song.wav'); song = song.astype(np.float64) / 32768; song = np.pad(song, ((0, SR), (0, 0)))
rms = lambda x: np.sqrt((x ** 2).mean())
ref = rms(song[int(15.81 * SR):int(23.19 * SR)]); ours = rms(mix[int(beat(98) * SR):int(beat(114) * SR)])
mix *= ref / ours * 0.75; mix = np.clip(np.tanh(mix * 1.1) / np.tanh(1.1), -0.98, 0.98)
i0 = int(SONG_END * SR); tail = mix.copy(); tail[:i0] = 0
full = tail.copy(); xf = int(0.01 * SR); full[:i0] = song[:i0]; full[i0:i0 + xf] = song[i0:i0 + xf] * np.linspace(1, 0, xf)[:, None] + tail[i0:i0 + xf] * np.linspace(0, 1, xf)[:, None]
for name, x in (('music_tail2', tail), ('music_full2', full)): wf.write(f'out/spooky/{name}.wav', SR, (np.clip(x, -1, 1) * 32767).astype(np.int16))
print('ref rms', round(ref, 4), 'gain', round(ref / ours, 3))
