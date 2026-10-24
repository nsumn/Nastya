# "What if you ate only fast food for 30 days?" — numbers for the script
meal, meals, days = 11.56, 3, 30            # LendingTree: average fast-food meal in major US metros
month = meal * meals * days; print(f'Fast food 3x a day: ${month:,.0f} a month, ${month * 365 / 30:,.0f} a year')
groc = 391                                   # USDA moderate-cost plan, man 19-50 (~$383-397/month, 2025 releases)
print(f'Groceries (USDA moderate plan): ~${groc}/month -> fast food costs ${month - groc:,.0f} more (~{month / groc:.1f}x)')
extra = 500 * days; print(f'Hall 2019: +500 kcal/day -> {extra:,} kcal in 30 days ~ {extra / 3500:.1f} lb (MODEL: 3,500 kcal/lb)')
print(f'Spurlock 2004: 5,000 kcal/day = {5000 / 2500:.0f}x a typical 2,500; +24.5 lb in 30 days; cholesterol 165 -> 230 mg/dL (+{(230 - 165) / 165:.0%})')
print(f'Kechagias 2008: 67.6 -> 74.0 kg = +{(74.0 - 67.6) * 2.2046:.0f} lb in 4 weeks; ALT 22.1 -> 69.3 U/L = x{69.3 / 22.1:.1f}; 14 of 18 abnormal within week 1')
sod = 0.9 * 2300 * meals; print(f'Sodium: a large combo ~>90% of 2,300 mg -> 3 a day ~ {sod:,.0f} mg ~ {sod / 2300:.1f}x the daily limit (MODEL)')
print(f'Spector 2015 (n=1): ~1,300-1,400 of ~3,500 gut species lost in 10 days ~ {1350 / 3500:.0%}')
print(f'Vogel 1997: artery widening (FMD) 21% -> ~11% for 2-4 h after one 900 kcal fast-food breakfast = -{1 - 10.5 / 21:.0%}')
print(f'CDC NCHS 2018: 36.6% of US adults eat fast food on a given day ~ 84.8 million')
