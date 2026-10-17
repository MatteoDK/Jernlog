"use strict";
/* =========================================================
   VIEW: ØVELSER (én fane pr. program + Øvrige)
   ========================================================= */
function variantHas(e, letter){
  return String(e.variant||"").indexOf(letter)!==-1;
}

/* Øvelser/Mit program: øverst vælger man program (dine egne navne) eller Øvrige; derunder en fane pr.
   træning i det program. Hver træning viser sine øvelser i én liste på tværs af muskelgrupper. */
function sortExercises(arr){
  return arr.slice().sort(function(a,b){
    var pa = (a.position===null||a.position===undefined) ? Infinity : a.position;
    var pb = (b.position===null||b.position===undefined) ? Infinity : b.position;
    if(pa!==pb) return pa-pb;
    var ma = MUSCLE_ORDER.indexOf(a.muscle), mb = MUSCLE_ORDER.indexOf(b.muscle);
    if(ma!==mb) return ma-mb;
    return a.name.localeCompare(b.name);
  });
}

function renderExercisesPage(){
  state.viewUser = null;
  var programs = getPrograms();
  var allWorkoutIds = getWorkouts().map(function(w){ return w.id; });
  if(state.exercisesProgram!=="other" && !programs.some(function(p){ return p.id===state.exercisesProgram; })){
    state.exercisesProgram = programs[0].id;
  }
  var curProgram = programs.find(function(p){ return p.id===state.exercisesProgram; }) || null;
  if(curProgram && !curProgram.workouts.some(function(w){ return w.id===state.exercisesTab; })){
    state.exercisesTab = curProgram.workouts[0].id;
  }
  var ex = loadEx();
  var html = '<h2 class="section">Øvelser/Mit program</h2>';
  html += '<button class="btn" id="addExBtn" style="margin-bottom:6px;">＋ Tilføj ny øvelse</button>';
  html += '<div class="muted" style="margin-bottom:10px;text-align:center;">Hold en øvelse inde og træk den op/ned for at ændre rækkefølgen. Swipe til venstre i en træning for at fjerne en øvelse.</div>';

  function listHtml(arr, letter, emptyText){
    if(arr.length===0) return '<div class="card" style="margin-top:0;margin-bottom:16px;"><div class="muted" style="text-align:center;">'+emptyText+'</div></div>';
    var out = '<div class="card reorder-list" data-listletter="'+(letter||"")+'" style="padding:0;margin-top:0;margin-bottom:16px;">';
    sortExercises(arr).forEach(function(e){
      var row = '<div class="list-row" data-exid="'+e.id+'"><div><div class="name">'+escapeHtml(e.name)+'</div><div class="muted">'+(MUSCLE_LABELS[e.muscle]||"")+(e.bodyweight?' · Kropsvægt':'')+'</div></div><div class="chev">≡&nbsp;&nbsp;›</div></div>';
      if(letter){
        out += '<div class="swipe-wrap"><div class="swipe-bg">Fjern</div>'+row+'</div>';
      } else {
        out += row;
      }
    });
    out += '</div>';
    return out;
  }

  /* Nye/ukategoriserede øvelser øverst — vises altid, uanset hvilken fane der er valgt */
  var uncategorized = ex.filter(function(e){ return !e.muscle; }).sort(function(a,b){ return a.name.localeCompare(b.name); });
  if(uncategorized.length){
    html += '<div class="train-tag" style="background:var(--red);color:#fff;">Ikke kategoriseret</div>';
    html += '<div class="muted" style="margin-bottom:8px;">Tryk på en øvelse for at vælge muskelgruppe og træning.</div>';
    html += '<div class="card" style="padding:0;margin-top:0;margin-bottom:16px;">';
    uncategorized.forEach(function(e){
      html += '<div class="list-row" data-catid="'+e.id+'"><div><div class="name">'+escapeHtml(e.name)+'</div><div class="muted">'+(e.bodyweight?'Kropsvægt · ':'')+'Mangler kategori</div></div><div class="pill-btn" style="pointer-events:none;">Kategorisér</div></div>';
    });
    html += '</div>';
  }

  html += '<div style="display:flex;justify-content:flex-end;margin-bottom:6px;">';
  html += '<button class="pill-btn dim" id="editProgramsBtn">Administrer programmer</button>';
  html += '</div>';
  html += '<div class="ex-tabs">';
  programs.forEach(function(p){
    html += '<button class="ex-tab'+(p.id===state.exercisesProgram?' active':'')+'" data-prog="'+escapeHtml(p.id)+'">'+escapeHtml(p.name)+'</button>';
  });
  html += '<button class="ex-tab'+(state.exercisesProgram==="other"?' active':'')+'" data-prog="other">Øvrige</button>';
  html += '</div>';

  if(!curProgram){
    var others = ex.filter(function(e){ return e.muscle && !allWorkoutIds.some(function(l){ return variantHas(e, l); }); });
    html += '<div class="train-tag" style="background:var(--bg-elevated);color:var(--text-dim);">Øvrige øvelser</div>';
    html += listHtml(others, null, "(ingen — alle dine øvelser ligger i en træning)");
  } else {
    var tab = state.exercisesTab;
    html += '<div class="ex-tabs ex-subtabs">';
    curProgram.workouts.forEach(function(w){
      html += '<button class="ex-tab sub'+(w.id===tab?' active':'')+'" data-tab="'+w.id+'">'+escapeHtml(w.name)+'</button>';
    });
    html += '</div>';
    var inWorkout = ex.filter(function(e){ return e.muscle && variantHas(e, tab); });
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><div class="train-tag" style="margin-bottom:0;">'+escapeHtml(workoutName(tab))+'</div><button class="pill-btn dim" data-editlist="'+tab+'">Rediger</button></div>';
    html += listHtml(inWorkout, tab, "(tom — tryk Rediger for at tilføje øvelser)");
  }

  if(ex.length===0){
    html += '<div class="card"><div class="empty-state">Ingen øvelser endnu — tilføj din første! 💪</div></div>';
  }

  main.innerHTML = html;
  document.getElementById("addExBtn").addEventListener("click", function(){ openAddExerciseModal(""); });
  document.getElementById("editProgramsBtn").addEventListener("click", function(){ openProgramsModal(); });
  main.querySelectorAll("[data-prog]").forEach(function(btn){
    bindTapAction(btn, function(){
      state.exercisesProgram = btn.getAttribute("data-prog");
      state.exercisesTab = null; /* vælger programmets første træning */
      renderExercisesPage();
    });
  });
  main.querySelectorAll("[data-tab]").forEach(function(btn){
    bindTapAction(btn, function(){
      state.exercisesTab = btn.getAttribute("data-tab");
      renderExercisesPage();
    });
  });
  main.querySelectorAll("[data-exid]").forEach(function(row){
    row.addEventListener("click", function(){
      if(Date.now() - lastReorderEnd < 500) return; /* var et træk, ikke et tryk */
      goto("exerciseHistory", {selectedExerciseId: row.getAttribute("data-exid"), viewUser:null, histBack:"exercises"});
    });
  });
  main.querySelectorAll(".reorder-list").forEach(function(cont){ attachListReorder(cont, cont.getAttribute("data-listletter")||null); });
  main.querySelectorAll("[data-catid]").forEach(function(row){
    row.addEventListener("click", function(){
      openEditExerciseModal(row.getAttribute("data-catid"), function(){ renderExercisesPage(); });
    });
  });
  main.querySelectorAll("[data-editlist]").forEach(function(btn){
    btn.addEventListener("click", function(){ openEditListModal(btn.getAttribute("data-editlist")); });
  });
}

/* ---------- Træk-og-slip rækkefølge i en liste ---------- */
var lastReorderEnd = 0;

function persistListOrder(orderedIds){
  var posById = {};
  orderedIds.forEach(function(id, i){ posById[id] = i+1; });
  var changed = false;
  var list = loadEx().map(function(e){
    if(posById[e.id]!==undefined && e.position!==posById[e.id]){
      changed = true;
      return Object.assign({}, e, {position: posById[e.id]});
    }
    return e;
  });
  if(changed){
    saveEx(list);
    showToast("Rækkefølge gemt ✓");
  }
}

/* letter: træning-tegn hvis denne liste er en træning (så swipe-til-venstre er aktiv),
   null/undefined for Øvrige øvelser (kun træk-og-slip, ingen swipe). */
function attachListReorder(container, letter){
  var pressTimer = null;
  var dragging = null;    /* container-børn (row eller swipe-wrap) der trækkes lodret */
  var swipingRow = null;  /* .list-row der swipes vandret */
  var startX = 0, startY = 0;
  var SWIPE_REMOVE_PX = 90;

  function unitsOf(){ return Array.prototype.slice.call(container.children); }
  function pointY(e){ return (e.touches && e.touches.length) ? e.touches[0].clientY : e.clientY; }
  function pointX(e){ return (e.touches && e.touches.length) ? e.touches[0].clientX : e.clientX; }
  function innerRowOf(unit){ return unit.classList.contains("list-row") ? unit : unit.querySelector(".list-row"); }
  function exIdOf(unit){ var r = innerRowOf(unit); return r ? r.getAttribute("data-exid") : null; }

  /* ---- lodret træk-og-slip (rækkefølge) ---- */
  function startVertDrag(unit){
    dragging = unit;
    innerRowOf(unit).classList.add("dragging");
    document.addEventListener("mousemove", onMoveVert);
    document.addEventListener("mouseup", onUpVert);
    document.addEventListener("touchmove", onMoveVert, {passive:false});
    document.addEventListener("touchend", onUpVert);
  }
  function stopVertListeners(){
    document.removeEventListener("mousemove", onMoveVert);
    document.removeEventListener("mouseup", onUpVert);
    document.removeEventListener("touchmove", onMoveVert, {passive:false});
    document.removeEventListener("touchend", onUpVert);
  }
  function onMoveVert(e){
    if(!dragging) return;
    if(e.cancelable) e.preventDefault(); /* stop siden i at scrolle imens */
    var y = pointY(e);
    unitsOf().forEach(function(other){
      if(other===dragging) return;
      var r = other.getBoundingClientRect();
      var mid = r.top + r.height/2;
      var dRect = dragging.getBoundingClientRect();
      if(y < mid && dRect.top > r.top){
        container.insertBefore(dragging, other);
      } else if(y > mid && dRect.top < r.top){
        container.insertBefore(dragging, other.nextSibling);
      }
    });
  }
  function onUpVert(){
    if(pressTimer){ clearTimeout(pressTimer); pressTimer = null; }
    if(!dragging) return;
    innerRowOf(dragging).classList.remove("dragging");
    dragging = null;
    stopVertListeners();
    lastReorderEnd = Date.now();
    persistListOrder(unitsOf().map(exIdOf));
  }

  /* ---- vandret swipe-til-venstre (fjern fra Program 1/2) ---- */
  function startHorizSwipe(row){
    swipingRow = row;
    row.style.transition = "none";
    document.addEventListener("mousemove", onMoveHoriz);
    document.addEventListener("mouseup", onUpHoriz);
    document.addEventListener("touchmove", onMoveHoriz, {passive:false});
    document.addEventListener("touchend", onUpHoriz);
  }
  function stopHorizListeners(){
    document.removeEventListener("mousemove", onMoveHoriz);
    document.removeEventListener("mouseup", onUpHoriz);
    document.removeEventListener("touchmove", onMoveHoriz, {passive:false});
    document.removeEventListener("touchend", onUpHoriz);
  }
  function onMoveHoriz(e){
    if(!swipingRow) return;
    if(e.cancelable) e.preventDefault();
    var dx = Math.min(0, pointX(e) - startX);
    swipingRow.style.transform = "translateX("+dx+"px)";
  }
  function onUpHoriz(){
    if(!swipingRow) return;
    var row = swipingRow;
    var m = /translateX\((-?\d+(?:\.\d+)?)px\)/.exec(row.style.transform);
    var dx = m ? parseFloat(m[1]) : 0;
    swipingRow = null;
    stopHorizListeners();
    lastReorderEnd = Date.now();
    row.style.transition = "transform 0.18s";
    if(Math.abs(dx) >= SWIPE_REMOVE_PX){
      row.style.transform = "translateX(-100%)";
      var exId = row.getAttribute("data-exid");
      setTimeout(function(){ removeFromList(exId); }, 160);
    } else {
      row.style.transform = "";
    }
  }
  function removeFromList(exId){
    var list = loadEx().map(function(e){
      if(e.id!==exId) return e;
      return Object.assign({}, e, {variant: normalizeVariant(String(e.variant||"").replace(letter, ""))});
    });
    saveEx(list);
    showToast("Flyttet til Øvrige øvelser ✓");
    renderExercisesPage();
  }

  /* ---- fælles tryk-håndtering: afgør om det bliver et lodret træk, et vandret swipe, eller bare et tryk ---- */
  function onDown(e){
    var row = e.target && e.target.closest ? e.target.closest(".list-row[data-exid]") : null;
    if(!row) return;
    var unit = row.closest(".swipe-wrap") || row;
    if(unit.parentNode!==container) return;
    startY = pointY(e);
    startX = pointX(e);
    var decided = null;

    function cleanup(){
      document.removeEventListener("mousemove", moveCheck);
      document.removeEventListener("touchmove", moveCheck);
      document.removeEventListener("mouseup", upCheck);
      document.removeEventListener("touchend", upCheck);
    }
    var moveCheck = function(ev){
      if(decided) return;
      var dx = pointX(ev) - startX, dy = pointY(ev) - startY;
      if(letter && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)){
        decided = "horiz";
        clearTimeout(pressTimer); pressTimer = null;
        cleanup();
        startHorizSwipe(row);
        onMoveHoriz(ev);
      } else if(Math.abs(dy) > 12){
        clearTimeout(pressTimer); pressTimer = null;
        cleanup();
      }
    };
    var upCheck = function(){
      clearTimeout(pressTimer); pressTimer = null;
      cleanup();
    };
    clearTimeout(pressTimer);
    pressTimer = setTimeout(function(){
      if(decided) return;
      decided = "vert";
      cleanup();
      startVertDrag(unit);
    }, 350);
    document.addEventListener("mousemove", moveCheck);
    document.addEventListener("touchmove", moveCheck);
    document.addEventListener("mouseup", upCheck);
    document.addEventListener("touchend", upCheck);
  }
  container.addEventListener("mousedown", onDown);
  container.addEventListener("touchstart", onDown, {passive:true});
}

/* Redigér hvilke øvelser der er med i en træning (alle muskelgrupper samlet i én liste) */
function openEditListModal(letter){
  var all = loadEx().filter(function(e){ return e.muscle; })
    .sort(function(a,b){
      var ma = MUSCLE_ORDER.indexOf(a.muscle), mb = MUSCLE_ORDER.indexOf(b.muscle);
      if(ma!==mb) return ma-mb;
      return a.name.localeCompare(b.name);
    });
  var checked = {};
  all.forEach(function(e){ checked[e.id] = variantHas(e, letter); });

  var programLabel = workoutName(letter);
  var html = '<h3>'+escapeHtml(programLabel)+'</h3>';
  html += '<div class="muted" style="margin-bottom:12px;">Vælg hvilke øvelser der skal være med. Øvelser der ikke er med i nogen træning ligger i Øvrige.</div>';
  html += '<div class="search-results" style="margin-bottom:14px;">';
  all.forEach(function(e){
    html += '<div class="search-result-item" data-chk="'+e.id+'"><span>'+escapeHtml(e.name)+' <span class="muted">('+(MUSCLE_LABELS[e.muscle]||"")+')</span></span><span style="font-size:18px;font-weight:800;color:var(--yellow);" id="chk_'+e.id+'">'+(checked[e.id]?"☑":"☐")+'</span></div>';
  });
  html += '</div>';
  html += '<button class="btn primary" id="saveListBtn">Gem træning</button>';
  openModal(html);

  modalSheet.querySelectorAll("[data-chk]").forEach(function(row){
    row.addEventListener("click", function(){
      var id = row.getAttribute("data-chk");
      checked[id] = !checked[id];
      document.getElementById("chk_"+id).textContent = checked[id] ? "☑" : "☐";
    });
  });
  document.getElementById("saveListBtn").addEventListener("click", function(){
    var list = loadEx().map(function(e){
      if(checked[e.id]===undefined) return e;
      var letters = String(e.variant||"").replace(letter, "");
      if(checked[e.id]) letters += letter;
      var newVariant = normalizeVariant(letters);
      if(newVariant===(e.variant||null)) return e;
      return Object.assign({}, e, {variant: newVariant});
    });
    saveEx(list);
    closeModal();
    showToast(programLabel+" opdateret ✓");
    renderExercisesPage();
  });
}

/* Administrér programmer og træninger: tilføj, omdøb eller slet. Intet ændres før man trykker Gem.
   Sletter man en træning (eller et helt program), flyttes dens øvelser til Øvrige øvelser (eller
   bliver i de andre træninger de også er med i). Gemmes kun på egen konto (profiles.programs). */
function openProgramsModal(){
  var rows = getPrograms().map(function(p){
    return {id:p.id, name:p.name, removed:false, workouts:p.workouts.map(function(w){ return {id:w.id, name:w.name, removed:false}; })};
  });
  function alive(arr){ return arr.filter(function(x){ return !x.removed; }); }
  function usedChars(){
    var u = [];
    rows.forEach(function(p){ p.workouts.forEach(function(w){ u.push(w.id); }); });
    return u;
  }

  function draw(){
    var html = '<h3>Administrer programmer</h3>';
    html += '<div class="muted" style="margin-bottom:12px;">Et program (fx "Push Pull Legs") indeholder dine forskellige træninger (fx Push, Pull, Ben). Slettes en træning, flyttes dens øvelser til Øvrige øvelser.</div>';
    rows.forEach(function(p, pi){
      if(p.removed) return;
      html += '<div class="card" style="margin-top:0;margin-bottom:12px;">';
      html += '<div class="field" style="display:flex;gap:8px;align-items:center;"><input type="text" maxlength="30" data-progname="'+pi+'" value="'+escapeHtml(p.name)+'" style="flex:1;font-weight:700;"><button class="pill-btn ghost" data-progdel="'+pi+'">Slet program</button></div>';
      p.workouts.forEach(function(w, wi){
        if(w.removed) return;
        html += '<div class="field" style="display:flex;gap:8px;align-items:center;margin-left:14px;"><input type="text" maxlength="30" data-wname="'+pi+'-'+wi+'" value="'+escapeHtml(w.name)+'" style="flex:1;"><button class="pill-btn ghost" data-wdel="'+pi+'-'+wi+'">Slet</button></div>';
      });
      html += '<button class="pill-btn dim" data-wadd="'+pi+'" style="margin-left:14px;">＋ Ny træning</button>';
      html += '</div>';
    });
    html += '<button class="btn" id="addProgBtn" style="margin-bottom:8px;">＋ Nyt program</button>';
    html += '<button class="btn primary" id="saveProgsBtn">Gem</button>';
    openModal(html);

    modalSheet.querySelectorAll("[data-progname]").forEach(function(inp){
      inp.addEventListener("input", function(){ rows[parseInt(inp.getAttribute("data-progname"),10)].name = inp.value; });
    });
    modalSheet.querySelectorAll("[data-wname]").forEach(function(inp){
      inp.addEventListener("input", function(){
        var ix = inp.getAttribute("data-wname").split("-");
        rows[parseInt(ix[0],10)].workouts[parseInt(ix[1],10)].name = inp.value;
      });
    });
    modalSheet.querySelectorAll("[data-progdel]").forEach(function(btn){
      btn.addEventListener("click", function(){
        if(alive(rows).length<=1){ showToast("Du skal have mindst ét program"); return; }
        var p = rows[parseInt(btn.getAttribute("data-progdel"),10)];
        p.removed = true;
        p.workouts.forEach(function(w){ w.removed = true; });
        draw();
      });
    });
    modalSheet.querySelectorAll("[data-wdel]").forEach(function(btn){
      btn.addEventListener("click", function(){
        var ix = btn.getAttribute("data-wdel").split("-");
        var p = rows[parseInt(ix[0],10)];
        if(alive(p.workouts).length<=1){ showToast("Et program skal have mindst én træning"); return; }
        p.workouts[parseInt(ix[1],10)].removed = true;
        draw();
      });
    });
    modalSheet.querySelectorAll("[data-wadd]").forEach(function(btn){
      btn.addEventListener("click", function(){
        var p = rows[parseInt(btn.getAttribute("data-wadd"),10)];
        var ch = newChar();
        if(!ch){ showToast("Du har nået det maksimale antal træninger"); return; }
        p.workouts.push({id:ch, name:"Træning "+(alive(p.workouts).length+1), removed:false});
        draw();
      });
    });
    document.getElementById("addProgBtn").addEventListener("click", function(){
      var ch = newChar();
      if(!ch){ showToast("Du har nået det maksimale antal træninger"); return; }
      var n = 1, ids = rows.map(function(r){ return r.id; });
      while(ids.indexOf("p"+n)!==-1) n++;
      rows.push({id:"p"+n, name:"Program "+(alive(rows).length+1), removed:false, workouts:[{id:ch, name:"Træning 1", removed:false}]});
      draw();
    });
    document.getElementById("saveProgsBtn").addEventListener("click", saveProgs);
  }
  function newChar(){
    var u = usedChars();
    return WORKOUT_CHARS.split("").find(function(c){ return u.indexOf(c)===-1; }) || null;
  }

  function saveProgs(){
    var keptP = alive(rows);
    var bad = keptP.some(function(p){ return p.name.trim()===""; }) || keptP.some(function(p){ return alive(p.workouts).some(function(w){ return w.name.trim()===""; }); });
    if(bad){ showToast("Alle programmer og træninger skal have et navn"); return; }
    var programs = keptP.map(function(p){
      return {id:p.id, name:p.name.trim(), workouts:alive(p.workouts).map(function(w){ return {id:w.id, name:w.name.trim()}; })};
    });
    sb.from("profiles").update({ programs: programs }).eq("id", session.user.id).then(function(res){
      if(res.error){ showToast("Kunne ikke gemme programmerne"); return; }
      myProfile.programs = programs;
      var removedChars = [];
      rows.forEach(function(p){ p.workouts.forEach(function(w){ if(w.removed) removedChars.push(w.id); }); });
      if(removedChars.length){
        var list = loadEx().map(function(e){
          var v = String(e.variant||"");
          var stripped = v;
          removedChars.forEach(function(c){ stripped = stripped.split(c).join(""); });
          return stripped===v ? e : Object.assign({}, e, {variant: normalizeVariant(stripped)});
        });
        saveEx(list);
      }
      closeModal();
      showToast("Programmer gemt ✓");
      renderExercisesPage();
    });
  }
  draw();
}

/* Start-katalog: nye konti får hele øvelseslisten (med muskelgruppe og Liste A/B),
   men selvfølgelig INGEN loggede sæt — de starter som om de aldrig har trænet. */
/* Alle nye brugere starter med hele Matteos øvelseskatalog i Liste C (variant:null),
   så de selv kan sammensætte deres egne Liste A/B ud fra den fulde liste. */
var STARTER_CATALOG = [
  {id:"pec-deck-rear-delt", name:"Pec deck rear delt", bodyweight:false, muscle:"bagskulder", variant:null},
  {id:"suppinated-single-arm-lat-stretch", name:"Suppinated single-arm lat stretch", bodyweight:false, muscle:"bagskulder", variant:null},
  {id:"up-row-rotater-cuff-shoulder-press", name:"Up-row Rotater-cuff shoulder press", bodyweight:false, muscle:"bagskulder", variant:null},
  {id:"czech-press", name:"Czech press", bodyweight:false, muscle:"bagskulder", variant:null},
  {id:"y-raises", name:"Y-raises", bodyweight:false, muscle:"bagskulder", variant:null},
  {id:"rear-delt-flyes-single", name:"Rear delt flyes (single arm)", bodyweight:false, muscle:"bagskulder", variant:null},
  {id:"rear-delt-flyes-cable", name:"Rear delt flyes (cable)", bodyweight:false, muscle:"bagskulder", variant:null},
  {id:"seated-hamstring-curl", name:"Seated hamstring curl", bodyweight:false, muscle:"ben", variant:null},
  {id:"squat", name:"Squat", bodyweight:false, muscle:"ben", variant:null},
  {id:"calf-raise", name:"Calf raise", bodyweight:false, muscle:"ben", variant:null},
  {id:"leg-extension", name:"Leg extension", bodyweight:false, muscle:"ben", variant:null},
  {id:"barbell-rdl", name:"Barbell RDL", bodyweight:false, muscle:"ben", variant:null},
  {id:"hip-abduction-adduction", name:"Hip abduction", bodyweight:false, muscle:"ben", variant:null},
  {id:"hip-adduction", name:"Hip adduction", bodyweight:false, muscle:"ben", variant:null},
  {id:"bulgarian-split-squat", name:"Bulgarian split squat", bodyweight:false, muscle:"ben", variant:null},
  {id:"pendulum-squat", name:"Pendulum squat", bodyweight:false, muscle:"ben", variant:null},
  {id:"hamstring-curl", name:"Laying hamstring curl", bodyweight:false, muscle:"ben", variant:null},
  {id:"calf-raise-seated", name:"Calf raise (seated)", bodyweight:false, muscle:"ben", variant:null},
  {id:"incline-dumbbell-curl", name:"Incline dumbbell curl", bodyweight:false, muscle:"biceps", variant:null},
  {id:"ez-bar-preacher-curl", name:"EZ-bar preacher curl", bodyweight:false, muscle:"biceps", variant:null},
  {id:"ez-bar-curl", name:"EZ-bar curl (overhand)", bodyweight:false, muscle:"biceps", variant:null},
  {id:"dead-hang-sek", name:"Dead hang (Sek)", bodyweight:false, muscle:"biceps", variant:null},
  {id:"bayesian-cable-curl", name:"Bayesian cable curl", bodyweight:false, muscle:"biceps", variant:null},
  {id:"ez-bar-curls", name:"EZ-bar curls", bodyweight:false, muscle:"biceps", variant:null},
  {id:"hammer-curl-preacher", name:"Hammer curl (Isolation)", bodyweight:false, muscle:"biceps", variant:null},
  {id:"dumbell-preacher-curl", name:"Dumbell preacher curl", bodyweight:false, muscle:"biceps", variant:null},
  {id:"dumbbell-preacher-machine", name:"Preacher curl (machine)", bodyweight:false, muscle:"biceps", variant:null},
  {id:"bench-press", name:"Bench press", bodyweight:false, muscle:"bryst", variant:null},
  {id:"incline-smith-press", name:"Incline smith machine press", bodyweight:false, muscle:"bryst", variant:null},
  {id:"pec-deck", name:"Pec deck", bodyweight:false, muscle:"bryst", variant:null},
  {id:"incline-dumbbell-press", name:"Incline dumbbell press", bodyweight:false, muscle:"bryst", variant:null},
  {id:"dips", name:"Dips", bodyweight:true, muscle:"bryst", variant:null},
  {id:"incline-bench-press", name:"Incline bench press", bodyweight:false, muscle:"bryst", variant:null},
  {id:"cable-fly-mid", name:"Cable fly (mid)", bodyweight:false, muscle:"bryst", variant:null},
  {id:"cable-fly-upper", name:"Cable fly (upper)", bodyweight:false, muscle:"bryst", variant:null},
  {id:"incline-machine-press", name:"Incline machine press", bodyweight:false, muscle:"bryst", variant:null},
  {id:"military-press-dumbbell", name:"Military press (dumbbell)", bodyweight:false, muscle:"forskulder", variant:null},
  {id:"shoulder-press-barbell", name:"Db Shoulder press", bodyweight:false, muscle:"forskulder", variant:null},
  {id:"cable-crunches", name:"Cable crunches", bodyweight:false, muscle:"mave", variant:null},
  {id:"leg-raises", name:"Leg raises", bodyweight:true, muscle:"mave", variant:null},
  {id:"machine-crunches", name:"Machine crunches", bodyweight:false, muscle:"mave", variant:null},
  {id:"weighted-pull-ups", name:"Weighted pull-ups", bodyweight:true, muscle:"ryg", variant:null},
  {id:"chest-supported-db-row", name:"Chest-supported Db row", bodyweight:false, muscle:"ryg", variant:null},
  {id:"seated-chest-supported-wide-row", name:"Seated chest-supported wide row", bodyweight:false, muscle:"ryg", variant:null},
  {id:"chin-ups", name:"Weighted Chin-ups", bodyweight:true, muscle:"ryg", variant:null},
  {id:"bent-over-rows", name:"Bent-over rows", bodyweight:false, muscle:"ryg", variant:null},
  {id:"close-grip-lat-pulldown", name:"Close-grip lat pulldown", bodyweight:false, muscle:"ryg", variant:null},
  {id:"wide-grip-lat-pulldown", name:"Wide-grip lat pulldown", bodyweight:false, muscle:"ryg", variant:null},
  {id:"chest-supported-row-neutral", name:"Chest-supported row (neutral grip)", bodyweight:false, muscle:"ryg", variant:null},
  {id:"chest-supported-row-wide", name:"Chest-supported row (wide grip)", bodyweight:false, muscle:"ryg", variant:null},
  {id:"lateral-raise-cable-single", name:"Lateral raise (cable, single arm)", bodyweight:false, muscle:"sideskulder", variant:null},
  {id:"lateral-raise-lying", name:"Lateral raise (lying)", bodyweight:false, muscle:"sideskulder", variant:null},
  {id:"dumbell-lateral-raise", name:"Dumbell lateral raise", bodyweight:false, muscle:"sideskulder", variant:null},
  {id:"dumbbell-skullcrushers", name:"Dumbbell skullcrushers", bodyweight:false, muscle:"tricep", variant:null},
  {id:"one-arm-cable-pushdown", name:"One-arm cable pushdown", bodyweight:false, muscle:"tricep", variant:null},
  {id:"rope-pushdown-cable", name:"Rope pushdown (cable)", bodyweight:false, muscle:"tricep", variant:null},
  {id:"single-arm-tricep-pushdown", name:"Single-arm tricep pushdown", bodyweight:false, muscle:"tricep", variant:null},
  {id:"barbell-skullcrushers", name:"Barbell skullcrushers", bodyweight:false, muscle:"tricep", variant:null},
  {id:"db-overhead-tricep-extension", name:"Db overhead tricep extension", bodyweight:false, muscle:"tricep", variant:null},
  {id:"straight-bar-pushdown", name:"Straight bar pushdown", bodyweight:false, muscle:"tricep", variant:null}
];
function maybeSeedCatalog(){
  if(memEx.length>0) return Promise.resolve();
  var catalog = STARTER_CATALOG.map(function(e){ return Object.assign({}, e); });
  return upsertChunks("exercises", catalog.map(function(e){ return exToRow(e); })).then(function(){
    memEx = catalog;
  }).catch(function(){ /* net-fejl: brugeren kan stadig tilføje øvelser manuelt */ });
}

/* Engangs-oprydning: EZ-bar sæt samles i startdataen 15/6 (kun Matteos konto).
   20/6-sættene (normale EZ-bar curls, 30 kg) flyttes til 15/6, og 18/6-sættene
   (overhand 30 kg) fjernes som dublet. Kører kun hvis de gamle datoer findes. */
function maybeFixEzbarStartdata(){
  if(!session.user.email || session.user.email.toLowerCase()!==MIGRATION_OWNER_EMAIL) return;
  var needsFix = memLogs.some(function(l){
    return (l.exerciseId==="ez-bar-curls" && l.date==="2026-06-20") || (l.exerciseId==="ez-bar-curl" && l.date==="2026-06-18");
  });
  if(!needsFix) return;
  var list = [];
  memLogs.forEach(function(l){
    if(l.exerciseId==="ez-bar-curl" && l.date==="2026-06-18") return; /* dublet — fjernes */
    if(l.exerciseId==="ez-bar-curls" && l.date==="2026-06-20"){
      list.push(Object.assign({}, l, { date:"2026-06-15", loggedAt:null }));
    } else {
      list.push(l);
    }
  });
  saveLogs(list);
}

/* Engangs-fordeling af Liste A/B ud fra det gamle Programmer-data (kun på telefoner der har det) */
function maybeMigrateVariants(){
  try{
    if(localStorage.getItem("jernlog_migration_variant_v1")) return;
    var programs = loadPrograms();
    if(programs && memEx.length>0){
      var vmap = {};
      ["day1","day2","day3"].forEach(function(k){
        var p = programs[k]; if(!p) return;
        (p.a||[]).forEach(function(id){ vmap[id] = (vmap[id]==="b"||vmap[id]==="ab") ? "ab" : "a"; });
        (p.b||[]).forEach(function(id){ vmap[id] = (vmap[id]==="a"||vmap[id]==="ab") ? "ab" : "b"; });
      });
      var changed = false;
      var list = memEx.map(function(e){
        if(!e.variant && vmap[e.id]){ changed = true; return Object.assign({}, e, {variant: vmap[e.id]}); }
        return e;
      });
      if(changed) saveEx(list);
    }
    localStorage.setItem("jernlog_migration_variant_v1", "1");
  }catch(e){}
}

