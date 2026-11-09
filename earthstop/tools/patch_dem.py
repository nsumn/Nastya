"""Relief patch for the news maps: AWS Terrain Tiles (Terrarium, open data) at zoom Z, resampled to an equirectangular grid.
Usage (from earthstop/): python3 tools/patch_dem.py <out.png> <lon0> <lon1> <lat0> <lat1> <step°> <Z> [hmax=4200]
Encoding: R = sqrt(h / hmax) (land), G = sqrt(-h / 6500) (sea depth). The US plane (data/us_dem2.png, z6 0.02°) and Alaska patch (data/ak_dem.png) use it."""
import io, sys, math, urllib.request, numpy as np, concurrent.futures as cf
from PIL import Image
out, LON0, LON1, LAT0, LAT1, STEP, Z = sys.argv[1], *map(float, sys.argv[2:7]), int(sys.argv[7]); HM = float(sys.argv[8]) if len(sys.argv) > 8 else 4200.0
n = 2 ** Z
tx = lambda lon: (lon + 180) / 360 * n
ty = lambda lat: (1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * n
X0, X1, Y0, Y1 = int(tx(LON0)), int(tx(LON1)), int(ty(LAT1)), int(ty(LAT0))
def get(XY):
    X, Y = XY
    for k in range(5):
        try: a = np.asarray(Image.open(io.BytesIO(urllib.request.urlopen(f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{Z}/{X % n}/{Y}.png', timeout=60).read())).convert('RGB')).astype(np.float64); return XY, a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768
        except Exception as e: err = e
    raise err
with cf.ThreadPoolExecutor(8) as ex: T = dict(ex.map(get, [(X, Y) for X in range(X0, X1 + 1) for Y in range(Y0, Y1 + 1)]))
mos = np.zeros(((Y1 - Y0 + 1) * 256, (X1 - X0 + 1) * 256))
for (X, Y), a in T.items(): mos[(Y - Y0) * 256:(Y - Y0 + 1) * 256, (X - X0) * 256:(X - X0 + 1) * 256] = a
lons = np.arange(LON0, LON1, STEP) + STEP / 2; lats = np.arange(LAT1, LAT0, -STEP) - STEP / 2
px = np.clip(((lons + 180) / 360 * n - X0) * 256, 0, mos.shape[1] - 1.001); py = np.clip((np.array([ty(l) for l in lats]) - Y0) * 256, 0, mos.shape[0] - 1.001)
# bilinear sample (smoother than nearest at high zoom)
x0 = np.floor(px).astype(int); y0 = np.floor(py).astype(int); fx = px - x0; fy = (py - y0)[:, None]
a = mos[y0][:, x0]; b = mos[y0][:, x0 + 1]; c = mos[y0 + 1][:, x0]; d = mos[y0 + 1][:, x0 + 1]
h = (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy
R = np.sqrt(np.clip(h, 0, HM) / HM) * 255; G = np.sqrt(np.clip(-h, 0, 6500) / 6500) * 255
Image.fromarray(np.dstack([R, G, np.zeros_like(R)]).round().astype(np.uint8)).save(out); print(out, R.shape, len(T), 'tiles')
