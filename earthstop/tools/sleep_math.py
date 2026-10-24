# "What if you only slept 5 hours a night?" — numbers for the script
need_lo, need_hi, got = 7, 8, 5
print(f'Sleep debt in 30 nights: {(need_lo - got) * 30}-{(need_hi - got) * 30} hours')
kcal = 385 * 30; print(f'Extra calories in 30 days: {kcal:,} kcal ~ {kcal / 3500:.1f} lb (MODEL: 3,500 kcal/lb rule; the 385 kcal/day comes from short studies)')
