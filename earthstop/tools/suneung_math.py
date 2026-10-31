# "만약 수능 시험장에서 방귀 위력이 2초마다 2배가 된다면?" — a MODEL (fiction): exit wind starts at 1.5 m/s and doubles every 2 s from t = 2 s.
# Anchors: typhoon Maemi 2003 51.1 m/s (KMA), KTX 300 km/h = 83 m/s, speed of sound 343 m/s, airliner ~250 m/s, Earth escape velocity 11.2 km/s.
# After the lift-off (16 s) the student flies straight up at the jet speed (no drag, no gravity losses — it's a cartoon): altitude = ∫ v dt.
V0, T0, DT = 1.5, 2.0, 2.0
alt = 0.0
for n in range(0, 15):
    t = T0 + DT * (n - 1) if n else 0.0; v = V0 * 2 ** n
    if t >= 16: alt += v * DT
    print(f"n={n:2d} t={t:5.1f}s  x{2**n:6d}  v={v:9.1f} m/s = {v*3.6:9.0f} km/h   alt at t+2s = {alt/1000:7.2f} km")
