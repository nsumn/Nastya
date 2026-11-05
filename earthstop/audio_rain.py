# Music + effects for "What if it never stopped raining?" (timeline = parts_rain/r_head.js). All sounds are Lumean generations (out/rain/sfx/*.mp3):
# one piano/strings piece (played twice: the second pass starts at the 1862 flashback), rain/flood/stairs/drip beds ONLY under their own scenes, thunder on every lightning flash,
# the drain gush, whooshes on the whip cuts, oars in 1862, wind above the clouds. Usage: python3 audio_rain.py [--no-music]
import subprocess, sys, numpy as np, scipy.io.wavfile as wf
SR = 44100; DRAIN, RIVER, SUBWAY, MOLD, AERIAL, OLD, MAPC, ROW, YEAR, TWIST, ENDC, T_END = 4.0, 10.0, 16.0, 22.0, 28.0, 34.0, 37.5, 41.0, 44.0, 52.0, 58.5, 64.0
FLASHES = [1.25, 9.55, 21.6, 30.3, 44.4, 49.6]
N = int(T_END * SR); mix = np.zeros((N + SR, 2), np.float32)
def load(k):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f'out/rain/sfx/{k}.mp3', '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32).reshape(-1, 2).copy(); return x / (np.abs(x).max() + 1e-9)
def bed(k, a, b, db, fade=0.35):   # tile a clip (crossfaded) to cover [a, b)
    x = load(k); n = int((b - a) * SR); out = np.zeros((n, 2), np.float32); xf = int(0.3 * SR); pos = 0
    while pos < n:
        seg = x[:min(len(x), n - pos)].copy()
        if pos and len(seg) > xf: seg[:xf] *= np.linspace(0, 1, xf)[:, None]
        if len(seg) > xf: seg[-xf:] *= np.linspace(1, 0, xf)[:, None]
        out[pos:pos + len(seg)] += seg; pos += len(seg) if len(seg) <= xf else len(seg) - xf   # a short last piece must not move pos back
    put(a, out, db, fade)
def put(t, x, db=0.0, fade=0.02):
    i = int(t * SR); x = x[:max(0, len(mix) - i)].copy(); f = int(fade * SR)
    if f and len(x) > 2 * f: x[:f] *= np.linspace(0, 1, f)[:, None]; x[-f:] *= np.linspace(1, 0, f)[:, None]
    mix[i:i + len(x)] += x * 10 ** (db / 20)
if '--no-music' not in sys.argv:
    mu = load('music_0'); a = mu[:int(OLD * SR)].copy(); put(0, a, -9, 1.0)   # first pass up to the flashback
    b = mu[:int((T_END - OLD + 0.4) * SR)].copy(); f = int(2.2 * SR); b[-f:] *= np.linspace(1, 0, f)[:, None] ** 2; put(OLD - 0.4, b, -9, 0.8)   # second pass from the top
bed('rain_heavy', 0, SUBWAY, -11); bed('flood', RIVER, SUBWAY, -12); bed('stairs', SUBWAY, MOLD, -11); bed('drip', MOLD, AERIAL, -12)
bed('rain_heavy', AERIAL, OLD, -10); bed('flood', AERIAL, OLD, -15); bed('rain_heavy', OLD, MAPC, -17); bed('oars', OLD, MAPC, -12); bed('rain_heavy', ROW, YEAR, -17); bed('oars', ROW, YEAR, -12)
bed('rain_heavy', YEAR, TWIST, -14); bed('wind', TWIST, T_END - 0.5, -15, 1.0)
for t in FLASHES: put(t, load('thunder'), -6, 0.01)
put(DRAIN + 0.35, load('gush'), -7, 0.1)
for t in (RIVER, 19.0, AERIAL): put(t - 0.3, load('whoosh'), -9)
put(TWIST - 2.6, load('rise'), -11, 0.3)
mix = mix[:N]; mix -= mix.mean(0); mix = np.tanh(mix * 1.2) / np.tanh(1.2)
out = 'out/rain/audio_nomusic_raw.wav' if '--no-music' in sys.argv else 'out/rain/audio_raw.wav'
wf.write(out, SR, (np.clip(mix, -1, 1) * 32767).astype(np.int16)); print('wrote', out)
