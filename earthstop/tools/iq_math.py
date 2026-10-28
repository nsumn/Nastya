# Numbers for "What if your IQ jumped to 500?"
# IQ is a rank on a normal curve: mean 100, SD 15 (Wechsler scales).
from scipy.stats import norm
import math
for iq in [100, 130, 145, 160, 228, 500]:
    z = (iq - 100) / 15; p = norm.sf(z)
    print(f"IQ {iq}: z = {z:.2f}, share above = {p:.3g}, 1 in {1/p:.3g}")
z = (500 - 100) / 15; p = norm.sf(z)
print(f"IQ 500 -> 1 in 10^{-math.log10(p):.0f} people; humans ever born ~1.17e11 (PRB) -> expected count among all humans ever: {p*1.17e11:.2g}")
print(f"atoms in observable universe ~1e80 -> 1/p is 10^{-math.log10(p)-80:.0f} times more")
# reading: 238 wpm average (Brysbaert 2019); a 300-page book ~ 90,000 words
print(f"average reader, 90k-word book: {90000/238/60:.1f} hours")
# brain power: ~20% of ~100 W resting -> ~20 W
print("brain ~20 W at rest (2% of body weight, ~20% of energy)")
