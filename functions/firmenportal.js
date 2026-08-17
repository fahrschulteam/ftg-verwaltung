// ════════════════════════════════════════════════════════════════════
//  FIRMENPORTAL-API – Fahrschulteam Thorsten Gels
//
//  Firmen melden sich mit ihrem Zugangscode an und sehen/ändern
//  AUSSCHLIESSLICH die eigenen Fahrer. Alle Datenbank-Zugriffe laufen
//  hier serverseitig – das Portal selbst bekommt nie einen Datenbank-
//  Schlüssel. Änderbar sind nur Kontaktdaten (Adresse, Telefon, E-Mail).
// ════════════════════════════════════════════════════════════════════

const SUPA_URL = 'https://ejuhpgcwskyqwheinlub.supabase.co';
// WICHTIG: Die Datenbank-Regeln erlauben nur angemeldeten Benutzern den Zugriff.
// Die Portal-Funktion nutzt deshalb den Service-Schlüssel (Netlify-Umgebungs-
// variable SUPABASE_SERVICE_KEY, niemals im Browser sichtbar). Die Abgrenzung
// "nur eigene Fahrer" erzwingt diese Funktion selbst über die company_id.
const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';

const HEAD = {
  apikey: SUPA_KEY,
  authorization: `Bearer ${SUPA_KEY}`,
  'content-type': 'application/json',
};

const CORS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
};

const antwort = (statusCode, body) => ({ statusCode, headers: CORS, body: JSON.stringify(body) });

async function supa(pfad) {
  const r = await fetch(`${SUPA_URL}/rest/v1/${pfad}`, { headers: HEAD });
  if (!r.ok) throw new Error(`Datenbank ${r.status}`);
  return r.json();
}

// 7 UE = 1 Modul; Fenster = 5 Jahre vor Stichtag (Schlüsselzahl 95)
function bkfStatus(p, kurse) {
  const ext = p.ext_dates || {};
  const sz95 = ext.SZ95 || '';
  const start = sz95 ? `${+sz95.slice(0, 4) - 5}${sz95.slice(4)}` : '';
  const alt = Math.min(5, Math.floor((+ext.BKF_UE || 0) / 7));
  const stand = ext.BKF_STAND || '';
  const eigene = new Set(
    kurse
      .filter((k) => k.passed && String(k.type || '').indexOf('BKF Modul') === 0)
      .filter((k) => (k.participant_id && k.participant_id === p.id) || (k.participant_legacy && k.participant_legacy === (p.legacy_id || p.id)))
      .filter((k) => { const d = k.date_from || ''; return sz95 ? d >= start && d <= sz95 : true; })
      .filter((k) => !stand || (k.date_from || '') > stand)
      .map((k) => k.type),
  ).size;
  // Extern besuchte Seminare (bei anderen Bildungsanbietern, in der Verwaltung erfasst)
  const externe = new Set(
    (Array.isArray(ext.BKF_EXT) ? ext.BKF_EXT : [])
      .filter((e) => { const d = e.d || ''; return (sz95 ? d >= start && d <= sz95 : true) && (!stand || d > stand); })
      .map((e) => e.d),
  ).size;
  const module = Math.min(5, alt + eigene + externe);
  return { sz95, module, fehlen: Math.max(0, 5 - module) };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return antwort(200, { ok: true });
  if (event.httpMethod !== 'POST') return antwort(405, { success: false, message: 'Nur POST erlaubt.' });

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch { return antwort(400, { success: false, message: 'Ungültige Anfrage.' }); }

  const code = String(body.code || '').trim().toUpperCase();
  if (!code || code.length < 6) return antwort(401, { success: false, message: 'Bitte den Zugangscode Ihrer Firma eingeben.' });

  try {
    // Firma über den Code finden – der Code ist der einzige Schlüssel.
    const firmen = await supa(`schulung_companies?portal_code=eq.${encodeURIComponent(code)}&select=id,name`);
    if (!Array.isArray(firmen) || !firmen.length) {
      return antwort(401, { success: false, message: 'Dieser Zugangscode ist nicht gültig.' });
    }
    const firma = firmen[0];

    // ── Kontaktdaten eines eigenen Fahrers ändern ──────────────────────
    if (body.action === 'update') {
      const erlaubt = {};
      for (const f of ['street', 'zip', 'city', 'phone', 'email']) {
        if (typeof (body.patch || {})[f] === 'string') erlaubt[f] = body.patch[f].trim().slice(0, 200);
      }
      if (!body.id || !Object.keys(erlaubt).length) return antwort(400, { success: false, message: 'Keine Änderungen übergeben.' });
      erlaubt.updated_at = new Date().toISOString();
      // company_id-Filter stellt sicher: nur eigene Fahrer sind änderbar.
      const r = await fetch(
        `${SUPA_URL}/rest/v1/schulung_participants?id=eq.${encodeURIComponent(body.id)}&company_id=eq.${firma.id}`,
        { method: 'PATCH', headers: { ...HEAD, Prefer: 'return=representation' }, body: JSON.stringify(erlaubt) },
      );
      const rows = r.ok ? await r.json() : [];
      if (!r.ok || !rows.length) return antwort(403, { success: false, message: 'Dieser Fahrer gehört nicht zu Ihrer Firma.' });
      return antwort(200, { success: true });
    }

    // ── Übersicht: eigene Fahrer + Kurstermine ─────────────────────────
    const fahrer = await supa(
      `schulung_participants?company_id=eq.${firma.id}&select=id,legacy_id,first_name,last_name,birth,street,zip,city,phone,email,ext_dates&order=last_name.asc&limit=1000`,
    );
    // BKF-Kurse (klein genug, um sie einmal zu laden und je Fahrer zuzuordnen)
    let kurse = [];
    try { kurse = await supa(`schulung_courses?select=participant_id,participant_legacy,type,date_from,passed&type=like.BKF*`); } catch { kurse = []; }
    // Kommende Termine aus dem öffentlichen Kurskalender
    let termine = [];
    try { termine = await supa(`kurskalender_public?select=type,date,bis,location,capacity,belegt,termine&order=date.asc`); } catch { termine = []; }

    const heute = new Date().toISOString().slice(0, 10);
    return antwort(200, {
      success: true,
      firma: { name: firma.name },
      fahrer: (fahrer || []).map((p) => {
        const s = bkfStatus(p, kurse);
        return {
          id: p.id,
          name: [p.last_name, p.first_name].filter(Boolean).join(', '),
          birth: p.birth || '',
          street: p.street || '', zip: p.zip || '', city: p.city || '',
          phone: p.phone || '', email: p.email || '',
          fe: (p.ext_dates || {}).FE || '',
          sz95: s.sz95, module: s.module, fehlen: s.fehlen,
        };
      }),
      termine: (termine || []).filter((t) => (t.date || '') >= heute).slice(0, 12),
    });
  } catch (e) {
    console.error('firmenportal', e);
    return antwort(500, { success: false, message: 'Der Dienst ist gerade nicht erreichbar. Bitte später erneut versuchen.' });
  }
};
