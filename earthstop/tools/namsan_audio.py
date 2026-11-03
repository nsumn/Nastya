"""Order the Namsan rocket video SFX + music from Lumean into out/nsaudio/ (skips files that exist).
Run from earthstop/: python3 tools/namsan_audio.py   (key: earthstop/.lumean.key, git-ignored)"""
import os, sys, json
sys.path.insert(0, os.path.dirname(__file__)); from lumean import call, wait, fetch
OUT = 'out/nsaudio'; os.makedirs(OUT, exist_ok=True)
SFX = {
  'amb':     ('evening riverside park ambience in Seoul, distant city traffic hum, soft chatter far away, gentle water', 10),
  'fountain':('gentle bridge fountain water splashing into a river, distant', 6),
  'beep':    ('soft digital countdown beep, clean, mid-range', 0.5),
  'flash':   ('bright light flash shimmer, airy high swell, no explosion', 1.5),
  'ignite':  ('rocket engine ignition heard from far away, rising crackling roar, distant', 4),
  'roar':    ('massive rocket launch roar arriving as a shock wave, crackling thunder, rattling', 6),
  'rumble':  ('long crackling rocket rumble fading into the distance, mid frequencies', 8),
  'glass':   ('windows and bottles rattling and vibrating from a shock wave', 3),
  'gust':    ('sudden strong wind gust through grass and trees', 2.5),
  'whoosh':  ('fast cinematic whoosh transition', 1.2),
  'space':   ('deep space ambience, airy calm drone, soft', 8),
  'gasp':    ('crowd of people gasping in surprise outdoors, short', 2),
}
MUSIC = {
  'tension': 'cinematic tension underscore, low pulsing synth and soft strings building slowly, anticipation, no drums at first, 92 bpm',
  'launch':  'epic cinematic launch theme, big drums and soaring strings and brass, triumphant, space, 92 bpm',
}
jobs = {}
for k, (txt, dur) in SFX.items():
    if os.path.exists(f'{OUT}/{k}.mp3'): continue
    r = call('POST', '/orders', {'task_type': 'sfx', 'task_data': {'text': txt, 'duration_seconds': dur}}); jobs[k] = r.get('data', {}).get('id'); print(k, r.get('data', r) if not jobs[k] else jobs[k], flush=True)
for k, p in MUSIC.items():
    if os.path.exists(f'{OUT}/{k}0.mp3'): continue
    r = call('POST', '/orders', {'task_type': 'music', 'task_data': {'prompt': p, 'n_variants': 2, 'force_instrumental': True, 'music_length_ms': 30000}}); jobs[k] = r.get('data', {}).get('id'); print(k, r.get('data', r) if not jobs[k] else jobs[k], flush=True)
for k, oid in jobs.items():
    if not oid: continue
    d = wait(oid, maxs=900); files = (d.get('result') or {}).get('files') or []
    print(k, d['status'], len(files), flush=True)
    if k in MUSIC:
        for i, f in enumerate(files): fetch(f, f'{OUT}/{k}{i}.mp3')
    elif files: fetch(files[0], f'{OUT}/{k}.mp3')
print('done', sorted(os.listdir(OUT)))
