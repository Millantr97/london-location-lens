"""Stage 2: enrich candidates with coords+zone (OSM pool first, TfL Search fallback),
borough via postcodes.io, filter to VOA boroughs, final dedupe."""
import json, re, math, time, unicodedata, os, sys
import requests

E='/tmp/lens/pipeline/expand'
def hav(a,b,c,d):
    R=6371000; p1,p2=math.radians(a),math.radians(c)
    dp=math.radians(c-a); dl=math.radians(d-b)
    x=math.sin(dp/2)**2+math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2*R*math.asin(math.sqrt(x))
def norm(s):
    s=unicodedata.normalize('NFKD',s).lower().replace('&','and')
    s=re.sub(r'\b(lu|lo|dlr|ezl|nr|underground|station|tfl|rail|only)\b','',s)
    return re.sub(r"[^a-z0-9]+",'',s)
ALIASES={'heathrowterminals123':'heathrowterminals23','heathrowcentral':'heathrowterminals23',
 'edgwareroadbak':'edgwareroadbakerloo','kingscross':'kingscrossstpancras',
 'londonkingscross':'kingscrossstpancras','londonstpancrasinternational':'stpancrasinternational',
 'hamptonlondon':'hampton','hayeskent':'hayes','leelondon':'lee',
 'sudburyhill':'sudburyhillharrow'}

# ---- OSM pool coords
pool=json.load(open('/tmp/lens/pipeline/cache/pool.json'))
OSM={}
for e in pool:
    t=e.get('tags',{})
    if not (t.get('railway') in ('station','halt') or t.get('station')=='subway'): continue
    nm=t.get('name')
    if not nm: continue
    la=e.get('lat'); lo=e.get('lon')
    if la is None:
        c=e.get('center',{}); la,lo=c.get('lat'),c.get('lon')
    if la is None: continue
    OSM.setdefault(norm(nm),[]).append((la,lo,t.get('railway'),nm))
def osm_coord(name):
    for k in (norm(name),ALIASES.get(norm(name),'')):
        cands=OSM.get(k)
        if not cands: continue
        if name=='Edgware Road (Bak)':  # two distinct Edgware Road stations; Bakerloo = southern
            cands=sorted(cands,key=lambda c:c[0])[:1]
        st=[c for c in cands if c[2]=='station'] or cands
        return sum(c[0] for c in st)/len(st), sum(c[1] for c in st)/len(st), st[0][3]
    return None

# ---- TfL Search fallback + zones
CACHEF=f'{E}/tfl_search_cache.json'
CACHE=json.load(open(CACHEF)) if os.path.exists(CACHEF) else {}
def tfl_search(name):
    if CACHE.get(name) is not None: return CACHE[name]
    q=re.sub(r'\s+(LU|LO)$','',name)
    q={'Edgware Road (Bak)':'Edgware Road Bakerloo'}.get(q,q)
    url=f'https://api.tfl.gov.uk/StopPoint/Search/{requests.utils.quote(q)}'
    out=None
    for a in range(5):
        try:
            r=requests.get(url,params={'modes':'tube,dlr,overground,elizabeth-line,national-rail,tram'},timeout=30)
            if r.status_code==200:
                ms=r.json().get('matches',[])
                qn=norm(q)
                best=None
                for m in ms:
                    mn=norm(m.get('name',''))
                    score=(mn==qn)*2+(qn in mn or mn in qn)
                    if score and (best is None or score>best[0]): best=(score,m)
                if best:
                    m=best[1]
                    out={'name':m.get('name'),'lat':m.get('lat'),'lon':m.get('lon'),'zone':m.get('zone'),'id':m.get('id')}
                CACHE[name]=out
                json.dump(CACHE,open(CACHEF,'w'))
                time.sleep(0.25)
                return out
            print('HTTP',r.status_code,name,flush=True)
        except Exception as ex: print('err',name,str(ex)[:50],flush=True)
        time.sleep(3*(a+1))
    CACHE[name]=None; json.dump(CACHE,open(CACHEF,'w'))
    return None

# ---- candidates: rerun stage-1 logic incl. previously unmatched (they get TfL coords)
tfl=json.load(open(f'{E}/new_tfl.json'))
nr=json.load(open(f'{E}/new_nr.json'))
unmatched_names=['Amersham','Buckhurst Hill','Chalfont & Latimer','Chesham','Chigwell','Chorleywood','Croxley','Debden','Epping','Heathrow Terminals 123 LU','Loughton','Moor Park','Rickmansworth','Theydon Bois','Watford','Bushey','Carpenders Park','Cheshunt','Theobalds Grove','Watford High Street','Watford Junction','Brentwood','Burnham','Iver','Langley','Maidenhead','Reading','Shenfield','Slough','Taplow','Twyford']
import pandas as pd
raw=pd.read_excel('/tmp/ac2025.xlsx',sheet_name=0,header=None,skiprows=7)
raw.columns=['mode','mnlc','masc','station','coverage','source','mon_e','mid_e','fri_e','sat_e','sun_e','mon_x','mid_x','fri_x','sat_x','sun_x','weekly','w12','annual']
def num(v):
    try: return float(str(v).replace(',',''))
    except: return None
AC={}
for _,r in raw.iterrows():
    st=str(r['station']); an=num(r['annual'])
    if an is None or an<=0: continue
    e=AC.setdefault(st,{'modes':set(),'annual':0})
    e['modes'].add(str(r['mode'])); e['annual']+=an
for nm in unmatched_names:
    if nm in AC:
        e=AC[nm]
        tfl.append({'station':nm,'modes':'/'.join(sorted(e['modes'])),'annual':round(e['annual']),'lat':None,'lng':None})
orr=json.load(open('/tmp/orr_london.json'))
DROP_NR={'Heathrow Terminal 4 (Rail Station Only)','Heathrow Terminal 5 (Rail Station Only)','Heathrow Terminals 2 and 3 (Rail Station Only)'}  # dupes of AC Heathrow
for name,allt,interch,nlc,tlc in orr:
    if name in DROP_NR: continue
    if any(x['station']==name for x in nr): continue
    if norm(name) in {norm(t['station']) for t in tfl}: continue
    import re as _re
    base=_re.sub(r'\s*\((London|Kent|Essex|Greater London|Walthamstow|Battersea|Peckham)\)$','',name)
    if '(' in name and 'Rail Station Only' not in name:
        # parenthesised NR name: add unless TfL AC already covers the base name
        if norm(base) not in {norm(t['station']) for t in tfl}:
            a=num(allt)
            if a: nr.append({'station':name,'modes':'NR','annual':round(a),'lat':None,'lng':None,'nlc':nlc,'tlc':tlc})

cands=[dict(c,src='AC2025') for c in tfl]+[dict(c,src='ORR2024-25') for c in nr]
print('candidates:',len(cands))

# ---- coords
import re as _re2
for c in cands:
    if c.get('lat') is None:
        nm=_re2.sub(r'\s*\([^)]*\)$','',c['station'])
        co=osm_coord(nm)
        if co: c['lat'],c['lng'],c['osm_name']=co
for c in cands:
    s=tfl_search(c['station'])
    c['tfl']=s
    if c.get('lat') is None and s: c['lat'],c['lng']=s['lat'],s['lon']
cands=[c for c in cands if c.get('lat') is not None]
print('with coords:',len(cands))

# ---- borough via postcodes.io bulk
results=[]
for i in range(0,len(cands),90):
    batch=cands[i:i+90]
    r=requests.post('https://api.postcodes.io/postcodes',json={'geolocations':[{'longitude':c['lng'],'latitude':c['lat'],'radius':1500,'limit':1} for c in batch]},timeout=60).json()
    results+=r['result']
res={'result':results}
VOAB=set(json.load(open('/tmp/lens/pipeline/voa.json')))
kept=[]; excluded=[]
for c,r in zip(cands,res['result']):
    p=(r.get('result') or [None])[0]
    borough=p.get('admin_district') if p else None
    c['borough']=borough
    if borough in VOAB: kept.append(c)
    else: excluded.append((c['station'],borough))
print('kept:',len(kept),'excluded (no VOA borough):',len(excluded),excluded)

# ---- final dedupe: vs existing centres/anchors and within list
old=json.loads(re.search(r'const SEGMENTS=(\[.*?\]);\s*const META=',open('/tmp/lens/segments.js').read(),re.S).group(1))
pts=[(s['lat'],s['lng']) for s in old]
for s in old:
    for a in s['anchors']:
        co=osm_coord(a['station'])
        if co: pts.append((co[0],co[1]))
final=[]
for c in sorted(kept,key=lambda x:-x['annual']):
    if any(hav(c['lat'],c['lng'],a,b)<=300 for a,b in pts): continue
    if any(hav(c['lat'],c['lng'],d['lat'],d['lng'])<=300 for d in final): continue
    final.append(c)
    pts.append((c['lat'],c['lng']))
print('final new segments:',len(final),'(TfL:',sum(1 for c in final if c['src']=='AC2025'),'NR:',sum(1 for c in final if c['src']!='AC2025'),')')
json.dump(final,open(f'{E}/candidates_final.json','w'),indent=1)
