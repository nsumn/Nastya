"""Voice-over for the US news-map videos (Lumean TTS, ElevenLabs "Andrew", American). Run from earthstop/: [SPEED=1.15] [VOICE=brad] python3 tools/news_voice.py <name> <text file>
Writes out/<name>/voice.mp3 + out/<name>/result.json (word timestamps). Key: earthstop/.lumean.key (git-ignored)."""
import sys, os, json
sys.path.insert(0, os.path.dirname(__file__)); from lumean import template, order, wait, fetch, call
name, txtf = sys.argv[1], sys.argv[2]; D = f'out/{name}'; os.makedirs(D, exist_ok=True); text = open(txtf).read().strip()
SPEED = float(os.environ.get('SPEED', '1.04'))
# VOICE=brad → "Hey Its Brad - Clear Narrator for Documentary" (ElevenLabs library, her pick Nov 8 2026: expressive); default = Andrew
VOICES = {'andrew': ('Andrew', 'gUABw7pXQjhjt0kNFBTF', None, 0.45, 0.15), 'drew': ('Drew', 'q0IMILNRPxOgtBTS4taI', '675db5c1a341e2f820aefb00825680aa042d958a4a3aef3200735c799210dcb4', 0.35, 0.4), 'brad': ('Brad', 'Dslrhjl3ZpzrctukrQSN', '675db5c1a341e2f820aefb00825680aa042d958a4a3aef3200735c799210dcb4', 0.3, 0.45)}
VK = os.environ.get('VOICE', 'andrew'); vn, vid, vo, stab, sty = VOICES[VK]
tj = 'out/news_template.json' if (SPEED == 1.04 and VK == 'andrew') else f'out/news_template_{VK}_{SPEED}.json'
tid = json.load(open(tj))['id'] if os.path.exists(tj) else None
if not tid: r = template(f'{vn} US news {SPEED}', vid, owner=vo, speed=SPEED, stab=stab, style=sty); print(r); tid = r['data']['id']; json.dump({'id': tid}, open(tj, 'w'))
o = order(tid, text); print(o); d = wait(o['data']['id'], maxs=900); res = d.get('result') or {}; print(json.dumps(res)[:800])
fetch(res['files'][0], f'{D}/voice.mp3')
for f in res.get('service_files') or []:
    p = f if isinstance(f, str) else f.get('path', '')
    if p.endswith('.json'): fetch(p, f'{D}/result.json')
print('ok', os.listdir(D))
