/* Email-unlocked refresh and qualified expert enquiries, delivered by FormSubmit. */
(function(){
const ENDPOINT="https://formsubmit.co/ajax/amazonmillan9@gmail.com";
const hasEmail=()=>!!localStorage.getItem("lll_refresh_email");
const send=async data=>{const r=await fetch(ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify(data)});if(!r.ok)throw new Error("submit");return r.json();};
function expert(){if(typeof activateTab==="function")activateTab("expert");}
document.addEventListener("click",e=>{const a=e.target.closest("[data-expert]");if(a){e.preventDefault();expert();}});
const lf=document.getElementById("lead-form");if(lf)lf.addEventListener("submit",async e=>{e.preventDefault();const st=document.getElementById("lead-status"),btn=lf.querySelector("button[type=submit]");btn.disabled=true;st.className="form-status";st.textContent="Sending your brief…";const data=Object.fromEntries(new FormData(lf).entries());try{await send(data);localStorage.setItem("lll_refresh_email",data.email);st.className="form-status ok";st.textContent="Brief received. A suitable geomarketing partner can now be matched to your project.";lf.reset();}catch(_){st.className="form-status err";st.textContent="The form could not be sent. Please try again in a moment.";btn.disabled=false;}});
})();
