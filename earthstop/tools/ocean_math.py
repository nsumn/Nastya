"""What if the ocean drained? (numbers for the video)
NOAA/NGDC: ocean volume 1.335e9 km^3 (321 million mi^3); WHOI/NOAA: average depth ~3,682 m (12,080 ft); ocean area ~3.61e8 km^2.
Mean salinity ~35 g/kg (3.5%), seawater density ~1,025 kg/m^3, rock salt (halite) density ~2,160 kg/m^3. Land area ~1.49e8 km^2."""
V = 1.335e9 * 1e9; rho = 1025; sal = 0.035; A_ocean = 3.61e14; A_land = 1.49e14; rho_salt = 2160
salt = V * rho * sal; vol_salt = salt / rho_salt
print(f"salt in the ocean: {salt:.2e} kg = {vol_salt:.2e} m^3")
print(f"left on the dry seafloor: {vol_salt / A_ocean:.0f} m = {vol_salt / A_ocean * 3.281:.0f} ft thick")
print(f"spread over all land: {vol_salt / A_land:.0f} m = {vol_salt / A_land * 3.281:.0f} ft thick")
print(f"ocean water spread over land: {V / A_land / 1000:.1f} km deep")
# the biggest US aquarium vs the ocean (Georgia Aquarium: >11 million US gallons)
gal = 321e6 * 1.101e12      # cubic miles -> US gallons
print(f"ocean: {gal:.2e} gallons; Georgia Aquarium share: {11e6 / gal * 100:.1e} %  (= 1 part in {gal / 11e6:.1e})")
