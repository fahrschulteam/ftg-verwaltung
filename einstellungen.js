// ════════════════════════════════════════════════════════════════════
//  MODUL EINSTELLUNGEN (zentral)
//  Abschnitte: Benutzer & Rechte · Firmendaten · Modul-Einstellungen
//  Nur für Admin sichtbar (Tab wird sonst ausgeblendet).
// ════════════════════════════════════════════════════════════════════

const einstState = {
  tab: 'benutzer',     // benutzer | firma | module
  benutzer: [],
  einladungen: [],
  firma: null,
  loaded: false,
};

// ── Strich-Icons ─────────────────────────────────
function EIC(n, groesse){
  const g = groesse || 13;
  const P = {
    diagramm:'<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>'
      +'<line x1="6" y1="20" x2="6" y2="14"/>',
    liste:'<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>'
      +'<rect x="8" y="2" width="8" height="4" rx="1"/>'
      +'<line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="15" y2="16"/>',
    hut:'<path d="M22 10L12 5 2 10l10 5 10-5z"/>'
      +'<path d="M6 12v5c0 1 2.7 2.5 6 2.5s6-1.5 6-2.5v-5"/>',
    ordner:'<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
    personen:'<path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>'
      +'<circle cx="9.5" cy="7" r="4"/>'
      +'<path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    person:'<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>'
      +'<circle cx="12" cy="7" r="4"/>',
    uhr:'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    auto:'<path d="M5 17h14M5 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm18 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/>'
      +'<path d="M3 17v-5l2-5h11l3 5v5"/><line x1="7" y1="12" x2="19" y2="12"/>',
    haken:'<polyline points="20 6 9 17 4 12"/>',
    hakenkreis:'<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>'
      +'<polyline points="22 4 12 14.01 9 11.01"/>',
    lupe:'<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.7" y2="16.7"/>',
    firma:'<rect x="3" y="3" width="18" height="18" rx="2"/>'
      +'<line x1="9" y1="3" x2="9" y2="21"/>'
      +'<line x1="13" y1="8" x2="17" y2="8"/><line x1="13" y1="12" x2="17" y2="12"/>',
    diskette:'<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>'
      +'<polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
    stift:'<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    doc:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>'
      +'<polyline points="14 2 14 8 20 8"/>'
      +'<line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/>',
    paket:'<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8'
      +'a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>'
      +'<polyline points="3.3 7 12 12 20.7 7"/><line x1="12" y1="22" x2="12" y2="12"/>',
    zahnrad:'<circle cx="12" cy="12" r="3"/>'
      +'<path d="M20 12a8 8 0 0 0-.2-1.8l2-1.5-2-3.4-2.3 1a8 8 0 0 0-3-1.8L14 2h-4l-.5 2.5'
      +'a8 8 0 0 0-3 1.8l-2.3-1-2 3.4 2 1.5a8 8 0 0 0 0 3.6l-2 1.5 2 3.4 2.3-1'
      +'a8 8 0 0 0 3 1.8L10 22h4l.5-2.5a8 8 0 0 0 3-1.8l2.3 1 2-3.4-2-1.5c.13-.58.2-1.18.2-1.8z"/>',
    mail:'<rect x="2" y="4" width="20" height="16" rx="2"/>'
      +'<polyline points="2 7 12 13 22 7"/>',
    schloss:'<rect x="3" y="11" width="18" height="11" rx="2"/>'
      +'<path d="M7 11V7a5 5 0 0 1 10 0v4"/>'
  };
  return '<svg viewBox="0 0 24 24" width="'+g+'" height="'+g+'" fill="none" '
    +'stroke="currentColor" stroke-width="2" stroke-linecap="round" '
    +'stroke-linejoin="round" style="vertical-align:-2px;flex:none">'
    +(P[n]||'')+'</svg>';
}

// Alle Module mit Label (Single Source of Truth für Rechte-Auswahl)
const MODULE_LISTE = [
  ['dashboard',  EIC('diagramm')+' Dashboard'],
  ['kva',        EIC('liste')+' KVA'],
  ['schulung',   EIC('hut')+' Schulungen'],
  ['teilnehmer', EIC('liste')+' QM'],
  ['dokumente',  EIC('ordner')+' Vorlagen'],
  ['personal',   EIC('personen')+' Personal'],
  ['azk',        EIC('uhr')+' Arbeitszeit & Urlaub'],
  ['fuhrpark',   EIC('auto')+' Fuhrpark'],
  ['todos',      EIC('haken')+' To-Dos'],
  ['wettbewerb', EIC('lupe')+' Wettbewerb & Recht'],
  ['bkrfqg',     EIC('hut')+' BKrFQG Anerkennungen'],
];

const ROLLEN = [
  ['admin',       'Administrator'],
  ['verwaltung',  'Verwaltung'],
  ['mitarbeiter', 'Mitarbeiter'],
  ['readonly',    'Nur Lesen'],
];

async function ladeEinstellungen() {
  try {
    const [u, e, f] = await Promise.all([
      sb.from('app_users').select('*').order('name'),
      sb.from('einladungen').select('*').order('eingeladen_am'),
      sb.from('firma').select('*').eq('id', 1).single(),
    ]);
    einstState.benutzer    = u.data || [];
    einstState.einladungen = e.data || [];
    einstState.firma       = f.data || {};
  } catch (err) { console.warn('Einstellungen laden:', err); }
  einstState.loaded = true;
  window.einstState = einstState; if (typeof window.sendEinstellungenToSchulung === 'function') window.sendEinstellungenToSchulung();
}

window.renderEinstellungen = async function () {
  const view = document.getElementById('view-einstellungen');
  if (!einstState.loaded) {
    view.innerHTML = '<div class="loading"><div class="spinner"></div>Lade Einstellungen …</div>';
    await ladeEinstellungen();
  }

  const istAdmin = currentProfile && currentProfile.rolle === 'admin';
  if (!istAdmin) {
    view.innerHTML = `<div class="empty-state"><div style="font-size:40px">${EIC('schloss',40)}</div>
      <div>Die Einstellungen sind nur für Administratoren zugänglich.</div></div>`;
    return;
  }

  const tabBtn = (key, label) =>
    `<button class="sub-tab ${einstState.tab === key ? 'active' : ''}" data-tab="${key}" onclick="setEinstTab('${key}')">${label}</button>`;

  view.innerHTML = `
    <div class="toolbar"><h2>Einstellungen</h2></div>
    <div class="sub-tabs">
      ${tabBtn('benutzer', EIC('person')+' Benutzer & Rechte')}
      ${tabBtn('firma', EIC('firma')+' Firmendaten')}
      ${tabBtn('schulung', EIC('hut')+' Schulungen')}
      ${tabBtn('kva', EIC('liste')+' KVA')}
      ${tabBtn('qm', EIC('hakenkreis')+' QM')}
      ${tabBtn('backup', EIC('diskette')+' Backup')}
      ${tabBtn('verlauf', EIC('uhr')+' Verlauf')}
    </div>
    <div id="einst-inhalt"></div>
  `;
  renderEinstInhalt();
};

function setEinstTab(t) {
  einstState.tab = t;
  // aktive Markierung der Tabs aktualisieren
  document.querySelectorAll('#view-einstellungen .sub-tab').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-tab') === t);
  });
  renderEinstInhalt();
}

function renderEinstInhalt() {
  const host = document.getElementById('einst-inhalt');
  if (!host) return;
  if (einstState.tab === 'benutzer')      host.innerHTML = viewBenutzer();
  else if (einstState.tab === 'firma')    { host.innerHTML = viewFirma(); ladeUnterschriftVorschau(); }
  else if (einstState.tab === 'schulung')  { host.innerHTML = viewSchulung(); ladeSchulungSettingsVorschau(); }
  else if (einstState.tab === 'kva')      { host.innerHTML = viewKvaEinst(); initKvaEinst(); }
  else if (einstState.tab === 'qm')       { host.innerHTML = viewQmEinst(); initQmEinst(); }
  else if (einstState.tab === 'backup')   host.innerHTML = viewBackup();
  else if (einstState.tab === 'verlauf')  renderVerlauf(host);
}

// ── ABSCHNITT: BENUTZER ─────────────────────────────────────────────
function viewBenutzer() {
  const rolleLabel = r => (ROLLEN.find(x => x[0] === r) || [, r])[1];

  const nutzerRows = einstState.benutzer.map(u => {
    const module = Array.isArray(u.module) ? u.module : [];
    const modKurz = module.length === MODULE_LISTE.length ? 'Alle Module'
      : module.length === 0 ? '—'
      : module.length + ' von ' + MODULE_LISTE.length;
    const istSelbst = currentUser && u.id === currentUser.id;
    return `<tr>
      <td>
        <div class="bn-name">${esc(u.name || u.email || '—')}${istSelbst ? ' <span class="bn-self">Sie</span>' : ''}</div>
        <div class="bn-mail">${esc(u.email || '')}</div>
      </td>
      <td><span class="bn-rolle bn-rolle-${u.rolle}">${rolleLabel(u.rolle)}</span></td>
      <td class="bn-mod">${modKurz}</td>
      <td>${u.aktiv === false ? '<span class="bn-inaktiv">deaktiviert</span>' : '<span class="bn-aktiv">aktiv</span>'}</td>
      <td style="text-align:right">
        <button class="btn btn-sm btn-outline" onclick="sendeLoginLink('${esc(u.email)}')" title="Sendet einen frischen Anmelde-Link per E-Mail">Login-Link senden</button>
        <button class="btn btn-sm btn-outline" onclick="oeffneBenutzerModal('${u.id}')">Bearbeiten</button>
      </td>
    </tr>`;
  }).join('');

  const einlRows = einstState.einladungen.map(e => `
    <tr>
      <td><div class="bn-name">${esc(e.name || e.email)}</div><div class="bn-mail">${esc(e.email)}</div></td>
      <td><span class="bn-rolle bn-rolle-${e.rolle}">${rolleLabel(e.rolle)}</span></td>
      <td class="bn-mod" colspan="2"><span class="bn-pending">⏳ Einladung versendet – wartet auf erste Anmeldung</span></td>
      <td style="text-align:right">
        <button class="btn btn-sm btn-outline" onclick="einladungErneutSenden('${esc(e.email)}')">Erneut senden</button>
        <button class="btn btn-sm btn-outline" onclick="einladungZuruecknehmen('${esc(e.email)}')">Zurücknehmen</button>
      </td>
    </tr>`).join('');

  return `
    <div class="card" style="padding:0;overflow:hidden">
      <div class="bn-head">
        <div class="card-titel">Benutzer</div>
        <button class="btn btn-primary btn-sm" onclick="oeffneEinladenModal()">+ Benutzer einladen</button>
      </div>
      <table class="bn-table">
        <thead><tr><th>Name / E-Mail</th><th>Rolle</th><th>Module</th><th>Status</th><th></th></tr></thead>
        <tbody>${nutzerRows || '<tr><td colspan="5" style="padding:18px;color:var(--grau)">Noch keine Benutzer.</td></tr>'}</tbody>
      </table>
      ${einlRows ? `
        <div class="bn-subhead">Offene Einladungen</div>
        <table class="bn-table"><tbody>${einlRows}</tbody></table>` : ''}
    </div>
    <div class="einst-hinweis">
      💡 Eingeladene erhalten eine E-Mail mit Anmelde-Link. Beim ersten Klick wird ihr Zugang automatisch
      mit der hier festgelegten Rolle und den Modulen angelegt. Passwörter sehen Sie nie – das ist gewollt.
      Taucht jemand bereits in der Liste oben auf, hat sich aber noch nie erfolgreich angemeldet
      (z. B. weil ein alter Link nicht mehr funktioniert hat), genügt "Login-Link senden" – legt kein
      neues Konto an, schickt nur einen frischen Link.
    </div>`;
}

// ── Modal: Benutzer einladen ────────────────────────────────────────
function oeffneEinladenModal() {
  const modChecks = MODULE_LISTE.map(([k, l]) =>
    `<label class="mod-check"><input type="checkbox" class="einl-mod" value="${k}" checked> ${l}</label>`).join('');
  const rolleOpts = ROLLEN.map(([k, l]) => `<option value="${k}">${l}</option>`).join('');

  const modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.id = 'einl-modal';
  modal.innerHTML = `
    <div class="modal" style="width:680px;max-height:92vh">
      <div class="modal-header"><h3>Benutzer einladen</h3>
        <button class="close-btn" onclick="document.getElementById('einl-modal').remove()">✕</button></div>
      <div class="modal-body">
        <div class="frow"><label>Name</label><input id="einl-name" placeholder="Max Mustermann"></div>
        <div class="frow"><label>E-Mail *</label><input id="einl-email" type="email" placeholder="max@fahrschulteam.info"></div>
        <div class="frow"><label>Rolle</label><select id="einl-rolle">${rolleOpts}</select></div>
        <div class="frow">
          <label>Sichtbare Module</label>
          <div class="mod-grid">${modChecks}</div>
        </div>
        <div class="dok-hinweis">Die Person bekommt einen Anmelde-Link per E-Mail. Sie kann sich beim ersten Login optional ein Passwort setzen.</div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="document.getElementById('einl-modal').remove()">Abbrechen</button>
        <button class="btn btn-primary" id="einl-btn" onclick="benutzerEinladen()">Einladung senden</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  setTimeout(() => { const n = document.getElementById('einl-name'); if (n) n.focus(); }, 50);
}

async function benutzerEinladen() {
  const name  = document.getElementById('einl-name').value.trim();
  const email = document.getElementById('einl-email').value.trim().toLowerCase();
  const rolle = document.getElementById('einl-rolle').value;
  const module = [...document.querySelectorAll('.einl-mod:checked')].map(c => c.value);
  if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) { toast('Bitte gültige E-Mail eingeben.', 'err'); return; }

  const btn = document.getElementById('einl-btn');
  btn.disabled = true; btn.textContent = '…';

  // 1) Einladung in DB hinterlegen (Rolle + Module für den Trigger)
  const { error: e1 } = await sb.from('einladungen').upsert({ email, name: name || null, rolle, module });
  if (e1) { toast('Fehler: ' + e1.message, 'err'); btn.disabled = false; btn.textContent = 'Einladung senden'; return; }

  // 2) Magic-Link / OTP-Mail senden (legt beim ersten Klick den Auth-User an)
  const { error: e2 } = await sb.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: window.FST_CONFIG.APP_URL },
  });
  if (e2) {
    toast('Eingetragen, aber Mailversand fehlgeschlagen: ' + e2.message, 'err');
  } else {
    toast('Einladung an ' + email + ' gesendet', 'ok');
  }
  await logAenderung('einladung', 'Benutzer eingeladen', `${email} · Rolle: ${rolle} · ${module.length} Module`);
  const m = document.getElementById('einl-modal'); if (m) m.remove();
  await ladeEinstellungen(); renderEinstInhalt();
}

async function einladungErneutSenden(email) {
  const { error } = await sb.auth.signInWithOtp({
    email, options: { shouldCreateUser: true, emailRedirectTo: window.FST_CONFIG.APP_URL },
  });
  toast(error ? 'Fehler: ' + error.message : 'Einladung erneut gesendet', error ? 'err' : 'ok');
}

// Für bereits angelegte Nutzer (Konto existiert schon), die sich noch nie
// erfolgreich angemeldet haben oder ihren Link verloren haben.
async function sendeLoginLink(email) {
  const { error } = await sb.auth.signInWithOtp({
    email, options: { shouldCreateUser: false, emailRedirectTo: window.FST_CONFIG.APP_URL },
  });
  toast(error ? 'Fehler: ' + error.message : 'Login-Link an ' + email + ' gesendet', error ? 'err' : 'ok');
}

async function einladungZuruecknehmen(email) {
  if (!confirm('Einladung an ' + email + ' zurücknehmen?')) return;
  const { error } = await sb.from('einladungen').delete().eq('email', email);
  if (error) { toast('Fehler: ' + error.message, 'err'); return; }
  await logAenderung('einladung', 'Einladung zurückgenommen', email);
  await ladeEinstellungen(); renderEinstInhalt();
  toast('Einladung zurückgenommen', 'ok');
}

// ── Modal: Benutzer bearbeiten ──────────────────────────────────────
function oeffneBenutzerModal(id) {
  const u = einstState.benutzer.find(x => x.id === id);
  if (!u) return;
  const module = Array.isArray(u.module) ? u.module : [];
  const istSelbst = currentUser && u.id === currentUser.id;
  const rolleOpts = ROLLEN.map(([k, l]) => `<option value="${k}" ${u.rolle === k ? 'selected' : ''}>${l}</option>`).join('');
  const modChecks = MODULE_LISTE.map(([k, l]) =>
    `<label class="mod-check"><input type="checkbox" class="bu-mod" value="${k}" ${module.includes(k) ? 'checked' : ''}> ${l}</label>`).join('');

  const modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.id = 'bu-modal';
  modal.innerHTML = `
    <div class="modal" style="width:680px;max-height:92vh">
      <div class="modal-header"><h3>Benutzer bearbeiten</h3>
        <button class="close-btn" onclick="document.getElementById('bu-modal').remove()">✕</button></div>
      <div class="modal-body">
        <input type="hidden" id="bu-id" value="${u.id}">
        <div class="frow"><label>Name</label><input id="bu-name" value="${esc(u.name || '')}"></div>
        <div class="frow"><label>E-Mail</label><input value="${esc(u.email || '')}" disabled style="opacity:.6"></div>
        <div class="frow"><label>Rolle</label><select id="bu-rolle" ${istSelbst ? 'disabled title="Eigene Rolle kann nicht geändert werden"' : ''}>${rolleOpts}</select>
          ${istSelbst ? '<div style="font-size:11px;color:var(--grau);margin-top:3px">Die eigene Rolle lässt sich nicht ändern (Schutz vor Aussperren).</div>' : ''}</div>
        <div class="frow"><label>Sichtbare Module</label><div class="mod-grid">${modChecks}</div></div>
        <div class="frow"><label>Status</label>
          <select id="bu-aktiv" ${istSelbst ? 'disabled' : ''}>
            <option value="true"  ${u.aktiv !== false ? 'selected' : ''}>Aktiv</option>
            <option value="false" ${u.aktiv === false ? 'selected' : ''}>Deaktiviert (kein Zugriff)</option>
          </select></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="document.getElementById('bu-modal').remove()">Abbrechen</button>
        <button class="btn btn-primary" onclick="benutzerSpeichern()">Speichern</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

async function benutzerSpeichern() {
  const id = document.getElementById('bu-id').value;
  const u = einstState.benutzer.find(x => x.id === id);
  const istSelbst = currentUser && id === currentUser.id;
  const module = [...document.querySelectorAll('.bu-mod:checked')].map(c => c.value);
  const data = {
    name: document.getElementById('bu-name').value.trim() || null,
    module,
  };
  // Rolle/Status nur ändern, wenn nicht der eigene Account
  if (!istSelbst) {
    data.rolle = document.getElementById('bu-rolle').value;
    data.aktiv = document.getElementById('bu-aktiv').value === 'true';
  }
  const { error } = await sb.from('app_users').update(data).eq('id', id);
  if (error) { toast('Fehler: ' + error.message, 'err'); return; }

  // Was hat sich geändert?
  const changes = [];
  if ((u.name || '') !== (data.name || '')) changes.push('Name');
  if (!istSelbst && u.rolle !== data.rolle) changes.push(`Rolle → ${data.rolle}`);
  if (!istSelbst && (u.aktiv !== false) !== (data.aktiv !== false)) changes.push(data.aktiv ? 'aktiviert' : 'deaktiviert');
  const altMod = Array.isArray(u.module) ? u.module.length : 0;
  if (altMod !== module.length) changes.push(`Module: ${module.length}`);
  await logAenderung('benutzer', 'Benutzer bearbeitet', `${u.name || u.email}${changes.length ? ' · ' + changes.join(', ') : ''}`);

  const m = document.getElementById('bu-modal'); if (m) m.remove();
  await ladeEinstellungen(); renderEinstInhalt();
  toast('Gespeichert', 'ok');
}

// ── ABSCHNITT: FIRMENDATEN ──────────────────────────────────────────
function viewFirma() {
  const f = einstState.firma || {};
  const feld = (id, label, val, ph = '') =>
    `<div class="frow"><label>${label}</label><input id="firma-${id}" value="${esc(val || '')}" placeholder="${ph}"></div>`;
  return `
    <div class="card">
      <div class="card-titel">Firmen- & Trägerdaten</div>
      <p style="font-size:12px;color:var(--grau);margin-bottom:14px">
        Diese Daten werden zentral gepflegt und von den Modulen (KVA, QM, Schulungen) für Dokumente und Zertifikate verwendet.</p>
      <div class="firma-grid">
        ${feld('name', 'Name / Bezeichnung', f.name, 'Fahrschulteam Lingen')}
        ${feld('inhaber', 'Inhaber', f.inhaber, 'Thorsten Gels')}
        ${feld('strasse', 'Straße / Hausnr.', f.strasse, 'Rheiner Str. 158')}
        ${feld('plz_ort', 'PLZ / Ort', f.plz_ort, '49809 Lingen')}
        ${feld('tel', 'Telefon', f.tel, '0591/51403')}
        ${feld('fax', 'Fax', f.fax)}
        ${feld('email', 'E-Mail', f.email, 'lingen@fahrschulteam.info')}
        ${feld('web', 'Website', f.web, 'www.fahrschulteam.info')}
        ${feld('azav_nr', 'AZAV-Träger-Nr.', f.azav_nr, '0333-10660-AZAV-T')}
        ${feld('azav_gueltig', 'AZAV gültig bis', f.azav_gueltig)}
        ${feld('zert_praefix', 'Zertifikatsnummer-Präfix', f.zert_praefix)}
      </div>
      <div style="margin-top:16px;text-align:right">
        <button class="btn btn-primary" onclick="firmaSpeichern()">${EIC('diskette')} Firmendaten speichern</button>
      </div>
    </div>
    <div class="card" style="margin-top:16px">
      <div class="card-titel">Unterschrift Inhaber / Leiter</div>
      <p style="font-size:12px;color:var(--grau);margin-bottom:12px">
        Wird automatisch auf die Unterschriftszeile des FAS-Datenblatts gesetzt. Am Touchscreen mit dem Finger unterschreiben.</p>
      <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
        <div style="min-width:200px">
          <img id="firma-sig-img" style="display:none;max-width:240px;max-height:90px;border:1px solid var(--border);border-radius:8px;background:#fff;padding:6px">
          <div id="firma-sig-leer" style="font-size:13px;color:var(--grau)">Noch keine Unterschrift hinterlegt.</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <button class="btn btn-primary" onclick="oeffneUnterschriftPad()">${EIC('stift')} Unterschreiben / Ändern</button>
          <button class="btn btn-outline" onclick="unterschriftEntfernen()">Entfernen</button>
        </div>
      </div>
    </div>`;
}

async function firmaSpeichern() {
  const v = id => { const el = document.getElementById('firma-' + id); return el ? el.value.trim() : null; };
  const data = {
    id: 1,
    name: v('name'), inhaber: v('inhaber'), strasse: v('strasse'), plz_ort: v('plz_ort'),
    tel: v('tel'), fax: v('fax'), email: v('email'), web: v('web'),
    azav_nr: v('azav_nr'), azav_gueltig: v('azav_gueltig'), zert_praefix: v('zert_praefix'),
    updated_at: new Date().toISOString(),
  };
  // Schulungs-Settings ebenfalls aktuell halten
  if (einstState.firma) {
    data.tax            = einstState.firma.tax ?? 0;
    data.tax_manual     = einstState.firma.tax_manual ?? false;
    data.due_days       = einstState.firma.due_days ?? 14;
    data.tax_id         = einstState.firma.tax_id ?? null;
    data.bank           = einstState.firma.bank ?? null;
    data.inv_foot       = einstState.firma.inv_foot ?? null;
    data.basiszins      = einstState.firma.basiszins ?? 1.27;
    data.default_location = einstState.firma.default_location ?? null;
    data.default_capacity = einstState.firma.default_capacity ?? 18;
    data.warn_days      = einstState.firma.warn_days ?? 60;
    data.instr_interval = einstState.firma.instr_interval ?? 12;
    data.grundlagen     = einstState.firma.grundlagen ?? {};
    data.preise         = einstState.firma.preise ?? {};
  }
  const { error } = await sb.from('firma').upsert(data);
  if (error) { toast('Fehler: ' + error.message, 'err'); return; }
  einstState.firma = data;
  await logAenderung('firma', 'Firmendaten geändert', null);
  toast('Firmendaten gespeichert', 'ok');
}

// ── Unterschrift Inhaber/Leiter (Touch-Zeichenfeld) ─────────────────
async function ladeUnterschriftVorschau() {
  const img = document.getElementById('firma-sig-img');
  const leer = document.getElementById('firma-sig-leer');
  if (!img) return;
  try {
    const { data } = await sb.storage.from('fuhrpark').createSignedUrl('signaturen/inhaber.png', 120);
    if (data && data.signedUrl) {
      img.src = data.signedUrl + '&t=' + Date.now();
      img.style.display = 'block';
      if (leer) leer.style.display = 'none';
    }
  } catch(e) { /* keine Unterschrift vorhanden */ }
}

let _sigCtx = null, _sigDrawing = false, _sigInk = false;
function oeffneUnterschriftPad() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.id = 'sig-modal';
  modal.innerHTML = `
    <div class="modal" style="width:min(560px,96vw)">
      <div class="modal-header"><h3>${EIC('stift',15)} Unterschrift Inhaber / Leiter</h3>
        <button class="close-btn" onclick="document.getElementById('sig-modal').remove()">✕</button></div>
      <div class="modal-body">
        <p style="font-size:12px;color:var(--grau);margin-bottom:8px">Mit Finger (Touchscreen) oder Maus im weißen Feld unterschreiben.</p>
        <canvas id="sig-canvas" width="500" height="180" style="width:100%;height:180px;border:1px solid var(--border);border-radius:8px;background:#fff;touch-action:none;cursor:crosshair"></canvas>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" style="margin-right:auto" onclick="sigLeeren()">Leeren</button>
        <button class="btn btn-outline" onclick="document.getElementById('sig-modal').remove()">Abbrechen</button>
        <button class="btn btn-primary" onclick="sigSpeichern()">${EIC('diskette')} Speichern</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  const c = document.getElementById('sig-canvas');
  _sigCtx = c.getContext('2d');
  _sigCtx.lineWidth = 2.5; _sigCtx.lineCap = 'round'; _sigCtx.lineJoin = 'round'; _sigCtx.strokeStyle = '#111';
  _sigInk = false;
  const pos = ev => { const r = c.getBoundingClientRect(); return { x:(ev.clientX-r.left)*(c.width/r.width), y:(ev.clientY-r.top)*(c.height/r.height) }; };
  c.addEventListener('pointerdown', ev => { _sigDrawing = true; try{c.setPointerCapture(ev.pointerId);}catch(e){} const p = pos(ev); _sigCtx.beginPath(); _sigCtx.moveTo(p.x, p.y); ev.preventDefault(); });
  c.addEventListener('pointermove', ev => { if (!_sigDrawing) return; const p = pos(ev); _sigCtx.lineTo(p.x, p.y); _sigCtx.stroke(); _sigInk = true; ev.preventDefault(); });
  const ende = () => { _sigDrawing = false; };
  c.addEventListener('pointerup', ende);
  c.addEventListener('pointerleave', ende);
  c.addEventListener('pointercancel', ende);
}
function sigLeeren() {
  const c = document.getElementById('sig-canvas');
  if (c && _sigCtx) { _sigCtx.clearRect(0, 0, c.width, c.height); _sigInk = false; }
}
async function sigSpeichern() {
  const c = document.getElementById('sig-canvas');
  if (!c) return;
  if (!_sigInk) { toast('Bitte zuerst unterschreiben', 'err'); return; }
  try {
    const blob = await (await fetch(c.toDataURL('image/png'))).blob();
    const { error } = await sb.storage.from('fuhrpark').upload('signaturen/inhaber.png', blob, { upsert: true, contentType: 'image/png' });
    if (error) { toast('Fehler: ' + error.message, 'err'); return; }
    await logAenderung?.('firma', 'Unterschrift hinterlegt', null);
    toast('Unterschrift gespeichert', 'ok');
    const m = document.getElementById('sig-modal'); if (m) m.remove();
    renderEinstInhalt();
  } catch(e) { toast('Fehler: ' + e.message, 'err'); }
}
async function unterschriftEntfernen() {
  if (!confirm('Hinterlegte Unterschrift entfernen?')) return;
  try { await sb.storage.from('fuhrpark').remove(['signaturen/inhaber.png']); } catch(e) {}
  toast('Unterschrift entfernt', 'ok');
  renderEinstInhalt();
}

// ── ABSCHNITT: MODUL-EINSTELLUNGEN (Sprungknöpfe) ───────────────────
function viewKvaEinst() {
  return `
    <div class="card" style="margin-bottom:16px">
      <div class="card-titel">OneDrive-Speicherort für KVA-PDFs</div>
      <p style="font-size:12px;color:var(--grau);margin-bottom:14px">
        Einmal wählen – „Als PDF in OneDrive" legt Kostenvoranschläge dann automatisch dort ab.</p>
      <div id="kva-dir-status" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">${typeof kvaDirStatusHtml==='function'?kvaDirStatusHtml():''}</div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="card-titel">Preisliste je Führerscheinklasse</div>
      <p style="font-size:12px;color:var(--grau);margin-bottom:14px">
        Grundbetrag, Übungsstunden, Sonderfahrten, Prüfungsgebühren. Alle Felder editierbar.</p>
      <div id="pl-container" style="overflow-x:auto"></div>
      <button class="btn btn-outline" style="margin-top:10px;font-size:12px" onclick="resetPrices()">↻ Standardpreise wiederherstellen</button>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="card-titel">Ausbildungsumfang gem. FahrschAusbO</div>
      <p style="font-size:12px;color:var(--grau);margin-bottom:14px">
        Pflichtstunden je Klasse — vorausgefüllt, korrigierbar.
        <span style="color:var(--blau);font-weight:700">Blau = Ø Übungsstunden</span> (regionaler Richtwert).</p>
      <div id="ab-container" style="overflow-x:auto"></div>
      <button class="btn btn-outline" style="margin-top:10px;font-size:12px" onclick="resetAusbildung()">↻ Gesetzliche Werte</button>
    </div>

    <div style="display:flex;align-items:center;gap:12px">
      <button class="btn btn-primary" onclick="kvaEinstSpeichern()">${EIC('haken')} KVA-Einstellungen speichern</button>
      <span id="einst-kva-saved" style="font-size:12px;color:#16a34a;display:none;font-weight:700">Gespeichert!</span>
    </div>`;
}

function initKvaEinst() {
  // KVA-Renderfunktionen aus kva.js nutzen (global geladen)
  try {
    if (typeof loadSettings === 'function') loadSettings();
    if (typeof renderPriceTable === 'function') renderPriceTable();
    if (typeof renderAusbildungTable === 'function') renderAusbildungTable();
    // Supabase-Werte kommen asynchron – danach einmal neu rendern
    setTimeout(() => {
      try {
        if (typeof renderPriceTable === 'function') renderPriceTable();
        if (typeof renderAusbildungTable === 'function') renderAusbildungTable();
      } catch (e) {}
    }, 1200);
  } catch (e) { console.warn('KVA-Einstellungen laden:', e); }
  // Ordner-Handle wird asynchron geladen – Status danach aktualisieren
  if (typeof _kvaDirReady !== 'undefined') _kvaDirReady.then(() => { if (typeof kvaUpdateDirStatus === 'function') kvaUpdateDirStatus(); });
}

function kvaEinstSpeichern() {
  // Preise + Ausbildung über KVA-Funktion sichern (merge-sicher)
  try { if (typeof saveSettings === 'function') saveSettings(); } catch (e) {}
  const s = document.getElementById('einst-kva-saved');
  if (s) { s.style.display = 'inline'; setTimeout(() => s.style.display = 'none', 2000); }
  if (typeof toast === 'function') toast('KVA-Einstellungen gespeichert', 'ok');
}

function viewQmEinst() {
  return `
    <div class="card" style="padding:0;overflow:hidden">
      <div style="padding:14px 18px;border-bottom:1px solid var(--border)">
        <div class="card-titel" style="margin:0">QM – Maßnahmen, Unterschriften, Papierkorb</div>
        <p style="font-size:12px;color:var(--grau);margin:4px 0 0">
          Maßnahmen-Katalog, gespeicherte Unterschriften und gelöschte Teilnehmer der QM-Verwaltung.</p>
      </div>
      <iframe id="qmEinstFrame" title="QM-Einstellungen"
        style="width:100%;height:calc(100vh - 320px);min-height:480px;border:none;display:block;background:#fff"></iframe>
    </div>`;
}

function initQmEinst() {
  const f = document.getElementById('qmEinstFrame');
  if (!f) return;
  f.setAttribute('src', 'teilnehmer.html?v=20260703c');
  f.onload = () => {
    // Direkt zur Einstellungs-Seite springen und QM-Sidebar ausblenden
    const versuch = (n) => {
      try {
        const w = f.contentWindow;
        if (w && typeof w.showPage === 'function') {
          w.showPage('einstellungen');
          const st = w.document.createElement('style');
          st.textContent = '.sidebar{display:none!important}.main{padding-left:18px!important}';
          w.document.head.appendChild(st);
          return;
        }
      } catch (e) {}
      if (n < 10) setTimeout(() => versuch(n + 1), 400);
    };
    versuch(0);
  };
}

// ── ABSCHNITT: BACKUP ───────────────────────────────────────────────
function viewBackup() {
  return `
    <div class="card">
      <div class="card-titel">Eigenes Backup</div>
      <p style="font-size:13px;color:var(--grau);margin:8px 0 16px;line-height:1.6">
        Lädt eine vollständige Kopie aller Daten auf deinen Computer. Bewahre sie an einem sicheren
        Ort auf (z.&nbsp;B. OneDrive) – so hast du jederzeit einen unabhängigen Stand, zusätzlich
        zu den automatischen Backups von Supabase.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn-primary" id="backup-btn" onclick="backupErstellen(false)">${EIC('doc')} Nur Daten (schnell)</button>
        <button class="btn btn-outline" id="backup-btn-full" onclick="backupErstellen(true)">${EIC('paket')} Komplett mit Dateien (ZIP)</button>
      </div>
      <div id="backup-status" style="margin-top:14px;font-size:13px;color:var(--grau)"></div>
      <div class="einst-hinweis" style="margin-top:16px">
        💡 <b>Nur Daten:</b> alle Tabellen als eine JSON-Datei – schnell, klein, ideal fürs wöchentliche Backup.<br>
        📦 <b>Komplett mit Dateien:</b> zusätzlich alle hochgeladenen Dateien (Unterschriften, PDFs, Fahrzeugbilder)
        als ZIP. Dauert länger und ist größer, dafür wirklich alles enthalten.
      </div>
    </div>`;
}

async function backupErstellen(mitDateien) {
  const btn = document.getElementById(mitDateien ? 'backup-btn-full' : 'backup-btn');
  const status = document.getElementById('backup-status');
  const btnText = btn.textContent;
  btn.disabled = true; btn.textContent = 'Sammle Daten …';

  const tabellen = ['mitarbeiter','fortbildungen','fahrzeuge','kva_archiv','kva_settings',
                    'app_state','verwaltung_teilnehmer','dokumente','app_users','einladungen',
                    'firma','aenderungsprotokoll'];
  const backup = { erstellt: new Date().toISOString(), version: 1, daten: {} };
  let fehler = 0;

  for (const t of tabellen) {
    if (status) status.textContent = 'Lade ' + t + ' …';
    try {
      const { data, error } = await sb.from(t).select('*');
      if (error) { backup.daten[t] = { _fehler: error.message }; fehler++; }
      else backup.daten[t] = data;
    } catch (e) { backup.daten[t] = { _fehler: String(e) }; fehler++; }
  }

  const datum = new Date().toISOString().slice(0, 10);
  const anzahl = Object.values(backup.daten).reduce((s, v) => s + (Array.isArray(v) ? v.length : 0), 0);

  try {
    if (!mitDateien) {
      // ── Variante A: nur Daten als JSON ──
      ladeDateiHerunter(
        new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }),
        'fahrschulteam-backup-' + datum + '.json'
      );
      if (status) status.innerHTML = '✓ Backup erstellt – ' + anzahl + ' Datensätze' +
        (fehler ? ' (' + fehler + ' Tabelle(n) nicht lesbar)' : '') + '. Datei wurde heruntergeladen.';
    } else {
      // ── Variante B: alles als ZIP inkl. Storage-Dateien ──
      if (typeof JSZip === 'undefined') { if (status) status.innerHTML = '<span style="color:var(--rot)">ZIP-Bibliothek nicht geladen – bitte Seite neu laden.</span>'; btn.disabled = false; btn.textContent = btnText; return; }
      const zip = new JSZip();
      zip.file('daten.json', JSON.stringify(backup, null, 2));

      let dateiZahl = 0;
      const buckets = ['fuhrpark', 'verwaltung_files'];
      for (const bucket of buckets) {
        if (status) status.textContent = 'Lade Dateien aus ' + bucket + ' …';
        const dateien = await listeBucketRekursiv(bucket, '');
        for (const pfad of dateien) {
          try {
            const dl = await sb.storage.from(bucket).download(pfad);
            if (dl && dl.data) { zip.file('dateien/' + bucket + '/' + pfad, dl.data); dateiZahl++; }
          } catch (e) { /* einzelne Datei überspringen */ }
        }
      }

      if (status) status.textContent = 'Packe ZIP …';
      const blob = await zip.generateAsync({ type: 'blob' });
      ladeDateiHerunter(blob, 'fahrschulteam-backup-komplett-' + datum + '.zip');
      if (status) status.innerHTML = '✓ Komplett-Backup erstellt – ' + anzahl + ' Datensätze und ' + dateiZahl + ' Dateien. ZIP wurde heruntergeladen.';
    }
    await logAenderung('system', mitDateien ? 'Komplett-Backup (ZIP) erstellt' : 'Backup erstellt', anzahl + ' Datensätze');
  } catch (e) {
    if (status) status.innerHTML = '<span style="color:var(--rot)">Fehler beim Erstellen: ' + esc(String(e)) + '</span>';
  }
  btn.disabled = false; btn.textContent = btnText;
}

// Hilfsfunktion: Datei-Download auslösen
function ladeDateiHerunter(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// Hilfsfunktion: alle Dateipfade eines Buckets rekursiv auflisten
async function listeBucketRekursiv(bucket, prefix) {
  let pfade = [];
  try {
    const { data, error } = await sb.storage.from(bucket).list(prefix, { limit: 1000 });
    if (error || !data) return pfade;
    for (const eintrag of data) {
      const voll = prefix ? prefix + '/' + eintrag.name : eintrag.name;
      // Ordner haben keine id; Dateien schon
      if (eintrag.id === null || eintrag.id === undefined) {
        pfade = pfade.concat(await listeBucketRekursiv(bucket, voll));
      } else {
        pfade.push(voll);
      }
    }
  } catch (e) { /* Bucket evtl. nicht vorhanden */ }
  return pfade;
}

// ── ÄNDERUNGS-PROTOKOLL (Audit-Log) ─────────────────────────────────
// Schreibt einen Eintrag, wer wann was geändert hat.
// Global verfügbar, damit alle Module (Personal, Fuhrpark, KVA …) protokollieren können.
async function logAenderung(bereich, aktion, details) {
  try {
    await sb.from('aenderungsprotokoll').insert({
      benutzer_id:   currentUser ? currentUser.id : null,
      benutzer_name: (currentProfile && (currentProfile.name || currentProfile.email)) || 'Unbekannt',
      bereich,
      aktion,
      details: details || null,
    });
  } catch (e) { console.warn('Protokoll:', e); }
}
window.logAenderung = logAenderung;

async function renderVerlauf(host) {
  host.innerHTML = '<div class="loading"><div class="spinner"></div>Lade Verlauf …</div>';
  let eintraege = [];
  try {
    const { data } = await sb.from('aenderungsprotokoll')
      .select('*').order('zeitpunkt', { ascending: false }).limit(200);
    eintraege = data || [];
  } catch (e) { console.warn('Verlauf laden:', e); }

  const bereichLabel = {
    benutzer: EIC('person')+' Benutzer', einladung: EIC('mail')+' Einladung', firma: EIC('firma')+' Firmendaten',
    dokument: EIC('ordner')+' Vorlagen', system: EIC('zahnrad')+' System',
    personal: EIC('personen')+' Personal', fuhrpark: EIC('auto')+' Fuhrpark', kva: EIC('liste')+' KVA',
    schulung: EIC('hut')+' Schulungen', teilnehmer: EIC('liste')+' QM',
  };

  const rows = eintraege.map(e => {
    const d = new Date(e.zeitpunkt);
    const datum = d.toLocaleDateString('de-DE') + ' ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    return `<tr>
      <td class="vl-zeit">${datum}</td>
      <td>${esc(e.benutzer_name || '—')}</td>
      <td><span class="vl-bereich">${bereichLabel[e.bereich] || esc(e.bereich || '')}</span></td>
      <td>${esc(e.aktion || '')}</td>
      <td class="vl-detail">${esc(e.details || '')}</td>
    </tr>`;
  }).join('');

  host.innerHTML = `
    <div class="card" style="padding:0;overflow:hidden">
      <div class="bn-head">
        <div class="card-titel">Änderungsverlauf</div>
        <span style="font-size:12px;color:var(--grau)">${eintraege.length} Einträge (neueste zuerst)</span>
      </div>
      <table class="bn-table">
        <thead><tr><th>Zeitpunkt</th><th>Benutzer</th><th>Bereich</th><th>Aktion</th><th>Details</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="5" style="padding:18px;color:var(--grau)">Noch keine Einträge protokolliert.</td></tr>'}</tbody>
      </table>
    </div>
    <div class="einst-hinweis">🕓 Protokolliert werden Änderungen an Benutzern, Einladungen und Firmendaten. Es werden die letzten 200 Einträge angezeigt.</div>`;
}

// HTML-Escaper-Fallback
if (typeof esc !== 'function') {
  window.esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
}


// ══════════════════════════════════════════════════════════════
//  TAB: SCHULUNGEN
// ══════════════════════════════════════════════════════════════

const SCH_KURSTYPEN = [
  { key:'Gabelstapler',       label:'Gabelstapler',          prefix:'GS' },
  { key:'Ladekran',           label:'Ladekran',              prefix:'LK' },
  { key:'Baumaschinen',       label:'Baumaschinen',          prefix:'BM' },
  { key:'Fahrtenschreiber',   label:'Fahrtenschreiber',      prefix:'FT' },
  { key:'Ladungssicherung',   label:'Ladungssicherung',      prefix:'LS' },
  { key:'ADR Basiskurs',      label:'ADR Basiskurs',         prefix:'AB' },
  { key:'ADR Aufbaukurs Tank',label:'ADR Aufbaukurs Tank',   prefix:'AT' },
  { key:'ADR Fortbildung',    label:'ADR Fortbildung',       prefix:'AF' },
  { key:'BGQ LKW',            label:'BGQ LKW',               prefix:'BL' },
  { key:'BGQ KOM',            label:'BGQ KOM',               prefix:'BK' },
  { key:'Umsteiger LKW',      label:'Umsteiger LKW',         prefix:'UL' },
  { key:'Umsteiger KOM',      label:'Umsteiger KOM',         prefix:'UK' },
  // Fahreignungsseminar: verkehrspaedagogische Teilmassnahme, zwei Module
  { key:'FES Modul 1',        label:'FES Modul 1 (verkehrspäd.)',    prefix:'F1' },
  { key:'FES Modul 2',        label:'FES Modul 2 (verkehrspäd.)',    prefix:'F2' },
];
const SCH_UWTYPEN = [
  { key:'Gabelstapler', label:'Unterweisung Gabelstapler' },
  { key:'Ladekran',     label:'Unterweisung Ladekran' },
  { key:'ADR',          label:'ADR-Unterweisung' },
  { key:'Fahrtenschreiber', label:'Unterweisung Fahrtenschreiber' },
  { key:'Baumaschinen', label:'Unterweisung Baumaschinen' },
];

const SCH_GRUNDLAGEN_DEFAULT = {
  'FES Modul 1':        '§ 4a StVG (Fahreignungsseminar)\n§ 42 FeV\nAnlage 16 FeV',
  'FES Modul 2':        '§ 4a StVG (Fahreignungsseminar)\n§ 42 FeV\nAnlage 16 FeV',
  'Gabelstapler':       'DGUV Vorschrift 68\nDGUV Grundsatz 308-001',
  'Ladekran':           'DGUV Vorschrift 52\nDGUV Grundsatz 309-003',
  'Baumaschinen':       'DGUV Regel 100-500\nDGUV Grundsatz 308-002',
  'ADR Basiskurs':      'ADR (Europäisches Übereinkommen)\nGGVSEB',
  'ADR Aufbaukurs Tank':'ADR (Tankvorschriften)\nGGVSEB',
  'ADR Fortbildung':    'ADR\nGGVSEB',
  'Fahrtenschreiber':   '§ 33 Abs. 1 VO (EU) 165/2014',
  'Ladungssicherung':   'VDI 2700\nDGUV Information 214-006',
};

function escEinst(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// BQR-Meldung ans KBA: Die Sachbearbeiterkennung darf laut XML-Schema höchstens
// 10 Zeichen lang sein. Der früher fest verdrahtete Wert "Thorsten G." hatte 11
// Zeichen und führte dazu, dass das KBA-Portal die gesamte Upload-Datei als nicht
// schemavalide zurückwies – deshalb hier hart begrenzt (maxlength im Feld plus
// slice beim Speichern). Gegenstück in schulung.html: BQR_MAXLEN / _bqrSb.
const BQR_SB_MAXLEN = 10;
const BQR_SB_DEFAULT = 'TGels';

function viewSchulung() {
  const f = einstState.firma || {};
  const g = f.grundlagen || {};
  const p = f.preise || {};

  const feld = (id, label, val, type='text', hint='', ph='') =>
    `<div class="frow">
      <label>${label}</label>
      <input id="sch-${id}" type="${type}" value="${escEinst(val??'')}" placeholder="${escEinst(ph)}">
      ${hint ? `<div style="font-size:11px;color:var(--grau);margin-top:3px">${hint}</div>` : ''}
    </div>`;

  const grundlagenFelder = SCH_KURSTYPEN.map(t => `
    <div class="frow">
      <label>${escEinst(t.label)} <span style="font-size:10px;background:#eee;padding:1px 6px;border-radius:4px;font-weight:700">${t.prefix}</span></label>
      <textarea id="sch-gl-${escEinst(t.key)}" rows="2" placeholder="${escEinst(SCH_GRUNDLAGEN_DEFAULT[t.key]||'')}">${escEinst((g[t.key]||[]).join('\n'))}</textarea>
      <div style="font-size:11px;color:var(--grau);margin-top:2px">Eine Rechtsgrundlage pro Zeile. Leer = Standardtext.</div>
    </div>`).join('');

  const preisLehrgaenge = SCH_KURSTYPEN.map(t => `
    <div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border)">
      <span style="flex:1;font-size:13px">${escEinst(t.label)}</span>
      <div style="display:flex;align-items:center;gap:4px">
        <input id="sch-preis-${escEinst(t.key)}" type="number" min="0" step="0.01" value="${escEinst(p[t.key]??'')}" placeholder="0.00"
          style="width:100px;padding:5px 8px;border:1px solid var(--border);border-radius:6px;font-size:13px">
        <span style="font-size:12px;color:var(--grau)">€</span>
      </div>
    </div>`).join('');

  const preisUnterweisungen = SCH_UWTYPEN.map(t => `
    <div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border)">
      <span style="flex:1;font-size:13px">${escEinst(t.label)}</span>
      <div style="display:flex;align-items:center;gap:4px">
        <input id="sch-preis-uw-${escEinst(t.key)}" type="number" min="0" step="0.01" value="${escEinst(p['UW_'+t.key]??'')}" placeholder="0.00"
          style="width:100px;padding:5px 8px;border:1px solid var(--border);border-radius:6px;font-size:13px">
        <span style="font-size:12px;color:var(--grau)">€ / TN</span>
      </div>
    </div>`).join('');

  return `
    <div class="card" style="margin-bottom:16px">
      <div class="card-titel">Rechnungsangaben</div>
      <p style="font-size:12px;color:var(--grau);margin-bottom:14px">Werden auf automatisch generierten Schulungsrechnungen verwendet.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div>
          ${feld('tax','USt-Satz (%)', f.tax??0, 'number', '0 % = steuerbefreit gem. § 4 Nr. 21 UStG')}
          ${feld('due-days','Zahlungsziel (Tage)', f.due_days??14, 'number')}
          ${feld('tax-id','Steuernummer / USt-IdNr.', f.tax_id??'')}
          <div class="frow"><label>Zahlungshinweis / Fußtext</label>
            <textarea id="sch-inv-foot" rows="3" placeholder="z.B. Zahlbar ohne Abzug innerhalb des Zahlungsziels.">${escEinst(f.inv_foot??'')}</textarea>
          </div>
        </div>
        <div>
          <div class="frow"><label>Bankverbindung</label>
            <textarea id="sch-bank" rows="4" placeholder="IBAN: DE...&#10;BIC: ...&#10;Bank: Volksbank Lingen">${escEinst(f.bank??'')}</textarea>
          </div>
          ${feld('basiszins','Basiszinssatz (%)', f.basiszins??1.27, 'number', 'Für Verzugszinsberechnung')}
        </div>
      </div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="card-titel">Schulungsbetrieb</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div>
          ${feld('default-location','Standard-Schulungsort', f.default_location??'', 'text', 'Wird in allen neuen Schulungen vorausgefüllt', 'Fahrschulteam Thorsten Gels, Rheiner Str. 158, 49809 Lingen')}
          ${feld('default-capacity','Standard-Kapazität (TN)', f.default_capacity??18, 'number', 'Voreinstellung für neue Lehrgänge')}
        </div>
        <div>
          ${feld('warn-days','Vorwarnzeit (Tage)', f.warn_days??60, 'number', 'Fristwarnung im Dashboard')}
          ${feld('instr-interval','Unterweisungsintervall (Monate)', f.instr_interval??12, 'number', 'Standard: 12 = jährlich')}
        </div>
      </div>
      <div class="frow" style="margin-top:4px">
        <label>BQR-Sachbearbeiterkennung</label>
        <input id="sch-bqr-sb" type="text" maxlength="${BQR_SB_MAXLEN}" style="max-width:180px"
          value="${escEinst(f.bqr_sachbearbeiter ?? BQR_SB_DEFAULT)}" placeholder="${BQR_SB_DEFAULT}">
        <div style="font-size:11px;color:var(--grau);margin-top:3px">
          Erscheint als &lt;sachbearbeiterkennung&gt; in jeder KBA-Meldung (Berufskraftfahrer-
          qualifikationsregister). Das XML-Schema erlaubt <b>maximal ${BQR_SB_MAXLEN} Zeichen</b>;
          bei einem längeren Wert weist das KBA-Portal die komplette Upload-Datei ab.
          Standard: ${BQR_SB_DEFAULT}
        </div>
      </div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="card-titel">Rechtsgrundlagen je Lehrgangstyp</div>
      <p style="font-size:12px;color:var(--grau);margin-bottom:14px">Erscheinen auf der Bescheinigung. Eine Grundlage pro Zeile. Leer = Standardtext.</p>
      ${grundlagenFelder}
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="card-titel">Standardpreise Lehrgänge</div>
      <p style="font-size:12px;color:var(--grau);margin-bottom:14px">Werden bei neuen Rechnungen vorausgefüllt – im Rechnungsdialog weiterhin anpassbar.</p>
      ${preisLehrgaenge}
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="card-titel">Standardpreise Unterweisungen</div>
      <p style="font-size:12px;color:var(--grau);margin-bottom:10px">Preis je Teilnehmer pro Unterweisung.</p>
      ${preisUnterweisungen}
    </div>

    <div style="display:flex;justify-content:flex-end;margin-top:4px">
      <button class="btn btn-primary" onclick="schulungSpeichern()">${EIC('diskette')} Schulungseinstellungen speichern</button>
    </div>`;
}

function ladeSchulungSettingsVorschau() { /* nichts nötig, alles aus einstState */ }

async function schulungSpeichern() {
  const v = id => { const el = document.getElementById('sch-' + id); return el ? el.value.trim() : null; };
  const f = einstState.firma || {};

  // Grundlagen einlesen
  const grundlagen = {};
  SCH_KURSTYPEN.forEach(t => {
    const el = document.getElementById('sch-gl-' + t.key);
    if (!el) return;
    const zeilen = el.value.split('\n').map(z => z.trim()).filter(Boolean);
    if (zeilen.length) grundlagen[t.key] = zeilen;
  });

  // Preise einlesen
  const preise = {};
  SCH_KURSTYPEN.forEach(t => {
    const el = document.getElementById('sch-preis-' + t.key);
    if (el && el.value !== '') preise[t.key] = parseFloat(el.value) || 0;
  });
  SCH_UWTYPEN.forEach(t => {
    const el = document.getElementById('sch-preis-uw-' + t.key);
    if (el && el.value !== '') preise['UW_' + t.key] = parseFloat(el.value) || 0;
  });

  const data = {
    id: 1,
    // Firmadaten unverändert übernehmen
    name: f.name, inhaber: f.inhaber, strasse: f.strasse, plz_ort: f.plz_ort,
    tel: f.tel, fax: f.fax, email: f.email, web: f.web,
    azav_nr: f.azav_nr, azav_gueltig: f.azav_gueltig, zert_praefix: f.zert_praefix,
    // Schulungs-Settings
    tax:              parseFloat(v('tax')) || 0,
    tax_manual:       true,
    due_days:         parseInt(v('due-days')) || 14,
    tax_id:           v('tax-id') || null,
    inv_foot:         (document.getElementById('sch-inv-foot')||{}).value?.trim() || null,
    bank:             (document.getElementById('sch-bank')||{}).value?.trim() || null,
    basiszins:        parseFloat(v('basiszins')) || 1.27,
    default_location: v('default-location') || null,
    default_capacity: parseInt(v('default-capacity')) || 18,
    warn_days:        parseInt(v('warn-days')) || 60,
    instr_interval:   parseInt(v('instr-interval')) || 12,
    // slice als zweite Sicherung, falls das maxlength im Browser umgangen wird
    bqr_sachbearbeiter: (v('bqr-sb') || BQR_SB_DEFAULT).slice(0, BQR_SB_MAXLEN),
    grundlagen,
    preise,
    updated_at: new Date().toISOString(),
  };

  const { error } = await sb.from('firma').upsert(data);
  if (error) { toast('Fehler: ' + error.message, 'err'); return; }
  einstState.firma = { ...einstState.firma, ...data };
  await logAenderung('firma', 'Schulungseinstellungen geändert', null);
  // Schulungs-iframe sofort mit neuen Settings versorgen
  if (window.sendEinstellungenToSchulung) window.sendEinstellungenToSchulung();
  toast('Schulungseinstellungen gespeichert', 'ok');
}

window.ladeEinstellungen = ladeEinstellungen;
