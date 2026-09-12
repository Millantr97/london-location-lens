/* Generate "best streets" ranking articles for a non-London city (same engine as the map). */
const cityId=process.argv[2];
if(!cityId){console.error('usage: node gen_city_articles.js <cityid>');process.exit(1);}
global.window={};
const fs=require('fs');
const R=__dirname+'/..';
const appLines=fs.readFileSync(R+'/app.js','utf8').split('\n');const cut=appLines.findIndex(l=>l.startsWith('/* ---------- main loop'));const appHead=appLines.slice(0,cut).join('\n');
/* reuse the article definitions from the London generator */
const genSrc=fs.readFileSync(__dirname+'/gen_articles.js','utf8');
const ARTICLES=eval(genSrc.slice(genSrc.indexOf('const ARTICLES=')+15,genSrc.indexOf('];',genSrc.indexOf('const ARTICLES='))+1));
const code=fs.readFileSync(R+'/'+cityId+'/city.js','utf8')+'\n'+fs.readFileSync(R+'/'+cityId+'/data/segments.js','utf8')+'\n'+fs.readFileSync(R+'/'+cityId+'/data/units.js','utf8')+'\n'+fs.readFileSync(R+'/'+cityId+'/data/competitors.js','utf8')+'\n'+appHead+'\n;({CITY,SEGS,PRESETS,computeAll,normalizeConcept,weeklyFlowAbs,META,HAS_CRIME})';
const M=eval(code);
const CITY=M.CITY, cn=CITY.name;
const SCOT=(cityId==='glasgow'||cityId==='edinburgh');
const geoUnit=SCOT?'Data Zone':'LSOA';
const rentSrc=SCOT?'the Scottish Assessors valuation roll':'Valuation Office Agency rateable values';

const STYPE={transport_hub:'transport hub',high_street:'high street',major_street:'major retail street',major_retail:'major retail street',side_street:'side street',market:'market street',managed_estate:'managed estate'};
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const fmt=n=>Math.round(n).toLocaleString('en-GB');
const money=n=>'£'+fmt(n);
const N=M.SEGS.length.toLocaleString('en-GB');
const today='12 September 2026';
fs.mkdirSync(R+'/'+cityId+'/articles',{recursive:true});
let cards=[];
for(const a of ARTICLES){
  const p=M.PRESETS.find(x=>x.id===a.preset);
  if(!p){console.error('MISSING PRESET',a.preset);process.exit(1);}
  const c=M.normalizeConcept(JSON.parse(JSON.stringify(p)));
  const ranked=M.computeAll(c);
  const top=ranked.slice(0,10);
  const cat=c.cat, compN=s=>(s.osm['comp_'+cat]??s.osm[cat])||0, compChain=s=>(s.osm['comp_'+cat+'_chain']??s.osm[cat+'_chain'])||0;
  const title='The 10 best streets to open '+a.noun+' in '+cn+' (2026 data)';
  const stand=a.stand.replace(/2,480 London street segments/,N+' '+cn+' street segments');
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
      <span class="ai-fig">Weekly station flow <b>${fmt(fl)}</b><span class="chip ${s.weak?'mod':'obs'}">${s.weak?'MODELLED':'OBSERVED'}</span></span>
      <span class="ai-fig">Competitors within ${window.COMPR[cat]} m <b>${compN(s)}</b> (${compChain(s)} chain)<span class="chip obs">OBSERVED</span></span>
      <span class="ai-fig">Est. rent <b>${money(s.rent.est_rent_m2)}/m&sup2;/yr</b><span class="chip mod">MODELLED</span></span>
      <span class="ai-fig">Residents nearby <b>${fmt(s.lsoa.residents)}</b><span class="chip ctx">AREA CONTEXT</span></span>
    </div>
  </div>
</li>`;
  }).join('\n');
  function topName(t){const b=t.seg.borough||'';return b&&t.seg.name.indexOf('('+b+')')<0?t.seg.name+' ('+b+')':t.seg.name;}
  const ldItems=top.map((r,i)=>`{"@type": "ListItem", "position": ${i+1}, "name": ${JSON.stringify(r.seg.name)}}`).join(', ');
  const url='https://locationpotential.com/'+cityId+'/articles/best-streets-'+a.slug+'-'+cityId+'.html';
  const html=`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} - Location Potential</title>
<meta name="description" content="Data-driven ranking of the 10 best ${cn} streets to open ${esc(a.noun)}: fit scores, modelled revenue, real station flows and recorded competition, with honest labels on every figure.">
<link rel="canonical" href="${url}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Location Potential">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="Data-driven ranking of the 10 best ${cn} streets to open ${esc(a.noun)}: fit scores, modelled revenue, real station flows and recorded competition.">
<meta property="og:url" content="${url}">
<meta property="og:image" content="https://locationpotential.com/assets/og.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="../../assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="../../styles.css?v=29">
<script type="application/ld+json">{"@context": "https://schema.org", "@type": "ItemList", "name": "${esc(title)}", "itemListElement": [${ldItems}]}</script>
</head>
<body>
<header class="top"><div class="top-row"><a class="brand art-brand" href="../">Location <span>Potential</span><i class="brand-city">${cn}</i></a>
<nav class="tabs" aria-label="Sections"><a href="../#rankings">All rankings</a><a href="../">Open the tool</a></nav></div></header>
<main class="art">
<article>
<header class="art-hero"><div class="eyebrow">Model ranking · ${esc(a.kick)} · ${esc(cn)}</div>
<h1>${esc(title)}</h1>
<p class="art-stand">${esc(stand)}</p>
<p class="art-meta">Format scored: ${esc(a.format)}</p>
<p class="art-meta">Computed ${today} over ${N} ${esc(cn)} street segments. Every figure carries its label: OBSERVED, AREA CONTEXT or MODELLED.</p></header>
<aside class="truth art-truth"><strong>Read the labels, not just the score</strong><p><b class="c-obs">OBSERVED</b> measured at the street or station. <b class="c-ctx">AREA CONTEXT</b> residents or borough statistics around it. <b class="c-mod">MODELLED</b> transparent estimates we compute, with the rule shown. For more accurate models consult a specialist.</p></aside>
<ol class="art-list">
${items}
</ol>
<div class="art-method">
<h2 class="art-h2">How this ranking works</h2>
<p>One fixed concept is scored against every one of the ${N} ${esc(cn)} street segments in the Location Potential dataset: station entries and exits (${esc(M.META.numbat)}), recorded venues within the concept's competition radius (400 m to 1 km by type) from OpenStreetMap, ${esc(M.META.census)} residents for the local ${geoUnit}${M.HAS_CRIME?', business crime from data.police.uk':''}, and rent context from ${rentSrc}. Scores and revenue figures are MODELLED planning estimates with fixed, published rules, not observed takings. The full method, sources and limits are on the <a href="../#method">Method page</a>.</p>
<p>Use this ranking to shortlist, then verify with on-street counts, agent enquiries and a licensing check before signing anything. A specialist can help you.</p>
</div>
<div class="art-cta">
<b>This ranking is one fixed concept. Yours is different.</b>
<p>Change the ticket, hours, audience and priorities and the whole of ${esc(cn)} re-ranks live.</p>
<div class="art-cta-btns"><a class="action primary" href="../?concept=${a.preset}#concept">Run this ranking with your own numbers →</a><a class="action" href="../#expert">Speak to a geomarketing specialist →</a></div>
</div>
</article>
</main>
<footer class="foot"><div>Location Potential · a decision-support tool. Verify any shortlist with on-street counts, agent enquiries and a licensing check before signing anything. A specialist can help you.</div><div class="foot-links"><a href="../#rankings">Rankings &amp; guides</a><a href="../../privacy.html">Privacy Notice</a></div></footer>
<script data-goatcounter="https://locationpotential.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>
</body>
</html>`;
  fs.writeFileSync(R+'/'+cityId+'/articles/best-streets-'+a.slug+'-'+cityId+'.html',html);
  const t=top[0];
  cards.push(`<a class="article-card" href="articles/best-streets-${a.slug}-${cityId}.html">
      <span class="art-kick">${esc(a.kick)}</span>
      <h3>${esc(title)}</h3>
      <p>${esc(a.card.replace('{top}',topName(t)).replace('{fit}',Math.round(t.score)))}</p>
      <span class="art-go">Read the ranking →</span>
    </a>`);
  console.log('OK',cityId,a.slug,'| #1',t.seg.name,Math.round(t.score));
}
fs.writeFileSync('/tmp/article_cards_'+cityId+'.html',cards.join(''));
console.log('CARDS',cityId,cards.length);
