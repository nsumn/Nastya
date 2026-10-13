"""Dig a hole through the Earth — numbers. Density: PREM (Dziewonski & Anderson 1981), radius 6371 km.
Fall through an evacuated straight tunnel along a diameter (Klotz 2015: ~38 min)."""
import numpy as np
RE = 6371e3; G = 6.674e-11
def rho(r):                          # kg/m^3
    x = r / RE; k = r / 1e3
    if k < 1221.5: d = 13.0885 - 8.8381 * x * x
    elif k < 3480: d = 12.5815 - 1.2638 * x - 3.6426 * x * x - 5.5281 * x ** 3
    elif k < 5701: d = 7.9565 - 6.4761 * x + 5.5283 * x * x - 3.0807 * x ** 3
    elif k < 5771: d = 5.3197 - 1.4836 * x
    elif k < 5971: d = 11.2494 - 8.0298 * x
    elif k < 6151: d = 7.1089 - 3.8045 * x
    elif k < 6346.6: d = 2.6910 + 0.6924 * x
    elif k < 6356: d = 2.9
    else: d = 2.6
    return d * 1000
r = np.linspace(0, RE, 200001); dr = r[1] - r[0]
rh = np.array([rho(v) for v in r]); M = np.cumsum(4 * np.pi * r * r * rh) * dr
g = np.where(r > 0, G * M / np.maximum(r, 1) ** 2, 0)
print(f"mass {M[-1]:.3e} kg, surface g {g[-1]:.2f} m/s2")
i = np.argmax(g); print(f"max g {g[i]:.2f} m/s2 = {g[i]/g[-1]:.2f} G at depth {(RE-r[i])/1e3:.0f} km ({(RE-r[i])/1609:.0f} mi)")
# fall from rest at the surface to the center: v^2 = 2 * int g dr
pot = np.cumsum(g[::-1])[::-1] * dr          # int_r^RE g
v = np.sqrt(2 * pot); print(f"speed at center {v[0]/1e3:.2f} km/s = {v[0]*2.23694:,.0f} mph")
# time to center
mid = (v[1:] + v[:-1]) / 2; tcen = np.sum(dr / np.maximum(mid, 1e-6)[1:]) + 0
print(f"time to center {tcen/60:.1f} min, through {2*tcen/60:.1f} min")
for name, km in [("crust (continent)", 35), ("mantle base", 2891), ("outer core base", 5150)]:
    j = int((RE - km * 1e3) / dr); print(f"{name}: depth {km} km = {km/1.609:,.0f} mi, g {g[j]/g[-1]:.2f} G, speed {v[j]*2.23694:,.0f} mph, time {np.sum(dr/np.maximum((v[j:-1]+v[j+1:])/2,1e-6)[:])/60:.1f} min after start")
print(f"Kola 12,262 m = {12262/0.3048:,.0f} ft = {12.262/1.609:.1f} mi = {12.262/12742*100:.2f}% of the diameter")
print(f"diameter {2*RE/1609:,.0f} mi")
# pressure (hydrostatic, PREM density) at depth; temperatures from the geotherm (approximate, textbook values)
P = np.cumsum((rh * g)[::-1])[::-1] * dr                     # Pa, integrated from the surface down
for name, km in [("Kola 12.3 km", 12.262), ("crust base 40 km", 40), ("core-mantle 2891 km", 2891), ("center", 6371)]:
    j = max(0, int((RE - km * 1e3) / dr)); print(f"pressure at {name}: {P[j]/101325:,.0f} atm")
print(f"rock temp at 1 mi with 25 C/km from 15 C: {15+25*1.609:.0f} C = {(15+25*1.609)*9/5+32:.0f} F")
print(f"Kola pace: 12.262 km in 19 yr -> through Earth {12742/12.262*19:,.0f} yr")
