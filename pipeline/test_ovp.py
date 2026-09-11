import requests, time, json
Q="""[out:json][timeout:120];
(
  nwr(around:250,51.5133,-0.1317)[amenity~"^(cafe|restaurant|fast_food|pub|bar|nightclub)$"];
  nwr(around:250,51.5133,-0.1317)[shop];
  nwr(around:250,51.5133,-0.1317)[leisure=fitness_centre];
  nwr(around:250,51.5133,-0.1317)[office=coworking];
  nwr(around:250,51.5133,-0.1317)[tourism~"^(museum|gallery|attraction)$"];
  nwr(around:250,51.5133,-0.1317)[amenity~"^(theatre|cinema|arts_centre)$"];
  nwr(around:600,51.5133,-0.1317)[leisure~"^(park|garden|common)$"];
  node(around:900,51.5133,-0.1317)[railway~"^(station|halt)$"];
  node(around:900,51.5133,-0.1317)[station=subway];
);
out center tags;"""
for m in ["https://overpass.private.coffee/api/interpreter","https://overpass.kumi.systems/api/interpreter","https://overpass.nchc.org.tw/api/interpreter","https://overpass-api.de/api/interpreter"]:
    t=time.time()
    try:
        r=requests.get(m,params={"data":Q},timeout=170)
        print(m, r.status_code, f"{time.time()-t:.1f}s", len(r.text), flush=True)
        if r.status_code==200:
            print("elements:",len(r.json()["elements"]), flush=True); break
    except Exception as e:
        print(m,"ERR",str(e)[:120],flush=True)
