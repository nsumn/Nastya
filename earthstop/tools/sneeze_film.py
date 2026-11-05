"""'What happens if you hold in a sneeze?' — the whole short, rendered frame by frame in Blender 4.2 Cycles (CPU) as a pure function of time.
Run:  blender -b -P tools/sneeze_film.py -- <out_dir> <t0> <t1> [fps=24] [res=0.5] [list of test times]
Timeline = the Lumean voice (out/sneeze/timing.json from tools/sneeze_timing.py). The man = MPFB2/MakeHuman (CC0), see tools/sneeze_blend.py for setup.
Shots: face (pinching the nose) → X-ray lungs fire the air up → blocked at mouth + nose → pressure ×20 → night car → X-ray windpipe tear →
X-ray throat rupture, air into neck + chest → hospital bed with a feeding tube → X-ray eardrum bursts → he sneezes into his elbow (slow-motion cloud)."""
import bpy, os, sys, math, json, addon_utils
from mathutils import Vector, Euler
addon_utils.enable('bl_ext.user_default.mpfb', default_set=True)
from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.faceservice import FaceService, ARKIT_FACEUNITS

A = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = A[0]; T0, T1 = float(A[1]), float(A[2]); FPS = int(A[3]) if len(A) > 3 else 24; RES = float(A[4]) if len(A) > 4 else 0.5
TEST = [float(x) for x in A[5].split(',')] if len(A) > 5 else None
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TM = json.load(open(os.path.join(HERE, 'out/sneeze/timing.json')))
S = TM['shots']; T_END = TM['t_end']
os.makedirs(OUT, exist_ok=True)
clamp = lambda x, a=0.0, b=1.0: max(a, min(b, x))
lerp = lambda a, b, k: a + (b - a) * k
ease = lambda x: (lambda u: u * u * (3 - 2 * u))(clamp(x))
span = lambda t, a, b: clamp((t - a) / max(b - a, 1e-6))

# ================= the man =================
for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
info = HumanService._create_default_human_info_dict()
info['phenotype'] = dict(gender=1.0, age=0.47, muscle=0.5, weight=0.5, height=0.55, proportions=0.6, cupsize=0.5, firmness=0.5, race=dict(asian=0.0, caucasian=1.0, african=0.0))
mc = lambda n: f'{n}/{n}.mhclo'
info.update(name='guy', rig='game_engine', eyes='high-poly/high-poly.mhclo', eyebrows=mc('eyebrow004'), eyelashes='eyelashes01/eyelashes01.mhclo', teeth='teeth_base/teeth_base.mhclo',
            hair=mc('short02'), clothes=[mc('male_casualsuit06'), mc('shoes06')], skin_mhmat='young_caucasian_male/young_caucasian_male.mhmat', skin_material_type='ENHANCED_SSS')
stt = HumanService.get_default_deserialization_settings(); stt.update(subdiv_levels=1, override_skin_model='PRESET', mask_helpers=True)
body = HumanService.deserialize_from_dict(info, stt)
FaceService.load_targets(body, load_microsoft_visemes=False, load_arkit_faceunits=True); FaceService.interpolate_targets(body)
rig = next(o for o in bpy.data.objects if o.type == 'ARMATURE'); PB = rig.pose.bones
MESHES = [o for o in bpy.data.objects if o.type == 'MESH']
EXTRAS = [o for o in MESHES if o is not body]
for o in MESHES:
    if 'short02' in o.name:
        for m in o.data.materials:
            mx = m.node_tree.nodes.get('diffuseIntensity') if m and m.use_nodes else None
            if mx: mx.blend_type = 'MULTIPLY'; mx.inputs['Fac'].default_value = 1.0; mx.inputs['Color2'].default_value = (0.16, 0.085, 0.04, 1)
for o in MESHES:   # the tee: plain heather grey cotton instead of the MakeHuman logo texture
    if 'casualsuit' in o.name:
        for i, m in enumerate(o.data.materials):
            t = bpy.data.materials.new('tee'); t.use_nodes = True; p = t.node_tree.nodes['Principled BSDF']; p.inputs['Base Color'].default_value = (0.32, 0.34, 0.37, 1); p.inputs['Roughness'].default_value = 0.85
            p.inputs['Sheen Weight'].default_value = 0.4; o.data.materials[i] = t
KEYS = {}
for o in MESHES:
    if o.data.shape_keys:
        for k in o.data.shape_keys.key_blocks[1:]:
            if k.name.split('-')[-1] in ARKIT_FACEUNITS: KEYS.setdefault(k.name.split('-')[-1], []).append(k)   # ONLY the face units (the phenotype keys must stay as built)
def face(**kv):
    for name, ks in KEYS.items():
        for k in ks: k.value = kv.get(name, 0.0)
HOLD = dict(eyeSquintLeft=0.85, eyeSquintRight=0.85, eyeBlinkLeft=0.55, eyeBlinkRight=0.55, noseSneerLeft=1.0, noseSneerRight=1.0, cheekSquintLeft=0.7, cheekSquintRight=0.7,
            browInnerUp=0.55, browDownLeft=0.35, browDownRight=0.35, mouthPressLeft=0.8, mouthPressRight=0.8, mouthRollUpper=0.5, mouthRollLower=0.4)
SNEEZE = dict(eyeBlinkLeft=1, eyeBlinkRight=1, eyeSquintLeft=1, eyeSquintRight=1, noseSneerLeft=1, noseSneerRight=1, jawOpen=0.45, mouthFunnel=0.3, browDownLeft=0.6, browDownRight=0.6, cheekSquintLeft=0.8, cheekSquintRight=0.8)
PAIN = dict(browInnerUp=0.9, eyeSquintLeft=0.5, eyeSquintRight=0.5, mouthStretchLeft=0.5, mouthStretchRight=0.5, jawOpen=0.15, mouthFrownLeft=0.6, mouthFrownRight=0.6)
TIRED = dict(eyeBlinkLeft=0.45, eyeBlinkRight=0.45, browInnerUp=0.4, mouthFrownLeft=0.3, mouthFrownRight=0.3)
mix = lambda a, b, k: {n: lerp(a.get(n, 0), b.get(n, 0), k) for n in set(a) | set(b)}

# IK for the right arm (pinch the nose / sneeze into the elbow); a target + a pole empty
def empty(name):
    e = bpy.data.objects.new(name, None); bpy.context.scene.collection.objects.link(e); return e
IKT, IKP, IKT2, IKP2 = empty('ik_target'), empty('ik_pole'), empty('ik_target_l'), empty('ik_pole_l')
ik = PB['lowerarm_r'].constraints.new('IK'); ik.target = IKT; ik.pole_target = IKP; ik.chain_count = 2; ik.pole_angle = math.radians(-90); ik.influence = 0
ikl = PB['lowerarm_l'].constraints.new('IK'); ikl.target = IKT2; ikl.pole_target = IKP2; ikl.chain_count = 2; ikl.pole_angle = math.radians(-90); ikl.influence = 0
def rot(b, x=0, y=0, z=0): PB[b].rotation_mode = 'XYZ'; PB[b].rotation_euler = (math.radians(x), math.radians(y), math.radians(z))
def rest_pose():
    for b in PB: b.rotation_mode = 'XYZ'; b.rotation_euler = (0, 0, 0); b.location = (0, 0, 0)
    rig.location = (0, 0, 0); rig.rotation_euler = (0, 0, 0); arms_down()
REST_HANDS = [(Vector((-0.24, -0.04, 0.87)), Vector((-0.32, 0.45, 1.2))), (Vector((0.24, -0.04, 0.87)), Vector((0.32, 0.45, 1.2)))]
def arms_down(M=None):   # the rig rests in a T-pose; both arms hang via IK (targets at the hips, elbows pointing back)
    for (tg, pl), (T, P) in zip(REST_HANDS, ((IKT, IKP), (IKT2, IKP2))): T.location = (M @ tg) if M else tg; P.location = (M @ pl) if M else pl
    ik.influence = ikl.influence = 1.0
def fingers_pinch(k):
    for f in ('index', 'middle', 'ring', 'pinky'):
        for j, a in ((1, 55), (2, 70), (3, 40)): rot(f'{f}_0{j}_r', 0, 0, -a * k if f != 'index' else -a * k * 0.6)
    rot('thumb_01_r', 0, 0, 20 * k); rot('thumb_02_r', 0, 0, 25 * k)
bpy.context.view_layer.update()

# reference points on the head (rest pose)
dg = bpy.context.evaluated_depsgraph_get(); ev = body.evaluated_get(dg); me = ev.to_mesh(); MW = body.matrix_world
HZ = (rig.matrix_world @ PB['head'].head).z
vs = [MW @ v.co for v in me.vertices if (MW @ v.co).z > HZ - 0.05]
NOSE = min(vs, key=lambda p: p.y).copy(); EAR = max((p for p in vs if abs(p.z - (NOSE.z + 0.02)) < 0.03), key=lambda p: p.x).copy(); ev.to_mesh_clear()
EYES = NOSE + Vector((0, 0.035, 0.045)); MOUTH = NOSE + Vector((0, 0.01, -0.045))
print('NOSE', tuple(round(c, 3) for c in NOSE), 'EAR', tuple(round(c, 3) for c in EAR))

# ================= materials =================
ORIG = {o.name: [m for m in o.data.materials] for o in MESHES}
def emis(name, col, strength, alpha=None):
    m = bpy.data.materials.new(name); m.use_nodes = True; n = m.node_tree; n.nodes.clear(); out = n.nodes.new('ShaderNodeOutputMaterial'); e = n.nodes.new('ShaderNodeEmission')
    e.inputs['Color'].default_value = (*col, 1); e.inputs['Strength'].default_value = strength
    if alpha is None: n.links.new(e.outputs[0], out.inputs[0])
    else: tr = n.nodes.new('ShaderNodeBsdfTransparent'); mx = n.nodes.new('ShaderNodeMixShader'); mx.inputs['Fac'].default_value = alpha; n.links.new(tr.outputs[0], mx.inputs[1]); n.links.new(e.outputs[0], mx.inputs[2]); n.links.new(mx.outputs[0], out.inputs[0])
    m.blend_method = 'BLEND'; return m
XRAY = bpy.data.materials.new('xray'); XRAY.use_nodes = True
n = XRAY.node_tree; n.nodes.clear(); out = n.nodes.new('ShaderNodeOutputMaterial'); lw = n.nodes.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.18
em = n.nodes.new('ShaderNodeEmission'); em.inputs['Color'].default_value = (0.12, 0.45, 0.9, 1); em.inputs['Strength'].default_value = 0.9
tr = n.nodes.new('ShaderNodeBsdfTransparent'); mx = n.nodes.new('ShaderNodeMixShader')
n.links.new(lw.outputs['Facing'], mx.inputs['Fac']); n.links.new(tr.outputs[0], mx.inputs[1]); n.links.new(em.outputs[0], mx.inputs[2]); n.links.new(mx.outputs[0], out.inputs[0])
AIRM = emis('air', (1.0, 0.35, 0.15), 2.2); AIRE = AIRM.node_tree.nodes['Emission']
def xray(on):
    for o in MESHES:
        if o is body: o.data.materials.clear(); [o.data.materials.append(XRAY if on else m) for m in (ORIG[o.name] if not on else [None])]
        else: o.hide_render = on
    if on: body.data.materials[0] = XRAY

# ================= X-ray props: airway, bronchi, lungs, air particles, leak bubbles, ear canal + eardrum =================
sc = bpy.context.scene; COL = sc.collection
def curve(name, pts, r, mat):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = r; cu.bevel_resolution = 4; sp = cu.splines.new('BEZIER'); sp.bezier_points.add(len(pts) - 1)
    for b, p in zip(sp.bezier_points, pts): b.co = p; b.handle_left_type = b.handle_right_type = 'AUTO'
    cu.materials.append(mat); ob = bpy.data.objects.new(name, cu); COL.objects.link(ob); return ob
AW = [NOSE + Vector(d) for d in ((0, 0.012, -0.012), (0, 0.045, -0.006), (0, 0.085, -0.004), (0, 0.098, -0.03), (0, 0.094, -0.075), (0, 0.082, -0.12), (0, 0.07, -0.17), (0, 0.065, -0.25), (0, 0.068, -0.31))]
MOUTH_IN = NOSE + Vector((0, 0.06, -0.055))
CARINA = AW[-1]
airway = curve('airway', AW, 0.0055, AIRM)
mouthway = curve('mouthway', [MOUTH + Vector((0, 0.01, 0)), MOUTH_IN, AW[4]], 0.0045, AIRM)
LUNG_C = [CARINA + Vector((s * 0.075, 0.01, -0.09)) for s in (-1, 1)]
bronchi = [curve(f'bronchus{i}', [CARINA, CARINA + Vector((s * 0.035, 0.0, -0.03)), LUNG_C[i]], 0.0045, AIRM) for i, s in enumerate((-1, 1))]
LUNGM = emis('lung', (1.0, 0.45, 0.5), 0.9, alpha=0.55)
lungs = []
for c in LUNG_C:
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1, location=c, segments=32, ring_count=16); L = bpy.context.object; L.scale = (0.065, 0.055, 0.11); L.data.materials.append(LUNGM)
    bpy.ops.object.shade_smooth(); lungs.append(L)
PARTM = emis('part', (1.0, 0.9, 0.6), 6)
def balls(name, n, r, mat):
    out = []
    for i in range(n):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=r, segments=10, ring_count=6); b = bpy.context.object; b.name = f'{name}{i}'; b.data.materials.append(mat); out.append(b)
    return out
PARTS = balls('p', 22, 0.0045, PARTM)
BUBM = emis('bub', (1.0, 0.85, 0.75), 3.5, alpha=0.35)
BUBS = balls('b', 40, 0.006, BUBM)
MIST = balls('m', 140, 0.0013, emis('mist', (0.85, 0.9, 1.0), 1.2, alpha=0.55))
BLOCK = balls('blk', 3, 0.012, emis('blk', (1.0, 0.08, 0.05), 8))    # red glow at the lips + nostrils
FLASH = balls('fl', 1, 0.02, emis('fl', (1.0, 0.25, 0.1), 15))[0]
CANAL = curve('canal', [EAR + Vector((0.004, 0, 0)), EAR + Vector((-0.012, 0.004, -0.004)), EAR + Vector((-0.026, 0.006, -0.006))], 0.0045, emis('canal', (1.0, 0.75, 0.55), 1.4, alpha=0.4))
DRUM_C = EAR + Vector((-0.028, 0.006, -0.006))
bpy.ops.mesh.primitive_uv_sphere_add(radius=1, location=DRUM_C, segments=24, ring_count=12); DRUM = bpy.context.object; DRUM.scale = (0.0012, 0.0055, 0.0055)
DRUMM = emis('drum', (1.0, 0.7, 0.5), 2.5, alpha=0.2); DRUM.data.materials.append(DRUMM); bpy.ops.object.shade_smooth()
XR = [airway, mouthway, *bronchi, *lungs, *PARTS, *BUBS, *MIST, *BLOCK, FLASH, CANAL, DRUM]
def along(pts, u):   # polyline position at u∈[0,1]
    L = [0]; [L.append(L[-1] + (pts[i + 1] - pts[i]).length) for i in range(len(pts) - 1)]; d = clamp(u) * L[-1]
    for i in range(len(pts) - 1):
        if d <= L[i + 1]: return pts[i].lerp(pts[i + 1], (d - L[i]) / max(L[i + 1] - L[i], 1e-9))
    return pts[-1].copy()
UP = [LUNG_C[0], CARINA] + AW[::-1]   # lungs → trachea → nose
UPM = [LUNG_C[1], CARINA] + AW[::-1][:5] + [MOUTH_IN, MOUTH]

# ================= real sets: room (world HDRI), car, hospital =================
W = bpy.data.worlds.new('w'); sc.world = W; W.use_nodes = True; wn = W.node_tree
ENV = wn.nodes.new('ShaderNodeTexEnvironment'); MAP = wn.nodes.new('ShaderNodeMapping'); TC = wn.nodes.new('ShaderNodeTexCoord')
wn.links.new(TC.outputs['Generated'], MAP.inputs['Vector']); wn.links.new(MAP.outputs['Vector'], ENV.inputs['Vector']); BG = wn.nodes['Background']; wn.links.new(ENV.outputs['Color'], BG.inputs['Color'])
HDR = {k: bpy.data.images.load(os.path.join(HERE, f'assets/sneeze/{k}_2k.hdr')) for k in ('blinds', 'childrens_hospital')}
def world(kind, strength, rotz=200):
    if kind is None: BG.inputs['Strength'].default_value = 0.0; return
    ENV.image = HDR[kind]; BG.inputs['Strength'].default_value = strength; MAP.inputs['Rotation'].default_value = (0, 0, math.radians(rotz))
def area(name, energy, size, color):
    L = bpy.data.lights.new(name, 'AREA'); L.energy = energy; L.size = size; L.color = color; ob = bpy.data.objects.new(name, L); COL.objects.link(ob); return ob
def aim(ob, loc, at): ob.location = loc; ob.rotation_euler = (at - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
KEY, RIM, FILL = area('key', 14, 0.6, (1.0, 0.9, 0.78)), area('rim', 30, 0.35, (0.7, 0.82, 1.0)), area('fill', 2.5, 1.0, (1, 1, 1))
def mat(col, rough=0.5, metal=0.0, emit=None, es=0):
    m = bpy.data.materials.new('m'); m.use_nodes = True; p = m.node_tree.nodes['Principled BSDF']; p.inputs['Base Color'].default_value = (*col, 1); p.inputs['Roughness'].default_value = rough; p.inputs['Metallic'].default_value = metal
    if emit: p.inputs['Emission Color'].default_value = (*emit, 1); p.inputs['Emission Strength'].default_value = es
    return m
def box(name, loc, size, m, bevel=0.01):
    bpy.ops.mesh.primitive_cube_add(location=loc); b = bpy.context.object; b.name = name; b.scale = (size[0] / 2, size[1] / 2, size[2] / 2); b.data.materials.append(m)
    if bevel: md = b.modifiers.new('bv', 'BEVEL'); md.width = bevel; md.segments = 3
    return b
# car (the man sits; the car is built around his seated rest position later)
CAR = []; HOSP = []
dark = mat((0.03, 0.03, 0.035), 0.6); leather = mat((0.05, 0.045, 0.04), 0.45)
CAR += [box('seat', (0, 0.17, 0.82), (0.55, 0.12, 0.75), leather, 0.04), box('head_rest', (0, 0.17, 1.32), (0.28, 0.1, 0.2), leather, 0.04), box('cush', (0, -0.05, 0.42), (0.55, 0.5, 0.12), leather, 0.04), box('dash', (0, -0.76, 0.82), (1.6, 0.4, 0.2), dark, 0.03)]
bpy.ops.mesh.primitive_torus_add(location=(0, -0.42, 0.92), major_radius=0.19, minor_radius=0.018, rotation=(math.radians(62), 0, 0)); wheel = bpy.context.object; wheel.data.materials.append(dark); CAR.append(wheel)
CAR.append(box('column', (0, -0.55, 0.86), (0.06, 0.25, 0.06), dark, 0.01))
CAR.append(box('gauges', (0, -0.6, 0.98), (0.4, 0.02, 0.1), mat((0.02, 0.05, 0.1), 0.3, emit=(0.2, 0.55, 1.0), es=2.5), 0.005))
for x in (-0.62, 0.62): p = box('pillar', (x, -0.75, 1.12), (0.06, 0.06, 0.6), dark, 0.01); p.rotation_euler = (math.radians(-35), 0, 0); CAR.append(p)
CAR.append(box('roof', (0, -0.1, 1.45), (1.4, 1.4, 0.04), mat((0.08, 0.08, 0.09), 0.8), 0.01))
STREET = []
for i in range(14):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.25, segments=12, ring_count=8); s = bpy.context.object; s.data.materials.append(emis('sl', (1.0, 0.65, 0.3), 25)); STREET.append(s)
CAR += STREET
SWEEP = area('sweep', 40, 0.4, (1.0, 0.7, 0.4)); CAR.append(SWEEP)
DASHL = area('dashl', 6, 0.3, (0.3, 0.55, 1.0)); CAR.append(DASHL)
# hospital bed + monitor + feeding tube
sheet = mat((0.9, 0.92, 0.95), 0.8)
HOSP += [box('bed', (0, 0.1, 0.45), (1.0, 2.1, 0.35), mat((0.85, 0.86, 0.88), 0.4), 0.02), box('blanket', (0, 0.45, 0.72), (0.98, 1.3, 0.12), mat((0.55, 0.7, 0.85), 0.9), 0.05),
         box('pillow', (0, -0.72, 0.7), (0.6, 0.38, 0.14), sheet, 0.06), box('monitor', (0.75, -1.0, 1.45), (0.42, 0.06, 0.32), dark, 0.02),
         box('screen', (0.75, -1.03, 1.45), (0.36, 0.01, 0.26), mat((0.0, 0.05, 0.02), 0.3, emit=(0.15, 1.0, 0.45), es=1.4), 0.0)]
TUBE_M = mat((0.95, 0.95, 0.9), 0.2); TUBE = None
ALL_SETS = CAR + HOSP

# ================= render settings + camera =================
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.use_denoising = True; sc.cycles.use_adaptive_sampling = True; sc.cycles.adaptive_threshold = 0.03
sc.cycles.max_bounces = 4; sc.cycles.transparent_max_bounces = 16; sc.cycles.caustics_reflective = sc.cycles.caustics_refractive = False
sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = 1080, 1920, int(RES * 100)
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'; sc.view_settings.exposure = -0.3
sc.render.image_settings.file_format = 'JPEG'; sc.render.image_settings.quality = 92
CAM = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); COL.objects.link(CAM); sc.camera = CAM; CAM.data.sensor_width = 36
def cam(pos, at, lens=50, focus=None, f=2.0):
    CAM.location = pos; CAM.rotation_euler = (at - Vector(pos)).to_track_quat('-Z', 'Y').to_euler(); CAM.data.lens = lens
    CAM.data.dof.use_dof = focus is not None
    if focus is not None: CAM.data.dof.focus_distance = (focus - Vector(pos)).length; CAM.data.dof.aperture_fstop = f
def headpos(): bpy.context.view_layer.update(); return rig.matrix_world @ PB['head'].head

# ================= shots =================
def shot_of(t):
    for i, s in enumerate(S):
        if t < s['t1'] or i == len(S) - 1: return i, s
def show(objs, on):
    for o in objs: o.hide_render = not on
def frame(t):
    i, s = shot_of(t); k = s['name']; u = span(t, s['t0'], s['t1'])
    rest_pose(); face(); show(ALL_SETS + XR, False); xray(False); world(None, 0)
    for L in (KEY, RIM, FILL): L.hide_render = False
    sc.cycles.samples = 28
    if k in ('face', 'elbow'):   # the room: daylight through blinds
        world('blinds', 0.45); aim(KEY, EYES + Vector((-0.55, -0.6, 0.35)), EYES); aim(RIM, EYES + Vector((0.45, 0.55, 0.25)), EYES); aim(FILL, EYES + Vector((0.5, -0.7, -0.1)), EYES)
        if k == 'face':   # the urge builds, the hand comes up and pinches the nose
            face(**mix({}, HOLD, ease(u * 1.6))); rot('head', -6 * ease(u * 2), 0, 3); kk = ease(span(t, s['t0'] + 0.25, s['t0'] + 1.2))
            IKT.location = REST_HANDS[0][0].lerp(MOUTH + Vector((-0.01, -0.085, -0.055)), kk); IKP.location = REST_HANDS[0][1].lerp(Vector((-0.4, -0.3, 0.6)), kk); fingers_pinch(kk)
            cam(EYES + Vector((0.2 - 0.08 * u, -0.95 + 0.2 * u, -0.02)), EYES + Vector((0, 0, -0.06)), 70, EYES)
        else:            # he lets it out into his elbow: slow-motion spray cloud
            hit = s['t0'] + 0.9; k2 = ease(span(t, s['t0'], hit))
            face(**(mix(HOLD, SNEEZE, k2) if t < hit + 0.15 else mix(SNEEZE, dict(eyeBlinkLeft=0.3, eyeBlinkRight=0.3, mouthSmileLeft=0.3, mouthSmileRight=0.3), ease(span(t, hit + 0.6, hit + 1.4)))))
            rot('head', 8 * k2, 0, 0); rot('spine_03', 6 * k2, 0, 0); kk = ease(span(t, s['t0'], s['t0'] + 0.6))
            IKT.location = REST_HANDS[0][0].lerp(EYES + Vector((0.16, 0.02, -0.06)), kk); IKP.location = REST_HANDS[0][1].lerp(Vector((-0.25, -0.9, 1.45)), kk); fingers_pinch(0.5 * kk)
            for j, b in enumerate(MIST):   # the spray, caught by the sleeve, puffs out around it as a fine mist
                d = Vector((math.sin(j * 2.4) * 0.7, -0.5 - 0.5 * ((j * 0.37) % 1), math.cos(j * 1.7) * 0.45)); a = span(t, hit + 0.006 * (j % 9), hit + 1.8)
                b.hide_render = not (0 < a < 1); b.location = MOUTH + Vector((0.03, -0.06, 0)) + d * (0.28 * math.sqrt(a)); b.scale = (1 + 1.5 * a,) * 3
            cam(EYES + Vector((-0.42 + 0.1 * u, -0.6, -0.06)), EYES + Vector((0.05, 0, -0.08)), 55, EYES, 2.4)
    elif k in ('lungs', 'blocked', 'pressure', 'tear', 'rupture', 'ear'):
        xray(True); show([airway, mouthway, *bronchi, *lungs], True); sc.cycles.samples = 14
        for L in (KEY, RIM, FILL): L.hide_render = True
        AIRE.inputs['Color'].default_value = (1.0, 0.35, 0.15, 1); AIRE.inputs['Strength'].default_value = 2.2; airway.data.bevel_depth = 0.0055
        if k == 'lungs':   # lungs swell, then squeeze; a glowing stream races up
            sw = ease(span(t, s['t0'], s['t0'] + 0.9)) - 0.35 * ease(span(t, s['t0'] + 1.0, s['t0'] + 1.3))
            for L in lungs: L.scale = (0.065 * (1 + 0.35 * sw), 0.055 * (1 + 0.35 * sw), 0.11 * (1 + 0.25 * sw))
            for j, p in enumerate(PARTS): a = span(t, s['t0'] + 1.0 + 0.04 * j, s['t0'] + 1.9 + 0.04 * j); p.hide_render = not (0 < a < 1); p.location = along(UP if j % 2 else UPM, a)
            c = CARINA + Vector((0, 0, 0.12)); cam(c + Vector((0.55 - 0.15 * u, -0.55, 0.05)), c + Vector((0, 0.03, -0.02)), 40)
        elif k == 'blocked':   # the stream slams into the closed lips and pinched nose, bounces around
            for j, p in enumerate(PARTS):
                ph = ((t - s['t0']) * 1.6 + j / len(PARTS)) % 1; path = UP if j % 2 else UPM; a = 0.55 + 0.45 * (1 - abs(2 * ph - 1)); p.hide_render = False; p.location = along(path, a)
            for j, b in enumerate(BLOCK): b.hide_render = False; b.location = [NOSE + Vector((0.008, 0.005, -0.012)), NOSE + Vector((-0.008, 0.005, -0.012)), MOUTH][j]; b.scale = (0.8 + 0.4 * abs(math.sin(t * 14 + j)),) * 3
            cam(EYES + Vector((0.4, -0.4, -0.06)), EYES + Vector((0, 0.04, -0.09)), 45)
        elif k == 'pressure':   # the airway balloons and turns red
            pr = ease(u * 1.2); airway.data.bevel_depth = 0.0055 + 0.0055 * pr * (1 + 0.15 * math.sin(t * 22)); AIRE.inputs['Color'].default_value = (1.0, lerp(0.35, 0.05, pr), lerp(0.15, 0.03, pr), 1)
            AIRE.inputs['Strength'].default_value = 2.2 + 3 * pr
            c = AW[4]; cam(c + Vector((0.5 - 0.15 * u, -0.25, 0.02)), c + Vector((0, 0, -0.01)), 45)
        elif k in ('tear', 'rupture'):   # a tear opens; air escapes into the neck (and, the second time, down into the chest)
            at = AW[6] if k == 'tear' else AW[3] + Vector((0, 0.008, -0.01)); hit = s['t0'] + (0.75 if k == 'tear' else 0.5)
            FLASH.hide_render = not (hit <= t < hit + 0.25); FLASH.location = at; FLASH.scale = (1 + 4 * span(t, hit, hit + 0.25),) * 3
            AIRE.inputs['Color'].default_value = (1.0, 0.1, 0.04, 1); AIRE.inputs['Strength'].default_value = 3.5
            for j, b in enumerate(BUBS):
                a = span(t, hit + 0.03 * j, hit + 0.03 * j + (1.4 if k == 'tear' else 2.2)); b.hide_render = not (a > 0)
                dirv = Vector((math.sin(j * 2.1) * 0.5, -0.6 - 0.2 * math.cos(j), (0.3 * math.sin(j * 1.3) if k == 'tear' else -1.2 - 0.6 * ((j * 0.31) % 1))))
                b.location = at + dirv * (0.05 if k == 'tear' else 0.11) * math.sqrt(a); b.scale = (0.35 + 0.45 * a,) * 3
            cam(at + Vector((0.32 - 0.08 * u, -0.28, 0.0 if k == 'tear' else -0.06)), at + Vector((0, 0, -0.02 if k == 'tear' else -0.07)), 45 if k == 'tear' else 36)
        elif k == 'ear':   # the eardrum bulges outward, then bursts
            show([CANAL, DRUM], True); hit = s['t0'] + 1.4; b = ease(span(t, s['t0'], hit))
            DRUM.hide_render = t >= hit + 0.05; DRUM.scale = (0.0012 + 0.004 * b + 0.0006 * math.sin(t * 30) * b, 0.0055, 0.0055)
            FLASH.hide_render = not (hit <= t < hit + 0.3); FLASH.location = DRUM_C; FLASH.scale = (0.12 + 0.5 * span(t, hit, hit + 0.3),) * 3
            for j, bb in enumerate(BUBS[:16]): a = span(t, hit, hit + 0.8); bb.hide_render = not (0 < a < 1); bb.location = DRUM_C + Vector((0.04 * a, 0.02 * math.sin(j), 0.02 * math.cos(j * 1.7))); bb.scale = (0.22,) * 3
            cam(EAR + Vector((0.16 - 0.03 * u, -0.1, 0.03)), DRUM_C, 60)
    elif k == 'car':   # night drive: seated, holds it in; streetlights sweep through the car
        world(None, 0); show(CAR, True); KEY.hide_render = FILL.hide_render = True; RIM.hide_render = False
        rot('thigh_r', -88, 0, 4); rot('thigh_l', -88, 0, -4); rot('calf_r', 92, 0, 0); rot('calf_l', 92, 0, 0); rot('spine_01', -6, 0, 0)
        rig.location = (0, 0.02, -0.42); ik.influence = ikl.influence = 1.0; IKT.location = Vector((-0.17, -0.36, 0.95)); IKP.location = Vector((-0.6, 0.3, 0.4)); IKT2.location = Vector((0.17, -0.36, 0.95)); IKP2.location = Vector((0.6, 0.3, 0.4))
        hold = ease(span(t, s['t0'] + 0.3, s['t0'] + 1.6)); face(**mix({}, HOLD, hold)); rot('head', -4 * hold, 0, 0)
        for j, L in enumerate(STREET): z = -6 + ((t * 9 + j * 4.3) % 60) - 30; L.location = ((j % 2 * 2 - 1) * 4.5, z, 3.5)
        ph = (t * 1.6) % 1; SWEEP.location = (2.5, 2 - 4 * ph, 2.2); SWEEP.rotation_euler = (Vector((0, -0.3, 1.0)) - SWEEP.location).to_track_quat('-Z', 'Y').to_euler(); SWEEP.data.energy = 60 * math.sin(math.pi * ph) ** 2
        aim(DASHL, (0, -0.55, 0.95), headpos()); aim(RIM, headpos() + Vector((0.6, 0.5, 0.3)), headpos())
        hp = headpos() + Vector((0, -0.07, 0.04)); cam(hp + Vector((0.78 - 0.1 * u, -0.78, -0.12)), hp + Vector((0, -0.12, -0.22)), 32, hp, 2.4)   # wide enough for the hands on the wheel
    elif k == 'hospital':   # a week in hospital, a feeding tube in the nose
        world('childrens_hospital', 0.7, 120); show(HOSP, True)
        rig.rotation_euler = (math.radians(-90), 0, math.radians(180)); rig.location = (0, 0.9, 0.75); face(**TIRED)   # on his back, head on the pillow
        bpy.context.view_layer.update(); arms_down(rig.matrix_world.copy())
        bpy.context.view_layer.update()
        global TUBE
        if TUBE is None:
            nose_w = rig.matrix_world @ (NOSE + Vector((0.006, 0.0, -0.01)))
            TUBE = curve('tube', [nose_w, nose_w + Vector((0.03, 0.0, 0.02)), nose_w + Vector((0.09, 0.03, 0.01)), nose_w + Vector((0.13, 0.1, -0.03)), Vector((0.5, 0.0, 0.8))], 0.0022, TUBE_M)
            HOSP.append(TUBE); ALL_SETS.append(TUBE)
        TUBE.hide_render = False
        hp = headpos(); aim(KEY, hp + Vector((-0.6, -0.5, 0.8)), hp); aim(RIM, hp + Vector((0.6, -0.8, 0.4)), hp); aim(FILL, hp + Vector((0.5, 0.6, 0.6)), hp)
        cam(hp + Vector((0.5 - 0.1 * u, 0.62 - 0.08 * u, 0.5)), hp + Vector((0, 0.1, -0.03)), 42, hp, 2.6)
    bpy.context.view_layer.update(); bpy.context.view_layer.update()   # twice: IK reads its targets from the previous evaluation otherwise

times = TEST if TEST else [T0 + i / FPS for i in range(int(round((T1 - T0) * FPS)))]
for n, t in enumerate(times):
    frame(t); frame(t)   # twice: the IK solve otherwise shows the previous frame's arm pose
    idx = round(t * FPS) if not TEST else n
    sc.render.filepath = os.path.join(OUT, f'f_{idx:05d}.jpg'); bpy.ops.render.render(write_still=True)
    print('frame', idx, round(t, 3), shot_of(t)[1]['name'], flush=True)
