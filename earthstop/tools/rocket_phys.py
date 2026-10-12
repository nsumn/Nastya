# "Rocket" planet (shaft + rounded tip + two spheres at the base), same volume and mass as Earth.
# Monte-Carlo gravity at surface points. Units: shape units -> km after scaling.
import numpy as np
rng=np.random.default_rng(3)
# shape (same as scene): shaft radius ~2.05 (y -4.5..5.0), head radius 2.55 (y 5.0..7.9, hemisphere-ish), balls r=2.55 at (+-1.95,-5.4)
def inside(p):
    x,y,z=p[:,0],p[:,1],p[:,2]; r=np.hypot(x,z)
    shaft=(y>-4.6)&(y<5.4)&(r<2.05+0.08*np.sin(np.clip((y+4.5)/9.5,0,1)*np.pi))
    head=(y>=5.0)&(((r/2.6)**2+((y-5.4).clip(0)/2.5)**2)<1)
    b1=((x+1.95)**2+(y+5.4)**2+(z-0.3)**2)<2.55**2
    b2=((x-1.95)**2+(y+5.4)**2+(z+0.3)**2)<2.55**2
    return shaft|head|b1|b2
N=4_000_000
box=np.array([[-4.6,4.6],[-8.1,8.1],[-3.0,3.0]])
P=rng.uniform(box[:,0],box[:,1],(N,3)); m=inside(P); vol_box=np.prod(box[:,1]-box[:,0]); V=vol_box*m.mean(); pts=P[m]
VE=1.08321e12; s=(VE/V)**(1/3); print('shape volume units',V,'scale km/unit',s)
pts=pts*s; com=pts.mean(0); print('COM km',com)
G=6.674e-11; M=5.972e24; mp=M/len(pts)
def grav(q):
    d=pts-q; r=np.linalg.norm(d,axis=1); r=np.maximum(r,50.0)
    return (G*mp*(d/r[:,None]**3).sum(0))*1e-6  # km->m: d in km, r^3 in km^3 -> 1/km^2 = 1e-6 /m^2 ... times m: d/r^3 has 1/km^2
def report(name,q,nrm):
    g=grav(q); gm=np.linalg.norm(g)*1e0
    gm_ms2=gm  # see below
    tilt=np.degrees(np.arccos(np.clip(np.dot(-g/np.linalg.norm(g),nrm),-1,1)))
    print(f'{name:12s} |g|={gm_ms2/9.81:.2f} G  tilt from local vertical={tilt:.0f} deg  dist from COM={np.linalg.norm(q-com):.0f} km')
# note: G*mp*d/r^3 with d,r in km gives m^3/s^2 /km^2 = 1e-6 m/s^2 -> multiply 1e-6 done above
sub=rng.choice(len(pts),600000,replace=False); pts=pts[sub]; mp=M/len(pts)
report('tip',np.array([0,7.9*s,0]),np.array([0,1,0]))
report('shaft mid',np.array([2.13*s,0.5*s,0]),np.array([1,0,0]))
report('shaft low',np.array([2.1*s,-3.5*s,0]),np.array([1,0,0]))
report('ball side',np.array([(1.95+2.55)*s,-5.4*s,-0.3*s]),np.array([1,0,0]))
report('ball bottom',np.array([1.95*s,(-5.4-2.55)*s,-0.3*s]),np.array([0,-1,0]))
print('length km',(7.9+7.95)*s,' mi',(7.9+7.95)*s*0.6214, ' shaft dia km',4.1*s, 'tip height above COM mi',(7.9*s-com[1])*0.6214)
# free-fall of the tip toward COM (crude: constant g at tip-> collapse timescale)
gt=np.linalg.norm(grav(np.array([0,7.9*s,0])))
h=(7.9*s-com[1])*1000-6371e3
print('tip excess over Earth radius km',h/1000,' fall time (const g) min',np.sqrt(2*h/gt)/60)
def pot(q):
    d=np.linalg.norm(pts-q,axis=1); d=np.maximum(d,50.0); return -G*mp*(1/d).sum()/1000  # J/kg (d in km -> /1000)
print('--- potential (MJ/kg), lower = where water pools')
for name,q in [('tip',[0,7.9*s,0]),('head rim',[2.62*s,5.35*s,0]),('shaft top',[2.1*s,4.0*s,0]),('shaft mid',[2.13*s,0.5*s,0]),('shaft low',[2.1*s,-3.5*s,0]),('crotch',[0,-5.4*s,2.0*s]),('ball side',[(1.95+2.55)*s,-5.4*s,-0.3*s]),('ball bottom',[1.95*s,-7.95*s,-0.3*s])]:
    print(f'{name:12s} {pot(np.array(q))/1e6:8.2f}')
# height difference between tip and ball bottom in equivalent Earth-gravity metres: dU/g
print('--- city on the coast (shaft side, y=-2.6 units)')
for yy in [-2.6,-2.2]:
    r=2.05+0.08*np.sin(np.clip((yy+4.5)/9.5,0,1)*np.pi)
    q=np.array([r*s,yy*s,0]); report(f'city y={yy}',q,np.array([1,0,0])); print('   potential',pot(q)/1e6)
    g=grav(q); print('   g vector dir',g/np.linalg.norm(g))
print('tip distance along axis from city mi',(7.9-(-2.6))*s*0.6214)
print('ball top above city plane mi',((1.95+2.55)-2.07)*s*0.6214, ' ball centre distance behind mi',(-2.6+5.4)*s*0.6214)
