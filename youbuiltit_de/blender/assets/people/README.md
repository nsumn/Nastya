# Rigged people for the Blender scenes

Drop character files here and the scenes pick them up; without them `scene_lib.character()`
falls back to the primitive stand-in, so the scene still renders, just worse.

Expected by `tuer_scene.py`:

| file | who | animation that suits it |
|---|---|---|
| `you.fbx` | the person building the door, plain clothes | idle / standing, slow |
| `nachbar.fbx` | the neighbour who walks straight in | walking |
| `crowd.fbx` | the people pressing against the door | pushing / walking |

Formats: `.fbx` (Mixamo), `.gltf` / `.glb` (Quaternius), `.obj`. Mixamo exports need
"With Skin" and an FBX binary; the importer handles their scale.

These files are NOT in git (see .gitignore): they are large and we only need them locally.
