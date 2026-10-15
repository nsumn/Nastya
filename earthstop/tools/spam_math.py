"""What if spam calls were missing people calling for help? (numbers for the video)
YouMail: 52.5 billion robocalls in the US in 2025. FBI NCIC: 93,447 active missing-person records on 12/31/2024.
Pew 2020: ~80% don't answer unknown numbers. FCC 17th 911 Fee Report: 212.9 million 911 voice calls in 2024. US pop ~340 M."""
calls, missing, pop, nine11 = 52.5e9, 93447, 340e6, 212.9e6
print(f"per second: {calls/365/86400:,.0f}  per American per year: {calls/pop:.0f} ({calls/pop/52:.1f} a week)")
per = calls / missing; print(f"per missing person: {per:,.0f} a year = {per/365:,.0f} a day = one every {86400/(per/365):.0f} s")
print(f"ignored (80%): {calls*0.8/1e9:.1f} billion a year")
ans = calls * 0.2; print(f"answered and reported: {ans/1e9:.1f} B -> {ans/nine11:.0f}x today's 911 load; if all reported: {calls/nine11:.0f}x")
