"""Scenes for video 01 'Chamäleon-Effekt': dark monochrome rooms (les.zamours-like), the two figures posed per shot.
blender -b -P scenes.py -- <out_dir> <samples> <res_scale> <shot,shot,...|all>
writes <out_dir>/<shot>.png (1080x1920 * res_scale). Shots are defined in SHOTS at the bottom."""
import bpy, sys, os, math
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = argv[0] if argv else "/tmp/scenes"
SAMPLES = int(argv[1]) if len(argv) > 1 else 32
SCALE = float(argv[2]) if len(argv) > 2 else 1.0
WHICH = argv[3] if len(argv) > 3 else "all"
HERE = os.path.dirname(__file__)
sys.path.insert(0, HERE)
os.makedirs(OUT, exist_ok=True)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    import importlib, figlib, poses
    importlib.reload(figlib); importlib.reload(poses)
    return figlib, poses


# ---------------------------------------------------------------- set pieces (all one grey family, like the reference)
def build_world(F, light="night"):
    sc = bpy.context.scene
    G = lambda name, v, r=0.6: F.mat(name, (v, v, v * 1.08), r)
    m = dict(floor=G("floor", 0.06, 0.5), wall=G("wall", 0.085, 0.8), furn=G("furn", 0.11, 0.7), dark=G("dark", 0.035, 0.6),
             fabric=G("fabric", 0.13, 0.9), wood=F.mat("wood", (0.10, 0.085, 0.08), 0.55),
             cup=F.mat("cup", (0.75, 0.75, 0.78), 0.3), lampm=F.mat("lampm", (0.9, 0.85, 0.75), 0.4))
    w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (0.008, 0.01, 0.018, 1)
    return m


def box(F, name, loc, size, m, bevel=0.03):
    bpy.ops.mesh.primitive_cube_add(location=loc); o = bpy.context.active_object; o.name = name
    o.scale = (size[0] / 2, size[1] / 2, size[2] / 2); bpy.ops.object.transform_apply(scale=True)
    b = o.modifiers.new("bev", "BEVEL"); b.width = bevel; b.segments = 5
    F.smooth(o); o.data.materials.append(m); return o


def cyl(F, name, loc, r, h, m):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=loc, vertices=48); o = bpy.context.active_object
    b = o.modifiers.new("bev", "BEVEL"); b.width = min(0.01, r / 3); b.segments = 3
    F.smooth(o); o.data.materials.append(m); return o


def room(F, m, w=7.0, d=6.0, h=3.0):
    box(F, "floor", (0, 0.5, -0.05), (w, d, 0.1), m["floor"], 0.0)
    box(F, "back", (0, 2.6, h / 2), (w, 0.1, h), m["wall"], 0.0)
    box(F, "left", (-3.2, 0.5, h / 2), (0.1, d, h), m["wall"], 0.0)
    for i in range(6):                                         # wall panels for texture
        box(F, "panel", (-2.6 + i * 1.05, 2.53, 1.5), (0.9, 0.04, 2.6), m["wall"], 0.01)


def area(name, loc, target, energy, size, col=(1, 0.92, 0.85)):
    L = bpy.data.objects.new(name, bpy.data.lights.new(name, "AREA")); L.data.energy = energy; L.data.size = size; L.data.color = col
    L.location = loc; L.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.collection.objects.link(L); return L


def point(name, loc, energy, col=(1.0, 0.78, 0.55), r=0.08):
    L = bpy.data.objects.new(name, bpy.data.lights.new(name, "POINT")); L.data.energy = energy; L.data.color = col; L.data.shadow_soft_size = r
    L.location = loc; bpy.context.scene.collection.objects.link(L); return L


def floor_lamp(F, m, x, y):
    cyl(F, "lampbase", (x, y, 0.02), 0.16, 0.04, m["dark"]); cyl(F, "lamppole", (x, y, 0.8), 0.015, 1.6, m["dark"])
    bpy.ops.mesh.primitive_cone_add(radius1=0.22, radius2=0.14, depth=0.28, location=(x, y, 1.62), vertices=48)
    o = bpy.context.active_object; F.smooth(o); o.data.materials.append(m["lampm"])
    point("lamp", (x, y, 1.52), 60)


def sofa(F, m, x=0.0, y=0.6, wdt=2.2):
    box(F, "sofa_base", (x, y, 0.22), (wdt, 0.95, 0.3), m["fabric"], 0.08)
    box(F, "sofa_back", (x, y + 0.42, 0.62), (wdt, 0.22, 0.6), m["fabric"], 0.1)
    for s in (-1, 1): box(F, "sofa_arm", (x + s * (wdt / 2 - 0.1), y + 0.02, 0.47), (0.24, 0.92, 0.42), m["fabric"], 0.1)
    for s in (-1, 1): box(F, "cushion", (x + s * wdt / 4.4, y - 0.05, 0.42), (wdt / 2.3, 0.82, 0.12), m["fabric"], 0.05)
    return 0.48                                                     # seat height


def coffee_table(F, m, x=0.0, y=-0.3):
    box(F, "ctable", (x, y, 0.36), (1.0, 0.5, 0.05), m["dark"], 0.02)
    for s in (-1, 1): box(F, "cleg", (x + s * 0.42, y, 0.18), (0.05, 0.4, 0.36), m["dark"], 0.01)


def mug(F, m, loc):
    cyl(F, "mug", (loc[0], loc[1], loc[2] + 0.05), 0.04, 0.1, m["cup"])


def table_scene(F, m):
    box(F, "table", (0, 0, 0.74), (0.8, 0.7, 0.05), m["wood"], 0.02)
    for sx in (-1, 1):
        for sy in (-1, 1): box(F, "tleg", (sx * 0.33, sy * 0.28, 0.37), (0.05, 0.05, 0.74), m["wood"], 0.01)
    return 0.74


def chair(F, m, x, y, back_dx=0.0):
    """back_dx: the backrest sits at x + back_dx (the sitter faces the other way)"""
    box(F, "chair_seat", (x, y, 0.45), (0.46, 0.44, 0.06), m["dark"], 0.02)
    box(F, "chair_back", (x + back_dx, y, 0.75), (0.05, 0.46, 0.58), m["dark"], 0.02)
    for sx in (-1, 1):
        for sy in (-1, 1): box(F, "cleg", (x + sx * 0.19, y + sy * 0.18, 0.22), (0.04, 0.04, 0.44), m["dark"], 0.01)
    return 0.48


def bed(F, m, y=0.6):
    box(F, "bed_frame", (0, y, 0.2), (1.9, 2.2, 0.3), m["dark"], 0.06)
    box(F, "mattress", (0, y, 0.45), (1.8, 2.1, 0.22), m["fabric"], 0.08)
    box(F, "headboard", (0, y + 1.12, 0.85), (2.0, 0.12, 1.1), m["fabric"], 0.08)
    for s in (-1, 1): box(F, "pillow", (s * 0.42, y + 0.78, 0.62), (0.7, 0.4, 0.14), m["fabric"], 0.07)
    for s in (-1, 1):
        box(F, "nightstand", (s * 1.25, y + 0.8, 0.25), (0.45, 0.4, 0.5), m["dark"], 0.03)
    point("nlamp", (-1.25, y + 0.8, 0.75), 25)
    cyl(F, "nlampm", (-1.25, y + 0.8, 0.62), 0.09, 0.2, m["lampm"])
    return 0.56


def duvet(F, m, y=0.6, top=0.62, cover_to=0.45):
    """a soft duvet over the lower part of the bed, cover_to = fraction of the bed length it covers (from the foot)"""
    L = 2.1 * cover_to
    box(F, "duvet", (0, y - 1.05 + L / 2, top - 0.08), (1.86, L, 0.26), m["fabric"], 0.11)


def park(F, m):
    sc = bpy.context.scene
    box(F, "ground", (0, 2, -0.05), (14, 14, 0.1), m["floor"], 0.0)
    box(F, "path", (0, 2, 0.002), (1.6, 14, 0.01), m["furn"], 0.0)
    for i in range(7):
        for s in (-1, 1):
            x, y = s * (1.6 + (i % 2) * 0.6), -1.5 + i * 1.6
            cyl(F, "trunk", (x, y, 1.0), 0.07, 2.0, m["dark"])
            bpy.ops.mesh.primitive_uv_sphere_add(radius=0.75, location=(x, y, 2.3)); o = bpy.context.active_object
            o.scale = (1, 1, 1.15); F.smooth(o); o.data.materials.append(m["dark"])
    for y in (0.0, 4.0):
        cyl(F, "lamp", (1.1, y, 1.4), 0.03, 2.8, m["dark"]); point("plamp", (1.1, y, 2.75), 120)
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.1, location=(1.1, y, 2.82)); o = bpy.context.active_object; o.data.materials.append(m["lampm"])


def bench(F, m, x=0.0, y=0.6):
    box(F, "bench_seat", (x, y, 0.44), (1.6, 0.45, 0.06), m["wood"], 0.015)
    box(F, "bench_back", (x, y + 0.24, 0.72), (1.6, 0.05, 0.4), m["wood"], 0.015)
    for s in (-1, 1): box(F, "bench_leg", (x + s * 0.7, y, 0.21), (0.06, 0.42, 0.42), m["dark"], 0.01)
    return 0.47


# ---------------------------------------------------------------- camera, light, render
def setup_render(cam_pos, cam_tgt, lens=40, dof=None, fstop=2.8):
    sc = bpy.context.scene
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
    cam.data.lens = lens; cam.location = cam_pos
    cam.rotation_euler = (Vector(cam_tgt) - Vector(cam_pos)).to_track_quat("-Z", "Y").to_euler()
    if dof:
        cam.data.dof.use_dof = True; cam.data.dof.focus_distance = dof; cam.data.dof.aperture_fstop = fstop
    sc.render.engine = "CYCLES"; sc.cycles.device = "CPU"; sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = True
    sc.render.resolution_x, sc.render.resolution_y = 1080, 1920; sc.render.resolution_percentage = int(SCALE * 100)
    sc.view_settings.view_transform = "AgX"; sc.view_settings.look = "AgX - Medium High Contrast"; sc.view_settings.exposure = -0.75


def key_lights(target=(0, 0.4, 0.9)):
    area("key", (-1.8, -2.4, 2.8), target, 260, 1.8)
    area("fill", (2.2, -2.0, 1.5), target, 70, 2.0, (0.7, 0.78, 1.0))
    area("rim", (0.4, 2.0, 2.6), target, 140, 1.5, (0.75, 0.82, 1.0))


def place(F, w, pose, loc, rot_z=0.0, face=None, head_rot=(0, 0, 0), rot_x=0.0, rot_y=0.0):
    return F.group(F.figure(w, pose, face, head_rot), loc, math.radians(rot_z), math.radians(rot_x), math.radians(rot_y))


# ---------------------------------------------------------------- shots
def S_sofa(F, P, her, him, her_face=None, him_face=None, her_head=(0, 0, 0), him_head=(0, 0, 0), cam=((0.0, -3.2, 1.25), (0, 0.45, 0.8)), lens=42, dx=0.36, table=True, mugs=0):
    m = build_world(F); room(F, m); seat = sofa(F, m); floor_lamp(F, m, 1.55, 1.2)
    if table: coffee_table(F, m)
    for i in range(mugs): mug(F, m, (-0.15 + 0.3 * i, -0.3, 0.385))
    place(F, True, her(seat), (-dx, 0.62, 0), 0, her_face, her_head)
    place(F, False, him(seat), (dx, 0.62, 0), 0, him_face, him_head)
    key_lights((0, 0.6, 0.8)); setup_render(*cam, lens=lens, dof=(Vector(cam[0]) - Vector((0, 0.6, 0.9))).length, fstop=2.2)


def S_table(F, P, her, him, her_face=None, him_face=None, her_head=(0, 0, 0), him_head=(0, 0, 0), cam=((0.0, -2.6, 1.35), (0, 0.0, 0.95)), lens=30):
    m = build_world(F); room(F, m)
    th = table_scene(F, m)
    seat = chair(F, m, -0.62, 0.0, -0.22); chair(F, m, 0.62, 0.0, 0.22)
    place(F, True, her(seat), (-0.62, 0.0, 0), 90, her_face, her_head)
    place(F, False, him(seat), (0.62, 0.0, 0), -90, him_face, him_head)
    for x in (-0.2, 0.2): mug(F, m, (x, -0.05, th + 0.025))
    point("pend", (0, 0, 1.75), 90); cyl(F, "pendant", (0, 0, 1.85), 0.16, 0.12, m["lampm"]); cyl(F, "cord", (0, 0, 2.4), 0.006, 1.0, m["dark"])
    key_lights((0, 0, 0.9)); setup_render(*cam, lens=lens, dof=(Vector(cam[0]) - Vector((0, 0, 1.0))).length, fstop=2.4)


def S_bed(F, P, her_side, him_side, her_face=None, him_face=None, her_head=(0, 0, 0), him_head=(0, 0, 0), cam=((0.0, 0.45, 2.3), (0.0, 1.32, 0.7)), lens=27):
    """her_side/him_side: 'back' (on the back) | 'left' (on the left side, facing screen-left) | 'right' """
    m = build_world(F); room(F, m); bedtop = bed(F, m)
    for w, x, side, face, hr in ((True, -0.36, her_side, her_face, her_head), (False, 0.38, him_side, him_face, him_head)):
        ry = {"back": 0, "left": -90, "right": 90}[side]
        kneel = P.lie(0.0 if side == "back" else 0.12, "body")
        place(F, w, kneel, (x, 0.12, bedtop + (0.10 if side == "back" else 0.2)), 0, face, hr, rot_x=-90, rot_y=ry)
    duvet(F, m, cover_to=0.79, top=0.86)
    area("moon", (2.6, -0.5, 2.6), (0, 0.8, 0.5), 160, 2.0, (0.65, 0.75, 1.0))
    key_lights((0, 0.9, 0.6)); setup_render(*cam, lens=lens, dof=(Vector(cam[0]) - Vector((0, 1.0, 0.7))).length, fstop=2.6)


def S_park(F, P, her, him, her_face=None, him_face=None, her_head=(0, 0, 0), him_head=(0, 0, 0), sitting=False, cam=((0.2, -3.0, 1.2), (0, 0.6, 0.9)), lens=40, dx=0.34, yy=0.6, her_rot=0, him_rot=0):
    m = build_world(F); park(F, m)
    if sitting:
        seat = bench(F, m, 0, yy)
        place(F, True, her(seat), (-dx, yy, 0), her_rot, her_face, her_head)
        place(F, False, him(seat), (dx, yy, 0), him_rot, him_face, him_head)
    else:
        place(F, True, her, (-dx, yy, 0), her_rot, her_face, her_head)
        place(F, False, him, (dx, yy, 0), him_rot, him_face, him_head)
    area("moon", (-3, 2, 4), (0, 0.6, 1), 200, 3, (0.6, 0.7, 1.0))
    key_lights((0, 0.6, 1.0)); setup_render(*cam, lens=lens, dof=(Vector(cam[0]) - Vector((0, yy, 1.0))).length, fstop=2.2)


def run(name, fn):
    F, P = reset()
    fn(F, P)
    sc = bpy.context.scene; sc.render.filepath = os.path.join(OUT, name + ".png")
    bpy.ops.render.render(write_still=True); print("DONE", name)


def lap(P):  return lambda s: P.sit(s)
SHOTS = {
    # 0-4.7  hook: both sit exactly alike, same tilt
    "s01_mirror_sofa": lambda F, P: S_sofa(F, P, lambda s: P.sit(s, cross="R"), lambda s: P.sit(s, cross="R"),
                                           her_head=(0, -8, 8), him_head=(0, -8, 8), cam=((0.0, -3.0, 1.15), (0, 0.5, 0.8)), lens=40),
    # 4.7-8.4  'lustige Angewohnheit': kitchen table, both chin on hand, smiling at each other
    "s02_table_chin": lambda F, P: S_table(F, P, lambda s: P.sit(s, arms=dict(R=((0.12, -0.2, 0.95), (0.18, -0.25, 0.8)))),
                                           lambda s: P.sit(s, arms=dict(L=((-0.12, -0.2, 0.95), (-0.18, -0.25, 0.8)))),
                                           her_head=(0, 6, 0), him_head=(0, -6, 0)),
    # 8.4-11.9  'etwas sehr Schönes': she leans her head on his shoulder
    "s03_shoulder": lambda F, P: S_sofa(F, P, lambda s: P.sit(s, lean=(12, 0)), lambda s: P.sit(s), her_face=dict(eyes="closed"),
                                        her_head=(0, 22, 0), dx=0.24, cam=((-0.3, -2.2, 1.35), (0, 0.6, 1.1)), lens=50),
    # 11.9-16.3  term: in bed, both on the back, same posture, faces turned to each other
    "s04_bed_same": lambda F, P: S_bed(F, P, "back", "back", dict(eyes="closed"), dict(eyes="closed"), (30, 0, -15), (30, 0, -15)),
    # 16.3-21.6  'spiegeln einander': face to face at the table, the same head tilt
    "s05_table_mirror": lambda F, P: S_table(F, P, lambda s: P.sit(s, lean=(0, 8)), lambda s: P.sit(s, lean=(0, 8)),
                                             her_head=(0, 10, 0), him_head=(0, -10, 0), cam=((0.0, -2.3, 1.25), (0, 0.0, 1.05)), lens=34),
    # 21.6-26.4  Haltung, Gesten, Atem: close, eyes closed, breathing together
    "s06_breath": lambda F, P: S_sofa(F, P, lambda s: P.sit(s), lambda s: P.sit(s), dict(eyes="closed"), dict(eyes="closed"),
                                      (0, -6, 0), (0, 6, 0), dx=0.3, cam=((0.0, -1.9, 1.3), (0, 0.6, 1.15)), lens=50, table=False),
    # 26.4-31.1  researchers: on the park bench, talking
    "s07_bench": lambda F, P: S_park(F, P, lambda s: P.sit(s), lambda s: P.sit(s), dict(mouth="open"), None, (0, 0, -20), (0, 0, 20), sitting=True),
    # 31.1-36.4  'fühlt sich verstanden': his hand on hers? -> she smiles, he leans in
    "s08_understood": lambda F, P: S_sofa(F, P, lambda s: P.sit(s, lean=(-6, 0)), lambda s: P.sit(s, lean=(6, 0)), None, None,
                                          (0, 0, -25), (0, 0, 25), dx=0.32, cam=((0.0, -2.4, 1.3), (0, 0.6, 1.0)), lens=46, table=False),
    # 36.4-40.6  both reach for the cup at the same moment
    "s09_cup": lambda F, P: S_table(F, P, lambda s: P.sit(s, lean=(0, 12), arms=dict(R=((0.05, -0.40, 0.80), (0.18, -0.2, 0.88)))),
                                    lambda s: P.sit(s, lean=(0, 12), arms=dict(L=((-0.05, -0.40, 0.80), (-0.18, -0.2, 0.88)))),
                                    dict(eyes="open"), None, (0, 0, -10), (0, 0, 10), cam=((0.0, -2.3, 1.5), (0, 0.0, 0.9)), lens=32),
    # 40.6-44.1  legs crossed the same way on the sofa
    "s10_legs": lambda F, P: S_sofa(F, P, lambda s: P.sit(s, cross="L"), lambda s: P.sit(s, cross="L"), None, None,
                                    (0, 0, -15), (0, 0, 15), cam=((0.9, -2.6, 0.75), (0, 0.4, 0.55)), lens=40),
    # 44.1-48.3  walking in step
    "s11_walk": lambda F, P: S_park(F, P, P.stand(stride=0.18), P.stand(stride=0.18), None, None, (0, 0, -12), (0, 0, 12),
                                    cam=((1.4, -2.8, 1.25), (0, 0.6, 0.95)), lens=42, dx=0.3),
    # 48.3-52.0  in bed, same position (both on the left side)
    "s12_bed_spoon": lambda F, P: S_bed(F, P, "back", "back", dict(eyes="closed"), dict(eyes="closed"), (30, 0, 30), (30, 0, 30)),
    # 52.0-57.7  he starts, she follows: he leans his head, she leans too
    "s13_he_starts": lambda F, P: S_sofa(F, P, lambda s: P.sit(s, lean=(6, 0)), lambda s: P.sit(s, lean=(-8, 0)), None, None,
                                         (0, 10, -10), (0, -12, 10), dx=0.3, cam=((0.0, -2.6, 1.2), (0, 0.6, 0.95)), lens=44, table=False),
    # 57.7-60.4  'niemand führt': standing, holding both hands, face to face
    "s14_hands": lambda F, P: S_park(F, P, P.stand(arms=dict(L=((-0.02, -0.20, 1.02), None), R=((0.06, -0.20, 1.02), None))),
                                     P.stand(arms=dict(L=((-0.06, -0.22, 1.08), None), R=((0.02, -0.22, 1.08), None))),
                                     dict(eyes="closed"), dict(eyes="closed"), cam=((0.0, -2.4, 1.3), (0, 0.6, 1.2)), lens=45,
                                     dx=0.2, her_rot=80, him_rot=-80),
    # 60.4-64.0  mirroring stops: he turns away, she turns to him
    "s15_turn_away": lambda F, P: S_sofa(F, P, lambda s: P.sit(s, lean=(-5, 0)), lambda s: P.sit(s, lean=(8, 0)),
                                         dict(mouth="sad"), dict(mouth="flat"), (0, 0, -30), (0, 0, 60), dx=0.4),
    # 64.0-68.0  in bed: he on his side away from her, she on her back looking at him
    "s16_bed_away": lambda F, P: S_bed(F, P, "back", "back", dict(mouth="sad"), dict(eyes="open", mouth="flat"), (30, 0, -35), (15, 0, -75)),
    # 68.0-73.6  end: park bench, sitting apart, looking different ways
    "s17_end": lambda F, P: S_park(F, P, lambda s: P.sit(s), lambda s: P.sit(s), dict(mouth="sad"), dict(mouth="flat"),
                                   (0, 0, 35), (0, 0, 35), sitting=True, cam=((0.0, -3.6, 1.3), (0, 0.6, 0.9)), lens=36, dx=0.55),
}

names = list(SHOTS) if WHICH == "all" else WHICH.split(",")
for n in names: run(n, SHOTS[n])
