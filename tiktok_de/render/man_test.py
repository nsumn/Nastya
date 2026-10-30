import os, sys
import cairocffi as cairo, numpy as np
from PIL import Image, ImageDraw, ImageFont
import character2 as C
OUT = sys.argv[1]; C.PROP["name"] = "oval"
rows = [("Было", False, "stubble"), ("A: щетина", True, "stubble"), ("B: короткая борода", True, "short")]
emos = [dict(emo="calm"), dict(emo="smile"), dict(emo="sad"), dict(emo="calm", talk=0.6), dict(emo="worried")]
F = ImageFont.truetype(os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts", "Inter-Black.otf"), 30)
out = Image.new("RGB", (len(emos) * 330 + 10, len(rows) * 420 + 10), (10, 10, 14))
for ri, (lab, adult, bd) in enumerate(rows):
    C.MAN["adult"] = adult; C.MAN["beard"] = bd
    for ci, pose in enumerate(emos):
        s = cairo.ImageSurface(cairo.FORMAT_RGB24, 320, 410); c = cairo.Context(s); c.set_source_rgb(*C.hexc("292E4B")); c.paint()
        C.person(c, 160, 1350, 1250, "m", pose)
        s.flush(); im = Image.fromarray(np.frombuffer(s.get_data(), np.uint8).reshape(410, 320, 4)[:, :, [2, 1, 0]].copy())
        if ci == 0: ImageDraw.Draw(im).text((10, 10), lab, font=F, fill=(255, 255, 255))
        out.paste(im, (ci * 330 + 5, ri * 420 + 5))
out.save(f"{OUT}/man_compare.png")
