"""MakeHuman female_casualsuit01 (blue tee + jeans): remove the logo and dye the tee (incl. sleeves and orange piping) one colour.
Usage: python3 tools/mh_tee_f.py <in_diffuse.png> <out.png> <#rrggbb>"""
import sys
from PIL import Image, ImageFilter
src, out, col = sys.argv[1], sys.argv[2], sys.argv[3]
im = Image.open(src).convert('RGB'); W, H = im.size; s = W / 1024
r, g, b = (int(col[i:i + 2], 16) for i in (1, 3, 5)); px = im.load()
def tee(x, y): return y < 430 * s or (x > 740 * s and 590 * s < y < 880 * s)
lum = im.convert('L').filter(ImageFilter.GaussianBlur(1)); L = lum.load()
# fabric shading = luminance relative to the cloth's mean (blue ~ 95), logo + piping flattened by a wide median
flat = lum.filter(ImageFilter.MedianFilter(41)); F = flat.load()
for y in range(H):
    for x in range(W):
        if not tee(x, y): continue
        R, G, B = px[x, y]
        if max(R, G, B) - min(R, G, B) < 14 and 185 < R < 225: continue      # grey atlas background
        shade = L[x, y] / max(F[x, y], 1)
        if abs(R - 150) + abs(G - 150) + abs(B - 150) < 60 or R > G + 40: shade = 1.0   # grey ring / orange piping → plain
        if 725 * s < x < 880 * s and 150 * s < y < 325 * s: shade = 1.0
        k = max(0.93, min(1.05, 1 + 0.25 * (shade - 1))); px[x, y] = (min(255, int(r * k)), min(255, int(g * k)), min(255, int(b * k)))
im.save(out); print('ok', out)
