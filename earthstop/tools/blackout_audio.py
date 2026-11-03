"""Order the blackout video SFX + music from Lumean into out/blaudio/ (skips files that exist; resumes paid orders from out/blaudio/orders.json).
Run from earthstop/: python3 tools/blackout_audio.py   (key: earthstop/.lumean.key, git-ignored). Reuses amb/fountain/gasp/whoosh from out/nsaudio if present."""
import os, sys, json, time, shutil
sys.path.insert(0, os.path.dirname(__file__)); from lumean import call, wait, fetch
OUT = 'out/blaudio'; os.makedirs(OUT, exist_ok=True); OJ = f'{OUT}/orders.json'
for k in ('amb', 'fountain', 'gasp', 'whoosh'):
    if os.path.exists(f'out/nsaudio/{k}.mp3') and not os.path.exists(f'{OUT}/{k}.mp3'): shutil.copy(f'out/nsaudio/{k}.mp3', f'{OUT}/{k}.mp3')
SFX = {
  'amb':      ('evening riverside park ambience in Seoul, distant city traffic hum, soft chatter far away, gentle water', 10),
  'fountain': ('gentle bridge fountain water splashing into a river, distant', 6),
  'gasp':     ('crowd of people gasping in surprise outdoors, short', 2),
  'whoosh':   ('fast cinematic whoosh transition', 1.2),
  'cut':      ('huge city power outage, deep electrical clunk as everything shuts off at once, hum stops abruptly', 2),
  'night':    ('quiet night by a river, crickets, soft water lapping, light breeze, very calm', 10),
  'shimmer':  ('soft magical shimmering chime swell, stars appearing, airy, gentle', 4),
  'wow':      ('small crowd outdoors softly saying wow in awe, quiet murmur', 3),
  'poweron':  ('city power coming back on, electrical surge buzz and lights clicking on, rising hum', 2),
}
MUSIC = {'stars': 'ethereal ambient score, slow warm synth pads and soft piano, wonder, night sky full of stars, gentle build, no drums, 70 bpm'}
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
