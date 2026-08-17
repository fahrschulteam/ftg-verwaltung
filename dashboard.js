// ════════════════════════════════════════════════════════════════════
//  MODUL DASHBOARD
// ════════════════════════════════════════════════════════════════════

const DASH_WARN_TAGE = 90;
const DASH_ROT_TAGE  = 30;

function dashAmpel(datumStr) {
  if (!datumStr) return null;
  const heute = new Date(); heute.setHours(0,0,0,0);
  const tage = Math.round((new Date(datumStr) - heute) / 86400000);
  if (tage < 0)               return { tage, farbe:'#991B1B', bg:'#FEF2F2', label:`${Math.abs(tage)} T überfällig` };
  if (tage <= DASH_ROT_TAGE)  return { tage, farbe:'#C0001A', bg:'#FFF0F1', label:`in ${tage} T` };
  if (tage <= DASH_WARN_TAGE) return { tage, farbe:'#D97706', bg:'#FFFBEB', label:`in ${tage} T` };
  return                             { tage, farbe:'#166534', bg:'#F0FDF4', label:`in ${tage} T` };
}
function dashAmpelJahr(j) { return j ? dashAmpel(`${j}-12-31`) : null; }
function dashFmt(d)        { return d ? new Date(d).toLocaleDateString('de-DE') : '–'; }

// Telefonnummer → WhatsApp-Format (49...)
function normTel(raw) {
  if (!raw) return null;
  let n = raw.replace(/[^\d+]/g, '');
  if (n.startsWith('+'))  n = n.slice(1);
  if (n.startsWith('00')) n = n.slice(2);
  if (n.startsWith('0'))  n = '49' + n.slice(1);
  return n.length >= 10 ? n : null;
}
function waLink(tel) {
  const n = normTel(tel);
  return n ? `https://wa.me/${n}` : null;
}

function kontaktIcons(m) {
  const wa   = m.telefon ? waLink(m.telefon) : null;
  const mail = m.email   ? `mailto:${m.email}` : null;
  let html = `<div style="display:flex;gap:4px;flex-shrink:0;align-items:center">`;
  if (wa)   html += `<a href="${wa}" target="_blank" title="WhatsApp: ${m.telefon}"
    onclick="event.stopPropagation()"
    style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;
    border-radius:6px;background:#25D366;color:#fff;font-size:13px;text-decoration:none">💬</a>`;
  if (mail) html += `<a href="${mail}" title="E-Mail: ${m.email}"
    onclick="event.stopPropagation()"
    style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;
    border-radius:6px;background:#2A6CAE;color:#fff;font-size:13px;text-decoration:none">✉</a>`;
  if (!wa && !mail) html += `<span style="font-size:10px;color:var(--grau)">–</span>`;
  html += `</div>`;
  return html;
}

// ── Rundruf-Modal ──
function oeffneRundruf(mitarbeiter) {
  const mailListe = mitarbeiter.filter(m => m.email).map(m => m.email);
  const telListe  = mitarbeiter.filter(m => m.telefon);
  const mailHref  = mailListe.length
    ? `mailto:?bcc=${encodeURIComponent(mailListe.join(','))}&subject=${encodeURIComponent((window.einstState&&window.einstState.firma&&window.einstState.firma.name)||'Fahrschulteam Lingen')}`
    : null;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.id = 'rundruf-modal';
  modal.innerHTML = `
    <div class="modal" style="width:min(580px,96vw)">
      <div class="modal-header">
        <h3>📣 Rundruf – alle Mitarbeiter</h3>
        <button class="close-btn" onclick="document.getElementById('rundruf-modal').remove()">✕</button>
      </div>
      <div class="modal-body" style="padding:20px">
        <div style="margin-bottom:20px">
          <div style="font-size:11px;font-weight:700;color:var(--blau);text-transform:uppercase;
            letter-spacing:.06em;margin-bottom:10px;border-bottom:1px solid var(--border);padding-bottom:4px">
            ✉ E-Mail an alle (BCC)
          </div>
          ${mailHref
            ? `<a href="${mailHref}"
                style="display:inline-flex;align-items:center;gap:8px;background:#2A6CAE;color:#fff;
                padding:9px 18px;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none">
                ✉ Outlook öffnen
                <span style="font-size:11px;opacity:.8">(${mailListe.length} Empfänger im BCC)</span>
              </a>
              <div style="font-size:11px;color:var(--grau);margin-top:6px">
                ${mailListe.join(' · ')}
              </div>`
            : `<div style="font-size:12px;color:var(--grau)">Keine E-Mail-Adressen hinterlegt.</div>`}
        </div>
        <div>
          <div style="font-size:11px;font-weight:700;color:var(--blau);text-transform:uppercase;
            letter-spacing:.06em;margin-bottom:8px;border-bottom:1px solid var(--border);padding-bottom:4px">
            💬 WhatsApp – Einzelkontakte
          </div>
          <div style="font-size:11px;color:var(--grau);margin-bottom:10px">
            WhatsApp-Gruppen lassen sich nicht per Link erstellen. Jeden direkt anschreiben:
          </div>
          ${telListe.length ? telListe.map(m => {
            const wa = waLink(m.telefon);
            return `<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border)">
              <div style="flex:1;min-width:0">
                <div style="font-size:13px;font-weight:600">${m.nachname}, ${m.vorname}</div>
                <div style="font-size:11px;color:var(--grau)">${m.telefon}</div>
              </div>
              ${wa
                ? `<a href="${wa}" target="_blank"
                    style="display:inline-flex;align-items:center;gap:6px;background:#25D366;color:#fff;
                    padding:6px 12px;border-radius:7px;font-size:12px;font-weight:700;text-decoration:none">
                    💬 WhatsApp</a>`
                : `<span style="font-size:11px;color:var(--grau)">Nr. nicht verwertbar</span>`}
            </div>`;
          }).join('')
          : `<div style="font-size:12px;color:var(--grau)">Keine Telefonnummern hinterlegt.</div>`}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="document.getElementById('rundruf-modal').remove()">Schließen</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

// ── Haupt-Render ──
window.renderDashboard = async function() {
  const view = document.getElementById('view-dashboard');
  view.innerHTML = '<div class="loading"><div class="spinner"></div>Lade Dashboard …</div>';

  const [
    { data: todos },
    { data: mitarbeiter },
    { data: fortbildungen },
    { data: fahrzeuge }
  ] = await Promise.all([
    sb.from('todos')
      .select('id,titel,erledigt,faellig_am,prioritaet,zugewiesen_an,ersteller_id')
      .or(`zugewiesen_an.eq.${currentUser.id},ersteller_id.eq.${currentUser.id}`)
      .eq('erledigt', false)
      .order('faellig_am', { ascending:true, nullsFirst:false }),
    sb.from('mitarbeiter')
      .select('id,vorname,nachname,bereich,frist_fahrlg,frist_bkf,telefon,email,qual_asf,qual_fes,qual_ausb,qual_bkf')
      .eq('status','aktiv'),
    sb.from('fortbildungen').select('*').order('datum'),
    sb.from('fahrzeuge')
      .select('id,kennzeichen,marke,modell,haltung,bestand_bis')
      .eq('status','aktiv')
      .in('haltung',['leasing','finanzierung'])
  ]);

  const heute = new Date(); heute.setHours(0,0,0,0);

  // ── Leasing/Finanzierung: Hinweis ab 9 Monate (270 Tage) vor Vertragsende ──
  const fzVertragsende = (fahrzeuge||[])
    .filter(v => v.bestand_bis)
    .map(v => ({ ...v, ampel: dashAmpel(v.bestand_bis) }))
    .filter(v => v.ampel && v.ampel.tage <= 270)
    .sort((a,b) => a.ampel.tage - b.ampel.tage);
  const todosMeins    = (todos||[]).filter(t => t.zugewiesen_an === currentUser.id);
  const todosVergeben = (todos||[]).filter(t => t.ersteller_id === currentUser.id && t.zugewiesen_an !== currentUser.id);
  const todosUeberfaellig = todosMeins.filter(t => t.faellig_am && new Date(t.faellig_am) < heute).length;

  // ── Schnellkontakt-Pool ──
  const alleMA = (mitarbeiter||[]).filter(m => !['sonstige','aushilfe'].includes(m.bereich));
  window._dashMitarbeiter = alleMA;

  // ── Fortbildungen berechnen (nutzt fortbildungsStatus aus fortbildung.js) ──
  const fbs = fortbildungen || [];
  const flAlle = []; // { m, pflichtName, para, tageVorhanden, tageSoll, restTage, ampel, fristJahr }

  (mitarbeiter||[])
    .filter(m => m.bereich === 'fahrlehrer' || m.frist_fahrlg || m.frist_bkf)
    .forEach(m => {
      if (typeof fortbildungsStatus !== 'function') return;
      const status = fortbildungsStatus(m, fbs);
      (status.ergebnisse || []).forEach(e => {
        if (!e.fristEnde) return;
        const fristJahr = e.fristEnde.getFullYear();
        const ampel = dashAmpelJahr(fristJahr);
        if (!ampel) return;
        // Kurzform des §-Bezugs aus dem Pflicht-Namen
        const paraMatch = e.pflicht.name.match(/\(([^)]+)\)/);
        const para = paraMatch ? paraMatch[1] : e.pflicht.id;
        flAlle.push({
          m,
          pflichtName: e.pflicht.name,
          para,
          tageVorhanden: e.tageVorhanden,
          tageSoll: e.tageSoll,
          restTage: e.restTage,
          erfuellt: e.erfuellt,
          status: e.status,
          fristJahr,
          ampel,
          // Sortiergewicht: überschritten < im_rahmen < naechster_ok
          gewicht: { ueberschritten:0, im_rahmen:1, unbekannt:1, naechster_ok:2 }[e.status] ?? 1,
        });
      });
    });
  // Aufsteigend nach Ampel-Dringlichkeit (rot zuerst), dann nach Name
  flAlle.sort((a,b) => a.gewicht - b.gewicht || a.ampel.tage - b.ampel.tage);
  // Nur offene Pflichten anzeigen, die in ≤180 Tagen fällig oder bereits überfällig sind
  const flZeilen = flAlle.filter(z => !z.erfuellt && z.status !== 'naechster_ok' && z.ampel.tage <= 180);

  // ── Render-Helfer ──
  function todoRow(t) {
    const prio    = {niedrig:'#6B7280',normal:'#2A6CAE',hoch:'#C0001A'}[t.prioritaet]||'#6B7280';
    const ueberf  = t.faellig_am && new Date(t.faellig_am) < heute;
    return `<div class="dash-row" onclick="showView('todos')" style="cursor:pointer">
      <span style="width:8px;height:8px;border-radius:50%;background:${prio};flex-shrink:0;
        display:inline-block;margin-right:8px;margin-top:5px"></span>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.titel}</div>
        ${t.faellig_am
          ? `<div style="font-size:11px;color:${ueberf?'#C0001A':'var(--grau)'};margin-top:1px">
               ${ueberf?'⚠ ':''}Fällig: ${dashFmt(t.faellig_am)}</div>` : ''}
      </div>
    </div>`;
  }

  function fortbildungRow(z) {
    // Fortschrittsbalken
    const pct = z.tageSoll > 0 ? Math.min(100, Math.round(z.tageVorhanden / z.tageSoll * 100)) : 0;
    const balkenFarbe = z.status === 'ueberschritten' ? '#991B1B'
                      : z.status === 'naechster_ok'   ? '#166534'
                      : z.restTage === 0              ? '#166534'
                      : z.ampel.farbe;
    const statusText = z.status === 'ueberschritten'  ? 'Frist überschritten'
                     : z.status === 'naechster_ok'    ? 'Nächster Zyklus ✓'
                     : z.erfuellt                     ? 'Erfüllt ✓'
                     : `noch ${z.restTage} Tag${z.restTage!==1?'e':''} fehlen`;

    return `<div class="dash-row" style="background:${z.ampel.bg};flex-direction:column;gap:0;padding:10px 16px">
      <div style="display:flex;align-items:center;gap:8px;width:100%">
        <span style="display:inline-block;width:9px;height:9px;border-radius:50%;
          background:${z.ampel.farbe};flex-shrink:0"></span>
        <div style="flex:1;min-width:0">
          <span style="font-size:13px;font-weight:600">${z.m.nachname}, ${z.m.vorname}</span>
          <span style="font-size:11px;color:var(--grau);margin-left:6px">${z.para}</span>
        </div>
        <span style="font-size:11px;font-weight:700;color:${z.ampel.farbe};white-space:nowrap;margin-left:6px">
          bis 31.12.${z.fristJahr}</span>
        ${kontaktIcons(z.m)}
      </div>
      <div style="margin-top:7px;padding-left:17px">
        <!-- Fortschrittsbalken -->
        <div style="display:flex;align-items:center;gap:8px">
          <div style="flex:1;height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${balkenFarbe};border-radius:3px;transition:width .3s"></div>
          </div>
          <span style="font-size:11px;font-weight:700;color:${balkenFarbe};white-space:nowrap;min-width:54px;text-align:right">
            ${z.tageVorhanden}/${z.tageSoll} Tag${z.tageSoll!==1?'e':''}
          </span>
        </div>
        <div style="font-size:10px;color:${balkenFarbe};margin-top:2px;font-weight:600">${statusText}</div>
      </div>
    </div>`;
  }

  function kpiCard(ico, titel, haupt, sub, bg, ziel) {
    return `<div class="card dash-kpi" style="background:${bg};cursor:pointer" onclick="showView('${ziel}')">
      <div style="font-size:22px;margin-bottom:5px">${ico}</div>
      <div style="font-size:10px;font-weight:700;color:var(--grau);text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px">${titel}</div>
      <div style="font-size:20px;font-weight:700;color:var(--dunkel);line-height:1.2">${haupt}</div>
      <div style="font-size:11px;color:var(--grau);margin-top:3px">${sub}</div>
    </div>`;
  }

  const rotTodos = todosUeberfaellig > 0;
  const rotFl    = flZeilen.some(z => z.status === 'ueberschritten' || z.ampel.tage <= DASH_ROT_TAGE);

  view.innerHTML = `
    <div style="max-width:1120px;padding:24px 0 60px">

      <!-- KPI-Kacheln (nur 3: Todos, Fortbildungen, Mitarbeiter) -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px;margin-bottom:24px">
        ${kpiCard('📋','Offene To-Dos', todosMeins.length,
          todosUeberfaellig
            ? `<span style="color:#C0001A;font-weight:700">${todosUeberfaellig} überfällig</span>`
            : 'Alle im Plan',
          rotTodos ? '#FFF0F1' : '#fff', 'todos')}
        ${kpiCard('🎓','Fortbildungen',
          flZeilen.filter(z=>z.status==='ueberschritten').length
            ? flZeilen.filter(z=>z.status==='ueberschritten').length+' überfällig'
            : flZeilen.filter(z=>z.restTage>0&&z.status!=='naechster_ok').length+' offen',
          flZeilen.length+' Pflichten gesamt',
          rotFl ? '#FFF0F1' : '#fff', 'personal')}
        ${kpiCard('👥','Mitarbeiter',
          alleMA.length+' aktiv',
          alleMA.filter(m=>m.email||m.telefon).length+' mit Kontaktdaten',
          '#fff', 'personal')}
      </div>

      <!-- ERSTE REIHE: To-Dos + Schnellkontakt (primäre Karten, volle Breite) -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px">

        <!-- To-Dos (primär, links) -->
        <div class="card" style="padding:0;overflow:hidden">
          <div class="dash-card-head" style="background:#fff0f1">
            <span style="color:var(--rot);font-weight:700">📋 Meine offenen To-Dos</span>
            <button class="btn btn-sm btn-danger" onclick="showView('todos')">Alle →</button>
          </div>
          ${todosMeins.length
            ? todosMeins.slice(0,6).map(todoRow).join('')+
              (todosMeins.length>6
                ? `<div style="padding:8px 16px;font-size:12px;color:var(--grau);text-align:center">+${todosMeins.length-6} weitere</div>`:'')
            : '<div class="dash-empty" style="color:#166534;font-weight:600">✓ Keine offenen To-Dos</div>'}
          ${todosVergeben.length
            ? `<div style="padding:8px 16px 4px;border-top:1px solid var(--border)">
                <div style="font-size:10px;font-weight:700;color:var(--grau);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">
                  Von mir vergeben (${todosVergeben.length})</div>
                ${todosVergeben.slice(0,3).map(todoRow).join('')}
              </div>` : ''}
        </div>

        <!-- Schnellkontakt (primär, rechts) -->
        <div class="card" style="padding:0;overflow:hidden">
          <div class="dash-card-head" style="background:#EFF6FF">
            <span style="color:var(--blau);font-weight:700">📣 Schnellkontakt</span>
          </div>
          <div style="padding:14px 16px">
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
              <button class="btn btn-primary" onclick="oeffneRundruf(window._dashMitarbeiter)">
                📣 Rundruf öffnen
              </button>
              ${alleMA.filter(m=>m.email).length
                ? `<a href="mailto:?bcc=${encodeURIComponent(alleMA.filter(m=>m.email).map(m=>m.email).join(','))}&subject=${encodeURIComponent('Fahrschulteam Lingen')}"
                    style="display:inline-flex;align-items:center;gap:6px;background:#2A6CAE;color:#fff;
                    padding:8px 14px;border-radius:6px;font-size:13px;font-weight:500;text-decoration:none">
                    ✉ Alle per E-Mail (BCC)</a>` : ''}
            </div>
            <div style="border-top:1px solid var(--border);padding-top:10px">
              ${alleMA.slice(0,7).map(m => `
                <div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #f3f4f6">
                  <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#2A6CAE,#1e5a96);color:#fff;
                    display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0">
                    ${(m.vorname[0]||'')+(m.nachname[0]||'')}
                  </div>
                  <div style="flex:1;font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                    ${m.vorname} ${m.nachname}
                  </div>
                  ${kontaktIcons(m)}
                </div>`).join('')}
              ${alleMA.length > 7
                ? `<div style="font-size:11px;color:var(--grau);text-align:center;padding-top:8px;cursor:pointer"
                    onclick="oeffneRundruf(window._dashMitarbeiter)">
                    +${alleMA.length-7} weitere im Rundruf →</div>` : ''}
            </div>
          </div>
        </div>

      </div>

      <!-- Leasing/Finanzierung Vertragsende-Hinweis (nur wenn ≤9 Monate) -->
      ${fzVertragsende.length ? `
      <div class="card" style="padding:0;overflow:hidden;margin-bottom:18px">
        <div class="dash-card-head" style="background:#FFFBEB">
          <span style="color:#D97706;font-weight:700">🚗 Vertragsende Leasing / Finanzierung</span>
          <button class="btn btn-sm" onclick="showView('fuhrpark')">Fuhrpark →</button>
        </div>
        ${fzVertragsende.map(v => `
          <div class="dash-row" style="background:${v.ampel.bg}">
            <span style="display:inline-block;width:9px;height:9px;border-radius:50%;
              background:${v.ampel.farbe};flex-shrink:0;margin-right:8px;margin-top:4px"></span>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600">
                ${v.kennzeichen}${v.marke?' · '+v.marke:''}${v.modell?' '+v.modell:''}
              </div>
              <div style="font-size:11px;color:var(--grau);margin-top:1px">
                ${v.haltung==='leasing'?'Leasing':'Finanzierung'} endet am ${dashFmt(v.bestand_bis)}
              </div>
            </div>
            <span style="font-size:11px;font-weight:700;color:${v.ampel.farbe};white-space:nowrap;margin-left:8px">
              ${v.ampel.label}
            </span>
          </div>`).join('')}
      </div>` : ''}

      <!-- ZWEITE REIHE: Fahrlehrerfortbildungen (volle Breite) -->
      <div class="card" style="padding:0;overflow:hidden">
        <div class="dash-card-head">
          <span>🎓 Fahrlehrerfortbildungen</span>
          <button class="btn btn-sm" onclick="showView('personal')">Personal →</button>
        </div>
        ${flZeilen.length
          ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
               ${flZeilen.map(fortbildungRow).join('')}
             </div>
             ${flZeilen.length === 0
               ? '' : `<div style="padding:8px 16px;font-size:11px;color:var(--grau);border-top:1px solid var(--border)">
               Fortschritt im aktuellen Zyklus. Kontakticons direkt anklickbar.</div>`}`
          : '<div class="dash-empty" style="color:#166534;font-weight:600">✓ Alle Fortbildungspflichten erfüllt</div>'}
      </div>

    </div>`;
};
