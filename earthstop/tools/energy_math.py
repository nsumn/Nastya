# Numbers for "What happens if you drink an energy drink every day?" — one 16 oz original Monster a day (label: 160 mg caffeine, 54 g sugar, 230 kcal).
CAF, SUG, KCAL, PRICE = 160, 54, 230, 3.0
print(f"sugar per can {SUG} g vs AHA daily added-sugar max 36 g (men) / 25 g (women): {SUG/36:.1f}x / {SUG/25:.1f}x")
print(f"sugar per year: {SUG*365/1000:.1f} kg = {SUG*365/453.6:.0f} lb; teaspoons per can: {SUG/4.2:.0f}")
print(f"calories per year: {KCAL*365:,} kcal ~ {KCAL*365/3500:.0f} lb of body fat IF nothing else changes (rule-of-thumb MODEL)")
print(f"money per year at ${PRICE:.2f}/can: ${PRICE*365:,.0f}")
for h in [0, 5, 10, 15]: print(f"caffeine left {h} h after a 4 pm can (half-life ~5 h): {CAF*0.5**(h/5):.0f} mg")
print(f"FDA 400 mg/day: {400/CAF:.1f} cans")
