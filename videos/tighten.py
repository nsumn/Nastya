"""Remove the pauses between sentences: every silence longer than MAX_GAP in the voice is shortened to KEEP,
and the alignment is shifted the same way so captions and animation cues stay in sync.
python tighten.py <project_dir>   -> voice/tight.wav + voice/alignment_tight.csv"""
import csv, os, subprocess, sys, wave
import numpy as np

D = sys.argv[1]; SR = 44100
MAX_GAP, KEEP = 0.18, 0.10          # seconds: a gap longer than MAX_GAP becomes KEEP

raw = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(D, "voice", "result.mp3"), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                     capture_output=True, check=True).stdout
x = np.frombuffer(raw, np.float32).copy()
hop = int(0.01 * SR)
rms = np.sqrt(np.convolve(x ** 2, np.ones(hop) / hop, mode="same"))[::hop]
silent = rms < max(0.004, 0.03 * np.percentile(rms, 95))

# silent runs (in 10 ms steps), only inside the speech (keep the very start/end as they are)
cuts, i = [], 0
while i < len(silent):
    if silent[i]:
        j = i
        while j < len(silent) and silent[j]: j += 1
        a, b = i * 0.01, j * 0.01
        if b - a > MAX_GAP and i > 0 and j < len(silent):
            cuts.append((a + KEEP / 2, b - KEEP / 2))                 # remove the middle, keep KEEP around the edges
        i = j
    else:
        i += 1

def remap(t):
    removed = 0.0
    for a, b in cuts:
        if t >= b: removed += b - a
        elif t > a: removed += t - a
    return t - removed

keep, last = [], 0
for a, b in cuts:
    keep.append(x[int(last * SR): int(a * SR)]); last = b
keep.append(x[int(last * SR):])
fade = int(0.008 * SR)
for seg in keep:                                                     # tiny fades so the joins do not click
    if len(seg) > 2 * fade: seg[:fade] *= np.linspace(0, 1, fade); seg[-fade:] *= np.linspace(1, 0, fade)
y = np.concatenate(keep)
with wave.open(os.path.join(D, "voice", "tight.wav"), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes())

rows = list(csv.DictReader(open(os.path.join(D, "voice", "alignment.csv"), encoding="utf-8")))
with open(os.path.join(D, "voice", "alignment_tight.csv"), "w", encoding="utf-8", newline="") as f:
    wr = csv.writer(f); wr.writerow(["index", "char", "start", "end"])
    for r in rows: wr.writerow([r["index"], r["char"], f"{remap(float(r['start'])):.3f}", f"{remap(float(r['end'])):.3f}"])
print(f"{len(cuts)} pauses shortened: {len(x) / SR:.1f} s -> {len(y) / SR:.1f} s")
