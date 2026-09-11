"""Fetch POI data around each segment anchor from Overpass (counts + unit-level records).
Split into 4 light queries per anchor; cached per anchor-part; resumable."""
import json, os, sys, time, requests
from concurrent.futures import ThreadPoolExecutor
MIRRORS=["https://overpass.private.coffee/api/interpreter","https://overpass.kumi.systems/api/interpreter","https://overpass-api.de/api/interpreter"]
HEADERS={"User-Agent":"london-location-lens-research/1.0 (contact: github.com/Millantr97/london-location-lens)"}
PARTS={
 "venues":"nwr(around:250,{lat},{lng})[amenity~\"^(cafe|restaurant|fast_food|pub|bar|nightclub)$\"];",
 "shops":"nwr(around:250,{lat},{lng})[shop];",
 "other":"nwr(around:250,{lat},{lng})[leisure=fitness_centre];nwr(around:250,{lat},{lng})[office=coworking];nwr(around:250,{lat},{lng})[tourism~\"^(museum|gallery|attraction)$\"];nwr(around:250,{lat},{lng})[amenity~\"^(theatre|cinema|arts_centre)$\"];",
 "ctx":"nwr(around:600,{lat},{lng})[leisure~\"^(park|garden|common)$\"];node(around:900,{lat},{lng})[railway~\"^(station|halt)$\"];node(around:900,{lat},{lng})[station=subway];",
}
def fetch_part(sid,lat,lng,part):
    out=f"/tmp/lens/pipeline/cache/osm/{sid}.{part}.json"
    if os.path.exists(out): return
    q="[out:json][timeout:200];\n(\n"+PARTS[part].format(lat=lat,lng=lng)+"\n);\nout center tags;"
    for attempt in range(10):
        m=MIRRORS[attempt%len(MIRRORS)]
        try:
            r=requests.post(m,data={"data":q},headers=HEADERS,timeout=280)
            if r.status_code==200:
                json.dump(r.json()["elements"],open(out,"w"))
                print(f"{sid}.{part}: {len(r.json()['elements'])}",flush=True)
                return
            print(f"{sid}.{part} {m.split('//')[1].split('/')[0]} HTTP {r.status_code}",flush=True)
        except Exception as e:
            print(f"{sid}.{part} {m.split('//')[1].split('/')[0]} {str(e)[:60]}",flush=True)
        time.sleep(min(45,5*(attempt+1)))
    print(f"FAILED {sid}.{part}",flush=True)
if __name__=="__main__":
    segs=json.load(open(sys.argv[1]))
    work=[(s["id"],s["lat"],s["lng"],p) for s in segs for p in PARTS
          if not os.path.exists(f"/tmp/lens/pipeline/cache/osm/{s['id']}.{p}.json")]
    print(f"{len(work)} parts to fetch",flush=True)
    with ThreadPoolExecutor(max_workers=3) as ex:
        list(ex.map(lambda a: fetch_part(*a), work))
    # merge parts
    for s in segs:
        merged=f"/tmp/lens/pipeline/cache/osm/{s['id']}.json"
        if os.path.exists(merged): continue
        els=[]
        ok=True
        for p in PARTS:
            fp=f"/tmp/lens/pipeline/cache/osm/{s['id']}.{p}.json"
            if not os.path.exists(fp): ok=False; break
            els+=json.load(open(fp))
        if ok: json.dump(els,open(merged,"w"))
    done=len([s for s in segs if os.path.exists(f"/tmp/lens/pipeline/cache/osm/{s['id']}.json")])
    print(f"OSM merged {done}/102",flush=True)
