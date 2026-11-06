# Shared scene building blocks for the Blender videos: materials, primitives, people,
# sky, camera rig and render settings. Mirrors engine/lib.js so the timelines read the same.
import bpy, math, os, random
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
A = os.path.join(HERE, '..', 'engine', 'assets') + os.sep
W, H, FPS = 1080, 1920, 30


# ---------- easing, the same helpers the three.js timelines use ----------
def cl(x):
    return 0.0 if x < 0 else (1.0 if x > 1 else x)


def ramp(t, a, b):
    return cl((t - a) / (b - a)) if b != a else (1.0 if t >= b else 0.0)


def sm(x):
    return x * x * (3 - 2 * x)


def ease(t, a, b):
    return sm(ramp(t, a, b))


def lerp(a, b, k):
    return a + (b - a) * k


def vlerp(a, b, k):
    return tuple(lerp(x, y, k) for x, y in zip(a, b))


def win(t, a, b, f=0.3):
    return ramp(t, a, a + f) * (1 - ramp(t, b - f, b))


def pop(t, a, d=0.35):
    x = cl(ramp(t, a, a + d))
    c = 1.7
    return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2


def show(obj, k):
    """Scales an object in (pop-style) and hides it below a threshold. Hiding a parent does
    not hide its children in Blender, so the children are switched off explicitly."""
    off = k <= 0.002
    obj.hide_render = obj.hide_viewport = off
    for ch in obj.children_recursive:
        ch.hide_render = ch.hide_viewport = off
    # An imported character carries its own scale (Mixamo exports in centimetres and the
    # height fit is a scale too). Multiplying keeps it instead of resetting it to 1.
    base = obj.get('base_scale', 1.0)
    s = max(k, 0.001) * base
    obj.scale = (s, s, s)


# ---------- materials ----------
def img(name, non_color=False):
    im = bpy.data.images.load(A + name, check_existing=True)
    if non_color:
        im.colorspace_settings.name = 'Non-Color'
    return im


def pbr(name, diff, nor, scale=1.0, tint=(1, 1, 1, 1), rough=.9, ns=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    N, L = nt.nodes, nt.links
    b = N['Principled BSDF']
    tc = N.new('ShaderNodeTexCoord')
    mp = N.new('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = (scale,) * 3
    L.new(tc.outputs['Object'], mp.inputs['Vector'])
    d = N.new('ShaderNodeTexImage')
    d.image = img(diff)
    d.projection = 'BOX'
    d.projection_blend = .2
    L.new(mp.outputs['Vector'], d.inputs['Vector'])
    mix = N.new('ShaderNodeMix')
    mix.data_type = 'RGBA'
    mix.blend_type = 'MULTIPLY'
    mix.inputs['Factor'].default_value = 1
    L.new(d.outputs['Color'], mix.inputs['A'])
    mix.inputs['B'].default_value = tint
    L.new(mix.outputs['Result'], b.inputs['Base Color'])
    n = N.new('ShaderNodeTexImage')
    n.image = img(nor, True)
    n.projection = 'BOX'
    n.projection_blend = .2
    L.new(mp.outputs['Vector'], n.inputs['Vector'])
    nm = N.new('ShaderNodeNormalMap')
    nm.inputs['Strength'].default_value = ns
    L.new(n.outputs['Color'], nm.inputs['Color'])
    L.new(nm.outputs['Normal'], b.inputs['Normal'])
    b.inputs['Roughness'].default_value = rough
    return m


def volume(name, col=(.55, .55, .58, 1), density=.5):
    """A smoke/haze material. Solid spheres with a grey surface shader read as white blobs,
    which is what a first attempt at smoke looked like; this shades the inside instead."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        if n.type != 'OUTPUT_MATERIAL':
            nt.nodes.remove(n)
    out = nt.nodes['Material Output']
    pv = nt.nodes.new('ShaderNodeVolumePrincipled')
    pv.inputs['Color'].default_value = col
    pv.inputs['Density'].default_value = density
    nt.links.new(pv.outputs['Volume'], out.inputs['Volume'])
    return m


def flat(name, col, rough=.6, metal=0.0, emit=None):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = col
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if emit:
        b.inputs['Emission Color'].default_value = emit[0]
        b.inputs['Emission Strength'].default_value = emit[1]
    return m


# ---------- primitives ----------
def box(x0, x1, y0, y1, z0, z1, mat, name='box', bevel=.04, parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2))
    o = bpy.context.object
    o.scale = (x1 - x0, y1 - y0, z1 - z0)
    o.name = name
    bpy.ops.object.transform_apply(scale=True)
    if bevel:
        bv = o.modifiers.new('bev', 'BEVEL')
        bv.width, bv.segments = bevel, 2
    o.data.materials.append(mat)
    if parent:
        o.parent = parent
    return o


def cyl(x, y, z, r, h, mat, name='cyl', rot=(0, 0, 0), verts=24, parent=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h, location=(x, y, z), rotation=rot)
    o = bpy.context.object
    o.name = name
    o.data.materials.append(mat)
    if parent:
        o.parent = parent
    return o


def ball(x, y, z, r, mat, name='ball', parent=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=r, location=(x, y, z))
    o = bpy.context.object
    o.name = name
    bpy.ops.object.shade_smooth()
    o.data.materials.append(mat)
    if parent:
        o.parent = parent
    return o


def varied_material(name, colors, rough=.85):
    """A material whose colour is picked per instance from a ramp by Object Info > Random.

    One flat green over a hundred thousand blades reads as a painted surface; real grass is
    never one colour. Same trick works for rubble or a crowd's clothes."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    info = nt.nodes.new('ShaderNodeObjectInfo')
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    nt.links.new(info.outputs['Random'], ramp.inputs['Fac'])
    els = ramp.color_ramp.elements
    while len(els) > 1:
        els.remove(els[-1])
    for i, c in enumerate(colors):
        pos = i / max(len(colors) - 1, 1)
        el = els[0] if i == 0 else els.new(pos)
        el.position, el.color = pos, c
    nt.links.new(ramp.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = rough
    return m


def grass_material(name, colors, translucency=.35):
    """Grass shader: colour varies per instance, and light passes through the blade.

    Translucency is most of why real grass reads as grass -- a blade with the sun behind it
    glows, an opaque one just goes dark. A flat diffuse green is what made the first attempt
    look like painted chips."""
    m = varied_material(name, colors, rough=.6)
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    ramp = next(n for n in nt.nodes if n.type == 'VALTORGB')
    out = nt.nodes['Material Output']
    trans = nt.nodes.new('ShaderNodeBsdfTranslucent')
    nt.links.new(ramp.outputs['Color'], trans.inputs['Color'])
    mix = nt.nodes.new('ShaderNodeMixShader')
    mix.inputs['Fac'].default_value = translucency
    nt.links.new(b.outputs['BSDF'], mix.inputs[1])
    nt.links.new(trans.outputs['BSDF'], mix.inputs[2])
    nt.links.new(mix.outputs['Shader'], out.inputs['Surface'])
    return m


def grass_tuft(mat, blades=7, h=.26, w=.012, lean=.09, segments=4, spread=.05,
               seed=1, name='tuft'):
    """A clump of curved, tapering blades as one mesh.

    Three-sided cones scattered one by one read as green confetti: they have no width to
    catch light along, no curve, and they sit evenly spaced like a brush. A blade here is a
    strip that narrows to a point and bends over, and they come in clumps, which is how
    grass actually grows."""
    rnd = random.Random(seed)
    verts, faces = [], []
    for b in range(blades):
        yaw = rnd.uniform(0, 2 * math.pi)
        bh = h * rnd.uniform(.55, 1.25)
        bl = lean * rnd.uniform(.4, 1.8)
        ox, oy = rnd.uniform(-spread, spread), rnd.uniform(-spread, spread)
        base = len(verts)
        for i in range(segments + 1):
            t = i / segments
            half = w * (1 - t) ** .7 / 2
            fwd = bl * t * t                       # bends over as it rises
            z = bh * t * (1 - .18 * t)
            cx, cy = math.cos(yaw), math.sin(yaw)
            px, py = ox + fwd * cx, oy + fwd * cy
            verts.append((px - half * cy, py + half * cx, z))
            verts.append((px + half * cy, py - half * cx, z))
        for i in range(segments):
            a = base + i * 2
            faces.append((a, a + 1, a + 3, a + 2))
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(mat)
    o.hide_render = o.hide_viewport = True         # only the instances are rendered
    return o


def grass_blade(mat, w=.035, h=.26, name='blade'):
    """One blade: a narrow three-sided spike. Cheap enough to instance by the tens of thousands."""
    # Tried pointing the blade along +X in case hair aligned the instance's X axis: the render
    # was identical, so the orientation is not what makes the blades read as flat specks.
    bpy.ops.mesh.primitive_cone_add(vertices=3, radius1=w, radius2=0, depth=h, location=(0, 0, h / 2))
    o = bpy.context.object
    o.name = name
    o.data.materials.append(mat)
    o.hide_render = o.hide_viewport = True           # only the instances are rendered
    return o


def scatter(surface, blade, count=40000, seed=1, size=1.0, size_random=.6, name='grass'):
    """Scatters `blade` over `surface` with a hair particle system.

    A photo texture on a flat plane reads as a flat colour at any distance; the ground only
    starts to look like grass once there is real geometry catching the light."""
    ps = surface.modifiers.new(name, 'PARTICLE_SYSTEM').particle_system
    s = ps.settings
    s.type = 'HAIR'
    s.count = count
    s.hair_length = 1.0
    s.use_advanced_hair = True
    s.render_type = 'OBJECT'
    s.instance_object = blade
    s.particle_size = size
    s.size_random = size_random
    s.use_rotations = True
    s.rotation_mode = 'NOR'
    s.phase_factor_random = 2.0
    s.rotation_factor_random = .12                   # a little lean, not a lawn of pins
    s.child_type = 'NONE'
    ps.seed = seed
    return ps


def empty(x=0, y=0, z=0, name='grp'):
    bpy.ops.object.empty_add(location=(x, y, z))
    o = bpy.context.object
    o.name = name
    o.empty_display_size = .2
    return o


# ---------- a person: stylised, but with limbs so it reads as a human ----------
def person(x, y, z=0, rot=0, h=1.75, skin=None, cloth=None, name='person'):
    """Returns the root empty; limb(root, 'arm_l') and friends get the parts for posing."""
    skin = skin or flat('skin', (.85, .62, .45, 1), .55)
    cloth = cloth or flat('cloth', (.35, .28, .22, 1), .85)
    root = empty(x, y, z, name)
    root.rotation_euler = (0, 0, rot)
    s = h / 1.75
    parts = {}
    body = cyl(0, 0, 1.02 * s, .17 * s, .62 * s, cloth, name + '_body', parent=root, verts=16)
    body.location = (0, 0, 1.02 * s)
    parts['body'] = body
    parts['head'] = ball(0, 0, 1.47 * s, .13 * s, skin, name + '_head', parent=root)
    hip = cyl(0, 0, .70 * s, .16 * s, .22 * s, cloth, name + '_hip', parent=root, verts=16)
    hip.location = (0, 0, .70 * s)
    parts['hip'] = hip
    for side, sx in (('l', -1), ('r', 1)):
        leg = cyl(sx * .08 * s, 0, .33 * s, .065 * s, .66 * s, cloth,
                  '%s_leg_%s' % (name, side), parent=root, verts=12)
        leg.location = (sx * .08 * s, 0, .33 * s)
        parts['leg_' + side] = leg
        arm = cyl(sx * .23 * s, 0, 1.05 * s, .055 * s, .58 * s, skin,
                  '%s_arm_%s' % (name, side), parent=root, verts=12)
        arm.location = (sx * .23 * s, 0, 1.05 * s)
        parts['arm_' + side] = arm
    for k, v in parts.items():
        root[k] = v.name
    return root


def limb(root, key):
    return bpy.data.objects[root[key]]


# ---------- rigged characters (Mixamo FBX, Quaternius glTF, or a .blend) ----------
PEOPLE = os.path.join(HERE, 'assets', 'people')


def character(filename, x, y, z=0, rot=0, height=None, name='char'):
    """Imports a rigged character from blender/assets/people and returns its root object.

    Mixamo exports .fbx at 100x scale and Z-up already; Quaternius ships .gltf/.glb.
    When the file is not there yet this falls back to the primitive person(), so the scene
    keeps working and only looks worse."""
    path = os.path.join(PEOPLE, filename)
    if not os.path.exists(path):
        print('CHARACTER missing, using a placeholder:', path)
        return person(x, y, z, rot, height or 1.75, name=name)
    before = set(bpy.data.objects)
    ext = os.path.splitext(filename)[1].lower()
    if ext == '.fbx':
        bpy.ops.import_scene.fbx(filepath=path, automatic_bone_orientation=True)
    elif ext in ('.gltf', '.glb'):
        bpy.ops.import_scene.gltf(filepath=path)
    elif ext == '.obj':
        bpy.ops.wm.obj_import(filepath=path)
    else:
        raise ValueError('unsupported character file: ' + filename)
    new = [o for o in bpy.data.objects if o not in before]
    roots = [o for o in new if o.parent is None]
    root = roots[0] if len(roots) == 1 else empty(0, 0, 0, name + '_root')
    if len(roots) > 1:
        for o in roots:
            o.parent = root
    root.name = name
    root.location = (x, y, z)
    root.rotation_euler = (root.rotation_euler.x, root.rotation_euler.y, rot)
    s = root.scale.x
    if height:
        # Measure the world bounding box, not obj.dimensions: the meshes are parented to the
        # armature and their own dimensions are in the file's units (Mixamo exports in
        # centimetres), which made a 1.75 m person come out about 9 m tall.
        bpy.context.view_layer.update()
        zs = [(o.matrix_world @ Vector(b)).z for o in new if o.type == 'MESH' for b in o.bound_box]
        extent = (max(zs) - min(zs)) if zs else 0
        if extent > 1e-6:
            s = root.scale.x * height / extent
            root.scale = (s, s, s)
    root['base_scale'] = s                          # show() multiplies by this instead of overwriting
    print('CHARACTER %s: %d objects, scale %.4f' % (name, len(new), s))
    return root


def armature_of(root):
    return next((o for o in [root] + root.children_recursive if o.type == 'ARMATURE'), None)


def has_rig(root):
    return armature_of(root) is not None


def character_loop(root, phase=0.0, length=70.0):
    """Puts the character's action on an NLA strip that loops for the whole video, started
    `phase` seconds late.

    This is why it is not simply a playhead per character: posing a rig means setting the
    scene frame, and the scene frame is global, so the last character posed decided the pose
    of all of them -- five people pushing a door in exactly the same position. On NLA strips
    one global frame gives every character its own phase."""
    arm = armature_of(root)
    if arm is None or arm.animation_data is None or arm.animation_data.action is None:
        return False
    ad = arm.animation_data
    act = ad.action
    f0, f1 = act.frame_range
    span = max(f1 - f0, 1.0)
    ad.action = None                                 # the strip drives the rig from here on
    track = ad.nla_tracks.new()
    track.name = 'loop'
    strip = track.strips.new(act.name, int(round(phase * FPS)), act)
    strip.action_frame_start, strip.action_frame_end = f0, f1
    strip.repeat = max(1.0, (length * FPS) / span)   # cover the whole video
    strip.extrapolation = 'HOLD'
    strip.blend_type = 'REPLACE'
    return True


def advance_time(t):
    """Moves the scene frame, which is what every NLA strip is evaluated against. Called once
    per frame, not once per character."""
    bpy.context.scene.frame_set(int(round(t * FPS)))


def walk(root, t, speed=2.2, swing=.5):
    """Swings arms and legs so a person reads as walking."""
    a = math.sin(t * speed * math.pi) * swing
    limb(root, 'leg_l').rotation_euler = (a, 0, 0)
    limb(root, 'leg_r').rotation_euler = (-a, 0, 0)
    limb(root, 'arm_l').rotation_euler = (-a * .8, 0, 0)
    limb(root, 'arm_r').rotation_euler = (a * .8, 0, 0)


# ---------- world ----------
def sky_sun(sc, elevation=38, rotation=140, strength=.22, sun_energy=2.0,
            sun_rot=(52, 0, -40), sun_color=(1, .96, .9)):
    w = bpy.data.worlds.new('w')
    sc.world = w
    w.use_nodes = True
    sky = w.node_tree.nodes.new('ShaderNodeTexSky')
    for st in ('NISHITA', 'MULTIPLE_SCATTERING', 'SINGLE_SCATTERING'):   # 4.x: NISHITA, 5.x: MULTIPLE_SCATTERING
        try:
            sky.sky_type = st
            break
        except TypeError:
            pass
    for k, v in (('sun_elevation', math.radians(elevation)), ('sun_rotation', math.radians(rotation)),
                 ('air_density', 1.0), ('dust_density', .6)):
        try:
            setattr(sky, k, v)
        except (AttributeError, TypeError):
            pass
    nt = w.node_tree
    nt.links.new(sky.outputs['Color'], nt.nodes['Background'].inputs['Color'])
    nt.nodes['Background'].inputs['Strength'].default_value = strength
    bpy.ops.object.light_add(type='SUN', rotation=tuple(math.radians(a) for a in sun_rot))
    sun = bpy.context.object
    sun.data.energy = sun_energy
    sun.data.angle = math.radians(4)
    sun.data.color = sun_color
    return w, sun


def hdri_world(sc, hdri='kloofendal_48d_partly_cloudy_puresky_2k.hdr', strength=1.35,
               rotation=150, sun_energy=2.4, sun_rot=(46, 0, -55), sun_color=(1, .95, .86)):
    """HDRI as the light source and the background, plus one sun for crisp shadows.

    This is the single biggest difference between the cartoon look and a photographic one:
    a bare sun over a painted sky gives flat, plastic surfaces, because nothing fills the
    shadows. Returns (world, sun) like sky_sun()."""
    w = bpy.data.worlds.new('w')
    sc.world = w
    w.use_nodes = True
    nt = w.node_tree
    env = nt.nodes.new('ShaderNodeTexEnvironment')
    env.image = bpy.data.images.load(os.path.join(A, hdri), check_existing=True)
    texco = nt.nodes.new('ShaderNodeTexCoord')
    mp = nt.nodes.new('ShaderNodeMapping')
    mp.inputs['Rotation'].default_value[2] = math.radians(rotation)
    nt.links.new(texco.outputs['Generated'], mp.inputs['Vector'])
    nt.links.new(mp.outputs['Vector'], env.inputs['Vector'])
    nt.links.new(env.outputs['Color'], nt.nodes['Background'].inputs['Color'])
    nt.nodes['Background'].inputs['Strength'].default_value = strength
    bpy.ops.object.light_add(type='SUN', rotation=tuple(math.radians(a) for a in sun_rot))
    sun = bpy.context.object
    sun.data.energy = sun_energy
    sun.data.angle = math.radians(2.5)
    sun.data.color = sun_color
    return w, sun


def lens_look(sc, bloom=.3, distortion=-.012, dispersion=.006):
    """Compositor pass: bloom around highlights and a touch of barrel distortion.
    Cheap, and it is a lot of what separates a render from a frame of video."""
    ng = bpy.data.node_groups.new('Lens Look', 'CompositorNodeTree')
    ng.interface.new_socket('Image', in_out='OUTPUT', socket_type='NodeSocketColor')
    n, lk = ng.nodes, ng.links
    rl = n.new('CompositorNodeRLayers'); rl.scene = sc; rl.location = (-600, 0)
    gl = n.new('CompositorNodeGlare'); gl.location = (-300, 0)
    for key, val in (('Type', 'Bloom'), ('Quality', 'High'), ('Threshold', 1.2),
                     ('Smoothness', .4), ('Strength', bloom), ('Size', .55)):
        try:
            gl.inputs[key].default_value = val
        except (KeyError, TypeError):
            pass
    ld = n.new('CompositorNodeLensdist'); ld.location = (0, 0)
    for key, val in (('Distortion', distortion), ('Dispersion', dispersion), ('Fit', True)):
        try:
            ld.inputs[key].default_value = val
        except (KeyError, TypeError):
            pass
    out = n.new('NodeGroupOutput'); out.location = (300, 0)
    lk.new(rl.outputs['Image'], gl.inputs['Image'])
    lk.new(gl.outputs['Image'], ld.inputs['Image'])
    lk.new(ld.outputs['Image'], out.inputs[0])
    try:
        sc.compositing_node_group = ng                # Blender 5.x
        sc.render.use_compositing = True
    except AttributeError:
        print('lens_look: compositor node group API not on this build')
    return ng


def photographic(sc, exposure=1.2, look='AgX - Medium Contrast', bounces=8):
    """AgX and more light bounces. The cartoon scenes use Standard on purpose; realistic
    materials need AgX or the highlights clip and everything looks like painted plastic."""
    sc.view_settings.view_transform = 'AgX'
    try:
        sc.view_settings.look = look
    except TypeError:
        pass
    sc.view_settings.exposure = exposure
    if sc.render.engine == 'CYCLES':
        sc.cycles.max_bounces = bounces


def camera(sc, lens=32, dof=None, fstop=3.2):
    """dof: focus distance in metres, or None for everything in focus."""
    bpy.ops.object.camera_add(location=(0, 20, 6))
    cam = bpy.context.object
    sc.camera = cam
    cam.data.lens = lens
    if dof:
        cam.data.dof.use_dof = True
        cam.data.dof.focus_distance = dof
        cam.data.dof.aperture_fstop = fstop
    tgt = empty(0, 0, 2, 'cam_target')
    c = cam.constraints.new('TRACK_TO')
    c.target = tgt
    return cam, tgt


def focus_on(cam, target_obj):
    """Keeps depth of field on a moving subject: without this the focus plane stays where it
    was set and the subject drifts out of it as the camera moves."""
    cam.data.dof.focus_object = target_obj


def cam_at(cam, tgt, keys, t):
    """keys: [(time, (x,y,z), (tx,ty,tz)), ...] -- camera position and look-at, eased between keys."""
    if t <= keys[0][0]:
        cam.location, tgt.location = keys[0][1], keys[0][2]
        return
    for (t0, p0, l0), (t1, p1, l1) in zip(keys, keys[1:]):
        if t <= t1:
            k = sm(ramp(t, t0, t1))
            cam.location = vlerp(p0, p1, k)
            tgt.location = vlerp(l0, l1, k)
            return
    cam.location, tgt.location = keys[-1][1], keys[-1][2]


# ---------- render ----------
def render_setup(sc, engine='CYCLES', samples=32, device='GPU', out='out.png'):
    r = sc.render
    r.resolution_x, r.resolution_y, r.resolution_percentage = W, H, 100
    r.fps = FPS
    if engine.startswith('BLENDER_EEVEE'):
        for e in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
            try:
                r.engine = e
                break
            except TypeError:
                pass
    else:
        r.engine = engine
    r.filepath = out
    r.image_settings.file_format = 'PNG'
    # AgX desaturates hard in the highlights: a navy tunic came out pale blue and skin came
    # out white. The cartoon look these videos need is closer to Standard.
    sc.view_settings.view_transform = os.environ.get('VIEW_TRANSFORM', 'Standard')
    try:
        sc.view_settings.look = 'None'
    except TypeError:
        pass
    if r.engine == 'CYCLES':
        sc.cycles.device = 'CPU'
        if device.upper() == 'GPU':
            cp = bpy.context.preferences.addons['cycles'].preferences
            for backend in ('OPTIX', 'CUDA', 'HIP', 'ONEAPI', 'METAL'):
                try:
                    cp.compute_device_type = backend
                except TypeError:
                    continue
                cp.refresh_devices()
                gpus = [d for d in cp.devices if d.type == backend]
                if gpus:
                    for d in cp.devices:
                        d.use = d.type == backend
                    sc.cycles.device = 'GPU'
                    print('GPU_BACKEND', backend, [d.name for d in gpus])
                    break
            else:
                print('GPU_BACKEND none found, rendering on CPU')
        sc.cycles.samples = samples
        sc.cycles.use_adaptive_sampling = True
        sc.cycles.use_denoising = True
        sc.cycles.max_bounces = 4
        # OptiX denoises on the card; OpenImageDenoise runs on the CPU and costs ~6 s a frame.
        sc.cycles.denoiser = 'OPTIX' if sc.cycles.device == 'GPU' else 'OPENIMAGEDENOISE'
        sc.cycles.use_auto_tile = sc.cycles.device != 'GPU'
    else:
        sc.eevee.taa_render_samples = samples
        for attr in ('use_shadows', 'use_raytracing'):
            try:
                setattr(sc.eevee, attr, True)
            except (AttributeError, TypeError):
                pass
    return r
