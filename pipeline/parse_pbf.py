"""Extract relevant POIs from Greater London OSM pbf into a pool JSON."""
import osmium, json, math
AMEN={'cafe','restaurant','fast_food','pub','bar','nightclub','theatre','cinema','arts_centre'}
LEIS={'fitness_centre','park','garden','common'}
TOUR={'museum','gallery','attraction'}
BBOX=(51.40,-0.36,51.62,0.09)
class H(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.out=[]; self.ways={}
        self.loc=osmium.index.create_map("sparse_mem_array")
        self.locations=osmium.NodeLocationsForWays(self.loc)
    def node(self,n):
        t=n.tags
        am=t.get('amenity',''); sh=t.get('shop',''); le=t.get('leisure',''); to=t.get('tourism',''); of=t.get('office',''); rw=t.get('railway',''); st=t.get('station','')
        if not (am in AMEN or sh or le in LEIS or to in TOUR or of=='coworking' or rw in ('station','halt') or st=='subway'): return
        if not (BBOX[0]<=n.location.lat<=BBOX[2] and BBOX[1]<=n.location.lon<=BBOX[3]): return
        self.out.append({'type':'node','id':n.id,'lat':round(n.location.lat,6),'lon':round(n.location.lon,6),'tags':{k:v for k,v in t}})
    def way(self,w):
        t=w.tags
        am=t.get('amenity',''); sh=t.get('shop',''); le=t.get('leisure',''); to=t.get('tourism',''); of=t.get('office','')
        if not (am in AMEN or sh or le in LEIS or to in TOUR or of=='coworking'): return
        self.ways[w.id]={'tags':{k:v for k,v in t},'refs':[nd.ref for nd in w.nodes]}
h=H()
h.apply_file('/tmp/lens/pipeline/gl.osm.pbf', locations=False)
print('nodes:',len(h.out),'ways:',len(h.ways))
# resolve way centroids in a second pass
import osmium as o
class W(o.SimpleHandler):
    def __init__(h2): super().__init__(); h2.coords={}
    def node(h2,n):
        if n.id in WANT: h2.coords[n.id]=(n.location.lon,n.location.lat)
WANT=set()
for wid,d in h.ways.items(): WANT.update(d['refs'])
w=W(); w.apply_file('/tmp/lens/pipeline/gl.osm.pbf', locations=False)
print('coords resolved:',len(w.coords))
for wid,d in h.ways.items():
    pts=[w.coords[r] for r in d['refs'] if r in w.coords]
    if not pts: continue
    lo=sum(p[0] for p in pts)/len(pts); la=sum(p[1] for p in pts)/len(pts)
    if not (BBOX[0]<=la<=BBOX[2] and BBOX[1]<=lo<=BBOX[3]): continue
    h.out.append({'type':'way','id':wid,'center':{'lat':round(la,6),'lon':round(lo,6)},'tags':d['tags']})
json.dump(h.out,open('/tmp/lens/pipeline/cache/pool.json','w'))
print('pool:',len(h.out))
