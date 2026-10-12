# Spoon-shaped Earth: concave bowl (half ellipsoidal shell) + tapered handle. Same volume & mass as Earth.
# Monte-Carlo gravity + potential at surface points. Shape units -> km after scaling.
import numpy as np
rng = np.random.default_rng(5)
# bowl: outer half-ellipsoid (z<=0 part) semi-axes A,B,C; inner cavity semi-axes A-t, B-t, C-t; open at z=0 (top)
A, B, C, T = 4.0, 3.0, 1.6, 0.55
HL, HW0, HW1, HT = 11.0, 1.1, 0.7, 0.45   # handle length (from bowl rim at x=A), width at bowl/tip, thickness
def inside(p):
    x, y, z = p[:, 0], p[:, 1], p[:, 2]
    outer = (x / A) ** 2 + (y / B) ** 2 + (z / C) ** 2 < 1
    inner = (x / (A - T)) ** 2 + (y / (B - T)) ** 2 + (z / (C - T)) ** 2 < 1
    bowl = outer & ~inner & (z <= 0)
    u = (x - (A - 0.4)) / HL; w = HW0 + (HW1 - HW0) * np.clip(u, 0, 1)
    zc = -0.15 + 0.9 * np.clip(u, 0, 1) ** 2        # handle curves up a little
    handle = (u >= 0) & (u <= 1) & (np.abs(y) < w / 2) & (np.abs(z - zc) < HT / 2)
    return bowl | handle
N = 12_000_000
lo = np.array([-A, -B, -C]); hi = np.array([A + HL, B, 1.2])
P = rng.uniform(lo, hi, (N, 3)); m = inside(P); V = np.prod(hi - lo) * m.mean(); pts = P[m]
VE = 1.08321e12; s = (VE / V) ** (1 / 3); print('volume units', round(V, 2), 'km per unit', round(s, 1))
pts = pts * s; com = pts.mean(0); print('COM km', com.round(0))
sub = rng.choice(len(pts), min(500000, len(pts)), replace=False); pts = pts[sub]
G = 6.674e-11; M = 5.972e24; mp = M / len(pts)
def grav(q):
    d = pts - q; r = np.maximum(np.linalg.norm(d, axis=1), 40.0); return G * mp * (d / r[:, None] ** 3).sum(0) * 1e-6
def pot(q):
    r = np.maximum(np.linalg.norm(pts - q, axis=1), 40.0); return -G * mp * (1 / r).sum() / 1000
def rep(name, q, up):
    q = np.array(q) * s; g = grav(q); gm = np.linalg.norm(g); tilt = np.degrees(np.arccos(np.clip(np.dot(-g / gm, up / np.linalg.norm(up)), -1, 1)))
    print(f'{name:22s} g={gm/9.81:.2f} G  tilt={tilt:4.0f}°  U={pot(q)/1e6:7.2f} MJ/kg')
    return pot(q)
u0 = rep('bowl floor (inside)', [0, 0, -(C - T)], np.array([0, 0, 1]))
rep('bowl inner wall mid', [0, (B - T) * 0.8, -(C - T) * 0.6], np.array([0, -0.8, 0.6]))
ur = rep('bowl rim', [0, B - T / 2, 0.0], np.array([0, 0, 1]))
rep('bowl underside (outside)', [0, 0, -C], np.array([0, 0, -1]))
rep('handle near bowl (top)', [A + 1.0, 0, -0.15 + HT / 2 + 0.9 * (1.4 / HL) ** 2], np.array([0, 0, 1]))
rep('handle middle (top)', [A - 0.4 + HL / 2, 0, -0.15 + HT / 2 + 0.9 * 0.25], np.array([0, 0, 1]))
ut = rep('handle tip (top)', [A - 0.4 + HL * 0.98, 0, -0.15 + HT / 2 + 0.9 * 0.96], np.array([0, 0, 1]))
print('lengths: total mi', round((2 * A + HL - 0.4) * s * 0.6214), ' bowl long x wide mi', round(2 * A * s * 0.6214), 'x', round(2 * B * s * 0.6214),
      ' bowl depth (rim to inner floor) mi', round((C - T) * s * 0.6214), ' handle length mi', round(HL * s * 0.6214))
print('rim above sea floor: energy-height (km) =', round((ur - u0) / 9.81 / 1000), ' handle tip energy-height km =', round((ut - u0) / 9.81 / 1000))
# water: Earth's oceans 1.335e9 km3 pooled in the bowl bottom: depth estimate for a paraboloid-ish floor
a2, b2, c2 = (A - T) * s, (B - T) * s, (C - T) * s
for h in np.linspace(10, c2, 4000):
    # volume of the inner ellipsoid cap of height h from the bottom: pi*a*b*h^2*(3c-h)/(3c^2)
    v = np.pi * a2 * b2 * h ** 2 * (3 * c2 - h) / (3 * c2 ** 2)
    if v > 1.335e9: print('ocean depth if pooled in bowl km', round(h, 1), ' sea diameter mi', round(2 * a2 * np.sqrt(1 - (1 - h / c2) ** 2) * 0.6214)); break
