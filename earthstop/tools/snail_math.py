# "만약 달팽이 속도가 1초마다 2배가 된다면?" — MODEL: a garden snail (Cornu aspersum, ~1.5 mm/s measured; Usamv Cluj 2017 lab data, Pembury Smith & Ruxton 2021 J Zool)
# doubles its speed every second from t = 2 s. Anchors: ant ~5 cm/s, walking 1.4 m/s, cyclist ~5 m/s, Usain Bolt top ~12.4 m/s, car 100 km/h = 27.8 m/s,
# KTX 300 km/h = 83 m/s, airliner ~250 m/s, sound 343 m/s, rifle bullet ~900 m/s, orbital speed 7.9 km/s, escape velocity 11.2 km/s.
V0, T0 = 0.0015, 2.0
d = 0.0
for n in range(0, 26):
    t = T0 + (n - 1) if n else 0.0; v = V0 * 2 ** n
    print(f"n={n:2d} t={t:5.1f}s v={v:12.4f} m/s = {v*3.6:10.1f} km/h  distance so far {d:10.2f} m"); d += v * (1.0 if n else 2.0)
