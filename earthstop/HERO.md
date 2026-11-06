# HERO.md — the hero and the "same quality" recipe

For anyone (or any Claude session) making a video in the same look as Anastasia's latest ones
("What if you could hear everyone's thoughts", the rain video, "everyone disappeared").
Read this together with `CLAUDE.md` and `HANDOFF.md`.

## 1. The hero — one line, don't redesign him

```js
const hero = makeBlock({ head: 'human', body: 'human', skin: '#e9b98f', hair: '#4a3020',
  top: '#4b4f57', jeans: true, bottom: '#3d5f8f', shoe: '#f4f4f4', hairStyle: 'short', headS: 0.88 });
```

- `makeBlock` lives in `parts_dad/d_block.js`. Always `cat` that file into the scene, before the sets.
- The mesh is a real low-poly human from `tools/human_mesh.py` → `data/human_mesh.json` (SDF → marching cubes → decimation).
  - Faceted head: jaw, cheekbones, nose, ears; chin in line with the lips.
  - Hair hugs the skull.
  - ONE skinned body: the shoulders flow into the arms.
  - Slim build, oversized charcoal tee, jeans, white sneakers, fists for hands.
- She approved this hero after many rounds. Do NOT change his proportions, head, hair or outfit colours without asking her.
- Ready-made copies of this line:
  - `parts_groc/g_world.js:152`, which the thoughts and gone videos use;
  - `parts_energy/e_world.js:2`.

### Faces (emotions)
- `hero.face(expr, t)` swaps a canvas-drawn face decal. It blinks automatically.
- Expressions: neutral, happy, laugh, proud, love, surprised, worried, sad, crying, angry, squint, reading, sleepy, sleep, smirk.
- She wants emotions clearly visible. Change the face on every beat of the story.
- Pre-upload the face textures so the first frame doesn't hitch:
  ```js
  for (const n of Object.keys(FACE)) for (const b of [false, true]) renderer.initTexture(faceTex(hero.o, n, b));
  ```

### Other characters with the same quality
- Use the same `makeBlock({head:'human', body:'human', ...})` with different colours and options: `hairStyle` ('short', 'bangs', 'long', 'curly', 'mop', 'bald'), `h` for height, `glasses`, `mustache`, `lip`, `freckles`, `blush`.
- The friend from "everyone disappeared" is `fat: true, chubbyHead: true, hairStyle: 'mop', freckles: true, eyeS: 0.8, browW: 1.5, blush: 0.6, h: 0.86`, in a red tee. Look test: `parts_gone/x_preview.js`.
- Crowds in the background can be the cheaper `people.js` persons. Those have no `.head`; use `p.root.localToWorld(V3(0, 1.63, 0))` instead.

### Posing rules (otherwise the mesh tears)
- Never rotate `torso`: its pivot is at the feet. To lean, rotate `hero.outer.rotation.x` (rotation order YXZ).
- Keep arms within about −0.65…+0.5 rad, or the tee sleeves tear. Bend the elbows (`hero.elbows`) instead.
- Sitting:
  ```js
  seatY = (P, y) => y + 0.95 - 0.9 * P.o.h;
  place(P, x, z, ry, seatY(P, seatHeight) - 0.95);
  poseSit(P);
  ```
- Check new poses from the front and the side in a lab (`index_krpose.html`, `index_dadlab.html`) before using them in a video.
- Shirt print ("I ♥ MY MOM"): a curved open cylinder on `hero.torso`. See `SHIRT` at the top of `parts_mind/m_main.js`:
  - `CylinderGeometry(0.36, 0.36, 0.17, 24, 1, true, -0.24, 0.48)` at `(0, 1.22, 0.152 - 0.36)`.
  - A flatter radius makes the text sink into the body.

## 2. The quality pipeline (what makes it look "expensive")

Start from the newest working video, **`parts_mind/`** (the thoughts video). Copy `m_head.js` and change only the timeline constants. Everything below is already built in:

| What | Where | Note |
|---|---|---|
| Renderer setup | `m_head.js` | 1080×1920, pixel ratio 1, PCF soft shadows, ACES filmic tone mapping, sRGB output, HalfFloat render targets with MSAA 4 |
| Ambient occlusion | `aoFor(k)` in `m_main.js` | `GTAOPass` per set: soft contact shadows under people and objects |
| Depth of field | `dofMat` in `m_main.js` | Focus on the hero's head in every shot: `{ dof: () => H_(hero) }` |
| Motion blur | `MB_K = 4` sub-frames, `autoClear = false` | Only on fast shots (`{ mb: true }`) |
| Whip-pan cuts | `uWhip` in the compositor | Always pair with a whoosh sound |
| Grade | compositor (`uSepia`, `uRed`, exposure) | Warm and cold practical lights, a rim light behind the hero |
| Cameras | `orbit`, `LOOK`, `esin`, `span` | Every shot MOVES: slow orbit or push-in plus a little handheld drift. Never a static camera. 35–44° FOV, hero big in frame |

Her rule: "Кинематографично делать нужно". A flat first render was rejected, so never ship a flat pass. See `CLAUDE.md` §7.

### Sets you can reuse (all `mkSet()` scenes; the hero is re-parented into whichever set is shot)
| File | Sets |
|---|---|
| `parts_mind/m_sets.js` | bedroom morning and night, subway car, office, MRI lab, night city |
| `parts_gone/x_nyc.js` | Manhattan avenue, Times Square, crowds |
| `parts_gone/x_diner.js` | burger place / cafe |
| `parts_gone/x_sets.js` | supermarket, penthouse, parking lot, subway entrance |

Build order, as in the thoughts video:
```
cat parts_mind/m_head.js parts_dad/d_block.js parts_groc/g_world.js parts_gone/x_street.js \
    parts_gone/x_sets.js parts_gone/x_nyc.js parts_gone/x_diner.js parts_mind/m_sets.js parts_mind/m_main.js > scene_mind.js
```

## 3. Render and encode
```
bash setup.sh                                    # once per session
PAGE=index_mind.html node render.mjs out/mind 0 64 30 "2,12,30"   # first: test frames only, look at them!
PAGE=index_mind.html node render.mjs out/mind 0 64 30            # full render (llvmpipe, takes a while)
```
- Check every test frame by eye. Look for:
  - the camera behind someone's head;
  - text cut at the screen edge;
  - z-fighting (flickering surfaces);
  - people walking through the hero.
- Encode: two-pass H.264 at 3300k, then mux the audio. Also export a no-music version so she can add a TikTok sound.

## 4. Her standing rules (don't break them)
- On-screen text in English with US units. Never write "MODEL" on screen.
- Facts must be researched. Keep the calculation in `tools/<name>_math.py`.
- Never commit mp4, wav, frames, someone else's music, or API keys. The Lumean key lives only in `.lumean.key`, which is gitignored.
- Topics that work: "what happens to your body if you quit or change a habit". Hero in a room on the first frame, 60–65 s.
