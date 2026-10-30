# Extend the 25 s challenge clip (SPOOKY 3, 130 BPM) to the full video length by
# re-cutting its own phrases on the beat grid. Writes:
#   out/spooky/music_full.wav  — whole soundtrack (preview / sync check)
#   out/spooky/music_tail.wav  — silence while the official TikTok sound plays (0–25.08 s), then the continuation
import numpy as np, scipy.io.wavfile as wf
SR = 44100
P, T0 = 0.4613, 0.126            # beat period and first beat of the clip (onset-grid fit)
SONG_END = 25.08                 # the TikTok sound stops here
T_END = 63.0
sr, x = wf.read("out/spooky/song.wav"); x = x.astype(np.float32) / 32768
x = np.pad(x, ((0, SR), (0, 0)))
beat = lambda k: T0 + k * P
smp = lambda t: int(round(t * SR))

# timeline after the clip: (source beat from, source beat to) — 16 beats = one 4-bar phrase
# clip ends at beat 54.09 inside the drop loop (beats 34–50 repeat a 4-beat riff)
plan = [(34 + (SONG_END - beat(50)) / P, 50),   # rest of drop phrase → beat 66
        (2, 18),                                # break (intro phrase)  → beat 82
        (18, 34),                               # build                 → beat 98
        (34, 50), (34, 50),                     # drop ×2               → beat 130
        (34, 34 + (T_END - beat(130)) / P)]     # final hit, faded out
out = np.zeros((smp(T_END) + SR, 2), np.float32)
out[:smp(SONG_END)] = x[:smp(SONG_END)]
pos, XF = smp(SONG_END), smp(0.006)
ramp = np.linspace(0, 1, XF)[:, None]
for a, b in plan:
    seg = x[smp(beat(a)) - XF:smp(beat(b))].copy()
    out[pos - XF:pos] = out[pos - XF:pos] * (1 - ramp) + seg[:XF] * ramp
    out[pos:pos + len(seg) - XF] = seg[XF:]
    pos += len(seg) - XF
out = out[:smp(T_END)]
fade = smp(T_END) - smp(beat(130) + 4 * P)
out[-fade:] *= np.linspace(1, 0, fade)[:, None] ** 2
wf.write('out/spooky/music_full.wav', SR, (np.clip(out, -1, 1) * 32767).astype(np.int16))
tail = out.copy(); tail[:smp(SONG_END)] = 0
wf.write('out/spooky/music_tail.wav', SR, (np.clip(tail, -1, 1) * 32767).astype(np.int16))
print('beats: drop', round(beat(34), 2), 'break', round(beat(66), 2), 'build', round(beat(82), 2),
      'drop2', round(beat(98), 2), 'end hit', round(beat(130), 2))
