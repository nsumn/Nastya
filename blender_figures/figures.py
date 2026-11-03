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
sc = bpy.context.scene


def mat(name, rgb, rough=0.42, sss=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1); b.inputs["Roughness"].default_value = rough
    if sss: b.inputs["Subsurface Weight"].default_value = sss; b.inputs["Subsurface Radius"].default_value = (0.2, 0.1, 0.1)
    return m


PINK = mat("pink", (0.86, 0.46, 0.56), 0.4, 0.08)
HAIR = mat("hair", (0.46, 0.13, 0.24), 0.5, 0.03)
BLUE = mat("blue", (0.30, 0.55, 0.92), 0.4, 0.08)
INK = mat("ink", (0.025, 0.02, 0.03), 0.35)
BG = mat("bg", (0.03, 0.04, 0.075), 0.9)
made = []


def reg(o):
    made.append(o); return o


def smooth(o):
    for p in o.data.polygons: p.use_smooth = True


def skin(name, pts, edges, radii, m, sub=2):
    me = bpy.data.meshes.new(name); me.from_pydata([Vector(p) for p in pts], edges, [])
    o = bpy.data.objects.new(name, me); sc.collection.objects.link(o)
    mod = o.modifiers.new("skin", "SKIN"); mod.use_smooth_shade = True
    for i, r in enumerate(radii): me.skin_vertices[0].data[i].radius = r if isinstance(r, tuple) else (r, r)
    me.skin_vertices[0].data[0].use_root = True
    s = o.modifiers.new("sub", "SUBSURF"); s.levels = s.render_levels = sub
    o.data.materials.append(m); return reg(o)


def sphere(name, loc, r, m, scale=(1, 1, 1), rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=32, radius=r, location=loc, rotation=rot)
    o = bpy.context.active_object; o.name = name; o.scale = scale; smooth(o); o.data.materials.append(m); return reg(o)


def arc(loc, normal, up, r, t, a0, a1, m):
    bpy.ops.mesh.primitive_torus_add(major_radius=r, minor_radius=t, major_segments=32, minor_segments=8)
    o = bpy.context.active_object
    bm = bmesh.new(); bm.from_mesh(o.data)
    A0, A1 = [(x - 2 * math.pi) if x > math.pi else x for x in (math.radians(a0), math.radians(a1))]
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not (A0 <= math.atan2(v.co.y, v.co.x) <= A1)], context="VERTS")
    bm.to_mesh(o.data); bm.free(); smooth(o); o.data.materials.append(m)
    D = Vector(normal).normalized(); S_ = D.cross(Vector(up)).normalized(); U_ = S_.cross(D).normalized()
    o.matrix_world = Matrix.Translation(loc) @ Matrix((S_, U_, D)).transposed().to_4x4()
    return reg(o)


def on_head(H, R, d, out=0.0):
    return H + Vector(d).normalized() * (R + out)


def figure(w):
    """standing at the origin, facing -Y. returns list of objects."""
    start = len(made)
    k = 1.0 if w else 1.1
    sw = 0.145 if w else 0.195
    z = lambda v: v * k
    P = {
        "pelvis": (0, 0, z(0.82)), "waist": (0, 0.005, z(1.0)), "chest": (0, 0, z(1.16)), "nbase": (0, 0, z(1.27)), "neck": (0, 0, z(1.42)),
        "hipL": (-0.085, 0, z(0.8)), "kneeL": (-0.09, -0.01, z(0.43)), "ankL": (-0.085, 0.0, z(0.06)),
        "hipR": (0.085, 0, z(0.8)), "kneeR": (0.09, -0.01, z(0.43)), "ankR": (0.085, 0.0, z(0.06)),
        "shL": (-sw, 0, z(1.22)), "elL": (-sw - 0.04, 0.02, z(0.98)), "haL": (-sw - 0.05, -0.01, z(0.77)),
        "shR": (sw, 0, z(1.22)), "elR": (sw + 0.04, 0.02, z(0.98)), "haR": (sw + 0.05, -0.01, z(0.77)),
    }
    E = [("pelvis", "waist"), ("waist", "chest"), ("chest", "nbase"), ("nbase", "neck"), ("pelvis", "hipL"), ("hipL", "kneeL"), ("kneeL", "ankL"),
         ("pelvis", "hipR"), ("hipR", "kneeR"), ("kneeR", "ankR"), ("chest", "shL"), ("shL", "elL"), ("elL", "haL"),
         ("chest", "shR"), ("shR", "elR"), ("elR", "haR")]
    r = {"pelvis": ((0.112 if w else 0.105), 0.08), "waist": ((0.072 if w else 0.11), 0.068), "chest": ((0.1 if w else 0.135), (0.075 if w else 0.088)),
         "neck": 0.045 * k, "hipL": 0.062 * k, "kneeL": 0.046 * k, "ankL": 0.035 * k, "hipR": 0.062 * k, "kneeR": 0.046 * k, "ankR": 0.035 * k,
         "shL": 0.046 * k, "elL": 0.034 * k, "haL": 0.033 * k, "shR": 0.046 * k, "elR": 0.034 * k, "haR": 0.033 * k}
    N = list(P)
    m = PINK if w else BLUE
    T = 1.38
    r = {n: ((v[0] * T, v[1] * T) if isinstance(v, tuple) else v * T) for n, v in r.items()}
    r["nbase"] = (0.062 if w else 0.078); r["neck"] = (0.05 if w else 0.064)
    skin("body", [P[n] for n in N], [(N.index(a), N.index(b)) for a, b in E], [r[n] for n in N], m)
    # mitten hands with a small thumb, rounded feet
    for s in (-1, 1):
        hx = s * (sw + 0.055)
        sphere("hand", (hx, -0.01, z(0.745)), 0.05 * k, m, (0.78, 0.65, 1.15))
        sphere("thumb", (hx - s * 0.028, -0.04, z(0.77)), 0.021 * k, m, (0.8, 0.8, 1.4), (0.3, 0, 0))
        sphere("foot", (s * 0.085, -0.035, 0.045), 0.066 * k, m, (0.78, 1.35, 0.65))
    # head
    R = 0.195 * k
    H = Vector((0, -0.005, z(1.42) + R * 0.88))
    sphere("head", H, R, m, (0.97, 0.98, 1.03))
    F = (0, -1, 0)
    for s in (-1, 1):                     # open eyes: glossy dark ovals + brows
        sphere("eye", on_head(H, R, (s * 0.36, -1, 0.12), -0.006), 0.022 * k, INK, (0.85, 0.5, 1.2))
        arc(on_head(H, R, (s * 0.38, -1, 0.42), 0.002), on_head(H, R, (s * 0.38, -1, 0.42)) - H, (0, 0, 1), 0.036 * k, 0.0055, 20, 160, INK)
    arc(on_head(H, R, (0, -1, -0.38), 0.002), on_head(H, R, (0, -1, -0.38)) - H, (0, 0, 1), 0.04 * k, 0.0065, 205, 335, INK)   # smile
    if w:
        # hair: ONE continuous shell around the head, open for the face, falling just below the shoulders
        bpy.ops.mesh.primitive_uv_sphere_add(segments=160, ring_count=90, radius=1.0, location=(0, 0, 0))
        hs = bpy.context.active_object; hs.name = "hair"
        bm = bmesh.new(); bm.from_mesh(hs.data)
        drop = (H.z - R) - (z(1.22) - 0.14)                      # how far the ends hang below the head
        kill = []
        for v in bm.verts:
            d = v.co.normalized()
            # face window: narrow at the centre part, opening down to the cheeks (forehead + brows free)
            wz = 0.2 + 0.58 * min(1.0, max(0.0, (0.82 - d.z) / 0.85))
            face = d.y < -0.22 and abs(d.x) < wz and d.z < 0.86
            chin = d.y < 0.05 and d.z < -0.2                            # nothing in front: hair falls only behind and at the sides
            if face or chin or d.z < -0.9: kill.append(v); continue
            rr = R * (1.07 + 0.02 * max(0, d.z))
            if abs(d.x) < 0.06 and d.z > 0.55: rr *= 0.985              # soft centre part
            t = max(0.0, (0.15 - d.z) / 1.05)                           # 0 above the ears .. 1 at the bottom
            sp = 1 + 0.12 * t ** 1.3                                    # ends flare a little
            x, y = d.x * rr * sp, d.y * rr * sp + 0.02 * t
            v.co = Vector((x, y, d.z * rr - drop * t ** 0.9))
        bmesh.ops.delete(bm, geom=kill, context="VERTS")
        edge = set(v for v in bm.verts if v.is_boundary)
        ring = set(e.other_vert(v) for v in edge for e in v.link_edges) | edge
        ring2 = set(e.other_vert(v) for v in ring for e in v.link_edges) | ring
        for _ in range(30): bmesh.ops.smooth_vert(bm, verts=list(edge), factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
        for _ in range(10): bmesh.ops.smooth_vert(bm, verts=list(ring2), factor=0.4, use_axis_x=True, use_axis_y=True, use_axis_z=True)
        bm.to_mesh(hs.data); bm.free()
        hs.location = H + Vector((0, 0.012, 0))
        so = hs.modifiers.new("thick", "SOLIDIFY"); so.thickness = 0.03; so.offset = -1
        sb = hs.modifiers.new("sub", "SUBSURF"); sb.levels = sb.render_levels = 2
        smooth(hs); hs.data.materials.append(HAIR); reg(hs)
    else:
        for s in (-1, 1):                 # small ears so his bald head reads as a head
            sphere("ear", H + Vector((s * R * 0.95, 0.01, -0.01)), R * 0.17, m, (0.5, 0.8, 1.0))
    return made[start:]


def group(objs, loc, rot_z):
    e = bpy.data.objects.new("grp", None); sc.collection.objects.link(e)
    for o in objs: o.parent = e
    e.location = loc; e.rotation_euler = (0, 0, rot_z); return e


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


shoot((0.0, -3.9, 1.1), (0, 0, 0.92), PRE + "_front.png")
her.rotation_euler = (0, 0, math.radians(150)); him.rotation_euler = (0, 0, math.radians(-150))
shoot((0.0, -3.9, 1.1), (0, 0, 0.92), PRE + "_back.png")
