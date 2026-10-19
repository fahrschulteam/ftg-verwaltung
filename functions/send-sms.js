// ════════════════════════════════════════════════════════════════════
//  SEND-SMS – verschickt eine SMS über Brevo (z. B. das Ergebnis des
//  BKF-Modul-Rechners an einen Fahrer).
//
//  SMS kosten Geld. Deshalb nimmt diese Funktion nur Anfragen von Benutzern
//  an, die in der Fahrschulverwaltung angemeldet sind: Der Browser schickt
//  das Anmelde-Token mit, und die Funktion lässt es von Supabase prüfen.
//  Ohne gültige Anmeldung wird nichts gesendet.
//
//  Voraussetzungen bei Netlify (Umgebungsvariablen):
//    BREVO_API_KEY         – vorhanden (wird auch für E-Mails benutzt)
//    SUPABASE_SERVICE_KEY  – vorhanden
//    BREVO_SMS_SENDER      – optional, Absendername (max. 11 Zeichen), Standard „FTG"
//  Voraussetzung bei Brevo: SMS-Guthaben auf dem Konto.
// ════════════════════════════════════════════════════════════════════

const SUPA_URL = 'https://ejuhpgcwskyqwheinlub.supabase.co';
const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const BREVO_KEY = process.env.BREVO_API_KEY || '';
const ABSENDER = String(process.env.BREVO_SMS_SENDER || 'FTG').replace(/[^A-Za-z0-9]/g, '').slice(0, 11) || 'FTG';
const MAX_ZEICHEN = 612;   // entspricht 4 SMS – längere Texte werden abgelehnt

const KOPF = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
const antwort = (statusCode, body) => ({ statusCode, headers: KOPF, body: JSON.stringify(body) });

// Deutsche Nummern mit führender 0 → +49 …; sonst internationale Schreibweise
function zuE164(nummer) {
  let s = String(nummer || '').replace(/[^\d+]/g, '');
  if (!s) return '';
  if (s.startsWith('+')) s = '+' + s.slice(1).replace(/\+/g, '');
  else if (s.startsWith('00')) s = '+' + s.slice(2);
  else if (s.startsWith('0')) s = '+49' + s.slice(1);
  else s = '+' + s;
  return /^\+[1-9]\d{7,14}$/.test(s) ? s : '';
}

async function angemeldet(token) {
  if (!token || !SUPA_KEY) return false;
  try {
    const r = await fetch(`${SUPA_URL}/auth/v1/user`, { headers: { apikey: SUPA_KEY, authorization: `Bearer ${token}` } });
    if (!r.ok) return false;
    const u = await r.json();
    return !!(u && u.id);
  } catch { return false; }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return antwort(405, { ok: false, message: 'Nur POST erlaubt.' });
  if (!BREVO_KEY) return antwort(500, { ok: false, message: 'SMS-Versand ist nicht eingerichtet (BREVO_API_KEY fehlt).' });

  const kopf = event.headers || {};
  const token = String(kopf.authorization || kopf.Authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!(await angemeldet(token))) {
    return antwort(401, { ok: false, message: 'Bitte in der Verwaltung neu anmelden – SMS können nur angemeldete Benutzer senden.' });
  }

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch { return antwort(400, { ok: false, message: 'Ungültige Anfrage.' }); }

  const an = zuE164(body.to);
  const text = String(body.text || '').replace(/\r/g, '').trim();
  if (!an) return antwort(400, { ok: false, message: 'Die Mobilnummer ist nicht gültig.' });
  if (!text) return antwort(400, { ok: false, message: 'Der SMS-Text ist leer.' });
  if (text.length > MAX_ZEICHEN) return antwort(400, { ok: false, message: `Der Text ist zu lang (höchstens ${MAX_ZEICHEN} Zeichen).` });

  try {
    const r = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json', 'api-key': BREVO_KEY },
      body: JSON.stringify({ sender: ABSENDER, recipient: an.replace('+', ''), content: text, type: 'transactional' }),
    });
    const d = await r.json().catch(() => ({}));
    if (r.ok) return antwort(200, { ok: true, an });
    const grund = String(d.message || d.code || '').slice(0, 200);
    console.error('send-sms', r.status, grund);
    const hinweis = /credit|guthaben|not enough|insufficient/i.test(grund)
      ? 'Bei Brevo ist kein SMS-Guthaben vorhanden.'
      : `Brevo hat die SMS abgelehnt (${r.status}${grund ? ': ' + grund : ''}).`;
    return antwort(502, { ok: false, message: hinweis });
  } catch (e) {
    console.error('send-sms', e);
    return antwort(502, { ok: false, message: 'Der SMS-Dienst ist gerade nicht erreichbar.' });
  }
};
