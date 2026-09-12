"""Generate <city>/index.html + <city>/city.js from the London template. Run after emit_city.py.
Also refreshes cities.js from --live list. Usage: python3 make_page.py <city>"""
import json, re, sys, os
sys.path.insert(0,'/home/sandbox/london-location-lens/pipeline/city')
from cities import CITIES
cid=sys.argv[1]; C=CITIES[cid]
ROOT='/home/sandbox/london-location-lens'
segs=json.load(open(f'{ROOT}/pipeline/city/{cid}/segments_full2.json'))
SCOT=C.get('country')=='S'
saa_method=("<p>Scottish Assessors do not publish rateable value per m². For "+C['name']+" the retail and office £/m² figures are MODELLED: the average rateable value per shop and per office in the assessor area (SAA valuation roll, 2026 revaluation, observed) is scaled to a £/m² estimate using the relationship between average RV per property and £/m² in the Valuation Office Agency 2025 stock-of-properties and floorspace statistics for comparable English cities. The observed SAA averages are shown on each segment's Occupancy cost card.</p>" if SCOT else "<p>Rateable value per m² for retail and office stock by billing authority, Valuation Office Agency business floorspace statistics, 31 March 2025.</p>")
scot_texts='''resNote:"Data Zone ≈ 800 residents (Scottish census geography). It describes residents, not the people walking this street.",
 resMethod:`<p>Census 2022 (Scotland) statistics for the segment anchor: age by single year (UV103), ethnic group (UV201), economic activity and students (UV601) and occupation (UV606) at Data Zone level; country of birth (MV204) at the finer Output Area level. National Records of Scotland bulk tables.</p>`,
 resResolution:"Resolution: Data Zone (~800 residents); born-outside-UK at Output Area level.",
''' if SCOT else ''
nseg=len(segs); narea=len([s for s in segs if s.get('lvl')!='street']); nstreet=nseg-narea
nunits=len(json.load(open(f'{ROOT}/{cid}/data/units.js'.replace('units.js','segments.js')))) if False else None
# unit count from units.js content length is awkward; count from segments _units pre-pop not available here -> read emitted units.js
import re as _re
utxt=open(f'{ROOT}/{cid}/data/units.js').read()
nunits=utxt.count('],[')+1 if '],[' in utxt else 0
tpl=open(f'{ROOT}/index.html').read()
city_js=f"""window.CITY={{id:"{cid}",name:"{C['name']}",region:"{C['region']}",mapCenter:[{C['center'][0]},{C['center'][1]}],mapZoom:12,texts:{{
 flowCredit:"ORR Estimates of Station Usage 2024-25 (National Rail); day-of-week split modelled",
 police:"{C['police']}",
 voaYear:"Mar 2025",
 voaMethod:`{saa_method}`,
 crimeNote:"Source: {C['police']} recorded offences around the anchor, via data.police.uk. A relative signal between areas, not an absolute risk figure.",
 movement:`<p>Typical-day station entries and exits by day type (Mon / Tue-Thu / Fri / Sat / Sun) and annual totals from ORR Estimates of Station Usage 2024-25 for every National Rail station in {C['region']}, summed over the stations named for each segment. ORR publishes annual totals only, so the day-of-week split is MODELLED on a standard GB rail week profile (median London Overground profile) and labelled as such; the annual total stays OBSERVED. Stations within 900 m from OpenStreetMap. Street-level pitches inherit their parent catchment's counts scaled to the street's share of recorded commercial units (marked MODELLED); streets beyond 900 m of any station show no flow at all. Tram/metro stops carry no open stop-level counts, so tram flow is not an anchor in this city.</p>`,
 crimeMethod:`<p>{C['police']} recorded street-level offences within ~450 m of each segment anchor, 12 months to July 2026: shoplifting, theft from the person, robbery and burglary, via data.police.uk. Rates are normalised per 1,000 residents.</p>`,
 crimeDropped:"{C.get('crime_dropped','')}",
 {scot_texts}
 coverage:(SEGS,UNITS)=>`<p>${{SEGS.length.toLocaleString("en-GB")}} segments covering {C['region']} at street level: ${{SEGS.filter(s=>s.lvl!=="street").length}} area pitches (every National Rail station catchment in {C['region']} plus curated commercial areas - ORR Estimates of Station Usage 2024-25, no minimum flow) and ${{SEGS.filter(s=>s.lvl==="street").length.toLocaleString("en-GB")}} street pitches - every named retail street and parade with 8 or more recorded commercial units, long streets split into roughly 400 m stretches. ${{UNITS.length.toLocaleString("en-GB")}} individual commercial units recorded across them. A street pitch inside a station catchment carries that catchment's flow MODELLED down to the street's share of recorded units; a street more than 900 m from any station has no flow anchor and says so on its panel.</p>`,
}}}};"""
open(f'{ROOT}/{cid}/city.js','w').write(city_js)
s=tpl
s=s.replace('<title>London Location Potential - Street-level revenue and site selection for London</title>',
            f'<title>{C["name"]} Location Potential - Street-level revenue and site selection for {C["name"]}</title>')
s=s.replace('<meta name="description" content="Compare London street segments and individual commercial units for your exact business concept: real station flows, competition, residents, crime, rents and estimated monthly revenue.">',
            f'<meta name="description" content="Compare {C["name"]} street segments and individual commercial units for your exact business concept: real station flows, competition, residents, crime, rents and estimated monthly revenue.">')
s=s.replace('London <span>Location Potential</span>',f'{C["name"]} <span>Location Potential</span>')
s=s.replace('Street-level site selection · all of London',f'Street-level site selection · all of {C["region"]}')
s=s.replace('<span id="seg-count">2,480</span> London street segments',f'<span id="seg-count">{nseg:,}</span> {C["name"]} street segments')
s=s.replace('<h2>London, ranked by the model</h2>',f'<h2>{C["name"]}, ranked by the model</h2>')
s=re.sub(r'<div class="article-grid" id="article-grid">.*?</div>\s*<div class="trend-note">',
         f'<div class="article-grid" id="article-grid"></div>\n  <p style="color:var(--muted);font-size:13px;margin:4px 0 14px">City-specific rankings for {C["name"]} are being prepared - <a href="../#rankings">London&apos;s rankings</a> show the format.</p>\n  <div class="trend-note">',s,flags=re.S)
if C.get('no_crime'):
    s=s.replace('residents, rents and crime are AREA CONTEXT','residents and rents are AREA CONTEXT')
s=s.replace('Each ranking is one fixed concept run through the published model over 2,480 London street segments.',
            f'Each ranking is one fixed concept run through the published model over {nseg:,} {C["name"]} street segments.')
s=s.replace('<div>London Location Potential ·',f'<div>{C["name"]} Location Potential ·')
s=s.replace('href="privacy.html"','href="../privacy.html"')
s=s.replace('value="London Location Potential expert brief"',f'value="{C["name"]} Location Potential expert brief"')
s=re.sub(r'<script src="cities\.js\?v=\d+"></script>\s*<script src="segments\.js\?v=\d+"></script>\s*<script src="units\.js\?v=\d+"></script>\s*<script src="competitors\.js\?v=\d+"></script>\s*<script src="app\.js\?v=\d+"></script>\s*<script src="report\.js\?v=\d+"></script>\s*<script src="trends\.js\?v=\d+"></script>',
 '<script src="../cities.js?v=2"></script>\n<script src="city.js?v=1"></script>\n<script src="data/segments.js?v=1"></script>\n<script src="data/units.js?v=1"></script>\n<script src="data/competitors.js?v=1"></script>\n<script src="../app.js?v=24"></script>\n<script src="../report.js?v=20"></script>\n<script src="data/trends.js?v=1"></script>',s)
s=s.replace('<script src="extras.js?v=20"></script>','<script src="../extras.js?v=20"></script>')
s=s.replace('<script src="tabs.js?v=22"></script>','<script src="../tabs.js?v=22"></script>')
s=s.replace('<script src="leads.js?v=20"></script>','<script src="../leads.js?v=20"></script>')
s=s.replace('href="styles.css?v=23"','href="../styles.css?v=23"')
open(f'{ROOT}/{cid}/index.html','w').write(s)
print(cid,'page written:',nseg,'segments (',narea,'areas +',nstreet,'streets )')
