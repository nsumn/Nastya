# "만약 강남역 사거리에 지구 질량의 블랙홀(10원 동전 크기)이 생긴다면?" — Earth-mass black hole: Schwarzschild radius r_s = 2GM/c² ≈ 8.9 mm → diameter ≈ 1.8 cm
# (the 10-won coin is 18.0 mm across). Free-fall time from rest at distance r into a point mass: t_ff = (π/2)·sqrt(r³ / (2GM)).
import math
G, M, c = 6.674e-11, 5.972e24, 2.998e8
rs = 2 * G * M / c**2; print(f"r_s = {rs*1000:.2f} mm, diameter {2*rs*100:.2f} cm")
g1 = G * M / 1.0**2; print(f"gravity at 1 m: {g1:.3e} m/s^2 = {g1/9.81:.2e} g")
tff = lambda r: math.pi / 2 * math.sqrt(r**3 / (2 * G * M))
for r, name in [(1, '1 m'), (100, '100 m (the crossing)'), (1000, '1 km (Gangnam towers)'), (10e3, '10 km'), (20e3, '20 km (Seoul)'), (100e3, '100 km (capital area + Yellow Sea)'), (250e3, '250 km (most of South Korea)'), (6.371e6, 'Earth radius')]:
    print(f"{name:38s} t_ff = {tff(r):.3g} s")
