"""Extract commercial POI pools for ALL configured city bboxes from an England OSM PBF in two passes.
Writes pipeline/city/<city>/pool.json in the same shape as the London pool.json."""
import osmium, json, sys, os
sys.path.insert(0,'/home/sandbox/london-location-lens/pipeline/city')
from cities import CITIES
AMEN={'cafe','restaurant','fast_food','pub','bar','nightclub','theatre','cinema','arts_centre','pharmacy','veterinary'}
LEIS={'fitness_centre','park','garden','common'}
TOUR={'museum','gallery','attraction'}
PBF=sys.argv[1] if len(sys.argv)>1 else '/tmp/england.osm.pbf'
ONLY=sys.argv[2].split(',') if len(sys.argv)>2 else list(CITIES)
def city_of(la,lo):
    for cid,c in CITIES.items():
        if cid not in ONLY: continue
        b=c['bbox']
        if b[0]<=la<=b[2] and b[1]<=lo<=b[3]: return cid
    return None
class H(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.out={cid:[] for cid in ONLY}; self.ways={}
    def node(self,n):
        t=n.tags
        am=t.get('amenity',''); sh=t.get('shop',''); le=t.get('leisure',''); to=t.get('tourism',''); of=t.get('office',''); rw=t.get('railway',''); st=t.get('station','')
        if not (am in AMEN or sh or le in LEIS or to in TOUR or of in ('coworking','estate_agent','letting_agent') or rw in ('station','halt') or st=='subway'): return
        try: la,lo=n.location.lat,n.location.lon
        except Exception: return
        cid=city_of(la,lo)
        if not cid: return
        self.out[cid].append({'type':'node','id':n.id,'lat':round(la,6),'lon':round(lo,6),'tags':{k:v for k,v in t}})
    def way(self,w):
        t=w.tags
        am=t.get('amenity',''); sh=t.get('shop',''); le=t.get('leisure',''); to=t.get('tourism',''); of=t.get('office','')
        if not (am in AMEN or sh or le in LEIS or to in TOUR or of in ('coworking','estate_agent','letting_agent')): return
        self.ways[w.id]={'tags':{k:v for k,v in t},'refs':[nd.ref for nd in w.nodes]}
h=H(); h.apply_file(PBF, locations=False)
print('nodes:',{k:len(v) for k,v in h.out.items()},'ways:',len(h.ways),flush=True)
WANT=set()
for wid,d in h.ways.items(): WANT.update(d['refs'])
print('wanted nodes:',len(WANT),flush=True)
class W(osmium.SimpleHandler):
    def __init__(h2): super().__init__(); h2.coords={}
    def node(h2,n):
        if n.id in WANT:
            try: h2.coords[n.id]=(n.location.lon,n.location.lat)
            except Exception: pass
w=W(); w.apply_file(PBF, locations=False)
print('coords resolved:',len(w.coords),flush=True)
added={cid:0 for cid in ONLY}
for wid,d in h.ways.items():
    pts=[w.coords[r] for r in d['refs'] if r in w.coords]
    if not pts: continue
    lo=sum(p[0] for p in pts)/len(pts); la=sum(p[1] for p in pts)/len(pts)
    cid=city_of(la,lo)
    if not cid: continue
    h.out[cid].append({'type':'way','id':wid,'center':{'lat':round(la,6),'lon':round(lo,6)},'tags':d['tags']})
    added[cid]+=1
for cid in ONLY:
    d=f'/home/sandbox/london-location-lens/pipeline/city/{cid}'
    os.makedirs(d,exist_ok=True)
    json.dump(h.out[cid],open(f'{d}/pool.json','w'))
    print(cid,'pool:',len(h.out[cid]),'(ways',added[cid],')',flush=True)
