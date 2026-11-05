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

WD = Words('03_tuer')
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
dark = L.flat('dark', (.02, .018, .015, 1), 1)
stone_grey = L.flat('stone_grey', (.42, .4, .38, 1), .9)
iron = L.flat('iron', (.32, .33, .35, 1), .45, 1)
brass = L.flat('brass', (.72, .55, .22, 1), .3, 1)
glasslens = L.flat('lens', (.8, .9, 1, 1), .05)
fur = L.flat('fur', (.3, .29, .3, 1), .9)
skin = L.flat('skin', (.86, .64, .48, 1), .55)
tunic_you = L.flat('tunic_you', (.30, .09, .07, 1), .9)
tunic_nb = L.flat('tunic_nb', (.07, .13, .26, 1), .9)
tunic_crowd = L.flat('tunic_crowd', (.12, .12, .14, 1), .9)
smoke_mat = L.flat('smoke', (.1, .1, .11, 1), 1)

# ---------- the hill with a cave mouth ----------
# The rock face looks at -Y; the camera stands on that side. The opening is 1.8 m wide, 2.1 m high.
OX, OZ = 1.0, 2.2                                  # half width, height of the opening
L.box(-40, 40, -24, 2, -3, 0, grass, 'ground_front', bevel=0)

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

# a rock collar around the mouth, so the cut edge is stone and not grass
L.box(-OX - .95, -OX + .06, -.3, .4, -.2, OZ + .95, rock, 'collar_l', bevel=.14)
L.box(OX - .06, OX + .95, -.3, .4, -.2, OZ + .95, rock, 'collar_r', bevel=.14)
L.box(-OX - .95, OX + .95, -.3, .4, OZ - .06, OZ + .95, rock, 'collar_top', bevel=.14)
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
you = L.person(-.35, -1.5, 0, math.radians(180), 1.75, skin, tunic_you, 'you')
nachbar = L.person(.45, -3.2, 0, math.radians(180), 1.78, skin, tunic_nb, 'nachbar')
crowd = [L.person(-1.6 + i * .8, -2.4 - (i % 2) * .5, 0, math.radians(180 + (i - 2) * 12),
                  1.7 + (i % 3) * .05, skin, tunic_crowd, 'crowd_%d' % i) for i in range(5)]

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

# ---------- smoke for the theatre beat (no fire on screen) ----------
smoke = L.empty(0, 3.0, 0, 'smoke_grp')
for i in range(6):
    s = L.ball(-.6 + i * .25, 2.6 + (i % 2) * .5, 2.2 + i * .35, .45 + i * .06, smoke_mat,
               'smoke_%d' % i, parent=smoke)

# ---------- world, camera, render ----------
world, sun = L.sky_sun(sc)
cam, tgt = L.camera(sc, lens=34)

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
    L.cam_at(cam, tgt, KEYS, t)

    # night for the wolf beat, day again once the hide is up
    # Night has to be pushed hard: AgX lifts the shadows, and at sun 0.25 the frame still
    # looked like an overcast afternoon. Exposure comes down with it.
    night = L.win(t, tw['wind_rein'] - .5, tw['fell'] + .6, .5)
    sun.data.energy = L.lerp(1.1, .05, night)
    sun.data.color = L.vlerp((1, .96, .9), (.5, .64, 1), night)[:3]
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = L.lerp(.16, .012, night)
    sc.view_settings.exposure = L.lerp(-0.5, -2.0, night)

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
    L.walk(you, t, 1.2, .18)

    nb_in = L.win(t, tw['nachbar'] - .3, tw['raus'], .4)
    L.show(nachbar, nb_in)
    nachbar.location = (.45, L.lerp(-4.2, -.6, L.ease(t, tw['nachbar'], tw['nachbar'] + 1.2)), 0)
    L.walk(nachbar, t, 2.4, .5)

    push = L.win(t, tw['theater'], END, .5)
    for i, p in enumerate(crowd):
        L.show(p, push)
        p.location = (-1.6 + i * .8,
                      L.lerp(-5.0 - i * .4, -1.5 - (i % 2) * .35,
                             L.ease(t, tw['theater'], tw['druecken'] + .4)), 0)
        L.walk(p, t + i * .3, 3.0, .55)

    # the wolf trots up to the cave, then leaves when the hide goes up
    k_wolf = L.win(t, tw['wolf'] - .4, tw['fell'] + .3, .35)
    L.show(wolf, k_wolf)
    wolf.location = (L.lerp(3.4, 1.5, L.ease(t, tw['wolf'], tw['fell'])),
                     L.lerp(-5.2, -3.4, L.ease(t, tw['wolf'], tw['fell'])), 0)


L.render_setup(sc, ENGINE, SAMPLES, DEVICE, OUT)
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
