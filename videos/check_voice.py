"""Listen back to a voiceover with faster-whisper (medium, German) and print what it hears, to catch mispronounced words.
python check_voice.py <project_dir>      -> uses voice/tight.wav if present, else voice/result.mp3
(the mp3 is converted with ffmpeg first: faster-whisper's own mp3 decoding fails with the installed 'av')"""
import os, subprocess, sys, wave
import numpy as np
from faster_whisper import WhisperModel

D = sys.argv[1]
src = os.path.join(D, "voice", "tight.wav" if os.path.exists(os.path.join(D, "voice", "tight.wav")) else "result.mp3")
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-f", "s16le", "-ac", "1", "-ar", "16000", "-"], capture_output=True, check=True).stdout
audio = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
segs, _ = WhisperModel("medium", compute_type="int8").transcribe(audio, language="de")
print(" ".join(s.text.strip() for s in segs))
