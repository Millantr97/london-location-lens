"""Emit final segments.js + units.js + competitors.js for the site."""
import json, math, datetime
P='/tmp/lens/pipeline'
segs=json.load(open(f'{P}/segments_full.json'))
UNITCATS=["cafe","restaurant","fast_food","pub_bar","grocery","shops","fitness","cowork"]
def hav(a,b,c,d):
    R=6371000; p1,p2=math.radians(a),math.radians(c)
    dp=math.radians(c-a); dl=math.radians(d-b)
    x=math.sin(dp/2)**2+math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2*R*math.asin(math.sqrt(x))
UNITS=[]; seen=set()
COMPS={}
for si,s in enumerate(segs):
    per={}
    for u in s.get('_units',[]):
        key=(u['lat'],u['lng'],u['cat'])
        if key in seen: continue
        seen.add(key)
        dist=round(hav(s['lat'],s['lng'],u['lat'],u['lng']))
        UNITS.append([u['lat'],u['lng'],UNITCATS.index(u['cat']),u['chain'],si,dist,
                      (u['name'] or '')[:60],(u.get('street') or '')[:48],(u.get('cuisine') or '')[:30]])
        if u['name']: per.setdefault(u['cat'],[]).append((dist,u))
    cc={}
    for cat,us in per.items():
        us.sort(key=lambda x:x[0])
        cc[cat]=[[u['name'][:44],(u.get('cuisine') or '')[:26],u['chain'],d] for d,u in us[:12]]
    if cc: COMPS[s['id']]=cc
today=datetime.date.today().strftime('%-d %b %Y')
META={"built":today,"osm_date":today,"crime_window":"Aug 2025 - Jul 2026","census":"Census 2021","numbat":"TfL Annual Station Counts 2025; National Rail: ORR Estimates of Station Usage 2024-25","sources":{}}
for s in segs: s.pop('_units',None)
with open('/tmp/lens/segments.js','w') as f:
    f.write("const SEGMENTS="+json.dumps(segs,separators=(',',':'))+";\nconst META="+json.dumps(META,separators=(',',':'))+";\n")
with open('/tmp/lens/units.js','w') as f:
    f.write("const UNITCATS="+json.dumps(UNITCATS)+";\nconst UNITS="+json.dumps(UNITS,separators=(',',':'))+";\n")
with open('/tmp/lens/competitors.js','w') as f:
    f.write("const COMPETITORS="+json.dumps(COMPS,separators=(',',':'))+";\n")
import os
print('units:',len(UNITS),'| segments with competitors:',len(COMPS))
for f in ('segments.js','units.js','competitors.js'):
    print(f,os.path.getsize('/tmp/lens/'+f)//1024,'KB')
