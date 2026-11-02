#!/usr/bin/env python3
"""Our own Korean hero head, generated (like the US hero in tools/human_mesh.py) but DETAILED and smooth, not faceted.
Signed distance fields → marching cubes at 3.5 mm (head units: the head is ~1 unit tall, scaled in the scene) → light decimation, smooth normals.
Korean young-man features: soft V-line jaw, low nose bridge with a rounded tip and visible alar wings, inner-corner eye fold (monolid-ish upper lid),
full lips with a clear philtrum, small flat ears, two-block hair: short sides, a full top with a comma-shaped fringe falling to the brows.
Separate parts (so they can move for emotions later): head skin, upper lids, eyeballs (positions only), hair, brows.
Output: data/kr_head.json"""
import json, numpy as np
from skimage.measure import marching_cubes
import fast_simplification as fs

def ell(p, c, r):
    q = (p - c) / r; k0 = np.linalg.norm(q, axis=1); k1 = np.linalg.norm(q / r, axis=1)
    return k0 * (k0 - 1) / np.maximum(k1, 1e-9)
def cap(p, a, b, ra, rb):
    a, b = np.array(a, float), np.array(b, float); ba = b - a
    t = np.clip(((p - a) @ ba) / (ba @ ba), 0, 1)
    return np.linalg.norm(p - (a + t[:, None] * ba), axis=1) - (ra + (rb - ra) * t)
def sph(p, c, r): return np.linalg.norm(p - np.array(c), axis=1) - r
def smin(a, b, k):
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1); return b + (a - b) * h - k * h * (1 - h)
def smax(a, b, k): return -smin(-a, -b, k)
def mesh(fn, lo, hi, step, keep=1.0):
    xs = [np.arange(lo[i], hi[i] + step, step) for i in range(3)]
    G = np.stack(np.meshgrid(*xs, indexing='ij'), -1).reshape(-1, 3)
    vol = fn(G).reshape(len(xs[0]), len(xs[1]), len(xs[2]))
    v, f, _, _ = marching_cubes(vol, 0.0, spacing=(step, step, step)); v += np.array(lo)
    if keep < 1.0: v, f = fs.simplify(v.astype(np.float32), f.astype(np.int32), target_reduction=1 - keep)
    return v, f

EYE_L = np.array([0.15, 0.02, 0.3]); EYE_R = EYE_L * np.array([-1, 1, 1]); EYE_RAD = 0.07

def head(p):
    x = p[:, 0]; pm = np.c_[np.abs(x), p[:, 1], p[:, 2]]
    cran = ell(p, np.array([0, 0.13, -0.05]), np.array([0.315, 0.41, 0.42]))
    face = ell(p, np.array([0, -0.06, 0.1]), np.array([0.285, 0.34, 0.3]))
    cheekbone = ell(pm, np.array([0.2, -0.03, 0.2]), np.array([0.11, 0.075, 0.12]))      # soft high cheekbones
    cheek = ell(pm, np.array([0.17, -0.16, 0.2]), np.array([0.12, 0.11, 0.12]))          # youthful full cheeks
    jaw = cap(pm, (0.24, -0.08, 0.02), (0.07, -0.37, 0.2), 0.075, 0.065)                  # V-line: jaw tapers to a soft narrow chin
    chin = ell(p, np.array([0, -0.4, 0.22]), np.array([0.085, 0.065, 0.08]))
    brow = ell(p, np.array([0, 0.13, 0.25]), np.array([0.27, 0.06, 0.1]))
    # eye sockets (the eyeballs sit inside, the lids close over them)
    u = pm[:, 0] - EYE_L[0]; v = pm[:, 1] - EYE_L[1] - 0.12 * u
    almond = np.sqrt((u / 0.066) ** 2 + (v / (0.036 * (1 - 0.35 * np.clip(-u / 0.066, 0, 1)))) ** 2) - 1.0
    sock = np.maximum(almond * 0.03, -(pm[:, 2] - 0.29))
    # nose: low bridge, rounded tip, alar wings, nostrils
    bridge = cap(p, (0, 0.07, 0.33), (0, -0.105, 0.415), 0.026, 0.036)
    tip = sph(p, (0, -0.122, 0.418), 0.044)
    ala = ell(pm, np.array([0.038, -0.142, 0.38]), np.array([0.027, 0.024, 0.026]))
    nose = smin(smin(bridge, tip, 0.03), ala, 0.02)
    nostril = ell(pm, np.array([0.022, -0.166, 0.398]), np.array([0.009, 0.005, 0.01]))
    # mouth: philtrum, upper and lower lip, the lip line
    muzzle = ell(p, np.array([0, -0.24, 0.27]), np.array([0.135, 0.085, 0.09]))
    ulip = ell(p, np.array([0, -0.226, 0.35]), np.array([0.07, 0.021, 0.034]))
    llip = ell(p, np.array([0, -0.263, 0.343]), np.array([0.062, 0.026, 0.034]))
    lipline = np.maximum(np.abs(p[:, 1] + 0.243) - 0.0025, np.maximum(np.abs(x) - 0.072, -(p[:, 2] - 0.31)))
    philtrum = cap(pm, (0.012, -0.185, 0.345), (0.012, -0.212, 0.35), 0.006, 0.006)
    # ears: small, flat, with a concha
    ear = ell(pm, np.array([0.335, -0.0, -0.02]), np.array([0.035, 0.1, 0.065])); concha = ell(pm, np.array([0.36, -0.01, -0.005]), np.array([0.02, 0.05, 0.035]))
    neck = cap(p, (0, -0.3, -0.05), (0, -0.85, -0.08), 0.15, 0.17)
    h = smin(cran, face, 0.13); h = smin(h, cheekbone, 0.06); h = smin(h, cheek, 0.09); h = smin(h, jaw, 0.1); h = smin(h, chin, 0.07); h = smin(h, brow, 0.07)
    h = smin(h, muzzle, 0.07); h = smax(h, -sph(pm, EYE_L, EYE_RAD + 0.004), 0.004); h = smax(h, -sock, 0.006); h = smin(h, nose, 0.025); h = smax(h, -nostril, 0.01)
    h = smin(h, ulip, 0.018); h = smin(h, llip, 0.02); h = smax(h, -lipline, 0.004); h = smax(h, -philtrum, 0.006)
    h = smin(h, ear, 0.025); h = smax(h, -concha, 0.01); h = smin(h, neck, 0.09)
    return h

def lids(p):
    """upper lids: a shell over the eyeball, cut by a tilted plane (an inner fold covers the inner corner); lower lids thinner"""
    pm = np.c_[np.abs(p[:, 0]), p[:, 1], p[:, 2]]; c = EYE_L
    shell = np.abs(sph(pm, c, EYE_RAD + 0.006)) - 0.004
    open_up = (pm[:, 1] - c[1]) - (0.018 - 0.12 * (pm[:, 0] - c[0]))       # lid edge slightly higher at the outer corner (Korean eye shape)
    upper = smax(shell, -open_up, 0.004)
    lower = smax(np.abs(sph(pm, c, EYE_RAD + 0.006)) - 0.003, (pm[:, 1] - c[1]) + 0.03, 0.004)
    front = -(pm[:, 2] - (c[2] - 0.01))                                       # only the front half
    return smax(np.minimum(upper, lower), front, 0.005)

def brows(p):
    pm = np.c_[np.abs(p[:, 0]), p[:, 1], p[:, 2]]
    return smin(cap(pm, (0.055, 0.125, 0.37), (0.15, 0.135, 0.36), 0.017, 0.015), cap(pm, (0.15, 0.135, 0.36), (0.235, 0.118, 0.31), 0.015, 0.008), 0.01)   # straight, thick Korean brows

def hair(p):
    x = p[:, 0]; xm = np.abs(x)
    shell = head(p) - 0.03
    top = ell(p, np.array([0, 0.38, -0.03]), np.array([0.335, 0.23, 0.45]))
    body = smin(shell, top, 0.09)
    side = 0.07 + 0.03 * np.clip(-p[:, 2] / 0.2, 0, 1)
    hl = np.where(p[:, 2] > 0.15, 0.3, np.where(p[:, 2] > -0.12, side + (0.3 - side) * np.clip((p[:, 2] + 0.12) / 0.27, 0, 1), -0.2))
    body = smax(body, hl - p[:, 1], 0.015)
    # big smooth fringe clumps sweeping down and to one side, tips curling (comma hair)
    cl = []
    for i, sx in enumerate(np.linspace(-0.24, 0.22, 7)):
        a = np.array([sx * 0.55 - 0.03, 0.47, 0.12]); b = np.array([sx + 0.03, 0.29, 0.37]); c = np.array([sx + 0.06, 0.19 + 0.012 * np.cos(i * 1.7), 0.39])
        r0 = 0.07 - 0.004 * abs(i - 3)
        cl.append(smin(cap(p, a, b, r0, 0.045), cap(p, b, c, 0.045, 0.014), 0.03))
    for i, (sx, sz) in enumerate([(-0.2, -0.05), (0.0, -0.1), (0.2, -0.04), (-0.12, -0.3), (0.12, -0.3)]):   # crown clumps
        cl.append(cap(p, (sx * 0.5, 0.58, sz - 0.1), (sx, 0.5, sz + 0.15), 0.08, 0.05))
    body = smin(body, np.min(np.stack(cl), axis=0), 0.04)
    return smax(body, -(head(p) - 0.006), 0.004)

out = {}
for name, fn, lo, hi, step, keep in [('head', head, (-0.42, -0.9, -0.52), (0.42, 0.62, 0.55), 0.0035, 0.25),                                       ('brows', brows, (-0.27, 0.07, 0.24), (0.27, 0.15, 0.37), 0.002, 0.5), ('hair', hair, (-0.45, -0.3, -0.58), (0.45, 0.72, 0.5), 0.0045, 0.3)]:
    v, f = mesh(fn, lo, hi, step, keep)
    out[name] = {'pos': [round(float(a), 5) for a in v.ravel()], 'idx': [int(a) for a in f.ravel()]}
    print(name, len(v), 'verts', len(f), 'tris')
out['eyes'] = {'L': EYE_L.tolist(), 'R': EYE_R.tolist(), 'r': EYE_RAD}
json.dump(out, open('data/kr_head.json', 'w'), separators=(',', ':'))
import os; print('json', os.path.getsize('data/kr_head.json') // 1024, 'KB')
