"""Enrich street-level segments and merge with the 563 area segments -> segments_full2.json"""
import json, math, re, csv, os, sys, time, collections, requests
from concurrent.futures import ThreadPoolExecutor
P='/tmp/lens/pipeline'
UNITCATS=["cafe","restaurant","fast_food","pub_bar","grocery","shops","fitness","cowork"]
def hav(a,b,c,d):
    R=6371000; p1,p2=math.radians(a),math.radians(c)
    dp=math.radians(c-a); dl=math.radians(d-b)
    x=math.sin(dp/2)**2+math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2*R*math.asin(math.sqrt(x))

parents=json.load(open(f'{P}/segments_full.json'))
streets=json.load(open(f'{P}/streets/streets.json'))
VOA=json.load(open(f'{P}/voa.json'))

# ---- census (copied from build.py) ----
def load(fname):
    with open(f'{P}/census/{fname}') as f:
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

# ---- postcodes.io bulk reverse ----
cachef=f'{P}/streets/postcodes.json'
if os.path.exists(cachef):
    PC=json.load(open(cachef))
else:
    PC={}
    todo=[(i,s) for i,s in enumerate(streets)]
    for off in range(0,len(todo),100):
        batch=todo[off:off+100]
        gl=[{"latitude":s['lat'],"longitude":s['lng'],"limit":1} for _,s in batch]
        for attempt in range(5):
            try:
                r=requests.post('https://api.postcodes.io/postcodes',json={"geolocations":gl},timeout=60)
                if r.status_code==200: break
            except Exception: pass
            time.sleep(3*(attempt+1))
        res=r.json()['result']
        for (i,s),entry in zip(batch,res):
            rr=entry.get('result')
            if isinstance(rr,list): rr=rr[0] if rr else None
            PC[str(i)]=rr
        print('postcodes batch',off,flush=True)
        time.sleep(0.3)
    json.dump(PC,open(cachef,'w'))

# ---- context pools for standalone streets (culture/parks/stations from pool.json) ----
pool=json.load(open(f'{P}/cache/pool.json'))
culture=[]; parks=[]; stn=[]
for e in pool:
    t=e.get('tags',{})
    la=e.get('lat') or e.get('center',{}).get('lat'); lo=e.get('lon') or e.get('center',{}).get('lon')
    if not la: continue
    am=t.get('amenity',''); le=e.get('tags',{}).get('leisure',''); to=t.get('tourism','')
    if to in ('museum','gallery','attraction') or am in ('theatre','cinema','arts_centre'): culture.append((la,lo))
    elif le in ('park','garden','common'): parks.append((la,lo))
    if e['type']=='node' and (t.get('railway') in ('station','halt') or t.get('station')=='subway') and t.get('name'):
        stn.append((la,lo,t['name']))
def gridify(lst,cell):
    g={}
    for x in lst:
        g.setdefault((round(x[0]/cell),round(x[1]/cell)),[]).append(x)
    return g
CULT_G=gridify(culture,0.004); PARK_G=gridify(parks,0.01); STN_G=gridify(stn,0.015)
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
    return sorted(out)[:8]

# ---- crime fetch for standalone streets >1.2km from any anchor ----
MONTHS=["2025-08","2025-09","2025-10","2025-11","2025-12","2026-01","2026-02","2026-03","2026-04","2026-05","2026-06","2026-07"]
KEEP={"shoplifting":"shoplifting","theft-from-the-person":"theft_person","robbery":"robbery_biz","burglary":"burglary_biz"}
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
    return []
def crime_fetch(lat,lng):
    agg={k:0 for k in KEEP.values()}
    with ThreadPoolExecutor(max_workers=4) as ex:
        for crimes in ex.map(lambda m: crime_one_month(lat,lng,m), MONTHS):
            for c in crimes:
                k=KEEP.get(c["category"])
                if k: agg[k]+=1
    return agg

par_by_id={p['id']:p for p in parents}
med_dayrel={k:sorted(p['flow']['day_rel'][k] for p in parents)[len(parents)//2] for k in ('mon','mid','fri','sat','sun')}
med_ws=sorted(p['flow']['weekend_share'] for p in parents)[len(parents)//2]

used_names={p['name'].lower() for p in parents}
def slug(n): return re.sub(r'-+','-',re.sub(r'[^a-z0-9]+','-',n.lower())).strip('-')
used_ids={p['id'] for p in parents}
new=[]
crime_fetches=0
for i,st in enumerate(streets):
    pc=PC.get(str(i)) or {}
    par=par_by_id.get(st['parent'])
    pdist=st['parent_dist']
    sub=pdist<=900
    ward=pc.get('admin_ward') or ''
    district=pc.get('admin_district') or ''
    outcode=(pc.get('postcode') or '').split()[0] if pc.get('postcode') else ''
    # name
    area=(st['parent_name'].replace(' station area','') if sub and st['parent_name'] else '') or ward or outcode or 'London'
    nm=f"{st['street']} ({area})"
    if nm.lower() in used_names and ward and f"({ward})" not in nm: nm=f"{st['street']} ({ward})"
    sector=(pc.get('postcode') or '').split()[0]+' '+(pc.get('postcode') or '').split()[-1][:1] if pc.get('postcode') else ''
    if nm.lower() in used_names and sector.strip() and sector.strip()!=outcode: nm=f"{st['street']} ({sector})"
    if nm.lower() in used_names and outcode: nm=f"{st['street']} ({outcode})"
    if nm.lower() in used_names: nm=f"{st['street']} ({sector.strip() or outcode or 'London'}-{(i%9)+2})"
    used_names.add(nm.lower())
    sid=slug(nm); base=sid; k=2
    while sid in used_ids: sid=f"{base}-{k}"; k+=1
    used_ids.add(sid)
    us=st['units']
    n=len(us)
    # osm counts from units
    counts={c:0 for c in ['cafe','restaurant','fast_food','pub_bar','grocery','shops','fitness','cowork']}
    chain={c:0 for c in ('cafe','restaurant','fast_food')}
    food_tot=0; food_ter=0
    for u in us:
        counts[u['cat']]+=1
        if u['cat'] in ('cafe','restaurant','fast_food','pub_bar'):
            food_tot+=1; food_ter+=u.get('terrace',0)
            if u['cat'] in chain and u['chain']: chain[u['cat']]+=1
    if sub:
        cult=par['osm']['culture']; prk=par['osm']['parks_600']; transport=dict(par['transport'])
        crime=dict(par['crime']); lsoa=dict(par['lsoa']); zone=par['zone']
        anchors=[dict(a) for a in par['anchors']]
        within=sum(1 for u in us if hav(par['lat'],par['lng'],u['lat'],u['lng'])<=250)
        share=max(0.03,min(0.7, within/max(1,len(par['_units']))))
        annual=round(par['flow']['annual_total']*share)
        days={k:round(par['flow']['days'][k]*share,1) for k in par['flow']['days']}
        ws=par['flow']['weekend_share']; day_rel=dict(par['flow']['day_rel'])
        mfrom=par['name']
    else:
        la,lo=st['lat'],st['lng']
        cult=near_count(CULT_G,la,lo,0.004,250,1)
        prk=near_count(PARK_G,la,lo,0.01,600,1)
        near9=[x for x in near_stations(la,lo) if x[0]<=900]
        transport={'stations_900m':len(near9),'names':[x[1] for x in near9]}
        if pdist<=1200 and par:
            crime=dict(par['crime'])
        else:
            cf=f'{P}/streets/crime_{round(la,4)}_{round(lo,4)}.json'
            if os.path.exists(cf): crime=json.load(open(cf))
            else:
                crime=crime_fetch(la,lo); json.dump(crime,open(cf,'w'))
            crime['per1000']=0; crime_fetches+=1
        lsoa_code=(pc.get('codes') or {}).get('lsoa')
        if lsoa_code and lsoa_code in d7:
            lsoa=census(lsoa_code); lsoa['name']=pc.get('lsoa') or lsoa_code
        elif par: lsoa=dict(par['lsoa'])
        else: lsoa=census('E01004763'); lsoa['name']='(London median)'
        zone=par['zone'] if (par and pdist<=2000) else 'Outside zones 1-9'
        anchors=[]; share=None; annual=0
        days={k:0.0 for k in ('mon','mid','fri','sat','sun')}
        ws=med_ws; day_rel=dict(med_dayrel); mfrom=None
    borough=district if district in VOA else (par['borough'] if par else district)
    voa=VOA.get(borough) or {'retail_rv_m2':150,'office_rv_m2':100}
    stype='high_street' if n>=40 else 'side_street'
    s={'id':sid,'name':nm,'borough':borough,'zone':zone,'lat':st['lat'],'lng':st['lng'],'stype':stype,
       'lvl':'street','weak':True,
       'anchors':anchors,
       'flow':{'annual_total':annual,'days':days,'weekend_share':round(ws,3),'weekend_ratio_norm':0,'fri_sat_norm':0,
               'day_rel':{k:round(v,3) for k,v in day_rel.items()},
               'modelled_from':mfrom,'share':round(share,3) if share else None},
       'transport':transport,
       'osm':{'cafe':counts['cafe'],'cafe_chain':chain['cafe'],'restaurant':counts['restaurant'],'restaurant_chain':chain['restaurant'],
              'fast_food':counts['fast_food'],'fast_food_chain':chain['fast_food'],'pub_bar':counts['pub_bar'],
              'grocery':counts['grocery'],'grocery_chain':0,'fitness':counts['fitness'],'fitness_chain':0,'cowork':counts['cowork'],
              'shops':counts['shops'],'culture':cult,'parks_600':prk,
              'terrace_share':round(food_ter/food_tot,3) if food_tot else 0},
       'lsoa':lsoa,
       'crime':{'shoplifting':crime['shoplifting'],'theft_person':crime['theft_person'],'robbery_biz':crime['robbery_biz'],'burglary_biz':crime['burglary_biz'],'per1000':0},
       'rent':{'retail_rv_m2':voa['retail_rv_m2'],'office_rv_m2':voa['office_rv_m2']},
       '_units':us}
    s['crime']['per1000']=round((s['crime']['shoplifting']+s['crime']['theft_person']+s['crime']['robbery_biz']+s['crime']['burglary_biz'])/lsoa['residents']*1000,1) if lsoa.get('residents') else 0
    new.append(s)
print('streets enriched:',len(new),'| police-API crime fetches:',crime_fetches,flush=True)

# ---- repartition parents: drop units claimed by street clusters (12m grid) ----
claimed=set()
for s in new:
    for u in s['_units']:
        claimed.add((round(u['lat'],4),round(u['lng'],4),u['cat']))
dropped=0
for p in parents:
    keep=[]
    for u in p['_units']:
        k=(round(u['lat'],4),round(u['lng'],4),u['cat'])
        if k in claimed: dropped+=1; continue
        keep.append(u)
    if len(keep)!=len(p['_units']):
        p['_units']=keep
        counts={c:0 for c in ['cafe','restaurant','fast_food','pub_bar','grocery','shops','fitness','cowork']}
        chain={c:0 for c in ('cafe','restaurant','fast_food')}
        for u in keep:
            counts[u['cat']]+=1
            if u['cat'] in chain and u['chain']: chain[u['cat']]+=1
        for c in counts: p['osm'][c]=counts[c]
        for c in chain: p['osm'][c+'_chain']=chain[c]
    p['lvl']='area'; p['weak']=False
print('parent units moved to streets:',dropped,flush=True)

segs=parents+new
# ---- cross-segment norms + model (same as build.py) ----
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
    rhythm={k:round(v/tw,3) for k,v in w.items()}
    food_chain_share=(o['cafe_chain']+o['restaurant_chain']+o['fast_food_chain'])/max(1,o['cafe']+o['restaurant']+o['fast_food'])
    spend=round(min(95,max(6,5+0.055*s['rent']['retail_rv_m2']+0.20*s['lsoa']['pct_prof']+8*food_chain_share+4*fl)))
    office=round(min(1,max(0,0.45*nCowork(math.log10(1+o['cowork']))+0.35*(1-f['weekend_share'])+0.20*nOffice(s['rent']['office_rv_m2']))),2)
    rent_est=round(s['rent']['retail_rv_m2']*STYPE_MULT.get(s['stype'],1.0)*(1+0.30*fl)*1.08)
    s['model']={'spend_est':spend,'office_skew':office,'rhythm':rhythm}
    s['rent']['est_rent_m2']=rent_est

json.dump(segs,open(f'{P}/segments_full2.json','w'))
print('TOTAL segments:',len(segs),'(areas',len(parents),'+ streets',len(new),')')
