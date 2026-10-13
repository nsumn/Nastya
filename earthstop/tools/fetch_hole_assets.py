"""Download the CC0 / CC-BY assets for the 'hole through the Earth' video into assets/hole/.
Poly Haven (CC0): HDRI, PBR textures, glTF models. Solar System Scope (CC BY 4.0): Earth maps. three.js examples: water normals."""
import json, os, sys, urllib.request
op = urllib.request.build_opener(); op.addheaders = [("User-Agent", "Mozilla/5.0 earthstop-asset-fetch")]; urllib.request.install_opener(op)
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'hole'); os.makedirs(OUT, exist_ok=True)
def get(url, path):
    p = os.path.join(OUT, path); os.makedirs(os.path.dirname(p), exist_ok=True)
    if os.path.exists(p) and os.path.getsize(p) > 0: return
    print('get', path); urllib.request.urlretrieve(url, p)
def api(id): return json.load(urllib.request.urlopen(f'https://api.polyhaven.com/files/{id}'))
# HDRI (sunset over a flat green field)
for hid in ['grasslands_sunset', 'kloppenheim_06_puresky']:
    for res in ['2k', '4k']: get(api(hid)['hdri'][res]['hdr']['url'], f'hdri/{hid}_{res}.hdr')
# PBR textures (2k): diffuse, normal (GL), roughness / arm
for tid in ['excavated_soil_wall', 'brown_mud_02', 'rock_face', 'dark_rock', 'leafy_grass', 'aerial_grass_rock', 'rocky_terrain_02', 'forest_ground_04']:
    try: d = api(tid)
    except Exception as e: print('skip', tid, e); continue
    for key, nm in [('Diffuse', 'diff'), ('nor_gl', 'nor'), ('Rough', 'rough'), ('arm', 'arm'), ('Displacement', 'disp')]:
        if key in d and '2k' in d[key]: get(d[key]['2k']['jpg']['url'] if 'jpg' in d[key]['2k'] else d[key]['2k']['png']['url'], f'tex/{tid}_{nm}.jpg')
# glTF models (1k textures)
for mid in ['rusted_spade_01', 'grass_medium_01', 'grass_medium_02', 'tree_small_02', 'garden_gnome', 'rock_moss_set_01']:
    try: g = api(mid)['gltf']['1k']['gltf']
    except Exception as e: print('skip', mid, e); continue
    get(g['url'], f'models/{mid}/{mid}.gltf')
    for rel, inc in g['include'].items(): get(inc['url'], f'models/{mid}/{rel}')
# Earth maps
for nm in ['8k_earth_daymap.jpg', '8k_earth_nightmap.jpg', '8k_earth_clouds.jpg']: get('https://www.solarsystemscope.com/textures/download/' + nm, 'earth/' + nm)
for nm in ['earth_normal_2048.jpg', 'earth_specular_2048.jpg', 'waternormals.jpg']:
    get(f'https://raw.githubusercontent.com/mrdoob/three.js/r169/examples/textures/{"planets/" if nm.startswith("earth") else ""}{nm}', 'earth/' + nm if nm.startswith('earth') else 'water/' + nm)
print('ok')
