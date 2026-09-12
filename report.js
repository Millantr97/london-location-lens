/* ---------- slide report (client-side, printable) ---------- */
(function(){
const esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const AUDL={office:"Office workers",residents:"Local residents",young:"Young 20-39",students:"Students",tourists:"Tourists & visitors",nightlife:"Nightlife crowd",families:"Families",intl:"International / born abroad"};
const CATL={cafe:"Café",restaurant:"Restaurant",fast_food:"Fast food",pub_bar:"Pub / bar",grocery:"Grocery & food shop",fitness:"Gym / fitness",cowork:"Coworking"};
const chip=t=>t==="obs"?'<span class="chip obs">OBSERVED</span>':t==="ctx"?'<span class="chip ctx">AREA CONTEXT</span>':t==="cur"?'<span class="chip cur">CURATED</span>':'<span class="chip mod">MODELLED</span>';
const kv=(l,v,t)=>`<div class="rkv"><span class="rl">${l}${t?chip(t):""}</span><span class="rv">${v}</span></div>`;
const bar=(l,pct,t,extra)=>`<div class="rbar-row"><div class="rbar-l">${l}${t?chip(t):""}</div><div class="rbar"><i style="width:${Math.max(1,Math.round(pct))}%"></i></div><div class="rbar-v">${extra??Math.round(pct)}</div></div>`;
const slide=(n,total,kicker,title,body)=>`<section class="rslide"><div class="rslide-in">
  <div class="rslide-top"><span class="rkick">${kicker}</span><span class="rpage">${n} / ${total}</span></div>
  <h3 class="rtitle">${title}</h3>${body}
  <div class="rfoot"><span>${CITY.name} <b>Location Potential</b></span><span class="rfoot-d"></span></div>
</div></section>`;

function buildReport(id){
  const r=rowFor(id); if(!r)return null;
  const s=r.seg, c=concept, fl=s.flow, rev=r.rev;
  const today=new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"});
  const sup=audienceSupply(s);
  const aw={...c.audience}; if(c.family)aw.families=Math.min(10,(aw.families||0)+3);
  const catCount=compCount(s,c.cat), catChain=compChain(s,c.cat);
  const compList=((typeof COMPETITORS!=="undefined"?COMPETITORS[s.id]:null)||{})[c.cat]||[];
  const R=REV[c.cat]||REV.cafe;
  const windowsTxt=c.windows.map(w=>`${w.days.map(d=>DAYNAMES[d]).join(" ")} ${mm(w.from)}-${mm(w.to%1560)}`).join(" · ")||"no windows set";
  const strengths=Object.values(r.crit).sort((a,b)=>b.score*b.w-a.score*a.w).slice(0,2);
  const weak=Object.values(r.crit).sort((a,b)=>a.score*b.w-b.score*b.w).slice(0,2);
  const pct=x=>Math.round(x*100);
  const T=11; let n=0;

  /* S1 cover */
  const rank=(typeof rankedCache!=="undefined"&&rankedCache.length)?rankedCache.indexOf(r)+1:0;
  const s1=`<section class="rslide rcover"><div class="rslide-in">
    <div class="rcover-brand">${CITY.name} <b>Location Potential</b></div>
    <div class="rcover-mid">
      <div class="rcover-kick">STREET REPORT · ${today.toUpperCase()}</div>
      <h1>${esc(s.name)}</h1>
      <div class="rcover-sub">${esc(s.zone)} · ${esc(s.borough)} · ${s.stype.replace(/_/g," ")} ${chip("cur")}</div>
      <div class="rcover-concept">for the concept <b>“${esc(c.name)}”</b> · ${c.cat.replace(/_/g," ")} · ${money(c.ticket)} ticket · trading ${esc(windowsTxt)}</div>
    </div>
    <div class="rcover-figs">
      ${rank?`<div class="rcfig"><div class="rcfig-v">#${rank}</div><div class="rcfig-l">rank of ${SEGS.length.toLocaleString("en-GB")} ${CITY.name} streets ${chip("mod")}</div></div>`:""}
      <div class="rcfig"><div class="rcfig-v">${Math.round(r.score)}</div><div class="rcfig-l">fit score / 100 ${chip("mod")}</div></div>
      <div class="rcfig"><div class="rcfig-v">${money(rev.month)}</div><div class="rcfig-l">est. monthly revenue ${chip("mod")}</div></div>
      <div class="rcfig"><div class="rcfig-v">${fmt(Math.round(weeklyFlowAbs(s)))}</div><div class="rcfig-l">weekly station flow ${chip(s.weak?"mod":"obs")}</div></div>
    </div>
    <div class="rcover-src">Dataset built ${META.built} · OpenStreetMap ${META.osm_date} · ${META.numbat} · ${META.census} ${HAS_CRIME?` · ${CITY.texts.police||"Police"} ${META.crime_window}`:""} · ${(CITY.id==="glasgow"||CITY.id==="edinburgh")?"Scottish Assessors valuation roll":"VOA "+(CITY.texts.voaYear||"2023")}</div>
  </div></section>`;

  /* S2 verdict */
  const s2body=`
  <div class="rcols2">
    <div class="rcard">
      <div class="rbig">${Math.round(r.score)}<span class="rbig-of">/100</span></div>
      <div class="rbig-l">overall fit for “${esc(c.name)}” ${chip("mod")}</div>
      <div class="rrev-line"><b>${money(rev.month)}</b> est. monthly revenue ${chip("mod")}<br><span class="rmut">plausible range ${money(rev.low)} – ${money(rev.high)}</span></div>
    </div>
    <div class="rcard">
      <div class="rsub">Strongest for this concept</div>
      ${strengths.map(x=>bar(x.label,pct(x.score),null,pct(x.score))).join("")}
      <div class="rsub" style="margin-top:10px">Watch-outs</div>
      ${weak.map(x=>bar(x.label,pct(x.score),null,pct(x.score))).join("")}
    </div>
  </div>
  <div class="rnote">For “${esc(c.name)}” trading ${esc(windowsTxt)}: strongest on ${strengths.map(x=>x.label.toLowerCase()).join(" and ")} (${strengths.map(x=>pct(x.score)).join(" / ")}); weakest on ${weak.map(x=>x.label.toLowerCase()).join(" and ")} (${weak.map(x=>pct(x.score)).join(" / ")}). Every figure keeps its evidence label - read the labels, not just the score.</div>
  ${(()=>{const al=(typeof rankedCache!=="undefined"?rankedCache:[]).filter(x=>x.seg.id!==s.id).slice(0,3);if(!al.length)return "";return `<div class="rnote">Also shortlisted for “${esc(c.name)}”: ${al.map((x,i)=>`<b>#${(typeof rankedCache!=="undefined"?rankedCache.indexOf(x):i)+1} ${esc(x.seg.name)}</b> (${Math.round(x.score)})`).join(" · ")} - open them in the tool to compare side by side.</div>`;})()}`;

  /* S3 concept inputs */
  const audBars=Object.keys(AUDL).map(k=>bar(AUDL[k],(aw[k]||0)*10,null,(aw[k]||0)+"/10")).join("");
  const prioBars=[["rent","Rent sensitivity"],["access","Transport access"],["safety","Safety / crime"],["green","Green space"],["residential","Residential base"]].map(([k,l])=>bar(l,(c.priorities[k]??3)*20,null,(c.priorities[k]??3)+"/5")).join("");
  const flags=[["Alcohol licence",c.alcohol],["Outdoor terrace",c.terrace],["Franchise / chain",c.franchise],["Family-friendly",c.family]].map(([l,v])=>`<span class="rflag ${v?"on":""}">${l}: ${v?"yes":"no"}</span>`).join("");
  const s3body=`
  <div class="rcols3">
    <div class="rcard"><div class="rsub">Basics</div>
      ${kv("Category",CATL[c.cat]||c.cat.replace(/_/g," "))}${kv("Average ticket",money(c.ticket))}${kv("Seats",c.seats)}${kv("Floorspace",c.floorspace+" m²")}${kv("Rent budget / m² / yr",money(c.rent))}${kv("Stance on rivals",(c.compStance||0)+"% "+((c.compStance||0)>50?"seek clusters":(c.compStance||0)>0?"neutral":"avoid"))}
      <div class="rflags">${flags}</div>
    </div>
    <div class="rcard"><div class="rsub">Channels &amp; trading windows</div>
      ${kv("Takeaway share",c.takeaway+"%")}${kv("Delivery share",c.delivery+"%")}
      ${c.windows.map(w=>`<div class="rkv"><span class="rl">${w.days.map(d=>DAYNAMES[d]).join(" ")}</span><span class="rv">${mm(w.from)} – ${mm(w.to%1560)}</span></div>`).join("")}
      <div class="rsub" style="margin-top:10px">Your priorities</div>${prioBars}
    </div>
    <div class="rcard"><div class="rsub">Target audience weights</div>${audBars}</div>
  </div>
  <div class="rnote">These are the inputs the model scored ${esc(s.name)} against. Change any of them on the site and this report changes with them.</div>`;

  /* S4 demand */
  const maxDay=Math.max(1,...Object.values(fl.days));
  const dayBars=[["Mon","mon"],["Tue–Thu","mid"],["Fri","fri"],["Sat","sat"],["Sun","sun"]].map(([l,k])=>`<div class="rcol-bar"><div class="rb" style="height:${Math.max(2,Math.round(100*fl.days[k]/maxDay))}%"></div><div class="rt">${l}</div><div class="rv2">${fmt(Math.round(fl.days[k]))}</div></div>`).join("");
  const anchors=s.anchors.map(a=>kv(`${esc(a.station)} (${a.mode}${a.src==="ORR"?" · ORR":""})`,fmt(a.annual)+"/yr")).join("");
  const stnNames=s.transport.names.slice(0,6).join(" · ");
  const s4body=`
  <div class="rcols2">
    <div class="rcard"><div class="rsub">Typical-day entries + exits by day ${chip(s.weak?"mod":"obs")}</div>
      <div class="rchart">${dayBars}</div>
      ${kv("Combined weekly flow anchor",fmt(Math.round(weeklyFlowAbs(s))),s.weak?"mod":"obs")}
      ${kv("People passing in your trading windows / week",fmt(Math.round(rev.people)),"mod")}
      ${kv("Weekend share of weekly flow",Math.round(fl.weekend_share*100)+"%")}
      ${kv("Rhythm",fl.weekend_share>0.3?"weekend-leaning":"weekday-leaning")}
    </div>
    <div class="rcard"><div class="rsub">Named station anchors ${chip(s.weak?"mod":"obs")}</div>
      ${s.weak?`<div class="rwarn">${s.flow.modelled_from?`No count taken on this street itself - flow MODELLED as ~${Math.round((s.flow.share||0)*100)}% of the ${esc(s.flow.modelled_from)} catchment below.`:`No station count within 900 m of this street - no flow anchor. Offer, audience, rents${HAS_CRIME?" and crime":""} elsewhere in this report still use observed data.`}</div>`:""}
      ${anchors||'<div class="rkv"><span class="rl">None recorded</span></div>'}
      ${kv("Stations within 900 m (OSM)",s.transport.stations_900m)}
      ${(()=>{const dn={mon:"Monday",mid:"Tue-Thu (typical)",fri:"Friday",sat:"Saturday",sun:"Sunday"};const ent=Object.entries(fl.days);const mx=ent.reduce((a,b)=>b[1]>a[1]?b:a);const mn=ent.reduce((a,b)=>b[1]<a[1]?b:a);return kv("Busiest day",`${dn[mx[0]]} · ${fmt(Math.round(mx[1]))}`)+kv("Quietest day",`${dn[mn[0]]} · ${fmt(Math.round(mn[1]))}`)+kv("Weekend flow (Sat + Sun) / week",fmt(Math.round(fl.days.sat+fl.days.sun)));})()}
      <div class="rmini">${esc(stnNames)}</div>
      <div class="rmini">${META.numbat}. Station counts are demand anchors, not footfall on this pavement.</div>
    </div>
  </div>
  <div class="rnote">Demand-at-hours score for this street: <b>${pct(r.crit.demand.score)}</b> ${chip("mod")} - your trading windows mapped onto the day-type flows above, normalised across all ${SEGS.length.toLocaleString("en-GB")} ${CITY.name} segments.</div>`;

  /* S5 audience */
  const audSupplyBars=Object.keys(AUDL).map(k=>{const w=aw[k]||0;return `<div class="rbar-row ${w===0?"dim":""}"><div class="rbar-l">${AUDL[k]}${w?` <span class="ryou">you ${w}/10</span>`:""}</div><div class="rbar"><i style="width:${Math.max(1,Math.round(sup[k]*100))}%"></i></div><div class="rbar-v">${Math.round(sup[k]*100)}</div></div>`;}).join("");
  const topEth=s.lsoa.top_eth.map(([g,p])=>kv(g,p+"%")).join("");
  const s5body=`
  <div class="rcols2">
    <div class="rcard"><div class="rsub">Audience supply on and around this street ${chip("mod")}</div>
      ${audSupplyBars}
      <div class="rmini">Supply 0-100 from observed building blocks: coworking density, station rhythms, culture, nightlife offer, parks and the resident profile right. Your weight shows beside each audience you target.</div>
    </div>
    <div class="rcard"><div class="rsub">Who lives around it · ${esc(s.lsoa.name)} ${chip("ctx")}</div>
      ${kv("Usual residents (Census 2021)",Math.round(s.lsoa.residents).toLocaleString("en-GB"))}
      ${kv("Aged 20-39",s.lsoa.pct20_39.toFixed(1)+"%")}${kv("Under 20",s.lsoa.pct_under20.toFixed(1)+"%")}
      ${kv("Students (16+)",s.lsoa.pct_students.toFixed(1)+"%")}${kv("Professional / managerial jobs",s.lsoa.pct_prof.toFixed(1)+"%")}
      ${s.lsoa.pct_nonuk!=null?kv("Born outside the UK",s.lsoa.pct_nonuk.toFixed(1)+"%"):""}${kv("Ethnic diversity index (0-1)",s.lsoa.diversity.toFixed(2))}
      ${topEth}
      <div class="rmini">LSOA ≈ 1,500 residents - it describes residents, not the people walking this street. Census 2021 via Nomis.</div>
    </div>
  </div>
  <div class="rnote">Audience match score <b>${pct(r.crit.audience.score)}</b> ${chip("mod")} · revenue audience factor <b>x${rev.aud.toFixed(2)}</b> (x0.5 - x1.5).</div>`;

  /* S6 competition */
  const catRows=[["cafe","Cafés","cafe_chain"],["restaurant","Restaurants","restaurant_chain"],["fast_food","Fast food",null],["pub_bar","Pubs & bars",null],["grocery","Grocery & food shops","grocery_chain"],["fitness","Gyms & fitness","fitness_chain"],["cowork","Coworking spaces","cowork_chain"]].map(([k,l,ck])=>kv(l,`${s.osm[k]||0}${ck&&s.osm[ck]?` (${s.osm[ck]} chain)`:""}`)).join("");
  const compRows=compList.slice(0,9).map(x=>kv(`${esc(x[0])}${x[1]?` <span class="rmini-inline">${esc(x[1].replace(/_/g," "))}</span>`:""}`,`${x[2]?'<span class="rchain">chain</span> ':""}${x[3]} m`)).join("");
  const stanceTxt=(c.compStance||0)>50?"you chose to seek proven clusters - saturation penalises less":(c.compStance||0)>0?"neutral stance on nearby rivals":"you chose to avoid rivals - saturation penalises more";
  const s6body=`
  <div class="rcols2">
    <div class="rcard"><div class="rsub">Street offer within 250 m ${chip("obs")}</div>
      ${catRows}
      ${kv("All other shops",s.osm.shops)}${kv("Culture & attractions",s.osm.culture)}
      ${kv("Food venues with outdoor seating",Math.round(s.osm.terrace_share*100)+"%")}
      ${kv(`Competing “${c.cat.replace(/_/g," ")}” venues`,`${catCount} (${catChain} chain)`,"obs")}
      <div class="rmini">OpenStreetMap extract ${META.osm_date}. Counts depend on mapper coverage - treat as lower bounds.</div>
    </div>
    <div class="rcard"><div class="rsub">Nearest named competitors · ${c.cat.replace(/_/g," ")} ${chip("obs")}</div>
      ${compRows||`<div class="rkv"><span class="rl">No named venues of this category recorded within ${COMPR[c.cat]} m of the anchor.</span></div>`}
      ${kv("Competing venues in total",catCount,"obs")}
      ${kv("Of which chain venues",catChain,"obs")}
      ${kv("Independent venues",catCount-catChain,"obs")}
      <div class="rmini">${catCount} recorded in total; the ${Math.min(compList.length,9)} nearest named are shown. A listed competitor is a real trading venue, not a vacancy.</div>
    </div>
  </div>
  <div class="rnote">Demand-vs-competition score <b>${pct(r.crit.opportunity.score)}</b> ${chip("mod")} · revenue dilution factor <b>x${rev.comp.toFixed(2)}</b> = 1 / (1 + ${R.dil} x ${catCount} rivals). Stance: ${stanceTxt}.</div>`;

  /* S7 occupancy cost + ticket */
  const s7body=`
  <div class="rcols2">
    <div class="rcard"><div class="rsub">Occupancy cost · ${esc(s.borough)} ${chip("ctx")}</div>
      ${s.rent.basis==="SAA"
        ?kv("Retail RV / m² (modelled from Scottish Assessors roll)",money(s.rent.retail_rv_m2),"mod")+kv("Office RV / m² (modelled)",money(s.rent.office_rv_m2),"mod")+kv("Avg RV per shop (SAA roll, observed)",money(s.rent.saa_shop_avg_rv),"ctx")
        :kv("Retail rateable value / m² (VOA, "+(CITY.texts.voaYear||"Mar 2023")+")",money(s.rent.retail_rv_m2))+kv("Office rateable value / m²",money(s.rent.office_rv_m2))}
      ${kv("Estimated passing rent / m² (2026)",money(s.rent.est_rent_m2),"mod")}
      ${kv(`Est. rent for your ${c.floorspace} m² unit`,money(s.rent.est_rent_m2*c.floorspace/12)+"/mo","mod")}
      ${kv("Est. business rates after small-biz relief",money(estRates(s,c)/12)+"/mo","mod")}
      ${kv("Your rent budget / m² / yr",money(c.rent))}
      <div class="rmini">Rule: borough rateable value x segment-type factor x footfall factor, uplifted to 2026. Rates = unit RV proxy x 49.9p multiplier with Small Business Rate Relief below £15k RV. Get agent quotes before committing.</div>
    </div>
    <div class="rcard"><div class="rsub">Ticket fit ${chip("mod")}</div>
      ${kv("Your average ticket",money(c.ticket))}
      ${kv("Estimated typical spend / person nearby",money(s.model.spend_est),"mod")}
      ${kv("Office-worker skew",Math.round(s.model.office_skew*100)+"%")}
      <div class="rticket"><div class="rtick-l">£0</div><div class="rtick-track"><i class="rtick-spend" style="left:${clamp(s.model.spend_est/(c.ticket*2.2)*100,2,98)}%"></i><i class="rtick-you" style="left:${clamp(c.ticket/(c.ticket*2.2)*100,2,98)}%"></i></div><div class="rtick-l">${money(Math.round(c.ticket*2.2))}</div></div>
      <div class="rtick-legend"><span><i class="dot dot-spend"></i>typical spend nearby ${money(s.model.spend_est)}</span><span><i class="dot dot-you"></i>your ticket ${money(c.ticket)}</span></div>
      <div class="rmini">Spend estimated from occupation mix, borough retail values and chain presence.</div>
    </div>
  </div>
  <div class="rnote">Rent fit score <b>${pct(r.crit.rent.score)}</b> ${chip("mod")} (your budget vs estimated rent) · ticket fit score <b>${pct(r.crit.ticket.score)}</b> ${chip("mod")} (your ticket vs typical spend).</div>`;

  const cmp=(typeof comparablesFor==="function")?comparablesFor(r):null;
  const cmpNote=cmp?`\n  <div class="rnote">Comparable streets ${chip("mod")}: &ldquo;${esc(c.name)}&rdquo; on ${cmp.n} similar ${cmp.stypeLabel} streets (0.5x-2x this weekly flow) models at a median of <b>${money(cmp.median)}/mo</b>, typical band ${money(cmp.p25)} - ${money(cmp.p75)}. Same transparent model, not observed turnover.</div>`:"";
  /* S8 revenue */
  const lo=rev.low, hi=rev.high, mid=rev.month;
  const pos=v=>clamp((v-lo)/(hi-lo)*100,0,100);
  const trans=rev.weekTrans?kv("Modelled transactions / week",fmt(Math.round(rev.weekTrans))):kv("Modelled members / desks",fmt(Math.round(rev.members||0)));
  const s8body=`
  <div class="rcols2">
    <div class="rcard"><div class="rsub">Estimated monthly revenue ${chip("mod")}</div>
      <div class="rbig rbig-money">${money(mid)}</div>
      <div class="rrange"><div class="rrange-track"><i class="rrange-lo" style="left:0%"></i><i class="rrange-mid" style="left:${pos(mid)}%"></i><i class="rrange-hi" style="left:100%"></i></div>
      <div class="rrange-lbls"><span>${money(lo)}<br>low</span><span>${money(mid)}<br>central</span><span>${money(hi)}<br>high</span></div></div>
      <div class="rmini">Range x0.55 to x1.6 of central - capture-rate uncertainty dominates. Planning estimate, not a valuation.</div>
    </div>
    <div class="rcard"><div class="rsub">How it is built ${chip("mod")}</div>
      ${kv("People passing in your trading windows / week",fmt(Math.round(rev.people)))}
      ${kv("Category capture rate",(R.capture*100).toFixed(1)+"%")}
      ${kv("Competition dilution factor","x"+rev.comp.toFixed(2))}
      ${kv("Audience factor","x"+rev.aud.toFixed(2))}
      ${trans}
      ${rev.capped?kv("Capped by unit throughput (seats x covers + m² x throughput)","yes"):""}
      ${kv("Monthly = weekly transactions x ticket x 4.33",money(mid))}
      ${kv("Weekly equivalent (central)",money(mid/4.33),"mod")}
      ${kv(`Monthly revenue per m² of your ${c.floorspace} m² unit`,money(mid/c.floorspace),"mod")}
    </div>
  </div>
  <div class="rnote">Rule: weekly station flow in your hours x category capture rate x dilution x audience fit + resident spend, x your ${money(c.ticket)} ticket. All constants are published on the Method section of the site - transparent assumptions you can argue with, not observed takings.</div>${cmpNote}`;

  /* S9 scorecard */
  const critRows=Object.values(r.crit).sort((a,b)=>b.w-a.w).map(cr=>bar(cr.label,pct(cr.score),cr.how==="obs"?"obs":cr.how==="ctx"?"ctx":"mod",`${pct(cr.score)} · w ${(cr.w*100).toFixed(0)}%`)).join("");
  const s9body=`<div class="rcard">${critRows}</div>
  <div class="rnote">Weighted into the final fit score of <b>${Math.round(r.score)} / 100</b>. Weights shift with your concept (e.g. alcohol trades transport access for safety and green; family-friendly lifts safety and green) and with the priorities you set.</div>`;

  /* S10 method */
  const s10body=`
  <div class="rcols2">
    <div class="rcard"><div class="rsub">How to read every figure</div>
      <div class="rleg">${chip("obs")} measured at a named source - station counts, OSM venues, units.</div>
      <div class="rleg">${chip("ctx")} describes the surrounding statistical area - Census LSOA, Met Police, VOA borough.</div>
      <div class="rleg">${chip("mod")} a transparent estimate the model computes - the rule is always shown.</div>
      <div class="rsub" style="margin-top:10px">Key model constants</div>
      <div class="rmini">Capture rates: grocery 3.0%, café 2.0%, fast food 1.8%, pub/bar 1.5%, restaurant 1.2% of passers-by in trading windows. Dilution 1/(1+k x rivals within ${COMPR[c.cat]} m). Audience factor x0.5-x1.5. Revenue range x0.55-x1.6. Capacity: seats x weekly covers + floorspace x throughput per m², with soft absorption beyond.</div>
    </div>
    <div class="rcard"><div class="rsub">Sources</div>
      <div class="rkv2"><span class="rl">Station flows ${chip("obs")}</span><span class="rv">${META.numbat}</span></div>
      <div class="rkv2"><span class="rl">Venues, units, stations ${chip("obs")}</span><span class="rv">OpenStreetMap (ODbL), ${META.osm_date}</span></div>
      <div class="rkv2"><span class="rl">Residents ${chip("ctx")}</span><span class="rv">Census 2021 LSOA via Nomis</span></div>
      ${HAS_CRIME?`<div class="rkv2"><span class="rl">Business crime ${chip("ctx")}</span><span class="rv">${CITY.texts.police||"Police"}, ${META.crime_window}</span></div>`:""}
      <div class="rkv2"><span class="rl">Rateable values ${chip("ctx")}</span><span class="rv">VOA business floorspace, Mar 2023</span></div>
      <div class="rkv2"><span class="rl">Dataset built</span><span class="rv">${META.built}</span></div>
      <div class="rmini">Resolution honesty: station counts are not pavement footfall; LSOA describes residents not visitors; OSM counts are lower bounds; modelled layers are the ones to override with your own counts.</div>
    </div>
  </div>
  <div class="rnote">Challenge this model: every MODELLED figure above shows the rule it was computed with. If your own count, quote or survey disagrees, your figure wins - keep the structure, replace the inputs.</div>`;

  /* S11 closing */
  const s11=`<section class="rslide rclose"><div class="rslide-in">
    <div class="rcover-brand">${CITY.name} <b>Location Potential</b></div>
    <h3 class="rtitle">Next steps before you commit</h3>
    <div class="rclose-recap">
      <div class="rcfig"><div class="rcfig-v">${Math.round(r.score)}</div><div class="rcfig-l">fit score / 100</div></div>
      <div class="rcfig"><div class="rcfig-v">${money(rev.month)}</div><div class="rcfig-l">est. monthly revenue</div></div>
      <div class="rcfig"><div class="rcfig-v">${fmt(Math.round(weeklyFlowAbs(s)))}</div><div class="rcfig-l">weekly station flow</div></div>
      <div class="rcfig"><div class="rcfig-v">${catCount}</div><div class="rcfig-l">rivals within ${COMPR[c.cat]} m</div></div>
    </div>
    <div class="rsteps">
      <div class="rstep"><b>1 · Count it yourself.</b> Stand on ${esc(s.name)} during your exact trading windows (${esc(windowsTxt)}) and count passers-by. Override the modelled layers with your numbers.</div>
      <div class="rstep"><b>2 · Walk the competition.</b> Visit the ${catCount} ${c.cat.replace(/_/g," ")} venues within ${COMPR[c.cat]} m at peak time. Queue length beats any model.</div>
      <div class="rstep"><b>3 · Get real quotes.</b> Ask agents for live availability and quoting rents around this street - the ${money(s.rent.est_rent_m2)}/m² here is a modelled borough estimate, not an asking rent.</div>
      <div class="rstep"><b>4 · Check licensing and planning.</b> ${c.alcohol?"Alcohol licence, late-night refreshment and ":""}Use-class, extraction and terrace permissions with ${esc(s.borough)} council.</div>
      <div class="rstep"><b>5 · Compare your finalists.</b> Shortlist up to three streets in Location Potential and compare them side by side before deciding.</div>
    </div>
    <div class="rmodel-cta"><span><b>Need a stronger model?</b> These are estimates from a simple model and public data. Get better data, a detailed report and hands-on geomarketing.</span><a href="https://locationpotential.com/#expert">Request expert help →</a></div>
    <div class="rclose-disc">This report is a decision-support tool, not a valuation. OBSERVED figures are measured at named sources; AREA CONTEXT describes the surrounding area; MODELLED figures are transparent planning estimates. Verify any shortlist with on-street counts, agent particulars and a licensing check before signing anything. A specialist can help you.</div>
    <div class="rclose-url">locationpotential.com · generated ${today} · dataset ${META.built}</div>
  </div></section>`;

  const html=[
    s1,
    slide(++n,T,"Verdict","The executive read",s2body),
    slide(++n,T,"Model inputs","Your concept, as scored",s3body),
    slide(++n,T,"Demand","Demand at your hours",s4body),
    slide(++n,T,"Audience","Audience match",s5body),
    slide(++n,T,"Competition",`Competition within ${COMPR[c.cat]} m`,s6body),
    slide(++n,T,"Costs","Occupancy cost & ticket fit",s7body),
    slide(++n,T,"Revenue","Revenue estimate",s8body),
    slide(++n,T,"Scorecard","Every criterion, weighted",s9body),
    slide(++n,T,"Transparency","Method, sources & labels",s10body),
    s11
  ].join("");
  return {html,title:`Location Potential - ${s.name} - ${c.name}`};
}

let overlay=null;
window.openSlideReport=function(id){
  const rep=buildReport(id); if(!rep)return;
  closeSlideReport();
  overlay=document.createElement("div");
  overlay.id="report-overlay";
  overlay.innerHTML=`<div class="rtoolbar">
    <div class="rtool-l">Street report · <b>${esc(rowFor(id).seg.name)}</b> · 11 slides</div>
    <div class="rtool-r"><button class="action primary" id="rprint">Print / save as PDF</button><button class="action" id="rclose">Close</button></div>
  </div><div class="rslides">${rep.html}</div>`;
  document.body.appendChild(overlay);
  document.body.style.overflow="hidden";
  overlay.querySelectorAll(".rfoot-d").forEach(el=>el.textContent=new Date().toLocaleDateString("en-GB"));
  const oldTitle=document.title;
  overlay.querySelector("#rprint").onclick=()=>{document.title=rep.title;window.print();};
  window.onafterprint=()=>{document.title=oldTitle;};
  overlay.querySelector("#rclose").onclick=closeSlideReport;
  overlay.addEventListener("click",e=>{if(e.target===overlay)closeSlideReport();});
  document.addEventListener("keydown",escClose);
};
function escClose(e){if(e.key==="Escape")closeSlideReport();}
window.closeSlideReport=function(){
  if(overlay){overlay.remove();overlay=null;}
  document.body.style.overflow="";
  document.removeEventListener("keydown",escClose);
};
})();
