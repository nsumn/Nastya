"""World relief for the daily news map: AWS Terrain Tiles (Terrarium, open data) zoom 4, resampled to an equirectangular grid
lon -180..180, lat -60..84 at 0.08° → data/world_dem.png (RGB: R = land sqrt(h/5000), G = ocean depth sqrt(-h/6500), B = 0). Run once from earthstop/."""
import io, math, urllib.request, numpy as np, concurrent.futures as cf
from PIL import Image
Z = 4; LON0, LON1, LAT0, LAT1, STEP = -180.0, 180.0, -60.0, 84.0, 0.08
n = 2 ** Z
def ty(lat): return (1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * n
Y0, Y1 = int(ty(LAT1)), int(ty(LAT0))
def get(XY):
    X, Y = XY
    for k in range(4):
        try: a = np.asarray(Image.open(io.BytesIO(urllib.request.urlopen(f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{Z}/{X}/{Y}.png', timeout=60).read())).convert('RGB')).astype(np.float64); return XY, a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768
        except Exception as e: err = e
    raise err
with cf.ThreadPoolExecutor(8) as ex: T = dict(ex.map(get, [(X, Y) for X in range(n) for Y in range(Y0, Y1 + 1)]))
# stitch into one mercator mosaic, then sample
mos = np.zeros(((Y1 - Y0 + 1) * 256, n * 256))
for (X, Y), a in T.items(): mos[(Y - Y0) * 256:(Y - Y0 + 1) * 256, X * 256:(X + 1) * 256] = a
lons = np.arange(LON0, LON1, STEP) + STEP / 2; lats = np.arange(LAT1, LAT0, -STEP) - STEP / 2
px = np.clip(((lons + 180) / 360 * n * 256).astype(int), 0, n * 256 - 1)
py = np.clip(((np.array([ty(l) for l in lats]) - Y0) * 256).astype(int), 0, mos.shape[0] - 1)
h = mos[py][:, px]
R = np.sqrt(np.clip(h, 0, 5000) / 5000) * 255; G = np.sqrt(np.clip(-h, 0, 6500) / 6500) * 255
Image.fromarray(np.dstack([R, G, np.zeros_like(R)]).astype(np.uint8)).save('data/world_dem.png'); print('world_dem', R.shape)
