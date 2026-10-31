"""Mix Lumean SFX + music onto a timeline (no ducking: effects at full level, music under them, her rule).
Usage: python3 tools/mix_sfx.py <sfx_dir> <out.wav> <length_s> <cue file>   cue lines: time  name  gain  [pan]   (name = file stem in sfx_dir; '#' comments)
       music lines: 'music <file stem> <start> <gain> <fade_out_at>'"""
import sys, subprocess, numpy as np, scipy.io.wavfile as wf
SR = 44100
D, OUT, LEN, CUES = sys.argv[1], sys.argv[2], float(sys.argv[3]), sys.argv[4]
def load(stem):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f'{D}/{stem}.mp3', '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)
mix = np.zeros((int(LEN * SR) + SR, 2)); cache = {}
for line in open(CUES):
    line = line.split('#')[0].split()
    if not line: continue
    if line[0] == 'music':
        x = load(line[1]); t0, g, fo = float(line[2]), float(line[3]), float(line[4]); x = x[:max(0, len(mix) - int(t0 * SR))].copy()
        i0 = int((fo - t0) * SR); n = int(1.5 * SR)
        if 0 <= i0 < len(x): x[i0:i0 + n] *= np.linspace(1, 0, min(n, len(x) - i0))[:, None]; x[i0 + n:] = 0
        mix[int(t0 * SR):int(t0 * SR) + len(x)] += x * g; continue
    t, name, g = float(line[0]), line[1], float(line[2]); pan = float(line[3]) if len(line) > 3 else 0.0
    x = cache.get(name); x = x if x is not None else cache.setdefault(name, load(name))
    x = x[:max(0, len(mix) - int(t * SR))] * g * np.array([1 - max(pan, 0), 1 + min(pan, 0)])
    mix[int(t * SR):int(t * SR) + len(x)] += x
mix = mix[:int(LEN * SR)]; mix /= max(1e-9, np.abs(mix).max()) / 0.9
wf.write(OUT, SR, (mix * 32767).astype(np.int16)); print('wrote', OUT)
