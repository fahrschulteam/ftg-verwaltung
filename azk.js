// ════════════════════════════════════════════════════════════════════
//  MODUL ARBEITSZEIT & URLAUB (Arbeitszeitkonto)
//  Logik wie ArbZKo-Excel: Ist = Praxis+Theorie+Kurse+Sonstige (á 45min),
//  Diff Monat = Ist - Soll, Diff gesamt verkettet über Monate.
// ════════════════════════════════════════════════════════════════════
const azkState = {
  jahr: 2026,
  monat: new Date().getMonth() + 1,
  monate: [],      // azk_monate-Einträge
  start: [],       // azk_start-Einträge
  loaded: false,
};

const MONATSNAMEN = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

async function ladeAZK() {
  try {
    const { data: mon } = await sb.from('azk_monate').select('*').eq('jahr', azkState.jahr);
    azkState.monate = mon || [];
    const { data: st } = await sb.from('azk_start').select('*').eq('jahr', azkState.jahr);
    azkState.start = st || [];
  } catch(e) { console.warn('AZK laden:', e); azkState.monate=[]; azkState.start=[]; }
  azkState.loaded = true;
}

// Holt alle aktiven, für AZK sichtbaren Mitarbeiter (aus Personal-Modul)
// Standard: alle aktiven Mitarbeiter AUSSER Bereich "sonstige" (Aushilfen).
// Über azk_sichtbar (true/false) lässt sich das pro Person manuell überschreiben.
function azkMitarbeiter() {
  const liste = ((typeof personalState!=='undefined' && personalState.mitarbeiter) || []).filter(m => {
    if (m.status !== 'aktiv') return false;
    if (m.azk_sichtbar === true) return true;
    if (m.azk_sichtbar === false) return false;
    // Kein gesetzter Wert (azk_sichtbar ist null/undefined): Standardregel anwenden
    return m.bereich !== 'sonstige';
  });
  return liste.sort((a,b)=>a.nachname.localeCompare(b.nachname));
}

// Alle aktiven Mitarbeiter, die aktuell NICHT in der AZK-Liste erscheinen
function azkMitarbeiterAusgeblendet() {
  const sichtbarIds = new Set(azkMitarbeiter().map(m=>m.id));
  const alle = ((typeof personalState!=='undefined' && personalState.mitarbeiter) || []).filter(m => m.status === 'aktiv');
  return alle.filter(m => !sichtbarIds.has(m.id)).sort((a,b)=>a.nachname.localeCompare(b.nachname));
}

async function azkMitarbeiterEntfernen(id) {
  const m = (personalState.mitarbeiter||[]).find(x=>x.id===id);
  if (!m) return;
  if (!confirm(`${m.vorname} ${m.nachname} aus der Arbeitszeit-Liste entfernen?\n\nDie Person bleibt als aktiver Mitarbeiter erhalten, erscheint aber nicht mehr in dieser Übersicht. Bereits erfasste Monatsdaten bleiben gespeichert und sind nach erneutem Hinzufügen wieder sichtbar.`)) return;
  const { error } = await sb.from('mitarbeiter').update({ azk_sichtbar: false }).eq('id', id);
  if (error) { toast('Fehler: '+error.message,'err'); return; }
  await ladeMitarbeiter();
  renderAZK();
  toast('Aus Arbeitszeit-Liste entfernt','ok');
}

function azkMitarbeiterHinzufuegen() {
  const ausgeblendet = azkMitarbeiterAusgeblendet();
  const rows = ausgeblendet.map(m => `
    <tr>
      <td>${m.nachname}, ${m.vorname}</td>
      <td style="color:var(--grau);font-size:12px">${m.bereich==='sonstige'?'Sonstige (Aushilfe)':(m.bereich||'–')}</td>
      <td style="text-align:right"><button class="btn btn-primary btn-sm" onclick="azkMitarbeiterHinzufuegenAusfuehren('${m.id}')">＋ Hinzufügen</button></td>
    </tr>`).join('');
  const modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.id = 'azk-add-modal';
  modal.innerHTML = `
    <div class="modal" style="width:480px;max-height:80vh">
      <div class="modal-header"><h3>＋ Mitarbeiter zur Arbeitszeit-Liste hinzufügen</h3><button class="close-btn" onclick="document.getElementById('azk-add-modal').remove()">✕</button></div>
      <div class="modal-body">
        ${ausgeblendet.length ? `<table class="akte-table"><thead><tr><th>Mitarbeiter</th><th>Bereich</th><th></th></tr></thead><tbody>${rows}</tbody></table>`
          : '<p style="font-size:13px;color:var(--grau)">Alle aktiven Mitarbeiter sind bereits in der Arbeitszeit-Liste enthalten.</p>'}
      </div>
      <div class="modal-footer"><button class="btn btn-outline" onclick="document.getElementById('azk-add-modal').remove()">Schließen</button></div>
    </div>`;
  document.body.appendChild(modal);
}

async function azkMitarbeiterHinzufuegenAusfuehren(id) {
  const { error } = await sb.from('mitarbeiter').update({ azk_sichtbar: true }).eq('id', id);
  if (error) { toast('Fehler: '+error.message,'err'); return; }
  await ladeMitarbeiter();
  document.getElementById('azk-add-modal')?.remove();
  renderAZK();
  toast('Zur Arbeitszeit-Liste hinzugefügt','ok');
}

// Berechnet den vollständigen Jahresverlauf für einen Mitarbeiter
function azkBerechne(maId) {
  const start = azkState.start.find(s => s.mitarbeiter_id === maId);
  const standAnfang = start ? Number(start.stand_anfang) : 0;
  const urlaubAnspruch = start ? Number(start.urlaub_anspruch) : 30;

  let standVormonat = standAnfang;
  let resturlaub = urlaubAnspruch;
  let krankGesamt = 0;
  const zeilen = [];

  for (let m = 1; m <= 12; m++) {
    const e = azkState.monate.find(x => x.mitarbeiter_id === maId && x.monat === m);
    if (!e) { zeilen.push(null); continue; }
    const ist = Number(e.praxis||0) + Number(e.theorie||0) + Number(e.kurse||0) + Number(e.sonstige||0);
    const diffMonat = ist - Number(e.soll||0);
    const diffGesamt = (standVormonat + diffMonat) - Number(e.ausgezahlt||0);
    resturlaub = resturlaub - Number(e.urlaubstage||0);
    krankGesamt += Number(e.krankheitstage||0);
    zeilen.push({
      monat: m, eintrag: e,
      standVormonat: standVormonat,
      ist, diffMonat, diffGesamt,
      resturlaub, krankGesamt,
    });
    standVormonat = diffGesamt;
  }
  return { zeilen, standAnfang, urlaubAnspruch, standEnde: standVormonat, resturlaubEnde: resturlaub, krankGesamt };
}

window.renderAZK = async function() {
  const view = document.getElementById('view-azk');
  if (!azkState.loaded) {
    view.innerHTML = '<div class="loading"><div class="spinner"></div>Lade Arbeitszeitdaten …</div>';
    // sicherstellen, dass Personal geladen ist (für Mitarbeiterliste)
    if (typeof personalState!=='undefined' && !personalState.loaded && typeof ladeMitarbeiter==='function') await ladeMitarbeiter();
    await ladeAZK();
  }
  const mas = azkMitarbeiter();
  const monat = azkState.monat;

  // Tabellenzeilen für den gewählten Monat
  const rows = mas.map(ma => {
    const ber = azkBerechne(ma.id);
    const z = ber.zeilen[monat-1];
    const e = z ? z.eintrag : null;
    const cls = z ? (z.diffMonat < 0 ? 'neg' : 'pos') : '';
    return `<tr>
      <td><strong>${ma.nachname}, ${ma.vorname}</strong></td>
      <td class="num ${z?negCls(z.standVormonat):''}">${z ? fmtNum(z.standVormonat) : '–'}</td>
      <td class="num">${e ? fmtNum(e.praxis) : '–'}</td>
      <td class="num">${e ? fmtNum(e.theorie) : '–'}</td>
      <td class="num">${e ? fmtNum(e.kurse) : '–'}</td>
      <td class="num">${e ? fmtNum(e.sonstige) : '–'}</td>
      <td class="num">${e ? fmtNum(e.soll) : '–'}</td>
      <td class="num"><strong>${z ? fmtNum(z.ist) : '–'}</strong></td>
      <td class="num ${cls}">${z ? fmtNum(z.diffMonat) : '–'}</td>
      <td class="num">${e ? fmtNum(e.ausgezahlt) : '–'}</td>
      <td class="num ${z?negCls(z.diffGesamt):''}"><strong>${z ? fmtNum(z.diffGesamt) : '–'}</strong></td>
      <td class="num">${e ? fmtNum(e.urlaubstage) : '–'}</td>
      <td class="num ${z?negCls(z.resturlaub):''}">${z ? fmtNum(z.resturlaub) : '–'}</td>
      <td class="num">${e ? fmtNum(e.krankheitstage) : '–'}</td>
      <td>
        ${canWrite() ? `<button class="btn btn-outline btn-sm" onclick="azkErfassen('${ma.id}')" title="Bearbeiten">✎</button>` : ''}
        ${canWrite() ? `<button class="btn btn-outline btn-sm" style="color:var(--rot)" onclick="azkMitarbeiterEntfernen('${ma.id}')" title="Aus der Liste entfernen">✕</button>` : ''}
      </td>
    </tr>`;
  }).join('');

  // Gesamtzeile: Summe aller Mitarbeiter für den gewählten Monat
  const sum = { standVormonat:0, praxis:0, theorie:0, kurse:0, sonstige:0, soll:0, ist:0, diffMonat:0, ausgezahlt:0, diffGesamt:0, urlaubstage:0, resturlaub:0, krankheitstage:0 };
  mas.forEach(ma => {
    const ber = azkBerechne(ma.id);
    const z = ber.zeilen[monat-1];
    if (!z) return;
    const e = z.eintrag;
    sum.standVormonat += z.standVormonat; sum.praxis += Number(e.praxis||0); sum.theorie += Number(e.theorie||0);
    sum.kurse += Number(e.kurse||0); sum.sonstige += Number(e.sonstige||0); sum.soll += Number(e.soll||0);
    sum.ist += z.ist; sum.diffMonat += z.diffMonat; sum.ausgezahlt += Number(e.ausgezahlt||0);
    sum.diffGesamt += z.diffGesamt; sum.urlaubstage += Number(e.urlaubstage||0);
    sum.resturlaub += z.resturlaub; sum.krankheitstage += Number(e.krankheitstage||0);
  });
  const sumRow = `<tr class="azk-sum-row">
    <td><strong>Gesamt</strong></td>
    <td class="num ${negCls(sum.standVormonat)}"><strong>${fmtNum(sum.standVormonat)}</strong></td>
    <td class="num"><strong>${fmtNum(sum.praxis)}</strong></td>
    <td class="num"><strong>${fmtNum(sum.theorie)}</strong></td>
    <td class="num"><strong>${fmtNum(sum.kurse)}</strong></td>
    <td class="num"><strong>${fmtNum(sum.sonstige)}</strong></td>
    <td class="num"><strong>${fmtNum(sum.soll)}</strong></td>
    <td class="num"><strong>${fmtNum(sum.ist)}</strong></td>
    <td class="num ${negCls(sum.diffMonat)}"><strong>${fmtNum(sum.diffMonat)}</strong></td>
    <td class="num"><strong>${fmtNum(sum.ausgezahlt)}</strong></td>
    <td class="num ${negCls(sum.diffGesamt)}"><strong>${fmtNum(sum.diffGesamt)}</strong></td>
    <td class="num"><strong>${fmtNum(sum.urlaubstage)}</strong></td>
    <td class="num ${negCls(sum.resturlaub)}"><strong>${fmtNum(sum.resturlaub)}</strong></td>
    <td class="num"><strong>${fmtNum(sum.krankheitstage)}</strong></td>
    <td></td>
  </tr>`;

  const monatOpts = MONATSNAMEN.map((n,i)=>`<option value="${i+1}" ${i+1===monat?'selected':''}>${n}</option>`).join('');

  view.innerHTML = `
    <div class="toolbar">
      <h2>Arbeitszeit & Urlaub</h2>
      <select id="azk-monat" onchange="azkSetMonat(this.value)" class="azk-select">${monatOpts}</select>
      <span style="color:var(--grau);font-size:13px">${azkState.jahr}</span>
      ${canWrite()?'<button class="btn btn-outline btn-sm" onclick="azkStartwerte()">⚙ Startwerte</button>':''}
      <button class="btn btn-outline btn-sm" onclick="azkBerichte()">🖨 Berichte</button>
      ${canWrite()?'<button class="btn btn-primary btn-sm" onclick="azkMitarbeiterHinzufuegen()">＋ Mitarbeiter</button>':''}
    </div>
    ${mas.length===0 ? '<div class="module-placeholder"><div class="ph-icon">⏱</div><h3>Keine Mitarbeiter</h3><p>Lege zuerst im Personal-Modul Mitarbeiter an.</p></div>' : `
    <div class="card" style="overflow:auto; max-height:65vh;">
      <table class="azk-table">
        <thead><tr>
          <th>Mitarbeiter</th><th>Stand Vor&shy;monat</th>
          <th>Praxis</th><th>Theorie</th><th>Kurse</th><th>Sonstige</th>
          <th>Soll</th><th>Ist</th><th>Diff Monat</th><th>ausgez.</th><th>Diff gesamt</th>
          <th>Urlaub</th><th>Rest&shy;urlaub</th><th>Krank</th><th></th>
        </tr></thead>
        <tbody>${rows}${mas.length?sumRow:''}</tbody>
      </table>
    </div>
    <p style="font-size:11px;color:var(--grau);margin-top:8px">Alle Stundenwerte in Einheiten á 45 min. Ist = Praxis + Theorie + Kurse + Sonstige. Diff gesamt wird monatlich fortgeschrieben.</p>
    `}`;
};

function fmtNum(n) {
  if (n === null || n === undefined || n === '') return '–';
  const v = Number(n);
  if (isNaN(v)) return '–';
  if (v === 0) return '–';
  return v.toLocaleString('de-DE', {minimumFractionDigits:0, maximumFractionDigits:2});
}

// Liefert 'neg' für negative Zahlenwerte, damit sie in der Tabelle rot dargestellt werden
function negCls(n) {
  const v = Number(n);
  return (!isNaN(v) && v < 0) ? 'neg' : '';
}

function azkSetMonat(m) { azkState.monat = parseInt(m); renderAZK(); }

// ── Erfassung eines Monats für einen Mitarbeiter ──
function azkErfassen(maId) {
  const ma = azkMitarbeiter().find(m=>m.id===maId);
  if (!ma) return;
  const monat = azkState.monat;
  const e = azkState.monate.find(x => x.mitarbeiter_id === maId && x.monat === monat) || {};

  const modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.id = 'azk-modal';
  modal.innerHTML = `
    <div class="modal" style="width:440px">
      <div class="modal-header"><h3>${ma.vorname} ${ma.nachname} – ${MONATSNAMEN[monat-1]} ${azkState.jahr}</h3><button class="close-btn" onclick="document.getElementById('azk-modal').remove()">✕</button></div>
      <div class="modal-body">
        <input type="hidden" id="azk-ma" value="${maId}">
        <p style="font-size:12px;color:var(--grau);margin-bottom:8px">Alle Werte in Einheiten á 45 Minuten.</p>
        <div class="fgrid">
          <div class="frow"><label>Praxis</label><input type="number" step="0.01" id="azk-praxis" value="${e.praxis??''}"></div>
          <div class="frow"><label>Theorie</label><input type="number" step="0.01" id="azk-theorie" value="${e.theorie??''}"></div>
        </div>
        <div class="fgrid">
          <div class="frow"><label>Kurse</label><input type="number" step="0.01" id="azk-kurse" value="${e.kurse??''}"></div>
          <div class="frow"><label>Sonstige Tätigkeiten</label><input type="number" step="0.01" id="azk-sonstige" value="${e.sonstige??''}"></div>
        </div>
        <div class="fgrid">
          <div class="frow"><label>Soll-Stunden</label><input type="number" step="0.01" id="azk-soll" value="${e.soll??195}"></div>
          <div class="frow"><label>Ausgezahlt</label><input type="number" step="0.01" id="azk-ausgezahlt" value="${e.ausgezahlt??''}"></div>
        </div>
        <div class="fgrid">
          <div class="frow"><label>Urlaubstage</label><input type="number" step="0.5" id="azk-urlaub" value="${e.urlaubstage??''}"></div>
          <div class="frow"><label>Krankheitstage</label><input type="number" step="0.5" id="azk-krank" value="${e.krankheitstage??''}"></div>
        </div>
      </div>
      <div class="modal-footer">
        ${e.id?`<button class="btn btn-outline" style="margin-right:auto;color:var(--rot)" onclick="azkLoeschen('${e.id}')">Löschen</button>`:''}
        <button class="btn btn-outline" onclick="document.getElementById('azk-modal').remove()">Abbrechen</button>
        <button class="btn btn-primary" onclick="azkSpeichern()">Speichern</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

async function azkSpeichern() {
  const v = id => { const el = document.getElementById(id); return el.value !== '' ? parseFloat(el.value) : 0; };
  const maId = document.getElementById('azk-ma').value;
  const datensatz = {
    mitarbeiter_id: maId, jahr: azkState.jahr, monat: azkState.monat,
    praxis: v('azk-praxis'), theorie: v('azk-theorie'), kurse: v('azk-kurse'), sonstige: v('azk-sonstige'),
    soll: v('azk-soll'), ausgezahlt: v('azk-ausgezahlt'),
    urlaubstage: v('azk-urlaub'), krankheitstage: v('azk-krank'),
  };
  const { error } = await sb.from('azk_monate').upsert(datensatz, { onConflict: 'mitarbeiter_id,jahr,monat' });
  if (error) { toast('Fehler: '+error.message,'err'); return; }
  document.getElementById('azk-modal').remove();
  await ladeAZK(); renderAZK();
  toast('Gespeichert','ok');
}

async function azkLoeschen(id) {
  if (!confirm('Diesen Monatseintrag löschen?')) return;
  const { error } = await sb.from('azk_monate').delete().eq('id', id);
  if (error) { toast(error.message,'err'); return; }
  document.getElementById('azk-modal').remove();
  await ladeAZK(); renderAZK();
  toast('Gelöscht','ok');
}

// ── Startwerte (Jahresanfang: Stundensaldo + Urlaubsanspruch) ──
function azkStartwerte() {
  const mas = azkMitarbeiter();
  const rows = mas.map(ma => {
    const s = azkState.start.find(x => x.mitarbeiter_id === ma.id) || {};
    return `<tr>
      <td>${ma.nachname}, ${ma.vorname}</td>
      <td><input type="number" step="0.01" class="azk-start-stand" data-ma="${ma.id}" value="${s.stand_anfang??0}" style="width:110px"></td>
      <td><input type="number" step="0.5" class="azk-start-urlaub" data-ma="${ma.id}" value="${s.urlaub_anspruch??30}" style="width:80px"></td>
    </tr>`;
  }).join('');
  const modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.id = 'azk-start-modal';
  modal.innerHTML = `
    <div class="modal" style="width:520px;max-height:90vh">
      <div class="modal-header"><h3>Startwerte ${azkState.jahr}</h3><button class="close-btn" onclick="document.getElementById('azk-start-modal').remove()">✕</button></div>
      <div class="modal-body">
        <p style="font-size:12px;color:var(--grau);margin-bottom:8px">Stundensaldo zu Jahresbeginn (á 45 min) und Jahres-Urlaubsanspruch (Tage).</p>
        <table class="akte-table"><thead><tr><th>Mitarbeiter</th><th>Stand Jahresanfang</th><th>Urlaubsanspruch</th></tr></thead><tbody>${rows}</tbody></table>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="document.getElementById('azk-start-modal').remove()">Abbrechen</button>
        <button class="btn btn-primary" onclick="azkStartSpeichern()">Speichern</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

async function azkStartSpeichern() {
  const stands = document.querySelectorAll('.azk-start-stand');
  const records = [];
  stands.forEach(el => {
    const maId = el.dataset.ma;
    const urlaubEl = document.querySelector(`.azk-start-urlaub[data-ma="${maId}"]`);
    records.push({
      mitarbeiter_id: maId, jahr: azkState.jahr,
      stand_anfang: parseFloat(el.value)||0,
      urlaub_anspruch: parseFloat(urlaubEl.value)||30,
    });
  });
  const { error } = await sb.from('azk_start').upsert(records, { onConflict: 'mitarbeiter_id,jahr' });
  if (error) { toast('Fehler: '+error.message,'err'); return; }
  document.getElementById('azk-start-modal').remove();
  await ladeAZK(); renderAZK();
  toast('Startwerte gespeichert','ok');
}

// ── BERICHTE ──
function azkBerichte() {
  const mas = azkMitarbeiter();
  const opts = mas.map(m=>`<option value="${m.id}">${m.nachname}, ${m.vorname}</option>`).join('');

  // Alle Mitarbeiter (aktiv + ausgeschieden) für die Gesamtübersicht wählbar machen
  const alleMA = ((typeof personalState!=='undefined' && personalState.mitarbeiter) || [])
    .slice().sort((a,b)=>a.nachname.localeCompare(b.nachname));
  const checkRows = alleMA.map(m => `
    <label style="display:flex;align-items:center;gap:8px;padding:4px 2px;font-size:13px;${m.status==='archiviert'?'color:var(--grau)':''}">
      <input type="checkbox" class="azk-ber-ma-check" value="${m.id}" ${m.status==='aktiv'?'checked':''}>
      ${m.nachname}, ${m.vorname}${m.status==='archiviert'?' <span style="font-size:10px">(ausgeschieden)</span>':''}
    </label>`).join('');

  const modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.id = 'azk-ber-modal';
  modal.innerHTML = `
    <div class="modal" style="width:480px;max-height:90vh">
      <div class="modal-header"><h3>🖨 Arbeitszeit-Berichte</h3><button class="close-btn" onclick="document.getElementById('azk-ber-modal').remove()">✕</button></div>
      <div class="modal-body">
        <div class="ber-sec">Gesamtübersicht</div>
        <p style="font-size:11px;color:var(--grau);margin-bottom:6px">Mitarbeiter für die Jahresübersicht ${azkState.jahr} hinzufügen oder entfernen (auch ausgeschiedene möglich):</p>
        <div style="max-height:180px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius);padding:6px 10px;margin-bottom:10px">
          ${checkRows || '<span style="font-size:12px;color:var(--grau)">Keine Mitarbeiter vorhanden.</span>'}
        </div>
        <div class="ber-row"><button class="btn btn-outline" onclick="azkDruckGesamtAuswahl()">🖨 Gesamtübersicht drucken (Querformat)</button></div>
        <div class="ber-sec">Einzelner Mitarbeiter</div>
        <div class="ber-row">
          <select id="azk-ber-ma" style="flex:1">${opts}</select>
          <button class="btn btn-outline" onclick="azkDruckEinzel(document.getElementById('azk-ber-ma').value)">🖨 Drucken</button>
        </div>
        <div class="ber-sec">Speicherort für unterschriebene Übersichten</div>
        <div id="azk-dir-status" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">${azkDirStatusHtml()}</div>
      </div>
      <div class="modal-footer"><button class="btn btn-outline" onclick="document.getElementById('azk-ber-modal').remove()">Schließen</button></div>
    </div>`;
  document.body.appendChild(modal);
  // Handle wird asynchron aus IndexedDB geladen – Status danach aktualisieren
  _azkDirReady.then(() => {
    const el = document.getElementById('azk-dir-status');
    if (el) el.innerHTML = azkDirStatusHtml();
  });
}

function azkDruckGesamtAuswahl() {
  const ids = Array.from(document.querySelectorAll('.azk-ber-ma-check:checked')).map(c => c.value);
  if (!ids.length) { toast('Bitte mindestens einen Mitarbeiter auswählen.','err'); return; }
  azkDruckGesamt(ids);
}

function azkDruckGesamt(ids) {
  const alleMA = ((typeof personalState!=='undefined' && personalState.mitarbeiter) || []);
  const mas = ids ? ids.map(id => alleMA.find(m => m.id === id)).filter(Boolean) : azkMitarbeiter();
  const monat = azkState.monat;
  const rows = mas.map(ma => {
    const ber = azkBerechne(ma.id);
    const z = ber.zeilen[monat-1];
    if (!z) return `<tr><td>${ma.nachname}, ${ma.vorname}</td><td colspan="6" style="color:#999">keine Daten</td></tr>`;
    const e = z.eintrag;
    return `<tr>
      <td><strong>${ma.nachname}, ${ma.vorname}</strong></td>
      <td class="num">${fmtNum(z.ist)}</td>
      <td class="num">${fmtNum(e.soll)}</td>
      <td class="num" style="color:${z.diffMonat<0?'#991B1B':'#166534'}">${fmtNum(z.diffMonat)}</td>
      <td class="num"><strong>${fmtNum(z.diffGesamt)}</strong></td>
      <td class="num">${fmtNum(z.resturlaub)}</td>
      <td class="num">${fmtNum(z.krankGesamt)}</td>
    </tr>`;
  }).join('');
  const w = window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Arbeitszeit Gesamtübersicht</title>
    <style>@page{size:landscape;margin:14mm}
    body{font-family:Arial;padding:30px;color:#3F4B57;font-size:12px}
    h1{color:#C0001A;margin:0 0 4px 0}
    table{width:100%;border-collapse:collapse;margin-top:12px;font-size:11px}
    th{background:#F3F4F6;text-align:left;padding:6px 8px;border-bottom:2px solid #ccc}
    td{padding:5px 8px;border-bottom:1px solid #eee}
    .num{text-align:right}
    .head{color:#6B7280;font-size:11px;margin-bottom:12px}
    ${typeof DRUCK_CSS!=='undefined'?DRUCK_CSS:''}</style></head><body>
    ${typeof druckBriefkopf==='function'?druckBriefkopf():''}
    <h1>Arbeitszeit-Gesamtübersicht – ${MONATSNAMEN[monat-1]} ${azkState.jahr}</h1>
    <p class="head">Stand: ${new Date().toLocaleDateString('de-DE')} · Werte á 45 min</p>
    <table>
      <thead><tr><th>Mitarbeiter</th><th class="num">Ist</th><th class="num">Soll</th><th class="num">Diff Monat</th><th class="num">Saldo gesamt</th><th class="num">Resturlaub</th><th class="num">Krank ges.</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${typeof druckFusszeile==='function'?druckFusszeile():''}
    </body></html>`);
  w.document.close();
  azkPrintWhenReady(w);
}

function azkDruckEinzel(maId) {
  const ma = azkMitarbeiter().find(m=>m.id===maId);
  if (!ma) return;
  const ber = azkBerechne(maId);
  const rows = ber.zeilen.map((z, i) => {
    if (!z) return `<tr><td>${MONATSNAMEN[i]}</td><td colspan="9" style="color:#bbb">–</td></tr>`;
    const e = z.eintrag;
    return `<tr>
      <td><strong>${MONATSNAMEN[i]}</strong></td>
      <td class="num">${fmtNum(z.standVormonat)}</td>
      <td class="num">${fmtNum(e.praxis)}</td>
      <td class="num">${fmtNum(e.theorie)}</td>
      <td class="num">${fmtNum(e.kurse)}</td>
      <td class="num">${fmtNum(e.sonstige)}</td>
      <td class="num">${fmtNum(e.soll)}</td>
      <td class="num"><strong>${fmtNum(z.ist)}</strong></td>
      <td class="num" style="color:${z.diffMonat<0?'#991B1B':'#166534'}">${fmtNum(z.diffMonat)}</td>
      <td class="num"><strong>${fmtNum(z.diffGesamt)}</strong></td>
      <td class="num">${fmtNum(e.urlaubstage)}</td>
      <td class="num">${fmtNum(z.resturlaub)}</td>
      <td class="num">${fmtNum(z.krankGesamt)}</td>
    </tr>`;
  }).join('');
  const w = window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Arbeitszeitkonto ${ma.nachname}</title>
    <style>@page{size:A4;margin:12mm}
    body{font-family:Arial;padding:20px;color:#3F4B57;font-size:10.5px}
    @media print{body{padding:0}}
    h1{color:#C0001A;margin:0 0 3px 0;font-size:17px}
    table{width:100%;border-collapse:collapse;margin-top:8px;font-size:9.5px}
    th{background:#F3F4F6;text-align:left;padding:3.5px 5px;border-bottom:2px solid #ccc}
    td{padding:2.5px 5px;border-bottom:1px solid #eee}
    .num{text-align:right}
    .head{color:#6B7280;font-size:10.5px;margin-bottom:8px}
    @media print{.no-print{display:none!important}}
    ${typeof DRUCK_CSS!=='undefined'?DRUCK_CSS:''}</style></head><body>
    ${typeof druckBriefkopf==='function'?druckBriefkopf():''}
    <h1>Arbeitszeitkonto ${azkState.jahr} – ${ma.vorname} ${ma.nachname}</h1>
    <p class="head">Stand: ${new Date().toLocaleDateString('de-DE')} · Saldo Jahresanfang: ${fmtNum(ber.standAnfang)} · Werte á 45 min</p>
    <table>
      <thead><tr><th>Monat</th><th class="num">Stand Vorm.</th><th class="num">Praxis</th><th class="num">Theorie</th><th class="num">Kurse</th><th class="num">Sonst.</th><th class="num">Soll</th><th class="num">Ist</th><th class="num">Diff M.</th><th class="num">Diff ges.</th><th class="num">Url.</th><th class="num">Resturl.</th><th class="num">Krank</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="margin-top:8px;font-size:10.5px"><strong>Stand Jahresende:</strong> ${fmtNum(ber.standEnde)} (á 45 min) · <strong>Resturlaub:</strong> ${fmtNum(ber.resturlaubEnde)} Tage · <strong>Krankheitstage gesamt:</strong> ${fmtNum(ber.krankGesamt)}</p>
    <div style="margin-top:14px;padding-top:8px;border-top:1px solid #ccc;font-size:9px;line-height:1.4;color:#3F4B57">
      <p style="font-weight:700;font-size:11px;margin-bottom:5px">Bestätigung der Arbeitsstunden- und Urlaubsaufstellung</p>
      <p style="margin-bottom:5px">Ich bestätige hiermit, dass ich die monatliche Aufstellung über meine geleisteten Arbeitsstunden sowie meinen aktuellen Resturlaubsanspruch erhalten habe.</p>
      <p style="margin-bottom:5px">Ich habe die Aufstellung geprüft und bestätige, dass die darin ausgewiesenen Arbeitsstunden sowie der Resturlaubsanspruch nach meiner Kenntnis vollständig und richtig sind. Etwaige Einwendungen gegen die Aufstellung habe ich dem Arbeitgeber mitgeteilt.</p>
      <p style="margin-bottom:10px">Mir ist bekannt, dass mein Resturlaubsanspruch grundsätzlich bis zum Ende des jeweiligen Kalenderjahres zu nehmen ist, soweit keine gesetzlichen, tarifvertraglichen oder arbeitsvertraglichen Regelungen eine Übertragung vorsehen. Ich wurde darauf hingewiesen, meinen Urlaub rechtzeitig zu beantragen und in Anspruch zu nehmen. Mir ist außerdem bekannt, dass ein Verfall von Urlaubsansprüchen nach den gesetzlichen Voraussetzungen eintreten kann.</p>
      <table style="width:100%;border-collapse:collapse;margin-top:10px">
        <tr>
          <td style="border:none;padding:0 24px 0 0;width:38%;vertical-align:top">
            Ort, Datum:<br>
            <strong style="font-size:11px">Lingen (Ems), ${new Date().toLocaleDateString('de-DE')}</strong>
          </td>
          <td style="border:none;padding:0;width:62%;vertical-align:top">
            Unterschrift:
            <div class="no-print" style="margin-top:3px">
              <canvas id="sigCanvas" width="500" height="110" style="width:100%;max-width:340px;height:65px;border:1.5px solid #999;border-radius:4px;background:#fff;touch-action:none;cursor:crosshair;display:block"></canvas>
              <div style="margin-top:3px">
                <a href="#" onclick="sigClear();return false" style="font-size:9px;color:#2A6CAE;text-decoration:underline">Unterschrift löschen</a>
              </div>
            </div>
            <img id="sigImg" style="display:none;max-width:340px;height:45px;margin-top:3px">
          </td>
        </tr>
      </table>
    </div>
    <div class="no-print" style="margin-top:18px;text-align:center;display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
      <button onclick="window.print()" style="background:#fff;color:#3F4B57;border:1.5px solid #D1D5DB;border-radius:8px;padding:12px 24px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">🖨 Nur drucken (zur Kontrolle)</button>
      <button onclick="sigFertig()" style="background:#C0001A;color:#fff;border:none;border-radius:8px;padding:12px 28px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">✓ Unterschrieben – auf OneDrive speichern</button>
    </div>
    ${typeof druckFusszeile==='function'?druckFusszeile():''}
    <script>
      (function(){
        var c = document.getElementById('sigCanvas');
        var ctx = c.getContext('2d');
        ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#111';
        var drawing = false, hasInk = false;
        function pos(ev){
          var r = c.getBoundingClientRect();
          var cx = (ev.touches ? ev.touches[0].clientX : ev.clientX);
          var cy = (ev.touches ? ev.touches[0].clientY : ev.clientY);
          return { x:(cx-r.left)*(c.width/r.width), y:(cy-r.top)*(c.height/r.height) };
        }
        function start(ev){ drawing = true; var p = pos(ev); ctx.beginPath(); ctx.moveTo(p.x,p.y); ev.preventDefault(); }
        function move(ev){ if(!drawing) return; var p = pos(ev); ctx.lineTo(p.x,p.y); ctx.stroke(); hasInk = true; ev.preventDefault(); }
        function end(){ drawing = false; }
        c.addEventListener('pointerdown', start);
        c.addEventListener('pointermove', move);
        c.addEventListener('pointerup', end);
        c.addEventListener('pointerleave', end);
        c.addEventListener('pointercancel', end);
        window.sigClear = function(){ ctx.clearRect(0,0,c.width,c.height); hasInk = false; };
        window.sigFertig = function(){
          if (!hasInk) { alert('Bitte zuerst im Feld unterschreiben.'); return; }
          var data = c.toDataURL('image/png');
          var img = document.getElementById('sigImg');
          img.src = data;
          img.style.display = 'block';
          c.parentElement.style.display = 'none';
          document.querySelectorAll('.no-print').forEach(function(el){ el.style.display='none'; });
          try {
            if (window.opener && typeof window.opener.azkSigniertSpeichern === 'function') {
              window.opener.azkSigniertSpeichern('${maId}', data);
            }
          } catch(e) { console.error(e); }
          document.body.insertAdjacentHTML('beforeend',
            '<div style="position:fixed;inset:0;background:rgba(255,255,255,.92);display:flex;align-items:center;justify-content:center;font-family:Arial;font-size:16px;color:#166534;font-weight:700">✓ Gespeichert – Fenster schließt sich …</div>');
          setTimeout(function(){ window.close(); }, 1400);
        };
      })();
    </script>
    </body></html>`);
  w.document.close();
}

function azkPrintWhenReady(w) {
  w.onload = function() {
    const imgs = w.document.images; let g=0; const t=imgs.length;
    if (t===0) { w.print(); return; }
    const ck=()=>{ if(++g>=t) setTimeout(()=>w.print(),100); };
    for (let i=0;i<t;i++){ if(imgs[i].complete) ck(); else { imgs[i].onload=ck; imgs[i].onerror=ck; } }
  };
  setTimeout(()=>{ try{ w.print(); }catch(e){} }, 1500);
}

// ════════════════════════════════════════════════════════════════════
//  AZK: OneDrive-Speicherung der unterschriebenen Übersichten
//  Pro Fahrlehrer eigener Unterordner im gewählten AZK-Ordner.
// ════════════════════════════════════════════════════════════════════
let _azkDir = null;
const AZK_DIRKEY = 'azkDirHandle';

function _azkDb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('azk-store', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function azkDbSet(k, v) {
  const db = await _azkDb();
  return new Promise((res, rej) => {
    const tx = db.transaction('kv', 'readwrite');
    tx.objectStore('kv').put(v, k);
    tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
  });
}
async function azkDbGet(k) {
  const db = await _azkDb();
  return new Promise((res, rej) => {
    const tx = db.transaction('kv', 'readonly');
    const rq = tx.objectStore('kv').get(k);
    rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error);
  });
}
let _azkPerm = 'prompt';
async function azkLoadDir() {
  try {
    const h = await azkDbGet(AZK_DIRKEY);
    if (h) {
      _azkDir = h;
      try { _azkPerm = await h.queryPermission({ mode: 'readwrite' }); } catch (e) { _azkPerm = 'prompt'; }
    }
  } catch (e) {}
}
const _azkDirReady = azkLoadDir();

async function azkPickDir() {
  if (typeof window.showDirectoryPicker !== 'function') {
    toast('Dieser Browser unterstützt keine Ordnerauswahl (Chrome/Edge verwenden).', 'err');
    return;
  }
  try {
    const h = await window.showDirectoryPicker({ mode: 'readwrite' });
    _azkDir = h;
    _azkPerm = 'granted';
    await azkDbSet(AZK_DIRKEY, h);
    toast('AZK-Speicherordner gesetzt: ' + h.name, 'ok');
    const el = document.getElementById('azk-dir-status');
    if (el) el.innerHTML = azkDirStatusHtml();
  } catch (e) { /* Abbruch */ }
}
async function azkClearDir() {
  _azkDir = null;
  try { await azkDbSet(AZK_DIRKEY, null); } catch (e) {}
  const el = document.getElementById('azk-dir-status');
  if (el) el.innerHTML = azkDirStatusHtml();
}
function azkDirStatusHtml() {
  if (!_azkDir) {
    return `<button class="btn btn-outline" onclick="azkPickDir()" style="font-size:12px">📁 OneDrive-Ordner wählen</button>
       <span style="font-size:11px;color:var(--grau)">Unterschriebene Übersichten werden dort je Mitarbeiter abgelegt.</span>`;
  }
  if (_azkPerm !== 'granted') {
    return `<span class="tag" style="font-size:11px;background:#FFF7ED;color:#92400e">📁 ${_azkDir.name}</span>
       <button class="btn btn-outline" onclick="azkReaktiviereDir()" style="font-size:12px">🔓 Zugriff erneuern</button>
       <span style="font-size:11px;color:var(--grau)">Nach Browser-Neustart einmal bestätigen.</span>
       <button class="btn ghost sm" onclick="azkClearDir()" style="font-size:11px">Entfernen</button>`;
  }
  return `<span class="tag green" style="font-size:11px">📁 ${_azkDir.name} ✓</span>
       <button class="btn ghost sm" onclick="azkClearDir()" style="font-size:11px">Entfernen</button>`;
}
async function azkReaktiviereDir() {
  if (!_azkDir) return;
  try {
    _azkPerm = await _azkDir.requestPermission({ mode: 'readwrite' });
  } catch (e) { _azkPerm = 'prompt'; }
  const el = document.getElementById('azk-dir-status');
  if (el) el.innerHTML = azkDirStatusHtml();
  if (_azkPerm === 'granted') toast('Zugriff auf ' + _azkDir.name + ' aktiv', 'ok');
}

// PDF der Einzelübersicht inkl. Unterschrift erzeugen und speichern
async function azkSigniertSpeichern(maId, sigDataUrl) {
  try {
    const ma = ((typeof personalState !== 'undefined' && personalState.mitarbeiter) || []).find(m => m.id === maId);
    if (!ma) { toast('Mitarbeiter nicht gefunden', 'err'); return; }
    if (!window.jspdf || !window.jspdf.jsPDF) { toast('PDF-Bibliothek nicht geladen', 'err'); return; }

    const ber = azkBerechne(maId);
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const RED = [192, 0, 26], INK = [63, 75, 87], MUT = [107, 114, 128], BD = [210, 213, 218];
    const PL = 14, PR = 196, PW = 182;
    const heute = new Date().toLocaleDateString('de-DE');

    // Kopf
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...RED);
    doc.text(`Arbeitszeitkonto ${azkState.jahr} – ${ma.vorname} ${ma.nachname}`, PL, 16);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...MUT);
    doc.text(`Stand: ${heute} · Saldo Jahresanfang: ${fmtNum(ber.standAnfang)} · Werte á 45 min`, PL, 21);
    doc.setDrawColor(...RED); doc.setLineWidth(0.6); doc.line(PL, 24, PR, 24);

    // Tabelle
    const cols = [
      { l: 'Monat', w: 20 }, { l: 'Vorm.', w: 13 }, { l: 'Praxis', w: 13 }, { l: 'Theorie', w: 13 },
      { l: 'Kurse', w: 12 }, { l: 'Sonst.', w: 12 }, { l: 'Soll', w: 12 }, { l: 'Ist', w: 12 },
      { l: 'Diff M.', w: 13 }, { l: 'Diff ges.', w: 15 }, { l: 'Url.', w: 11 }, { l: 'Resturl.', w: 14 }, { l: 'Krank', w: 12 },
    ];
    let y = 31;
    doc.setFillColor(243, 244, 246);
    doc.rect(PL, y - 4, PW, 6, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...INK);
    let x = PL + 1;
    cols.forEach(c => { doc.text(c.l, x, y); x += c.w; });
    y += 5;

    doc.setFont('helvetica', 'normal');
    ber.zeilen.forEach((z, i) => {
      const vals = z ? [
        MONATSNAMEN[i].substring(0, 3), fmtNum(z.standVormonat), fmtNum(z.eintrag.praxis),
        fmtNum(z.eintrag.theorie), fmtNum(z.eintrag.kurse), fmtNum(z.eintrag.sonstige),
        fmtNum(z.eintrag.soll), fmtNum(z.ist), fmtNum(z.diffMonat), fmtNum(z.diffGesamt),
        fmtNum(z.eintrag.urlaubstage), fmtNum(z.resturlaub), fmtNum(z.krankGesamt),
      ] : [MONATSNAMEN[i].substring(0, 3), '–', '–', '–', '–', '–', '–', '–', '–', '–', '–', '–', '–'];
      if (i % 2 === 0) { doc.setFillColor(249, 249, 251); doc.rect(PL, y - 3.5, PW, 5.5, 'F'); }
      doc.setDrawColor(...BD); doc.setLineWidth(0.1); doc.line(PL, y + 2, PL + PW, y + 2);
      doc.setFontSize(7); doc.setTextColor(...INK);
      let xx = PL + 1;
      vals.forEach((v, ci) => { doc.text(String(v), xx, y); xx += cols[ci].w; });
      y += 5.5;
    });

    y += 3;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    doc.text(`Stand Jahresende: ${fmtNum(ber.standEnde)} · Resturlaub: ${fmtNum(ber.resturlaubEnde)} Tage · Krankheitstage: ${fmtNum(ber.krankGesamt)}`, PL, y);

    // Bestätigungstext
    y += 8;
    doc.setDrawColor(...BD); doc.setLineWidth(0.3); doc.line(PL, y - 3, PR, y - 3);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...INK);
    doc.text('Bestätigung der Arbeitsstunden- und Urlaubsaufstellung', PL, y + 2);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
    const txt =
      'Ich bestätige hiermit, dass ich die monatliche Aufstellung über meine geleisteten Arbeitsstunden sowie meinen ' +
      'aktuellen Resturlaubsanspruch erhalten habe. Ich habe die Aufstellung geprüft und bestätige, dass die darin ' +
      'ausgewiesenen Arbeitsstunden sowie der Resturlaubsanspruch nach meiner Kenntnis vollständig und richtig sind. ' +
      'Etwaige Einwendungen gegen die Aufstellung habe ich dem Arbeitgeber mitgeteilt. Mir ist bekannt, dass mein ' +
      'Resturlaubsanspruch grundsätzlich bis zum Ende des jeweiligen Kalenderjahres zu nehmen ist, soweit keine ' +
      'gesetzlichen, tarifvertraglichen oder arbeitsvertraglichen Regelungen eine Übertragung vorsehen. Ich wurde darauf ' +
      'hingewiesen, meinen Urlaub rechtzeitig zu beantragen und in Anspruch zu nehmen. Mir ist außerdem bekannt, dass ' +
      'ein Verfall von Urlaubsansprüchen nach den gesetzlichen Voraussetzungen eintreten kann.';
    const lines = doc.splitTextToSize(txt, PW);
    doc.text(lines, PL, y + 7);
    y += 7 + lines.length * 3.2 + 6;

    // Ort/Datum + Signatur
    doc.setFontSize(8);
    doc.text('Ort, Datum:', PL, y);
    doc.setFont('helvetica', 'bold');
    doc.text(`Lingen (Ems), ${heute}`, PL, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.text('Unterschrift:', PL + 80, y);
    if (sigDataUrl) { try { doc.addImage(sigDataUrl, 'PNG', PL + 80, y + 1, 60, 14); } catch (e) {} }
    doc.setDrawColor(...MUT); doc.line(PL + 80, y + 16, PL + 150, y + 16);

    const blob = doc.output('blob');
    const monatsName = MONATSNAMEN[azkState.monat - 1];
    const fname = `Arbeitszeitkonto ${ma.vorname} ${ma.nachname} ${monatsName} ${azkState.jahr}.pdf`.replace(/[\\/:*?"<>|]/g, '_');

    let dirOk = false;
    if (_azkDir) {
      try {
        let p = await _azkDir.queryPermission({ mode: 'readwrite' });
        if (p !== 'granted') p = await _azkDir.requestPermission({ mode: 'readwrite' });
        dirOk = (p === 'granted');
        _azkPerm = p;
      } catch (e) { dirOk = false; }
    }
    if (dirOk) {
      const sub = await _azkDir.getDirectoryHandle(`${ma.nachname}_${ma.vorname}`.replace(/[^\wÄÖÜäöüß\-]/g, '_'), { create: true });
      const fh = await sub.getFileHandle(fname, { create: true });
      const w = await fh.createWritable();
      await w.write(blob); await w.close();
      toast(`Gespeichert: ${_azkDir.name}/${ma.nachname}_${ma.vorname}/${fname}`, 'ok');
    } else {
      // Fallback: Download (kein Ordner oder Freigabe nach Neustart noch nicht erteilt)
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = fname; a.click();
      URL.revokeObjectURL(a.href);
      toast(_azkDir
        ? 'Ordner-Freigabe fehlt – PDF als Download gespeichert. In Berichte → „🔓 Zugriff erneuern“ klicken.'
        : 'Kein AZK-Ordner gewählt – PDF als Download gespeichert.', 'ok');
    }
  } catch (e) {
    console.error('azkSigniertSpeichern:', e);
    toast('Speichern fehlgeschlagen: ' + e.message, 'err');
  }
}
