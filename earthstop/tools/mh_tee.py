"""Recolour MakeHuman's male_casualsuit06 (white tee + jeans) texture: remove the MakeHuman logos (median inpaint) and dye the tee.
Usage: python3 tools/mh_tee.py <in_diffuse.png> <out.png> <#rrggbb>"""
import sys
from PIL import Image, ImageFilter
src, out, col = sys.argv[1], sys.argv[2], sys.argv[3]
im = Image.open(src).convert('RGB'); W, H = im.size; s = W / 1024
for (x0, y0, x1, y1) in [(190, 110, 310, 175), (440, 100, 650, 215), (735, 145, 790, 190)]:   # logo boxes (1024 px coords): front-left chest, back, sleeve
    box = tuple(int(v * s) for v in (x0, y0, x1, y1)); reg = im.crop(box).convert('L')
    for _ in range(5): reg = reg.filter(ImageFilter.MedianFilter(31))
    im.paste(Image.merge('RGB', (reg, reg, reg)), box)
r, g, b = (int(col[i:i + 2], 16) for i in (1, 3, 5)); px = im.load()
for y in range(int(430 * s)):           # the tee occupies the top of the atlas, the jeans the rest
    for x in range(W):
        R, G, B = px[x, y]; l = (R + G + B) / 3
        if l > 150 and max(R, G, B) - min(R, G, B) < 40:    # tee fabric (light, unsaturated); leave the grey background as is
            k = min(1.0, l / 238.0); px[x, y] = (int(r * k), int(g * k), int(b * k))
im.save(out); print('ok', out)
