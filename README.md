# london-location-lens
Transparent street-level evidence and revenue estimates for commercial location decisions across London.

Live: https://millantr97.github.io/london-location-lens/

## Rebuild the data
```
cd pipeline
# 1. download TfL NUMBAT 2024 annualised entry/exit xlsx to /tmp/numbat.xlsx
# 2. download Census 2021 bulk zips (ts007a, ts004, ts021, ts063, ts066) into pipeline/census and unzip *-lsoa.csv
python3 fetch_lsoa.py new_lsoa.json        # ONS reverse geocode for new segments (cached)
python3 fetch_osm.py all_segments.json     # Overpass POI counts + unit records (cached, resumable)
python3 fetch_crime.py all_segments.json   # data.police.uk street-level crime, 12 months (cached, resumable)
python3 build.py                           # assemble + model fields -> pipeline/segments_full.json
python3 emit.py                            # write ../segments.js and ../units.js
```
Segment definitions: `pipeline/segments_def.py` (new) and `pipeline/existing_defs.json` (from previous bake).

## Sources
- Station flows: TfL NUMBAT 2024 annualised entry/exit (crowding.data.tfl.gov.uk)
- Street offer / units: OpenStreetMap via Overpass (ODbL)
- Residents: Census 2021 LSOA via Nomis bulk (TS004/TS007A/TS021/TS063/TS066)
- Crime: data.police.uk street-level (Met Police), ~450 m around anchor
- Occupancy cost: VOA NDR business floorspace 2023 (borough rateable value per m2); passing rent is modelled
- Revenue: modelled - rules and constants documented in the site's Method section


## Decision workspace

- Favourites and a two-to-three street comparator persist locally in the browser.
- Each street evidence panel can export a labelled PDF report.
- On-visit change alerts compare saved snapshots when a newer published dataset loads. Background email or push alerts require a backend.
- The available-premises connector intentionally contains no copied portal inventory. Current portal terms were reviewed: public listing pages are not a lawful reusable feed. Connect an agent-owned feed or licensed syndication API before populating it.
