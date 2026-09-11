"""Generate area segment defs for a city: every ORR-listed heavy-rail station in the bbox
(matched to OSM station nodes for coordinates) plus curated defs from cities.py."""
import json, sys, math, collections
sys.path.insert(0,'/home/sandbox/london-location-lens/pipeline/city')
from cities import CITIES, CURATED
cid=sys.argv[1]; C=CITIES[cid]
P=f'/home/sandbox/london-location-lens/pipeline/city/{cid}'
pool=json.load(open(f'{P}/pool.json'))
GB=json.load(open('/home/sandbox/london-location-lens/pipeline/city/gb_stations.json'))
def hav(a,b,c,d):
    R=6371000; p1,p2=math.radians(a),math.radians(c)
    dp=math.radians(c-a); dl=math.radians(d-b)
    x=math.sin(dp/2)**2+math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2*R*math.asin(math.sqrt(x))
def norm(n): return ' '.join(n.lower().replace('&','and').split())
GBN={norm(k):k for k in GB}
# station nodes in bbox
nodes={}
for e in pool:
    if e['type']!='node': continue
    t=e.get('tags',{})
    if t.get('railway') in ('station','halt') and t.get('name'):
        nodes.setdefault(norm(t['name']),[]).append((e['lat'],e['lon']))
print('named station nodes:',len(nodes))
segs=[]; unmatched=[]; used=set()
for nn,pts in sorted(nodes.items()):
    if nn not in GBN: continue
    nm=GBN[nn]
    if GB[nm]['annual']<=0: continue
    la=sum(p[0] for p in pts)/len(pts); lo=sum(p[1] for p in pts)/len(pts)
    sid='st-'+norm(nm).replace(' ','-')
    k=2
    while sid in used: sid=f"{sid.rsplit('-',1)[0]}-{k}"; k+=1
    used.add(sid)
    segs.append(dict(id=sid,name=f"{nm} station area",lat=round(la,5),lng=round(lo,5),
                     stype='transport_hub',anchors=[(nm,'ORR')]))
for d in CURATED.get(cid,[]):
    segs.append(d)
print('area segments:',len(segs))
json.dump(segs,open(f'{P}/segments_area.json','w'),indent=1)
# report big ORR stations inside bbox NOT matched (via crude name search)
import re
miss=[]
for nm,v in GB.items():
    if norm(nm) not in nodes and v['annual']>200000:
        miss.append((nm,v['annual']))
print('ORR stations without an OSM node match (name-based, any city):',len(miss))
