"""Build one non-London city end to end: area (station catchment) segments + street-level
segments, from city pool.json (Geofabrik PBF extract), ORR table 1410, data.police.uk,
postcodes.io, Census 2021 LSOA bulk (EW) and per-city VOA authorities.
Normalisation is WITHIN THIS CITY ONLY. Day-of-week split of ORR annual flows is MODELLED.
Usage: python3 build_city.py <city>"""
import json, math, re, csv, os, sys, time, collections, requests
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0,'/home/sandbox/london-location-lens/pipeline/city')
from cities import CITIES, CURATED

cid=sys.argv[1]; C=CITIES[cid]
NO_CRIME=bool(C.get('no_crime'))
ROOT='/home/sandbox/london-location-lens'
P=f'{ROOT}/pipeline/city/{cid}'
os.makedirs(f'{P}/cache',exist_ok=True)
CENSUS=f'{ROOT}/pipeline/census'
GB=json.load(open(f'{ROOT}/pipeline/city/gb_stations.json'))
DAYPROF=json.load(open(f'{ROOT}/pipeline/expand/nr_day_profile.json'))
VOA=json.load(open(f'{P}/voa_{cid}.json'))
pool=json.load(open(f'{P}/pool.json'))
WEEKS=52.14
MONTHS=["2025-08","2025-09","2025-10","2025-11","2025-12","2026-01","2026-02","2026-03","2026-04","2026-05","2026-06","2026-07"]
KEEP={"shoplifting":"shoplifting","theft-from-the-person":"theft_person","robbery":"robbery_biz","burglary":"burglary_biz"}
UNITCATS=["cafe","restaurant","fast_food","pub_bar","grocery","shops","fitness","cowork","services","agents","pharmacy","vets"]
SERVICES_SHOPS={'hairdresser','barber','beauty','nail_salon','tanning','massage','tattoo','piercing','laundry','dry_cleaning','florist','optician','hearing_aids','mobile_phone','phone_repair','computer','electronics_repair','pet_grooming','pet','travel_agent','funeral_directors','shoe_repair','tailor','key_cutting','locksmith','photo','print_shop','copyshop','books','charity','second_hand'}
GROCERY_SHOPS={'convenience','supermarket','greengrocer','bakery','butcher','deli','alcohol','newsagent','confectionery','health_food','seafood','cheese','coffee','pastry','wine','frozen_food'}
CHAINS=['costa','starbucks','pret a manger','pret','caffe nero','nero','greggs','mcdonald','kfc','subway','wagamama','pizza express','itsu','leon','tortilla','five guys','nando','franco manca','honest burger','cote','zizzi','ask italian','pizza hut','domino','popeyes','wingstop','taco bell','burger king','tim hortons','black sheep',"gail's",'blank street','joe & the juice','dishoom','wasabi','coco di mama','patisserie valerie','gong cha','m&s','tesco','sainsbury','waitrose','co-op','lidl','aldi','iceland','morrisons','asda','puregym','the gym','anytime fitness','david lloyd','virgin active','third space','wework','regus','wetherspoon','greene king',"fuller's","young's",'stonegate','simmons','be at one','slug and lettuce','all bar one','grind','watchhouse','amorino','creams',"wendy's",'chipotle','german doner kebab','gdk','yo! sushi','busaba','banana tree','pho','comptoir libanais','giggling squid',"rosa's thai",'marugame','krispy kreme','shake shack','gbk','byron','jollibee',"morley's",'chicken cottage','dixy chicken','perfect fried chicken','timpson','specsavers','vision express','boots','superdrug','toni&guy','rush hair','supercuts','snappy snaps','foxtons','knight frank','savills','jll','haart','connells','purplebricks','hunters','martin & co','pets at home']
CHAIN_RE=re.compile('|'.join(re.escape(c) for c in sorted(set(CHAINS),key=len,reverse=True)))
def is_chain(t):
    s=((t.get('name') or '')+' '+(t.get('brand') or '')+' '+(t.get('operator') or '')).lower()
    return bool(CHAIN_RE.search(s))
def classify(el):
    t=el.get('tags',{})
    am=t.get('amenity',''); sh=t.get('shop',''); le=t.get('leisure',''); to=t.get('tourism',''); of=t.get('office','')
    if am in ('cafe','restaurant','fast_food'): return am
    if am in ('pub','bar','nightclub'): return 'pub_bar'
    if am=='pharmacy': return 'pharmacy'
    if am=='veterinary': return 'vets'
    if of in ('estate_agent','letting_agent'): return 'agents'
    if of=='coworking': return 'cowork'
    if sh: return 'grocery' if sh in GROCERY_SHOPS else ('services' if sh in SERVICES_SHOPS else ('shops' if sh!='vacant' else None))
    if le=='fitness_centre': return 'fitness'
    if to in ('museum','gallery','attraction') or am in ('theatre','cinema','arts_centre'): return 'culture'
    if le in ('park','garden','common'): return 'park'
    return None
def coord(el):
    if el['type']=='node': return el['lat'],el['lon']
    c=el.get('center',{}); return c.get('lat'),c.get('lon')
def hav(a,b,c,d):
    R=6371000; p1,p2=math.radians(a),math.radians(c)
    dp=math.radians(c-a); dl=math.radians(d-b)
    x=math.sin(dp/2)**2+math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2*R*math.asin(math.sqrt(x))
def band(la,lo):
    d=hav(la,lo,C['center'][0],C['center'][1])
    for mx,label in C['bands']:
        if d<mx: return label
    return C['band_far']

# ---------- census ----------
def load(fname):
    with open(f'{CENSUS}/{fname}') as f:
        rd=csv.reader(f); hdr=next(rd)
        return hdr,{r[2]:r for r in rd}
h7,d7=load('census2021-ts007a-lsoa.csv'); h4,d4=load('census2021-ts004-lsoa.csv')
h21,d21=load('census2021-ts021-lsoa.csv'); h63,d63=load('census2021-ts063-lsoa.csv'); h66,d66=load('census2021-ts066-lsoa.csv')
def idx(h,frag,exact=False):
    for i,c in enumerate(h):
        if (c==frag) if exact else (frag in c): return i
    raise KeyError(frag)
i7_tot=idx(h7,'Age: Total',True)
i7_u20=[idx(h7,'Age: Aged 4 years and under',True)]+[idx(h7,f'Age: Aged {b} years') for b in ['5 to 9','10 to 14','15 to 19']]
i7_2039=[idx(h7,f'Age: Aged {b} years') for b in ['20 to 24','25 to 29','30 to 34','35 to 39']]
i4_tot=idx(h4,'Country of birth: Total'); i4_uk=idx(h4,'Country of birth: Europe: United Kingdom')
i63_tot=idx(h63,'Occupation (current): Total')
i63_prof=[idx(h63,'Occupation (current): 1.'),idx(h63,'Occupation (current): 2.'),idx(h63,'Occupation (current): 3.')]
i66_tot=idx(h66,'Total: All usual residents aged 16')
i66_stu=[idx(h66,'Economically active and a full-time student'),idx(h66,'Economically inactive: Student')]
ETH=[('White','Ethnic group: White'),('Asian, Asian British or Asian Welsh','Ethnic group: Asian, Asian British or Asian Welsh'),
     ('Black, Black British, Black Welsh, Caribbean or African','Ethnic group: Black, Black British, Black Welsh, Caribbean or African'),
     ('Mixed or Multiple ethnic groups','Ethnic group: Mixed or Multiple ethnic groups'),('Other ethnic group','Ethnic group: Other ethnic group')]
i21_tot=idx(h21,'Ethnic group: Total'); i21=[(n,idx(h21,c,True)) for n,c in ETH]
def census(code):
    r7,r4,r21,r63,r66=d7[code],d4[code],d21[code],d63[code],d66[code]
    tot=float(r7[i7_tot])
    u20=sum(float(r7[i]) for i in i7_u20); a2039=sum(float(r7[i]) for i in i7_2039)
    nonuk=1-float(r4[i4_uk])/float(r4[i4_tot])
    prof=sum(float(r63[i]) for i in i63_prof)/float(r63[i63_tot])
    stu=(float(r66[i66_stu[0]])+float(r66[i66_stu[1]]))/float(r66[i66_tot])
    shares=[(n,float(r21[i])/float(r21[i21_tot])) for n,i in i21]
    diversity=1-sum(p*p for _,p in shares)
    top=sorted(shares,key=lambda x:-x[1])[:3]
    return {'code':code,'residents':tot,'pct20_39':round(100*a2039/tot,1),'pct_under20':round(100*u20/tot,1),
            'pct_students':round(100*stu,1),'pct_prof':round(100*prof,1),'pct_nonuk':round(100*nonuk,1),
            'diversity':round(diversity,3),'top_eth':[[n,round(100*p,1)] for n,p in top]}

# ---------- classify pool once ----------
print('classifying pool',len(pool),flush=True)
units_all=[]; seen=set(); culture=[]; parks=[]; stations=[]
for e in pool:
    k=(e['type'],e['id'])
    if k in seen: continue
    seen.add(k)
    t=e.get('tags',{})
    la,lo=coord(e)
    if e['type']=='node' and (t.get('railway') in ('station','halt') or t.get('station')=='subway') and t.get('name'):
        if la: stations.append((la,lo,t['name']))
        continue
    cat=classify(e)
    if not cat or not la: continue
    if cat=='park': parks.append((la,lo)); continue
    if cat=='culture': culture.append((la,lo)); continue
    st=(t.get('addr:street') or '').strip(); st=re.sub(r'\s+',' ',st)
    units_all.append({'lat':round(la,5),'lng':round(lo,5),'cat':cat,'chain':1 if is_chain(t) else 0,
        'name':t.get('name',''),'street':st,
        'cuisine':(t.get('cuisine','') or t.get('shop','')).split(';')[0],
        'terrace':1 if (t.get('outdoor_seating','')+t.get('seat:outside','')).lower()=='yes' else 0})
print('units:',len(units_all),'culture:',len(culture),'parks:',len(parks),'stations:',len(stations),flush=True)
def gridify(lst,cell):
    g={}
    for x in lst: g.setdefault((round(x[0]/cell),round(x[1]/cell)),[]).append(x)
    return g
UNIT_G=gridify([(u['lat'],u['lng'],u) for u in units_all],0.004)
CULT_G=gridify(culture,0.004); PARK_G=gridify(parks,0.01); STN_G=gridify(stations,0.015)
def near_units(la,lo,rad):
    out=[]
    ci,cj=round(la/0.004),round(lo/0.004)
    for dx in range(-1,1+1):
        for dy in range(-1,1+1):
            for x in UNIT_G.get((ci+dx,cj+dy),[]):
                if hav(la,lo,x[0],x[1])<=rad: out.append(x[2])
    return out
def near_count(g,la,lo,cell,rad,span):
    n=0
    ci,cj=round(la/cell),round(lo/cell)
    for dx in range(-span,span+1):
        for dy in range(-span,span+1):
            for x in g.get((ci+dx,cj+dy),[]):
                if hav(la,lo,x[0],x[1])<=rad: n+=1
    return n
def near_stations(la,lo):
    ci,cj=round(la/0.015),round(lo/0.015)
    out=[]
    for dx in (-1,0,1):
        for dy in (-1,0,1):
            for x in STN_G.get((ci+dx,cj+dy),[]):
                out.append((hav(la,lo,x[0],x[1]),x[2]))
    return sorted(set((round(d),n) for d,n in out))[:8]

def osm_counts(us):
    counts={c:0 for c in UNITCATS}
    chain={c:0 for c in ('cafe','restaurant','fast_food')}
    food_tot=0; food_ter=0
    for u in us:
        counts[u['cat']]+=1
        if u['cat'] in ('cafe','restaurant','fast_food','pub_bar'):
            food_tot+=1; food_ter+=u.get('terrace',0)
            if u['cat'] in chain and u['chain']: chain[u['cat']]+=1
    return {'cafe':counts['cafe'],'cafe_chain':chain['cafe'],'restaurant':counts['restaurant'],'restaurant_chain':chain['restaurant'],
            'fast_food':counts['fast_food'],'fast_food_chain':chain['fast_food'],'pub_bar':counts['pub_bar'],
            'grocery':counts['grocery'],'grocery_chain':0,'fitness':counts['fitness'],'fitness_chain':0,'cowork':counts['cowork'],
            'services':counts['services'],'agents':counts['agents'],'pharmacy':counts['pharmacy'],'vets':counts['vets'],
            'shops':counts['shops'],'terrace_share':round(food_ter/food_tot,3) if food_tot else 0}

# ---------- postcodes.io bulk reverse (areas + streets share one cache) ----------
PCF=f'{P}/cache/postcodes.json'
PC=json.load(open(PCF)) if os.path.exists(PCF) else {}
def pc_fill(points):
    todo=[(k,la,lo) for k,la,lo in points if k not in PC]
    for off in range(0,len(todo),100):
        batch=todo[off:off+100]
        gl=[{"latitude":la,"longitude":lo,"limit":1} for _,la,lo in batch]
        for attempt in range(5):
            try:
                r=requests.post('https://api.postcodes.io/postcodes',json={"geolocations":gl},timeout=60)
                if r.status_code==200: break
            except Exception: pass
            time.sleep(3*(attempt+1))
        res=r.json()['result']
        for (k,la,lo),entry in zip(batch,res):
            rr=entry.get('result')
            if isinstance(rr,list): rr=rr[0] if rr else None
            PC[k]=rr
        print('postcodes batch',off,'/',len(todo),flush=True)
        time.sleep(0.3)
    json.dump(PC,open(PCF,'w'))

# ---------- crime ----------
def poly(lat,lng,r=0.004):
    pts=[]
    for i in range(10):
        a=2*math.pi*i/10
        pts.append(f"{lat+r*math.cos(a):.5f},{lng+(r/math.cos(math.radians(lat)))*math.sin(a):.5f}")
    return ":".join(pts)
def crime_one_month(lat,lng,month):
    url=f"https://data.police.uk/api/crimes-street/all-crime?poly={poly(lat,lng)}&date={month}"
    for a in range(4):
        try:
            r=requests.get(url,timeout=60)
            if r.status_code==200: return r.json()
            time.sleep(3*(a+1))
        except Exception: time.sleep(3*(a+1))
    return None
def crime_fetch(lat,lng):
    # fail loudly, never silently zero-fill: a month that errors is retried, then the build aborts
    results={}
    with ThreadPoolExecutor(max_workers=4) as ex:
        for m,crimes in zip(MONTHS, ex.map(lambda m: crime_one_month(lat,lng,m), MONTHS)):
            results[m]=crimes
    for rnd in range(6):
        missing=[m for m,v in results.items() if v is None]
        if not missing: break
        time.sleep(8*(rnd+1))
        for m in missing: results[m]=crime_one_month(lat,lng,m)
    missing=[m for m,v in results.items() if v is None]
    if missing: raise RuntimeError(f"data.police.uk still failing for months {missing} - aborting rather than writing understated crime")
    agg={k:0 for k in KEEP.values()}
    for crimes in results.values():
        for c in crimes:
            k=KEEP.get(c["category"])
            if k: agg[k]+=1
    return agg
def crime_cached(key,la,lo):
    cf=f'{P}/cache/crime_{key}.json'
    if os.path.exists(cf): return json.load(open(cf))
    agg=crime_fetch(la,lo); json.dump(agg,open(cf,'w'))
    print('crime',key,agg,flush=True)
    return agg

# ---------- area segments ----------
areas=json.load(open(f'{P}/segments_area.json'))
pc_fill([(f"a-{s['id']}",s['lat'],s['lng']) for s in areas])
A=[]
for s in areas:
    sid=s['id']
    anch=[]
    for nm,tag in s['anchors']:
        e=GB.get(nm)
        if not e or e['annual']<=0: print('WARN missing ORR station',nm,'for',sid); continue
        days={k:e['annual']/WEEKS*DAYPROF[k] for k in ('mon','mid','fri','sat','sun')}
        anch.append({'station':nm,'mode':'NR','annual':e['annual'],'_days':days,'src':'ORR'})
    us=near_units(s['lat'],s['lng'],250)
    osm=osm_counts(us)
    osm['culture']=near_count(CULT_G,s['lat'],s['lng'],0.004,250,1)
    osm['parks_600']=near_count(PARK_G,s['lat'],s['lng'],0.01,600,1)
    near9=[x for x in near_stations(s['lat'],s['lng']) if x[0]<=900]
    pc=PC.get(f"a-{sid}") or {}
    lsoa_code=(pc.get('codes') or {}).get('lsoa')
    if lsoa_code and lsoa_code in d7:
        lsoa=census(lsoa_code); lsoa['name']=pc.get('lsoa') or lsoa_code
    else:
        print('WARN no lsoa for',sid); lsoa=None
    crime=None if NO_CRIME else crime_cached(sid,s['lat'],s['lng'])
    district=pc.get('admin_district') or ''
    voa=VOA.get(district)
    if not voa: print('WARN no VOA for',district,'(',sid,')'); voa=VOA.get('_default')
    A.append({'id':sid,'name':s['name'],'borough':district or C['name'],'zone':band(s['lat'],s['lng']),
        'lat':s['lat'],'lng':s['lng'],'stype':s['stype'],'lvl':'area','weak':False,
        'anchors':[{'station':a['station'],'mode':a['mode'],'annual':round(a['annual']),'src':'ORR','days_modelled':True} for a in anch],
        '_days':{k:sum(a['_days'][k] for a in anch) for k in ('mon','mid','fri','sat','sun')},
        '_annual':sum(a['annual'] for a in anch),
        'transport':{'stations_900m':len(near9),'names':[n for _,n in near9]},
        'osm':osm,'lsoa':lsoa,'crime':crime,
        'rent':{'retail_rv_m2':voa['retail_rv_m2'],'office_rv_m2':voa['office_rv_m2']},
        '_units':us})
print('areas built:',len(A),flush=True)

# ---------- street clustering (gen5) ----------
bystreet=collections.defaultdict(list)
for i,u in enumerate(units_all):
    if u['street']: bystreet[u['street']].append(i)
CELL=0.0032
clusters=[]
for st,idxs in bystreet.items():
    if len(idxs)<6: continue
    cells=collections.defaultdict(list)
    for i in idxs:
        u=units_all[i]; cells[(int(u['lat']/CELL),int(u['lng']/(CELL/math.cos(math.radians(u['lat'])))))].append(i)
    occ=set(cells); comp_id={}; comps=[]
    for c in occ:
        if c in comp_id: continue
        q=[c]; comp=[]; comp_id[c]=1
        while q:
            cur=q.pop(); comp.append(cur)
            for dx in (-1,0,1):
                for dy in (-1,0,1):
                    nb=(cur[0]+dx,cur[1]+dy)
                    if nb in occ and nb not in comp_id: comp_id[nb]=1; q.append(nb)
        comps.append(comp)
    for comp in comps:
        allidx=[i for c in comp for i in cells[c]]
        if len(allidx)<8: continue
        lats=[units_all[i]['lat'] for i in allidx]; lngs=[units_all[i]['lng'] for i in allidx]
        span_lat=(max(lats)-min(lats))*111000; span_lng=(max(lngs)-min(lngs))*111000*math.cos(math.radians(sum(lats)/len(lats)))
        span=max(span_lat,span_lng)
        if span<=420: clusters.append((st,allidx)); continue
        nparts=max(2,round(span/380))
        horiz=span_lng>=span_lat
        key=lambda i:(units_all[i]['lng'] if horiz else units_all[i]['lat'])
        sidx=sorted(allidx,key=key); per=len(sidx)/nparts
        for p in range(nparts):
            part=sidx[round(p*per):round((p+1)*per)]
            if len(part)>=8: clusters.append((st,part))
            elif clusters and clusters[-1][0]==st: clusters[-1][1].extend(part)
print('raw clusters >=8:',len(clusters),flush=True)
cent=[]
for st,idxs in clusters:
    la=sorted(units_all[i]['lat'] for i in idxs)[len(idxs)//2]
    lo=sorted(units_all[i]['lng'] for i in idxs)[len(idxs)//2]
    cent.append((la,lo))
CG={}
for ci2,(la,lo) in enumerate(cent): CG.setdefault((round(la,3),round(lo,3)),[]).append(ci2)
attached=0; claimed=set(i for _,idxs in clusters for i in idxs)
for i,u in enumerate(units_all):
    if u['street'] or i in claimed: continue
    best=None; bd=80
    for dla in (-0.002,-0.001,0,0.001,0.002):
        for dlo in (-0.002,-0.001,0,0.001,0.002):
            for ci2 in CG.get((round(u['lat']+dla,3),round(u['lng']+dlo,3)),[]):
                d=hav(u['lat'],u['lng'],cent[ci2][0],cent[ci2][1])
                if d<bd: bd=d; best=ci2
    if best is not None: clusters[best][1].append(i); claimed.add(i); attached+=1
print('untagged attached:',attached,flush=True)
# nearest area anchor lookup
AG={}
for i,a in enumerate(A): AG.setdefault((round(a['lat'],2),round(a['lng'],2)),[]).append(i)
def nearest_anchor(la,lo,maxd=1e9):
    best=None; bd=maxd
    for dla in (-0.02,-0.01,0,0.01,0.02):
        for dlo in (-0.03,-0.015,0,0.015,0.03):
            for i in AG.get((round(la+dla,2),round(lo+dlo,2)),[]):
                d=hav(la,lo,A[i]['lat'],A[i]['lng'])
                if d<bd: bd=d; best=i
    return best,bd
streets=[]
for st,idxs in clusters:
    us=[units_all[i] for i in idxs]
    la=sorted(u['lat'] for u in us)[len(us)//2]
    lo=sorted(u['lng'] for u in us)[len(us)//2]
    ai,dist=nearest_anchor(la,lo)
    streets.append({'street':st,'lat':round(la,5),'lng':round(lo,5),'units':us,
                    'parent':A[ai]['id'] if ai is not None else None,'parent_dist':round(dist),
                    'parent_name':A[ai]['name'] if ai is not None else None})
print('streets:',len(streets),'| units inside:',sum(len(s['units']) for s in streets),flush=True)
pc_fill([(f"s-{i}",s['lat'],s['lng']) for i,s in enumerate(streets)])

par_by_id={p['id']:p for p in A}
med_dayrel=None  # computed after flows below
used_names={p['name'].lower() for p in A}
def slug(n): return re.sub(r'-+','-',re.sub(r'[^a-z0-9]+','-',n.lower())).strip('-')
used_ids={p['id'] for p in A}
new=[]
for i,st in enumerate(streets):
    pc=PC.get(f"s-{i}") or {}
    par=par_by_id.get(st['parent']); pdist=st['parent_dist']; sub=pdist<=900
    ward=pc.get('admin_ward') or ''; district=pc.get('admin_district') or ''
    outcode=(pc.get('postcode') or '').split()[0] if pc.get('postcode') else ''
    area_nm=(st['parent_name'].replace(' station area','') if sub and st['parent_name'] else '') or ward or outcode or C['name']
    nm=f"{st['street']} ({area_nm})"
    if nm.lower() in used_names and ward and f"({ward})" not in nm: nm=f"{st['street']} ({ward})"
    sector=((pc.get('postcode') or '').split()[0]+' '+(pc.get('postcode') or '').split()[-1][:1]) if pc.get('postcode') else ''
    if nm.lower() in used_names and outcode: nm=f"{st['street']} ({outcode})"
    if nm.lower() in used_names: nm=f"{st['street']} ({sector.strip() or outcode or C['name']}-{(i%9)+2})"
    used_names.add(nm.lower())
    sid=slug(nm); base=sid; k=2
    while sid in used_ids: sid=f"{base}-{k}"; k+=1
    used_ids.add(sid)
    us=st['units']; n=len(us)
    osm=osm_counts(us)
    if sub:
        osm['culture']=par['osm']['culture']; osm['parks_600']=par['osm']['parks_600']
        transport=dict(par['transport']); crime=None if NO_CRIME else dict(par['crime']); lsoa=dict(par['lsoa']) if par['lsoa'] else None
        anchors=[dict(a) for a in par['anchors']]
        within=sum(1 for u in us if hav(par['lat'],par['lng'],u['lat'],u['lng'])<=250)
        share=max(0.03,min(0.7, within/max(1,len(par['_units']))))
        annual=round(par['_annual']*share)
        days={k:round(par['_days'][k]*share,1) for k in par['_days']}
        mfrom=par['name']
    else:
        la,lo=st['lat'],st['lng']
        osm['culture']=near_count(CULT_G,la,lo,0.004,250,1)
        osm['parks_600']=near_count(PARK_G,la,lo,0.01,600,1)
        near9=[x for x in near_stations(la,lo) if x[0]<=900]
        transport={'stations_900m':len(near9),'names':[x[1] for x in near9]}
        if NO_CRIME: crime=None
        elif pdist<=1200 and par: crime=dict(par['crime'])
        else: crime=crime_cached(f"s-{round(la,4)}-{round(lo,4)}",la,lo)
        lsoa_code=(pc.get('codes') or {}).get('lsoa')
        if lsoa_code and lsoa_code in d7: lsoa=census(lsoa_code); lsoa['name']=pc.get('lsoa') or lsoa_code
        elif par and par['lsoa']: lsoa=dict(par['lsoa'])
        else: lsoa=None
        anchors=[]; share=None; annual=0; days={k:0.0 for k in ('mon','mid','fri','sat','sun')}; mfrom=None
    district2=district if district in VOA else (par['borough'] if par else district)
    voa=VOA.get(district2) or VOA.get('_default')
    stype='high_street' if n>=40 else 'side_street'
    s={'id':sid,'name':nm,'borough':district2 or C['name'],'zone':band(st['lat'],st['lng']),
       'lat':st['lat'],'lng':st['lng'],'stype':stype,'lvl':'street','weak':True,
       'anchors':anchors,
       'flow':{'annual_total':annual,'days':days,'modelled_from':mfrom,'share':round(share,3) if share else None},
       'transport':transport,'osm':osm,'lsoa':lsoa,'crime':crime,
       'rent':{'retail_rv_m2':voa['retail_rv_m2'],'office_rv_m2':voa['office_rv_m2']},
       '_units':us}
    new.append(s)
print('streets enriched:',len(new),flush=True)

# areas: finalise flow dict + crime per1000
for p in A:
    days={k:round(v,1) for k,v in p.pop('_days').items()}
    annual=p.pop('_annual')
    p['flow']={'annual_total':annual,'days':days}
    p['crime_per1000']=None
# repartition parents: drop units claimed by street clusters
claimed=set()
for s in new:
    for u in s['_units']: claimed.add((round(u['lat'],4),round(u['lng'],4),u['cat']))
dropped=0
for p in A:
    keep=[]
    for u in p['_units']:
        k=(round(u['lat'],4),round(u['lng'],4),u['cat'])
        if k in claimed: dropped+=1; continue
        keep.append(u)
    if len(keep)!=len(p['_units']):
        p['_units']=keep
        oc=osm_counts(keep)
        for c in UNITCATS: p['osm'][c]=oc[c]
        for c in ('cafe','restaurant','fast_food'): p['osm'][c+'_chain']=oc[c+'_chain']
        p['osm']['terrace_share']=oc['terrace_share']
print('parent units moved to streets:',dropped,flush=True)

segs=A+new
# fill lsoa None with city median later; first collect median residents
med_res=sorted(s['lsoa']['residents'] for s in segs if s['lsoa'])[max(1,len([s for s in segs if s['lsoa']])//2)]
for s in segs:
    if not s['lsoa']:
        s['lsoa']={'code':'','name':f"({C['name']} median)",'residents':med_res,'pct20_39':30.0,'pct_under20':20.0,
                   'pct_students':5.0,'pct_prof':40.0,'pct_nonuk':20.0,'diversity':0.5,'top_eth':[]}
        s['weak']=True
    cr=s['crime']
    if cr is None:
        s['crime']=None
    else:
        s['crime']={'shoplifting':cr['shoplifting'],'theft_person':cr['theft_person'],'robbery_biz':cr['robbery_biz'],'burglary_biz':cr['burglary_biz']}
        s['crime']['per1000']=round(sum(cr.values())/s['lsoa']['residents']*1000,1) if s['lsoa'].get('residents') else 0
    f=s['flow']
    days=f['days']; weekly=days['mon']+3*days['mid']+days['fri']+days['sat']+days['sun']
    ws=(days['sat']+days['sun'])/weekly if weekly else 0
    f['weekend_share']=round(ws,3); f['weekend_ratio_norm']=0; f['fri_sat_norm']=0
    f['day_rel']={k:round(days[k]/days['mid'],3) if days['mid'] else 0 for k in days}
# median day profile for no-anchor streets
med_dayrel={k:sorted(s['flow']['day_rel'][k] for s in segs)[len(segs)//2] for k in ('mon','mid','fri','sat','sun')}
med_ws=sorted(s['flow']['weekend_share'] for s in segs)[len(segs)//2]
for s in segs:
    if s['lvl']=='street' and not s['anchors']:
        s['flow']['day_rel']=dict(med_dayrel); s['flow']['weekend_share']=round(med_ws,3)
# ---------- cross-segment norms + model (within city only) ----------
def normf(vals):
    lo,hi=min(vals),max(vals)
    return lambda v:(v-lo)/(hi-lo) if hi>lo else 0.5
nWk=normf([s['flow']['weekend_share'] for s in segs])
nFS=normf([(s['flow']['days']['fri']+s['flow']['days']['sat'])/max(1,sum(s['flow']['days'].values())) for s in segs])
logn=normf([math.log10(1+s['flow']['annual_total']) for s in segs])
nCowork=normf([math.log10(1+s['osm']['cowork']) for s in segs])
nOffice=normf([s['rent']['office_rv_m2'] for s in segs])
STYPE_MULT={'major_retail':1.45,'transport_hub':1.10,'high_street':1.15,'side_street':0.95,'market':1.00,'managed_estate':1.35}
for s in segs:
    f=s['flow']
    f['weekend_ratio_norm']=round(nWk(f['weekend_share']),3)
    f['fri_sat_norm']=round(nFS((f['days']['fri']+f['days']['sat'])/max(1,sum(f['days'].values()))),3)
    o=s['osm']; fl=logn(math.log10(1+f['annual_total']))
    totv=max(1,o['cafe']+o['restaurant']+o['fast_food']+o['pub_bar']+o['grocery']+o['shops']+o['culture']+o['cowork'])
    mix={k:o[k]/totv for k in ('cafe','restaurant','fast_food','pub_bar','grocery','shops','culture','cowork')}
    w={'early':0.10+0.25*mix['cafe']+0.10*mix['grocery']+0.15*mix['cowork'],
       'midday':0.28+0.15*mix['cafe']+0.15*mix['restaurant']+0.25*mix['shops']+0.10*mix['fast_food'],
       'afternoon':0.22+0.20*mix['shops']+0.25*mix['culture']+0.10*mix['grocery'],
       'evening':0.28+0.40*mix['restaurant']+0.45*mix['pub_bar']+0.10*mix['culture'],
       'late':0.12+0.55*mix['pub_bar']+0.20*mix['fast_food']}
    w['early']*=0.65+0.55*(1-f['weekend_share'])
    w['late']*=0.55+0.8*f['fri_sat_norm']
    tw=sum(w.values())
    s['model']={}
    rhythm={k:round(v/tw,3) for k,v in w.items()}
    food_chain_share=(o['cafe_chain']+o['restaurant_chain']+o['fast_food_chain'])/max(1,o['cafe']+o['restaurant']+o['fast_food'])
    spend=round(min(95,max(6,5+0.055*s['rent']['retail_rv_m2']+0.20*s['lsoa']['pct_prof']+8*food_chain_share+4*fl)))
    office=round(min(1,max(0,0.45*nCowork(math.log10(1+o['cowork']))+0.35*(1-f['weekend_share'])+0.20*nOffice(s['rent']['office_rv_m2']))),2)
    rent_est=round(s['rent']['retail_rv_m2']*STYPE_MULT.get(s['stype'],1.0)*(1+0.30*fl)*1.08)
    s['model']={'spend_est':spend,'office_skew':office,'rhythm':rhythm}
    s['rent']['est_rent_m2']=rent_est
json.dump(segs,open(f'{P}/segments_full2.json','w'))
print('TOTAL segments:',len(segs),'(areas',len(A),'+ streets',len(new),')')
zero=[s['id'] for s in A if s['flow']['annual_total']<=0]
print('ZERO-FLOW areas:',zero)
