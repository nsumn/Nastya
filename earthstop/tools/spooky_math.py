# Numbers for "What if every trick-or-treater in America came to your house?"
# Sources: U.S. Census Bureau, Facts for Features: Halloween 2020 — 41.0 million potential trick-or-treaters (ages 5–14, 2019 estimate),
#          126.8 million potential stops (occupied housing units, Q2 2020). NRF Halloween 2025 survey — children's costumes: witch 1.7M, ghost 1.6M.
# Our assumptions (stated on screen): one fun-size bar per kid (~17 g / 0.6 oz), 2 ft of line per kid, 3 s per kid at the door,
# ~44,000 lb of cargo per semi truck.
KIDS = 41.0e6
LB = 453.592
candy_lb = KIDS * 17 / LB
line_mi = KIDS * 2 / 5280
NYC_LA = 2790                      # driving miles
years = KIDS * 3 / 86400 / 365.25
print(f"candy: {candy_lb:,.0f} lb -> {candy_lb / 44000:.1f} semi trucks")
print(f"line: {line_mi:,.0f} mi = {line_mi / NYC_LA:.1f} x NYC-LA, {line_mi / 24901:.0%} of Earth's circumference")
print(f"door: {KIDS * 3:,.0f} s = {KIDS * 3 / 86400:,.0f} days = {years:.2f} years (Oct 31 2026 + {years:.1f} y -> {2026.83 + years:.2f})")
print(f"last kid: 14 when he joins -> {14 + years:.1f} when he reaches the door")
