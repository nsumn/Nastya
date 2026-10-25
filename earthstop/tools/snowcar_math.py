# "What if you got stuck in your car in a snowstorm?" — numbers for the script
tank = 12.0                                   # gallons, a typical compact/mid-size tank (assumption)
for gph in (0.25, 0.5):                       # DOE via KBB: idling burns 1/4 - 1/2 gallon per hour
    nonstop = tank / gph; bursts = tank / (gph / 6)   # NWS-style: run the engine ~10 min every hour
    print(f'{gph} gal/h: nonstop {nonstop:.0f} h ({nonstop / 24:.1f} days) vs 10 min/hour {bursts:.0f} h ({bursts / 24:.0f} days)')
print('Hypothermia: core body temperature below 95 F (35 C)')
print('I-95 Virginia, 3-4 Jan 2022: ~50 miles closed, some drivers stuck up to ~27 hours')
