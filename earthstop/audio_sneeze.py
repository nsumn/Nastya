# Mix for the sneeze short: the Lumean voice (squeezed, out/sneeze/voice.wav), a Lumean music bed under it, and Lumean SFX on the picture's events.
# Times come from out/sneeze/timing.json (same file the Blender render uses). Usage: python3 audio_sneeze.py [--no-music]
import json, subprocess, sys, numpy as np, scipy.io.wavfile as wf
from scipy.signal import butter, sosfilt
SR = 44100; TM = json.load(open('out/sneeze/timing.json')); SH = {s['name']: s for s in TM['shots']}; T_END = TM['t_end']; N = int(T_END * SR)
def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()
mix = np.zeros(N + SR, np.float32)
def put(t, x, db=0.0, fade=0.02):
    i = int(t * SR); x = x[:max(0, len(mix) - i)].copy(); f = int(fade * SR)
    if f and len(x) > 2 * f: x[:f] *= np.linspace(0, 1, f); x[-f:] *= np.linspace(1, 0, f)
    mix[i:i + len(x)] += x * 10 ** (db / 20)
sfx = lambda k: load(f'out/sneeze/sfx/{k}.mp3')
voice = load('out/sneeze/voice.wav'); voice /= np.abs(voice).max() + 1e-9
voice = sosfilt(butter(2, 90, 'high', fs=SR, output='sos'), voice)   # clean low rumble
if '--no-music' not in sys.argv:
    mus = load('out/sneeze/sfx/music_0.mp3'); mus /= np.abs(mus).max() + 1e-9; m = np.zeros(N, np.float32); m[:min(N, len(mus))] = mus[:N]
    m[-int(1.5 * SR):] *= np.linspace(1, 0, int(1.5 * SR)) ** 2; put(0, m, -17, 0.5)
f = SH['face']; put(f['t0'] + 1.1, sfx('stifle'), -6)
put(SH['lungs']['t0'] + 0.95, sfx('rush'), -5)
put(SH['blocked']['t0'] + 0.3, sfx('rush'), -9)
put(SH['pressure']['t0'], sfx('pressure'), -6, 0.2)
c = SH['car']; put(c['t0'] - 0.25, sfx('whoosh'), -8); put(c['t0'], sfx('car'), -12, 0.3); put(c['t0'] + 1.3, sfx('stifle'), -8)
put(SH['tear']['t0'] + 0.75, sfx('pop'), -3); put(SH['rupture']['t0'] + 0.5, sfx('pop'), -3)
put(SH['hospital']['t0'], sfx('monitor'), -13, 0.2)
put(SH['ear']['t0'] + 1.4, sfx('eardrum'), -7)
e = SH['elbow']; put(e['t0'] - 0.25, sfx('whoosh'), -8); put(e['t0'] + 0.9, sfx('achoo'), -2)
put(0, voice.astype(np.float32), 0, 0)
mix = mix[:N]; mix = np.tanh(mix * 1.1) / np.tanh(1.1)
out = 'out/sneeze/audio_nomusic.wav' if '--no-music' in sys.argv else 'out/sneeze/audio_raw.wav'
wf.write(out, SR, (np.clip(mix, -1, 1) * 32767).astype(np.int16)); print('wrote', out, round(N / SR, 2), 's')
