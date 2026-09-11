import requests,time
H={'User-Agent':'london-location-lens-research/1.0 (contact: github.com/Millantr97/london-location-lens)'}
Q='[out:json][timeout:25];node[amenity=cafe](around:250,51.5133,-0.1317);out count;'
for m in ['https://overpass.private.coffee/api/interpreter','https://overpass.kumi.systems/api/interpreter','https://overpass-api.de/api/interpreter']:
    t=time.time()
    try:
        r=requests.post(m,data={'data':Q},headers=H,timeout=100)
        print(m,r.status_code,f'{time.time()-t:.0f}s',r.text[:100],flush=True)
    except Exception as e:
        print(m,'ERR',str(e)[:100],flush=True)
