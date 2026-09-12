"""Extract per-city street-level crime from the police.uk rolling monthly archive zips
via HTTP range requests (only the needed per-force CSV entries, ~1.5MB each, from 1.7GB zips).
Writes pipeline/city/<city>/crime_bulk.csv (lat,lng,cat) filtered to the city bbox + pad,
categories mapped to KEEP keys. Usage: python3 crime_bulk.py <city> <force-slug>"""
import urllib.request, struct, zlib, csv, io, sys, os
sys.path.insert(0,'/home/sandbox/london-location-lens/pipeline/city')
from cities import CITIES
KEEP={"Shoplifting":"shoplifting","Theft from the person":"theft_person","Robbery":"robbery_biz","Burglary":"burglary_biz"}
MONTHS=["2025-08","2025-09","2025-10","2025-11","2025-12","2026-01","2026-02","2026-03","2026-04","2026-05","2026-06","2026-07"]
cid=sys.argv[1]; force=sys.argv[2]
b=CITIES[cid]['bbox']; PAD=0.02
lo_la,lo_ln,hi_la,hi_ln=b[0]-PAD,b[1]-PAD,b[2]+PAD,b[3]+PAD
def fetch(url,a,z):
    req=urllib.request.Request(url,headers={'Range':f'bytes={a}-{z}'})
    for t in range(4):
        try: return urllib.request.urlopen(req,timeout=180).read()
        except Exception as e: print('  retry',t,e); 
    raise SystemExit('range fetch failed')
def entries(url):
    import re
    head=urllib.request.urlopen(urllib.request.Request(url,method='HEAD'),timeout=60)
    size=int(head.headers['Content-Length'])
    tail=fetch(url,size-70000,size-1)
    i=tail.rfind(b'PK\x05\x06'); e=tail[i:i+22]
    cds=struct.unpack('<I',e[12:16])[0]; cdo=struct.unpack('<I',e[16:20])[0]
    cd=fetch(url,cdo,cdo+cds-1)
    out={}; pos=0
    while pos<len(cd)-4:
        if cd[pos:pos+4]!=b'PK\x01\x02': break
        nl,xl,cl=struct.unpack('<H',cd[pos+28:pos+30])[0],struct.unpack('<H',cd[pos+30:pos+32])[0],struct.unpack('<H',cd[pos+32:pos+34])[0]
        cs=struct.unpack('<I',cd[pos+20:pos+24])[0]; lh=struct.unpack('<I',cd[pos+42:pos+46])[0]
        nm=cd[pos+46:pos+46+nl].decode()
        if nm.endswith(f'{force}-street.csv'): out[nm.split('/')[0]]=(lh,cs,nl)
        pos+=46+nl+xl+cl
    return out
def get_csv(url,lh,cs,nl):
    hdr=fetch(url,lh,lh+30+nl+256)
    xl=struct.unpack('<H',hdr[28:30])[0]
    start=lh+30+nl+xl
    raw=fetch(url,start,start+cs-1) if start+cs-1>lh+30+nl+xl else hdr[30+nl+xl:30+nl+xl+cs]
    return zlib.decompress(raw,-15).decode('utf-8',errors='replace')
ARCH={m:("https://policeuk-data.s3.amazonaws.com/archive/2026-06.zip" if m<="2026-06" else "https://policeuk-data.s3.amazonaws.com/archive/2026-07.zip") for m in MONTHS}
rows=0; kept=0
out=open(f'/home/sandbox/london-location-lens/pipeline/city/{cid}/crime_bulk.csv','w')
out.write('lat,lng,cat\n')
for arc in dict.fromkeys(ARCH.values()):
    ent=entries(arc); print('archive',arc.split('/')[-1],'has',len(ent),f'{force} months',flush=True)
    for m in MONTHS:
        if ARCH[m]!=arc: continue
        if m not in ent: print('  MISSING',m); continue
        lh,cs,nl=ent[m]
        txt=get_csv(arc,lh,cs,nl)
        r=csv.DictReader(io.StringIO(txt))
        n0=0
        for row in r:
            rows+=1
            cat=KEEP.get(row.get('Crime type',''))
            if not cat: continue
            try: la=float(row['Latitude']); ln=float(row['Longitude'])
            except Exception: continue
            if lo_la<=la<=hi_la and lo_ln<=ln<=hi_ln:
                out.write(f'{la},{ln},{cat}\n'); kept+=1; n0+=1
        print(' ',m,'kept',n0,flush=True)
out.close()
print('TOTAL rows scanned',rows,'kept',kept)
