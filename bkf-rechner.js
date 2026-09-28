// ════════════════════════════════════════════════════════════════════
//  BKF-MODUL-RECHNER  (bkf-rechner.js)
//  Ermittelt am Telefon, welche BKF-Weiterbildungsmodule (DEGENER Runde 3)
//  ein Teilnehmer noch braucht - unter Anrechnung von ADR-, Tiertransport-
//  und externen Schulungen. Unsere Module = DEGENER Runde 3.
//
//  Rechtsgrundlage (Stand der Umsetzung):
//  - § 5 BKrFQG, § 4 BKrFQV: Weiterbildung 35 UE alle 5 Jahre, in Einheiten
//    von mind. 7 UE; alle Kenntnisbereiche der Anlage 1 vertiefen/wiederholen,
//    mind. ein Unterkenntnisbereich aus den Bereichen 1, 2 und 3;
//    mind. eine Einheit zur Straßenverkehrssicherheit.
//  - § 4 Abs. 4 BKrFQV: ADR-Schulung und Tiertransport-Schulung werden jeweils
//    mit 7 UE angerechnet, jeweils nur einmal und nur, wenn nicht älter als
//    5 Jahre.
//  Module & Kenntnisbereiche: DEGENER-Rahmenplan Weiterbildung Runde 3
//  (Gueterkraftverkehr / Personenkraftverkehr), Thema 1-5.
//
//  Einbindung: klinkt sich zur Laufzeit in bkrfqg.js ein (neuer Reiter
//  "Modul-Rechner" im BKrFQG-Menü). bkrfqg.js selbst bleibt unverändert.
//  Muss NACH bkrfqg.js geladen werden.
// ════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── Stammdaten ────────────────────────────────────────────────────
  // Unterkenntnisbereiche Anlage 1 BKrFQV (Kurzbezeichnung).
  // z: 'C' = nur Güterverkehr, 'D' = nur Personenverkehr, '' = beide
  const UKB = [
    { k: '1.1', t: 'Kinematische Kette / optimierte Nutzung', z: '' },
    { k: '1.2', t: 'Sicherheitsausstattung des Fahrzeugs', z: '' },
    { k: '1.3', t: 'Optimierung des Kraftstoffverbrauchs', z: '' },
    { k: '1.3a', t: 'Risiken im Straßenverkehr vorhersehen & bewerten', z: '' },
    { k: '1.4', t: 'Ladung sicher laden (Güter)', z: 'C' },
    { k: '1.5', t: 'Sicherheit & Komfort der Fahrgäste', z: 'D' },
    { k: '1.6', t: 'Ladung sicher laden (Bus)', z: 'D' },
    { k: '2.1', t: 'Sozialvorschriften / Lenk- & Ruhezeiten', z: '' },
    { k: '2.2', t: 'Vorschriften Güterkraftverkehr', z: 'C' },
    { k: '2.3', t: 'Vorschriften Personenverkehr', z: 'D' },
    { k: '3.1', t: 'Risiken Straßenverkehr & Arbeitsunfälle', z: '' },
    { k: '3.2', t: 'Kriminalität / Schleusung vorbeugen', z: '' },
    { k: '3.3', t: 'Gesundheitsschäden vorbeugen', z: '' },
    { k: '3.4', t: 'Körperliche & geistige Verfassung', z: '' },
    { k: '3.5', t: 'Richtiges Verhalten bei Notfällen', z: '' },
    { k: '3.6', t: 'Positives Unternehmensimage', z: '' },
    { k: '3.7', t: 'Wirtschaftl. Umfeld Güterverkehr', z: 'C' },
    { k: '3.8', t: 'Wirtschaftl. Umfeld Personenverkehr', z: 'D' },
  ];
  // Unterkenntnisbereiche mit Bezug zur Straßenverkehrssicherheit
  // (Annahme für die Prüfung "mind. eine Einheit Verkehrssicherheit").
  const SICHERHEIT = ['1.2', '1.3a', '1.4', '1.5', '1.6', '3.1'];

  // Unsere Module = DEGENER Runde 3 (Kenntnisbereiche lt. DEGENER-Rahmenplan).
  // kbC = Gueterkraftverkehr, kbD = Personenkraftverkehr
  const MODULE = [
    { nr: 1, titel: 'Risikobewusstsein und Verhalten', kbC: ['1.3', '1.3a', '3.1'], kbD: ['1.3', '1.3a', '3.1'],
      info: 'Risiken erkennen, vorausschauend & sparsam fahren' },
    { nr: 2, titel: 'Rahmenbedingungen und Ereignisse', kbC: ['1.3a', '1.4'], kbD: ['1.3a', '1.5'],
      info: 'Ladungssicherung (Güter) bzw. Fahrgastsicherheit (Bus)' },
    { nr: 3, titel: 'Gefahrensituationen, Stress und Unfälle', kbC: ['1.2', '2.1', '3.4', '3.5'], kbD: ['1.2', '2.1', '3.4', '3.5'],
      info: 'Sicherheitstechnik, Sozialvorschriften, Stress, Notfall' },
    { nr: 4, titel: 'Firma – Fahrer – Fahrzeug', kbC: ['2.1', '2.2', '3.6', '3.7'], kbD: ['2.1', '2.2', '3.6', '3.7', '3.8'],
      info: 'Image, Wirtschaft, Unternehmen, Vorschriften' },
    { nr: 5, titel: 'Recht und Dokumente', kbC: ['2.2'], kbD: ['2.3'],
      info: 'Güterkraftverkehr (5G) bzw. Personenkraftverkehr (5P)' },
  ];
  // Kenntnisbereiche eines Moduls je nach gewaehlter Verkehrsart
  function kbVon(m) {
    if (S.art === 'C') return m.kbC;
    if (S.art === 'D') return m.kbD;
    return [...new Set(m.kbC.concat(m.kbD))];
  }
  const UE_JE_MODUL = 7;
  const UE_GESAMT = 35;

  // ── Zustand (nur im Speicher, wird beim Neuladen geleert) ──────────
  const S = {
    art: 'C',            // 'C' | 'D' | 'CD'
    ablauf: '',          // Ablauf Schlüsselzahl 95 (JJJJ-MM-TT) oder leer
    eigene: {},          // nr -> { an:true, datum:'' }
    adr: { an: false, datum: '' },
    tier: { an: false, datum: '' },
    extern: [],          // { titel, datum, ue, kb:[] }
  };

  // ── Hilfen ────────────────────────────────────────────────────────
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const heute = () => new Date().toISOString().slice(0, 10);
  const plusJahre = (iso, j) => { const d = new Date(iso + 'T12:00:00'); d.setFullYear(d.getFullYear() + j); return d.toISOString().slice(0, 10); };
  const fmtD = iso => iso ? iso.split('-').reverse().join('.') : '';
  const relevant = k => { const u = UKB.find(x => x.k === k); if (!u || !u.z) return true; return S.art === 'CD' || S.art === u.z; };

  // Fünfjahreszeitraum, in dem Schulungen zählen
  function fenster() {
    if (S.ablauf) return { von: plusJahre(S.ablauf, -5), bis: S.ablauf, quelle: 'Ablauf Schlüsselzahl 95' };
    return { von: plusJahre(heute(), -5), bis: plusJahre(heute(), 5), quelle: 'letzte 5 Jahre (kein Ablaufdatum angegeben)' };
  }
  // null = kein Datum (zählt, mit Hinweis), true/false = im Zeitraum?
  function imFenster(datum) {
    if (!datum) return null;
    const f = fenster();
    return datum >= f.von && datum <= f.bis;
  }

  // ── Auswertung ────────────────────────────────────────────────────
  function auswerten() {
    const f = fenster();
    const posten = [];      // was angerechnet wird
    const hinweise = [];
    const abgedeckt = new Set();

    MODULE.forEach(m => {
      const e = S.eigene[m.nr];
      if (!e || !e.an) return;
      const ok = imFenster(e.datum);
      if (ok === false) { hinweise.push(`Modul ${m.nr} (${fmtD(e.datum)}) liegt außerhalb des Zeitraums und zählt nicht.`); return; }
      if (ok === null) hinweise.push(`Modul ${m.nr}: kein Datum angegeben – bitte prüfen, ob es im Zeitraum liegt.`);
      posten.push({ was: `Modul ${m.nr} – ${m.titel}`, ue: UE_JE_MODUL, kb: kbVon(m) });
      kbVon(m).forEach(k => abgedeckt.add(k));
    });

    [['adr', 'ADR-Schulung (Gefahrgut)'], ['tier', 'Tiertransport-Schulung']].forEach(([key, name]) => {
      const x = S[key];
      if (!x.an) return;
      if (x.datum) {
        const alt = x.datum < plusJahre(S.ablauf || heute(), -5);
        if (alt) { hinweise.push(`${name} vom ${fmtD(x.datum)} ist älter als 5 Jahre und wird nicht angerechnet.`); return; }
      } else {
        hinweise.push(`${name}: kein Datum angegeben – Anrechnung nur, wenn nicht älter als 5 Jahre.`);
      }
      posten.push({ was: name + ' (Anrechnung § 4 Abs. 4 BKrFQV)', ue: UE_JE_MODUL, kb: [] });
    });

    S.extern.forEach((x, i) => {
      const name = x.titel ? `Extern: ${x.titel}` : `Externe Schulung ${i + 1}`;
      const ok = imFenster(x.datum);
      if (ok === false) { hinweise.push(`${name} (${fmtD(x.datum)}) liegt außerhalb des Zeitraums und zählt nicht.`); return; }
      if (ok === null) hinweise.push(`${name}: kein Datum angegeben.`);
      const ue = Math.max(0, Math.min(35, parseInt(x.ue, 10) || 0));
      if (ue && ue < 7) hinweise.push(`${name}: weniger als 7 UE – Weiterbildungseinheiten müssen mind. 7 UE umfassen.`);
      if (!x.kb.length) hinweise.push(`${name}: keine Kenntnisbereiche angekreuzt – bitte die Teilnahmebescheinigung prüfen.`);
      posten.push({ was: name, ue, kb: x.kb.slice() });
      x.kb.forEach(k => abgedeckt.add(k));
      // Gleiche Inhalte wie eines unserer Module?
      const gleich = MODULE.find(m => x.kb.length && kbVon(m).every(k => x.kb.includes(k)) && x.kb.every(k => kbVon(m).includes(k)));
      if (gleich) hinweise.push(`${name} deckt dieselben Kenntnisbereiche ab wie unser Modul ${gleich.nr} – Modul ${gleich.nr} bringt inhaltlich nichts Neues.`);
    });

    const ueIst = posten.reduce((s, p) => s + p.ue, 0);
    const ueFehlt = Math.max(0, UE_GESAMT - ueIst);
    const anzahl = Math.ceil(ueFehlt / UE_JE_MODUL);

    // Empfehlung: die fehlenden Module so wählen, dass möglichst viel
    // Neues dazukommt und die Pflichtvorgaben erfüllt werden.
    const besucht = new Set(MODULE.filter(m => S.eigene[m.nr] && S.eigene[m.nr].an && imFenster(S.eigene[m.nr].datum) !== false).map(m => m.nr));
    let kandidaten = MODULE.filter(m => !besucht.has(m.nr));
    const plan = new Set(abgedeckt);
    const empfehlung = [];
    for (let n = 0; n < anzahl && kandidaten.length; n++) {
      const bereichFehlt = b => ![...plan].some(k => k[0] === b && relevant(k));
      const sicherFehlt = !SICHERHEIT.some(k => plan.has(k) && relevant(k));
      let best = null;
      kandidaten.forEach(m => {
        const neu = kbVon(m).filter(k => relevant(k) && !plan.has(k));
        let score = neu.length * 2;
        ['1', '2', '3'].forEach(b => { if (bereichFehlt(b) && kbVon(m).some(k => k[0] === b && relevant(k))) score += 10; });
        if (sicherFehlt && kbVon(m).some(k => SICHERHEIT.includes(k) && relevant(k))) score += 6;
        score -= m.nr * 0.01; // bei Gleichstand: kleinere Nummer zuerst
        if (!best || score > best.score) best = { m, score, neu };
      });
      const gruende = [];
      ['1', '2', '3'].forEach(b => { if (bereichFehlt(b) && kbVon(best.m).some(k => k[0] === b && relevant(k))) gruende.push(`schließt Lücke im Bereich ${b}`); });
      if (sicherFehlt && kbVon(best.m).some(k => SICHERHEIT.includes(k))) gruende.push('deckt Verkehrssicherheit ab');
      if (best.neu.length) gruende.push('neu: KB ' + best.neu.join(', '));
      else gruende.push('Wiederholung bekannter Kenntnisbereiche (zulässig, bringt aber inhaltlich wenig Neues)');
      empfehlung.push({ m: best.m, gruende });
      kbVon(best.m).forEach(k => plan.add(k));
      kandidaten = kandidaten.filter(m => m !== best.m);
    }
    if (anzahl > empfehlung.length) {
      hinweise.push(`Es fehlen noch ${anzahl - empfehlung.length} Einheit(en), die nicht mit unseren Modulen gedeckt werden können (alle 5 bereits besucht) – bitte Einzelfall prüfen.`);
    }

    // Pflichtprüfung nach Abschluss der Empfehlung
    const endeBereich = b => [...plan].some(k => k[0] === b && relevant(k));
    const pflicht = [
      { txt: '35 UE insgesamt', ok: ueIst + empfehlung.length * UE_JE_MODUL >= UE_GESAMT },
      { txt: 'Bereich 1 (Fahrzeug / Ladung / Fahrgäste)', ok: endeBereich('1') },
      { txt: 'Bereich 2 (Vorschriften)', ok: endeBereich('2') },
      { txt: 'Bereich 3 (Gesundheit, Sicherheit, Umfeld)', ok: endeBereich('3') },
      { txt: 'Verkehrssicherheit', ok: SICHERHEIT.some(k => plan.has(k) && relevant(k)) },
    ];

    return { f, posten, ueIst, ueFehlt, anzahl, empfehlung, hinweise, abgedeckt, plan, pflicht };
  }

  // ── Darstellung ───────────────────────────────────────────────────
  let root = null;

  function render(el) {
    root = el;
    el.innerHTML = `
      <div class="toolbar" style="margin-bottom:14px;justify-content:space-between">
        <div style="display:flex;flex-direction:column;gap:2px">
          <div style="font-size:16px;font-weight:700;color:var(--dunkel)">BKF-Modul-Rechner</div>
          <div style="font-size:12px;color:var(--grau)">Vorhandene Schulungen eintragen – rechts steht sofort, welche Module noch fehlen.</div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-outline btn-sm" id="bkr-kopieren">Ergebnis kopieren</button>
          <button class="btn btn-outline btn-sm" id="bkr-reset">Neu</button>
        </div>
      </div>
      <div class="bkr-grid">
        <div class="bkr-eingabe"></div>
        <div class="bkr-ergebnis"></div>
      </div>
      <style>
        .bkr-grid{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(300px,1fr);gap:16px;align-items:start}
        @media(max-width:1100px){.bkr-grid{grid-template-columns:1fr}}
        .bkr-ergebnis{position:sticky;top:130px}
        .bkr-sec{padding:14px 16px;margin-bottom:12px}
        .bkr-h{font-size:12px;font-weight:800;color:#697586;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px}
        .bkr-row{display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #EEF1F4}
        .bkr-row:last-child{border-bottom:none}
        .bkr-row label{display:flex;align-items:center;gap:10px;flex:1;min-width:0;cursor:pointer}
        .bkr-t{font-size:13.5px;font-weight:700;color:var(--dunkel)}
        .bkr-s{font-size:11.5px;color:var(--grau)}
        .bkr-row input[type=date]{width:150px;padding:5px 8px;border:1px solid #D5DAE0;border-radius:10px;font-size:13px}
        .bkr-seg{display:inline-flex;border:1px solid #DFE3E8;border-radius:10px;overflow:hidden}
        .bkr-seg button{border:none;background:#fff;padding:7px 14px;font-size:13px;font-weight:700;color:#535C67;cursor:pointer}
        .bkr-seg button.on{background:var(--rot);color:#fff}
        .bkr-kb{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:4px 12px;margin-top:8px}
        .bkr-kb label{display:flex;align-items:center;gap:6px;font-size:12px;color:#3F4650;cursor:pointer}
        .bkr-kb input{width:16px;height:16px;min-width:16px}
        .bkr-ext{border:1px solid #E7EAEE;border-radius:12px;padding:10px 12px;margin-bottom:8px;background:#FAFBFC}
        .bkr-ext input[type=text],.bkr-ext input[type=number]{padding:5px 8px;border:1px solid #D5DAE0;border-radius:10px;font-size:13px}
        .bkr-big{font-size:28px;font-weight:900;color:var(--dunkel);line-height:1}
        .bkr-bar{height:6px;background:#EEF1F4;border-radius:4px;overflow:hidden;margin:10px 0 4px}
        .bkr-bar>div{height:100%;background:#197341}
        .bkr-mod{display:flex;gap:10px;align-items:flex-start;padding:9px 10px;border:1px solid #F1CDD1;background:#FBEAEC;border-radius:12px;margin-bottom:6px}
        .bkr-nr{flex:0 0 28px;height:28px;border-radius:8px;background:var(--rot);color:#fff;font-weight:900;display:flex;align-items:center;justify-content:center}
        .bkr-chip{display:inline-block;font-size:11px;font-weight:700;padding:2px 7px;border-radius:999px;margin:2px 3px 0 0;background:#EEF1F4;color:#68717D}
        .bkr-chip.ok{background:#E4F4EA;color:#197341}
        .bkr-chip.neu{background:#FBEAEC;color:#9F1722}
        .bkr-p{display:flex;align-items:center;gap:8px;font-size:12.5px;padding:3px 0}
        .bkr-dot{width:8px;height:8px;border-radius:50%;flex:0 0 8px}
        .bkr-note{font-size:12px;color:#8A5A00;background:#FFF7E6;border:1px solid #F5DDA6;border-radius:10px;padding:7px 10px;margin-top:6px}
      </style>`;
    el.querySelector('#bkr-reset').onclick = () => {
      S.art = 'C'; S.ablauf = ''; S.eigene = {}; S.adr = { an: false, datum: '' }; S.tier = { an: false, datum: '' }; S.extern = [];
      renderEingabe(); renderErgebnis();
    };
    el.querySelector('#bkr-kopieren').onclick = kopieren;
    renderEingabe();
    renderErgebnis();
  }

  function renderEingabe() {
    const box = root.querySelector('.bkr-eingabe');
    const seg = (v, l) => `<button type="button" data-art="${v}" class="${S.art === v ? 'on' : ''}">${l}</button>`;
    box.innerHTML = `
      <div class="card bkr-sec">
        <div class="bkr-h">Teilnehmer</div>
        <div class="bkr-row">
          <div style="flex:1"><div class="bkr-t">Fahrerlaubnis / Verkehrsart</div><div class="bkr-s">steuert, welche Kenntnisbereiche relevant sind</div></div>
          <div class="bkr-seg">${seg('C', 'Güter (C)')}${seg('D', 'Personen (D)')}${seg('CD', 'Beides')}</div>
        </div>
        <div class="bkr-row">
          <div style="flex:1"><div class="bkr-t">Ablauf Schlüsselzahl 95</div><div class="bkr-s">optional – legt den 5-Jahres-Zeitraum fest</div></div>
          <input type="date" id="bkr-ablauf" value="${esc(S.ablauf)}">
        </div>
      </div>

      <div class="card bkr-sec">
        <div class="bkr-h">Bei uns besucht (DEGENER Runde 3)</div>
        ${MODULE.map(m => {
          const e = S.eigene[m.nr] || {};
          return `<div class="bkr-row">
            <label><input type="checkbox" data-mod="${m.nr}" ${e.an ? 'checked' : ''}>
              <span><span class="bkr-t">Modul ${m.nr} – ${esc(m.titel)}</span><br>
              <span class="bkr-s">KB ${kbVon(m).join(', ')} · ${esc(m.info)}</span></span></label>
            <input type="date" data-moddatum="${m.nr}" value="${esc(e.datum || '')}" ${e.an ? '' : 'disabled'}>
          </div>`;
        }).join('')}
      </div>

      <div class="card bkr-sec">
        <div class="bkr-h">Anrechenbare Sonderschulungen (je 7 UE, max. 5 Jahre alt)</div>
        ${[['adr', 'ADR-Schulung (Gefahrgut)', 'Basis-, Aufbau- oder Auffrischungskurs'], ['tier', 'Tiertransport-Schulung', 'Befähigungsnachweis Tiertransport']].map(([k, t, s]) => `
          <div class="bkr-row">
            <label><input type="checkbox" data-sonder="${k}" ${S[k].an ? 'checked' : ''}>
              <span><span class="bkr-t">${t}</span><br><span class="bkr-s">${s}</span></span></label>
            <input type="date" data-sonderdatum="${k}" value="${esc(S[k].datum)}" ${S[k].an ? '' : 'disabled'}>
          </div>`).join('')}
      </div>

      <div class="card bkr-sec">
        <div class="bkr-h" style="display:flex;justify-content:space-between;align-items:center">
          <span>Externe Weiterbildungen</span>
          <button class="btn btn-outline btn-sm" id="bkr-ext-neu">+ Externe Schulung</button>
        </div>
        ${S.extern.length ? '' : '<div class="bkr-s">Keine. Bei externen Anbietern die Kenntnisbereiche von der Teilnahmebescheinigung ankreuzen.</div>'}
        ${S.extern.map((x, i) => `
          <div class="bkr-ext">
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              <input type="text" data-ext="${i}" data-f="titel" placeholder="Anbieter / Thema" value="${esc(x.titel)}" style="flex:1;min-width:160px">
              <input type="date" data-ext="${i}" data-f="datum" value="${esc(x.datum)}">
              <input type="number" data-ext="${i}" data-f="ue" min="1" max="35" value="${esc(x.ue)}" style="width:70px" title="Unterrichtseinheiten"> <span class="bkr-s">UE</span>
              <button class="btn btn-danger btn-sm" data-extdel="${i}" title="Entfernen">✕</button>
            </div>
            <div class="bkr-kb">
              ${UKB.filter(u => relevant(u.k)).map(u => `<label><input type="checkbox" data-extkb="${i}" value="${u.k}" ${x.kb.includes(u.k) ? 'checked' : ''}> <b>${u.k}</b> ${esc(u.t)}</label>`).join('')}
            </div>
          </div>`).join('')}
      </div>`;

    // Ereignisse
    box.querySelectorAll('[data-art]').forEach(b => b.onclick = () => { S.art = b.dataset.art; renderEingabe(); renderErgebnis(); });
    box.querySelector('#bkr-ablauf').onchange = e => { S.ablauf = e.target.value; renderErgebnis(); };
    box.querySelectorAll('[data-mod]').forEach(c => c.onchange = () => {
      const nr = c.dataset.mod; S.eigene[nr] = S.eigene[nr] || { datum: '' }; S.eigene[nr].an = c.checked;
      const d = box.querySelector(`[data-moddatum="${nr}"]`); d.disabled = !c.checked; renderErgebnis();
    });
    box.querySelectorAll('[data-moddatum]').forEach(d => d.onchange = () => { const nr = d.dataset.moddatum; S.eigene[nr] = S.eigene[nr] || { an: true }; S.eigene[nr].datum = d.value; renderErgebnis(); });
    box.querySelectorAll('[data-sonder]').forEach(c => c.onchange = () => {
      const k = c.dataset.sonder; S[k].an = c.checked; box.querySelector(`[data-sonderdatum="${k}"]`).disabled = !c.checked; renderErgebnis();
    });
    box.querySelectorAll('[data-sonderdatum]').forEach(d => d.onchange = () => { S[d.dataset.sonderdatum].datum = d.value; renderErgebnis(); });
    box.querySelector('#bkr-ext-neu').onclick = () => { S.extern.push({ titel: '', datum: '', ue: 7, kb: [] }); renderEingabe(); renderErgebnis(); };
    box.querySelectorAll('[data-ext]').forEach(inp => inp.oninput = () => { S.extern[inp.dataset.ext][inp.dataset.f] = inp.value; renderErgebnis(); });
    box.querySelectorAll('[data-extdel]').forEach(b => b.onclick = () => { S.extern.splice(+b.dataset.extdel, 1); renderEingabe(); renderErgebnis(); });
    box.querySelectorAll('[data-extkb]').forEach(c => c.onchange = () => {
      const x = S.extern[c.dataset.extkb];
      x.kb = c.checked ? [...new Set(x.kb.concat(c.value))] : x.kb.filter(k => k !== c.value);
      renderErgebnis();
    });
  }

  function renderErgebnis() {
    const box = root.querySelector('.bkr-ergebnis');
    const r = auswerten();
    const pct = Math.min(100, Math.round(r.ueIst / UE_GESAMT * 100));
    const kbChips = UKB.filter(u => relevant(u.k)).map(u => {
      const cls = r.abgedeckt.has(u.k) ? 'ok' : (r.plan.has(u.k) ? 'neu' : '');
      return `<span class="bkr-chip ${cls}" title="${esc(u.t)}">${u.k}</span>`;
    }).join('');
    box.innerHTML = `
      <div class="card bkr-sec">
        <div class="bkr-h">Ergebnis</div>
        <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:12px">
          <div>
            <div class="bkr-big">${r.anzahl === 0 ? 'Fertig' : r.anzahl + (r.anzahl === 1 ? ' Modul' : ' Module')}</div>
            <div class="bkr-s" style="margin-top:4px">${r.anzahl === 0 ? '35 UE sind erreicht' : 'fehlen noch (' + r.ueFehlt + ' UE)'}</div>
          </div>
          <div style="text-align:right"><div class="bkr-t">${r.ueIst} / 35 UE</div><div class="bkr-s">angerechnet</div></div>
        </div>
        <div class="bkr-bar"><div style="width:${pct}%"></div></div>
        <div class="bkr-s">Zeitraum: ${fmtD(r.f.von)} – ${fmtD(r.f.bis)} · ${esc(r.f.quelle)}</div>
      </div>

      ${r.empfehlung.length ? `
      <div class="card bkr-sec">
        <div class="bkr-h">Empfehlung – diese Module buchen</div>
        ${r.empfehlung.map(e => `
          <div class="bkr-mod">
            <div class="bkr-nr">${e.m.nr}</div>
            <div><div class="bkr-t">Modul ${e.m.nr} – ${esc(e.m.titel)}</div>
            <div class="bkr-s">${esc(e.gruende.join(' · '))}</div></div>
          </div>`).join('')}
      </div>` : ''}

      <div class="card bkr-sec">
        <div class="bkr-h">Pflichtvorgaben nach Buchung</div>
        ${r.pflicht.map(p => `<div class="bkr-p"><span class="bkr-dot" style="background:${p.ok ? '#197341' : '#C51D2A'}"></span>${esc(p.txt)}<span style="margin-left:auto;font-weight:700;color:${p.ok ? '#197341' : '#C51D2A'}">${p.ok ? 'erfüllt' : 'offen'}</span></div>`).join('')}
        <div style="margin-top:10px" class="bkr-s">Kenntnisbereiche: <span class="bkr-chip ok">vorhanden</span><span class="bkr-chip neu">durch Empfehlung</span><span class="bkr-chip">nicht abgedeckt</span></div>
        <div style="margin-top:4px">${kbChips}</div>
      </div>

      ${r.posten.length ? `
      <div class="card bkr-sec">
        <div class="bkr-h">Angerechnet</div>
        ${r.posten.map(p => `<div class="bkr-p">${esc(p.was)}<span style="margin-left:auto;font-weight:700">${p.ue} UE</span></div>`).join('')}
      </div>` : ''}

      ${r.hinweise.map(h => `<div class="bkr-note">${esc(h)}</div>`).join('')}
      <div class="bkr-s" style="margin-top:10px">Grundlage: § 5 BKrFQG, § 4 BKrFQV, Anlage 1 BKrFQV; Module nach DEGENER Runde 3. Unverbindliche Vorabauskunft – maßgeblich sind die Teilnahmebescheinigungen.</div>`;
  }

  function kopieren() {
    const r = auswerten();
    const z = [];
    z.push('BKF-Weiterbildung – Modul-Rechner (' + fmtD(heute()) + ')');
    z.push('Verkehrsart: ' + ({ C: 'Güter (C)', D: 'Personen (D)', CD: 'Güter + Personen' }[S.art]) + (S.ablauf ? ' · Ablauf SZ 95: ' + fmtD(S.ablauf) : ''));
    z.push('Angerechnet: ' + r.ueIst + ' / 35 UE');
    r.posten.forEach(p => z.push('  - ' + p.was + ' (' + p.ue + ' UE)'));
    z.push(r.anzahl ? 'Noch benötigt: ' + r.anzahl + ' Modul(e):' : 'Keine weiteren Module nötig.');
    r.empfehlung.forEach(e => z.push('  → Modul ' + e.m.nr + ' – ' + e.m.titel));
    r.hinweise.forEach(h => z.push('Hinweis: ' + h));
    const txt = z.join('\n');
    const ok = () => { if (typeof toast === 'function') toast('Ergebnis kopiert'); };
    if (navigator.clipboard) navigator.clipboard.writeText(txt).then(ok, () => window.prompt('Text kopieren:', txt));
    else window.prompt('Text kopieren:', txt);
  }

  // Für Tests/Nutzung von außen
  window.bkfRechnerRender = render;
  window.bkfRechnerAuswerten = auswerten;
  window.bkfRechnerState = S;

  // ── Einklinken in das BKrFQG-Modul ─────────────────────────────────
  const ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:20px;flex-shrink:0"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="11" x2="8" y2="11"/><line x1="12" y1="11" x2="12" y2="11"/><line x1="16" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="8" y2="15"/><line x1="12" y1="15" x2="12" y2="15"/><line x1="16" y1="15" x2="16" y2="18"/><line x1="8" y1="18" x2="12" y2="18"/></svg>';

  function einklinken() {
    if (typeof window.bkrfqgRenderTab !== 'function' || typeof window.bkrfqgRenderShell !== 'function') return false;
    if (window.bkrfqgRenderTab.__bkr) return true;
    const origTab = window.bkrfqgRenderTab;
    const origShell = window.bkrfqgRenderShell;
    const neuTab = function (tab) {
      if (tab === 'rechner') { const el = document.getElementById('bkrfqg-content'); if (el) render(el); return; }
      return origTab.apply(this, arguments);
    };
    neuTab.__bkr = true;
    window.bkrfqgRenderTab = neuTab;
    window.bkrfqgRenderShell = function (view) {
      const r = origShell.apply(this, arguments);
      try {
        const nach = view.querySelector('.mod-side-btn[data-btab="dokumente"]');
        if (nach && !view.querySelector('.mod-side-btn[data-btab="rechner"]')) {
          const b = document.createElement('button');
          b.className = 'mod-side-btn';
          b.dataset.btab = 'rechner';
          b.setAttribute('onclick', "bkrfqgSetTab('rechner')");
          b.innerHTML = ICON + '<span class="mod-lbl">Modul-Rechner</span>';
          nach.after(b);
          const aktiv = view.querySelector('.mod-side-btn.active');
          if (!aktiv && document.querySelector('#bkrfqg-content .bkr-grid')) b.classList.add('active');
        }
      } catch (e) { console.warn('BKF-Rechner: Menüpunkt konnte nicht eingefügt werden', e); }
      return r;
    };
    // Falls das Modul schon angezeigt wird: Menü einmal neu aufbauen
    const v = document.getElementById('view-bkrfqg');
    if (v && v.querySelector('.mod-shell') && !v.querySelector('[data-btab="rechner"]')) {
      try { window.bkrfqgRenderShell(v); } catch (e) { /* ignorieren */ }
    }
    return true;
  }
  if (!einklinken()) {
    let n = 0;
    const t = setInterval(() => { if (einklinken() || ++n > 50) clearInterval(t); }, 200);
  }
})();
