/* ============================================================
   patch_standorte.js
   Fahrschulverwaltung - Standorte je Fahrer
   Aendert: schulung.html
   Sicherung: schulung.html.bak-standorte
   ============================================================
   VORHER in Supabase ausfuehren:
     33_standorte_essmann.sql
     34_standort_in_extdates.sql
   Ausfuehren im Projektordner:  node patch_standorte.js
   ============================================================ */

const fs = require('fs');
const DATEI = 'schulung.html';
const SICHERUNG = 'schulung.html.bak-standorte';

if (!fs.existsSync(DATEI)) {
  console.error('ABBRUCH: ' + DATEI + ' nicht gefunden. Bitte im Projektordner ausfuehren.');
  process.exit(1);
}

const buf = fs.readFileSync(DATEI);
let txt = buf.toString('latin1');
fs.writeFileSync(SICHERUNG, buf);
console.log('Sicherung angelegt: ' + SICHERUNG);

let fehler = 0, treffer = 0;
const CRLF = (txt.match(/\r\n/g) || []).length > (txt.split('\n').length / 2);
const zeilenenden = s => CRLF ? s.replace(/\r?\n/g, '\r\n') : s;

// Umlaute: die Datei ist UTF-8, wird aber byteweise als latin1 gelesen.
// u() wandelt einen normalen Text in genau diese Byte-Darstellung um.
const u = s => Buffer.from(s, 'utf8').toString('latin1');

function alsRegex(s) {
  const esc = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(esc.replace(/\r?\n/g, '\\r?\\n'), 'g');
}

function ersetze(name, suchen, ersatz, mehrfachErlaubt) {
  const re = alsRegex(u(suchen));
  const anzahl = (txt.match(re) || []).length;
  if (anzahl === 0) { console.error('  FEHLT   : ' + name); fehler++; return; }
  if (anzahl > 1 && !mehrfachErlaubt) {
    console.error('  MEHRDEUTIG (' + anzahl + 'x): ' + name); fehler++; return;
  }
  txt = txt.replace(re, zeilenenden(u(ersatz)).replace(/\$/g, '$$$$'));
  console.log('  ok (' + anzahl + 'x): ' + name);
  treffer++;
}

/* ===== 1. Hilfsfunktionen ===== */

const HELFER = `// ===== Standorte ============================================
// Ein Standort ist eine Betriebsstaette einer Firma. Rechnungen
// gehen weiterhin an die Firma; der Standort haengt am Fahrer und
// wird in ext_dates.STANDORT gespeichert (Spalte standort_id wird
// per Datenbank-Ausloeser automatisch mitgefuehrt).
var _srtCache = null;

function _srtKopf(){
  var tok = (typeof getAccessToken === 'function' && getAccessToken()) || MAIN_KEY;
  return { apikey: MAIN_KEY, Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' };
}

async function srtLoad(neu){
  if (_srtCache && !neu) return _srtCache;
  try{
    const r = await fetch(MAIN_URL + '/rest/v1/schulung_standorte?select=*&order=name',
      { headers: _srtKopf() });
    _srtCache = r.ok ? await r.json() : [];
  }catch(e){ console.warn('Standorte laden', e); _srtCache = []; }
  return _srtCache;
}

function srtFor(companyId){
  return (_srtCache || []).filter(function(s){ return s.company_id === companyId; });
}

function srtName(id){
  const s = (_srtCache || []).find(function(x){ return x.id === id; });
  return s ? s.name : '';
}

// Auswahlfeld im Teilnehmer-Dialog fuellen. Hat die Firma keine
// Standorte, bleibt das Feld ausgeblendet.
async function srtFillSelect(companyId, gewaehlt){
  const wrap = document.getElementById('m_standortWrap');
  const sel  = document.getElementById('ext_STANDORT');
  if (!wrap || !sel) return;
  await srtLoad();
  const liste = srtFor(companyId);
  if (!liste.length){
    wrap.style.display = 'none';
    sel.innerHTML = '<option value=""></option>';
    return;
  }
  wrap.style.display = '';
  sel.innerHTML = '<option value="">\\u2014 kein Standort \\u2014</option>' +
    liste.map(function(s){
      return '<option value="' + s.id + '"' + (s.id === gewaehlt ? ' selected' : '') + '>' + _esc(s.name) + '</option>';
    }).join('');
}

// Verwaltung im Firmen-Dialog
async function srtRenderManage(companyId){
  const box = document.getElementById('co_standorte');
  if (!box || !companyId) return;
  await srtLoad(true);
  const liste = srtFor(companyId);
  const zeilen = liste.length ? liste.map(function(s){
    const ort = (s.addr || '').split('\\n')[0] || '';
    return '<div style="display:flex;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid var(--border)">'
      + '<div style="flex:1;min-width:0">'
      +   '<div style="font-weight:600;font-size:.88rem">' + _esc(s.name) + '</div>'
      +   '<div style="font-size:.75rem;color:var(--muted)">' + _esc([ort, s.contact, s.phone].filter(Boolean).join(' \\u00b7 ')) + '</div>'
      + '</div>'
      + '<button type="button" class="btn ghost sm" onclick="srtRename(\\'' + s.id + '\\')">Umbenennen</button>'
      + '<button type="button" class="btn ghost sm" style="color:#C0001A;border-color:#C0001A" onclick="srtDelete(\\'' + s.id + '\\',\\'' + companyId + '\\')">L\\u00f6schen</button>'
      + '</div>';
  }).join('') : '<div class="hint">Noch keine Standorte angelegt.</div>';

  box.innerHTML = zeilen
    + '<div style="display:flex;gap:8px;margin-top:10px">'
    +   '<input id="srt_neu" placeholder="Name des Standorts" style="flex:1">'
    +   '<button type="button" class="btn sm" onclick="srtAdd(\\'' + companyId + '\\')">Hinzuf\\u00fcgen</button>'
    + '</div>';
}

async function srtAdd(companyId){
  const el = document.getElementById('srt_neu');
  const name = el ? el.value.trim() : '';
  if (!name){ toast('Bitte einen Namen eingeben'); return; }
  try{
    const r = await fetch(MAIN_URL + '/rest/v1/schulung_standorte',
      { method:'POST', headers:Object.assign(_srtKopf(), {Prefer:'return=representation'}),
        body: JSON.stringify({ company_id: companyId, name: name }) });
    if (!r.ok) throw new Error(await r.text());
    toast('Standort angelegt');
    srtRenderManage(companyId);
  }catch(e){ console.warn('Standort anlegen', e); toast('Fehler beim Anlegen'); }
}

function srtRename(id){
  const s = (_srtCache || []).find(function(x){ return x.id === id; });
  if (!s) return;
  const neu = prompt('Neuer Name des Standorts:', s.name);
  if (neu === null) return;
  const wert = neu.trim();
  if (!wert){ toast('Name darf nicht leer sein'); return; }
  fetch(MAIN_URL + '/rest/v1/schulung_standorte?id=eq.' + id,
    { method:'PATCH', headers:_srtKopf(), body: JSON.stringify({ name: wert }) })
    .then(function(r){
      if (!r.ok) throw new Error('HTTP ' + r.status);
      toast('Standort umbenannt');
      srtRenderManage(s.company_id);
    })
    .catch(function(e){ console.warn('Standort umbenennen', e); toast('Fehler beim Umbenennen'); });
}

function srtDelete(id, companyId){
  const s = (_srtCache || []).find(function(x){ return x.id === id; });
  const anz = (state.participants || []).filter(function(p){
    return p.extDates && p.extDates.STANDORT === id;
  }).length;
  const zusatz = anz > 0 ? '\\n\\n' + anz + ' Fahrer verlieren die Standortzuordnung. Die Firma bleibt erhalten.' : '';
  askConfirm('Standort \\u201e' + (s ? s.name : '?') + '\\u201c l\\u00f6schen?' + zusatz, function(){
    fetch(MAIN_URL + '/rest/v1/schulung_standorte?id=eq.' + id, { method:'DELETE', headers:_srtKopf() })
      .then(function(r){
        if (!r.ok) throw new Error('HTTP ' + r.status);
        (state.participants || []).forEach(function(p){
          if (p.extDates && p.extDates.STANDORT === id) delete p.extDates.STANDORT;
        });
        save();
        toast('Standort gel\\u00f6scht');
        srtRenderManage(companyId);
      })
      .catch(function(e){ console.warn('Standort loeschen', e); toast('Fehler beim L\\u00f6schen'); });
  });
}

function openParticipant(id, presetCoId){
  setTimeout(function(){
    try{
      const _p = id ? state.participants.find(function(x){ return x.id === id; }) : null;
      const _co = _p ? _p.companyId : (presetCoId || '');
      const _st = (_p && _p.extDates) ? (_p.extDates.STANDORT || '') : '';
      srtFillSelect(_co, _st);
    }catch(e){ console.warn('Standort-Vorbelegung', e); }
  }, 0);`;

ersetze('1. Hilfsfunktionen fuer Standorte',
`function openParticipant(id, presetCoId){`,
HELFER);

/* ===== 2. Feld im Teilnehmer-Dialog ===== */

ersetze('2. Teilnehmer-Dialog: Standort-Auswahl',
`    <div class="field"><label>Firma (manuell, falls nicht im Stamm)</label><input id="m_company" value="\${_esc(p.company||'')}" placeholder="Nur ausfüllen wenn Firma nicht oben wählbar"></div>`,
`    <div class="field"><label>Firma (manuell, falls nicht im Stamm)</label><input id="m_company" value="\${_esc(p.company||'')}" placeholder="Nur ausfüllen wenn Firma nicht oben wählbar"></div>
    <div class="field" id="m_standortWrap" style="display:none"><label>Standort</label><select id="ext_STANDORT"></select>
      <div class="hint">Standorte legst du im Firmen-Dialog an.</div>
    </div>`);

/* ===== 3. Standort mitspeichern ===== */

ersetze('3. Standort in die Speicherliste aufnehmen',
`['GS','LK','FT','ADR','BM','AB','AT','AF','SZ95','FE','GESCHLECHT'].forEach(`,
`['GS','LK','FT','ADR','BM','AB','AT','AF','SZ95','FE','GESCHLECHT','STANDORT'].forEach(`);

/* ===== 4. Auswahl aktualisieren bei Firmenwechsel ===== */

ersetze('4. Firmenwechsel aktualisiert die Standortliste',
`  const co=state.companies.find(x=>x.id===sel.value);
  if(co){document.getElementById('m_company').value='';document.getElementById('m_company').placeholder='Wird von Firmenstamm übernommen: '+co.name;}
}`,
`  const co=state.companies.find(x=>x.id===sel.value);
  if(co){document.getElementById('m_company').value='';document.getElementById('m_company').placeholder='Wird von Firmenstamm übernommen: '+co.name;}
  try{ srtFillSelect(sel.value, ''); }catch(e){}
}`);

/* ===== 5. Standortverwaltung im Firmen-Dialog ===== */

ersetze('5a. Firmen-Dialog: Bereich Standorte',
`    <div class="field"><label>E-Mail Rechnungsversand</label><input id="co_invmail" type="email" value="\${co.invoiceEmail||''}" placeholder="buchhaltung@firma.de">
      <div class="hint" style="margin-top:4px">Leer lassen, wenn Rechnungen an die Adresse oben gehen sollen.</div></div>`,
`    <div class="field"><label>E-Mail Rechnungsversand</label><input id="co_invmail" type="email" value="\${co.invoiceEmail||''}" placeholder="buchhaltung@firma.de">
      <div class="hint" style="margin-top:4px">Leer lassen, wenn Rechnungen an die Adresse oben gehen sollen.</div></div>
    \${id?\`<div class="field" style="margin-top:14px">
      <div style="font-size:.82rem;font-weight:700;color:var(--steel);margin-bottom:6px;padding-bottom:5px;border-bottom:1px solid var(--border)">Standorte</div>
      <div id="co_standorte"><div class="hint">wird geladen …</div></div>
      <div class="hint" style="margin-top:5px">Standorte sind Betriebsstätten dieser Firma. Rechnungen gehen weiterhin an die Firma; im Teilnehmer-Dialog lässt sich jedem Fahrer ein Standort zuweisen.</div>
    </div>\`:''}`);

ersetze('5b. Firmen-Dialog: Standorte laden',
`function openCompany(id){`,
`function openCompany(id){
  if(id) setTimeout(function(){ try{ srtRenderManage(id); }catch(e){} }, 0);`);

/* ===== Ergebnis ===== */
console.log('');
if (fehler > 0) {
  console.error('ABBRUCH: ' + fehler + ' Suchmuster passten nicht. Datei NICHT veraendert.');
  console.error('Die Sicherung ' + SICHERUNG + ' kann geloescht werden.');
  process.exit(1);
}
fs.writeFileSync(DATEI, Buffer.from(txt, 'latin1'));
console.log('FERTIG: ' + treffer + ' Aenderungen in ' + DATEI + ' geschrieben.');
console.log('Zuruecknehmen mit:  copy ' + SICHERUNG + ' ' + DATEI);
