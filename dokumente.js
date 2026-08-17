// ════════════════════════════════════════════════════════════════════
//  MODUL DOKUMENTE / VORLAGEN
//  Verweise auf OneDrive-Dateien (Freigabelinks).
//  Klick öffnet Word/Excel/PowerPoint-Dateien direkt in der lokal
//  installierten Desktop-App (originalgetreue Darstellung statt
//  Browser-Vorschau). PDF/Bilder/Sonstiges öffnen weiterhin im Browser.
//  Gruppiert nach Kategorie. Hinzufügen / Bearbeiten / Entfernen.
// ════════════════════════════════════════════════════════════════════

const dokState = {
  dokumente: [],
  loaded: false,
  filter: 'all',
};

// Dateityp aus Name/Link erkennen → Icon
function dokIcon(name = '', url = '') {
  const s = (name + ' ' + url).toLowerCase();
  if (/\.docx?\b|word|document/.test(s))      return '📄';
  if (/\.xlsx?\b|excel|spreadsheet/.test(s))  return '📊';
  if (/\.pptx?\b|powerpoint|presentation/.test(s)) return '📑';
  if (/\.pdf\b/.test(s))                       return '📕';
  if (/\.(jpg|jpeg|png|gif|webp)\b/.test(s))   return '🖼️';
  return '📎';
}

// Nur als Vorbelegung im Formular: bester Tipp aus Name/Link, bevor der
// Nutzer den Dateityp manuell bestätigt/ändert. Maßgeblich ist immer d.typ.
function dokTypRaten(name = '', url = '') {
  const s = ((name||'') + ' ' + (url||'')).toLowerCase();
  if (/\.docx?\b|word|document/.test(s))           return 'word';
  if (/\.xlsx?\b|excel|spreadsheet/.test(s))       return 'excel';
  if (/\.pptx?\b|powerpoint|presentation/.test(s)) return 'powerpoint';
  if (/\.pdf\b/.test(s))                           return 'pdf';
  return 'sonstige';
}

function dokIconFuerTyp(typ) {
  return { word:'📄', excel:'📊', powerpoint:'📑', pdf:'📕', sonstige:'📎' }[typ] || '📎';
}

async function ladeDokumente() {
  try {
    const { data } = await sb.from('dokumente').select('*').order('kategorie').order('sortierung');
    dokState.dokumente = data || [];
  } catch (e) { console.warn('Dokumente laden:', e); dokState.dokumente = []; }
  dokState.loaded = true;
}

window.renderDokumente = async function () {
  const view = document.getElementById('view-dokumente');
  if (!dokState.loaded) {
    view.innerHTML = '<div class="loading"><div class="spinner"></div>Lade Dokumente …</div>';
    await ladeDokumente();
  }

  const darfVerwalten = (typeof canWrite === 'function') ? canWrite() : true;

  // Kategorien sammeln
  const kategorien = [...new Set(dokState.dokumente.map(d => d.kategorie || 'Allgemein'))].sort();
  const filterChips = ['all', ...kategorien].map(k =>
    `<button class="dok-chip ${dokState.filter === k ? 'active' : ''}" onclick="setDokFilter('${k.replace(/'/g, "\\'")}')">${k === 'all' ? 'Alle' : esc(k)}</button>`
  ).join('');

  let liste = dokState.dokumente;
  if (dokState.filter !== 'all') liste = liste.filter(d => (d.kategorie || 'Allgemein') === dokState.filter);

  // Nach Kategorie gruppieren
  const gruppen = {};
  liste.forEach(d => {
    const k = d.kategorie || 'Allgemein';
    (gruppen[k] = gruppen[k] || []).push(d);
  });

  let inhalt = '';
  if (liste.length === 0) {
    inhalt = `<div class="empty-state">
      <div style="font-size:40px;margin-bottom:10px">📁</div>
      <div>Noch keine Dokumente hinterlegt.</div>
      ${darfVerwalten ? '<div style="font-size:13px;color:var(--grau);margin-top:6px">Über „+ Dokument" einen OneDrive-Link hinzufügen.</div>' : ''}
    </div>`;
  } else {
    inhalt = Object.keys(gruppen).sort().map(kat => {
      const karten = gruppen[kat].map(d => `
        <div class="dok-card">
          <div class="dok-main" onclick="oeffneDok('${d.id}')" title="In Microsoft Office öffnen">
            <div class="dok-icon">${d.typ ? dokIconFuerTyp(d.typ) : dokIcon(d.name, d.url)}</div>
            <div class="dok-info">
              <div class="dok-name">${esc(d.name)}</div>
              ${d.beschreibung ? `<div class="dok-desc">${esc(d.beschreibung)}</div>` : ''}
            </div>
            <div class="dok-open">Öffnen ↗</div>
          </div>
          ${darfVerwalten ? `<div class="dok-actions">
            <button class="dok-act" onclick="oeffneDokModal('${d.id}')" title="Bearbeiten">✏️</button>
            <button class="dok-act" onclick="loescheDok('${d.id}','${esc(d.name).replace(/'/g, "\\'")}')" title="Entfernen">🗑️</button>
          </div>` : ''}
        </div>`).join('');
      return `<div class="dok-gruppe">
        <div class="dok-gruppe-titel">${esc(kat)} <span class="dok-count">${gruppen[kat].length}</span></div>
        <div class="dok-grid">${karten}</div>
      </div>`;
    }).join('');
  }

  view.innerHTML = `
    <div class="modul-head">
      <div>
        <h2 class="modul-titel">Vorlagen & Dokumente</h2>
        <p class="modul-sub">Klick öffnet die Datei in Microsoft Office zum Bearbeiten</p>
      </div>
      ${darfVerwalten ? '<button class="btn btn-primary" onclick="oeffneDokModal()">+ Dokument</button>' : ''}
    </div>
    ${kategorien.length ? `<div class="dok-chips">${filterChips}</div>` : ''}
    ${inhalt}
  `;
};

function setDokFilter(k) { dokState.filter = k; renderDokumente(); }

// Dokument öffnen: Office-Dateien (Word/Excel/PowerPoint) direkt in der
// lokal installierten Desktop-App öffnen statt in der Browser-Vorschau –
// damit wird die Originalformatierung immer korrekt dargestellt.
// PDF/Bilder/Sonstiges: weiterhin normaler Link im Browser.
function dokOfficeProtokoll(typ) {
  if (typ === 'word')       return 'ms-word';
  if (typ === 'excel')      return 'ms-excel';
  if (typ === 'powerpoint') return 'ms-powerpoint';
  return null;
}

function oeffneDok(id) {
  const d = dokState.dokumente.find(x => x.id === id);
  if (!d || !d.url) { toast('Kein Link hinterlegt.', 'err'); return; }
  const protokoll = dokOfficeProtokoll(d.typ || dokTypRaten(d.name, d.url));
  if (protokoll) {
    // Öffnet direkt in Word/Excel/PowerPoint Desktop (zum Bearbeiten, originalgetreu).
    // Browser fragt beim allerersten Mal einmalig nach Erlaubnis für dieses Protokoll.
    window.location.href = `${protokoll}:ofe|u|${d.url}`;
  } else {
    window.open(d.url, '_blank', 'noopener');
  }
}

// Modal: hinzufügen / bearbeiten
function oeffneDokModal(id) {
  const d = id ? dokState.dokumente.find(x => x.id === id) : null;
  const kategorienBekannt = [...new Set(dokState.dokumente.map(x => x.kategorie || 'Allgemein'))];
  const katListe = kategorienBekannt.map(k => `<option value="${esc(k)}">`).join('');

  const modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.id = 'dok-modal';
  modal.innerHTML = `
    <div class="modal" style="width:680px;max-height:92vh">
      <div class="modal-header">
        <h3>${d ? 'Dokument bearbeiten' : 'Neues Dokument'}</h3>
        <button class="close-btn" onclick="document.getElementById('dok-modal').remove()">✕</button>
      </div>
      <div class="modal-body">
        <input type="hidden" id="dok-id" value="${d?.id || ''}">
        <div class="frow">
          <label>Bezeichnung *</label>
          <input id="dok-name" value="${d ? esc(d.name) : ''}" placeholder="z.B. Ausbildungsvertrag BKF">
        </div>
        <div class="frow">
          <label>Kategorie</label>
          <input id="dok-kat" list="dok-katliste" value="${d ? esc(d.kategorie || '') : ''}" placeholder="z.B. Verträge, Bescheinigungen …">
          <datalist id="dok-katliste">${katListe}</datalist>
        </div>
        <div class="frow">
          <label>OneDrive-Freigabelink *</label>
          <input id="dok-url" value="${d ? esc(d.url || '') : ''}" placeholder="https://1drv.ms/… oder https://onedrive.live.com/…">
          <div class="dok-hinweis">
            💡 In OneDrive: Rechtsklick auf die Datei → <b>Teilen</b> → <b>Bearbeitung zulassen</b> → Link kopieren.
            Nur so kann jeder die Datei direkt im Browser bearbeiten.
          </div>
        </div>
        <div class="frow">
          <label>Dateityp *</label>
          <select id="dok-typ">
            <option value="word" ${(d?.typ||dokTypRaten(d?.name,d?.url))==='word'?'selected':''}>📄 Word-Dokument</option>
            <option value="excel" ${(d?.typ||dokTypRaten(d?.name,d?.url))==='excel'?'selected':''}>📊 Excel-Tabelle</option>
            <option value="powerpoint" ${(d?.typ||dokTypRaten(d?.name,d?.url))==='powerpoint'?'selected':''}>📑 PowerPoint-Präsentation</option>
            <option value="pdf" ${(d?.typ||dokTypRaten(d?.name,d?.url))==='pdf'?'selected':''}>📕 PDF</option>
            <option value="sonstige" ${(d?.typ||dokTypRaten(d?.name,d?.url))==='sonstige'?'selected':''}>📎 Sonstige</option>
          </select>
          <div class="dok-hinweis">
            💡 Word/Excel/PowerPoint öffnen damit direkt in der Desktop-App (originalgetreu). OneDrive-Links verraten den Dateityp meist nicht selbst – daher hier bitte einmal auswählen.
          </div>
        </div>
        <div class="frow">
          <label>Beschreibung (optional)</label>
          <input id="dok-desc" value="${d ? esc(d.beschreibung || '') : ''}" placeholder="Kurze Notiz">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="document.getElementById('dok-modal').remove()">Abbrechen</button>
        <button class="btn btn-primary" onclick="speichereDok()">Speichern</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  setTimeout(() => { const n = document.getElementById('dok-name'); if (n) n.focus(); }, 50);
}

async function speichereDok() {
  const val = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  const name = val('dok-name');
  let url = val('dok-url');
  if (!name) { toast('Bitte eine Bezeichnung eingeben.', 'err'); return; }
  if (!url)  { toast('Bitte einen OneDrive-Link einfügen.', 'err'); return; }
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  const data = {
    name,
    kategorie: val('dok-kat') || 'Allgemein',
    url,
    typ: document.getElementById('dok-typ').value,
    beschreibung: val('dok-desc') || null,
  };
  const id = val('dok-id');
  let error;
  if (id) ({ error } = await sb.from('dokumente').update(data).eq('id', id));
  else    ({ error } = await sb.from('dokumente').insert(data));
  if (error) { toast('Fehler: ' + error.message, 'err'); return; }
  const m = document.getElementById('dok-modal'); if (m) m.remove();
  await ladeDokumente(); renderDokumente();
  toast('Gespeichert', 'ok');
}

async function loescheDok(id, name) {
  if (!confirm(`„${name}" wirklich aus der Liste entfernen?\n\n(Die Datei auf OneDrive bleibt erhalten – nur der Verweis hier wird gelöscht.)`)) return;
  const { error } = await sb.from('dokumente').delete().eq('id', id);
  if (error) { toast('Fehler: ' + error.message, 'err'); return; }
  await ladeDokumente(); renderDokumente();
  toast('Entfernt', 'ok');
}

// kleiner HTML-Escaper (falls global esc() fehlt)
if (typeof esc !== 'function') {
  window.esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
}
