"""Emit final segments.js + units.js for the site."""
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
for si,s in enumerate(segs):
    for u in s.pop('_units'):
        key=(u['lat'],u['lng'],u['cat'])
        if key in seen: continue
        seen.add(key)
        dist=round(hav(s['lat'],s['lng'],u['lat'],u['lng']))
        UNITS.append([u['lat'],u['lng'],UNITCATS.index(u['cat']),u['chain'],si,dist,(u['name'] or '')[:60]])
today=datetime.date.today().strftime('%-d %b %Y')
META={"built":today,"osm_date":today,"crime_window":"Aug 2025 - Jul 2026","census":"Census 2021","numbat":"TfL NUMBAT 2024","sources":{}}
with open('/tmp/lens/segments.js','w') as f:
    f.write("const SEGMENTS="+json.dumps(segs,separators=(',',':'))+";\nconst META="+json.dumps(META,separators=(',',':'))+";\n")
with open('/tmp/lens/units.js','w') as f:
    f.write("const UNITCATS="+json.dumps(UNITCATS)+";\nconst UNITS="+json.dumps(UNITS,separators=(',',':'))+";\n")
print('units:',len(UNITS))
import os
print('segments.js KB',os.path.getsize('/tmp/lens/segments.js')//1024,'units.js KB',os.path.getsize('/tmp/lens/units.js')//1024)
