"""Numbers for "What if you could hear everyone's thoughts for one day?"
Sources: Tseng & Poppenk 2020 (Nature Communications): ~6,200 thought transitions/day (fMRI estimate);
Killingsworth & Gilbert 2010 (Science): mind wandering in 46.9% of samples; Serota, Levine & Boster 2010: 1.65 lies/day,
~60% told none, ~half of all lies by ~5% of people; Gilovich, Medvec & Savitsky 2000: wearers expected ~half the room to
notice the shirt, ~a quarter did; Tang & Huth 2023 (Nature Neuroscience): semantic decoder, ~16 h of MRI per person;
MTA: R160 car 42-44 seats + ~200 standing; NYC population ~8.48 M (Census 2024 estimate)."""
THOUGHTS_DAY, AWAKE_H = 6200, 16
per_min = THOUGHTS_DAY / (AWAKE_H * 60)
print(f'per person: {per_min:.1f} thoughts/min')
car = 150   # a packed (not crush) rush-hour car: ~44 seated + ~106 standing
print(f'subway car of {car}: {car * per_min / 60:.0f} thoughts/s')
nyc = 8.48e6
print(f'all of NYC awake: {nyc * per_min / 60:,.0f} thoughts/s')
print(f'liars in the car (5%): {car * 0.05:.1f}; people with no lie today (60%): {car * 0.6:.0f}')
