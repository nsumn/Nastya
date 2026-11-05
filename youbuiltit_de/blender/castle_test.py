# Blender test scene: castle gate shot (like 02_burg at ~30 s). Run:
#   blender -b -P castle_test.py -- <engine: CYCLES|BLENDER_EEVEE_NEXT> <samples> <out.png>
import bpy, sys, math, random, time
argv = sys.argv[sys.argv.index('--') + 1:]
ENGINE, SAMPLES, OUT = argv[0], int(argv[1]), argv[2]
import os
A = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'engine', 'assets') + '/'
random.seed(3)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

def img(name, non_color=False):
    im = bpy.data.images.load(A + name, check_existing=True)
    if non_color: im.colorspace_settings.name = 'Non-Color'
    return im

def pbr_mat(name, diff, nor, scale=1.0, tint=(1, 1, 1, 1), rough=.9, ns=1.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; N = nt.nodes; L = nt.links; b = N['Principled BSDF']
    tc = N.new('ShaderNodeTexCoord'); mp = N.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (scale,) * 3
    L.new(tc.outputs['Object'], mp.inputs['Vector'])
    d = N.new('ShaderNodeTexImage'); d.image = img(diff); d.projection = 'BOX'; d.projection_blend = .2
    L.new(mp.outputs['Vector'], d.inputs['Vector'])
    mix = N.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'; mix.inputs['Factor'].default_value = 1
    L.new(d.outputs['Color'], mix.inputs['A']); mix.inputs['B'].default_value = tint
    L.new(mix.outputs['Result'], b.inputs['Base Color'])
    n = N.new('ShaderNodeTexImage'); n.image = img(nor, True); n.projection = 'BOX'; n.projection_blend = .2
    L.new(mp.outputs['Vector'], n.inputs['Vector'])
    nm = N.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = ns
    L.new(n.outputs['Color'], nm.inputs['Color']); L.new(nm.outputs['Normal'], b.inputs['Normal'])
    b.inputs['Roughness'].default_value = rough
    return m

def flat(name, col, rough=.6, metal=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = col; b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    return m

stone = pbr_mat('stone', 'stone_wall_diff_1k.jpg', 'stone_wall_nor_gl_1k.jpg', .33, (1.0, .96, .9, 1), .9, 1.2)
wood = pbr_mat('wood', 'wood_planks_diff_1k.jpg', 'wood_planks_nor_gl_1k.jpg', .5, (.9, .7, .5, 1), .8)
grass = pbr_mat('grass', 'leafy_grass_detail_1k.jpg', 'leafy_grass_nor_gl_1k.jpg', .4, (.22, .55, .12, 1), .95, .8)
water = flat('water', (.12, .45, .65, 1), .05); water.node_tree.nodes['Principled BSDF'].inputs['Transmission Weight'].default_value = .3
dark = flat('dark', (.03, .02, .015, 1), 1)
blue = flat('blue', (.08, .25, .7, 1), .5); skin = flat('skin', (.9, .65, .5, 1), .5); steel = flat('steel', (.8, .82, .85, 1), .25, 1)
leaf = flat('leaf', (.05, .16, .03, 1), .8); bark = flat('bark', (.25, .16, .09, 1), .9); soil = flat('soil', (.35, .22, .12, 1), 1)

def box(x0, x1, y0, y1, z0, z1, mat, name='box'):
    bpy.ops.mesh.primitive_cube_add(size=1, location=((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2))
    o = bpy.context.object; o.scale = (x1 - x0, y1 - y0, z1 - z0); o.name = name
    bpy.ops.object.transform_apply(scale=True)
    bev = o.modifiers.new('bev', 'BEVEL'); bev.width = .04; bev.segments = 2
    o.data.materials.append(mat); return o

# ground with a slight hill, moat as a lower ring
bpy.ops.mesh.primitive_plane_add(size=300, location=(0, 0, -2)); g = bpy.context.object; g.data.materials.append(grass)
HS = 9.0; WH = 5.0; T = 1.0
box(-14, 14, -14, 14, -1.6, -1.55, soil)                                     # moat bed
# moat: four water strips around the wall at radius 10..12
for (x0, x1, y0, y1) in [(-12, 12, -12, -10), (-12, 12, 10, 12), (-12, -10, -10, 10), (10, 12, -10, 10)]:
    box(x0, x1, y0, y1, -.35, -.3, water, 'water')
    box(x0, x1, y0, y1, -1.6, -.36, soil, 'moatwall').hide_render = True   # keep it simple
# lawn tiles over the moat zone (leave the water visible)
for (x0, x1, y0, y1) in [(-40, 40, 12, 40), (-40, 40, -40, -12), (-40, -12, -12, 12), (12, 40, -12, 12)]:
    box(x0, x1, y0, y1, -.05, .02, grass)
box(-10, 10, -10, 10, -.05, .02, grass)
# walls with a gate gap in the front (+y)
GATE = 1.6
box(-HS, -GATE, HS - T, HS, 0, WH, stone); box(GATE, HS, HS - T, HS, 0, WH, stone); box(-GATE, GATE, HS - T, HS, 3.6, WH, stone)
box(-HS, HS, -HS, -HS + T, 0, WH, stone); box(-HS, -HS + T, -HS + T, HS - T, 0, WH, stone); box(HS - T, HS, -HS + T, HS - T, 0, WH, stone)
# merlons along all walls
for i in range(15):
    x = -HS + .5 + i * (2 * HS - 1) / 14
    for y in (HS - .5, -HS + .5):
        box(x - .3, x + .3, y - .45, y + .45, WH, WH + .7, stone)
    box(-HS + .05, -HS + .95, x - .3, x + .3, WH, WH + .7, stone); box(HS - .95, HS - .05, x - .3, x + .3, WH, WH + .7, stone)
# gate doors + drawbridge
box(-GATE, 0, HS - .55, HS - .45, 0, 3.6, wood); box(0, GATE, HS - .55, HS - .45, 0, 3.6, wood)
box(-1.2, 1.2, HS, HS + 3.2, -.05, .15, wood)
# guards on the wall walk
def guard(x, y, z):
    bpy.ops.mesh.primitive_cylinder_add(radius=.28, depth=.9, location=(x, y, z + .45)); o = bpy.context.object; o.data.materials.append(blue)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=.22, location=(x, y, z + 1.12)); bpy.ops.object.shade_smooth(); bpy.context.object.data.materials.append(skin)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=.24, location=(x, y, z + 1.2)); h = bpy.context.object; h.scale.z = .6; bpy.ops.object.shade_smooth(); h.data.materials.append(steel)
    bpy.ops.mesh.primitive_cylinder_add(radius=.03, depth=2.2, location=(x + .35, y, z + 1.1)); bpy.context.object.data.materials.append(bark)
for x in (-6, -2.5, 2.5, 6): guard(x, HS - .5, WH)
# trees
def tree(x, y, s=1.0):
    bpy.ops.mesh.primitive_cylinder_add(radius=.3 * s, depth=3.4 * s, location=(x, y, 1.7 * s)); bpy.context.object.data.materials.append(bark)
    for _ in range(9):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=random.uniform(1.0, 1.6) * s,
            location=(x + random.uniform(-1.6, 1.6) * s, y + random.uniform(-1.4, 1.4) * s, (3.6 + random.uniform(0, 2.2)) * s))
        o = bpy.context.object; bpy.ops.object.shade_smooth(); o.data.materials.append(leaf)
        d = o.modifiers.new('d', 'DISPLACE'); t = bpy.data.textures.new('n', 'CLOUDS'); t.noise_scale = .6; d.texture = t; d.strength = .35
for (x, y, s) in [(-8, -20, 1.3), (6, -24, 1.5), (-20, 4, 1.2), (19, -6, 1.3), (-16, 22, 1.0), (17, 24, 1.1), (0, -32, 1.6)]: tree(x, y, s)

# sky + sun
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
sky = w.node_tree.nodes.new('ShaderNodeTexSky'); sky.sky_type = 'NISHITA'; sky.sun_elevation = math.radians(38); sky.sun_rotation = math.radians(140)
sky.air_density = 1.0; sky.dust_density = .6
w.node_tree.links.new(sky.outputs['Color'], w.node_tree.nodes['Background'].inputs['Color'])
w.node_tree.nodes['Background'].inputs['Strength'].default_value = .22
bpy.ops.object.light_add(type='SUN', rotation=(math.radians(52), 0, math.radians(-40)))
sun = bpy.context.object.data; sun.energy = 2.0; sun.angle = math.radians(4); sun.color = (1, .96, .9)

# camera: in front of the gate, a bit above, portrait
bpy.ops.object.camera_add(location=(0, 30, 9.5))
cam = bpy.context.object; sc.camera = cam
c = cam.constraints.new('TRACK_TO'); bpy.ops.object.empty_add(location=(0, 4, 3.0)); c.target = bpy.context.object
cam.data.lens = 32

r = sc.render; r.resolution_x, r.resolution_y, r.resolution_percentage = 1080, 1920, 100
r.engine = ENGINE; r.filepath = OUT; r.image_settings.file_format = 'PNG'
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'
if ENGINE == 'CYCLES':
    sc.cycles.device = 'CPU'; sc.cycles.samples = SAMPLES; sc.cycles.use_adaptive_sampling = True
    sc.cycles.use_denoising = True; sc.cycles.denoiser = 'OPENIMAGEDENOISE'; sc.cycles.max_bounces = 4
    sc.cycles.use_auto_tile = True
else:
    sc.eevee.taa_render_samples = SAMPLES; sc.eevee.use_shadows = True
    try: sc.eevee.use_raytracing = True
    except Exception: pass
t0 = time.time(); bpy.ops.render.render(write_still=True); print('RENDER_SECONDS', round(time.time() - t0, 1))
