# Downloaded models (CC0, Poly Haven)

Not in git: they are large and re-downloadable. Fetch with the Poly Haven API, glTF 2k:

| folder | what |
|---|---|
| `large_castle_door/` | the door used by `look_test.py` |

```python
import json, urllib.request, os
f = json.load(urllib.request.urlopen('https://api.polyhaven.com/files/large_castle_door'))
g = f['gltf']['2k']['gltf']
# g['url'] is the .gltf; g['include'] maps relative paths to texture urls
```
Poly Haven is CC0: no attribution required, commercial use allowed.
