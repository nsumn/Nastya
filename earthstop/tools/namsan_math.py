#!/usr/bin/env python3
"""Numbers for "만약 남산타워가 로켓이라면?" (N Seoul Tower = a rocket). Sources: tower 236.7 m on Namsan (~243 m), top 479.7 m ASL;
Starship full stack ~121-123 m. Distances from Banpo Hangang Park (37.510, 126.996) to the tower (37.5512, 126.9882)."""
import math
lat1, lon1, lat2, lon2 = 37.510, 126.996, 37.5512, 126.9882
R = 6371e3; p1, p2 = math.radians(lat1), math.radians(lat2); dphi = p2 - p1; dl = math.radians(lon2 - lon1)
d = 2 * R * math.asin(math.sqrt(math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2))
print(f"park -> tower: {d/1000:.2f} km; sound delay {d/343:.1f} s (light: {d/3e8*1e6:.0f} microseconds)")
print(f"tower / Starship: {236.7/123:.2f}x  (236.7 m vs ~123 m)")
a = 1.5 * 9.81   # MODEL: lift-off thrust-to-weight 1.5 -> net accel 0.5 g
for t in (5, 10, 13.5): print(f"T+{t:>4}s: height {0.5*(a-9.81)*t*t:.0f} m (net 0.5 g)")
print("LEO 400 km (ISS height) after ~8.5 min (typical ascent, e.g. Falcon 9 ~8.5 min to orbit), orbital speed", round(math.sqrt(3.986e14 / (R + 400e3)) / 1000, 2), "km/s")
print("one lap of Earth at 400 km:", round(2 * math.pi * (R + 400e3) / math.sqrt(3.986e14 / (R + 400e3)) / 60), "min")
