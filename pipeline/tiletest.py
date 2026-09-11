import requests,time,json
H={'User-Agent':'london-location-lens-research/1.0 (contact: github.com/Millantr97/london-location-lens)'}
B='(51.50,-0.15,51.53,-0.07)'
Q1='[out:json][timeout:300];(nwr'+B+'[amenity~"^(cafe|restaurant|fast_food|pub|bar|nightclub)$"];nwr'+B+'[leisure=fitness_centre];nwr'+B+'[office=coworking];nwr'+B+'[tourism~"^(museum|gallery|attraction)$"];nwr'+B+'[amenity~"^(theatre|cinema|arts_centre)$"];);out center tags;'
Q2='[out:json][timeout:300];nwr'+B+'[shop];out center tags;'
for name,q in [('venues',Q1),('shops',Q2)]:
    t=time.time()
    try:
        r=requests.post('https://overpass.private.coffee/api/interpreter',data={'data':q},headers=H,timeout=280)
        print(name,r.status_code,f'{time.time()-t:.0f}s',len(r.text)//1024,'KB',flush=True)
        if r.status_code==200: print(name,'elements',len(r.json()['elements']),flush=True)
    except Exception as e: print(name,'ERR',str(e)[:100],flush=True)
