"""What if the Sun was a blue star? Model star = Spica A (Wikipedia: 25,300 K, 7.47 R_sun,
~20,500 L_sun, 10.25 M_sun; main sequence < 30 Myr, StarDate). Sun: 5,772 K, 1 L_sun, ~10 Gyr."""
import numpy as np
h, c, k = 6.626e-34, 2.998e8, 1.381e-23
T_SUN, T_B, R_B, L_B, M_B = 5772, 25300, 7.47, 20500, 10.25
F = lambda K: K * 9 / 5 - 459.67
print(f"surface: Sun {F(T_SUN):,.0f} F, Spica {F(T_B):,.0f} F")
# equilibrium temperature at 1 AU (Earth today 255 K with albedo 0.3)
Teq = 255 * L_B ** 0.25; print(f"Earth at 1 AU: equilibrium {Teq:.0f} K = {F(Teq):,.0f} F  (x{L_B:,} sunlight)")
a = L_B ** 0.5; P = (a ** 3 / M_B) ** 0.5
print(f"safe distance {a:.0f} AU = {a/30.07:.1f}x Neptune, {a*1.496e8/1.609:,.0f} mi; year = {P:.0f} Earth years")
ang = R_B / a; print(f"apparent diameter = {ang:.3f} of our Sun ({1/ang:.0f}x smaller), surface brightness x{(T_B/T_SUN)**4:.0f}")
lam = np.linspace(50e-9, 50e-6, 400000)
B = lambda T: 1 / lam ** 5 / (np.exp(h * c / (lam * k * T)) - 1)
for T in (T_SUN, T_B):
    b = B(T); tot = np.trapezoid(b, lam)
    uv = np.trapezoid(b[lam < 400e-9], lam[lam < 400e-9]) / tot
    vis = np.trapezoid(b[(lam >= 400e-9) & (lam < 700e-9)], lam[(lam >= 400e-9) & (lam < 700e-9)]) / tot
    print(f"T={T}: UV(<400nm) {uv*100:.0f}%  visible {vis*100:.0f}%  IR {100-100*uv-100*vis:.0f}%")
# colours: CIE 1931 (Wyman 2013 fit) -> sRGB, star disc overhead and at sunset (Rayleigh, airmass 38)
def g(x, m, s1, s2): return np.exp(-0.5 * ((x - m) / np.where(x < m, s1, s2)) ** 2)
L = np.linspace(380, 780, 401)
xb = 1.056*g(L,599.8,37.9,31)+0.362*g(L,442,16,26.7)-0.065*g(L,501.1,20.4,26.2)
yb = 0.821*g(L,568.8,46.9,40.5)+0.286*g(L,530.9,16.3,31.1)
zb = 1.217*g(L,437,11.8,36)+0.681*g(L,459,26,13.8)
def srgb(spec):
    X, Y, Z = (np.trapezoid(spec * f, L) for f in (xb, yb, zb))
    rgb = np.array([[3.2406,-1.5372,-0.4986],[-0.9689,1.8758,0.0415],[0.0557,-0.2040,1.0570]]) @ np.array([X, Y, Z])
    rgb = np.clip(rgb / rgb.max(), 0, 1); rgb = np.where(rgb <= 0.0031308, 12.92 * rgb, 1.055 * rgb ** (1/2.4) - 0.055)
    return '#' + ''.join(f'{int(v*255):02x}' for v in rgb)
tau = 0.0088 * (L / 1000) ** -4.05
for T in (T_SUN, T_B):
    Bl = 1 / (L * 1e-9) ** 5 / (np.exp(h * c / (L * 1e-9 * k * T)) - 1)
    print(f"T={T}: disc noon {srgb(Bl*np.exp(-tau))}  disc sunset {srgb(Bl*np.exp(-tau*38))}  sky (Rayleigh) {srgb(Bl*(L/550.)**-4.05)}")
print(f"lifespan ratio Sun / Spica = {10e9/30e6:.0f}x")
# supernova: ~1e44 J kinetic; share hitting Earth at the safe distance
d = a * 1.496e11; f = (6.371e6) ** 2 / (4 * d * d); E = 1e44 * f
print(f"SN energy on Earth {E:.1e} J (Earth binding 2.2e32 J); vaporizes ~{E/1e7:.1e} kg = top {E/1e7/(4*np.pi*6.371e6**2*3000)/1000:.0f} km of rock")
# daylight at the safe distance: same watts, but how many lux? (luminous efficacy of each blackbody, V ~ CIE y-bar)
def lum_per_watt(T):
    Bl = 1 / (L * 1e-9) ** 5 / (np.exp(h * c / (L * 1e-9 * k * T)) - 1); b = B(T)
    return np.trapezoid(Bl * yb, L * 1e-9) / np.trapezoid(b, lam)
r = lum_per_watt(T_B) / lum_per_watt(T_SUN)
print(f"visible brightness at the safe distance = {r*100:.0f}% of our daylight (~{r*100000:,.0f} lux vs ~100,000); UV x{0.92/0.12:.1f}")
