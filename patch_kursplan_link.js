/* patch_kursplan_link.js  -  schulung.html
   Verknuepft einen Lehrgang mit einem BKrFQG-Kursplan.
   Voraussetzung: Spalte kursplan_id (uuid) in schulung_courses. */

const fs = require('fs');
const path = require('path');

const DATEI = path.join(process.cwd(), 'schulung.html');
if (!fs.existsSync(DATEI)) {
  console.error('ABBRUCH: schulung.html nicht gefunden.');
  process.exit(1);
}

const buf = fs.readFileSync(DATEI);
let txt = buf.toString('latin1');
const EOL = txt.indexOf('\r\n') >= 0 ? '\r\n' : '\n';
const z = s => s.replace(/\n/g, EOL);

if (txt.indexOf('kursplanFeldInit') >= 0) {
  console.log('Bereits eingebaut, nichts zu tun.');
  process.exit(0);
}

const A1 = /(fes_bausteine: Array\.isArray\(c\.fesBausteine\)\?c\.fesBausteine:\[\],)/;
const A2 = /(fesBausteine: Array\.isArray\(r\.fes_bausteine\)\?r\.fes_bausteine:\[\],)/;
const A3 = /(id="m_dateTo"[^\r\n]*<\/div>[\r\n]+[ \t]*<\/div>)/;
const A4 = /onchange="courseThemes\(\);updateCourseTypeIcon\(\);toggleLSDauer\(\);toggleFFZ\(\);toggleFES\(\)"/;
const A5 = /([ \t]*initCourseSummary\(\);)/;
const A6 = /(dozent:document\.getElementById\('m_dozent'\)\.value,themes,)/;
const A7 = /function saveCourse\(id\)\{/;

const namen = ['_kursZuDb', '_kursVonDb', 'Dialog m_dateTo', 'Typwechsel',
               'initCourseSummary', 'saveCourse-Felder', 'function saveCourse'];
const fehler = [A1, A2, A3, A4, A5, A6, A7]
  .map((re, i) => re.test(txt) ? null : namen[i]).filter(Boolean);

if (fehler.length) {
  console.error('ABBRUCH - es wurde NICHTS geaendert. Nicht gefunden:');
  fehler.forEach(f => console.error('    ' + f));
  process.exit(1);
}

const FELD = String.raw`
      <div class="field" id="m_kursplanRow" style="margin:12px 0 0;display:none">
        <label>Kursplan (BKrFQG)</label>
        <select id="m_kursplan"><option value="">\u2013 kein Kursplan zugeordnet \u2013</option></select>
        <div style="font-size:.75rem;color:#6b7280;margin-top:4px">Liefert die Kurstage f\u00fcr die Anwesenheitsliste je Schulungstag.</div>
      </div>`;

const FN = String.raw`
// -- Kursplan-Verknuepfung (BKrFQG) ------------------------------------
// Nur bei den vier mehrtaegigen Lehrgangstypen sinnvoll - alle anderen
// laufen an einem Tag und brauchen keinen Kursplan.
const BGQ_LEHRGANGSTYPEN = ['BGQ LKW','BGQ KOM','Umsteiger LKW','Umsteiger KOM'];
let _kursplaeneCache = null;

async function _ladeKursplaene(){
  if (_kursplaeneCache) return _kursplaeneCache;
  try{
    const url = MAIN_URL + '/rest/v1/bkrfqg_kursplaene'
      + '?select=id,titel,kurstyp,startdatum,enddatum&order=startdatum.desc';
    const r = await fetch(url, { headers: mainHeaders() });
    if(!r.ok){ console.warn('Kursplaene laden: HTTP ' + r.status); return []; }
    _kursplaeneCache = await r.json();
    return _kursplaeneCache;
  }catch(e){ console.warn('Kursplaene laden', e.message); return []; }
}

async function kursplanFeldInit(vorbelegt){
  const sel = document.getElementById('m_kursplan');
  if(!sel) return;
  toggleKursplan();
  const liste = await _ladeKursplaene();
  let html = '<option value="">\u2013 kein Kursplan zugeordnet \u2013</option>';
  liste.forEach(function(k){
    const von  = k.startdatum ? fmt(k.startdatum) : '';
    const bis  = k.enddatum   ? fmt(k.enddatum)   : '';
    let zeit = '';
    if (von) zeit = ' (' + von + (bis