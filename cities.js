/* Location Potential - live city sections. One file to update when a city launches. */
window.CITIES=[
 {id:"london",name:"London",url:"./"},
 {id:"manchester",name:"Manchester",url:"./manchester/"},
 {id:"birmingham",name:"Birmingham",url:"./birmingham/"},
 {id:"leeds",name:"Leeds",url:"./leeds/"},
 {id:"bristol",name:"Bristol",url:"./bristol/"},
 {id:"liverpool",name:"Liverpool",url:"./liverpool/"},
 {id:"sheffield",name:"Sheffield",url:"./sheffield/"},
 /* new sections are added here as they go live */
];
(function(){
 const cur=(window.CITY&&window.CITY.id)||"london";
 const nav=document.getElementById("citynav");
 if(nav){
  nav.innerHTML='<span class="cn-label">City</span>'+window.CITIES.map(c=>
   `<a href="${c.url}"${c.id===cur?' class="on"':''}>${c.name}</a>`).join("");
 }
})();
