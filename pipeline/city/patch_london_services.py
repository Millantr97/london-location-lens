"""Add the four new OSM buckets (services, agents, pharmacy, vets) to the LIVE London bake:
patches segments.js (osm counts), units.js (appended units, extended UNITCATS), competitors.js.
services shops come from the committed pool.json; pharmacy/vets/agents are fetched once from
Overpass for the Greater London bbox (the PBF extract predates their inclusion).
Methodology: counts within 250 m of each segment anchor for every segment level."""
import json, math, re, os, sys, time, requests
ROOT='/home/sandbox/london-location-lens'
P=f'{ROOT}/pipeline'
UNITCATS=["cafe","restaurant","fast_food","pub_bar","grocery","shops","fitness","cowork","services","agents","pharmacy","vets"]
SERVICES_SHOPS={'hairdresser','barber','beauty','nail_salon','tanning','massage','tattoo','piercing','laundry','dry_cleaning','florist','optician','hearing_aids','mobile_phone','phone_repair','computer','electronics_repair','pet_grooming','pet','travel_agent','funeral_directors','shoe_repair','tailor','key_cutting','locksmith','photo','print_shop','copyshop','books','charity','second_hand'}
CHAINS=['timpson','specsavers','vision express','boots','superdrug','toni&guy','rush hair','supercuts','snappy snaps','foxtons','knight frank','savills','haart','connells','purplebricks','hunters','martin & co','pets at home','savers','mydentist']
CHAIN_RE=re.compile('|'.join(re.escape(c) for c in sorted(set(CHAINS),key=len,reverse=True)))
def is_chain(t):
    s=((t.get('name') or '')+' '+(t.get('brand') or '')+' '+(t.get('operator') or '')).lower()
    return bool(CHAIN_RE.search(s))
def hav(a,b,c,d):
    R=6371000; p1,p2=math.radians(a),math.radians(c)
    dp=math.radians(c-a); dl=math.radians(d-b)
    x=math.sin(dp/2)**2+math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2*R*math.asin(math.sqrt(x))
# ---- collect candidate elements
pool=json.load(open(f'{P}/cache/pool.json'))
extra_f=f'{P}/cache/pool_services_extra.json'
if os.path.exists(extra_f):
    extra=json.load(open(extra_f))
else:
    q='[out:json][timeout:400];(nw(51.28,-0.57,51.72,0.34)[amenity~"^(pharmacy|veterinary)$"];nw(51.28,-0.57,51.72,0.34)[office~"^(estate_agent|letting_agent)$"];);out center tags;'
    mirrors=["https://overpass.private.coffee/api/interpreter","https://overpass.kumi.systems/api/interpreter","https://overpass-api.de/api/interpreter"]
    extra=None
    for attempt in range(8):
        m=mirrors[attempt%len(mirrors)]
        try:
            r=requests.post(m,data={'data':q},headers={"User-Agent":"location-lens-research/1.0"},timeout=380)
            if r.status_code==200: extra=r.json()['elements']; break
            print('HTTP',r.status_code,m,flush=True)
        except Exception as e: print('err',str(e)[:80],flush=True)
        time.sleep(10*(attempt+1))
    assert extra is not None,'overpass fetch failed'
    json.dump(extra,open(extra_f,'w'))
print('pool:',len(pool),'extra:',len(extra))
def classify_new(el):
    t=el.get('tags',{})
    am=t.get('amenity',''); sh=t.get('shop',''); of=t.get('office','')
    if am=='pharmacy': return 'pharmacy'
    if am=='veterinary': return 'vets'
    if of in ('estate_agent','letting_agent'): return 'agents'
    if sh in SERVICES_SHOPS: return 'services'
    return None
def coord(el):
    if el['type']=='node': return el.get('lat'),el.get('lon')
    c=el.get('center',{}); return c.get('lat'),c.get('lon')
units=[]; seen=set()
for e in pool+extra:
    k=(e['type'],e['id'])
    if k in seen: continue
    seen.add(k)
    cat=classify_new(e)
    if not cat: continue
    la,lo=coord(e)
    if not la: continue
    t=e.get('tags',{})
    units.append({'lat':round(la,5),'lng':round(lo,5),'cat':cat,'chain':1 if is_chain(t) else 0,
                  'name':t.get('name',''),'street':re.sub(r'\s+',' ',(t.get('addr:street') or '').strip()),
                  'cuisine':(t.get('cuisine','') or t.get('shop','') or t.get('office','') or t.get('amenity','')).split(';')[0]})
import collections
print('new-cat units:',collections.Counter(u['cat'] for u in units))
# ---- load baked site data
segtxt=open(f'{ROOT}/segments.js').read()
m=re.search(r'const SEGMENTS=(\[.*?\]);\s*const META=(\{.*?\});?\s*$',segtxt,re.S)
SEGS=json.loads(m.group(1)); META=json.loads(m.group(2))
utxt=open(f'{ROOT}/units.js').read()
um=re.search(r'const UNITCATS=(\[.*?\]);\s*const UNITS=(\[.*\]);\s*$',utxt,re.S)
UNITS=json.loads(um.group(2))
ctxt=open(f'{ROOT}/competitors.js').read()
COMPS=json.loads(re.search(r'const COMPETITORS=(\{.*\});?\s*$',ctxt,re.S).group(1))
# grid for fast segment lookup
AG={}
for i,s in enumerate(SEGS): AG.setdefault((round(s['lat'],2),round(s['lng'],2)),[]).append(i)
def nearest_seg(la,lo):
    best=None; bd=1e9
    for dla in (-0.02,-0.01,0,0.01,0.02):
        for dlo in (-0.03,-0.015,0,0.015,0.03):
            for i in AG.get((round(la+dla,2),round(lo+dlo,2)),[]):
                d=hav(la,lo,SEGS[i]['lat'],SEGS[i]['lng'])
                if d<bd: bd=d; best=i
    return best,bd
UG={}
for u in units: UG.setdefault((round(u['lat']/0.004),round(u['lng']/0.004)),[]).append(u)
def near(la,lo,rad):
    out=[]
    ci,cj=round(la/0.004),round(lo/0.004)
    for dx in (-1,0,1):
        for dy in (-1,0,1):
            for u in UG.get((ci+dx,cj+dy),[]):
                if hav(la,lo,u['lat'],u['lng'])<=rad: out.append(u)
    return out
# counts per segment + competitors + unit rows
newunitrows=[]; seenU=set((round(u[0],4),round(u[1],4),u[2]) for u in UNITS)
for i,s in enumerate(SEGS):
    us=near(s['lat'],s['lng'],250)
    cnt=collections.Counter(u['cat'] for u in us)
    s['osm']['services']=cnt.get('services',0); s['osm']['agents']=cnt.get('agents',0)
    s['osm']['pharmacy']=cnt.get('pharmacy',0); s['osm']['vets']=cnt.get('vets',0)
    per=collections.defaultdict(list)
    for u in us:
        key=(round(u['lat'],4),round(u['lng'],4),UNITCATS.index(u['cat']))
        if key not in seenU:
            seenU.add(key)
            newunitrows.append([u['lat'],u['lng'],UNITCATS.index(u['cat']),u['chain'],i,round(hav(s['lat'],s['lng'],u['lat'],u['lng'])),
                                (u['name'] or '')[:60],(u.get('street') or '')[:48],(u.get('cuisine') or '')[:30]])
        if u['name']: per[u['cat']].append((round(hav(s['lat'],s['lng'],u['lat'],u['lng'])),u))
    for cat,us2 in per.items():
        us2.sort(key=lambda x:x[0])
        COMPS.setdefault(s['id'],{})[cat]=[[u['name'][:44],(u.get('cuisine') or '')[:26],u['chain'],d] for d,u in us2[:12]]
UNITS+=newunitrows
with open(f'{ROOT}/segments.js','w') as f:
    f.write("const SEGMENTS="+json.dumps(SEGS,separators=(',',':'))+";\nconst META="+json.dumps(META,separators=(',',':'))+";\n")
with open(f'{ROOT}/units.js','w') as f:
    f.write("const UNITCATS="+json.dumps(UNITCATS)+";\nconst UNITS="+json.dumps(UNITS,separators=(',',':'))+";\n")
with open(f'{ROOT}/competitors.js','w') as f:
    f.write("const COMPETITORS="+json.dumps(COMPS,separators=(',',':'))+";\n")
print('segments patched:',len(SEGS),'| units now:',len(UNITS),'(+'+str(len(newunitrows))+')')
