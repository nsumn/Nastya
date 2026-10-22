# "What if you quit nicotine today?" — money + life numbers for the script
PACK = 10.15          # US average pack price, Jan 2026 (tobaccoinsider; CTFK 2025 avg $10.25)
VAPE_MO = 82.22       # avg monthly e-cig spend, US adult users (national survey Apr-May 2023, medRxiv 2024)
MIN_PER_CIG = 20      # UCL / Addiction (Dec 2024): ~20 min of life expectancy per cigarette (17 men, 22 women)
def invest(monthly, years, r=0.07):   # monthly contributions, 7%/yr compounded monthly
    m = r / 12; n = years * 12; return monthly * ((1 + m) ** n - 1) / m
day = PACK; mo = PACK * 365 / 12; yr = PACK * 365
print(f'Pack a day: ${day:.2f}/day, ${PACK * 7:.0f}/week, ${mo:.0f}/month, ${yr:,.0f}/year, 5 yr ${5 * yr:,.0f}, 10 yr ${10 * yr:,.0f}, 30 yr ${30 * yr:,.0f}')
print(f'  invested at 7%: 10 yr ${invest(mo, 10):,.0f}, 30 yr ${invest(mo, 30):,.0f}')
print(f'Vaping: ${VAPE_MO:.0f}/month, ${VAPE_MO * 12:,.0f}/year, 10 yr ${VAPE_MO * 120:,.0f}; invested 30 yr ${invest(VAPE_MO, 30):,.0f}')
lost_day = 20 * MIN_PER_CIG; print(f'Life: a pack (20) = {lost_day} min = {lost_day / 60:.1f} h; per year {lost_day * 365 / 60 / 24:.0f} days')
print('Jha NEJM 2013: quit at 25-34 -> ~10 yr gained, 35-44 -> ~9, 45-54 -> ~6; quitting before 40 avoids ~90% of the excess death risk')
