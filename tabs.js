/* ---------- tab navigation ---------- */
(function(){
  const NAMES=["concept","detail","trends","premium","shortlist","expert"];
  let current="concept";
  window.activateTab=function(name,opts){
    if(NAMES.indexOf(name)<0)name="concept";
    opts=opts||{};
    current=name;
    document.querySelectorAll("[data-panel]").forEach(el=>el.classList.toggle("on",el.dataset.panel===name));
    document.querySelectorAll("#tabbar [data-tab]").forEach(a=>a.classList.toggle("on",a.dataset.tab===name));
    if(("#"+name)!==location.hash){try{history.replaceState(null,"","#"+name);}catch(e){}}
    if(name==="concept"){setTimeout(()=>{try{if(typeof map!=="undefined"&&map&&map.invalidateSize)map.invalidateSize();}catch(e){}},90);}
    if(opts.scroll!==false)window.scrollTo({top:0,behavior:"auto"});
  };
  document.querySelectorAll("#tabbar [data-tab]").forEach(a=>{
    a.addEventListener("click",e=>{e.preventDefault();activateTab(a.dataset.tab);});
  });
  const h=(location.hash||"").slice(1);
  if(NAMES.indexOf(h)>=0&&h!=="concept")activateTab(h,{scroll:false});
  window.addEventListener("hashchange",()=>{
    const n=(location.hash||"").slice(1);
    if(NAMES.indexOf(n)>=0&&n!==current)activateTab(n);
  });
  const cta=document.getElementById("hero-cta");
  if(cta)cta.addEventListener("click",e=>{
    e.preventDefault();
    activateTab("concept",{scroll:false});
    const c=document.getElementById("concept");if(c)c.scrollIntoView({behavior:"smooth",block:"start"});
  });
  document.querySelectorAll("[data-goto]").forEach(b=>b.addEventListener("click",()=>{const target=b.dataset.goto;if(target==="map"||target==="rankings"){activateTab("concept",{scroll:false});setTimeout(()=>document.getElementById(target)?.scrollIntoView({behavior:"smooth",block:"start"}),50);}else activateTab(target);}));
  // selecting a street with intent to view (rank row, shortlist, gap finder) opens the Street tab
  const _sel=selectSegment;
  selectSegment=function(id,scroll){
    _sel(id,scroll);
    if(scroll){
      activateTab("detail",{scroll:false});
      const d=document.getElementById("detail");
      if(d)setTimeout(()=>d.scrollIntoView({behavior:"smooth",block:"start"}),70);
    }
  };
  // map marker click: small summary popup with a door into the evidence panel
  if(typeof L!=="undefined"&&typeof markers!=="undefined"){
    Object.keys(markers).forEach(id=>{
      markers[id].on("click",()=>{
        setTimeout(()=>{
          const r=(typeof rowFor==="function")?rowFor(id):null;
          const s=r?r.seg:SEGMENTS.find(x=>x.id===id);
          if(!s)return;
          const html=`<div class="map-pop"><b>${s.name}</b><span class="mp-sub">${s.zone} · ${s.borough}</span>`+
            (r?`<span class="mp-figs">Fit <b>${Math.round(r.score)}</b> · Est. revenue <b>${money(r.rev.month)}/mo</b></span>`:"")+
            `<button class="action primary mp-open">Open evidence panel</button></div>`;
          L.popup({className:"seg-pop",closeButton:true}).setLatLng(markers[id].getLatLng()).setContent(html).openOn(map);
          const btn=document.querySelector(".seg-pop .mp-open");
          if(btn)btn.onclick=()=>{map.closePopup();activateTab("detail");};
        },40);
      });
    });
  }
})();
