"""Assign tiled Overpass pools to per-anchor merged files (cache/osm/{id}.json) by distance."""
import json, os, math
P='/tmp/lens/pipeline'
segs=json.load(open(f'{P}/all_segments.json'))
cells={}
for s in segs:
    k=(round(s['lat']/0.025),round(s['lng']/0.04))
    cells.setdefault(k,[]).append(s)
tiles=[]
for k,members in cells.items():
    tiles.append(members)
def hav(a,b,c,d):
    R=6371000; p1,p2=math.radians(a),math.radians(c)
    dp=math.radians(c-a); dl=math.radians(d-b)
    x=math.sin(dp/2)**2+math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2*R*math.asin(math.sqrt(x))
def coord(e):
    if e['type']=='node': return e.get('lat'),e.get('lon')
    c=e.get('center',{}); return c.get('lat'),c.get('lon')
VEN={'cafe','restaurant','fast_food','pub','bar','nightclub'}
done=0
for i,members in enumerate(tiles):
    fps={k:f'{P}/cache/tiles/{i}.{k}.json' for k in 'vc'}
    if not all(os.path.exists(v) for v in fps.values()): print('tile',i,'incomplete, skipping'); continue
    shops=[]
    ok=True
    for sub in range(4):
        fp=f'{P}/cache/tiles/{i}.s.{sub}.json'
        if not os.path.exists(fp): ok=False; break
        shops+=json.load(open(fp))
    if not ok: print('tile',i,'shops incomplete, skipping'); continue
    pools={k:json.load(open(v)) for k,v in fps.items()}; pools['s']=shops
    for s in members:
        out=f"{P}/cache/osm/{s['id']}.json"
        if os.path.exists(out): continue
        sel=[]
        for e in pools['v']:
            la,lo=coord(e)
            if la and hav(s['lat'],s['lng'],la,lo)<=250: sel.append(e)
        for e in pools['s']:
            la,lo=coord(e)
            if la and hav(s['lat'],s['lng'],la,lo)<=250: sel.append(e)
        for e in pools['c']:
            t=e.get('tags',{})
            la,lo=coord(e)
            if not la: continue
            if t.get('leisure') in ('park','garden','common'):
                if hav(s['lat'],s['lng'],la,lo)<=600: sel.append(e)
            else:
                if hav(s['lat'],s['lng'],la,lo)<=900: sel.append(e)
        json.dump(sel,open(out,'w'))
        done+=1
print('mapped',done,'segments')
