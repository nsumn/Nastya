"""What if Earth had rings like Saturn? (numbers for the video)
MODEL: Saturn's main rings (C inner edge 74,658 km .. A outer edge 136,775 km; Saturn eq. radius 60,268 km) scaled to Earth's radius.
Ring in the equatorial plane, opaque. Geometry only — no assumptions beyond the scaling."""
import math
Re, Rs = 6371.0, 60268.0; KM2MI = 0.621371
rin, rout = 74658 / Rs * Re, 136775 / Rs * Re
print(f"ring: {rin:,.0f}-{rout:,.0f} km from centre = altitude {(rin-Re)*KM2MI:,.0f}-{(rout-Re)*KM2MI:,.0f} mi")
def elev(lat, r):   # elevation of the ring point on the meridian toward the equator
    p = math.radians(lat); vx, vy = r - Re * math.cos(p), -Re * math.sin(p); n = math.hypot(vx, vy)
    return math.degrees(math.asin((vx * math.cos(p) + vy * math.sin(p)) / n))
for name, lat in [('Quito', 0.0), ('Miami', 25.8), ('Houston', 29.8), ('Los Angeles', 34.1), ('New York', 40.7), ('Chicago', 41.9), ('Seattle', 47.6), ('Anchorage', 61.2), ('Fairbanks', 64.8)]:
    print(f"{name:12s} {lat:5.1f}N  ring from {max(-90, elev(lat, rin)):6.1f} to {elev(lat, rout):6.1f} deg above the southern horizon")
print(f"never visible north of {math.degrees(math.acos(Re / rout)):.1f} deg")
GM = 398600.4418
for r in (rin, rout): print(f"orbit at {r:,.0f} km: {2 * math.pi * math.sqrt(r ** 3 / GM) / 3600:.1f} h")
def shadow_lat(r, dec):   # noon: where the ring point's shadow hits the ground
    s = (math.cos(math.radians(dec)), math.sin(math.radians(dec))); d = (-s[0], -s[1])
    b = 2 * (r * d[0]); c = r * r - Re * Re; lam = (-b - math.sqrt(b * b - 4 * c)) / 2
    x, y = r + lam * d[0], lam * d[1]; return math.degrees(math.atan2(y, x))
for dec, name in [(-23.44, 'Dec 21'), (-12, 'Nov 8 / Feb 3'), (-5, 'Mar 8 / Oct 8')]:
    print(f"{name}: noon ring shadow from {shadow_lat(rin, dec):.1f}N to {shadow_lat(rout, dec):.1f}N")
rho_e, rho_rock = 5.51, 3.0; print(f"fluid Roche limit (rock): {2.44 * Re * (rho_e / rho_rock) ** (1 / 3):,.0f} km")
