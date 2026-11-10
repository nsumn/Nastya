"""Satellite colour textures for map v3 from NASA Blue Marble Next Generation (public domain, NASA Earth Observatory), September 2004 (less snow than November), 21600x10800:
https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-base/september/world.200409.3x21600x10800.jpg  (download to data/raw/bm21600_september.jpg)
Writes data/sat_world.jpg (lon ±180, lat -60..84, 16384 wide), data/sat_us.jpg (UB: -132..-58, 13..53), data/sat_ak.jpg (AKB: -172..-129, 51..72). Run from earthstop/."""
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
import sys
src = Image.open(sys.argv[1] if len(sys.argv) > 1 else 'data/raw/bm21600_september.jpg').convert('RGB'); W, H = src.size; ppd = W / 360
def crop(lon0, lon1, lat0, lat1, out, width=None):
    box = (round((lon0 + 180) * ppd), round((90 - lat1) * ppd), round((lon1 + 180) * ppd), round((90 - lat0) * ppd)); im = src.crop(box)
    if width: im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    im.save(out, quality=92); print(out, im.size)
crop(-180, 180, -60, 84, 'data/sat_world.jpg', 16384)
crop(-132, -58, 13, 53, 'data/sat_us.jpg'); crop(-172, -129, 51, 72, 'data/sat_ak.jpg')
