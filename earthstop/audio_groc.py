import numpy as np, sys, json, re, subprocess
from scipy.signal import butter, sosfilt
from scipy.io import wavfile
# "One trip with all the groceries" (unnecessary-engineering format): the narration (Lumean TTS, voice C) + Lumean SFX placed on the story cues
# + one Lumean music bed (30 s, looped with a crossfade), ducked under the voice. Files: out/groc/voice.wav (tools/groc_timing.py), out/groc/sfx/*.mp3.
# --no-music: voice + SFX only.
SR = 44100; MUSIC = '--no-music' not in sys.argv
js = open('parts_groc/g_times.js').read()
T_END = float(re.search(r'const T_END = ([\d.]+)', js).group(1)); CUE = json.loads(re.search(r'const CUE = (\{.*?\});', js).group(1))
N = int(SR * T_END); t = np.arange(N) / SR; L = np.zeros(N); Rr = np.zeros(N)
def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)
def db(x): return 10 ** (x / 20)
def place(at, sig, g=1.0, pan=0.0):
    i0 = int(at * SR)
    if i0 >= N: return
    s = sig[:N - i0]; L[i0:i0 + len(s)] += s[:, 0] * g * np.sqrt(1 - pan) ; Rr[i0:i0 + len(s)] += s[:, 1] * g * np.sqrt(1 + pan)
WORDS = json.loads(re.search(r'const WORDS = (\[.*?\]);', js).group(1))
def wordT(w, after): return next((t for t, x in WORDS if t >= after - 0.01 and re.sub(r'[^a-z]', '', x.lower()) == w), 99)
SFX = {k: load(f'out/groc/sfx/sfx_{k}.mp3') for k in ['bags', 'hooks', 'knees', 'frame', 'wheels', 'bump', 'legs', 'eggs', 'boing', 'engine', 'pop', 'door', 'keysj', 'dish', 'shutter', 'whoosh', 'brew', 'leaves']}
for k in SFX: SFX[k] /= np.abs(SFX[k]).max() + 1e-9
C = CUE; knees = wordT('until', C['nowitall']); motor = wordT('motor', C['addaseat']); keys = wordT('and', C['youdriveit'] + 0.5)
place(0.05, SFX['bags'], db(-17)); place(1.7, SFX['bags'], db(-22))
place(C['firsthookson'] + 0.3, SFX['hooks'], db(-15)); place(C['nowitall'] + 0.1, SFX['bags'], db(-18))
place(knees + 0.05, SFX['knees'], db(-14)); place(C['movethehooks'] + 0.15, SFX['frame'], db(-16))
place(C['putiton'] + 0.15, SFX['wheels'], db(-17)); place(C['excepttheporch'] - 0.1, SFX['bump'], db(-13))
place(C['giveitlegs'] + 0.15, SFX['legs'], db(-17)); place(C['nowitclimbs'] + 0.05, SFX['legs'], db(-17)); place(C['unfortunatelys'] + 0.6, SFX['eggs'], db(-12))
place(C['addsuspension'] + 0.1, SFX['boing'], db(-15)); place(C['smooth'] + 0.05, SFX['boing'], db(-22)); place(C['oneofthem'] + 0.5, SFX['shutter'], db(-16))
place(C['addaseat'] + 0.05, SFX['pop'], db(-17)); place(motor + 0.05, SFX['engine'], db(-15)); place(C['nowitsfast'] + 0.1, SFX['engine'], db(-16)); place(C['toofast'], SFX['wheels'], db(-19))
place(C['themilkgoes'] + 0.1, SFX['whoosh'], db(-14)); place(C['addseatbelts'] + 0.1, SFX['hooks'], db(-16))
place(C['thentheleaves'] + 0.1, SFX['leaves'], db(-15)); place(C['addaroof'] + 0.05, SFX['frame'], db(-15))
place(C['addtwomore'] + 0.1, SFX['legs'], db(-17)); place(C['addtwomore'] + 0.1, SFX['pop'], db(-19))
for k in ['installafreeze', 'andafridge', 'apantry', 'acounterfor', 'andatv']: place(C[k] + 0.05, SFX['pop'], db(-17))
place(C['adishwasher'] + 0.1, SFX['dish'], db(-16)); place(C['andacoffee'] + 0.1, SFX['brew'], db(-16))
place(C['onetrip'] + 0.1, SFX['legs'], db(-19)); place(keys + 0.05, SFX['door'], db(-13)); place(keys + 1.5, SFX['keysj'], db(-15))
voice = load('out/groc/voice.wav')[:, 0][:N]; v = np.zeros(N); v[:len(voice)] = voice
if MUSIC:
    m = load('out/groc/sfx/sfx_music.mp3'); fade = int(1.5 * SR); loop = m.copy()
    while len(loop) < N + SR: ramp = np.linspace(0, 1, fade)[:, None]; loop = np.concatenate([loop[:-fade], loop[-fade:] * (1 - ramp) + m[:fade] * ramp, m[fade:]])
    loop = loop[:N]; loop /= np.abs(loop).max() + 1e-9
    env = np.sqrt(np.convolve(v ** 2, np.ones(int(0.3 * SR)) / int(0.3 * SR), 'same')); env = env / (env.max() + 1e-9)
    duck = db(-14) * (1 - 0.6 * np.clip(env * 4, 0, 1)) * np.clip((T_END - t) / 1.5, 0, 1)
    L += loop[:, 0] * duck; Rr += loop[:, 1] * duck
L += v * db(-1); Rr += v * db(-1)
out = np.stack([L, Rr], 1); out = sosfilt(butter(2, 60, 'highpass', fs=SR, output='sos'), out.T).T
out = np.tanh(out * 1.1) / np.tanh(1.1); out /= np.abs(out).max() / 0.95
wavfile.write(sys.argv[1], SR, (out * 32767).astype(np.int16)); print('ok', T_END)
