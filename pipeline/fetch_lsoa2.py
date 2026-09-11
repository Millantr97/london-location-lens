import json, os, time, requests
URL="https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/Lower_layer_Super_Output_Areas_December_2021_Boundaries_EW_BGC_V5/FeatureServer/0/query"
segs=json.load(open('/tmp/wave2_segments.json'))
miss=[]
for s in segs:
    out=f"/tmp/lens/pipeline/cache/lsoa/{s['id']}.json"
    if os.path.exists(out): continue
    p={"geometry":f"{s['lng']},{s['lat']}","geometryType":"esriGeometryPoint","inSR":"4326","spatialRel":"esriSpatialRelIntersects","outFields":"LSOA21CD,LSOA21NM","returnGeometry":"false","f":"json"}
    ok=False
    for a in range(4):
        try:
            r=requests.get(URL,params=p,timeout=40).json()
            feats=r.get("features",[])
            if feats:
                at=feats[0]["attributes"]
                json.dump({"code":at["LSOA21CD"],"name":at["LSOA21NM"]},open(out,"w"))
                ok=True; break
        except Exception: pass
        time.sleep(2*(a+1))
    if not ok: miss.append(s['id'])
    time.sleep(0.25)
print('lsoa2 done, missing:',miss,flush=True)
