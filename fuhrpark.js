// ════════════════════════════════════════════════════════════════════
//  MODUL FUHRPARK
//  Kategorien: bestellt → aktiv → archiviert
//  Ampel HU/SP: rot=überfällig, gelb=≤1 Monat, grün=ok
// ════════════════════════════════════════════════════════════════════
const fuhrparkState = {
  fahrzeuge: [],
  filter: 'aktiv',      // bestellt | aktiv | archiviert
  loaded: false,
};

const FZ_KLASSEN = ['AM','A1','A2','A','B','BE','C1','C1E','C','CE','D','DE','Bus','L','T'];
const FZ_TYPEN = [['pkw','PKW'],['motorrad','Motorrad'],['lkw','LKW'],['bus','Bus'],['sonstig','Sonstige']];
const FZ_HALTUNG = [['kauf','Eigentum'],['finanzierung','finanziert'],['leasing','geleast']];

async function ladeFuhrpark() {
  try {
    const { data } = await sb.from('fahrzeuge').select('*').order('kennzeichen');
    fuhrparkState.fahrzeuge = data || [];
  } catch(e) { console.warn('Fuhrpark laden:', e); fuhrparkState.fahrzeuge = []; }
  fuhrparkState.loaded = true;
}

// Ampel-Status für ein Fälligkeitsdatum (HU/SP)
function faelligkeitStatus(datum) {
  if (!datum) return { farbe:'#9CA3AF', label:'–', tage:null };
  const heute = new Date(); heute.setHours(0,0,0,0);
  const ziel = new Date(datum);
  const tage = Math.ceil((ziel - heute)/86400000);
  if (tage < 0) return { farbe:'#991B1B', label:`überfällig (${ziel.toLocaleDateString('de-DE')})`, tage };
  if (tage <= 31) return { farbe:'#D97706', label:`fällig ${ziel.toLocaleDateString('de-DE')}`, tage };
  return { farbe:'#166534', label:ziel.toLocaleDateString('de-DE'), tage };
}

function haltungLabel(h) { return (FZ_HALTUNG.find(x=>x[0]===h)||[])[1] || h; }

window.renderFuhrpark = async function() {
  const view = document.getElementById('view-fuhrpark');
  if (!fuhrparkState.loaded) {
    view.innerHTML = '<div class="loading"><div class="spinner"></div>Lade Fuhrpark …</div>';
    await ladeFuhrpark();
  }
  const f = fuhrparkState.filter;
  const liste = fuhrparkState.fahrzeuge.filter(v => v.status === f);
  const anz = s => fuhrparkState.fahrzeuge.filter(v=>v.status===s).length;

  const cards = liste.map(v => {
    const hu = faelligkeitStatus(v.hu_faellig);
    const sp = faelligkeitStatus(v.sp_faellig);
    const titel = [v.marke, v.modell].filter(Boolean).join(' ') || v.kennzeichen;
    return `<div class="fz-card" onclick="oeffneFahrzeug('${v.id}')">
      <div class="fz-head">
        <div>
          <div class="fz-kennz">${v.kennzeichen||'–'}</div>
          <div class="fz-titel">${titel}</div>
        </div>
        ${v.fahrzeugklasse?`<span class="fz-klasse">${v.fahrzeugklasse}</span>`:''}
      </div>
      <div class="fz-meta">
        <span class="fz-tag fz-tag-${v.haltung}">${haltungLabel(v.haltung)}</span>
        ${v.rate?`<span class="fz-rate">${Number(v.rate).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})} €/Mon.</span>`:''}
      </div>
      <div class="fz-faellig">
        <span><span class="fz-dot" style="background:${hu.farbe}"></span>HU: ${hu.label}</span>
        ${v.sp_faellig?`<span><span class="fz-dot" style="background:${sp.farbe}"></span>SP: ${sp.label}</span>`:''}
      </div>
    </div>`;
  }).join('');

  // Sidebar nur beim ersten Mal rendern
  if (!document.getElementById('fuhrpark-mod-shell')) {
    view.innerHTML = `
      <div class="mod-shell" id="fuhrpark-mod-shell">
        <aside class="mod-side"><nav>
          <div class="mod-side-label">Fuhrpark</div>
          <button class="mod-side-btn" data-fv="bestellt" onclick="setFuhrparkFilter('bestellt')"><span style="font-size:16px;width:20px;text-align:center">📦</span><span class="mod-lbl">Bestellt (<span id="fz-cnt-bestellt">0</span>)</span></button>
          <button class="mod-side-btn" data-fv="aktiv" onclick="setFuhrparkFilter('aktiv')"><span style="font-size:16px;width:20px;text-align:center">🚗</span><span class="mod-lbl">Aktuell (<span id="fz-cnt-aktiv">0</span>)</span></button>
          <button class="mod-side-btn" data-fv="archiviert" onclick="setFuhrparkFilter('archiviert')"><span style="font-size:16px;width:20px;text-align:center">📁</span><span class="mod-lbl">Archiv (<span id="fz-cnt-archiv">0</span>)</span></button>
        </nav></aside>
        <div class="mod-main" id="fuhrpark-content"></div>
      </div>`;
  }

  // Zähler + Aktiv-Klassen
  ['bestellt','aktiv','archiviert'].forEach(s => {
    const el = document.getElementById('fz-cnt-'+s);
    if (el) el.textContent = anz(s);
  });
  document.querySelectorAll('#fuhrpark-mod-shell [data-fv]').forEach(b =>
    b.classList.toggle('active', b.dataset.fv === f));

  // Nur Inhalt neu rendern
  const content = document.getElementById('fuhrpark-content');
  if (!content) return;
  content.innerHTML = `
    <div class="toolbar" style="margin-bottom:16px">
      ${canWrite()?'<button class="btn btn-primary btn-sm" onclick="oeffneFahrzeugForm()">＋ Fahrzeug</button>':''}
      <button class="btn btn-outline btn-sm" onclick="exportFuhrparkXlsx()">⬇ Excel</button>
      <button class="btn btn-outline btn-sm" onclick="fuhrparkBerichte()" title="Berichte">🖨</button>
    </div>
    ${liste.length===0
      ? `<div class="module-placeholder"><div class="ph-icon">🚗</div><h3>Keine Fahrzeuge</h3><p>${canWrite()?'Lege mit „＋ Fahrzeug" das erste an.':'Noch keine Fahrzeuge erfasst.'}</p></div>`
      : `<div class="fz-grid">${cards}</div>`}`;
};

function setFuhrparkFilter(f) { fuhrparkState.filter = f; renderFuhrpark(); }

// ── Fahrzeug-Formular ──
function oeffneFahrzeugForm(id) {
  const v = id ? fuhrparkState.fahrzeuge.find(x=>x.id===id) : null;
  const klOpts = FZ_KLASSEN.map(k=>`<option value="${k}" ${v?.fahrzeugklasse===k?'selected':''}>${k}</option>`).join('');
  const typOpts = FZ_TYPEN.map(([k,l])=>`<option value="${k}" ${v?.typ===k?'selected':''}>${l}</option>`).join('');
  const haltOpts = FZ_HALTUNG.map(([k,l])=>`<option value="${k}" ${(v?.haltung||'kauf')===k?'selected':''}>${l}</option>`).join('');
  const statusOpts = [['bestellt','Bestellt'],['aktiv','Aktuell'],['archiviert','Archiv']].map(([k,l])=>`<option value="${k}" ${(v?.status||'aktiv')===k?'selected':''}>${l}</option>`).join('');

  const modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.id = 'fz-modal';
  modal.innerHTML = `
    <div class="modal" style="width:min(960px,96vw);max-height:92vh">
      <div class="modal-header"><h3>${v?'Fahrzeug bearbeiten':'Neues Fahrzeug'}</h3><button class="close-btn" onclick="document.getElementById('fz-modal').remove()">✕</button></div>
      <div class="modal-body">
        <input type="hidden" id="fz-id" value="${v?.id||''}">

        ${canWrite()?`<div style="background:#EFF6FF;border:1px solid #93c5fd;border-radius:8px;padding:12px 14px;margin-bottom:16px;">
          <div style="font-weight:600;font-size:13px;color:var(--blau-dark);margin-bottom:3px;">🪪 Fahrzeugschein automatisch auslesen</div>
          <div style="font-size:12px;color:var(--grau);margin-bottom:8px;">Foto oder PDF der Zulassungsbescheinigung Teil I wählen – die Felder werden automatisch vorausgefüllt. Bitte danach prüfen.</div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <input type="file" id="fz-scan-file" accept="application/pdf,image/*" style="font-size:12px;">
            <button type="button" class="btn btn-primary btn-sm" onclick="leseScheinAus()">Auslesen</button>
          </div>
          <div id="fz-scan-status" style="font-size:12px;margin-top:7px;"></div>
        </div>`:''}

        <div class="fgrid">
          <div class="frow"><label>Kennzeichen *</label><input id="fz-kennz" value="${v?.kennzeichen||''}" placeholder="EL-UI 22"></div>
          <div class="frow"><label>Fahrzeugklasse</label><select id="fz-klasse"><option value="">–</option>${klOpts}</select></div>
        </div>
        <div class="fgrid">
          <div class="frow"><label>Marke</label><input id="fz-marke" value="${v?.marke||''}" placeholder="Mercedes"></div>
          <div class="frow"><label>Typ / Modell</label><input id="fz-modell" value="${v?.modell||''}" placeholder="Actros"></div>
        </div>
        <div class="fgrid">
          <div class="frow"><label>Fahrzeugart</label><select id="fz-typ">${typOpts}</select></div>
          <div class="frow"><label>FIN</label><input id="fz-fin" value="${v?.fin||''}"></div>
        </div>
        <div class="fsec">Status & Halteart</div>
        <div class="fgrid">
          <div class="frow"><label>Status</label><select id="fz-status">${statusOpts}</select></div>
          <div class="frow"><label>Halteart</label><select id="fz-haltung">${haltOpts}</select></div>
        </div>
        <div class="fgrid">
          <div class="frow"><label>Laufzeit von</label><input type="date" id="fz-von" value="${v?.bestand_seit||''}"></div>
          <div class="frow"><label>Laufzeit bis</label><input type="date" id="fz-bis" value="${v?.bestand_bis||''}"></div>
        </div>
        <div class="frow"><label>Monatliche Kosten (Rate, €)</label><input type="number" step="0.01" id="fz-rate" value="${v?.rate??''}" placeholder="z.B. 450.00"></div>
        <div class="fsec">Prüftermine</div>
        <div class="fgrid">
          <div class="frow"><label>HU/AU fällig</label><input type="date" id="fz-hu" value="${v?.hu_faellig||''}"></div>
          <div class="frow"><label>SP fällig (LKW/Bus)</label><input type="date" id="fz-sp" value="${v?.sp_faellig||''}"></div>
        </div>
        <div class="fsec">Versicherung</div>
        <div class="fgrid">
          <div class="frow"><label>Gesellschaft</label><input id="fz-vers" value="${v?.versicherung||''}"></div>
          <div class="frow"><label>Police-Nr.</label><input id="fz-police" value="${v?.vers_police||''}"></div>
        </div>
        <div class="frow"><label>Notiz</label><textarea id="fz-notiz" rows="2" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:var(--radius);font-family:inherit;font-size:13px">${v?.notiz||''}</textarea></div>
      </div>
      <div class="modal-footer">
        ${v&&canWrite()?`<button class="btn btn-outline" style="margin-right:auto;color:var(--rot)" onclick="loescheFahrzeug('${v.id}')">Löschen</button>`:''}
        <button class="btn btn-outline" onclick="document.getElementById('fz-modal').remove()">Abbrechen</button>
        <button class="btn btn-primary" onclick="speichereFahrzeug()">Speichern</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

async function speichereFahrzeug() {
  const v = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  const kennz = v('fz-kennz');
  if (!kennz) { toast('Bitte Kennzeichen eingeben.','err'); return; }
  const data = {
    kennzeichen: kennz,
    fahrzeugklasse: v('fz-klasse')||null,
    marke: v('fz-marke')||null,
    modell: v('fz-modell')||null,
    typ: v('fz-typ')||'pkw',
    fin: v('fz-fin')||null,
    status: v('fz-status')||'aktiv',
    haltung: v('fz-haltung')||'kauf',
    bestand_seit: v('fz-von')||null,
    bestand_bis: v('fz-bis')||null,
    rate: v('fz-rate')!=='' ? parseFloat(v('fz-rate')) : null,
    hu_faellig: v('fz-hu')||null,
    sp_faellig: v('fz-sp')||null,
    versicherung: v('fz-vers')||null,
    vers_police: v('fz-police')||null,
    notiz: v('fz-notiz')||null,
  };
  const id = v('fz-id');
  let error;
  if (id) ({ error } = await sb.from('fahrzeuge').update(data).eq('id', id));
  else    ({ error } = await sb.from('fahrzeuge').insert(data));
  if (error) { toast('Fehler: '+error.message,'err'); return; }
  window.logAenderung?.('fuhrpark', id ? 'Fahrzeug bearbeitet' : 'Fahrzeug angelegt', data.kennzeichen || '');
  document.getElementById('fz-modal').remove();
  await ladeFuhrpark(); renderFuhrpark();
  toast('Gespeichert','ok');
}

async function loescheFahrzeug(id) {
  if (!confirm('Dieses Fahrzeug wirklich löschen? Alle zugehörigen Dokumente und Unfälle gehen verloren.')) return;
  const fz = fuhrparkState.fahrzeuge.find(x=>x.id===id);
  const { error } = await sb.from('fahrzeuge').delete().eq('id', id);
  if (error) { toast(error.message,'err'); return; }
  window.logAenderung?.('fuhrpark', 'Fahrzeug gelöscht', fz ? fz.kennzeichen : id);
  const m = document.getElementById('fz-modal'); if (m) m.remove();
  const d = document.getElementById('fz-detail'); if (d) d.remove();
  await ladeFuhrpark(); renderFuhrpark();
  toast('Gelöscht','ok');
}

// Statuswechsel per Klick (bestellt→aktiv, aktiv→archiviert, zurück)
async function fzSetStatus(id, status) {
  const { error } = await sb.from('fahrzeuge').update({ status }).eq('id', id);
  if (error) { toast(error.message,'err'); return; }
  await ladeFuhrpark();
  const d = document.getElementById('fz-detail'); if (d) d.remove();
  renderFuhrpark();
  toast(status==='aktiv'?'Fahrzeug ist jetzt aktuell':status==='archiviert'?'Fahrzeug archiviert':'Status geändert','ok');
}

// ── Fahrzeug-Detailansicht ──
function oeffneFahrzeug(id) {
  const v = fuhrparkState.fahrzeuge.find(x=>x.id===id);
  if (!v) return;
  const hu = faelligkeitStatus(v.hu_faellig);
  const sp = faelligkeitStatus(v.sp_faellig);
  const titel = [v.marke, v.modell].filter(Boolean).join(' ') || v.kennzeichen;

  const rows = [
    ['Kennzeichen', v.kennzeichen],
    ['Fahrzeugklasse', v.fahrzeugklasse],
    ['Marke / Typ', titel],
    ['FIN', v.fin],
    ['Halteart', haltungLabel(v.haltung)],
    ['Laufzeit', [v.bestand_seit,v.bestand_bis].filter(Boolean).map(d=>new Date(d).toLocaleDateString('de-DE')).join(' – ')],
    ['Monatliche Kosten', v.rate?Number(v.rate).toLocaleString('de-DE',{minimumFractionDigits:2})+' €':null],
    ['HU/AU fällig', v.hu_faellig?`<span style="color:${hu.farbe};font-weight:600">${hu.label}</span>`:null],
    ['SP fällig', v.sp_faellig?`<span style="color:${sp.farbe};font-weight:600">${sp.label}</span>`:null],
    ['Versicherung', [v.versicherung,v.vers_police].filter(Boolean).join(' · ')],
    ['Notiz', v.notiz],
  ].filter(r=>r[1]).map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('');

  // Statuswechsel-Button je nach aktuellem Status
  let statusBtn = '';
  if (canWrite()) {
    if (v.status==='bestellt') statusBtn = `<button class="btn btn-primary btn-sm" onclick="fzSetStatus('${v.id}','aktiv')">→ Auf „Aktuell" setzen</button>`;
    else if (v.status==='aktiv') statusBtn = `<button class="btn btn-outline btn-sm" onclick="fzSetStatus('${v.id}','archiviert')">→ Archivieren</button>`;
    else if (v.status==='archiviert') statusBtn = `<button class="btn btn-outline btn-sm" onclick="fzSetStatus('${v.id}','aktiv')">↩ Reaktivieren</button>`;
  }

  const zb1 = v.zb1_path
    ? `<div class="doc-row"><span>📄 ${v.zb1_dateiname||'Zulassungsbescheinigung Teil 1'}</span><button class="btn btn-outline btn-sm" onclick="oeffneFzDoc('${v.zb1_path}')">Öffnen</button></div>`
    : `<div class="doc-row" style="color:var(--grau)">Noch nicht hinterlegt</div>`;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.id = 'fz-detail';
  modal.innerHTML = `
    <div class="modal" style="width:740px;max-height:92vh">
      <div class="modal-header">
        <h3>${v.kennzeichen} · ${titel}</h3>
        <button class="close-btn" onclick="document.getElementById('fz-detail').remove()">✕</button>
      </div>
      <div class="modal-body">
        <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
          ${statusBtn}
          ${canWrite()?`<button class="btn btn-outline btn-sm" onclick="document.getElementById('fz-detail').remove();oeffneFahrzeugForm('${v.id}')">✎ Bearbeiten</button>`:''}
          <button class="btn btn-outline btn-sm" onclick="druckeFahrzeugDatenblatt('${v.id}')">🖨 Datenblatt</button>
          ${(v.status==='archiviert'&&canWrite())?`<button class="btn btn-danger btn-sm" style="margin-left:auto" onclick="loescheFahrzeug('${v.id}')">🗑 Endgültig löschen</button>`:''}
        </div>
        <table class="akte-table"><tbody>${rows}</tbody></table>

        <div class="fsec">Zulassungsbescheinigung Teil 1</div>
        ${zb1}
        ${canWrite()?`<div style="margin-top:6px"><input type="file" id="fz-zb1-file" accept="application/pdf,image/*" style="font-size:12px"><button class="btn btn-outline btn-sm" onclick="uploadZB1('${v.id}')">⬆ Hochladen</button></div>`:''}

        <div class="fsec">TÜV-Datenblatt Fahrerassistenzsysteme</div>
        <div class="doc-row"><span>🛂 FAS-Datenblatt (TÜV-Original, vorausgefüllt)</span><button class="btn btn-outline btn-sm" onclick="druckeFASDatenblatt('${v.id}')">⬇ Erstellen</button></div>
        ${canWrite()?`
        <div style="background:var(--hell);border-radius:8px;padding:10px 12px;margin-top:7px;font-size:12px">
          <div style="margin-bottom:6px">Verbaute Assistenzsysteme automatisch ankreuzen lassen: Fahrzeug-Bestellung oder Ausstattungsliste (PDF/Foto) hochladen.</div>
          <input type="file" id="fz-best-file" accept="application/pdf,image/*" style="font-size:12px">
          <button class="btn btn-primary btn-sm" onclick="leseBestellungFAS('${v.id}')">Bestellung auslesen</button>
          <div id="fz-best-status" style="margin-top:6px"></div>
        </div>`:''}
        <div class="doc-row" id="unfall-row"><span>🚧 EU-Unfallbericht (offizielles Formular zum Ausdrucken)</span><button class="btn btn-outline btn-sm" onclick="oeffneUnfallVorlage()">⬇ Öffnen / Drucken</button></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="document.getElementById('fz-detail').remove()">Schließen</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

async function uploadZB1(fzId) {
  const fileEl = document.getElementById('fz-zb1-file');
  const file = fileEl?.files?.[0];
  if (!file) { toast('Bitte Datei wählen','err'); return; }
  const ext = file.name.split('.').pop();
  const path = `${fzId}/zb1_${Date.now()}.${ext}`;
  const { error: upErr } = await sb.storage.from('fuhrpark').upload(path, file);
  if (upErr) { toast('Upload-Fehler: '+upErr.message,'err'); return; }
  const { error } = await sb.from('fahrzeuge').update({ zb1_path: path, zb1_dateiname: file.name }).eq('id', fzId);
  if (error) { toast(error.message,'err'); return; }
  await ladeFuhrpark();
  document.getElementById('fz-detail').remove();
  oeffneFahrzeug(fzId);
  toast('Zulassungsbescheinigung gespeichert','ok');
}

async function oeffneFzDoc(path) {
  const { data, error } = await sb.storage.from('fuhrpark').createSignedUrl(path, 120);
  if (error) { toast(error.message,'err'); return; }
  window.open(data.signedUrl, '_blank');
}

// ── BERICHTE ──
function fuhrparkBerichte() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.id = 'fp-ber-modal';
  modal.innerHTML = `
    <div class="modal" style="width:560px">
      <div class="modal-header"><h3>🖨 Fuhrpark-Berichte</h3><button class="close-btn" onclick="document.getElementById('fp-ber-modal').remove()">✕</button></div>
      <div class="modal-body">
        <div class="ber-sec">Fahrzeugliste</div>
        <div class="ber-row"><button class="btn btn-outline" onclick="druckeFahrzeugliste()">🖨 Komplette Liste (nach Eigentum/finanziert/geleast, mit Salden)</button></div>
      </div>
      <div class="modal-footer"><button class="btn btn-outline" onclick="document.getElementById('fp-ber-modal').remove()">Schließen</button></div>
    </div>`;
  document.body.appendChild(modal);
}

function druckeFahrzeugDatenblatt(id) {
  const v = fuhrparkState.fahrzeuge.find(x=>x.id===id);
  if (!v) return;
  const hu = faelligkeitStatus(v.hu_faellig), sp = faelligkeitStatus(v.sp_faellig);
  const titel = [v.marke,v.modell].filter(Boolean).join(' ')||v.kennzeichen;
  const rows = [
    ['Kennzeichen', v.kennzeichen],['Fahrzeugklasse', v.fahrzeugklasse],
    ['Marke / Typ', titel],['FIN', v.fin],
    ['Halteart', haltungLabel(v.haltung)],
    ['Laufzeit', [v.bestand_seit,v.bestand_bis].filter(Boolean).map(d=>new Date(d).toLocaleDateString('de-DE')).join(' – ')],
    ['Monatliche Kosten', v.rate?Number(v.rate).toLocaleString('de-DE',{minimumFractionDigits:2})+' €':null],
    ['HU/AU fällig', v.hu_faellig?new Date(v.hu_faellig).toLocaleDateString('de-DE'):null],
    ['SP fällig', v.sp_faellig?new Date(v.sp_faellig).toLocaleDateString('de-DE'):null],
    ['Versicherung', [v.versicherung,v.vers_police].filter(Boolean).join(' · ')],
    ['Status', ({bestellt:'Bestellt',aktiv:'Aktuell',archiviert:'Archiv'})[v.status]],
  ].filter(r=>r[1]).map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('');
  const w = window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Fahrzeug ${v.kennzeichen}</title>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet"><style>body{font-family:'Poppins','Segoe UI',Arial,sans-serif;padding:40px;color:#3F4B57;font-size:13px}
    h1{color:#C0001A;margin:0 0 4px 0}
    table{width:100%;border-collapse:collapse;margin-top:16px}
    td{padding:6px 10px;border-bottom:1px solid #ddd}td:first-child{color:#6B7280;width:200px}
    .head{color:#6B7280;font-size:11px;margin-bottom:20px}
    ${typeof DRUCK_CSS!=='undefined'?DRUCK_CSS:''}</style></head><body>
    ${typeof druckBriefkopf==='function'?druckBriefkopf():''}
    <h1>Fahrzeug-Datenblatt</h1>
    <p class="head">Stand: ${new Date().toLocaleDateString('de-DE')}</p>
    <table><tbody>${rows}</tbody></table>
    ${typeof druckFusszeile==='function'?druckFusszeile():''}
    </body></html>`);
  w.document.close();
  fzPrintWhenReady(w);
}

function druckeFahrzeugliste() {
  // Gruppiert nach Halteart, mit Summen
  const aktive = fuhrparkState.fahrzeuge.filter(v=>v.status!=='archiviert');
  let gesamtRate = 0;
  const gruppen = FZ_HALTUNG.map(([key,label]) => {
    const fz = aktive.filter(v=>v.haltung===key);
    if (!fz.length) return '';
    let summe = 0;
    const rows = fz.map(v=>{
      const r = Number(v.rate)||0; summe += r;
      const titel = [v.marke,v.modell].filter(Boolean).join(' ')||'–';
      return `<tr>
        <td>${v.kennzeichen}</td><td>${v.fahrzeugklasse||'–'}</td><td>${titel}</td>
        <td>${({bestellt:'bestellt',aktiv:'aktuell'})[v.status]||v.status}</td>
        <td class="num">${r?r.toLocaleString('de-DE',{minimumFractionDigits:2}):'–'}</td>
      </tr>`;
    }).join('');
    gesamtRate += summe;
    return `<tr class="grp"><td colspan="5">${label} (${fz.length})</td></tr>
      ${rows}
      <tr class="sum"><td colspan="4">Zwischensumme ${label}</td><td class="num">${summe.toLocaleString('de-DE',{minimumFractionDigits:2})} €</td></tr>`;
  }).join('');

  const w = window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Fahrzeugliste</title>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet"><style>body{font-family:'Poppins','Segoe UI',Arial,sans-serif;padding:40px;color:#3F4B57;font-size:12px}
    h1{color:#C0001A;margin:0 0 4px 0}
    table{width:100%;border-collapse:collapse;margin-top:12px;font-size:11px}
    th{background:#F3F4F6;text-align:left;padding:6px 8px;border-bottom:2px solid #ccc}
    td{padding:5px 8px;border-bottom:1px solid #eee}
    .num{text-align:right;font-variant-numeric:tabular-nums}
    .grp td{background:#E5E7EB;color:#3F4B57;font-weight:bold;padding:9px 10px;line-height:1.4;border-left:4px solid #6B7280}
    .sum td{font-weight:bold;border-top:2px solid #ccc;background:#FAFAFA}
    .gesamt td{font-weight:bold;font-size:13px;border-top:3px solid #C0001A;color:#C0001A}
    .head{color:#6B7280;font-size:11px;margin-bottom:12px}
    ${typeof DRUCK_CSS!=='undefined'?DRUCK_CSS:''}</style></head><body>
    ${typeof druckBriefkopf==='function'?druckBriefkopf():''}
    <h1>Fahrzeugliste</h1>
    <p class="head">Stand: ${new Date().toLocaleDateString('de-DE')} · ${aktive.length} Fahrzeuge (bestellt + aktuell)</p>
    <table>
      <thead><tr><th>Kennzeichen</th><th>Klasse</th><th>Marke / Typ</th><th>Status</th><th class="num">Kosten/Mon.</th></tr></thead>
      <tbody>${gruppen}
        <tr class="gesamt"><td colspan="4">GESAMT monatliche Kosten</td><td class="num">${gesamtRate.toLocaleString('de-DE',{minimumFractionDigits:2})} €</td></tr>
      </tbody>
    </table>
    ${typeof druckFusszeile==='function'?druckFusszeile():''}
    </body></html>`);
  w.document.close();
  fzPrintWhenReady(w);
}

function fzPrintWhenReady(w) {
  w.onload = function() {
    const imgs = w.document.images; let g=0; const t=imgs.length;
    if (t===0) { w.print(); return; }
    const ck=()=>{ if(++g>=t) setTimeout(()=>w.print(),100); };
    for (let i=0;i<t;i++){ if(imgs[i].complete) ck(); else { imgs[i].onload=ck; imgs[i].onerror=ck; } }
  };
  setTimeout(()=>{ try{ w.print(); }catch(e){} }, 1500);
}

// Platzhalter — werden im nächsten Schritt mit PDF-Generierung gefüllt
function druckeFASDatenblatt(id) {
  if (typeof generiereFAS === 'function') generiereFAS(id);
  else toast('FAS-Datenblatt wird noch eingebaut','');
}

// ── EU-Unfallbericht: offizielles GDV/Insurance-Europe-Formular ──
function oeffneUnfallVorlage() {
  if (!window.FST_UNFALL_ORIGINAL) { toast('Unfallbericht-Vorlage nicht geladen','err'); return; }
  const bytes = b64ToBytes(window.FST_UNFALL_ORIGINAL);
  const blob = new Blob([bytes], {type:'application/pdf'});
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(()=>URL.revokeObjectURL(url), 60000);
}

// ── PDF-Generierung mit pdf-lib (teilausgefüllt mit Fahrzeugdaten) ──
function b64ToBytes(b64) {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i=0;i<bin.length;i++) arr[i] = bin.charCodeAt(i);
  return arr;
}
function ladePdfDownload(bytes, dateiname) {
  const blob = new Blob([bytes], {type:'application/pdf'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = dateiname;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
}
function setField(form, name, value, size) {
  if (value == null || value === '') return;
  try { const f = form.getTextField(name); if (size) f.setFontSize(size); f.setText(String(value)); } catch(e) { /* Feld evtl. nicht vorhanden */ }
}

const FAS_LABELS = {
  0:'Geschwindigkeitsregelanlage', 1:'Adaptive Geschwindigkeitsregelanlage (ACC)', 2:'Notbrems-Assistent',
  3:'Abbiege-Assistent', 4:'Spurhalte-Assistent', 5:'Spurhalte-Assistent mit Lenkeingriff',
  6:'Aktiver Spurhalte-Assistent', 7:'Spurwechsel-Assistent', 8:'Toter-Winkel-Assistent',
  9:'Spurwechsel-Assistent mit Lenkeingriff', 10:'Aktiver Spurwechsel-Assistent', 11:'Park-Assistent',
  12:'Aktiver Park-Assistent', 13:'Rückfahrkamera', 14:'Verkehrszeichenerkennung',
  15:'Teilautom. Fahren (Stau)', 16:'Teilautomatisiertes Fahren'
};

async function generiereFAS(fzId) {
  const v = fuhrparkState.fahrzeuge.find(x=>x.id===fzId);
  if (!v) return;
  if (!window.PDFLib) { toast('PDF-Bibliothek lädt noch, bitte gleich nochmal','err'); return; }
  if (!window.FST_FAS_PDF) { toast('FAS-Vorlage nicht geladen','err'); return; }
  try {
    const pdfDoc = await PDFLib.PDFDocument.load(b64ToBytes(window.FST_FAS_PDF));
    const form = pdfDoc.getForm();
    // Weißen Feldhintergrund (MK/BG) entfernen – sonst überdeckt er beim Fixieren die Tabellenlinien
    try {
      const PN = PDFLib.PDFName, PD = PDFLib.PDFDict;
      form.getFields().forEach(field => {
        field.acroField.getWidgets().forEach(w => {
          try { const mk = w.dict.lookupMaybe(PN.of('MK'), PD); if (mk && mk.has(PN.of('BG'))) mk.delete(PN.of('BG')); } catch(e) {}
        });
      });
    } catch(e) {}
    const FS = 9; // dezente, originalnahe Schriftgröße
    const d = new Date();
    const heute = String(d.getDate()).padStart(2,'0')+'.'+String(d.getMonth()+1).padStart(2,'0')+'.'+d.getFullYear();
    setField(form, 'fahrschule', 'Fahrschulteam Lingen', FS);
    setField(form, 'hersteller', v.marke, FS);
    setField(form, 'typ', v.modell, FS);
    setField(form, 'handel', [v.marke,v.modell].filter(Boolean).join(' '), FS);
    setField(form, 'fin', v.fin, FS);
    setField(form, 'kennz', v.kennzeichen, FS);
    setField(form, 'ort', 'Lingen', FS);
    setField(form, 'datum', heute, FS);
    // Ankreuzfelder aus erkannter Bestellung (falls vorhanden)
    if (v._fasStatus) {
      for (let i=0;i<=16;i++){
        const s = v._fasStatus[i] ?? v._fasStatus[String(i)];
        if (s==='verbaut' || s==='nicht') {
          try { form.getRadioGroup('fas_'+i).select(s); } catch(e) {}
        }
      }
    }
    // Feld-Hintergründe entfernen, sonst überdeckt der (weiße) Hintergrund die Tabellenlinien
    try {
      const PN = PDFLib.PDFName;
      form.getFields().forEach(fld => {
        fld.acroField.getWidgets().forEach(w => {
          const mk = w.dict.lookup(PN.of('MK'));
          if (mk && typeof mk.delete === 'function' && mk.has(PN.of('BG'))) mk.delete(PN.of('BG'));
        });
      });
    } catch(e) { console.warn('Hintergrund-Entfernung übersprungen:', e); }
    // Formular fixieren: Einträge fest einbrennen -> keine grauen Felder, Linien bleiben sichtbar
    form.flatten();
    // Hinterlegte Unterschrift (Inhaber/Leiter) auf die Unterschriftszeile setzen, falls vorhanden
    try {
      const { data: sigData } = await sb.storage.from('fuhrpark').download('signaturen/inhaber.png');
      if (sigData) {
        const png = await pdfDoc.embedPng(await sigData.arrayBuffer());
        const page = pdfDoc.getPage(0);
        const maxW = 150, maxH = 34;                       // Linie: x 368–539, y≈71
        const r = Math.min(maxW / png.width, maxH / png.height);
        page.drawImage(png, { x: 374, y: 73, width: png.width * r, height: png.height * r });
      }
    } catch(e) { /* keine Unterschrift hinterlegt – Zeile bleibt leer */ }
    const bytes = await pdfDoc.save();
    ladePdfDownload(bytes, `FAS-Datenblatt_${v.kennzeichen||'Fahrzeug'}.pdf`);
    toast('FAS-Datenblatt erstellt','ok');
  } catch(e) { toast('Fehler: '+e.message,'err'); console.error(e); }
}

// ── Fahrzeug-Bestellung auslesen → verbaute Assistenzsysteme erkennen ──
async function leseBestellungFAS(fzId) {
  const v = fuhrparkState.fahrzeuge.find(x=>x.id===fzId);
  if (!v) return;
  const fileEl = document.getElementById('fz-best-file');
  const file = fileEl?.files?.[0];
  const status = document.getElementById('fz-best-status');
  if (!file) { status.innerHTML = '<span style="color:#991B1B">Bitte zuerst eine Datei wählen.</span>'; return; }
  status.innerHTML = '<span style="color:#2A6CAE">⏳ Bestellung wird analysiert …</span>';
  try {
    const file = await pruefeUndKomprimiereDatei(fileEl.files[0]);
    const b64 = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result.split(',')[1]);
      r.onerror = () => rej(new Error('Lesefehler'));
      r.readAsDataURL(file);
    });
    const mediaType = file.type || 'application/pdf';
    const response = await fetch('/.netlify/functions/dokument-auslesen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: b64, mediaType, typ: 'bestellung' }),
    });
    const result = await response.json();
    if (result.error) { status.innerHTML = `<span style="color:#991B1B">${result.error}</span>`; return; }
    const felder = result.felder || {};
    const fas = felder.fas || {};
    v._fasStatus = fas;
    if (!v.marke && felder.hersteller) v.marke = felder.hersteller;
    if (!v.modell && felder.typ) v.modell = felder.typ;
    if (!v.fin && felder.fin) v.fin = felder.fin;
    const verbaut = Object.keys(FAS_LABELS).filter(i => (fas[i]??fas[String(i)])==='verbaut').map(i=>FAS_LABELS[i]);
    const unklar  = Object.keys(FAS_LABELS).filter(i => (fas[i]??fas[String(i)])==='unklar').map(i=>FAS_LABELS[i]);
    let html = `<span style="color:#166534">✓ Erkannt. Verbaut: ${verbaut.length?verbaut.join(', '):'—'}.</span>`;
    if (unklar.length) html += `<br><span style="color:#92400E">Unklar – bitte im Datenblatt selbst ankreuzen: ${unklar.join(', ')}.</span>`;
    html += `<br><button class="btn btn-primary btn-sm" style="margin-top:7px" onclick="druckeFASDatenblatt('${fzId}')">⬇ Datenblatt mit Kreuzen erstellen</button>`;
    status.innerHTML = html;
  } catch(e) {
    console.error(e);
    status.innerHTML = `<span style="color:#991B1B">Konnte die Bestellung nicht auslesen (${e.message}).</span>`;
  }
}

// ── Fahrzeugschein per Netlify-Function (Claude-API) auslesen ──
async function leseScheinAus() {
  const fileEl = document.getElementById('fz-scan-file');
  const file = fileEl?.files?.[0];
  const status = document.getElementById('fz-scan-status');
  if (!file) { status.innerHTML = '<span style="color:#991B1B">Bitte zuerst eine Datei wählen.</span>'; return; }

  status.innerHTML = '<span style="color:#2A6CAE">⏳ Fahrzeugschein wird analysiert …</span>';

  try {
    const file = await pruefeUndKomprimiereDatei(fileEl.files[0]);
    // Datei → base64
    const b64 = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result.split(',')[1]);
      r.onerror = () => rej(new Error('Lesefehler'));
      r.readAsDataURL(file);
    });
    const mediaType = file.type || 'application/pdf';

    // Aufruf der Netlify-Function (API-Key bleibt serverseitig)
    const response = await fetch('/.netlify/functions/dokument-auslesen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: b64, mediaType, typ: 'fahrzeugschein' }),
    });
    const result = await response.json();
    if (result.error) { status.innerHTML = `<span style="color:#991B1B">${result.error}</span>`; return; }
    const felder = result.felder || {};

    const setVal = (id, val) => { if (val) { const el=document.getElementById(id); if (el) el.value = val; } };
    setVal('fz-kennz', felder.kennzeichen);
    setVal('fz-marke', felder.marke);
    setVal('fz-modell', felder.modell);
    setVal('fz-fin', felder.fin);
    setVal('fz-von', felder.erstzulassung);
    if (felder.fahrzeugklasse) { const s=document.getElementById('fz-klasse'); if (s && [...s.options].some(o=>o.value===felder.fahrzeugklasse)) s.value = felder.fahrzeugklasse; }
    if (felder.fahrzeugart) { const s=document.getElementById('fz-typ'); if (s && [...s.options].some(o=>o.value===felder.fahrzeugart)) s.value = felder.fahrzeugart; }
    if (felder.kraftstoff) { const n=document.getElementById('fz-notiz'); if (n && !n.value) n.value = 'Kraftstoff: '+felder.kraftstoff; }

    const erkannt = Object.entries(felder).filter(([k,val])=>val).map(([k])=>k);
    status.innerHTML = `<span style="color:#166534">✓ Ausgelesen: ${erkannt.join(', ')||'nichts erkannt'}. Bitte prüfen und ggf. korrigieren.</span>`;
  } catch(e) {
    console.error(e);
    status.innerHTML = `<span style="color:#991B1B">Konnte den Schein nicht auslesen (${e.message}). Bitte Felder manuell eingeben.</span>`;
  }
}

// ── Excel-Export der Fahrzeugliste ──
function exportFuhrparkXlsx() {
  const zeilen = [['Kennzeichen','Klasse','Marke','Modell','Typ','Status','Halteart',
    'Bestand seit','Bestand bis','Rate €/Mon.','HU/AU fällig','SP fällig','Versicherung','Police','Notiz']];
  (fuhrparkState.fahrzeuge||[]).forEach(v=>zeilen.push([
    v.kennzeichen||'', v.fahrzeugklasse||'', v.marke||'', v.modell||'', v.typ||'',
    v.status||'', haltungLabel(v.haltung), v.bestand_seit||'', v.bestand_bis||'',
    v.rate!=null?Number(v.rate):'', v.hu_faellig||'', v.sp_faellig||'',
    v.versicherung||'', v.vers_police||'', v.notiz||'',
  ]));
  exportiereXlsx('Fuhrpark_'+new Date().toISOString().slice(0,10), 'Fahrzeuge', zeilen);
}
