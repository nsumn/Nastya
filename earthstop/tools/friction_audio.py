"""Order the friction video SFX + music from Lumean into out/fraudio/ (skips files that exist; resumes paid orders from out/fraudio/orders.json).
Run from earthstop/: python3 tools/friction_audio.py   (key: earthstop/.lumean.key, git-ignored). Reuses amb/fountain/gasp/whoosh from out/nsaudio if present."""
import os, sys, json, time, shutil
sys.path.insert(0, os.path.dirname(__file__)); from lumean import call, wait, fetch
OUT = 'out/fraudio'; os.makedirs(OUT, exist_ok=True); OJ = f'{OUT}/orders.json'
for k in ('amb', 'fountain', 'gasp', 'whoosh', 'beep', 'light1'):
    if os.path.exists(f'out/graudio/{k}.mp3') and not os.path.exists(f'{OUT}/{k}.mp3'): shutil.copy(f'out/graudio/{k}.mp3', f'{OUT}/{k}.mp3')
SFX = {
  'slip':  ('sneaker slipping on a smooth floor, sharp squeak, cartoon slip', 1),
  'thud':  ('person falling flat on their back on pavement, body thud, oof without voice', 1),
  'slide': ('body sliding smoothly across pavement on clothes, continuous soft swish', 6),
  'stop':  ('sudden stop of a sliding body, short scrape and bump', 1),
}
MUSIC = {}
jobs = json.load(open(OJ)) if os.path.exists(OJ) else {}
for k, (txt, dur) in SFX.items():
    if os.path.exists(f'{OUT}/{k}.mp3') or k in jobs: continue
    jobs[k] = call('POST', '/orders', {'task_type': 'sfx', 'task_data': {'text': txt, 'duration_seconds': dur}})['data']['id']
for k, p in MUSIC.items():
    if os.path.exists(f'{OUT}/{k}0.mp3') or k in jobs: continue
    jobs[k] = call('POST', '/orders', {'task_type': 'music', 'task_data': {'prompt': p, 'n_variants': 2, 'force_instrumental': True, 'music_length_ms': 30000}})['data']['id']
json.dump(jobs, open(OJ, 'w'), indent=1); print('orders', jobs, flush=True)
for k, oid in jobs.items():
    if os.path.exists(f'{OUT}/{k}.mp3') or os.path.exists(f'{OUT}/{k}0.mp3'): continue
    for a in range(5):
        try:
            d = wait(oid, maxs=900); fs = (d.get('result') or {}).get('files') or []
            if k in MUSIC:
                for i, f in enumerate(fs): fetch(f, f'{OUT}/{k}{i}.mp3')
            elif fs: fetch(fs[0], f'{OUT}/{k}.mp3')
            print(k, d['status'], len(fs), flush=True); break
        except Exception as e: print(k, 'retry', e, flush=True); time.sleep(2 ** a)
print('done', sorted(os.listdir(OUT)))
