"""Build Scottish census lookups from NRS Census 2022 bulk CSVs (UKDS CKAN mirrors).
DZ-2011 level: age (UV103), economic activity (UV601), occupation (UV606), ethnic group (UV201).
OA level: country of birth via MV204 (CoB x religion, aggregated over religion).
Output: pipeline/city/census_scot_dz.json (DZ code -> segment-shape dict, no pct_nonuk)
        pipeline/city/census_scot_oa.json (OA code -> pct_nonuk)
Usage: python3 census_scot.py"""
import csv, json, os
D='/home/sandbox/london-location-lens/pipeline/census-scot'
def long_rows(fname):
    """SuperWEB2 long format: [Individuals, DZ, category, count] (UV606 has extra col 1)."""
    with open(f'{D}/{fname}',encoding='utf-8-sig',errors='replace') as f:
        for row in csv.reader(f):
            if len(row)>=4 and row[0]=='Individuals':
                yield row
def num(s):
    s=(s or '').strip()
    return 0.0 if s in ('','-') else float(s.replace(',',''))
out={}
def dz(code):
    return out.setdefault(code,{})
# UV103 age
for r in long_rows('uv103.csv'):
    code,cat,val=r[1],r[2],num(r[3])
    d=dz(code)
    if cat=='All people': d['residents']=val
    else:
        age=0 if cat=='Under 1' else (100 if cat.startswith('100') else int(cat)) if cat[0].isdigit() else None
        if age is None: continue
        if age<20: d['u20']=d.get('u20',0)+val
        if 20<=age<40: d['a2039']=d.get('a2039',0)+val
# UV601 economic activity
for r in long_rows('uv601.csv'):
    code,cat,val=r[1],r[2],num(r[3])
    d=dz(code)
    if cat=='All people aged 16 and over': d['pop16']=val
    elif cat=='Economically inactive - Student' or cat=='Economically Active full-time students - Total':
        d['stu']=d.get('stu',0)+val
# UV606 occupation (extra dim col at idx1)
for r in long_rows('uv606.csv'):
    code,cat,val=r[2],r[3],num(r[4])
    d=dz(code)
    if cat.startswith('All people aged 16 and over in employment'): d['emp']=val
    elif cat in ('Managers, Directors and Senior Officials - Total','Professional Occupations - Total','Associate Professional and Technical Occupations - Total'):
        d['prof']=d.get('prof',0)+val
# UV201 ethnic group (wide). Broad groups: White/Asian/African/Caribbean or Black/Mixed/Other totals.
with open(f'{D}/uv201.csv',encoding='utf-8-sig',errors='replace') as f:
    rows=list(csv.reader(f))
hdr=next(r for r in rows if r and r[0]=='Ethnic Group')
BROAD={'White':'White: Total','Asian':'Asian, Asian Scottish or Asian British: Total',
       'African':'African: Total','Caribbean or Black':'Caribbean or Black: Total',
       'Mixed or multiple':'Mixed or multiple ethnic group','Other ethnic group':'Other ethnic group'}
idx={}
for i,c in enumerate(hdr):
    cs=c.strip()
    for n,h in BROAD.items():
        if n not in idx and (cs==h or (h.endswith(': Total') and cs==h) or cs.startswith('Mixed or multiple ethnic group') and n=='Mixed or multiple' or cs.startswith('Other ethnic groups') and n=='Other ethnic group'):
            idx[n]=i
i_tot=hdr.index('All People')
missing=[n for n in BROAD if n not in idx]
if missing: raise SystemExit(f'UV201 header missing {missing}: {hdr}')
for r in rows:
    if r and r[0].startswith('S01'):
        tot=num(r[i_tot])
        if tot<=0: continue
        shares=[(n,num(r[i])/tot) for n,i in idx.items()]
        div=1-sum(p*p for _,p in shares)
        top=sorted(shares,key=lambda x:-x[1])[:3]
        d=dz(r[0]); d['diversity']=div; d['top_eth']=[[n,round(100*p,1)] for n,p in top]
# assemble DZ json
final={}
for code,d in out.items():
    tot=d.get('residents') or 0
    if not tot: continue
    final[code]={'code':code,'residents':tot,
        'pct20_39':round(100*d.get('a2039',0)/tot,1),'pct_under20':round(100*d.get('u20',0)/tot,1),
        'pct_students':round(100*d.get('stu',0)/max(1,d.get('pop16',1)),1),
        'pct_prof':round(100*d.get('prof',0)/max(1,d.get('emp',1)),1),
        'diversity':round(d.get('diversity',0),3),'top_eth':d.get('top_eth',[])}
json.dump(final,open('/home/sandbox/london-location-lens/pipeline/city/census_scot_dz.json','w'))
print('DZ records:',len(final))
# MV204 OA: pct born outside UK = 1 - UK_total/total
with open(f'{D}/mv204_oa.csv',encoding='utf-8-sig',errors='replace') as f:
    rows=list(csv.reader(f))
h3=next(i for i,r in enumerate(rows) if len(r)>20 and r[1]=='All people' and 'Europe: Total' in r)
g3=rows[h3]
uk_col=next(i for i,c in enumerate(g3) if c.strip()=='Europe: United Kingdom: Total')
oa={}
for r in rows[h3+2:]:
    if r and r[0].startswith('S00'):
        tot=num(r[1]); uk=num(r[uk_col])
        if tot>0: oa[r[0]]=round(100*(1-uk/tot),1)
json.dump(oa,open('/home/sandbox/london-location-lens/pipeline/city/census_scot_oa.json','w'))
print('OA records:',len(oa),'uk_col',uk_col)
