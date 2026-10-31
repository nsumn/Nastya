"""Generate Korean-looking people with MakeHuman/MPFB2 inside Blender (bpy) and export them as GLB for the three.js scene.
Run:  <bpy python> tools/mh_people.py <out_dir> [name ...]
Needs: bpy (pip, Python 3.11), the MPFB extension installed in that Blender, and the MakeHuman system assets (CC0)
unpacked into MPFB's user data dir (…/extensions/.user/user_default/mpfb/data). Everything generated is CC0 (MakeHuman assets).
Each character: phenotype (Asian), skin, eyes, eyebrows, eyelashes, hair, clothes, 'game_engine' rig (fingers), exported with skinning."""
import bpy, os, sys, json, addon_utils
addon_utils.enable('bl_ext.user_default.mpfb', default_set=True)
from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.faceservice import FaceService, ARKIT_FACEUNITS
import bmesh, numpy as np
ARKIT = set(ARKIT_FACEUNITS)

OUT = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else sys.argv[1]
WANT = sys.argv[sys.argv.index('--') + 2:] if '--' in sys.argv else sys.argv[2:]

# phenotype: gender 1 = male; age 0.5 = 25 y (0.1875 = 11 y, 1 = 90 y); race weights sum to 1
PEOPLE = {
    # the hero: Korean man in his 20s, slim, a bit taller than average (176 cm), black short hair, mustard tee + jeans + sneakers
    'hero':   dict(gender=1.0, age=0.47, muscle=0.5, weight=0.42, height=0.62, proportions=0.6, race=dict(asian=0.95, caucasian=0.05, african=0.0),
                   skin='young_asian_male', hair='short02', brows='eyebrow001', clothes=['male_casualsuit06', 'shoes06']),
    'girl':   dict(gender=0.0, age=0.45, muscle=0.45, weight=0.42, height=0.45, proportions=0.6, race=dict(asian=0.95, caucasian=0.05, african=0.0),
                   skin='young_asian_female', hair='bob01', brows='eyebrow010', clothes=['female_casualsuit01', 'shoes02']),
    'man2':   dict(gender=1.0, age=0.6, muscle=0.5, weight=0.55, height=0.5, proportions=0.5, race=dict(asian=1.0, caucasian=0.0, african=0.0),
                   skin='middleage_asian_male', hair='short04', brows='eyebrow001', clothes=['male_casualsuit05', 'shoes01']),
    'woman2': dict(gender=0.0, age=0.5, muscle=0.4, weight=0.5, height=0.42, proportions=0.55, race=dict(asian=1.0, caucasian=0.0, african=0.0),
                   skin='young_asian_female', hair='long01', brows='eyebrow010', clothes=['female_elegantsuit01', 'shoes03']),
}

def _unused_mhm(p):
    L = ['version v1.2.0', 'name ' + p['name']]
    L += [f"modifier macrodetails/Gender {p['gender']:.6f}", f"modifier macrodetails/Age {p['age']:.6f}",
          f"modifier macrodetails-universal/Muscle {p['muscle']:.6f}", f"modifier macrodetails-universal/Weight {p['weight']:.6f}",
          f"modifier macrodetails-height/Height {p['height']:.6f}", f"modifier macrodetails-proportions/BodyProportions {p['proportions']:.6f}",
          f"modifier macrodetails/Asian {p['race']['asian']:.6f}", f"modifier macrodetails/Caucasian {p['race']['caucasian']:.6f}",
          f"modifier macrodetails/African {p['race']['african']:.6f}"]
    L += ['eyes high-poly', 'eyebrows ' + p['brows'], 'eyelashes eyelashes01', 'hair ' + p['hair'], 'teeth teeth_base']
    L += ['clothes ' + c for c in p['clothes']]
    L += [f"skinMaterial skins/{p['skin']}/{p['skin']}.mhmat", 'skeleton game_engine.mhskel', 'subdivide False']
    return '\n'.join(L) + '\n'

def build(name):
    for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.armatures, bpy.data.materials, bpy.data.images):
        for d in list(coll): coll.remove(d)
    p = dict(PEOPLE[name], name=name)
    info = HumanService._create_default_human_info_dict()
    info['phenotype'] = dict(gender=p['gender'], age=p['age'], muscle=p['muscle'], weight=p['weight'], height=p['height'], proportions=p['proportions'],
                             cupsize=0.5, firmness=0.5, race=p['race'])
    mc = lambda d, n: f'{n}/{n}.mhclo'
    info.update(name=name, rig='game_engine', eyes='high-poly/high-poly.mhclo', eyebrows=mc('eyebrows', p['brows']), eyelashes='eyelashes01/eyelashes01.mhclo',
                teeth='teeth_base/teeth_base.mhclo', hair=mc('hair', p['hair']), clothes=[mc('clothes', c) for c in p['clothes']],
                skin_mhmat=f"{p['skin']}/{p['skin']}.mhmat", skin_material_type='GAMEENGINE')
    open(os.path.join(OUT, name + '.json'), 'w').write(json.dumps(info, indent=1))
    st = HumanService.get_default_deserialization_settings()
    st.update(subdiv_levels=0, override_skin_model='PRESET', mask_helpers=True)
    base = HumanService.deserialize_from_dict(info, st)
    # facial expressions: the 52 ARKit face units (faceunits01 pack, CC0) as shape keys → glTF morph targets (driven per frame in three.js)
    FaceService.load_targets(base, load_microsoft_visemes=False, load_arkit_faceunits=True)
    FaceService.interpolate_targets(base)
    for o in list(bpy.data.objects):
        if o.type != 'MESH': continue
        bpy.context.view_layer.objects.active = o
        keys = o.data.shape_keys
        if keys:   # bake every modelling key (phenotype etc.) into the basis AND into the kept expression keys; keep only ARKit units
            kb = keys.key_blocks; basis = kb[0]; n = len(o.data.vertices)
            co = lambda k: np.array([v.co[:] for v in k.data])
            B = co(basis); delta = np.zeros_like(B); keep = []
            for k in kb[1:]:
                bare = k.name.split('-')[-1] if '-' in k.name else k.name
                if bare in ARKIT: keep.append((k, bare))
                else: delta += k.value * (co(k) - B)
            for k, bare in keep:
                C = co(k) + delta
                for i, v in enumerate(k.data): v.co = C[i]
                k.name = bare; k.value = 0.0
            for i, v in enumerate(basis.data): v.co = B[i] + delta[i]
            for i, v in enumerate(o.data.vertices): v.co = B[i] + delta[i]
            for k in list(kb[1:]):
                if k.name not in ARKIT: o.shape_key_remove(k)
        # remove helper / hidden geometry the MASK modifiers only hide (works with shape keys, unlike applying the modifier)
        for m in list(o.modifiers):
            if m.type == 'MASK' and m.vertex_group in o.vertex_groups:
                gi = o.vertex_groups[m.vertex_group].index
                inside = [any(g.group == gi and g.weight > 0.5 for g in v.groups) for v in o.data.vertices]
                drop = [i for i, f in enumerate(inside) if (f if m.invert_vertex_group else not f)]
                bm = bmesh.new(); bm.from_mesh(o.data); bm.verts.ensure_lookup_table()
                bmesh.ops.delete(bm, geom=[bm.verts[i] for i in drop], context='VERTS'); bm.to_mesh(o.data); bm.free(); o.data.update()
                o.modifiers.remove(m)
            elif m.type == 'SUBSURF':
                o.modifiers.remove(m)
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, name + '.glb'), export_format='GLB', export_skins=True, export_animations=False,
                              export_apply=False, export_morph=True, export_morph_normal=False, export_yup=True, export_image_format='JPEG', export_jpeg_quality=88)
    print('exported', name, [o.name for o in bpy.data.objects])

os.makedirs(OUT, exist_ok=True)
for n in (WANT or PEOPLE.keys()):
    build(n)
