"""Generic Poly Haven (CC0) fetcher: python3 tools/fetch_ph.py <out_subdir> hdri:<id>[@res] tex:<id> model:<id> ...
Files land in assets/<out_subdir>/{hdri,tex,models}/ (git-ignored)."""
import json, os, sys, urllib.request
op = urllib.request.build_opener(); op.addheaders = [("User-Agent", "Mozilla/5.0 earthstop-asset-fetch")]; urllib.request.install_opener(op)
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', sys.argv[1])
def get(url, path):
    p = os.path.join(OUT, path); os.makedirs(os.path.dirname(p), exist_ok=True)
    if os.path.exists(p) and os.path.getsize(p) > 0: return
    print('get', path); urllib.request.urlretrieve(url, p)
def api(i): return json.load(urllib.request.urlopen(f'https://api.polyhaven.com/files/{i}'))
for spec in sys.argv[2:]:
    kind, name = spec.split(':'); res = '2k'
    if '@' in name: name, res = name.split('@')
    d = api(name)
    if kind == 'hdri': get(d['hdri'][res]['hdr']['url'], f'hdri/{name}_{res}.hdr')
    elif kind == 'tex':
        if 'Diffuse' not in d: d['Diffuse'] = d.get('col_01') or d.get('col_1')
        for key, nm in [('Diffuse', 'diff'), ('nor_gl', 'nor'), ('arm', 'arm')]:
            if key in d and res in d[key]: get(d[key][res]['jpg']['url'], f'tex/{name}_{nm}.jpg')
    elif kind == 'model':
        g = d['gltf'][res if res in d['gltf'] else '1k']['gltf']; get(g['url'], f'models/{name}/{name}.gltf')
        for rel, inc in g['include'].items(): get(inc['url'], f'models/{name}/{rel}')
print('ok')
