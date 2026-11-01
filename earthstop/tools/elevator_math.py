# "What if you took an elevator from New York to space?" — travel times at the fastest elevator speed (Hitachi, Guangzhou CTF: 47 mph tested).
MPH = 47
STOPS = [('One World Trade Center (top)', 1776), ('Clouds', 6500), ('Mount Everest height', 29032), ('Airliners cruise', 35000),
         ('Armstrong limit (body-temp water boils)', 63000), ('Karman line (space)', 62 * 5280), ('ISS', 250 * 5280), ('Geostationary orbit', 22236 * 5280)]
for name, ft in STOPS:
    h = ft / 5280 / MPH; print(f'{name:42s} {ft:>12,} ft  {h * 60:8.1f} min  ({h:.1f} h, {h / 24:.1f} days)')
# ISA temperature at 35,000 ft: 15 °C − 6.5 °C/km × 10.668 km = −54.3 °C = −65.8 °F
print('35,000 ft ISA temp °F:', round((15 - 6.5 * 10.668) * 9 / 5 + 32, 1))
# gravity at the ISS (400 km): (6371 / 6771)^2
print('g at ISS:', round((6371 / 6771) ** 2 * 100, 1), '%')
