#!/usr/bin/env python3
"""Low-poly human for makeBlock({body:'human', head:'human'}).

Body, head and hair are modelled as signed distance fields (ellipsoids, tapered capsules, smooth unions),
meshed with marching cubes and decimated hard, so the facets come out irregular like a hand-made low-poly model.
The body is ONE continuous mesh (shoulders flow into the arms) with skin weights for the makeBlock joints:
  0 root (pelvis) 1 torso 2 shoulderL 3 elbowL 4 shoulderR 5 elbowR 6 hipL 7 kneeL 8 hipR 9 kneeR
Joint positions match d_block.js: shoulder (+-0.255, 1.45), elbow -0.28 below it, hip (+-0.1, 0.9), knee -0.42 below it.
Output: data/human_mesh.json  (body: non-indexed positions/uv/skin, faces grouped by region; head/hair: indexed, head units).
"""
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

def rbox(p, c, h, r):
    q = np.abs(p - c) - (np.array(h) - r)
    return np.linalg.norm(np.maximum(q, 0), axis=1) + np.minimum(q.max(axis=1), 0) - r

def smin(a, b, k):
    k = np.maximum(k, 1e-6); h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1)
    return b + (a - b) * h - k * h * (1 - h)

def smax(a, b, k): return -smin(-a, -b, k)

def mesh(fn, lo, hi, step, faces):
    xs = [np.arange(lo[i], hi[i] + step, step) for i in range(3)]
    G = np.stack(np.meshgrid(*xs, indexing='ij'), -1).reshape(-1, 3)
    vol = fn(G).reshape(len(xs[0]), len(xs[1]), len(xs[2]))
    v, f, _, _ = marching_cubes(vol, 0.0, spacing=(step, step, step))
    v += np.array(lo)
    red = 1 - faces / len(f)
    v2, f2 = fs.simplify(v.astype(np.float32), f.astype(np.int32), target_reduction=red, agg=7)
    return v2.astype(float), f2.astype(int)

# ---------------- body ----------------
SH, EL, WR = 1.45, 1.17, 0.95
HIP, KN, AN = 0.9, 0.48, 0.075

def groups(p):
    """distance per bone group (index = bone id), plus extras used for regions"""
    x = p[:, 0]; s = np.sign(x + 1e-9); ax = np.abs(x); pm = np.c_[ax, p[:, 1], p[:, 2]]   # mirror to the right side
    d = {}
    pel = rbox(p, np.array([0, 0.95, 0]), (0.165, 0.1, 0.1), 0.07)
    d[0] = pel
    abd = ell(p, np.array([0, 1.12, 0.0]), np.array([0.155, 0.14, 0.1]))
    chest = ell(p, np.array([0, 1.31, 0.005]), np.array([0.16, 0.17, 0.098]))
    girdle = cap(p, (-0.165, 1.425, -0.01), (0.165, 1.425, -0.01), 0.058, 0.058)
    traps = cap(pm, (0.0, 1.52, -0.02), (0.165, 1.455, -0.02), 0.048, 0.046)
    neck = cap(p, (0, 1.46, -0.005), (0, 1.72, 0.01), 0.05, 0.046)   # long enough for the head lifted by 0.06 (d_block.js)
    hood = smin(ell(p, np.array([0, 1.515, -0.03]), np.array([0.16, 0.055, 0.135])) , ell(p, np.array([0, 1.47, -0.115]), np.array([0.14, 0.1, 0.06])), 0.03)
    hood = smax(hood, -(np.linalg.norm(p[:, [0, 2]] - np.array([0, 0.005]), axis=1) - 0.062), 0.01)   # hole for the neck
    tor = smin(smin(smin(abd, chest, 0.1), girdle, 0.07), traps, 0.07)   # slim, no muscles
    d['hood'] = hood; d['neck'] = neck
    if OUTFIT == 'tee':   # oversized tee: a loose box from the shoulders to below the hips, dropped shoulders
        tee = rbox(p, np.array([0, 1.12, 0.0]), (0.2, 0.29, 0.128), 0.1)   # body of the tee, top at 1.41
        slope = cap(pm, (0.0, 1.49, -0.01), (0.215, 1.395, -0.005), 0.07, 0.075)   # shoulders slope down from the neck (no square top)
        tor = smin(smin(tor, tee, 0.05), slope, 0.07)
        d['hood'] = smin(tor, tee, 0.05)   # (for the neckline test below)
        d[1] = smin(tor, neck, 0.02)
    else: d[1] = smin(smin(tor, hood, 0.02), neck, 0.03)
    for side, (bs, be) in ((-1, (2, 3)), (1, (4, 5))):
        q = np.c_[x * side, p[:, 1], p[:, 2]]   # this side mirrored to +x
        delt = ell(q, np.array([0.235, 1.42, 0.0]), np.array([0.048, 0.06, 0.052]))
        up = cap(q, (0.255, SH - 0.02, 0), (0.258, EL, 0), 0.043, 0.036)
        fore = cap(q, (0.258, EL, 0), (0.258, WR + 0.01, 0.005), 0.041, 0.032)
        # a relaxed fist: palm block, the curled fingers as one rolled knuckle row, the thumb wrapped over the front
        palm = smin(rbox(q, np.array([0.258, 0.9, 0.006]), (0.021, 0.04, 0.038), 0.017), cap(q, (0.252, 0.858, -0.024), (0.252, 0.858, 0.034), 0.021, 0.02), 0.025)
        thumb = cap(q, (0.243, 0.915, 0.034), (0.236, 0.878, 0.046), 0.013, 0.012)
        d[bs] = smin(delt, up, 0.05)
        if OUTFIT == 'tee':   # wide short sleeve, hanging a bit away from the arm, open end just above the elbow
            sl = smax(cap(q, (0.228, 1.385, 0), (0.272, 1.16, 0.0), 0.085, 0.08), 1.205 - q[:, 1], 0.012)   # ends just above the elbow, so the elbow bends freely
            d[bs] = np.minimum(d[bs], sl)
        d[be] = smin(fore, smin(palm, thumb, 0.01), 0.025)
        d[('hand', side)] = smin(palm, thumb, 0.01)
    for side, (bh, bk) in ((-1, (6, 7)), (1, (8, 9))):
        q = np.c_[x * side, p[:, 1], p[:, 2]]
        thigh = cap(q, (0.1, HIP + 0.02, 0), (0.1, KN, 0.005), 0.08, 0.064)
        shin = cap(q, (0.1, KN, 0.005), (0.1, AN + 0.03, -0.01), 0.061, 0.057)
        shoe = smin(rbox(q, np.array([0.1, 0.045, 0.045]), (0.052, 0.045, 0.125), 0.035), ell(q, np.array([0.1, 0.06, -0.035]), np.array([0.05, 0.06, 0.06])), 0.03)
        d[bh] = thigh   # straight jeans, no muscle bulges
        d[bk] = smin(shin, shoe, 0.04)
        d[('shoe', side)] = shoe
    return d

def body_sdf(p):
    d = groups(p); y = p[:, 1]
    kS = np.where(y > 1.34, 0.06, 0.003)   # shoulders blend into the chest; lower arm/hand stays free of the body
    core = smin(d[0], d[1], 0.07)
    for a, b in ((2, 3), (4, 5)): core = smin(core, smin(d[a], d[b], 0.035), kS)
    for a, b in ((6, 7), (8, 9)): core = smin(core, smin(d[a], d[b], 0.035), 0.05)
    return core

OUTFIT = 'hoodie'
def build_body():
    bv, bf = mesh(body_sdf, (-0.36, -0.01, -0.2), (0.36, 1.76, 0.22), 0.007, 3600)
    print('body', len(bv), 'verts', len(bf), 'faces')

    D = groups(bv); bone = np.stack([D[i] for i in range(10)], 1)
    w = np.exp(-(bone - bone.min(1, keepdims=True)) / 0.018)
    # below the shoulder cap arms and torso barely drag each other (no stretched "wings" when an arm goes up)
    dom = bone.argmin(1); arm = np.isin(dom, [2, 3, 4, 5]); low = bv[:, 1] < 1.4
    Dv = bone - bone.min(1, keepdims=True); tight = np.exp(-Dv / 0.005)   # only a thin seam blends between an arm and the torso: no gaps, no wings
    for b in (0, 1): w[arm & low, b] = tight[arm & low, b]
    for b in (2, 3, 4, 5): w[(~arm) & low, b] = tight[(~arm) & low, b]
    w[np.arange(len(w)), dom] = np.maximum(w[np.arange(len(w)), dom], 1e-6)
    idx = np.argsort(-w, 1)[:, :4]
    ww = np.take_along_axis(w, idx, 1); ww /= ww.sum(1, keepdims=True)

    C = bv[bf].mean(1); DC = groups(C); bc = np.stack([DC[i] for i in range(10)], 1).argmin(1)
    cx, cy, cz = C[:, 0], C[:, 1], C[:, 2]
    REG = ['skin', 'top', 'top2', 'sleeve', 'bottom', 'cuff', 'shoe', 'sole']
    reg = np.full(len(bf), 'top', dtype=object)
    for i in range(len(bf)):
        g = bc[i]; y = cy[i]
        if g == 1:
            r = 'top'
            if y > 1.5 and DC['neck'][i] < DC['hood'][i] - 0.004: r = 'skin'
            if OUTFIT != 'tee' and cz[i] > 0.05 and abs(cx[i]) < 0.11 and 1.05 < y < 1.19: r = 'top2'   # kangaroo pocket
            if y < 1.0 and OUTFIT != 'tee': r = 'top2'
            if OUTFIT == 'tee' and y > 1.47 and DC['neck'][i] < 0.025 and r != 'skin': r = 'top2'   # neck rib
        elif g == 0: r = 'top2' if y > 0.985 and OUTFIT != 'tee' else 'bottom'
        elif g in (2, 4): r = 'skin' if OUTFIT == 'tee' and y < 1.2 else 'top'   # bare arm between the sleeve and the elbow
        elif g in (3, 5):
            side = -1 if g == 3 else 1
            r = 'skin' if OUTFIT == 'tee' or DC[('hand', side)][i] < 0.006 or y < 0.95 else ('top2' if y < 0.985 else 'sleeve')
        elif g in (6, 8): r = 'bottom'
        else:
            side = -1 if g == 7 else 1
            if DC[('shoe', side)][i] < 0.004 or y < 0.09: r = 'sole' if y < 0.018 else 'shoe'
            elif y < 0.15: r = 'cuff'
            else: r = 'bottom'
        reg[i] = r

    def uv_of(pt, i):
        """cylindrical UV around each leg / the pelvis, seam on the outer side (legs) or the back (pelvis)"""
        x, y, z = pt
        if bc[i] in (6, 7, 8, 9): sx = 0.1 if bc[i] in (8, 9) else -0.1; a = np.arctan2((x - sx) * np.sign(sx), z)   # 0 = front, +pi/2 = outer
        else: a = np.arctan2(x, z) + np.pi   # pelvis: seam at the back
        return [(a / (2 * np.pi) - 0.25) % 1.0, y / 0.9]

    order = sorted(range(len(bf)), key=lambda i: REG.index(reg[i]))
    pos, uv, si, sw, grp = [], [], [], [], []
    for i in order:
        u3 = []
        for k in bf[i]: pos += list(np.round(bv[k], 4)); si += [int(v) for v in idx[k]]; sw += [round(float(v), 3) for v in ww[k]]; u3.append(uv_of(bv[k], i))
        us = [u[0] for u in u3]
        if max(us) - min(us) > 0.5: u3 = [[u[0] + 1 if u[0] < 0.5 else u[0], u[1]] for u in u3]
        for u in u3: uv += [round(u[0], 4), round(u[1], 4)]
    cnt = {r: int((reg == r).sum()) for r in REG}
    start = 0
    for r in REG:
        if cnt[r]: grp.append([r, start * 3, cnt[r] * 3]); start += cnt[r]
    print(OUTFIT, cnt)
    return {'pos': [float(a) for a in pos], 'uv': uv, 'skinIndex': si, 'skinWeight': sw, 'groups': grp}


BODY = {}
for OUTFIT in ('hoodie', 'tee'): BODY[OUTFIT] = build_body()

# ---------------- head (head units: eyes at y=0, x=+-0.19 as drawn on the face texture, mouth y=-0.27) ----------------
def head_sdf(p):
    x = p[:, 0]; pm = np.c_[np.abs(x), p[:, 1], p[:, 2]]
    cran = ell(p, np.array([0, 0.1, -0.05]), np.array([0.355, 0.43, 0.45]))
    face = ell(p, np.array([0, -0.1, 0.08]), np.array([0.3, 0.33, 0.31]))
    jaw = ell(pm, np.array([0.12, -0.29, 0.07]), np.array([0.145, 0.15, 0.23]))   # wider lower jaw
    chin = ell(p, np.array([0, -0.37, 0.215]), np.array([0.18, 0.1, 0.13]))   # broad chin in line with the lips, melts into the jaw
    cheek = ell(pm, np.array([0.2, -0.05, 0.18]), np.array([0.11, 0.08, 0.11]))
    brow = ell(p, np.array([0, 0.125, 0.25]), np.array([0.3, 0.07, 0.13]))
    muzz = ell(p, np.array([0, -0.24, 0.26]), np.array([0.14, 0.08, 0.1]))
    nose = smin(cap(p, (0, 0.06, 0.35), (0, -0.1, 0.45), 0.032, 0.042), ell(p, np.array([0, -0.115, 0.39]), np.array([0.075, 0.042, 0.05])), 0.03)
    ear = ell(pm, np.array([0.355, -0.0, -0.03]), np.array([0.045, 0.11, 0.075]))
    sock = np.linalg.norm(pm - np.array([0.18, 0.02, 0.43]), axis=1) - 0.075
    h = smin(cran, face, 0.12); h = smin(h, jaw, 0.1); h = smin(h, chin, 0.12); h = smin(h, cheek, 0.06); h = smin(h, brow, 0.06); h = smin(h, muzz, 0.06)
    h = smax(h, -sock, 0.05); h = smin(h, nose, 0.03); h = smin(h, ear, 0.03)
    return h

hv, hf = mesh(head_sdf, (-0.45, -0.55, -0.55), (0.45, 0.6, 0.6), 0.01, 1100)
print('head', len(hv), len(hf), 'y', hv[:, 1].min(), hv[:, 1].max(), 'z', hv[:, 2].max())

def hairline(p, front, back):
    """y of the hairline: high in the middle of the forehead, down at the temples and over the ears, low at the nape"""
    x, z = np.abs(p[:, 0]), p[:, 2]; lf = front - 0.13 * np.clip(x / 0.33, 0, 1) ** 2
    return np.where(z > 0, 0.09 + (lf - 0.09) * np.clip(z / 0.3, 0, 1), 0.09 + (back - 0.09) * np.clip(-z / 0.38, 0, 1))

def hair_sdf_fn(style):
    def f(p):
        shell = head_sdf(p) - 0.03   # hair hugs the real skull (no helmet / cone)
        top = ell(p, np.array([0, 0.33, -0.01]), np.array([0.345, 0.22, 0.44]))   # a bit of volume on top, as wide as the head
        if style == 'quiff':   # short sides; the front pushed up and swept to one side in chunky strands
            tips = [((-0.2, 0.42, 0.24), (-0.08, 0.5, 0.4)), ((-0.08, 0.47, 0.22), (0.04, 0.53, 0.38)), ((0.05, 0.48, 0.2), (0.16, 0.52, 0.36)), ((0.17, 0.44, 0.2), (0.27, 0.45, 0.32)),
                    ((-0.12, 0.52, 0.05), (-0.02, 0.57, 0.2)), ((0.08, 0.53, 0.03), (0.17, 0.56, 0.17)), ((-0.02, 0.55, -0.12), (0.06, 0.58, 0.02))]
            fr = 0.27
        else:   # 'fringe': strands combed down over the forehead
            tips = [((sx, 0.36, 0.26), (sx + 0.05, 0.21, 0.42)) for sx in (-0.22, -0.1, 0.02, 0.14)]
            fr = 0.2
        strands = np.min(np.stack([cap(p, a_, b_, 0.055, 0.014) for a_, b_ in tips]), axis=0)
        s = smin(smin(shell, top, 0.06), strands, 0.035)
        return smax(s, hairline(p, fr, -0.24) - p[:, 1], 0.02)
    return f

hair = {}
for st in ('quiff', 'fringe'):
    v, f = mesh(hair_sdf_fn(st), (-0.5, -0.4, -0.6), (0.5, 0.85, 0.62), 0.008, 1400)
    hair[st] = {'pos': [round(float(a), 4) for a in v.ravel()], 'idx': [int(a) for a in f.ravel()]}
    print('hair', st, len(f))

out = {'body': BODY,
       'head': {'pos': [round(float(a), 4) for a in hv.ravel()], 'idx': [int(a) for a in hf.ravel()]}, 'hair': hair}
json.dump(out, open('data/human_mesh.json', 'w'), separators=(',', ':'))
import os; print('json', os.path.getsize('data/human_mesh.json') // 1024, 'KB')
