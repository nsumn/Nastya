# Timeline for the sneeze short from the Lumean voice (word timestamps): squeeze every silence longer than GAP down to GAP (her rule: no pauses),
# remap the word times, and place the shot boundaries on the words that start each beat. Writes out/sneeze/timing.json + out/sneeze/voice.wav.
import json, subprocess, numpy as np, scipy.io.wavfile as wf
R = json.load(open('out/sneeze/voice_result.json')); WORDS = R['words']; SR = 44100; LEAD, GAP, TAIL, HOP = 0.25, 0.22, 1.9, 0.01
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', 'out/sneeze/voice.mp3', '-ac', '1', '-ar', str(SR), 'out/sneeze/voice_raw.wav'], check=True)
sr, x = wf.read('out/sneeze/voice_raw.wav'); x = x.astype(np.float32)
h = int(HOP * SR); n = len(x) // h; rms = np.array([np.sqrt((x[i * h:(i + 1) * h] ** 2).mean()) for i in range(n)]); silent = rms < 0.02 * rms.max()
cuts = []; i = 0   # (start_s, removed_s): silent runs longer than GAP keep GAP
while i < n:
    if silent[i]:
        j = i
        while j < n and silent[j]: j += 1
        if (j - i) * HOP > GAP and i > 0: cuts.append(((i * HOP) + GAP / 2, (j - i) * HOP - GAP))
        i = j
    else: i += 1
def remap(t): return LEAD + t - sum(r for s0, r in cuts if s0 < t) - sum(max(0, min(r, t - s0)) * 0 for s0, r in cuts)
keep = np.ones(len(x), bool)
for s0, r in cuts: keep[int(s0 * SR):int((s0 + r) * SR)] = False
y = np.concatenate([np.zeros(int(LEAD * SR), np.float32), x[keep], np.zeros(int(TAIL * SR), np.float32)]); T_END = round(len(y) / SR, 2)
wf.write('out/sneeze/voice.wav', SR, np.clip(y, -32767, 32767).astype(np.int16))
words = [[round(remap(w['start']), 3), w['word']] for w in WORDS]
def at(word, after=0.0): return next(tt for tt, ww in words if tt >= after - 1e-3 and ww.lower().strip('.,!?') == word)
starts = [('face', 0.0), ('lungs', at('your')), ('blocked', at('but')), ('pressure', at('the', at('nowhere'))), ('car', at('in', at('higher'))),
          ('tear', at('and', at('driving'))), ('rupture', at('another')), ('hospital', at('a', at('leaked'))), ('ear', at('it', at('tube'))), ('elbow', at('so'))]
shots = [dict(name=nm, t0=round(max(0, a - 0.1) if i else 0.0, 3), t1=round(starts[i + 1][1] - 0.1, 3) if i + 1 < len(starts) else T_END) for i, (nm, a) in enumerate(starts)]
json.dump(dict(t_end=T_END, words=words, shots=shots, cuts=len(cuts)), open('out/sneeze/timing.json', 'w'), indent=1)
print('T_END', T_END, 'silences squeezed', len(cuts)); [print(s) for s in shots]
