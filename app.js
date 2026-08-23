// ════════════════════════════════════════════════════════════════════
//  FAHRSCHULTEAM LINGEN – Verwaltungssoftware
//  app.js – Kern: Auth, Navigation, Supabase-Anbindung
// ════════════════════════════════════════════════════════════════════

// ── Layout-Korrektur per JS einspeisen ──────────────────────────────
// Wird zuverlässig immer frisch geladen (JS = no-cache) und überschreibt
// damit eine evtl. veraltete, zwischengespeicherte Inline-CSS in index.html.
// Sorgt dafür, dass Formularfelder sich nach Breite anordnen statt zu quetschen.
(function injiziereLayoutFix(){
  var css = ''
    + '.modal .fgrid{display:grid !important;grid-template-columns:repeat(auto-fit,minmax(180px,1fr)) !important;gap:9px 14px !important;}'
    + '.frow{min-width:0 !important;margin-bottom:9px !important;}'
    + '.frow label{margin-bottom:3px !important;}'
    + '.frow input,.frow select,.frow textarea{width:100% !important;min-width:0 !important;box-sizing:border-box !important;padding:8px 11px !important;}'
    + '.fsec{margin:12px 0 6px !important;}'
    + '.qual-grid{grid-template-columns:repeat(auto-fit,minmax(210px,1fr)) !important;}'
    + '.qual-item{min-width:0 !important;}'
    + '.fb-eintrag{flex-wrap:wrap !important;}'
    + '.fb-pflicht-row{flex-wrap:wrap !important;}'
    // Dialoge cache-sicher breit halten (sonst bleibt das Raster einspaltig)
    + '.modal{max-width:96vw !important;}'
    + '.modal-body{overflow-x:hidden !important;}'
    // Berichte-Zeilen umbrechen statt seitlich überlaufen
    + '.ber-row{display:flex !important;flex-wrap:wrap !important;gap:8px !important;align-items:center;}'
    + '.ber-row select{flex:1 1 150px !important;min-width:0 !important;}'
    + '.ber-row .btn{white-space:normal !important;}';
  var s = document.createElement('style');
  s.id = 'fst-layout-fix';
  s.textContent = css;
  // ans Ende von <head> -> gewinnt gegen früher stehende Inline-Regeln
  (document.head || document.documentElement).appendChild(s);
})();

// ── Assets einsetzen ──
document.getElementById('login-logo-img').src = window.FST_LOGO;
document.getElementById('header-logo-img').src = window.FST_LOGO;

// ── Supabase-Client ──
let sb = null;
let currentUser = null;
let currentProfile = null;

function initSupabase() {
  const cfg = window.FST_CONFIG;
  if (!cfg || cfg.SUPABASE_URL.includes('DEIN-PROJEKT')) {
    showLoginError('Bitte zuerst die Supabase-Zugangsdaten in config.js eintragen.');
    return false;
  }
  sb = supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  return true;
}

// ── Toast ──
let toastTimer = null;
function toast(msg, type='') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

// ── Datei vor Upload an Netlify-Functions prüfen/komprimieren ──
// Netlify-Functions haben ein hartes Payload-Limit (~6 MB inkl. Base64-Aufblähung).
// Wird das überschritten, antwortet die Plattform selbst mit einem nicht-JSON-Fehlertext
// ("Internal Error..."), bevor der Funktionscode überhaupt läuft. Daher hier vorbeugen:
// Bilder automatisch verkleinern/komprimieren, bei zu großen Nicht-Bildern (z.B. PDF) klar
// und sofort Bescheid geben statt den kryptischen Plattform-Fehler weiterzureichen.
const DATEI_MAX_BYTES = 4 * 1024 * 1024; // 4 MB Rohdatei – Sicherheitsmarge unter dem 6-MB-Limit

async function pruefeUndKomprimiereDatei(file) {
  if (file.type && file.type.startsWith('image/')) {
    const komprimiert = await komprimiereBild(file);
    if (komprimiert.size <= DATEI_MAX_BYTES) return komprimiert;
    throw new Error('Das Foto ist auch nach Komprimierung zu groß. Bitte ein anderes Foto wählen.');
  }
  if (file.size > DATEI_MAX_BYTES) {
    const mb = (file.size/1024/1024).toFixed(1);
    throw new Error(`Datei ist zu groß (${mb} MB, erlaubt: ${DATEI_MAX_BYTES/1024/1024} MB). Bitte als Foto (JPEG) statt PDF hochladen oder die Datei vorher verkleinern.`);
  }
  return file;
}

function komprimiereBild(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const maxDim = 1600;
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const r = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * r); height = Math.round(height * r);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob(blob => {
        if (!blob) { reject(new Error('Bild konnte nicht verarbeitet werden.')); return; }
        resolve(new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.82);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Bild konnte nicht gelesen werden.')); };
    img.src = url;
  });
}

// ── Login-UI ──
function showLoginError(msg) {
  const el = document.getElementById('login-error');
  if (!el) return;
  if (msg && typeof msg === 'object') msg = msg.message || JSON.stringify(msg);
  el.textContent = (typeof msg === 'string') ? msg : '';
}

// Anmelde-Link per E-Mail (nur für BESTEHENDE Zugänge – legt keine neuen an)
async function loginPerLink() {
  const email = document.getElementById('login-email').value.trim();
  if (!email) { showLoginError('Bitte zuerst die E-Mail eintragen, dann den Link anfordern.'); return; }
  showLoginError('');
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: window.FST_CONFIG.APP_URL },
  });
  if (error) {
    showLoginError(translateAuthError(error.message));
  } else {
    showLoginError('');
    const tg = document.getElementById('login-toggle');
    if (tg) tg.innerHTML = '✓ Falls ein Zugang besteht, wurde ein Anmelde-Link an ' + email + ' gesendet.';
  }
}

async function doLogin() {
  showLoginError('');
  const email = document.getElementById('login-email').value.trim();
  const pw    = document.getElementById('login-password').value;
  if (!email || !pw) { showLoginError('Bitte E-Mail und Passwort eingeben.'); return; }

  const btn = document.getElementById('login-btn');
  btn.disabled = true;
  btn.textContent = '…';

  try {
    const result = await sb.auth.signInWithPassword({ email, password: pw });
    if (result.error) throw result.error;
    await onAuthenticated(result.data.user);
  } catch (e) {
    showLoginError(translateAuthError(e.message));
    btn.disabled = false;
    btn.textContent = 'Anmelden';
  }
}

function translateAuthError(msg) {
  const m = (msg||'').toLowerCase();
  if (m.includes('invalid login')) return 'E-Mail oder Passwort falsch.';
  if (m.includes('already registered')) return 'Diese E-Mail ist bereits registriert.';
  if (m.includes('password should be')) return 'Passwort muss mindestens 6 Zeichen haben.';
  if (m.includes('email not confirmed')) return 'Bitte zuerst die E-Mail bestätigen.';
  return msg;
}

async function doLogout() {
  await sb.auth.signOut();
  location.reload();
}

// ── Passwort-Hinweisbanner ──
function pruefePasswortBanner() {
  const banner = document.getElementById('pw-banner');
  if (!banner || !currentUser) return;
  const verborgen = localStorage.getItem('pwBannerVerborgen-' + currentUser.id);
  const hatPw = !!(typeof currentProfile !== 'undefined' && currentProfile && currentProfile.hat_passwort);
  banner.style.display = (verborgen || hatPw) ? 'none' : 'flex';
}
function verbergePasswortBanner() {
  if (currentUser) localStorage.setItem('pwBannerVerborgen-' + currentUser.id, '1');
  const banner = document.getElementById('pw-banner');
  if (banner) banner.style.display = 'none';
}

// ── Passwort selbst festlegen/ändern (für bestehende, eingeloggte Sitzung) ──
function oeffnePasswortModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.id = 'pw-modal';
  modal.innerHTML = `
    <div class="modal" style="width:min(420px,94vw)">
      <div class="modal-header"><h3>Passwort festlegen</h3><button class="close-btn" onclick="document.getElementById('pw-modal').remove()">✕</button></div>
      <div class="modal-body">
        <div class="frow"><label>Neues Passwort</label><input type="password" id="pw-neu" autocomplete="new-password" placeholder="mind. 6 Zeichen"></div>
        <div class="frow"><label>Wiederholen</label><input type="password" id="pw-wdh" autocomplete="new-password" placeholder="mind. 6 Zeichen"></div>
        <div id="pw-fehler" style="color:var(--rot);font-size:12px;min-height:16px;"></div>
        <div style="font-size:12px;color:var(--grau);">Danach kannst du dich auf der Anmeldeseite direkt mit E-Mail und Passwort einloggen, ohne jedes Mal einen Link per E-Mail anzufordern.</div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="document.getElementById('pw-modal').remove()">Abbrechen</button>
        <button class="btn btn-primary" id="pw-speichern-btn" onclick="speicherePasswort()">Speichern</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  setTimeout(() => document.getElementById('pw-neu')?.focus(), 50);
}

async function speicherePasswort() {
  const pw1 = document.getElementById('pw-neu').value;
  const pw2 = document.getElementById('pw-wdh').value;
  const fehlerEl = document.getElementById('pw-fehler');
  fehlerEl.textContent = '';
  if (pw1.length < 6) { fehlerEl.textContent = 'Passwort muss mindestens 6 Zeichen haben.'; return; }
  if (pw1 !== pw2) { fehlerEl.textContent = 'Die beiden Passwörter stimmen nicht überein.'; return; }

  const btn = document.getElementById('pw-speichern-btn');
  btn.disabled = true; btn.textContent = '…';
  const { error } = await sb.auth.updateUser({ password: pw1 });
  btn.disabled = false; btn.textContent = 'Speichern';
  if (error) { fehlerEl.textContent = translateAuthError(error.message); return; }
  document.getElementById('pw-modal')?.remove();
  verbergePasswortBanner();
  // Geräteübergreifend merken: Flag im Profil setzen
  try {
    await sb.from('app_users').update({ hat_passwort: true }).eq('id', currentUser.id);
    if (typeof currentProfile !== 'undefined' && currentProfile) currentProfile.hat_passwort = true;
  } catch (e) { console.warn('hat_passwort-Flag:', e); }
  toast('Passwort gespeichert – ab jetzt auch direkt mit E-Mail + Passwort möglich', 'ok');
}

// ── Nach erfolgreicher Anmeldung ──
async function onAuthenticated(user) {
  currentUser = user;
  // Profil laden (wird per Trigger automatisch angelegt)
  const { data: profile } = await sb.from('app_users').select('*').eq('id', user.id).single();
  currentProfile = profile || { name: user.email, rolle: 'mitarbeiter' };

  // Deaktivierte Nutzer aussperren
  if (currentProfile.aktiv === false) {
    await sb.auth.signOut();
    document.getElementById('login-screen').style.display = '';
    document.getElementById('app').style.display = 'none';
    showLoginError('Dieser Zugang wurde deaktiviert. Bitte an die Verwaltung wenden.');
    return;
  }

  // UI füllen
  const name = currentProfile.name || user.email.split('@')[0];
  document.getElementById('user-name').textContent = name;
  document.getElementById('user-rolle').textContent = rolleLabel(currentProfile.rolle);
  document.getElementById('user-avatar').textContent = name.slice(0,2).toUpperCase();

  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';

  // Modul-Sichtbarkeit nach Rechten setzen
  applyModulrechte();

  // Globale Suche im Header aktivieren
  if (typeof initGlobaleSuche === 'function') initGlobaleSuche();

  // Dashboard als Startseite laden
  if (typeof ladeTodoBadge === 'function') ladeTodoBadge();
  pruefePasswortBanner();
  showView('dashboard');

  // Mitarbeiter im Hintergrund vorladen, dann erst iframe setzen → Dozenten sofort verfügbar
  setTimeout(async () => {
    if (window.ladeMitarbeiter && (!window.personalState || !window.personalState.loaded)) {
      await window.ladeMitarbeiter();
    }
    const f = document.getElementById('schulungFrame');
    if (f && !f.getAttribute('src')) f.setAttribute('src', 'schulung.html?v=20260716');
    // Fahrzeugkalender wird lazy geladen (nur bei Tab-Klick) → kein Hintergrund-Polling
  }, 1500);
}

// Welche Module darf der aktuelle Nutzer sehen?
function sichtbareModule() {
  const alle = ['dashboard','kva','schulung','teilnehmer','dokumente','personal','schulungsstand','azk','fuhrpark','kalender','todos','wettbewerb','bkrfqg'];
  if (!currentProfile) return alle;
  // Admin sieht immer alles
  if (currentProfile.rolle === 'admin') return alle;
  const m = Array.isArray(currentProfile.module) ? currentProfile.module : null;
  return m && m.length ? alle.filter(x => m.includes(x)) : alle;
}

// Tabs ein-/ausblenden nach Rechten
function applyModulrechte() {
  const erlaubt = sichtbareModule();
  document.querySelectorAll('.hnav[data-view]').forEach(btn => {
    btn.style.display = erlaubt.includes(btn.getAttribute('data-view')) ? '' : 'none';
  });
  // Zahnrad-Button im Header: nur für Admin
  const btnEinst = document.getElementById('btn-einstellungen');
  if (btnEinst) btnEinst.style.display = (currentProfile && currentProfile.rolle === 'admin') ? '' : 'none';
}

function rolleLabel(r) {
  return ({admin:'Administrator', verwaltung:'Verwaltung',
           mitarbeiter:'Mitarbeiter', readonly:'Nur Lesen'})[r] || r;
}

function canWrite() {
  return currentProfile && ['admin','verwaltung'].includes(currentProfile.rolle);
}

// ── Mitarbeiterliste an Schulungs-iframe senden ──
function sendMitarbeiterToSchulung() {
  const f = document.getElementById('schulungFrame');
  if (!f || !f.contentWindow) return;
  // window.personalState ist das Objekt selbst — mitarbeiter wird nach Laden befüllt
  const ma = (window.personalState && window.personalState.mitarbeiter) || [];
  console.log('[FST] sendMitarbeiterToSchulung:', ma.length, 'MA');
  f.contentWindow.postMessage({ type: 'FST_MITARBEITER', mitarbeiter: ma }, '*');
}

// ── Schulungseinstellungen an Schulungs-iframe senden ──
window.sendEinstellungenToSchulung = function() {
  const f = document.getElementById('schulungFrame');
  if (!f || !f.contentWindow) return;
  const firma = (window.einstState && window.einstState.firma) || {};
  f.contentWindow.postMessage({ type: 'FST_EINSTELLUNGEN', firma }, '*');
};

// Einstellungen laden falls noch nicht geschehen, dann senden
async function ensureEinstellungenAndSend() {
  if (!window.einstState || !window.einstState.loaded) {
    if (window.ladeEinstellungen) await window.ladeEinstellungen();
  }
  window.sendEinstellungenToSchulung();
}

// Hook: nach iframe-Load und nach Personal-Ladevorgängen aufrufen
document.addEventListener('DOMContentLoaded', () => {
  const f = document.getElementById('schulungFrame');
  if (f) f.addEventListener('load', () => {
    // Fallback: nach 2s senden falls kein FST_READY kommt
    setTimeout(sendMitarbeiterToSchulung, 2000);
  });
});
// iframe sendet FST_READY wenn es initialisiert ist → sofort senden
window.addEventListener('message', e => {
  if (e.data && e.data.type === 'FST_READY') {
    sendMitarbeiterToSchulung();
    ensureEinstellungenAndSend();
  }
});
// Wird von personal.js nach jedem Laden aufgerufen
window.onMitarbeiterGeladen = function() { sendMitarbeiterToSchulung(); };

// ── Navigation ──
let currentView = 'personal';
function showView(view) {
  const vorherigeView = currentView;
  currentView = view;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.hnav').forEach(b => b.classList.remove('active'));
  document.getElementById('view-' + view).classList.add('active');
  document.querySelector(`.hnav[data-view="${view}"]`)?.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'instant' });

  // Header-Titel entfällt – aktives Modul ist bereits farblich in der Navigation markiert

  if (view === 'schulungsstand' && window.renderSchulungsstand) window.renderSchulungsstand();
  if (view === 'personal' && window.renderPersonal) window.renderPersonal();
  if (view === 'azk' && window.renderAZK) window.renderAZK();
  if (view === 'dashboard' && window.renderDashboard) window.renderDashboard();
  if (view === 'fuhrpark' && window.renderFuhrpark) window.renderFuhrpark();
  if (view === 'todos' && window.renderTodos) window.renderTodos();
  if (view === 'wettbewerb' && window.renderWettbewerb) window.renderWettbewerb();
  if (view === 'bkrfqg' && window.renderBkrfqg) window.renderBkrfqg();
  if (view === 'kva' && window.renderKVA) window.renderKVA();
  if (view === 'dokumente' && window.renderDokumente) window.renderDokumente();
  if (view === 'einstellungen' && window.renderEinstellungen) window.renderEinstellungen();
  // BKrFQG ist KEIN iframe-Modul: es rendert oben per renderBkrfqg() direkt in
  // #view-bkrfqg. Der frühere bkrfqgFrame-Zweig war Rest eines aufgegebenen
  // iframe-Ansatzes – die ID existiert nirgends, der Zugriff warf deshalb bei
  // jedem Öffnen des Moduls einen ReferenceError und brach showView() ab.
  if (view === 'schulung') {
    const f = document.getElementById('schulungFrame');
    if (f && !f.getAttribute('src')) {
      f.setAttribute('src', 'schulung.html?v=20260716');
      // src neu gesetzt → load-Event feuert, Handler sendet dann
    } else {
      // iframe bereits geladen → sofort senden (z.B. nach Tab-Wechsel zurück)
      setTimeout(() => { sendMitarbeiterToSchulung(); ensureEinstellungenAndSend(); }, 100);
    }
  }
  if (view === 'teilnehmer') {
    const f = document.getElementById('teilnehmerFrame');
    if (f && !f.getAttribute('src')) f.setAttribute('src', 'teilnehmer.html?v=20260708a');
  }
  if (view === 'kalender') {
    const f = document.getElementById('kalenderFrame');
    if (f && !f.getAttribute('src')) f.setAttribute('src', 'https://fahrzeugkalender.netlify.app/');
  }

  // Schulungs-/Teilnehmer-iframe entladen sobald der Tab verlassen wird:
  // Diese eingebettete App pollt im Hintergrund weiter (z.B. instructors/bookings/
  // vehicle_docs), auch wenn sie unsichtbar ist – das verstopft die Verbindung und
  // blockiert Anfragen anderer Module (z.B. Personal). Beim erneuten Öffnen lädt
  // sie einfach frisch neu (kurzer Ladeflacker, aber kein Hintergrund-Traffic mehr).
  if (vorherigeView === 'schulung' && view !== 'schulung') {
    const f = document.getElementById('schulungFrame');
    if (f) { f.removeAttribute('src'); f.setAttribute('src', 'about:blank'); f.removeAttribute('src'); }
  }
  if (vorherigeView === 'teilnehmer' && view !== 'teilnehmer') {
    const f = document.getElementById('teilnehmerFrame');
    if (f) { f.removeAttribute('src'); f.setAttribute('src', 'about:blank'); f.removeAttribute('src'); }
  }
  if (vorherigeView === 'kalender' && view !== 'kalender') {
    const f = document.getElementById('kalenderFrame');
    if (f) { f.removeAttribute('src'); f.setAttribute('src', 'about:blank'); f.removeAttribute('src'); }
  }

  document.body.classList.toggle('schulung-active', view === 'schulung' || view === 'teilnehmer' || view === 'kalender');
}

// ── Start ──
async function start() {
  if (!initSupabase()) return;

  // Auf Anmeldung reagieren (auch Magic-Link aus E-Mail-Einladung)
  let bereitsGeladen = false;
  sb.auth.onAuthStateChange((event, session) => {
    if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session && !bereitsGeladen) {
      bereitsGeladen = true;
      onAuthenticated(session.user);
    }
  });

  // Bestehende Session?
  const { data } = await sb.auth.getSession();
  if (data.session && !bereitsGeladen) {
    bereitsGeladen = true;
    await onAuthenticated(data.session.user);
  }
  // Enter-Taste im Login
  document.getElementById('login-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });
  document.getElementById('login-email').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('login-password').focus();
  });
}

start();

// ════════════════════════════════════════════════════════════════════
//  EXCEL-EXPORT (echtes .xlsx via SheetJS, lazy von CDN geladen)
//  Nutzung: exportiereXlsx('Dateiname', 'Blattname', [[Kopf...],[Zeile...]])
// ════════════════════════════════════════════════════════════════════
let _xlsxLadePromise = null;
function ladeXlsxLib() {
  if (window.XLSX) return Promise.resolve();
  if (_xlsxLadePromise) return _xlsxLadePromise;
  _xlsxLadePromise = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload = () => res();
    s.onerror = () => { _xlsxLadePromise = null; rej(new Error('Excel-Bibliothek konnte nicht geladen werden')); };
    document.head.appendChild(s);
  });
  return _xlsxLadePromise;
}
async function exportiereXlsx(dateiname, blattname, zeilen) {
  try {
    await ladeXlsxLib();
    const ws = XLSX.utils.aoa_to_sheet(zeilen);
    // Spaltenbreiten grob an Inhalt anpassen
    const breiten = (zeilen[0] || []).map((_, sp) =>
      ({ wch: Math.min(40, Math.max(...zeilen.map(z => String(z[sp] ?? '').length), 8) + 2) }));
    ws['!cols'] = breiten;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, blattname.slice(0, 31));
    XLSX.writeFile(wb, dateiname + '.xlsx');
  } catch (e) {
    console.error('Excel-Export', e);
    toast('⚠ Excel-Export fehlgeschlagen: ' + e.message, 'err');
  }
}
