import sys
import os
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = sys.argv[1] if len(sys.argv) > 1 else "out"
os.makedirs(OUT, exist_ok=True)
sys.argv = ["x", HERE + "/../projects/01_wie_mitbewohner/voice/alignment.csv", OUT]
import video_v5 as V5
import cairocffi as cairo, numpy as np
from PIL import Image
s = cairo.ImageSurface(cairo.FORMAT_RGB24, 1000, 700); c = cairo.Context(s); c.set_source_rgb(0.2, 0.22, 0.32); c.paint()
V5.seated(c, "w", 270, 180, 2.0, dict(phone=1.0))
V5.seated(c, "m", 730, 180, 2.0, dict(phone=1.0))
s.flush(); Image.fromarray(np.frombuffer(s.get_data(), np.uint8).reshape(700, 1000, 4)[:, :, [2, 1, 0]].copy()).save(OUT + "/hands.png")
