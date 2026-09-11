"""Stage 1: match AC2025 + ORR London stations to coords, dedupe vs existing segments."""
import json, re, math, unicodedata
import pandas as pd

def hav(a,b,c,d):
    R=6371000; p1,p2=math.radians(a),math.radians(c)
    dp=math.radians(c-a); dl=math.radians(d-b)
    x=math.sin(dp/2)**2+math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2*R*math.asin(math.sqrt(x))

def norm(s):
    s=unicodedata.normalize('NFKD',s).lower()
    s=s.replace('&','and')
    s=re.sub(r'\b(lu|lo|dlr|ezl|nr|underground|station|tfl)\b','',s)
    s=re.sub(r"[^a-z0-9]+",'',s)
    return s

ALIASES={ # normalized AC/ORR name -> normalized OSM name
 'kingscrossstpancras':'kingscrossstpancras',
 'londonbridge':'londonbridge',
 'waterloo':'waterloo',
 'victoria':'victoria',
 'paddington':'paddington',
 'euston':'euston',
 'liverpoolst':'liverpoolstreet',
 'stpancrasintl':'stpancras',
 'londonstpancrasinternational':'stpancras',
 'londonpaddington':'paddington',
 'londonwaterloo':'waterloo',
 'londonvictoria':'victoria',
 'londoneuston':'euston',
 'londonliverpoolstreet':'liverpoolstreet',
 'londonbridge':'londonbridge',
 'londonkingscross':'kingscross',
 'londonmarylebone':'marylebone',
 'londoncannonstreet':'cannonstreet',
 'londonfenchurchstreet':'fenchurchstreet',
 'londonblackfriars':'blackfriars',
 'londoncharingcross':'charingcross',
 'heathrowterm4':'heathrowterminal4',
 'heathrowterm5':'heathrowterminal5',
 'heathrowterms123':'heathrowterminals123',
 'heathrowcentral':'heathrowterminals23',
 'heathrowterminals123':'heathrowterminals23',
 'edgwareroadbak':'edgwareroad',
 'bank':'bank',
 'monument':'bank',
 'sudburyandharrowroad':'sudburyharrowroad',
 'sudburyhillharrow':'sudburyhillharrow',
}

# --- load AC2025 stations
raw=pd.read_excel('/tmp/ac2025.xlsx',sheet_name=0,header=None,skiprows=7)
raw.columns=['mode','mnlc','masc','station','coverage','source','mon_e','mid_e','fri_e','sat_e','sun_e','mon_x','mid_x','fri_x','sat_x','sun_x','weekly','w12','annual']
AC={}
def num(v):
    try: return float(str(v).replace(',',''))
    except: return None
for _,r in raw.iterrows():
    st=str(r['station']); an=num(r['annual'])
    if an is None or an<=0: continue
    e=AC.setdefault(st,{'modes':set(),'annual':0})
    e['modes'].add(str(r['mode'])); e['annual']+=an

# --- existing segments
old=json.loads(re.search(r'const SEGMENTS=(\[.*?\]);\s*const META=',open('/tmp/lens/segments.js').read(),re.S).group(1))
EXISTANCH=set(a['station'] for s in old for a in s['anchors'])
CENTRES=[(s['lat'],s['lng'],s['name']) for s in old]

# --- pool stations for coords
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
    k=norm(nm)
    OSM.setdefault(k,[]).append((la,lo,t.get('railway'),nm))

def osm_coord(name):
    k=norm(name); k=ALIASES.get(k,k)
    cands=OSM.get(k)
    if not cands: return None
    st=[c for c in cands if c[2]=='station'] or cands
    la=sum(c[0] for c in st)/len(st); lo=sum(c[1] for c in st)/len(st)
    return la,lo,st[0][3]

def near_existing(la,lo,r=300):
    for a,b,nm in CENTRES:
        if hav(la,lo,a,b)<=r: return nm
    return None

VOAB=set(json.load(open('/tmp/lens/pipeline/voa.json')))
# --- stage 1a: new TfL segments
new_tfl=[]; unmatched=[]
for st,e in AC.items():
    if st in EXISTANCH: continue
    c=osm_coord(st)
    if not c: unmatched.append(('TFL',st)); continue
    la,lo,osmname=c
    near=near_existing(la,lo)
    if near: continue
    new_tfl.append({'station':st,'modes':'/'.join(sorted(e['modes'])),'annual':round(e['annual']),'lat':la,'lng':lo,'osm_name':osmname})

# --- stage 1b: ORR NR segments
orr=json.load(open('/tmp/orr_london.json'))
ACN={norm(s) for s in AC}
ACN|={ALIASES.get(k,k) for k in ACN}
new_nr=[]; 
for name,allt,interch,nlc,tlc in orr:
    a=num(allt)
    if a is None: continue
    k=norm(name); k=ALIASES.get(k,k)
    if k in ACN or norm(name) in ACN: continue   # covered by TfL counts
    if name in EXISTANCH: continue
    c=osm_coord(name)
    if not c: unmatched.append(('NR',name)); continue
    la,lo,osmname=c
    if near_existing(la,lo): continue
    # also dedupe vs new_tfl coords
    if any(hav(la,lo,t['lat'],t['lng'])<=300 for t in new_tfl): continue
    new_nr.append({'station':name,'modes':'NR','annual':round(a),'lat':la,'lng':lo,'osm_name':osmname,'nlc':nlc,'tlc':tlc})

new_tfl.sort(key=lambda x:-x['annual']); new_nr.sort(key=lambda x:-x['annual'])
print('new TfL segments:',len(new_tfl))
print('new NR segments:',len(new_nr))
print('unmatched coords:',len(unmatched),unmatched[:40])
print('TFL sample:',[(t['station'],t['annual']) for t in new_tfl[:10]])
print('NR sample:',[(t['station'],t['annual']) for t in new_nr[:10]])
print('NR smallest:',[(t['station'],t['annual']) for t in new_nr[-8:]])
json.dump(new_tfl,open('/tmp/lens/pipeline/expand/new_tfl.json','w'),indent=1)
json.dump(new_nr,open('/tmp/lens/pipeline/expand/new_nr.json','w'),indent=1)
