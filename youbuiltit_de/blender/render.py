# Render a scene script frame by frame, skipping frames that are already on disk.
#
#   blender -b -P render.py -- <scene.py> <out_dir> [samples] [percent] [from_s] [to_s] [device]
#
# Resumable on purpose: a run can be stopped and started again and only the missing frames
# are computed. The scene script is executed without its own render tail (everything from
# "t0 = time.time()"), exactly as view.py does it, and update(t) is called per frame.
#
# GRASS=0 in the environment turns off the grass scatter: about half the cost per frame,
# which is what a draft motion pass wants.
import bpy, sys, os, time

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
HERE = os.path.dirname(os.path.abspath(__file__))
SCENE = os.path.abspath(os.path.join(HERE, argv[0]))
OUTDIR = argv[1]
SAMPLES = argv[2] if len(argv) > 2 else '16'
PERCENT = int(argv[3]) if len(argv) > 3 else 50
FROM = float(argv[4]) if len(argv) > 4 else 0.0
TO = float(argv[5]) if len(argv) > 5 else -1.0
DEVICE = argv[6] if len(argv) > 6 else 'GPU'

os.makedirs(OUTDIR, exist_ok=True)
src = open(SCENE, encoding='utf-8').read()
cut = src.find('t0 = time.time()')
if cut > 0:
    src = src[:cut]
sys.argv = ['blender', '--', 'CYCLES', SAMPLES, os.path.join(OUTDIR, 'f.png'), DEVICE, '0']
g = {'__file__': SCENE, '__name__': 'scene_under_render'}
sys.path.insert(0, HERE)
exec(compile(src, os.path.basename(SCENE), 'exec'), g)

sc = bpy.context.scene
update, END, FPS = g['update'], g['END'], g.get('L').FPS
sc.render.resolution_percentage = PERCENT
sc.render.image_settings.file_format = 'PNG'
if TO < 0:
    TO = END
f0, f1 = int(round(FROM * FPS)), int(round(TO * FPS))
print('RENDER frames %d..%d  %dx%d  %s samples  grass=%s' % (
    f0, f1, sc.render.resolution_x * PERCENT // 100, sc.render.resolution_y * PERCENT // 100,
    SAMPLES, os.environ.get('GRASS', '1')), flush=True)

t_start = time.time()
done = 0
for f in range(f0, f1 + 1):
    path = os.path.join(OUTDIR, 'f_%05d.png' % f)
    if os.path.exists(path):
        continue
    update(f / FPS)
    sc.render.filepath = path
    ti = time.time()
    bpy.ops.render.render(write_still=True)
    done += 1
    if done % 25 == 1:
        per = (time.time() - t_start) / done
        left = (f1 - f) * per
        print('FRAME %5d/%d  %.2f s/frame  ~%.0f min left' % (f, f1, per, left / 60), flush=True)
print('RENDER_DONE %d frames in %.1f min' % (done, (time.time() - t_start) / 60), flush=True)
