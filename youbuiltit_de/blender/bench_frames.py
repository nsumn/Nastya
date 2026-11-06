# Per-frame benchmark: builds the castle_test scene once, then renders N frames
# with a moving camera, like a real shot. Run:
#   blender -b -P bench_frames.py -- <CYCLES|BLENDER_EEVEE> <samples> <out_dir> <GPU|CPU> <n_frames>
import bpy, sys, os, time, math
argv = sys.argv[sys.argv.index('--') + 1:]
ENGINE, SAMPLES, OUTDIR = argv[0], int(argv[1]), argv[2]
DEVICE = argv[3].upper() if len(argv) > 3 else 'GPU'
N = int(argv[4]) if len(argv) > 4 else 10
here = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(here, 'castle_test.py'), encoding='utf-8').read()
src = src[:src.rindex("t0 = time.time()")]          # everything but the single-frame render
os.makedirs(OUTDIR, exist_ok=True)
g = {'__file__': os.path.join(here, 'castle_test.py'), '__name__': 'castle_scene'}
sys.argv = ['blender', '--', ENGINE, str(SAMPLES), os.path.join(OUTDIR, 'f.png'), DEVICE]
exec(compile(src, 'castle_test.py', 'exec'), g)
sc = bpy.context.scene; cam = sc.camera
if ENGINE == 'CYCLES':                               # knobs: BENCH_DENOISER, BENCH_TILE, BENCH_JPG
    d = os.environ.get('BENCH_DENOISER')
    if d: sc.cycles.denoiser = d
    if os.environ.get('BENCH_TILE') == '0': sc.cycles.use_auto_tile = False
if os.environ.get('BENCH_JPG'):
    sc.render.image_settings.file_format = 'JPEG'; sc.render.image_settings.quality = 92
for i in range(N):
    a = math.radians(-20 + 4.0 * i)                  # camera orbits a little each frame
    cam.location = (math.sin(a) * 30, math.cos(a) * 30, 9.5 + .15 * i)
    sc.render.filepath = os.path.join(OUTDIR, 'bench_%03d.png' % i)
    t0 = time.time(); bpy.ops.render.render(write_still=True)
    print('FRAME', i, round(time.time() - t0, 2), flush=True)
