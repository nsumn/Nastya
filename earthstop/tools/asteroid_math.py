# What if a 1-mile asteroid hit Times Square — own cross-check of Impact: Earth! numbers
# Equations: Collins, Melosh & Marcus 2005 (MAPS 40:817)
import math
D=1609.34; rho=3000; v=17e3; theta=45; rho_t=2700; g=9.81
m=4/3*math.pi*(D/2)**3*rho
E=0.5*m*v**2; MT=4.184e15
print(f"mass {m:.2e} kg = {m/907.185:.2e} US tons")
print(f"energy {E:.2e} J = {E/MT:,.0f} Mt")
print(f"  = {E/MT/50:,.0f} Tsar Bombas (50 Mt), {E/(0.015*MT)/1e6:.1f} million Hiroshimas (15 kt)")
print(f"speed {v/0.44704:,.0f} mph; atmosphere 100 km at 45 deg -> {100e3/math.sin(math.radians(theta))/v:.1f} s")
print(f"asteroid {D/0.3048:,.0f} ft vs Empire State tip 1,454 ft -> {D/0.3048/1454:.1f}x")
# transient crater, eq 21
Dtc=1.161*(rho/rho_t)**(1/3)*D**0.78*v**0.44*g**-0.22*math.sin(math.radians(theta))**(1/3)
Dc=3200; Dfr=1.17*Dtc**1.13/Dc**0.13
print(f"transient crater {Dtc/1e3:.1f} km, final {Dfr/1e3:.1f} km = {Dfr/1609.34:.1f} mi (Manhattan 13.4 mi)")
# fireball eq 31, thermal duration eq 33/34
E2=9.4e20; Rf=0.002*E2**(1/3); eta=3e-3; Tst=3000; sig=5.67e-8
Tt=eta*E2/(2*math.pi*Rf**2*sig*Tst**4)
print(f"fireball radius {Rf/1e3:.1f} km = {Rf/1609.34:.1f} mi; heat pulse lasts ~{Tt:.0f} s")
M=0.67*math.log10(E2)-5.87
print(f"seismic magnitude {M:.1f}")
def hav(a,b):
    la1,lo1=map(math.radians,a); la2,lo2=map(math.radians,b)
    h=math.sin((la2-la1)/2)**2+math.cos(la1)*math.cos(la2)*math.sin((lo2-lo1)/2)**2
    return 2*6371*math.asin(math.sqrt(h))
ts=(40.7580,-73.9855)
for n,p in [("Newark NJ",(40.7357,-74.1724)),("Philadelphia",(39.9526,-75.1652)),("Boston",(42.3601,-71.0589)),("Washington DC",(38.9072,-77.0369)),("Chicago",(41.8781,-87.6298))]:
    r=hav(ts,p); print(f"{n:14s} {r:6.0f} km = {r/1.609:4.0f} mi; quake (5 km/s) in {r/5:4.0f} s")
