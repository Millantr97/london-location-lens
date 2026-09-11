/* ---------- concept trends + premium tools ---------- */
const XCAT={cafe:"Cafés",restaurant:"Restaurants",fast_food:"Fast food",pub_bar:"Pubs & bars",grocery:"Grocery & food shops",fitness:"Gyms & fitness",cowork:"Coworking"};

/* ----- trends ----- */
let trendSort="growth";
function sparkline(series,years,w,h){
  const vals=years.map(y=>series?series[y]:null);
  const nums=vals.filter(v=>v!=null);
  if(!nums.length)return '<span class="tr-nodata">no data</span>';
  const lo=Math.min(...nums),hi=Math.max(...nums),span=Math.max(1e-9,hi-lo);
  const pts=years.map((y,i)=>{const v=vals[i];if(v==null)return null;const x=(i/(years.length-1))*w;const yy=h-2-((v-lo)/span)*(h-4);return x.toFixed(1)+","+yy.toFixed(1);}).filter(Boolean);
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline points="${pts.join(" ")}" fill="none" stroke-width="2"/></svg>`;
}
function trendChange(series,years,back){
  if(!series)return null;
  const last=years[years.length-1],prev=years[Math.max(0,years.length-1-back)];
  const a=series[last],b=series[prev];
  if(a==null||b==null||b===0)return null;
  return (a-b)/b*100;
}
function fmtChg(v){if(v==null)return "n/a";const s=v>=0?"+":"";return `<span class="chg ${v>=0?"up":"down"}">${s}${v.toFixed(0)}%</span>`;}
function renderTrends(){
  const box=$("trend-list");if(!box)return;
  if(typeof TRENDS==="undefined"||!TRENDS.osm){box.innerHTML='<div class="saved-empty">Trend series are being assembled from the sources below. Check back shortly.</div>';return;}
  const years=TRENDS.years, gtyears=TRENDS.gt_years;
  const rows=PRESETS.map(p=>{
    const osm=TRENDS.osm[p.cat]||null;
    const gt=(TRENDS.gt&&TRENDS.gt.series)?TRENDS.gt.series[p.id]:null;
    const gtMax=gt?Math.max(...Object.values(gt)):0;
    const lowVol=gt&&gtMax<3;
    return {p,osm,gt,osmChg:trendChange(osm,years,4),gtChg:lowVol?null:trendChange(gt,gtyears,1),gtChg4:lowVol?null:trendChange(gt,gtyears,4),lowVol};
  });
  if(trendSort==="growth")rows.sort((a,b)=>((b.gtChg??-999))-((a.gtChg??-999)));
  else if(trendSort==="osm")rows.sort((a,b)=>((b.osmChg??-999))-((a.osmChg??-999)));
  else rows.sort((a,b)=>a.p.name.localeCompare(b.p.name));
  box.innerHTML=rows.map(r=>`
    <div class="trend-row">
      <div class="tr-name"><b>${r.p.name}</b><span class="tr-cat">${XCAT[r.p.cat]||r.p.cat}</span></div>
      <div class="tr-cell"><div class="tr-cell-h">Recorded venues in London ${chipFor("obs")}<span class="tr-catlvl">category level - all ${(XCAT[r.p.cat]||"").toLowerCase()}</span></div>
        <div class="tr-cell-b">${sparkline(r.osm,years,150,34)}<span class="tr-nums">${r.osm?fmt(Math.round(r.osm[years[0]]))+" → "+fmt(Math.round(r.osm[years[years.length-1]])):""}</span></div>
        <div class="tr-cell-c">${fmtChg(r.osmChg)} <span class="tr-per">4 yrs</span></div></div>
      <div class="tr-cell"><div class="tr-cell-h">Search interest, "${(TRENDS.gt&&TRENDS.gt.kw&&TRENDS.gt.kw[r.p.id])||r.p.name}" ${chipFor("mod")}<span class="tr-catlvl">Google Trends index, ${TRENDS.gt?TRENDS.gt.geo:""} - estimated, not shops</span></div>
        <div class="tr-cell-b">${sparkline(r.gt,gtyears,150,34)}<span class="tr-nums">${r.gt?Math.round(r.gt[gtyears[0]])+" → "+Math.round(r.gt[gtyears[gtyears.length-1]]):"no series"}</span></div>
        <div class="tr-cell-c">${r.lowVol?'<span class="tr-nodata">low search volume - index too small to read</span>':`${fmtChg(r.gtChg)} <span class="tr-per">1 yr</span> · ${fmtChg(r.gtChg4)} <span class="tr-per">4 yrs</span>`}</div></div>
      <div class="tr-go"><button class="mini" data-try="${r.p.id}">Try this concept</button></div>
    </div>`).join("");
  box.querySelectorAll("[data-try]").forEach(b=>b.onclick=()=>{
    activePreset=b.dataset.try;
    concept=normalizeConcept(JSON.parse(JSON.stringify(PRESETS.find(p=>p.id===activePreset))));
    renderPresets();renderConcept();update();
    document.getElementById("concept").scrollIntoView({behavior:"smooth"});
  });
}

/* ----- premium: shared helpers ----- */
function segOptions(){return SEGMENTS.map(s=>`<option value="${s.id}">${s.name} (${s.borough})</option>`).join("");}
function havKm(a,b,c,d){const R=6371,t=Math.PI/180;const x=(c-a)*t, y=(d-b)*t;const h=Math.sin(x/2)**2+Math.cos(a*t)*Math.cos(c*t)*Math.sin(y/2)**2;return 2*R*Math.asin(Math.sqrt(h));}
const normCache={};
function normDemandFor(p){ // normalized demand-at-hours per segment for a preset concept
  if(normCache[p.id])return normCache[p.id];
  const raws=SEGS.map(s=>windowDemand(s,p));
  normCache[p.id]=norm(raws);
  return normCache[p.id];
}

/* ----- 1. gap finder ----- */
function runGapFinder(){
  const segId=$("gap-seg").value;
  const s=SEGMENTS.find(x=>x.id===segId);if(!s)return;
  const out=$("gap-results");out.innerHTML='<div class="saved-empty">Scoring 55 concepts against '+s.name+'...</div>';
  setTimeout(()=>{
    const rows=PRESETS.map(p=>{
      const nDem=normDemandFor(p);
      const d=nDem(windowDemand(s,p));
      const comp=catN(p.cat,s.osm[p.cat]);
      const gap=clamp(d*(1-0.65*comp)+0.15*(1-comp),0,1);
      return {p,gap,d,comp,count:s.osm[p.cat]||0};
    }).sort((a,b)=>b.gap-a.gap).slice(0,8);
    out.innerHTML=`<div class="gap-head">Most underserved concepts on <b>${s.name}</b> - high modelled demand at the concept's hours, low recorded supply ${chipFor("mod")}</div>`+
      rows.map((r,i)=>`<div class="gap-row"><span class="gap-n">${i+1}</span><div class="gap-main"><b>${r.p.name}</b><span class="tr-cat">${XCAT[r.p.cat]||r.p.cat} · ${r.count} recorded within 250 m</span></div><div class="rbar gapbar"><i style="width:${Math.round(r.gap*100)}%"></i></div><span class="gap-v">${Math.round(r.gap*100)}</span><button class="mini" data-gaptry="${r.p.id}">Score it here</button></div>`).join("")+
      `<div class="prem-note">Gap = demand at the concept's trading hours (normalised across London) tempered by how saturated the category already is within 250 m. Demand anchors are station flows; supply is OpenStreetMap. A gap is an hypothesis to walk and count, not a guarantee.</div>`;
    out.querySelectorAll("[data-gaptry]").forEach(b=>b.onclick=()=>{
      activePreset=b.dataset.gaptry;
      concept=normalizeConcept(JSON.parse(JSON.stringify(PRESETS.find(p=>p.id===activePreset))));
      renderPresets();renderConcept();update();selectSegment(segId,true);
    });
  },30);
}

/* ----- 2. inverse mode: I already have premises ----- */
async function runInverse(){
  const addr=$("inv-addr").value.trim();
  const size=parseFloat($("inv-size").value)||70;
  const rent=parseFloat($("inv-rent").value)||600;
  const out=$("inv-results");
  out.innerHTML='<div class="saved-empty">Locating your premises...</div>';
  let seg=null,via=null;
  if(addr){
    try{
      const resp=await fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=gb&q="+encodeURIComponent(addr));
      const js=await resp.json();
      if(js&&js.length){
        const la=+js[0].lat,lo=+js[0].lon;
        let best=1e9;
        SEGMENTS.forEach(s=>{const d=havKm(la,lo,s.lat,s.lng);if(d<best){best=d;seg=s;}});
        via=`geocoded "${addr}" - nearest scored street: ${seg.name}, ${best.toFixed(1)} km away`;
      }
    }catch(e){}
    if(!seg){
      const q=addr.toLowerCase();
      seg=SEGMENTS.find(s=>s.name.toLowerCase().includes(q)||q.includes(s.name.toLowerCase().split(",")[0]));
      if(seg)via=`matched by name to ${seg.name}`;
    }
  }
  if(!seg){seg=SEGMENTS.find(s=>s.id===$("inv-seg").value)||SEGMENTS[0];via=`using chosen street ${seg.name} (no geocode match)`;}
  out.innerHTML='<div class="saved-empty">Scoring 55 concepts for a '+size+' m² unit at '+money(rent)+'/m² on '+seg.name+'...</div>';
  setTimeout(()=>{
    const rows=PRESETS.map(p=>{
      const pc=normalizeConcept(JSON.parse(JSON.stringify(p)));
      pc.floorspace=size;pc.rent=rent;
      const nDem=normDemandFor(p);
      const crit=scoreSegment(seg,pc);
      crit.demand.score=nDem(windowDemand(seg,pc));
      const compN=catN(pc.cat,seg.osm[pc.cat]);
      crit.opportunity.score=clamp(nDem(windowDemand(seg,pc))*(1-0.65*compN)+0.15*(1-compN),0,1);
      let wsum=0,acc=0;for(const k in crit){acc+=crit[k].score*crit[k].w;wsum+=crit[k].w;}
      const rev=revenueFor(seg,pc);
      return {p,score:100*acc/wsum,rev,crit};
    }).sort((a,b)=>b.score-a.score).slice(0,10);
    out.innerHTML=`<div class="gap-head">Best concepts for your premises - ${via} ${chipFor("mod")}</div>`+
      rows.map((r,i)=>{
        const top=Object.values(r.crit).sort((a,b)=>b.score*b.w-a.score*a.w)[0];
        return `<div class="gap-row"><span class="gap-n">${i+1}</span><div class="gap-main"><b>${r.p.name}</b><span class="tr-cat">strongest: ${top.label.toLowerCase()}</span></div><span class="gap-score">${Math.round(r.score)}</span><span class="gap-rev">${money(r.rev.month)}/mo</span></div>`;
      }).join("")+
      `<div class="prem-note">Your size and rent replace each concept's defaults; every other input stays at the concept template. Scores and revenues are MODELLED with the same engine as the map - open any concept on the site to inspect the full evidence for this street.</div>`;
  },30);
}

/* ----- 3. stress test ----- */
function runStress(){
  const segId=$("stress-seg").value;
  const s=SEGMENTS.find(x=>x.id===segId);if(!s)return;
  const c=concept;
  const cloneFlow=f=>{const ns=JSON.parse(JSON.stringify(s));for(const k in ns.flow.days)ns.flow.days[k]*=f;return ns;};
  const cloneComp=extra=>{const ns=JSON.parse(JSON.stringify(s));ns.osm[c.cat]=(ns.osm[c.cat]||0)+extra;return ns;};
  const both=()=>{const ns=cloneFlow(0.8);ns.osm[c.cat]=(ns.osm[c.cat]||0)+1;return ns;};
  const rows=[
    ["Today (base)",revenueFor(s,c)],
    ["Footfall drops 20%",revenueFor(cloneFlow(0.8),c)],
    ["A strong competitor opens next door",revenueFor(cloneComp(1),c)],
    ["Both at once",revenueFor(both(),c)],
  ];
  const base=rows[0][1].month||1;
  $("stress-results").innerHTML=`<div class="gap-head">Stress test: "${c.name}" on ${s.name} ${chipFor("mod")}</div>
    <table class="stress-table"><thead><tr><th>Scenario</th><th>Est. monthly revenue</th><th>Range</th><th>vs today</th></tr></thead><tbody>
    ${rows.map(([l,r])=>`<tr><td>${l}</td><td><b>${money(r.month)}</b></td><td>${money(r.low)} - ${money(r.high)}</td><td class="chg ${r.month>=base?"up":"down"}">${r.month>=base?"+":""}${((r.month-base)/base*100).toFixed(0)}%</td></tr>`).join("")}
    </tbody></table>
    <div class="prem-note">Assumptions: the 20% shock scales the station-flow anchor in every day type; a strong competitor is one extra same-category venue inside 250 m in the dilution term; capture rate, audience fit, ticket and capacity are unchanged. MODELLED sensitivity, not a forecast.</div>`;
}

/* ----- wire up ----- */
(function initExtras(){
  const ts=$("trend-sort");if(ts)ts.onchange=()=>{trendSort=ts.value;renderTrends();};
  renderTrends();
  const gs=$("gap-seg");if(gs){gs.innerHTML=segOptions();$("gap-run").onclick=runGapFinder;}
  const is_=$("inv-seg");if(is_){is_.innerHTML=segOptions();$("inv-run").onclick=runInverse;}
  const ss=$("stress-seg");if(ss){ss.innerHTML=segOptions();$("stress-run").onclick=runStress;
    // keep stress street synced with the currently selected street
    const _sel=selectSegment;
    selectSegment=function(id,scroll){_sel(id,scroll);const dd=$("stress-seg");if(dd&&SEGMENTS.some(s=>s.id===id))dd.value=id;const gd=$("gap-seg");if(gd&&SEGMENTS.some(s=>s.id===id))gd.value=id;};
  }
})();
