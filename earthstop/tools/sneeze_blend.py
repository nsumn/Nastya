"""Realistic test shots for "What happens if you hold in a sneeze?" (Blender 4.2 + MPFB2/MakeHuman, Cycles CPU).
Run:  /opt/blender/blender-4.2.3-linux-x64/blender -b -P tools/sneeze_blend.py -- <out_dir> [face|xray|both] [res_scale]
Needs MPFB installed in that Blender + MakeHuman system assets + faceunits01 unpacked into …/4.2/extensions/.user/user_default/mpfb/data
(see README), and Poly Haven HDRIs in assets/sneeze/ (blinds_2k.hdr). Everything used is CC0.
The man: young white American guy, short hair, grey tee; face = ARKit face units (squint, nose sneer, lips pressed) for the held-in sneeze.
X-ray: the same head with a fresnel 'glass' skin and a glowing airway (nostrils → nasal cavity → pharynx → larynx → trachea)."""
import bpy, os, sys, math, addon_utils
from mathutils import Vector
addon_utils.enable('bl_ext.user_default.mpfb', default_set=True)
from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.faceservice import FaceService

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else 'out/sneeze'
WHICH = argv[1] if len(argv) > 1 else 'both'
RS = float(argv[2]) if len(argv) > 2 else 0.5
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.makedirs(OUT, exist_ok=True)

for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
info = HumanService._create_default_human_info_dict()
info['phenotype'] = dict(gender=1.0, age=0.47, muscle=0.5, weight=0.5, height=0.55, proportions=0.6, cupsize=0.5, firmness=0.5,
                         race=dict(asian=0.0, caucasian=1.0, african=0.0))
mc = lambda n: f'{n}/{n}.mhclo'
info.update(name='guy', rig='game_engine', eyes='high-poly/high-poly.mhclo', eyebrows=mc('eyebrow004'), eyelashes='eyelashes01/eyelashes01.mhclo',
            teeth='teeth_base/teeth_base.mhclo', hair=mc('short02'), clothes=[mc('male_casualsuit06'), mc('shoes06')],
            skin_mhmat='young_caucasian_male/young_caucasian_male.mhmat', skin_material_type='ENHANCED_SSS')
st = HumanService.get_default_deserialization_settings(); st.update(subdiv_levels=1, override_skin_model='PRESET', mask_helpers=True)
base = HumanService.deserialize_from_dict(info, st)
FaceService.load_targets(base, load_microsoft_visemes=False, load_arkit_faceunits=True)
FaceService.interpolate_targets(base)
bpy.context.view_layer.update()

# ---- the held-in sneeze face: ARKit units on every mesh that has them (body + brows/lashes follow) ----
EXPR = dict(eyeSquintLeft=0.85, eyeSquintRight=0.85, eyeBlinkLeft=0.55, eyeBlinkRight=0.55, noseSneerLeft=1.0, noseSneerRight=1.0, cheekSquintLeft=0.7,
            cheekSquintRight=0.7, browInnerUp=0.55, browDownLeft=0.35, browDownRight=0.35, mouthPressLeft=0.8, mouthPressRight=0.8, mouthRollUpper=0.5,
            mouthRollLower=0.4, mouthUpperUpLeft=0.3, mouthUpperUpRight=0.3, jawForward=0.15)
for o in bpy.data.objects:
    if o.type == 'MESH' and o.data.shape_keys:
        for k in o.data.shape_keys.key_blocks[1:]:
            bare = k.name.split('-')[-1]
            if bare in EXPR: k.value = EXPR[bare]
rig = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
pb = rig.pose.bones
if 'head' in pb: pb['head'].rotation_mode = 'XYZ'; pb['head'].rotation_euler = (math.radians(-9), 0, math.radians(4))   # chin up, about to sneeze
if 'neck_01' in pb: pb['neck_01'].rotation_mode = 'XYZ'; pb['neck_01'].rotation_euler = (math.radians(-5), 0, 0)
bpy.context.view_layer.update()
body = base
dg = bpy.context.evaluated_depsgraph_get()
ev = body.evaluated_get(dg); me = ev.to_mesh()
M = body.matrix_world
head_z = (rig.matrix_world @ pb['head'].head).z
vs = [M @ v.co for v in me.vertices if (M @ v.co).z > head_z - 0.05]
nose = min(vs, key=lambda p: p.y)   # MakeHuman faces -Y: the most forward point of the head = nose tip
top = max(p.z for p in vs)
ev.to_mesh_clear()
eyes = Vector((nose.x, nose.y + 0.035, nose.z + 0.045))
print('nose tip', tuple(round(c, 3) for c in nose), 'head top', round(top, 3))

# ---- world, lights, camera, render ----
sc = bpy.context.scene
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; nt = w.node_tree
env = nt.nodes.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(os.path.join(HERE, 'assets/sneeze/blinds_2k.hdr'))
mp = nt.nodes.new('ShaderNodeMapping'); tc = nt.nodes.new('ShaderNodeTexCoord'); mp.inputs['Rotation'].default_value = (0, 0, math.radians(200))
nt.links.new(tc.outputs['Generated'], mp.inputs['Vector']); nt.links.new(mp.outputs['Vector'], env.inputs['Vector'])
bg = nt.nodes['Background']; bg.inputs['Strength'].default_value = 0.45; nt.links.new(env.outputs['Color'], bg.inputs['Color'])
def area(name, loc, energy, size, color, aim):
    L = bpy.data.lights.new(name, 'AREA'); L.energy = energy; L.size = size; L.color = color
    ob = bpy.data.objects.new(name, L); sc.collection.objects.link(ob); ob.location = loc
    d = (aim - Vector(loc)); ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler(); return ob
area('key', eyes + Vector((-0.55, -0.6, 0.35)), 14, 0.6, (1.0, 0.9, 0.78), eyes)
area('rim', eyes + Vector((0.45, 0.55, 0.25)), 30, 0.35, (0.7, 0.82, 1.0), eyes)
area('fill', eyes + Vector((0.5, -0.7, -0.1)), 2.5, 1.0, (1, 1, 1), eyes)
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
cam.data.lens = 70; cam.data.sensor_width = 36
cam.location = eyes + Vector((0.12, -0.62, -0.02)); look = eyes + Vector((0, 0, -0.035))
cam.rotation_euler = (look - cam.location).to_track_quat('-Z', 'Y').to_euler()
cam.data.dof.use_dof = True; cam.data.dof.focus_distance = (eyes - cam.location).length; cam.data.dof.aperture_fstop = 2.0
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 64; sc.cycles.use_denoising = True
sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = 1080, 1920, int(RS * 100)
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'
sc.cycles.max_bounces = 6; sc.view_settings.exposure = -0.3
# hair: keep the strand texture, multiply it with a warm brown (the MakeHuman texture alone is almost grey)
for o in bpy.data.objects:
    if o.type == 'MESH' and 'short02' in o.name.lower():
        for m in o.data.materials:
            mx = m.node_tree.nodes.get('diffuseIntensity') if m and m.use_nodes else None
            if mx: mx.blend_type = 'MULTIPLY'; mx.inputs['Fac'].default_value = 1.0; mx.inputs['Color2'].default_value = (0.16, 0.085, 0.04, 1)
print('meshes', [o.name for o in bpy.data.objects if o.type == 'MESH'])
sc.render.image_settings.file_format = 'PNG'

if WHICH in ('face', 'both'):
    sc.render.filepath = os.path.join(OUT, 'test_face.png'); bpy.ops.render.render(write_still=True); print('wrote', sc.render.filepath)

if WHICH in ('xray', 'both'):
    # X-ray: hide hair/brows/lashes/eyes/clothes; skin = fresnel glow over transparency; the airway glows from inside
    for o in bpy.data.objects:
        if o.type == 'MESH' and o is not body: o.hide_render = True
    xm = bpy.data.materials.new('xray'); xm.use_nodes = True; n = xm.node_tree; n.nodes.clear()
    out = n.nodes.new('ShaderNodeOutputMaterial'); lw = n.nodes.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.18
    em = n.nodes.new('ShaderNodeEmission'); em.inputs['Color'].default_value = (0.12, 0.45, 0.9, 1); em.inputs['Strength'].default_value = 0.9
    tr = n.nodes.new('ShaderNodeBsdfTransparent'); mx = n.nodes.new('ShaderNodeMixShader')
    n.links.new(lw.outputs['Facing'], mx.inputs['Fac']); n.links.new(tr.outputs[0], mx.inputs[1]); n.links.new(em.outputs[0], mx.inputs[2]); n.links.new(mx.outputs[0], out.inputs[0])
    body.data.materials.clear(); body.data.materials.append(xm)
    # airway: a bevelled curve through the nose, the nasal cavity, down the pharynx into the trachea
    P = [nose + Vector(d) for d in ((0, 0.012, -0.012), (0, 0.045, -0.006), (0, 0.085, -0.004), (0, 0.098, -0.03), (0, 0.094, -0.075), (0, 0.082, -0.12), (0, 0.07, -0.17), (0, 0.065, -0.25), (0, 0.068, -0.33))]
    cu = bpy.data.curves.new('airway', 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = 0.0055; cu.bevel_resolution = 4
    sp = cu.splines.new('BEZIER'); sp.bezier_points.add(len(P) - 1)
    for b, p in zip(sp.bezier_points, P): b.co = p; b.handle_left_type = b.handle_right_type = 'AUTO'
    am = bpy.data.materials.new('air'); am.use_nodes = True; e2 = am.node_tree.nodes['Principled BSDF']
    e2.inputs['Base Color'].default_value = (1.0, 0.35, 0.2, 1); e2.inputs['Emission Color'].default_value = (1.0, 0.3, 0.12, 1); e2.inputs['Emission Strength'].default_value = 2.2
    cu.materials.append(am); ao = bpy.data.objects.new('airway', cu); sc.collection.objects.link(ao)
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.0
    sc.world.color = (0.005, 0.01, 0.02)
    cam.location = eyes + Vector((0.42, -0.42, -0.08)); look = eyes + Vector((0, 0.04, -0.09))
    cam.rotation_euler = (look - cam.location).to_track_quat('-Z', 'Y').to_euler(); cam.data.dof.use_dof = False
    sc.render.filepath = os.path.join(OUT, 'test_xray.png'); bpy.ops.render.render(write_still=True); print('wrote', sc.render.filepath)
