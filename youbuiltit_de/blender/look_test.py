# Look test: can this pipeline reach the @oddtilt / @kerozni picture at all?
#
#   blender -b -P look_test.py -- CYCLES 128 out.png GPU
#
# Everything the cartoon scene does NOT do, all at once, so the answer is not muddied:
#   - a real downloaded model with PBR maps (Poly Haven, CC0) instead of boxes;
#   - HDRI as the light source and as the background, not a bare sun over a green plane;
#   - a short lens close to the subject with real depth of field;
#   - AgX, and a compositor pass with bloom and a touch of lens distortion;
#   - 128 samples instead of 32.
import bpy, sys, os, math

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import scene_lib as L

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ENGINE = argv[0] if argv else 'CYCLES'
SAMPLES = int(argv[1]) if len(argv) > 1 else 128
OUT = argv[2] if len(argv) > 2 else 'look_test.png'
DEVICE = argv[3] if len(argv) > 3 else 'GPU'

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
HERE = os.path.dirname(os.path.abspath(__file__))

# ---------- world: HDRI does the lighting ----------
w = bpy.data.worlds.new('w')
sc.world = w
w.use_nodes = True
nt = w.node_tree
env = nt.nodes.new('ShaderNodeTexEnvironment')
env.image = bpy.data.images.load(os.path.join(L.A, 'kloofendal_48d_partly_cloudy_puresky_2k.hdr'))
mapping = nt.nodes.new('ShaderNodeMapping')
texco = nt.nodes.new('ShaderNodeTexCoord')
mapping.inputs['Rotation'].default_value[2] = math.radians(150)
nt.links.new(texco.outputs['Generated'], mapping.inputs['Vector'])
nt.links.new(mapping.outputs['Vector'], env.inputs['Vector'])
nt.links.new(env.outputs['Color'], nt.nodes['Background'].inputs['Color'])
nt.nodes['Background'].inputs['Strength'].default_value = 1.35
bpy.ops.object.light_add(type='SUN', rotation=(math.radians(46), 0, math.radians(-55)))
sun = bpy.context.object
sun.data.energy = 2.4
sun.data.angle = math.radians(2.5)
sun.data.color = (1, .95, .86)

# ---------- materials and ground ----------
stone = L.pbr('stone', 'stone_wall_diff_1k.jpg', 'stone_wall_nor_gl_1k.jpg', 1.1, (.56, .53, .49, 1), .92, 1.7)
grass = L.pbr('grass', 'leafy_grass_detail_1k.jpg', 'leafy_grass_nor_gl_1k.jpg', .9, (.2, .36, .12, 1), .95, 1.0)
soil = L.pbr('soil', 'leafy_grass_detail_1k.jpg', 'leafy_grass_nor_gl_1k.jpg', 1.6, (.26, .2, .14, 1), 1.0, 1.0)
ground = L.box(-30, 30, -30, 30, -1, 0, grass, 'ground', bevel=0)
# real blades on the patch the camera sees, same trick as the cartoon scene
blade_mat = L.varied_material('blade', [(.09, .22, .05, 1), (.14, .31, .07, 1), (.2, .38, .1, 1)])
blade = L.grass_blade(blade_mat, w=.02, h=.14)
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, -6, .01))
lawn = bpy.context.object; lawn.name = 'lawn'; lawn.scale = (22, 18, 1)
bpy.ops.object.transform_apply(scale=True)
lawn.data.materials.append(grass)
L.scatter(lawn, blade, count=260000, seed=3, size=1.0, size_random=.5)
L.box(-2.6, 2.6, -.4, .5, -.02, .04, soil, 'threshold_dirt', bevel=0)

# the wall the door sits in
OX, OZ = 1.05, 2.35
L.box(-7, -OX, 0, .7, 0, 4.6, stone, 'wall_l', bevel=.06)
L.box(OX, 7, 0, .7, 0, 4.6, stone, 'wall_r', bevel=.06)
L.box(-OX, OX, 0, .7, OZ, 4.6, stone, 'wall_top', bevel=.06)
L.box(-7, 7, 0, .7, 4.6, 5.0, stone, 'wall_cap', bevel=.08)
L.box(-OX - .1, OX + .1, .7, 5.0, -.05, OZ + .1, L.flat('inside_dark', (.05, .045, .04, 1), 1),
      'inside', bevel=0)

# ---------- the real door ----------
door_path = os.path.join(HERE, 'assets', 'models', 'large_castle_door', 'large_castle_door_2k.gltf')
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=door_path)
new = [o for o in bpy.data.objects if o not in before]
bpy.context.view_layer.update()
from mathutils import Vector
zs = [(o.matrix_world @ Vector(b)).z for o in new if o.type == 'MESH' for b in o.bound_box]
height = (max(zs) - min(zs)) or 1.0
roots = [o for o in new if o.parent is None]
door = roots[0]
s = (OZ - .06) / height
door.scale = (s, s, s)
door.rotation_euler = (door.rotation_euler.x, door.rotation_euler.y, math.radians(-16))
door.location = (-OX + .12, .34, 0)
print('DOOR imported, %d objects, scale %.3f' % (len(new), s))

# a person for scale, if the Mixamo file is there
you = L.character('you.fbx', 1.75, -4.1, 0, math.radians(205), 1.78, 'you')

# ---------- camera: short lens, close, real depth of field ----------
bpy.ops.object.camera_add(location=(3.5, -6.4, 1.62))
cam = bpy.context.object
sc.camera = cam
cam.data.lens = 35
cam.data.dof.use_dof = True
cam.data.dof.focus_distance = 6.4
cam.data.dof.aperture_fstop = 3.2
tgt = L.empty(-.2, .3, 1.5, 'cam_target')
cam.constraints.new('TRACK_TO').target = tgt

# ---------- render ----------
L.render_setup(sc, ENGINE, SAMPLES, DEVICE, OUT)
sc.view_settings.view_transform = 'AgX'          # realism, not the cartoon's Standard
try:
    sc.view_settings.look = 'AgX - Medium Contrast'
except TypeError:
    pass
sc.view_settings.exposure = 1.2
sc.cycles.max_bounces = 8

# compositor: bloom and a touch of lens distortion (numbers from the blender-film skill)
ng = bpy.data.node_groups.new('Lens Look', 'CompositorNodeTree')
ng.interface.new_socket('Image', in_out='OUTPUT', socket_type='NodeSocketColor')
n, lk = ng.nodes, ng.links
rl = n.new('CompositorNodeRLayers'); rl.scene = sc; rl.location = (-600, 0)
gl = n.new('CompositorNodeGlare'); gl.location = (-300, 0)
for key, val in (('Type', 'Bloom'), ('Quality', 'High'), ('Threshold', 1.2),
                 ('Smoothness', .4), ('Strength', .3), ('Size', .55)):
    try:
        gl.inputs[key].default_value = val
    except (KeyError, TypeError):
        pass
ld = n.new('CompositorNodeLensdist'); ld.location = (0, 0)
for key, val in (('Distortion', -.012), ('Dispersion', .006), ('Fit', True)):
    try:
        ld.inputs[key].default_value = val
    except (KeyError, TypeError):
        pass
out = n.new('NodeGroupOutput'); out.location = (300, 0)
lk.new(rl.outputs['Image'], gl.inputs['Image'])
lk.new(gl.outputs['Image'], ld.inputs['Image'])
lk.new(ld.outputs['Image'], out.inputs[0])
try:
    sc.compositing_node_group = ng               # Blender 5.x
    sc.render.use_compositing = True
except AttributeError:
    print('compositor: node group API not available on this build')

import time
t0 = time.time()
bpy.ops.render.render(write_still=True)
print('RENDER_SECONDS', sc.render.engine, round(time.time() - t0, 1))
