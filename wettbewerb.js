// ════════════════════════════════════════════════════════════════════
//  MODUL WETTBEWERB & RECHT
//  Verwaltung der überwachten Quellen (Wettbewerber, Fachautoren,
//  Rechtsquellen) + Anzeige der zuletzt gefundenen Änderungen.
//  Die eigentliche tägliche Prüfung läuft serverseitig in der Edge
//  Function "monitor-check" (siehe supabase/functions/monitor-check).
//  Neue Quellen können hier jederzeit ergänzt werden — kein Code-
//  Update nötig, der nächste tägliche Lauf berücksichtigt sie automatisch.
// ════════════════════════════════════════════════════════════════════

let wettbewerbState = {
  quellen: [],
  funde: [],
  entdeckungen: [],
  empfaenger: [],
  nutzer: [],
  briefings: {},       // quelle_id -> letzter Recherchebericht
  loaded: false,
  filterKat: 'alle',   // alle | wettbewerber | autor | recht
};

const WB_KAT_LABEL = { wettbewerber: 'Wettbewerber', autor: 'Fachautor', recht: 'Rechtsquelle' };
const WB_KAT_FARBE = { wettbewerber: '#2A6CAE', autor: '#8B5CF6', recht: '#C0001A' };

function escWb(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

async function ladeWettbewerbDaten() {
  try {
    const { data: q, error: qErr } = await sb.from('monitor_quellen').select('*').order('kategorie').order('name');
    if (qErr) toast('Fehler beim Laden der Quellen: ' + qErr.message, 'err');

    const { data: s } = await sb.from('monitor_snapshots').select('quelle_id,geprueft_am,rating,review_count,letzter_fehler,fehler_seit,fehler_anzahl');
    const snapByQuelle = {};
    (s || []).forEach(row => { snapByQuelle[row.quelle_id] = row; });
    wettbewerbState.quellen = (q || []).map(quelle => ({ ...quelle, _snap: snapByQuelle[quelle.id] || null }));

    const { data: f, error: fErr } = await sb.from('todos')
      .select('*').like('auto_key', 'monitor:%').order('created_at', { ascending: false }).limit(40);
    if (fErr) toast('Fehler beim Laden der Fund-Historie: ' + fErr.message, 'err');
    wettbewerbState.funde = f || [];

    const { data: e } = await sb.from('monitor_entdeckungen').select('*').eq('status', 'neu').order('entdeckt_am', { ascending: false });
    wettbewerbState.entdeckungen = e || [];

    // Letzter Recherchebericht je Quelle (für die Karten-Anzeige)
    try {
      const { data: br } = await sb.from('monitor_briefings')
        .select('*').order('erstellt_am', { ascending: false }).limit(200);
      const neueste = {};
      (br || []).forEach(b => { if (!neueste[b.quelle_id]) neueste[b.quelle_id] = b; });
      wettbewerbState.briefings = neueste;
    } catch { wettbewerbState.briefings = {}; }

    // Empfänger und Nutzerliste (nur für Admin)
    if (canWrite()) {
      const { data: emp } = await sb.from('monitor_empfaenger').select('*').order('erstellt_am');
      wettbewerbState.empfaenger = emp || [];
      const { data: nu } = await sb.from('app_users').select('id,name,email,rolle').order('name');
      wettbewerbState.nutzer = nu || [];
    }
  } catch (e) {
    toast('Ladefehler: ' + e.message, 'err');
  }
  wettbewerbState.loaded = true;
}

// ── Render ──
window.renderWettbewerb = async function () {
  const view = document.getElementById('view-wettbewerb');
  if (!wettbewerbState.loaded) {
    view.innerHTML = '<div class="loading"><div class="spinner"></div>Lade Quellen …</div>';
    await ladeWettbewerbDaten();
  }

  if (!document.getElementById('wb-mod-shell')) {
    view.innerHTML = `
      <div class="mod-shell" id="wb-mod-shell">
        <aside class="mod-side"><nav>
          <div class="mod-side-label">Kategorie</div>
          <button class="mod-side-btn" data-wk="alle" onclick="setWbFilter('alle')"><span class="mod-lbl">Alle</span></button>
          <button class="mod-side-btn" data-wk="wettbewerber" onclick="setWbFilter('wettbewerber')"><span class="mod-lbl">Wettbewerber</span></button>
          <button class="mod-side-btn" data-wk="autor" onclick="setWbFilter('autor')"><span class="mod-lbl">Fachautoren</span></button>
          <button class="mod-side-btn" data-wk="recht" onclick="setWbFilter('recht')"><span class="mod-lbl">Rechtsquellen</span></button>
          ${canWrite() ? `
          <div class="mod-side-divider"></div>
          <button class="mod-side-btn" data-wk="empfaenger" onclick="setWbFilter('empfaenger')"><span class="mod-lbl">Benachrichtigungen</span></button>
          ` : ''}
        </nav></aside>
        <div class="mod-main" id="wb-content"></div>
      </div>`;
  }
  document.querySelectorAll('#wb-mod-shell [data-wk]').forEach(b =>
    b.classList.toggle('active', b.dataset.wk === wettbewerbState.filterKat));

  renderWbContent();
};

function setWbFilter(k) { wettbewerbState.filterKat = k; renderWettbewerb(); }

function renderWbContent() {
  const el = document.getElementById('wb-content');
  if (!el) return;

  // Empfänger-Verwaltung (Admin)
  if (wettbewerbState.filterKat === 'empfaenger') {
    renderWbEmpfaenger(el);
    return;
  }

  const liste = wettbewerbState.filterKat === 'alle'
    ? wettbewerbState.quellen
    : wettbewerbState.quellen.filter(q => q.kategorie === wettbewerbState.filterKat);

  el.innerHTML = `
    <div class="toolbar" style="padding:18px 0 0;">
      <h2>Wettbewerb & Recht</h2>
      <span style="flex:1"></span>
      ${canWrite() && wettbewerbState.filterKat !== 'empfaenger' ? `<button class="btn" onclick="starteSammelRecherche()" title="Web-Recherche für alle Wettbewerber nacheinander">🕵 Alle recherchieren</button>` : ''}
      ${canWrite() ? `<button class="btn btn-primary" onclick="oeffneWbForm()">+ Neue Quelle</button>` : ''}
    </div>

    <div style="padding:14px 0 6px;">
      ${liste.length ? liste.map(wbCardHtml).join('') : `
        <div class="module-placeholder">
          <div class="ph-icon">🔎</div>
          <h3>Keine Quellen</h3>
          <p>Noch keine Quellen in dieser Kategorie hinterlegt.</p>
        </div>`}
    </div>

    ${wettbewerbState.entdeckungen.length ? `
    <div style="padding:8px 0 24px;">
      <h3 style="font-size:15px; margin-bottom:10px;">🆕 Neu entdeckt (${wettbewerbState.entdeckungen.length})</h3>
      ${wettbewerbState.entdeckungen.map(entdeckungHtml).join('')}
    </div>` : ''}

    <div style="padding:24px 0 32px;">
      <h3 style="font-size:15px; margin-bottom:10px;">Letzte Funde</h3>
      ${wettbewerbState.funde.length ? `
        <div class="card" style="padding:0; overflow:hidden;">
          ${wettbewerbState.funde.map(fundZeileHtml).join('')}
        </div>` : `<p style="color:var(--grau); font-size:13px;">Noch keine Änderungen erkannt. Der tägliche Check läuft automatisch im Hintergrund.</p>`}
    </div>`;

  function wbCardHtml(q) {
    return `
      <div class="card" style="display:flex; gap:12px; align-items:flex-start; padding:14px 16px; margin-bottom:10px; ${q.aktiv ? '' : 'opacity:.5;'}">
        <div style="flex:1; min-width:0;">
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <strong style="font-size:14px;">${escWb(q.name)}</strong>
            <span style="font-size:10px; font-weight:700; padding:2px 7px; border-radius:10px; color:#fff; background:${WB_KAT_FARBE[q.kategorie]};">${WB_KAT_LABEL[q.kategorie]}</span>
            ${q.prioritaet === 'hoch' ? '<span style="font-size:10px; font-weight:700; padding:2px 7px; border-radius:10px; color:#fff; background:#C0001A;">⬆ Hohe Priorität</span>' : ''}
            ${!q.aktiv ? '<span style="font-size:10px; font-weight:700; padding:2px 7px; border-radius:10px; background:var(--hell); color:var(--grau);">Deaktiviert</span>' : ''}
          </div>
          <div style="font-size:12px; margin-top:4px;"><a href="${escWb(q.url)}" target="_blank" rel="noopener">${escWb(q.url)}</a></div>
          ${q.ort ? `<div style="font-size:11px; color:var(--grau); margin-top:2px;">📍 ${escWb(q.ort)}</div>` : ''}
          ${q.notiz ? `<div style="font-size:12px; color:var(--grau); margin-top:4px; white-space:pre-wrap;">${escWb(q.notiz)}</div>` : ''}
          <div style="font-size:11px; color:var(--grau); margin-top:6px; display:flex; gap:12px; flex-wrap:wrap;">
            ${q._snap?.geprueft_am ? `<span>🕓 Zuletzt geprüft: ${new Date(q._snap.geprueft_am).toLocaleString('de-DE')}</span>` : '<span>Noch nicht geprüft</span>'}
            ${q._snap?.review_count != null ? `<span>⭐ ${q._snap.rating ?? '–'} (${q._snap.review_count} Google-Bewertungen)</span>` : ''}
            ${q.feed_url ? '<span>📡 RSS-Feed aktiv</span>' : ''}
            ${q.recherche_rhythmus === 'woechentlich' ? '<span>🕵 Recherche: wöchentlich</span>' : q.recherche_rhythmus === 'monatlich' ? '<span>🕵 Recherche: monatlich</span>' : ''}
          </div>
          ${q._snap?.fehler_seit ? `<div style="font-size:11px; color:#C0001A; margin-top:6px;">⚠️ Fehler seit ${new Date(q._snap.fehler_seit).toLocaleDateString('de-DE')} (${q._snap.fehler_anzahl}×): ${escWb(q._snap.letzter_fehler || '')}</div>` : ''}
        </div>
        ${(() => {
          const b = wettbewerbState.briefings[q.id];
          if (!b) return '';
          const farbe = b.relevanz === 'hoch' ? '#C0001A' : b.relevanz === 'niedrig' ? 'var(--grau)' : '#2A6CAE';
          return `
          <div style="margin-top:10px; padding:10px 12px; border-left:3px solid ${farbe}; background:var(--hell); border-radius:0 8px 8px 0;">
            <div style="font-size:12px; font-weight:700;">🕵 ${escWb(b.titel || 'Recherchebericht')}</div>
            <div style="font-size:11px; color:var(--grau); margin-top:2px;">Recherche vom ${new Date(b.erstellt_am).toLocaleDateString('de-DE')}</div>
            <button class="btn" style="padding:4px 9px; font-size:11px; margin-top:6px;" onclick="zeigeBriefing('${q.id}')">Bericht lesen</button>
          </div>`;
        })()}
        ${canWrite() ? `
        <div style="display:flex; gap:6px; flex-shrink:0; flex-wrap:wrap; justify-content:flex-end;">
          <button class="btn btn-primary" style="padding:6px 10px; font-size:12px;" onclick="starteRecherche('${q.id}')" title="Die KI durchsucht das Internet und erstellt einen Bericht (kostet ca. 20 Cent)">🕵 Jetzt recherchieren</button>
          <button class="btn" style="padding:6px 10px; font-size:12px;" onclick="oeffneWbForm('${q.id}')">Bearbeiten</button>
          <button class="btn" style="padding:6px 10px; font-size:12px;" onclick="toggleWbAktiv('${q.id}', ${!q.aktiv})">${q.aktiv ? 'Deaktivieren' : 'Aktivieren'}</button>
          <button onclick="loescheWbQuelle('${q.id}')" title="Löschen" style="flex-shrink:0; background:none; border:none; cursor:pointer; color:var(--grau); font-size:15px; padding:4px;">🗑</button>
        </div>` : ''}
      </div>`;
  }

  function entdeckungHtml(e) {
    return `
      <div class="card" style="display:flex; gap:12px; align-items:flex-start; padding:14px 16px; margin-bottom:10px;">
        <div style="flex:1; min-width:0;">
          <strong style="font-size:14px;">${escWb(e.name)}</strong>
          <div style="font-size:12px; color:var(--grau); margin-top:2px;">${escWb(e.adresse || '')}</div>
        </div>
        ${canWrite() ? `
        <div style="display:flex; gap:6px; flex-shrink:0;">
          <button class="btn btn-primary" style="padding:6px 10px; font-size:12px;" onclick="uebernehmeEntdeckung('${e.id}', '${escWb(e.name)}', '${escWb(e.adresse || '')}', '${e.place_id}')">Zur Liste hinzufügen</button>
          <button class="btn" style="padding:6px 10px; font-size:12px;" onclick="ignoriereEntdeckung('${e.id}')">Ignorieren</button>
        </div>` : ''}
      </div>`;
  }

  function fundZeileHtml(t) {
    const datum = t.created_at ? new Date(t.created_at).toLocaleDateString('de-DE') : '';
    return `
      <div style="padding:10px 16px; border-bottom:1px solid var(--border); display:flex; gap:10px; align-items:flex-start; ${t.erledigt ? 'opacity:.55;' : ''}">
        <span style="font-size:11px; color:var(--grau); white-space:nowrap; padding-top:1px;">${datum}</span>
        <div style="flex:1; min-width:0;">
          <strong style="font-size:13px;">${escWb(t.titel)}</strong>
          ${t.beschreibung ? `<div style="font-size:12px; color:var(--grau); margin-top:2px;">${escWb(t.beschreibung)}</div>` : ''}
        </div>
        ${t.erledigt ? '<span style="font-size:10px; color:var(--grau);">✓ erledigt</span>' : ''}
      </div>`;
  }
}

// ── Entdeckung übernehmen / ignorieren ──
async function uebernehmeEntdeckung(id, name, adresse, placeId) {
  await sb.from('monitor_entdeckungen').update({ status: 'aufgenommen' }).eq('id', id);
  wettbewerbState.entdeckungen = wettbewerbState.entdeckungen.filter(e => e.id !== id);
  renderWbContent();
  oeffneWbForm();
  // Formular mit den entdeckten Daten vorbefüllen
  setTimeout(() => {
    document.getElementById('wf-kategorie').value = 'wettbewerber';
    document.getElementById('wf-name').value = name;
    document.getElementById('wf-ort').value = adresse;
    document.getElementById('wf-place').value = placeId;
    document.getElementById('wf-url').focus();
  }, 0);
  toast('Bitte noch die Website-URL ergänzen und speichern', 'ok');
}

async function ignoriereEntdeckung(id) {
  const { error } = await sb.from('monitor_entdeckungen').update({ status: 'ignoriert' }).eq('id', id);
  if (error) { toast('Fehler: ' + error.message, 'err'); return; }
  wettbewerbState.entdeckungen = wettbewerbState.entdeckungen.filter(e => e.id !== id);
  renderWbContent();
  toast('Entdeckung ignoriert', 'ok');
}

// ── Aktiv/Inaktiv umschalten ──
async function toggleWbAktiv(id, neu) {
  const q = wettbewerbState.quellen.find(x => x.id === id);
  if (!q) return;
  q.aktiv = neu; renderWbContent();
  const { error } = await sb.from('monitor_quellen').update({ aktiv: neu }).eq('id', id);
  if (error) { toast('Fehler: ' + error.message, 'err'); q.aktiv = !neu; renderWbContent(); }
  else toast(neu ? 'Quelle aktiviert' : 'Quelle deaktiviert', 'ok');
}

// ── Löschen ──
async function loescheWbQuelle(id) {
  if (!confirm('Diese Quelle wirklich löschen? Die Historie bereits gefundener Änderungen bleibt erhalten.')) return;
  const { error } = await sb.from('monitor_quellen').delete().eq('id', id);
  if (error) { toast('Fehler: ' + error.message, 'err'); return; }
  wettbewerbState.quellen = wettbewerbState.quellen.filter(q => q.id !== id);
  renderWbContent();
  toast('Quelle gelöscht', 'ok');
}

// ── Neue Quelle / Bearbeiten (Formular) ──
function oeffneWbForm(id) {
  const bestehend = id ? wettbewerbState.quellen.find(q => q.id === id) : null;
  const modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.id = 'wb-form-modal';
  modal.innerHTML = `
    <div class="modal" style="width:min(560px,96vw);">
      <div class="modal-header"><h3>${bestehend ? 'Quelle bearbeiten' : 'Neue Quelle'}</h3><button class="close-btn" onclick="document.getElementById('wb-form-modal').remove()">✕</button></div>
      <div class="modal-body">
        <div class="frow"><label>Kategorie *</label>
          <select id="wf-kategorie">
            <option value="wettbewerber" ${bestehend?.kategorie === 'wettbewerber' ? 'selected' : ''}>Wettbewerber</option>
            <option value="autor" ${bestehend?.kategorie === 'autor' ? 'selected' : ''}>Fachautor</option>
            <option value="recht" ${bestehend?.kategorie === 'recht' ? 'selected' : ''}>Rechtsquelle</option>
          </select>
        </div>
        <div class="frow"><label>Name *</label><input id="wf-name" placeholder="z. B. Fahrschule Mustermann" value="${escWb(bestehend?.name || '')}"></div>
        <div class="frow"><label>URL *</label><input id="wf-url" placeholder="https://…" value="${escWb(bestehend?.url || '')}"></div>
        <div class="frow"><label>Ort (optional)</label><input id="wf-ort" placeholder="z. B. Meppen" value="${escWb(bestehend?.ort || '')}"></div>
        <div class="frow"><label>RSS-Feed-URL (optional)</label><input id="wf-feed" placeholder="https://…/feed/" value="${escWb(bestehend?.feed_url || '')}"></div>
        <div class="frow"><label>Google Place-ID (optional, für Bewertungs-Tracking)</label><input id="wf-place" placeholder="z. B. ChIJ…" value="${escWb(bestehend?.google_place_id || '')}"></div>
        <div class="frow"><label>Priorität</label>
          <select id="wf-prioritaet">
            <option value="niedrig" ${bestehend?.prioritaet === 'niedrig' ? 'selected' : ''}>Niedrig</option>
            <option value="normal" ${!bestehend || bestehend?.prioritaet === 'normal' ? 'selected' : ''}>Normal</option>
            <option value="hoch" ${bestehend?.prioritaet === 'hoch' ? 'selected' : ''}>Hoch (fällt im Dashboard auf)</option>
          </select>
        </div>
        <div class="frow"><label>Automatische Web-Recherche</label>
          <select id="wf-rhythmus">
            <option value="aus" ${!bestehend || bestehend?.recherche_rhythmus === 'aus' || !bestehend?.recherche_rhythmus ? 'selected' : ''}>Aus (nur auf Knopfdruck)</option>
            <option value="woechentlich" ${bestehend?.recherche_rhythmus === 'woechentlich' ? 'selected' : ''}>Wöchentlich (ca. 0,80 € im Monat)</option>
            <option value="monatlich" ${bestehend?.recherche_rhythmus === 'monatlich' ? 'selected' : ''}>Monatlich (ca. 0,20 € im Monat)</option>
          </select>
        </div>
        <div class="frow"><label>Notiz (optional)</label><textarea id="wf-notiz" rows="2" placeholder="Optional">${escWb(bestehend?.notiz || '')}</textarea></div>
      </div>
      <div class="modal-footer" style="display:flex; justify-content:flex-end; gap:8px; padding:12px 16px;">
        <button class="btn" onclick="document.getElementById('wb-form-modal').remove()">Abbrechen</button>
        <button class="btn btn-primary" onclick="speichereWbQuelle(${bestehend ? `'${bestehend.id}'` : 'null'})">Speichern</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

async function speichereWbQuelle(id) {
  const kategorie = document.getElementById('wf-kategorie').value;
  const name = document.getElementById('wf-name').value.trim();
  const url = document.getElementById('wf-url').value.trim();
  const ort = document.getElementById('wf-ort').value.trim();
  const feed_url = document.getElementById('wf-feed').value.trim();
  const google_place_id = document.getElementById('wf-place').value.trim();
  const prioritaet = document.getElementById('wf-prioritaet').value;
  const recherche_rhythmus = document.getElementById('wf-rhythmus')?.value || 'aus';
  const notiz = document.getElementById('wf-notiz').value.trim();

  if (!name || !url) { toast('Bitte Name und URL angeben', 'err'); return; }
  if (!/^https?:\/\//i.test(url)) { toast('URL muss mit http:// oder https:// beginnen', 'err'); return; }

  const payload = { kategorie, name, url, ort: ort || null, feed_url: feed_url || null, google_place_id: google_place_id || null, prioritaet, recherche_rhythmus, notiz: notiz || null };

  if (id) {
    const { error } = await sb.from('monitor_quellen').update(payload).eq('id', id);
    if (error) { toast('Fehler: ' + error.message, 'err'); return; }
    toast('Quelle aktualisiert', 'ok');
  } else {
    payload.erstellt_von = currentUser?.id || null;
    const { error } = await sb.from('monitor_quellen').insert(payload);
    if (error) { toast('Fehler: ' + error.message, 'err'); return; }
    toast('Quelle hinzugefügt — wird ab dem nächsten täglichen Check überwacht', 'ok');
  }
  document.getElementById('wb-form-modal')?.remove();
  wettbewerbState.loaded = false;
  renderWettbewerb();
}

// ── Benachrichtigungs-Empfänger verwalten ──
function renderWbEmpfaenger(el) {
  const empf = wettbewerbState.empfaenger;
  const nutzer = wettbewerbState.nutzer;
  const bereitsIds = new Set(empf.map(e => e.user_id).filter(Boolean));
  const verfuegbar = nutzer.filter(n => !bereitsIds.has(n.id));

  const empfRows = empf.map(e => {
    const n = nutzer.find(u => u.id === e.user_id);
    const name = escWb(n ? n.name : '–');
    const initials = name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
    return `
      <div class="card" style="display:flex;gap:14px;align-items:flex-start;padding:14px 16px;margin-bottom:10px;">
        <div style="flex-shrink:0;width:36px;height:36px;border-radius:50%;background:var(--blau);color:#fff;
          display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;">
          ${initials}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:600;font-size:14px;color:var(--dunkel);margin-bottom:8px">${name}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <div>
              <div style="font-size:11px;font-weight:600;color:var(--grau);text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px">E-Mail</div>
              <input value="${escWb(e.email||'')}" placeholder="optional"
                class="fst-input"
                onchange="updateWbEmpf('${e.id}','email',this.value)">
            </div>
            <div>
              <div style="font-size:11px;font-weight:600;color:var(--grau);text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px">WhatsApp</div>
              <input value="${escWb(e.whatsapp||'')}" placeholder="+49..."
                class="fst-input"
                onchange="updateWbEmpf('${e.id}','whatsapp',this.value)">
            </div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:8px;flex-shrink:0;padding-top:2px">
          <label style="font-size:10px;font-weight:600;color:var(--grau);text-transform:uppercase;letter-spacing:.04em">Aktiv</label>
          <input type="checkbox" ${e.aktiv ? 'checked' : ''}
            onchange="updateWbEmpf('${e.id}','aktiv',this.checked)"
            style="width:16px;height:16px;cursor:pointer;accent-color:var(--blau)">
          <button onclick="loescheWbEmpf('${e.id}')" title="Entfernen"
            style="background:none;border:none;cursor:pointer;color:var(--grau);font-size:16px;padding:2px;line-height:1;margin-top:4px">🗑</button>
        </div>
      </div>`;
  }).join('');

  el.innerHTML = `
    <style>
      .fst-input{width:100%;border:1px solid var(--border);border-radius:6px;padding:6px 10px;font-size:13px;font-family:inherit;color:var(--dunkel);background:#fff;transition:border-color .15s}
      .fst-input:focus{outline:none;border-color:var(--blau)}
    </style>
    <div class="toolbar" style="padding:18px 0 14px">
      <h2>Benachrichtigungen</h2>
    </div>

    <div class="card" style="margin-bottom:14px;padding:14px 16px;display:flex;gap:12px;align-items:flex-start;border-left:3px solid var(--blau)">
      <span style="font-size:20px;flex-shrink:0;margin-top:1px">🔔</span>
      <div>
        <div style="font-weight:700;font-size:13px;color:var(--dunkel);margin-bottom:2px">Monitor-Benachrichtigungen</div>
        <div style="font-size:12px;color:var(--grau);line-height:1.5">
          Diese Personen erhalten ein To-Do wenn der tägliche Check Änderungen erkennt. E-Mail und WhatsApp sind optional.
        </div>
      </div>
    </div>

    ${empf.length ? empfRows : `
      <div class="card" style="text-align:center;padding:32px 16px;color:var(--grau)">
        <div style="font-size:32px;margin-bottom:8px;opacity:.4">👤</div>
        <div style="font-size:13px">Noch keine Empfänger konfiguriert.</div>
      </div>`}

    ${verfuegbar.length ? `
    <div class="card" style="margin-top:14px;padding:16px">
      <div style="font-size:11px;font-weight:700;color:var(--grau);text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px">Empfänger hinzufügen</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:10px;align-items:flex-end">
        <div>
          <div style="font-size:11px;font-weight:600;color:var(--grau);margin-bottom:4px">Nutzer *</div>
          <select id="wb-empf-nutzer" class="fst-input" style="padding:6px 10px">
            <option value="">— wählen —</option>
            ${verfuegbar.map(n => `<option value="${n.id}">${escWb(n.name)}</option>`).join('')}
          </select>
        </div>
        <div>
          <div style="font-size:11px;font-weight:600;color:var(--grau);margin-bottom:4px">E-Mail (optional)</div>
          <input id="wb-empf-email" class="fst-input" placeholder="max@fahrschulteam.info">
        </div>
        <div>
          <div style="font-size:11px;font-weight:600;color:var(--grau);margin-bottom:4px">WhatsApp (optional)</div>
          <input id="wb-empf-wa" class="fst-input" placeholder="+49591...">
        </div>
        <button class="btn btn-primary" onclick="addWbEmpf()">+ Hinzufügen</button>
      </div>
    </div>` : nutzer.length ? `
    <div class="card" style="margin-top:14px;text-align:center;padding:14px;font-size:13px;color:var(--grau)">
      ✓ Alle Nutzer sind bereits als Empfänger eingetragen.
    </div>` : ''}`;
}
async function addWbEmpf() {
  const user_id = document.getElementById('wb-empf-nutzer')?.value;
  if (!user_id) { toast('Bitte einen Nutzer wählen', 'err'); return; }
  const email = document.getElementById('wb-empf-email')?.value.trim() || null;
  const whatsapp = document.getElementById('wb-empf-wa')?.value.trim() || null;
  const { error } = await sb.from('monitor_empfaenger').insert({ user_id, email, whatsapp, aktiv: true });
  if (error) { toast('Fehler: ' + error.message, 'err'); return; }
  toast('Empfänger hinzugefügt', 'ok');
  wettbewerbState.loaded = false;
  await ladeWettbewerbDaten();
  renderWbContent();
}

async function updateWbEmpf(id, feld, wert) {
  const { error } = await sb.from('monitor_empfaenger').update({ [feld]: wert }).eq('id', id);
  if (error) { toast('Fehler: ' + error.message, 'err'); return; }
  const e = wettbewerbState.empfaenger.find(x => x.id === id);
  if (e) e[feld] = wert;
  toast('Gespeichert', 'ok');
}

async function loescheWbEmpf(id) {
  if (!confirm('Empfänger entfernen?')) return;
  const { error } = await sb.from('monitor_empfaenger').delete().eq('id', id);
  if (error) { toast('Fehler: ' + error.message, 'err'); return; }
  wettbewerbState.empfaenger = wettbewerbState.empfaenger.filter(e => e.id !== id);
  renderWbContent();
  toast('Empfänger entfernt', 'ok');
}

// ════════════════════════════════════════════════════════════════════
//  RECHERCHE-BERICHT (Agenten-Modus)
//  Die KI durchsucht das Internet zu einem Wettbewerber und schreibt
//  einen Bericht mit Quellen – ähnlich einer Marktbeobachtung von Hand.
//  Serverseitig in der Edge Function "wettbewerb-recherche".
// ════════════════════════════════════════════════════════════════════

async function starteRecherche(quelleId) {
  const q = wettbewerbState.quellen.find(x => x.id === quelleId);
  if (!q) return;
  if (!confirm(`Für „${q.name}" jetzt im Internet recherchieren?\n\nDie KI führt mehrere Suchanfragen durch und schreibt einen Bericht. Das dauert etwa 30–90 Sekunden und kostet ungefähr 20 Cent.`)) return;

  const box = document.getElementById('wb-recherche-status') || (() => {
    const d = document.createElement('div');
    d.id = 'wb-recherche-status';
    d.style.cssText = 'position:fixed; right:20px; bottom:20px; z-index:9999; background:#111; color:#fff; padding:12px 16px; border-radius:10px; font-size:13px; box-shadow:0 10px 30px rgba(0,0,0,.35); max-width:320px;';
    document.body.appendChild(d);
    return d;
  })();
  box.textContent = `🕵 Recherche zu „${q.name}" läuft … (bis zu 90 Sekunden)`;

  try {
    const { data, error } = await sb.functions.invoke('wettbewerb-recherche', { body: { quelle_id: quelleId } });
    if (error) throw new Error(error.message || 'Aufruf fehlgeschlagen');
    if (!data?.ok) throw new Error(data?.fehler || 'Unbekannter Fehler');

    wettbewerbState.briefings[quelleId] = data.briefing;
    box.remove();
    toast('Recherchebericht erstellt.', 'ok');
    renderWbContent();
    zeigeBriefing(quelleId);
  } catch (e) {
    box.remove();
    toast('Recherche fehlgeschlagen: ' + (e.message || e), 'err');
  }
}

function zeigeBriefing(quelleId) {
  const b = wettbewerbState.briefings[quelleId];
  const q = wettbewerbState.quellen.find(x => x.id === quelleId);
  if (!b) return;

  const quellenListe = Array.isArray(b.quellen) ? b.quellen : [];
  const absaetze = String(b.bericht || '').split(/\n{2,}/).filter(Boolean)
    .map(p => `<p style="margin:0 0 12px; line-height:1.65;">${escWb(p)}</p>`).join('');

  const alt = document.getElementById('wb-briefing-overlay');
  if (alt) alt.remove();

  const overlay = document.createElement('div');
  overlay.id = 'wb-briefing-overlay';
  overlay.style.cssText = 'position:fixed; inset:0; z-index:9998; background:rgba(0,0,0,.55); display:flex; align-items:center; justify-content:center; padding:24px;';
  overlay.onclick = (ev) => { if (ev.target === overlay) overlay.remove(); };
  overlay.innerHTML = `
    <div style="background:#fff; border-radius:14px; max-width:760px; width:100%; max-height:86vh; overflow:auto; padding:24px 26px; box-shadow:0 30px 80px rgba(0,0,0,.4);">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px;">
        <div>
          <div style="font-size:11px; font-weight:800; letter-spacing:.1em; color:#C0001A;">MARKTBEOBACHTUNG</div>
          <h2 style="margin:4px 0 2px; font-size:20px;">${escWb(b.titel || 'Recherchebericht')}</h2>
          <div style="font-size:12px; color:var(--grau);">${escWb(q?.name || '')} · Recherche vom ${new Date(b.erstellt_am).toLocaleString('de-DE')}</div>
        </div>
        <button onclick="document.getElementById('wb-briefing-overlay').remove()" style="background:none; border:none; font-size:22px; cursor:pointer; color:#888; line-height:1;">×</button>
      </div>
      <div style="margin-top:18px; font-size:14px; color:#222;">${absaetze || '<p>Kein Text im Bericht.</p>'}</div>
      ${quellenListe.length ? `
        <div style="margin-top:18px; padding-top:14px; border-top:1px solid var(--border);">
          <div style="font-size:12px; font-weight:700; margin-bottom:6px;">Quellen</div>
          ${quellenListe.map(u => `<div style="font-size:12px; margin-bottom:3px;"><a href="${escWb(u)}" target="_blank" rel="noopener">${escWb(u)}</a></div>`).join('')}
        </div>` : ''}
      <div style="margin-top:18px; display:flex; gap:8px; justify-content:flex-end;">
        <button class="btn" onclick="document.getElementById('wb-briefing-overlay').remove()">Schließen</button>
        ${canWrite() ? `<button class="btn btn-primary" onclick="document.getElementById('wb-briefing-overlay').remove(); starteRecherche('${quelleId}')">Erneut recherchieren</button>` : ''}
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

// ── Sammellauf: alle Wettbewerber nacheinander recherchieren ────────────────
// Bewusst nacheinander (nicht parallel): schont das Kostenbudget, zeigt den
// Fortschritt ehrlich an und lässt sich jederzeit abbrechen.
let _sammelAbbruch = false;

async function starteSammelRecherche() {
  const ziele = wettbewerbState.quellen.filter(q => q.kategorie === 'wettbewerber' && q.aktiv);
  if (!ziele.length) { toast('Keine aktiven Wettbewerber vorhanden.', 'err'); return; }

  const kosten = (ziele.length * 0.2).toFixed(2).replace('.', ',');
  if (!confirm(`Web-Recherche für ${ziele.length} Wettbewerber starten?\n\nGeschätzte Kosten: rund ${kosten} €.\nDauer: etwa ${Math.ceil(ziele.length * 0.9)} Minuten.\n\nDas Fenster muss dabei geöffnet bleiben. Du kannst jederzeit abbrechen.`)) return;

  _sammelAbbruch = false;
  const box = document.createElement('div');
  box.id = 'wb-sammel-status';
  box.style.cssText = 'position:fixed; right:20px; bottom:20px; z-index:9999; background:#111; color:#fff; padding:14px 18px; border-radius:10px; font-size:13px; box-shadow:0 10px 30px rgba(0,0,0,.35); max-width:340px;';
  document.body.appendChild(box);

  let fertig = 0, fehler = 0;
  for (const q of ziele) {
    if (_sammelAbbruch) break;
    box.innerHTML = `🕵 Recherche ${fertig + 1} von ${ziele.length}<br><span style="color:#bbb">${escWb(q.name)}</span>
      <br><button onclick="_sammelAbbruch=true" style="margin-top:8px; font-size:11px; padding:4px 8px; border-radius:6px; border:none; cursor:pointer;">Abbrechen</button>`;
    try {
      const { data, error } = await sb.functions.invoke('wettbewerb-recherche', { body: { quelle_id: q.id } });
      if (error || !data?.ok) throw new Error(error?.message || data?.fehler || 'Fehler');
      wettbewerbState.briefings[q.id] = data.briefing;
    } catch (e) {
      fehler += 1;
      console.warn('Recherche fehlgeschlagen für', q.name, e);
    }
    fertig += 1;
  }

  box.remove();
  toast(`Sammellauf beendet: ${fertig - fehler} Berichte erstellt${fehler ? `, ${fehler} fehlgeschlagen` : ''}.`, fehler ? 'err' : 'ok');
  renderWbContent();
}
