#!/usr/bin/env python3
"""Numbers for "만약 한강이 5초 동안 사라진다면?" (Han River gone for 5 s, Seoul section).
Sources: width ~800 m at Banpo, channel 3-6 m deep (kept at ~6 m by weirs); Seoul section ~41.5 km; mean flow ~613 m3/s at Hangang Bridge;
Banpo fountain 190 t/min, deck ~20 m above the water."""
import math
g = 9.81
W, D, L = 800.0, 5.0, 41.5e3            # width, mean depth used, length in Seoul (m)
V = W * D * L                           # water volume that vanishes
print(f"water gone: {V:.2e} m3 = {V/1e6:.0f} million t")
rho_air, p0 = 1.2, 101325.0
print(f"air that rushes into the empty channel: {rho_air*V/1e3:,.0f} t")
E = p0 * W * D                          # p*V energy released when the vacuum collapses, per metre of river
print(f"vacuum collapse energy per metre of river: {E:.2e} J  (= {E/4.184e6:.0f} kg TNT)")
c = 343.0; v_esc = 2 * c / (1.4 - 1)    # max speed of air expanding into a vacuum
print(f"air front speed into vacuum: up to {v_esc:.0f} m/s; fills a {D:.0f} m deep channel in ~{D/v_esc*1000:.0f}-{D/c*1000:.0f} ms")
h = 4.0                                 # cruise ferry draft ~1.5 m, keel ends ~4 m above the bed (MODEL)
t = math.sqrt(2 * h / g); print(f"ferry falls {h} m in {t:.2f} s, hits at {g*t*3.6:.0f} km/h")
hp = 5.0 + 2.0; tp = math.sqrt(2 * hp / g); print(f"phone dropped from the bank lip to the bed ({hp} m): {tp:.2f} s, {g*tp*3.6:.0f} km/h")
q = 613; print(f"river flow during 5 s: {q*5:,} m3 arrives from upstream (Paldang side) - front moves ~{math.sqrt(g*D):.0f} m/s, only ~{math.sqrt(g*D)*5:.0f} m in 5 s")
f = 190 / 60; print(f"Banpo fountain pumps {f:.1f} t/s -> 5 s = {f*5:.0f} t of water it no longer has")
slow = 36 / 5; print(f"slow motion: 5 s of story over 36 s of video = x{slow:.1f}")
