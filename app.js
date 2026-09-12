/* Location Potential - concept builder, scoring engine, rendering (city-aware; London defaults) */
const CITY=window.CITY||{id:"london",name:"London",region:"Greater London",mapCenter:[51.515,-0.11],mapZoom:12,texts:{}};
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
  ["students","Students"],["tourists","Tourists & visitors"],["nightlife","Nightlife crowd"],["families","Families"],["intl","International communities"],
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
 {id:"dessert",name:"Dessert & bubble tea",cat:"cafe",ticket:8,seats:20,floorspace:60,delivery:20,takeaway:60,alcohol:false,terrace:false,franchise:false,
  audience:{office:1,residents:3,young:4,students:5,tourists:3,nightlife:3,families:2},rent:600,
  windows:[{days:[0,1,2,3,4,5,6],from:720,to:1320}]},
 {id:"burger",name:"Smashed burgers",cat:"fast_food",ticket:14,seats:30,floorspace:90,takeaway:50,delivery:25,alcohol:false,terrace:false,franchise:false,
  audience:{office:3,residents:3,young:4,students:4,tourists:2,nightlife:3,families:1,intl:2},rent:500,
  windows:[{days:[0,1,2,3,4,5,6],from:690,to:900},{days:[0,1,2,3,4,5,6],from:1050,to:1350}]},
 {id:"ramen",name:"Ramen & noodle bar",cat:"restaurant",ticket:18,seats:34,floorspace:80,takeaway:20,delivery:10,alcohol:false,terrace:false,franchise:false,
  audience:{office:3,residents:2,young:5,students:4,tourists:3,nightlife:2,families:0,intl:3},rent:650,
  windows:[{days:[0,1,2,3,4,5,6],from:720,to:900},{days:[0,1,2,3,4,5,6],from:1050,to:1350}]},
 {id:"poke",name:"Poke & healthy bowls",cat:"fast_food",ticket:13,seats:14,floorspace:60,takeaway:65,delivery:30,alcohol:false,terrace:false,franchise:false,
  audience:{office:5,residents:2,young:4,students:2,tourists:1,nightlife:0,families:0,intl:1},rent:650,
  windows:[{days:[0,1,2,3,4],from:630,to:930}]},
 {id:"gelato",name:"Gelato & ice cream",cat:"cafe",ticket:7,seats:16,floorspace:55,takeaway:80,delivery:5,alcohol:false,terrace:true,franchise:false,family:true,
  audience:{office:1,residents:3,young:3,students:3,tourists:4,nightlife:1,families:5,intl:1},rent:550,
  windows:[{days:[0,1,2,3,4,5,6],from:660,to:1140}]},
 {id:"taproom",name:"Craft beer taproom",cat:"pub_bar",ticket:24,seats:50,floorspace:120,takeaway:0,delivery:0,alcohol:true,terrace:true,franchise:false,
  audience:{office:3,residents:3,young:5,students:1,tourists:2,nightlife:4,families:0,intl:1},rent:600,
  windows:[{days:[2,3,4,5,6],from:960,to:1410}]},
 {id:"wineshop",name:"Wine shop & tasting room",cat:"grocery",ticket:26,seats:10,floorspace:65,takeaway:85,delivery:5,alcohol:true,terrace:false,franchise:false,
  audience:{office:2,residents:5,young:3,students:0,tourists:2,nightlife:1,families:2,intl:1},rent:500,
  windows:[{days:[1,2,3,4,5],from:600,to:1200}]},
 {id:"allday-breakfast",name:"All-day breakfast cafe",cat:"cafe",ticket:11,seats:40,floorspace:90,takeaway:25,delivery:5,alcohol:false,terrace:false,franchise:false,
  audience:{office:3,residents:5,young:3,students:1,tourists:2,nightlife:0,families:3,intl:1},rent:500,
  windows:[{days:[0,1,2,3,4,5,6],from:420,to:960}]},
 {id:"yoga",name:"Yoga & Pilates studio",cat:"fitness",ticket:18,seats:18,floorspace:110,takeaway:0,delivery:0,alcohol:false,terrace:false,franchise:false,
  audience:{office:2,residents:4,young:5,students:1,tourists:0,nightlife:0,families:2,intl:0},rent:550,
  windows:[{days:[0,1,2,3,4],from:390,to:540},{days:[0,1,2,3,4],from:1050,to:1230},{days:[5,6],from:540,to:720}]},
 {id:"budget-gym",name:"24/7 budget gym",cat:"fitness",ticket:20,seats:120,floorspace:450,takeaway:0,delivery:0,alcohol:false,terrace:false,franchise:true,
  audience:{office:3,residents:5,young:4,students:4,tourists:0,nightlife:1,families:1,intl:1},rent:350,
  windows:[{days:[0,1,2,3,4,5,6],from:360,to:1440}]},
 {id:"kebab",name:"Kebab & late-night grill",cat:"fast_food",ticket:10,seats:18,floorspace:70,takeaway:70,delivery:20,alcohol:false,terrace:false,franchise:false,
  audience:{office:1,residents:3,young:3,students:3,tourists:1,nightlife:5,families:0,intl:2},rent:450,
  windows:[{days:[0,1,2,3,4,5,6],from:1020,to:1560}]},
 {id:"taqueria",name:"Mexican taqueria",cat:"fast_food",ticket:13,seats:26,floorspace:75,takeaway:55,delivery:25,alcohol:true,terrace:false,franchise:false,
  audience:{office:3,residents:3,young:5,students:3,tourists:2,nightlife:3,families:1,intl:3},rent:550,
  windows:[{days:[0,1,2,3,4,5,6],from:720,to:900},{days:[0,1,2,3,4,5,6],from:1050,to:1380}]},
 {id:"curry-house",name:"Indian curry house",cat:"restaurant",ticket:21,seats:55,floorspace:120,takeaway:30,delivery:25,alcohol:true,terrace:false,franchise:false,
  audience:{office:2,residents:5,young:3,students:2,tourists:1,nightlife:2,families:3,intl:4},rent:450,
  windows:[{days:[0,1,2,3,4,5,6],from:1050,to:1380}]},
 {id:"hotpot",name:"Chinese hotpot",cat:"restaurant",ticket:32,seats:60,floorspace:160,takeaway:0,delivery:0,alcohol:true,terrace:false,franchise:false,
  audience:{office:2,residents:3,young:4,students:4,tourists:2,nightlife:2,families:2,intl:5},rent:550,
  windows:[{days:[0,1,2,3,4,5,6],from:720,to:900},{days:[0,1,2,3,4,5,6],from:1050,to:1410}]},
 {id:"korean-bbq",name:"Korean BBQ",cat:"restaurant",ticket:34,seats:54,floorspace:150,takeaway:0,delivery:0,alcohol:true,terrace:false,franchise:false,
  audience:{office:2,residents:3,young:5,students:4,tourists:3,nightlife:3,families:1,intl:4},rent:600,
  windows:[{days:[0,1,2,3,4,5,6],from:1050,to:1410}]},
 {id:"pho",name:"Vietnamese pho & banh mi",cat:"restaurant",ticket:15,seats:36,floorspace:85,takeaway:35,delivery:15,alcohol:false,terrace:false,franchise:false,
  audience:{office:3,residents:3,young:4,students:3,tourists:2,nightlife:1,families:1,intl:4},rent:500,
  windows:[{days:[0,1,2,3,4,5,6],from:690,to:900},{days:[0,1,2,3,4,5,6],from:1050,to:1320}]},
 {id:"thai-street",name:"Thai street food",cat:"fast_food",ticket:14,seats:22,floorspace:70,takeaway:55,delivery:25,alcohol:false,terrace:false,franchise:false,
  audience:{office:3,residents:3,young:4,students:3,tourists:2,nightlife:2,families:1,intl:3},rent:500,
  windows:[{days:[0,1,2,3,4,5,6],from:690,to:900},{days:[0,1,2,3,4,5,6],from:1050,to:1350}]},
 {id:"sushi",name:"Sushi & Japanese kitchen",cat:"restaurant",ticket:26,seats:32,floorspace:90,takeaway:40,delivery:20,alcohol:true,terrace:false,franchise:false,
  audience:{office:4,residents:3,young:4,students:2,tourists:2,nightlife:1,families:1,intl:4},rent:650,
  windows:[{days:[0,1,2,3,4,5],from:720,to:900},{days:[0,1,2,3,4,5,6],from:1050,to:1350}]},
 {id:"souvlaki",name:"Greek souvlaki & gyros",cat:"fast_food",ticket:11,seats:18,floorspace:60,takeaway:65,delivery:25,alcohol:false,terrace:false,franchise:false,
  audience:{office:2,residents:4,young:4,students:3,tourists:2,nightlife:3,families:2,intl:3},rent:450,
  windows:[{days:[0,1,2,3,4,5,6],from:690,to:900},{days:[2,3,4,5],from:1050,to:1500}]},
 {id:"trattoria",name:"Italian trattoria",cat:"restaurant",ticket:29,seats:50,floorspace:120,takeaway:10,delivery:10,alcohol:true,terrace:true,franchise:false,
  audience:{office:2,residents:5,young:3,students:1,tourists:3,nightlife:2,families:4,intl:2},rent:550,
  windows:[{days:[0,1,2,3,4,5,6],from:720,to:900},{days:[0,1,2,3,4,5,6],from:1080,to:1380}]},
 {id:"ocakbasi",name:"Turkish ocakbasi grill",cat:"restaurant",ticket:20,seats:48,floorspace:110,takeaway:30,delivery:15,alcohol:true,terrace:false,franchise:false,
  audience:{office:2,residents:5,young:3,students:2,tourists:1,nightlife:3,families:3,intl:4},rent:450,
  windows:[{days:[0,1,2,3,4,5,6],from:720,to:900},{days:[0,1,2,3,4,5,6],from:1050,to:1440}]},
 {id:"mezze",name:"Lebanese mezze & grill",cat:"restaurant",ticket:23,seats:40,floorspace:100,takeaway:25,delivery:15,alcohol:true,terrace:true,franchise:false,
  audience:{office:2,residents:4,young:4,students:2,tourists:2,nightlife:3,families:2,intl:4},rent:550,
  windows:[{days:[0,1,2,3,4,5,6],from:720,to:900},{days:[0,1,2,3,4,5,6],from:1050,to:1380}]},
 {id:"jerk",name:"Caribbean jerk & patties",cat:"fast_food",ticket:12,seats:16,floorspace:60,takeaway:70,delivery:20,alcohol:false,terrace:false,franchise:false,
  audience:{office:2,residents:5,young:4,students:3,tourists:1,nightlife:3,families:2,intl:4},rent:400,
  windows:[{days:[0,1,2,3,4,5,6],from:690,to:900},{days:[3,4,5],from:1050,to:1500}]},
 {id:"fish-chips",name:"Fish & chips",cat:"fast_food",ticket:12,seats:28,floorspace:80,takeaway:75,delivery:15,alcohol:false,terrace:false,franchise:false,
  audience:{office:2,residents:5,young:2,students:2,tourists:3,nightlife:2,families:4,intl:1},rent:400,
  windows:[{days:[0,1,2,3,4,5,6],from:690,to:900},{days:[0,1,2,3,4,5,6],from:1020,to:1290}]},
 {id:"sandwich-bar",name:"Sandwich & salad bar",cat:"fast_food",ticket:9,seats:14,floorspace:55,takeaway:85,delivery:15,alcohol:false,terrace:false,franchise:false,
  audience:{office:5,residents:2,young:3,students:2,tourists:1,nightlife:0,families:0,intl:1},rent:650,
  windows:[{days:[0,1,2,3,4],from:450,to:900}]},
 {id:"bagel-deli",name:"Bagel & salt beef deli",cat:"fast_food",ticket:11,seats:18,floorspace:60,takeaway:70,delivery:15,alcohol:false,terrace:false,franchise:false,
  audience:{office:3,residents:4,young:4,students:2,tourists:2,nightlife:2,families:2,intl:3},rent:550,
  windows:[{days:[0,1,2,3,4,5,6],from:480,to:1080},{days:[4,5],from:1080,to:1500}]},
 {id:"juice-bar",name:"Juice & smoothie bar",cat:"cafe",ticket:8,seats:8,floorspace:40,takeaway:90,delivery:10,alcohol:false,terrace:false,franchise:false,
  audience:{office:4,residents:3,young:5,students:3,tourists:2,nightlife:0,families:1,intl:1},rent:600,
  windows:[{days:[0,1,2,3,4,5,6],from:450,to:1080}]},
 {id:"churros",name:"Churros & hot chocolate",cat:"cafe",ticket:8,seats:22,floorspace:60,takeaway:60,delivery:10,alcohol:false,terrace:false,franchise:false,family:true,
  audience:{office:1,residents:4,young:4,students:3,tourists:4,nightlife:3,families:4,intl:3},rent:550,
  windows:[{days:[0,1,2,3,4,5,6],from:660,to:900},{days:[0,1,2,3,4,5,6],from:1080,to:1380}]},
 {id:"sports-bar",name:"Sports bar",cat:"pub_bar",ticket:19,seats:80,floorspace:200,takeaway:0,delivery:0,alcohol:true,terrace:true,franchise:false,
  audience:{office:3,residents:4,young:4,students:2,tourists:1,nightlife:5,families:0,intl:1},rent:500,
  windows:[{days:[0,1,2,3,4,5,6],from:720,to:1440}]},
 {id:"board-game-cafe",name:"Board game cafe",cat:"cafe",ticket:14,seats:45,floorspace:120,takeaway:10,delivery:0,alcohol:true,terrace:false,franchise:false,family:true,
  audience:{office:1,residents:4,young:5,students:3,tourists:1,nightlife:3,families:3,intl:2},rent:400,
  windows:[{days:[1,2,3,4,5,6],from:720,to:1380},{days:[6],from:660,to:1080}]},
 {id:"vegan",name:"Vegan & plant-based restaurant",cat:"restaurant",ticket:22,seats:42,floorspace:100,takeaway:20,delivery:15,alcohol:true,terrace:false,franchise:false,
  audience:{office:3,residents:4,young:5,students:3,tourists:2,nightlife:1,families:1,intl:2},rent:550,
  windows:[{days:[0,1,2,3,4,5,6],from:720,to:900},{days:[0,1,2,3,4,5,6],from:1050,to:1350}]},
 {id:"butcher",name:"Butcher & charcuterie",cat:"grocery",ticket:18,seats:0,floorspace:80,takeaway:100,delivery:5,alcohol:false,terrace:false,franchise:false,
  audience:{office:1,residents:5,young:2,students:0,tourists:0,nightlife:0,families:5,intl:1},rent:400,
  windows:[{days:[0,1,2,3,4,5],from:480,to:1080},{days:[6],from:540,to:840}]},
 {id:"fishmonger",name:"Fishmonger & seafood bar",cat:"grocery",ticket:24,seats:12,floorspace:80,takeaway:80,delivery:5,alcohol:true,terrace:false,franchise:false,
  audience:{office:2,residents:5,young:3,students:0,tourists:2,nightlife:1,families:3,intl:2},rent:500,
  windows:[{days:[1,2,3,4,5,6],from:540,to:1200}]},
 {id:"cheese-shop",name:"Cheese shop & affineur",cat:"grocery",ticket:20,seats:0,floorspace:55,takeaway:95,delivery:5,alcohol:false,terrace:false,franchise:false,
  audience:{office:2,residents:5,young:3,students:0,tourists:2,nightlife:0,families:3,intl:2},rent:450,
  windows:[{days:[1,2,3,4,5,6],from:540,to:1140}]},
 {id:"creperie",name:"Creperie & waffles",cat:"cafe",ticket:10,seats:28,floorspace:70,takeaway:40,delivery:10,alcohol:false,terrace:false,franchise:false,family:true,
  audience:{office:2,residents:4,young:4,students:3,tourists:4,nightlife:1,families:4,intl:2},rent:500,
  windows:[{days:[0,1,2,3,4,5,6],from:600,to:1140}]},
 {id:"neapolitan-pizza",name:"Neapolitan pizzeria",cat:"restaurant",ticket:19,seats:55,floorspace:120,takeaway:20,delivery:20,alcohol:true,terrace:true,franchise:false,
  audience:{office:2,residents:5,young:4,students:2,tourists:2,nightlife:2,families:4,intl:2},rent:500,
  windows:[{days:[0,1,2,3,4,5,6],from:720,to:900},{days:[0,1,2,3,4,5,6],from:1050,to:1380}]},
 {id:"steakhouse",name:"Steakhouse & grill",cat:"restaurant",ticket:45,seats:60,floorspace:160,takeaway:0,delivery:0,alcohol:true,terrace:false,franchise:false,
  audience:{office:3,residents:4,young:2,students:0,tourists:3,nightlife:2,families:2,intl:2},rent:700,
  windows:[{days:[1,2,3,4,5,6],from:1050,to:1410}]},
 {id:"seafood-restaurant",name:"Seafood restaurant",cat:"restaurant",ticket:42,seats:48,floorspace:130,takeaway:0,delivery:0,alcohol:true,terrace:true,franchise:false,
  audience:{office:3,residents:4,young:2,students:0,tourists:4,nightlife:1,families:2,intl:2},rent:650,
  windows:[{days:[1,2,3,4,5,6],from:720,to:900},{days:[0,1,2,3,4,5,6],from:1080,to:1380}]},
 {id:"matcha",name:"Matcha & tea house",cat:"cafe",ticket:9,seats:20,floorspace:55,takeaway:50,delivery:5,alcohol:false,terrace:false,franchise:false,
  audience:{office:3,residents:3,young:5,students:4,tourists:3,nightlife:0,families:0,intl:3},rent:650,
  windows:[{days:[0,1,2,3,4,5,6],from:540,to:1080}]},
 {id:"climbing",name:"Bouldering & climbing gym",cat:"fitness",ticket:22,seats:0,floorspace:600,takeaway:0,delivery:0,alcohol:false,terrace:false,franchise:false,
  audience:{office:2,residents:4,young:5,students:4,tourists:0,nightlife:0,families:1,intl:1},rent:300,
  windows:[{days:[0,1,2,3,4,5,6],from:390,to:540},{days:[0,1,2,3,4,5,6],from:1050,to:1320}]},
 {id:"boxing",name:"Boxing & martial arts gym",cat:"fitness",ticket:23,seats:0,floorspace:300,takeaway:0,delivery:0,alcohol:false,terrace:false,franchise:false,
  audience:{office:2,residents:5,young:4,students:3,tourists:0,nightlife:0,families:1,intl:2},rent:350,
  windows:[{days:[0,1,2,3,4,5],from:390,to:540},{days:[0,1,2,3,4,5],from:1050,to:1260},{days:[6],from:540,to:780}]},
 {id:"estate-agency",name:"Real estate & letting agency",cat:"agents",ticket:1400,seats:0,floorspace:80,takeaway:0,delivery:0,alcohol:false,terrace:false,franchise:false,
  audience:{office:3,residents:5,young:2,students:0,tourists:0,nightlife:0,families:4,intl:2},rent:700,
  windows:[{days:[0,1,2,3,4],from:540,to:1080},{days:[5],from:600,to:960}]},
 {id:"laundrette",name:"Laundrette & dry cleaning",cat:"services",ticket:12,seats:0,floorspace:60,takeaway:0,delivery:15,alcohol:false,terrace:false,franchise:false,
  audience:{office:1,residents:5,young:3,students:4,tourists:0,nightlife:0,families:3,intl:2},rent:350,
  windows:[{days:[0,1,2,3,4,5,6],from:480,to:1200}]},
 {id:"hair-barber",name:"Hairdresser & barber",cat:"services",ticket:32,seats:4,floorspace:60,takeaway:0,delivery:0,alcohol:false,terrace:false,franchise:false,
  audience:{office:2,residents:5,young:4,students:2,tourists:0,nightlife:1,families:3,intl:1},rent:500,
  windows:[{days:[1,2,3,4,5],from:540,to:1140}]},
 {id:"beauty-nails",name:"Beauty & nail salon",cat:"services",ticket:35,seats:4,floorspace:70,takeaway:0,delivery:0,alcohol:false,terrace:false,franchise:false,
  audience:{office:2,residents:4,young:4,students:2,tourists:0,nightlife:1,families:2,intl:1},rent:500,
  windows:[{days:[0,1,2,3,4,5],from:540,to:1200}]},
 {id:"florist",name:"Florist",cat:"services",ticket:28,seats:0,floorspace:45,takeaway:60,delivery:20,alcohol:false,terrace:false,franchise:false,
  audience:{office:2,residents:4,young:3,students:0,tourists:2,nightlife:0,families:3,intl:1},rent:450,
  windows:[{days:[0,1,2,3,4,5],from:480,to:1080}]},
 {id:"optician",name:"Optician & eyewear",cat:"services",ticket:120,seats:0,floorspace:90,takeaway:0,delivery:0,alcohol:false,terrace:false,franchise:true,
  audience:{office:2,residents:5,young:2,students:1,tourists:0,nightlife:0,families:4,intl:1},rent:550,
  windows:[{days:[0,1,2,3,4,5],from:540,to:1080}]},
 {id:"phone-repair",name:"Phone & laptop repair",cat:"services",ticket:55,seats:0,floorspace:35,takeaway:100,delivery:0,alcohol:false,terrace:false,franchise:false,
  audience:{office:3,residents:4,young:4,students:3,tourists:1,nightlife:0,families:1,intl:2},rent:450,
  windows:[{days:[0,1,2,3,4,5,6],from:540,to:1200}]},
 {id:"tattoo",name:"Tattoo & piercing studio",cat:"services",ticket:150,seats:2,floorspace:80,takeaway:0,delivery:0,alcohol:false,terrace:false,franchise:false,
  audience:{office:1,residents:3,young:5,students:3,tourists:1,nightlife:2,families:0,intl:2},rent:450,
  windows:[{days:[1,2,3,4,5],from:660,to:1200}]},
 {id:"bookshop",name:"Bookshop",cat:"services",ticket:14,seats:0,floorspace:90,takeaway:100,delivery:0,alcohol:false,terrace:false,franchise:false,
  audience:{office:2,residents:5,young:3,students:3,tourists:2,nightlife:0,families:3,intl:2},rent:450,
  windows:[{days:[0,1,2,3,4,5,6],from:540,to:1140}]},
 {id:"pet-shop",name:"Pet shop & supplies",cat:"services",ticket:22,seats:0,floorspace:100,takeaway:90,delivery:10,alcohol:false,terrace:false,franchise:false,
  audience:{office:0,residents:5,young:2,students:0,tourists:0,nightlife:0,families:5,intl:1},rent:400,
  windows:[{days:[0,1,2,3,4,5,6],from:540,to:1140}]},
 {id:"charity-shop",name:"Charity & second-hand shop",cat:"services",ticket:7,seats:0,floorspace:110,takeaway:100,delivery:0,alcohol:false,terrace:false,franchise:true,
  audience:{office:0,residents:5,young:3,students:3,tourists:0,nightlife:0,families:3,intl:2},rent:250,
  windows:[{days:[0,1,2,3,4,5],from:540,to:1080}]},
 {id:"pharmacy",name:"Pharmacy & chemist",cat:"pharmacy",ticket:12,seats:0,floorspace:120,takeaway:100,delivery:5,alcohol:false,terrace:false,franchise:true,
  audience:{office:2,residents:5,young:1,students:0,tourists:1,nightlife:0,families:4,intl:1},rent:550,
  windows:[{days:[0,1,2,3,4],from:480,to:1140},{days:[5],from:540,to:1080}]},
 {id:"vet",name:"Vet practice",cat:"vets",ticket:65,seats:2,floorspace:150,takeaway:0,delivery:0,alcohol:false,terrace:false,franchise:false,
  audience:{office:0,residents:5,young:2,students:0,tourists:0,nightlife:0,families:4,intl:1},rent:400,
  windows:[{days:[0,1,2,3,4],from:480,to:1140},{days:[5],from:540,to:900}]},
];

/* neutral starting point for "start from scratch" - fully manual concept */
const SCRATCH={id:"scratch",name:"My concept",cat:"cafe",ticket:12,seats:30,floorspace:70,takeaway:30,delivery:10,
 alcohol:false,terrace:false,franchise:false,family:false,compStance:0,
 audience:{office:3,residents:3,young:3,students:1,tourists:1,nightlife:0,families:2,intl:1},rent:600,
 priorities:{rent:3,access:3,safety:3,green:3,residential:3},
 windows:[{days:[0,1,2,3,4],from:480,to:1080}]};

/* fill defaults for fields older presets do not set */
function normalizeConcept(c){
  c.priorities=Object.assign({rent:3,access:3,safety:3,green:3,residential:3},c.priorities||{});
  c.compStance=c.compStance??0;
  c.family=c.family??false;
  AUDIENCES.forEach(([k])=>{c.audience[k]=c.audience[k]??0;});
  return c;
}

const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const fmt=n=>n>=1e6?(n/1e6).toFixed(1)+"m":n>=1e3?Math.round(n/1e3)+"k":Math.round(n);
const money=n=>"£"+Math.round(n).toLocaleString("en-GB");
const mm=v=>{let h=Math.floor(v/60)%24,m=v%60;return String(h).padStart(2,"0")+":"+String(m).padStart(2,"0")};
function estRates(s,c){ // business rates proxy: unit RV ~ est rent; SBRR 2025-26
  const rvUnit=s.rent.est_rent_m2*c.floorspace;
  if(rvUnit<12000)return 0;
  const relief=rvUnit<15000?1-(rvUnit-12000)/3000:0;
  return rvUnit*0.499*(1-relief);
}

/* ---------- concept state ---------- */
const OTHER=Object.assign(JSON.parse(JSON.stringify(SCRATCH)),{id:"other",name:"Other - concept not listed",cat:"other"});
let concept=normalizeConcept(JSON.parse(JSON.stringify(PRESETS[0])));
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
const nParksV=logNorm(SEGS.map(s=>s.osm.parks_600));const nParks=s=>nParksV(s.osm.parks_600);
const nCoworkV=logNorm(SEGS.map(s=>s.osm.cowork));const nCowork=s=>nCoworkV(s.osm.cowork);
const nFamiliesV=logNorm(SEGS.map(s=>s.lsoa.pct_under20*0.6+s.osm.parks_600*8));const nFamilies=s=>nFamiliesV(s.lsoa.pct_under20*0.6+s.osm.parks_600*8);
const nDivV=norm(SEGS.map(s=>s.lsoa.diversity));const nDiv=s=>nDivV(s.lsoa.diversity);
const nNonUKV=norm(SEGS.map(s=>s.lsoa.pct_nonuk));const nNonUK=s=>nNonUKV(s.lsoa.pct_nonuk);
const nSpendV=norm(SEGS.map(s=>s.model.spend_est));const nSpend=s=>nSpendV(s.model.spend_est);
const HAS_CRIME=SEGS.some(s=>s.crime);const nCrimeV=norm(SEGS.map(s=>s.crime?s.crime.per1000:0));const nCrime=s=>s.crime?nCrimeV(s.crime.per1000):0.5;
/* competition radius per category: impulse concepts compete over a short walk, destination/membership concepts over a long one */
const COMPR={"cafe":400,"fast_food":400,"services":500,"grocery":600,"pharmacy":600,"pub_bar":600,"restaurant":800,"shops":800,"vets":800,"fitness":1000,"cowork":1000,"agents":1000};
window.COMPR=COMPR;
const compCount=(s,c)=>(s.osm["comp_"+c]??s.osm[c])||0;
const compChain=(s,c)=>(s.osm["comp_"+c+"_chain"]??s.osm[c+"_chain"])||0;
const isOther=c=>!(c.cat in COMPR); /* Other/custom concept: no defined rival set - competition is not scored */
const CATNORM={};
["cafe","restaurant","fast_food","pub_bar","grocery","fitness","cowork","services","agents","pharmacy","vets"].forEach(c=>{
  CATNORM[c]=norm(SEGS.map(s=>Math.log10(1+compCount(s,c))));
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
    intl:clamp(0.5*nDiv(s)+0.5*nNonUK(s),0,1),
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
  const aw={...c.audience}; if(c.family)aw.families=Math.min(10,(aw.families||0)+3); // family-friendly focus counts families extra
  const awSum=Object.values(aw).reduce((a,b)=>a+b,0);
  const audFit=awSum?Object.keys(aw).reduce((acc,k)=>acc+aw[k]*sup[k],0)/awSum:0.5;

  const demandRaw=allDemand(s);
  const compN=isOther(c)?null:catN(c.cat,compCount(s,c.cat));
  const chainShare=compCount(s,c.cat)? compChain(s,c.cat)/compCount(s,c.cat):0;

  const rv=s.rent.retail_rv_m2;
  const rentFit=rv?clamp(c.rent/rv,0,1):0.5;

  const ticketGap=Math.abs(c.ticket-s.model.spend_est)/Math.max(s.model.spend_est,1);
  const ticketFit=clamp(1-ticketGap*1.4,0,1);

  // format fit: average of the relevant sub-signals
  let ff=[],ffw=[];
  if(c.takeaway>25){ff.push(nFlowAnnual(s));ffw.push(1);}
  if(c.delivery>15){ff.push(0.6*nResidents(s)+0.4*nYoung(s));ffw.push(1);}
  if(c.alcohol){ff.push(sup.nightlife);ffw.push(1);}
  if(c.terrace){const foodN=(s.osm.cafe||0)+(s.osm.restaurant||0)+(s.osm.fast_food||0)+(s.osm.pub_bar||0);const terrEff=s.osm.terrace_share*foodN/(foodN+2);ff.push(clamp(0.5*terrEff+0.5*nParks(s),0,1));ffw.push(1);}
  if(c.franchise){ff.push(clamp(0.5+chainShare*0.5,0,1));ffw.push(0.6);}
  else {ff.push(clamp(1-chainShare*0.9,0,1));ffw.push(0.6);}
  const formatFit=ff.length?ff.reduce((a,b,i)=>a+b*ffw[i],0)/ffw.reduce((a,b)=>a+b,0):0.5;

  const access=clamp(0.5*nFlowAnnual(s)+0.5*nStations(s),0,1);
  const safety=HAS_CRIME?1-nCrime(s):0.5;
  const green=nParks(s);

  const crit={
    demand:{score:0,raw:demandRaw,w:0.24,label:"Demand at your hours",how:"obs+mod"},
    audience:{score:audFit,w:0.18,label:"Audience match",how:"obs+ctx"},
    opportunity:{score:0,w:0.16,label:"Demand vs competition",how:"obs+mod"},
    ticket:{score:ticketFit,w:0.10,label:"Ticket fit",how:"mod"},
    rent:{score:rentFit,w:0.12,label:"Rent fit",how:"ctx"},
    format:{score:formatFit,w:0.10,label:"Format fit",how:"obs+mod"},
    access:{score:access,w:0.07,label:"Transport access",how:"obs"},
    safety:{score:safety,w:HAS_CRIME?0.02:0,label:"Business crime (inverse)",how:"ctx"},
    green:{score:green,w:0.01,label:"Green space",how:"obs"},
    residential:{score:nResidents(s),w:0.05,label:"Residential base",how:"ctx"},
  };
  // weight tweaks from concept attributes
  if(c.delivery>30){crit.audience.w+=0.04;crit.demand.w-=0.04;}
  if(c.alcohol){crit.format.w+=0.03;crit.safety.w+=0.01;crit.green.w-=0.01;crit.access.w-=0.03;}
  if(c.terrace){crit.green.w+=0.03;crit.demand.w-=0.03;}
  if(c.family){crit.safety.w+=0.02;crit.green.w+=0.02;crit.demand.w-=0.02;crit.access.w-=0.02;}
  // user-set priorities rescale the weights (3 = standard, 0 = ignore, 5 = dominate)
  const pr=c.priorities||{};
  crit.rent.w*=(pr.rent??3)/3; crit.access.w*=(pr.access??3)/3;
  crit.safety.w*=(pr.safety??3)/3; crit.green.w*=(pr.green??3)/3;
  crit.residential.w*=(pr.residential??3)/3;
  if(!HAS_CRIME)crit.safety.w=0;
  return crit;
}

/* ---------- revenue engine (MODELLED) ---------- */
const REV={
  cafe:{capture:0.020,dil:0.12,prop:0.30,turns:20,thru:6},
  restaurant:{capture:0.012,dil:0.10,prop:0.12,turns:12,thru:2},
  fast_food:{capture:0.018,dil:0.12,prop:0.18,turns:25,thru:12},
  pub_bar:{capture:0.015,dil:0.06,prop:0.15,turns:12,thru:1.5},
  grocery:{capture:0.030,dil:0.15,prop:0.80,turns:0,thru:25},
  fitness:{capture:0,dil:0.25,prop:0},
  cowork:{capture:0,dil:0.30,prop:0},
  services:{capture:0.002,dil:0.15,prop:0.02,turns:12,thru:2},
  agents:{capture:0.00005,dil:0.20,prop:0.002,turns:0,thru:0},
  pharmacy:{capture:0.020,dil:0.20,prop:0.50,turns:0,thru:30},
  vets:{capture:0.001,dil:0.25,prop:0.02,turns:6,thru:1},
};
const DAYREL7=s=>DAYTYPE.reduce((a,k)=>a+s.flow.day_rel[k],0);
function weeklyFlowAbs(s){const d=s.flow.days;return d.mon+3*d.mid+d.fri+d.sat+d.sun;}
function revenueFor(s,c){
  const R=REV[c.cat]||REV.cafe;
  const cover=clamp(windowDemand(s,c)/DAYREL7(s),0,1);
  const people=weeklyFlowAbs(s)*cover;
  const comp=isOther(c)?1:1/(1+R.dil*compCount(s,c.cat)); /* Other: no dilution applied, shown as not scored */
  const sup=audienceSupply(s);
  const aw={...c.audience}; if(c.family)aw.families=Math.min(10,(aw.families||0)+3);
  const awSum=Object.values(aw).reduce((a,b)=>a+b,0);
  const audFit=awSum?Object.keys(aw).reduce((acc,k)=>acc+aw[k]*sup[k],0)/awSum:0.5;
  const aud=0.5+audFit;
  let month,weekTrans,members,capped=false;
  if(c.cat==="fitness"){
    members=(s.lsoa.residents*0.06+people*0.0015)*comp*aud;
    const joined=Math.min(c.seats*10,members);
    month=joined*c.ticket*2.6; weekTrans=0;
  }else if(c.cat==="cowork"){
    const demand=(s.lsoa.residents*0.02+people*0.0008)*comp*aud;
    const desks=Math.min(c.seats,demand);
    month=desks*c.ticket*9; weekTrans=0; members=desks;
  }else{
    const raw=people*R.capture*comp*aud + s.lsoa.residents*R.prop*comp*aud;
    const cap=c.seats*R.turns + c.floorspace*R.thru; // weekly throughput the unit can physically serve
    capped=cap>0&&raw>cap;
    weekTrans=capped?cap*Math.pow(raw/cap,0.4):raw; // soft capacity: queues and faster turns absorb some excess, with diminishing returns
    month=weekTrans*c.ticket*4.33;
  }
  return {month,low:month*0.55,high:month*1.6,weekTrans,people,cover,comp,aud,members,capped};
}

/* second pass needs demand normalization across segments */
function computeAll(c){
  const raws=SEGS.map(s=>windowDemand(s,c));
  const nDem=norm(raws);
  const out=SEGS.map((s,i)=>{
    const crit=scoreSegment(s,c);
    // demand at hours = rhythm match x absolute flow magnitude (log-scaled): a perfect rhythm with nobody passing is not demand
    const dem=nDem(raws[i])*nFlowAnnual(s);
    crit.demand.score=dem;
    // opportunity: demand tempered by saturation
    const compN=isOther(c)?null:catN(c.cat,compCount(s,c.cat));
    if(compN===null){ crit.opportunity.score=null; crit.opportunity.w=0; crit.opportunity.label="Demand vs competition (not scored for a custom concept)"; }
    else{
      const stance=(c.compStance||0)/100; // 0 = avoid rivals, 1 = proven clusters attract you
      const pen=0.65-0.85*stance; // penalty on saturated areas flips to a mild cluster bonus
      crit.opportunity.score=clamp(dem*(1-pen*compN)+0.15*(1-stance)*(1-compN),0,1);
    }
    let wsum=0,acc=0;
    for(const k in crit){acc+=crit[k].score*crit[k].w;wsum+=crit[k].w;}
    return {seg:s,crit,score:100*acc/wsum,rev:revenueFor(s,c)};
  });
  out.sort((a,b)=>b.score-a.score);
  return out;
}

/* ---------- concept UI ---------- */
function chipFor(how){
  return how==="obs"?' <span class="chip obs">OBSERVED</span>':how==="ctx"?' <span class="chip ctx">AREA CONTEXT</span>':how==="cur"?' <span class="chip cur">CURATED</span>':' <span class="chip mod">MODELLED</span>';
}

const PRESETS_VISIBLE=9; /* two rows of five incl. Start from scratch; the rest behind the toggle */
let presetsExpanded=false, presetFilter="all";
const CATLABEL={cafe:"Café & coffee",restaurant:"Restaurants",pub_bar:"Pubs & bars",fast_food:"Fast food",grocery:"Grocery & food retail",fitness:"Fitness & gyms",cowork:"Workspace",services:"Services",agents:"Estate agents",pharmacy:"Pharmacy",vets:"Vets"};
function renderPresets(){
  const sel=activePreset==="other"?OTHER:PRESETS.find(p=>p.id===activePreset);
  const ORDERED=[...PRESETS.slice(0,5),...PRESETS.slice(5).sort((a,b)=>a.name.localeCompare(b.name))]; /* first row curated, rest alphabetical */
  const pool=presetFilter==="all"?ORDERED:ORDERED.filter(p=>p.cat===presetFilter);
  let visible=presetsExpanded?pool.slice():ORDERED.slice(0,PRESETS_VISIBLE);
  if(sel&&sel.id!=="other"&&!visible.some(p=>p.id===sel.id)) visible.push(sel); /* keep the active preset on screen */
  const filterRow=presetsExpanded
    ? `<div class="preset-filters"><span class="pf-label">Filter by category:</span><button class="preset filter ${presetFilter==="all"?"active":""}" data-f="all">All</button>`
      +Object.keys(CATLABEL).filter(c=>PRESETS.some(p=>p.cat===c)).map(c=>`<button class="preset filter ${presetFilter===c?"active":""}" data-f="${c}">${CATLABEL[c]}</button>`).join("")
      +`</div>`:"";
  $("preset-row").innerHTML=filterRow+visible.map(p=>`<button class="preset ${p.id===activePreset?'active':''}" data-p="${p.id}">${p.name}</button>`).join("")
    +`<button class="preset scratch ${activePreset==='scratch'?'active':''}" data-p="scratch">Start from scratch - no template</button>`
    +`<button class="preset more" data-p="__more">${presetsExpanded?'See fewer concepts':'See more concepts ('+(PRESETS.length-PRESETS_VISIBLE)+' more)'}</button>`;
  document.querySelectorAll(".preset").forEach(b=>b.onclick=()=>{
    if(b.dataset.f){presetFilter=b.dataset.f;renderPresets();return;}
    if(b.dataset.p==="__more"){presetsExpanded=!presetsExpanded;renderPresets();return;}
    activePreset=b.dataset.p;
    const base=activePreset==="scratch"?SCRATCH:activePreset==="other"?OTHER:PRESETS.find(p=>p.id===activePreset);
    concept=normalizeConcept(JSON.parse(JSON.stringify(base)));
    renderPresets(); renderConcept(); update();
  });
}

function sliderField(label,key,min,max,step,fmtf){
  return `<div class="field"><label>${label}<b id="v-${key}">${fmtf(concept[key])}</b></label>
  <input type="range" min="${min}" max="${max}" step="${step}" value="${concept[key]}" data-k="${key}"></div>`;
}
function prioField(label,key){
  return `<div class="field"><label>${label}<b id="vp-${key}">${concept.priorities[key]}</b></label>
  <input type="range" min="0" max="5" step="1" value="${concept.priorities[key]}" data-pr="${key}"></div>`;
}
function audField(label,key){
  return `<div class="field"><label>${label}<b id="av-${key}">${concept.audience[key]}</b></label>
  <input type="range" min="0" max="5" step="1" value="${concept.audience[key]}" data-aud="${key}"></div>`;
}

function rentReference(){
  const londonBands=["Zone 1","Zone 2","Zone 3","Zone 4"];
  const cityBands=["City centre","1.5-4 km from centre","4-8 km from centre","8-15 km from centre","15+ km from centre"];
  const bands=CITY.id==="london"?londonBands:cityBands;
  const rows=bands.map(zone=>{
    const vals=SEGMENTS.filter(s=>s.zone===zone&&Number.isFinite(+s.rent?.retail_rv_m2)).map(s=>+s.rent.retail_rv_m2);
    return vals.length?`<span><b>${zone}</b><i>${money(vals.reduce((a,b)=>a+b,0)/vals.length)}/m²/yr</i></span>`:"";
  }).filter(Boolean).join("");
  const basis=(CITY.id==="glasgow"||CITY.id==="edinburgh")?"SAA-derived retail RV proxy":"VOA retail rateable value";
  return `<div class="rent-ref"><strong>${CITY.name} reference ${chipFor("ctx")}</strong><div>${rows}</div><small>Average ${basis} across this tool's published segments in each ${CITY.id==="london"?"transport zone":"distance band"}; not an asking-rent quote.</small></div>`;
}

function renderConcept(){
  const c=concept;
  const audRows=AUDIENCES.map(([k,label])=>audField(label,k)).join("");
  const cats=[["cafe","Cafe / coffee"],["restaurant","Restaurant"],["fast_food","Fast food"],["pub_bar","Pub / bar"],["grocery","Grocery & food retail"],["fitness","Fitness"],["cowork","Coworking"]];
  $("concept-grid").innerHTML=`
  <div class="cg-card"><h3>Format &amp; offer</h3>
    <div class="field"><label>Concept name</label><input type="text" id="c-name" value="${(c.name||"").replace(/"/g,"&quot;")}" maxlength="60"></div>
    <div class="field"><label>Category</label><select id="c-cat">${cats.map(([k,l])=>`<option value="${k}" ${c.cat===k?"selected":""}>${l}</option>`).join("")}<option value="other" ${c.cat==="other"?"selected":""}>Other - my concept is not listed (competition not scored)</option></select>
    ${c.cat==="other"?'<p style="font-size:12px;color:var(--muted);margin:6px 0 0">A custom concept has no defined rival set, so competition does not enter the score and no dilution is applied to the revenue estimate.</p>':""}</div>
    ${sliderField("Average ticket (per person)","ticket",3,120,1,money)}
    ${sliderField("Seats / capacity","seats",0,200,2,v=>v)}
    ${sliderField("Floorspace (m²)","floorspace",15,400,5,v=>v+" m²")}
    ${sliderField("Takeaway share of sales","takeaway",0,100,5,v=>v+"%")}
    ${sliderField("Delivery share of sales","delivery",0,100,5,v=>v+"%")}
    <div class="toggles">
      <span class="tog ${c.alcohol?'on':''}" data-tog="alcohol">Alcohol licence</span>
      <span class="tog ${c.terrace?'on':''}" data-tog="terrace">Outdoor terrace</span>
      <span class="tog ${c.franchise?'on':''}" data-tog="franchise">Franchise / chain format</span>
      <span class="tog ${c.family?'on':''}" data-tog="family">Family-friendly focus</span>
    </div>
  </div>
  <div class="cg-card aud-card"><h3>Target audience <span style="font-weight:500;color:var(--muted);font-size:12px">0 = irrelevant, 5 = core</span></h3>
    <div class="aud-fields">${audRows}</div>
  </div>
  <div class="cg-card"><h3>Opening windows <span style="font-weight:500;color:var(--muted);font-size:12px">exact days and hours</span></h3>
    <div class="win-list" id="win-list"></div>
    <button class="add-win" id="add-win">+ Add a trading window</button>
  </div>
  <div class="cg-card money-card"><h3>Money</h3>
    ${sliderField("Rent tolerance (rateable-value proxy, £/m²/yr)","rent",100,1500,25,v=>money(v)+"/m²")}
    ${rentReference()}
  </div>
  <div class="cg-card priorities-card"><h3>Priorities &amp; competition <span style="font-weight:500;color:var(--muted);font-size:12px">3 = standard, 0 = ignore, 5 = dominate</span></h3>
    ${sliderField("Competition stance: avoid rivals (0) - seek proven clusters (100)","compStance",0,100,5,v=>v)}
    <div class="priority-fields">
      ${prioField("Low rent matters","rent")}
      ${prioField("Transport access matters","access")}
      ${HAS_CRIME?prioField("Low business crime matters","safety"):""}
      ${prioField("Green space matters","green")}
      ${prioField("Strong residential base matters","residential")}
    </div>
    <p class="priority-note">These re-weight the criteria in the score. Stance flips rivals from a penalty into a cluster bonus.</p>
  </div>`;
  document.querySelectorAll("[data-k]").forEach(el=>el.oninput=()=>{
    concept[el.dataset.k]=+el.value;
    const f={ticket:money,rent:v=>money(v)+"/m²",floorspace:v=>v+" m²",takeaway:v=>v+"%",delivery:v=>v+"%",seats:v=>v,compStance:v=>v}[el.dataset.k]||(v=>v);
    $("v-"+el.dataset.k).textContent=f(+el.value); update();
  });
  document.querySelectorAll("[data-pr]").forEach(el=>el.oninput=()=>{
    concept.priorities[el.dataset.pr]=+el.value; $("vp-"+el.dataset.pr).textContent=el.value; update();
  });
  $("c-name").oninput=e=>{concept.name=e.target.value; update();};
  $("c-cat").onchange=e=>{concept.cat=e.target.value; if(concept.cat==="other"){activePreset="other";}else if(activePreset==="other"){activePreset="scratch";} renderPresets(); renderConcept(); update();};
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
let map,markers={},mapMetric="fit",revScale=v=>0.5,unitsLayer=null,unitsOn=false,unitsAuto=false,streetLayer=null,streetsOn=false,streetsAuto=false;
function scoreColor(v){const hue=v*1.2;return `hsl(${hue},70%,72%)`;}
function revColor(v){return `hsl(${205-v*150},72%,${68-v*22}%)`;} // low: light blue, high: deep red
function initMap(){
  map=L.map("leaflet-map",{maxZoom:19,zoomSnap:0.5,zoomControl:false}).setView(CITY.mapCenter,CITY.mapZoom);
  L.control.zoom({position:"topright"}).addTo(map);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',maxZoom:19}).addTo(map);
  map.on("zoomend",()=>{
    const z=map.getZoom();
    if(z>=15&&!unitsOn){unitsOn=true;unitsAuto=true;renderMapControls();update();}
    else if(z<14&&unitsAuto&&unitsOn){unitsOn=false;unitsAuto=false;renderMapControls();update();}
    if(z>=12.5&&!streetsOn){streetsOn=true;streetsAuto=true;renderMapControls();update();}
    else if(z<12&&streetsAuto&&streetsOn){streetsOn=false;streetsAuto=false;renderMapControls();update();}
  });
  streetLayer=L.layerGroup();
  SEGS.forEach(s=>{
    const st=s.lvl==="street", sz=st?16:26;
    const m=L.marker([s.lat,s.lng],{icon:L.divIcon({className:"leaflet-div-icon",html:`<div class="pin${st?" pin-st":""}" style="background:#ddd"><span>·</span></div>`,iconSize:[sz,sz],iconAnchor:[sz/2,st?14:26]})});
    if(st) streetLayer.addLayer(m); else m.addTo(map);
    m.on("click",()=>selectSegment(s.id));
    markers[s.id]=m;
  });
}
function paintMarkers(ranked){
  window._revById={}; ranked.forEach(r=>window._revById[r.seg.id]=r.rev.month);
  const byId={},byRev={}; ranked.forEach(r=>{byId[r.seg.id]=r.score;byRev[r.seg.id]=r.rev.month;});
  const lv=ranked.map(r=>Math.log10(1+r.rev.month));
  const lo=Math.min(...lv),hi=Math.max(...lv);
  revScale=v=>hi>lo?(Math.log10(1+v)-lo)/(hi-lo):0.5;
  const top20=new Set(ranked.slice(0,20).map(r=>r.seg.id)); /* map shows only the top 20, matching the ranking table */
  SEGS.forEach(s=>{
    const st=s.lvl==="street", sz=st?16:26, anch=st?[8,14]:[13,26];
    const lyr=markers[s.id],onMap=st?streetLayer.hasLayer(lyr):map.hasLayer(lyr);
    if(!top20.has(s.id)){if(onMap){st?streetLayer.removeLayer(lyr):map.removeLayer(lyr);}return;}
    if(!onMap){st?streetLayer.addLayer(lyr):lyr.addTo(map);}
    if(mapMetric==="fit"){
      const v=byId[s.id];
      markers[s.id].setIcon(L.divIcon({className:"leaflet-div-icon",
        html:`<div class="pin${st?" pin-st":""}" style="background:${scoreColor(v/100)}"><span>${st?"":Math.round(v)}</span></div>`,iconSize:[sz,sz],iconAnchor:anch}));
      markers[s.id].setZIndexOffset(st?Math.round(v):Math.round(v*10)+1000);
    }else{
      const rv=byRev[s.id],t=revScale(rv);
      markers[s.id].setIcon(L.divIcon({className:"leaflet-div-icon",
        html:`<div class="pin${st?" pin-st":""}" style="background:${revColor(t)}"><span>${st?"":fmt(rv)}</span></div>`,iconSize:[sz,sz],iconAnchor:anch}));
      markers[s.id].setZIndexOffset(st?Math.round(t*100):Math.round(t*1000)+1000);
    }
  });
  if(unitsOn){clearTimeout(window._uT);window._rk=ranked;window._uT=setTimeout(()=>paintUnits(window._rk),450);}
}

/* every real commercial unit, coloured by estimated monthly revenue for the active concept */
let unitGrid=null;
function buildUnitGrid(){
  const g={}; const key=(la,ln)=>Math.round(la*450)+":"+Math.round(ln*450);
  UNITS.forEach((u,i)=>{(g[key(u[0],u[1])]??=[]).push(i);});
  unitGrid={g,key};
}
function comp150(u,catIdx){
  if(!unitGrid)buildUnitGrid();
  const ck=unitGrid.key(u[0],u[1]); let n=0;
  for(let da=-1;da<=1;da++)for(let db=-1;db<=1;db++){
    const cell=unitGrid.g[(Math.round(u[0]*450)+da)+":"+(Math.round(u[1]*450)+db)];
    if(!cell)continue;
    for(const i of cell){
      const v=UNITS[i];
      if(v[2]!==catIdx)continue;
      const dlat=(v[0]-u[0])*111000, dlng=(v[1]-u[1])*111000*Math.cos(u[0]*Math.PI/180);
      if(dlat*dlat+dlng*dlng<=150*150)n++;
    }
  }
  return n;
}
function unitRevenue(u,ranked){
  const base=(window._revById||{})[SEGMENTS[u[4]].id]||0;
  const distF=Math.exp(-(u[5]||0)/450);
  const c150=comp150(u,UNITCATS.indexOf(concept.cat));
  const compF=c150<=2?1.15:c150>=8?0.75:1.0;
  return base*distF*compF;
}
function paintUnits(ranked){
  if(unitsLayer){map.removeLayer(unitsLayer);unitsLayer=null;}
  if(!unitsOn||!ranked)return;
  unitsLayer=L.layerGroup();
  const canvasRenderer=L.canvas({padding:0.4});
  const rvs=UNITS.map(u=>unitRevenue(u,ranked));
  const lv=rvs.map(v=>Math.log10(1+v)),lo=Math.min(...lv),hi=Math.max(...lv);
  const t=v=>hi>lo?(Math.log10(1+v)-lo)/(hi-lo):0.5;
  UNITS.forEach((u,i)=>{
    const rv=rvs[i];
    const rad=map.getZoom()>=16?5:3.5;
    const m=L.circleMarker([u[0],u[1]],{renderer:canvasRenderer,radius:rad,weight:0,fillColor:revColor(t(rv)),fillOpacity:0.6});
    m.on("click",()=>{
      const catName=UNITCATS[u[2]].replace("_"," ");
      L.popup().setLatLng([u[0],u[1]]).setContent( // eslint ok
        `<b>${u[6]||catName}</b><br>${catName}${u[8]?" · "+u[8]:""}${u[3]?" · chain":""}${u[7]?"<br>"+u[7]:""}<br>Est. revenue for “${concept.name}” here: <b>${money(rv)}/mo</b> <span class="chip mod">MODELLED</span><br><span style="font-size:11px;color:#777">Segment base ${money(rankedCache.find(x=>x.seg.id===SEGMENTS[u[4]].id)?.rev.month||0)}/mo x distance and hyperlocal competition factors. Planning estimate only.</span>`
      ).openOn(map);
    });
    unitsLayer.addLayer(m);
  });
  unitsLayer.addTo(map);
}

/* ---------- ranking list ---------- */
let rankedCache=[];
function renderRankings(ranked){
  rankedCache=ranked;
  $("ranking-sub").textContent=`The 20 best-matching segments (areas and streets) out of ${ranked.length}, sorted by overall fit for the current concept. The map shows these 20 only.`;
  $("rank-list").innerHTML=ranked.slice(0,20).map((r,i)=>{
    const s=r.seg;
    return `<div class="rank-row" data-sel="${s.id}">
      <div class="rank-num">${i+1}</div>
      <div class="rank-name">${s.name}<span class="sub">${s.zone} · ${s.borough}</span></div>
      <div class="cell"><span class="scorepill">${Math.round(r.score)}</span></div>
      <div class="cell"><span class="v rev">${money(r.rev.month)}/mo</span><span class="k">Est. revenue</span></div>
      <div class="cell opt"><span class="v">${Math.round(r.crit.demand.score*100)}</span><span class="k">Demand@hours</span></div>
      <div class="cell opt"><span class="v">${Math.round(r.crit.opportunity.score*100)}</span><span class="k">Opportunity</span></div>
      <div class="cell opt"><span class="v">${Math.round(r.crit.rent.score*100)}</span><span class="k">Rent fit</span></div>
      <div class="cell opt"><span class="v">${Math.round(r.crit.access.score*100)}</span><span class="k">Access</span></div>
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
  const maxDay=Math.max(1,...Object.values(fl.days));
  const dayBars=[["Mon","mon"],["Tue-Thu","mid"],["Fri","fri"],["Sat","sat"],["Sun","sun"]].map(([l,k])=>
    `<div class="col"><div class="b" style="height:${Math.max(2,80*fl.days[k]/maxDay)}px"></div><div class="t">${l}</div></div>`).join("");
  const windowsTxt=concept.windows.map(w=>`${w.days.map(d=>DAYNAMES[d]).join(" ")} ${mm(w.from)}-${mm(w.to%1560)}`).join(" · ")||"no windows set";
  const catCount=compCount(s,concept.cat), catChain=compChain(s,concept.cat);

  const critRows=Object.values(r.crit).filter(cr=>cr.w>0.001).sort((a,b)=>b.w-a.w).map(cr=>`
    <div class="crit-row"><div>${cr.label}${chipFor(cr.how==="obs"?"obs":cr.how==="ctx"?"ctx":"mod")}</div>
    <div class="bar"><i class="${cr.score<0.4?'neg':''}" style="width:${Math.round(cr.score*100)}%"></i></div>
    <div class="cw">${Math.round(cr.score*100)} · w ${(cr.w*100).toFixed(0)}%</div></div>`).join("");

  const anchors=s.anchors.map(a=>`<div class="ev-line"><span class="lv">${a.station} (${a.mode}${a.src==="ORR"?" · ORR":""})</span><span class="rv">${fmt(a.annual)}/yr</span></div>`).join("");
  const stn=s.transport.names.slice(0,6).map(n=>`<div class="ev-line"><span class="lv">${n}</span></div>`).join("");
  const topEth=s.lsoa.top_eth.map(([g,p])=>`<div class="ev-line"><span class="lv">${g}</span><span class="rv">${p}%</span></div>`).join("");

  const compList=((typeof COMPETITORS!=="undefined"?COMPETITORS[s.id]:null)||{})[concept.cat]||[];
  const compRows=compList.map(c=>`<div class="ev-line"><span class="lv">${c[0]}${c[1]?` <span class="cui">${c[1]}</span>`:""}</span><span class="rv">${c[2]?'<span class="chainb">chain</span> ':""}${c[3]} m</span></div>`).join("");
  const segIdx=SEGMENTS.indexOf(s), byStreet={};
  UNITS.forEach(u=>{if(u[4]===segIdx&&u[7]){(byStreet[u[7]]??=[]).push(u);}});
  const streetRows=Object.entries(byStreet).map(([st,us])=>{
    const avg=us.reduce((a,u)=>a+unitRevenue(u,rankedCache),0)/us.length;
    return {st,n:us.length,avg,clat:us.reduce((a,u)=>a+u[0],0)/us.length,clng:us.reduce((a,u)=>a+u[1],0)/us.length};
  }).sort((a,b)=>b.avg-a.avg).slice(0,8);
  const strengths=Object.values(r.crit).filter(x=>x.w>0.001).sort((a,b)=>b.score*b.w-a.score*a.w).slice(0,2);
  const weak=Object.values(r.crit).filter(x=>x.w>0.001).sort((a,b)=>a.score*b.w-b.score*b.w).slice(0,2);
  const pct=x=>Math.round(x*100);

  $("detail-empty").hidden=true; const dp=$("detail-panel"); dp.hidden=false;
  dp.innerHTML=`
  <div class="dp-head"><div><h2>${s.name}</h2><div class="zone">${s.zone} · ${s.borough} · segment type: ${s.stype.replace(/_/g," ")}${chipFor("cur")}</div></div>
  <div class="dp-score">${Math.round(r.score)}</div></div>
  <div class="model-cta detail-model-cta"><b>Need investment-grade analysis?</b><span>These results are estimates from a simple model and public data. Get better data, a deeper report and hands-on geomarketing.</span><a href="#expert" data-expert>Tell us about your project →</a></div>
  <p class="dp-why"><b>For “${concept.name}”</b> trading ${windowsTxt}: strongest on ${strengths.map(x=>x.label.toLowerCase()).join(" and ")} (${strengths.map(x=>pct(x.score)).join(" / ")}); weakest on ${weak.map(x=>x.label.toLowerCase()).join(" and ")} (${weak.map(x=>pct(x.score)).join(" / ")}).</p>
  <div class="crit">${critRows}</div>
  <div class="dp-cols">
    <div class="ev-card"><h4>Movement at named stations${chipFor(s.weak?"mod":"obs")}</h4>
      ${s.weak?`<div class="ev-line"><span class="lv">${s.flow.modelled_from?`Street pitch - no count taken on this street itself. Flow MODELLED as ~${Math.round((s.flow.share||0)*100)}% of the ${s.flow.modelled_from} catchment, whose stations are listed below.`:`No station count within 900 m of this street - it has no flow anchor. Offer, audience, rents${HAS_CRIME?" and crime":""} below still use observed data.`}</span></div>`:''}
      ${anchors}
      <div class="ev-line"><span class="lv">Combined typical-day entries + exits (${CITY.texts.flowCredit||"TfL Annual Station Counts 2025; NR stations: ORR 2024-25"})</span></div>
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
      ${s.osm.services!=null?`<div class="ev-line"><span class="lv">Everyday services (hair, beauty, laundry, repair)</span><span class="rv">${s.osm.services}</span></div>`:""}
      ${s.osm.agents!=null?`<div class="ev-line"><span class="lv">Estate &amp; letting agents</span><span class="rv">${s.osm.agents}</span></div>`:""}
      ${s.osm.pharmacy!=null?`<div class="ev-line"><span class="lv">Pharmacies</span><span class="rv">${s.osm.pharmacy}</span></div>`:""}
      ${s.osm.vets!=null?`<div class="ev-line"><span class="lv">Vets</span><span class="rv">${s.osm.vets}</span></div>`:""}
      <div class="ev-line"><span class="lv">Culture &amp; attractions</span><span class="rv">${s.osm.culture}</span></div>
      <div class="ev-line"><span class="lv">Food venues with outdoor seating</span><span class="rv">${Math.round(s.osm.terrace_share*100)}%</span></div>
      ${isOther(concept)?`<div class="ev-line"><span class="lv">Competition: not scored - a custom concept has no defined rival set, so no rival count enters the score or the revenue estimate.</span></div>`:`<div class="ev-line"><span class="lv">Competing “${concept.cat}” venues within ${COMPR[concept.cat]} m</span><span class="rv">${catCount} (${catChain} chain)</span></div>`}
      <div class="ev-line"><span class="lv">Source: OpenStreetMap extract ${META.osm_date}. Counts depend on mapper coverage.</span></div>
    </div>
    <div class="ev-card"><h4>Named competitors · ${concept.cat.replace(/_/g," ")}${chipFor("obs")}</h4>
      ${isOther(concept)?`<div class="ev-line"><span class="lv">A custom concept (Other) has no defined rival set, so no competitor list is shown.</span></div>`:(compRows||`<div class="ev-line"><span class="lv">No named venues of this category recorded within ${COMPR[concept.cat]} m of the anchor.</span></div>`)}
      ${isOther(concept)?"":`<div class="ev-line"><span class="lv">${catCount} recorded in total; the ${compList.length} nearest named are shown. Names, cuisine and distance from OpenStreetMap, ${META.osm_date}. A listed competitor is a real trading venue, not a vacancy.</span></div>`}
    </div>
    <div class="ev-card"><h4>Best streets inside this segment${chipFor("mod")}</h4>
      ${streetRows.length?streetRows.map((t,i)=>`<div class="ev-line street" data-la="${t.clat}" data-ln="${t.clng}"><span class="lv">${i+1}. ${t.st} <span class="cui">${t.n} unit${t.n>1?"s":""}</span></span><span class="rv">${money(t.avg)}/mo</span></div>`).join(""):'<div class="ev-line"><span class="lv">Street-name coverage is thin here in OSM. Zoom past 15 on the map to browse every unit directly.</span></div>'}
      <div class="ev-line"><span class="lv">Ranked by mean MODELLED revenue per recorded unit for "${concept.name}" - the drill-down from this segment to its strongest streets. Click a street to fly the map to it and reveal its units.</span></div>
    </div>
    <div class="ev-card"><h4>Who lives around it · ${s.lsoa.name}${chipFor("ctx")}</h4>
      <div class="ev-line"><span class="lv">Usual residents (${META.census||"Census 2021"})</span><span class="rv">${Math.round(s.lsoa.residents).toLocaleString("en-GB")}</span></div>
      <div class="ev-line"><span class="lv">Aged 20-39</span><span class="rv">${s.lsoa.pct20_39.toFixed(1)}%</span></div>
      <div class="ev-line"><span class="lv">Students (16+)</span><span class="rv">${s.lsoa.pct_students.toFixed(1)}%</span></div>
      <div class="ev-line"><span class="lv">Professional / managerial jobs</span><span class="rv">${s.lsoa.pct_prof.toFixed(1)}%</span></div>
      <div class="ev-line"><span class="lv">Born outside the UK</span><span class="rv">${s.lsoa.pct_nonuk.toFixed(1)}%</span></div>
      <div class="ev-line"><span class="lv">Ethnic diversity index (0-1)</span><span class="rv">${s.lsoa.diversity.toFixed(2)}</span></div>
      ${topEth}
      <div class="ev-line"><span class="lv">${CITY.texts.resNote||"LSOA ≈ 1,500 residents. It describes residents, not the people walking this street."}</span></div>
    </div>
    ${s.crime?`<div class="ev-card"><h4>Business crime, ${META.crime_window}${chipFor("ctx")}</h4>
      <div class="ev-line"><span class="lv">Shoplifting</span><span class="rv">${s.crime.shoplifting}</span></div>
      <div class="ev-line"><span class="lv">Theft from the person</span><span class="rv">${s.crime.theft_person}</span></div>
      <div class="ev-line"><span class="lv">Business robbery</span><span class="rv">${s.crime.robbery_biz}</span></div>
      <div class="ev-line"><span class="lv">Business burglary</span><span class="rv">${s.crime.burglary_biz}</span></div>
      <div class="ev-line"><span class="lv">Relevant offences per 1,000 residents</span><span class="rv">${s.crime.per1000.toFixed(1)}</span></div>
      <div class="ev-line"><span class="lv">${CITY.texts.crimeNote||"Source: Metropolitan Police recorded offences around the anchor, via data.police.uk. A relative signal between areas, not an absolute risk figure."}</span></div>
    </div>`:''}
    <div class="ev-card"><h4>Occupancy cost · ${s.borough}${chipFor("ctx")}</h4>
      ${s.rent.basis==="SAA"
        ?`<div class="ev-line"><span class="lv">Retail rateable value / m² (modelled from Scottish Assessors roll)${chipFor("mod")}</span><span class="rv">${money(s.rent.retail_rv_m2)}</span></div>
      <div class="ev-line"><span class="lv">Office rateable value / m² (modelled)${chipFor("mod")}</span><span class="rv">${money(s.rent.office_rv_m2)}</span></div>
      <div class="ev-line"><span class="lv">Avg rateable value per shop (SAA valuation roll, observed)</span><span class="rv">${money(s.rent.saa_shop_avg_rv)}</span></div>`
        :`<div class="ev-line"><span class="lv">Retail rateable value / m² (VOA, ${CITY.texts.voaYear||"Mar 2023"})</span><span class="rv">${money(s.rent.retail_rv_m2)}</span></div>
      <div class="ev-line"><span class="lv">Office rateable value / m²</span><span class="rv">${money(s.rent.office_rv_m2)}</span></div>`}
      <div class="ev-line"><span class="lv">Estimated passing rent / m² (2026)${chipFor("mod")}</span><span class="rv">${money(s.rent.est_rent_m2)}</span></div>
      <div class="ev-line"><span class="lv">Est. rent for your ${concept.floorspace} m² unit${chipFor("mod")}</span><span class="rv">${money(s.rent.est_rent_m2*concept.floorspace/12)}/mo</span></div>
      <div class="ev-line"><span class="lv">Est. business rates after small-biz relief${chipFor("mod")}</span><span class="rv">${money(estRates(s,concept)/12)}/mo</span></div>
      <div class="ev-line"><span class="lv">Rule: borough rateable value x segment-type factor x footfall factor, uplifted to 2026. Rates = unit RV proxy x 49.9p multiplier with Small Business Rate Relief below £15k RV. Get agent quotes before committing.</span></div>
    </div>
    <div class="ev-card"><h4>Revenue potential for this concept${chipFor("mod")}</h4>
      <div class="ev-line"><span class="lv"><b>Estimated monthly revenue</b></span><span class="rv"><b>${money(r.rev.month)}</b></span></div>
      <div class="ev-line"><span class="lv">Plausible range (capture-rate uncertainty)</span><span class="rv">${money(r.rev.low)} - ${money(r.rev.high)}</span></div>
      ${r.rev.weekTrans?`<div class="ev-line"><span class="lv">Modelled transactions / week</span><span class="rv">${fmt(Math.round(r.rev.weekTrans))}</span></div>`:`<div class="ev-line"><span class="lv">Modelled members/desks</span><span class="rv">${fmt(Math.round(r.rev.members||0))}</span></div>`}
      <div class="ev-line"><span class="lv">People passing in your trading windows / week</span><span class="rv">${fmt(Math.round(r.rev.people))}</span></div>
      ${isOther(concept)?`<div class="ev-line"><span class="lv">Competition dilution: not applied (custom concept, no defined rival set)</span></div>`:`<div class="ev-line"><span class="lv">Competition dilution factor (${compCount(s,concept.cat)} rivals within ${COMPR[concept.cat]} m)</span><span class="rv">x${r.rev.comp.toFixed(2)}</span></div>`}
      <div class="ev-line"><span class="lv">Audience factor</span><span class="rv">x${r.rev.aud.toFixed(2)}</span></div>
      ${r.rev.capped?`<div class="ev-line"><span class="lv">Capped by unit throughput (seats x weekly covers + m² x throughput)</span><span class="rv">yes</span></div>`:""}
      <div class="ev-line"><span class="lv">Rule: weekly station flow in your hours x category capture rate x dilution x audience fit + resident spend, x your £${concept.ticket} ticket. All constants in Method. This is a planning estimate, not a valuation.</span></div>
    </div>
    <div class="ev-card"><h4>Modelled for this concept${chipFor("mod")}</h4>
      <div class="ev-line"><span class="lv">Estimated typical spend / person nearby</span><span class="rv">${money(s.model.spend_est)}</span></div>
      <div class="ev-line"><span class="lv">Weekday vs weekend rhythm</span><span class="rv">${fl.weekend_share>0.3?"weekend-leaning":"weekday-leaning"}</span></div>
      <div class="ev-line"><span class="lv">Office-worker skew</span><span class="rv">${Math.round(s.model.office_skew*100)}%</span></div>
      <div class="ev-line"><span class="lv">Rule: spend estimated from occupation mix, borough retail values and chain presence; rhythm from station day-flows plus the local offer mix. Rules are in Method.</span></div>
    </div>
  </div>`;
  dp.querySelectorAll(".street").forEach(el=>el.onclick=()=>{
    if(!unitsOn){unitsOn=true;unitsAuto=true;renderMapControls();}
    paintUnits(rankedCache);
    map.flyTo([+el.dataset.la,+el.dataset.ln],16.5,{duration:0.9});
  });
  if(scroll)dp.scrollIntoView({behavior:"smooth",block:"start"});
}

/* ---------- method ---------- */
function renderMethod(){
  $("method-grid").innerHTML=`
  <div class="m-card"><h4>Movement &amp; transport${chipFor("obs")}</h4>
    ${CITY.texts.movement||`<p>Typical-day station entries and exits by day type (Mon / Tue-Thu / Fri / Sat / Sun) and annualised totals from TfL Annual Station Counts 2025, summed over the stations named for each segment. National Rail stations without TfL counts use ORR Estimates of Station Usage 2024-25 (annual entries + exits, marked NR · ORR); their day-of-week split is modelled on the median London Overground profile, since ORR publishes annual totals only. Stations within 900 m from OpenStreetMap. Street-level pitches inherit their parent catchment's counts scaled to the street's share of recorded commercial units (marked MODELLED); streets beyond 900 m of any station show no flow at all.</p>`}
    ${CITY.texts.movement?`<p><a href="https://dataportal.orr.gov.uk/statistics/usage/estimates-of-station-usage">ORR dataportal - Estimates of Station Usage 2024-25</a></p>`:`<p><a href="https://crowding.data.tfl.gov.uk/Annual%20Station%20Counts/2024/AC2024_AnnualisedEntryExit_Public.xlsx">crowding.data.tfl.gov.uk - AC2024 Annualised Entry/Exit</a></p>`}
    <p>Resolution: named station, not the pavement. A station 400 m away on a desire line matters more than one across a railway.</p></div>
  <div class="m-card"><h4>Street offer &amp; competition${chipFor("obs")}</h4>
    <p>Counts of cafés, restaurants, fast food, pubs and bars, grocery and food shops, gyms, coworking spaces, other shops, culture venues and parks around each segment anchor (250 m for venues, 600 m parks, 900 m stations) from OpenStreetMap (${META.osm_date}). Chain flag from brand-name matching - approximate.</p>
    <p><a href="https://www.openstreetmap.org/copyright">openstreetmap.org (ODbL)</a> · <a href="https://overpass-api.de/">Overpass API</a></p>
    <p>Resolution: real points near the anchor, but coverage depends on mappers; treat counts as lower bounds.</p></div>
  <div class="m-card"><h4>Residents${chipFor("ctx")}</h4>
    ${CITY.texts.resMethod||`<p>Census 2021 lower-layer super output area (LSOA) statistics for the segment anchor: age bands (TS007A), ethnic group (TS021), country of birth (TS004), occupation (TS063), economic activity and students (TS066). Office for National Statistics via Nomis bulk files.</p>`}
    <p><a href="https://www.nomisweb.co.uk/sources/census_2021_bulk">nomisweb.co.uk - Census 2021 bulk downloads</a></p>
    <p>${CITY.texts.resResolution||"Resolution: LSOA (~1,500 residents)."} These are people who <i>live</i> here, not workers or visitors. The tool never claims street-level demographics.</p></div>
  ${HAS_CRIME?`<div class="m-card"><h4>Business crime${chipFor("ctx")}</h4>
    ${CITY.texts.crimeMethod||`<p>Metropolitan Police recorded street-level offences within ~450 m of each segment anchor, 12 months to July 2026: shoplifting, theft from the person, robbery and burglary, via data.police.uk. Rates are normalised per 1,000 residents.</p>`}
    <p><a href="https://data.police.uk/data/">data.police.uk - street-level crime</a></p>
    <p>Resolution: street level around the anchor. Under-reporting is common; use as a relative signal between areas, not an absolute risk figure.</p></div>`
  :`<div class="m-card"><h4>Business crime - not shown</h4>
    <p>${CITY.texts.crimeDropped||"Street-level recorded crime is not published for this police force area via data.police.uk, so this site does not estimate it."}</p></div>`}
  <div class="m-card"><h4>Occupancy cost${chipFor("ctx")}</h4>
    ${CITY.texts.voaMethod||`<p>Rateable value per m² for retail and office stock by billing authority, Valuation Office Agency business floorspace statistics, 31 March 2023.</p>`}
    <p><a href="https://www.gov.uk/government/statistics/non-domestic-rating-stock-of-properties-including-business-floorspace-2023">gov.uk - NDR business floorspace 2023</a></p>
    <p>The estimated passing rent per m² is MODELLED: borough retail rateable value x a segment-type factor (prime/managed retail 1.35-1.45, high street 1.15, side street 0.95, market 1.0) x a footfall factor (up to +30% for the busiest flows) x 1.08 uplift to 2026. Business rates proxy: unit rateable value x the 49.9p small-business multiplier, with 100% relief under £12,000 RV tapering to £15,000. Always get agent quotes.</p></div>
  <div class="m-card"><h4>Modelled layers${chipFor("mod")}</h4>
    <p>Three estimates the tool computes and labels: (1) typical spend per person - from resident occupation mix, borough retail rateable value and chain presence; (2) office-worker skew - from coworking density and weekday-weighted station flows; (3) intraday rhythm - station day-type flows spread across five dayparts using the local offer mix (food, retail, nightlife, culture). Rules are fixed and shown so you can argue with them.</p>
    <p>These are the layers to override with your own counts before committing money.</p></div>
  <div class="m-card"><h4>Revenue model${chipFor("mod")}</h4>
    <p>Estimated monthly revenue for your concept, per segment and per unit. Weekly station entries+exits passing in your exact trading windows are multiplied by a category capture rate (share of passers-by who transact: grocery 3.0%, cafe 2.0%, fast food 1.8%, pub/bar 1.5%, restaurant 1.2%), a competition dilution factor 1/(1 + k x rivals within the concept's competition radius), and an audience-fit factor (x0.5 to x1.5). Competition radius by concept type (how far away a rival still takes your customers): cafés and food-to-go 400 m; convenience services (hair, beauty, laundry, repair, florist, optician) 500 m; grocery, pharmacy, pubs and bars 600 m; restaurants, retail and vets 800 m; gyms, coworking and estate agents 1 km. Resident spend nearby is added from LSOA population x weekly purchase propensity. Monthly revenue = transactions x your average ticket x 4.33. A unit can only serve what fits through it: seats x weekly covers plus floorspace x weekly throughput per m² caps transactions, with soft absorption (queues, faster turns) beyond it. Fitness and coworking use membership models: residents and flow convert to members at fixed rates, capped by capacity, priced at ~2.6x day ticket (fitness) or ~9x day desk rate (coworking). Choosing "Other" (a concept outside the list) scores location fit without a rival set: the competition criterion is removed from the score, no dilution is applied to revenue, and competition is shown as not scored.</p>
    <p>The shown range is x0.55 to x1.6 of the central estimate - capture-rate uncertainty dominates. These are transparent planning assumptions you can argue with, not observed takings. No source publishes real per-street revenue; where a chain unit's accounts exist they are for the company, not the site.</p></div>
  <div class="m-card"><h4>Every commercial unit${chipFor("obs")}</h4>
    <p>The “Every unit” map layer plots every commercial premises OpenStreetMap records across all covered streets and areas (food, retail, fitness, coworking), coloured by the MODELLED revenue your concept could make at that exact spot: the segment estimate x a distance-to-anchor decay x a hyperlocal competition factor (same-category units within 150 m). Chain flags from brand-name matching.</p>
    <p>Resolution: real buildings and coordinates; the revenue colour is modelled. A coloured unit is not a vacant unit - check availability with agents.</p></div>
  <div class="m-card"><h4>Coverage</h4>
    ${CITY.texts.coverage?CITY.texts.coverage(SEGS,UNITS):`<p>${SEGS.length.toLocaleString("en-GB")} segments covering all of London at street level: ${SEGS.filter(s=>s.lvl!=="street").length} area pitches (curated commercial areas plus every TfL station catchment and every Greater London National Rail station catchment - TfL Annual Station Counts 2025, no minimum flow; National Rail: ORR Estimates of Station Usage 2024-25) and ${SEGS.filter(s=>s.lvl==="street").length.toLocaleString("en-GB")} street pitches - every named retail street and parade with 8 or more recorded commercial units, long streets split into roughly 400 m stretches. ${UNITS.length.toLocaleString("en-GB")} individual commercial units recorded across them. A street pitch inside a station catchment carries that catchment's flow MODELLED down to the street's share of recorded units; a street more than 900 m from any station has no flow anchor and says so on its panel. Where TfL and ORR both count a station, TfL counts are used. A handful of TfL-network termini beyond the London billing authorities (Amersham, Chesham, Slough-side Elizabeth line stops) stay out because the borough rent evidence does not reach them.</p>`}    <p>Built ${META.built}. A tool for shortlisting, not a valuation.</p></div>
  <div class="m-card"><h4>Concept trends${chipFor("obs")}${chipFor("mod")}</h4>
    <p>The Trends section leads with search interest: Google Trends yearly mean index for a keyword matching each concept, United Kingdom, rescaled across batches against a shared anchor ("restaurant"). ESTIMATED attention, not shops or sales. Alongside it, one OBSERVED supply figure: every venue currently recorded in the concept's category (all cafés, all restaurants, all fast food, pubs/bars/nightclubs, grocery and food shops, gyms, coworking) inside the same ${CITY.region} bounding box this map uses, from OpenStreetMap.</p>
    <p>No venue history is shown, on purpose: mapped coverage in this area grew several-fold between 2017 and 2026 - faster than any real high street - so year-by-year venue counts measure mapping progress, not openings. Concept-level historical shop counts are not published by any open source at this granularity, so the section says so rather than estimate one.</p>
    <p><a href="https://ohsome.org">ohsome.org (HeiGIT)</a> · <a href="https://www.openstreetmap.org/copyright">openstreetmap.org (ODbL)</a> · <a href="https://trends.google.com">trends.google.com</a></p></div>`;
}

/* ---------- main loop ---------- */
function update(){
  if(map&&streetLayer){
    if(streetsOn&&!map.hasLayer(streetLayer)) map.addLayer(streetLayer);
    else if(!streetsOn&&map.hasLayer(streetLayer)) map.removeLayer(streetLayer);
  }
  const ranked=computeAll(concept);
  paintMarkers(ranked);
  renderRankings(ranked);
  if(selected)selectSegment(selected,false);
  else if(ranked[0])selectSegment(ranked[0].seg.id,false);
}

/* map controls: metric toggle + units layer toggle */
function renderMapControls(){
  const box=$("map-controls");
  box.innerHTML=`
    <span class="mc-label">Colour by:</span>
    <button class="mc ${mapMetric==='fit'?'on':''}" id="mc-fit">Fit score</button>
    <button class="mc ${mapMetric==='rev'?'on':''}" id="mc-rev">Est. revenue</button>
    <button class="mc ${streetsOn?'on':''}" id="mc-streets" title="Street-level pitches: every named retail street and parade with 8+ recorded units. They appear automatically when you zoom in.">Streets (${SEGS.filter(s=>s.lvl==='street').length.toLocaleString("en-GB")})</button>
    <button class="mc ${unitsOn?'on':''}" id="mc-units" title="Every real commercial unit from OpenStreetMap inside the covered segments, coloured by estimated monthly revenue for your concept">Every unit (${UNITS.length.toLocaleString("en-GB")})</button>`;
  $("mc-fit").onclick=()=>{mapMetric="fit";renderMapControls();update();};
  $("mc-rev").onclick=()=>{mapMetric="rev";renderMapControls();update();};
  $("mc-units").onclick=()=>{unitsOn=!unitsOn;unitsAuto=false;renderMapControls();update();};
  $("mc-streets").onclick=()=>{streetsOn=!streetsOn;streetsAuto=false;renderMapControls();update();};
}

/* first paint: frame the top-20 results so they are visible without touching the map */
function fitTop20Once(){
  try{
    if(!map||!rankedCache.length)return;
    const pts=rankedCache.slice(0,20).map(r=>[r.seg.lat,r.seg.lng]);
    if(!pts.length)return;
    map.fitBounds(L.latLngBounds(pts).pad(0.18),{maxZoom:Math.max(CITY.mapZoom,11.5)});
  }catch(e){}
}

/* deep link: ?concept=<preset-id> preselects a concept (used by the rankings articles) */
(function(){try{const q=new URLSearchParams(location.search);const cid=q.get("concept");if(cid&&PRESETS.some(p=>p.id===cid)){activePreset=cid;concept=normalizeConcept(JSON.parse(JSON.stringify(PRESETS.find(p=>p.id===cid))));}}catch(e){}})();
$("seg-count").textContent=SEGS.length;
  if($("preset-count"))$("preset-count").textContent=PRESETS.length;
renderPresets(); renderConcept(); renderMethod(); initMap(); renderMapControls(); update(); fitTop20Once();

/* ---------- shortlist, comparison, reports and on-visit change alerts ---------- */
const STORAGE_KEY="locationLensWorkspaceV1";
let workspace={favourites:[],compare:[],snapshots:{}};
try{workspace={...workspace,...JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}")};}catch(e){}
workspace.favourites=Array.isArray(workspace.favourites)?workspace.favourites:[];
workspace.compare=Array.isArray(workspace.compare)?workspace.compare:[];
workspace.snapshots=workspace.snapshots||{};
const saveWorkspace=()=>localStorage.setItem(STORAGE_KEY,JSON.stringify(workspace));
function rowFor(id){return rankedCache.find(x=>x.seg.id===id);}
function snapshotFor(r){return r?{score:Math.round(r.score),flow:Math.round(weeklyFlowAbs(r.seg)),competitors:r.seg.osm[concept.cat]||0,dataset:META.built}:null;}
function comparisonMetrics(r){const s=r.seg;return [
 ["Fit score",Math.round(r.score),"mod"],["Est. monthly revenue",money(r.rev.month),"mod"],["Weekly station flow anchor",fmt(Math.round(weeklyFlowAbs(s))),s.weak?"mod":"obs"],
 ["People in your trading hours",fmt(Math.round(r.rev.people)),"mod"],["Competing "+concept.cat.replace(/_/g," "),s.osm[concept.cat]||0,"obs"],["Typical ticket nearby",money(s.model.spend_est),"mod"],
 ["Est. rent / m²",money(s.rent.est_rent_m2),"mod"],["Residents",fmt(Math.round(s.lsoa.residents)),"ctx"],["Business crime / 1,000",s.crime?s.crime.per1000.toFixed(1):"not published","ctx"]
];}
function renderWorkspace(){
 const favs=workspace.favourites.map(rowFor).filter(Boolean),comps=workspace.compare.map(rowFor).filter(Boolean);
 $("fav-count").textContent=favs.length; $("compare-count").textContent=comps.length+"/3";
 $("fav-list").innerHTML=favs.length?favs.map(r=>`<div class="saved-item"><div class="nm">${r.seg.name}<span class="sub">${r.seg.borough} · score ${Math.round(r.score)}</span></div><button class="mini" data-open="${r.seg.id}">Open</button><button class="mini" data-fav-remove="${r.seg.id}">×</button></div>`).join(""):'<div class="saved-empty">No favourites yet. Open a street and tap “Save favourite”.</div>';
 $("compare-list").innerHTML=comps.length?comps.map(r=>`<div class="saved-item"><div class="nm">${r.seg.name}<span class="sub">${r.seg.borough}</span></div><button class="mini" data-compare-remove="${r.seg.id}">×</button></div>`).join(""):'<div class="saved-empty">Add two or three streets from their evidence panels.</div>';
 $("open-compare").disabled=comps.length<2;
 const changes=[]; favs.forEach(r=>{const now=snapshotFor(r),old=workspace.snapshots[r.seg.id];if(old&&old.dataset!==now.dataset){["score","flow","competitors"].forEach(k=>{if(old[k]!==now[k])changes.push(`${r.seg.name}: ${k} ${old[k]} → ${now[k]}`);});}workspace.snapshots[r.seg.id]=now;}); saveWorkspace();
 $("alert-list").innerHTML=changes.length?changes.map(x=>`<div class="alert-change">${x}</div>`).join(""):'<div class="saved-empty">No changes detected in saved streets on this visit.</div>';
 document.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>selectSegment(b.dataset.open,true));
 document.querySelectorAll("[data-fav-remove]").forEach(b=>b.onclick=()=>{workspace.favourites=workspace.favourites.filter(x=>x!==b.dataset.favRemove);saveWorkspace();renderWorkspace();if(selected)selectSegment(selected,false);});
 document.querySelectorAll("[data-compare-remove]").forEach(b=>b.onclick=()=>{workspace.compare=workspace.compare.filter(x=>x!==b.dataset.compareRemove);saveWorkspace();renderWorkspace();if(selected)selectSegment(selected,false);});
}
function toggleFavourite(id){const on=workspace.favourites.includes(id);workspace.favourites=on?workspace.favourites.filter(x=>x!==id):[...workspace.favourites,id];if(!on)workspace.snapshots[id]=snapshotFor(rowFor(id));saveWorkspace();renderWorkspace();selectSegment(id,false);}
function toggleCompare(id){const on=workspace.compare.includes(id);if(on)workspace.compare=workspace.compare.filter(x=>x!==id);else if(workspace.compare.length<3)workspace.compare.push(id);else{alert("Compare up to three streets. Remove one first.");return;}saveWorkspace();renderWorkspace();selectSegment(id,false);}
function showComparison(){const rows=workspace.compare.map(rowFor).filter(Boolean);if(rows.length<2)return;const metrics=rows.map(comparisonMetrics),labels=metrics[0].map(x=>x[0]);
 $("compare-panel").hidden=false;$("compare-panel").innerHTML=`<div class="compare-head"><h3>Side-by-side for “${concept.name}”</h3><button class="mini" id="close-compare">Close</button></div><table class="compare-table"><thead><tr><th>Evidence</th>${rows.map(r=>`<th>${r.seg.name}<br><small>${r.seg.borough}</small></th>`).join("")}</tr></thead><tbody>${labels.map((l,i)=>`<tr><td>${l}${chipFor(metrics[0][i][2])}</td>${rows.map((r,j)=>`<td>${metrics[j][i][1]}</td>`).join("")}</tr>`).join("")}</tbody></table>`;$("close-compare").onclick=()=>$("compare-panel").hidden=true;$("compare-panel").scrollIntoView({behavior:"smooth",block:"start"});}
/* ---------- shareable verdict + comparables ---------- */
function verdictText(r){
  const s=r.seg,rev=r.rev;
  const strengths=Object.values(r.crit).filter(x=>x.w>0.001).sort((a,b)=>b.score*b.w-a.score*a.w).slice(0,1);
  const weak=Object.values(r.crit).filter(x=>x.w>0.001).sort((a,b)=>a.score*b.w-b.score*b.w).slice(0,1);
  const compTxt=isOther(concept)?"competition not scored (custom concept - no defined rival set)":`${compCount(s,concept.cat)} rival ${concept.cat.replace(/_/g," ")} within ${COMPR[concept.cat]} m`;
  return `${s.name} scores ${Math.round(r.score)}/100 for "${concept.name}": ~${money(rev.month)}/mo estimated revenue (range ${money(rev.low)}-${money(rev.high)}), ${fmt(Math.round(weeklyFlowAbs(s)))} weekly station flow, ${compTxt}. Strongest: ${strengths[0].label.toLowerCase()}. Watch: ${weak[0].label.toLowerCase()}.`;
}
function comparablesFor(r){
  const s=r.seg,myFlow=weeklyFlowAbs(s)||1;
  let pool=rankedCache.filter(x=>x.seg.id!==s.id&&x.seg.stype===s.stype);
  const inBand=(x,a,b)=>{const f=weeklyFlowAbs(x.seg)/myFlow;return f>=a&&f<=b;};
  let band=pool.filter(x=>inBand(x,0.5,2));
  if(band.length<5)band=pool.filter(x=>inBand(x,0.33,3));
  if(band.length<5)band=pool;
  const vals=band.map(x=>x.rev.month).sort((a,b)=>a-b);
  if(!vals.length)return null;
  const q=p=>vals[Math.min(vals.length-1,Math.floor(p*vals.length))];
  const median=q(0.5),p25=q(0.25),p75=q(0.75);
  const nearest=band.sort((a,b)=>Math.abs(Math.log(weeklyFlowAbs(a.seg)/myFlow))-Math.abs(Math.log(weeklyFlowAbs(b.seg)/myFlow))).slice(0,4);
  return {n:band.length,median,p25,p75,nearest,stypeLabel:s.stype.replace(/_/g," ")};
}
const _selectSegment=selectSegment;
selectSegment=function(id,scroll){
  _selectSegment(id,scroll);
  const dp=$("detail-panel"),head=dp&&dp.querySelector(".dp-head");if(!head)return;
  const r=rowFor(id);
  const actions=document.createElement("div");actions.className="dp-actions";
  actions.innerHTML=`<button class="action ${workspace.favourites.includes(id)?"on":""}" id="dp-fav">${workspace.favourites.includes(id)?"Saved favourite":"Save favourite"}</button><button class="action ${workspace.compare.includes(id)?"on":""}" id="dp-compare">${workspace.compare.includes(id)?"Added to compare":"Add to compare"}</button><button class="action primary" id="dp-report">Slide report</button>`;
  head.parentNode.insertBefore(actions,head.nextSibling);
  $("dp-fav").onclick=()=>toggleFavourite(id);$("dp-compare").onclick=()=>toggleCompare(id);$("dp-report").onclick=()=>openSlideReport(id);
  if(r){
    const vt=verdictText(r),shareTxt="The best location for my new business is: https://locationpotential.com/"+(CITY.id==="london"?"":CITY.id+"/")+"#expert";
    const v=document.createElement("div");v.className="verdict-card";
    v.innerHTML=`<div class="vk">The verdict - ready to share</div><div class="vt">${vt}</div><div class="vbtns"><a class="vbtn" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(shareTxt)}">WhatsApp</a><a class="vbtn" target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTxt)}">Post on X</a></div>`;
    actions.parentNode.insertBefore(v,actions.nextSibling);
    const cmp=comparablesFor(r);
    if(cmp){
      const card=document.createElement("div");card.className="ev-card";
      card.innerHTML=`<h4>Comparable streets for this concept${chipFor("mod")}</h4>
      <div class="ev-line"><span class="lv"><b>"${concept.name}" on ${cmp.n} similar ${cmp.stypeLabel} streets</b></span><span class="rv"><b>${money(cmp.median)}/mo median</b></span></div>
      <div class="ev-line"><span class="lv">Typical band across comparables (25th-75th)</span><span class="rv">${money(cmp.p25)} - ${money(cmp.p75)}/mo</span></div>
      <table class="comp-table-mini">${cmp.nearest.map(x=>`<tr><td>${x.seg.name} <span style="color:var(--muted);font-size:11px">${x.seg.borough}</span></td><td>${money(x.rev.month)}/mo</td></tr>`).join("")}</table>
      <div class="ev-line"><span class="lv">Honest label: no source publishes real per-street takings. These are the same transparent MODELLED estimates for streets of the same type with a similar flow anchor (0.5x-2x this street's weekly flow) - planning comparables, not observed turnover.</span></div>`;
      const cols=dp.querySelector(".dp-cols");if(cols)cols.appendChild(card);
    }
  }
};
$("open-compare").onclick=showComparison;
renderWorkspace();
