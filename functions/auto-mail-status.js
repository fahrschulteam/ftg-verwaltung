// ════════════════════════════════════════════════════════════════════
//  AUTO-MAIL-STATUS – liefert die Ein-/Ausschalter der automatischen
//  Nachrichten (Einstellungen → Automatische Nachrichten).
//
//  Wird vom Kurskalender (Campus AI) abgefragt, bevor er eine
//  Anmeldebestätigung oder Kurserinnerung verschickt. Die Antwort enthält
//  ausschließlich Ja/Nein-Werte – keine personenbezogenen Daten.
//  Ein fehlender Eintrag bedeutet: eingeschaltet.
// ════════════════════════════════════════════════════════════════════

const SUPA_URL = 'https://ejuhpgcwskyqwheinlub.supabase.co';
const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const NAMEN = ['anmeldung', 'kurserinnerung', 'bescheinigung', 'bkf_erinnerung'];

exports.handler = async () => {
  const kopf = { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' };
  const stand = {};
  NAMEN.forEach((n) => { stand[n] = true; });
  try {
    const r = await fetch(`${SUPA_URL}/rest/v1/firma?id=eq.1&select=grundlagen`, {
      headers: { apikey: SUPA_KEY, authorization: `Bearer ${SUPA_KEY}` },
    });
    if (!r.ok) throw new Error(`Datenbank ${r.status}`);
    const rows = await r.json();
    const am = ((rows && rows[0] && rows[0].grundlagen) || {}).auto_mails || {};
    NAMEN.forEach((n) => { if (am[n] === false) stand[n] = false; });
    return { statusCode: 200, headers: kopf, body: JSON.stringify(stand) };
  } catch (e) {
    console.error('auto-mail-status', e);
    // Kein Stand lesbar → Fehler melden; der Kurskalender sendet dann wie gewohnt.
    return { statusCode: 503, headers: kopf, body: JSON.stringify({ fehler: true }) };
  }
};
