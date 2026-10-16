"""What if everyone had the new Tesla Roadster? (numbers for the video)
Tesla reveal 2026-10-15 (Electrek/InsideEVs/Fox): 0-60 mph Performance <1.6 s, Thrust <0.9 s, Rocket <0.59 s; >230 mph (Rocket);
>300 mi range; lightest ~3,700 lb (1,700 kg); cold-gas thrusters fed by carbon-overwrapped pressure vessels (COPV); $50,000 reservation;
production 2028 (2017 promise: 2020). FHWA Highway Statistics 2024: 297,525,836 registered vehicles. Shuttle crews were held to <=3 G.
The tank size is NOT public — the hover time below is a MODEL with an assumed 100 L of air at 4,500 psi."""
import math
g = 9.81; mph = 0.44704
for name, t in [('Performance', 1.6), ('Thrust', 0.9), ('Rocket', 0.59)]:
    print(f"{name}: 0-60 in {t} s -> {60 * mph / t / g:.2f} G average")
veh = 297_525_836; print(f"vehicles: {veh/1e6:.0f} M; deposits x $50,000 = ${veh * 50000 / 1e12:.1f} trillion")
# hover MODEL
p = 4500 * 6894.76; V = 0.100; Z = 1.1; R = 8.314; T = 293; M = 0.029
m_air = p * V * M / (Z * R * T); mass = 1700 + 150; Isp = 65
mdot = mass * g / (Isp * g); print(f"air in tank {m_air:.0f} kg, hover burn {mdot:.1f} kg/s -> hover {m_air / mdot:.1f} s")
# a hop over a semi (13.5 ft trailer + margin -> 16 ft)
h = 16 * 0.3048; v = math.sqrt(2 * g * h); print(f"hop over a semi: {h:.1f} m needs {v:.1f} m/s up, {2 * v / g:.1f} s in the air")
# refill energy: isothermal compression x2 for real-world losses
E = m_air * 287 * T * math.log(p / 101325) / 3.6e6; print(f"refill: ideal {E:.1f} kWh, real ~{2 * E:.0f} kWh = {2 * E / 0.28:.0f} miles of driving at 0.28 kWh/mi")
