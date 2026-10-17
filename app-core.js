"use strict";
/* ================= Supabase (cloud backend) ================= */
var SUPA_URL = "https://knzhotszdmfshdndweft.supabase.co";
var SUPA_KEY = "sb_publishable_91afG0eQt8eK07N1jXRruQ_eE8LLgPc";
/* Kun denne konto får tilbudt engangs-flytning af gamle lokale data til skyen: */
var MIGRATION_OWNER_EMAIL = "matteoverdiani.dk@gmail.com";

var sb = null;
try{
  sb = window.supabase.createClient(SUPA_URL, SUPA_KEY);
}catch(e){ /* håndteres i boot() */ }

/* Session/bruger-state */
var session = null;    // supabase auth session
var myProfile = null;  // {id, username}
var memEx = [];        // egne øvelser (app-format)
var memLogs = [];      // egne logs (app-format)

/* Cache af en vens data når man kigger på deres profil */
var friendCache = null; // {userId, username, ex:[], logs:[]}

/* ---------------- Data helpers ---------------- */
var LS_EX = "jernlog_exercises";        // bruges KUN til engangs-migrering af gamle lokale data
var LS_LOGS = "jernlog_logs";           // (samme)
var LS_PROGRAMS = "jernlog_programs";   // programmer er stadig lokale (statisk reference)
var LS_PENDING = "jernlog_pending_snapshot"; // nød-backup hvis et cloud-gem fejler

/* Muskelgrupper -> hvilken træningsdag (1,2,3) de hører til. */
var MUSCLE_DAY = {
  "ryg":1, "bagskulder":1, "tricep":1,
  "ben":2, "mave":2,
  "bryst":3, "sideskulder":3, "forskulder":3, "biceps":3
};
var MUSCLE_LABELS = {
  "ryg":"Ryg", "bagskulder":"Bagskulder", "tricep":"Tricep",
  "ben":"Ben", "mave":"Mave",
  "bryst":"Bryst", "sideskulder":"Sideskulder", "forskulder":"Forskulder", "biceps":"Biceps"
};
/* Rækkefølgen her styrer også Øvelser-sidens sektioner (Ryg → Bryst → Ben) */
var MUSCLE_GROUPS_BY_DAY = [
  {day:1, title:"Ryg, Bagskulder & Tricep", muscles:["ryg","bagskulder","tricep"]},
  {day:3, title:"Bryst, Skulder & Biceps", muscles:["bryst","sideskulder","forskulder","biceps"]},
  {day:2, title:"Ben & Mave", muscles:["ben","mave"]}
];
/* Fast rækkefølge til indstillings-modalen for grupperinger (alle 9 muskelgrupper, én gang hver) */
var MUSCLE_ORDER = ["ryg","bagskulder","tricep","bryst","sideskulder","forskulder","biceps","ben","mave"];

/* Slår 3 muskel-lister sammen til en pæn titel, fx "Bryst, Skulder & Triceps" — bruges kun
   når brugeren selv har lavet en tilpasset gruppering (ellers bruges de håndskrevne titler ovenfor). */
function joinMuscleTitles(muscles){
  var labels = muscles.map(function(m){ return MUSCLE_LABELS[m]||m; });
  if(labels.length===0) return "Ingen muskelgrupper valgt";
  if(labels.length===1) return labels[0];
  return labels.slice(0,-1).join(", ") + " & " + labels[labels.length-1];
}

/* Brugerens egen gruppering (profiles.group_layout: array af 3 arrays med muskel-nøgler) —
   falder tilbage til standard-grupperingen hvis intet er sat, eller hvis dataen skulle vise
   sig ugyldig (forkert antal grupper, manglende/dobbelte muskelgrupper osv). */
function getEffectiveGroups(){
  var layout = myProfile && myProfile.group_layout;
  if(!Array.isArray(layout) || layout.length!==3 || !layout.every(function(a){ return Array.isArray(a); })){
    return MUSCLE_GROUPS_BY_DAY;
  }
  var known = Object.keys(MUSCLE_LABELS);
  var flat = [].concat(layout[0], layout[1], layout[2]);
  var validCoverage = flat.length===known.length && known.every(function(m){ return flat.indexOf(m)!==-1; })
    && flat.every(function(m,i){ return flat.indexOf(m)===i; });
  if(!validCoverage) return MUSCLE_GROUPS_BY_DAY;
  return layout.map(function(arr, i){
    return { day: i+1, title: joinMuscleTitles(arr), muscles: arr, custom: true };
  });
}
function isDefaultGroupLayout(){ return getEffectiveGroups()===MUSCLE_GROUPS_BY_DAY; }

/* Brugerens programmer (profiles.programs: [{id:"a",name:"Program 1"}, ...]). Hver øvelse husker
   hvilke programmer den er med i som en tekst af program-bogstaver i exercises.variant (fx "ab").
   Uden eget valg (eller ugyldig data) er der de to klassiske: Program 1 (a) og Program 2 (b). */
var PROGRAM_LETTERS = "abcdefghijklmnopqrstuvwxyz";
var DEFAULT_PROGRAMS = [{id:"a", name:"Program 1"}, {id:"b", name:"Program 2"}];
function getPrograms(){
  var p = myProfile && myProfile.programs;
  if(!Array.isArray(p) || p.length===0) return DEFAULT_PROGRAMS;
  var seen = {};
  var ok = p.every(function(x){
    if(!x || typeof x.id!=="string" || x.id.length!==1 || PROGRAM_LETTERS.indexOf(x.id)===-1 || seen[x.id]) return false;
    seen[x.id] = true;
    return typeof x.name==="string" && x.name.trim()!=="";
  });
  return ok ? p : DEFAULT_PROGRAMS;
}
function programName(letter){
  var f = getPrograms().find(function(p){ return p.id===letter; });
  return f ? f.name : "Program";
}
/* Samler en variant-tekst: kun kendte, unikke bogstaver i fast rækkefølge — tom = null (Øvrige øvelser) */
function normalizeVariant(letters){
  var known = getPrograms().map(function(p){ return p.id; });
  var out = PROGRAM_LETTERS.split("").filter(function(c){ return String(letters||"").indexOf(c)!==-1 && known.indexOf(c)!==-1; }).join("");
  return out || null;
}

function dayGroupForMuscle(muscle){
  var groups = getEffectiveGroups();
  for(var i=0;i<groups.length;i++){
    if(groups[i].muscles.indexOf(muscle)!==-1) return i+1;
  }
  return null;
}

function uid(prefix){ return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2,9); }
function todayISO(){ var d=new Date(); return d.toISOString().slice(0,10); }
function fmtDateDisplay(iso){
  var today = todayISO();
  var y = new Date(); y.setDate(y.getDate()-1); var yesterday = y.toISOString().slice(0,10);
  if(iso === today) return "I dag";
  if(iso === yesterday) return "I går";
  var d = new Date(iso+"T00:00:00");
  var months = ["jan","feb","mar","apr","maj","jun","jul","aug","sep","okt","nov","dec"];
  return d.getDate()+". "+months[d.getMonth()]+" "+d.getFullYear();
}
function fmtClock(ms){
  var d = new Date(ms);
  function p(n){ return (n<10?"0":"")+n; }
  return p(d.getHours())+":"+p(d.getMinutes());
}
function fmtCommentDate(iso){
  if(!iso) return "";
  var d = new Date(iso);
  if(isNaN(d.getTime())) return "";
  var dateOnly = d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  return fmtDateDisplay(dateOnly);
}
/* Fælles "hvornår"-blok for et træningskort (feed + Dig): datoen vises som en
   tydelig lille badge for sig selv, resten (klokkeslæt/varighed/øvelser) står
   under i dæmpet tekst — så det er lettere at se med det samme hvilken dag en
   træning er fra, i stedet for at alt står i én rodet linje. */
function renderWhenHtml(w, isLive){
  var dateIso = new Date(w.start).toISOString().slice(0,10);
  var durMin = Math.round((w.end - w.start)/60000);
  var dateLabel = isLive ? "I dag" : fmtDateDisplay(dateIso);
  var restTxt;
  if(isLive){
    restTxt = "Startede kl. "+fmtClock(w.start)+" · "+w.exercises.length+" øvelse"+(w.exercises.length===1?"":"r")+" indtil videre";
  } else {
    restTxt = fmtClock(w.start) + (durMin>0 ? ("–"+fmtClock(w.end)+" · "+durMin+" min") : "") + " · " + w.exercises.length + " øvelse" + (w.exercises.length===1?"":"r");
  }
  return '<div class="feed-date-badge">'+escapeHtml(dateLabel)+'</div><div class="feed-when">'+escapeHtml(restTxt)+'</div>';
}
function parseWeight(str){
  if(str===null||str===undefined||str==="") return null;
  var n = parseFloat(String(str).replace(",","."));
  return isNaN(n) ? null : n;
}
function parseReps(raw){
  if(raw===null||raw===undefined) return null;
  raw = String(raw).trim();
  if(raw==="") return null;
  var rangeMatch = raw.match(/^(\d+)\s*-\s*(\d+)$/);
  if(rangeMatch){
    var a = parseInt(rangeMatch[1],10), b = parseInt(rangeMatch[2],10);
    if(a>b){ var t=a; a=b; b=t; }
    var mid = Math.floor((a+b)/2);
    if(mid<=0) return null;
    return {reps: mid, repsLabel: a+"-"+b};
  }
  var single = parseInt(raw,10);
  if(!isNaN(single) && single>0 && /^\d+$/.test(raw)){
    return {reps: single, repsLabel: String(single)};
  }
  return null;
}

/* ---------- Egne data: læses fra hukommelsen (hentet fra skyen ved start) ---------- */
function loadEx(){ return memEx; }
function loadLogs(){ return memLogs; }
function loadPrograms(){ try{ return JSON.parse(localStorage.getItem(LS_PROGRAMS))||null; }catch(e){ return null; } }

function getExerciseById(id){
  var list = (state.viewUser && friendCache && friendCache.userId===state.viewUser) ? friendCache.ex : memEx;
  return list.find(function(e){return e.id===id;});
}

/* ---------- Mapping mellem app-format og database-rækker ---------- */
var HAS_POSITION_COL = true; /* sættes ved boot — falder pænt tilbage hvis kolonnen mangler */
function exToRow(e){
  var row = { user_id: session.user.id, id: e.id, name: e.name, bodyweight: !!e.bodyweight, muscle: e.muscle||null, variant: e.variant||null };
  if(HAS_POSITION_COL) row.position = (e.position===undefined||e.position===null) ? null : e.position;
  return row;
}
function rowToEx(r){
  return { id: r.id, name: r.name, bodyweight: !!r.bodyweight, muscle: r.muscle||null, variant: r.variant||null, position: (r.position===undefined||r.position===null) ? null : parseFloat(r.position) };
}
function logToRow(l){
  return {
    user_id: session.user.id,
    id: l.id,
    exercise_id: l.exerciseId,
    date: l.date,
    logged_at: (l.loggedAt!==undefined && l.loggedAt!==null) ? new Date(l.loggedAt).toISOString() : new Date(l.date+"T12:00:00Z").toISOString(),
    set_number: l.setNumber,
    weight: (l.weight===undefined||l.weight===null) ? null : l.weight,
    reps: (l.reps===undefined||l.reps===null) ? null : l.reps,
    reps_label: l.repsLabel!==undefined && l.repsLabel!==null ? String(l.repsLabel) : null,
    muscle_pos: l.musclePos || "1-2",
    skipped: !!l.skipped
  };
}
function rowToLog(r){
  return {
    id: r.id,
    exerciseId: r.exercise_id,
    date: r.date,
    loggedAt: r.logged_at ? Date.parse(r.logged_at) : null,
    setNumber: r.set_number,
    weight: (r.weight===null||r.weight===undefined) ? null : parseFloat(r.weight),
    reps: (r.reps===null||r.reps===undefined) ? null : parseFloat(r.reps),
    repsLabel: r.reps_label,
    musclePos: r.muscle_pos || "1-2",
    skipped: !!r.skipped
  };
}

/* ---------- Cloud-sync: saveEx/saveLogs finder selv ændringer og skubber dem op ---------- */
function diffById(newList, oldList){
  var oldById = {};
  oldList.forEach(function(x){ oldById[x.id] = JSON.stringify(x); });
  var newIds = {};
  newList.forEach(function(x){ newIds[x.id] = true; });
  var upserts = newList.filter(function(x){ return oldById[x.id] !== JSON.stringify(x); });
  var dels = oldList.filter(function(x){ return !newIds[x.id]; }).map(function(x){ return x.id; });
  return { upserts: upserts, dels: dels };
}
function persistPendingSnapshot(){
  try{ localStorage.setItem(LS_PENDING, JSON.stringify({ex: memEx, logs: memLogs, t: Date.now()})); }catch(e){}
}
function pushChanges(table, changes, toRowFn){
  var ops = [];
  if(changes.upserts.length) ops.push(sb.from(table).upsert(changes.upserts.map(toRowFn)));
  if(changes.dels.length) ops.push(sb.from(table).delete().eq("user_id", session.user.id).in("id", changes.dels));
  if(!ops.length) return;
  Promise.all(ops).then(function(results){
    var bad = results.filter(function(r){ return r && r.error; });
    if(bad.length){
      persistPendingSnapshot();
      showToast("⚠ Kunne ikke gemme i skyen — prøver igen næste gang");
    }
  }).catch(function(){
    persistPendingSnapshot();
    showToast("⚠ Kunne ikke gemme i skyen — prøver igen næste gang");
  });
}
function saveEx(list){
  var changes = diffById(list, memEx);
  memEx = list;
  pushChanges("exercises", changes, exToRow);
}
function saveLogs(list){
  var changes = diffById(list, memLogs);
  memLogs = list;
  pushChanges("logs", changes, logToRow);
}

/* Hvis et cloud-gem fejlede tidligere, ligger der en nød-backup — skub den op igen */
function flushPendingSnapshot(){
  var raw = null;
  try{ raw = localStorage.getItem(LS_PENDING); }catch(e){}
  if(!raw) return Promise.resolve();
  var snap;
  try{ snap = JSON.parse(raw); }catch(e){ localStorage.removeItem(LS_PENDING); return Promise.resolve(); }
  return upsertChunks("exercises", (snap.ex||[]).map(exToRow))
    .then(function(){ return upsertChunks("logs", (snap.logs||[]).map(logToRow)); })
    .then(function(){ try{ localStorage.removeItem(LS_PENDING); }catch(e){} })
    .catch(function(){ /* stadig offline — prøver igen næste gang */ });
}
function upsertChunks(table, rows){
  var p = Promise.resolve();
  for(var i=0; i<rows.length; i+=200){
    (function(slice){
      p = p.then(function(){
        return sb.from(table).upsert(slice).then(function(res){
          if(res.error) throw res.error;
        });
      });
    })(rows.slice(i, i+200));
  }
  return p;
}

/* Hent ALLE rækker (PostgREST giver max 1000 ad gangen) */
function fetchAllRows(makeQuery){
  var all = [];
  var size = 1000;
  function page(n){
    return makeQuery().range(n*size, n*size+size-1).then(function(res){
      if(res.error) throw res.error;
      all = all.concat(res.data||[]);
      if(res.data && res.data.length===size) return page(n+1);
      return all;
    });
  }
  return page(0);
}

/* ---------------- Score / PR / trend helpers ---------------- */
function setScore(s){
  var w = s.weight || 0;
  var r = s.reps || 0;
  return w*1000 + r;
}
function sessionsForExercise(exId, bucketFilter, logsArr){
  var source = logsArr || loadLogs();
  var logs = source.filter(function(l){
    if(l.exerciseId!==exId) return false;
    if(bucketFilter){
      var mp = l.musclePos || "1-2";
      if(mp!==bucketFilter) return false;
    }
    return true;
  });
  var byDate = {};
  logs.forEach(function(l){
    if(!byDate[l.date]) byDate[l.date]=[];
    byDate[l.date].push(l);
  });
  var dates = Object.keys(byDate).sort(); // ascending
  return dates.map(function(d){
    var sets = byDate[d].sort(function(a,b){return a.setNumber-b.setNumber;});
    var tracked = sets.filter(function(s){return !s.skipped;});
    var top = tracked.length ? tracked.reduce(function(m,s){ return setScore(s)>setScore(m)?s:m; }, tracked[0]) : null;
    return {date:d, sets:sets, topSet:top, topScore: top ? setScore(top) : null};
  });
}
function allTimeBest(exId, logsArr){
  var sess = sessionsForExercise(exId, null, logsArr);
  var best = null;
  sess.forEach(function(s){
    if(s.topScore===null) return;
    if(!best || s.topScore>best.topScore) best = s;
  });
  return best;
}
function bestPerSetNumber(exId, logsArr){
  var source = logsArr || loadLogs();
  var logs = source.filter(function(l){return l.exerciseId===exId && !l.skipped;});
  var bySetNum = {};
  logs.forEach(function(l){
    var sn = l.setNumber;
    if(!bySetNum[sn] || setScore(l)>setScore(bySetNum[sn])) bySetNum[sn] = l;
  });
  return bySetNum;
}
function trendForSession(sessions, idx){
  if(sessions[idx].topScore===null) return null;
  var prevScore = null;
  for(var i=idx-1;i>=0;i--){
    if(sessions[i].topScore!==null){ prevScore = sessions[i].topScore; break; }
  }
  if(prevScore===null) return null;
  var cur = sessions[idx].topScore;
  if(cur>prevScore) return "up";
  if(cur<prevScore) return "down";
  return "same";
}
function trendArrow(t){
  if(t==="up") return '<span class="trend up">▲ Fremgang</span>';
  if(t==="down") return '<span class="trend down">▼ Tilbagegang</span>';
  if(t==="same") return '<span class="trend same">▬ Uændret</span>';
  return "";
}

/* ---------------- Router / state ---------------- */
var state = { view:"log", selectedExerciseId:null, viewUser:null, histBack:"history", calMonth:null, friendCalMonth:null, calSelectedDay:null, feedExpanded:{}, feedFocus:null, digExpanded:{}, exercisesTab:0, digShowAll:false };
var main = document.getElementById("main");

function render(){
  if(!session){ renderLogin("in"); return; }
  if(state.view==="log") renderLog();
  else if(state.view==="feed") renderFeed();
  else if(state.view==="history") renderHistoryList();
  else if(state.view==="exerciseHistory") renderExerciseHistory(state.selectedExerciseId);
  else if(state.view==="exercises") renderExercisesPage();
  else if(state.view==="calendar") renderCalendarPage();
  else if(state.view==="comments") renderCommentsPage();
  else if(state.view==="dig") renderDig();
  else if(state.view==="admin") renderAdminApprovals();
  else if(state.view==="friends") renderFriends();
  else if(state.view==="friendProfile") renderFriendProfile(state.viewUser);
}

function goto(view, extra){
  /* forlader man "Dig", nulstilles "Se tidligere"-udvidelsen, så listen er kort igen næste gang man kommer tilbage */
  if(state.view==="dig" && view!=="dig") state.digShowAll = false;
  state.view = view;
  if(view!=="exerciseHistory" && view!=="friendProfile") state.viewUser = (view==="feed"||view==="friends") ? null : state.viewUser;
  if(extra) Object.assign(state, extra);
  render();
  updateBottomNavActive();
  main.scrollTop = 0; /* <main> er nu det eneste scrollbare element, ikke vinduet */
}

/* ---------------- Toast ---------------- */
function showToast(msg, ms, type){
  var t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast show" + (type ? " " + type : "");
  clearTimeout(t._timer);
  t._timer = setTimeout(function(){ t.classList.remove("show"); }, ms||2200);
  if(type==="pr") burstConfetti();
}

/* Lille konfetti-regn ved ny PR — falder fra toppen af skærmen og rydder sig selv op. */
var CONFETTI_COLORS = ["#ffb238","#34d399","#f4f5f6","#8a6420"];

/* Delte ikon-snippets (SVG), brugt flere steder på tværs af app-*.js i stedet for emoji */
var ICON_MEDAL = '<svg style="width:11px;height:11px;"><use href="#ic-medal"/></svg>';
var ICON_MEDAL_SM = '<svg style="width:9px;height:9px;"><use href="#ic-medal"/></svg>';
var ICON_COMMENT = '<svg style="width:12px;height:12px;"><use href="#ic-comment"/></svg>';
var ICON_TREND_DOWN = '<svg style="width:12px;height:12px;"><use href="#ic-trend-down"/></svg>';
function burstConfetti(){
  var layer = document.getElementById("confettiLayer");
  if(!layer) return;
  layer.innerHTML = "";
  var vw = window.innerWidth, vh = window.innerHeight;
  var n = 46;
  for(var i=0;i<n;i++){
    var el = document.createElement("div");
    el.className = "confetti-piece";
    var size = 6 + Math.random()*7;
    var isCircle = Math.random() > 0.5;
    el.style.width = size+"px";
    el.style.height = (isCircle ? size : size*2.4)+"px";
    el.style.borderRadius = isCircle ? "50%" : "2px";
    el.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    var startX = Math.random()*vw;
    var drift = (Math.random()*140-70);
    var fallTo = vh*(0.62 + Math.random()*0.3);
    var dur = 2.3 + Math.random()*1.1;
    el.style.setProperty("--dx0", startX+"px");
    el.style.setProperty("--dx1", (startX+drift)+"px");
    el.style.setProperty("--dy1", fallTo+"px");
    el.style.setProperty("--rot", (Math.random()*520-260)+"deg");
    el.style.animationDuration = dur+"s";
    el.style.animationDelay = (Math.random()*0.5)+"s";
    layer.appendChild(el);
  }
  setTimeout(function(){ layer.innerHTML = ""; }, 4200);
}

/* ---------------- Tastatur + knap-tryk samtidig (iOS-fix) ----------------
   På iPhone kræver det normalt to separate tryk at (1) lukke tastaturet og
   (2) trykke på en knap bagved — første tryk bruges kun til at lukke
   tastaturet, og knappens "click" udløses aldrig.
   Tidligere forsøg: fjerne fokus globalt på "touchstart" for hele siden.
   Det viste sig at give en NY fejl (fx på login-siden): fordi det globale
   touchstart-tryk starter tastaturets luk-animation FØR selve trykket er
   færdigt, når layoutet nogle gange at flytte sig (feltet under fingeren
   ændrer position), så browseren tror man trykkede på et helt andet element
   (fx hoppede op i mail-feltet i stedet for at trykke "Log ind").
   Rigtig fix: brug "touchend" (ikke touchstart) PÅ SELVE KNAPPEN i stedet for
   et globalt lag. Touch-events er "låst" til det element man startede trykket
   på, uanset om layoutet flytter sig undervejs — så den rammer altid den
   rigtige knap. bindTapAction() bruges på knapper der sidder lige efter et
   tekstfelt (login, kommentar-send), og gør både luk-tastatur og selve
   knappens handling i ét og samme tryk. */
function bindTapAction(el, handler){
  var handledByTouch = false;
  el.addEventListener("touchend", function(e){
    handledByTouch = true;
    e.preventDefault();
    var ae = document.activeElement;
    if(ae && (ae.tagName==="INPUT"||ae.tagName==="TEXTAREA") && ae!==el) ae.blur();
    handler(e);
    setTimeout(function(){ handledByTouch = false; }, 500);
  }, {passive:false});
  el.addEventListener("click", function(e){
    if(handledByTouch) return; /* undgå at "click" (som følger efter touchend) udløser handleren igen */
    handler(e);
  });
}

/* ---------------- App-titel = genvej til hovedskærmen ---------------- */
var appTitleBtn = document.getElementById("appTitleBtn");
appTitleBtn.addEventListener("click", function(){
  if(!session) return;
  logDraft.exerciseId = null;
  logDraft.musclePos = "1-2";
  logDraft.repsMode = "wheel";
  logDraft.wheelValue = 8;
  logDraft.textValue = "";
  state.viewUser = null;
  goto("log");
});

/* ---------------- Menu ---------------- */
var menuBtn = document.getElementById("menuBtn");
var menuOverlay = document.getElementById("menuOverlay");
menuBtn.addEventListener("click", function(){ menuOverlay.classList.add("open"); updateMenuActive(); });
menuOverlay.addEventListener("click", function(e){ if(e.target===menuOverlay) menuOverlay.classList.remove("open"); });
document.querySelectorAll(".menu-item[data-view]").forEach(function(item){
  item.addEventListener("click", function(){
    menuOverlay.classList.remove("open");
    state.viewUser = null;
    goto(item.getAttribute("data-view"));
  });
});
document.getElementById("menuLogout").addEventListener("click", function(){
  menuOverlay.classList.remove("open");
  if(!confirm("Vil du logge ud?")) return;
  sb.auth.signOut().catch(function(){});
  session = null; myProfile = null; memEx = []; memLogs = []; friendCache = null;
  document.getElementById("menuBtn").style.display = "none";
  document.getElementById("bottomNav").style.display = "none";
  renderLogin("in");
});
function updateMenuActive(){
  document.querySelectorAll(".menu-item[data-view]").forEach(function(item){
    item.classList.toggle("active", item.getAttribute("data-view")===state.view || (item.getAttribute("data-view")==="history" && state.view==="exerciseHistory" && !state.viewUser && state.histBack!=="exercises") || (item.getAttribute("data-view")==="exercises" && state.view==="exerciseHistory" && !state.viewUser && state.histBack==="exercises") || (item.getAttribute("data-view")==="friends" && state.view==="friendProfile"));
  });
  var mu = document.getElementById("menuUser");
  mu.textContent = myProfile ? "("+myProfile.username+")" : "";
  refreshMenuBadges();
}

/* ---------------- Bundnavigation ---------------- */
document.querySelectorAll(".bn-item[data-view]").forEach(function(item){
  item.addEventListener("click", function(){
    state.viewUser = null;
    goto(item.getAttribute("data-view"));
  });
});
function updateBottomNavActive(){
  document.querySelectorAll(".bn-item[data-view]").forEach(function(item){
    var v = item.getAttribute("data-view");
    var active = v===state.view || (v==="history" && state.view==="exerciseHistory" && !state.viewUser && state.histBack!=="exercises");
    item.classList.toggle("active", active);
  });
}

/* ---------- Ulæste kommentarer (in-app notifikation) ---------- */
var LS_COMMENTS_SEEN = "jernlog_comments_seen";
function getCommentsSeen(){ var v = 0; try{ v = parseInt(localStorage.getItem(LS_COMMENTS_SEEN)||"0",10)||0; }catch(e){} return v; }
function setCommentsSeenNow(){ try{ localStorage.setItem(LS_COMMENTS_SEEN, String(Date.now())); }catch(e){} }
/* En kommentar er "min samtale" hvis den er på min træning, eller på en træning jeg selv har kommenteret */
function myConversationComments(allComments){
  var me = session.user.id;
  var myKeys = {};
  allComments.forEach(function(c){
    var key = c.target_user + "|" + c.workout_start;
    if(c.target_user===me || c.author===me) myKeys[key] = true;
  });
  return allComments.filter(function(c){ return myKeys[c.target_user + "|" + c.workout_start]; });
}
function countUnreadComments(allComments){
  var me = session.user.id;
  var seen = getCommentsSeen();
  return myConversationComments(allComments).filter(function(c){
    return c.author!==me && Date.parse(c.created_at) > seen;
  }).length;
}

function isAdminAccount(){
  return !!(session && session.user && session.user.email && session.user.email.toLowerCase()===MIGRATION_OWNER_EMAIL);
}

function refreshMenuBadges(){
  if(!session) return;
  sb.from("friendships").select("id").eq("addressee", session.user.id).eq("status","pending").then(function(res){
    var dot = document.getElementById("friendReqDot");
    if(res.error || !res.data || res.data.length===0){ dot.style.display="none"; return; }
    dot.textContent = res.data.length;
    dot.style.display = "inline-flex";
  });
  sb.from("comments").select("*").order("created_at",{ascending:true}).limit(1000).then(function(res){
    var dot = document.getElementById("commentDot");
    if(res.error || !res.data){ dot.style.display="none"; return; }
    var n = countUnreadComments(res.data);
    if(n===0){ dot.style.display="none"; return; }
    dot.textContent = n;
    dot.style.display = "inline-flex";
  });
  var adminItem = document.getElementById("menuAdminItem");
  if(!isAdminAccount()){ adminItem.style.display = "none"; return; }
  adminItem.style.display = "flex";
  sb.from("profiles").select("id").eq("approved", false).then(function(res){
    var dot = document.getElementById("adminReqDot");
    if(res.error || !res.data || res.data.length===0){ dot.style.display="none"; return; }
    dot.textContent = res.data.length;
    dot.style.display = "inline-flex";
  });
}

/* ---------------- Modal ---------------- */
var modalOverlay = document.getElementById("modalOverlay");
var modalSheet = document.getElementById("modalSheet");
function openModal(html){
  modalSheet.innerHTML = html;
  modalOverlay.classList.add("open");
}
function closeModal(){ modalOverlay.classList.remove("open"); }
modalOverlay.addEventListener("click", function(e){ if(e.target===modalOverlay) closeModal(); });

/* =========================================================
   LOGIN / OPRET KONTO
   ========================================================= */
function renderLogin(mode, prefillEmail){
  document.getElementById("menuBtn").style.display = "none";
  document.getElementById("bottomNav").style.display = "none";
  var html = '<div class="login-wrap">';
  html += '<div class="login-logo" style="color:var(--yellow);"><svg style="width:44px;height:44px;"><use href="#ic-barbell"/></svg></div>';
  html += '<div class="login-title">Master Matteos Jernlog</div>';
  if(mode==="sent"){
    html += '<div class="login-sub">Konto oprettet!</div>';
    html += '<div class="card"><div style="font-size:15px;line-height:1.5;">📧 Vi har sendt en bekræftelses-mail til <b>'+escapeHtml(prefillEmail||"din email")+'</b>.<br><br>Klik på linket i mailen (tjek evt. spam), og log derefter ind her.</div></div>';
    html += '<button class="btn primary" id="gotoLoginBtn">Til log ind</button>';
    html += '</div>';
    main.innerHTML = html;
    document.getElementById("gotoLoginBtn").addEventListener("click", function(){ renderLogin("in", prefillEmail); });
    return;
  }
  html += '<div class="login-sub">'+(mode==="up" ? "Opret en konto for at komme i gang" : "Log ind for at fortsætte")+'</div>';
  html += '<div class="card">';
  if(mode==="up"){
    html += '<div class="field"><label class="field-label">Brugernavn (det dine venner ser)</label><input type="text" id="authUsername" autocomplete="off" autocapitalize="off" placeholder="fx matteo"></div>';
  }
  html += '<div class="field"><label class="field-label">Email</label><input type="email" id="authEmail" autocomplete="username" autocapitalize="off" value="'+escapeHtml(prefillEmail||"")+'" placeholder="din@email.dk"></div>';
  html += '<div class="field"><label class="field-label">Adgangskode'+(mode==="up"?" (mindst 6 tegn)":"")+'</label><input type="password" id="authPassword" autocomplete="'+(mode==="up"?"new-password":"current-password")+'" placeholder="••••••••"></div>';
  html += '<button class="btn primary" id="authSubmit">'+(mode==="up" ? "Opret konto" : "Log ind")+'</button>';
  html += '</div>';
  html += '<div class="login-switch" id="authSwitch">'+(mode==="up" ? "Har du allerede en konto? Log ind" : "Ny her? Opret en konto")+'</div>';
  html += '</div>';
  main.innerHTML = html;

  document.getElementById("authSwitch").addEventListener("click", function(){
    renderLogin(mode==="up" ? "in" : "up", document.getElementById("authEmail").value.trim());
  });

  var submitBtn = document.getElementById("authSubmit");
  bindTapAction(submitBtn, function(){
    var email = document.getElementById("authEmail").value.trim();
    var password = document.getElementById("authPassword").value;
    if(!email || email.indexOf("@")===-1){ showToast("Skriv en gyldig email"); return; }
    if(!password || password.length<6){ showToast("Adgangskoden skal være mindst 6 tegn"); return; }
    submitBtn.disabled = true;
    submitBtn.textContent = "Vent…";

    if(mode==="up"){
      var uname = document.getElementById("authUsername").value.trim().toLowerCase();
      if(!/^[a-z0-9æøå_.-]{2,20}$/.test(uname)){
        showToast("Brugernavn: 2-20 tegn, kun bogstaver/tal/._-");
        submitBtn.disabled = false; submitBtn.textContent = "Opret konto";
        return;
      }
      sb.auth.signUp({ email: email, password: password, options: { data: { username: uname } } }).then(function(res){
        if(res.error){
          var m = res.error.message||"";
          if(m.indexOf("already registered")!==-1) showToast("Der findes allerede en konto med den email");
          else showToast("Kunne ikke oprette konto: "+m);
          submitBtn.disabled = false; submitBtn.textContent = "Opret konto";
          return;
        }
        if(res.data && res.data.session){
          /* email-bekræftelse slået fra — direkte ind */
          session = res.data.session;
          bootAfterLogin();
        } else {
          renderLogin("sent", email);
        }
      });
    } else {
      sb.auth.signInWithPassword({ email: email, password: password }).then(function(res){
        if(res.error){
          var m = res.error.message||"";
          if(m.indexOf("Invalid login credentials")!==-1) showToast("Forkert email eller adgangskode");
          else if(m.indexOf("Email not confirmed")!==-1) showToast("Bekræft først din email — tjek din indbakke");
          else showToast("Kunne ikke logge ind: "+m);
          submitBtn.disabled = false; submitBtn.textContent = "Log ind";
          return;
        }
        session = res.data.session;
        bootAfterLogin();
      });
    }
  });
}

function renderLoadingScreen(msg){
  main.innerHTML = '<div class="empty-state" style="padding-top:70px;font-size:15px;">'+escapeHtml(msg||"Henter dine data…")+'</div>';
}

/* Vises for nye brugere der endnu ikke er godkendt af MASTER MATTEO */
function renderPendingApproval(){
  document.getElementById("menuBtn").style.display = "none";
  document.getElementById("bottomNav").style.display = "none";
  var html = '<div class="login-wrap">';
  html += '<div class="login-logo">⏳</div>';
  html += '<div class="login-title">Venter på godkendelse</div>';
  html += '<div class="card"><div style="font-size:15px;line-height:1.5;">Venter på at <b>MASTER MATTEO</b> accepterer dig.<br><br>Du får ikke adgang til appen før din konto er godkendt. Prøv "Tjek igen" senere, eller luk appen og åbn den igen.</div></div>';
  html += '<button class="btn primary" id="pendingRefreshBtn" style="margin-bottom:10px;">Tjek igen</button>';
  html += '<button class="btn ghost" id="pendingLogoutBtn">Log ud</button>';
  html += '</div>';
  main.innerHTML = html;
  document.getElementById("pendingRefreshBtn").addEventListener("click", function(){ bootAfterLogin(); });
  document.getElementById("pendingLogoutBtn").addEventListener("click", function(){
    sb.auth.signOut().catch(function(){});
    session = null; myProfile = null; memEx = []; memLogs = []; friendCache = null;
    renderLogin("in");
  });
}

/* Sikr at der findes en profil-række (brugernavn + email) for kontoen */
function ensureProfile(){
  return sb.from("profiles").select("*").eq("id", session.user.id).maybeSingle().then(function(res){
    if(res.data){
      myProfile = res.data;
      /* backfill: ældre profiler mangler email-feltet */
      if(!myProfile.email && session.user.email){
        myProfile.email = session.user.email;
        sb.from("profiles").update({ email: session.user.email }).eq("id", session.user.id).then(function(){});
      }
      return true;
    }
    var uname = (session.user.user_metadata && session.user.user_metadata.username) || "";
    return tryInsertProfile(uname);
  });
}
function tryInsertProfile(uname){
  if(!/^[a-z0-9æøå_.-]{2,20}$/.test(uname)) return promptUsername(uname);
  return sb.from("profiles").insert({ id: session.user.id, username: uname, email: session.user.email||null }).select().single().then(function(res){
    if(res.error){
      if(String(res.error.code)==="23505") return promptUsername(uname); // optaget
      showToast("Kunne ikke gemme profil: "+(res.error.message||""));
      return promptUsername(uname);
    }
    /* Vigtigt: brug den rigtige række fra databasen (inkl. "approved":false) i
       stedet for at bygge objektet selv — ellers mangler "approved"-feltet helt,
       og godkendelses-tjekket i bootAfterLogin() (myProfile.approved===false)
       fejler stille, så helt nye brugere kan snige sig forbi godkendelsesvæggen
       i det allerførste øjeblik efter de opretter kontoen. */
    myProfile = res.data;
    return true;
  });
}
function promptUsername(prev){
  return new Promise(function(resolve){
    /* Sikkerhedsnet: hvis modal'en lukkes uden at gemme, kan den åbnes igen */
    main.innerHTML = '<div class="empty-state" style="padding-top:60px;">Du mangler at vælge et brugernavn.</div>';
    var reopen = document.createElement("button");
    reopen.className = "btn primary";
    reopen.textContent = "Vælg brugernavn";
    reopen.style.marginTop = "10px";
    reopen.addEventListener("click", open);
    main.appendChild(reopen);
    function open(){
      var html = '<h3>Vælg brugernavn</h3>'+
        '<div class="muted" style="margin-bottom:12px;">'+(prev ? 'Brugernavnet "'+escapeHtml(prev)+'" er optaget eller ugyldigt — vælg et andet.' : 'Vælg det navn dine venner skal se.')+'</div>'+
        '<div class="field"><input type="text" id="unameInput" autocomplete="off" autocapitalize="off" placeholder="fx matteo"></div>'+
        '<button class="btn primary" id="unameSave">Gem</button>';
      openModal(html);
      bindTapAction(document.getElementById("unameSave"), function(){
        var u = document.getElementById("unameInput").value.trim().toLowerCase();
        if(!/^[a-z0-9æøå_.-]{2,20}$/.test(u)){ showToast("2-20 tegn, kun bogstaver/tal/._-"); return; }
        closeModal();
        tryInsertProfile(u).then(resolve);
      });
    }
    open();
  });
}

/* Hent egne øvelser + logs fra skyen */
function fetchOwnData(){
  return Promise.all([
    fetchAllRows(function(){ return sb.from("exercises").select("*").eq("user_id", session.user.id).order("id"); }),
    fetchAllRows(function(){ return sb.from("logs").select("*").eq("user_id", session.user.id).order("id"); })
  ]).then(function(results){
    memEx = results[0].map(rowToEx);
    memLogs = results[1].map(rowToLog);
  });
}

/* Engangs-flytning: Matteos gamle lokale data -> skyen (kun hans konto, kun hvis skyen er tom) */
function maybeMigrateLocalData(){
  if(!session.user.email || session.user.email.toLowerCase()!==MIGRATION_OWNER_EMAIL) return Promise.resolve();
  if(memEx.length>0 || memLogs.length>0) return Promise.resolve();
  var localEx = [], localLogs = [];
  try{ localEx = JSON.parse(localStorage.getItem(LS_EX))||[]; }catch(e){}
  try{ localLogs = JSON.parse(localStorage.getItem(LS_LOGS))||[]; }catch(e){}
  if(localEx.length===0) return Promise.resolve();
  renderLoadingScreen("Flytter dine data til skyen — vent et øjeblik…");
  memEx = localEx.map(function(e){ return {id:e.id, name:e.name, bodyweight:!!e.bodyweight, muscle:e.muscle||null}; });
  memLogs = localLogs.map(function(l){
    return {id:l.id, exerciseId:l.exerciseId, date:l.date, loggedAt:(l.loggedAt===undefined?null:l.loggedAt), setNumber:l.setNumber, weight:(l.weight===undefined?null:l.weight), reps:(l.reps===undefined?null:l.reps), repsLabel:(l.repsLabel===undefined||l.repsLabel===null?null:String(l.repsLabel)), musclePos:l.musclePos||"1-2", skipped:!!l.skipped};
  });
  return upsertChunks("exercises", memEx.map(exToRow))
    .then(function(){ return upsertChunks("logs", memLogs.map(logToRow)); })
    .then(function(){ showToast("✓ Dine gamle data er flyttet til skyen", 3000); })
    .catch(function(err){
      memEx = []; memLogs = [];
      showToast("⚠ Flytning fejlede — tjek internet og genstart appen", 4000);
    });
}

function detectColumns(){
  return sb.from("exercises").select("position").limit(1).then(function(res){
    HAS_POSITION_COL = !res.error;
  }).catch(function(){ HAS_POSITION_COL = false; });
}

function bootAfterLogin(){
  document.getElementById("menuBtn").style.display = "flex";
  document.getElementById("bottomNav").style.display = "flex";
  renderLoadingScreen("Henter dine data…");
  ensureProfile().then(function(){
    /* Nye brugere er ikke godkendt endnu (approved=false som standard) — bloker
       adgang til appen indtil MASTER MATTEO har accepteret dem manuelt. */
    if(myProfile && myProfile.approved===false && !isAdminAccount()){
      renderPendingApproval();
      return Promise.reject({__pendingApproval:true});
    }
    return detectColumns();
  }).then(function(){
    return flushPendingSnapshot();
  }).then(function(){
    return fetchOwnData();
  }).then(function(){
    return maybeMigrateLocalData();
  }).then(function(){
    return maybeSeedCatalog();
  }).then(function(){
    maybeFixEzbarStartdata();
    maybeMigrateVariants();
    updateMenuActive();
    /* Nye, netop godkendte brugere ser en kort onboarding første gang de kommer
       ind i selve appen (has_onboarded=false som standard for nye konti — se
       supabase-migration-onboarding.sql). Findes kolonnen ikke endnu (migration
       ikke kørt), er myProfile.has_onboarded "undefined", og onboarding springes
       stille over — påvirker altså ingen, før du selv har kørt migrationen. */
    if(myProfile && myProfile.has_onboarded===false){
      onbState = { step:1, friendSent:{} };
      renderOnboarding();
      return;
    }
    /* Åbn "Log øvelse" hvis der er logget et sæt inden for de sidste 30 min
       (undgår at skulle navigere derhen igen mellem sæt), ellers Feed. */
    goto(hasRecentOwnActivity() ? "log" : "feed");
  }).catch(function(err){
    if(err && err.__pendingApproval) return; /* allerede vist ventesiden, ikke en fejl */
    renderLoadingScreen("Kunne ikke hente data — tjek din internetforbindelse og prøv igen.");
    var retry = document.createElement("button");
    retry.className = "btn primary";
    retry.style.marginTop = "16px";
    retry.textContent = "Prøv igen";
    retry.addEventListener("click", bootAfterLogin);
    main.appendChild(retry);
  });
}

/* =========================================================
   ONBOARDING (kun første login efter godkendelse, se bootAfterLogin)
   ========================================================= */
var onbState = { step:1, friendSent:{} };

function onbProgressHtml(){
  var dots = "";
  for(var i=1;i<=4;i++){ dots += '<i class="'+(i<=onbState.step?"on":"")+'"></i>'; }
  return '<div class="onb-progress">'+dots+'</div>';
}

function finishOnboarding(){
  if(myProfile) myProfile.has_onboarded = true;
  sb.from("profiles").update({has_onboarded:true}).eq("id", session.user.id).then(function(){});
  document.getElementById("menuBtn").style.display = "flex";
  document.getElementById("bottomNav").style.display = "flex";
  goto(hasRecentOwnActivity() ? "log" : "feed");
}

function renderOnboarding(){
  document.getElementById("menuBtn").style.display = "none";
  document.getElementById("bottomNav").style.display = "none";
  if(onbState.step===1) renderOnboardingWelcome();
  else if(onbState.step===2) renderOnboardingProgram();
  else if(onbState.step===3) renderOnboardingFriends();
  else renderOnboardingDone();
}

function renderOnboardingWelcome(){
  var html = onbProgressHtml();
  html += '<div style="text-align:center;color:var(--yellow);margin-bottom:10px;"><svg style="width:40px;height:40px;"><use href="#ic-barbell"/></svg></div>';
  html += '<div class="onb-title">Velkommen til Jernlog!</div>';
  html += '<div class="muted onb-sub">Her er en hurtig rundtur, så du ved hvor tingene er.</div>';
  [
    ["ic-feed","Feed","Se dine venners træninger og PR'er"],
    ["ic-calendar","Kalender","Se hvilke dage du har trænet, streaks"],
    ["ic-barbell","Log øvelse","Skriv vægt og reps ned på under 10 sek."],
    ["ic-clock","Historik","Grafer og fremgang pr. øvelse"],
    ["ic-user","Dig","Dine seneste træninger og fremgang"]
  ].forEach(function(n){
    html += '<div class="onb-row"><div class="ic"><svg><use href="#'+n[0]+'"/></svg></div><div><div class="t">'+n[1]+'</div><div class="d">'+n[2]+'</div></div></div>';
  });
  html += '<button class="btn primary" id="onbNext" style="margin-top:8px;">Videre</button>';
  html += '<div class="onb-skip" id="onbSkip">Spring over</div>';
  main.innerHTML = html;
  bindTapAction(document.getElementById("onbNext"), function(){ onbState.step=2; renderOnboarding(); });
  bindTapAction(document.getElementById("onbSkip"), function(){ onbState.step=4; renderOnboarding(); });
}

function renderOnboardingProgram(){
  var html = onbProgressHtml();
  html += '<div class="onb-title">Byg dit eget program</div>';
  html += '<div class="muted onb-sub">Under "Øvelser/Mit program" i menuen sætter du dit program op — i dit eget tempo.</div>';
  [
    ["ic-plus","Tilføj øvelser","Vælg blandt dem der allerede er i appen, eller opret helt dine egne fra bunden."],
    ["ic-program","Dine programmer","Læg øvelserne i et program — fx én liste pr. træningsdag. Du kan lave lige så mange programmer du vil og give dem dit eget navn."],
    ["ic-folder","Øvrige øvelser","En tredje liste til øvelser du laver en gang imellem, men som ikke er en fast del af dit split. Nye øvelser havner automatisk her, indtil du selv sætter dem på et program."],
    ["ic-settings","Dine egne muskelgrupper","Alle træner ikke ens — du kan selv vælge hvilke muskelgrupper der hører sammen, hvis din opdeling er anderledes."]
  ].forEach(function(f){
    html += '<div class="onb-row"><div class="ic"><svg><use href="#'+f[0]+'"/></svg></div><div><div class="t">'+f[1]+'</div><div class="d">'+f[2]+'</div></div></div>';
  });
  html += '<button class="btn primary" id="onbNext" style="margin-top:8px;">Videre</button>';
  html += '<div class="onb-skip" id="onbSkip">Spring over</div>';
  main.innerHTML = html;
  bindTapAction(document.getElementById("onbNext"), function(){ onbState.step=3; renderOnboarding(); });
  bindTapAction(document.getElementById("onbSkip"), function(){ onbState.step=4; renderOnboarding(); });
}

function renderOnboardingFriends(){
  main.innerHTML = onbProgressHtml() +
    '<div class="onb-title">Tilføj dem du kender</div>' +
    '<div class="muted onb-sub">Tilføj med det samme, så din Feed ikke er tom — du kan altid tilføje flere senere under "Venner".</div>' +
    '<div id="onbFriendList" class="card" style="padding:0;"><div class="empty-state">Henter…</div></div>' +
    '<button class="btn primary" id="onbNext" style="margin-top:14px;">Videre</button>' +
    '<div class="onb-skip" id="onbSkip">Spring over</div>';
  bindTapAction(document.getElementById("onbNext"), function(){ onbState.step=4; renderOnboarding(); });
  bindTapAction(document.getElementById("onbSkip"), function(){ onbState.step=4; renderOnboarding(); });

  var me = session.user.id;
  sb.from("profiles").select("*").neq("id", me).order("username").then(function(res){
    var box = document.getElementById("onbFriendList");
    if(!box) return; /* brugeren nåede videre inden listen kom tilbage */
    if(res.error || !res.data || res.data.length===0){
      box.innerHTML = '<div class="empty-state">Ingen andre brugere endnu.</div>';
      return;
    }
    var out = "";
    res.data.forEach(function(p){
      var sent = !!onbState.friendSent[p.id];
      out += '<div class="list-row" data-uid="'+p.id+'"><div style="display:flex;align-items:center;gap:10px;"><div class="avatar" style="width:32px;height:32px;font-size:13px;flex-basis:32px;">'+escapeHtml((p.username||"?").slice(0,1).toUpperCase())+'</div><div class="name">'+escapeHtml(p.username||"ukendt")+'</div></div><button class="pill-btn'+(sent?" dim":"")+'" data-req="'+p.id+'">'+(sent?"Anmodning sendt":"Anmod")+'</button></div>';
    });
    box.innerHTML = out;
    box.querySelectorAll("[data-req]").forEach(function(btn){
      btn.addEventListener("click", function(){
        var id = btn.getAttribute("data-req");
        if(onbState.friendSent[id]) return;
        onbState.friendSent[id] = true;
        btn.textContent = "Anmodning sendt";
        btn.classList.add("dim");
        sb.from("friendships").insert({ requester: me, addressee: id, status:"pending" }).then(function(r){
          if(r.error){
            onbState.friendSent[id] = false;
            btn.textContent = "Anmod";
            btn.classList.remove("dim");
            showToast("Kunne ikke sende anmodning");
          }
        });
      });
    });
  });
}

function renderOnboardingDone(){
  var html = '<div class="onb-done">';
  html += '<div style="font-size:52px;margin-bottom:14px;">🎉</div>';
  html += '<div class="onb-title">Du er klar!</div>';
  html += '<div class="muted" style="margin-bottom:26px;">Log dit første sæt, når du er klar til det.</div>';
  html += '<button class="btn primary" id="onbFinish" style="max-width:260px;">Kom i gang →</button>';
  html += '</div>';
  main.innerHTML = html;
  bindTapAction(document.getElementById("onbFinish"), finishOnboarding);
}

