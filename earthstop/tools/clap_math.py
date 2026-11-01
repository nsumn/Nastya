# "만약 내 박수 소리가 칠 때마다 2배가 된다면?" — MODEL: a clap ≈ 85 dB (loudest hand position, Physics World / Acoustics 2020 study); each clap doubles the sound PRESSURE (+6.02 dB).
# Claps every 1.2 s from t = 2. Reference levels (approximate, general-audience sources): pain threshold ~120 dB, jet engine close ~140 dB, eardrum rupture ~150–160 dB,
# window glass ~160+ dB (rough), rocket launch ~180 dB, 194 dB = the loudest undistorted sound possible in air at 1 atm (beyond it: a shock wave).
import math
for n in range(0, 21):
    print(f"clap {n:2d} t={2 + 1.2 * (n - 1) if n else 0:5.1f}s  {85 + 20 * math.log10(2 ** n):6.1f} dB  pressure x{2**n}")
