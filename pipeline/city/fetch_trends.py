"""Fetch per-category yearly venue counts (2017-2026, at 1 Jan) from the ohsome API for a bbox.
Usage: python3 fetch_trends.py <city|london>   -> writes <city>/data/trends.js or patches london trends file
Google Trends block is copied from the London trends.js (UK-wide, city-independent)."""
import json, re, sys, time, requests
sys.path.insert(0,'/home/sandbox/london-location-lens/pipeline/city')
from cities import CITIES
ROOT='/home/sandbox/london-location-lens'
target=sys.argv[1]
BBOXES={'london':'51.28,-0.57,51.72,0.34'}
GROCERY='convenience,supermarket,greengrocer,bakery,butcher,deli,alcohol,newsagent,confectionery,health_food,seafood,cheese,coffee,pastry,wine,frozen_food'
SERVICES='hairdresser,barber,beauty,nail_salon,tanning,massage,tattoo,piercing,laundry,dry_cleaning,florist,optician,hearing_aids,mobile_phone,phone_repair,computer,electronics_repair,pet_grooming,pet,travel_agent,funeral_directors,shoe_repair,tailor,key_cutting,locksmith,photo,print_shop,copyshop,books,charity,second_hand'
FILTERS={
 'cafe':'amenity=cafe','restaurant':'amenity=restaurant','fast_food':'amenity=fast_food',
 'pub_bar':'amenity in (pub,bar,nightclub)','grocery':f'shop in ({GROCERY})',
 'fitness':'leisure=fitness_centre','cowork':'office=coworking',
 'services':f'shop in ({SERVICES})','agents':'office in (estate_agent,letting_agent)',
 'pharmacy':'amenity=pharmacy','vets':'amenity=veterinary'}
def to_bboxes(b):  # internal (lat0,lng0,lat1,lng1) -> ohsome minLon,minLat,maxLon,maxLat
    return f'{b[1]},{b[0]},{b[3]},{b[2]}'
if target=='london': bbox=to_bboxes((51.28,-0.57,51.72,0.34))
else:
    bbox=to_bboxes(CITIES[target]['bbox'])
def ohsome(filt):
    for a in range(5):
        try:
            r=requests.post('https://api.ohsome.org/v1/elements/count',
                data={'bboxes':bbox,'filter':filt,'time':'2017-01-01/2026-01-01/P1Y','format':'json'},timeout=120)
            if r.status_code==200: return r.json()['result']
            print('ohsome HTTP',r.status_code,flush=True)
        except Exception as e: print('ohsome err',str(e)[:60],flush=True)
        time.sleep(5*(a+1))
    return None
osm={}
for cat,filt in FILTERS.items():
    res=ohsome(filt)
    if not res: print('FAILED',cat); continue
    osm[cat]={row['timestamp'][:4]:row['value'] for row in res}
    print(cat,osm[cat],flush=True)
    time.sleep(1)
lt=open(f'{ROOT}/trends.js').read()
T=json.loads(re.search(r'const TRENDS=(\{.*\});?\s*$',lt,re.S).group(1))
years=T['years']
src=f"ohsome API (HeiGIT), OpenStreetMap full-history extract, {'Greater London' if target=='london' else CITIES[target]['region']} bbox (same coverage as this site's map), counts at 1 Jan each year, fetched 11 Sep 2026"
if target=='london':
    T['osm'].update(osm); T['osm_source']=src
    out=f'{ROOT}/trends.js'
else:
    T={'years':years,'osm':osm,'osm_source':src,'gt_years':T['gt_years'],'gt':T['gt']}
    out=f'{ROOT}/{target}/data/trends.js'
with open(out,'w') as f: f.write('const TRENDS='+json.dumps(T,separators=(',',':'))+';\n')
print('written',out)
