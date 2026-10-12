# Frictionless fall through Earth's centre, PREM-like layered density (piecewise linear in r)
import numpy as np
G=6.674e-11
# (r_km, rho at bottom, rho at top) per layer
L=[(0,1221.5,13.09,12.76),(1221.5,3480,12.17,9.90),(3480,5701,5.57,4.38),(5701,5771,3.99,3.98),(5771,5971,3.98,3.54),(5971,6151,3.54,3.36),(6151,6346.6,3.36,3.30),(6346.6,6356,2.90,2.90),(6356,6371,2.60,2.60)]
r=np.linspace(0,6371e3,200001); rho=np.zeros_like(r)
for a,b,r0,r1 in L:
    m=(r>=a*1e3)&(r<=b*1e3); rho[m]=(r0+(r1-r0)*(r[m]/1e3-a)/(b-a))*1000
dm=4*np.pi*r**2*rho*np.gradient(r); M=np.cumsum(dm)
print('mass',M[-1])
g=np.where(r>0,G*M/np.maximum(r,1)**2,0)
print('g surface',g[-1])
# energy: v(r)^2 = 2*int_r^R g dr
pot=np.cumsum((g*np.gradient(r))[::-1])[::-1]
v=np.sqrt(2*pot)
dt=np.gradient(r)/np.maximum(v,1e-3)
T=np.sum(dt[1:])  # surface -> centre
print('surface->centre min',T/60,' one way min',2*T/60,' vmax km/s',v[0]/1e3,' mph',v[0]*2.23694)
# uniform comparison
R=6371e3; gs=9.81; print('uniform one way',np.pi*np.sqrt(R/gs)/60, 'vmax',np.sqrt(gs*R))
# time vs depth table for animation (fraction of radius fallen at time)
tt=np.cumsum(dt[::-1]); rr=r[::-1]
np.savetxt('tools/tunnel_tr.txt',np.c_[tt[::2000],rr[::2000]/1e3],fmt='%.2f')
