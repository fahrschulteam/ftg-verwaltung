/* Separate settings module; future extensions are preferences, never capabilities. */
async function datevSettingsRequest(method, body) {
  const { data, error } = await sb.auth.getSession();
  if (error || !data.session) throw new Error('Bitte erneut anmelden.');
  const r = await fetch('/.netlify/functions/datev-settings', {
    method, headers: { Authorization: 'Bearer '+data.session.access_token, 'Content-Type':'application/json' },
    ...(body ? {body:JSON.stringify(body)} : {})
  });
  const result = await r.json();
  if (!r.ok) throw new Error(result.error || 'Einstellungen nicht verfügbar.');
  return result;
}
async function renderDatevEinstellungen(host) {
  host.innerHTML = '<div class="card">DATEV-Einstellungen werden geladen …</div>';
  let cfg;
  try { cfg = await datevSettingsRequest('GET'); }
  catch(e) {
    host.innerHTML = '<div class="card"><b>DATEV-Vorbereitung noch nicht verfügbar</b><p>'+escEinst(e.message)+'</p><p>Die neue Serverfunktion muss zusammen mit der App bereitgestellt sein. Keine Einstellungen wurden geändert.</p></div>';
    return;
  }
  if (einstState.tab !== 'datev') return;
  host.innerHTML = `<div class="card"><div class="card-titel">DATEV Light – Vorbereitung</div>
    <p>FTG erstellt Rechnungen und verwaltet Forderungen. Kontierung, Buchhaltung, Bank und Kasse bleiben in DATEV und beim Steuerbüro. Light erzeugt keine Buchungssätze.</p>
    <label><input id="datev-preparation" type="checkbox" ${cfg.preparation?'checked':''}> Prüfung der Rechnungsdaten in Schulungen anzeigen</label>
    <p>Die Prüfung verändert keine Rechnung und meldet keine DATEV-Annahme. Es findet noch keine Übergabe statt.</p></div>
    <div class="card"><div class="card-titel">Spätere Erweiterungen einzeln vormerken</div>
    <p>Jeder Schalter speichert einen Erweiterungswunsch. Die Funktionen sind noch nicht implementiert und bleiben gesperrt. Abschalten löscht keine Rechnungen oder anderen Bestandsdaten.</p>
    ${Object.entries(FTG_DATEV.extensions).map(([key,label])=>`<label style="display:block;margin:12px 0"><input data-datev-extension="${key}" type="checkbox" ${cfg.requested[key]?'checked':''}> ${label} <span style="color:var(--grau)">– vorgemerkt, sobald eingeschaltet; noch nicht verfügbar</span></label>`).join('')}
    <p>Buchungsdaten sind derzeit nicht vorgesehen. Auch eine Vormerkung erlaubt in Light keine EXTF-Dateien oder Buchungsstapel.</p></div>
    <div class="card"><div class="card-titel">Direkte Schnittstelle: gesperrt</div>
    <p>Die gesonderte Freigabe nach Seite 7 kann hier nicht erteilt werden. DATEV-Zulassung, sichere Anmeldung, Mandantenrechte, Testumgebung und Probeimport sind vor der Anbindung zu prüfen und abzunehmen.</p>
    <p>Lieferantenbelege gehen direkt nach DATEV. Zahlungsaufträge werden dort nach dem vereinbarten Verfahren freigegeben.</p></div>
    <button class="btn btn-primary" id="datev-save">Einstellungen speichern</button><span id="datev-save-status" role="status" style="margin-left:12px"></span>`;
  host.querySelector('#datev-save').addEventListener('click', async function() {
    this.disabled = true;
    const status = host.querySelector('#datev-save-status');
    status.textContent = 'Wird gespeichert …';
    try {
      const requested = {};
      host.querySelectorAll('[data-datev-extension]').forEach(el => { requested[el.dataset.datevExtension] = el.checked; });
      await datevSettingsRequest('POST', {preparation:host.querySelector('#datev-preparation').checked,requested});
      // Read current firm state again; never replace unrelated settings using a stale copy.
      await ladeEinstellungen();
      status.textContent = 'Gespeichert. Direkte Übertragung und Erweiterungen bleiben gesperrt.';
      if (typeof window.sendEinstellungenToSchulung === 'function') window.sendEinstellungenToSchulung();
    } catch(e) { status.textContent = e.message; }
    finally { this.disabled = false; }
  });
}
