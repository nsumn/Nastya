"""Render a clay shot exported from three.js (clay/index.html?export=1 -> <shot>.glb) with Blender Cycles.

  blender -b -P clay/blender/render_shot.py -- <shot.glb> <out.png> [samples] [night]

Same geometry as the three.js preview; Blender adds what the browser can't: path-traced soft light and shadows,
contact shadows, light bounce and a matte clay material with a touch of subsurface.
"""
import math, sys
import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
GLB, OUT = argv[0], argv[1]
SAMPLES = int(argv[2]) if len(argv) > 2 else 96
NIGHT = len(argv) > 3 and argv[3] == "night"

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=GLB)
sc = bpy.context.scene

# camera from the shot; drop the three.js lights (we light the scene ourselves)
cam = next((o for o in sc.objects if o.type == "CAMERA"), None)
sc.camera = cam
cam.data.sensor_fit = "VERTICAL"
for o in [o for o in sc.objects if o.type == "LIGHT"]:
    bpy.data.objects.remove(o, do_unlink=True)

# clay materials: matte, slightly soft (subsurface), body uses its vertex colours
for o in sc.objects:
    if o.type != "MESH":
        continue
    o.data.shade_smooth() if hasattr(o.data, "shade_smooth") else None
    has_col = len(o.data.color_attributes) > 0
    for slot in o.material_slots:
        m = slot.material
        if not m or not m.use_nodes:
            continue
        nt = m.node_tree
        bsdf = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
        if not bsdf:
            continue
        bsdf.inputs["Roughness"].default_value = max(0.5, bsdf.inputs["Roughness"].default_value * 0.85)
        bsdf.inputs["Subsurface Weight"].default_value = 0.12
        bsdf.inputs["Subsurface Scale"].default_value = 0.01
        if has_col:
            ca = nt.nodes.new("ShaderNodeVertexColor"); ca.layer_name = o.data.color_attributes[0].name
            nt.links.new(ca.outputs["Color"], bsdf.inputs["Base Color"])

# lights: soft key (sun with a wide angle), big fill from the camera side, grey sky
def look_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()

sun = bpy.data.objects.new("Key", bpy.data.lights.new("Key", "SUN")); sc.collection.objects.link(sun)
sun.data.energy = 2.6 if NIGHT else 3.8; sun.data.angle = math.radians(10)
sun.data.color = (1.0, 0.97, 0.93)
sun.location = (-1.6, 3.2, -3.4)          # glTF import: three.js +z -> Blender -y
look_at(sun, (0, 0, 0))
fill = bpy.data.objects.new("Fill", bpy.data.lights.new("Fill", "AREA")); sc.collection.objects.link(fill)
fill.data.energy = 70 if NIGHT else 110; fill.data.size = 3.0; fill.data.color = (1.0, 0.96, 0.92)
fill.location = cam.location + Vector((0.4, 0, 0.9)); look_at(fill, (0, 0, 0.6))
world = bpy.data.worlds.new("W"); sc.world = world; world.use_nodes = True
bg = world.node_tree.nodes["Background"]; bg.inputs[0].default_value = (0.55, 0.57, 0.62, 1) if NIGHT else (0.62, 0.62, 0.64, 1)
bg.inputs[1].default_value = 0.45 if NIGHT else 0.6

# render settings
sc.render.engine = "CYCLES"; sc.cycles.device = "CPU"
sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = True
sc.cycles.max_bounces = 6
sc.render.resolution_x, sc.render.resolution_y = 1080, 1920
sc.view_settings.view_transform = "AgX"; sc.view_settings.look = "AgX - Punchy"
sc.view_settings.exposure = 0.35
sc.render.image_settings.file_format = "PNG"
sc.render.filepath = OUT
bpy.ops.render.render(write_still=True)
print("RENDERED", OUT)
