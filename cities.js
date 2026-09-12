/* Location Potential - live city sections. One file to update when a city launches. */
window.CITIES=[
 {id:"london",name:"London",url:"/"},
 {id:"manchester",name:"Manchester",url:"/manchester/"},
 {id:"birmingham",name:"Birmingham",url:"/birmingham/"},
 {id:"leeds",name:"Leeds",url:"/leeds/"},
 {id:"bristol",name:"Bristol",url:"/bristol/"},
 {id:"liverpool",name:"Liverpool",url:"/liverpool/"},
 {id:"sheffield",name:"Sheffield",url:"/sheffield/"},
 {id:"glasgow",name:"Glasgow",url:"/glasgow/"},
 {id:"edinburgh",name:"Edinburgh",url:"/edinburgh/"},
 /* new sections are added here as they go live */
];
(function(){
 /* current city comes from the URL path, not script order: absolute links never 404 from a city page */
 const path=location.pathname;
 const cur=(window.CITIES.find(c=>c.url!=="/"&&path.indexOf(c.url)===0)||window.CITIES[0]).id;
 const nav=document.getElementById("citynav");
 if(nav){
  nav.innerHTML='<span class="cn-label cn-full">Best area in the city of:</span><span class="cn-label cn-short">Area:</span>'+window.CITIES.map(c=>
   `<a href="${c.url}"${c.id===cur?' class="on"':''}>${c.name}</a>`).join("");
 }
})();
