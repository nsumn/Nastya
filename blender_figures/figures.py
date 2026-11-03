"""Blender: character sheet of the two soft figures (her pink, him blue), studio backdrop.
blender -b -P figures.py -- out_prefix [samples] [res_scale]
writes <prefix>_front.png and <prefix>_back.png
"""
import bpy, sys, math, bmesh
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
PRE = argv[0] if argv else "/tmp/fig"
SAMPLES = int(argv[1]) if len(argv) > 1 else 32
SCALE = float(argv[2]) if len(argv) > 2 else 0.5

bpy.ops.wm.read_factory_settings(use_empty=True)
sys.path.insert(0, __import__("os").path.dirname(__file__))
from figlib import *                     # materials, figure(), group(), helpers
sc = bpy.context.scene

her = group(figure(True), (-0.38, 0, 0), math.radians(12))
him = group(figure(False), (0.38, 0, 0), math.radians(-12))

# studio: floor + curved backdrop
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, 0)); fl = bpy.context.active_object
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=2, y_segments=40, size=1.0)
for v in bm.verts:
    t = (v.co.y + 1) / 2                      # 0 front .. 1 back
    y = -2 + t * 4.5; zz = 0.0
    if y > 0.8: a = min((y - 0.8) / 1.6, 1) * math.pi / 2; y = 0.8 + 1.6 * math.sin(a); zz = 1.6 * (1 - math.cos(a)) + max(0, (t * 4.5 - 2 - 0.8 - 1.6 * math.pi / 2))
    v.co.x *= 6; v.co.y = y; v.co.z = zz
bm.to_mesh(fl.data); bm.free(); smooth(fl); fl.data.materials.append(BG)
sub = fl.modifiers.new("s", "SUBSURF"); sub.levels = sub.render_levels = 2

w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs[0].default_value = (0.01, 0.013, 0.025, 1)


def area(name, loc, target, energy, size, col):
    L = bpy.data.objects.new(name, bpy.data.lights.new(name, "AREA")); L.data.energy = energy; L.data.size = size; L.data.color = col
    L.location = loc; L.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler(); sc.collection.objects.link(L); return L


area("key", (-1.6, -2.2, 2.6), (0, 0, 1.0), 150, 1.6, (1.0, 0.9, 0.82))
area("fill", (2.0, -1.8, 1.4), (0, 0, 1.0), 45, 2.0, (0.6, 0.7, 1.0))
area("rim", (0.0, 1.6, 2.4), (0, 0, 1.2), 160, 1.2, (0.75, 0.82, 1.0))

cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
cam.data.lens = 50
sc.render.engine = "CYCLES"; sc.cycles.device = "CPU"; sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = True
sc.render.resolution_x, sc.render.resolution_y = 1080, 1920; sc.render.resolution_percentage = int(SCALE * 100)
sc.view_settings.view_transform = "AgX"; sc.view_settings.look = "AgX - Medium High Contrast"; sc.view_settings.exposure = -0.35


def shoot(pos, tgt, path):
    cam.location = pos; cam.rotation_euler = (Vector(tgt) - Vector(pos)).to_track_quat("-Z", "Y").to_euler()
    sc.render.filepath = path; bpy.ops.render.render(write_still=True); print("DONE", path)


if not (len(argv) > 3 and argv[3] == "side"): shoot((0.0, -3.9, 1.1), (0, 0, 0.92), PRE + "_front.png")
her.rotation_euler = (0, 0, math.radians(150)); him.rotation_euler = (0, 0, math.radians(-150))
if not (len(argv) > 3 and argv[3] == "side"): shoot((0.0, -3.9, 1.1), (0, 0, 0.92), PRE + "_back.png")
if len(argv) > 3 and argv[3] == "side":            # quick: only her side close-up
    her.rotation_euler = (0, 0, math.radians(70)); shoot((-0.38, -1.5, 1.45), (-0.38, 0, 1.35), PRE + "_cu_side.png")
if len(argv) > 3 and argv[3] == "cu":               # close-ups of her head (front, back, side)
    her.rotation_euler = (0, 0, 0); hz = her.location.z + 1.5
    for nm, ang in (("cu_front", 0), ("cu_side", 70), ("cu_back", 180)):
        her.rotation_euler = (0, 0, math.radians(ang))
        shoot((-0.38, -1.5, 1.45), (-0.38, 0, 1.35), PRE + "_" + nm + ".png")
