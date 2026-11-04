"""Numbers for "만약 지구가 5초 동안 멈춘다면?" — Earth's rotation stops for 5 s; the ground stops, everything loose keeps the old speed.
Sidereal day 86,164 s, equatorial radius 6,378 km, Seoul latitude 37.57 N."""
import math
R, day, lat = 6378.137, 86164.1, 37.57
v_eq = 2 * math.pi * R / day                     # km/s
v = v_eq * math.cos(math.radians(lat))
print(f'equator {v_eq*3600:,.0f} km/h; Seoul {v*3600:,.0f} km/h = {v*1000:.0f} m/s = Mach {v*1000/343:.2f}')
print(f'5 s -> {v*1000*5:,.0f} m east')
