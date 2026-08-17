// ════════════════════════════════════════════════════════════════════
//  GLOBALE SUCHE
//  Durchsucht live per Supabase: Mitarbeiter, Fahrzeuge, To-Dos,
//  KVA-Archiv und Schulungs-Teilnehmer (Letztere dank Phase 3 direkt
//  im Hauptprojekt). Ergebnisse gruppiert, Klick springt zum Datensatz.
// ════════════════════════════════════════════════════════════════════

let _gsTimer = null;
let _gsLetzteQuery = '';

function initGlobaleSuche() {
  const slot = document.querySelector('.header-title');
  if (!slot || document.getElementById('gs-input')) return;
  slot.innerHTML = `
    <div id="gs-wrap" style="position:relative;max-width:420px;margin:0 auto">
      <input id="gs-input" type="text" placeholder="🔍 Alles durchsuchen … (Name, Kennzeichen, KVA …)"
        autocomplete="off"
        style="width:100%;padding:8px 14px;border:1px solid var(--border);border-radius:8px;
        font-size:13px;background:var(--hell);outline:none"
        oninput="gsEingabe(this.value)"
        onfocus="if(this.value.length>=2)gsEingabe(this.value)">
      <div id="gs-panel" style="display:none;position:absolute;top:calc(100% + 6px);left:0;right:0;
        background:#fff;border:1px solid var(--border);border-radius:10px;
        box-shadow:0 8px 30px rgba(0,0,0,.14);max-height:70vh;overflow-y:auto;z-index:2000"></div>
    </div>`;
  // Klick außerhalb schließt das Panel
  document.addEventListener('click', e => {
    if (!e.target.closest('#gs-wrap')) gsSchliessen();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') gsSchliessen(); });
}

function gsSchliessen() {
  const p = document.getElementById('gs-panel');
  if (p) p.style.display = 'none';
}

function gsEingabe(wert) {
  clearTimeout(_gsTimer);
  const q = wert.trim();
  if (q.length < 2) { gsSchliessen(); return; }
  _gsTimer = setTimeout(() => gsSuche(q), 300);
}

async function gsSuche(q) {
  _gsLetzteQuery = q;
  const panel = document.getElementById('gs-panel');
  if (!panel) return;
  panel.style.display = 'block';
  panel.innerHTML = '<div style="padding:14px;font-size:13px;color:var(--grau)">Suche …</div>';

  const like = `%${q.replace(/[%_]/g, '')}%`;
  const erlaubt = typeof sichtbareModule === 'function' ? sichtbareModule() : [];

  // Alle Quellen parallel abfragen – jede einzeln abgesichert
  const [ma, fz, td, kva, tn] = await Promise.all([
    erlaubt.includes('personal')
      ? sb.from('mitarbeiter').select('id,vorname,nachname,bereich,telefon,email')
          .or(`vorname.ilike.${like},nachname.ilike.${like},email.ilike.${like},telefon.ilike.${like}`)
          .limit(6).then(r => r.data || []).catch(() => [])
      : [],
    erlaubt.includes('fuhrpark')
      ? sb.from('fahrzeuge').select('id,kennzeichen,marke,modell,status')
          .or(`kennzeichen.ilike.${like},marke.ilike.${like},modell.ilike.${like}`)
          .limit(6).then(r => r.data || []).catch(() => [])
      : [],
    erlaubt.includes('todos')
      ? sb.from('todos').select('id,titel,erledigt,faellig_am')
          .ilike('titel', like).eq('erledigt', false)
          .limit(6).then(r => r.data || []).catch(() => [])
      : [],
    erlaubt.includes('kva')
      ? sb.from('kva_archiv').select('kva_nr,kunde_name,datum')
          .or(`kunde_name.ilike.${like},kva_nr.ilike.${like}`)
          .limit(6).then(r => r.data || []).catch(() => [])
      : [],
    erlaubt.includes('schulung')
      ? sb.from('schulung_participants').select('id,first_name,last_name,company_name')
          .or(`first_name.ilike.${like},last_name.ilike.${like},company_name.ilike.${like}`)
          .limit(6).then(r => r.data || []).catch(() => [])
      : [],
  ]);

  // Eingabe hat sich inzwischen geändert → Ergebnis verwerfen
  if (q !== _gsLetzteQuery) return;

  const gruppen = [];
  if (ma.length) gruppen.push(['👥 Mitarbeiter', ma.map(m =>
    gsZeile(`${m.nachname}, ${m.vorname}`, [m.bereich, m.telefon].filter(Boolean).join(' · '),
      `gsGeheZu('personal','${m.id}')`))]);
  if (fz.length) gruppen.push(['🚗 Fahrzeuge', fz.map(v =>
    gsZeile(v.kennzeichen, [v.marke, v.modell, v.status].filter(Boolean).join(' '),
      `gsGeheZu('fuhrpark','${v.id}')`))]);
  if (td.length) gruppen.push(['✓ Offene To-Dos', td.map(t =>
    gsZeile(t.titel, t.faellig_am ? 'Fällig: ' + new Date(t.faellig_am).toLocaleDateString('de-DE') : '',
      `gsGeheZu('todos','')`))]);
  if (kva.length) gruppen.push(['📋 KVA', kva.map(k =>
    gsZeile(k.kva_nr + ' · ' + (k.kunde_name || ''), k.datum ? new Date(k.datum).toLocaleDateString('de-DE') : '',
      `gsGeheZu('kva','')`))]);
  if (tn.length) gruppen.push(['🎓 Schulungs-Teilnehmer', tn.map(p =>
    gsZeile(`${p.last_name}, ${p.first_name}`, p.company_name || '',
      `gsGeheZu('schulung','')`))]);

  panel.innerHTML = gruppen.length
    ? gruppen.map(([titel, zeilen]) => `
        <div style="padding:8px 14px 4px;font-size:10px;font-weight:700;color:var(--grau);
          text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid var(--border)">${titel}</div>
        ${zeilen.join('')}`).join('')
    : `<div style="padding:16px;font-size:13px;color:var(--grau)">Keine Treffer für „${q}"</div>`;
}

function gsZeile(haupt, sub, onclick) {
  return `<div onclick="${onclick};gsSchliessen()"
    style="padding:9px 14px;cursor:pointer;border-bottom:1px solid #f3f4f6"
    onmouseover="this.style.background='var(--hell)'" onmouseout="this.style.background=''">
    <div style="font-size:13px;font-weight:600;color:var(--dunkel)">${haupt}</div>
    ${sub ? `<div style="font-size:11px;color:var(--grau);margin-top:1px">${sub}</div>` : ''}
  </div>`;
}

function gsGeheZu(modul, id) {
  showView(modul);
  const input = document.getElementById('gs-input');
  if (input) input.value = '';
  if (modul === 'personal' && id) {
    // Personal lädt asynchron – Akte öffnen, sobald Daten da sind
    const versuch = (n) => {
      if (window.personalState && personalState.loaded) { oeffneMaAkte(id); }
      else if (n < 20) setTimeout(() => versuch(n + 1), 250);
    };
    versuch(0);
  }
  if (modul === 'fuhrpark' && id) {
    const versuch = (n) => {
      if (window.fuhrparkState && fuhrparkState.loaded) { oeffneFahrzeug(id); }
      else if (n < 20) setTimeout(() => versuch(n + 1), 250);
    };
    versuch(0);
  }
}
