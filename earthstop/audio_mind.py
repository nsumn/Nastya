# Music + effects for "What if you could hear everyone's thoughts?" (timeline = parts_mind/m_head.js). All sounds are Lumean generations (out/mind/sfx/*.mp3):
# one playful pizzicato piece, slowed to 32 s and played twice (the second pass starts on the Times Square cut), short ambience beds ONLY under their own scenes,
# a soft pop on every scripted bubble (neighbours, SKIBIDI, 67, nice a**, "nice shirt"), a record scratch on the LIE, whooshes on the whips, whispers in the packed subway,
# the MRI hum + typing for the decoder. Usage: python3 audio_mind.py [--no-music]
import subprocess, sys, numpy as np, scipy.io.wavfile as wf
SR = 44100; WAKE, STREET, TRAIN, OFFICE, CAFE, LIARS, SQUARE, NIGHT, CITY, LAB, ENDC, T_END = 0.0, 4.0, 10.0, 17.0, 24.0, 28.0, 32.0, 41.0, 45.0, 51.0, 58.5, 64.0
N = int(T_END * SR); mix = np.zeros((N + SR, 2), np.float32)
def load(k, af=None):
    cmd = ['ffmpeg', '-v', 'error', '-i', f'out/mind/sfx/{k}.mp3'] + (['-af', af] if af else []) + ['-ac', '2', '-ar', str(SR), '-f', 'f32le', '-']
    x = np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, np.float32).reshape(-1, 2).copy(); return x / (np.abs(x).max() + 1e-9)
def put(t, x, db=0.0, fade=0.02):
    i = int(t * SR); x = x[:max(0, len(mix) - i)].copy(); f = int(fade * SR)
    if f and len(x) > 2 * f: x[:f] *= np.linspace(0, 1, f)[:, None]; x[-f:] *= np.linspace(1, 0, f)[:, None]
    mix[i:i + len(x)] += x * 10 ** (db / 20)
def bed(k, a, b, db, fade=0.35):   # tile a clip (crossfaded) to cover [a, b)
    x = load(k); n = int((b - a) * SR); out = np.zeros((n, 2), np.float32); xf = int(0.3 * SR); pos = 0
    while pos < n:
        seg = x[:min(len(x), n - pos)].copy()
        if pos and len(seg) > xf: seg[:xf] *= np.linspace(0, 1, xf)[:, None]
        if len(seg) > xf: seg[-xf:] *= np.linspace(1, 0, xf)[:, None]
        out[pos:pos + len(seg)] += seg; pos += len(seg) if len(seg) <= xf else len(seg) - xf   # a short last piece must not move pos back
    put(a, out, db, fade)
if '--no-music' not in sys.argv:
    mu = load('music_0', 'atempo=0.9375')[:int(32 * SR)]   # 30 s → 32 s
    a = mu.copy(); f = int(0.5 * SR); a[-f:] *= np.linspace(1, 0.3, f)[:, None]; put(0, a, -8, 0.05)
    b = mu.copy(); f = int(2.5 * SR); b[-f:] *= np.linspace(1, 0, f)[:, None] ** 2; put(SQUARE - 0.05, b, -8, 0.15)
put(0.05, load('alarm'), -9, 0.02)
bed('street', STREET, TRAIN, -15); bed('subway', TRAIN, OFFICE, -14); bed('office', OFFICE, CAFE, -17); bed('cafe', CAFE, SQUARE, -17)
bed('times', SQUARE, NIGHT, -16); bed('night', NIGHT, CITY, -15); bed('mri', LAB, ENDC, -15, 0.6)
w = load('whispers'); put(TRAIN + 1.0, w, -18, 1.2); put(CITY + 0.6, w[::-1].copy(), -20, 1.5)   # the subway overload; the whole city murmuring
for t in (1.25, 2.1, 2.8, 7.5, 14.6, 18.2, 24.45, 38.7, 41.3, 41.9, 42.6, 43.3): put(t, load('pop'), -9, 0.005)
put(25.72, load('scratch'), -7, 0.005)
for t in (TRAIN, LIARS, CITY): put(t - 0.35, load('whoosh'), -10)
put(LAB - 2.1, load('riser'), -12, 0.2); put(LAB + 4.6, load('typing'), -11); put(LAB + 6.4, load('typing')[:int(1.2 * SR)], -11)
mix = mix[:N]; mix -= mix.mean(0); mix = np.tanh(mix * 1.2) / np.tanh(1.2)
out = 'out/mind/audio_nomusic_raw.wav' if '--no-music' in sys.argv else 'out/mind/audio_raw.wav'
wf.write(out, SR, (np.clip(mix, -1, 1) * 32767).astype(np.int16)); print('wrote', out)
