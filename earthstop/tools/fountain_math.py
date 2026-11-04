"""Numbers for "만약 반포대교 분수가 1000배 세진다면?" — Banpo Moonlight Rainbow Fountain: 1,140 m, 380 nozzles, ~190 t of Han water per minute
(Seoul Media Hub / 서울시). Han River normal flow at Hangang Bridge ~162 m3/s (KoreaScience, MOLIT 2016)."""
q = 190 / 60                     # t/s now
Q = q * 1000                     # t/s at 1000x
print(f'now {q:.2f} t/s  -> 1000x {Q:,.0f} t/s ({Q*60:,.0f} t/min)')
print(f'5 s at 1000x: {Q*5:,.0f} t  = {Q*5/2500:.1f} Olympic pools (2,500 m3)')
print(f'vs Han normal flow 162 m3/s: {Q/162:.0f}x')
