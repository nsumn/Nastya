"""Lumean API helper (TTS voices, SFX, music) — docs: https://api.lumean.app/docs/llm.md
The API key is NEVER stored in the repo: export LUMEAN_API_KEY=... (or put it in earthstop/.lumean.key, which is git-ignored).
Usage from Python:  import sys; sys.path.insert(0, 'tools'); from lumean import *
  tid = template('Andrew US', 'gUABw7pXQjhjt0kNFBTF', owner=None, speed=1.06)['data']['id']   # voice C she picked (ElevenLabs "Andrew", American)
  o = order(tid, 'Why does carrying in the groceries always take five trips?')['data']; d = wait(o['id']); fetch(d['result']['files'][0], 'out/voice.mp3')
  music: call('POST', '/orders', {'task_type': 'music', 'task_data': {'prompt': '...', 'n_variants': 4, 'force_instrumental': True, 'music_length_ms': 30000}})
  sfx:   call('POST', '/orders', {'task_type': 'sfx', 'task_data': {'text': 'cartoon poof', 'duration_seconds': 1.0}})
Word timestamps of a TTS order: result.service_files -> result.json (words[]); tools/groc_timing.py turns them into a timeline + captions."""
import json, os, sys, time, urllib.request
_kf = os.path.join(os.path.dirname(__file__), '..', '.lumean.key')
K = os.environ.get('LUMEAN_API_KEY') or (open(_kf).read().strip() if os.path.exists(_kf) else None)
if not K: sys.exit('Set LUMEAN_API_KEY (Lumean public API key) first.')
B = 'https://api.lumean.app/api/public'
def call(method, path, body=None):
    req = urllib.request.Request(B + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={'X-API-KEY': K, 'Content-Type': 'application/json', 'Accept': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=60) as r: return json.load(r)
    except urllib.error.HTTPError as e: return {'http': e.code, **json.loads(e.read() or b'{}')}
def template(name, voice_id, owner, model='eleven_multilingual_v2', stab=0.5, sim=0.75, style=0.0, speed=1.0):
    cfg = {'tts_settings': {'mode': 'mode_v1', 'model_id': model, 'voice_id': voice_id, 'language_code': 'en', 'advanced_voice_settings': True,
           'voice_settings': {'stability': stab, 'similarity_boost': sim, 'style': style, 'use_speaker_boost': True, 'speed': speed}}}
    if owner: cfg['tts_settings']['public_owner_id'] = owner
    return call('POST', '/templates', {'service_key': 'elevenlabs', 'name': name, 'config': cfg})
def order(tid, text, override=None):
    b = {'template_id': tid, 'input_text': text}
    if override: b['config_override'] = override
    return call('POST', '/orders', b)
def wait(oid, every=4, maxs=600):
    t0 = time.time()
    while time.time() - t0 < maxs:
        d = call('GET', '/orders/' + oid)['data']
        if d['status'] in ('completed', 'partially_completed', 'failed', 'compensated', 'cancelled', 'result_delivered'): return d
        time.sleep(every)
    return d
def fetch(path, out):
    u = call('POST', '/storage/url', {'path': path})['data']['url']
    urllib.request.urlretrieve(u, out); return out
