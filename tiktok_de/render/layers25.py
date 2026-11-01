"""2.5D scenes: flat cairo-drawn layers at different depths, filmed by a moving camera.

Each layer is drawn once (bigger than the frame, so the camera can move) at the scale it has when the camera sits at
cam_z = 0. Per frame a layer at depth z is scaled by z / (z - cam_z) and shifted by -cam_x * F / (z - cam_z), so near
layers slide and grow faster than far ones (parallax + dolly). Depth of field blurs each layer by its distance from
the focus plane. The result goes through the channel's usual finish (SF.look) like every other shot.

  layer(z, draw, pad=...)  -> Layer;  draw(c, t) paints on a (W*(1+2*pad)) x (H*(1+2*pad)) canvas whose frame-sized
  centre is the shot at cam = (0, 0, 0). Static layers are cached; layers with animated=True are redrawn per frame.
"""
import math
import numpy as np
import cairocffi as cairo
from PIL import Image, ImageFilter

W, H = 1080, 1920
F = 1000.0                       # px of lateral shift per world unit at depth 1

class Layer:
    def __init__(self, z, draw, pad=0.25, animated=False):
        self.z, self.draw, self.pad, self.animated = z, draw, pad, animated
        self.cw, self.ch = int(W * (1 + 2 * pad)), int(H * (1 + 2 * pad))
        self._cache = None

    def image(self, t):
        if self._cache is not None and not self.animated: return self._cache
        s = cairo.ImageSurface(cairo.FORMAT_ARGB32, self.cw, self.ch); c = cairo.Context(s)
        c.translate(W * self.pad, H * self.pad)          # draw() uses frame coordinates; the margin is around it
        self.draw(c, t)
        s.flush()
        a = np.frombuffer(s.get_data(), np.uint8).reshape(self.ch, self.cw, 4)
        im = Image.fromarray(a[:, :, [2, 1, 0, 3]].copy(), "RGBA")   # premultiplied, fine for opaque/soft edges
        if not self.animated: self._cache = im
        return im

def layer(z, draw, pad=0.25, animated=False): return Layer(z, draw, pad, animated)

def render(layers, t, cam, focus_z=None, dof=18.0):
    """cam = (x, y, z) in world units; returns an RGB uint8 array (H, W, 3). layers far -> near."""
    cx, cy, cz = cam
    out = Image.new("RGBA", (W, H), (0, 0, 0, 255))
    for L in sorted(layers, key=lambda L: -L.z):
        d = L.z - cz
        if d <= 0.05: continue
        s = L.z / d
        im = L.image(t)
        w, h = int(L.cw * s), int(L.ch * s)
        im = im.resize((w, h), Image.BILINEAR)
        if focus_z is not None:
            r = dof * abs(1.0 / d - 1.0 / (focus_z - cz)) * L.z
            if r > 0.4:      # blur at reduced size: same look, many times faster for big radii
                k = max(1, int(r // 3))
                im = im.resize((max(1, w // k), max(1, h // k)), Image.BILINEAR).filter(ImageFilter.GaussianBlur(r / k)).resize((w, h), Image.BILINEAR)
        # centre of the layer canvas lands at the screen centre shifted by the camera
        x = W / 2 - w / 2 - cx * F / d
        y = H / 2 - h / 2 - cy * F / d
        out.alpha_composite(im, (int(round(x)), int(round(y))))
    return np.asarray(out.convert("RGB"))

def smooth(u): u = max(0.0, min(1.0, u)); return u * u * u * (u * (u * 6 - 15) + 10)
def cam_path(t, t0, t1, a, b):
    """eased camera between two (x, y, z) keys"""
    u = smooth((t - t0) / max(1e-6, t1 - t0))
    return tuple(a[i] + (b[i] - a[i]) * u for i in range(3))
