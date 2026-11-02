#!/usr/bin/env python3
"""Korean hero for makeBlock({head:'human', headMesh:'head_kr', hairStyle:'twoblock', kr:true}).
Same faceted low-poly method as tools/human_mesh.py (SDF -> marching cubes -> hard decimation), added INTO data/human_mesh.json
without touching the approved US meshes: 'head_kr' (soft V-line jaw, narrow chin in line with the lips, higher cheekbones,
low nose bridge with a rounded tip, flatter brow ridge, smaller ears) and hair['twoblock'] (short sides, full top,
curtain "comma" fringe parted a little off-centre, ends above the brows so the drawn brows stay visible)."""
import json, numpy as np, sys
sys.argv = [sys.argv[0]]
from skimage.measure import marching_cubes
import fast_simplification as fs

def ell(p, c, r):
    q = (p - c) / r; k0 = np.linalg.norm(q, axis=1); k1 = np.linalg.norm(q / r, axis=1)
    return k0 * (k0 - 1) / np.maximum(k1, 1e-9)
def cap(p, a, b, ra, rb):
    a, b = np.array(a, float), np.array(b, float); ba = b - a
    t = np.clip(((p - a) @ ba) / (ba @ ba), 0, 1)
    return np.linalg.norm(p - (a + t[:, None] * ba), axis=1) - (ra + (rb - ra) * t)
def smin(a, b, k):
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1); return b + (a - b) * h - k * h * (1 - h)
def smax(a, b, k): return -smin(-a, -b, k)
def mesh(fn, lo, hi, step, faces):
    xs = [np.arange(lo[i], hi[i] + step, step) for i in range(3)]
    G = np.stack(np.meshgrid(*xs, indexing='ij'), -1).reshape(-1, 3)
    vol = fn(G).reshape(len(xs[0]), len(xs[1]), len(xs[2]))
    v, f, _, _ = marching_cubes(vol, 0.0, spacing=(step, step, step)); v += np.array(lo)
    v2, f2 = fs.simplify(v.astype(np.float32), f.astype(np.int32), target_reduction=1 - faces / len(f), agg=7)
    return v2.astype(float), f2.astype(int)

# head units: eyes drawn at y=0, x=+-0.19, mouth y=-0.27 (same as the US head so the face decal fits)
def head_kr(p):
    x = p[:, 0]; pm = np.c_[np.abs(x), p[:, 1], p[:, 2]]
    cran = ell(p, np.array([0, 0.12, -0.04]), np.array([0.35, 0.44, 0.43]))           # rounder, a little taller skull
    face = ell(p, np.array([0, -0.08, 0.08]), np.array([0.3, 0.33, 0.3]))
    jaw = cap(pm, (0.22, -0.12, 0.02), (0.07, -0.35, 0.17), 0.085, 0.075)             # V-line: the jaw tapers to the chin
    chin = ell(p, np.array([0, -0.37, 0.2]), np.array([0.13, 0.085, 0.11]))          # narrow soft chin, in line with the lips
    cheek = ell(pm, np.array([0.21, -0.03, 0.17]), np.array([0.12, 0.085, 0.11]))    # high cheekbones
    fat = ell(pm, np.array([0.16, -0.17, 0.19]), np.array([0.12, 0.1, 0.11]))        # youthful cheeks
    brow = ell(p, np.array([0, 0.13, 0.23]), np.array([0.29, 0.065, 0.12]))          # flatter brow ridge
    muzz = ell(p, np.array([0, -0.24, 0.25]), np.array([0.13, 0.08, 0.1]))
    nose = smin(cap(p, (0, 0.02, 0.33), (0, -0.1, 0.415), 0.03, 0.04), ell(p, np.array([0, -0.12, 0.37]), np.array([0.08, 0.042, 0.05])), 0.03)   # low bridge, rounded wide tip
    ear = ell(pm, np.array([0.345, -0.01, -0.03]), np.array([0.04, 0.1, 0.065]))
    sock = np.linalg.norm(pm - np.array([0.18, 0.02, 0.42]), axis=1) - 0.06         # shallow sockets
    h = smin(cran, face, 0.13); h = smin(h, jaw, 0.11); h = smin(h, chin, 0.11); h = smin(h, cheek, 0.07); h = smin(h, fat, 0.1); h = smin(h, brow, 0.06); h = smin(h, muzz, 0.07)
    h = smax(h, -sock, 0.05); h = smin(h, nose, 0.03); h = smin(h, ear, 0.03)
    return h

def hairline(p, front, back):
    x, z = np.abs(p[:, 0]), p[:, 2]; lf = front - 0.1 * np.clip(x / 0.33, 0, 1) ** 2
    return np.where(z > 0, 0.11 + (lf - 0.11) * np.clip(z / 0.3, 0, 1), 0.11 + (back - 0.11) * np.clip(-z / 0.38, 0, 1))

def twoblock(p):
    x = p[:, 0]
    shell = head_kr(p) - 0.022                                                           # short sides hug the skull
    top = ell(p, np.array([0, 0.3, -0.03]), np.array([0.34, 0.2, 0.43]))             # full volume on top
    body = smin(shell, top, 0.07)
    body = smax(body, hairline(p, 0.2, -0.26) - p[:, 1], 0.02)
    # curtain fringe: chunky strands from the crown, falling forward and out to each side of a part at x=-0.04, tips curling outward above the brows
    st = []
    for sx in (-0.26, -0.17, -0.09):                                                     # left curtain
        st.append(smin(cap(p, (sx * 0.4 - 0.03, 0.5, 0.08), (sx, 0.38, 0.34), 0.05, 0.042), cap(p, (sx, 0.38, 0.34), (sx - 0.07, 0.22, 0.39), 0.042, 0.014), 0.02))
    for sx in (0.01, 0.1, 0.19, 0.27):                                                   # right curtain (the bigger side)
        st.append(smin(cap(p, (sx * 0.4 - 0.02, 0.51, 0.08), (sx, 0.39, 0.34), 0.052, 0.044), cap(p, (sx, 0.39, 0.34), (sx + 0.07, 0.22 - 0.01 * (sx > 0.15), 0.39), 0.044, 0.014), 0.02))
    for sx, sz in ((-0.18, -0.08), (0.0, -0.14), (0.18, -0.08), (-0.1, -0.32), (0.1, -0.32)):   # soft crown clumps
        st.append(cap(p, (sx * 0.5, 0.47, sz - 0.08), (sx, 0.44, sz + 0.14), 0.065, 0.05))
    body = smin(body, np.min(np.stack(st), axis=0), 0.015)
    part = cap(p, (-0.04, 0.52, 0.0), (-0.04, 0.4, 0.4), 0.016, 0.014)                   # the parting line
    return smax(body, -part, 0.01)

d = json.load(open('data/human_mesh.json'))
hv, hf = mesh(head_kr, (-0.45, -0.58, -0.55), (0.45, 0.62, 0.6), 0.01, 1150)
d['head_kr'] = {'pos': [round(float(a), 4) for a in hv.ravel()], 'idx': [int(a) for a in hf.ravel()]}
v, f = mesh(twoblock, (-0.5, -0.4, -0.6), (0.5, 0.85, 0.62), 0.008, 1600)
d['hair']['twoblock'] = {'pos': [round(float(a), 4) for a in v.ravel()], 'idx': [int(a) for a in f.ravel()]}
print('head_kr', len(hf), 'hair twoblock', len(f))
json.dump(d, open('data/human_mesh.json', 'w'), separators=(',', ':'))
