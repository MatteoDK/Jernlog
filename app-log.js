"use strict";
/* =========================================================
   VIEW: LOG
   ========================================================= */
var logDraft = { exerciseId:null, musclePos:"1-2", repsMode:"wheel", wheelValue:8, textValue:"" };

function renderLog(){
  var ex = loadEx();
  var html = "";
  html += '<h2 class="section">Log øvelse</h2>';
  html += '<div class="card">';
  html += '<div class="search-wrap">';
  html += '<input type="text" id="exSearch" placeholder="Søg på øvelse eller muskelgruppe..." autocomplete="off">';
  html += '<div id="searchResults"></div>';
  html += '</div>';
  html += '</div>';

  if(logDraft.exerciseId){
    var exObj = getExerciseById(logDraft.exerciseId);
    if(exObj){
      html += renderLogForm(exObj);
    }
  } else {
    var suggested = getSuggestedExercises();
    if(suggested.length){
      html += '<h2 class="section">Foreslået i dag</h2>';
      html += '<div class="card" style="padding:0;" id="suggestedList">';
      suggested.forEach(function(e){
        html += '<div class="list-row" data-id="'+e.id+'"><div class="name">'+escapeHtml(e.name)+'</div><div class="chev">Log ›</div></div>';
      });
      html += '</div>';
    }
  }

  main.innerHTML = html;

  var suggestedListBox = document.getElementById("suggestedList");
  if(suggestedListBox){
    suggestedListBox.querySelectorAll(".list-row").forEach(function(row){
      row.addEventListener("click", function(){
        logDraft.exerciseId = row.getAttribute("data-id");
        logDraft.musclePos = "1-2";
        logDraft.repsMode = "wheel";
        logDraft.wheelValue = 8;
        logDraft.textValue = "";
        renderLog();
      });
    });
  }

  var searchInput = document.getElementById("exSearch");
  var resultsBox = document.getElementById("searchResults");

  function doSearch(){
    var q = searchInput.value.trim().toLowerCase();
    var list = loadEx();
    /* Hvis søgeteksten matcher starten af en muskelgruppes danske navn (fx
       "ryg", "bryst", "ben"), vis ALLE øvelser for den muskelgruppe i stedet
       for at søge i øvelsesnavne — så man hurtigt kan se hele listen for en
       muskelgruppe uden at kende navnet på en bestemt øvelse. */
    var matchedMuscle = null;
    if(q){
      Object.keys(MUSCLE_LABELS).some(function(mk){
        if(MUSCLE_LABELS[mk].toLowerCase().indexOf(q)===0){ matchedMuscle = mk; return true; }
        return false;
      });
    }
    var filtered;
    if(matchedMuscle){
      filtered = list.filter(function(e){ return e.muscle === matchedMuscle; });
    } else {
      filtered = q ? list.filter(function(e){return e.name.toLowerCase().indexOf(q)!==-1;}) : [];
    }
    var out = "";
    if(q.length>0){
      out += '<div class="search-results">';
      var showLimit = matchedMuscle ? filtered.length : 8;
      filtered.slice(0,showLimit).forEach(function(e){
        out += '<div class="search-result-item" data-id="'+e.id+'"><span>'+escapeHtml(e.name)+'</span>'+(e.bodyweight?'<span class="bw-tag">Kropsvægt</span>':'')+'</div>';
      });
      out += '<div class="add-new-row" id="addNewExRow">＋ Tilføj "'+escapeHtml(searchInput.value.trim())+'" som ny øvelse</div>';
      out += '</div>';
    }
    resultsBox.innerHTML = out;
    var items = resultsBox.querySelectorAll(".search-result-item");
    items.forEach(function(it){
      it.addEventListener("click", function(){
        logDraft.exerciseId = it.getAttribute("data-id");
        logDraft.musclePos = "1-2";
        logDraft.repsMode = "wheel";
        logDraft.wheelValue = 8;
        logDraft.textValue = "";
        searchInput.value = "";
        renderLog();
      });
    });
    var addRow = document.getElementById("addNewExRow");
    if(addRow){
      addRow.addEventListener("click", function(){
        openAddExerciseModal(searchInput.value.trim());
      });
    }
  }
  searchInput.addEventListener("input", doSearch);
  // Bemærk: søgefeltet fokuseres bevidst IKKE automatisk her (heller ikke
  // efter "Skift ✕" eller "Gem sæt") — tastaturet skal kun poppe op hvis
  // man selv trykker i feltet.

  attachLogFormHandlers();
}

function muscleSelectHtml(selectedMuscle, selectId){
  var html = '<select id="'+(selectId||"newExMuscle")+'" style="width:100%;padding:12px;border-radius:10px;background:var(--card2,#1c1c1f);color:var(--text);border:1px solid var(--border);font-size:15px;">';
  html += '<option value="">Vælg muskelgruppe…</option>';
  getEffectiveGroups().forEach(function(grp){
    html += '<optgroup label="'+escapeHtml(grp.title)+'">';
    grp.muscles.forEach(function(m){
      html += '<option value="'+m+'"'+(m===selectedMuscle?' selected':'')+'>'+MUSCLE_LABELS[m]+'</option>';
    });
    html += '</optgroup>';
  });
  html += '</select>';
  return html;
}

function variantToggleHtml(toggleId, selected){
  var html = '<div class="field"><label class="field-label">Programmer på Øvelser-siden (intet valg = Øvrige øvelser)</label>';
  html += '<div class="toggle-group" id="'+toggleId+'" style="flex-wrap:wrap;">';
  getPrograms().forEach(function(p){
    var on = String(selected||"").indexOf(p.id)!==-1;
    html += '<div class="toggle-opt'+(on?' selected':'')+'" data-var="'+p.id+'" style="flex:1 1 40%;">'+escapeHtml(p.name)+'</div>';
  });
  html += '</div></div>';
  return html;
}
/* Flere programmer kan vælges på én gang — tryk igen på et program for at fjerne det igen */
function attachVariantToggle(toggleId, initial, onChange){
  var box = document.getElementById(toggleId);
  var chosen = String(initial||"");
  box.querySelectorAll(".toggle-opt").forEach(function(opt){
    opt.addEventListener("click", function(){
      var v = opt.getAttribute("data-var");
      if(chosen.indexOf(v)!==-1){
        chosen = chosen.replace(v, "");
        opt.classList.remove("selected");
      } else {
        chosen += v;
        opt.classList.add("selected");
      }
      onChange(normalizeVariant(chosen));
    });
  });
}

function openAddExerciseModal(prefillName){
  var html = '<h3>Tilføj ny øvelse</h3>'+
    '<div class="field"><label class="field-label">Navn</label><input type="text" id="newExName" value="'+escapeHtml(prefillName||"")+'"></div>'+
    '<div class="field"><label class="field-label">Type</label>'+
    '<div class="toggle-group" id="newExTypeToggle">'+
    '<div class="toggle-opt selected" data-bw="0">Vægt/maskine</div>'+
    '<div class="toggle-opt" data-bw="1">Kropsvægt</div>'+
    '</div></div>'+
    '<div class="field"><label class="field-label">Muskelgruppe (bruges til "Foreslået i dag")</label>'+muscleSelectHtml(null)+'</div>'+
    variantToggleHtml("newExVariantToggle", null)+
    '<button class="btn primary" id="saveNewEx">Gem øvelse</button>';
  openModal(html);
  var bwVal = 0;
  var variantVal = null;
  modalSheet.querySelectorAll("#newExTypeToggle .toggle-opt").forEach(function(opt){
    opt.addEventListener("click", function(){
      modalSheet.querySelectorAll("#newExTypeToggle .toggle-opt").forEach(function(o){o.classList.remove("selected");});
      opt.classList.add("selected");
      bwVal = parseInt(opt.getAttribute("data-bw"));
    });
  });
  attachVariantToggle("newExVariantToggle", null, function(v){ variantVal = v; });
  bindTapAction(document.getElementById("saveNewEx"), function(){
    var name = document.getElementById("newExName").value.trim();
    if(!name){ showToast("Skriv et navn"); return; }
    var muscle = document.getElementById("newExMuscle").value || null;
    var list = loadEx().slice();
    var id = name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"") || uid("ex");
    var uniqueId = id, n=2;
    while(list.some(function(e){return e.id===uniqueId;})){ uniqueId = id+"-"+n; n++; }
    /* Ny øvelse får en eksplicit position (i stedet for ingen/undefined), så den
       placeres sidst i sin liste med det samme, i stedet for at havne i en
       "ingen position endnu"-bunke der bliver sorteret efter muskel+navn og kan
       se ud til at "hoppe rundt" i forhold til allerede-placerede øvelser. */
    var maxPos = list.reduce(function(m,e){ return (typeof e.position==="number" && e.position>m) ? e.position : m; }, 0);
    list.push({id:uniqueId, name:name, bodyweight: bwVal===1, muscle: muscle, variant: variantVal, position: maxPos+1});
    saveEx(list);
    logDraft.exerciseId = uniqueId;
    logDraft.musclePos = "1-2";
    logDraft.repsMode = "wheel";
    logDraft.wheelValue = 8;
    logDraft.textValue = "";
    closeModal();
    renderLog();
    showToast("Øvelse tilføjet");
  });
}

function prevSetWeightToday(exId, setNum){
  if(setNum<=1) return null;
  var todays = loadLogs().filter(function(l){return l.exerciseId===exId && l.date===todayISO();});
  var prev = todays.find(function(l){return l.setNumber===setNum-1;});
  if(!prev || prev.weight===null || prev.weight===undefined) return null;
  return prev.weight;
}

function nextSetNumberForToday(exId){
  var todays = loadLogs().filter(function(l){return l.exerciseId===exId && l.date===todayISO();});
  return todays.length+1;
}

function getTodayDayContext(){
  var todayLogs = loadLogs().filter(function(l){ return l.date===todayISO(); });
  if(todayLogs.length===0) return null;
  var exList = loadEx();
  for(var i=0;i<todayLogs.length;i++){
    var exObj = exList.find(function(e){ return e.id===todayLogs[i].exerciseId; });
    if(exObj && exObj.muscle){
      var day = dayGroupForMuscle(exObj.muscle);
      if(day) return day;
    }
  }
  return null;
}

function getSuggestedExercises(){
  var day = getTodayDayContext();
  if(!day) return [];
  var todayLoggedIds = {};
  loadLogs().filter(function(l){return l.date===todayISO();}).forEach(function(l){ todayLoggedIds[l.exerciseId]=true; });
  return loadEx().filter(function(e){
    return e.muscle && dayGroupForMuscle(e.muscle)===day && !todayLoggedIds[e.id];
  });
}

function renderLogForm(exObj){
  var setNum = nextSetNumberForToday(exObj.id);
  var bestBySet = bestPerSetNumber(exObj.id);
  var setNumsSorted = Object.keys(bestBySet).map(Number).sort(function(a,b){return a-b;});
  var html = '<div class="card">';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">';
  html += '<div style="font-size:17px;font-weight:800;">'+escapeHtml(exObj.name)+'</div>';
  html += '<div style="display:flex;gap:4px;"><button class="icon-btn" id="renameExBtn" style="font-size:16px;">✎</button><button class="icon-btn skift-ex-btn" id="clearExBtn">Skift<br>øvelse</button></div>';
  html += '</div>';
  if(setNumsSorted.length){
    html += '<div class="muted" style="margin-bottom:14px;">';
    html += '<div style="font-weight:700;color:var(--text);margin-bottom:4px;">Bedste hidtil pr. sæt:</div>';
    setNumsSorted.forEach(function(sn){
      var l = bestBySet[sn];
      var wLabel = exObj.bodyweight ? (l.weight ? ("Kropsvægt +"+l.weight+"kg") : "Kropsvægt") : (l.weight+"kg");
      html += '<div>Sæt '+sn+': '+wLabel+' × '+escapeHtml(l.repsLabel||String(l.reps))+'</div>';
    });
    html += '</div>';
  }
  html += '<div class="muted" style="margin-bottom:10px;">Sæt '+setNum+' i dag</div>';

  var prevWeight = prevSetWeightToday(exObj.id, setNum);
  var weightValAttr = prevWeight!==null ? ' value="'+prevWeight+'"' : '';
  if(exObj.bodyweight){
    html += '<div class="field"><label class="field-label">Ekstra vægt (kg) — lad stå tom hvis ren kropsvægt</label><input type="text" inputmode="decimal" id="logWeight" placeholder="fx 10"'+weightValAttr+'></div>';
  } else {
    html += '<div class="field"><label class="field-label">Vægt (kg)</label><input type="text" inputmode="decimal" id="logWeight" placeholder="fx 22.5"'+weightValAttr+'></div>';
  }
  html += '<div class="field"><label class="field-label">Reps</label>';
  if(logDraft.repsMode==="text"){
    html += '<input type="text" id="logReps" value="'+escapeHtml(logDraft.textValue||"")+'" placeholder="fx 8 eller 7-9">';
    html += '<div class="mode-toggle-link" id="repsModeToggle">↺ Brug hjul i stedet</div>';
  } else {
    html += '<div class="reps-picker-wrap"><div class="reps-picker-track" id="repsPicker">';
    html += '<div class="reps-pad"></div>';
    for(var rv=1; rv<=15; rv++){
      html += '<div class="reps-item'+(rv===logDraft.wheelValue?' active':'')+'" data-val="'+rv+'">'+rv+'</div>';
    }
    html += '<div class="reps-pad"></div>';
    html += '</div><div class="reps-picker-indicator"></div></div>';
    html += '<div class="mode-toggle-link" id="repsModeToggle">✎ Skriv interval i stedet (fx 7-9)</div>';
  }
  html += '</div>';
  html += '<div class="row"><button class="btn ghost" id="skipSetBtn" style="border:1px solid var(--border);">Spring sæt over</button><button class="btn primary" id="saveSetBtn">Gem sæt '+setNum+'</button></div>';
  html += '</div>';
  return html;
}

function openEditExerciseModal(exId, onSaved){
  var exObj = getExerciseById(exId);
  if(!exObj) return;
  var html = '<h3>Omdøb øvelse</h3>'+
    '<div class="field"><label class="field-label">Navn</label><input type="text" id="editExName" value="'+escapeHtml(exObj.name)+'"></div>'+
    '<div class="field"><label class="field-label">Type</label>'+
    '<div class="toggle-group" id="editExTypeToggle">'+
    '<div class="toggle-opt'+(!exObj.bodyweight?' selected':'')+'" data-bw="0">Vægt/maskine</div>'+
    '<div class="toggle-opt'+(exObj.bodyweight?' selected':'')+'" data-bw="1">Kropsvægt</div>'+
    '</div></div>'+
    '<div class="field"><label class="field-label">Muskelgruppe (bruges til "Foreslået i dag")</label>'+muscleSelectHtml(exObj.muscle||null, "editExMuscle")+'</div>'+
    variantToggleHtml("editExVariantToggle", exObj.variant||null)+
    '<button class="btn primary" id="saveRenameEx">Gem</button>';
  openModal(html);
  var bwVal = exObj.bodyweight ? 1 : 0;
  var variantVal = exObj.variant || null;
  modalSheet.querySelectorAll("#editExTypeToggle .toggle-opt").forEach(function(opt){
    opt.addEventListener("click", function(){
      modalSheet.querySelectorAll("#editExTypeToggle .toggle-opt").forEach(function(o){o.classList.remove("selected");});
      opt.classList.add("selected");
      bwVal = parseInt(opt.getAttribute("data-bw"));
    });
  });
  attachVariantToggle("editExVariantToggle", variantVal, function(v){ variantVal = v; });
  bindTapAction(document.getElementById("saveRenameEx"), function(){
    var newName = document.getElementById("editExName").value.trim();
    if(!newName){ showToast("Skriv et navn"); return; }
    var muscle = document.getElementById("editExMuscle").value || null;
    /* Object.assign bevarer felter der ikke redigeres i denne modal (vigtigst:
       "position" — rækkefølgen i Øvelser-listen). Tidligere blev øvelsen
       genopbygget fra bunden her, hvilket nulstillede dens gemte position
       hver gang man omdøbte/kategoriserede den — det var årsagen til at
       nyligt redigerede øvelser (typisk i Ben-programmet) sprang rundt i
       rækkefølgen efter man havde redigeret dem. */
    var list = loadEx().map(function(e){
      if(e.id!==exId) return e;
      return Object.assign({}, e, {name:newName, bodyweight: bwVal===1, muscle: muscle, variant: variantVal});
    });
    saveEx(list);
    closeModal();
    showToast("Øvelse opdateret");
    if(onSaved) onSaved();
  });
}

function attachLogFormHandlers(){
  var weightInput = document.getElementById("logWeight");
  if(weightInput){
    weightInput.addEventListener("focus", function(){ weightInput.select(); });
  }

  var clearBtn = document.getElementById("clearExBtn");
  if(clearBtn) clearBtn.addEventListener("click", function(){ logDraft.exerciseId=null; logDraft.musclePos="1-2"; logDraft.repsMode="wheel"; logDraft.wheelValue=8; logDraft.textValue=""; renderLog(); });

  var renameBtn = document.getElementById("renameExBtn");
  if(renameBtn){
    renameBtn.addEventListener("click", function(){
      openEditExerciseModal(logDraft.exerciseId, function(){ renderLog(); });
    });
  }

  var repsPicker = document.getElementById("repsPicker");
  if(repsPicker){
    var repsItems = repsPicker.querySelectorAll(".reps-item");
    var itemWidth = 56;
    function highlightIdx(idx){
      repsItems.forEach(function(it){ it.classList.remove("active"); });
      if(repsItems[idx]) repsItems[idx].classList.add("active");
    }
    var initialIdx = Math.max(0, Math.min(repsItems.length-1, logDraft.wheelValue-1));
    repsPicker.scrollLeft = initialIdx*itemWidth;
    highlightIdx(initialIdx);
    var scrollTimer;
    repsPicker.addEventListener("scroll", function(){
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(function(){
        var idx = Math.round(repsPicker.scrollLeft/itemWidth);
        idx = Math.max(0, Math.min(repsItems.length-1, idx));
        highlightIdx(idx);
        logDraft.wheelValue = parseInt(repsItems[idx].getAttribute("data-val"),10);
      }, 90);
    });
  }

  var repsModeToggle = document.getElementById("repsModeToggle");
  if(repsModeToggle){
    repsModeToggle.addEventListener("click", function(){
      if(logDraft.repsMode==="text"){
        logDraft.textValue = document.getElementById("logReps").value;
        logDraft.repsMode = "wheel";
      } else {
        logDraft.repsMode = "text";
      }
      renderLog();
    });
  }

  var saveBtn = document.getElementById("saveSetBtn");
  if(saveBtn){
    bindTapAction(saveBtn, function(){
      var exObj = getExerciseById(logDraft.exerciseId);
      var weightRaw = document.getElementById("logWeight").value;
      var parsedReps;
      if(logDraft.repsMode==="text"){
        parsedReps = parseReps(document.getElementById("logReps").value);
      } else {
        parsedReps = { reps: logDraft.wheelValue, repsLabel: String(logDraft.wheelValue) };
      }
      if(!parsedReps){ showToast("Udfyld reps (fx 8 eller 7-9)"); return; }
      var weight = parseWeight(weightRaw);
      if(exObj.bodyweight){ weight = weight===null? 0 : weight; }
      else {
        if(weight===null){ showToast("Udfyld vægt"); return; }
      }
      var prevBest = allTimeBest(exObj.id);
      var logs = loadLogs().slice();
      var setNum = nextSetNumberForToday(exObj.id);
      var newLog = {
        id: uid("log"),
        exerciseId: exObj.id,
        date: todayISO(),
        loggedAt: Date.now(),
        setNumber: setNum,
        weight: weight,
        reps: parsedReps.reps,
        repsLabel: parsedReps.repsLabel,
        musclePos: logDraft.musclePos || "1-2",
        skipped: false
      };
      logs.push(newLog);
      saveLogs(logs);

      var newScore = setScore(newLog);
      var isPR = !prevBest || newScore > prevBest.topScore;

      if(isPR){
        showToast("🏆 Ny PR på "+exObj.name+"!", null, "pr");
      } else {
        showToast("Sæt "+setNum+" gemt ✓");
      }
      renderLog();
    });
  }

  var skipBtn = document.getElementById("skipSetBtn");
  if(skipBtn){
    skipBtn.addEventListener("click", function(){
      var exObj = getExerciseById(logDraft.exerciseId);
      var logs = loadLogs().slice();
      var setNum = nextSetNumberForToday(exObj.id);
      var newLog = {
        id: uid("log"),
        exerciseId: exObj.id,
        date: todayISO(),
        loggedAt: Date.now(),
        setNumber: setNum,
        weight: null,
        reps: null,
        repsLabel: "–",
        musclePos: logDraft.musclePos || "1-2",
        skipped: true
      };
      logs.push(newLog);
      saveLogs(logs);
      showToast("Sæt "+setNum+" sprunget over");
      renderLog();
    });
  }
}

