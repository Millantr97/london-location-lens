"""Reverse-geocode new anchors to LSOA21 via ONS Open Geography."""
import json, os, sys, time, requests
URL="https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/Lower_layer_Super_Output_Areas_December_2021_Boundaries_EW_BGC_V5/FeatureServer/0/query"
def one(lat,lng):
    p={"geometry":f"{lng},{lat}","geometryType":"esriGeometryPoint","inSR":"4326",
       "spatialRel":"esriSpatialRelIntersects","outFields":"LSOA21CD,LSOA21NM","returnGeometry":"false","f":"json"}
    for a in range(5):
        try:
            r=requests.get(URL,params=p,timeout=40).json()
            feats=r.get("features",[])
            if feats:
                at=feats[0]["attributes"]; return {"code":at["LSOA21CD"],"name":at["LSOA21NM"]}
        except Exception as e: print("lsoa err",e,flush=True)
        time.sleep(3*(a+1))
    return None
if __name__=="__main__":
    segs=json.load(open(sys.argv[1]))
    for s in segs:
        out=f"/tmp/lens/pipeline/cache/lsoa/{s['id']}.json"
        if os.path.exists(out): continue
        r=one(s["lat"],s["lng"])
        if r is None: print("MISS",s["id"],flush=True)
        else: json.dump(r,open(out,"w")); print(s["id"],r,flush=True)
        time.sleep(0.4)
    print("LSOA DONE")
