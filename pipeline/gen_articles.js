/* Generate "best streets" ranking articles from the live model (same engine as the map). */
global.window={};
const fs=require('fs');
const appLines=fs.readFileSync(__dirname+'/../app.js','utf8').split('\n');const cut=appLines.findIndex(l=>l.startsWith('/* ---------- main loop'));const appHead=appLines.slice(0,cut).join('\n');
const code=fs.readFileSync(__dirname+'/../segments.js','utf8')+'\n'+fs.readFileSync(__dirname+'/../units.js','utf8')+'\n'+fs.readFileSync(__dirname+'/../competitors.js','utf8')+'\n'+appHead+'\n;({SEGS,PRESETS,computeAll,normalizeConcept,weeklyFlowAbs})';
const M=eval(code);

const STYPE={transport_hub:'transport hub',high_street:'high street',major_street:'major retail street',major_retail:'major retail street',side_street:'side street',market:'market street',managed_estate:'managed estate'};
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const fmt=n=>Math.round(n).toLocaleString('en-GB');
const money=n=>'£'+fmt(n);

/* slug, preset, kicker, title phrase, standfirst, format line, competitor noun, card kick, card blurb */
const ARTICLES=[
 {slug:'coffee-shop',preset:'specialty-coffee',kick:'Coffee',noun:'a coffee shop',comp:'coffee shops',
  stand:'We scored 2,480 London street segments for a specialty coffee and brunch concept using real station flows, recorded cafes, Census context and a transparent revenue model. These are the ten strongest.',
  format:'A specialty coffee and brunch format: \u00a312 average ticket, 32 seats, weekday mornings and weekend daytime trading.',
  card:'No. 1: {top}, fit {fit}/100. Plus nine more streets, with modelled revenue, real flows and competition counts.'},
 {slug:'cocktail-bar',preset:'cocktail-bar',kick:'Bars',noun:'a cocktail bar',comp:'cocktail bars',
  stand:'Late-night demand is concentrated and competition is fierce, so the ranking leans on Friday and Saturday station flows, nightlife context and recorded bars within 600 m. These ten streets come out on top.',
  format:'A cocktail and natural wine bar: \u00a330 average ticket, 36 seats, trading Wednesday to Saturday nights.',
  card:'No. 1: {top}, fit {fit}/100. Plus nine more streets, with modelled revenue, real flows and competition counts.'},
 {slug:'bakery',preset:'bakery',kick:'Bakery',noun:'a bakery',comp:'bakeries',
  stand:'Bakeries live on repeat local trade, so the model weighs residents, family context and morning flows heavily. These ten streets scored highest.',
  format:'A bakery and patisserie: \u00a39 average ticket, mostly takeaway, trading mornings through early afternoon, seven days a week.',
  card:'No. 1: {top}, fit {fit}/100. Plus nine more streets, with modelled revenue, real flows and competition counts.'},
 {slug:'gym',preset:'boutique-fitness',kick:'Fitness',noun:'a gym or fitness studio',comp:'gyms and fitness studios',
  stand:'Studios sell memberships to people who live and work nearby, so the model converts residents and commuter flows into members. These ten streets scored highest.',
  format:'A boutique fitness studio: \u00a325 per class, 20 spots, peak classes before work and after work on weekdays.',
  card:'No. 1: {top}, fit {fit}/100. Plus nine more streets, with modelled revenue, real flows and competition counts.'},
 {slug:'restaurant',preset:'casual-dining',kick:'Restaurants',noun:'a restaurant',comp:'restaurants',
  stand:'The model scores lunchtime and evening demand, recorded restaurants within 800 m, local spend levels and rent context. These ten streets scored highest.',
  format:'A casual dining restaurant: \u00a324 average ticket, 60 covers, lunch and dinner seven days a week.',
  card:'No. 1: {top}, fit {fit}/100. Plus nine more streets, with modelled revenue, real flows and competition counts.'},
 {slug:'hairdresser-barber',preset:'hair-barber',kick:'Hair & beauty',noun:'a hairdresser or barber shop',comp:'hairdressers and barbers',
  stand:'Hair and barber shops live on repeat local custom, so the model weights residents, daytime flow and how many chairs already compete nearby. These ten streets scored highest.',
  format:'A unisex salon-barber hybrid: £28 average ticket, 3 chairs, open six days a week including early evenings.',
  card:'No. 1: {top}, fit {fit}/100. Plus nine more streets, with modelled revenue, real flows and competition counts.'},
 {slug:'laundrette',preset:'laundrette',kick:'Services',noun:'a laundrette or dry cleaner',comp:'laundrettes and dry cleaners',
  stand:'Laundrettes are a pure neighbourhood business: dense renters, few cars, weekly habits. The model scores exactly that - residents within walking distance and passing flow. These ten streets scored highest.',
  format:'A self-service laundrette with service washes: £7 average ticket, 12 machines, open seven days including evenings.',
  card:'No. 1: {top}, fit {fit}/100. Plus nine more streets, with modelled revenue, real flows and competition counts.'},
 {slug:'nail-salon',preset:'beauty-nails',kick:'Hair & beauty',noun:'a nail or beauty salon',comp:'nail and beauty salons',
  stand:'Nail and beauty salons cluster where young professional residents and lunchtime office trade overlap, and margins survive only outside prime pitches. These ten streets scored highest.',
  format:'A walk-in nail and beauty bar: £32 average ticket, 4 stations, open seven days with late weekday hours.',
  card:'No. 1: {top}, fit {fit}/100. Plus nine more streets, with modelled revenue, real flows and competition counts.'},
 {slug:'estate-agency',preset:'estate-agency',kick:'Property',noun:'an estate or letting agency',comp:'estate and letting agencies',
  stand:'Agencies win instructions where stock turns over and rivals prove the market works - but a corner too crowded kills the brand. The model balances affluent residents, visibility flow and existing agents. These ten streets scored highest.',
  format:'An independent sales and lettings agency: £2,500 average fee equivalent, 8 negotiators, standard office hours plus Saturday.',
  card:'No. 1: {top}, fit {fit}/100. Plus nine more streets, with modelled revenue, real flows and competition counts.'},
 {slug:'pharmacy',preset:'pharmacy',kick:'Health',noun:'a pharmacy or chemist',comp:'pharmacies and chemists',
  stand:'Pharmacies trade on prescriptions and convenience: older and family residents, all-day flow, and distance from the multiples. These ten streets scored highest.',
  format:'An independent community pharmacy: £14 average retail ticket plus scripts, standard hours six days a week.',
  card:'No. 1: {top}, fit {fit}/100. Plus nine more streets, with modelled revenue, real flows and competition counts.'},
 {slug:'florist',preset:'florist',kick:'Retail',noun:'a florist',comp:'florists',
  stand:'Florists need affluent footfall and gift occasions: offices for corporate accounts, wealthy residents for weekly stems and events. These ten streets scored highest.',
  format:'A fresh-flower studio: £35 average bouquet, small workshop, open six days with early market hours.',
  card:'No. 1: {top}, fit {fit}/100. Plus nine more streets, with modelled revenue, real flows and competition counts.'},
 {slug:'optician',preset:'optician',kick:'Health',noun:'an optician or eyewear shop',comp:'opticians',
  stand:'Opticians mix medical appointments with retail tickets: they need older, professional catchments and trust - and enough passing flow to fill the test room. These ten streets scored highest.',
  format:'An independent optician with retail frames: £180 average dispense, 1 test room, six days a week.',
  card:'No. 1: {top}, fit {fit}/100. Plus nine more streets, with modelled revenue, real flows and competition counts.'},
 {slug:'phone-repair',preset:'phone-repair',kick:'Services',noun:'a phone and laptop repair shop',comp:'phone and laptop repair shops',
  stand:'Repair shops thrive on volume and urgency: dense young catchments, commuter flow and visible cheap pitches. These ten streets scored highest.',
  format:'A walk-in repair counter: £45 average job, 2 benches, open seven days with late hours.',
  card:'No. 1: {top}, fit {fit}/100. Plus nine more streets, with modelled revenue, real flows and competition counts.'},
 {slug:'tattoo-studio',preset:'tattoo',kick:'Body art',noun:'a tattoo or piercing studio',comp:'tattoo and piercing studios',
  stand:'Tattoo studios are destination businesses that still feed on scene density: young residents, nightlife gravity and creative neighbours. These ten streets scored highest.',
  format:'A custom studio with piercing: £120 average sitting, 3 artists, appointments plus weekend walk-ins.',
  card:'No. 1: {top}, fit {fit}/100. Plus nine more streets, with modelled revenue, real flows and competition counts.'},
 {slug:'bookshop',preset:'bookshop',kick:'Retail',noun:'a bookshop',comp:'bookshops',
  stand:'Bookshops survive on destination appeal and affluent, reading catchments - plus the cafe-browse dwell time only certain streets produce. These ten streets scored highest.',
  format:'An independent general bookshop: £12 average ticket, curated stock, open seven days.',
  card:'No. 1: {top}, fit {fit}/100. Plus nine more streets, with modelled revenue, real flows and competition counts.'},
 {slug:'pet-shop',preset:'pet-shop',kick:'Retail',noun:'a pet shop or supplies store',comp:'pet shops',
  stand:'Pet supplies follow family-and-dog catchments and weekend errands: residents first, passing trade second. These ten streets scored highest.',
  format:'A neighbourhood pet supplies shop: £18 average basket, grooming corner, open seven days.',
  card:'No. 1: {top}, fit {fit}/100. Plus nine more streets, with modelled revenue, real flows and competition counts.'},
 {slug:'charity-shop',preset:'charity-shop',kick:'Retail',noun:'a charity or second-hand shop',comp:'charity and second-hand shops',
  stand:'Charity and vintage retail needs donations and browsers: dense, mixed-income catchments with strong weekend browsing flow. These ten streets scored highest.',
  format:'A curated charity and second-hand shop: £9 average ticket, donation point, seven days.',
  card:'No. 1: {top}, fit {fit}/100. Plus nine more streets, with modelled revenue, real flows and competition counts.'},
 {slug:'vet-practice',preset:'vet',kick:'Health',noun:'a veterinary practice',comp:'vet practices',
  stand:'Vets follow pet-owning family catchments, not footfall: residents matter most, then car-accessible visibility. These ten streets scored highest.',
  format:'A small-animal practice: £55 average consult, 2 vets, weekdays plus Saturday morning.',
  card:'No. 1: {top}, fit {fit}/100. Plus nine more streets, with modelled revenue, real flows and competition counts.'},
 {slug:'bubble-tea',preset:'dessert',kick:'Desserts',noun:'a bubble tea or dessert shop',comp:'dessert and bubble tea shops',
  stand:'Bubble tea and desserts run on teenage-and-student gravity, evening flow and social-media-led queues. These ten streets scored highest.',
  format:'A bubble tea and dessert counter: £6.50 average ticket, grab-and-go, afternoons to late seven days.',
  card:'No. 1: {top}, fit {fit}/100. Plus nine more streets, with modelled revenue, real flows and competition counts.'},
 {slug:'burger',preset:'burger',kick:'Fast food',noun:'a smashed burger joint',comp:'burger joints',
  stand:'Smashed burgers trade on lunch lines and late-night delivery: office density by day, young residents and nightlife by night. These ten streets scored highest.',
  format:'A smashed burger counter: £11 average ticket, 24 seats, lunch through late seven days.',
  card:'No. 1: {top}, fit {fit}/100. Plus nine more streets, with modelled revenue, real flows and competition counts.'},
 {slug:'neapolitan-pizza',preset:'neapolitan-pizza',kick:'Pizza',noun:'a Neapolitan pizzeria',comp:'pizzerias',
  stand:'A proper pizzeria needs dinner occasions: affluent young residents, evening flow and a street where people already go out to eat. These ten streets scored highest.',
  format:'A 40-cover Neapolitan pizzeria: £24 average spend, dinner-led seven days plus weekend lunch.',
  card:'No. 1: {top}, fit {fit}/100. Plus nine more streets, with modelled revenue, real flows and competition counts.'},
 {slug:'fried-chicken',preset:'fried-chicken',kick:'Fast food',noun:'a fried chicken shop',comp:'fried chicken shops',
  stand:'Chicken shops are volume businesses: school-and-student flow, late hours, delivery apps - and they survive pitches trendier formats cannot. These ten streets scored highest.',
  format:'A fried chicken counter: £8 average ticket, counter plus delivery, lunch to late seven days.',
  card:'No. 1: {top}, fit {fit}/100. Plus nine more streets, with modelled revenue, real flows and competition counts.'},
 {slug:'yoga-pilates',preset:'yoga',kick:'Fitness',noun:'a yoga or Pilates studio',comp:'yoga and Pilates studios',
  stand:'Yoga and Pilates sell memberships to young professionals within walking distance - the catchment is everything, and these ten streets scored highest on it.',
  format:'A reformer Pilates and yoga studio: £22 average class, 14 spots, classes morning and evening peaks.',
  card:'No. 1: {top}, fit {fit}/100. Plus nine more streets, with modelled revenue, real flows and competition counts.'},
];

const today='12 September 2026';
let cards=[];
for(const a of ARTICLES){
  const p=M.PRESETS.find(x=>x.id===a.preset);
  if(!p){console.error('MISSING PRESET',a.preset);process.exit(1);}
  const c=M.normalizeConcept(JSON.parse(JSON.stringify(p)));
  const ranked=M.computeAll(c);
  const top=ranked.slice(0,10);
  const cat=c.cat, compN=s=>(s.osm['comp_'+cat]??s.osm[cat])||0, compChain=s=>(s.osm['comp_'+cat+'_chain']??s.osm[cat+'_chain'])||0;
  const title='The 10 best streets to open '+a.noun+' in London (2026 data)';
  const items=top.map((r,i)=>{
    const s=r.seg, fl=Math.round(M.weeklyFlowAbs(s)), rev=r.rev;
    const sub=[s.borough,s.zone,STYPE[s.stype]||s.stype].filter(Boolean).join(' · ');
    const why=fmt(fl)+' weekly station entries and exits (entries + exits at named stations) pass the pitch, with '+compN(s)+' recorded '+a.comp+' competing within '+window.COMPR[cat]+' m. Typical spend nearby is '+money(s.model.spend_est)+' per person and modelled rent is '+money(s.rent.est_rent_m2)+' per m&sup2;.';
    return `<li class="art-item">
  <div class="ai-rank">${i+1}</div>
  <div class="ai-main">
    <h2>${esc(s.name)}</h2>
    <div class="ai-sub">${esc(sub)}</div>
    <p class="ai-why">${why}</p>
    <div class="ai-figs">
      <span class="ai-fig">Fit score <b>${Math.round(r.score)}/100</b><span class="chip mod">MODELLED</span></span>
      <span class="ai-fig">Est. revenue <b>${money(rev.month)}/mo</b> (range ${money(rev.low)}-${money(rev.high)})<span class="chip mod">MODELLED</span></span>
      <span class="ai-fig">Weekly station flow <b>${fmt(fl)}</b><span class="chip obs">OBSERVED</span></span>
      <span class="ai-fig">Competitors within ${window.COMPR[cat]} m <b>${compN(s)}</b> (${compChain(s)} chain)<span class="chip obs">OBSERVED</span></span>
      <span class="ai-fig">Est. rent <b>${money(s.rent.est_rent_m2)}/m&sup2;/yr</b><span class="chip mod">MODELLED</span></span>
      <span class="ai-fig">Residents nearby <b>${fmt(s.lsoa.residents)}</b><span class="chip ctx">AREA CONTEXT</span></span>
    </div>
  </div>
</li>`;
  }).join('\n');
  const ldItems=top.map((r,i)=>`{"@type": "ListItem", "position": ${i+1}, "name": ${JSON.stringify(r.seg.name)}}`).join(', ');
  const html=`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#16382c">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Location Potential">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="apple-touch-icon" sizes="180x180" href="/assets/icons/apple-touch-icon.png">
<title>${esc(title)} - Location Potential</title>
<meta name="description" content="Data-driven ranking of the 10 best London streets to open ${esc(a.noun)}: fit scores, modelled revenue, real station flows and recorded competition, with honest labels on every figure.">
<link rel="canonical" href="https://locationpotential.com/articles/best-streets-${a.slug}-london.html">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Location Potential">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="Data-driven ranking of the 10 best London streets to open ${esc(a.noun)}: fit scores, modelled revenue, real station flows and recorded competition.">
<meta property="og:url" content="https://locationpotential.com/articles/best-streets-${a.slug}-london.html">
<meta property="og:image" content="https://locationpotential.com/assets/og.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="../assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="../styles.css?v=32">
<script type="application/ld+json">{"@context": "https://schema.org", "@type": "ItemList", "name": "${esc(title)}", "itemListElement": [${ldItems}]}</script>
</head>
<body>
<header class="top"><div class="top-row"><a class="brand art-brand" href="../">Location <span>Potential</span><i class="brand-city">London</i></a>
<nav class="tabs" aria-label="Sections"><a href="../#rankings">All rankings</a><a href="../">Open the tool</a></nav></div></header>
<main class="art">
<article>
<header class="art-hero"><div class="eyebrow">Model ranking · ${esc(a.kick)}</div>
<h1>${esc(title)}</h1>
<p class="art-stand">${esc(a.stand)}</p>
<p class="art-meta">Format scored: ${esc(a.format)}</p>
<p class="art-meta">Computed ${today} over ${M.SEGS.length.toLocaleString('en-GB')} London street segments. Every figure carries its label: OBSERVED, AREA CONTEXT or MODELLED.</p></header>
<aside class="truth art-truth"><strong>Read the labels, not just the score</strong><p><b class="c-obs">OBSERVED</b> measured at the street or station. <b class="c-ctx">AREA CONTEXT</b> residents or borough statistics around it. <b class="c-mod">MODELLED</b> transparent estimates we compute, with the rule shown. For more accurate models consult a specialist.</p></aside>
<ol class="art-list">
${items}
</ol>
<div class="art-method">
<h2 class="art-h2">How this ranking works</h2>
<p>One fixed concept is scored against every one of the ${M.SEGS.length.toLocaleString('en-GB')} London street segments in the Location Potential dataset: station entries and exits from TfL Annual Station Counts 2025 (National Rail: ORR 2024-25), recorded venues within the concept's competition radius (400 m to 1 km by type) from OpenStreetMap, Census 2021 residents for the local LSOA, business crime from data.police.uk, and rent context from Valuation Office Agency rateable values. Scores and revenue figures are MODELLED planning estimates with fixed, published rules, not observed takings. The full method, sources and limits are on the <a href="../#method">Method page</a>.</p>
<p>Use this ranking to shortlist, then verify with on-street counts, agent enquiries and a licensing check before signing anything. A specialist can help you.</p>
</div>
<div class="art-cta">
<b>This ranking is one fixed concept. Yours is different.</b>
<p>Change the ticket, hours, audience and priorities and the whole of London re-ranks live.</p>
<div class="art-cta-btns"><a class="action primary" href="../?concept=${a.preset}#concept">Run this ranking with your own numbers →</a><a class="action" href="../#expert">Speak to a geomarketing specialist →</a></div>
</div>
</article>
</main>
<footer class="foot"><div>Location Potential · a decision-support tool. Verify any shortlist with on-street counts, agent enquiries and a licensing check before signing anything. A specialist can help you.</div><div class="foot-links"><a href="../#rankings">Rankings &amp; guides</a><a href="../privacy.html">Privacy Notice</a></div></footer>
<script data-goatcounter="https://locationpotential.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>
<script src="/pwa.js?v=1"></script>
</body>
</html>`;
  fs.writeFileSync(__dirname+'/../articles/best-streets-'+a.slug+'-london.html',html);
  const t=top[0];
  cards.push(`<a class="article-card" href="articles/best-streets-${a.slug}-london.html">
      <span class="art-kick">${esc(a.kick)}</span>
      <h3>${esc(title)}</h3>
      <p>${esc(a.card.replace('{top}',t.seg.name+' ('+t.seg.borough+')').replace('{fit}',Math.round(t.score)))}</p>
      <span class="art-go">Read the ranking →</span>
    </a>`);
  console.log('OK',a.slug,'| #1',t.seg.name,Math.round(t.score));
}
fs.writeFileSync('/tmp/article_cards.html',cards.join(''));
console.log('CARDS_WRITTEN',ARTICLES.length);
