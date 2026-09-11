"""Street-level business-relevant crime within ~450 m of each anchor, 12 months to Jul 2026 (data.police.uk)."""
import json, os, sys, time, math, requests
from concurrent.futures import ThreadPoolExecutor
MONTHS=["2025-08","2025-09","2025-10","2025-11","2025-12","2026-01","2026-02","2026-03","2026-04","2026-05","2026-06","2026-07"]
KEEP={"shoplifting":"shoplifting","theft-from-the-person":"theft_person","robbery":"robbery_biz","burglary":"burglary_biz"}

def poly(lat,lng,r=0.004):
    pts=[]
    for i in range(10):
        a=2*math.pi*i/10
        pts.append(f"{lat+r*math.cos(a):.5f},{lng+(r/math.cos(math.radians(lat)))*math.sin(a):.5f}")
    return ":".join(pts)

def one(seg,month):
    url=f"https://data.police.uk/api/crimes-street/all-crime?poly={poly(seg['lat'],seg['lng'])}&date={month}"
    for a in range(5):
        try:
            r=requests.get(url,timeout=60)
            if r.status_code==200:
                return month,r.json()
            time.sleep(4*(a+1))
        except Exception:
            time.sleep(4*(a+1))
    return month,[]

def main(segs_path):
    segs=json.load(open(segs_path))
    for s in segs:
        out=f"/tmp/lens/pipeline/cache/crime/{s['id']}.json"
        if os.path.exists(out): continue
        agg={k:0 for k in KEEP.values()}
        with ThreadPoolExecutor(max_workers=4) as ex:
            for month,crimes in ex.map(lambda m: one(s,m), MONTHS):
                for c in crimes:
                    k=KEEP.get(c["category"])
                    if k: agg[k]+=1
        json.dump(agg,open(out,"w"))
        print(s["id"],agg,flush=True)
        time.sleep(0.5)
    print("CRIME DONE")

if __name__=="__main__": main(sys.argv[1])
