/* Email-unlocked refresh and qualified expert enquiries, delivered by FormSubmit. */
(function(){
const ENDPOINT="https://formsubmit.co/ajax/amazonmillan9@gmail.com";
const hasEmail=()=>!!localStorage.getItem("lll_refresh_email");
const send=async data=>{const r=await fetch(ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify(data)});if(!r.ok)throw new Error("submit");return r.json();};
function expert(){if(typeof activateTab==="function")activateTab("expert");}
document.addEventListener("click",e=>{const a=e.target.closest("[data-expert]");if(a){e.preventDefault();expert();}});
function gate(){
  if(document.getElementById("refresh-gate"))return;
  const x=document.createElement("div");x.id="refresh-gate";x.className="refresh-gate";x.innerHTML=`<div class="gate-card"><button class="gate-close" type="button" aria-label="Close">Close</button><span class="gate-mark">FREE REFRESH</span><h2>Refresh your results</h2><p>Enter your email once to unlock fresh scores, rankings and map results as you change your concept.</p><form id="refresh-form"><input required type="email" name="email" autocomplete="email" placeholder="you@company.com" aria-label="Email"><button class="action primary" type="submit">Unlock refresh →</button></form><p class="gate-fine">We will use this to unlock the tool and send occasional Location Lens updates. You can unsubscribe at any time. See our <a href="privacy.html">Privacy Notice</a>.</p><div class="gate-status" role="status" aria-live="polite"></div></div>`;
  document.body.appendChild(x);document.body.style.overflow="hidden";
  const close=()=>{x.remove();document.body.style.overflow="";};x.querySelector(".gate-close").onclick=close;
  x.querySelector("form").onsubmit=async e=>{e.preventDefault();const email=e.target.email.value.trim();const st=x.querySelector(".gate-status"),btn=e.target.querySelector("button");btn.disabled=true;st.textContent="Unlocking…";try{await send({_subject:"Location Lens refresh email",email,source:"Refresh unlock",updates_opt_in:"yes"});localStorage.setItem("lll_refresh_email",email);close();if(typeof update==="function")update();}catch(_){st.textContent="We could not save that email. Check the address and try again.";btn.disabled=false;}};
}
if(typeof update==="function"){
  const original=update;update=function(){if(!hasEmail()){gate();return;}return original.apply(this,arguments);};
}
const lf=document.getElementById("lead-form");if(lf)lf.addEventListener("submit",async e=>{e.preventDefault();const st=document.getElementById("lead-status"),btn=lf.querySelector("button[type=submit]");btn.disabled=true;st.className="form-status";st.textContent="Sending your brief…";const data=Object.fromEntries(new FormData(lf).entries());try{await send(data);localStorage.setItem("lll_refresh_email",data.email);st.className="form-status ok";st.textContent="Brief received. A suitable geomarketing partner can now be matched to your project.";lf.reset();}catch(_){st.className="form-status err";st.textContent="The form could not be sent. Please try again in a moment.";btn.disabled=false;}});
})();
