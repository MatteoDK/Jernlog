/* Automatiske regressionstest for Matteos Jernlog.
   Bruger jsdom til at indlæse index.html + styles.css + alle app-*.js-filer i en
   simuleret browser, med en falsk (fake) Supabase-klient i stedet for den ægte
   sky-forbindelse — ingen rigtige data røres.
   Kør med: npm install && node tests.js
   Hænger sammen med: index.html (loader alle app-*.js + styles.css), som testes herfra. */
"use strict";
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const APP_DIR = __dirname;

function fakeSupabaseScript(profile, exercises, logs, opts){
  opts = opts || {};
  var userEmail = opts.userEmail || "matteoverdiani.dk@gmail.com";
  return `
window.__insertCount = 0;
window.supabase = {
  createClient: function(){
    function chain(result){
      var q = {
        select: function(){ return q; },
        eq: function(){ return q; },
        in: function(){ return q; },
        order: function(){ return q; },
        limit: function(){ return q; },
        neq: function(col, val){ q._isListAll = true; q._excludeId = val; return q; }, // "hent alle andre profiler" (bruges af onboarding-venneliste)
        range: function(){ return Promise.resolve(q._isListAll ? { data: (window.__fakeAllProfiles||[]).filter(function(p){ return p.id!==q._excludeId; }), error:null } : result); },
        maybeSingle: function(){ return Promise.resolve(result); },
        single: function(){ return Promise.resolve(result); },
        ilike: function(){ return q; },
        then: function(res, rej){ return Promise.resolve(q._isListAll ? { data: (window.__fakeAllProfiles||[]).filter(function(p){ return p.id!==q._excludeId; }), error:null } : result).then(res, rej); },
        insert: function(row){
          window.__insertCount++;
          var insertedRow = Object.assign({ approved:false, group_layout:null, has_onboarded:false }, window.__fakeProfile, row);
          return chain({ data: insertedRow, error: null });
        },
        update: function(){ return chain({ data: null, error: null }); },
        upsert: function(){ return chain({ data: null, error: null }); },
        delete: function(){ return chain({ data: null, error: null }); }
      };
      return q;
    }
    return {
      auth: {
        onAuthStateChange: function(){},
        getSession: function(){ return Promise.resolve({ data: { session: { user: { id:"u1", email:"${userEmail}", user_metadata:{username:"matteo"} } } } }); },
        signOut: function(){ return Promise.resolve({}); }
      },
      from: function(table){
        if(table==="profiles") return chain({ data: window.__fakeProfile, error: null });
        if(table==="exercises") return chain({ data: window.__fakeExercises, error: null });
        if(table==="logs") return chain({ data: window.__fakeLogs, error: null });
        if(table==="friendships") return chain({ data: [], error: null });
        if(table==="comments") return chain({ data: [], error: null });
        return chain({ data: [], error: null });
      }
    };
  }
};
window.__fakeProfile = ${JSON.stringify(profile)};
window.__fakeExercises = ${JSON.stringify(exercises)};
window.__fakeLogs = ${JSON.stringify(logs)};
window.__fakeAllProfiles = ${JSON.stringify(opts.allProfiles || [])};
`;
}

// Bygger en jsdom-side ud fra den RIGTIGE index.html + styles.css + app-*.js,
// med CDN-scriptet erstattet af en fake Supabase-klient.
function buildPage(profile, exercises, logs, opts){
  let html = fs.readFileSync(path.join(APP_DIR, "index.html"), "utf8");

  html = html.replace(
    /<script src="https:\/\/cdn\.jsdelivr\.net[^"]*"><\/script>/,
    "<script>" + fakeSupabaseScript(profile, exercises, logs, opts) + "</script>"
  );
  const cssMatch = html.match(/<link rel="stylesheet" href="([^"]+)">/);
  if(cssMatch){
    const css = fs.readFileSync(path.join(APP_DIR, cssMatch[1]), "utf8");
    html = html.replace(cssMatch[0], "<style>" + css + "</style>");
  }
  html = html.replace(/<script src="(app-[^"]+\.js)"><\/script>/g, function(_, file){
    return "<script>" + fs.readFileSync(path.join(APP_DIR, file), "utf8") + "</script>";
  });
  if(/<script src="app-/.test(html)){
    throw new Error("Et app-*.js script kunne ikke inlines — tjek filnavne i index.html");
  }
  return new JSDOM(html, { runScripts: "dangerously", resources: "usable", url: "https://example.com/" });
}

function click(win, el){ el.dispatchEvent(new win.MouseEvent("click", { bubbles:true, cancelable:true })); }
function wait(ms){ return new Promise(function(res){ setTimeout(res, ms); }); }

const allResults = [];
function group(name, fn){
  return Promise.resolve().then(fn).then(function(checks){
    checks.forEach(function(c){ allResults.push([name + ": " + c[0], c[1]]); });
  });
}

async function testEksisterendeBrugerOgSplit(){
  const dom = buildPage(
    { id:"u1", username:"matteo", email:"matteoverdiani.dk@gmail.com", approved:true, group_layout:null, has_onboarded:true },
    [ { user_id:"u1", id:"squat", name:"Squat", bodyweight:false, muscle:"ben", variant:"a", position:1 } ],
    [
      { user_id:"u1", id:"log1", exercise_id:"squat", date:"2026-08-01", logged_at:"2026-08-01T10:00:00Z", set_number:1, weight:80, reps:8, reps_label:"8", muscle_pos:"1-2", skipped:false },
      { user_id:"u1", id:"log2", exercise_id:"squat", date:"2026-08-05", logged_at:"2026-08-05T10:00:00Z", set_number:1, weight:85, reps:8, reps_label:"8", muscle_pos:"3-4", skipped:false }
    ]
  );
  const window = dom.window, document = window.document;
  await wait(1200);
  const checks = [];
  function check(label, cond){ checks.push([label, !!cond]); }

  // Split-filerne loader og virker sammen
  var logNav = document.querySelector('.bn-item[data-view="log"]');
  check("bundnav 'Log øvelse' findes (alle script-filer indlæst korrekt)", logNav);
  if(logNav) click(window, logNav);
  check("CSS indlæst fra styles.css (.card-regel findes)", document.styleSheets.length && Array.prototype.slice.call(document.styleSheets[0].cssRules).some(function(r){ return r.selectorText===".card"; }));

  // Log-formular: intet "Øvelse 1-2/3-4"-valg
  check("intet #musclePosToggle på log-siden", !document.getElementById("musclePosToggle"));
  var search = document.getElementById("exSearch");
  if(search){ search.value = "squat"; search.dispatchEvent(new window.Event("input", { bubbles:true })); }
  var resultItem = document.querySelector('.search-result-item[data-id="squat"]');
  check("søgning finder Squat", resultItem);
  if(resultItem) click(window, resultItem);
  var main = document.getElementById("main");
  check("log-formular uden 'Tidspunkt i træningen'-tekst", main.innerHTML.indexOf("Tidspunkt i træningen")===-1);
  check("log-formular har vægt- og Gem sæt-felt", !!document.getElementById("logWeight") && !!document.getElementById("saveSetBtn"));

  // PR-konfetti: logger en ny PR (bedste hidtil er 85kg) og tjekker at konfetti spawner
  var weightInput = document.getElementById("logWeight");
  weightInput.value = "90";
  var saveBtn = document.getElementById("saveSetBtn");
  if(saveBtn) click(window, saveBtn);
  var confetti = document.getElementById("confettiLayer");
  check("PR udløser konfetti (#confettiLayer får stykker)", confetti && confetti.children.length > 0);
  check("PR-toast vises", document.getElementById("toast").className.indexOf("pr")!==-1);

  // Historik: kun én graf, intet posLabel
  var histNav = document.querySelector('.bn-item[data-view="history"]');
  if(histNav) click(window, histNav);
  var histRow = document.querySelector('.list-row[data-id="squat"]');
  check("Squat listet i historik", histRow);
  if(histRow) click(window, histRow);
  main = document.getElementById("main");
  check("kun 1 'Udvikling'-graf (ikke opdelt i 1-2/3-4)", (main.innerHTML.match(/Udvikling/g)||[]).length===1);
  check("ingen '· Øvelse 1-2/3-4'-mærkat pr. sæt", main.innerHTML.indexOf("Øvelse 1-2")===-1 && main.innerHTML.indexOf("Øvelse 3-4")===-1);
  check("alle 3 datapunkter (2 historiske + den nye PR) i grafen", (main.innerHTML.match(/<circle/g)||[]).length===3);

  // Rediger sæt: intet musclePos-valg
  var editBtn = document.querySelector('[data-action="edit"][data-logid="log1"]');
  check("redigér-knap findes for sæt", editBtn);
  if(editBtn) click(window, editBtn);
  check("intet #editMusclePosToggle i rediger-sæt", !document.getElementById("editMusclePosToggle"));

  // Andre sider loader (bekræfter app-feed.js / app-calendar-dig.js er korrekt splittet)
  var feedNav = document.querySelector('.bn-item[data-view="feed"]');
  if(feedNav) click(window, feedNav);
  check("Feed-siden renderer", document.getElementById("main").innerHTML.indexOf("Feed")!==-1);
  var calNav = document.querySelector('.bn-item[data-view="calendar"]');
  if(calNav) click(window, calNav);
  check("Kalender-siden renderer", document.getElementById("main").innerHTML.indexOf("Kalender")!==-1);
  var digNav = document.querySelector('.bn-item[data-view="dig"]');
  if(digNav) click(window, digNav);
  check("Dig-siden renderer", document.getElementById("main").innerHTML.indexOf("Dig")!==-1);

  return checks;
}

async function testNyBrugerGodkendelsesvaeg(){
  // Simulerer en brugers ALLERFØRSTE login lige efter oprettelse — profiles.select
  // finder ingen række, så tryInsertProfile() skal oprette den og korrekt vise
  // "Venter på godkendelse" (regressionstest for den fejl der blev rettet 2026-08-10).
  const dom = buildPage(null, [], [], { userEmail: "nybruger@example.com" });
  const window = dom.window, document = window.document;
  await wait(1200);
  const checks = [];
  function check(label, cond){ checks.push([label, !!cond]); }

  var main = document.getElementById("main");
  check("insert() på profiles kaldt præcis 1 gang", window.__insertCount === 1);
  check("ny bruger ser 'Venter på godkendelse'", main.innerHTML.indexOf("Venter på godkendelse")!==-1);
  check("ny bruger ser IKKE bundnavigationen", document.getElementById("bottomNav").style.display === "none");

  return checks;
}

async function testOnboardingFlow(){
  // Godkendt bruger, men has_onboarded=false — skal se onboarding i stedet for
  // Feed/Log ved boot, kunne klikke sig igennem, og lande i appen bagefter.
  const dom = buildPage(
    { id:"u1", username:"ny", email:"nygodkendt@example.com", approved:true, group_layout:null, has_onboarded:false },
    [], [],
    { allProfiles: [
      { id:"u1", username:"ny" },
      { id:"u2", username:"matteo" },
      { id:"u3", username:"thor" }
    ] }
  );
  const window = dom.window, document = window.document;
  await wait(1200);
  const checks = [];
  function check(label, cond){ checks.push([label, !!cond]); }

  var main = document.getElementById("main");
  check("viser onboarding (ikke Feed/Log) når has_onboarded=false", main.innerHTML.indexOf("Velkommen til Jernlog")!==-1);
  check("bundnav skjult under onboarding", document.getElementById("bottomNav").style.display === "none");

  var next1 = document.getElementById("onbNext");
  check("skærm 1 har Videre-knap", next1);
  if(next1) click(window, next1);
  main = document.getElementById("main");
  check("skærm 2: forklarer Øvrige øvelser", main.innerHTML.indexOf("Øvrige øvelser")!==-1);

  var next2 = document.getElementById("onbNext");
  if(next2) click(window, next2);
  await wait(200); // venneliste hentes async
  main = document.getElementById("main");
  check("skærm 3: viser 'thor' i vennelisten (ikke sig selv)", main.innerHTML.indexOf("thor")!==-1);
  check("skærm 3: viser ikke egen bruger 'ny' i listen", !document.querySelector('[data-req="u1"]'));
  var reqBtn = document.querySelector('[data-req="u3"]');
  check("Anmod-knap findes for thor", reqBtn);
  if(reqBtn) click(window, reqBtn);
  check("knap skifter til 'Anmodning sendt' efter klik", reqBtn && reqBtn.textContent.indexOf("sendt")!==-1);

  var next3 = document.getElementById("onbNext");
  if(next3) click(window, next3);
  main = document.getElementById("main");
  check("skærm 4: 'Du er klar!'", main.innerHTML.indexOf("Du er klar")!==-1);

  var finishBtn = document.getElementById("onbFinish");
  if(finishBtn) click(window, finishBtn);
  await wait(100);
  check("efter 'Kom i gang': havnet i den rigtige app (bundnav synlig)", document.getElementById("bottomNav").style.display !== "none");

  return checks;
}

async function testFlereProgrammer(){
  // Programmer med træninger i: egne navne, nyt program/ny træning, øvelse i flere træninger, sletning.
  const dom = buildPage(
    { id:"u1", username:"matteo", email:"matteoverdiani.dk@gmail.com", approved:true, group_layout:null, has_onboarded:true,
      programs:[
        { id:"p1", name:"PPL", workouts:[ {id:"a",name:"Push"}, {id:"b",name:"Pull"} ] },
        { id:"p2", name:"UL", workouts:[ {id:"c",name:"Upper"} ] }
      ] },
    [
      { user_id:"u1", id:"bench", name:"Bench press", bodyweight:false, muscle:"bryst", variant:"ac", position:1 },
      { user_id:"u1", id:"fly", name:"Pec deck", bodyweight:false, muscle:"bryst", variant:"b", position:2 },
      { user_id:"u1", id:"row", name:"Row", bodyweight:false, muscle:"ryg", variant:"b", position:3 },
      { user_id:"u1", id:"dips", name:"Dips", bodyweight:true, muscle:"bryst", variant:null, position:4 }
    ],
    []
  );
  const window = dom.window, document = window.document;
  await wait(1200);
  const checks = [];
  function check(label, cond){ checks.push([label, !!cond]); }
  function tabsText(sel){ return Array.prototype.map.call(document.querySelectorAll(sel), function(b){ return b.textContent; }).join("|"); }

  window.goto("exercises");
  var main = document.getElementById("main");
  check("program-faner: PPL | UL | Øvrige (ingen Ryg/Bryst/Ben, ingen grupperinger)", tabsText("[data-prog]")==="PPL|UL|Øvrige" && main.innerHTML.indexOf("Rediger grupperinger")===-1);
  check("træning-faner i første program: Push | Pull", tabsText("[data-tab]")==="Push|Pull");
  check("Push-træningen viser bench", main.querySelectorAll('[data-exid="bench"]').length===1 && main.querySelectorAll('[data-exid="row"]').length===0);

  document.querySelector('[data-tab="b"]').click();
  main = document.getElementById("main");
  check("Pull-træningen viser Pec deck + Row (flere muskelgrupper i én liste)", main.querySelectorAll('[data-exid="fly"]').length===1 && main.querySelectorAll('[data-exid="row"]').length===1);

  document.querySelector('[data-prog="p2"]').click();
  main = document.getElementById("main");
  check("program UL: kun træningen Upper, med bench (øvelse i flere træninger)", tabsText("[data-tab]")==="Upper" && main.querySelectorAll('[data-exid="bench"]').length===1);

  document.querySelector('[data-prog="other"]').click();
  main = document.getElementById("main");
  check("Øvrige indeholder Dips (og ingen træning-faner)", main.querySelectorAll('[data-exid="dips"]').length===1 && document.querySelectorAll("[data-tab]").length===0);

  // Rediger en træning: tilføj Dips til Upper
  document.querySelector('[data-prog="p2"]').click();
  document.querySelector('[data-editlist="c"]').click();
  document.querySelector('[data-chk="dips"]').click();
  document.getElementById("saveListBtn").click();
  check("Rediger træning: Dips tilføjet til Upper", window.loadEx().find(function(e){return e.id==="dips";}).variant==="c");

  // Administrer: nyt program + ny træning i PPL
  document.getElementById("editProgramsBtn").click();
  var sheet = document.getElementById("modalSheet");
  check("modal viser 2 programmer og 3 træninger", sheet.querySelectorAll("[data-progname]").length===2 && sheet.querySelectorAll("[data-wname]").length===3);
  document.querySelector('[data-wadd="0"]').click();
  var wInp = document.querySelector('[data-wname="0-2"]');
  wInp.value = "Legs"; wInp.dispatchEvent(new window.Event("input", { bubbles:true }));
  document.getElementById("addProgBtn").click();
  var pInp = document.querySelector('[data-progname="2"]');
  pInp.value = "Fuldkrop"; pInp.dispatchEvent(new window.Event("input", { bubbles:true }));
  document.getElementById("saveProgsBtn").click();
  await wait(100);
  var progs = window.getPrograms();
  check("gemt: 3 programmer, PPL har nu 3 træninger (Legs har nyt tegn)", progs.length===3 && progs[0].workouts.length===3 && progs[0].workouts[2].name==="Legs" && progs[0].workouts[2].id==="d");
  check("nyt program 'Fuldkrop' har en træning med nyt tegn 'e'", progs[2].name==="Fuldkrop" && progs[2].workouts[0].id==="e");

  // Slet træningen Pull (b): row (kun i b) -> Øvrige, bench (a+c) uændret
  document.querySelector('[data-prog="p1"]').click();
  document.getElementById("editProgramsBtn").click();
  document.querySelector('[data-wdel="0-1"]').click();
  document.getElementById("saveProgsBtn").click();
  await wait(100);
  var ex = window.loadEx();
  check("slettet træning: øvelse kun i den -> Øvrige (null)", ex.find(function(e){return e.id==="row";}).variant===null);
  check("slettet træning: øvelse i flere beholder de andre (bench 'ac')", ex.find(function(e){return e.id==="bench";}).variant==="ac");

  // Slet hele programmet UL (p2) -> Upper (c) fjernes fra øvelserne
  document.getElementById("editProgramsBtn").click();
  document.querySelector('[data-progdel="1"]').click();
  document.getElementById("saveProgsBtn").click();
  await wait(100);
  ex = window.loadEx();
  check("slettet program: dets træning-tegn fjernes (bench -> 'a')", ex.find(function(e){return e.id==="bench";}).variant==="a" && window.getPrograms().length===2);

  // Kan ikke slette sidste træning i et program / sidste program
  document.getElementById("editProgramsBtn").click();
  check("kan ikke slette sidste træning i et program", (function(){
    var progIdx = window.getPrograms().findIndex(function(p){ return p.name==="Fuldkrop"; });
    var before = document.querySelectorAll("[data-wname]").length;
    var btn = document.querySelector('[data-wdel="'+progIdx+'-0"]');
    btn.click();
    return document.querySelectorAll("[data-wname]").length===before;
  })());
  check("kan ikke slette sidste program", (function(){
    var dels = document.querySelectorAll("[data-progdel]");
    for(var i=dels.length-1;i>0;i--){ dels[i].click(); dels = document.querySelectorAll("[data-progdel]"); }
    return document.querySelectorAll("[data-progname]").length===1;
  })());

  return checks;
}

(async function main(){
  await group("Eksisterende bruger / split-filer / fjernet Øvelse 1-2-3-4", testEksisterendeBrugerOgSplit);
  await group("Ny bruger / godkendelsesvæg", testNyBrugerGodkendelsesvaeg);
  await group("Onboarding-flow", testOnboardingFlow);
  await group("Flere programmer", testFlereProgrammer);

  const fails = allResults.filter(function(r){ return !r[1]; });
  allResults.forEach(function(r){ console.log((r[1] ? "OK  " : "FEJL") + " - " + r[0]); });
  console.log("\n" + (fails.length ? (fails.length + " FEJL FUNDET") : ("Alle " + allResults.length + " tjek bestået")));
  process.exit(fails.length ? 1 : 0);
})().catch(function(err){
  console.error("Test-scriptet crashede:", err);
  process.exit(1);
});
