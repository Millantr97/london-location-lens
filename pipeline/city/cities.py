"""Per-city configuration for the Location Lens UK expansion.
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
}
# Curated non-station area pitches per city. anchors = ORR station names.
CURATED = {
 'manchester': [
   dict(id='trafford-centre', name='Trafford Centre', lat=53.4660, lng=-2.3488, stype='managed_estate', anchors=[]),
   dict(id='mediacityuk', name='MediaCityUK, Salford Quays', lat=53.4727, lng=-2.2972, stype='managed_estate', anchors=[('Salford Crescent','ORR')]),
 ],
}
