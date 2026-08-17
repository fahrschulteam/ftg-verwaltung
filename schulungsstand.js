// ════════════════════════════════════════════════════════════════════
//  MODUL SCHULUNGSSTAND
//  Zeigt alle noch OFFENEN (bevorstehenden) Schulungs- und
//  Unterweisungstermine aus der Schulungsverwaltung.
//  Datenquelle: Fahrschulverwaltung (ejuhpgcwskyqwheinlub), schulung_*
// ════════════════════════════════════════════════════════════════════

const SS_URL = 'https://ejuhpgcwskyqwheinlub.supabase.co';
const SS_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqdWhwZ2N3c2t5cXdoZWlubHViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NTk1ODcsImV4cCI6MjA5ODEzNTU4N30.jeN17CztS9Ld5FtJGrL_BCwk2DObIIigwJZSJGbE7tA';

function ssFmt(d) {
  if (!d) return '–';
  return new Date(d).toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' });
}
function ssDaysUntil(d) {
  if (!d) return null;
  const h = new Date(); h.setHours(0,0,0,0);
  return Math.round((new Date(d) - h) / 86400000);
}

// Typ-Farben passend zu Schulungsverwaltung-CI
const SS_TYP_FARBE = {
  'Gabelstapler':    { bg:'#EFF6FF', border:'#2A6CAE', text:'#1e4d8c' },
  'Ladekran':        { bg:'#F0FDF4', border:'#16a34a', text:'#14532d' },
  'Baumaschinen':    { bg:'#FFF7ED', border:'#D97706', text:'#92400e' },
  'Fahrtenschreiber':{ bg:'#FDF4FF', border:'#9333ea', text:'#6b21a8' },
  'ADR':             { bg:'#FFF0F1', border:'#C0001A', text:'#9a0015' },
};
function ssTypStyle(typ) {
  return SS_TYP_FARBE[typ] || { bg:'#F3F4F6', border:'#6B7280', text:'#374151' };
}

async function ssLadeState() {
  try {
    const H = { apikey: SS_KEY, Authorization: `Bearer ${SS_KEY}` };
    const [pR, cR, iR, aR, plR, invR] = await Promise.all([
      fetch(`${SS_URL}/rest/v1/schulung_participants?select=*`, { headers: H }),
      fetch(`${SS_URL}/rest/v1/schulung_courses?select=*&order=date_from`, { headers: H }),
      fetch(`${SS_URL}/rest/v1/schulung_instructions?select=*&order=date_from`, { headers: H }),
      fetch(`${SS_URL}/rest/v1/schulung_adr_instructions?select=*&order=date_from`, { headers: H }),
      fetch(`${SS_URL}/rest/v1/schulung_planned?select=*&order=date`, { headers: H }),
      fetch(`${SS_URL}/rest/v1/schulung_invoices?select=*`, { headers: H }),
    ]);
    if (!pR.ok || !cR.ok || !iR.ok || !aR.ok || !plR.ok || !invR.ok) return null;
    const [pr, cr, ir, ar, plr, invr] = await Promise.all([
      pR.json(), cR.json(), iR.json(), aR.json(), plR.json(), invR.json()
    ]);

    // snake_case → camelCase für Kompatibilität mit Render-Code
    const participants = pr.map(p => ({
      ...p,
      firstName:  p.first_name,
      lastName:   p.last_name,
      companyId:  p.company_id,
      company:    p.company_name,
    }));

    const courses = cr.map(c => ({
      ...c,
      dateFrom:    c.date_from,
      dateTo:      c.date_to,
      participant: c.participant_id || c.participant_legacy,
      dozent:      c.dozent_legacy_id || c.dozent_legacy,
    }));

    const instructions = [
      ...ir.map(i => ({
        ...i,
        dateFrom:    i.date_from,
        dateTo:      i.date_to,
        instrType:   i.instr_type,
        participant: i.participant_id || i.participant_legacy,
        dozent:      i.dozent_legacy_id || i.dozent_legacy,
      })),
      ...ar.map(i => ({
        ...i,
        dateFrom:    i.date_from,
        dateTo:      i.date_to,
        instrType:   'ADR',
        participant: i.participant_id || i.participant_legacy,
        dozent:      i.dozent_legacy_id || i.dozent_legacy,
      })),
    ];

    const planned = plr.map(p => ({
      ...p,
      participants: p.participants_legacy || [],
    }));

    return { courses, instructions, planned, participants, companies: [], dozenten: [], invoices: invr };
  } catch { return null; }
}

window.renderSchulungsstand = async function() {
  const view = document.getElementById('view-schulungsstand');
  view.innerHTML = '<div class="loading"><div class="spinner"></div>Lade Schulungsstand …</div>';

  const st = await ssLadeState();
  if (!st) {
    view.innerHTML = `<div style="padding:40px 0">
      <div class="card" style="padding:32px;text-align:center;color:var(--grau)">
        ⚠ Schulungsverwaltung nicht erreichbar
      </div></div>`;
    return;
  }

  const heute = new Date(); heute.setHours(0,0,0,0);
  const heuteStr = heute.toISOString().slice(0,10);

  const { courses=[], instructions=[], planned=[], participants=[], companies=[], dozenten=[], invoices=[] } = st;

  // Hilfsfunktionen
  const pById   = id => participants.find(x => x.id === id);
  const pName   = id => { const p = pById(id); return p ? (p.lastName&&p.firstName?`${p.lastName}, ${p.firstName}`:p.lastName||p.firstName||p.name||'–') : '–'; };
  const dozName = id => { const d = dozenten.find(x => x.id === id); return d ? (d.name||`${d.firstName||''} ${d.lastName||''}`.trim()) : (id||''); };
  const firma   = p  => { if (!p) return '–'; const c = companies.find(x => x.id === p.companyId); return c ? c.name : (p.company||'–'); };

  // Abgerechnete Kurs-IDs
  const billedIds = new Set(invoices.flatMap(i => (i.items||[]).map(it => it.courseId)));

  // ── A) GEPLANTE LEHRGÄNGE (state.planned, Datum ≥ heute) ──
  const geplanteEvents = planned
    .filter(pl => pl.date >= heuteStr)
    .sort((a,b) => a.date.localeCompare(b.date));

  // ── B) EINGETRAGENE KURSE MIT ZUKÜNFTIGEM DATUM ──
  const kursGruppen = {};
  courses.filter(c => (c.dateFrom||c.date||'') >= heuteStr).forEach(c => {
    const key = `${c.dateFrom||c.date}|${c.type}|${c.dozent||''}|${c.location||''}`;
    if (!kursGruppen[key]) kursGruppen[key] = {
      key, typ: c.type, datum: c.dateFrom||c.date, datumBis: c.dateTo||c.dateFrom||c.date,
      dozent: c.dozent, ort: c.location, eintraege: []
    };
    kursGruppen[key].eintraege.push(c);
  });
  const kursEvents = Object.values(kursGruppen).sort((a,b) => a.datum.localeCompare(b.datum));

  // ── C) EINGETRAGENE UNTERWEISUNGEN MIT ZUKÜNFTIGEM DATUM ──
  const uwGruppen = {};
  instructions.filter(i => (i.dateFrom||i.date||'') >= heuteStr).forEach(i => {
    const key = `${i.dateFrom||i.date}|${i.instrType||'Gabelstapler'}|${i.dozent||''}|${i.location||''}`;
    if (!uwGruppen[key]) uwGruppen[key] = {
      key, typ: i.instrType||'Gabelstapler', datum: i.dateFrom||i.date, datumBis: i.dateTo||i.dateFrom||i.date,
      dozent: i.dozent, ort: i.location, eintraege: []
    };
    uwGruppen[key].eintraege.push(i);
  });
  const uwEvents = Object.values(uwGruppen).sort((a,b) => a.datum.localeCompare(b.datum));

  const gesamt = geplanteEvents.length + kursEvents.length + uwEvents.length;

  // ── RENDER-HELFER ──
  function tagBadge(typ) {
    const s = ssTypStyle(typ);
    return `<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:5px;
      background:${s.bg};color:${s.text};border:1px solid ${s.border};white-space:nowrap">${typ}</span>`;
  }

  function datumsSpanne(von, bis) {
    if (!von) return '–';
    if (!bis || bis === von) return ssFmt(von);
    return `${ssFmt(von)} – ${ssFmt(bis)}`;
  }

  function daysTag(datum) {
    const t = ssDaysUntil(datum);
    if (t === null) return '';
    const farbe = t < 0 ? '#991B1B' : t <= 7 ? '#C0001A' : t <= 30 ? '#D97706' : '#6B7280';
    const label = t < 0 ? `vor ${Math.abs(t)} T` : t === 0 ? 'heute' : `in ${t} T`;
    return `<span style="font-size:11px;font-weight:700;color:${farbe};white-space:nowrap">${label}</span>`;
  }

  function tnListe(eintraege, istKurs) {
    const reale = eintraege.filter(e => e.participant && pById(e.participant));
    if (!reale.length) return `<span style="font-size:11px;color:var(--grau);font-style:italic">Noch keine Teilnehmer eingetragen</span>`;
    const firmen = [...new Set(reale.map(e => { const p = pById(e.participant); return firma(p); }).filter(f=>f&&f!=='–'))];
    const tnCount = reale.length;
    const abger = istKurs ? reale.filter(e => billedIds.has(e.id)).length : 0;
    return `<span style="font-size:11px;color:var(--dunkel)">
      <strong>${tnCount} TN</strong>${firmen.length ? ` · ${firmen.slice(0,3).join(', ')}${firmen.length>3?` +${firmen.length-3}`:''}`:''} 
      ${istKurs && abger>0 ? `<span style="color:#166534;margin-left:6px">(${abger} abger.)</span>`:''}
    </span>`;
  }

  function eventKarte(g, typ) {
    const s = ssTypStyle(g.typ);
    const istKurs = typ === 'kurs';
    const istGeplant = typ === 'geplant';
    return `
      <div class="card" style="padding:0;overflow:hidden;border-left:4px solid ${s.border}">
        <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 16px">
          <!-- Datum-Block -->
          <div style="min-width:80px;text-align:center;background:${s.bg};border-radius:8px;padding:8px 10px;flex-shrink:0">
            <div style="font-size:18px;font-weight:700;color:${s.text};line-height:1">
              ${new Date(g.datum).getDate().toString().padStart(2,'0')}
            </div>
            <div style="font-size:10px;font-weight:600;color:${s.text};margin-top:1px">
              ${new Date(g.datum).toLocaleDateString('de-DE',{month:'short',year:'2-digit'})}
            </div>
            <div style="margin-top:4px">${daysTag(g.datum)}</div>
          </div>

          <!-- Inhalt -->
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px">
              ${tagBadge(g.typ)}
              ${istGeplant ? `<span style="font-size:10px;background:#FFF7ED;color:#92400e;border:1px solid #D97706;
                padding:2px 8px;border-radius:5px;font-weight:700">📅 Geplant</span>` : ''}
              ${istKurs ? `<span style="font-size:10px;background:#F0FDF4;color:#166534;border:1px solid #16a34a;
                padding:2px 8px;border-radius:5px;font-weight:700">🎓 Lehrgang</span>` : ''}
              ${typ === 'uw' ? `<span style="font-size:10px;background:#EFF6FF;color:#1e4d8c;border:1px solid #2A6CAE;
                padding:2px 8px;border-radius:5px;font-weight:700">🔄 Unterweisung</span>` : ''}
            </div>

            <div style="display:flex;flex-wrap:wrap;gap:12px;font-size:12px;color:var(--grau)">
              ${g.datum !== g.datumBis && g.datumBis ? `<span>📅 ${datumsSpanne(g.datum, g.datumBis)}</span>` : ''}
              ${g.ort ? `<span>📍 ${g.ort}</span>` : ''}
              ${g.dozent ? `<span>👤 ${dozName(g.dozent)}</span>` : ''}
              ${istGeplant && g.capacity ? `<span>👥 Kapazität: ${(g.participants||[]).length}/${g.capacity}</span>` : ''}
            </div>

            <div style="margin-top:6px">
              ${istGeplant
                ? (g.participants?.length
                    ? `<span style="font-size:11px;color:var(--dunkel)"><strong>${g.participants.length} TN</strong> angemeldet</span>`
                    : `<span style="font-size:11px;color:var(--grau);font-style:italic">Noch keine Anmeldungen</span>`)
                : tnListe(g.eintraege, istKurs)}
            </div>
          </div>
        </div>
      </div>`;
  }

  function sectionTitel(titel, anzahl) {
    return `<div style="font-size:11px;font-weight:700;color:var(--grau);text-transform:uppercase;
      letter-spacing:.06em;margin:24px 0 8px;padding-bottom:4px;border-bottom:1px solid var(--border)">
      ${titel} <span style="font-weight:400">(${anzahl})</span>
    </div>`;
  }

  view.innerHTML = `
    <div style="max-width:860px;padding:24px 0 60px">

      <!-- Kopfzeile -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
        <div>
          <h2 style="margin:0;font-size:18px;font-weight:700;color:var(--dunkel)">Offene Schulungen & Unterweisungen</h2>
          <div style="font-size:12px;color:var(--grau);margin-top:2px">
            Bevorstehende Termine aus der Schulungsverwaltung · Stand: ${new Date().toLocaleDateString('de-DE')}
          </div>
        </div>
        <button class="btn btn-sm" onclick="window.renderSchulungsstand()">↻ Aktualisieren</button>
      </div>

      ${gesamt === 0 ? `
        <div class="card" style="padding:48px;text-align:center;margin-top:24px">
          <div style="font-size:32px;margin-bottom:12px">✓</div>
          <div style="font-size:16px;font-weight:700;color:var(--dunkel)">Keine offenen Termine</div>
          <div style="font-size:13px;color:var(--grau);margin-top:6px">
            Alle eingetragenen Schulungen und Unterweisungen liegen in der Vergangenheit.
          </div>
          <button class="btn btn-primary" style="margin-top:16px" onclick="showView('schulung')">
            Zur Schulungsverwaltung →
          </button>
        </div>` : ''}

      ${geplanteEvents.length ? sectionTitel('📅 Geplante Lehrgänge', geplanteEvents.length) + geplanteEvents.map(g => eventKarte(g,'geplant')).join('') : ''}
      ${kursEvents.length    ? sectionTitel('🎓 Eingetragene Lehrgänge', kursEvents.length) + kursEvents.map(g => eventKarte(g,'kurs')).join('') : ''}
      ${uwEvents.length      ? sectionTitel('🔄 Eingetragene Unterweisungen', uwEvents.length) + uwEvents.map(g => eventKarte(g,'uw')).join('') : ''}

      ${gesamt > 0 ? `
        <div style="padding:16px 0;text-align:center">
          <button class="btn btn-sm btn-outline" onclick="showView('schulung')">Alle Details in der Schulungsverwaltung →</button>
        </div>` : ''}
    </div>`;
};
