# What if Earth was shaped like a spoon? Monte-Carlo gravity of a tablespoon with Earth's volume and mass.
# Shape (tablespoon proportions, cm): bowl = paraboloid shell 6.5 x 4.2, 1.2 deep; handle 13.5 long, 1.0-1.6 wide; 0.25 thick.
# Water pools where the gravitational potential on the surface is lowest (rotation ignored).
import numpy as np
G = 6.674e-11; M = 5.972e24; V_E = 1.08321e12  # km3
a, b, d, t = 3.25, 2.1, 1.2, 0.25           # bowl half-length, half-width, depth, thickness (cm)
X0, X1 = 2.6, 2.6 + 13.5                     # handle from the bowl rim to the tip
def bowl_top(x, y): return d * ((x / a) ** 2 + (y / b) ** 2)
def handle_w(x): return np.interp(x, [X0, X0 + 3, X1 - 3, X1], [0.9, 0.55, 0.75, 0.8])
def handle_z(x): return d + 0.35 * np.clip((x - X0) / 4, 0, 1)   # rises a little, like a real spoon
def inside(p):
    x, y, z = p.T
    e = (x / a) ** 2 + (y / b) ** 2; zb = bowl_top(x, y)
    in_bowl = (e <= 1) & (z <= zb) & (z >= zb - t)
    hz = handle_z(x); in_h = (x >= X0) & (x <= X1) & (np.abs(y) <= handle_w(x)) & (z <= hz) & (z >= hz - t)
    return in_bowl | in_h
rng = np.random.default_rng(3); lo = np.array([-a, -b, -t]); hi = np.array([X1, b, d + 0.4])
pts = []; tries = 0
while sum(len(q) for q in pts) < 300_000:
    q = rng.uniform(lo, hi, (400_000, 3)); tries += len(q); pts.append(q[inside(q)])
pts = np.vstack(pts)[:300_000]
box = np.prod(hi - lo)
# volume of the shape from the hit rate
hit = inside(rng.uniform(lo, hi, (2_000_000, 3))).mean(); vol_cm3 = hit * box
k = (V_E * 1e15 / vol_cm3) ** (1 / 3)          # cm -> scale factor so the volume is Earth's (km3 -> cm3 is 1e15)
km = k / 1e5                                     # km per model cm
print(f"model volume {vol_cm3:.2f} cm3 -> scale x{k:.3e}; 1 model cm = {km:,.0f} km")
L = (X1 + a) * km; print(f"spoon length {L:,.0f} km = {L/1.609:,.0f} mi = {L/12742:.1f} Earth diameters; thickness {t*km:,.0f} km = {t*km/1.609:,.0f} mi")
print(f"bowl {2*a*km:,.0f} x {2*b*km:,.0f} km, {d*km:,.0f} km deep; handle {(X1-X0)*km:,.0f} km long, {2*0.55*km:,.0f}-{2*0.9*km:,.0f} km wide")
P = pts * km * 1e3; m = M / len(P)                # metres
com = P.mean(0); print("centre of mass (km):", (com / 1e3).round(0))
def field(p, soft=40e3):
    dd = P - p; r2 = (dd ** 2).sum(1) + soft ** 2; r = np.sqrt(r2)
    return -(G * m / r).sum(), (G * m * dd / (r2 * r)[:, None]).sum(0)
def surf(x, y, side):  # surface point + outward normal (model cm)
    if (x / a) ** 2 + (y / b) ** 2 <= 1:
        z = bowl_top(x, y); n = np.array([-2 * d * x / a**2, -2 * d * y / b**2, 1.0]); n /= np.linalg.norm(n)
        return (np.array([x, y, z]), n) if side > 0 else (np.array([x, y, z - t]), -n)
    z = handle_z(x); return (np.array([x, y, z]), np.array([0, 0, 1.0])) if side > 0 else (np.array([x, y, z - t]), np.array([0, 0, -1.0]))
spots = [("bowl centre, inside (concave)", 0, 0, 1), ("bowl, halfway to the rim", -1.6, 0, 1), ("bowl rim", -3.0, 0, 1),
         ("bowl underside (convex)", 0, 0, -1), ("neck (bowl meets handle)", 3.2, 0, 1), ("handle middle, top", 9.0, 0, 1), ("handle middle, underside", 9.0, 0, -1), ("handle tip", 15.6, 0, 1)]
res = {}
for name, x, y, s in spots:
    p, n = surf(x, y, s); phi, g = field(p * km * 1e3 + n * 1e3)
    gm = np.linalg.norm(g); tilt = np.degrees(np.arccos(np.clip(-g @ n / gm, -1, 1)))
    res[name] = phi; print(f"{name:32s} |g| = {gm:5.2f} m/s2 = {gm/9.81:.2f} G   tilt vs 'down' {tilt:5.1f} deg   potential {phi/1e6:8.2f} MJ/kg")
lowest = min(res, key=res.get); print("lowest potential (water pools here):", lowest)
# ocean depth if Earth's oceans pool in the bowl: fill the potential well on the concave side
xs = np.linspace(-a * 0.98, a * 0.98, 41); ys = np.linspace(-b * 0.98, b * 0.98, 27); cells = []
for x in xs:
    for y in ys:
        if (x / a) ** 2 + (y / b) ** 2 > 0.96: continue
        p, n = surf(x, y, 1); phi, g = field(p * km * 1e3 + n * 1e3); cells.append((phi, np.linalg.norm(g)))
cells = np.array(cells); cell_area = (xs[1] - xs[0]) * (ys[1] - ys[0]) * km ** 2   # km2 (projected)
ocean = 1.335e9  # km3
lo_, hi_ = cells[:, 0].min(), cells[:, 0].max()
for _ in range(60):
    lvl = (lo_ + hi_) / 2; depth = np.clip((lvl - cells[:, 0]) / cells[:, 1], 0, None) / 1e3   # km
    v = (depth * cell_area).sum(); lo_, hi_ = (lvl, hi_) if v < ocean else (lo_, lvl)
cover = (depth > 0).mean(); print(f"ocean in the bowl: max depth {depth.max():.1f} km = {depth.max()/1.609:.1f} mi, covers {cover*100:.0f}% of the bowl")
print(f"Earth's bowl area {np.pi*a*b*km**2:,.0f} km2 vs Earth's ocean area 361,000,000 km2")
rho = M / (V_E * 1e9); print("free-fall collapse time of Earth-density matter (min):", round(np.sqrt(3 * np.pi / (32 * G * rho)) / 60))
# --- air: isothermal atmosphere follows the potential, p ~ exp(-dphi / (R_air T))
RT = 287 * 288
for name in ["bowl, halfway to the rim", "neck (bowl meets handle)", "handle middle, top"]:
    dphi = res[name] - res["bowl centre, inside (concave)"]
    print(f"air pressure at {name}: e^-{dphi/RT:.0f} of the sea-level value (one e-fold per {RT/1e3:.0f} kJ/kg)")
g_c = 1.41; slope = (res["bowl, halfway to the rim"] - res["bowl centre, inside (concave)"]) / (1.6 * km)   # J/kg per km along the bowl
print(f"breathable belt: pressure halves every {RT*np.log(2)/slope:.0f} km inland from the shore")
sea_area = cover * np.pi * a * b * km ** 2; r_sea = np.sqrt(sea_area / np.pi); shore = 2 * np.pi * r_sea
print(f"sea area {sea_area:,.0f} km2 (Russia 17.1M km2), shoreline {shore:,.0f} km; 8.1 billion people -> {8.1e9/shore/1e3:,.0f} per metre of beach")
print(f"sea depth vs Mariana Trench (10.9 km): x{depth.max()/10.9:.0f}")
# handle tip falling toward the centre of mass (radial infall from rest)
r = np.linalg.norm(np.array([X1, 0, handle_z(X1)]) * km * 1e3 - com)
print(f"handle tip {r/1e3:,.0f} km from the centre of mass; free fall into it: {np.pi/2*np.sqrt(r**3/(2*G*M))/3600:.1f} h")
