# "What if you stopped sleeping completely?" — numbers for the script
print(f'Gardner 1964: 264.4 h = {264.4 / 24:.1f} days; McDonald 1986 (last Guinness record): 453 h 40 min = {(453 + 40 / 60) / 24:.1f} days')
for h, bac in [(17, 0.05), (22, 0.08), (24, 0.10)]: print(f'Dawson & Reid 1997: {h} h awake ~ BAC {bac:.2f}%  ({bac / 0.08:.0%} of the 0.08% US driving limit)')
print('Waters 2018 (21 studies, 760 people): 24-48 h distortions/anxiety; 48-90 h complex hallucinations; ~72 h delusions -> looks like acute psychosis')
print('Rechtschaffen (rats): total sleep deprivation -> death in ~2-3 weeks, ate more but lost weight')
