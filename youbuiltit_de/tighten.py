"""Shorten pauses in a Lumean voiceover and remap alignment.csv to the new timeline.
  python tighten.py <voice_dir> [max_pause=0.2]
Writes voice_fast.mp3 and alignment_fast.csv next to the originals."""
import csv, subprocess, sys, numpy as np
d = sys.argv[1]; MAXP = float(sys.argv[2]) if len(sys.argv) > 2 else 0.2
SR = 44100
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", f"{d}/result.mp3", "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
a = np.frombuffer(raw, np.float32)
win = int(.01 * SR); n = len(a) // win
rms = np.sqrt((a[:n * win].reshape(n, win) ** 2).mean(1)); db = 20 * np.log10(rms + 1e-9)
quiet = db < -40
cuts = []                                        # (start_s, end_s) removed
i = 0
while i < n:
    if quiet[i]:
        j = i
        while j < n and quiet[j]: j += 1
        dur = (j - i) * .01
        if dur > MAXP and i > 0 and j < n:       # keep head/tail as is
            keep = MAXP / 2
            cuts.append((i * .01 + keep, j * .01 - keep))
        i = j
    else: i += 1
def remap(t):
    sh = 0
    for s, e in cuts:
        if t >= e: sh += e - s
        elif t > s: sh += t - s
    return t - sh
keep, prev = [], 0
for s, e in cuts: keep.append(a[int(prev * SR):int(s * SR)]); prev = e
keep.append(a[int(prev * SR):])
out = np.concatenate(keep)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ac", "1", "-ar", str(SR), "-i", "-", "-b:a", "192k", f"{d}/voice_fast.mp3"], input=out.tobytes(), check=True)
rows = list(csv.DictReader(open(f"{d}/alignment.csv", encoding="utf-8")))
with open(f"{d}/alignment_fast.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=rows[0].keys()); w.writeheader()
    for r in rows: r["start"] = f"{remap(float(r['start'])):.3f}"; r["end"] = f"{remap(float(r['end'])):.3f}"; w.writerow(r)
print(f"{len(cuts)} pauses shortened, {len(a)/SR:.1f}s -> {len(out)/SR:.1f}s")
