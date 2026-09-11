"""Street-level expansion: cluster every OSM commercial unit in Greater London by named street."""
import json, math, re, collections
P='/tmp/lens/pipeline'
UNITCATS={"cafe","restaurant","fast_food","pub_bar","grocery","shops","fitness","cowork"}
GROCERY_SHOPS={'convenience','supermarket','greengrocer','bakery','butcher','deli','alcohol','newsagent','confectionery','health_food','seafood','cheese','coffee','pastry','wine','frozen_food'}
CHAINS=json.load(open(f'{P}/../pipeline/chains.json')) if False else None
CHAIN_RE=re.compile('|'.join(re.escape(c) for c in sorted(set(['costa','starbucks','pret a manger','pret','caffe nero','nero','greggs','mcdonald','kfc','subway','wagamama','pizza express','itsu','leon','tortilla','five guys','nando','franco manca','honest burger','cote','zizzi','ask italian','pizza hut','domino','popeyes','wingstop','taco bell','burger king','tim hortons','black sheep',"gail's",'blank street','joe & the juice','dishoom','wasabi','coco di mama','patisserie valerie','gong cha','m&s','tesco','sainsbury','waitrose','co-op','lidl','aldi','iceland','morrisons','asda','puregym','the gym','anytime fitness','david lloyd','virgin active','third space','wework','regus','wetherspoon','greene king',"fuller's","young's",'stonegate','simmons','be at one','slug and lettuce','all bar one','grind','watchhouse','amorino','creams',"wendy's",'chipotle','german doner kebab','gdk','yo! sushi','busaba','banana tree','pho','comptoir libanais','giggling squid',"rosa's thai",'marugame','krispy kreme','shake shack','gbk','byron','jollibee',"morley's",'chicken cottage','dixy chicken','perfect fried chicken']),key=len,reverse=True)))
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
def hav(a,b,c,d):
    R=6371000; p1,p2=math.radians(a),math.radians(c)
    dp=math.radians(c-a); dl=math.radians(d-b)
    x=math.sin(dp/2)**2+math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2*R*math.asin(math.sqrt(x))

pool=json.load(open(f'{P}/cache/pool.json'))
segs=json.load(open(f'{P}/segments_full.json'))
anchors=[(s['id'],s['name'],s['lat'],s['lng'],s['borough'],s['zone']) for s in segs]

# anchor grid for fast nearest lookup (cells ~1.1km)
AG={}
for i,(aid,nm,la,lo,b,z) in enumerate(anchors):
    AG.setdefault((round(la,2),round(lo,2)),[]).append(i)
def nearest_anchor(la,lo,maxd=1e9):
    best=None; bd=maxd
    for dlat in (-0.02,-0.01,0,0.01,0.02):
        for dlng in (-0.03,-0.015,0,0.015,0.03):
            for i in AG.get((round(la+dlat,2),round(lo+dlng,2)),[]):
                d=hav(la,lo,anchors[i][2],anchors[i][3])
                if d<bd: bd=d; best=i
    return best,bd

units=[]; seen=set()
for e in pool:
    k=(e['type'],e['id'])
    if k in seen: continue
    seen.add(k)
    cat=classify(e)
    if cat not in UNITCATS: continue
    la,lo=coord(e)
    if not la: continue
    t=e.get('tags',{})
    st=(t.get('addr:street') or '').strip()
    st=re.sub(r'\s+',' ',st)
    units.append({'lat':round(la,5),'lng':round(lo,5),'cat':cat,'chain':1 if is_chain(t) else 0,
                  'name':t.get('name',''),'street':st,
                  'cuisine':(t.get('cuisine','') or t.get('shop','')).split(';')[0],
                  'terrace':1 if (t.get('outdoor_seating','')+t.get('seat:outside','')).lower()=='yes' else 0})
print('universe units:',len(units))

# culture + parks + stations pools for standalone context counts
culture=[]; parks=[]; stations=[]
seen2=set()
for e in pool:
    k=(e['type'],e['id'])
    if k in seen2: continue
    seen2.add(k)
    cat=classify(e)
    la,lo=coord(e)
    if not la: continue
    if cat=='culture': culture.append((la,lo))
    elif cat=='park': parks.append((la,lo))
    t=e.get('tags',{})
    if e['type']=='node' and (t.get('railway') in ('station','halt') or t.get('station')=='subway') and t.get('name'):
        stations.append((la,lo,t['name']))
print('culture:',len(culture),'parks:',len(parks),'stations:',len(stations))

# ---- cluster tagged units by street + spatial component ----
bystreet=collections.defaultdict(list)
for i,u in enumerate(units):
    if u['street']: bystreet[u['street']].append(i)
CELL=0.0032  # ~225m lat
clusters=[]
for st,idxs in bystreet.items():
    if len(idxs)<6: continue
    cells=collections.defaultdict(list)
    for i in idxs:
        u=units[i]; cells[(int(u['lat']/CELL),int(u['lng']/(CELL/math.cos(math.radians(u['lat'])))))].append(i)
    # BFS connected components over occupied cells
    occ=set(cells); comp_id={}
    comps=[]
    for c in occ:
        if c in comp_id: continue
        q=[c]; comp=[]; comp_id[c]=1
        while q:
            cur=q.pop(); comp.append(cur)
            for dx in (-1,0,1):
                for dy in (-1,0,1):
                    nb=(cur[0]+dx,cur[1]+dy)
                    if nb in occ and nb not in comp_id:
                        comp_id[nb]=1; q.append(nb)
        comps.append(comp)
    for comp in comps:
        allidx=[i for c in comp for i in cells[c]]
        if len(allidx)<8: continue
        # split long components along dominant axis into ~400m chunks
        lats=[units[i]['lat'] for i in allidx]; lngs=[units[i]['lng'] for i in allidx]
        span_lat=(max(lats)-min(lats))*111000; span_lng=(max(lngs)-min(lngs))*111000*math.cos(math.radians(sum(lats)/len(lats)))
        span=max(span_lat,span_lng)
        if span<=420:
            clusters.append((st,allidx)); continue
        nparts=max(2,round(span/380))
        horiz=span_lng>=span_lat
        key=lambda i:(units[i]['lng'] if horiz else units[i]['lat'])
        sidx=sorted(allidx,key=key)
        per=len(sidx)/nparts
        for p in range(nparts):
            part=sidx[round(p*per):round((p+1)*per)]
            if len(part)>=8: clusters.append((st,part))
            elif clusters and clusters[-1][0]==st: clusters[-1][1].extend(part)
print('raw clusters >=8:',len(clusters))

# attach untagged units to nearest cluster centroid <=80m
cent=[]
for ci,(st,idxs) in enumerate(clusters):
    la=sorted(units[i]['lat'] for i in idxs)[len(idxs)//2]
    lo=sorted(units[i]['lng'] for i in idxs)[len(idxs)//2]
    cent.append((la,lo))
CG={}
for ci,(la,lo) in enumerate(cent):
    CG.setdefault((round(la,3),round(lo,3)),[]).append(ci)
attached=0
claimed=set(i for _,idxs in clusters for i in idxs)
for i,u in enumerate(units):
    if u['street'] or i in claimed: continue
    best=None; bd=80
    for dla in (-0.002,-0.001,0,0.001,0.002):
        for dlo in (-0.002,-0.001,0,0.001,0.002):
            for ci in CG.get((round(u['lat']+dla,3),round(u['lng']+dlo,3)),[]):
                d=hav(u['lat'],u['lng'],cent[ci][0],cent[ci][1])
                if d<bd: bd=d; best=ci
    if best is not None:
        clusters[best][1].append(i); claimed.add(i); attached+=1
print('untagged attached:',attached)

# build street records
streets=[]
for st,idxs in clusters:
    us=[units[i] for i in idxs]
    la=sorted(u['lat'] for u in us)[len(us)//2]
    lo=sorted(u['lng'] for u in us)[len(us)//2]
    ai,dist=nearest_anchor(la,lo)
    streets.append({'street':st,'lat':round(la,5),'lng':round(lo,5),'units':us,
                    'parent':anchors[ai][0] if ai is not None else None,
                    'parent_dist':round(dist),
                    'parent_name':anchors[ai][1] if ai is not None else None})
sub=[s for s in streets if s['parent_dist']<=900]
print(f'streets: {len(streets)} total | <=900m of an anchor (sub-street): {len(sub)} | standalone: {len(streets)-len(sub)}')
print('units inside street clusters:',sum(len(s["units"]) for s in streets))
json.dump(streets,open(f'{P}/streets/streets.json','w'))
# top samples
for s in sorted(streets,key=lambda x:-len(x['units']))[:15]:
    print(f"  {s['street']} <- {s['parent_name']} ({s['parent_dist']}m) units={len(s['units'])}")
