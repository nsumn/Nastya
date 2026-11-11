"""Map v5: a HIGH-RES focus patch for close-ups (Nov 11 2026, quality comparison with Geolyth / geomapstories: their close-ups show crisp relief + rivers, ours went soft).
For one bbox it writes
  data/hi_<name>_dem.png  — elevation, same encoding as data/us_dem2.png (R = sqrt(h / 4200 m) * 255), from AWS Terrain Tiles (Terrarium, open data, zoom Z)
  data/hi_<name>_sat.jpg  — colour from NASA Blue Marble Next Generation 500 m (public domain), tile A1 (lon -180..-90, lat 0..90):
                            download world.200409.3x21600x21600.A1.jpg (URL as in tools/sat_tex.py, folder bmng-base/september) to data/raw/bm_A1.jpg
  data/hi_<name>_rivers.json — Natural Earth 10 m rivers + lake centerlines (public domain) clipped to the bbox, as [[lon, lat], ...] polylines
Usage (from earthstop/): python3 tools/hires_patch.py <name> <lon0> <lon1> <lat0> <lat1> [step_deg=0.004] [zoom=9]"""
import sys, io, json, math, os, urllib.request, numpy as np
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
name = sys.argv[1]; LON0, LON1, LAT0, LAT1 = map(float, sys.argv[2:6]); STEP = float(sys.argv[6]) if len(sys.argv) > 6 else 0.004; Z = int(sys.argv[7]) if len(sys.argv) > 7 else 9
def txy(lon, lat): n = 2 ** Z; r = np.radians(lat); return (lon + 180) / 360 * n + 0 * r, (1 - np.log(np.tan(r) + 1 / np.cos(r)) / np.pi) / 2 * n + 0 * lon
lons = np.arange(LON0, LON1, STEP); lats = np.arange(LAT1, LAT0, -STEP)
X, Y = txy(lons[None, :], lats[:, None])
tx0, tx1, ty0, ty1 = int(X.min()), int(X.max()), int(Y.min()), int(Y.max())
os.makedirs('data/raw/terrarium', exist_ok=True); big = np.zeros(((ty1 - ty0 + 1) * 256, (tx1 - tx0 + 1) * 256), np.float32)
for tx in range(tx0, tx1 + 1):
    for ty in range(ty0, ty1 + 1):
        f = f'data/raw/terrarium/{Z}_{tx}_{ty}.png'
        if not os.path.exists(f): open(f, 'wb').write(urllib.request.urlopen(f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{Z}/{tx}/{ty}.png', timeout=60).read())
        a = np.asarray(Image.open(f).convert('RGB')).astype(np.float32); big[(ty - ty0) * 256:(ty - ty0 + 1) * 256, (tx - tx0) * 256:(tx - tx0 + 1) * 256] = a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768
# bilinear sample of the mosaic at every grid point
px = (X - tx0) * 256 - 0.5; py = (Y - ty0) * 256 - 0.5; x0 = np.clip(np.floor(px).astype(int), 0, big.shape[1] - 2); y0 = np.clip(np.floor(py).astype(int), 0, big.shape[0] - 2); fx = px - x0; fy = py - y0
h = (big[y0, x0] * (1 - fx) * (1 - fy) + big[y0, x0 + 1] * fx * (1 - fy) + big[y0 + 1, x0] * (1 - fx) * fy + big[y0 + 1, x0 + 1] * fx * fy)
v = np.sqrt(np.clip(h, 0, 4200) / 4200) * 255
dem = np.zeros(h.shape + (3,), np.uint8); dem[..., 0] = np.round(v); dem[..., 1] = np.round(np.sqrt(np.clip(-h, 0, 6000) / 6000) * 255)
Image.fromarray(dem).save(f'data/hi_{name}_dem.png'); print('dem', dem.shape, 'max m', float(h.max()))
# colour: crop the 500 m Blue Marble tile (A1: lon -180..-90, lat 90..0, 21600 px = 90°)
src = Image.open('data/raw/bm_A1.jpg'); ppd = 21600 / 90
box = (round((LON0 + 180) * ppd), round((90 - LAT1) * ppd), round((LON1 + 180) * ppd), round((90 - LAT0) * ppd)); sat = src.crop(box)
sat.save(f'data/hi_{name}_sat.jpg', quality=93); print('sat', sat.size)
# rivers + lake centerlines inside the bbox (with a margin)
out = []
for fn in ['ne_10m_rivers_lake_centerlines.geojson', 'ne_10m_rivers_north_america.geojson']:
    p = f'data/raw/{fn}'
    if not os.path.exists(p): open(p, 'wb').write(urllib.request.urlopen(f'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/{fn}', timeout=120).read())
    for f in json.load(open(p))['features']:
        g = f['geometry']
        if not g: continue
        lines = g['coordinates'] if g['type'] == 'MultiLineString' else [g['coordinates']]
        for ln in lines:
            pts = [(round(x, 4), round(y, 4)) for x, y in ln if LON0 - 0.5 < x < LON1 + 0.5 and LAT0 - 0.5 < y < LAT1 + 0.5]
            if len(pts) > 1: out.append(pts)
json.dump({'bbox': [LON0, LON1, LAT0, LAT1], 'w': int(dem.shape[1]), 'h': int(dem.shape[0]), 'rivers': out}, open(f'data/hi_{name}_rivers.json', 'w')); print('rivers', len(out))
