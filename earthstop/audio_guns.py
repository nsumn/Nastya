# Music + effects for "What if every gun in America disappeared overnight?" (timeline = parts_guns/u_head.js). All sounds are Lumean generations (out/guns/sfx/*.mp3):
# a sneaky comedic heist piece (two variants: 0–32 s and 32–51.8 s), cut for the FBI → garage beat, ambience beds ONLY under their own scenes, the midnight chime,
# the vanish shimmer on the map, pops on the scripted bubbles, whooshes on the whips, gavel bangs, the garage door up/down and a reveal sting. Usage: python3 audio_guns.py [--no-music]
import subprocess, sys, numpy as np, scipy.io.wavfile as wf
SR = 44100; WAKE, MAP, MORN, STREETM, STORE, STOCK, MARCH, CONG, FBIT, GARAGE, ENDC, T_END = 0.0, 4.0, 9.0, 12.0, 15.0, 22.0, 28.0, 38.0, 45.0, 52.0, 58.0, 64.0
N = int(T_END * SR); mix = np.zeros((N + SR, 2), np.float32)
def load(k, af=None):
    cmd = ['ffmpeg', '-v', 'error', '-i', f'out/guns/sfx/{k}.mp3'] + (['-af', af] if af else []) + ['-ac', '2', '-ar', str(SR), '-f', 'f32le', '-']
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
        out[pos:pos + len(seg)] += seg; pos += len(seg) if len(seg) <= xf else len(seg) - xf
    put(a, out, db, fade)
def seg(x, a, b): return x[int(a * SR):int(b * SR)].copy()
if '--no-music' not in sys.argv:
    m0 = load('music_0', 'atempo=0.9375')[:int(32 * SR)]; put(0.0, seg(m0, 0, MARCH + 0.3), -9, 0.4)      # from the first frame
    m1 = load('music_1'); a = seg(m1, 0, FBIT + 6.8 - MARCH); f = int(1.2 * SR); a[-f:] *= np.linspace(1, 0, f)[:, None] ** 2; put(MARCH - 0.05, a, -9, 0.1)   # out before the garage
    e = seg(m0, 20, 26.5); f = int(3 * SR); e[-f:] *= np.linspace(1, 0, f)[:, None] ** 2; put(56.3, e, -10, 0.6)                 # back in for "nobody needs to know" + the end card
put(2.2, load('chime'), -8, 0.02); put(MAP + 0.4, load('vanish'), -8, 0.05); put(MAP + 2.2, load('vanish'), -12, 0.05)
bed('birds', STREETM, STORE, -16); bed('store', STORE, STOCK, -15); bed('office', STOCK, MARCH, -19); put(STOCK + 0.3, load('bell'), -12, 0.05)
bed('protest', MARCH, CONG, -14); bed('congress', CONG, FBIT, -14); bed('tension', FBIT, GARAGE + 0.6, -12, 0.5)
for t in (42.0, 43.6): put(t, load('gavel'), -7, 0.005)
put(MORN + 0.5, load('gasp'), -9, 0.005)
for t in (MORN + 0.6, STREETM + 0.5, 13.4, 18.8, 19.5, 20.95, 26.0, 33.3, 34.4, 36.2, 39.0, 49.6, 56.4): put(t, load('pop'), -10, 0.005)
for t in (MAP, MORN, STORE, STOCK, MARCH, CONG, FBIT, GARAGE): put(t - 0.35, load('whoosh'), -11)
put(GARAGE - 2.0, load('riser'), -12, 0.2); put(GARAGE + 0.25, load('garageup'), -8, 0.05); put(GARAGE + 1.2, load('reveal'), -7, 0.02); put(55.95, load('garagedn'), -10, 0.05)
mix = mix[:N]; mix -= mix.mean(0); mix = np.tanh(mix * 1.2) / np.tanh(1.2)
out = 'out/guns/audio_nomusic_raw.wav' if '--no-music' in sys.argv else 'out/guns/audio_raw.wav'
wf.write(out, SR, (np.clip(mix, -1, 1) * 32767).astype(np.int16)); print('wrote', out)
