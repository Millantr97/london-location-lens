"""Stage 4: build caches for NEW segments - OSM from pool, LSOA via ONS, crime via police.uk."""
import json, os, math, time, sys, requests
from concurrent.futures import ThreadPoolExecutor
P='/tmp/lens/pipeline'
sys.path.insert(0,P)
from segments_def import NEW_SEGMENTS
SEGS={s['id']:s for s in json.load(open(f'{P}/all_segments.json'))}
NEW=[dict(SEGS[s['id']]) for s in NEW_SEGMENTS]
print('new segments to cache:',len(NEW))

# ---------- OSM from pool (same radii as map_pool.py) ----------
pool=json.load(open(f'{P}/cache/pool.json'))
def hav(a,b,c,d):
    R=6371000; p1,p2=math.radians(a),math.radians(c)
    dp=math.radians(c-a); dl=math.radians(d-b)
    x=math.sin(dp/2)**2+math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2*R*math.asin(math.sqrt(x))
def coord(e):
    if e['type']=='node': return e.get('lat'),e.get('lon')
    c=e.get('center',{}); return c.get('lat'),c.get('lon')
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
VEN={'cafe','restaurant','fast_food','pub','bar','nightclub'}
done=0
for s in NEW:
    out=f"{P}/cache/osm/{s['id']}.json"
    if os.path.exists(out): done+=1; continue
    sel=[]
    for e in nearby(s['lat'],s['lng'],900):
        t=e.get('tags',{})
        la,lo=coord(e)
        d=hav(s['lat'],s['lng'],la,lo)
        if d<=250 and (t.get('amenity') in VEN or 'shop' in t or t.get('leisure')=='fitness_centre' or t.get('office')=='coworking' or t.get('tourism') in ('museum','gallery','attraction') or t.get('amenity') in ('theatre','cinema','arts_centre')):
            sel.append(e)
        elif d<=600 and t.get('leisure') in ('park','garden','common'):
            sel.append(e)
        elif t.get('railway') in ('station','halt') or t.get('station')=='subway':
            sel.append(e)
    json.dump(sel,open(out,'w')); done+=1
print('osm caches:',done)

# ---------- LSOA ----------
URL="https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/Lower_layer_Super_Output_Areas_December_2021_Boundaries_EW_BGC_V5/FeatureServer/0/query"
def lsoa_one(lat,lng):
    p={"geometry":f"{lng},{lat}","geometryType":"esriGeometryPoint","inSR":"4326",
       "spatialRel":"esriSpatialRelIntersects","outFields":"LSOA21CD,LSOA21NM","returnGeometry":"false","f":"json"}
    for a in range(5):
        try:
            r=requests.get(URL,params=p,timeout=40).json()
            feats=r.get("features",[])
            if feats:
                at=feats[0]["attributes"]; return {"code":at["LSOA21CD"],"name":at["LSOA21NM"]}
        except Exception as e: print("lsoa err",str(e)[:60],flush=True)
        time.sleep(3*(a+1))
    return None
if os.environ.get('SKIP_LSOA')!='1':
    for s in NEW:
        out=f"{P}/cache/lsoa/{s['id']}.json"
        if os.path.exists(out): continue
        r=lsoa_one(s['lat'],s['lng'])
        if r is None: print("MISS",s["id"],flush=True)
        else: json.dump(r,open(out,"w"))
        time.sleep(0.25)
print('lsoa done:',len([s for s in NEW if os.path.exists(f"{P}/cache/lsoa/{s['id']}.json")]),'/',len(NEW))

# ---------- crime ----------
MONTHS=["2025-08","2025-09","2025-10","2025-11","2025-12","2026-01","2026-02","2026-03","2026-04","2026-05","2026-06","2026-07"]
KEEP={"shoplifting":"shoplifting","theft-from-the-person":"theft_person","robbery":"robbery_biz","burglary":"burglary_biz"}
def poly(lat,lng,r=0.004):
    pts=[]
    for i in range(10):
        a=2*math.pi*i/10
        pts.append(f"{lat+r*math.cos(a):.5f},{lng+(r/math.cos(math.radians(lat)))*math.sin(a):.5f}")
    return ":".join(pts)
POLYS={s['id']:poly(s['lat'],s['lng']) for s in NEW}
def crime_one(args):
    sid,month=args
    url=f"https://data.police.uk/api/crimes-street/all-crime?poly={POLYS[sid]}&date={month}"
    for a in range(6):
        try:
            r=requests.get(url,timeout=60)
            if r.status_code==200: return sid,month,r.json()
            time.sleep(min(30,4*(a+1)))
        except Exception: time.sleep(min(30,4*(a+1)))
    return sid,month,[]
tasks=[(s['id'],m) for s in NEW if not os.path.exists(f"{P}/cache/crime/{s['id']}.json") for m in MONTHS]
print('crime requests:',len(tasks))
agg={}
with ThreadPoolExecutor(max_workers=10) as ex:
    for i,(sid,month,crimes) in enumerate(ex.map(crime_one,tasks)):
        a=agg.setdefault(sid,{k:0 for k in KEEP.values()})
        for c in crimes:
            k=KEEP.get(c["category"])
            if k: a[k]+=1
        if i%120==0: print(f'crime {i}/{len(tasks)}',flush=True)
for sid,a in agg.items():
    json.dump(a,open(f"{P}/cache/crime/{sid}.json","w"))
print('crime done:',len([s for s in NEW if os.path.exists(f"{P}/cache/crime/{s['id']}.json")]),'/',len(NEW))
