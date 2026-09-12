"""Per-city configuration for the Location Potential UK expansion.
bbox = (lat0, lng0, lat1, lng1); center = city-centre anchor for distance bands."""
CITIES = {
 'manchester': dict(
    id='manchester', name='Manchester', region='Greater Manchester',
    center=(53.4778, -2.2435),            # St Peter's Square
    bbox=(53.30, -2.75, 53.72, -1.90),
    bands=[(1500,'City centre'),(4000,'1.5-4 km from centre'),(8000,'4-8 km from centre'),(15000,'8-15 km from centre')],
    band_far='15+ km from centre',
    country='EW',
    police='Greater Manchester Police',
    no_crime=True,
    crime_dropped='Greater Manchester Police does not currently publish street-level recorded crime to data.police.uk (a gap running since its records-system migration), so no crime figures are shown for Manchester anywhere on this page - we drop the field rather than estimate it. Every other data field is unaffected.',
 ),
 'birmingham': dict(
    id='birmingham', name='Birmingham', region='the West Midlands',
    center=(52.4797, -1.9027),            # Victoria Square
    bbox=(52.33, -2.20, 52.68, -1.55),
    bands=[(1500,'City centre'),(4000,'1.5-4 km from centre'),(8000,'4-8 km from centre'),(15000,'8-15 km from centre')],
    band_far='15+ km from centre',
    country='EW',
    police='West Midlands Police',
 ),
 'leeds': dict(
    id='leeds', name='Leeds', region='West Yorkshire',
    center=(53.7979, -1.5437),            # City Square
    bbox=(53.68, -1.85, 53.93, -1.30),
    bands=[(1500,'City centre'),(4000,'1.5-4 km from centre'),(8000,'4-8 km from centre'),(15000,'8-15 km from centre')],
    band_far='15+ km from centre',
    country='EW',
    police='West Yorkshire Police',
 ),
 'bristol': dict(
    id='bristol', name='Bristol', region='Bristol and Bath',
    center=(51.4545, -2.5879),            # The Centre
    bbox=(51.32, -2.85, 51.58, -2.30),
    bands=[(1500,'City centre'),(4000,'1.5-4 km from centre'),(8000,'4-8 km from centre'),(15000,'8-15 km from centre')],
    band_far='15+ km from centre',
    country='EW',
    police='Avon and Somerset Police',
 ),
 'liverpool': dict(
    id='liverpool', name='Liverpool', region='Merseyside',
    center=(53.4054, -2.9805),            # Clayton Square
    bbox=(53.28, -3.12, 53.58, -2.75),
    bands=[(1500,'City centre'),(4000,'1.5-4 km from centre'),(8000,'4-8 km from centre'),(15000,'8-15 km from centre')],
    band_far='15+ km from centre',
    country='EW',
    police='Merseyside Police',
 ),
 'sheffield': dict(
    id='sheffield', name='Sheffield', region='South Yorkshire',
    center=(53.3806, -1.4701),            # Barker's Pool
    bbox=(53.25, -1.75, 53.48, -1.25),
    bands=[(1500,'City centre'),(4000,'1.5-4 km from centre'),(8000,'4-8 km from centre'),(15000,'8-15 km from centre')],
    band_far='15+ km from centre',
    country='EW',
    police='South Yorkshire Police',
 ),
 'glasgow': dict(
    id='glasgow', name='Glasgow', region='Greater Glasgow',
    center=(55.8612, -4.2499),            # George Square
    bbox=(55.70, -4.60, 56.00, -3.95),
    bands=[(1500,'City centre'),(4000,'1.5-4 km from centre'),(8000,'4-8 km from centre'),(15000,'8-15 km from centre')],
    band_far='15+ km from centre',
    country='S',
    police='Police Scotland',
    no_crime=True,
    crime_dropped='Police Scotland does not publish street-level recorded crime. Scottish recorded-crime statistics (statistics.gov.scot) are published at council-area level only, so no crime figures are shown for Glasgow anywhere on this page - we drop the field rather than estimate it. Every other data field is unaffected.',
 ),
 'edinburgh': dict(
    id='edinburgh', name='Edinburgh', region='Edinburgh and the Lothians',
    center=(55.9533, -3.1883),            # Waverley / Princes Street
    bbox=(55.85, -3.60, 56.05, -2.90),
    bands=[(1500,'City centre'),(4000,'1.5-4 km from centre'),(8000,'4-8 km from centre'),(15000,'8-15 km from centre')],
    band_far='15+ km from centre',
    country='S',
    police='Police Scotland',
    no_crime=True,
    crime_dropped='Police Scotland does not publish street-level recorded crime. Scottish recorded-crime statistics (statistics.gov.scot) are published at council-area level only, so no crime figures are shown for Edinburgh anywhere on this page - we drop the field rather than estimate it. Every other data field is unaffected.',
 ),
}
# Curated non-station area pitches per city. anchors = ORR station names.
CURATED = {
 'manchester': [
   dict(id='trafford-centre', name='Trafford Centre', lat=53.4660, lng=-2.3488, stype='managed_estate', anchors=[]),
   dict(id='mediacityuk', name='MediaCityUK, Salford Quays', lat=53.4727, lng=-2.2972, stype='managed_estate', anchors=[('Salford Crescent','ORR')]),
 ],
 'glasgow': [
   dict(id='buchanan-quarter', name='Buchanan Quarter', lat=55.8606, lng=-4.2520, stype='shopping_district', anchors=[('Glasgow Queen Street','ORR')]),
   dict(id='west-end-byres', name='West End - Byres Road', lat=55.8744, lng=-4.2927, stype='high_street', anchors=[('Partick','ORR')]),
   dict(id='merchant-city', name='Merchant City', lat=55.8580, lng=-4.2455, stype='high_street', anchors=[('Argyle Street','ORR')]),
   dict(id='finnieston', name='Finnieston', lat=55.8645, lng=-4.2830, stype='high_street', anchors=[('Exhibition Centre (Glasgow)','ORR')]),
   dict(id='braehead', name='Braehead', lat=55.8767, lng=-4.3633, stype='managed_estate', anchors=[]),
 ],
 'edinburgh': [
   dict(id='st-james-quarter', name='St James Quarter', lat=55.9555, lng=-3.1880, stype='managed_estate', anchors=[('Edinburgh','ORR')]),
   dict(id='stockbridge', name='Stockbridge', lat=55.9600, lng=-3.2085, stype='high_street', anchors=[('Haymarket','ORR')]),
   dict(id='leith-walk', name='Leith Walk', lat=55.9645, lng=-3.1770, stype='high_street', anchors=[('Edinburgh','ORR')]),
   dict(id='bruntsfield', name='Bruntsfield & Morningside', lat=55.9360, lng=-3.2090, stype='high_street', anchors=[('Haymarket','ORR')]),
   dict(id='gyle', name='The Gyle', lat=55.9380, lng=-3.3170, stype='managed_estate', anchors=[('South Gyle','ORR')]),
 ],
}
