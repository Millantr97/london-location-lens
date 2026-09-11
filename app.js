/* London Location Lens - concept builder, scoring engine, rendering */
"use strict";

const DAYNAMES=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const DAYTYPE=[ "mon","mid","mid","mid","fri","sat","sun"]; // index 0=Mon
const DAYPARTS=[
  {k:"early",label:"Early 06:00-10:00",from:360,to:600},
  {k:"midday",label:"Midday 10:00-15:00",from:600,to:900},
  {k:"afternoon",label:"Afternoon 15:00-18:00",from:900,to:1080},
  {k:"evening",label:"Evening 18:00-22:00",from:1080,to:1320},
  {k:"late",label:"Late 22:00-02:00",from:1320,to:1560},
];
const AUDIENCES=[
  ["office","Office workers"],["residents","Local residents"],["young","Young professionals (20-39)"],
  ["students","Students"],["tourists","Tourists & visitors"],["nightlife","Nightlife crowd"],["families","Families"],
];

const PRESETS=[
 {id:"specialty-coffee",name:"Specialty coffee & brunch",cat:"cafe",ticket:12,seats:32,floorspace:70,takeaway:45,delivery:5,alcohol:false,terrace:true,franchise:false,
  audience:{office:4,residents:4,young:5,students:2,tourists:2,nightlife:0,families:2},rent:700,
  windows:[{days:[0,1,2,3,4],from:420,to:660},{days:[5,6],from:540,to:900}]},
 {id:"coffee-kiosk",name:"Grab-and-go coffee kiosk",cat:"cafe",ticket:6,seats:0,floorspace:15,takeaway:100,delivery:0,alcohol:false,terrace:false,franchise:false,
  audience:{office:5,residents:2,young:3,students:2,tourists:2,nightlife:0,families:0},rent:900,
  windows:[{days:[0,1,2,3,4],from:390,to:630}]},
 {id:"bakery",name:"Bakery & patisserie",cat:"cafe",ticket:9,seats:12,floorspace:60,takeaway:70,delivery:10,alcohol:false,terrace:false,franchise:false,
  audience:{office:3,residents:5,young:3,students:1,tourists:2,nightlife:0,families:4},rent:500,
  windows:[{days:[0,1,2,3,4],from:450,to:840},{days:[5,6],from:480,to:900}]},
 {id:"tapas-wine",name:"Tapas & wine bar",cat:"restaurant",ticket:38,seats:48,floorspace:110,takeaway:0,delivery:0,alcohol:true,terrace:true,franchise:false,
  audience:{office:2,residents:4,young:4,students:0,tourists:3,nightlife:4,families:0},rent:650,
  windows:[{days:[1,2,3],from:1020,to:1380},{days:[4,5],from:1020,to:1500},{days:[6],from:720,to:1080}]},
 {id:"casual-dining",name:"Casual dining restaurant",cat:"restaurant",ticket:24,seats:60,floorspace:130,takeaway:15,delivery:15,alcohol:true,terrace:false,franchise:false,
  audience:{office:3,residents:4,young:3,students:1,tourists:3,nightlife:2,families:3},rent:500,
  windows:[{days:[0,1,2,3,4,5,6],from:720,to:900},{days:[0,1,2,3,4,5,6],from:1080,to:1350}]},
 {id:"fine-dining",name:"Fine dining",cat:"restaurant",ticket:85,seats:40,floorspace:150,takeaway:0,delivery:0,alcohol:true,terrace:false,franchise:false,
  audience:{office:3,residents:3,young:2,students:0,tourists:4,nightlife:2,families:0},rent:900,
  windows:[{days:[1,2,3,4,5],from:1080,to:1410}]},
 {id:"pub-food",name:"Pub with kitchen",cat:"pub_bar",ticket:22,seats:70,floorspace:180,takeaway:0,delivery:0,alcohol:true,terrace:true,franchise:false,
  audience:{office:3,residents:5,young:3,students:1,tourists:2,nightlife:3,families:3},rent:550,
  windows:[{days:[0,1,2,3,4,5,6],from:720,to:1380}]},
 {id:"cocktail-bar",name:"Cocktail & natural wine bar",cat:"pub_bar",ticket:30,seats:36,floorspace:80,takeaway:0,delivery:0,alcohol:true,terrace:false,franchise:false,
  audience:{office:2,residents:3,young:5,students:1,tourists:3,nightlife:5,families:0},rent:700,
  windows:[{days:[2,3,4,5],from:1080,to:1560}]},
 {id:"fried-chicken",name:"Fried chicken fast food",cat:"fast_food",ticket:11,seats:24,floorspace:80,takeaway:60,delivery:35,alcohol:false,terrace:false,franchise:false,
  audience:{office:2,residents:4,young:4,students:4,tourists:1,nightlife:3,families:2},rent:450,
  windows:[{days:[0,1,2,3,4,5,6],from:660,to:1380}]},
 {id:"pizza-slice",name:"Pizza by the slice",cat:"fast_food",ticket:9,seats:16,floorspace:60,takeaway:70,delivery:20,alcohol:false,terrace:false,franchise:false,
  audience:{office:3,residents:3,young:4,students:4,tourists:2,nightlife:4,families:1},rent:550,
  windows:[{days:[0,1,2,3,4,5,6],from:690,to:900},{days:[3,4,5],from:1020,to:1500}]},
 {id:"convenience",name:"Convenience & grocery",cat:"grocery",ticket:8,seats:0,floorspace:120,takeaway:100,delivery:10,alcohol:false,terrace:false,franchise:true,
  audience:{office:2,residents:5,young:2,students:3,tourists:1,nightlife:2,families:4},rent:400,
  windows:[{days:[0,1,2,3,4,5,6],from:420,to:1380}]},
 {id:"deli",name:"Specialty food & deli",cat:"grocery",ticket:16,seats:8,floorspace:70,takeaway:50,delivery:5,alcohol:false,terrace:false,franchise:false,
  audience:{office:2,residents:5,young:3,students:0,tourists:2,nightlife:0,families:4},rent:450,
  windows:[{days:[0,1,2,3,4,5],from:480,to:1080}]},
 {id:"boutique-fitness",name:"Boutique fitness studio",cat:"fitness",ticket:25,seats:20,floorspace:150,takeaway:0,delivery:0,alcohol:false,terrace:false,franchise:false,
  audience:{office:3,residents:4,young:5,students:1,tourists:0,nightlife:0,families:1},rent:500,
  windows:[{days:[0,1,2,3,4],from:390,to:540},{days:[0,1,2,3,4],from:1050,to:1230},{days:[5,6],from:540,to:720}]},
 {id:"flex-workspace",name:"Flexible workspace",cat:"cowork",ticket:35,seats:120,floorspace:400,takeaway:0,delivery:0,alcohol:false,terrace:false,franchise:true,
  audience:{office:5,residents:2,young:3,students:1,tourists:0,nightlife:0,families:0},rent:650,
  windows:[{days:[0,1,2,3,4],from:480,to:1080}]},
 {id:"dessert",name:"Dessert & bubble tea",cat:"cafe",ticket:8,seats:20,floorspace:60,takeaway:60,delivery:20,alcohol:false,terrace:false,franchise:false,
  audience:{office:1,residents:3,young:4,students:5,tourists:3,nightlife:3,families:2},rent:600,
  windows:[{days:[0,1,2,3,4,5,6],from:720,to:1320}]},
];

const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const fmt=n=>n>=1e6?(n/1e6).toFixed(1)+"m":n>=1e3?Math.round(n/1e3)+"k":Math.round(n);
const money=n=>"£"+Math.round(n).toLocaleString("en-GB");
const mm=v=>{let h=Math.floor(v/60)%24,m=v%60;return String(h).padStart(2,"0")+":"+String(m).padStart(2,"0")};

/* ---------- concept state ---------- */
let concept=JSON.parse(JSON.stringify(PRESETS[0]));
let activePreset=PRESETS[0].id;

/* ---------- precomputation over baked segments ---------- */
const SEGS=SEGMENTS;
function norm(vals){const lo=Math.min(...vals),hi=Math.max(...vals);return v=>hi>lo?(v-lo)/(hi-lo):0.5;}
const logNorm=vals=>{const lv=vals.map(v=>Math.log10(1+v));const f=norm(lv);return v=>f(Math.log10(1+v));};

const nFlowAnnualV=logNorm(SEGS.map(s=>s.flow.annual_total));const nFlowAnnual=s=>nFlowAnnualV(s.flow.annual_total);
const nStationsV=norm(SEGS.map(s=>s.transport.stations_900m));const nStations=s=>nStationsV(s.transport.stations_900m);
const nResidentsV=logNorm(SEGS.map(s=>s.lsoa.residents));const nResidents=s=>nResidentsV(s.lsoa.residents);
const nStudentsV=norm(SEGS.map(s=>s.lsoa.pct_students));const nStudents=s=>nStudentsV(s.lsoa.pct_students);
const nYoungV=norm(SEGS.map(s=>s.lsoa.pct20_39*0.5+s.lsoa.pct_prof*0.5));const nYoung=s=>nYoungV(s.lsoa.pct20_39*0.5+s.lsoa.pct_prof*0.5);
const nCultureV=logNorm(SEGS.map(s=>s.osm.culture));const nCulture=s=>nCultureV(s.osm.culture);
const nNightV=logNorm(SEGS.map(s=>s.osm.pub_bar));const nNight=s=>nNightV(s.osm.pub_bar);
const nParksV=norm(SEGS.map(s=>s.osm.parks_600));const nParks=s=>nParksV(s.osm.parks_600);
const nCoworkV=logNorm(SEGS.map(s=>s.osm.cowork));const nCowork=s=>nCoworkV(s.osm.cowork);
const nFamiliesV=norm(SEGS.map(s=>s.lsoa.pct_under20*0.6+s.osm.parks_600*8));const nFamilies=s=>nFamiliesV(s.lsoa.pct_under20*0.6+s.osm.parks_600*8);
const nSpendV=norm(SEGS.map(s=>s.model.spend_est));const nSpend=s=>nSpendV(s.model.spend_est);
const nCrimeV=norm(SEGS.map(s=>s.crime.per1000));const nCrime=s=>nCrimeV(s.crime.per1000);
const CATNORM={};
["cafe","restaurant","fast_food","pub_bar","grocery","fitness","cowork"].forEach(c=>{
  CATNORM[c]=norm(SEGS.map(s=>Math.log10(1+(s.osm[c]||0))));
});
const catN=(c,v)=>CATNORM[c]?CATNORM[c](Math.log10(1+(v||0))):0.5;

function audienceSupply(s){
  return {
    office:0.55*nCowork(s)+0.45*s.model.office_skew,
    residents:nResidents(s),
    young:nYoung(s),
    students:nStudents(s),
    tourists:clamp(0.6*nCulture(s)+0.4*s.flow.weekend_ratio_norm,0,1),
    nightlife:clamp(0.55*nNight(s)+0.45*s.flow.fri_sat_norm,0,1),
    families:nFamilies(s),
  };
}

/* demand-at-hours: concept windows vs segment rhythm + real day flows */
function windowDemand(s,c){
  let tot=0;
  for(const w of c.windows){
    for(const d of w.days){
      const dayRel=s.flow.day_rel[DAYTYPE[d]]; // relative daily flow, mid=1
      for(const dp of DAYPARTS){
        const a=Math.max(w.from,dp.from), b=Math.min(w.to,dp.to);
        if(b>a){ tot += dayRel * s.model.rhythm[dp.k] * ((b-a)/(dp.to-dp.from)); }
      }
    }
  }
  return tot; // expected share-of-week relevance
}
const allDemand=s=>windowDemand(s,concept);

/* scoring */
function scoreSegment(s,c){
  const sup=audienceSupply(s);
  const aw=c.audience, awSum=Object.values(aw).reduce((a,b)=>a+b,0);
  const audFit=awSum?Object.keys(aw).reduce((acc,k)=>acc+aw[k]*sup[k],0)/awSum:0.5;

  const demandRaw=allDemand(s);
  const compN=catN(c.cat,s.osm[c.cat]);
  const chainShare=s.osm[c.cat]? (s.osm[c.cat+"_chain"]||0)/s.osm[c.cat]:0;

  const rv=s.rent.retail_rv_m2;
  const rentFit=rv?clamp(c.rent/rv,0,1):0.5;

  const ticketGap=Math.abs(c.ticket-s.model.spend_est)/Math.max(s.model.spend_est,1);
  const ticketFit=clamp(1-ticketGap*1.4,0,1);

  // format fit: average of the relevant sub-signals
  let ff=[],ffw=[];
  if(c.takeaway>25){ff.push(nFlowAnnual(s));ffw.push(1);}
  if(c.delivery>15){ff.push(0.6*nResidents(s)+0.4*nYoung(s));ffw.push(1);}
  if(c.alcohol){ff.push(sup.nightlife);ffw.push(1);}
  if(c.terrace){ff.push(clamp(0.5*s.osm.terrace_share+0.5*nParks(s),0,1));ffw.push(1);}
  if(c.franchise){ff.push(clamp(0.5+chainShare*0.5,0,1));ffw.push(0.6);}
  else {ff.push(clamp(1-chainShare*0.9,0,1));ffw.push(0.6);}
  const formatFit=ff.length?ff.reduce((a,b,i)=>a+b*ffw[i],0)/ffw.reduce((a,b)=>a+b,0):0.5;

  const access=clamp(0.5*nFlowAnnual(s)+0.5*nStations(s),0,1);
  const safety=1-nCrime(s);
  const green=nParks(s);

  const crit={
    demand:{score:0,raw:demandRaw,w:0.24,label:"Demand at your hours",how:"obs+mod"},
    audience:{score:audFit,w:0.18,label:"Audience match",how:"obs+ctx"},
    opportunity:{score:0,w:0.16,label:"Demand vs competition",how:"obs+mod"},
    ticket:{score:ticketFit,w:0.10,label:"Ticket fit",how:"mod"},
    rent:{score:rentFit,w:0.12,label:"Rent fit",how:"ctx"},
    format:{score:formatFit,w:0.10,label:"Format fit",how:"obs+mod"},
    access:{score:access,w:0.07,label:"Transport access",how:"obs"},
    safety:{score:safety,w:0.02,label:"Business crime (inverse)",how:"ctx"},
    green:{score:green,w:0.01,label:"Green space",how:"obs"},
  };
  // weight tweaks from concept attributes
  if(c.delivery>30){crit.audience.w+=0.04;crit.demand.w-=0.04;}
  if(c.alcohol){crit.format.w+=0.03;crit.safety.w+=0.01;crit.green.w-=0.01;crit.access.w-=0.03;}
  if(c.terrace){crit.green.w+=0.03;crit.demand.w-=0.03;}
  return crit;
}

/* second pass needs demand normalization across segments */
function computeAll(c){
  const raws=SEGS.map(s=>windowDemand(s,c));
  const nDem=norm(raws);
  const out=SEGS.map((s,i)=>{
    const crit=scoreSegment(s,c);
    crit.demand.score=nDem(raws[i]);
    // opportunity: demand tempered by saturation
    const compN=catN(c.cat,s.osm[c.cat]);
    crit.opportunity.score=clamp(nDem(raws[i])*(1-0.65*compN)+0.15*(1-compN),0,1);
    let wsum=0,acc=0;
    for(const k in crit){acc+=crit[k].score*crit[k].w;wsum+=crit[k].w;}
    return {seg:s,crit,score:100*acc/wsum};
  });
  out.sort((a,b)=>b.score-a.score);
  return out;
}

/* ---------- concept UI ---------- */
function chipFor(how){
  return how==="obs"?' <span class="chip obs">OBSERVED</span>':how==="ctx"?' <span class="chip ctx">AREA CONTEXT</span>':how==="cur"?' <span class="chip cur">CURATED</span>':' <span class="chip mod">MODELLED</span>';
}

function renderPresets(){
  $("preset-row").innerHTML=PRESETS.map(p=>`<button class="preset ${p.id===activePreset?'active':''}" data-p="${p.id}">${p.name}</button>`).join("");
  document.querySelectorAll(".preset").forEach(b=>b.onclick=()=>{
    activePreset=b.dataset.p; concept=JSON.parse(JSON.stringify(PRESETS.find(p=>p.id===activePreset)));
    renderConcept(); update();
  });
}

function sliderField(label,key,min,max,step,fmtf){
  return `<div class="field"><label>${label}<b id="v-${key}">${fmtf(concept[key])}</b></label>
  <input type="range" min="${min}" max="${max}" step="${step}" value="${concept[key]}" data-k="${key}"></div>`;
}

function renderConcept(){
  const c=concept;
  const audRows=AUDIENCES.map(([k,label])=>`
    <div class="aud-row"><span>${label}</span><input type="range" min="0" max="5" step="1" value="${c.audience[k]}" data-aud="${k}"><span class="val" id="av-${k}">${c.audience[k]}</span></div>`).join("");
  $("concept-grid").innerHTML=`
  <div class="cg-card"><h3>Format &amp; offer</h3>
    ${sliderField("Average ticket (per person)","ticket",3,120,1,money)}
    ${sliderField("Seats / capacity","seats",0,200,2,v=>v)}
    ${sliderField("Floorspace (m²)","floorspace",15,400,5,v=>v+" m²")}
    ${sliderField("Takeaway share of sales","takeaway",0,100,5,v=>v+"%")}
    ${sliderField("Delivery share of sales","delivery",0,100,5,v=>v+"%")}
    <div class="toggles">
      <span class="tog ${c.alcohol?'on':''}" data-tog="alcohol">Alcohol licence</span>
      <span class="tog ${c.terrace?'on':''}" data-tog="terrace">Outdoor terrace</span>
      <span class="tog ${c.franchise?'on':''}" data-tog="franchise">Franchise / chain format</span>
    </div>
  </div>
  <div class="cg-card"><h3>Opening windows <span style="font-weight:500;color:var(--muted);font-size:12px">exact days and hours</span></h3>
    <div class="win-list" id="win-list"></div>
    <button class="add-win" id="add-win">+ Add a trading window</button>
  </div>
  <div class="cg-card"><h3>Target audience <span style="font-weight:500;color:var(--muted);font-size:12px">0 = irrelevant, 5 = core</span></h3>
    ${audRows}
  </div>
  <div class="cg-card"><h3>Money</h3>
    ${sliderField("Rent tolerance (rateable-value proxy, £/m²/yr)","rent",100,1500,25,v=>money(v)+"/m²")}
    <p style="font-size:12px;color:var(--muted)">Compared with the borough's VOA retail rateable value per m²${chipFor("ctx")} - a proxy for occupancy cost, not a quote for a specific unit.</p>
  </div>`;
  document.querySelectorAll("[data-k]").forEach(el=>el.oninput=()=>{
    concept[el.dataset.k]=+el.value;
    const f={ticket:money,rent:v=>money(v)+"/m²",floorspace:v=>v+" m²",takeaway:v=>v+"%",delivery:v=>v+"%",seats:v=>v}[el.dataset.k]||(v=>v);
    $("v-"+el.dataset.k).textContent=f(+el.value); update();
  });
  document.querySelectorAll("[data-tog]").forEach(el=>el.onclick=()=>{
    concept[el.dataset.tog]=!concept[el.dataset.tog]; el.classList.toggle("on"); update();
  });
  document.querySelectorAll("[data-aud]").forEach(el=>el.oninput=()=>{
    concept.audience[el.dataset.aud]=+el.value; $("av-"+el.dataset.aud).textContent=el.value; update();
  });
  renderWindows();
  $("add-win").onclick=()=>{concept.windows.push({days:[1,2,3],from:1020,to:1320});renderWindows();update();};
}

function renderWindows(){
  const hourOpts=v=>{let o="";for(let m=0;m<=1560;m+=30){o+=`<option value="${m}" ${m===v?"selected":""}>${mm(m)}</option>`;}return o;};
  $("win-list").innerHTML=concept.windows.map((w,i)=>`
    <div class="win">
      <div class="days">${DAYNAMES.map((d,di)=>`<span class="day ${w.days.includes(di)?'on':''}" data-w="${i}" data-d="${di}">${d}</span>`).join("")}</div>
      <div class="times"><select data-wfrom="${i}">${hourOpts(w.from)}</select> to <select data-wto="${i}">${hourOpts(w.to)}</select>
      <button class="del" data-wdel="${i}" title="Remove window">×</button></div>
    </div>`).join("");
  document.querySelectorAll(".day").forEach(el=>el.onclick=()=>{
    const w=concept.windows[+el.dataset.w],d=+el.dataset.d;
    w.days=w.days.includes(d)?w.days.filter(x=>x!==d):[...w.days,d].sort();
    el.classList.toggle("on"); update();
  });
  document.querySelectorAll("[data-wfrom]").forEach(el=>el.onchange=()=>{concept.windows[+el.dataset.wfrom].from=+el.value;update();});
  document.querySelectorAll("[data-wto]").forEach(el=>el.onchange=()=>{concept.windows[+el.dataset.wto].to=+el.value;update();});
  document.querySelectorAll("[data-wdel]").forEach(el=>el.onclick=()=>{concept.windows.splice(+el.dataset.wdel,1);renderWindows();update();});
}

/* ---------- map ---------- */
let map,markers={};
function scoreColor(v){const hue=v*1.2;return `hsl(${hue},70%,72%)`;}
function initMap(){
  map=L.map("leaflet-map").setView([51.515,-0.11],12);
  L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",{attribution:'Tiles &copy; Esri - Esri, DeLorme, NAVTEQ · Data &copy; OpenStreetMap contributors',maxZoom:16}).addTo(map);
  SEGS.forEach(s=>{
    const m=L.marker([s.lat,s.lng],{icon:L.divIcon({className:"leaflet-div-icon",html:`<div class="pin" style="background:#ddd"><span>·</span></div>`,iconSize:[26,26],iconAnchor:[13,26]})}).addTo(map);
    m.on("click",()=>selectSegment(s.id));
    markers[s.id]=m;
  });
}
function paintMarkers(ranked){
  const byId={}; ranked.forEach(r=>byId[r.seg.id]=r.score);
  SEGS.forEach(s=>{
    const v=byId[s.id];
    markers[s.id].setIcon(L.divIcon({className:"leaflet-div-icon",
      html:`<div class="pin" style="background:${scoreColor(v/100)}"><span>${Math.round(v)}</span></div>`,iconSize:[26,26],iconAnchor:[13,26]}));
    markers[s.id].setZIndexOffset(Math.round(v*10));
  });
}

/* ---------- ranking list ---------- */
let rankedCache=[];
function renderRankings(ranked){
  rankedCache=ranked;
  $("rank-list").innerHTML=ranked.map((r,i)=>{
    const s=r.seg;
    return `<div class="rank-row" data-sel="${s.id}">
      <div class="rank-num">${i+1}</div>
      <div class="rank-name">${s.name}<span class="sub">${s.zone} · ${s.borough}</span></div>
      <div class="cell"><span class="scorepill">${Math.round(r.score)}</span></div>
      <div class="cell"><span class="v">${Math.round(r.crit.demand.score)}</span><span class="k">Demand@hours</span></div>
      <div class="cell opt"><span class="v">${Math.round(r.crit.opportunity.score)}</span><span class="k">Opportunity</span></div>
      <div class="cell opt"><span class="v">${Math.round(r.crit.rent.score)}</span><span class="k">Rent fit</span></div>
      <div class="cell opt"><span class="v">${Math.round(r.crit.access.score)}</span><span class="k">Access</span></div>
    </div>`;
  }).join("");
  document.querySelectorAll("[data-sel]").forEach(el=>el.onclick=()=>selectSegment(el.dataset.sel,true));
}

/* ---------- detail panel ---------- */
let selected=null;
function selectSegment(id,scroll){
  selected=id;
  document.querySelectorAll(".rank-row").forEach(el=>el.classList.toggle("sel",el.dataset.sel===id));
  const r=rankedCache.find(x=>x.seg.id===id); if(!r)return;
  const s=r.seg;
  const fl=s.flow;
  const maxDay=Math.max(...Object.values(fl.days));
  const dayBars=[["Mon","mon"],["Tue-Thu","mid"],["Fri","fri"],["Sat","sat"],["Sun","sun"]].map(([l,k])=>
    `<div class="col"><div class="b" style="height:${Math.max(2,80*fl.days[k]/maxDay)}px"></div><div class="t">${l}</div></div>`).join("");
  const windowsTxt=concept.windows.map(w=>`${w.days.map(d=>DAYNAMES[d]).join(" ")} ${mm(w.from)}-${mm(w.to%1560)}`).join(" · ")||"no windows set";
  const catCount=s.osm[concept.cat]||0, catChain=s.osm[concept.cat+"_chain"]||0;

  const critRows=Object.values(r.crit).sort((a,b)=>b.w-a.w).map(cr=>`
    <div class="crit-row"><div>${cr.label}${chipFor(cr.how==="obs"?"obs":cr.how==="ctx"?"ctx":"mod")}</div>
    <div class="bar"><i class="${cr.score<0.4?'neg':''}" style="width:${Math.round(cr.score*100)}%"></i></div>
    <div class="cw">${Math.round(cr.score*100)} · w ${(cr.w*100).toFixed(0)}%</div></div>`).join("");

  const anchors=s.anchors.map(a=>`<div class="ev-line"><span class="lv">${a.station} (${a.mode})</span><span class="rv">${fmt(a.annual)}/yr</span></div>`).join("");
  const stn=s.transport.names.slice(0,6).map(n=>`<div class="ev-line"><span class="lv">${n}</span></div>`).join("");
  const topEth=s.lsoa.top_eth.map(([g,p])=>`<div class="ev-line"><span class="lv">${g}</span><span class="rv">${p}%</span></div>`).join("");

  const strengths=Object.values(r.crit).sort((a,b)=>b.score*b.w-a.score*a.w).slice(0,2);
  const weak=Object.values(r.crit).sort((a,b)=>a.score*b.w-b.score*b.w).slice(0,2);
  const pct=x=>Math.round(x*100);

  $("detail-empty").hidden=true; const dp=$("detail-panel"); dp.hidden=false;
  dp.innerHTML=`
  <div class="dp-head"><div><h2>${s.name}</h2><div class="zone">${s.zone} · ${s.borough} · segment type: ${s.stype.replace(/_/g," ")}${chipFor("cur")}</div></div>
  <div class="dp-score">${Math.round(r.score)}</div></div>
  <p class="dp-why"><b>For “${concept.name}”</b> trading ${windowsTxt}: strongest on ${strengths.map(x=>x.label.toLowerCase()).join(" and ")} (${strengths.map(x=>pct(x.score)).join(" / ")}); weakest on ${weak.map(x=>x.label.toLowerCase()).join(" and ")} (${weak.map(x=>pct(x.score)).join(" / ")}).</p>
  <div class="crit">${critRows}</div>
  <div class="dp-cols">
    <div class="ev-card"><h4>Movement at named stations${chipFor("obs")}</h4>
      ${anchors}
      <div class="ev-line"><span class="lv">Combined typical-day entries + exits (TfL NUMBAT 2024)</span></div>
      <div class="dayflow">${dayBars}</div>
      <div class="ev-line"><span class="lv">Weekend share of weekly flow</span><span class="rv">${Math.round(fl.weekend_share*100)}%</span></div>
      <div class="ev-line"><span class="lv">Stations within 900 m (OSM)</span><span class="rv">${s.transport.stations_900m}</span></div>
      ${stn}
      <div class="ev-line"><span class="lv">Station counts are demand anchors, not footfall on this pavement.</span></div>
    </div>
    <div class="ev-card"><h4>Street offer within 250 m${chipFor("obs")}</h4>
      <div class="ev-line"><span class="lv">Cafés</span><span class="rv">${s.osm.cafe} (${s.osm.cafe_chain} chain)</span></div>
      <div class="ev-line"><span class="lv">Restaurants</span><span class="rv">${s.osm.restaurant} (${s.osm.restaurant_chain} chain)</span></div>
      <div class="ev-line"><span class="lv">Fast food</span><span class="rv">${s.osm.fast_food}</span></div>
      <div class="ev-line"><span class="lv">Pubs &amp; bars</span><span class="rv">${s.osm.pub_bar}</span></div>
      <div class="ev-line"><span class="lv">Grocery &amp; food shops</span><span class="rv">${s.osm.grocery}</span></div>
      <div class="ev-line"><span class="lv">Gyms &amp; fitness</span><span class="rv">${s.osm.fitness}</span></div>
      <div class="ev-line"><span class="lv">Coworking spaces</span><span class="rv">${s.osm.cowork}</span></div>
      <div class="ev-line"><span class="lv">All other shops</span><span class="rv">${s.osm.shops}</span></div>
      <div class="ev-line"><span class="lv">Culture &amp; attractions</span><span class="rv">${s.osm.culture}</span></div>
      <div class="ev-line"><span class="lv">Food venues with outdoor seating</span><span class="rv">${Math.round(s.osm.terrace_share*100)}%</span></div>
      <div class="ev-line"><span class="lv">Competing “${concept.cat}” venues</span><span class="rv">${catCount} (${catChain} chain)</span></div>
      <div class="ev-line"><span class="lv">Source: OpenStreetMap extract ${META.osm_date}. Counts depend on mapper coverage.</span></div>
    </div>
    <div class="ev-card"><h4>Who lives around it · ${s.lsoa.name}${chipFor("ctx")}</h4>
      <div class="ev-line"><span class="lv">Usual residents (Census 2021)</span><span class="rv">${Math.round(s.lsoa.residents).toLocaleString("en-GB")}</span></div>
      <div class="ev-line"><span class="lv">Aged 20-39</span><span class="rv">${s.lsoa.pct20_39.toFixed(1)}%</span></div>
      <div class="ev-line"><span class="lv">Students (16+)</span><span class="rv">${s.lsoa.pct_students.toFixed(1)}%</span></div>
      <div class="ev-line"><span class="lv">Professional / managerial jobs</span><span class="rv">${s.lsoa.pct_prof.toFixed(1)}%</span></div>
      <div class="ev-line"><span class="lv">Born outside the UK</span><span class="rv">${s.lsoa.pct_nonuk.toFixed(1)}%</span></div>
      <div class="ev-line"><span class="lv">Ethnic diversity index (0-1)</span><span class="rv">${s.lsoa.diversity.toFixed(2)}</span></div>
      ${topEth}
      <div class="ev-line"><span class="lv">LSOA ≈ 1,500 residents. It describes residents, not the people walking this street.</span></div>
    </div>
    <div class="ev-card"><h4>Business crime, Sep 2025 - Aug 2026${chipFor("ctx")}</h4>
      <div class="ev-line"><span class="lv">Shoplifting</span><span class="rv">${s.crime.shoplifting}</span></div>
      <div class="ev-line"><span class="lv">Theft from the person</span><span class="rv">${s.crime.theft_person}</span></div>
      <div class="ev-line"><span class="lv">Business robbery</span><span class="rv">${s.crime.robbery_biz}</span></div>
      <div class="ev-line"><span class="lv">Business burglary</span><span class="rv">${s.crime.burglary_biz}</span></div>
      <div class="ev-line"><span class="lv">Relevant offences per 1,000 residents</span><span class="rv">${s.crime.per1000.toFixed(1)}</span></div>
      <div class="ev-line"><span class="lv">Source: Met Police LSOA totals (London Datastore). LSOA level, not street level.</span></div>
    </div>
    <div class="ev-card"><h4>Occupancy cost · ${s.borough}${chipFor("ctx")}</h4>
      <div class="ev-line"><span class="lv">Retail rateable value / m² (VOA, Mar 2023)</span><span class="rv">${money(s.rent.retail_rv_m2)}</span></div>
      <div class="ev-line"><span class="lv">Office rateable value / m²</span><span class="rv">${money(s.rent.office_rv_m2)}</span></div>
      <div class="ev-line"><span class="lv">Your tolerance</span><span class="rv">${money(concept.rent)}</span></div>
      <div class="ev-line"><span class="lv">Borough average across all retail stock; prime pitches on this street can be several times higher.</span></div>
    </div>
    <div class="ev-card"><h4>Modelled for this concept${chipFor("mod")}</h4>
      <div class="ev-line"><span class="lv">Estimated typical spend / person nearby</span><span class="rv">${money(s.model.spend_est)}</span></div>
      <div class="ev-line"><span class="lv">Weekday vs weekend rhythm</span><span class="rv">${fl.weekend_share>0.3?"weekend-leaning":"weekday-leaning"}</span></div>
      <div class="ev-line"><span class="lv">Office-worker skew</span><span class="rv">${Math.round(s.model.office_skew*100)}%</span></div>
      <div class="ev-line"><span class="lv">Rule: spend estimated from occupation mix, borough retail values and chain presence; rhythm from station day-flows plus the local offer mix. Rules are in Method.</span></div>
    </div>
  </div>`;
  if(scroll)dp.scrollIntoView({behavior:"smooth",block:"start"});
}

/* ---------- method ---------- */
function renderMethod(){
  $("method-grid").innerHTML=`
  <div class="m-card"><h4>Movement &amp; transport${chipFor("obs")}</h4>
    <p>Typical-day station entries and exits by day type (Mon / Tue-Thu / Fri / Sat / Sun) and annualised totals from TfL NUMBAT 2024 annual station counts, summed over the stations named for each segment. Stations within 900 m from OpenStreetMap.</p>
    <p><a href="https://crowding.data.tfl.gov.uk/Annual%20Station%20Counts/2024/AC2024_AnnualisedEntryExit_Public.xlsx">crowding.data.tfl.gov.uk - AC2024 Annualised Entry/Exit</a></p>
    <p>Resolution: named station, not the pavement. A station 400 m away on a desire line matters more than one across a railway.</p></div>
  <div class="m-card"><h4>Street offer &amp; competition${chipFor("obs")}</h4>
    <p>Counts of cafés, restaurants, fast food, pubs and bars, grocery and food shops, gyms, coworking spaces, other shops, culture venues and parks around each segment anchor (250 m for venues, 600 m parks, 900 m stations) from OpenStreetMap (${META.osm_date}). Chain flag from brand-name matching - approximate.</p>
    <p><a href="https://www.openstreetmap.org/copyright">openstreetmap.org (ODbL)</a> · <a href="https://overpass-api.de/">Overpass API</a></p>
    <p>Resolution: real points near the anchor, but coverage depends on mappers; treat counts as lower bounds.</p></div>
  <div class="m-card"><h4>Residents${chipFor("ctx")}</h4>
    <p>Census 2021 lower-layer super output area (LSOA) statistics for the segment anchor: age bands (TS007A), ethnic group (TS021), country of birth (TS004), occupation (TS063), economic activity and students (TS066). Office of for National Statistics via Nomis bulk files.</p>
    <p><a href="https://www.nomisweb.co.uk/sources/census_2021_bulk">nomisweb.co.uk - Census 2021 bulk downloads</a></p>
    <p>Resolution: LSOA (~1,500 residents). These are people who <i>live</i> here, not workers or visitors. The tool never claims street-level demographics.</p></div>
  <div class="m-card"><h4>Business crime${chipFor("ctx")}</h4>
    <p>Metropolitan Police recorded offences by LSOA, 12 months to August 2026: shoplifting, theft from the person, business robbery and business burglary, via the London Datastore MPS geographic breakdown.</p>
    <p><a href="https://data.london.gov.uk/dataset/mps-recorded-crime-geographic-breakdown">data.london.gov.uk - MPS recorded crime</a></p>
    <p>Resolution: LSOA. Under-reporting is common; use as a relative signal between areas, not an absolute risk figure.</p></div>
  <div class="m-card"><h4>Occupancy cost${chipFor("ctx")}</h4>
    <p>Rateable value per m² for retail and office stock by billing authority, Valuation Office Agency business floorspace statistics, 31 March 2023.</p>
    <p><a href="https://www.gov.uk/government/statistics/non-domestic-rating-stock-of-properties-including-business-floorspace-2023">gov.uk - NDR business floorspace 2023</a></p>
    <p>Resolution: borough average. Prime frontage on a specific street can cost several times the borough mean. Always get agent quotes.</p></div>
  <div class="m-card"><h4>Modelled layers${chipFor("mod")}</h4>
    <p>Three estimates the tool computes and labels: (1) typical spend per person - from resident occupation mix, borough retail rateable value and chain presence; (2) office-worker skew - from coworking density and weekday-weighted station flows; (3) intraday rhythm - station day-type flows spread across five dayparts using the local offer mix (food, retail, nightlife, culture). Rules are fixed and shown so you can argue with them.</p>
    <p>These are the layers to override with your own counts before committing money.</p></div>
  <div class="m-card"><h4>Coverage</h4>
    <p>${SEGS.length} named street segments across TfL Zones 1-3, chosen as recognisable commercial pitches. It is not yet every street: the data pipeline (station flows, POI counts, LSOA joins) scales to more segments as they are added.</p>
    <p>Built ${META.built}. Prototype for shortlisting, not a valuation.</p></div>`;
}

/* ---------- main loop ---------- */
function update(){
  const ranked=computeAll(concept);
  paintMarkers(ranked);
  renderRankings(ranked);
  if(selected)selectSegment(selected,false);
}

renderPresets(); renderConcept(); renderMethod(); initMap(); update();
