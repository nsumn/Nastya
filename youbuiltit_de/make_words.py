"""Build words.json (word-level timings) from a char-level alignment CSV.
  python make_words.py <video_dir>      # reads <video_dir>/voice/alignment_fast.csv, writes <video_dir>/words.json
Each entry: [word, start_s, end_s]. Tokens glued across a sentence end ("Burg.Aber") are split in two."""
import csv, json, re, sys
d = sys.argv[1]
rows = list(csv.DictReader(open(f"{d}/voice/alignment_fast.csv", encoding="utf-8")))
words, cur, st, en = [], "", None, None
for x in rows:
    c = x["char"]
    if c.strip() == "":
        if cur: words.append([cur, st, en]); cur = ""
        continue
    if not cur: st = float(x["start"])
    cur += c; en = float(x["end"])
if cur: words.append([cur, st, en])
out = []
for w, s, e in words:
    parts = re.split(r"(?<=[.!?,])(?=[A-ZÄÖÜa-zäöü])", w)
    if len(parts) == 1: out.append([w, s, e]); continue
    L, t = sum(map(len, parts)), s
    for p in parts:
        dt = (e - s) * len(p) / L; out.append([p, round(t, 3), round(t + dt, 3)]); t += dt
json.dump(out, open(f"{d}/words.json", "w"), ensure_ascii=False)
print(len(out), "words; sentence starts:")
for i, (w, s, e) in enumerate(out):
    if i == 0 or out[i - 1][0][-1] in ".!?": print(f"  {s:6.2f}  {w}")
