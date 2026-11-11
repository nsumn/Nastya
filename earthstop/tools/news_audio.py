"""Order the US news-map videos (shared SFX/music) SFX + music from Lumean into out/poaudio/ (skips existing files; resumes paid orders from out/poaudio/orders.json).
Run from earthstop/: python3 tools/polar_audio.py   (key: earthstop/.lumean.key, git-ignored)."""
import os, sys, json, time
sys.path.insert(0, os.path.dirname(__file__)); from lumean import call, wait, fetch
OUT = 'out/nwaudio'; os.makedirs(OUT, exist_ok=True); OJ = f'{OUT}/orders.json'
SFX = {
  'whoosh':  ('fast clean cinematic whoosh transition', 1.0),
  'pop':     ('short satisfying UI pop, map pin appears', 0.5),
  'flip':    ('quick digital flip swoosh with a soft bright ding', 0.8),
  'rise':    ('rising bar graph swell, digital, short', 1.5),
  'thud':    ('deep soft impact hit for a big number on screen', 1.2),
  'stamp':   ('rubber stamp slam on paper', 0.8),
  'tick':    ('soft single counter tick, low, wooden', 0.5),
  # Nov 11 comparison: SFX that match the subject (geomapstories: coins/shutter/cartoon pops; WHN: shutter on every photo; Geolyth war stories: distant explosions)
  'shutter': ('camera shutter click, crisp, single', 0.5),
  'coins':   ('handful of coins dropping on a table, bright clink', 1.0),
  'gavel':   ('wooden gavel bang on a desk, single hit', 0.8),
  'crowd':   ('crowd of people murmuring and reacting, large hall, short', 2.0),
  'cheer':   ('crowd cheering and applause burst, short', 2.0),
  'boom':    ('distant explosion, deep but short, cinematic, no music', 1.5),
  'jet':     ('fighter jet fly-by whoosh, fast', 2.0),
  'type':    ('fast keyboard typing, short burst', 1.0),
  'ding':    ('phone news notification ding, clean', 0.6),
  'paper':   ('paper sheet slide and slap on a desk', 0.7),
  'alarm':   ('short warning alert beep, two tones', 1.0),
}
MUSIC = {'news': 'modern news explainer background music, pulsing synth bass, tense but upbeat, documentary, 100 bpm, no vocals'}
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
