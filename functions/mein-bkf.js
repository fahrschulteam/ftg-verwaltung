// ════════════════════════════════════════════════════════════════════
//  MEIN BKF-STAND – API für die persönliche Fahrerseite (mein-bkf.html)
//
//  Jeder Fahrer hat einen persönlichen Link mit einem geheimen Schlüssel
//  (ext_dates.BKF_LINK). Zusätzlich wird das Geburtsdatum abgefragt, wenn
//  eines hinterlegt ist. Der Fahrer sieht AUSSCHLIESSLICH seinen eigenen
//  BKF-Stand und darf nur ändern:
//    - eigene Fremdschulungen (Datum, Anbieter, Kenntnisbereiche)
//    - ADR-/Tiertransport-Schulung (Datum)
//    - Verkehrsart (Güter/Personen) für den Rechner
//    - den Stichtag der Schlüsselzahl 95, solange das Büro oder die Firma
//      keinen eingetragen hat
//  Alles, was der Fahrer einträgt, bekommt die Kennzeichnung q:'fahrer'
//  ("vom Fahrer selbst eingetragen"). Einträge des Büros bleiben unberührt.
//
//  Gespeichert wird in ext_dates.BKF_EXT – derselbe Ort, den Verwaltung und
//  Firmenportal schon lesen. Dadurch erscheinen die Angaben dort automatisch.
// ════════════════════════════════════════════════════════════════════

const SUPA_URL = 'https://ejuhpgcwskyqwheinlub.supabase.co';
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

const KB_ERLAUBT = ['1.1', '1.2', '1.3', '1.3a', '1.4', '1.5', '1.6', '2.1', '2.2', '2.3',
  '3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7', '3.8'];
const MAX_EINTRAEGE = 15;

const istDatum = (v) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(v || ''))) return false;
  const j = +String(v).slice(0, 4);
  return j >= 2000 && j <= 2100 && !isNaN(new Date(v + 'T12:00:00').getTime());
};
const text = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, max || 80);

// Was der Fahrer sehen darf – bewusst nur BKF-Daten, keine Adresse o. Ä.
function ansicht(p, kurse) {
  const ext = p.ext_dates || {};
  const alle = Array.isArray(ext.BKF_EXT) ? ext.BKF_EXT : [];
  return {
    name: [p.first_name, p.last_name].filter(Boolean).join(' '),
    hatFirma: !!p.company_id,
    ablauf: ext.SZ95 || '',
    // Stichtag ist fest, wenn ihn das Büro oder die Firma eingetragen hat
    ablaufFest: !!(ext.SZ95 && !ext.SZ95_FAHRER),
    art: ['C', 'D', 'CD'].indexOf(ext.BKF_ART) >= 0 ? ext.BKF_ART : '',
    eigene: (kurse || [])
      .filter((k) => k.passed && String(k.type || '').indexOf('BKF Modul') === 0)
      .map((k) => ({ t: k.type, d: k.date_from || '' })),
    ext: alle.map((e) => ({
      d: e.d || '', a: e.a || '', kb: Array.isArray(e.kb) ? e.kb : [],
      art: e.art || '', q: e.q || '',
    })),
    altUe: +ext.BKF_UE || 0,
    stand: ext.BKF_STAND || '',
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return antwort(200, { ok: true });
  if (event.httpMethod !== 'POST') return antwort(405, { success: false, message: 'Nur POST erlaubt.' });

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch { return antwort(400, { success: false, message: 'Ungültige Anfrage.' }); }

  // Schlüssel aus dem persönlichen Link: nur Kleinbuchstaben und Ziffern
  const k = String(body.k || '').trim();
  if (!/^[a-z0-9]{16,40}$/.test(k)) {
    return antwort(401, { success: false, message: 'Dieser Link ist nicht gültig. Bitte den Link aus der E-Mail oder den QR-Code der Teilnahmebescheinigung verwenden.' });
  }

  const heute = new Date().toISOString().slice(0, 10);

  try {
    const treffer = await supa(
      `schulung_participants?ext_dates->>BKF_LINK=eq.${encodeURIComponent(k)}` +
      '&select=id,legacy_id,first_name,last_name,birth,company_id,ext_dates&limit=2',
    );
    if (!Array.isArray(treffer) || treffer.length !== 1) {
      return antwort(401, { success: false, message: 'Dieser Link ist nicht mehr gültig. Bitte rufen Sie uns an: 0591 / 51403.' });
    }
    const p = treffer[0];

    // Zweite Sicherung: Geburtsdatum (falls eines hinterlegt ist)
    if (p.birth) {
      const b = String(body.birth || '').trim();
      if (!b) return antwort(401, { success: false, brauchtGeburt: true, vorname: p.first_name || '' });
      if (b !== String(p.birth).slice(0, 10)) {
        return antwort(401, { success: false, brauchtGeburt: true, vorname: p.first_name || '', message: 'Das Geburtsdatum stimmt nicht.' });
      }
    }

    // ── Eigene Angaben speichern ───────────────────────────────────────
    if (body.action === 'speichern') {
      const d = body.daten || {};
      const ext = { ...(p.ext_dates || {}) };
      const bestand = Array.isArray(ext.BKF_EXT) ? ext.BKF_EXT : [];
      // Einträge des Büros bleiben, wie sie sind
      const buero = bestand.filter((e) => e && e.q !== 'fahrer');
      const neu = [];

      (Array.isArray(d.extern) ? d.extern : []).slice(0, MAX_EINTRAEGE).forEach((x) => {
        if (!x || !istDatum(x.datum) || x.datum > heute) return;
        const kb = [...new Set((Array.isArray(x.kb) ? x.kb : []).map(String))].filter((v) => KB_ERLAUBT.indexOf(v) >= 0);
        if (!kb.length) return;
        neu.push({ d: x.datum, a: text(x.titel, 80), kb, q: 'fahrer', am: heute });
      });
      [['adr', 'ADR-Schulung (Gefahrgut)'], ['tier', 'Tiertransport-Schulung']].forEach(([key, name]) => {
        const x = d[key] || {};
        if (!x.an || !istDatum(x.datum) || x.datum > heute) return;
        neu.push({ d: x.datum, a: name, kb: [], art: key, q: 'fahrer', am: heute });
      });

      const gesamt = buero.concat(neu).sort((a, b) => String(a.d || '').localeCompare(String(b.d || '')));
      if (gesamt.length) ext.BKF_EXT = gesamt; else delete ext.BKF_EXT;

      if (['C', 'D', 'CD'].indexOf(d.art) >= 0) ext.BKF_ART = d.art;

      // Stichtag nur, wenn Büro/Firma keinen gesetzt haben
      const darfStichtag = !ext.SZ95 || ext.SZ95_FAHRER;
      if (darfStichtag && typeof d.ablauf === 'string') {
        if (istDatum(d.ablauf)) { ext.SZ95 = d.ablauf; ext.SZ95_FAHRER = heute; }
        else if (!d.ablauf && ext.SZ95_FAHRER) { delete ext.SZ95; delete ext.SZ95_FAHRER; }
      }
      ext.BKF_FAHRER_AM = heute;

      const r = await fetch(
        `${SUPA_URL}/rest/v1/schulung_participants?id=eq.${encodeURIComponent(p.id)}`,
        { method: 'PATCH', headers: { ...HEAD, Prefer: 'return=minimal' },
          body: JSON.stringify({ ext_dates: ext, updated_at: new Date().toISOString() }) },
      );
      if (!r.ok) return antwort(500, { success: false, message: 'Speichern hat nicht geklappt. Bitte später erneut versuchen.' });
      return antwort(200, { success: true, gespeichert: neu.length });
    }

    // ── Eigenen BKF-Stand laden ────────────────────────────────────────
    let kurse = [];
    try {
      const leg = String(p.legacy_id || p.id).replace(/"/g, '');
      kurse = await supa(
        'schulung_courses?select=type,date_from,passed&type=like.BKF*' +
        `&or=(participant_id.eq.${encodeURIComponent(p.id)},participant_legacy.eq.${encodeURIComponent('"' + leg + '"')})`,
      );
    } catch { kurse = []; }

    return antwort(200, { success: true, fahrer: ansicht(p, kurse) });
  } catch (e) {
    console.error('mein-bkf', e);
    return antwort(500, { success: false, message: 'Der Dienst ist gerade nicht erreichbar. Bitte später erneut versuchen.' });
  }
};
