"""Rebuild segments.js + units.js from cached sources. Single source of truth for all derived fields."""
import json, os, sys, math, re, csv, glob
import pandas as pd
sys.path.insert(0,'/tmp/lens/pipeline')
from segments_def import NEW_SEGMENTS

P='/tmp/lens/pipeline'
SEGDEFS=json.load(open(f'{P}/all_segments.json'))
NEWIDS={s['id'] for s in NEW_SEGMENTS}
NEWANCH={s['id']:[(a,m) for a,m in s['anchors']] for s in NEW_SEGMENTS}
VOA=json.load(open(f'{P}/voa.json'))

# ---------- NUMBAT ----------
raw=pd.read_excel('/tmp/numbat.xlsx',sheet_name=0,header=None,skiprows=7)
raw.columns=['mode','mnlc','masc','station','coverage','source','mon_e','mid_e','fri_e','sat_e','sun_e','mon_x','mid_x','fri_x','sat_x','sun_x','weekly','w12','annual']
STATIONS={}
for _,r in raw.iterrows():
    st=str(r['station'])
    def num(v):
        try: return float(v)
        except (TypeError,ValueError): return None
    an=num(r['annual'])
    if an is None or an<=0: continue  # drops '---see LU---' phantom rows
    e=STATIONS.setdefault(st,{'modes':set(),'days':{'mon':0,'mid':0,'fri':0,'sat':0,'sun':0},'annual':0})
    e['modes'].add(str(r['mode']))
    for k,ce,cx in [('mon','mon_e','mon_x'),('mid','mid_e','mid_x'),('fri','fri_e','fri_x'),('sat','sat_e','sat_x'),('sun','sun_e','sun_x')]:
        ev,num2=num(r[ce]),num(r[cx])
        if ev is not None and num2 is not None: e['days'][k]+=ev+num2
    e['annual']+=an
print(f"NUMBAT: {len(STATIONS)} stations")
NRANCH={}
_nrf=f'{P}/expand/nr_anchors.json'
if os.path.exists(_nrf):
    NRANCH=json.load(open(_nrf))
    print(f"ORR NR anchors: {len(NRANCH)} stations")

# ---------- Census ----------
def load(fname):
    with open(f'{P}/census/{fname}') as f:
        rd=csv.reader(f); hdr=next(rd)
        return hdr,{r[2]:r for r in rd}
h7,d7=load('census2021-ts007a-lsoa.csv')
h4,d4=load('census2021-ts004-lsoa.csv')
h21,d21=load('census2021-ts021-lsoa.csv')
h63,d63=load('census2021-ts063-lsoa.csv')
h66,d66=load('census2021-ts066-lsoa.csv')
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

# validate against baked values for two known LSOAs
w=census('E01004763')
assert w['residents']==2016 and w['pct20_39']==57.0 and w['pct_students']==20.7 and w['pct_prof']==80.2 and w['pct_nonuk']==65.0, w
print('census validation OK (Westminster 013B)')

# ---------- OSM classify ----------
FOOD={'cafe','restaurant','fast_food','pub_bar'}
GROCERY_SHOPS={'convenience','supermarket','greengrocer','bakery','butcher','deli','alcohol','newsagent','confectionery','health_food','seafood','cheese','coffee','pastry','wine','frozen_food'}
CHAINS=['costa','starbucks','pret a manger','pret','caffe nero','nero','greggs','mcdonald','kfc','subway','wagamama','pizza express','itsu','leon','tortilla','five guys','nando','franco manca','honest burger','cote','zizzi','ask italian','pizza hut','domino','popeyes','wingstop','taco bell','burger king','tim hortons','black sheep','gail\'s','blank street','joe & the juice','el&n','dishoom','wasabi','coco di mama','paul','patisserie valerie','t4','bubbleology','gong cha','m&s','tesco','sainsbury','waitrose','co-op','lidl','aldi','iceland','morrisons','asda','puregym','the gym','anytime fitness','david lloyd','virgin active','third space','1rebel','barry\'s','f45','sweat','wework','regus','spaces','huckletree','the office group','fora','uncommon','brewdog','wetherspoon','greene king','fuller\'s','young\'s','stonegate','simmons','be at one','slug and lettuce','all bar one','pitcher & piano','peyton and byrne','coffee#1','soho coffee','esquires','timmy green','grind','watchhouse','redemption roasters','hagen','kaffeine','ole & steen','knoops','amorino','creams','hans & gretel','l\'eto caffee','moreish','dutch pancakes','wendy\'s','chipotle','german doner kebab','gdk','itsu','yo! sushi','wasabi','busaba','banana tree','pho','thon','comptoir libanais','giggling squid','rosa\'s thai','laksamania','marugame','kineya','krispy kreme','shake shack','gbk','gourmet burger','byron','dirty bones','chick-fil-a','jollibee','morley\'s','chicken cottage','sam\'s chicken','dixy chicken','perfect fried chicken','taz']
CHAIN_RE=re.compile('|'.join(re.escape(c) for c in sorted(set(CHAINS),key=len,reverse=True)))

def is_chain(t):
    s=((t.get('name') or '')+' '+(t.get('brand') or '')+' '+(t.get('operator') or '')).lower()
    return bool(CHAIN_RE.search(s))

def classify(el):
    t=el.get('tags',{})
    am=t.get('amenity',''); sh=t.get('shop',''); le=t.get('leisure',''); to=t.get('tourism',''); of=t.get('office','')
    if am in ('cafe','restaurant','fast_food'): return am
    if am in ('pub','bar','nightclub'): return 'pub_bar'
    if sh: return 'grocery' if sh in GROCERY_SHOPS else ('shops' if sh!='vacant' else None)
    if le=='fitness_centre': return 'fitness'
    if of=='coworking': return 'cowork'
    if to in ('museum','gallery','attraction') or am in ('theatre','cinema','arts_centre'): return 'culture'
    if le in ('park','garden','common'): return 'park'
    return None

def coord(el):
    if el['type']=='node': return el['lat'],el['lon']
    c=el.get('center',{}); return c.get('lat'),c.get('lon')

def osm_for(sid,anchor):
    global ANCHOR
    ANCHOR=anchor
    el=json.load(open(f'{P}/cache/osm/{sid}.json'))
    seen=set(); counts={c:0 for c in ['cafe','restaurant','fast_food','pub_bar','grocery','shops','fitness','cowork','culture']}
    chain={c:0 for c in FOOD}; parks=set(); stations={}; units=[]; food_tot=0; food_ter=0
    for e in el:
        k=(e['type'],e['id'])
        if k in seen: continue
        seen.add(k)
        t=e.get('tags',{})
        if e['type']=='node' and (t.get('railway') in ('station','halt') or t.get('station')=='subway'):
            nm=t.get('name')
            if nm: stations[nm]=True
            continue
        cat=classify(e)
        if not cat: continue
        if cat=='park': parks.add(e['id']); continue
        counts[cat]+=1
        la,lo=coord(e)
        if cat in FOOD:
            food_tot+=1
            out=t.get('outdoor_seating','')+t.get('seat:outside','')
            if out.lower()=='yes': food_ter+=1
            if is_chain(t): chain[cat]+=1
        if cat in ('grocery','shops','fitness','cowork') and is_chain(t): chain.setdefault(cat,0)
        if la and cat in tuple(FOOD)+('grocery','shops','fitness','cowork'):
            dist=hav(ANCHOR[0],ANCHOR[1],la,lo)
            units.append({'lat':round(la,5),'lng':round(lo,5),'cat':cat,'chain':1 if is_chain(t) else 0,
                          'name':t.get('name',''),'street':t.get('addr:street',''),'cuisine':(t.get('cuisine','') or t.get('shop','')).split(';')[0],
                          'dist':round(dist)})
    out={'cafe':counts['cafe'],'cafe_chain':chain['cafe'],'restaurant':counts['restaurant'],'restaurant_chain':chain['restaurant'],
         'fast_food':counts['fast_food'],'fast_food_chain':chain['fast_food'],'pub_bar':counts['pub_bar'],'grocery':counts['grocery'],
         'grocery_chain':0,'fitness':counts['fitness'],'fitness_chain':0,'cowork':counts['cowork'],'shops':counts['shops'],
         'culture':counts['culture'],'parks_600':len(parks),'terrace_share':round(food_ter/food_tot,3) if food_tot else 0,
         '_stations':sorted(stations),'_units':units}
    return out

def hav(lat1,lon1,lat2,lon2):
    R=6371000
    p1,p2=math.radians(lat1),math.radians(lat2)
    dp=math.radians(lat2-lat1); dl=math.radians(lon2-lon1)
    a=math.sin(dp/2)**2+math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2*R*math.asin(math.sqrt(a))

# ---------- assemble ----------
# flow norms across all segments after computing anchors
old=json.loads(re.search(r'const SEGMENTS=(\[.*?\]);?\s*const META=',open('/tmp/lens/segments.js').read(),re.S).group(1))
OLDANCH={}
for s in old:
    OLDANCH[s['id']]=sorted(set(a['station'] for a in s['anchors']))
    OLDANCH[s['id']+'_lsoa']=(s['lsoa']['code'],s['lsoa']['name'])

def anchors_for(sid):
    pairs=NEWANCH[sid] if sid in NEWIDS else [(n,None) for n in OLDANCH[sid]]
    out=[]
    for n,tag in pairs:
        if tag=='ORR':
            if n not in NRANCH: print('WARN missing NR station',n,'for',sid); continue
            e=NRANCH[n]
            out.append({'station':n,'mode':'NR','annual':round(e['annual']),'_days':e['days'],'src':'ORR'})
            continue
        if n not in STATIONS: print('WARN missing station',n,'for',sid); continue
        e=STATIONS[n]
        out.append({'station':n,'mode':'/'.join(sorted(e['modes'])),'annual':round(e['annual']),'_days':e['days'],'src':'TfL'})
    return out

segs=[]
for sd in SEGDEFS:
    sid=sd['id']
    anch=anchors_for(sid)
    days={k:sum(a['_days'][k] for a in anch) for k in ('mon','mid','fri','sat','sun')}
    annual=sum(a['annual'] for a in anch)
    weekly=days['mon']+3*days['mid']+days['fri']+days['sat']+days['sun']
    ws=(days['sat']+days['sun'])/weekly if weekly else 0
    day_rel={k:(days[k]/days['mid'] if days['mid'] else 0) for k in days}
    if sid in NEWIDS:
        lsoa_meta=json.load(open(f'{P}/cache/lsoa/{sid}.json'))
        lsoa=dict(census(lsoa_meta['code'])); lsoa['name']=lsoa_meta['name']
    else:
        code,name=OLDANCH[sid+'_lsoa']
        lsoa=dict(census(code)); lsoa['name']=name
    crime=json.load(open(f'{P}/cache/crime/{sid}.json'))
    per1000=(sum(crime.values())/lsoa['residents']*1000) if lsoa['residents'] else 0
    cachef=f'{P}/cache/osm/{sid}.json'
    if os.path.exists(cachef):
        osm=osm_for(sid,(sd['lat'],sd['lng']))
    elif sid not in NEWIDS:
        old_s=next(x for x in old if x['id']==sid)
        osm=dict(old_s['osm']); osm['_stations']=old_s['transport']['names']; osm['_units']=[]
    else:
        print('SKIP (no osm cache):',sid); continue
    voa=VOA.get(sd['borough'])
    if not voa: print('WARN no VOA for',sd['borough'])
    s={'id':sid,'name':sd['name'],'borough':sd['borough'],'zone':sd['zone'],'lat':sd['lat'],'lng':sd['lng'],'stype':sd['stype'],
       'anchors':[{'station':a['station'],'mode':a['mode'],'annual':a['annual'],'src':a.get('src','TfL')} for a in anch],
       'flow':{'annual_total':annual,'days':days,'weekend_share':round(ws,3),'weekend_ratio_norm':0,'fri_sat_norm':0,'day_rel':{k:round(v,3) for k,v in day_rel.items()}},
       'transport':{'stations_900m':len(osm['_stations']),'names':osm['_stations'][:8]},
       'osm':{k:v for k,v in osm.items() if not k.startswith('_')},
       'lsoa':lsoa,
       'crime':{'shoplifting':crime['shoplifting'],'theft_person':crime['theft_person'],'robbery_biz':crime['robbery_biz'],'burglary_biz':crime['burglary_biz'],'per1000':round(per1000,1)},
       'rent':{'retail_rv_m2':voa['retail_rv_m2'],'office_rv_m2':voa['office_rv_m2']},
       '_units':osm['_units']}
    segs.append(s)

# cross-segment norms
def normf(vals):
    lo,hi=min(vals),max(vals)
    return lambda v:(v-lo)/(hi-lo) if hi>lo else 0.5
nWk=normf([s['flow']['weekend_share'] for s in segs])
nFS=normf([(s['flow']['days']['fri']+s['flow']['days']['sat'])/max(1,sum(s['flow']['days'].values())) for s in segs])
nFlow=logn=normf([math.log10(1+s['flow']['annual_total']) for s in segs])
nCowork=logn2=normf([math.log10(1+s['osm']['cowork']) for s in segs])
nOffice=normf([s['rent']['office_rv_m2'] for s in segs])
STYPE_MULT={'major_retail':1.45,'transport_hub':1.10,'high_street':1.15,'side_street':0.95,'market':1.00,'managed_estate':1.35}
for s in segs:
    f=s['flow']
    f['weekend_ratio_norm']=round(nWk(f['weekend_share']),3)
    f['fri_sat_norm']=round(nFS((f['days']['fri']+f['days']['sat'])/max(1,sum(f['days'].values()))),3)
    o=s['osm']; fl=logn(math.log10(1+f['annual_total']))
    # rhythm from offer mix
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

json.dump(segs,open(f'{P}/segments_full.json','w'))
print('assembled',len(segs),'segments')
for s in segs:
    if not s['anchors'] or s['flow']['annual_total']<=0: print('ZERO-FLOW',s['id'])
