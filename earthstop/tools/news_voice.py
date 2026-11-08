"""Voice-over for the US news-map videos (Lumean TTS, ElevenLabs "Andrew", American). Run from earthstop/: python3 tools/news_voice.py <name> <text file>
Writes out/<name>/voice.mp3 + out/<name>/result.json (word timestamps). Key: earthstop/.lumean.key (git-ignored)."""
import sys, os, json
sys.path.insert(0, os.path.dirname(__file__)); from lumean import template, order, wait, fetch, call
name, txtf = sys.argv[1], sys.argv[2]; D = f'out/{name}'; os.makedirs(D, exist_ok=True); text = open(txtf).read().strip()
tj = 'out/news_template.json'
tid = json.load(open(tj))['id'] if os.path.exists(tj) else None
if not tid: r = template('Andrew US news', 'gUABw7pXQjhjt0kNFBTF', owner=None, speed=1.04, stab=0.45, style=0.15); print(r); tid = r['data']['id']; json.dump({'id': tid}, open(tj, 'w'))
o = order(tid, text); print(o); d = wait(o['data']['id'], maxs=900); res = d.get('result') or {}; print(json.dumps(res)[:800])
fetch(res['files'][0], f'{D}/voice.mp3')
for f in res.get('service_files') or []:
    p = f if isinstance(f, str) else f.get('path', '')
    if p.endswith('.json'): fetch(p, f'{D}/result.json')
print('ok', os.listdir(D))
