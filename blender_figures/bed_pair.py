"""Blender: two soft one-colour figures lying in bed facing each other (les.zamours-like look).
blender -b -P bed_pair.py -- out.png [samples] [res_scale]
"""
import bpy, sys, math
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = argv[0] if argv else "/tmp/bed_pair.png"
SAMPLES = int(argv[1]) if len(argv) > 1 else 32
SCALE = float(argv[2]) if len(argv) > 2 else 0.5

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene


def mat(name, rgb, rough=0.45, sss=0.0, emit=None, emit_s=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1); b.inputs["Roughness"].default_value = rough
    if sss: b.inputs["Subsurface Weight"].default_value = sss; b.inputs["Subsurface Radius"].default_value = (0.2, 0.1, 0.1)
    if emit: b.inputs["Emission Color"].default_value = (*emit, 1); b.inputs["Emission Strength"].default_value = emit_s
    return m


def link(o):
    sc.collection.objects.link(o); return o


def shade_smooth(o):
    for p in o.data.polygons: p.use_smooth = True


def skin(name, pts, edges, radii, m, subdiv=2):
    me = bpy.data.meshes.new(name); me.from_pydata([Vector(p) for p in pts], edges, [])
    o = link(bpy.data.objects.new(name, me))
    mod = o.modifiers.new("skin", "SKIN"); mod.use_smooth_shade = True
    for i, r in enumerate(radii):
        d = me.skin_vertices[0].data[i]; d.radius = r if isinstance(r, tuple) else (r, r)
    me.skin_vertices[0].data[0].use_root = True
    s = o.modifiers.new("sub", "SUBSURF"); s.levels = subdiv; s.render_levels = subdiv
    o.data.materials.append(m); return o


def sphere(name, loc, r, m, scale=(1, 1, 1), seg=48):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=seg // 2, radius=r, location=loc)
    o = bpy.context.active_object; o.name = name; o.scale = scale; shade_smooth(o); o.data.materials.append(m); return o


def rbox(name, loc, size, m, bevel=0.04, sub=2):
    bpy.ops.mesh.primitive_cube_add(location=loc); o = bpy.context.active_object; o.name = name
    o.scale = (size[0] / 2, size[1] / 2, size[2] / 2); bpy.ops.object.transform_apply(scale=True)
    b = o.modifiers.new("bev", "BEVEL"); b.width = bevel; b.segments = 4
    if sub: s = o.modifiers.new("sub", "SUBSURF"); s.levels = sub; s.render_levels = sub
    shade_smooth(o); o.data.materials.append(m); return o


def arc(name, center, r, thick, a0, a1, m, normal_axis="X", rot=(0, 0, 0)):
    """small torus arc for brows / closed eyes / mouth"""
    bpy.ops.mesh.primitive_torus_add(major_radius=r, minor_radius=thick, major_segments=32, minor_segments=8, location=center, rotation=rot)
    o = bpy.context.active_object; o.name = name
    # cut the torus to an arc by deleting verts outside [a0, a1]
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="DESELECT"); bpy.ops.object.mode_set(mode="OBJECT")
    import bmesh
    bm = bmesh.new(); bm.from_mesh(o.data)
    A0, A1 = [(x - 2 * math.pi) if x > math.pi else x for x in (a0, a1)]
    kill = [v for v in bm.verts if not (A0 <= math.atan2(v.co.y, v.co.x) <= A1)]
    bmesh.ops.delete(bm, geom=kill, context="VERTS"); bm.to_mesh(o.data); bm.free()
    shade_smooth(o); o.data.materials.append(m); return o


# ------------------------------------------------------------------ materials
PINK = mat("pink", (0.86, 0.46, 0.56), 0.42, 0.08)
HAIR = mat("hair", (0.58, 0.22, 0.33), 0.5, 0.05)
BLUE = mat("blue", (0.30, 0.55, 0.92), 0.42, 0.08)
INK = mat("ink", (0.03, 0.025, 0.035), 0.4)
WALL = mat("wall", (0.055, 0.07, 0.12), 0.9)
FLOOR = mat("floor", (0.04, 0.05, 0.08), 0.8)
FRAME = mat("frame", (0.05, 0.06, 0.09), 0.6)
SHEET = mat("sheet", (0.13, 0.16, 0.24), 0.85)
PILLOW = mat("pillow", (0.25, 0.29, 0.38), 0.8)
DUVET = mat("duvet", (0.09, 0.12, 0.2), 0.9)
SHADE = mat("shade", (1.0, 0.85, 0.65), 0.6, emit=(1.0, 0.72, 0.42), emit_s=6.0)

# ------------------------------------------------------------------ room + bed (Z up, headboard at +Y)
bpy.ops.mesh.primitive_plane_add(size=12, location=(0, 0, 0)); bpy.context.active_object.data.materials.append(FLOOR)
bpy.ops.mesh.primitive_plane_add(size=12, location=(0, 1.15, 3), rotation=(math.pi / 2, 0, 0)); bpy.context.active_object.data.materials.append(WALL)
rbox("bedbase", (0, 0, 0.18), (1.7, 2.1, 0.36), FRAME, 0.05)
rbox("headboard", (0, 1.07, 0.75), (1.8, 0.1, 1.0), FRAME, 0.05)
rbox("mattress", (0, 0, 0.45), (1.6, 2.0, 0.2), SHEET, 0.08)
for x in (-0.4, 0.4):
    p = rbox(f"pillow{x}", (x, 0.74, 0.6), (0.62, 0.36, 0.14), PILLOW, 0.07, 3)
rbox("nightstand", (-1.15, 0.85, 0.28), (0.45, 0.4, 0.56), FRAME, 0.03)
bpy.ops.mesh.primitive_cylinder_add(radius=0.03, depth=0.3, location=(-1.15, 0.85, 0.71)); bpy.context.active_object.data.materials.append(FRAME)
bpy.ops.mesh.primitive_cone_add(radius1=0.16, radius2=0.1, depth=0.2, location=(-1.15, 0.85, 0.92)); s = bpy.context.active_object; s.data.materials.append(SHADE)

# ------------------------------------------------------------------ figures (lying on their backs, heads turned to each other)
from mathutils import Matrix


def face_part(name, loc, D, U, r, thick, a0, a1, m):
    o = arc(name, (0, 0, 0), r, thick, a0, a1, m)
    S_ = D.cross(U).normalized(); U_ = S_.cross(D).normalized()
    o.matrix_world = Matrix.Translation(loc) @ Matrix((S_, U_, D)).transposed().to_4x4()
    return o


def figure(side, m, w):
    f = -side                                  # toward the partner along x
    x0, zc, k = side * 0.33, 0.63, (1.0 if w else 1.1)
    sw = 0.1 if w else 0.13                    # half shoulder width
    P = {
        "neck": (x0, 0.57, zc), "chest": (x0, 0.42, zc), "waist": (x0, 0.2, zc - 0.01), "pelvis": (x0, 0.0, zc),
        "hipA": (x0 - 0.07, -0.05, zc), "kneeA": (x0 - 0.08, -0.42, zc + 0.03), "ankA": (x0 - 0.07, -0.78, zc),
        "hipB": (x0 + 0.07, -0.05, zc), "kneeB": (x0 + 0.08, -0.42, zc + 0.03), "ankB": (x0 + 0.07, -0.78, zc),
        "shI": (x0 + f * sw, 0.5, zc), "elI": (x0 + f * (sw + 0.07), 0.32, zc + 0.06), "haI": (x0 + f * 0.27, 0.22, zc + 0.15),
        "shO": (x0 - f * sw, 0.5, zc), "elO": (x0 - f * (sw + 0.05), 0.3, zc), "haO": (x0 - f * (sw + 0.03), 0.12, zc + 0.02),
    }
    E = [("neck", "chest"), ("chest", "waist"), ("waist", "pelvis"), ("pelvis", "hipA"), ("hipA", "kneeA"), ("kneeA", "ankA"),
         ("pelvis", "hipB"), ("hipB", "kneeB"), ("kneeB", "ankB"), ("chest", "shI"), ("shI", "elI"), ("elI", "haI"),
         ("chest", "shO"), ("shO", "elO"), ("elO", "haO")]
    r = {"neck": 0.05 * k, "chest": ((0.105 if w else 0.13), 0.075 * k), "waist": ((0.075 if w else 0.11), 0.065 * k), "pelvis": ((0.105 if w else 0.1), 0.07 * k),
         "hipA": 0.058 * k, "kneeA": 0.045 * k, "ankA": 0.036 * k, "hipB": 0.058 * k, "kneeB": 0.045 * k, "ankB": 0.036 * k,
         "shI": 0.044 * k, "elI": 0.034 * k, "haI": 0.038 * k, "shO": 0.044 * k, "elO": 0.034 * k, "haO": 0.036 * k}
    N = list(P)
    skin(("her" if w else "him") + "_body", [P[n] for n in N], [(N.index(a), N.index(b)) for a, b in E], [r[n] for n in N], m)
    R = 0.165 * k
    H = Vector((x0 + f * 0.01, 0.76, 0.72))
    sphere(("her" if w else "him") + "_head", H, R, m, (1, 1, 1))
    D = Vector((f * 0.72, -0.28, 0.64)).normalized()            # where the face looks: to the partner and a bit to camera
    U = Vector((0, 1, 0)); U = (U - D * U.dot(D)).normalized()  # top of the head
    Sx = D.cross(U).normalized()
    c = H + D * (R + 0.002)
    for s in (-1, 1):
        p = H + (D * math.cos(0.33) + Sx * s * math.sin(0.33) * 1.0 + U * 0.2).normalized() * (R + 0.002)
        face_part("eye", p, (p - H).normalized(), U, 0.03 * k, 0.0075, math.radians(200), math.radians(340), INK)
    p = H + (D - U * 0.45).normalized() * (R + 0.002)
    face_part("mouth", p, (p - H).normalized(), U, 0.026 * k, 0.0068, math.radians(205), math.radians(335), INK)
    if w:
        sphere("hair_cap", H - D * 0.055 + U * 0.06, R * 1.02, HAIR, (1, 1, 1))
        fr = sphere("fringe", H + (D * 0.55 + U * 0.75 + Sx * 0.25).normalized() * R * 0.82, R * 0.5, HAIR, (1.3, 0.62, 0.85))
        tip = H - D * 0.1 + U * 0.17
        skin("ponytail", [tuple(H - D * 0.08 + U * 0.12), tuple(tip + U * 0.08 - D * 0.02), tuple(tip + U * 0.2 + Sx * 0.04 - D * 0.04)],
             [(0, 1), (1, 2)], [0.055, 0.05, 0.02], HAIR)


figure(-1, PINK, True)
figure(1, BLUE, False)

d = rbox("duvet", (0, -0.43, 0.715), (1.74, 1.18, 0.13), DUVET, 0.06, 3)
d.modifiers.new("tex", "DISPLACE"); tx = bpy.data.textures.new("folds", "CLOUDS"); tx.noise_scale = 0.35
d.modifiers["tex"].texture = tx; d.modifiers["tex"].strength = 0.035

# ------------------------------------------------------------------ light + camera
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs[0].default_value = (0.012, 0.016, 0.03, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 1.0
lamp = bpy.data.objects.new("lamp", bpy.data.lights.new("lamp", "POINT")); lamp.data.energy = 60; lamp.data.color = (1.0, 0.72, 0.45)
lamp.data.shadow_soft_size = 0.15; lamp.location = (-1.15, 0.85, 0.95); link(lamp)
moon = bpy.data.objects.new("moon", bpy.data.lights.new("moon", "AREA")); moon.data.energy = 120; moon.data.size = 2.0
moon.data.color = (0.55, 0.65, 1.0); moon.location = (1.6, -1.2, 2.6); moon.rotation_euler = (math.radians(50), 0, math.radians(130)); link(moon)
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); link(cam); sc.camera = cam
cam.location = (0.0, -0.45, 2.15)
tgt = Vector((0.0, 0.52, 0.7)); cam.rotation_euler = (tgt - cam.location).to_track_quat("-Z", "Y").to_euler()
cam.data.lens = 30; cam.data.dof.use_dof = True; cam.data.dof.focus_distance = (tgt - cam.location).length; cam.data.dof.aperture_fstop = 2.2

sc.render.engine = "CYCLES"; sc.cycles.device = "CPU"; sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = True
sc.render.resolution_x, sc.render.resolution_y = 1080, 1920; sc.render.resolution_percentage = int(SCALE * 100)
sc.view_settings.view_transform = "AgX"; sc.view_settings.look = "AgX - Medium High Contrast"
sc.render.filepath = OUT; bpy.ops.render.render(write_still=True)
print("DONE", OUT)
