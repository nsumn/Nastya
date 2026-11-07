#!/usr/bin/env python3
"""(helpers copied from tools/human_kr.py) Korean hero for makeBlock({head:'human', headMesh:'head_kr', hairStyle:'twoblock', kr:true}).
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
def head_f(p):
    """The heroine of the love video: a softer heart-shaped face — rounder forehead, high full cheeks, a narrow soft jaw that tapers
    to a small rounded chin (in line with the lips), a small straight nose with an upturned tip, a gentle brow, small ears."""
    x = p[:, 0]; pm = np.c_[np.abs(x), p[:, 1], p[:, 2]]
    cran = ell(p, np.array([0, 0.13, -0.05]), np.array([0.34, 0.43, 0.42]))
    face = ell(p, np.array([0, -0.06, 0.07]), np.array([0.29, 0.31, 0.29]))
    jaw = cap(pm, (0.21, -0.1, 0.03), (0.09, -0.33, 0.16), 0.085, 0.08)
    chin = ell(p, np.array([0, -0.36, 0.185]), np.array([0.145, 0.085, 0.105]))
    cheek = ell(pm, np.array([0.19, -0.05, 0.18]), np.array([0.13, 0.1, 0.12]))
    fat = ell(pm, np.array([0.15, -0.15, 0.2]), np.array([0.12, 0.1, 0.11]))
    brow = ell(p, np.array([0, 0.14, 0.22]), np.array([0.28, 0.06, 0.11]))
    muzz = ell(p, np.array([0, -0.23, 0.24]), np.array([0.12, 0.075, 0.1]))
    nose = smin(cap(p, (0, 0.03, 0.32), (0, -0.09, 0.4), 0.026, 0.032), ell(p, np.array([0, -0.11, 0.375]), np.array([0.06, 0.035, 0.045])), 0.025)
    ear = ell(pm, np.array([0.335, -0.02, -0.03]), np.array([0.035, 0.085, 0.055]))
    sock = np.linalg.norm(pm - np.array([0.18, 0.02, 0.41]), axis=1) - 0.06
    h = smin(cran, face, 0.13); h = smin(h, jaw, 0.11); h = smin(h, chin, 0.11); h = smin(h, cheek, 0.08); h = smin(h, fat, 0.1); h = smin(h, brow, 0.06); h = smin(h, muzz, 0.07)
    h = smax(h, -sock, 0.05); h = smin(h, nose, 0.025); h = smin(h, ear, 0.03)
    return h

d = json.load(open('data/human_mesh.json'))
hv, hf = mesh(head_f, (-0.45, -0.58, -0.55), (0.45, 0.62, 0.6), 0.01, 1150)
d['head_f'] = {'pos': [round(float(a), 4) for a in hv.ravel()], 'idx': [int(a) for a in hf.ravel()]}
print('head_f', len(hf))
json.dump(d, open('data/human_mesh.json', 'w'), separators=(',', ':'))
