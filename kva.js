// ════════════════════════════════════════════════════════════════════
//  MODUL KVA (Kostenvoranschlag) — vierte Säule
//  Integriert die KVA-App mit Supabase-Anbindung (Archiv + Einstellungen zentral)
// ════════════════════════════════════════════════════════════════════
window.KVA_sb = null;       // wird in renderKVA gesetzt
var KVA_initialized = false;

// ── Firmadaten aus zentralen Einstellungen ──
// Werden von app.js via FST_FIRMA befüllt oder aus einstState.firma geladen
var KVA_FIRMA = {
  name:    'Fahrschulteam Lingen',
  inhaber: 'Thorsten Gels',
  strasse: 'Rheiner Str. 158',
  plz_ort: '49809 Lingen',
  tel:     '0591/51403',
  email:   'lingen@fahrschulteam.info',
  web:     'www.fahrschulteam.info',
};

// Auffrischen aus einstState falls verfügbar
function kvaLadeFirma() {
  var f = window.einstState && window.einstState.firma;
  if (!f) return;
  if (f.name)    KVA_FIRMA.name    = f.name;
  if (f.inhaber) KVA_FIRMA.inhaber = f.inhaber;
  if (f.strasse) KVA_FIRMA.strasse = f.strasse;
  if (f.plz_ort) KVA_FIRMA.plz_ort = f.plz_ort;
  if (f.tel)     KVA_FIRMA.tel     = f.tel;
  if (f.email)   KVA_FIRMA.email   = f.email;
  if (f.web)     KVA_FIRMA.web     = f.web;
}

window.renderKVA = function(){
  var view = document.getElementById('view-kva');
  // Supabase-Referenz bereitstellen (sb ist global aus app.js)
  if (typeof sb !== 'undefined') window.KVA_sb = sb;
  // Firmadaten aus zentralen Einstellungen laden
  kvaLadeFirma();

  if (!KVA_initialized) {
    view.innerHTML = KVA_BODY_HTML;
    KVA_initialized = true;
    // Initialisierung der KVA-App
    try {
      loadState();
      loadSettings();
      if (typeof initAusbildung === 'function') initAusbildung();
      render();
    } catch(e) { console.error('KVA init:', e); }
  } else {
    // schon initialisiert → nur neu rendern
    try { render(); } catch(e) {}
  }
};

var KVA_BODY_HTML = `

<div class="mod-shell">
  <aside class="mod-side"><nav>
    <div class="mod-side-label">KVA</div>
    <div class="kn" id="kn" style="margin-bottom:10px"></div>
    <button class="mod-side-btn" onclick="if(confirm('Neuen KVA starten? Alle Eingaben werden gel\\u00f6scht.'))resetAll()"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:20px;flex-shrink:0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg><span class="mod-lbl">Neu</span></button>
    <button class="mod-side-btn" onclick="openKvaDialog()"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:20px;flex-shrink:0"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v1"/><path d="M2 13h20l-2 8H4z"/></svg><span class="mod-lbl">Öffnen</span></button>
    <div class="mod-side-divider"></div>
    <div class="mod-side-label">Einstellungen</div>
    <button class="mod-side-btn" onclick="showView('einstellungen');setTimeout(function(){if(typeof setEinstTab==='function')setEinstTab('kva');},150)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:20px;flex-shrink:0"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg><span class="mod-lbl">KVA-Einstellungen</span></button>
  </nav></aside>
  <div class="mod-main">
  <div class="kva-shell"><div class="st" id="stepper"></div>
  <div class="con" id="kva-app"></div></div>
  </div>
</div>
<div id="modal-container"></div>
`;

// ─────────────────────────────────────────────────────────────────────
//  Original KVA-Code (mit Supabase-Anbindung)
// ─────────────────────────────────────────────────────────────────────

window.onerror=function(msg,src,line){var d=document.getElementById("kva-app");if(d)d.innerHTML="<div style='padding:20px;color:red;'><b>Fehler:</b><br>"+msg+"<br>Zeile: "+line+"</div>";return false;};


// ── AUSBILDUNGSDATEN gem. FahrschAusbO ──────────────────────────────────────
// gs=Grundstoff-DS, zs=Zusatzstoff-DS (je 90 Min.), ul/ab/na=Sonderfahrten (je 45 Min.)
// ue=Ubungsstunden Richtwert (regional editierbar)
var AUSBILDUNG_DEFAULTS={
  "AM": {gs:12,zs:2, ul:0,ab:0,na:0, ue:6,  hw:"Kfz bis 45\u202fkm/h und 50\u202fccm."},
  "A1": {gs:12,zs:4, ul:5,ab:4,na:3, ue:10, hw:"Bis 125\u202fccm, max. 11\u202fkW."},
  "A2": {gs:12,zs:4, ul:5,ab:4,na:3, ue:10, hw:"Bis 35\u202fkW. Stufenaufstieg zu A nach 2 Jahren."},
  "A":  {gs:12,zs:4, ul:5,ab:4,na:3, ue:10, hw:"Unbeschr\u00e4nkt ab 24 J. Direkteinstieg."},
  "B":  {gs:12,zs:2, ul:5,ab:4,na:3, ue:30, hw:"Pkw bis 3.500\u202fkg. Stunden abh\u00e4ngig von pers\u00f6nlichen F\u00e4higkeiten."},
  "BE": {gs:0, zs:0, ul:3,ab:1,na:1, ue:5,  hw:"Theorie aus B gilt. Kombizug max. 7.000\u202fkg."},
  "B96":{gs:0, zs:0, ul:0,ab:0,na:0, ue:7,  hw:"Mind. 7 Std. gesamt (2,5 Theorie + 4,5 Praxis). Kein Behördenantrag."},
  "C1": {gs:6, zs:6, ul:3,ab:1,na:0, ue:10, hw:"Lkw 3.500\u20137.500\u202fkg. Fahrerlaubnis gilt 5 Jahre."},
  "C1E":{gs:0, zs:0, ul:3,ab:1,na:0, ue:8,  hw:"Zug max. 12.000\u202fkg. Theorie aus C1 gilt."},
  "C":  {gs:6, zs:10,ul:5,ab:2,na:3, ue:15, hw:"Lkw \u00fcber 3.500\u202fkg. FQN/CPC Pflicht."},
  "CE": {gs:0, zs:4, ul:3,ab:1,na:1, ue:12, hw:"Sattelzug/Lastzug. FQN/CPC Pflicht."},
  "D1": {gs:6, zs:10,ul:0,ab:0,na:0, ue:32, hw:"Kleinbus bis 16 Pl\u00e4tze. Stunden nach Anlage 5."},
  "D1E":{gs:0, zs:0, ul:0,ab:0,na:0, ue:9,  hw:"D1 mit Anh\u00e4nger bis 750\u202fkg."},
  "D":  {gs:6, zs:18,ul:0,ab:0,na:0, ue:44, hw:"Bus. Stunden nach Anlage 5. FQN/CPC Pflicht.",
    vorbesitz:[
      {label:"Vorbesitz B oder C1 \u2014 unter 2 Jahren",  gs:45, ul:22, ab:14, na:8},
      {label:"Vorbesitz B oder C1 \u2014 mind. 2 Jahre",   gs:33, ul:12, ab:8,  na:5},
      {label:"Vorbesitz C \u2014 unter 2 Jahren",          gs:14, ul:16, ab:8,  na:6},
      {label:"Vorbesitz C \u2014 mind. 2 Jahre",           gs:7,  ul:8,  ab:4,  na:3},
      {label:"Vorbesitz D1",                              gs:20, ul:5,  ab:5,  na:5}
    ]
  },
  "DE": {gs:0, zs:0, ul:0,ab:0,na:0, ue:9,  hw:"Bus mit Anh\u00e4nger."},
  "T":  {gs:12,zs:6, ul:0,ab:0,na:0, ue:8,  hw:"Land-/forstwirtschaftliche Zugmaschinen bis 60\u202fkm/h."},
  "L":  {gs:12,zs:2, ul:0,ab:0,na:0, ue:0,  hw:"Zugmaschinen bis 32\u202fkm/h."}
};
var AUSBILDUNG={};
function initAusbildung(){
  Object.keys(AUSBILDUNG_DEFAULTS).forEach(function(k){
    AUSBILDUNG[k]=Object.assign({},AUSBILDUNG_DEFAULTS[k]);
  });
}
initAusbildung();

function renderAusbildungTable(){
  var c=document.getElementById("ab-container");
  if(!c) return;
  var html="<table style='border-collapse:collapse;font-size:11px;min-width:100%;'>";
  html+="<tr style='background:#f0f0f0;'>";
  html+="<th style='text-align:left;padding:5px 4px;border-bottom:2px solid #ccc;min-width:40px;'>Kl.</th>";
  html+="<th style='padding:5px 3px;border-bottom:2px solid #ccc;text-align:center;min-width:34px;' title='Grundstoff Doppelstunden'>GS\u00b9</th>";
  html+="<th style='padding:5px 3px;border-bottom:2px solid #ccc;text-align:center;min-width:34px;' title='Zusatzstoff Doppelstunden'>ZS\u00b9</th>";
  html+="<th style='padding:5px 3px;border-bottom:2px solid #ccc;text-align:center;min-width:34px;' title='Sonderfahrten Ueberland'>\u00dcL\u00b2</th>";
  html+="<th style='padding:5px 3px;border-bottom:2px solid #ccc;text-align:center;min-width:34px;' title='Sonderfahrten Autobahn'>AB\u00b2</th>";
  html+="<th style='padding:5px 3px;border-bottom:2px solid #ccc;text-align:center;min-width:34px;' title='Sonderfahrten Nacht'>NA\u00b2</th>";
  html+="<th style='padding:5px 3px;border-bottom:2px solid #ccc;text-align:center;min-width:44px;color:#2A6CAE;' title='Ø Uebungsstunden Richtwert'>\u00d8\u202fUbg\u00b3</th>";
  html+="</tr>";
  var colors={"PKW":"#fffde7","LKW":"#e8f5e9","Bus":"#e3f2fd","Motorrad":"#fce4ec","Traktor":"#f3e5f5","Mofa":"#f5f5f5"};
  CLS.forEach(function(cls){
    if(cls.mofa) return;
    var a=AUSBILDUNG[cls.id];
    if(!a) return;
    var bg=colors[cls.g]||"#fafafa";
    function inp(field,max,blue){
      var border=blue?"1.5px solid #2A6CAE":"1px solid #ccc";
      var bg2=blue?"#eef4fb":"#fff";
      return "<input type='number' min='0' max='"+max+"' value='"+a[field]+"' id='ab-"+cls.id+"-"+field+"' style='width:38px;text-align:center;font-size:11px;padding:2px;border:"+border+";border-radius:3px;background:"+bg2+";'>";
    }
    html+="<tr style='background:"+bg+";border-bottom:1px solid #e0e0e0;'>";
    html+="<td style='padding:4px;font-weight:700;'>"+cls.l+"</td>";
    html+="<td style='padding:3px;text-align:center;'>"+inp("gs",30,false)+"</td>";
    html+="<td style='padding:3px;text-align:center;'>"+inp("zs",30,false)+"</td>";
    html+="<td style='padding:3px;text-align:center;'>"+inp("ul",20,false)+"</td>";
    html+="<td style='padding:3px;text-align:center;'>"+inp("ab",20,false)+"</td>";
    html+="<td style='padding:3px;text-align:center;'>"+inp("na",20,false)+"</td>";
    html+="<td style='padding:3px;text-align:center;'>"+inp("ue",200,true)+"</td>";
    html+="</tr>";
  });
  html+="</table>";
  html+="<div style='font-size:10px;color:#777;margin-top:5px;line-height:1.7;'>";
  html+="\u00b9 Doppelstunden \u00e0 90 Min. (GS=Grundstoff, ZS=Zusatzstoff) gem. FahrschAusbO \u00a74<br>";
  html+="\u00b2 Sonderfahrten \u00e0 45 Min. gem. Anlage 4/5 (gesetzliche Mindestanzahl)<br>";
  html+="<span style='color:#2A6CAE;'>\u00b3 \u00d8 \u00dcbungsstunden</span>: Ihr regionaler Richtwert &mdash; Anzahl von pers\u00f6nlichen F\u00e4higkeiten abh\u00e4ngig</div>";
  c.innerHTML=html;
}

function saveAusbildungFromInputs(){
  CLS.forEach(function(cls){
    if(cls.mofa||!AUSBILDUNG[cls.id]) return;
    ["gs","zs","ul","ab","na","ue"].forEach(function(f){
      var el=document.getElementById("ab-"+cls.id+"-"+f);
      if(el) AUSBILDUNG[cls.id][f]=+el.value;
    });
  });
}

function resetAusbildung(){
  initAusbildung();
  renderAusbildungTable();
}

function updateDKarte(selId,karteId,vorbesitz,ue){
  var sel=document.getElementById(selId);
  if(!sel) return;
  var vb=vorbesitz[+sel.value];
  if(!vb) return;
  var idx=karteId.replace("d-karte-","");
  var gs=document.getElementById("d-gs-"+idx);
  var so=document.getElementById("d-so-"+idx);
  if(gs) gs.innerHTML="<strong>"+vb.gs+" Fahrstunden</strong> u00e0 45u202fMin.";
  if(so) so.innerHTML="u00dcberland: <strong>"+vb.ul+"</strong> u00d7 45u202fMin.<br>Autobahn: <strong>"+vb.ab+"</strong> u00d7 45u202fMin.<br>Nacht: <strong>"+vb.na+"</strong> u00d7 45u202fMin.<br><span style='font-weight:700;color:#C0001A;'>Gesamt: "+(vb.ul+vb.ab+vb.na)+" Sonderfahrten</span>";
}
function toggleInfoBlatt(){
  S.infoBlatt=!S.infoBlatt;
  saveState();
  updatePrintArea();
  var ic=document.getElementById("infoblatt-icon");
  if(ic) ic.textContent=S.infoBlatt?"\u2705":"\u2b1c";
}

// Preistabelle rendern – vollständig mit allen Feldern
function renderPriceTable(){
  var con=document.getElementById('pl-container');
  if(!con) return;

  // Spaltenköpfe
  var thStyle="padding:4px 6px;text-align:right;font-size:10px;font-weight:700;color:#fff;white-space:nowrap;";
  var thL="padding:4px 6px;text-align:left;font-size:10px;font-weight:700;color:#fff;";
  var header="<thead style='position:sticky;top:0;z-index:2;'><tr style='background:#3F4B57;'>"
    +"<th style='"+thL+"'>Klasse</th>"
    +"<th style='"+thStyle+"'>Grundbetrag</th>"
    +"<th style='"+thStyle+"'>Lehrmaterial</th>"
    +"<th style='"+thStyle+"'>Std-Satz&nbsp;(€)</th>"
    +"<th style='"+thStyle+"'>Mind.&nbsp;Std.</th>"
    +"<th style='"+thStyle+"'>Sonderf.-Preis</th>"
    +"<th style='"+thStyle+"'>Pflicht-Sonderf.</th>"
    +"<th style='"+thStyle+"'>Unterweisung</th>"
    +"<th style='"+thStyle+"'>Theoretische&nbsp;Pr&uuml;fung</th>"
    +"<th style='"+thStyle+"'>Praktische&nbsp;Pr&uuml;fung</th>"
    +"</tr></thead>";

  var inp=function(id,field,val,w){
    w=w||62;
    return "<input type='number' min='0' step='0.01' "
      +"style='width:"+w+"px;padding:2px 4px;font-size:11px;text-align:right;"
      +"border:1px solid #ddd;border-radius:3px;background:#fff;'"
      +" value='"+val+"' onchange='updatePrice(\""+id+"\",\""+field+"\",this.value)'/>";
  };
  var dash="<span style='color:#ccc;font-size:10px;'>–</span>";
  var td="padding:3px 5px;text-align:right;border-bottom:0.5px solid #eee;";
  var tdL="padding:3px 6px;text-align:left;border-bottom:0.5px solid #eee;";

  var html="<div style='overflow-x:auto;overflow-y:auto;max-height:400px;border:1px solid #ddd;border-radius:6px;'>"
    +"<table style='width:100%;border-collapse:collapse;font-size:11px;min-width:680px;'>"
    +header+"<tbody>";

  var grpColors={PKW:"#fff8f0",Motorrad:"#f0f4ff",LKW:"#f5fff0",Bus:"#fff0f8",Traktor:"#fffdf0",Sonstige:"#f8f8f8"};
  var lastGrp="";

  CLS.filter(function(c){return !c.mofa;}).forEach(function(c,idx){
    if(c.g!==lastGrp){
      lastGrp=c.g;
      var gc=grpColors[c.g]||"#f8f8f8";
      html+="<tr style='background:"+gc+";'>"
        +"<td colspan='10' style='padding:4px 8px;font-size:10px;font-weight:800;"
        +"color:#C0001A;text-transform:uppercase;letter-spacing:.8px;border-bottom:1px solid #e0e0e0;'>"
        +c.g+"</td></tr>";
    }
    var bg=idx%2===0?"#fff":"#fafafa";
    html+="<tr style='background:"+bg+";'>"
      +"<td style='"+tdL+"font-weight:700;color:#3F4B57;'>"+c.l+"</td>"
      +"<td style='"+td+"'>"+inp(c.id,"gb",c.gb||0,68)+"</td>"
      +"<td style='"+td+"'>"+inp(c.id,"lm",c.lm||0,55)+"</td>"
      +"<td style='"+td+"'>"+inp(c.id,"ust",c.ust||0,55)+"</td>"
      +"<td style='"+td+"'>"+inp(c.id,"n",c.n||0,45)+"</td>"
      +"<td style='"+td+"'>"+inp(c.id,"soP",c.soP||0,55)+"</td>"
      +"<td style='"+td+"'>"+inp(c.id,"soN",c.soN||0,45)+"</td>"
      +"<td style='"+td+"'>"+inp(c.id,"unt",c.unt||0,55)+"</td>"
      +"<td style='"+td+"'>"+inp(c.id,"th",c.th||0,55)+"</td>"
      +"<td style='"+td+"'>"+inp(c.id,"pr",c.pr||0,55)+"</td>"
      +"</tr>";
  });

  html+="</tbody></table></div>";
  con.innerHTML=html;
}

function persistPrices(){
  try{
    var existing={};
    try{existing=JSON.parse(localStorage.getItem("fst_settings")||"{}");}catch(e){existing={};}
    var prices={};
    CLS.forEach(function(c){
      prices[c.id]={gb:c.gb,ust:c.ust,soP:c.soP,soN:c.soN,lm:c.lm,uw:c.uw,unt:c.unt||0,th:c.th,pr:c.pr,n:c.n};
    });
    existing.prices=prices;
    localStorage.setItem("fst_settings",JSON.stringify(existing));
  }catch(e){}
}
function updatePrice(id,field,val){
  var c=CLS.find(function(x){return x.id===id;});
  if(c){
    c[field]=parseFloat(val)||0;
    // Wenn Mindest-Übungsstunden geändert: manuelle Überschreibung zurücksetzen
    if(field==="n") delete S.ust[id];
    // Wenn Pflicht-Sonderfahrten geändert: manuelle Überschreibung zurücksetzen
    if(field==="soN") delete S.so[id];
    // Manuelle Preisänderung sofort dauerhaft sichern
    persistPrices();
    var s=q("set-saved");
    if(s){s.style.display="inline";setTimeout(function(){s.style.display="none";},1500);}
  }
}

// Standardpreise (vollständig)
var DEFAULT_PRICES={
  AM: {gb:400,ust:76,soP:76,soN:12,lm:99,uw:49,th:55,pr:145,n:8},
  A1: {gb:400,ust:77,soP:77,soN:12,lm:99,uw:49,th:55,pr:145,n:8},
  A2: {gb:400,ust:78,soP:78,soN:12,lm:99,uw:49,th:55,pr:145,n:8},
  A:  {gb:400,ust:78,soP:78,soN:12,lm:99,uw:49,th:55,pr:145,n:8},
  A2S:{gb:400,ust:78,soP:78,soN:6, lm:99,uw:49,th:55,pr:145,n:8},
  AS: {gb:400,ust:78,soP:78,soN:6, lm:99,uw:49,th:55,pr:145,n:8},
  B:  {gb:695,ust:76,soP:86,soN:12,lm:99,uw:49,th:55,pr:145,n:22},
  B196:{gb:250,ust:77,soP:0,soN:0, lm:0, uw:0, th:0, pr:0, n:10},
  B96:{gb:75, ust:80,soP:0,soN:0, lm:0, uw:0, th:0, pr:0, n:6},
  BE: {gb:50, ust:80,soP:80,soN:3, lm:0, uw:49,unt:49,th:0, pr:145,n:1},
  C1: {gb:695,ust:82,soP:92,soN:4, lm:99,uw:49,unt:49,th:55,pr:175,n:10},
  C1E:{gb:50, ust:87,soP:97,soN:4, lm:0, uw:49,unt:49,th:0, pr:185,n:8},
  C:  {gb:695,ust:87,soP:97,soN:10,lm:99,uw:49,unt:49,th:55,pr:175,n:15},
  CE: {gb:550,ust:89,soP:99,soN:5, lm:99,uw:49,unt:49,th:55,pr:185,n:12},
  D1: {gb:695,ust:87,soP:90,soN:0, lm:99,uw:49,th:55,pr:175,n:32},
  D1E:{gb:150,ust:87,soP:90,soN:0, lm:0, uw:49,th:0, pr:185,n:9},
  D:  {gb:695,ust:97,soP:102,soN:0,lm:99,uw:49,unt:49,th:55,pr:175,n:58},
  DE: {gb:150,ust:102,soP:107,soN:0,lm:0,uw:49,unt:49,th:0, pr:185,n:9},
  T:  {gb:595,ust:85, soP:0, soN:0, lm:99,uw:49,th:55,pr:175,n:8},
  L:  {gb:550,ust:0, soP:0, soN:0, lm:99,uw:0, th:55,pr:0,  n:0}
};

function resetPrices(){
  if(!confirm('Alle Preise auf Standardwerte zur\u00fccksetzen?')) return;
  CLS.forEach(function(c){
    var d=DEFAULT_PRICES[c.id];
    if(d) Object.keys(d).forEach(function(k){c[k]=d[k];});
  });
  persistPrices();
  renderPriceTable();
}

// Einstellungen speichern/laden
function saveSettings(){
  try{
    saveAusbildungFromInputs();
    var prices={};
    CLS.forEach(function(c){
      prices[c.id]={gb:c.gb,ust:c.ust,soP:c.soP,soN:c.soN,lm:c.lm,uw:c.uw,unt:c.unt||0,th:c.th,pr:c.pr,n:c.n};
    });
    // lokal als Fallback (Merge – andere Module nutzen denselben Key!)
    try{
      var _ex={};
      try{_ex=JSON.parse(localStorage.getItem("fst_settings")||"{}");}catch(e){_ex={};}
      _ex.prices=prices; _ex.ausbildung=AUSBILDUNG;
      localStorage.setItem("fst_settings",JSON.stringify(_ex));
    }catch(e){}
    // zentral in Supabase
    if(window.KVA_sb){
      window.KVA_sb.from("kva_settings").upsert({id:"default",prices:prices,ausbildung:AUSBILDUNG,updated_at:new Date().toISOString()}).then(function(){});
    }
    var s=q("set-saved");
    if(s){s.style.display="inline";setTimeout(function(){s.style.display="none";},2000);}
  }catch(e){}
}
function clearOd(){var od=q("od");if(od){od.value="";od.focus();}}
function clearOdPost(){var op=q("od-post");if(op){op.value="";op.focus();}}

// Ordner-Auswahl via Windows-Datei-Explorer
async function pickFolder(targetId){
  try{
    if(!window.showDirectoryPicker){
      alert("Ordnerauswahl wird von diesem Browser nicht unterst\u00fctzt.\nBitte Pfad manuell eingeben (z.B. C:\\Users\\...\\OneDrive).");
      return;
    }
    var dir=await window.showDirectoryPicker({mode:"readwrite"});
    var inp=q(targetId);
    if(inp){
      // Aktuellen Wert nehmen und letzten Ordner ersetzen / anhängen
      var cur=inp.value.trim();
      inp.value=cur?(cur.replace(/\\[^\\]*$/,"\\"+dir.name)):dir.name;
    }
  }catch(e){
    if(e.name!=="AbortError") console.warn("Ordnerauswahl:",e.message);
  }
}
function loadSettings(){
  // Erst lokal (sofort verfügbar)
  try{
    var d=localStorage.getItem("fst_settings");
    if(d){
      var p=JSON.parse(d);
      if(p.prices){
        CLS.forEach(function(c){
          var pr=p.prices[c.id];
          if(pr) Object.keys(pr).forEach(function(k){if(pr[k]!==undefined) c[k]=pr[k];});
        });
      }
      if(p.ausbildung) AUSBILDUNG=p.ausbildung;
    }
  }catch(e){}
  // Dann zentral aus Supabase (überschreibt, falls vorhanden)
  if(window.KVA_sb){
    window.KVA_sb.from("kva_settings").select("*").eq("id","default").single().then(function(res){
      var p=res&&res.data; if(!p) return;
      if(p.prices){
        CLS.forEach(function(c){
          var pr=p.prices[c.id];
          if(pr) Object.keys(pr).forEach(function(k){if(pr[k]!==undefined) c[k]=pr[k];});
        });
      }
      if(p.ausbildung) AUSBILDUNG=p.ausbildung;
      if(typeof renderPriceTable==="function") try{renderPriceTable();}catch(e){}
      if(typeof renderAusbildungTable==="function") try{renderAusbildungTable();}catch(e){}
    });
  }
}

// Stepper-Klick: zu abgeschlossenem Step springen
document.addEventListener("click",function(e){
  var si=e.target.closest(".si.clickable");
  if(si){
    var step=parseInt(si.dataset.step);
    if(!isNaN(step)&&step<S.step) go(step);
  }
});

// Logos
var LOGO_FST="data:image/jpeg;base64,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";
var LOGO_APV="data:image/jpeg;base64,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mtU2rikoO6usQ5gwHgkx+af9BKwki62C4kltfbKpp8eOB2fsyscddvrPEbylnz5fVGGPajUtPxDUaGfPl8d0/YXBRVot27WtrY1rDXsrWD8GsjDz/lDBWU2/fmr5C56did5uppyPscP9Kk6PaayntJuPrX0yTVv2z02rtNuL819Mk3Ioxg3x0u9o9JoLnAfHEbXj7HLnRby6Hk61VbH+dSv/ANC346tZy5VV7yVhr+nT5V4+/HzJARYL/df0J+VJvd6NJ+5bE282iIvm1FbL+ZSu/wBOFc9Us1zqx96L3renrnXj/wAkSCiiuq3106xhNHarlUO8nBkY+0rHqzfm6yEtoLBSwDwdPK6Q/UAP7VrVdesafOpn1Js0a3avS6XOrn1Jv9idVwrjd7XaKY1F0uFNSRgZ4ppA36s9VWy67oa2ubHNfenUkR/BpWNiH19ftXWW6x6n1RU95SW64XCRx51EgJA973cvtUZU7Txm+G2pOT/zoskLW7bxqS7uyoucvP6LLJkvm9unqLjhslPNdJhyD8GKLPvPM/AKL79uNq7Usvosta+CCQ8LaShBZx+wkes7/vyWWWLYy4TSNm1Dc4qWPqYKT13n2Fx5D4AqVLBovTemWA2q2RMmxg1Enryn6R5/UrPsuqah/ry7uHgvpz97Mf2HXNX/AOpn3VN9F9Fv737CF9L7QX+9OZUXgG00Z5lrxmZ49jfwfj9SmzTukrFpajMFnomxOcMSTO9aST85x5/Dou7RTdhpFvZLNNZl4vmdLpXZ+z03elHMv1Pd/wBvYERFJk2EREAREQBERAEREAREQBERAFiWuzgad/rqn/aWWrEdedNO/wBdU/7SAy5ERAEREBAm8uxN/wBfa9i1FpuvtNJx0rYalta6Rpc9hPC4cLHZ9UgeHzQut2p7O1/0fubR6m1NcrRVwUTHvgipHyOd3xHC0kOYBgAuPXrhWNRAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAWxVUdJWwGGspYaiM9WSsDx9RW+io0msMo0msMwq5bUaIuJLxajRvP4VJIY/s6fYsWrNh7e4k27UNVCPBs8LZPtGFLyKOraRZ1t5017NvkQ9x2f064y6lFZ8tvlggao2IvzSfRr1bph/yjHsP+lcF+ymsWHDJLXIPZO4f2tVh0WnLs3YvlFr2kdLsZpj5Ra9r/fJXX+4vrMnpbgfbUH/VW/Fsjq2Q4mqrVGPPvXu/sarBorV2Zsl0fvLF2K01dJe8g6l2FuBeDWaipox5Q07nf2kLIKPY3TUWDcLjcKsjwa5sTT9Qz9qlFFs09CsafKnn15Zu0ey2l0t1RT9bb+bwY3atAaPszg+isNL3g6STN7131uysja1rWhrWgAdAPBaopOnShSXDTikvImqNvSoR4aUVFeSwERFkMwREQBERAEREAREQBERAEREAREQBERAF0Op7LWXn5I9EkhZ6HcYquTvCRljc5AwDz5rvkQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREB//2Q==";
var LOGO_QR="data:image/png;base64,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";

// Daten
var CLS=[
  {id:"AM", l:"AM",      g:"Motorrad",gb:400,ust:76, soN:12,soD:"5 \u00dcberland, 4 Autobahn, 3 Nacht",soP:76, th:55,pr:145,lm:99,uw:49,n:8, ext:113.31,pfl:2},
  {id:"A1", l:"A1",      g:"Motorrad",gb:400,ust:77, soN:12,soD:"5 \u00dcberland, 4 Autobahn, 3 Nacht",soP:77, th:55,pr:145,lm:99,uw:49,n:8, ext:140.08,pfl:4,canStufe:1},
  {id:"A2", l:"A2",      g:"Motorrad",gb:400,ust:78, soN:12,soD:"5 \u00dcberland, 4 Autobahn, 3 Nacht",soP:78, th:55,pr:145,lm:99,uw:49,n:8, ext:166.26,pfl:4,canStufe:1},
  {id:"A",  l:"A",       g:"Motorrad",gb:400,ust:78, soN:12,soD:"5 \u00dcberland, 4 Autobahn, 3 Nacht",soP:78, th:55,pr:145,lm:99,uw:49,n:8, ext:166.26,pfl:4,canStufe:1},
  {id:"A2S",l:"A2 Stufe",g:"Motorrad",gb:400,ust:78, soN:6, soD:"3 \u00dcberland, 2 Autobahn, 1 Nacht (Stufenf\u00fchrerschein A1\u2192A2)",soP:78,th:55,pr:145,lm:99,uw:49,n:8,ext:166.26,pfl:4,stufe:1},
  {id:"AS", l:"A Stufe", g:"Motorrad",gb:400,ust:78, soN:6, soD:"3 \u00dcberland, 2 Autobahn, 1 Nacht (Stufenf\u00fchrerschein \u2192A)",soP:78,th:55,pr:145,lm:99,uw:49,n:8,ext:166.26,pfl:4,stufe:1},
  {id:"B",  l:"B",       g:"PKW",     gb:695,ust:76, soN:12,soD:"5 \u00dcberland, 4 Autobahn, 3 Nacht",soP:86, th:55,pr:145,lm:99,uw:49,n:22,ext:140.08,pfl:14},
  {id:"B196",l:"B196",   g:"PKW",     gb:250,ust:77, soN:0, soD:"keine Pflicht-Sonderfahrten",soP:0,th:0,pr:0,lm:0,uw:0,n:10,ext:0,pfl:5,fixedGb:1},
  {id:"B96",l:"B 96",    g:"PKW",     gb:75, ust:80, soN:0, soD:"keine Pflicht-Sonderfahrten",soP:0,th:0,pr:0,lm:0,uw:0,n:6,ext:0,pfl:3,fixedGb:1},
  // BE: Anlage 4 – B auf BE: 1 Überland, 1 Autobahn, 1 Nacht = 3 Sonderfahrten
  {id:"BE", l:"BE",      g:"PKW",     gb:50, ust:80, soN:5, soD:"3 \u00dcberland, 1 Autobahn, 1 Nacht (gem. Anlage\u202f4 B\u2192BE)",soP:80,th:0,pr:145,lm:0,uw:49,unt:49,n:1,ext:129.73,pfl:0,fixedGb:1,beFixed:1},
  // C1: Anlage 4 – B auf C1: 3 Überland, 1 Autobahn, 0 Nacht = 4 Sonderfahrten
  {id:"C1", l:"C1",      g:"LKW",     gb:695,ust:82, soN:4, soD:"3 \u00dcberland, 1 Autobahn, 0 Nacht (gem. Anlage\u202f4 B\u2192C1)",soP:92, th:55,pr:175,lm:99,uw:49,unt:49,n:10,ext:192.44,pfl:10},
  // C1E: Anlage 4 – Einzelerwerb C1 auf C1E: 3 Überland, 1 Autobahn, 0 Nacht = 4.
  //      Gemeinsamer Ausbildungsgang C1+C1E (Anlage 4): C1 Solo 1/1/0=2, C1E Zug 3/1/2=6, gesamt 8.
  {id:"C1E",l:"C1E",     g:"LKW",     gb:50, ust:87, soN:4, soD:"3 \u00dcberland, 1 Autobahn, 0 Nacht (gem. Anlage\u202f4 C1\u2192C1E)",soP:97, th:0,pr:185,lm:0,uw:49,unt:49,n:8,ext:182.09,pfl:6,fixedGb:1,canGem:1,gemSoN:6,gemUL:3,gemAB:1,gemNA:2,gemSoD:"3 \u00dcberland, 1 Autobahn, 2 Nacht (Zug-Anteil) \u2013 gemeinsamer Ausbildungsgang C1+C1E",gemPartner:"C1",gemPartnerSo:2,gemPartnerUL:1,gemPartnerAB:1,gemPartnerNA:0,gemPartnerSoD:"1 \u00dcberland, 1 Autobahn, 0 Nacht (Solo-Anteil)"},
  // C: Anlage 4 – B auf C (solo): 5 Überland, 2 Autobahn, 3 Nacht = 10 Sonderfahrten
  {id:"C",  l:"C",       g:"LKW",     gb:695,ust:87, soN:10,soD:"5 \u00dcberland, 2 Autobahn, 3 Nacht (gem. Anlage\u202f4 B\u2192C)",soP:97, th:55,pr:175,lm:99,uw:49,unt:49,n:15,ext:192.44,pfl:16},
  // CE: Anlage 4 – Einzelerwerb C auf CE: 3 Überland, 1 Autobahn, 1 Nacht = 5.
  //      Gemeinsamer Ausbildungsgang C+CE (Anlage 4): C Solo 3/1/0=4, CE Zug 5/2/3=10, gesamt 14.
  {id:"CE", l:"CE",      g:"LKW",     gb:550,ust:89, soN:5, soD:"3 \u00dcberland, 1 Autobahn, 1 Nacht (gem. Anlage\u202f4 C\u2192CE)",soP:99, th:55,pr:185,lm:99,uw:49,unt:49,n:12,ext:192.44,pfl:6,canGem:1,gemSoN:10,gemUL:5,gemAB:2,gemNA:3,gemSoD:"5 \u00dcberland, 2 Autobahn, 3 Nacht (Zug-Anteil) \u2013 gemeinsamer Ausbildungsgang C+CE",gemPartner:"C",gemPartnerSo:4,gemPartnerUL:3,gemPartnerAB:1,gemPartnerNA:0,gemPartnerSoD:"3 \u00dcberland, 1 Autobahn, 0 Nacht (Solo-Anteil)"},
  // D1/D/D1E/DE: Anlage 5 – Stunden je nach Vorbesitz; soN=0 da keine festen Sonderfahrten nach Anlage 4
  {id:"D1", l:"D1",      g:"Bus",     gb:695,ust:87, soN:0, soD:"Ausbildung nach Anlage\u202f5 FahrschAusbO (Stunden je nach Vorbesitz)",soP:90, th:55,pr:175,lm:99,uw:49,n:32,ext:192.44,pfl:10},
  {id:"D1E",l:"D1E",     g:"Bus",     gb:150,ust:87, soN:0, soD:"Ausbildung nach Anlage\u202f5 FahrschAusbO (Stunden je nach Vorbesitz)",soP:90, th:0,pr:185,lm:0,uw:49,n:9,ext:173.76,pfl:6,fixedGb:1},
  {id:"D",  l:"D",       g:"Bus",     gb:695,ust:97, soN:0, soD:"Ausbildung nach Anlage\u202f5 FahrschAusbO (Stunden je nach Vorbesitz)",soP:102,th:55,pr:175,lm:99,uw:49,unt:49,n:58,ext:192.44,pfl:10},
  {id:"DE", l:"DE",      g:"Bus",     gb:150,ust:102,soN:0, soD:"Ausbildung nach Anlage\u202f5 FahrschAusbO (Stunden je nach Vorbesitz)",soP:107,th:0,pr:185,lm:0,uw:49,unt:49,n:9,ext:173.76,pfl:6,fixedGb:1},
  {id:"T",  l:"T",       g:"Traktor", gb:595,ust:85, soN:0, soD:"keine Pflicht-Sonderfahrten",soP:0,th:55,pr:175,lm:99,uw:49,n:8,ext:166.26,pfl:6},
  {id:"L",  l:"L",       g:"Traktor", gb:550,ust:0,  soN:0, soD:"keine Pflicht-Sonderfahrten",soP:0,th:55,pr:0,lm:99,uw:0,n:0,ext:60.35,pfl:4},
  {id:"MOFA",l:"Mofa",   g:"Sonstige",gb:75,ust:0,soN:0,soD:"",soP:0,th:0,pr:0,lm:0,uw:0,n:0,ext:0,pfl:0,mofa:1}
];
var GROUPS=["PKW","Motorrad","LKW","Bus","Traktor","Sonstige"];
// Schulungen: PKW-Klassen immer zuerst
var COURSES=[
  {id:"c1",l:"GGVS Basis",p:319},{id:"c2",l:"GGVS Tank",p:260},{id:"c3",l:"GGVS Basis+Tank",p:550},
  {id:"c4",l:"GGVS Fortbildung",p:249},{id:"c5",l:"Gabelstaplerschulung",p:199},{id:"c6",l:"Ladungssicherung",p:259},
  {id:"c7",l:"Ladekranausbildung",p:399},{id:"c8",l:"ASF (Aufbauseminar)",p:450},{id:"c9",l:"FES (p\u00e4dagogisch)",p:250},
  {id:"c10",l:"Weiterbildung BKF",p:115},{id:"c11",l:"Grundqualifikation 140h",p:2480},{id:"c12",l:"Grundqualifikation 35h",p:980},
  {id:"c13",l:"Sach- und Fachkunde",p:1500}
];
var TUV=[
  {id:"t1",l:"Einzelpr\u00fcfung Deutsch/Audio",p:35.94},
  {id:"t2",l:"Je weitere Klasse im selben Termin",p:9.28},
  {id:"t3",l:"Mofa-Pr\u00fcfbescheinigung",p:34.39},
  {id:"t4",l:"Mofa-Ersatzbescheinigung",p:35.94},
  {id:"t5",l:"Eignungsgutachten \u00a7\u202f11 FeV umfangreich",p:213.25},
  {id:"t6",l:"Eignungsgutachten \u00a7\u202f11 FeV einfach",p:106.51},
  {id:"t7",l:"Automatikaufhebung Kl.\u202fA1/A2/A",p:143.75},
  {id:"t8",l:"Automatikaufhebung Kl.\u202fB/BE",p:106.27},
  {id:"t9",l:"Automatikaufhebung Kl.\u202fC/CE/C1/C1E",p:172.79},
  {id:"t10",l:"Automatikaufhebung Kl.\u202fDE/D1E",p:163.15}
];
var STEPS=["Bewerber","Klassen","Stunden","Positionen","Rabatte","Abschluss"];
function makeKvaId(){
  var y=new Date().getFullYear();
  // Zufällige, eindeutige Kennung – kein fortlaufender Zähler.
  // Funktioniert geräteübergreifend ohne gemeinsamen Speicher.
  // Verwechslungsarme Zeichen (ohne 0/O/1/I/L).
  var chars="ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  var code="";
  var rnd;
  if(window.crypto&&window.crypto.getRandomValues){
    var buf=new Uint32Array(5);
    window.crypto.getRandomValues(buf);
    for(var i=0;i<5;i++) code+=chars.charAt(buf[i]%chars.length);
  } else {
    for(var j=0;j<5;j++) code+=chars.charAt(Math.floor(Math.random()*chars.length));
  }
  return "KVA-"+y+"-"+code;
}

// State
var S={
  step:0,c:{anrede:"",company:"",contact:"",name:"",street:"",plz:"",city:"",email:"",phone:"",date:todayStr()},
  mofa:false,sel:[],courses:{},tuv:{},custom:[],ust:{},so:{},itemOvr:{},
  disc:{mofa:false,geschwister:false,erweiterung:false,sonder:false},
  soPct:0,notes:"",kva:makeKvaId(),infoBlatt:false,dVorbesitz:0,hatFL:false
};
function saveState(){
  // Lokaler Schnellzugriff (Entwurf) bleibt im Browser, damit nichts verloren geht
  try{ localStorage.setItem("fst_kva3_draft",JSON.stringify(S)); }catch(e){}
  // Ins Supabase-Archiv schreiben (nur wenn Name oder Klassen vorhanden)
  if(window.KVA_sb && (S.c.name||S.sel.length)){
    KVA_saveToSupabase();
  }
}
async function KVA_saveToSupabase(){
  try{
    var snap={
      kva_nr:S.kva,
      kunde_name:S.c.name||"–",
      klassen:getSel().map(function(c){return c.l;}).join(", ")||"–",
      datum:new Date().toISOString().slice(0,10),
      state:S
    };
    await window.KVA_sb.from("kva_archiv").upsert(snap,{onConflict:"kva_nr"});
    if(window.logAenderung) window.logAenderung('kva','KVA gespeichert', (snap.kva_nr||'')+' · '+(snap.kunde_name||''));
  }catch(e){ console.warn("KVA speichern:",e); }
}
function loadState(){
  try{localStorage.removeItem("fst_kva_counter");}catch(e){}
  try{
    var d=localStorage.getItem("fst_kva3_draft");
    if(d){
      var p=JSON.parse(d);
      if(p&&p.kva){
        var savedKva=p.kva;
        Object.assign(S,p);
        if(/^KVA-\\d{4}-\\d+$/.test(savedKva)) savedKva=makeKvaId();
        S.kva=savedKva;
      }
    }
  }catch(e){}
}
/* loadState wird von renderKVA aufgerufen */
// Einstellungen laden sobald DOM bereit (Inputs existieren)
/* loadSettings wird von renderKVA aufgerufen */
function todayStr(){return new Date().toISOString().slice(0,10);}
function fmt(n){return (+(n||0)).toFixed(2).replace(".",",")+"\u202f\u20ac";}
function esc(s){return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function q(id){return document.getElementById(id);}
function getSel(){return S.sel.map(function(id){return CLS.find(function(c){return c.id===id;});}).filter(Boolean);}
function calcGB(cls,all){
  if(cls.fixedGb||cls.mofa) return cls.gb;
  var el=all.filter(function(c){return !c.fixedGb&&!c.mofa;});
  if(el.length<=1) return cls.gb;
  var h=getHaupt(all);
  if(cls.id===h.id) return cls.gb;
  var GRUND=12, spez=cls.pfl||0;
  if(!spez) return cls.gb;
  // Die 12 Grundstunden werden über die Hauptklasse abgeleistet; die Zweitklasse
  // zahlt nur ihren klassenspezifischen Theorieanteil (spez von gesamt 12+spez).
  return Math.round((cls.gb*spez/(GRUND+spez))*100)/100;
}
function getHaupt(all){var el=all.filter(function(c){return !c.fixedGb&&!c.mofa;});if(!el.length)return null;var b=el.filter(function(c){return c.id==="B";})[0];if(b)return b;return el.reduce(function(a,b){return b.gb>a.gb?b:a;});}
function buildItems(){
  var items=[],all=getSel(),h=getHaupt(all);
  var ethTh=all.filter(function(c){return !c.fixedGb&&!c.mofa;});
  var lmFirst=(h&&h.lm>0)?h:all.find(function(c){return c.lm>0;});
  all.forEach(function(cls){
    if(cls.mofa){
      items.push({l:"Mofa-Grundgeb\u00fchr",p:cls.gb,cat:cls.l,erw:0});
      return;
    }
    var gb=calcGB(cls,all),rab=cls.gb-gb,isE=rab>0.01,isH=h&&cls.id===h.id;
    var spez=cls.pfl||0,gesStd=12+spez;
    items.push({l:isE?"Grundbetrag (Mehrklassenvorteil)":"Grundbetrag",p:gb,cat:cls.l,erw:rab,note:isE?"Regul\u00e4r "+fmt(cls.gb)+" ("+gesStd+" Theoriestd.) \u2013 12 Grundstd. \u00fcber Klasse "+(h?h.l:"")+" abgedeckt, nur "+spez+" klassenspez. Std. berechnet \u00b7 Vorteil -"+fmt(rab):null});
    if(cls.lm){
      if(lmFirst&&cls.id===lmFirst.id){items.push({l:"Lehrmaterial/Lernmittel",p:cls.lm,cat:cls.l,erw:0});}
      else items.push({l:"Lehrmaterial/Lernmittel",p:0,cat:cls.l,erw:0,gratis:1,note:"Bereits in Klasse "+(lmFirst?lmFirst.l:"")+" enthalten"});
    }
    var ustN=S.ust[cls.id]!==undefined?+S.ust[cls.id]:cls.n;
    if(cls.beFixed){
      if(ustN>0) items.push({l:"\u00dcbungsfahrt"+(ustN!==1?"en":"")+" ("+ustN+"\u202fx\u202f"+cls.ust+"\u202fEUR)",p:cls.ust*ustN,cat:cls.l,erw:0,_qty:ustN,_unit:cls.ust});
    } else if(cls.ust&&ustN>0){
      items.push({l:"\u00dcbungsstunden ("+ustN+"\u202fx\u202f"+cls.ust+"\u202fEUR)",p:cls.ust*ustN,cat:cls.l,erw:0,_qty:ustN,_unit:cls.ust});
    }
    var soN=S.so[cls.id]!==undefined?+S.so[cls.id]:cls.soN;
    if(soN>0&&cls.soP>0) items.push({l:"Sonderfahrten ("+soN+"\u202fx\u202f"+cls.soP+"\u202fEUR) \u2013 "+cls.soD,p:cls.soP*soN,cat:cls.l,erw:0,_qty:soN,_unit:cls.soP,_soD:cls.soD});
    if(cls.unt) items.push({l:"Unterweisung",p:cls.unt,cat:cls.l,erw:0});
    if(cls.th){
      if(ethTh.length<=1||isH) items.push({l:"Theoretische Pr\u00fcfung",p:cls.th,cat:cls.l,erw:0});
      else items.push({l:"Theoretische Pr\u00fcfung \u2013 entf\u00e4llt",p:0,cat:cls.l,erw:0,gratis:1,note:"Theorie gemeinsam mit Klasse "+(h?h.l:"")+" absolviert"});
    }
    if(cls.pr) items.push({l:"Praktische Pr\u00fcfung",p:cls.pr,cat:cls.l,erw:0});
    var rest=cls.ext-(cls.th||0)-(cls.pr||0);
    if(rest>0.01) items.push({l:"T\u00dcV-Geb\u00fchren (Grundfahraufg.)",p:rest,cat:cls.l,erw:0});
  });
  TUV.forEach(function(e){if(S.tuv[e.id]) items.push({l:e.l,p:e.p,cat:"Zus\u00e4tzliche T\u00dcV-Geb\u00fchren",erw:0});});
  // Apply item overrides (label, qty, price)
  if(!S.itemOvr) S.itemOvr={};
  items.forEach(function(it,i){
    var key=it.cat+"__"+i;
    it._key=key;
    var ov=S.itemOvr[key];
    if(ov){
      if(ov.l!==undefined) it.l=ov.l;
      if(ov.p!==undefined) it.p=ov.p;
      if(ov.qty!==undefined) it._qty=ov.qty;
      if(ov.unit!==undefined) it._unit=ov.unit;
    }
  });
  // Schulungen: PKW zuerst, dann weitere
  var sortedCourses=COURSES.slice().sort(function(a,b){return (b.pkw?1:0)-(a.pkw?1:0);});
  sortedCourses.forEach(function(c){if(S.courses[c.id]) items.push({l:c.l,p:c.p,cat:"Schulung",erw:0});});
  S.custom.forEach(function(cl){if(cl.l&&cl.p>0) items.push({l:cl.l,p:cl.p,cat:"Sonstiges",erw:0});});
  return items;
}
function calcD(items){
  var tErw=items.reduce(function(s,i){return s+i.erw;},0);
  var sub=items.reduce(function(s,i){return s+i.p;},0);
  var mEur=S.disc.mofa?75:0;
  // Geschwister/Erweiterung/Sonder nur wenn mind. eine Klasse außer B96/B196 gewählt
  var all=getSel();
  var hasRabattKlasse=all.some(function(c){return c.id!=="B96"&&c.id!=="B196"&&!c.mofa;});
  var gEur=hasRabattKlasse&&S.disc.geschwister?200:0;
  var eEur=hasRabattKlasse&&S.disc.erweiterung?200:0;
  var sp=parseFloat(S.soPct)||0;
  var sEur=hasRabattKlasse&&S.disc.sonder&&sp>0?(sub-mEur)*sp/100:0;
  var opts=[];
  if(gEur>0) opts.push({l:"Geschwisterrabatt",v:gEur});
  if(eEur>0) opts.push({l:"Erweiterungsrabatt",v:eEur});
  if(sEur>0) opts.push({l:"Sonderrabatt ("+sp+"%)",v:sEur});
  opts.sort(function(a,b){return b.v-a.v;});
  var aL=opts.length?opts[0].l:null,aV=opts.length?opts[0].v:0;
  var iL=opts.slice(1).map(function(o){return o.l+" ("+fmt(o.v)+")";}).join(", ")||null;
  return {tErw:tErw,sub:sub,mEur:mEur,aL:aL,aV:aV,iL:iL,total:Math.max(0,sub-mEur-aV),tSav:tErw+mEur+aV};
}

// Aktionen
function go(n){S.step=n;window.scrollTo(0,0);saveState();render();}
function setMofa(v){S.mofa=v;S.disc.mofa=v;saveState();render();}
function addLine(){S.custom.push({l:"",p:0});render();}
function rmLine(i){S.custom.splice(i,1);render();}
function resetAll(){
  saveState(); // aktuellen KVA ins Archiv sichern bevor Reset
  S.c={anrede:"",company:"",contact:"",name:"",street:"",plz:"",city:"",email:"",phone:"",date:todayStr()};
  S.mofa=false;S.sel=[];S.courses={};S.tuv={};S.custom=[];S.ust={};S.so={};S.itemOvr={};
  S.disc={mofa:false,geschwister:false,erweiterung:false,sonder:false};
  S.soPct=0;S.notes="";S.infoBlatt=false;S.dVorbesitz=0;S.hatFL=false;
  S.kva=makeKvaId();
  saveState();go(0);
}


function closeKvaModal(){var m=document.getElementById("kva-open-modal");if(m)m.remove();}
async function openKvaDialog(){
  var arch=[];
  if(window.KVA_sb){
    try{
      var res=await window.KVA_sb.from("kva_archiv").select("kva_nr,kunde_name,klassen,datum").order("datum",{ascending:false}).limit(200);
      arch=(res.data||[]).map(function(r){return {kva:r.kva_nr,name:r.kunde_name||"–",klassen:r.klassen||"–",date:r.datum};});
    }catch(e){ console.warn(e); }
  }
  if(!arch.length){alert("Noch keine gespeicherten KVAs vorhanden.\n\nKVAs werden automatisch gespeichert, sobald du einen Namen oder eine Klasse eingibst.");return;}
  var existing=document.getElementById("kva-open-modal");
  if(existing) existing.remove();
  var overlay=document.createElement("div");
  overlay.id="kva-open-modal";
  overlay.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;";
  var box=document.createElement("div");
  box.style.cssText="background:#fff;border-radius:14px;max-width:700px;width:100%;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.3);overflow:hidden;";
  var head=document.createElement("div");
  head.style.cssText="background:linear-gradient(135deg,#3F4B57,#2A6CAE);padding:16px 20px;display:flex;align-items:center;justify-content:space-between;";
  var htxt=document.createElement("div");
  htxt.innerHTML="<div style='color:#fff;font-size:16px;font-weight:700;'>&#128194; KVA öffnen</div><div style='color:#94a3b8;font-size:11px;margin-top:2px;'>"+arch.length+" gespeicherte KVA(s)</div>";
  var hclose=document.createElement("button");
  hclose.innerHTML="&#10005;";
  hclose.style.cssText="background:rgba(255,255,255,.15);border:none;color:#fff;cursor:pointer;border-radius:50%;width:30px;height:30px;font-size:16px;";
  hclose.onclick=function(){overlay.remove();};
  head.appendChild(htxt);head.appendChild(hclose);
  var body=document.createElement("div");
  body.style.cssText="overflow-y:auto;flex:1;";
  var tbl=document.createElement("table");
  tbl.style.cssText="width:100%;border-collapse:collapse;";
  tbl.innerHTML="<thead><tr style='background:#f8fafc;border-bottom:2px solid #e2e8f0;'>"
    +"<th style='padding:8px 10px;text-align:left;font-size:11px;color:#64748b;font-weight:600;'>KVA-Nr.</th>"
    +"<th style='padding:8px 10px;text-align:left;font-size:11px;color:#64748b;font-weight:600;'>Name</th>"
    +"<th style='padding:8px 10px;text-align:left;font-size:11px;color:#64748b;font-weight:600;'>Klassen</th>"
    +"<th style='padding:8px 10px;text-align:left;font-size:11px;color:#64748b;font-weight:600;'>Datum</th>"
    +"<th style='padding:4px;'></th></tr></thead>";
  var tbody=document.createElement("tbody");
  arch.forEach(function(a,i){
    var tr=document.createElement("tr");
    tr.style.cssText="border-bottom:1px solid #f0f0f0;cursor:pointer;";
    tr.innerHTML="<td style='padding:8px 10px;font-weight:700;color:#3F4B57;font-size:12px;'>"+esc(a.kva)+"</td>"
      +"<td style='padding:8px 10px;font-size:13px;'>"+esc(a.name)+"</td>"
      +"<td style='padding:8px 10px;font-size:12px;color:#666;'>"+esc(a.klassen)+"</td>"
      +"<td style='padding:8px 10px;font-size:11px;color:#999;'>"+esc(a.date)+"</td>"
      +"<td style='padding:8px 6px;text-align:center;'></td>";
    var delbtn=tr.querySelector("td:last-child");
    var db=document.createElement("button");
    db.innerHTML="&#10005;"; db.title="Löschen";
    db.style.cssText="background:none;border:none;color:#e53;cursor:pointer;font-size:15px;padding:2px 6px;";
    db.onclick=function(ev){ev.stopPropagation();deleteKvaFromArch(a.kva,overlay);};
    delbtn.appendChild(db);
    tr.onclick=function(){loadKvaFromArch(a.kva,overlay);};
    tr.onmouseenter=function(){this.style.background="#eef4fb";};
    tr.onmouseleave=function(){this.style.background="";};
    tbody.appendChild(tr);
  });
  tbl.appendChild(tbody);
  body.appendChild(tbl);
  var foot=document.createElement("div");
  foot.style.cssText="padding:12px 16px;border-top:1px solid #f0f0f0;display:flex;justify-content:flex-end;";
  var cancelbtn=document.createElement("button");
  cancelbtn.textContent="Abbrechen";
  cancelbtn.style.cssText="padding:8px 18px;border:1.5px solid #ddd;border-radius:8px;background:#fff;color:#555;cursor:pointer;font-size:13px;";
  cancelbtn.onclick=function(){overlay.remove();};
  foot.appendChild(cancelbtn);
  box.appendChild(head);box.appendChild(body);box.appendChild(foot);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}
async function loadKvaFromArch(kvaNr, overlay){
  if(!window.KVA_sb) return;
  try{
    var res=await window.KVA_sb.from("kva_archiv").select("state").eq("kva_nr",kvaNr).single();
    if(res.data&&res.data.state){
      S=typeof res.data.state==="string"?JSON.parse(res.data.state):res.data.state;
      saveState();
      if(overlay) overlay.remove();
      go(0);
    }
  }catch(e){ alert("Konnte KVA nicht laden."); }
}
async function deleteKvaFromArch(kvaNr, overlay){
  if(!confirm("Diesen KVA wirklich löschen?")) return;
  if(!window.KVA_sb) return;
  try{
    await window.KVA_sb.from("kva_archiv").delete().eq("kva_nr",kvaNr);
    if(window.logAenderung) window.logAenderung('kva','KVA gelöscht', kvaNr);
    if(overlay) overlay.remove();
    openKvaDialog();
  }catch(e){ alert("Löschen fehlgeschlagen."); }
}

// Stufenführerschein-Modal
function showGemModal(clsId){
  var cls=CLS.find(function(c){return c.id===clsId;});
  if(!cls) return;
  var partner=clsId==="C1E"?"C1":"C";
  var partnerInSel=S.sel.indexOf(partner)>=0;
  var gesamt=cls.gemSoN+(cls.gemPartnerSo||0);
  var mc=q("modal-container");
  mc.innerHTML="<div class='modal-bg'><div class='modal'>"
    +"<div style='font-size:16px;font-weight:800;color:#3F4B57;margin-bottom:6px;'>Klasse "+esc(clsId)+" \u2013 Gemeinsamer Erwerb?</div>"
    +"<div style='font-size:13px;color:#555;margin-bottom:12px;line-height:1.6;'>"
    +"Wird Klasse <strong>"+esc(clsId)+"</strong> gleichzeitig mit Klasse <strong>"+partner+"</strong> erworben?<br><br>"
    +"<strong>Ja \u2013 gemeinsamer Ausbildungsgang (gem. Anlage\u202f4):</strong><br>"
    +"<span style='color:#2A6CAE;font-size:12px;'>\u2022 "+partner+" (Solo): "+esc(cls.gemPartnerSoD||"")+" = "+(cls.gemPartnerSo||0)+"</span><br>"
    +"<span style='color:#2A6CAE;font-size:12px;'>\u2022 "+esc(clsId)+" (Zug): "+esc(cls.gemSoD)+" = "+cls.gemSoN+"</span><br>"
    +"<span style='font-size:11px;color:#888;'>Gesamt "+gesamt+" Sonderfahrten f\u00fcr beide Klassen zusammen.</span>"
    +(partnerInSel?"":"<br><span style='font-size:11px;color:#C0001A;'>Hinweis: Klasse "+partner+" ist derzeit nicht ausgew\u00e4hlt \u2013 f\u00fcr den gemeinsamen Gang sollte sie mit erfasst sein.</span>")
    +"<br><br>"
    +"<strong>Nein \u2013 Einzelerwerb:</strong><br>"
    +"<span style='color:#555;font-size:12px;'>"+esc(cls.soD)+"</span><br>"
    +"<span style='font-size:11px;color:#888;'>("+cls.soN+" Sonderfahrten gem. Anlage\u202f4)</span>"
    +"</div>"
    +"<div style='display:flex;gap:10px;'>"
    +"<button class='yb og' style='flex:1;' onclick='selectGem(\""+clsId+"\",true)'>Ja \u2013 gemeinsam mit "+partner+"</button>"
    +"<button class='yb of' style='flex:1;' onclick='selectGem(\""+clsId+"\",false)'>Nein \u2013 Einzelerwerb</button>"
    +"</div></div></div>";
}
function selectGem(clsId,isGem){
  q("modal-container").innerHTML="";
  var cls=CLS.find(function(c){return c.id===clsId;});
  if(cls){
    if(isGem){
      // Anhängerklasse (C1E/CE) bekommt den Zug-Anteil …
      S.so[clsId]=cls.gemSoN;
      // … und die Hauptklasse (C1/C) wird auf den reduzierten Solo-Anteil gesetzt,
      //    sofern sie überhaupt mit ausgewählt ist (gemeinsamer Ausbildungsgang).
      if(cls.gemPartner && cls.gemPartnerSo!=null && S.sel.indexOf(cls.gemPartner)>=0){
        S.so[cls.gemPartner]=cls.gemPartnerSo;
      }
    } else {
      delete S.so[clsId];
      if(cls.gemPartner) delete S.so[cls.gemPartner];
    }
  }
  saveState();render();
}

function showStufeModal(clsId){
  var mc=q("modal-container");
  mc.innerHTML="<div class='modal-bg'><div class='modal'>"
    +"<div style='font-size:16px;font-weight:800;color:#3F4B57;margin-bottom:6px;'>Klasse "+esc(clsId)+" \u2013 Stufenf\u00fchrerschein?</div>"
    +"<div style='font-size:13px;color:#555;margin-bottom:16px;line-height:1.6;'>Besitzt der Bewerber bereits eine niedrigere Motorradklasse (A1\u2192A2 oder A2\u2192A)? Dann gelten reduzierte Pflicht-Sonderfahrten und Erweiterungsrabatt statt Geschwisterrabatt.</div>"
    +"<div style='display:flex;gap:10px;'>"
    +"<button class='yb og' style='flex:1;' onclick='selectStufe(\""+clsId+"\",true)'>Ja \u2013 Stufenf\u00fchrerschein</button>"
    +"<button class='yb of' style='flex:1;' onclick='selectStufe(\""+clsId+"\",false)'>Nein \u2013 Direkteinstieg</button>"
    +"</div></div></div>";
}
function selectStufe(clsId,isStufe){
  q("modal-container").innerHTML="";
  if(isStufe){
    var stufeId=clsId+"S";
    var idx=S.sel.indexOf(clsId);
    if(idx>=0) S.sel.splice(idx,1);
    if(S.sel.indexOf(stufeId)<0) S.sel.push(stufeId);
  }
  saveState();render();
}

function showVorbesitzModal(){
  var a=AUSBILDUNG["D"];
  if(!a||!a.vorbesitz){saveState();render();return;}
  var mc=q("modal-container");
  if(!mc) return;
  var opts="";
  a.vorbesitz.forEach(function(v,i){
    opts+="<button class='yb' style='text-align:left;padding:10px 14px;font-size:12px;line-height:1.5;' onclick='selectVorbesitz("+i+")'>"
      +"<strong style='color:#2A6CAE;'>"+esc(v.label)+"</strong><br>"
      +"<span style='font-size:11px;color:#555;'>Grundausbildung: "+v.gs+" Std. &nbsp;|&nbsp; Sonderfahrten: "+(v.ul+v.ab+v.na)+" ("+v.ul+" \u00dcL, "+v.ab+" AB, "+v.na+" N)</span>"
      +"</button>";
  });
  mc.innerHTML="<div style='position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:999;display:flex;align-items:center;justify-content:center;padding:16px;'>"
    +"<div style='background:#fff;border-radius:14px;padding:20px;max-width:420px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,.25);'>"
    +"<div style='font-size:15px;font-weight:800;color:#2A6CAE;margin-bottom:4px;'>&#128652; Klasse D \u2014 Vorbesitz</div>"
    +"<div style='font-size:12px;color:#666;margin-bottom:14px;'>Die Anzahl der Pflicht-Fahrstunden richtet sich nach dem vorhandenen F\u00fchrerschein.</div>"
    +"<div style='display:flex;flex-direction:column;gap:8px;'>"+opts+"</div>"
    +"<button onclick='selectVorbesitz(S.dVorbesitz||0)' style='margin-top:14px;width:100%;background:#f5f5f5;border:1px solid #ddd;border-radius:8px;padding:8px;font-size:12px;color:#888;cursor:pointer;'>Sp\u00e4ter festlegen</button>"
    +"</div></div>";
}

function selectVorbesitz(idx){
  S.dVorbesitz=idx;
  // Stunden und Sonderfahrten direkt in die CLS-Daten schreiben
  var a=AUSBILDUNG["D"];
  var clsD=CLS.find(function(c){return c.id==="D";});
  if(clsD&&a&&a.vorbesitz&&a.vorbesitz[idx]){
    var vb=a.vorbesitz[idx];
    clsD.soN=vb.ul+vb.ab+vb.na;
    clsD.n=vb.gs;
    clsD.soD=vb.ul+" \u00dcberland, "+vb.ab+" Autobahn, "+vb.na+" Nacht";
    // S.so und S.ust zurücksetzen damit Werte aus CLS gelten
    delete S.so["D"];
    delete S.ust["D"];
  }
  q("modal-container").innerHTML="";
  saveState();render();
}

document.addEventListener("click",function(e){
  var t=e.target.closest("[data-act]");
  if(!t) return;
  var act=t.dataset.act,id=t.dataset.id,val=t.dataset.val;
  if(act==="cls"){
    var i=S.sel.indexOf(id);
    var stufeId=id+"S";
    var si=S.sel.indexOf(stufeId);
    if(i>=0||si>=0){
      if(i>=0) S.sel.splice(i,1);
      var si2=S.sel.indexOf(stufeId);
      if(si2>=0) S.sel.splice(si2,1);
      // Gemeinsam-Einstellung zurücksetzen beim Abwählen
      var clsDel=CLS.find(function(c){return c.id===id;});
      if(clsDel&&clsDel.canGem) delete S.so[id];
      saveState();render();
    } else {
      S.sel.push(id);
      var cls=CLS.find(function(c){return c.id===id;});
      if(cls&&cls.canStufe){saveState();showStufeModal(id);}
      else if(cls&&cls.canGem){saveState();showGemModal(id);}
      else if(id==="D"){saveState();showVorbesitzModal();}
      else{saveState();render();}
    }
  }
  else if(act==="course"){S.courses[id]=!S.courses[id];saveState();render();}
  else if(act==="tuv"){S.tuv[id]=!S.tuv[id];saveState();render();}
  else if(act==="disc"){S.disc[id]=!S.disc[id];saveState();render();}
  else if(act==="hatFL"){
    S.hatFL=!S.hatFL;
    // Grundstunden anpassen: 12 DS -> 6 DS wenn FL vorhanden, sonst zurueck auf Default
    Object.keys(AUSBILDUNG).forEach(function(k){
      var def=AUSBILDUNG_DEFAULTS[k];
      if(!def||def.gs===0) return; // Klassen ohne GS (BE, CE etc.) nicht anfassen
      if(S.hatFL) {
        // Reduzieren: max 6 DS (nie mehr als der Default, nie weniger als 0)
        AUSBILDUNG[k].gs=Math.min(def.gs,6);
      } else {
        // Zurueck auf Default
        AUSBILDUNG[k].gs=def.gs;
      }
    });
    saveState();render();
    if(typeof renderAusbildungTable==="function") try{renderAusbildungTable();}catch(e){}
  }
  else if(act==="mofa"){setMofa(val==="1");}
  else if(act==="anrede"){S.c.anrede=(S.c.anrede===val?"":val);if(S.c.anrede!=="Firma"){S.c.company="";S.c.contact="";}saveState();render();}
  else if(act==="go"){go(+id);}
  else if(act==="ust-"){var c2=CLS.find(function(c){return c.id===id;});if(c2){S.ust[id]=Math.max(0,(S.ust[id]!==undefined?+S.ust[id]:c2.n)-1);saveState();render();}}
  else if(act==="ust+"){var c3=CLS.find(function(c){return c.id===id;});if(c3){S.ust[id]=(S.ust[id]!==undefined?+S.ust[id]:c3.n)+1;saveState();render();}}
  else if(act==="ustr"){delete S.ust[id];saveState();render();}
  else if(act==="so-"){var c4=CLS.find(function(c){return c.id===id;});if(c4){S.so[id]=Math.max(0,(S.so[id]!==undefined?+S.so[id]:c4.soN)-1);saveState();render();}}
  else if(act==="so+"){var c5=CLS.find(function(c){return c.id===id;});if(c5){S.so[id]=(S.so[id]!==undefined?+S.so[id]:c5.soN)+1;saveState();render();}}
  else if(act==="sor"){delete S.so[id];saveState();render();}
  else if(act==="rmline"){rmLine(+id);}
  else if(act==="addline"){addLine();}
  else if(act==="resetall"){if(confirm("Neuen KVA starten? Alle Eingaben werden gel\u00f6scht."))resetAll();}
  else if(act==="print"){updatePrintArea();window.print();}
  else if(act==="mail"){sendMail();}
  else if(act==="save"){kvaPdfSpeichern();}
  else if(act==="postal"){sendPostal();}
});
document.addEventListener("input",function(e){
  var t=e.target,act=t.dataset.act,id=t.dataset.id;
  if(act==="field"){S.c[id]=t.value;if(id==="name"||id==="company"){var nb=q("nxt0");if(nb)nb.disabled=!((S.c.anrede==="Firma")?S.c.company:S.c.name);}saveState();}
  else if(act==="ust"){S.ust[id]=+t.value||0;saveState();render();}
  else if(act==="so"){S.so[id]=+t.value||0;saveState();render();}
  else if(act==="sopct"){S.soPct=t.value;saveState();render();}
  else if(act==="notes"){S.notes=t.value;saveState();}
  else if(act==="cline-l"){S.custom[+id].l=t.value;saveState();}
  else if(act==="ovr-l"){if(!S.itemOvr)S.itemOvr={};S.itemOvr[id]=S.itemOvr[id]||{};S.itemOvr[id].l=t.value;saveState();}
  else if(act==="ovr-p"){if(!S.itemOvr)S.itemOvr={};S.itemOvr[id]=S.itemOvr[id]||{};var v=parseFloat(t.value.replace(",","."));S.itemOvr[id].p=isNaN(v)?0:Math.round(v*100)/100;saveState();render();}
  else if(act==="ovr-qty"){if(!S.itemOvr)S.itemOvr={};S.itemOvr[id]=S.itemOvr[id]||{};var qty=parseFloat(t.value)||1;var unit=parseFloat(t.getAttribute("data-unit"))||0;var soD=t.getAttribute("data-sod")||"";S.itemOvr[id].qty=qty;S.itemOvr[id].unit=unit;S.itemOvr[id].p=Math.round(qty*unit*100)/100;if(soD) S.itemOvr[id].l="Sonderfahrten ("+qty+"\u202fx\u202f"+unit+"\u202fEUR) \u2013 "+soD;saveState();render();}
  else if(act==="ovr-unit"){if(!S.itemOvr)S.itemOvr={};S.itemOvr[id]=S.itemOvr[id]||{};var unit=parseFloat(t.value)||0;var qty=parseFloat(t.getAttribute("data-qty"))||1;var soD=t.getAttribute("data-sod")||"";var ustLbl=t.getAttribute("data-ust-lbl")||"";S.itemOvr[id].unit=unit;S.itemOvr[id].qty=qty;S.itemOvr[id].p=Math.round(qty*unit*100)/100;if(soD) S.itemOvr[id].l="Sonderfahrten ("+qty+"\u202fx\u202f"+unit+"\u202fEUR) \u2013 "+soD;else if(ustLbl) S.itemOvr[id].l=ustLbl.replace("{N}",qty).replace("{U}",unit);saveState();render();}
  else if(act==="cline-p"){S.custom[+id].p=parseFloat(t.value)||0;saveState();}
});

// Hilfsfunktionen
function odWerte(){
  var base="C:\\Users\\%USERNAME%\\OneDrive", sub="Fahrschule\\Kostenvoranschlaege";
  try{
    var d=JSON.parse(localStorage.getItem("fst_settings")||"{}");
    if(d.odBase) base=d.odBase;
    if(d.od!=null) sub=d.od;
  }catch(e){}
  var eb=q("od-base"); if(eb&&eb.value) base=eb.value;
  var eo=q("od");      if(eo&&eo.value!=null&&eo.value!=="") sub=eo.value;
  return {base:base.replace(/\\+$/,""), sub:(sub||"").trim()};
}
function getOdPath(){
  var w=odWerte();
  return w.sub ? w.base+"\\"+w.sub+"\\"+S.kva+".pdf" : w.base+"\\"+S.kva+".pdf";
}
function sendMail(){
  var items=buildItems(),dc=calcD(items);
  var td=new Date().toLocaleDateString("de-DE",{day:"2-digit",month:"long",year:"numeric"});
  var all=getSel(),klassen=all.map(function(c){return c.l;}).join(", ")||"\u2013";
  var nl="%0D%0A";
  var odPath=getOdPath();
  var vorname=(S.c.name||"").split(" ")[0]||"dort";
  var isFirma=S.c.anrede==="Firma"&&S.c.company;
  var body,subject;

  if(isFirma){
    // Förmliche Anrede an den Ansprechpartner, sonst allgemein
    var gruss;
    var ap=(S.c.contact||"").trim();
    if(/^(Herr|Frau)\b/i.test(ap)){
      gruss="Sehr geehrte"+(/^Herr\b/i.test(ap)?"r ":" ")+ap;
    } else if(ap){
      gruss="Sehr geehrte Damen und Herren, z.\u202fHd. "+ap;
    } else {
      gruss="Sehr geehrte Damen und Herren";
    }
    subject="Kostenvoranschlag "+S.kva+" \u2013 "+KVA_FIRMA.name;
    body=encodeURIComponent(gruss+",")+nl+nl
      +encodeURIComponent("vielen Dank f\u00fcr Ihr Interesse an einer Fahrausbildung bei uns. Gerne unterbreiten wir Ihnen das gew\u00fcnschte Angebot.")+nl+nl
      +encodeURIComponent("Kostenvoranschlag "+S.kva)+nl
      +encodeURIComponent("Im Anhang erhalten Sie den Kostenvoranschlag mit einer \u00fcbersichtlichen Aufstellung aller Leistungen:")+nl
      +encodeURIComponent("  \u2022 Ausbildungsklasse(n): "+klassen)+nl
      +encodeURIComponent("  \u2022 Alle enthaltenen Leistungen im Detail")+nl
      +encodeURIComponent("  \u2022 G\u00fcltigkeit: 4 Wochen ab "+td)+nl+nl
      +encodeURIComponent("Selbstverst\u00e4ndlich begleiten wir Ihre Mitarbeiterinnen und Mitarbeiter von der ersten Fahrstunde bis zum erfolgreichen Pr\u00fcfungsabschluss \u2013 mit erfahrenen Fahrlehrern und flexibler Terminplanung.")+nl+nl
      +encodeURIComponent("F\u00fcr R\u00fcckfragen oder eine individuelle Beratung stehen wir Ihnen jederzeit gerne zur Verf\u00fcgung.");
  } else {
    subject="Dein Kostenvoranschlag "+S.kva+" \u2013 "+KVA_FIRMA.name;
    body=encodeURIComponent("Hallo "+vorname+",")+nl+nl
    +encodeURIComponent("vielen Dank f\u00fcr deine Anfrage bei "+KVA_FIRMA.name+" \u2013 wir freuen uns \u00fcber dein Interesse!")+nl+nl
    +encodeURIComponent("Im Anhang findest du deinen pers\u00f6nlichen Kostenvoranschlag. Du wirst feststellen, dass er etwas umfangreicher ausgefallen ist \u2013 das ist so gewollt! Wir m\u00f6chten, dass du von Anfang an ein vollst\u00e4ndiges Bild hast und im Vorfeld m\u00f6glichst keine Fragen offenbleiben.")+nl+nl
    +encodeURIComponent("Wenn du dich anmelden m\u00f6chtest, hast du drei M\u00f6glichkeiten:")+nl+nl
    +encodeURIComponent("1. Online (jederzeit bequem von zu Hause):")+nl
    +encodeURIComponent("https://"+KVA_FIRMA.web+"/ausbildung-schulung/online-anmeldung/")+nl+nl
    +encodeURIComponent("2. Pers\u00f6nlich an unserer Hauptstelle zu den B\u00fcro\u00f6ffnungszeiten:")+nl
    +encodeURIComponent("Mo\u2013Do: 08:30 \u2013 13:00 Uhr")+nl
    +encodeURIComponent("Di & Do: 13:00 \u2013 16:30 Uhr")+nl+nl
    +encodeURIComponent("3. Direkt am Unterrichtsabend an deinem jeweiligen Standort:")+nl
    +encodeURIComponent("Die Schulungszeiten und Standorte findest du auf unserer Website unter dem Men\u00fcpunkt \u201eStandorte\u201c.")+nl+nl
    +encodeURIComponent("Solltest du noch Fragen haben oder etwas besprechen wollen, melde dich einfach \u2013 wir sind gerne f\u00fcr dich da!")+nl+nl
    +encodeURIComponent("Wir freuen uns darauf, dich bald bei uns begr\u00fc\u00dfen zu d\u00fcrfen.")+nl+nl
    +encodeURIComponent("Viele Gr\u00fc\u00dfe")+nl
    +encodeURIComponent("Dein "+KVA_FIRMA.name);
  }

  alert("Outlook \u00f6ffnet sich gleich! \uD83D\uDCE7\n\nBitte das PDF als Anhang hinzuf\u00fcgen!\nDatei: "+odPath+"\n\n1. Outlook \u00f6ffnet sich\n2. PDF per Drag & Drop einf\u00fcgen\n3. E-Mail versenden");

  var a=document.createElement("a");
  a.href="mailto:"+encodeURIComponent(S.c.email||"")
    +"?subject="+encodeURIComponent(subject)
    +"&body="+body;
  a.style.display="none";
  document.body.appendChild(a);
  a.click();
  setTimeout(function(){document.body.removeChild(a);},500);
}
function saveToOneDrive(){
  updatePrintArea();
  window.print();
}
function sendPostal(){
  if(!S.c.street||!S.c.city){
    alert("Bitte zuerst die vollst\u00e4ndige Adresse (Stra\u00dfe, PLZ, Ort) eingeben.");
    go(0);return;
  }
  updatePrintArea();
  alert("Der KVA wird jetzt gedruckt (DIN 5008, mit Falzmarken).\n\nVersandadresse:\n"+S.c.name+"\n"+S.c.street+"\n"+S.c.plz+" "+S.c.city+"\n\nBitte auf DIN-Lang-Umschlag falten (Falzmarken beachten).");
  window.print();
}
// Liefert die effektiven Sonderfahrten einer Klasse fürs Dokument –
// berücksichtigt den gemeinsamen Ausbildungsgang (C1+C1E bzw. C+CE).
function sfEffektiv(cls){
  var a=AUSBILDUNG[cls.id]||{ul:0,ab:0,na:0};
  var res={ul:a.ul,ab:a.ab,na:a.na,gem:false,anteil:""};
  // Anhängerklasse (C1E/CE) selbst im gemeinsamen Gang?
  if(cls.canGem && S.so[cls.id]===cls.gemSoN && cls.gemUL!=null){
    return {ul:cls.gemUL,ab:cls.gemAB,na:cls.gemNA,gem:true,anteil:"Zug-Anteil"};
  }
  // cls ist Hauptklasse (C1/C) eines aktiven gemeinsamen Gangs?
  for(var i=0;i<S.sel.length;i++){
    var sc=CLS.find(function(c){return c.id===S.sel[i];});
    if(sc && sc.canGem && sc.gemPartner===cls.id && S.so[sc.id]===sc.gemSoN && sc.gemPartnerUL!=null){
      return {ul:sc.gemPartnerUL,ab:sc.gemPartnerAB,na:sc.gemPartnerNA,gem:true,anteil:"Solo-Anteil"};
    }
  }
  return res;
}

function buildInfoBlatt(){
  var all=getSel().filter(function(c){return !c.mofa&&c.id!=="MOFA";});
  if(!all.length) return "";
  var name=S.c.anrede==="Firma"&&S.c.company?S.c.company:S.c.name;
  var klassen=all.map(function(c){return c.l;}).join(", ");
  var r="<div style='page-break-before:always;font-family:'Poppins','Segoe UI',Arial,sans-serif;font-size:9.5pt;color:#3F4B57;'>";
  // Kopfzeile
  r+="<div style='display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:5mm;border-bottom:2pt solid #C0001A;padding-bottom:4mm;'>";
  r+="<div><div style='font-size:7pt;color:#C0001A;font-weight:800;letter-spacing:2pt;text-transform:uppercase;margin-bottom:1mm;'>Ausbildungsinformationen</div>";
  r+="<div style='font-size:14pt;font-weight:900;color:#000;'>Ihr Weg zum F\u00fchrerschein</div>";
  r+="<div style='font-size:8.5pt;color:#555;margin-top:1mm;'>Klasse"+(all.length>1?"n":"")+": <strong>"+esc(klassen)+"</strong> &nbsp;&middot;&nbsp; "+esc(name||"\u2013")+" &nbsp;&middot;&nbsp; "+esc(S.kva)+"</div></div>";
  r+="<img src='"+LOGO_FST+"' alt='Fahrschulteam' style='height:12mm;width:auto;'/></div>";
  // Antragsunterlagen
  var hasLKW=all.some(function(c){return ["C1","C1E","C","CE"].indexOf(c.id)>=0;});
  var hasBus=all.some(function(c){return ["D1","D1E","D","DE"].indexOf(c.id)>=0;});
  var allLKWBus=hasLKW||hasBus;
  r+="<div style='background:transparent;border:none;padding:0;margin-bottom:5mm;page-break-inside:avoid;'>";
  r+="<div style='font-size:8pt;font-weight:800;color:#2A6CAE;text-transform:uppercase;letter-spacing:1pt;margin-bottom:4pt;'>Ben\u00f6tigte Antragsunterlagen</div>";
  r+="<div style='display:grid;grid-template-columns:1fr 1fr;gap:1mm 10mm;font-size:8.5pt;line-height:1.7;'>";
  var ul=["Personalausweis oder Reisepass","Biometrisches Passbild (35\u202f\u00d7\u202f45\u202fmm)"];
  // Sehtest nur für Nicht-LKW/Bus-Klassen, da diese ein ärztliches Gutachten benötigen
  var hasNonLKWBus=all.some(function(c){return ["C1","C1E","C","CE","D1","D1E","D","DE"].indexOf(c.id)<0;});
  if(hasNonLKWBus) ul.push("Sehtest-Bescheinigung (max. 2 Jahre alt)");
  ul.push("Erste-Hilfe-Kurs (9\u202fUE \u00e0 45\u202fMin., Pr\u00e4senz)");
  ul.push("Antrag auf Erteilung\/Erweiterung der Fahrerlaubnis");
  if(hasLKW){
    ul.push("Augen\u00e4rztliches Gutachten \/ Zeugnis (nicht \u00e4lter als 2 Jahre)");
    ul.push("\u00c4rztliche Untersuchungsbescheinigung (nicht \u00e4lter als 2 Jahre)");
  }
  if(hasBus){
    ul.push("Augen\u00e4rztliches Gutachten \/ Zeugnis (nicht \u00e4lter als 2 Jahre)");
    ul.push("\u00c4rztliche Untersuchungsbescheinigung inkl. Reaktionstest (nicht \u00e4lter als 2 Jahre)");
  }
  var needsCopy=all.some(function(c){return ["B","A","A1","A2","AM","T","L"].indexOf(c.id)<0;});
  if(needsCopy) ul.push("Kopie des vorhandenen F\u00fchrerscheins (Erweiterung)");
  ul.forEach(function(u){r+="<div style='display:flex;gap:3pt;'><span style='color:#2A6CAE;'>&#8227;</span><span>"+esc(u)+"</span></div>";});
  r+="</div>";
  r+="<div style='font-size:7.5pt;color:#444;margin-top:4pt;border-top:0.3pt solid #93c5fd;padding-top:3pt;'>&#9432;&nbsp; Die Fahrschule \u00fcbernimmt die Antragstellung. Bitte Unterlagen fr\u00fchzeitig einreichen \u2014 Bearbeitungszeit: 4\u20138 Wochen.<\/div><\/div>";
  // Klassen-Karten
  all.forEach(function(cls,idx){
    var a=AUSBILDUNG[cls.id];
    if(!a) return;
    var isLast=idx===all.length-1;
    var totalTh=a.gs+a.zs, totalSo=a.ul+a.ab+a.na;
    r+="<div style='margin-bottom:"+(isLast?"0":"5mm")+";page-break-inside:avoid;border:0.5pt solid #ddd;border-radius:3pt;overflow:hidden;'>";
    r+="<div style='background:#3F4B57;padding:5pt 8pt;'><span style='font-size:11pt;font-weight:900;color:#fff;'>Klasse "+esc(cls.l)+"</span></div>";
    // Vorbesitz für Klasse D aus State lesen
    if(cls.id==="D"&&a.vorbesitz){
      var vb=a.vorbesitz[S.dVorbesitz||0];
      r+="<div style='padding:4pt 8pt;background:#e8f4fd;border-bottom:0.5pt solid #2A6CAE;font-size:8pt;color:#2A6CAE;font-weight:700;'>&#128652; "+esc(vb.label)+"</div>";
      r+="<div style='display:grid;grid-template-columns:1fr 1fr;background:#fafafa;'>";
      r+="<div style='padding:6pt 8pt;border-right:0.5pt solid #eee;'>";
      r+="<div style='font-size:7.5pt;font-weight:800;color:#C0001A;text-transform:uppercase;letter-spacing:.8pt;margin-bottom:3pt;'>Grundausbildung</div>";
      r+="<div style='font-size:8.5pt;line-height:1.7;'><strong>"+vb.gs+" Fahrstunden</strong> \u00e0 45\u202fMin.<\/div><\/div>";
      r+="<div style='padding:6pt 8pt;'>";
      r+="<div style='font-size:7.5pt;font-weight:800;color:#C0001A;text-transform:uppercase;letter-spacing:.8pt;margin-bottom:3pt;'>Pflicht-Sonderfahrten</div>";
      r+="<div style='font-size:8.5pt;line-height:1.7;'>";
      r+="\u00dcberland: <strong>"+vb.ul+"</strong> \u00d7 45\u202fMin.<br>";
      r+="Autobahn: <strong>"+vb.ab+"</strong> \u00d7 45\u202fMin.<br>";
      r+="Nacht: <strong>"+vb.na+"</strong> \u00d7 45\u202fMin.<br>";
      r+="<span style='font-weight:700;color:#C0001A;'>Gesamt: "+(vb.ul+vb.ab+vb.na)+" Sonderfahrten<\/span>";
      r+="<\/div><\/div><\/div>";
      r+="<div style='padding:5pt 8pt;background:#fffde7;border-top:0.3pt solid #f9a825;font-size:8pt;line-height:1.6;'>";
      if(a.ue>0) r+="<strong>\u00d8 Erfahrungswert "+KVA_FIRMA.name+": ca. "+a.ue+" \u00dcbungsfahrstunden</strong> (je 45\u202fMin.) \u2014 &#9432; Abh\u00e4ngig von pers\u00f6nlichen F\u00e4higkeiten.";
      r+="<\/div><\/div>";
      return;
    }
    r+="<div style='display:grid;grid-template-columns:1fr 1fr;background:#fafafa;'>";
    // Theorie
    r+="<div style='padding:6pt 8pt;border-right:0.5pt solid #eee;'>";
    r+="<div style='font-size:7.5pt;font-weight:800;color:#C0001A;text-transform:uppercase;letter-spacing:.8pt;margin-bottom:3pt;'>Theorieausbildung</div>";
    if(totalTh>0){
      r+="<div style='font-size:8.5pt;line-height:1.7;'>";
      if(a.gs>0) r+="Grundstoff: <strong>"+a.gs+" DS</strong> \u00e0 90\u202fMin."+(S.hatFL&&a.gs<=6?" <span style='color:#C0001A;font-size:7.5pt;'>(reduziert gem. \u00a7\u202f5 FahrschAusbO)</span>":"")+"<br>";
      if(a.zs>0) r+="Zusatzstoff: <strong>"+a.zs+" DS</strong> \u00e0 90\u202fMin.<br>";
      r+="<span style='font-weight:700;color:#C0001A;'>Gesamt: "+totalTh+" Doppelstunden<\/span></div>";
    } else { r+="<div style='font-size:8.5pt;color:#777;font-style:italic;'>Theorie aus Vorklasse gilt<\/div>"; }
    r+="<\/div>";
    // Sonderfahrten – effektive Werte (gemeinsamer Ausbildungsgang berücksichtigt)
    var sf=sfEffektiv(cls);
    var totalSoEff=sf.ul+sf.ab+sf.na;
    r+="<div style='padding:6pt 8pt;'>";
    r+="<div style='font-size:7.5pt;font-weight:800;color:#C0001A;text-transform:uppercase;letter-spacing:.8pt;margin-bottom:3pt;'>Pflicht-Sonderfahrten"+(sf.gem?" <span style='color:#2A6CAE;'>("+sf.anteil+")</span>":"")+"</div>";
    if(totalSoEff>0){
      r+="<div style='font-size:8.5pt;line-height:1.7;'>";
      if(sf.ul>0) r+="\u00dcberland: <strong>"+sf.ul+"</strong> \u00d7 45\u202fMin.<br>";
      if(sf.ab>0) r+="Autobahn: <strong>"+sf.ab+"</strong> \u00d7 45\u202fMin.<br>";
      if(sf.na>0) r+="Nacht: <strong>"+sf.na+"</strong> \u00d7 45\u202fMin.<br>";
      r+="<span style='font-weight:700;color:#C0001A;'>Gesamt: "+totalSoEff+" Sonderfahrten<\/span></div>";
    } else { r+="<div style='font-size:8.5pt;color:#777;font-style:italic;'>Keine Pflicht-Sonderfahrten<\/div>"; }
    r+="<\/div></div>";
    // Hinweis
    r+="<div style='padding:5pt 8pt;background:#fffde7;border-top:0.3pt solid #f9a825;font-size:8pt;line-height:1.6;'>";
    if(a.ue>0){
      r+="<strong>\u00d8 Erfahrungswert "+KVA_FIRMA.name+": ca. "+a.ue+" \u00dcbungsfahrstunden</strong> (je 45\u202fMin.) \u2014 ";
      r+="&#9432; Anzahl abh\u00e4ngig von pers\u00f6nlichen F\u00e4higkeiten und individuellem Lernfortschritt.";
    }

    r+="<\/div>";
    // BF17-Zusatzblock nur bei Klasse B
    if(cls.id==="B"){
      r+="<div style='padding:5pt 8pt;background:#fff0f0;border-top:0.3pt solid #C0001A;font-size:8pt;line-height:1.7;'>";
      r+="<div style='font-size:7.5pt;font-weight:800;color:#C0001A;text-transform:uppercase;letter-spacing:.8pt;margin-bottom:3pt;'>&#128101; Zus\u00e4tzlich bei BF17 (Begleitetes Fahren ab 17)</div>";
      r+="<div style='display:grid;grid-template-columns:1fr 1fr;gap:1mm 10mm;'>";
      var bf17=[
        "F\u00fchrerschein der Begleitperson(en) \u2014 Kopie",
        "Personalausweis der Begleitperson(en) \u2014 Kopie",
        "Mindestalter Begleitperson: 30 Jahre",
        "Begleitperson ben\u00f6tigt mind. 5 Jahre Fahrerlaubnis Kl. B",
        "Max. 1 Eintrag im Fahreignungsregister (FAER) der Begleitperson",
        "Zulassungsbescheinigung Teil I (Fahrzeugschein) \u2014 Kopie"
      ];
      bf17.forEach(function(b){r+="<div style='display:flex;gap:3pt;'><span style='color:#C0001A;'>&#8227;</span><span>"+esc(b)+"</span></div>";});
      r+="</div>";
      r+="<div style='font-size:7.5pt;color:#666;margin-top:3pt;'>&#9432;&nbsp; Diese Unterlagen gelten ausschlie\u00dflich bei Antrag auf BF17. Der F\u00fchrerschein gilt ab 17 Jahren nur in Begleitung einer eingetragenen Begleitperson. Ab 18 ist kein gesonderter Eintrag n\u00f6tig.<\/div>";
      r+="<\/div>";
    }
    r+="<\/div>";
  });
  // Fußzeile
  r+="<div style='display:flex;justify-content:space-between;align-items:flex-end;border-top:1pt solid #000;padding-top:4mm;margin-top:6mm;font-size:8pt;color:#555;line-height:1.7;'>";
  r+="<div><strong>"+KVA_FIRMA.name+" &ndash; "+KVA_FIRMA.inhaber+"<\/strong><br>"+KVA_FIRMA.strasse+" &middot; "+KVA_FIRMA.plz_ort+" &middot; Tel.: "+KVA_FIRMA.tel+"<br>"+KVA_FIRMA.email+" &middot; "+KVA_FIRMA.web+"<br><span style='font-size:7pt;color:#888;'>Angaben gem. FahrschAusbO &amp; FeV, Stand 2025. Pflichtfahrten gesetzlich, \u00dcbungsstunden Richtwert.<\/span><\/div>";
  r+="<img src='"+LOGO_APV+"' alt='APV AZAV' style='height:22mm;width:auto;'\/>";
  r+="<\/div><\/div>";
  return r;
}

function updatePrintArea(){
  var ex=document.querySelector(".kva-print-area");
  if(ex) ex.parentNode.removeChild(ex);
  var pa=document.createElement("div");
  pa.className="kva-print-area";
  pa.style.display="none";
  var items=buildItems(),dc=calcD(items);
  pa.innerHTML=buildKVAhtml(items,dc)+(S.infoBlatt?buildInfoBlatt():"");
  document.body.appendChild(pa);
}
// KVA Dokument – DIN 5008, Originallogos, Falzmarken, sauberer Seitenumbruch
function buildKVAhtml(items,dc){
  var all=getSel();
  var clsCats=all.map(function(c){return c.l;}).filter(function(v,i,a){return a.indexOf(v)===i;});
  var xCats=["Zus\u00e4tzliche T\u00dcV-Geb\u00fchren","Schulung","Sonstiges"];
  var cats=clsCats.concat(xCats).filter(function(cat){return items.some(function(i){return i.cat===cat;});});
  var td=new Date().toLocaleDateString("de-DE",{day:"2-digit",month:"long",year:"numeric"});

  // Bildschirm: sichtbarer Rahmen; Druck: @media print überschreibt kd-inner komplett
  var scr="width:100%;padding:14px 16px;font-family:'Poppins','Segoe UI',Arial,sans-serif;font-size:10pt;"
        +"color:#3F4B57;background:#fff;box-sizing:border-box;border:1px solid #e5e7eb;"
        +"border-radius:8px;margin-top:8px;position:relative;";
  var r="<div class='kd-inner' style='"+scr+"'>";

  // Falzmarken – nur Bildschirm-Vorschau (beim Druck via .kva-fold-mark hidden)
  r+="<div class='kva-fold-mark' style='position:absolute;left:0;top:87mm;width:10mm;border-top:0.5mm solid #aaa;'></div>";
  r+="<div class='kva-fold-mark' style='position:absolute;left:0;top:192mm;width:10mm;border-top:0.5mm solid #aaa;'></div>";
  r+="<div class='kva-fold-mark' style='position:absolute;left:0;top:148.5mm;width:7mm;border-top:0.3mm solid #ccc;'></div>";

  // ── KOPFZEILE ──
  r+="<div class='kva-header' style='display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:5mm;'>";
  r+="<img src='"+LOGO_FST+"' alt='Fahrschulteam' style='height:14mm;width:auto;'/>";
  r+="<div style='text-align:right;'>";
  r+="<img src='"+LOGO_QR+"' alt='QR' style='width:18mm;height:18mm;display:block;margin-left:auto;'/>";
  r+="<div style='font-size:6pt;color:#666;margin-top:1mm;'>"+KVA_FIRMA.web+"</div>";
  r+="</div></div>";

  // ── ABSENDERZEILE + EMPFÄNGERFELD ──
  r+="<div class='kva-addr-block'>";
  r+="<div style='font-size:6pt;color:#555;border-bottom:0.3pt solid #999;padding-bottom:1.5mm;margin-bottom:2mm;line-height:1.4;'>"
    +""+KVA_FIRMA.name+" &middot; "+KVA_FIRMA.inhaber+" &middot; "+KVA_FIRMA.strasse+" &middot; "+KVA_FIRMA.plz_ort+"</div>";
    r+="<div style='min-height:45mm;padding:3mm 0 0 0;'>";
  var isFirmaDoc=S.c.anrede==="Firma"&&S.c.company;
  if(isFirmaDoc){
    r+="<div style='font-size:11pt;font-weight:700;color:#000;line-height:1.4;'>"+esc(S.c.company)+"</div>";
    if(S.c.contact) r+="<div style='font-size:10pt;color:#000;'>z.\u202fHd. "+esc(S.c.contact)+"</div>";
  } else {
    var anredeZeile=(S.c.anrede&&S.c.anrede!=="Firma")?esc(S.c.anrede)+" ":"";
    r+="<div style='font-size:11pt;font-weight:700;color:#000;line-height:1.4;'>"+anredeZeile+esc(S.c.name||"\u2013")+"</div>";
  }
  if(S.c.street) r+="<div style='font-size:10pt;color:#000;'>"+esc(S.c.street)+"</div>";
  if(S.c.plz||S.c.city) r+="<div style='font-size:10pt;color:#000;'>"+esc((S.c.plz+" "+S.c.city).trim())+"</div><div style='height:6mm'></div>";
      r+="</div>";
  r+="</div>"; // kva-addr-block

  // ── BETREFF + DATUM ──
  r+="<div class='kva-betreff' style='margin-bottom:4mm;'>";
  r+="<div style='display:flex;justify-content:space-between;align-items:baseline;'>";
  r+="<div>";
  r+="<div style='font-size:7pt;color:#C0001A;font-weight:800;letter-spacing:2pt;text-transform:uppercase;'>Kostenvoranschlag</div>";
  r+="<div style='font-size:15pt;font-weight:900;color:#000;letter-spacing:-0.5pt;'>"+esc(S.kva)+"</div>";
  r+="</div>";
  r+="<div style='font-size:9pt;color:#000;text-align:right;'>Lingen, den "+td+"</div>";
  r+="</div>";
  r+="<div style='height:2pt;background:#C0001A;margin-top:3mm;margin-bottom:5mm;'></div>";
  r+="<div style='font-size:9.5pt;color:#000;margin-bottom:5mm;line-height:1.6;'>vielen Dank f\u00fcr Ihr Interesse. Nachfolgend unser unverbindlicher Kostenvoranschlag:</div>";
  r+="</div>"; // kva-betreff

  // ── POSITIONSTABELLE ──
  r+="<table style='width:100%;border-collapse:collapse;font-size:9pt;'>";
  r+="<thead>"
    +"<tr>"
    +"<th style='padding:5pt 7pt;background:#3F4B57;color:#fff;font-weight:700;text-align:left;width:67%;border:0.5pt solid #3F4B57;'>Position</th>"
    +"<th style='padding:5pt 7pt;background:#3F4B57;color:#fff;font-weight:700;text-align:right;border:0.5pt solid #3F4B57;'>Betrag (inkl. MwSt.)</th>"
    +"</tr>"
    +"</thead><tbody>";

  cats.forEach(function(cat){
    var rows=items.filter(function(i){return i.cat===cat;});
    if(!rows.length) return;
    var isCls=clsCats.indexOf(cat)>=0;
    var cTot=rows.reduce(function(s,rw){return s+rw.p;},0);

    r+="<tr class='kva-cat-hdr' style='background:"+(isCls?"#3F4B57":"#3F4B57")+";'>"
      +"<td colspan='2' style='font-size:8pt;font-weight:700;text-transform:uppercase;letter-spacing:.8px;"
      +"padding:4pt 7pt;color:#fff;border:0.5pt solid #3F4B57;'>"
      +(isCls?"Klasse "+esc(cat):esc(cat))+"</td></tr>";

    rows.forEach(function(row,i){
      var isAdv=row.erw>0.01;
      var bg=row.gratis?"#e8f5e9":isAdv?"#e8f5e9":i%2===0?"#f5f5f5":"#fff";
      var col=row.gratis?"#1b5e20":isAdv?"#1b5e20":"#000";
      var fw=row.gratis?"italic":"normal";
      r+="<tr style='background:"+bg+";'>";
      r+="<td style='padding:4pt 7pt;color:"+col+";font-style:"+fw+";border-bottom:0.3pt solid #ddd;'>"+esc(row.l);
      if(row.note) r+="<br><span style='font-size:7.5pt;color:#2e7d32;'>"+esc(row.note)+"</span>";
      r+="</td>";
      r+="<td style='padding:4pt 7pt;text-align:right;white-space:nowrap;color:"+col+";font-style:"+fw+";border-bottom:0.3pt solid #ddd;font-weight:600;'>"
        +(row.gratis?"inklusive":fmt(row.p))+"</td></tr>";
    });

  });
  r+="</tbody></table>";

  // ── SUMMENBLOCK ──
  r+="<div class='kva-totals'>";
  r+="<table style='width:100%;border-collapse:collapse;font-size:9pt;'><tbody>";
  r+="<tr style='background:#f5f5f5;'>"
    +"<td style='padding:4pt 7pt;color:#000;border-top:1pt solid #999;'>Zwischensumme</td>"
    +"<td style='text-align:right;padding:4pt 7pt;color:#000;font-weight:600;border-top:1pt solid #999;'>"+fmt(dc.sub)+"</td></tr>";
  if(dc.tSav>0.01){
    // Jeder gewährte Nachlass als eigene Position. Nicht gewährte werden nicht erwähnt.
    var savRow=function(label,val){
      return "<tr style='background:#c8e6c9;'>"
        +"<td style='padding:3pt 7pt;color:#1b5e20;font-weight:600;border-top:0.3pt solid #a5d6a7;'>"+esc(label)+"</td>"
        +"<td style='text-align:right;padding:3pt 7pt;color:#1b5e20;font-weight:700;border-top:0.3pt solid #a5d6a7;white-space:nowrap;'>-"+fmt(val)+"</td></tr>";
    };
    if(dc.tErw>0.01) r+=savRow("Mehrklassenvorteil",dc.tErw);
    if(dc.mEur>0)    r+=savRow("Mofa-Rabatt",dc.mEur);
    if(dc.aV>0)      r+=savRow(dc.aL||"Rabatt",dc.aV);
  }
  r+="<tr style='background:#3F4B57;'>"
    +"<td style='padding:8pt 7pt;font-size:11pt;font-weight:800;color:#fff;border-top:2pt solid #000;'>Gesamtbetrag (inkl. MwSt.)</td>"
    +"<td style='text-align:right;padding:8pt 7pt;font-size:13pt;font-weight:900;color:#fff;border-top:2pt solid #000;'>"+fmt(dc.total)+"</td></tr>";
  r+="</tbody></table></div>";

  // ── ANMERKUNGEN ──
  if(S.notes){
    r+="<div class='kva-notes' style='background:#fffde7;border:1pt solid #f9a825;border-radius:3pt;"
      +"padding:6pt 8pt;font-size:9pt;color:#000;margin-top:5mm;line-height:1.5;'>"
      +"<strong>Anmerkungen:</strong> "+esc(S.notes)+"</div>";
  }

  // ── HINWEISE + ÖFFNUNGSZEITEN ──
  r+="<div class='kva-hints' style='margin-top:5mm;'>";

  // Hinweis: Übungsfahrten & Ausbildungsform
  r+="<div class='kva-hint-block' style='page-break-inside:avoid;break-inside:avoid;background:#fffde7;border:0.5pt solid #f9a825;border-radius:3pt;padding:7pt 10pt;font-size:8.5pt;color:#000;line-height:1.7;margin-bottom:3mm;'>"
    +"Die Anzahl der erforderlichen \u00dcbungsfahrten richtet sich nach den individuellen Vorkenntnissen, F\u00e4higkeiten und dem pers\u00f6nlichen Lernfortschritt des Fahrsch\u00fclers. Daher kann die tats\u00e4chliche Anzahl der Fahrstunden von der im Kostenvoranschlag kalkulierten Anzahl abweichen."
    +"<div style='border-top:0.5pt solid #f9a825;margin:5pt 0;'></div>"
    +"Der Erwerb der Fahrerlaubnis ist sowohl im klassischen Ausbildungsmodell mit Theorieunterricht im Abendkurs und Fahrstunden nach individueller Terminvereinbarung als auch im Rahmen einer Vollzeitausbildung m\u00f6glich. Gerne beraten wir Sie zur f\u00fcr Sie passenden Ausbildungsform."
    +"</div>";

  // Hinweis: Gesamtkosten / externe Kosten
  r+="<div class='kva-hint-block' style='page-break-inside:avoid;break-inside:avoid;background:#e8f4fd;border:0.5pt solid #2A6CAE;border-radius:3pt;padding:7pt 10pt;font-size:8.5pt;color:#000;line-height:1.7;margin-bottom:3mm;'>"
    +"<strong>Hinweis zu den Gesamtkosten des F\u00fchrerscheinerwerbs:</strong><br>"
    +"Dieser Kostenvoranschlag umfasst ausschlie\u00dflich die <strong>Fahrschulkosten</strong>. Zus\u00e4tzlich fallen externe Kosten an, die nicht in diesem Angebot enthalten sind, u.\u202fa.:"
    +"<div style='margin-top:3pt;padding-left:10pt;'>"
    +"&#8227;&nbsp;Sehtest (Augenoptiker oder Augenarzt)<br>"
    +"&#8227;&nbsp;Erste-Hilfe-Kurs<br>"
    +"&#8227;&nbsp;Passfoto<br>"
    +"&#8227;&nbsp;Pr\u00fcfungsgeb\u00fchren (T\u00dcV/DEKRA/GT\u00dc)"
    +"</div>"
    +"</div>";

  r+="<div class='kva-hint-block' style='page-break-inside:avoid;break-inside:avoid;background:#f5f5f5;border:0.5pt solid #bbb;border-radius:3pt;padding:7pt 10pt;font-size:8.5pt;color:#000;line-height:1.9;'>"
    +"<strong>Haben Sie noch Fragen?</strong><br>"
    +"Sie k\u00f6nnen uns telefonisch w\u00e4hrend unserer \u00d6ffnungszeiten erreichen:<br>"
    +"Mo &amp; Mi: 08:30\u202f\u2013\u202f13:00 Uhr &nbsp;&nbsp; Di &amp; Do: 08:30\u202f\u2013\u202f16:30 Uhr<br>"
    +"<span style='font-size:8pt;color:#444;'>Dieser Kostenvoranschlag ist unverbindlich und gilt f\u00fcr 4 Wochen ab Ausstellungsdatum.</span>"
    +"</div>";
  r+="<div style='font-size:7pt;color:#555;line-height:1.7;border-top:0.3pt solid #bbb;padding-top:3mm;margin-top:3mm;'>"
    +"Preise inkl. MwSt. Preisliste 2025. "
    +"T\u00dcV-Geb\u00fchren gem. GebOSt 31.01.2024. Sonderfahrten gem. Anlage 4 FahrschAusbO.</div>";
  r+="</div>";

  // ── FUSSZEILE ──
  r+="<div class='kva-footer' style='display:flex;justify-content:space-between;align-items:flex-end;"
    +"border-top:1.5pt solid #000;padding-top:5mm;margin-top:6mm;'>";
  r+="<div style='font-size:9pt;color:#000;line-height:1.9;'>"
    +"<strong>"+KVA_FIRMA.name+" \u2013 "+KVA_FIRMA.inhaber+"</strong><br>"
    +""+KVA_FIRMA.strasse+" &middot; "+KVA_FIRMA.plz_ort+"<br>"
    +"Tel.: "+KVA_FIRMA.tel+" &middot; "+KVA_FIRMA.email+"<br>"
    +""+KVA_FIRMA.web+"</div>";
  r+="<img src='"+LOGO_APV+"' alt='APV AZAV' style='height:31.5mm;width:auto;image-rendering:auto;'/>";
  r+="</div>";

  r+="</div>"; // kd-inner
  return r;
}
// Steps
function rS0(){
  var anreden=["Herr","Frau","Divers","Firma"];
  var anredeBtns=anreden.map(function(a){
    var on=S.c.anrede===a;
    return "<button class='yb "+(on?"og":"")+"' data-act='anrede' data-val='"+a+"' style='flex:1;min-width:0;'>"+a+"</button>";
  }).join("");
  var isFirma=S.c.anrede==="Firma";
  var r="<div class='card'><div class='fwrap'>";
  r+="<div class='fsec-top'><label class='lbl' style='margin-top:0;'>Anrede</label><div class='yn' style='gap:8px;'>"+anredeBtns+"</div></div>";
  if(isFirma){
    r+="<div class='fbox'><div class='fbox-h'>Firmenangaben</div><div class='fgrid'>"
      +"<div class='fcell' style='grid-column:span 6'><label class='lbl' style='margin-top:0;'>Firmenname *</label><input data-act='field' data-id='company' value='"+esc(S.c.company)+"' placeholder='Muster GmbH'/></div>"
      +"<div class='fcell' style='grid-column:span 6'><label class='lbl' style='margin-top:0;'>Ansprechpartner</label><input data-act='field' data-id='contact' value='"+esc(S.c.contact)+"' placeholder='Frau Anna Beispiel'/></div>"
      +"</div></div>";
  }
  r+="<div class='fsec-h'>Kontaktdaten</div><div class='fgrid'>"
    +"<div class='fcell' style='grid-column:span 6'><label class='lbl'>"+(isFirma?"Name des Fahrsch\u00fclers":"Name")+" *</label><input data-act='field' data-id='name' value='"+esc(S.c.name)+"' placeholder='Max Mustermann'/></div>"
    +"<div class='fcell' style='grid-column:span 6'><label class='lbl'>Stra\u00dfe &amp; Hausnummer</label><input data-act='field' data-id='street' value='"+esc(S.c.street)+"' placeholder='Musterstr. 1'/></div>"
    +"<div class='fcell' style='grid-column:span 3'><label class='lbl'>PLZ</label><input data-act='field' data-id='plz' value='"+esc(S.c.plz)+"' placeholder='49809' maxlength='5'/></div>"
    +"<div class='fcell' style='grid-column:span 9'><label class='lbl'>Wohnort</label><input data-act='field' data-id='city' value='"+esc(S.c.city)+"' placeholder='Lingen'/></div>"
    +"</div>";
  r+="<div class='fsec-h'>Erreichbarkeit</div><div class='fgrid'>"
    +"<div class='fcell' style='grid-column:span 6'><label class='lbl'>E-Mail</label><input type='email' data-act='field' data-id='email' value='"+esc(S.c.email)+"' placeholder='max@beispiel.de'/></div>"
    +"<div class='fcell' style='grid-column:span 6'><label class='lbl'>Telefon</label><input data-act='field' data-id='phone' value='"+esc(S.c.phone)+"' placeholder='0591/...'/></div>"
    +"</div>";
  r+="<div class='fsec-h'>Termin &amp; Vorerfahrung</div><div class='fgrid'>"
    +"<div class='fcell' style='grid-column:span 4'><label class='lbl'>Datum</label><input type='date' data-act='field' data-id='date' value='"+esc(S.c.date)+"'/></div>"
    +"<div class='fcell' style='grid-column:span 8'><label class='lbl'>Mofa-F\u00fchrerschein bei uns gemacht?</label>"
    +"<div class='yn'><button class='yb "+(S.mofa?"og":"")+"' data-act='mofa' data-val='1'>Ja \u2013 Mofa-Rabatt (75\u202f\u20ac)</button>"
    +"<button class='yb "+(!S.mofa?"of":"")+"' data-act='mofa' data-val='0'>Nein</button></div>"
    +(S.mofa?"<div class='ib ig' style='margin-top:8px;'>Mofa-Rabatt 75\u202f\u20ac wird gew\u00e4hrt.</div>":"")
    +"</div></div>";
  r+="<div class='nr'><button id='nxt0' class='nxt' data-act='go' data-id='1'"+((isFirma?S.c.company:S.c.name)?"":" disabled")+">Weiter: Klassen &rsaquo;</button></div>";
  r+="</div></div>";
  return r;
}
function rS1(){
  var all=getSel(),haupt=getHaupt(all);
  var tErw=all.reduce(function(s,c){var gb=calcGB(c,all);return s+(c.gb-gb>0.01?c.gb-gb:0);},0);
  var r="<div class='card'><div class='ct'>Klassen &amp; Schulungen</div><div class='cs'>Klassen anklicken \u2013 bei A1/A2/A wird nach Stufenf\u00fchrerschein gefragt.</div><div style='margin-top:14px;'>";
  GROUPS.forEach(function(g){
    var gCls=CLS.filter(function(c){return c.g===g&&!c.stufe;});
    r+="<div style='margin-bottom:12px;'><div class='gh'>"+g+"</div><div class='cg'>";
    gCls.forEach(function(c){
      var stufeId=c.id+"S";
      var on=S.sel.indexOf(c.id)>=0||S.sel.indexOf(stufeId)>=0;
      var effectiveCls=S.sel.indexOf(stufeId)>=0?(CLS.find(function(x){return x.id===stufeId;})||c):c;
      var gb=on?calcGB(effectiveCls,all):c.gb;
      var hasE=on&&!c.fixedGb&&!c.mofa&&gb<c.gb-0.01;
      var isH=haupt&&(haupt.id===c.id||haupt.id===stufeId);
      r+="<button class='cb"+(on?" on":"")+"' data-act='cls' data-id='"+c.id+"'>";
      r+="<div style='font-size:12px;font-weight:700;color:"+(on?"#C0001A":"#3F4B57")+";'>"+c.l+"</div>";
      if(on&&isH) r+="<span class='bdg bh'>Haupt</span>";
      if(on&&hasE) r+="<span class='bdg be'>Vorteil</span>";
      if(on&&S.sel.indexOf(stufeId)>=0) r+="<span class='bdg bs'>Stufe</span>";
      if(on&&c.id==="D"&&AUSBILDUNG["D"]&&AUSBILDUNG["D"].vorbesitz){
        var vbl=AUSBILDUNG["D"].vorbesitz[S.dVorbesitz||0];
        if(vbl) r+="<span style='font-size:8px;color:#2A6CAE;display:block;margin-top:2px;'>"
          +esc(vbl.label.replace("Vorbesitz ",""))
          +" <span onclick='event.stopPropagation();showVorbesitzModal()' style='color:#C0001A;text-decoration:underline;cursor:pointer;'>\u00e4ndern</span></span>";
      }
      if(effectiveCls.soN>0&&on) r+="<span style='font-size:8px;color:#888;display:block;margin-top:1px;'>"+effectiveCls.soN+" Sonderf.</span>";
      r+="<div style='font-size:11px;color:"+(hasE?"#2A6CAE":"#888")+";'>"+fmt(gb)+"</div>";
      if(hasE) r+="<div style='font-size:9px;color:#bbb;text-decoration:line-through;'>"+fmt(c.gb)+"</div>";
      r+="</button>";
    });
    r+="</div></div>";
  });

  r+="<div class='dv'></div><div class='sec'>Schulungen &amp; Weiterbildungen</div>";
  r+="<div class='cg2'>";
  // PKW first, then rest
  var sorted=COURSES.slice().sort(function(a,b){return (b.pkw?1:0)-(a.pkw?1:0);});
  sorted.forEach(function(c){
    var on=!!S.courses[c.id];
    r+="<button class='cb2"+(on?" on":"")+(c.pkw?" style='border-color:#C0001A;background:#fff5f5;'":"")+"' data-act='course' data-id='"+c.id+"'><span style='font-size:11px;font-weight:"+(c.pkw?800:600)+";color:"+(c.pkw?"#C0001A":"#333")+";line-height:1.3;'>"+esc(c.l)+"</span><span style='font-size:11px;color:#888;'>"+fmt(c.p)+"</span></button>";
  });
  r+="</div><div class='nr'><button class='nbk' data-act='go' data-id='0'>Zur\u00fcck</button>";
  r+="<button class='nxt' data-act='go' data-id='2'"+(all.length?"":" disabled")+">Weiter: Stunden &rsaquo;</button></div></div>";
  return r;
}
function rS2(){
  var all=getSel(),hasStufe=all.some(function(c){return c.stufe;});
  var r="<div class='card'><div class='ct'>Stunden &amp; Sonderfahrten</div><div class='cs'>Stunden und Pflicht-Sonderfahrten gem. FahrschAusbO Anlage 4 anpassen.</div><div style='margin-top:14px;'>";
  var rel=all.filter(function(c){return !c.mofa;});
  if(!rel.length) r+="<div style='color:#aaa;font-size:13px;padding:16px 0;text-align:center;'>Keine Klassen ausgew\u00e4hlt.</div>";
  else rel.forEach(function(cls){
    var ustN=S.ust[cls.id]!==undefined?+S.ust[cls.id]:cls.n;
    var soN=S.so[cls.id]!==undefined?+S.so[cls.id]:cls.soN;
    var uC=ustN!==cls.n,sC=soN!==cls.soN;
    r+="<div class='stunden-box'><div style='display:flex;align-items:center;gap:6px;margin-bottom:10px;'>";
    r+="<span style='font-size:14px;font-weight:700;color:#C0001A;'>Klasse "+esc(cls.l)+"</span>";
    if(cls.stufe) r+="<span class='bdg bs'>Stufenf\u00fchrerschein</span>";
    r+="</div>";
    if(cls.beFixed){
      r+="<div style='margin-bottom:10px;'><div style='font-size:10px;color:#888;margin-bottom:3px;'>\u00dcBUNGSFAHRTEN</div>";
      r+="<div class='num-ctrl'><button class='num-btn' data-act='ust-' data-id='"+cls.id+"'>&#8722;</button>";
      r+="<input class='num-inp' type='number' min='0' data-act='ust' data-id='"+cls.id+"' value='"+ustN+"'/>";
      r+="<button class='num-btn' data-act='ust+' data-id='"+cls.id+"'>+</button>";
      r+="<span style='font-size:11px;color:#888;margin-left:4px;'>"+cls.ust+"\u202fEUR/Fahrt = "+fmt(cls.ust*ustN)+"</span>";
      if(uC) r+="<button class='rst-btn' data-act='ustr' data-id='"+cls.id+"'>Reset</button>";
      r+="</div></div>";
      r+="<div style='font-size:11px;color:#555;margin-bottom:6px;padding:6px 10px;background:#fafafa;border:1px solid #eee;border-radius:6px;'>+ 1\u202fStd. Unterweisung \u00e0 "+cls.unt+"\u202f\u20ac (fest)</div>";
    } else if(cls.ust&&cls.n>0){
      r+="<div style='margin-bottom:10px;'><div style='font-size:10px;color:#888;margin-bottom:3px;'>\u00dcBUNGSSTUNDEN (Mindest: "+cls.n+" Std.)</div>";
      r+="<div class='num-ctrl'><button class='num-btn' data-act='ust-' data-id='"+cls.id+"'>&#8722;</button>";
      r+="<input class='num-inp' type='number' min='0' data-act='ust' data-id='"+cls.id+"' value='"+ustN+"'/>";
      r+="<button class='num-btn' data-act='ust+' data-id='"+cls.id+"'>+</button>";
      r+="<span style='font-size:11px;color:#888;margin-left:4px;'>"+cls.ust+"\u202fEUR/Std. = "+fmt(cls.ust*ustN)+"</span>";
      if(uC) r+="<button class='rst-btn' data-act='ustr' data-id='"+cls.id+"'>Reset</button>";
      r+="</div></div>";
    }
    if(cls.soP>0){
      var isAnlage5=cls.soN===0&&cls.soP>0&&(cls.id==="D"||cls.id==="D1"||cls.id==="DE"||cls.id==="D1E");
      var isGemAktiv=cls.canGem&&S.so[cls.id]===cls.gemSoN;
      // Ist diese Klasse die Solo-/Hauptklasse eines aktiven gemeinsamen Gangs (z.B. C1, wenn C1E gemeinsam läuft)?
      var gemSolo=null;
      S.sel.forEach(function(sid){
        var sc=CLS.find(function(c){return c.id===sid;});
        if(sc&&sc.canGem&&sc.gemPartner===cls.id&&S.so[sc.id]===sc.gemSoN) gemSolo=sc;
      });
      r+="<div>";
      if(isAnlage5){
        r+="<div style='font-size:10px;color:#888;margin-bottom:2px;'>SONDERFAHRTEN gem. Anlage\u202f5 FahrschAusbO (Stunden je nach Vorbesitz)</div>";
        r+="<div style='font-size:10px;color:#f59e0b;margin-bottom:5px;'>"+esc(cls.soD)+"</div>";
      } else if(isGemAktiv){
        r+="<div style='font-size:10px;color:#888;margin-bottom:2px;'>SONDERFAHRTEN gem. FahrschAusbO \u2013 <span style='color:#2A6CAE;font-weight:700;'>Gemeinsamer Ausbildungsgang (Zug-Anteil)</span> <button style='font-size:9px;padding:1px 5px;border:1px solid #2A6CAE;border-radius:3px;background:#e8f4fd;color:#2A6CAE;cursor:pointer;margin-left:4px;' onclick='showGemModal(\""+cls.id+"\")'>&#9998;</button></div>";
        r+="<div style='font-size:10px;color:#2A6CAE;margin-bottom:5px;'>"+esc(cls.gemSoD)+"</div>";
      } else if(gemSolo){
        r+="<div style='font-size:10px;color:#888;margin-bottom:2px;'>SONDERFAHRTEN gem. FahrschAusbO \u2013 <span style='color:#2A6CAE;font-weight:700;'>Gemeinsamer Ausbildungsgang (Solo-Anteil)</span></div>";
        r+="<div style='font-size:10px;color:#2A6CAE;margin-bottom:5px;'>"+esc(gemSolo.gemPartnerSoD||"")+" \u2013 reduziert, da gemeinsam mit "+esc(gemSolo.id)+"</div>";
      } else {
        r+="<div style='font-size:10px;color:#888;margin-bottom:2px;'>SONDERFAHRTEN gem. FahrschAusbO (Pflicht: "+cls.soN+")"+(cls.canGem?" <button style='font-size:9px;padding:1px 5px;border:1px solid #888;border-radius:3px;background:#f5f5f5;color:#555;cursor:pointer;margin-left:4px;' onclick='showGemModal(\""+cls.id+"\")'>Gemeinsam?</button>":"")+"</div>";
        r+="<div style='font-size:10px;color:#2A6CAE;margin-bottom:5px;'>"+esc(cls.soD)+"</div>";
      }
      r+="<div class='num-ctrl'><button class='num-btn' data-act='so-' data-id='"+cls.id+"'>&#8722;</button>";
      r+="<input class='num-inp' type='number' min='0' data-act='so' data-id='"+cls.id+"' value='"+soN+"'/>";
      r+="<button class='num-btn' data-act='so+' data-id='"+cls.id+"'>+</button>";
      if(cls.soP) r+="<span style='font-size:11px;color:#888;margin-left:4px;'>"+cls.soP+"\u202fEUR/Fahrt = "+fmt(cls.soP*soN)+"</span>";
      if(sC) r+="<button class='rst-btn' data-act='sor' data-id='"+cls.id+"'>Reset</button>";
      r+="</div></div>";
    } else r+="<div style='font-size:11px;color:#aaa;font-style:italic;'>Keine Pflicht-Sonderfahrten</div>";
    r+="</div>";
  });
  if(hasStufe) r+="<div class='ib iy'><strong>Hinweis Stufenf\u00fchrerschein:</strong> Bei A2\u2192A gilt der Erweiterungsrabatt, nicht der Geschwisterrabatt.</div>";
  r+="<div class='nr'><button class='nbk' data-act='go' data-id='1'>Zur\u00fcck</button><button class='nxt' data-act='go' data-id='3'>Weiter: Positionen &rsaquo;</button></div></div>";
  return r;
}
function rS3(){
  var items=buildItems(),dc=calcD(items),all=getSel();
  var clsCats=all.map(function(c){return c.l;}).filter(function(v,i,a){return a.indexOf(v)===i;});
  var cats=clsCats.concat(["Zus\u00e4tzliche T\u00dcV-Geb\u00fchren","Schulung","Sonstiges"]).filter(function(cat){return items.some(function(i){return i.cat===cat;});});
  var tblStyle="width:100%;border-collapse:collapse;margin-bottom:10px;font-size:12px;";
  var thStyle="padding:5px 8px;text-align:left;font-size:10px;font-weight:700;color:#888;border-bottom:2px solid #e0e0e0;";
  var r="<div class='card'><div class='ct'>Positionen pr\u00fcfen</div><div class='cs'>Beschreibung, Anzahl und Einzelkosten direkt bearbeitbar \u2013 Summen werden automatisch neu berechnet.</div><div style='margin-top:14px;'>";
  cats.forEach(function(cat){
    var rows=items.filter(function(i){return i.cat===cat;}),isCls=clsCats.indexOf(cat)>=0;
    if(!rows.length) return;
    var cT=rows.reduce(function(s,r){return s+r.p;},0);
    r+="<div style='margin-bottom:16px;'>";
    r+="<div style='padding:5px 10px;font-size:"+(isCls?10:9)+"px;font-weight:700;background:#3F4B57;color:#fff;text-transform:uppercase;letter-spacing:.5px;border-radius:6px 6px 0 0;'>"+(isCls?"Klasse "+cat:cat)+"</div>";
    r+="<table style='"+tblStyle+"'>";
    r+="<thead><tr>";
    r+="<th style='"+thStyle+"width:50%;'>Beschreibung</th>";
    r+="<th style='"+thStyle+"width:12%;text-align:center;'>Anz.</th>";
    r+="<th style='"+thStyle+"width:18%;text-align:right;'>Einzelpreis</th>";
    r+="<th style='"+thStyle+"width:20%;text-align:right;'>Gesamt</th>";
    r+="</tr></thead><tbody>";
    rows.forEach(function(row,i){
      var rk=row._key||'';
      var bg=i%2===0?"#fff":"#f9f9f9";
      var tdBase="padding:5px 8px;border-bottom:1px solid #f0f0f0;vertical-align:middle;";
      // Parse qty and unit price from label if possible (e.g. "6 x 87 EUR")
      var ov=S.itemOvr[rk]||{};
      var qty=ov.qty!==undefined?ov.qty:(row._qty!==undefined?row._qty:1);
      var unit=ov.unit!==undefined?ov.unit:(row._unit!==undefined?row._unit:row.p);
      r+="<tr style='background:"+bg+";'>";
      if(row.gratis){
        r+="<td style='"+tdBase+"color:#2A6CAE;font-style:italic;'>"+esc(row.l)+(row.note?"<br><span style='font-size:10px;color:#2A6CAE;'>"+esc(row.note)+"</span>":"")+"</td>";
        r+="<td colspan='2' style='"+tdBase+"text-align:center;color:#aaa;font-size:11px;'>\u2013</td>";
        r+="<td style='"+tdBase+"text-align:right;color:#2A6CAE;font-style:italic;font-weight:600;'>inkl.</td>";
      } else {
        r+="<td style='"+tdBase+"'><input value='"+esc(row.l)+"' data-act='ovr-l' data-id='"+rk+"' style='width:100%;font-size:12px;border:none;border-bottom:1px dashed #ddd;background:transparent;color:#333;padding:1px 2px;outline:none;' title='Beschreibung'/></td>";
        r+="<td style='"+tdBase+"text-align:center;'><input type='number' min='0' step='1' value='"+qty+"' data-act='ovr-qty' data-id='"+rk+"' data-unit='"+unit+"' data-sod='"+(row._soD||"")+"'  style='width:48px;font-size:12px;text-align:center;border:none;border-bottom:1px dashed #ddd;background:transparent;color:#333;padding:1px 2px;outline:none;' title='Anzahl (FeV)'/></td>";
        r+="<td style='"+tdBase+"text-align:right;'><input type='number' min='0' step='0.01' value='"+unit+"' data-act='ovr-unit' data-id='"+rk+"' data-qty='"+qty+"' data-sod='"+(row._soD||"")+"' data-ust-lbl='"+(row._qty!==undefined&&row._unit!==undefined&&!row._soD?"\u00dcbungsstunden ({N}\u202fx\u202f{U}\u202fEUR)":"")+"'  style='width:72px;font-size:12px;text-align:right;border:none;border-bottom:1px dashed #ddd;background:transparent;color:#333;padding:1px 2px;outline:none;' title='Einzelpreis (aus Preisliste)'/><span style='font-size:10px;color:#aaa;margin-left:2px;'>\u20ac</span></td>";
        r+="<td style='"+tdBase+"text-align:right;font-weight:600;color:#333;'>"+fmt(row.p)+"</td>";
      }
      r+="</tr>";
    });
    r+="</tbody></table>";
    if(isCls) r+="<div style='display:flex;justify-content:space-between;padding:4px 10px;background:#f5f5f5;border-top:1px solid #e0e0e0;font-size:10px;color:#888;font-style:italic;border-radius:0 0 4px 4px;'><span>Zwischensumme Klasse "+cat+"</span><span>"+fmt(cT)+"</span></div>";
    r+="</div>";
  });
  r+="<div class='dv'></div><div class='sec'>Zus\u00e4tzliche T\u00dcV-Geb\u00fchren</div>";
  TUV.forEach(function(e){
    var on=!!S.tuv[e.id];
    r+="<div class='cr' data-act='tuv' data-id='"+e.id+"'><div class='ck"+(on?" on":"")+"'>"+(on?"&#10003;":"")+"</div><label>"+esc(e.l)+" ("+fmt(e.p)+")</label></div>";
  });
  r+="<div class='dv'></div><div class='sec'>Individuelle Positionen</div>";
  S.custom.forEach(function(cl,i){
    r+="<div style='display:flex;gap:7px;margin-bottom:7px;'>";
    r+="<input style='flex:2;' placeholder='Bezeichnung' value='"+esc(cl.l)+"' data-act='cline-l' data-id='"+i+"'/>";
    r+="<input type='number' style='width:85px;' placeholder='EUR' value='"+(cl.p||"")+"' data-act='cline-p' data-id='"+i+"'/>";
    r+="<button class='rmb' data-act='rmline' data-id='"+i+"'>&#215;</button></div>";
  });
  r+="<button class='ab' data-act='addline'>+ Position hinzuf\u00fcgen</button>";
  r+="<div style='display:flex;justify-content:space-between;align-items:center;background:linear-gradient(135deg,#3F4B57,#2A6CAE);border-radius:10px;padding:12px 16px;margin-top:14px;'>";
  r+="<span style='color:#aaa;font-size:13px;'>Zwischensumme</span><span style='color:#fff;font-size:19px;font-weight:700;'>"+fmt(dc.sub)+"</span></div>";
  r+="<div class='nr'><button class='nbk' data-act='go' data-id='2'>Zur\u00fcck</button><button class='nxt' data-act='go' data-id='4'>Weiter: Rabatte &rsaquo;</button></div></div>";
  return r;
}

function rS4(){
  var items=buildItems(),dc=calcD(items);
  var r="<div class='card'><div class='ct'>Rabatte</div><div class='cs'>Mofa-Rabatt immer zus\u00e4tzlich. Von Geschwister/Erweiterung/Sonder gilt nur der h\u00f6here.</div><div style='margin-top:14px;'>";
  if(dc.tErw>0.01) r+="<div class='ib ig'>Mehrklassenvorteil eingerechnet: <strong>-"+fmt(dc.tErw)+"</strong></div>";
  r+="<div style='background:#fafafa;border:1.5px solid #e0e0e0;border-radius:10px;padding:12px 14px;margin-bottom:10px;'>";
  r+="<div class='cr' data-act='disc' data-id='mofa'><div class='ck"+(S.disc.mofa?" on":"")+"'>"+(S.disc.mofa?"&#10003;":"")+"</div>";
  r+="<label style='font-weight:600;color:"+(S.disc.mofa?"#C0001A":"#333")+";'>Mofa-Rabatt \u2013 "+fmt(75)+(S.mofa?" \u2013 bereits vorgemerkt":"")+"</label></div>";
  r+="<div style='font-size:11px;color:#888;margin-left:28px;'>Voller Mofa-Preis wird erlassen. Immer zus\u00e4tzlich.</div></div>";
  var all=getSel(),hasRabattKlasse=all.some(function(c){return c.id!=="B96"&&c.id!=="B196"&&!c.mofa;});
  r+="<div style='background:#fafafa;border:1.5px solid #e0e0e0;border-radius:10px;padding:12px 14px;'>";
  r+="<div style='font-size:11px;color:#888;margin-bottom:8px;'>Von folgenden Rabatten gilt nur der h\u00f6herwertige:</div>";
  if(!hasRabattKlasse&&all.length>0){
    r+="<div style='font-size:11px;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:7px 10px;margin-bottom:8px;'>Bei Klasse B\u202f96 und B196 sind Geschwister-, Erweiterungs- und Sonderrabatt nicht anwendbar.</div>";
  }
  ["geschwister","erweiterung","sonder"].forEach(function(k){
    var on=S.disc[k]&&hasRabattKlasse;
    var disabled=!hasRabattKlasse;
    var labels={geschwister:"Geschwisterrabatt \u2013 200\u202fEUR auf den Grundbetrag",
      erweiterung:"Erweiterungsrabatt \u2013 200\u202fEUR (auch wenn Theorie nicht anrechenbar; Ausnahme BE &amp; Stufenf\u00fchrerschein)",
      sonder:"Sonderrabatt (manuell in\u202f%)"};
    r+="<div class='cr'"+(disabled?"":" data-act='disc' data-id='"+k+"'")+"style='"+(disabled?"opacity:.35;cursor:not-allowed;":"")+"'><div class='ck"+(on?" on":"")+"'>"+(on?"&#10003;":"")+"</div><label>"+labels[k]+"</label></div>";
    if(k==="sonder"&&on&&hasRabattKlasse) r+="<div style='display:flex;align-items:center;gap:8px;margin-top:6px;margin-left:28px;'><input type='number' min='0' max='100' style='width:80px;' data-act='sopct' value='"+S.soPct+"'/><span style='font-size:13px;color:#555;'>%</span></div>";
  });
  if(S.disc.geschwister||S.disc.erweiterung||(S.disc.sonder&&parseFloat(S.soPct)>0)){
    r+="<div class='ib ig' style='margin-top:8px;'>";
    if(dc.aL) r+="<strong>Angewendet: "+esc(dc.aL)+"</strong> ("+fmt(dc.aV)+")";
    if(dc.iL) r+="<br>Nicht ber\u00fccksichtigt: "+esc(dc.iL);
    r+="</div>";
  }
  r+="</div><div class='dv'></div><div class='sec'>Anmerkungen</div>";
  r+="<textarea rows='3' placeholder='Besondere Vereinbarungen...' data-act='notes'>"+esc(S.notes)+"</textarea>";
  r+="<div style='background:linear-gradient(135deg,#3F4B57,#2A6CAE);border-radius:12px;padding:16px 18px;margin-top:14px;'>";
  r+="<div style='font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.8px;margin-bottom:10px;'>Kosten\u00fcbersicht</div>";
  r+="<div class='sr'><span style='font-size:12px;color:#94a3b8;'>Zwischensumme</span><span style='font-size:12px;color:#e2e8f0;'>"+fmt(dc.sub)+"</span></div>";
  if(dc.tSav>0.01){
    var savLine=function(label,val){
      return "<div style='margin-top:5px;background:rgba(168,212,255,.16);border:1px solid rgba(168,212,255,.4);border-radius:6px;padding:5px 8px;'>"
        +"<div style='display:flex;justify-content:space-between;align-items:baseline;'>"
        +"<span style='font-size:12px;font-weight:700;color:#a8d4ff;'>"+esc(label)+"</span>"
        +"<span style='font-size:13px;font-weight:800;color:#a8d4ff;'>-"+fmt(val)+"</span></div></div>";
    };
    if(dc.tErw>0.01) r+=savLine("Mehrklassenvorteil",dc.tErw);
    if(dc.mEur>0)    r+=savLine("Mofa-Rabatt",dc.mEur);
    if(dc.aV>0)      r+=savLine(dc.aL||"Rabatt",dc.aV);
  }
  r+="<div style='height:1px;background:rgba(255,255,255,.1);margin:8px 0;'></div><div style='display:flex;justify-content:space-between;align-items:center;'>";
  r+="<span style='color:#fff;font-size:14px;font-weight:700;'>Gesamt (inkl. MwSt.)</span><span style='color:#fff;font-size:22px;font-weight:800;'>"+fmt(dc.total)+"</span></div>";
  r+="</div><div class='nr'><button class='nbk' data-act='go' data-id='3'>Zur\u00fcck</button><button class='nxt' data-act='go' data-id='5'>Weiter: Abschluss &rsaquo;</button></div></div>";
  return r;
}
function rS5(){
  var items=buildItems(),dc=calcD(items),all=getSel();
  var odSub=odWerte().sub||"Fahrschule\\KVA";
  var r="<div class='card'><div class='ct'>Abschluss</div><div class='cs'>KVA drucken, speichern, per Outlook oder Post versenden.</div><div style='margin-top:14px;'>";
  r+="<div style='background:linear-gradient(135deg,#3F4B57,#2A6CAE);border-radius:12px;padding:16px 18px;margin-bottom:14px;'>";
  r+="<div style='display:flex;justify-content:space-between;align-items:flex-start;'>";
  r+="<div><div style='font-size:12px;color:#94a3b8;margin-bottom:1px;'>"+esc(S.kva)+"</div>";
  r+="<div style='font-size:15px;font-weight:700;color:#fff;'>"+esc((S.c.anrede==="Firma"&&S.c.company?S.c.company:S.c.name)||"\u2013")+"</div>";
  if(S.c.anrede==="Firma"&&S.c.company&&S.c.name) r+="<div style='font-size:11px;color:#94a3b8;'>Fahrsch\u00fcler: "+esc(S.c.name)+"</div>";
  r+="<div style='font-size:11px;color:#94a3b8;'>"+esc(all.map(function(c){return c.l;}).join(", ")||"\u2013")+"</div></div>";
  r+="<div style='text-align:right;'><div style='font-size:11px;color:#94a3b8;'>Gesamtbetrag</div><div style='font-size:26px;font-weight:800;color:#fff;'>"+fmt(dc.total)+"</div></div></div>";
  if(dc.tSav>0.01){
    var savLine3=function(label,val){
      return "<div style='margin-top:8px;background:rgba(168,212,255,.16);border:1px solid rgba(168,212,255,.4);border-radius:8px;padding:6px 10px;'>"
        +"<div style='display:flex;justify-content:space-between;align-items:baseline;'>"
        +"<span style='font-size:12px;font-weight:700;color:#a8d4ff;'>"+esc(label)+"</span>"
        +"<span style='font-size:13px;font-weight:800;color:#a8d4ff;'>-"+fmt(val)+"</span></div></div>";
    };
    if(dc.tErw>0.01) r+=savLine3("Mehrklassenvorteil",dc.tErw);
    if(dc.mEur>0)    r+=savLine3("Mofa-Rabatt",dc.mEur);
    if(dc.aV>0)      r+=savLine3(dc.aL||"Rabatt",dc.aV);
  }
  r+="</div>";
  // Infoblatt-Toggle ÜBER den Drucken-Buttons
  r+="<div id='infoblatt-row' style='background:#eef4fb;border:1.5px solid #2A6CAE;border-radius:10px;padding:10px 14px;margin-bottom:10px;display:flex;align-items:center;gap:12px;cursor:pointer;' onclick='toggleInfoBlatt()'>";
  r+="<div style='flex:1;'><div style='font-size:13px;font-weight:700;color:#2A6CAE;'>&#128203; Ausbildungsinformationen beilegen</div>";
  r+="<div style='font-size:11px;color:#555;margin-top:2px;'>2. Seite mit Theorie, Fahrstunden &amp; Antragsunterlagen f\u00fcr die gew\u00e4hlten Klassen</div></div>";
  r+="<span id='infoblatt-icon' style='font-size:22px;'>"+(S.infoBlatt?"\u2705":"\u2b1c")+"</span>";
  r+="</div>";
  // hatFL: Bereits vorhandene Fahrerlaubnis -> Grundstunden 12->6
  var hatFLon=S.hatFL;
  r+="<div id='hatfl-row' style='background:"+(hatFLon?"#fff5f5":"#fafafa")+";border:1.5px solid "+(hatFLon?"#C0001A":"#e0e0e0")+";border-radius:10px;padding:10px 14px;margin-bottom:10px;display:flex;align-items:center;gap:12px;cursor:pointer;' data-act='hatFL'>";
  r+="<div style='flex:1;'><div style='font-size:13px;font-weight:700;color:"+(hatFLon?"#C0001A":"#555")+";'>&#128091; Bewerber besitzt bereits eine Fahrerlaubnisklasse</div>";
  r+="<div style='font-size:11px;color:#555;margin-top:2px;'>Grundunterricht reduziert: 12 \u2192 6 DS gem. \u00a7\u202f5 FahrschAusbO \u2014 bitte auf dem Ausbildungsinformationsblatt pr\u00fcfen</div></div>";
  r+="<span style='font-size:22px;'>"+(hatFLon?"\u2705":"\u2b1c")+"</span>";
  r+="</div>";
  r+="<div style='display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;'>";
  r+="<button class='acb' style='border-color:#C0001A;background:#fff5f5;' data-act='print' onclick=''><span style='font-size:20px;'>&#128424;&#65039;</span><span style='font-size:12px;font-weight:700;'>Drucken</span><span style='font-size:10px;color:#C0001A;font-weight:600;'>Strg+P</span></button>";
  r+="<button class='acb' style='border-color:#2A6CAE;background:#f3f8fc;' data-act='save' onclick=''><span style='font-size:20px;'>&#128190;</span><span style='font-size:12px;font-weight:700;'>Als PDF in OneDrive</span><span style='font-size:9px;color:#2A6CAE;font-weight:600;'>"+(_kvaDir?esc(_kvaDir.name)+(_kvaPerm==='granted'?' \u2713':' \u2013 Zugriff erneuern'):'Ordner in Einstellungen w\u00e4hlen')+"</span></button>";
  r+="<button class='acb' style='border-color:#2A6CAE;background:#eef4fb;' data-act='mail' onclick=''><span style='font-size:20px;'>&#9993;&#65039;</span><span style='font-size:12px;font-weight:700;'>Per Outlook senden</span><span style='font-size:9px;color:#888;'>"+esc(S.c.email||'E-Mail eingeben')+"</span></button>";
  r+="<button class='acb' data-act='go' data-id='0' onclick=''><span style='font-size:20px;'>&#9999;&#65039;</span><span style='font-size:12px;font-weight:700;'>Bearbeiten</span></button>";
  r+="</div>";
  r+="<button data-act='resetall' onclick='' style='width:100%;background:#f8fafc;border:1.5px solid #ddd;border-radius:10px;padding:9px 14px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:14px;font-size:12px;color:#666;font-weight:600;'><span style='font-size:16px;'>&#128196;</span>Neuer KVA starten</button>";
r+="<div class='dv'></div><div class='sec'>Vorschau KVA</div>";
  r+=buildKVAhtml(items,dc);
  r+="<div class='nr' style='margin-top:18px;'><button class='nbk' data-act='go' data-id='4'>&#8592; Zur\u00fcck zu Rabatten</button></div>";
  r+="</div></div>";
  setTimeout(updatePrintArea,80);
  return r;
}
function rStepper(){
  var r="";
  for(var i=0;i<STEPS.length;i++){
    var c=i<S.step?"dn":i===S.step?"ac":"pe";
    var l=i<S.step?"dn":i===S.step?"ac":"";
    var clickable=i<S.step?" clickable' data-step='"+i+"' title='Zu Schritt "+(i+1)+" springen":"";
    r+="<div class='si"+clickable+"'><div class='sd "+c+"'>"+(i<S.step?"&#10003;":(i+1))+"</div><div class='sl "+l+"'>"+STEPS[i]+"</div></div>";
    if(i<STEPS.length-1) r+="<div class='sl2"+(i<S.step?" dn":"")+"'></div>";
  }
  q("stepper").innerHTML=r;
  q("kn").textContent=S.kva;
}
function render(){
  rStepper();
  var html="";
  if(S.step===0) html=rS0();
  else if(S.step===1) html=rS1();
  else if(S.step===2) html=rS2();
  else if(S.step===3) html=rS3();
  else if(S.step===4) html=rS4();
  else html=rS5();
  q("kva-app").innerHTML=html;
}
/* render wird von renderKVA aufgerufen */

// ════════════════════════════════════════════════════════════════════
//  KVA: Persistierter OneDrive-Ordner + echtes PDF-Speichern
// ════════════════════════════════════════════════════════════════════
var _kvaDir=null,_kvaPerm='prompt';
var KVA_DIRKEY='kvaDirHandle';
function _kvaDb(){return new Promise(function(res,rej){var r=indexedDB.open('kva-store',1);r.onupgradeneeded=function(){r.result.createObjectStore('kv');};r.onsuccess=function(){res(r.result);};r.onerror=function(){rej(r.error);};});}
async function kvaDbSet(k,v){var db=await _kvaDb();return new Promise(function(res,rej){var tx=db.transaction('kv','readwrite');tx.objectStore('kv').put(v,k);tx.oncomplete=function(){res();};tx.onerror=function(){rej(tx.error);};});}
async function kvaDbGet(k){var db=await _kvaDb();return new Promise(function(res,rej){var tx=db.transaction('kv','readonly');var rq=tx.objectStore('kv').get(k);rq.onsuccess=function(){res(rq.result);};rq.onerror=function(){rej(rq.error);};});}
async function kvaLoadDir(){try{var h=await kvaDbGet(KVA_DIRKEY);if(h){_kvaDir=h;try{_kvaPerm=await h.queryPermission({mode:'readwrite'});}catch(e){_kvaPerm='prompt';}}}catch(e){}}
var _kvaDirReady=kvaLoadDir();

async function kvaPickDir(){
  if(typeof window.showDirectoryPicker!=='function'){alert('Ordnerauswahl wird von diesem Browser nicht unterstützt (Chrome/Edge verwenden).');return;}
  try{
    var h=await window.showDirectoryPicker({mode:'readwrite'});
    _kvaDir=h;_kvaPerm='granted';
    await kvaDbSet(KVA_DIRKEY,h);
    if(typeof toast==='function')toast('KVA-Speicherordner gesetzt: '+h.name,'ok');
    kvaUpdateDirStatus();
  }catch(e){}
}
async function kvaClearDir(){_kvaDir=null;_kvaPerm='prompt';try{await kvaDbSet(KVA_DIRKEY,null);}catch(e){}kvaUpdateDirStatus();}
async function kvaReaktiviereDir(){
  if(!_kvaDir)return;
  try{_kvaPerm=await _kvaDir.requestPermission({mode:'readwrite'});}catch(e){_kvaPerm='prompt';}
  kvaUpdateDirStatus();
  if(_kvaPerm==='granted'&&typeof toast==='function')toast('Zugriff auf '+_kvaDir.name+' aktiv','ok');
}
function kvaDirStatusHtml(){
  if(!_kvaDir){
    return '<button class="btn btn-outline" onclick="kvaPickDir()" style="font-size:12px">📁 OneDrive-Ordner wählen</button>'
      +'<span style="font-size:11px;color:var(--grau)">KVA-PDFs werden dort automatisch abgelegt.</span>';
  }
  if(_kvaPerm!=='granted'){
    return '<span class="tag" style="font-size:11px;background:#FFF7ED;color:#92400e">📁 '+_kvaDir.name+'</span>'
      +'<button class="btn btn-outline" onclick="kvaReaktiviereDir()" style="font-size:12px">🔓 Zugriff erneuern</button>'
      +'<span style="font-size:11px;color:var(--grau)">Nach Browser-Neustart einmal bestätigen.</span>'
      +'<button class="btn ghost sm" onclick="kvaClearDir()" style="font-size:11px">Entfernen</button>';
  }
  return '<span class="tag green" style="font-size:11px">📁 '+_kvaDir.name+' ✓</span>'
    +'<button class="btn ghost sm" onclick="kvaClearDir()" style="font-size:11px">Entfernen</button>';
}
function kvaUpdateDirStatus(){var el=document.getElementById('kva-dir-status');if(el)el.innerHTML=kvaDirStatusHtml();}

// KVA als echtes PDF erzeugen (identisches Layout via Druckbereich) und speichern
async function kvaPdfSpeichern(){
  if(!window.jspdf||!window.jspdf.jsPDF||typeof html2canvas!=='function'){
    alert('PDF-Bibliothek noch nicht geladen – bitte kurz warten und erneut versuchen.');return;
  }
  updatePrintArea();
  var pa=document.querySelector('.kva-print-area');
  if(!pa){alert('Druckbereich nicht gefunden.');return;}

  // Sichtbar rendern (offscreen) mit fester A4-Breite
  var wrap=document.createElement('div');
  wrap.style.cssText='position:fixed;left:-10000px;top:0;width:794px;background:#fff;z-index:-1';
  wrap.innerHTML=pa.innerHTML;
  document.body.appendChild(wrap);

  try{
    if(typeof toast==='function')toast('PDF wird erzeugt …','ok');
    var jsPDF=window.jspdf.jsPDF;
    var doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});

    // Segment-basiertes Rendering: Seitenumbrüche an page-break-before:always
    // → Ausbildungsblatt startet immer auf einer frischen Seite
    var SCALE=1.5;
    var M_X=14, M_Y=12;                 // Seitenränder in mm
    var CW=210-2*M_X, CH=297-2*M_Y;     // nutzbare Fläche in mm

    // Wrap-Kinder in Segmente aufteilen (Trenner: page-break-before:always)
    var segs=[],curSeg=[];
    Array.from(wrap.children).forEach(function(child){
      if(child.style&&child.style.pageBreakBefore==='always'){
        if(curSeg.length) segs.push(curSeg);
        curSeg=[child];
      } else { curSeg.push(child); }
    });
    if(curSeg.length) segs.push(curSeg);
    if(!segs.length) segs.push(Array.from(wrap.children));

    var firstPg=true;
    for(var si=0;si<segs.length;si++){
      var segWrap=document.createElement('div');
      segWrap.style.cssText='position:fixed;left:-10000px;top:0;width:794px;background:#fff;z-index:-2';
      segs[si].forEach(function(el){ segWrap.appendChild(el.cloneNode(true)); });
      document.body.appendChild(segWrap);
      var canvas=await html2canvas(segWrap,{scale:SCALE,useCORS:true,logging:false,backgroundColor:'#ffffff',windowWidth:794});
      segWrap.remove();
      var pxProMm=canvas.width/CW;
      var pageHpx=Math.floor(CH*pxProMm);
      var pages=Math.max(1,Math.ceil(canvas.height/pageHpx));
      for(var pi=0;pi<pages;pi++){
        var sliceH=Math.min(pageHpx,canvas.height-pi*pageHpx);
        var pc=document.createElement('canvas');
        pc.width=canvas.width;pc.height=sliceH;
        var ctx=pc.getContext('2d');
        ctx.fillStyle='#ffffff';ctx.fillRect(0,0,pc.width,pc.height);
        ctx.drawImage(canvas,0,pi*pageHpx,canvas.width,sliceH,0,0,canvas.width,sliceH);
        var img=pc.toDataURL('image/jpeg',0.92);
        if(!firstPg) doc.addPage();
        firstPg=false;
        var hMm=sliceH/pxProMm;
        doc.addImage(img,'JPEG',M_X,M_Y,CW,hMm);
      }
    }

    var blob=doc.output('blob');
    var kunde=(S.c.anrede==='Firma'&&S.c.company?S.c.company:S.c.name)||'';
    var fname=(S.kva+(kunde?' '+kunde:'')+'.pdf').replace(/[\\/:*?"<>|]/g,'_');

    var dirOk=false;
    if(_kvaDir){
      try{
        var p=await _kvaDir.queryPermission({mode:'readwrite'});
        if(p!=='granted')p=await _kvaDir.requestPermission({mode:'readwrite'});
        _kvaPerm=p;dirOk=(p==='granted');
      }catch(e){dirOk=false;}
    }
    if(dirOk){
      var fh=await _kvaDir.getFileHandle(fname,{create:true});
      var w=await fh.createWritable();
      await w.write(blob);await w.close();
      if(typeof toast==='function')toast('Gespeichert: '+_kvaDir.name+'/'+fname,'ok');
    }else{
      var a=document.createElement('a');
      a.href=URL.createObjectURL(blob);a.download=fname;a.click();
      URL.revokeObjectURL(a.href);
      if(typeof toast==='function')toast(_kvaDir
        ?'Ordner-Freigabe fehlt – PDF als Download gespeichert. In Einstellungen → KVA „Zugriff erneuern“.'
        :'Kein KVA-Ordner gewählt – PDF als Download gespeichert (Einstellungen → KVA).','ok');
    }
  }catch(e){
    console.error('kvaPdfSpeichern:',e);
    alert('PDF-Erzeugung fehlgeschlagen: '+e.message);
  }finally{
    wrap.remove();
  }
}
