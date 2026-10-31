# "What if you overthought every night for a month?" — MODEL numbers (assumption, labelled MODEL on screen).
# Assumption: overthinking keeps you awake ~1 extra hour a night (no single study gives a clean number — see the chat notes).
NIGHTS, LOST_H, NIGHT_H = 30, 1.0, 7.5
lost = NIGHTS * LOST_H
print(f'awake lying in bed over {NIGHTS} nights: {lost:.0f} h = {lost / NIGHT_H:.1f} full nights of sleep')
# Van Dongen et al. 2003 (Sleep): 6 h/night for 14 days -> lapses as bad as ~1 night of total sleep deprivation (subjective sleepiness lagged behind)
print(f'two weeks at ~6 h: {14 * (7.5 - 6):.0f} h of sleep debt')
# Scullin et al. 2018 (JEP:General, n=57, polysomnography): 5-min specific to-do list -> asleep ~9 min faster than writing completed tasks
# LaFreniere & Newman 2019 (Behavior Therapy, n=29 students with GAD): 91.4% of worry predictions did not come true
