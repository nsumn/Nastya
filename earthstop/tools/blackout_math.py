"""Numbers for "만약 서울의 모든 불이 5초 동안 꺼진다면?" (sources in the chat / KOREA.md).
Sky glow = city light scattered by air within the lowest tens of km; once the lamps stop, the last scattered photons leave within ~path/c."""
c = 299_792.458                     # km/s
for path_km in (10, 30, 50):        # scattering column + path to the eye (most sky glow comes from the lowest ~10-30 km of air)
    print(f'sky glow gone after ~{path_km / c * 1000:.3f} ms  (path {path_km} km)')
# stars: ~20 in Seoul (JoongAng Daily), ~2,500 at once under a dark sky (EarthSky, Sky & Telescope); MODEL count N = 25 * 10^(0.5*(m-2)), m = limiting magnitude
for m in (2, 3, 4, 5, 6): print(f'limiting mag {m}: ~{round(25 * 10 ** (0.5 * (m - 2))):,} stars')
# eyes: pupil seconds; cones 5-10 min; rods ~20-30 min to ~90% (Wikipedia 'Adaptation (eye)', WTAMU Baird 2013) -> 5 s is far too short for the Milky Way
