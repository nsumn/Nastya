"""Order the South Pole winter video (first built as the Jang Bogo one) SFX + music from Lumean into out/poaudio/ (skips existing files; resumes paid orders from out/poaudio/orders.json).
Run from earthstop/: python3 tools/polar_audio.py   (key: earthstop/.lumean.key, git-ignored)."""
import os, sys, json, time
sys.path.insert(0, os.path.dirname(__file__)); from lumean import call, wait, fetch
OUT = 'out/poaudio'; os.makedirs(OUT, exist_ok=True); OJ = f'{OUT}/orders.json'
SFX = {
  'wind_soft': ('soft cold polar wind outside a window, quiet and lonely, airy, no rumble', 10),
  'room':      ('quiet empty research station interior, soft ventilation, a refrigerator hum far away, very subtle', 10),
  'whoosh':    ('soft cinematic whoosh transition', 1.2),
  'boom':      ('deep cinematic hit with a long airy tail, emotional, not harsh', 3),
  'paper':     ('a single sheet of paper slid on a table, close', 1.2),
  'robot':     ('small robot vacuum cleaner rolling on a wooden floor, gentle motor whirr', 4),
  'bump':      ('robot vacuum gently bumping into a shoe, soft plastic tap', 0.8),
  'chirp':     ('cute short friendly robot beep, two soft rising tones', 0.8),
  'blizzard':  ('violent antarctic blizzard, howling wind gusts and snow hitting a building, rattling', 10),
  'rattle':    ('window rattling hard in a storm, metal frame creaking', 3),
  'steps':     ('footsteps crunching in deep snow in a blizzard, heavy boots, slow', 5),
  'clock':     ('digital alarm clock display click in a silent room at night, tiny', 0.6),
  'breath':    ('slow tired exhale in a silent cold room, soft', 2),
  'beepwx':    ('soft warning chime on a digital weather display, two notes', 1),
  'aurora':    ('ethereal shimmering high airy pad, magical aurora sound, soft glassy tones', 8),
  'plane':     ('four-engine turboprop airplane taking off on snow, roaring past then fading into the distance', 8),
  'greenhouse':('quiet hydroponic greenhouse, soft fans and trickling water, gentle hum', 6),
  'sunrise':   ('warm swelling choir-like pad rising to a bright resolve, hopeful sunrise', 5),
}
MUSIC = {'lonely': 'slow lonely cinematic piano and soft strings, cold and intimate, Antarctic night, minimal, 70 bpm',
         'hope':   'emotional cinematic piano with swelling warm strings, hopeful sunrise after a long night, builds gently, 70 bpm'}
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
