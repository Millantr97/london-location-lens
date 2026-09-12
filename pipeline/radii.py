"""Per-concept competition radii: recompute competition counts + named-competitor lists
per segment at each category's radius, from local POI pools (no network).
Adds osm['comp_<cat>'] and osm['comp_<cat>_chain'] alongside the existing 250 m
street-offer counts, and rewrites competitors.js at the new radii (nearest 12 named).
Usage: python3 radii.py            (all 9 cities)
       python3 radii.py london|manchester|... """
import json, math, re, sys, os, collections

ROOT='/home/sandbox/london-location-lens'
RADIUS={'cafe':400,'fast_food':400,'services':500,'grocery':600,'pharmacy':600,
        'pub_bar':600,'restaurant':800,'shops':800,'vets':800,
        'fitness':1000,'cowork':1000,'agents':1000}
COMP_CAP=12
CHAINS=['costa','starbucks','pret a manger','pret','caffe nero','nero','greggs','mcdonald','kfc','subway','wagamama','pizza express','itsu','leon','tortilla','five guys','nando','franco manca','honest burger','cote','zizzi','ask italian','pizza hut','domino','popeyes','wingstop','taco bell','burger king','tim hortons','black sheep',"gail's",'blank street','joe & the juice','dishoom','wasabi','coco di mama','patisserie valerie','gong cha','m&s','tesco','sainsbury','waitrose','co-op','lidl','aldi','iceland','morrisons','asda','puregym','the gym','anytime fitness','david lloyd','virgin active','third space','wework','regus','wetherspoon','greene king',"fuller's","young's",'stonegate','simmons','be at one','slug and lettuce','all bar one','grind','watchhouse','amorino','creams',"wendy's",'chipotle','german doner kebab','gdk','yo! sushi','busaba','banana tree','pho','comptoir libanais','giggling squid',"rosa's thai",'marugame','krispy kreme','shake shack','gbk','byron','jollibee',"morley's",'chicken cottage','dixy chicken','perfect fried chicken','timpson','specsavers','vision express','boots','superdrug','toni&guy','rush hair','supercuts','snappy snaps','foxtons','knight frank','savills','jll','haart','connells','purplebricks','hunters','martin & co','pets at home']
CHAIN_RE=re.compile('|'.join(re.escape(c) for c in sorted(set(CHAINS),key=len,reverse=True)))
SERVICES_SHOPS={'hairdresser','barber','beauty','nail_salon','tanning','massage','tattoo','piercing','laundry','dry_cleaning','florist','optician','hearing_aids','mobile_phone','phone_repair','computer','electronics_repair','pet_grooming','pet','travel_agent','funeral_directors','shoe_repair','tailor','key_cutting','locksmith','photo','print_shop','copyshop','books','charity','second_hand'}
GROCERY_SHOPS={'convenience','supermarket','greengrocer','bakery','butcher','deli','alcohol','newsagent','confectionery','health_food','seafood','cheese','coffee','pastry','wine','frozen_food'}
def classify(el):
    t=el.get('tags',{})
    am=t.get('amenity',''); sh=t.get('shop',''); le=t.get('leisure',''); to=t.get('tourism',''); of=t.get('office','')
    if am in ('cafe','restaurant','fast_food'): return am
    if am in ('pub','bar','nightclub'): return 'pub_bar'
    if am=='pharmacy': return 'pharmacy'
    if am=='veterinary': return 'vets'
    if of in ('estate_agent','letting_agent'): return 'agents'
    if of=='coworking': return 'cowork'
    if sh: return 'grocery' if sh in GROCERY_SHOPS else ('services' if sh in SERVICES_SHOPS else ('shops' if sh!='vacant' else None))
    if le=='fitness_centre': return 'fitness'
    return None
def is_chain(t):
    s=((t.get('name') or '')+' '+(t.get('brand') or '')+' '+(t.get('operator') or '')).lower()
    return bool(CHAIN_RE.search(s))
def coord(el):
    if el['type']=='node': return el.get('lat'),el.get('lon')
    c=el.get('center',{}); return c.get('lat'),c.get('lon')
def hav(a,b,c,d):
    R=6371000; p1,p2=math.radians(a),math.radians(c)
    dp=math.radians(c-a); dl=math.radians(d-b)
    x=math.sin(dp/2)**2+math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2*R*math.asin(math.sqrt(x))

def load_segments(path):
    s=open(path,encoding='utf-8').read()
    i=s.index('const SEGMENTS=')+len('const SEGMENTS=')
    j=s.index('];',i)+1
    return s, i, j, json.loads(s[i:j])

def build_points(pool):
    pts=collections.defaultdict(list)
    seen=set()
    for e in pool:
        k=(e['type'],e['id'])
        if k in seen: continue
        seen.add(k)
        cat=classify(e)
        if not cat: continue
        la,lo=coord(e)
        if la is None or lo is None: continue
        t=e.get('tags',{})
        pts[cat].append((la,lo,t.get('name',''),
                         (t.get('cuisine','') or t.get('shop','')).split(';')[0],
                         1 if is_chain(t) else 0))
    return pts

def run_city(cid):
    import numpy as np
    if cid=='london':
        seg_path=f'{ROOT}/segments.js'; comp_path=f'{ROOT}/competitors.js'
        pool=json.load(open(f'{ROOT}/pipeline/cache/pool.json'))+json.load(open(f'{ROOT}/pipeline/cache/pool_services_extra.json'))
    else:
        seg_path=f'{ROOT}/{cid}/data/segments.js'; comp_path=f'{ROOT}/{cid}/data/competitors.js'
        pool=json.load(open(f'{ROOT}/pipeline/city/{cid}/pool.json'))
    s,i,j,segs=load_segments(seg_path)
    pts=build_points(pool)
    ARRS={}
    for cat in RADIUS:
        rows=pts.get(cat,[])
        ARRS[cat]=(np.array([(la,lo) for la,lo,nm,cui,ch in rows]) if rows else None,
                   [nm for la,lo,nm,cui,ch in rows],
                   np.array([ch for la,lo,nm,cui,ch in rows],dtype=bool))
    R_E=6371000.0
    comp_out={}
    for sg in segs:
        a,b=sg['lat'],sg['lng']
        ca,cb=math.radians(a),math.radians(b)
        co={}
        for cat,Rm in RADIUS.items():
            A,names,chains=ARRS[cat]
            if A is None or not len(A):
                sg['osm']['comp_'+cat]=0; sg['osm']['comp_'+cat+'_chain']=0; continue
            dlat=np.radians(A[:,0])-ca; dlon=np.radians(A[:,1])-cb
            x=np.sin(dlat/2)**2+math.cos(ca)*np.cos(np.radians(A[:,0]))*np.sin(dlon/2)**2
            d=2*R_E*np.arcsin(np.sqrt(np.minimum(x,1.0)))
            mask=d<=Rm
            sg['osm']['comp_'+cat]=int(mask.sum())
            sg['osm']['comp_'+cat+'_chain']=int((mask & chains).sum())
            idx=np.where(mask)[0]
            named=[(float(d[k]),k) for k in idx if names[k]]
            named.sort()
            lst=[[names[k], (pts[cat][k][3] if False else ''), 0, 0] for d,k in named[:0]]  # placeholder
            out=[]
            for dd,k in named[:COMP_CAP]:
                nm=names[k]
                cui=pts[cat][k][3]
                ch=1 if chains[k] else 0
                out.append([nm,cui,ch,int(round(dd))])
            if out: co[cat]=out
        comp_out[sg['id']]=co
    news=s[:i]+json.dumps(segs,separators=(',',':'),ensure_ascii=False)+s[j:]
    open(seg_path,'w',encoding='utf-8').write(news)
    open(comp_path,'w',encoding='utf-8').write('const COMPETITORS='+json.dumps(comp_out,separators=(',',':'),ensure_ascii=False)+';\n')
    print(cid, len(segs),'segments; competitors bytes:',os.path.getsize(comp_path),flush=True)

if __name__=='__main__':
    cities=sys.argv[1:] or ['london','manchester','birmingham','leeds','bristol','liverpool','sheffield','glasgow','edinburgh']
    for c in cities: run_city(c)
