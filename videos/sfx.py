"""Small synthesised sound effects for the 2D videos (no samples, numpy only).
render(cues, dur) -> float32 mono at 44.1 kHz; cues = [(time, kind)]"""
import numpy as np

SR = 44100
_rng = np.random.default_rng(11)


def _t(d): return np.arange(int(d * SR)) / SR
def _env(n, a, d): t = np.arange(n) / SR; return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / max(d, 1e-4))
def _noise(n, lo, hi):
    spec = np.fft.rfft(_rng.standard_normal(n)); f = np.fft.rfftfreq(n, 1 / SR)
    x = np.fft.irfft(spec * ((f >= lo) & (f <= hi)), n); return x / (np.abs(x).max() + 1e-9)
def _sweep(f0, f1, d, shape=1.0):
    t = _t(d); f = f0 + (f1 - f0) * (t / d) ** shape; return np.sin(2 * np.pi * np.cumsum(f) / SR)


def pop():     t = _t(0.12); return _sweep(380, 980, 0.12, 0.5) * _env(len(t), 0.002, 0.035) * 0.9
def tick():    return _noise(int(0.03 * SR), 2500, 7000) * _env(int(0.03 * SR), 0.0005, 0.006) * 0.7
def key():     t = _t(0.09); return np.sin(2 * np.pi * 1760 * t) * _env(len(t), 0.002, 0.03) * 0.35
def thud():    t = _t(0.35); return (np.sin(2 * np.pi * 70 * t) * _env(len(t), 0.002, 0.10) + 0.3 * _noise(len(t), 40, 400) * _env(len(t), 0.001, 0.03)) * 0.9
def whoosh():  n = int(0.35 * SR); return _noise(n, 300, 4500) * np.sin(np.linspace(0, np.pi, n)) ** 2 * 0.45
def swish():   n = int(0.22 * SR); return _noise(n, 1200, 8000) * np.sin(np.linspace(0, np.pi, n)) ** 3 * 0.25
def zoom():    n = int(0.5 * SR); return (_sweep(200, 700, 0.5) * 0.3 + _noise(n, 500, 3000) * 0.3) * np.sin(np.linspace(0, np.pi, n)) ** 2 * 0.5
def zoomout(): n = int(0.6 * SR); return (_sweep(700, 180, 0.6) * 0.3 + _noise(n, 300, 2000) * 0.3) * np.sin(np.linspace(0, np.pi, n)) ** 2 * 0.5
def buzz():    t = _t(0.18); return np.sign(np.sin(2 * np.pi * 140 * t)) * _env(len(t), 0.003, 0.07) * 0.25
def zap():     t = _t(0.2); return (_sweep(1800, 300, 0.2) * _env(len(t), 0.001, 0.07) + 0.3 * _noise(len(t), 2000, 9000) * _env(len(t), 0.001, 0.03)) * 0.5
def drip():    t = _t(0.18); return _sweep(1400, 600, 0.18, 0.4) * _env(len(t), 0.001, 0.05) * 0.6
def sparkle():
    out = np.zeros(int(0.5 * SR))
    for i, f in enumerate((1568, 2093, 2637, 3136)):
        t = _t(0.3); x = np.sin(2 * np.pi * f * t) * _env(len(t), 0.002, 0.08); j = int(i * 0.05 * SR); out[j:j + len(x)] += x
    return out * 0.3
def soft():    t = _t(0.25); return np.sin(2 * np.pi * 660 * t) * _env(len(t), 0.02, 0.08) * 0.3
def swirl():   n = int(0.8 * SR); t = _t(0.8); return _noise(n, 600, 3000) * (0.5 + 0.5 * np.sin(2 * np.pi * 7 * t)) * np.sin(np.linspace(0, np.pi, n)) ** 2 * 0.35
def ping():    t = _t(0.4); return (np.sin(2 * np.pi * 1318 * t) + 0.5 * np.sin(2 * np.pi * 1976 * t)) * _env(len(t), 0.002, 0.09) * 0.35
def ding():    t = _t(0.7); return (np.sin(2 * np.pi * 1046 * t) + 0.6 * np.sin(2 * np.pi * 1568 * t) + 0.3 * np.sin(2 * np.pi * 2093 * t)) * _env(len(t), 0.002, 0.2) * 0.35
def buzzer():  t = _t(0.35); return np.sign(np.sin(2 * np.pi * 110 * t)) * _env(len(t), 0.005, 0.15) * 0.22
def rattle():  n = int(0.6 * SR); t = _t(0.6); return _noise(n, 200, 2500) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 18 * t))) * np.sin(np.linspace(0, np.pi, n)) * 0.3
def slam():    t = _t(0.5); return (np.sin(2 * np.pi * 55 * t) * _env(len(t), 0.001, 0.12) + 0.6 * _noise(len(t), 60, 1500) * _env(len(t), 0.001, 0.06)) * 1.0
def steps():
    out = np.zeros(int(1.0 * SR))
    for i in range(4):
        x = _noise(int(0.08 * SR), 60, 900) * _env(int(0.08 * SR), 0.001, 0.02); j = int(i * 0.25 * SR); out[j:j + len(x)] += x
    return out * 0.5
def rain():    n = int(2.4 * SR); return _noise(n, 800, 9000) * np.minimum(1, np.minimum(np.arange(n), n - np.arange(n)) / (0.4 * SR)) * 0.12
def rip():     n = int(0.45 * SR); t = _t(0.45); return _noise(n, 800, 7000) * (0.4 + 0.6 * np.abs(np.sin(2 * np.pi * 30 * t))) * _env(n, 0.005, 0.2) * 0.6
def click():   return _noise(int(0.02 * SR), 1500, 6000) * _env(int(0.02 * SR), 0.0005, 0.004) * 0.6
def fade():    t = _t(1.2); return (np.sin(2 * np.pi * 523 * t) + np.sin(2 * np.pi * 392 * t)) * _env(len(t), 0.05, 0.4) * 0.2


def clink():   t = _t(0.25); return (np.sin(2 * np.pi * 2900 * t) + 0.6 * np.sin(2 * np.pi * 4100 * t)) * _env(len(t), 0.001, 0.05) * 0.3
def clang():   t = _t(0.4); return (np.sin(2 * np.pi * 620 * t) + 0.7 * np.sin(2 * np.pi * 1340 * t) + 0.4 * np.sin(2 * np.pi * 2210 * t)) * _env(len(t), 0.001, 0.12) * 0.35
def brick():   t = _t(0.18); return (np.sin(2 * np.pi * 120 * t) * _env(len(t), 0.001, 0.05) + 0.5 * _noise(len(t), 200, 2500) * _env(len(t), 0.001, 0.02)) * 0.6
def scribble(): n = int(0.8 * SR); t = _t(0.8); return _noise(n, 2000, 7000) * (0.4 + 0.6 * np.abs(np.sin(2 * np.pi * 9 * t))) * 0.18
def boing():   t = _t(0.35); return np.sin(2 * np.pi * (220 + 120 * np.sin(2 * np.pi * 9 * t)) * t) * _env(len(t), 0.002, 0.12) * 0.4
def rise():    n = int(1.4 * SR); return (_sweep(220, 660, 1.4) * 0.5 + _sweep(330, 990, 1.4) * 0.3) * np.sin(np.linspace(0, np.pi, n)) ** 2 * 0.3


KINDS = {k: v for k, v in globals().items() if callable(v) and not k.startswith("_") and k not in ("render",)}


def render(cues, dur):
    out = np.zeros(int((dur + 3) * SR), np.float32)
    last = {}
    for t, kind in sorted(cues):
        fn = KINDS.get(kind)
        if fn is None or t < 0: continue
        if t - last.get(kind, -9) < 0.06: continue                # two identical sounds on top of each other
        last[kind] = t
        x = fn().astype(np.float32); i = int(t * SR); out[i:i + len(x)] += x[: max(0, len(out) - i)]
    return out[: int(dur * SR)]
