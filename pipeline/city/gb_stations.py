"""Parse ORR table 1410 (Estimates of Station Usage 2024-25) -> gb_stations.json {name: {annual, interchanges}}."""
import csv, json, sys
src=sys.argv[1] if len(sys.argv)>1 else '/tmp/table1410.csv'
out=sys.argv[2] if len(sys.argv)>2 else '/home/sandbox/london-location-lens/pipeline/city/gb_stations.json'
rows=list(csv.reader(open(src)))
hi=next(i for i,r in enumerate(rows) if r and r[0]=='Station name')
S={}
def num(x):
    x=(x or '').replace(',','').strip()
    try: return int(float(x))
    except ValueError: return 0
for r in rows[hi+1:]:
    if not r or not r[0].strip() or r[0].startswith('Table'): continue
    nm=r[0].strip()
    S[nm]={'annual':num(r[4] if len(r)>4 else ''),'interchanges':num(r[6] if len(r)>6 else '')}
json.dump(S,open(out,'w'))
print('stations:',len(S),'| total annual:',sum(v['annual'] for v in S.values()))
