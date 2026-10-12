"""Penny drop from the Empire State Building — numbers for the video.
Penny (US Mint, since 1982): 2.5 g, 19.05 mm diameter, 1.52 mm thick.
Decks: 86th floor 1,050 ft, 102nd floor 1,250 ft; tip 1,454 ft.
Tumbling-disk drag tuned so terminal speed = ~25 mph (Bloomfield, UVA;
MythBusters 2003 measured 30-50 mph range in wind tunnel)."""
import math
g, m, d = 9.81, 0.0025, 0.01905
A = math.pi * (d / 2) ** 2
FT, MPH = 0.3048, 0.44704
VT = 25 * MPH                      # terminal speed of a tumbling penny
k = g / VT ** 2                    # a = g - k v^2
print(f"implied Cd (face area) = {2*m*g/(1.225*A*VT**2):.2f}")
for name, ft in [("86th deck", 1050), ("102nd deck", 1250), ("tip", 1454)]:
    h = ft * FT
    v0 = math.sqrt(2 * g * h); t0 = math.sqrt(2 * h / g)
    # with drag: integrate
    t = v = y = 0.0; dt = 1e-3; t95 = None
    while y < h:
        v += (g - k * v * v) * dt; y += v * dt; t += dt
        if t95 is None and v > 0.95 * VT: t95 = (t, y)
    print(f"{name}: {ft} ft = {h:.0f} m | vacuum {v0/MPH:.0f} mph in {t0:.1f} s, "
          f"{0.5*m*v0**2:.1f} J | air {v/MPH:.1f} mph in {t:.1f} s, {0.5*m*v*v:.2f} J")
print(f"95% of terminal after {t95[0]:.1f} s, {t95[1]/FT:.0f} ft")
bb = 0.145 * (95 * MPH) ** 2 / 2
print(f"95 mph fastball: {bb:.0f} J ; penny at 25 mph vs fastball: 1/{bb/(0.5*m*VT**2):.0f}")
