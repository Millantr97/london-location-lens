"""Stage 3: emit segments_def.py NEW_SEGMENTS + extend all_segments.json + nr_anchors.json."""
import json, re, math
import pandas as pd
E='/tmp/lens/pipeline/expand'
P='/tmp/lens/pipeline'
final=json.load(open(f'{E}/candidates_final.json'))
old=json.loads(re.search(r'const SEGMENTS=(\[.*?\]);\s*const META=',open('/tmp/lens/segments.js').read(),re.S).group(1))
existing_ids={s['id'] for s in old}

def slug(s):
    s=s.lower().replace('&','and')
    s=re.sub(r"[^a-z0-9]+",'-',s).strip('-')
    return s
def disp(st):
    st=re.sub(r'\s+(LU|LO)$','',st)
    st=re.sub(r'\s*\([^)]*\)$','',st)
    st=re.sub(r'^London ','',st)
    return st

# ---- typical LO day profile from AC2025 (median across Overground stations)
raw=pd.read_excel('/tmp/ac2025.xlsx',sheet_name=0,header=None,skiprows=7)
raw.columns=['mode','mnlc','masc','station','coverage','source','mon_e','mid_e','fri_e','sat_e','sun_e','mon_x','mid_x','fri_x','sat_x','sun_x','weekly','w12','annual']
def num(v):
    try: return float(str(v).replace(',',''))
    except: return None
prof=[]
for _,r in raw[raw['mode']=='LO'].iterrows():
    days={}
    ok=True
    for k,ce,cx in [('mon','mon_e','mid_e' if False else 'mon_x'),('mid','mid_e','mid_x'),('fri','fri_e','fri_x'),('sat','sat_e','sat_x'),('sun','sun_e','sun_x')]:
        ev,nx=num(r[ce]),num(r[cx])
        if ev is None or nx is None: ok=False; break
        days[k]=ev+nx
    if not ok: continue
    wk=days['mon']+3*days['mid']+days['fri']+days['sat']+days['sun']
    if wk<=0: continue
    prof.append({k:days[k]/wk for k in days})
import statistics
PROFILE={k:statistics.median(p[k] for p in prof) for k in ('mon','mid','fri','sat','sun')}
tot=PROFILE['mon']+3*PROFILE['mid']+PROFILE['fri']+PROFILE['sat']+PROFILE['sun']
PROFILE={k:v/tot for k,v in PROFILE.items()}
print('LO typical weekly day profile:',{k:round(v,4) for k,v in PROFILE.items()})
json.dump(PROFILE,open(f'{E}/nr_day_profile.json','w'))

# ---- NR anchors with modelled days
NR={}
for c in final:
    if c['src']!='AC2025':
        weekly=c['annual']/52.14
        NR[c['station']]={'annual':c['annual'],'days':{k:weekly*PROFILE[k] for k in PROFILE},'mode':'NR'}
json.dump(NR,open(f'{E}/nr_anchors.json','w'),indent=1)

# ---- NEW_SEGMENTS
defs=[]; allseg=json.load(open(f'{P}/all_segments.json'))
allids=existing_ids|{s['id'] for s in allseg}
used=set(allids)
for c in final:
    base=slug(re.sub(r'\s+(LU|LO)$','',c['station']))
    sid=base; i=2
    while sid in used: sid=f'{base}-{i}'; i+=1
    used.add(sid)
    z=(c.get('tfl') or {}).get('zone')
    zone=('Zones '+z.replace('+','/')) if z and ('/' in z or '+' in z) else (f'Zone {z}' if z else 'Outside zones 1-9')
    name=disp(c['station'])+' station area'
    mode='AC' if c['src']=='AC2025' else 'ORR'
    defs.append(dict(id=sid,name=name,borough=c['borough'],zone=zone,lat=round(c['lat'],5),lng=round(c['lng'],5),
                     stype='transport_hub',anchors=[(c['station'],mode)]))
    allseg.append({'id':sid,'name':name,'borough':c['borough'],'zone':zone,'lat':round(c['lat'],5),'lng':round(c['lng'],5),'stype':'transport_hub'})
json.dump(allseg,open(f'{P}/all_segments.json','w'),indent=1)
with open(f'{P}/segments_def.py','w') as f:
    f.write('# Station catchment segments added in the all-of-London expansion (TfL AC2025 + ORR NR).\n')
    f.write('# anchors mode tag: AC = TfL Annual Station Counts 2025, ORR = ORR Estimates of Station Usage 2024-25.\n')
    f.write('NEW_SEGMENTS = [\n')
    for d in defs:
        f.write(' dict(id=%r, name=%r, borough=%r, zone=%r, lat=%r, lng=%r, stype=%r, anchors=%r),\n'%(
            d['id'],d['name'],d['borough'],d['zone'],d['lat'],d['lng'],d['stype'],d['anchors']))
    f.write(']\n')
print('NEW_SEGMENTS:',len(defs),'| all_segments now:',len(allseg))
