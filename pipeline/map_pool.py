import json, math, os
P='/tmp/lens/pipeline'
segs=json.load(open(f'{P}/all_segments.json'))
pool=json.load(open(f'{P}/cache/pool.json'))
def hav(a,b,c,d):
    R=6371000; p1,p2=math.radians(a),math.radians(c)
    dp=math.radians(c-a); dl=math.radians(d-b)
    x=math.sin(dp/2)**2+math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2*R*math.asin(math.sqrt(x))
def coord(e):
    if e['type']=='node': return e.get('lat'),e.get('lon')
    c=e.get('center',{}); return c.get('lat'),c.get('lon')
VEN={'cafe','restaurant','fast_food','pub','bar','nightclub'}
# grid index
G={}
def key(la,lo): return (int(la*111.2),int(lo*69.5))
for e in pool:
    la,lo=coord(e)
    if la is None: continue
    G.setdefault(key(la,lo),[]).append(e)
def nearby(la,lo,r_m):
    ki=key(la,lo)
    dLat=int(math.ceil(r_m/111.2))+1
    dLng=int(math.ceil(r_m/(69.5*math.cos(math.radians(la)))))+1
    for i in range(ki[0]-dLat,ki[0]+dLat+1):
        for j in range(ki[1]-dLng,ki[1]+dLng+1):
            for e in G.get((i,j),[]):
                ela,elo=coord(e)
                if ela and hav(la,lo,ela,elo)<=r_m: yield e
for s in segs:
    sel=[]
    for e in nearby(s['lat'],s['lng'],250): sel.append(e)
    for e in pool:
        pass
    # parks 600 + stations 900 need wider pass
    for e in nearby(s['lat'],s['lng'],900):
        t=e.get('tags',{})
        if t.get('leisure') in ('park','garden','common') and hav(s['lat'],s['lng'],*coord(e))<=600: sel.append(e)
        elif (t.get('railway') in ('station','halt') or t.get('station')=='subway'): sel.append(e)
    json.dump(sel,open(f"{P}/cache/osm/{s['id']}.json",'w'))
print('mapped all',len(segs))
