import numpy as np
from matplotlib.path import Path
# wave-planet cross-section (km): x forward (toward trough), y up. closed, counter-clockwise-ish
P = np.array([(-8500,0),(-6500,1200),(-4200,3300),(-2000,5600),(0,7400),(1800,8400),(3800,8300),(5600,7300),(6900,5700),(7400,4200),
              (6800,4300),(5900,5400),(4400,6100),(2900,5900),(1800,5000),(1100,3600),(900,2200),(1300,1100),(2400,400),(4200,120),(6500,30),(9500,0),
              (9300,-900),(5000,-1500),(0,-1700),(-5000,-1500),(-8000,-800)],float)
path = Path(P)
def area(p): x,y=p[:,0],p[:,1]; return 0.5*abs(np.dot(x,np.roll(y,-1))-np.dot(y,np.roll(x,-1)))
A = area(P)
V_E = 1.08321e12; M = 5.972e24; G=6.674e-11
cx = (P[:,0].min()+P[:,0].max())/2; cy=(P[:,1].min()+P[:,1].max())/2
Lz = V_E/(A*6/7)
print(f'area {A:.3e} km2, Lz {Lz:.0f} km')
rng=np.random.default_rng(1); n=0; pts=[]
xmin,xmax,ymin,ymax=P[:,0].min(),P[:,0].max(),P[:,1].min(),P[:,1].max()
while n<400000:
    q=np.column_stack([rng.uniform(xmin,xmax,200000),rng.uniform(ymin,ymax,200000),rng.uniform(-Lz/2,Lz/2,200000)])
    s=np.sqrt(np.clip(1-(2*q[:,2]/Lz)**6,0,1))
    # inverse-scale about (cx,cy) to test membership
    x0=cx+(q[:,0]-cx)/np.maximum(s,1e-6); y0=cy+(q[:,1]-cy)/np.maximum(s,1e-6)
    ok=path.contains_points(np.column_stack([x0,y0]))&(s>0.01)
    pts.append(q[ok]); n+=ok.sum()
pts=np.vstack(pts)[:400000]
com=pts.mean(0); print('COM km',com.round(0))
m=M/len(pts)
def g(p):
    d=(pts-p)*1e3; r=np.sqrt((d**2).sum(1)+ (60e3)**2); return (G*m*d/r[:,None]**3).sum(0)
for name,p,nrm in [('city trough x=4800',np.array([4800,80,0]),np.array([0,1,0])),('far trough x=8000',np.array([8000,0,0]),np.array([0,1,0])),
                   ('crest top',np.array([1800,8400,0]),np.array([-0.3,1,0])),('lip tip',np.array([7300,4300,0]),np.array([1,0,0])),('back base',np.array([-7000,-1200,0]),np.array([-1,-0.3,0]))]:
    gv=g(p); gm=np.linalg.norm(gv); nrm=nrm/np.linalg.norm(nrm)
    tilt=np.degrees(np.arccos(np.clip(-gv@nrm/gm,-1,1)))
    print(f'{name}: |g|={gm:.2f} m/s2 ({gm/9.81:.2f} G) dir={np.round(gv/gm,2)} tilt_vs_normal={tilt:.1f} deg')
# lip fall time: from lip tip straight along g until hitting... estimate h = distance from lip tip to trough ground below
gl=np.linalg.norm(g(np.array([7300,4300,0]))); h=4300e3
print('lip fall (const g) min', np.sqrt(2*h/gl)/60)
rho=M/(V_E*1e9); print('free-fall time of Earth-density sphere min', np.sqrt(3*np.pi/(32*G*rho))/60)
print('crest height above trough km',8200,'mi',8200/1.609)
frac=(pts[:,1]>4000).mean(); print('mass fraction above y=4000:',frac)
ocean_km3=1.335e9; print('ocean mi3', ocean_km3/4.168)

# sea: nearest surface points to COM along the face
for q in [(900,2200),(1100,3600),(1300,1100),(1000,1600),(950,2800)]:
    print('dist COM', q, np.hypot(q[0]-com[0], q[1]-com[1]))
print('bbox centre', (P[:,0].min()+P[:,0].max())/2, (P[:,1].min()+P[:,1].max())/2)
