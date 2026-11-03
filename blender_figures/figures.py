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
    sw = 0.125 if w else 0.17
    z = lambda v: v * k
    P = {
        "pelvis": (0, 0, z(0.82)), "waist": (0, 0.005, z(1.0)), "chest": (0, 0, z(1.16)), "neck": (0, 0, z(1.3)),
        "hipL": (-0.075, 0, z(0.8)), "kneeL": (-0.08, -0.01, z(0.43)), "ankL": (-0.075, 0.0, z(0.06)),
        "hipR": (0.075, 0, z(0.8)), "kneeR": (0.08, -0.01, z(0.43)), "ankR": (0.075, 0.0, z(0.06)),
        "shL": (-sw + 0.01, 0, z(1.18)), "elL": (-sw - 0.04, 0.02, z(0.98)), "haL": (-sw - 0.05, -0.01, z(0.77)),
        "shR": (sw - 0.01, 0, z(1.18)), "elR": (sw + 0.04, 0.02, z(0.98)), "haR": (sw + 0.05, -0.01, z(0.77)),
    }
    E = [("pelvis", "waist"), ("waist", "chest"), ("chest", "neck"), ("pelvis", "hipL"), ("hipL", "kneeL"), ("kneeL", "ankL"),
         ("pelvis", "hipR"), ("hipR", "kneeR"), ("kneeR", "ankR"), ("chest", "shL"), ("shL", "elL"), ("elL", "haL"),
         ("chest", "shR"), ("shR", "elR"), ("elR", "haR")]
    r = {"pelvis": ((0.112 if w else 0.105), 0.08), "waist": ((0.072 if w else 0.11), 0.068), "chest": ((0.1 if w else 0.135), (0.075 if w else 0.088)),
         "neck": 0.045 * k, "hipL": 0.062 * k, "kneeL": 0.046 * k, "ankL": 0.035 * k, "hipR": 0.062 * k, "kneeR": 0.046 * k, "ankR": 0.035 * k,
         "shL": 0.06 * k, "elL": 0.034 * k, "haL": 0.033 * k, "shR": 0.06 * k, "elR": 0.034 * k, "haR": 0.033 * k}
    N = list(P)
    m = PINK if w else BLUE
    T = 1.16
    r = {n: ((v[0] * T, v[1] * T) if isinstance(v, tuple) else v * T) for n, v in r.items()}
    skin("body", [P[n] for n in N], [(N.index(a), N.index(b)) for a, b in E], [r[n] for n in N], m, sub=3)
    # mitten hands with a small thumb, rounded feet
    for s in (-1, 1):
        hx = s * (sw + 0.05)
        sphere("hand", (hx, -0.01, z(0.755)), 0.038 * 1.16 * k, m, (0.75, 0.62, 1.2))
        sphere("thumb", (hx - s * 0.02, -0.032, z(0.775)), 0.016 * 1.16 * k, m, (0.8, 0.8, 1.4), (0.3, 0, 0))
        sphere("foot", (s * 0.075, -0.03, 0.04), 0.052 * 1.16 * k, m, (0.75, 1.4, 0.62))
    # head
    R = 0.195 * k
    H = Vector((0, -0.005, z(1.3) + 0.01 + R))
    sphere("head", H, R, m, (0.97, 0.98, 1.03))
    F = (0, -1, 0)
    for s in (-1, 1):                     # open eyes: glossy dark ovals + brows
        sphere("eye", on_head(H, R, (s * 0.36, -1, 0.12), -0.006), 0.022 * k, INK, (0.85, 0.5, 1.2))
        arc(on_head(H, R, (s * 0.38, -1, 0.42), 0.002), on_head(H, R, (s * 0.38, -1, 0.42)) - H, (0, 0, 1), 0.036 * k, 0.0055, 20, 160, INK)
    arc(on_head(H, R, (0, -1, -0.38), 0.002), on_head(H, R, (0, -1, -0.38)) - H, (0, 0, 1), 0.04 * k, 0.0065, 205, 335, INK)   # smile
    if w:
        # hair on the head = part of the head itself: a raised region with a soft colour/shape blend into the face
        head = [o for o in made if o.name.startswith("head")][-1]
        bpy.ops.object.select_all(action="DESELECT"); head.select_set(True); bpy.context.view_layer.objects.active = head
        sub_ = head.modifiers.new("sub", "SUBSURF"); sub_.levels = sub_.render_levels = 1
        bpy.ops.object.modifier_apply(modifier="sub")
        me = head.data
        col = me.color_attributes.new("hairmask", "FLOAT_COLOR", "POINT")
        def window(d):    # >0 outside the face opening (hair), <0 inside (face)
            if d.y >= -0.05: return 1.0
            e = ((d.x / 0.8) ** 2 + (d.z / 0.72) ** 2) ** 0.5 - 1 if d.z >= 0 else abs(d.x) / 0.8 - 1
            if d.z < -0.2: e = min(e, -0.2 - d.z - 0.0) if abs(d.x) < 0.8 else e   # jaw stays skin
            return e
        def sstep(a, b, x):
            t = min(1, max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t)
        for v, c in zip(me.vertices, col.data):
            d = v.co.normalized()
            h = sstep(-0.02, 0.1, window(d))
            if d.z < -0.35 and d.y < 0.4: h = min(h, sstep(-0.6, -0.35, d.z))       # no hair under the chin
            part = sstep(0.0, 0.06, abs(d.x)) if (d.z > 0.45 and d.y < 0.35) else 1.0  # soft centre part
            v.co = v.co * (1 + 0.075 * h * (0.75 + 0.25 * part))
            c.color = (h, h, h, 1)
        # material: mix skin and hair by the mask
        hm = bpy.data.materials.new("skin_hair"); hm.use_nodes = True; nt = hm.node_tree
        bsdf = nt.nodes["Principled BSDF"]; attr = nt.nodes.new("ShaderNodeAttribute"); attr.attribute_name = "hairmask"
        mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"
        mix.inputs[6].default_value = PINK.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value
        mix.inputs[7].default_value = HAIR.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value
        nt.links.new(attr.outputs["Fac"], mix.inputs[0]); nt.links.new(mix.outputs[2], bsdf.inputs["Base Color"])
        bsdf.inputs["Roughness"].default_value = 0.42; bsdf.inputs["Subsurface Weight"].default_value = 0.06
        head.data.materials.clear(); head.data.materials.append(hm)
        # the hanging part: ONE closed smooth mass (a deformed sphere) - hugs the back of the head, falls to just below
        # the shoulders, comes forward only at the sides (frames the face), stays behind the neck in front; rounded ends
        bottom = -((H.z - R) - (z(1.22) - 0.13)) - R              # z of the hair ends, relative to the head centre
        def sstep(a, b, x):
            t = min(1, max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t)
        bpy.ops.mesh.primitive_uv_sphere_add(segments=128, ring_count=64, radius=1.0, location=(0, 0, 0))
        hs = bpy.context.active_object; hs.name = "hair"
        L = -bottom
        for v in hs.data.vertices:
            d = v.co.normalized()
            # cap over the skull: just inside the raised hair of the head; pulled well inside at the face
            back_bump = 0.09 * sstep(-0.2, 0.6, d.y) * (1 - sstep(0.05, 0.95, d.z))  # meets the curtain without a seam
            cap = d * R * (1.03 + back_bump - 0.16 * sstep(-0.05, -0.45, d.y))
            if d.z >= 0: v.co = cap; continue
            s = -d.z
            h = Vector((d.x, d.y, 0)); h = h.normalized() if h.length > 1e-6 else Vector((0, 1, 0))
            rho = (1 - s ** 6) ** 0.3                                   # keeps the width, rounds off only at the very end
            zz = -L * s ** 0.85
            env = 1.13 * R * max(0.0, 1 - (zz / (1.13 * R)) ** 2) ** 0.5   # around the skull: stay just outside the head
            def smax(p_, q_, k_=0.12 * R): return (p_ + q_ + ((p_ - q_) ** 2 + k_ * k_) ** 0.5) / 2
            tt = min(1.0, -zz / L)                                      # 0 at the head centre .. 1 at the ends
            rx = R * (1.13 - 0.06 * tt) * rho                           # width: one smooth line from the head down

            x = h.x * rx
            yb = R * (1.13 - 0.36 * tt ** 1.4) * rho                    # back profile: one convex curve from the crown to the ends
            if h.y >= 0:
                y = h.y * yb
            else:   # front half: same depth at the sides (no crease), then curves back behind the neck in the middle
                u = math.atan2(-h.y, abs(h.x)) / (math.pi / 2)           # 0 at the side .. 1 straight ahead
                y = h.y * (yb - (yb + R * 0.30 * rho) * sstep(0.0, 0.55, u))   # sides stay behind the shoulders
            curtain = Vector((x, y, zz))
            bl = sstep(0.0, 0.45, s)                                    # blend from the skull cap into the curtain
            v.co = cap.lerp(curtain, bl)
        smooth(hs)
        sub_h = hs.modifiers.new("sub", "SUBSURF"); sub_h.levels = sub_h.render_levels = 2
        hs.location = H; hs.data.materials.append(HAIR)
        # fuse head + hair into ONE surface (voxel remesh) and soften the junction, so there is no seam at the sides;
        # the hair/skin colour mask is copied back from the original head
        src = head.copy(); src.data = head.data.copy(); sc.collection.objects.link(src); src.hide_render = True; src.hide_viewport = True
        bpy.ops.object.select_all(action="DESELECT"); hs.select_set(True); bpy.context.view_layer.objects.active = hs
        bpy.ops.object.modifier_apply(modifier="sub")
        head.select_set(True); bpy.context.view_layer.objects.active = head
        bpy.ops.object.join()
        rm = head.modifiers.new("remesh", "REMESH"); rm.mode = "VOXEL"; rm.voxel_size = 0.0035; rm.use_smooth_shade = True
        bpy.ops.object.modifier_apply(modifier="remesh")
        sm = head.modifiers.new("smooth", "SMOOTH"); sm.factor = 0.6; sm.iterations = 12
        bpy.ops.object.modifier_apply(modifier="smooth")
        head.data.color_attributes.new("hairmask", "FLOAT_COLOR", "POINT")
        dt = head.modifiers.new("mask", "DATA_TRANSFER"); dt.object = src
        dt.use_vert_data = True; dt.data_types_verts = {"COLOR_VERTEX"}; dt.vert_mapping = "POLYINTERP_NEAREST"
        dt.layers_vcol_vert_select_src = "ALL"; dt.layers_vcol_vert_select_dst = "NAME"
        bpy.ops.object.modifier_apply(modifier="mask")
        # everything outside the original skull or hanging below it is hair; the face keeps the copied mask
        Mw = head.matrix_world.copy()
        for v, c in zip(head.data.vertices, head.data.color_attributes["hairmask"].data):
            q = Mw @ v.co - H; dist = q.length
            hm_ = max(c.color[0], sstep(1.02 * R, 1.07 * R, dist), sstep(-0.82 * R, -0.95 * R, q.z) * sstep(-0.25 * R, -0.05 * R, q.y))
            # side hairline: one line from the temple down the cheek into the front edge of the hanging hair
            yl = -0.10 * R - 0.65 * R * sstep(-1.1 * R, 0.5 * R, q.z)
            hm_ = max(hm_, sstep(yl - 0.03 * R, yl + 0.03 * R, q.y) * sstep(0.45 * R, 0.6 * R, abs(q.x)) * (1 - sstep(0.45 * R, 0.6 * R, q.z)))
            c.color = (hm_, hm_, hm_, 1)
        head.data.materials.clear(); head.data.materials.append(hm); smooth(head)
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
