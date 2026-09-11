import json, requests, time, re
c=json.load(open('candidates_final.json'))
def fetch(name):
    q=re.sub(r'\s*\([^)]*\)$','',name)
    try:
        r=requests.get(f'https://api.tfl.gov.uk/StopPoint/Search/{requests.utils.quote(q)}',
                       params={'modes':'tube,dlr,overground,elizabeth-line,national-rail'},timeout=30)
        ms=r.json().get('matches',[])
        zoned=[m for m in ms if m.get('zone')]
        if zoned: return zoned[0]
    except Exception as e: print('err',name,e)
    return None
for x in c:
    t=x.get('tfl') or {}
    if not t.get('zone'):
        m=fetch(x['station'])
        if m:
            x['tfl']={'name':m.get('name'),'lat':m.get('lat'),'lon':m.get('lon'),'zone':m.get('zone'),'id':m.get('id')}
            print('zone fixed:',x['station'],'->',m.get('zone'))
        else:
            print('still no zone:',x['station'])
        time.sleep(0.4)
json.dump(c,open('candidates_final.json','w'),indent=1)
