"""Elevation for the 3D US news map: AWS Terrain Tiles (Terrarium, open data) zoom 5, resampled to an equirectangular grid
lon -132..-58, lat 13..53 at 0.04° → data/us_dem.png (8-bit, height = (v/255)^2 * 4200 m; ocean = 0). Run once from earthstop/."""
import io, math, urllib.request, numpy as np
from PIL import Image
Z = 5; LON0, LON1, LAT0, LAT1, STEP = -132.0, -58.0, 13.0, 53.0, 0.04
def tile_xy(lon, lat): n = 2 ** Z; x = (lon + 180) / 360 * n; y = (1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * n; return x, y
x0, y1 = tile_xy(LON0, LAT0); x1, y0 = tile_xy(LON1, LAT1); tx = range(int(x0), int(x1) + 1); ty = range(int(y0), int(y1) + 1)
T = {}
for X in tx:
    for Y in ty:
        a = np.asarray(Image.open(io.BytesIO(urllib.request.urlopen(f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{Z}/{X}/{Y}.png', timeout=30).read())).convert('RGB')).astype(np.float64)
        T[(X, Y)] = a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768
lons = np.arange(LON0, LON1, STEP); lats = np.arange(LAT1, LAT0, -STEP); out = np.zeros((len(lats), len(lons)))
for j, lat in enumerate(lats):
    for i, lon in enumerate(lons):
        x, y = tile_xy(lon, lat); X, Y = int(x), int(y); px, py = min(255, int((x - X) * 256)), min(255, int((y - Y) * 256)); out[j, i] = T[(X, Y)][py, px]
v = np.sqrt(np.clip(out, 0, 4200) / 4200) * 255
Image.fromarray(v.astype(np.uint8)).save('data/us_dem.png'); print('us_dem', v.shape)
