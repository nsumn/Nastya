# "만약 내 키가 1.5초마다 2배가 된다면?" — Korean short (~33 s).
# Start 1.7 m (Size Korea 8th survey 2021: men 172.5 cm, women 159.6 cm).
# Landmarks: Seoul bus ~3.2 m, apartment floor ~3 m, N Seoul Tower 236 m,
# 63 Building 249 m (roof), Lotte World Tower 555 m, Hallasan 1,947 m,
# airliner cruise ~10-12 km, Everest 8,849 m, Karman line 100 km, ISS ~420 km (Roscosmos Mar 2026: 421.5 km).
T0, DT, H0 = 2.0, 1.5, 1.7
marks = [("bus", 3.2), ("apt 9F", 27), ("N Seoul Tower", 236), ("63 Building", 249), ("Lotte World Tower", 555),
         ("Hallasan", 1947), ("Everest", 8849), ("airliner", 11000), ("space 100 km", 100e3), ("ISS", 420e3)]
for k in range(19):
    h = H0 * 2**k
    passed = [n for n, m in marks if H0 * 2**(k-1) < m <= h] if k else []
    print(f"k={k:2d} t={T0+DT*k:5.1f}s  h={h:12,.1f} m  {', '.join(passed)}")
print("factor 2^18 =", 2**18, " total growth time", 18*DT, "s")
