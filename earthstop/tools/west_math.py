# "What if the Sun rose in the West?" — numbers for the script (retrograde Earth, same spin rate)
import math
EQ_KMH = 2 * math.pi * 6378.137 / 23.9345   # equatorial rotation speed, km/h (sidereal day)
for name, lat in [('Equator', 0), ('Cape Canaveral', 28.5), ('New York', 40.71), ('Los Angeles', 34.05)]:
    v = EQ_KMH * math.cos(math.radians(lat)); print(f'{name:15s} spins at {v:6.0f} km/h = {v / 1.609:5.0f} mph = {v / 3.6:4.0f} m/s')
# rocket: launching east today gets +v for free; on a backwards Earth the free boost points WEST -> launch from the West Coast over the Pacific
v = EQ_KMH * math.cos(math.radians(28.5)) / 3.6; print(f'Launch boost at the Cape: {v:.0f} m/s; launching against the spin costs {2 * v:.0f} m/s extra (~{2 * v / 7800 * 100:.0f}% of orbital speed)')
# day length with the same sidereal period but retrograde spin: 1/solar = 1/sidereal + 1/year
sid = 23.9345; yr = 365.2422 * 24
solar = 1 / (1 / sid + 1 / (yr)) ; print(f'Solar day on a backwards Earth (same sidereal day): {int(solar)} h {(solar % 1) * 60:.1f} min')
# time zones: the Sun reaches LA first -> LA is 3 h AHEAD of New York; the MPI model: New York 5 h ahead of London (Eos 2018)
print('Time zones flip: LA 3 h ahead of NYC; New York 5 h ahead of London (MPI retrograde run)')
