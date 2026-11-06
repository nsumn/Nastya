"""Order the President-for-a-day video SFX + music from Lumean into out/poaudio/ (skips existing files; resumes paid orders from out/poaudio/orders.json).
Run from earthstop/: python3 tools/polar_audio.py   (key: earthstop/.lumean.key, git-ignored)."""
import os, sys, json, time
sys.path.insert(0, os.path.dirname(__file__)); from lumean import call, wait, fetch
OUT = 'out/praudio'; os.makedirs(OUT, exist_ok=True); OJ = f'{OUT}/orders.json'
SFX = {
  'whoosh':   ('fast cinematic whoosh transition', 1.2),
  'morning':  ('morning birds outside a tall window, quiet elegant room', 4),
  'gasp':     ('short comedic orchestral sting, surprised', 1.5),
  'steps':    ('dress shoes walking on a marble hallway, two people, echo', 5),
  'click':    ('heavy briefcase latch click, close', 0.8),
  'keys':     ('car keys jingling, taken from a hand', 1.2),
  'nope':     ('short comedic sad trombone wah-wah', 2),
  'heavydoor':('very heavy armored car door slowly opening, deep metallic creak and thunk', 3),
  'flyby':    ('big jet airliner flying past overhead, roar fading', 4),
  'cabin':    ('quiet airplane cabin hum, soft', 6),
  'ching':    ('cash register cha-ching', 1.2),
  'sad':      ('comedic descending tuba, deflated', 2),
  'paper':    ('huge avalanche of paper envelopes falling and sliding', 5),
  'plate':    ('plate set on a fancy table, cutlery clink', 1),
  'paperbill':('a folded paper bill placed on a silver tray', 1),
  'roll':     ('bowling ball rolling down a wooden lane', 3),
  'strike':   ('bowling strike, pins crashing', 2),
  'cheer':    ('short comedic victory fanfare, brass', 2),
  'tiptoe':   ('cartoon sneaky tiptoe footsteps', 4),
  'pop':      ('quick comedic pop sound, someone suddenly appears', 0.6),
}
MUSIC = {'march': 'playful patriotic orchestral comedy march, brass and snare, light and funny, bouncy, 112 bpm',
         'sneak': 'sneaky comedic pizzicato strings and bassoon, tiptoeing at night, playful, 100 bpm'}
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
