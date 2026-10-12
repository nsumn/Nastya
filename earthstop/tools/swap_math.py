# What if every American and every Brit swapped places for one day? — numbers
US_POP = 341_784_857        # Census Vintage 2025, July 1 2025
UK_POP = 69_281_400         # ONS mid-2024
UK_LAND_KM2 = 241_930       # CIA World Factbook (land)
US_LAND_MI2 = 3_531_905     # Census land area
BGD_DENS = 1_319            # Bangladesh, people per km2 (World Bank 2023)
PAX_YEAR = 4.89e9           # IATA, airline passengers in 2024
US_DRIVERS = 237.7e6        # FHWA 2023
UK_VEHICLES = 41.7e6        # DfT, licensed vehicles UK end of 2024
UK_HOMES = 25.6e6 + 2.74e6 + 1.47e6 + 0.8e6   # England 2024 + Scotland 2024 + Wales ~2022 + NI ~approx
US_HOMES = 146.77e6         # Census Vintage 2024 housing units
UK_FOOD_RATIO = 0.60        # Defra: production-to-supply ratio, all food, 2025
KM2_PER_MI2 = 2.589988

print(f"Americans per Brit: {US_POP/UK_POP:.2f}")
uk_dens = US_POP / UK_LAND_KM2
print(f"UK with Americans: {uk_dens:,.0f}/km2 = {uk_dens*KM2_PER_MI2:,.0f}/sq mi (Bangladesh {BGD_DENS}/km2) -> x{uk_dens/BGD_DENS:.2f}")
print(f"UK today: {UK_POP/UK_LAND_KM2:,.0f}/km2")
us_dens = UK_POP / US_LAND_MI2
print(f"US with Brits: {us_dens:.1f}/sq mi (US today {US_POP/US_LAND_MI2:.1f}/sq mi; Idaho ~{2.0e6/82_643:.0f}/sq mi)")
trips = US_POP + UK_POP; per_day = PAX_YEAR / 365
print(f"trips {trips/1e6:.0f}M, all airlines carry {per_day/1e6:.1f}M/day -> {trips/per_day:.0f} days")
print(f"homes: {US_POP/UK_HOMES:.1f} Americans per UK home (UK homes ~{UK_HOMES/1e6:.1f}M); {US_HOMES/UK_POP:.1f} US homes per Brit")
print(f"drivers per UK vehicle: {US_DRIVERS/UK_VEHICLES:.1f}")
print(f"UK farm output covers {UK_FOOD_RATIO*UK_POP/US_POP*100:.0f}% of 342M people's food (value basis) -> about 1 in {US_POP/(UK_FOOD_RATIO*UK_POP):.0f}")
print(f"tea: 100M cups/day for {UK_POP/1e6:.0f}M Brits = {100e6/UK_POP:.1f} cups each")
