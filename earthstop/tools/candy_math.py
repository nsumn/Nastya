# "What if you ate ALL your Halloween candy at once?" — numbers.
HAUL_KCAL = 4800        # average US trick-or-treat haul (2013 estimate reported by Medical Xpress; UAB range 3,500–7,000)
SUGAR_G = 384           # "about 3 cups of sugar" (widely quoted estimate)
AHA_KID_G = 25          # AHA: children ≤ 25 g added sugar a day
ADULT_DAY_KCAL = 2200
KCAL_PER_G_CANDY = 4.8  # typical chocolate / candy energy density
KCAL_PER_MILE = 95      # walking, ~150 lb person (roughly 80–110)
print(f'{HAUL_KCAL} kcal = {HAUL_KCAL / ADULT_DAY_KCAL:.1f} days of food; ≈ {HAUL_KCAL / KCAL_PER_G_CANDY / 453.6:.1f} lb of candy')
print(f'sugar {SUGAR_G} g = {SUGAR_G / 4:.0f} tsp = {SUGAR_G / AHA_KID_G:.0f}× a kid\'s daily limit')
print(f'walk it off: {HAUL_KCAL / KCAL_PER_MILE:.0f} miles')
