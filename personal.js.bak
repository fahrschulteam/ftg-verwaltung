// ════════════════════════════════════════════════════════════════════
//  MODUL PERSONAL  (vollständig)
//  Liste · Formular · Personalakte · aktuell/archiviert
// ════════════════════════════════════════════════════════════════════

let personalState = {
  mitarbeiter: [],
  filterStatus: 'aktiv',
  filterBereich: 'all',
  loaded: false,
};

const KLASSEN_ALLE = ['A','B','C','D'];

const QUALIFIKATIONEN = [
  { feld:'qual_ausb', kuerzel:'AFL', name:'Ausbildungsfahrlehrer', gesetz:'§53 Abs.3 FahrlG' },
  { feld:'qual_asf',  kuerzel:'ASF', name:'ASF-Moderator',         gesetz:'§53 Abs.2 FahrlG' },
  { feld:'qual_fes',  kuerzel:'FES', name:'FES-Moderator',         gesetz:'§53 Abs.2 FahrlG' },
  { feld:'qual_bkf',  kuerzel:'BKF', name:'BKF-Dozent',            gesetz:'§7 BKrFQV' },
  { feld:'qual_fps',  kuerzel:'FPS', name:'FPS-Überwacher',        gesetz:'§15 DV-FahrlG' },
  { feld:'qual_adr',  kuerzel:'ADR', name:'ADR (Gefahrgut)',       gesetz:'GGVSEB' },
  { feld:'ladekran',  kuerzel:'LK',  name:'Ladekran',              gesetz:'DGUV V 52' },
  { feld:'gabelstapler', kuerzel:'GS', name:'Gabelstapler',        gesetz:'DGUV V 68' },
];

async function ladeMitarbeiter() {
  try {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Zeitüberschreitung – Server antwortet nicht')), 15000));
    const { data, error } = await Promise.race([
      sb.from('mitarbeiter').select('*').order('nachname'),
      timeout,
    ]);
    if (error) { toast('Fehler beim Laden: ' + error.message, 'err'); }
    personalState.mitarbeiter = data || [];
  } catch(e) {
    toast('Ladefehler: ' + e.message + ' – bitte Seite neu laden', 'err');
    personalState.mitarbeiter = [];
    personalState.ladeFehler = e.message;
  }
  personalState.loaded = true;   // immer setzen, sonst hängt der Spinner
  if (window.onMitarbeiterGeladen) window.onMitarbeiterGeladen();
  try { await ladeFortbildungen(); } catch(e) { console.warn('Fortbildungen:', e); }
  try { await ladeMaDokumente(); } catch(e) { console.warn('MA-Dokumente:', e); }
  // Schulungs-iframe aktualisieren
  if (typeof sendMitarbeiterToSchulung === 'function') sendMitarbeiterToSchulung();
}

window.renderPersonal = async function() {
  const view = document.getElementById('view-personal');
  if (!personalState.loaded) {
    view.innerHTML = '<div class="loading"><div class="spinner"></div>Lade Personaldaten …</div>';
    await ladeMitarbeiter();
  }
  const aktiv  = personalState.mitarbeiter.filter(m => m.status === 'aktiv');
  const archiv = personalState.mitarbeiter.filter(m => m.status === 'archiviert');
  let liste = personalState.mitarbeiter.filter(m => m.status === personalState.filterStatus);
  if (personalState.filterBereich !== 'all')
    liste = liste.filter(m => m.bereich === personalState.filterBereich);

  // Sidebar nur beim ersten Mal rendern – verhindert Flackern bei Filterwechsel
  if (!document.getElementById('personal-mod-shell')) {
    view.innerHTML = `
      <div class="mod-shell" id="personal-mod-shell">
        <aside class="mod-side"><nav>
          <div class="mod-side-label">Personal</div>
          <button class="mod-side-btn" data-ps="aktiv" onclick="setPStatus('aktiv')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:20px;flex-shrink:0"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg><span class="mod-lbl">Aktive (<span id="p-cnt-aktiv">0</span>)</span></button>
          <button class="mod-side-btn" data-ps="archiviert" onclick="setPStatus('archiviert')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:20px;flex-shrink:0"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5" rx="1"/><line x1="10" y1="12" x2="14" y2="12"/></svg><span class="mod-lbl">Ausgeschieden (<span id="p-cnt-archiv">0</span>)</span></button>
          <div class="mod-side-divider"></div>
          <div class="mod-side-label">Bereich</div>
          <button class="mod-side-btn" data-pb="all" onclick="setPBereich('all')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:20px;flex-shrink:0"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/></svg><span class="mod-lbl">Alle</span></button>
          <button class="mod-side-btn" data-pb="fahrlehrer" onclick="setPBereich('fahrlehrer')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:20px;flex-shrink:0"><circle cx="12" cy="8" r="6"/><path d="M8.21 13.89 7 22l5-3 5 3-1.21-8.11"/></svg><span class="mod-lbl">Fahrlehrer</span></button>
          <button class="mod-side-btn" data-pb="verwaltung" onclick="setPBereich('verwaltung')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:20px;flex-shrink:0"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg><span class="mod-lbl">Verwaltung</span></button>
          <button class="mod-side-btn" data-pb="sonstige" onclick="setPBereich('sonstige')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:20px;flex-shrink:0"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span class="mod-lbl">Sonstige</span></button>
        </nav></aside>
        <div class="mod-main" id="personal-content"></div>
      </div>`;
  }

  // Zähler + Aktiv-Klassen aktualisieren (kein DOM-Rebuild)
  const cntA = document.getElementById('p-cnt-aktiv');
  const cntR = document.getElementById('p-cnt-archiv');
  if (cntA) cntA.textContent = aktiv.length;
  if (cntR) cntR.textContent = archiv.length;
  document.querySelectorAll('#personal-mod-shell [data-ps]').forEach(b =>
    b.classList.toggle('active', b.dataset.ps === personalState.filterStatus));
  document.querySelectorAll('#personal-mod-shell [data-pb]').forEach(b =>
    b.classList.toggle('active', b.dataset.pb === personalState.filterBereich));

  // Nur Inhalt neu rendern
  const content = document.getElementById('personal-content');
  if (!content) return;
  content.innerHTML = `
    <div class="toolbar" style="margin-bottom:16px">
      ${canWrite() ? '<button class="btn btn-primary btn-sm" onclick="oeffneMaForm()">＋ MA</button>' : ''}
      <button class="btn btn-outline btn-sm" onclick="exportPersonalCSV()">⬇ Excel</button>
      <button class="btn btn-outline btn-sm" onclick="oeffneBerichte()" title="Berichte & Druck" style="padding:6px 10px">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
      </button>
    </div>
    ${liste.length===0
      ? `<div class="module-placeholder"><div class="ph-icon">👥</div><h3>Keine Einträge</h3><p>${personalState.filterStatus==='aktiv'?'Noch keine aktiven Mitarbeiter. Klicke auf „＋ Mitarbeiter".':'Keine ausgeschiedenen Mitarbeiter.'}</p></div>`
      : `<div class="card" style="overflow:hidden"><table class="ma-table"><thead><tr><th>Mitarbeiter</th><th>Klassen</th><th>Qualifikationen</th><th>Eintritt</th><th style="text-align:right">Aktionen</th></tr></thead><tbody>${liste.map(maZeile).join('')}</tbody></table></div>`}
  `;
};

function jubilaeumInfo(m) {
  if (!m.eintrittsdatum) return null;
  const eintritt = new Date(m.eintrittsdatum), heute = new Date();
  const jahre = Math.floor((heute - eintritt)/(365.25*24*3600*1000));
  const naechstes = Math.ceil(Math.max(jahre,1)/5)*5;
  const jubDatum = new Date(eintritt); jubDatum.setFullYear(eintritt.getFullYear()+naechstes);
  const diffTage = Math.ceil((jubDatum - heute)/(24*3600*1000));
  if (diffTage > 60 || diffTage < -7) return null;   // weder zu weit in Zukunft noch schon vergangen
  return { jahre: naechstes, datum: jubDatum.toLocaleDateString('de-DE'), diffTage, heute: diffTage<=0 && diffTage>-7 };
}

function maZeile(m) {
  const BDOT = { fahrlehrer:'#2A6CAE', verwaltung:'#D97706', sonstige:'#6B7280' };
  const quals = QUALIFIKATIONEN.filter(q=>m[q.feld]).map(q=>`<span class="qchip">${q.kuerzel}</span>`).join('');
  const fbStatus = (m.bereich==='fahrlehrer' && typeof fortbildungsStatus==='function') ? fortbildungsStatus(m, fortbildungenCache) : null;
  const fbDot = (fbStatus && fbStatus.gesamt) ? `<span class="fb-mini-dot" style="background:${statusFarbe(fbStatus.gesamt)}" title="Fortbildung: ${statusLabel(fbStatus.gesamt)}"></span>` : '';
  const kl = (m.klassen||[]).join(', ') || '–';
  const eintritt = m.eintrittsdatum ? new Date(m.eintrittsdatum).toLocaleDateString('de-DE') : '–';
  const jub = jubilaeumInfo(m);
  const jubBadge = jub ? `<span class="jub-badge ${jub.heute?'heute':''}" title="${jub.jahre} Jahre am ${jub.datum}">🏆 ${jub.heute?'Jubiläum!':jub.diffTage+'T'}</span>` : '';
  return `<tr>
    <td><div class="ma-name-cell"><span class="bdot" style="background:${BDOT[m.bereich]||'#6B7280'}"></span><div class="ma-avatar">${(m.vorname?.[0]||'')}${(m.nachname?.[0]||'')}</div><div><div class="ma-name">${fbDot}${m.nachname||'(ohne Nachname)'}, ${m.vorname||'(ohne Vorname)'} ${jubBadge}</div><div class="ma-sub">${m.rolle||'–'}${m.ort?' · '+m.ort:''}</div></div></div></td>
    <td>${kl}</td>
    <td><div class="qchips">${quals||'–'}</div></td>
    <td>${eintritt}</td>
    <td><div class="tbl-actions">
      <button class="btn btn-outline btn-sm" onclick="oeffneMaAkte('${m.id}')">👁 Akte</button>
      ${canWrite()?`<button class="btn btn-outline btn-sm" onclick="oeffneMaForm('${m.id}')">✎</button>`:''}
      ${canWrite()&&m.status==='aktiv'?`<button class="btn btn-outline btn-sm" onclick="archiviereMa('${m.id}')" title="Archivieren">📦</button>`:''}
      ${canWrite()&&m.status==='archiviert'?`<button class="btn btn-outline btn-sm" onclick="reaktiviereMa('${m.id}')" title="Reaktivieren">↩</button>`:''}
    </div></td></tr>`;
}

function setPStatus(s){ personalState.filterStatus=s; renderPersonal(); }
function setPBereich(b){ personalState.filterBereich=b; renderPersonal(); }

// ── FORMULAR ──
function oeffneMaForm(id) {
  const m = id ? personalState.mitarbeiter.find(x=>x.id===id) : null;
  const cf = (m?.custom_fields)||[];
  const modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.id = 'ma-form-modal';
  modal.innerHTML = `
    <div class="modal" style="width:min(1280px,96vw);max-height:95vh">
      <div class="modal-header"><h3>${m?'Mitarbeiter bearbeiten':'Mitarbeiter anlegen'}</h3><button class="close-btn" onclick="schliesseMaForm()">✕</button></div>
      <div class="modal-body">
        <input type="hidden" id="mf-id" value="${m?.id||''}">
        <div class="fsec">Stammdaten</div>
        <div class="fgrid">
          <div class="frow"><label>Vorname *</label><input id="mf-vorname" value="${m?.vorname||''}"></div>
          <div class="frow"><label>Nachname *</label><input id="mf-nachname" value="${m?.nachname||''}"></div>
          <div class="frow"><label>Geburtsdatum</label><input type="date" id="mf-geburtsdatum" value="${m?.geburtsdatum||''}"></div>
          <div class="frow"><label>Geburtsort</label><input id="mf-geburtsort" value="${m?.geburtsort||''}"></div>
        </div>
        <div class="fsec">Adresse</div>
        <div class="frow"><label>Straße &amp; Hausnummer</label><input id="mf-strasse" value="${m?.strasse||''}"></div>
        <div class="fgrid">
          <div class="frow"><label>PLZ</label><input id="mf-plz" value="${m?.plz||''}" maxlength="5"></div>
          <div class="frow"><label>Wohnort</label><input id="mf-ort" value="${m?.ort||''}"></div>
          <div class="frow"><label>Telefon</label><input id="mf-telefon" value="${m?.telefon||''}"></div>
          <div class="frow"><label>E-Mail</label><input type="email" id="mf-email" value="${m?.email||''}"></div>
        </div>
        <div class="fsec">Beschäftigung</div>
        <div class="fgrid">
          <div class="frow"><label>Funktion / Rolle</label>
            <select id="mf-rolle" onchange="mfRolleChange()">
              <optgroup label="Fahrlehrer">
                <option ${m?.rolle==='Fahrlehrer'?'selected':''}>Fahrlehrer</option>
                <option ${m?.rolle==='Fahrlehrerin'?'selected':''}>Fahrlehrerin</option>
                <option ${m?.rolle==='Fahrlehrer-Anwärter'?'selected':''}>Fahrlehrer-Anwärter</option>
              </optgroup>
              <optgroup label="Verwaltung">
                <option ${m?.rolle==='Bürokraft'?'selected':''}>Bürokraft</option>
                <option ${m?.rolle==='Verwaltungsleitung'?'selected':''}>Verwaltungsleitung</option>
                <option ${m?.rolle==='Buchhaltung'?'selected':''}>Buchhaltung</option>
                <option ${m?.rolle==='Inhaber / Geschäftsführung'?'selected':''}>Inhaber / Geschäftsführung</option>
              </optgroup>
              <optgroup label="Sonstige">
                <option ${m?.rolle==='Reinigung'?'selected':''}>Reinigung</option>
                <option ${m?.rolle==='Auszubildender'?'selected':''}>Auszubildender</option>
                <option ${m?.rolle==='Minijob'?'selected':''}>Minijob</option>
                <option ${m?.rolle==='Sonstige'?'selected':''}>Sonstige</option>
              </optgroup>
            </select></div>
          <div class="frow"><label>Eintrittsdatum</label><input type="date" id="mf-eintritt" value="${m?.eintrittsdatum||''}"></div>
        </div>
        <div id="mf-fahrlehrer-block">
          <div class="fsec">Fahrerlaubnisklassen</div>
          <div class="chip-grid">${KLASSEN_ALLE.map(k=>`<label class="chip"><input type="checkbox" class="mf-klasse" value="${k}" ${(m?.klassen||[]).includes(k)?'checked':''}> ${k}</label>`).join('')}</div>
          <div class="fsec">Qualifikationen</div>
          <div class="qual-grid">${QUALIFIKATIONEN.map(q=>`<label class="qual-item"><input type="checkbox" class="mf-qual" data-feld="${q.feld}" ${m?.[q.feld]?'checked':''}><span class="qual-name">${q.name}</span><span class="qual-law">${q.gesetz}</span></label>`).join('')}</div>
          <div class="fgrid" style="margin-top:18px">
            <div class="frow"><label>Fristablauf Fortbildung §53 (1) FahrlG</label><input type="number" id="mf-frist-fahrlg" value="${m?.frist_fahrlg||''}" min="2018" max="2040" placeholder="z.B. 2027"></div>
            <div class="frow"><label>Fristablauf BKF-Dozent §7 BKrFQV</label><input type="number" id="mf-frist-bkf" value="${m?.frist_bkf||''}" min="2018" max="2040" placeholder="z.B. 2027"></div>
            <div class="frow"><label>Fristablauf AFL-Fortbildung §53 (3) FahrlG</label><input type="number" id="mf-frist-afl" value="${m?.frist_afl||''}" min="2018" max="2040" placeholder="z.B. 2027"></div>
            <div class="frow"><label>Fristablauf ASF-Seminarerlaubnis §53 (2) FahrlG</label><input type="number" id="mf-frist-asf" value="${m?.frist_asf||''}" min="2018" max="2040" placeholder="z.B. 2027"></div>
            <div class="frow"><label>Fristablauf FES-Seminarerlaubnis §53 (2) FahrlG</label><input type="number" id="mf-frist-fes" value="${m?.frist_fes||''}" min="2018" max="2040" placeholder="z.B. 2027"></div>
          </div>

          <div class="fsec">Nachweise BKrFQG-Anerkennung § 5 Abs. 1 BKrFQV</div>
          <div style="font-size:11px;color:var(--grau);margin:-6px 0 10px">
            Wird für den Anerkennungsantrag der Ausbildungsstätte benötigt. Die Qualifikationen oben zählen automatisch mit.
          </div>
          <div class="fgrid">
            <div class="frow"><label>Didaktik-Nachweis</label>
              <input id="mf-bkf-didaktik" value="${m?.bkf_didaktik_nachweis||''}" placeholder="z.B. Fahrlehrerlaubnis oder Lehrgang"></div>
            <div class="frow"><label>Didaktik-Nachweis vom</label>
              <input type="date" id="mf-bkf-didaktik-datum" value="${m?.bkf_didaktik_datum||''}"></div>
          </div>
          <div class="fgrid">
            <div class="frow"><label>Führungszeugnis erteilt am</label>
              <input type="date" id="mf-bkf-fz" value="${m?.bkf_fuehrungszeugnis||''}"></div>
            <div class="frow"><label>Berufserfahrung BKF</label>
              <label class="chip" style="margin-top:4px"><input type="checkbox" id="mf-bkf-erfahrung" ${m?.bkf_berufserfahrung?'checked':''}>vorhanden</label></div>
          </div>
        </div>
        <div class="fsec">Buchhaltung / Lohnabrechnung</div>
        <div class="fgrid">
          <div class="frow"><label>Steuerklasse</label><input id="mf-steuerklasse" value="${m?.steuerklasse||''}" placeholder="z.B. 1"></div>
          <div class="frow"><label>Kinderfreibeträge</label><input type="number" step="0.5" id="mf-kinder" value="${m?.kinderfreibetraege??''}" placeholder="z.B. 2"></div>
        </div>
        <div class="fgrid">
          <div class="frow"><label>Konfession</label><input id="mf-konfession" value="${m?.konfession||''}"></div>
          <div class="frow"><label>Familienstand</label><input id="mf-familienstand" value="${m?.familienstand||''}"></div>
        </div>
        <div class="fgrid">
          <div class="frow"><label>Krankenkasse</label><input id="mf-krankenkasse" value="${m?.krankenkasse||''}"></div>
          <div class="frow"><label>SV-Nummer</label><input id="mf-sv-nummer" value="${m?.sv_nummer||''}"></div>
        </div>
        <div class="fgrid">
          <div class="frow"><label>Staatsangehörigkeit</label><input id="mf-staat" value="${m?.staatsangehoerigkeit||''}"></div>
          <div class="frow"><label>SV-Status</label><input id="mf-sv-status" value="${m?.sv_status||''}"></div>
        </div>
        <div class="frow"><label>IBAN</label><input id="mf-iban" value="${m?.iban||''}" placeholder="DE..."></div>
        <div class="fsec">Individuelle Felder <button class="btn btn-outline btn-sm" style="float:right;font-size:10px" onclick="mfAddCustom()">＋ Feld</button></div>
        <div id="mf-custom">${cf.map(c=>customFieldRow(c.label,c.value)).join('')}</div>
        <div class="fsec">Notiz</div>
        <textarea id="mf-notiz" rows="2" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:var(--radius);font-family:inherit;font-size:13px">${m?.notiz||''}</textarea>
      </div>
      <div class="modal-footer">
        ${m?`<button class="btn btn-outline" style="margin-right:auto;color:var(--rot)" onclick="archiviereMaUndSchliessen('${m.id}')" title="Aus der Ansicht entfernen">✕ Löschen</button>`:''}
        <button class="btn btn-outline" onclick="schliesseMaForm()">Abbrechen</button><button class="btn btn-primary" onclick="speichereMa()">Speichern</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  mfRolleChange();
}

function customFieldRow(label='', value='') {
  return `<div class="cf-row"><input class="cf-label" placeholder="Bezeichnung" value="${(label||'').replace(/"/g,'&quot;')}"><input class="cf-val" placeholder="Wert" value="${(value||'').replace(/"/g,'&quot;')}"><button class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">✕</button></div>`;
}
function mfAddCustom() { document.getElementById('mf-custom').insertAdjacentHTML('beforeend', customFieldRow()); }
function mfRolleChange() {
  const rolle = document.getElementById('mf-rolle').value;
  const istFL = ['Fahrlehrer','Fahrlehrerin','Fahrlehrer-Anwärter'].includes(rolle);
  document.getElementById('mf-fahrlehrer-block').style.display = istFL ? '' : 'none';
}
function schliesseMaForm() { document.getElementById('ma-form-modal')?.remove(); }

async function speichereMa() {
  const v = id => document.getElementById(id).value.trim();
  const vorname = v('mf-vorname'), nachname = v('mf-nachname');
  if (!vorname || !nachname) { toast('Bitte Vor- und Nachname eingeben.','err'); return; }
  const rolle = document.getElementById('mf-rolle').value;
  const bereich = ['Fahrlehrer','Fahrlehrerin','Fahrlehrer-Anwärter'].includes(rolle) ? 'fahrlehrer'
                : ['Bürokraft','Verwaltungsleitung','Buchhaltung','Inhaber / Geschäftsführung'].includes(rolle) ? 'verwaltung'
                : 'sonstige';
  const klassen = [...document.querySelectorAll('.mf-klasse:checked')].map(c=>c.value);
  const customFields = [...document.querySelectorAll('.cf-row')].map(r=>({label:r.querySelector('.cf-label').value.trim(),value:r.querySelector('.cf-val').value.trim()})).filter(c=>c.label);
  const data = {
    vorname, nachname,
    geburtsdatum: v('mf-geburtsdatum')||null, geburtsort: v('mf-geburtsort')||null,
    strasse: v('mf-strasse')||null, plz: v('mf-plz')||null, ort: v('mf-ort')||null,
    telefon: v('mf-telefon')||null, email: v('mf-email')||null,
    rolle, bereich, eintrittsdatum: v('mf-eintritt')||null,
    frist_fahrlg: parseInt(v('mf-frist-fahrlg'))||null,
    frist_bkf: parseInt(v('mf-frist-bkf'))||null,
    frist_afl: parseInt(v('mf-frist-afl'))||null,
    bkf_didaktik_nachweis: v('mf-bkf-didaktik')||null,
    bkf_didaktik_datum: v('mf-bkf-didaktik-datum')||null,
    bkf_fuehrungszeugnis: v('mf-bkf-fz')||null,
    bkf_berufserfahrung: !!document.getElementById('mf-bkf-erfahrung')?.checked,
    frist_asf: parseInt(v('mf-frist-asf'))||null,
    frist_fes: parseInt(v('mf-frist-fes'))||null,
    steuerklasse: v('mf-steuerklasse')||null,
    kinderfreibetraege: v('mf-kinder')!=='' ? parseFloat(v('mf-kinder')) : null,
    konfession: v('mf-konfession')||null,
    familienstand: v('mf-familienstand')||null,
    krankenkasse: v('mf-krankenkasse')||null,
    sv_nummer: v('mf-sv-nummer')||null,
    staatsangehoerigkeit: v('mf-staat')||null,
    sv_status: v('mf-sv-status')||null,
    iban: v('mf-iban')||null,
    klassen, custom_fields: customFields, notiz: v('mf-notiz')||null,
  };
  document.querySelectorAll('.mf-qual').forEach(c => { data[c.dataset.feld] = c.checked; });
  const id = document.getElementById('mf-id').value;
  let error;
  if (id) { ({ error } = await sb.from('mitarbeiter').update(data).eq('id', id)); }
  else { data.status = 'aktiv'; data.azk_sichtbar = (bereich !== 'sonstige'); ({ error } = await sb.from('mitarbeiter').insert(data)); }
  if (error) { toast('Fehler: ' + error.message,'err'); return; }
  window.logAenderung?.('personal', id ? 'Mitarbeiter bearbeitet' : 'Mitarbeiter angelegt', `${data.vorname||''} ${data.nachname||''}`.trim());
  schliesseMaForm();
  await ladeMitarbeiter();
  renderPersonal();
  toast(id ? 'Mitarbeiter aktualisiert' : 'Mitarbeiter angelegt','ok');
}

// ── ARCHIV ──
async function archiviereMa(id) {
  const m = personalState.mitarbeiter.find(x=>x.id===id);
  if (!confirm(`${m.vorname} ${m.nachname} als ausgeschieden markieren?`)) return false;
  const eingabe = prompt('Austrittsdatum (TT.MM.JJJJ, leer = heute):','');
  let datum = new Date().toISOString().slice(0,10);
  if (eingabe) { const p = eingabe.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/); if(p) datum=`${p[3]}-${p[2].padStart(2,'0')}-${p[1].padStart(2,'0')}`; }
  const { error } = await sb.from('mitarbeiter').update({status:'archiviert',austrittsdatum:datum}).eq('id',id);
  if (error) { toast(error.message,'err'); return false; }
  window.logAenderung?.('personal', 'Mitarbeiter archiviert', `${m.vorname} ${m.nachname}`);
  await ladeMitarbeiter(); renderPersonal(); toast('Archiviert','ok');
  return true;
}
async function archiviereMaUndSchliessen(id) {
  const ok = await archiviereMa(id);
  if (ok) schliesseMaForm();
}
async function reaktiviereMa(id) {
  const m = personalState.mitarbeiter.find(x=>x.id===id);
  const { error } = await sb.from('mitarbeiter').update({status:'aktiv',austrittsdatum:null}).eq('id',id);
  if (error) { toast(error.message,'err'); return; }
  window.logAenderung?.('personal', 'Mitarbeiter reaktiviert', m ? `${m.vorname} ${m.nachname}` : id);
  await ladeMitarbeiter(); renderPersonal(); toast('Reaktiviert','ok');
}

// ── AKTE ──
async function oeffneMaAkte(id) {
  const m = personalState.mitarbeiter.find(x=>x.id===id);
  if (!m) return;
  const jub = jubilaeumInfo(m);
  const quals = QUALIFIKATIONEN.filter(q=>m[q.feld]);
  const dienstjahre = m.eintrittsdatum ? Math.floor((new Date()-new Date(m.eintrittsdatum))/(365.25*24*3600*1000)) : null;
  const stammRows = [
    m.geburtsdatum && `<tr><td>Geburtsdatum</td><td>${new Date(m.geburtsdatum).toLocaleDateString('de-DE')}${m.geburtsort?' · '+m.geburtsort:''}</td></tr>`,
    (m.strasse||m.plz||m.ort) && `<tr><td>Adresse</td><td>${[m.strasse,[m.plz,m.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ')}</td></tr>`,
    m.telefon && `<tr><td>Telefon</td><td>${m.telefon}</td></tr>`,
    m.email && `<tr><td>E-Mail</td><td><a href="mailto:${m.email}">${m.email}</a></td></tr>`,
    m.eintrittsdatum && `<tr><td>Eintrittsdatum</td><td>${new Date(m.eintrittsdatum).toLocaleDateString('de-DE')}${dienstjahre!=null?` (${dienstjahre} Jahre)`:''}</td></tr>`,
    m.austrittsdatum && `<tr><td>Austrittsdatum</td><td>${new Date(m.austrittsdatum).toLocaleDateString('de-DE')}</td></tr>`,
    m.frist_fahrlg && `<tr><td>Fristablauf §53 (1) FahrlG</td><td>31.12.${m.frist_fahrlg}</td></tr>`,
    m.frist_bkf && `<tr><td>Fristablauf §7 BKrFQV</td><td>31.12.${m.frist_bkf}</td></tr>`,
    m.frist_afl && `<tr><td>Fristablauf AFL §53 (3) FahrlG</td><td>31.12.${m.frist_afl}</td></tr>`,
    m.bkf_didaktik_nachweis && `<tr><td>Didaktik-Nachweis</td><td>${m.bkf_didaktik_nachweis}${m.bkf_didaktik_datum?' ('+new Date(m.bkf_didaktik_datum).toLocaleDateString('de-DE')+')':''}</td></tr>`,
    m.bkf_fuehrungszeugnis && `<tr><td>Führungszeugnis erteilt</td><td>${new Date(m.bkf_fuehrungszeugnis).toLocaleDateString('de-DE')}</td></tr>`,
    m.bkf_berufserfahrung && `<tr><td>Berufserfahrung BKF</td><td>vorhanden</td></tr>`,
    m.frist_asf && `<tr><td>Fristablauf ASF §53 (2) FahrlG</td><td>31.12.${m.frist_asf}</td></tr>`,
    m.frist_fes && `<tr><td>Fristablauf FES §53 (2) FahrlG</td><td>31.12.${m.frist_fes}</td></tr>`,
    (m.klassen||[]).length && `<tr><td>Klassen</td><td>${m.klassen.join(', ')}</td></tr>`,
    quals.length && `<tr><td>Qualifikationen</td><td>${quals.map(q=>q.name).join(', ')}</td></tr>`,
    m.steuerklasse && `<tr><td>Steuerklasse</td><td>${m.steuerklasse}${m.kinderfreibetraege!=null?` · ${m.kinderfreibetraege} Kinderfreibetr.`:''}</td></tr>`,
    m.krankenkasse && `<tr><td>Krankenkasse</td><td>${m.krankenkasse}</td></tr>`,
    m.sv_nummer && `<tr><td>SV-Nummer</td><td>${m.sv_nummer}</td></tr>`,
    m.konfession && `<tr><td>Konfession</td><td>${m.konfession}</td></tr>`,
    m.familienstand && `<tr><td>Familienstand</td><td>${m.familienstand}</td></tr>`,
    m.staatsangehoerigkeit && `<tr><td>Staatsangehörigkeit</td><td>${m.staatsangehoerigkeit}</td></tr>`,
    m.iban && `<tr><td>IBAN</td><td>${m.iban}</td></tr>`,
    ...(m.custom_fields||[]).map(c=>`<tr><td>${c.label}</td><td>${c.value}</td></tr>`),
  ].filter(Boolean).join('');
  const modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.id = 'ma-akte-modal';
  modal.innerHTML = `
    <div class="modal" style="width:min(1280px,96vw);max-height:95vh">
      <div class="modal-header"><h3>${m.vorname} ${m.nachname} – Personalakte</h3><button class="close-btn" onclick="document.getElementById('ma-akte-modal').remove()">✕</button></div>
      <div class="modal-body">
        ${jub ? `<div class="jub-info ${jub.heute?'heute':''}">${jub.heute?'🎉':'🏆'} ${jub.heute?`Heute ${jub.jahre}-jähriges Jubiläum!`:`${jub.jahre}-jähriges Jubiläum in ${jub.diffTage} Tagen (${jub.datum})`}</div>`:''}
        <table class="akte-table"><tbody>${stammRows||'<tr><td colspan="2" style="color:var(--grau)">Noch keine Daten — auf Bearbeiten klicken.</td></tr>'}</tbody></table>
        ${fortbildungsBlockHTML(m)}
        ${maDokumenteBlockHTML(m)}
        ${m.notiz?`<div class="fsec">Notiz</div><p style="font-size:13px;color:var(--dunkel)">${m.notiz}</p>`:''}
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="druckeDatenblatt('${m.id}')">🖨 Datenblatt drucken</button>
        ${canWrite()?`<button class="btn btn-primary" onclick="document.getElementById('ma-akte-modal').remove();oeffneMaForm('${m.id}')">✎ Bearbeiten</button>`:''}
      </div>
    </div>`;
  document.body.appendChild(modal);
}

// ── DRUCK ──
// Gemeinsamer Briefkopf für alle Druckdokumente (Logo + Adresse + QR + AZAV)
// ════════════════════════════════════════════════════════════════════
//  BERICHTE / DRUCKZENTRALE
// ════════════════════════════════════════════════════════════════════
function oeffneBerichte() {
  const fl = personalState.mitarbeiter.filter(m=>m.bereich==='fahrlehrer' && m.status==='aktiv').sort((a,b)=>a.nachname.localeCompare(b.nachname));
  const alle = personalState.mitarbeiter.filter(m=>m.status==='aktiv').sort((a,b)=>a.nachname.localeCompare(b.nachname));

  const flOpts  = fl.map(m=>`<option value="${m.id}">${m.nachname}, ${m.vorname}</option>`).join('');
  const alleOpts = alle.map(m=>`<option value="${m.id}">${m.nachname}, ${m.vorname}</option>`).join('');

  const modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.id = 'berichte-modal';
  modal.innerHTML = `
    <div class="modal" style="max-width:560px;width:100%">
      <div class="modal-header">
        <h3 style="display:flex;align-items:center;gap:8px">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          Berichte & Druck
        </h3>
        <button class="close-btn" onclick="document.getElementById('berichte-modal').remove()">✕</button>
      </div>
      <div class="modal-body" style="display:flex;flex-direction:column;gap:16px">

        <div class="card" style="padding:14px 16px">
          <div style="font-size:11px;font-weight:700;color:var(--grau);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">Fortbildungsübersicht</div>
          <button class="btn btn-outline" style="width:100%;margin-bottom:8px;justify-content:center" onclick="druckeFortbildungsuebersicht()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Alle Fahrlehrer (gesammelt)
          </button>
          <div style="display:flex;gap:8px;align-items:center">
            <select id="ber-fl" style="flex:1;border:1px solid var(--border);border-radius:6px;padding:6px 10px;font-size:13px">${flOpts||'<option>Keine Fahrlehrer</option>'}</select>
            <button class="btn btn-outline" style="white-space:nowrap" onclick="druckeFortbildungsuebersicht(document.getElementById('ber-fl').value)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Einzeln
            </button>
          </div>
        </div>

        <div class="card" style="padding:14px 16px">
          <div style="font-size:11px;font-weight:700;color:var(--grau);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">Personaldatenblatt</div>
          <div style="display:flex;gap:8px;align-items:center">
            <select id="ber-datenblatt" style="flex:1;border:1px solid var(--border);border-radius:6px;padding:6px 10px;font-size:13px">${alleOpts||'<option>Keine Mitarbeiter</option>'}</select>
            <button class="btn btn-outline" style="white-space:nowrap" onclick="druckeDatenblatt(document.getElementById('ber-datenblatt').value)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Drucken
            </button>
          </div>
        </div>

        <div class="card" style="padding:14px 16px">
          <div style="font-size:11px;font-weight:700;color:var(--grau);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">FL-Erfassungsbogen</div>
          <button class="btn btn-primary" style="width:100%;justify-content:center" onclick="druckeErfassungsbogen()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Ausfüllbaren Erfassungsbogen herunterladen
          </button>
        </div>

      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="document.getElementById('berichte-modal').remove()">Schließen</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}


function druckeErfassungsbogen() {
  if (!window.FST_ERFASSUNGSBOGEN) { toast('Erfassungsbogen nicht geladen','err'); return; }
  // base64 -> Blob -> Download
  const b64 = window.FST_ERFASSUNGSBOGEN;
  const bytes = atob(b64);
  const arr = new Uint8Array(bytes.length);
  for (let i=0;i<bytes.length;i++) arr[i] = bytes.charCodeAt(i);
  const blob = new Blob([arr], {type:'application/pdf'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'FL-Erfassungsbogen.pdf';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
  toast('Erfassungsbogen heruntergeladen','ok');
}

function druckBriefkopf() {
  const logo = window.FST_LOGO || '';
  const qr   = window.FST_QR   || '';
  return `
    <div class="briefkopf">
      <div class="bk-left">
        <div class="bk-logo">${logo?`<img src="${logo}" alt="Fahrschulteam">`:''}</div>
      </div>
      <div class="bk-qr">${qr?`<img src="${qr}" alt="QR">`:''}</div>
    </div>`;
}

// AZAV-Logo als Fußzeile unten rechts
function druckFusszeile() {
  const azav = window.FST_AZAV || '';
  return azav ? `<div class="fusszeile"><img src="${azav}" alt="AZAV zertifiziert"></div>` : '';
}

const DRUCK_CSS = `
  .briefkopf { display:flex; align-items:center; justify-content:space-between; border-bottom:3px solid #C0001A; padding-bottom:14px; margin-bottom:22px; }
  .bk-left { display:flex; flex-direction:row; align-items:center; gap:16px; }
  .bk-logo img { height:58px; width:auto; }
  .bk-verwaltung { font-size:22px; font-weight:600; color:#3F4B57; letter-spacing:.02em; }
  .bk-adresse { font-size:11px; line-height:1.5; color:#3F4B57; }
  .bk-qr img { height:64px; width:auto; }
  .fusszeile { position:static; margin-top:18px; text-align:right; }
  .fusszeile img { height:48px; width:auto; }
  @media print {
    .briefkopf img, .fusszeile img { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .fusszeile { position:fixed; bottom:0; right:0; margin-top:0; }
  }
`;

function printHTML(html) {
  // Druck über verstecktes Iframe – ohne Popup, daher Popup-Blocker-sicher
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden','true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(frame);
  const doc = frame.contentWindow.document;
  doc.open(); doc.write(html); doc.close();
  let gedruckt = false;
  const druck = () => {
    if (gedruckt) return; gedruckt = true;
    try { frame.contentWindow.focus(); frame.contentWindow.print(); } catch(e) {}
    setTimeout(() => { try { frame.remove(); } catch(e) {} }, 1500);
  };
  const imgs = doc.images, total = imgs.length;
  if (!total) { setTimeout(druck, 150); }
  else {
    let n = 0;
    const chk = () => { if (++n >= total) setTimeout(druck, 150); };
    for (let i = 0; i < total; i++) { if (imgs[i].complete) chk(); else { imgs[i].onload = chk; imgs[i].onerror = chk; } }
  }
  setTimeout(druck, 2500); // Sicherheits-Fallback
}

function druckeDatenblatt(id) {
  const m = personalState.mitarbeiter.find(x=>x.id===id);
  if (!m) return;
  const quals = QUALIFIKATIONEN.filter(q=>m[q.feld]).map(q=>q.name).join(', ');
  printHTML(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Datenblatt ${m.nachname}</title>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet"><style>body{font-family:'Poppins','Segoe UI',Arial,sans-serif;padding:40px;color:#3F4B57;font-size:13px}
    h1{color:#C0001A;font-size:22px;margin:0 0 4px 0}
    table{width:100%;border-collapse:collapse;margin-top:16px}
    td{padding:6px 10px;border-bottom:1px solid #ddd}td:first-child{color:#6B7280;width:200px}
    .head{color:#6B7280;font-size:11px;margin-bottom:20px}${DRUCK_CSS}</style></head><body>
    ${druckBriefkopf()}
    <h1>Personaldatenblatt</h1>
    <p class="head">Stand: ${new Date().toLocaleDateString('de-DE')}</p>
    <table>
      <tr><td>Name</td><td><strong>${m.vorname} ${m.nachname}</strong></td></tr>
      <tr><td>Funktion</td><td>${m.rolle||'–'}</td></tr>
      ${m.geburtsdatum?`<tr><td>Geburtsdatum</td><td>${new Date(m.geburtsdatum).toLocaleDateString('de-DE')}${m.geburtsort?', '+m.geburtsort:''}</td></tr>`:''}
      ${(m.strasse||m.ort)?`<tr><td>Anschrift</td><td>${[m.strasse,[m.plz,m.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ')}</td></tr>`:''}
      ${m.telefon?`<tr><td>Telefon</td><td>${m.telefon}</td></tr>`:''}
      ${m.email?`<tr><td>E-Mail</td><td>${m.email}</td></tr>`:''}
      ${m.eintrittsdatum?`<tr><td>Eintrittsdatum</td><td>${new Date(m.eintrittsdatum).toLocaleDateString('de-DE')}</td></tr>`:''}
      ${m.frist_fahrlg?`<tr><td>Fristablauf §53 (1) FahrlG</td><td>31.12.${m.frist_fahrlg}</td></tr>`:''}
      ${m.frist_afl?`<tr><td>Fristablauf AFL §53 (3) FahrlG</td><td>31.12.${m.frist_afl}</td></tr>`:''}
      ${m.frist_asf?`<tr><td>Fristablauf ASF §53 (2) FahrlG</td><td>31.12.${m.frist_asf}</td></tr>`:''}
      ${m.frist_fes?`<tr><td>Fristablauf FES §53 (2) FahrlG</td><td>31.12.${m.frist_fes}</td></tr>`:''}
      ${(m.klassen||[]).length?`<tr><td>Fahrerlaubnisklassen</td><td>${m.klassen.join(', ')}</td></tr>`:''}
      ${quals?`<tr><td>Qualifikationen</td><td>${quals}</td></tr>`:''}
      ${(m.custom_fields||[]).map(c=>`<tr><td>${c.label}</td><td>${c.value}</td></tr>`).join('')}
    </table>
    ${druckFusszeile()}
    </body></html>`);
}

function druckeFortbildungsuebersicht(einzelnId) {
  let fl = personalState.mitarbeiter.filter(m=>m.bereich==='fahrlehrer' && m.status==='aktiv').sort((a,b)=>a.nachname.localeCompare(b.nachname));
  if (einzelnId) fl = fl.filter(m=>m.id===einzelnId);

  // Statuszeile pro Pflicht aufbauen
  function statusZeilen(m) {
    const st = (typeof fortbildungsStatus==='function') ? fortbildungsStatus(m, fortbildungenCache) : {ergebnisse:[]};
    if (!st.ergebnisse.length) return '<tr><td colspan="4" style="color:#9CA3AF">Keine Pflichten / Frist nicht gesetzt</td></tr>';
    return st.ergebnisse.map(e=>{
      const frist = e.fristEnde ? '31.12.'+new Date(e.fristEnde).getFullYear() : '–';
      const farbe = statusFarbe(e.status);
      let stand;
      if (e.status==='unbekannt') {
        stand = 'Frist nicht gesetzt';
      } else if (e.status==='ueberschritten') {
        stand = `ÜBERSCHRITTEN (${e.tageVorhanden}/${e.tageSoll})`;
      } else if (e.status==='naechster_ok') {
        stand = 'vollständig · nächster Zyklus erfüllt';
      } else {
        // im_rahmen
        if (e.erfuellt) {
          stand = 'erfüllt';
          if (e.naechsterFortschritt && e.naechsterFortschritt.einheiten>0)
            stand += ` (nächster: ${e.naechsterFortschritt.einheiten}/${e.naechsterFortschritt.soll})`;
        } else {
          stand = `${e.tageVorhanden}/${e.tageSoll} · noch ${e.restTage} Tag(e)`;
        }
      }
      return `<tr>
        <td style="width:18px;text-align:center"><span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:${farbe}"></span></td>
        <td>${e.pflicht.name}</td>
        <td>${frist}</td>
        <td style="color:${farbe};font-weight:600">${stand}</td>
      </tr>`;
    }).join('');
  }

  printHTML(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Fortbildungsübersicht Fahrlehrer</title>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet"><style>body{font-family:'Poppins','Segoe UI',Arial,sans-serif;padding:40px;color:#3F4B57;font-size:12px}
    h1{color:#C0001A;font-size:20px;border-bottom:3px solid #C0001A;padding-bottom:8px}
    table{width:100%;border-collapse:collapse;margin-top:8px;font-size:11px}
    th{background:#F3F4F6;text-align:left;padding:6px 8px;border-bottom:2px solid #ccc}
    td{padding:5px 8px;border-bottom:1px solid #eee}
    .head{color:#6B7280;font-size:11px;margin-bottom:16px}
    .ma-block{margin-bottom:22px;page-break-inside:avoid}
    .ma-name{background:#E5E7EB;color:#3F4B57;padding:9px 12px;font-weight:bold;font-size:13px;line-height:1.4;border-radius:4px;border-left:4px solid #6B7280}
    .ma-meta{color:#6B7280;font-size:10px;padding:3px 10px}
    .legende{margin-top:24px;font-size:10px;color:#6B7280;border-top:1px solid #eee;padding-top:10px}
    ${DRUCK_CSS}</style></head><body>
    ${druckBriefkopf()}
    <h1 style="border-bottom:none;margin:0 0 4px 0">Fortbildungsübersicht – Fahrlehrer (§53 FahrlG / §7 BKrFQV)</h1>
    <p class="head">Stand: ${new Date().toLocaleDateString('de-DE')} · ${fl.length} aktive Fahrlehrer</p>
    ${fl.map(m=>`
      <div class="ma-block">
        <div class="ma-name">${m.nachname}, ${m.vorname}</div>
        <div class="ma-meta">Klassen: ${(m.klassen||[]).join(', ')||'–'} · Qualifikationen: ${QUALIFIKATIONEN.filter(q=>m[q.feld]).map(q=>q.kuerzel).join(', ')||'–'}</div>
        <table>
          <thead><tr><th style="width:18px"></th><th>Fortbildungspflicht</th><th>Fristablauf</th><th>Stand</th></tr></thead>
          <tbody>${statusZeilen(m)}</tbody>
        </table>
      </div>`).join('')}
    <div class="legende">
      <strong>Legende:</strong>
      <span style="color:#166534">● grün = nächster Zyklus bereits erfüllt</span> ·
      <span style="color:#6B7280">● grau = im Rahmen (Frist in der Zukunft)</span> ·
      <span style="color:#991B1B">● rot = Frist überschritten</span><br>
      Counter z.B. „3/4" = drei von vier nötigen Fortbildungstagen im Zyklus erbracht (inkl. Bonustage §53 Abs.5).
    </div>
    ${druckFusszeile()}
    </body></html>`);
}

function exportPersonalCSV() {
  const zeilen = [['Nachname','Vorname','Rolle','Bereich','Klassen','Qualifikationen',
    'Telefon','E-Mail','Straße','PLZ','Ort','Eintritt','Frist §53 FahrlG','Frist BKrFQV','Status']];
  personalState.mitarbeiter.forEach(m=>zeilen.push([
    m.nachname||'', m.vorname||'', m.rolle||'', m.bereich||'',
    (m.klassen||[]).join(' '),
    QUALIFIKATIONEN.filter(q=>m[q.feld]).map(q=>q.kuerzel).join(' '),
    m.telefon||'', m.email||'', m.strasse||'', m.plz||'', m.ort||'',
    m.eintrittsdatum||'', m.frist_fahrlg||'', m.frist_bkf||'', m.status||'',
  ]));
  exportiereXlsx('Personal_'+new Date().toISOString().slice(0,10), 'Mitarbeiter', zeilen);
}

// ════════════════════════════════════════════════════════════════════
//  FORTBILDUNGEN  (Erfassung, Upload, Anzeige in Akte)
//  Nutzt fortbildung.js (FB_PFLICHTEN, fortbildungsStatus, …)
// ════════════════════════════════════════════════════════════════════
let fortbildungenCache = [];
let maDokumenteCache = [];

// Papiere, die fuer den BKrFQG-Anerkennungsantrag beizufuegen sind.
// Bewusst feste Kategorien: die Vollstaendigkeitspruefung muss wissen,
// was sie abhaken darf - mit Freitext ginge das nicht.
const MA_DOK_KATEGORIEN = [
  'Fahrlehrerschein',
  'Didaktik-Nachweis',
  'Führungszeugnis',
  'Sonstiges',
];

async function ladeMaDokumente() {
  try {
    const { data, error } = await sb.from('ma_dokumente')
      .select('*').order('hochgeladen_am', { ascending: false });
    if (error) { console.warn('MA-Dokumente laden:', error.message); maDokumenteCache = []; return; }
    maDokumenteCache = data || [];
  } catch(e) { console.warn('MA-Dokumente:', e); maDokumenteCache = []; }
}

async function ladeFortbildungen() {
  try {
    const { data, error } = await sb.from('fortbildungen').select('*').order('datum');
    if (error) { console.warn('Fortbildungen laden:', error.message); fortbildungenCache = []; return; }
    fortbildungenCache = data || [];
  } catch(e) { console.warn('Fortbildungen:', e); fortbildungenCache = []; }
}

// Dokumente eines MA in der Akte rendern. Getrennt von den Fortbildungs-
// urkunden, weil es hier um Nachweise fuer den Anerkennungsantrag geht
// und nicht um den Fortbildungsstand.
function maDokumenteBlockHTML(m) {
  const docs = maDokumenteCache.filter(d => d.mitarbeiter_id === m.id);
  const liste = docs.length ? docs.map(d => `
    <div class="fb-eintrag">
      <span class="fb-art">${d.kategorie}</span>
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${d.dateiname||''}</span>
            <span style="font-size:11px;color:var(--grau)">${d.hochgeladen?new Date(d.hochgeladen).toLocaleDateString('de-DE'):''}</span>
      <button class="btn btn-outline btn-sm" onclick="oeffneMaDokument('${d.storage_path}')">📄</button>
      ${canWrite()?`<button class="btn btn-outline btn-sm" onclick="loescheMaDokument('${d.id}','${m.id}')">✕</button>`:''}
    </div>`).join('') : '<p style="font-size:12px;color:var(--grau)">Noch keine Dokumente hinterlegt.</p>';

  return `
    <div class="fsec">Dokumente für den Anerkennungsantrag
        ${canWrite()?`<button type="button" class="btn btn-primary btn-sm" style="float:right;font-size:10px;margin:0"
          onclick="document.getElementById('madok-datei-${m.id}').click()">＋ Dokument</button>
        <input type="file" id="madok-datei-${m.id}" style="display:none" accept=".pdf,.jpg,.jpeg,.png"
          onchange="ladeMaDokumentHoch(this,'${m.id}')">`:''}
    </div>
    <div class="fb-liste">${liste}</div>`;
}

async function ladeMaDokumentHoch(input, maId) {
  const datei = input.files[0];
  input.value = '';
  if (!datei) return;

  // Kategorie erst nach der Dateiwahl abfragen: so ist klar, worum es geht.
  const wahl = prompt('Kategorie wählen:\n' + MA_DOK_KATEGORIEN.map((k,i)=>(i+1)+' = '+k).join('\n'), '1');
  if (wahl === null) return;
  const kategorie = MA_DOK_KATEGORIEN[parseInt(wahl,10)-1];
  if (!kategorie) { toast('Ungültige Kategorie.','err'); return; }

  try {
    const ext = datei.name.split('.').pop();
    const storage_path = `mitarbeiter/${maId}/${Date.now()}.${ext}`;
    const { error: upErr } = await sb.storage.from('dokumente').upload(storage_path, datei);
    if (upErr) throw new Error(upErr.message);
        const { error } = await sb.from('ma_dokumente').insert({
      mitarbeiter_id: maId, typ: kategorie, dateiname: datei.name,
      storage_path,
    });
    if (error) throw new Error(error.message);
    await ladeMaDokumente();
    document.getElementById('ma-akte-modal')?.remove();
    oeffneMaAkte(maId);
    toast('Dokument hinterlegt ✓');
  } catch(e) { toast('Upload-Fehler: '+e.message,'err'); }
}

async function oeffneMaDokument(pfad) {
  try {
    const { data, error } = await sb.storage.from('dokumente').createSignedUrl(pfad, 3600);
    if (error) throw new Error(error.message);
    window.open(data.signedUrl, '_blank');
  } catch(e) { toast('Fehler: '+e.message,'err'); }
}

async function loescheMaDokument(id, maId) {
  const d = maDokumenteCache.find(x => x.id === id);
  if (!confirm('Dokument „'+(d?.dateiname||'')+'“ wirklich löschen?')) return;
  try {
    if (d?.storage_path) await sb.storage.from('dokumente').remove([d.storage_path]);
    const { error } = await sb.from('ma_dokumente').delete().eq('id', id);
    if (error) throw new Error(error.message);
    await ladeMaDokumente();
    document.getElementById('ma-akte-modal')?.remove();
    oeffneMaAkte(maId);
    toast('Dokument gelöscht');
  } catch(e) { toast('Fehler: '+e.message,'err'); }
}

// Fortbildungen eines MA in der Akte rendern
function fortbildungsBlockHTML(m) {
  const status = (typeof fortbildungsStatus === 'function')
    ? fortbildungsStatus(m, fortbildungenCache) : { ergebnisse:[], gesamt:null };
  const fbs = fortbildungenCache.filter(f => f.mitarbeiter_id === m.id)
    .sort((a,b)=> new Date(b.datum) - new Date(a.datum));

  if (m.bereich !== 'fahrlehrer') return '';

  const ampelHTML = status.ergebnisse.map(e => {
    const farbe = statusFarbe(e.status);
    const fristJahr = e.fristEnde ? new Date(e.fristEnde).getFullYear() : null;
    let text;
    if (e.status === 'unbekannt') {
      text = 'Fristablauf-Jahr nicht gesetzt';
    } else if (e.status === 'ueberschritten') {
      text = `ÜBERSCHRITTEN — Frist war 31.12.${fristJahr} (${e.tageVorhanden}/${e.tageSoll})`;
    } else if (e.status === 'naechster_ok') {
      // Nächster Zyklus erfüllt
      text = `vollständig bis 31.12.${fristJahr} · nächster Zyklus erfüllt`;
    } else {
      // im_rahmen (grau): aktueller Zyklus läuft bis Frist
      if (e.erfuellt) {
        text = `erfüllt bis 31.12.${fristJahr}`;
        if (e.naechsterFortschritt && e.naechsterFortschritt.einheiten > 0)
          text += ` · nächster: ${e.naechsterFortschritt.einheiten}/${e.naechsterFortschritt.soll}`;
      } else {
        text = `${e.tageVorhanden}/${e.tageSoll} · noch ${e.restTage} Tag(e) bis 31.12.${fristJahr}`;
      }
    }
    return `<div class="fb-pflicht-row">
      <span class="fb-dot" style="background:${farbe}"></span>
      <span class="fb-pflicht-name">${e.pflicht.name}</span>
      <span class="fb-pflicht-status" style="color:${farbe}">${text}</span>
    </div>`;
  }).join('');

  const liste = fbs.length ? fbs.map(f=>{
    // Farbpunkt: grün wenn im aktuell gültigen Block, grau wenn älterer (abgelaufener) Block
    const imBlock = (typeof fbImAktuellenBlock==='function') ? fbImAktuellenBlock(f, m) : null;
    const dotFarbe = imBlock === null ? '#9CA3AF' : (imBlock ? '#166534' : '#9CA3AF');
    const dotTitel = imBlock === null ? 'Frist nicht gesetzt' : (imBlock ? 'Im aktuellen Zeitraum' : 'Älterer Zeitraum');
    return `
    <div class="fb-eintrag">
      <span class="fb-status-dot" style="background:${dotFarbe}" title="${dotTitel}"></span>
      <span class="fb-art">${fbArtLabel(f.art)}</span>
      <span>${new Date(f.datum).toLocaleDateString('de-DE')}</span>
      <span>${f.tage||1} Tag(e)</span>
      <span style="flex:1">${f.thema||''}</span>
      ${f.storage_path?`<button class="btn btn-outline btn-sm" onclick="oeffneUrkunde('${f.storage_path}')">📄</button>`:''}
      ${canWrite()?`<button class="btn btn-outline btn-sm" onclick="oeffneFortbildungForm('${m.id}','${f.id}')" title="Bearbeiten">✎</button>`:''}
      ${canWrite()?`<button class="btn btn-outline btn-sm" onclick="loescheFortbildung('${f.id}','${m.id}')">✕</button>`:''}
    </div>`;}).join('') : '<p style="font-size:12px;color:var(--grau)">Noch keine Fortbildungen erfasst.</p>';

  return `
    <div class="fsec">Fortbildungsstatus (§53 FahrlG / §7 BKrFQV)</div>
    <div class="fb-ampel">${ampelHTML||'<p style="font-size:12px;color:var(--grau)">Keine Pflichten aktiv.</p>'}</div>
    <div class="fsec">Nachgewiesene Fortbildungen
      ${canWrite()?`<button class="btn btn-primary btn-sm" style="float:right;font-size:10px" onclick="oeffneFortbildungForm('${m.id}')">＋ Urkunde</button>`:''}
    </div>
    <div class="fb-liste">${liste}</div>`;
}

// Formular zum Erfassen einer Fortbildung + Urkunden-Upload
function oeffneFortbildungForm(maId, fbId) {
  const fb = fbId ? fortbildungenCache.find(f=>f.id===fbId) : null;
  const modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.id = 'fb-form-modal';
  modal.style.zIndex = '600';
  modal.innerHTML = `
    <div class="modal" style="width:560px">
      <div class="modal-header"><h3>${fb?'Fortbildung bearbeiten':'Fortbildung erfassen'}</h3><button class="close-btn" onclick="document.getElementById('fb-form-modal').remove()">✕</button></div>
      <div class="modal-body">
        <input type="hidden" id="fb-ma-id" value="${maId}">
        <input type="hidden" id="fb-id" value="${fb?.id||''}">
        <div class="frow"><label>Art der Fortbildung *</label>
          <select id="fb-art">
            <option value="allgemein" ${fb?.art==='allgemein'?'selected':''}>Allgemeine Fortbildung (§53 Abs.1)</option>
            <option value="asf" ${fb?.art==='asf'?'selected':''}>ASF-Seminarleiter (§53 Abs.2)</option>
            <option value="fes" ${fb?.art==='fes'?'selected':''}>FES-Seminarleiter (§53 Abs.2)</option>
            <option value="afl" ${fb?.art==='afl'?'selected':''}>Ausbildungsfahrlehrer (§53 Abs.3)</option>
            <option value="bkf" ${fb?.art==='bkf'?'selected':''}>BKF-Dozent (§7 BKrFQV)</option>
          </select></div>
        <div class="fgrid">
          <div class="frow"><label>Datum *</label><input type="date" id="fb-datum" value="${fb?.datum||new Date().toISOString().slice(0,10)}"></div>
          <div class="frow"><label>Tage *</label><input type="number" id="fb-tage" value="${fb?.tage||3}" min="0.5" step="0.5"></div>
        </div>
        <div class="frow"><label class="chip" style="display:inline-flex"><input type="checkbox" id="fb-zusammen" ${fb?.zusammenhaengend?'checked':''}> Zusammenhängende Tage (z.B. 3 Tage am Stück)</label></div>
        <div class="frow"><label>Thema / Träger</label><input id="fb-thema" value="${fb?.thema||''}" placeholder="z.B. Verkehrsrecht-Update"></div>
        <div class="frow"><label>Urkunde (PDF/Bild)</label><input type="file" id="fb-datei" accept=".pdf,.jpg,.jpeg,.png" onchange="leseUrkundeAus(this)"></div>
        <div id="fb-upload-status" style="font-size:12px;color:var(--grau)"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="document.getElementById('fb-form-modal').remove()">Abbrechen</button>
        <button class="btn btn-primary" onclick="speichereFortbildung()">Speichern</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}


// Erkennt Datum + Tage aus dem Dateinamen der Urkunde
// z.B. "16.04.2023 - 19.04.2023.pdf" → Datum 2023-04-16, 4 Tage
// Urkunde per Claude-API auslesen (Inhalt, nicht nur Dateiname). Fällt bei Fehlern auf die Dateinamen-Heuristik zurück.
async function leseUrkundeAus(input) {
  const datei = input.files?.[0];
  if (!datei) return;
  const status = document.getElementById('fb-upload-status');
  if (status) status.innerHTML = '<span style="color:#2A6CAE">⏳ Urkunde wird analysiert …</span>';
  try {
    const datei2 = await pruefeUndKomprimiereDatei(datei);
    const b64 = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result.split(',')[1]);
      r.onerror = () => rej(new Error('Lesefehler'));
      r.readAsDataURL(datei2);
    });
    const mediaType = datei2.type || 'application/pdf';
    const response = await fetch('/.netlify/functions/dokument-auslesen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: b64, mediaType, typ: 'fortbildung' }),
    });
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    const f = result.felder || {};

    if (f.datum) { const el=document.getElementById('fb-datum'); if (el) el.value = f.datum; }
    if (f.tage)  { const el=document.getElementById('fb-tage');  if (el) el.value = f.tage; }
    if (f.thema) { const el=document.getElementById('fb-thema'); if (el && !el.value) el.value = f.thema; }
    if (f.art)   { const s=document.getElementById('fb-art'); if (s && [...s.options].some(o=>o.value===f.art)) s.value = f.art; }
    if (Number(f.tage) >= 2) { const z=document.getElementById('fb-zusammen'); if (z) z.checked = true; }

    const erkannt = Object.entries(f).filter(([k,val])=>val).map(([k])=>k);
    if (status) status.innerHTML = `<span style="color:#166534">✓ Ausgelesen: ${erkannt.join(', ')||'nichts erkannt'}. Bitte prüfen.</span>`;
  } catch(e) {
    console.error(e);
    // Fallback: wenigstens aus dem Dateinamen erkennen
    fbErkenneDate(input);
    if (status) status.innerHTML = `<span style="color:#92400e">Automatisches Auslesen nicht möglich (${e.message}). Aus Dateiname vorausgefüllt – bitte prüfen.</span>`;
  }
}

function fbErkenneDate(input) {
  const datei = input.files[0];
  if (!datei) return;
  const name = datei.name;

  // Suche Datumsangaben TT.MM.JJJJ oder JJJJ-MM-TT
  const deMatches = [...name.matchAll(/(\d{1,2})\.(\d{1,2})\.(\d{4})/g)];
  const isoMatches = [...name.matchAll(/(\d{4})-(\d{2})-(\d{2})/g)];

  let daten = [];
  deMatches.forEach(m => daten.push(new Date(+m[3], +m[2]-1, +m[1])));
  isoMatches.forEach(m => daten.push(new Date(+m[1], +m[2]-1, +m[3])));
  daten = daten.filter(d => !isNaN(d) && d.getFullYear() > 2000 && d.getFullYear() < 2100)
               .sort((a,b)=>a-b);

  if (daten.length === 0) return;

  const von = daten[0];
  const bis = daten[daten.length-1];

  // Setze das Datum auf den Beginn der Fortbildung
  const isoVon = `${von.getFullYear()}-${String(von.getMonth()+1).padStart(2,'0')}-${String(von.getDate()).padStart(2,'0')}`;
  document.getElementById('fb-datum').value = isoVon;

  // Tage aus Zeitspanne berechnen (von..bis inklusive)
  if (daten.length >= 2) {
    const tage = Math.round((bis - von)/(86400000)) + 1;
    if (tage >= 1 && tage <= 10) {
      document.getElementById('fb-tage').value = tage;
      // Zeitspanne über mehrere Tage = zusammenhängend
      const zusEl = document.getElementById('fb-zusammen');
      if (zusEl && tage >= 2) zusEl.checked = true;
    }
  }

  // Art aus Dateiname erkennen
  const lower = name.toLowerCase();
  let erkannteArt = null;
  if (/53\s*\(?\s*2\)?/.test(name) || lower.includes('asf') || lower.includes('fes')) {
    if (lower.includes('fes')) erkannteArt = 'fes';
    else erkannteArt = 'asf';  // §53(2), Standard ASF
  } else if (/53\s*\(?\s*3\)?/.test(name) || lower.includes('ausbildungsfahrlehrer') || lower.includes('afl')) {
    erkannteArt = 'afl';
  } else if (lower.includes('bkrfqv') || lower.includes('bkf') || lower.includes('§\s*7')) {
    erkannteArt = 'bkf';
  } else if (/53\s*\(?\s*1\)?/.test(name)) {
    erkannteArt = 'allgemein';
  }

  const artSel = document.getElementById('fb-art');
  if (erkannteArt && artSel) {
    artSel.value = erkannteArt;
    // Bei Einzeltags-Pflichten (ASF/FES/AFL) Standard-Tage auf 1 setzen,
    // außer es wurde eine Mehrtages-Spanne erkannt
    if (['asf','fes','afl'].includes(erkannteArt) && daten.length < 2) {
      document.getElementById('fb-tage').value = 1;
      const zusEl = document.getElementById('fb-zusammen');
      if (zusEl) zusEl.checked = false;
    }
  }

  const artLabel = { allgemein:'Allgemein §53.1', asf:'ASF §53.2', fes:'FES §53.2', afl:'AFL §53.3', bkf:'BKF §7' };
  const statusEl = document.getElementById('fb-upload-status');
  if (statusEl) statusEl.textContent = `📅 Erkannt: ${von.toLocaleDateString('de-DE')}${daten.length>=2?' – '+bis.toLocaleDateString('de-DE'):''}${erkannteArt?' · '+artLabel[erkannteArt]:''}`;
}

async function speichereFortbildung() {
  const maId = document.getElementById('fb-ma-id').value;
  const art  = document.getElementById('fb-art').value;
  const datum = document.getElementById('fb-datum').value;
  const tage = parseFloat(document.getElementById('fb-tage').value)||1;
  const thema = document.getElementById('fb-thema').value.trim();
  const datei = document.getElementById('fb-datei').files[0];
  const statusEl = document.getElementById('fb-upload-status');

  if (!datum) { toast('Bitte Datum angeben.','err'); return; }

  let storage_path = null, dateiname = null;
  if (datei) {
    statusEl.textContent = 'Lade Urkunde hoch …';
    const ext = datei.name.split('.').pop();
    storage_path = `fortbildungen/${maId}/${Date.now()}.${ext}`;
    dateiname = datei.name;
    const { error: upErr } = await sb.storage.from('dokumente').upload(storage_path, datei);
    if (upErr) { toast('Upload-Fehler: '+upErr.message,'err'); statusEl.textContent=''; return; }
  }

  const fbId = document.getElementById('fb-id').value;
  const zusammen = document.getElementById('fb-zusammen')?.checked || false;
  const datensatz = { mitarbeiter_id: maId, art, datum, tage, thema: thema||null, zusammenhaengend: zusammen };
  // Nur Storage-Felder setzen, wenn neue Datei hochgeladen wurde
  if (storage_path) { datensatz.storage_path = storage_path; datensatz.dateiname = dateiname; }

  let error;
  if (fbId) {
    ({ error } = await sb.from('fortbildungen').update(datensatz).eq('id', fbId));
  } else {
    ({ error } = await sb.from('fortbildungen').insert(datensatz));
  }
  if (error) { toast('Fehler: '+error.message,'err'); return; }

  document.getElementById('fb-form-modal').remove();
  await ladeFortbildungen();
  // Akte neu öffnen, damit der neue Status sichtbar wird
  document.getElementById('ma-akte-modal')?.remove();
  oeffneMaAkte(maId);
  renderPersonal();
  toast('Fortbildung gespeichert','ok');
}

async function loescheFortbildung(fbId, maId) {
  if (!confirm('Diese Fortbildung wirklich löschen?')) return;
  const fb = fortbildungenCache.find(f=>f.id===fbId);
  if (fb?.storage_path) await sb.storage.from('dokumente').remove([fb.storage_path]);
  const { error } = await sb.from('fortbildungen').delete().eq('id', fbId);
  if (error) { toast(error.message,'err'); return; }
  await ladeFortbildungen();
  document.getElementById('ma-akte-modal')?.remove();
  oeffneMaAkte(maId);
  renderPersonal();
  toast('Fortbildung gelöscht','ok');
}

async function oeffneUrkunde(path) {
  const { data, error } = await sb.storage.from('dokumente').createSignedUrl(path, 120);
  if (error) { toast('Datei nicht gefunden','err'); return; }
  window.open(data.signedUrl, '_blank');
}

window.ladeMitarbeiter = ladeMitarbeiter;
window.personalState = personalState;
