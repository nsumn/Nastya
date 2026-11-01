"""Convert an ASCII FBX 6.1 mesh (old Blender exporter) to OBJ: Vertices, PolygonVertexIndex, LayerElementUV (UV + UVIndex). Usage: python3 tools/fbx6_to_obj.py in.fbx out.obj"""
import re, sys
s = open(sys.argv[1]).read()
def arr(key, start=0):
    i = re.compile(r'\n\s*' + key + r':').search(s, start).end(); j = i
    while True:   # values continue over lines that start with ',' or digits
        k = s.find('\n', j); line = s[j:k]; j = k + 1
        nxt = s[j:s.find('\n', j)].strip()
        if not (nxt.startswith(',') or re.match(r'^-?[0-9]', nxt)): break
    return [float(x) for x in re.findall(r'-?[0-9.]+(?:e[-+]?[0-9]+)?', s[i:j])]
V = arr('Vertices'); P = [int(x) for x in arr('PolygonVertexIndex')]
uvs = s.index('LayerElementUV'); UV = arr('UV', uvs); UI = [int(x) for x in arr('UVIndex', uvs)]
out = open(sys.argv[2], 'w'); out.write('mtllib none\n')
for i in range(0, len(V), 3): out.write(f'v {V[i]} {V[i+1]} {V[i+2]}\n')
for i in range(0, len(UV), 2): out.write(f'vt {UV[i]} {UV[i+1]}\n')
poly, c = [], 0
for p in P:
    vi = p if p >= 0 else -p - 1; poly.append((vi + 1, UI[c] + 1)); c += 1
    if p < 0: out.write('f ' + ' '.join(f'{a}/{b}' for a, b in poly) + '\n'); poly = []
print('verts', len(V) // 3, 'uv', len(UV) // 2, 'idx', len(P))
