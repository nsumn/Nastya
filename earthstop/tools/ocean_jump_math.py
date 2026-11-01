# "What if every American jumped into the ocean at once?" — numbers (sources in the chat).
POP = 341_784_857            # Census Bureau, July 1, 2025 (Vintage 2025)
COAST_MI = 12_383            # NOAA general coastline of the US
OCEAN_M2 = 3.61e14           # world ocean surface ~361 million km²
OCEAN_KG = 1.4e21            # mass of the oceans
AVG_KG = 65                  # MODEL: average American incl. kids (adults ~80 kg, CDC NHANES)
VOL_M3 = AVG_KG / 1010       # body density ~1.01 kg/L
HAIR_UM = 70                 # typical human hair ~70 µm
ALLEN_MI = 1018              # Allen, SD (N. American pole of inaccessibility) → Pacific
per_ft = POP / (COAST_MI * 5280)
rise_m = POP * VOL_M3 / OCEAN_M2
print(f'{per_ft:.1f} people per foot of coastline')
print(f'sea level rise {rise_m * 1e6:.3f} µm = 1/{HAIR_UM / (rise_m * 1e6):.0f} of a hair')
print(f'ocean is {OCEAN_KG / (POP * AVG_KG) / 1e9:.0f} billion × heavier than all Americans')
print(f'Allen SD → coast at 60 mph: {ALLEN_MI / 60:.0f} h')
