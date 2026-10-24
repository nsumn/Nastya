# "What if you could REALLY touch someone?" (remake) — if nothing kept atoms apart, matter would squeeze to nuclear density
import math
RHO = 2.3e17                      # kg/m^3, density of atomic nuclei
def ball(m):
    v = m / RHO; r = (3 * v / (4 * math.pi)) ** (1 / 3); return v, 2 * r
v, d = ball(5.972e24); print(f'Earth -> ball {d:.0f} m = {d * 3.281:,.0f} ft wide (Empire State Building: roof 1,250 ft, tip 1,454 ft)')
v, d = ball(70); print(f'A 70 kg person -> ball {d * 1e6:.1f} micrometres = {d / 0.0254 * 1000:.2f} thousandths of an inch (red blood cell ~7-8 um)')
print(f'Atom ~1e-10 m, nucleus ~1e-15 m -> nucleus fills {(1e-15 / 1e-10) ** 3:.0e} of the volume -> atoms are >99.9999999% empty')
