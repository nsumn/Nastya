# "What if every gun in America disappeared overnight?" — numbers
# Sources: Small Arms Survey 2018 (US civilians 393.3M firearms, 120.5 per 100 residents, 2017 data);
# Pew Research 2023 (32% of adults own a gun, ~4 in 10 live in a gun household);
# NSSF 2025 economic impact (2024 data: $91.65B, 382,995 FTE jobs); NSSF-adjusted NICS 2025: 14,612,314;
# USFWS via Statista: 15.9M paid hunting license holders 2024; NDA Deer Report 2026: 3,047,741 bucks + 3,146,918 antlerless (2024-25);
# gun weights: popular handguns ~1.1-1.5 lb, rifles/shotguns ~6-8 lb; Empire State Building ~365,000 short tons.
guns = 393.3e6
for share_hand, w_hand, w_long in [(0.45, 1.3, 7.0), (0.50, 1.1, 6.0), (0.40, 1.5, 8.0)]:
    lb = guns * (share_hand * w_hand + (1 - share_hand) * w_long)
    print(f"handguns {share_hand:.0%}: avg {lb/guns:.1f} lb -> {lb/2000/1e3:,.0f}k short tons = {lb/2000/365e3:.1f} Empire State Buildings")
print(f"guns per second if all vanish in 1 s at midnight: {guns:,.0f}")
print(f"deer harvested 2024-25: {3047741 + 3146918:,}")
print(f"gun sales/day (NICS adj 2025): {14612314/365:,.0f}")
