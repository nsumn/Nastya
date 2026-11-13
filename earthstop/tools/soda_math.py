# "What happens if you drink a soda every day?" — the numbers on screen (one 12 fl oz can of regular cola a day)
SUGAR_G, KCAL, CAF_MG, OZ = 39, 140, 34, 12           # cola label: 39 g sugar, 140 kcal, 34 mg caffeine per 12 fl oz
TSP_G = 4.0                                           # 1 tsp granulated sugar ≈ 4 g (USDA/AHA convention)
print('tsp per can', SUGAR_G / TSP_G)                 # 9.75 → "about 10 teaspoons"
print('AHA daily limit: men 36 g (9 tsp), women 25 g (6 tsp) → one can is over both:', SUGAR_G > 36)
print('gallons a year', 365 * OZ / 128)               # 34.2 gal (a standard US tub ≈ 40 gal → "almost a bathtub")
print('lb sugar a year', 365 * SUGAR_G / 453.6)       # 31.4 lb
print('kcal a year', 365 * KCAL)                      # 51,100
print('caffeine left at 2 am from a 4 pm can (t1/2 5 h)', CAF_MG * 0.5 ** (10 / 5))
print('$ a year at $1.50 a can', 365 * 1.5)
