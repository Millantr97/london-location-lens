"""Tiled Overpass fetch: bbox queries grouped by anchor clusters; results mapped to per-anchor part files."""
import json, os, sys, time, math, requests
from concurrent.futures import ThreadPoolExecutor
MIRRORS=["https://overpass.private.coffee/api/interpreter","https://overpass.kumi.systems/api/interpreter","https://overpass-api.de/api/interpreter","https://overpass.osm.ch/api/interpreter"]
HEADERS={"User-Agent":"london-location-lens-research/1.0 (contact: github.com/Millantr97/london-location-lens)"}
P='/tmp/lens/pipeline'
segs=json.load(open(f'{P}/all_segments.json'))

# build tiles
cells={}
for s in segs:
    k=(round(s['lat']/0.025),round(s['lng']/0.04))
    cells.setdefault(k,[]).append(s)
tiles=[]
for k,members in cells.items():
    la0=min(s['lat'] for s in members)-0.005; la1=max(s['lat'] for s in members)+0.005
    lo0=min(s['lng'] for s in members)-0.008; lo1=max(s['lng'] for s in members)+0.008
    tiles.append({'bbox':(la0,lo0,la1,lo1),'members':members})
print(len(tiles),'tiles for',len(segs),'segments',flush=True)

Q_V='[out:json][timeout:400];(nw{b}[amenity~"^(cafe|restaurant|fast_food|pub|bar|nightclub)$"];nw{b}[leisure=fitness_centre];nw{b}[office=coworking];nw{b}[tourism~"^(museum|gallery|attraction)$"];nw{b}[amenity~"^(theatre|cinema|arts_centre)$"];);out center tags;'
Q_S='[out:json][timeout:400];nw{b}[shop];out center tags;'
Q_C='[out:json][timeout:400];(nw{b}[leisure~"^(park|garden|common)$"];node{b}[railway~"^(station|halt)$"];node{b}[station=subway];);out center tags;'

def fetch(tile,i,kind,q,sub=None):
    out=f"{P}/cache/tiles/{i}.{kind}{'' if sub is None else '.'+str(sub)}.json"
    if os.path.exists(out): return
    bb=tile['bbox']
    if sub is not None:
        la0,lo0,la1,lo1=bb; mla=(la0+la1)/2; mlo=(lo0+lo1)/2
        quads=[(la0,lo0,mla,mlo),(la0,mlo,mla,lo1),(mla,lo0,la1,mlo),(mla,mlo,la1,lo1)]
        bb=quads[sub]
    b=str(bb).replace(' ','')
    for attempt in range(10):
        m=MIRRORS[attempt%len(MIRRORS)]
        try:
            r=requests.post(m,data={'data':q.format(b=b)},headers=HEADERS,timeout=400)
            if r.status_code==200:
                json.dump(r.json()['elements'],open(out,'w')); print(f"tile{i}.{kind}: {len(r.json()['elements'])}",flush=True); return
            print(f"tile{i}.{kind} {m.split('//')[1].split('/')[0]} HTTP {r.status_code}",flush=True)
        except Exception as e:
            print(f"tile{i}.{kind} {m.split('//')[1].split('/')[0]} {str(e)[:60]}",flush=True)
        time.sleep(min(60,8*(attempt+1)))
    print(f"FAILED tile{i}.{kind}",flush=True)

if __name__=="__main__":
    os.makedirs(f'{P}/cache/tiles',exist_ok=True)
    work=[]
    for i,t in enumerate(tiles):
        for k,q in [('v',Q_V),('c',Q_C)]:
            if not os.path.exists(f"{P}/cache/tiles/{i}.{k}.json"): work.append((t,i,k,q,None))
        for sub in range(4):
            if not os.path.exists(f"{P}/cache/tiles/{i}.s.{sub}.json"): work.append((t,i,'s',Q_S,sub))
    print(len(work),'tile queries',flush=True)
    with ThreadPoolExecutor(max_workers=5) as ex:
        list(ex.map(lambda a: fetch(*a), work))
    print("TILES DONE",flush=True)
