# 03 Tuer -- "Wie du die Tuer erfunden hast". Scene and timeline.
#
#   blender -b -P tuer_scene.py -- <CYCLES|BLENDER_EEVEE> <samples> <out.png> <GPU|CPU> [time]
#   blender --python view.py   -- tuer_scene.py                      (live in the window)
#
# The timeline is driven by the voice: T('Wort', n) is the start of the n-th word beginning
# with Wort, exactly as in the three.js engine. Until the voice is ordered, words.py estimates
# the timings from script_de.txt, so every number below stays valid when the real one lands.
import bpy, sys, os, math, random

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import scene_lib as L
from words import Words

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ENGINE = argv[0] if argv else 'CYCLES'
SAMPLES = int(argv[1]) if len(argv) > 1 else 32
OUT = argv[2] if len(argv) > 2 else 'tuer.png'
DEVICE = argv[3] if len(argv) > 3 else 'GPU'
TIMES = [float(x) for x in argv[4].split(',')] if len(argv) > 4 else [20.0]   # one still, or a list

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

WD = Words('04_tuer')
T = WD.T
END = WD.end()

# ---------- the moments the picture hangs on ----------
tw = dict(
    hoehle=T('Höhle'),
    wind_rein=T('Wind', 1), wolf=T('Wolf'),
    fell=T('Fell', 1), sturm=T('Sturm'), fell_weg=T('weht'),
    bretter=T('Bretter'), platte=T('Platte'),
    schleppen=T('schleppen'),
    zapfen=T('Zapfen'), schwingt=T('schwingt'),
    wind_drueckt=T('Wind', 2),
    rahmen=T('Rahmen'), anschlag=T('Anschlag'),
    nachbar=T('Nachbar'),
    riegel=T('Riegel', 1),
    raus=T('rausgehst'),
    stifte=T('Stifte'), schluessel=T('Schlüssel'),
    klopft=T('klopft'),
    loch=T('Loch', 2), linse=T('Linse'),
    theater=T('Theater'), druecken=T('drücken'),
    umdrehen=T('drehst'), aussen=T('außen'),
    ende=T('Glückwunsch'),
)

# ---------- materials ----------
# Texture scale is the mapping scale: bigger number = smaller stones. At .22 the wall looked
# like boulders a metre across, so the rock sits at 1.8 and the grass is finer still.
rock = L.pbr('rock', 'stone_wall_diff_1k.jpg', 'stone_wall_nor_gl_1k.jpg', 1.8, (.62, .58, .52, 1), .95, 1.6)
wood = L.pbr('wood', 'wood_planks_diff_1k.jpg', 'wood_planks_nor_gl_1k.jpg', 1.3, (.66, .45, .25, 1), .8)
wood_dark = L.pbr('wood_dark', 'wood_planks_diff_1k.jpg', 'wood_planks_nor_gl_1k.jpg', 1.3, (.34, .22, .12, 1), .85)
grass = L.pbr('grass', 'leafy_grass_detail_1k.jpg', 'leafy_grass_nor_gl_1k.jpg', .8, (.22, .42, .13, 1), .95, .8)
hide = L.flat('hide', (.46, .33, .2, 1), .9)
# Not pure black: an unlit tunnel reads as a hole punched in the render rather than a room.
dark = L.flat('dark', (.085, .07, .055, 1), 1)
stone_grey = L.flat('stone_grey', (.42, .4, .38, 1), .9)
iron = L.flat('iron', (.32, .33, .35, 1), .45, 1)
brass = L.flat('brass', (.72, .55, .22, 1), .3, 1)
glasslens = L.flat('lens', (.8, .9, 1, 1), .05)
fur = L.flat('fur', (.3, .29, .3, 1), .9)
skin = L.flat('skin', (.86, .64, .48, 1), .55)
tunic_you = L.flat('tunic_you', (.30, .09, .07, 1), .9)
tunic_nb = L.flat('tunic_nb', (.07, .13, .26, 1), .9)
tunic_crowd = L.flat('tunic_crowd', (.12, .12, .14, 1), .9)
smoke_mat = L.volume('smoke', (.6, .6, .62, 1), .45)

# ---------- the hill with a cave mouth ----------
# The rock face looks at -Y; the camera stands on that side. The opening is 1.8 m wide, 2.1 m high.
OX, OZ = 1.0, 2.2                                  # half width, height of the opening
L.box(-40, 40, -24, 2, -3, 0, grass, 'ground_front', bevel=0)

# Real blades on the ground the camera actually sees. The photo texture alone averaged out to
# a flat green at any distance; geometry is what makes it read as grass.
# GRASS=0 renders without the scatter: it costs about 2 s a frame, which is an extra hour
# over a full video, and for checking camera and timing it is not needed.
GRASS = os.environ.get('GRASS', '1') != '0'
blade_mat = L.varied_material('blade', [(.10, .26, .05, 1), (.16, .36, .08, 1),
                                       (.21, .42, .10, 1), (.28, .44, .13, 1)])
blade = L.grass_blade(blade_mat, w=.022, h=.17)
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, -8.0, .01))
lawn = bpy.context.object
lawn.name = 'lawn'
lawn.scale = (38, 26, 1)
bpy.ops.object.transform_apply(scale=True)
lawn.data.materials.append(grass)
if GRASS:
    L.scatter(lawn, blade, count=200000, seed=4, size=1.0, size_random=.5)

# A grass mound over the cave, with the doorway cut out of it. Two earlier attempts are worth
# remembering: plain boxes read as a brick wall, and jittered slabs read as scattered blocks.
# A displaced sphere with a boolean hole is what finally reads as a hill with a cave in it.
bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=32, radius=13, location=(0, 12, -4.4))
hill = bpy.context.object
hill.name = 'hill'
hill.scale = (1.6, 1.1, .80)
bpy.ops.object.transform_apply(scale=True)
bpy.ops.object.shade_smooth()
hill.data.materials.append(grass)
noise = bpy.data.textures.new('hill_noise', 'CLOUDS')
noise.noise_scale = 5.0
dsp = hill.modifiers.new('disp', 'DISPLACE')
dsp.texture, dsp.strength, dsp.mid_level = noise, 1.7, .5

# The hill gets blades too, otherwise the lawn ends in a visible line where the slope starts.
# use_modifier_stack makes the particles follow the displaced, boolean-cut surface -- which
# also means the tunnel walls are emitting surface, and grass grew inside the cave. This
# vertex group zeroes the density around the mouth; the boolean's new faces inherit it.
vg = hill.vertex_groups.new(name='grass_mask')
for v in hill.data.vertices:
    co = v.co
    # Keep the bare patch tight: at 3 m the whole slope above the door went bald.
    near_mouth = abs(co.x) < 1.9 and co.y < 2.6 and co.z < 3.2
    # Only the front of the mound is ever on camera. Spreading the blades over the whole
    # 13 m sphere left the visible slope thin; this puts them where they are seen.
    front = co.y < 8.0 and co.z < 8.0
    vg.add([v.index], 0.0 if (near_mouth or not front) else 1.0, 'REPLACE')
if GRASS:
    hill_ps = L.scatter(hill, blade, count=220000, seed=9, size=1.0, size_random=.5, name='grass_hill')
    hill_ps.settings.use_modifier_stack = True
    hill_ps.vertex_group_density = 'grass_mask'

cutter = L.box(-OX, OX, -1.5, 9.0, 0, OZ, dark, 'cutter', bevel=0)
cutter.hide_render = cutter.hide_viewport = True
bl = hill.modifiers.new('cut', 'BOOLEAN')
bl.object, bl.operation = cutter, 'DIFFERENCE'
for solver in ('FLOAT', 'FAST', 'EXACT'):          # 4.x calls it FAST, 5.x FLOAT
    try:
        bl.solver = solver
        break
    except TypeError:
        pass

# A rock surround, so the cut edge is stone and not grass. Three neat boxes read as a picture
# frame stuck on the hill, so it is built from blocks of different depth, size and tilt, with
# the arch following the opening and a couple of boulders breaking the top corners.
random.seed(23)


def rock_block(cx, cz, w, h, out, tilt):
    b = L.box(cx - w, cx + w, -out, .45, cz - h, cz + h, rock, 'rock_%.2f_%.2f' % (cx, cz), bevel=.09)
    b.rotation_euler = (random.uniform(-.06, .06), tilt, random.uniform(-.05, .05))
    return b


# The blocks overlap: stepping by a full block height left green gaps between them and the
# surround looked like loaves of bread stacked beside the hole.
z = -.2
while z < OZ + .5:                                  # jambs: a stack of blocks up each side
    h = random.uniform(.2, .34)
    for sx in (-1, 1):
        w = random.uniform(.3, .46)
        rock_block(sx * (OX + w - .13), z + h, w, h, random.uniform(.02, .16),
                   random.uniform(-.06, .06))
    z += h
x = -OX - .42                                       # lintel: blocks across the top
while x < OX + .42:
    w = random.uniform(.24, .4)
    hh = random.uniform(.2, .32)
    rock_block(x + w, OZ + .24 + random.uniform(-.06, .1), w, hh, random.uniform(.02, .18),
               random.uniform(-.05, .05))
    x += 1.35 * w
for bx, bz, br in ((-OX - .62, OZ + .5, .34), (OX + .66, OZ + .44, .3),
                   (-OX - .72, .3, .3), (OX + .76, .22, .27)):
    b = L.ball(bx, .12, bz, br, rock, 'rock_corner')
    b.scale = (1.0, .7, .8)
random.seed(5)
for i in range(9):                                 # loose rocks at the foot of the mound
    bx = math.copysign(random.uniform(1.5, 7.0), random.choice((-1, 1)))
    b = L.ball(bx, random.uniform(-1.2, .6), random.uniform(.0, .5), random.uniform(.3, .8),
               rock, 'boulder_%d' % i)
    b.scale = (1.1, .9, .7)
L.box(-OX, OX, .3, 8.8, -.02, .06, dark, 'cave_floor', bevel=0)
cave = L.box(-OX - .05, OX + .05, 1.2, 8.9, 0, OZ + .05, dark, 'cave_dark', bevel=0)

# ---------- the hide over the entrance ----------
fell = L.box(-OX + .05, OX - .05, -.06, -.02, .05, OZ - .05, hide, 'fell', bevel=.02)
fell.location.z += 0                                # animated by rotating about the lintel
fell_pivot = L.empty(0, -.04, OZ - .05, 'fell_pivot')
fell.parent = fell_pivot
fell.matrix_parent_inverse = fell_pivot.matrix_world.inverted()

# ---------- the plank slab, later the door ----------
hinge = L.empty(-OX + .08, .12, 0, 'hinge')         # the door turns about this
door = L.box(.02, 2 * OX - .18, -.06, .0, .04, OZ - .08, wood, 'door', bevel=.03)
door.parent = hinge
door.matrix_parent_inverse = hinge.matrix_world.inverted()
for i in range(4):                                  # cross battens, so it reads as planks nailed together
    L.box(.04, 2 * OX - .2, -.08, -.06, .25 + i * .5, .38 + i * .5, wood_dark,
          'batten_%d' % i, bevel=.02, parent=door)
# The real door: a CC0 Poly Haven model, used once the doorway gets a frame. The rough
# plank slab above stays for the earlier beats -- the story is a slab becoming a door.
door_real = L.character('../models/large_castle_door/large_castle_door_2k.gltf',
                        0, 0, 0, 0, None, 'door_real')
if L.has_rig(door_real) or 'head' not in door_real.keys():
    bpy.context.view_layer.update()
    from mathutils import Vector as _V
    _zs = [(o.matrix_world @ _V(b)).z for o in [door_real] + door_real.children_recursive
           if o.type == 'MESH' for b in o.bound_box]
    _h = (max(_zs) - min(_zs)) if _zs else 1.0
    _s = (OZ - .05) / _h
    door_real.scale = (_s, _s, _s)
    door_real['base_scale'] = _s
    door_real.parent = hinge
    door_real.matrix_parent_inverse = hinge.matrix_world.inverted()
    door_real.location = (.06, .02, 0)

pivot_stone = L.cyl(-OX + .08, .12, .04, .22, .1, stone_grey, 'pivot_stone', verts=20)
pivot_top = L.cyl(-OX + .08, .12, OZ - .02, .09, .08, stone_grey, 'pivot_top', verts=16)
pin_bot = L.cyl(0, 0, -.02, .06, .14, wood_dark, 'pin_bot', parent=door, verts=12)
pin_bot.location = (.03, -.03, .0)

# ---------- frame with a stop ----------
frame = L.empty(0, 0, 0, 'frame')
L.box(-OX - .02, -OX + .14, .0, .18, 0, OZ + .14, wood_dark, 'frame_l', bevel=.02, parent=frame)
L.box(OX - .14, OX + .02, .0, .18, 0, OZ + .14, wood_dark, 'frame_r', bevel=.02, parent=frame)
L.box(-OX - .02, OX + .02, .0, .18, OZ, OZ + .14, wood_dark, 'frame_top', bevel=.02, parent=frame)
L.box(-OX + .12, OX - .12, .12, .17, .02, OZ, wood_dark, 'stop', bevel=.015, parent=frame)   # Anschlag

# ---------- bolt, lock pins, key ----------
riegel = L.empty(0, 0, 0, 'riegel_grp')
bolt = L.box(-.3, .3, .11, .145, 1.02, 1.09, iron, 'bolt', bevel=.012, parent=riegel)
L.box(-.46, -.38, .10, .155, .97, 1.14, iron, 'bolt_keep_l', bevel=.012, parent=riegel)
L.box(.38, .46, .10, .155, .97, 1.14, iron, 'bolt_keep_r', bevel=.012, parent=riegel)
pins = L.empty(0, 0, 0, 'pins_grp')
for i in range(3):
    p = L.cyl(-.16 + i * .16, .13, 1.26, .022, .22, iron, 'pin_%d' % i, verts=10, parent=pins)
    p.location = (-.16 + i * .16, .13, 1.26)
pin_house = L.box(-.26, .26, .08, .18, 1.14, 1.4, wood_dark, 'pin_house', bevel=.02, parent=pins)
key = L.empty(0, 0, 0, 'key_grp')
L.box(-.2, .2, .11, .15, .98, 1.04, wood_dark, 'key_shaft', bevel=.015, parent=key)
for i in range(3):
    L.box(-.18 + i * .16, -.14 + i * .16, .115, .145, 1.04, 1.14, iron,
          'key_tooth_%d' % i, bevel=.01, parent=key)

# ---------- peephole ----------
spion = L.empty(0, 0, 0, 'spion_grp')
L.cyl(.25, -.04, 1.55, .035, .12, dark, 'spion_hole', rot=(math.radians(90), 0, 0), verts=16, parent=spion)
L.cyl(.25, -.09, 1.55, .045, .02, glasslens, 'spion_lens', rot=(math.radians(90), 0, 0), verts=16, parent=spion)
L.cyl(.25, -.1, 1.55, .055, .01, brass, 'spion_ring', rot=(math.radians(90), 0, 0), verts=16, parent=spion)

# ---------- people ----------
# Rigged characters when they are in blender/assets/people, primitive stand-ins otherwise.
# The placeholders are the weakest part of the picture -- @oddtilt and @kerozni carry their
# shots on real animated people, and here people are on screen almost the whole time.
def actor(filename, x, y, rot, h, cloth, name, phase=0.0):
    root = L.character(filename, x, y, 0, rot, h, name)
    if 'head' in root.keys():                       # a placeholder: colour it by hand
        for key, mat in (('body', cloth), ('hip', cloth), ('leg_l', cloth), ('leg_r', cloth)):
            m = L.limb(root, key).data.materials
            m.clear()
            m.append(cloth)
    else:
        L.character_loop(root, phase, END + 2)      # its own phase, so the crowd is not in lockstep
    return root


def pose(root, t, speed, swing):
    if not L.has_rig(root):                         # placeholder: swing the limbs by hand
        L.walk(root, t, speed, swing)               # rigged ones are driven by advance_time(t)


you = actor('you.fbx', -.35, -1.5, math.radians(180), 1.75, tunic_you, 'you')
nachbar = actor('nachbar.fbx', .45, -3.2, math.radians(180), 1.78, tunic_nb, 'nachbar', .4)
# Five people at the door: staggered in depth and phase, turned a little towards the middle,
# and close enough that their hands are on the planks rather than on thin air beside them.
# Four, not five: the pushing animation leans a long way forward, and five across a two-metre
# door put shoulders through each other.
CROWD = [(-1.3, -1.25, -16), (-.45, -1.05, -6), (.45, -1.05, 6), (1.3, -1.25, 16)]
crowd = [actor('crowd.fbx', cx, cy, math.radians(180 + a), 1.68 + (i % 3) * .05,
               tunic_crowd, 'crowd_%d' % i, i * .43)
         for i, (cx, cy, a) in enumerate(CROWD)]

# ---------- the wolf ----------
wolf = L.empty(2.6, -4.0, 0, 'wolf')
wolf.rotation_euler = (0, 0, math.radians(200))
wb = L.cyl(0, 0, .62, .17, .92, fur, 'wolf_body', rot=(math.radians(90), 0, 0), verts=14, parent=wolf)
wb.location = (0, 0, .62)
wh = L.ball(0, -.52, .72, .15, fur, 'wolf_head', parent=wolf)
L.cyl(0, -.66, .66, .07, .22, fur, 'wolf_snout', rot=(math.radians(90), 0, 0), verts=10, parent=wolf)
for sx in (-1, 1):
    for sy in (-1, 1):
        lg = L.cyl(sx * .11, sy * .3, .3, .045, .6, fur, 'wolf_leg', verts=8, parent=wolf)
        lg.location = (sx * .11, sy * .3, .3)
L.cyl(0, .58, .76, .05, .4, fur, 'wolf_tail', rot=(math.radians(55), 0, 0), verts=8, parent=wolf)
for sx in (-1, 1):
    ear = L.cyl(sx * .08, -.5, .86, .05, .12, fur, 'wolf_ear', verts=6, parent=wolf)
    ear.location = (sx * .08, -.5, .86)
eyes = [L.ball(sx * .07, -.64, .76, .025, L.flat('eye', (1, .75, .15, 1), .3, emit=((1, .7, .1, 1), 3)),
               'wolf_eye', parent=wolf) for sx in (-1, 1)]

# ---------- smoke for the theatre beat (no fire on screen, this plays to a young audience) ----------
# It has to drift out above the doorway and sit against the sky, not inside the dark tunnel,
# or it is invisible. Grey and translucent rather than black.
smoke = L.empty(0, -.1, OZ + .15, 'smoke_grp')
random.seed(11)
for i in range(14):                                # a puff hugging the rock, not a line of balls
    px = random.uniform(-1.3, 1.3)
    pz = random.uniform(.0, 1.5)
    py = random.uniform(-.5, .2)
    s = L.ball(px, py, pz, random.uniform(.25, .55), smoke_mat, 'smoke_%d' % i, parent=smoke)
    s.location = (px, py, pz)

# A dim bounce inside the cave: a pure black hole reads as a hole in the render, not as a room.
cave_light = L.empty(0, 2.2, 1.2, 'cave_light_grp')
bpy.ops.object.light_add(type='POINT', location=(0, 2.2, 1.3))
cl_obj = bpy.context.object
cl_obj.name = 'cave_light'
cl_obj.data.energy = 40
cl_obj.data.color = (1, .72, .42)
cl_obj.data.shadow_soft_size = .6
cl_obj.parent = cave_light

# ---------- world, camera, render ----------
# Photographic setup, not the cartoon one: HDRI fills the shadows, a 35 mm lens sits
# close to the subject and depth of field follows the look-at point.
world, sun = L.hdri_world(sc)
cam, tgt = L.camera(sc, lens=35, dof=6.0, fstop=3.5)
L.focus_on(cam, tgt)

# Camera. In a 1080x1920 frame the doorway needs room above it, so the wide keys sit further
# back and higher than they would in a landscape shot.
KEYS = [
    (0.0,               (1.2, -17.0, 5.6), (0, .5, 2.4)),     # the hillside and the cave mouth
    (tw['wolf'],        (3.4, -13.0, 3.6), (.6, .2, 1.8)),    # night, the wolf trots up
    (tw['fell'],        (0.0, -11.0, 4.0), (0, .2, 2.0)),     # the hide goes up
    (tw['bretter'],     (-2.2, -9.5, 3.4), (0, .2, 1.8)),     # planks nailed together
    (tw['zapfen'],      (-2.6, -4.6, 1.3), (-.8, .2, .5)),    # down to the pivot stone
    (tw['rahmen'],      (0.4, -8.0, 3.2), (0, .2, 1.8)),      # back to the whole doorway
    (tw['nachbar'],     (2.6, -8.6, 3.0), (.3, -.8, 1.8)),    # the neighbour walks in
    (tw['riegel'],      (1.3, -3.0, 1.7), (.1, .1, 1.1)),     # close on the bolt
    (tw['stifte'],      (0.6, -2.0, 1.5), (0, .1, 1.22)),     # closer still: the pins
    (tw['klopft'],      (-1.4, -6.0, 2.4), (0, 0, 1.7)),      # someone knocks
    (tw['loch'],        (1.0, -1.9, 1.68), (.25, 0, 1.56)),   # the peephole
    (tw['theater'],     (1.0, -14.0, 5.0), (0, .3, 2.2)),     # pull back, the crowd presses
    (tw['umdrehen'],    (-4.0, -12.0, 4.0), (0, .2, 2.0)),    # the door turns the other way
    (END,               (1.2, -16.0, 5.2), (0, .4, 2.3)),
]


def update(t):
    L.advance_time(t)                                     # drives every rig's NLA strip at once
    L.cam_at(cam, tgt, KEYS, t)

    # night for the wolf beat, day again once the hide is up
    # Night has to be pushed hard: AgX lifts the shadows, and at sun 0.25 the frame still
    # looked like an overcast afternoon. Exposure comes down with it.
    night = L.win(t, tw['wind_rein'] - .5, tw['fell'] + .6, .5)
    sun.data.energy = L.lerp(2.0, .05, night)
    sun.data.color = L.vlerp((1, .96, .9), (.5, .64, 1), night)[:3]
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = L.lerp(.85, .02, night)
    sc.view_settings.exposure = L.lerp(-0.1, -2.2, night)

    # the hide: hangs from the lintel, flaps in the wind, then is blown away
    k_fell = L.win(t, tw['fell'], tw['fell_weg'] + .5, .25)
    L.show(fell_pivot, k_fell)
    flap = math.sin(t * 7) * .12 * L.ramp(t, tw['sturm'] - .3, tw['sturm'] + .4)
    blow = L.ease(t, tw['fell_weg'], tw['fell_weg'] + .7)
    fell_pivot.rotation_euler = (flap + blow * 2.6, 0, 0)
    fell_pivot.location = (blow * 5.5, -.04 - blow * 2.0, (OZ - .05) + blow * 1.6)

    # the slab: leaning in front of the hole, dragged aside, then standing on the pivot
    on_pivot = L.ease(t, tw['zapfen'], tw['zapfen'] + .8)
    drag = L.win(t, tw['schleppen'], tw['zapfen'], .35)
    L.show(hinge, L.ramp(t, tw['bretter'], tw['bretter'] + .4))
    hinge.location = (L.lerp(-OX + .08 - .1, -OX + .08, on_pivot) + drag * 1.9,
                      L.lerp(-.35, .12, on_pivot), 0)
    lean = L.lerp(-.14, 0, on_pivot)                      # at first it just leans on the rock
    swing = 0.0
    if t > tw['schwingt']:
        swing = math.sin((t - tw['schwingt']) * 2.2) * .5 * L.win(t, tw['schwingt'], tw['wind_drueckt'], .4)
    if t > tw['wind_drueckt']:                            # the wind pushes it inwards
        swing = L.ease(t, tw['wind_drueckt'], tw['wind_drueckt'] + .6) * 1.15
    if t > tw['anschlag']:                                # the stop holds it shut
        swing *= 1 - L.ease(t, tw['anschlag'], tw['anschlag'] + .5)
    if t > tw['nachbar']:                                 # the neighbour pushes it open again
        swing = L.win(t, tw['nachbar'], tw['riegel'], .4) * 1.0
    if t > tw['umdrehen']:                                # and at the end it opens outwards
        swing = -L.ease(t, tw['umdrehen'], tw['aussen'] + .4) * 1.1
    hinge.rotation_euler = (lean, 0, swing)

    for o, a, b in ((pivot_stone, tw['zapfen'] - .2, END), (pivot_top, tw['zapfen'] - .2, END)):
        L.show(o, L.ramp(t, a, a + .4))
    L.show(frame, L.ramp(t, tw['rahmen'], tw['rahmen'] + .5))
    swap = L.ramp(t, tw['rahmen'] - .2, tw['rahmen'] + .4)   # slab becomes a real door
    L.show(door, 1 - swap)
    L.show(door_real, swap)
    L.show(riegel, L.ramp(t, tw['riegel'], tw['riegel'] + .4))
    L.show(pins, L.ramp(t, tw['stifte'], tw['stifte'] + .4))
    L.show(key, L.win(t, tw['schluessel'], tw['klopft'], .35))
    L.show(spion, L.ramp(t, tw['loch'], tw['loch'] + .4))
    L.show(smoke, L.win(t, tw['theater'], END, .6))

    # the bolt slides shut, the key lifts the pins
    riegel.location = (L.lerp(-.42, 0, L.ease(t, tw['riegel'], tw['riegel'] + .7)), 0, 0)
    lift = math.sin(max(0.0, t - tw['schluessel']) * 3) * .5 + .5
    lift *= L.win(t, tw['schluessel'], tw['klopft'], .3)
    for i in range(3):
        bpy.data.objects['pin_%d' % i].location.z = 1.26 + lift * .1
    key.location = (L.lerp(-.9, 0, L.ease(t, tw['schluessel'], tw['schluessel'] + .6)), 0, 0)

    # people
    L.show(you, L.win(t, 0, tw['theater'], .4))
    you.location = (-.35, L.lerp(-1.5, -2.4, L.ease(t, tw['bretter'], tw['zapfen'])), 0)
    pose(you, t, 1.2, .18)

    nb_in = L.win(t, tw['nachbar'] - .3, tw['raus'], .4)
    L.show(nachbar, nb_in)
    nachbar.location = (.45, L.lerp(-4.2, -.6, L.ease(t, tw['nachbar'], tw['nachbar'] + 1.2)), 0)
    pose(nachbar, t, 2.4, .5)

    push = L.win(t, tw['theater'], END, .5)
    arrive = L.ease(t, tw['theater'], tw['druecken'] + .4)
    for i, p in enumerate(crowd):
        L.show(p, push)
        cx, cy, _a = CROWD[i]
        p.location = (cx, L.lerp(cy - 3.4 - i * .35, cy, arrive), 0)
        pose(p, t + i * .3, 3.0, .55)

    # the wolf trots up to the cave, then leaves when the hide goes up
    k_wolf = L.win(t, tw['wolf'] - .4, tw['fell'] + .3, .35)
    L.show(wolf, k_wolf)
    wolf.location = (L.lerp(3.4, 1.5, L.ease(t, tw['wolf'], tw['fell'])),
                     L.lerp(-5.2, -3.4, L.ease(t, tw['wolf'], tw['fell'])), 0)


L.render_setup(sc, ENGINE, SAMPLES, DEVICE, OUT)
L.photographic(sc)
L.lens_look(sc)
update(TIMES[0])
print('SCENE ready, timings estimated:', WD.estimated(), '| end', round(END, 1), 's')

import time
t0 = time.time()
if len(TIMES) == 1:
    bpy.ops.render.render(write_still=True)
    print('RENDER_SECONDS', sc.render.engine, round(time.time() - t0, 1))
else:
    stem, ext = os.path.splitext(OUT)
    for t in TIMES:                       # the scene is built once, only update(t) runs per frame
        update(t)
        sc.render.filepath = '%s_%05.1f%s' % (stem, t, ext)
        ti = time.time()
        bpy.ops.render.render(write_still=True)
        print('STILL %5.1f s  %4.1f s' % (t, time.time() - ti), flush=True)
    print('RENDER_SECONDS total', round(time.time() - t0, 1))
