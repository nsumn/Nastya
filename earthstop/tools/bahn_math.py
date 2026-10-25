# "Was wäre, wenn die Deutsche Bahn immer pünktlich wäre?" — numbers for the script
p25, p24, p15 = 60.1, 62.5, 74.4          # DB Fernverkehr punctuality (stops < 6 min late; cancellations not counted)
print(f'2025: {p25}% punctual -> about {round((100 - p25) / 10)} of 10 long-distance trains late (2024: {p24}%, 2015: {p15}%)')
riders = 134.5e6                            # DB Fernverkehr passengers 2025
print(f'Average per day: {riders / 365:,.0f} long-distance passengers (2025 annual / 365)')
print(f'Federal target: 70% by end of 2029 -> +{70 - p25:.1f} points vs 2025')
