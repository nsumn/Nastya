# Open a scene script in the Blender window and keep it in sync with the file on disk.
#
#   blender --python view.py -- castle_test.py [CYCLES|BLENDER_EEVEE] [samples] [GPU|CPU]
#
# The scene script runs as-is, except that everything from its final render call
# (the line starting with "t0 = time.time()") is skipped: we want the viewport, not a render.
# A timer then watches the file: save it and the scene rebuilds itself in the open window.
# The timer is persistent because the scene scripts call read_factory_settings(), which
# resets the file and would otherwise drop it.
import bpy, sys, os

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
HERE = os.path.dirname(os.path.abspath(__file__))
SCENE = os.path.abspath(os.path.join(HERE, argv[0] if argv else 'castle_test.py'))
ENGINE = argv[1] if len(argv) > 1 else 'CYCLES'
SAMPLES = argv[2] if len(argv) > 2 else '32'
DEVICE = argv[3] if len(argv) > 3 else 'GPU'
_mtime = [0.0]


def _window_override():
    # App timers run without a window context, so bpy.context.object is missing and every
    # ops call in a scene script fails. Hand it the real window/area/region instead.
    for win in bpy.context.window_manager.windows:
        for area in win.screen.areas:
            if area.type == 'VIEW_3D':
                for region in area.regions:
                    if region.type == 'WINDOW':
                        return dict(window=win, area=area, region=region,
                                    screen=win.screen, scene=win.scene,
                                    view_layer=win.view_layer)
    return None


def build():
    ov = _window_override()
    if ov is None:
        return _build()
    with bpy.context.temp_override(**ov):
        _build()


def _wipe():
    # The scene scripts start with read_factory_settings(), which reloads the whole file.
    # From a timer that frees the window we are standing in and Blender crashes, so in the
    # viewer we clear the data ourselves instead. Images are kept: reloading the Poly Haven
    # textures on every save would make the rebuild slow for nothing.
    for coll in (bpy.data.objects, bpy.data.meshes, bpy.data.materials, bpy.data.lights,
                 bpy.data.cameras, bpy.data.worlds, bpy.data.node_groups):
        for item in list(coll):
            try:
                coll.remove(item)
            except (RuntimeError, ReferenceError):
                pass


def _reload_local_modules():
    """Reload scene_lib / words before each build. Python caches imports, so editing a
    helper in scene_lib.py did nothing until Blender was restarted: the scene script's
    `import scene_lib` handed back the copy loaded on the first build."""
    import importlib
    for name, mod in list(sys.modules.items()):
        f = getattr(mod, '__file__', None)
        if f and os.path.dirname(os.path.abspath(f)) == HERE and name != '__main__':
            try:
                importlib.reload(mod)
            except Exception as e:
                print('VIEW reload failed for', name, e, flush=True)


def _build():
    _reload_local_modules()
    src = open(SCENE, encoding='utf-8').read()
    cut = src.find('t0 = time.time()')
    if cut > 0:
        src = src[:cut]
    src = src.replace('bpy.ops.wm.read_factory_settings(use_empty=True)', '_wipe_()')
    sys.argv = ['blender', '--', ENGINE, SAMPLES, os.path.join(HERE, '_view.png'), DEVICE]
    g = {'__file__': SCENE, '__name__': 'scene_under_view', '_wipe_': _wipe}
    exec(compile(src, os.path.basename(SCENE), 'exec'), g)
    for win in bpy.context.window_manager.windows:
        for area in win.screen.areas:
            if area.type != 'VIEW_3D':
                continue
            for space in area.spaces:
                if space.type == 'VIEW_3D':
                    space.shading.type = 'MATERIAL'      # quick preview, not a full Cycles viewport
                    space.region_3d.view_perspective = 'CAMERA'
    print('VIEW rebuilt from', os.path.basename(SCENE), flush=True)


@bpy.app.handlers.persistent
def watch():
    try:
        m = os.path.getmtime(SCENE)
    except OSError:
        return 1.0
    if m != _mtime[0]:
        _mtime[0] = m
        try:
            build()
        except Exception as e:
            print('VIEW build failed:', e, flush=True)
    return 1.0


# The first build waits for the timer too: while --python runs at startup, bpy.context is
# still restricted and the scene scripts call bpy.context.object after each ops call.
bpy.app.timers.register(watch, first_interval=0.5, persistent=True)
print('VIEW watching', SCENE, flush=True)
