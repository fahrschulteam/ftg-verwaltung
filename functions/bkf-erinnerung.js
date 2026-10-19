// ════════════════════════════════════════════════════════════════════
//  BKF-ERINNERUNG – einmalige E-Mail 6 Monate vor Ablauf der Schlüsselzahl 95
//
//  Läuft automatisch einmal täglich (Zeitplan in netlify.toml). Ablauf:
//    1. Alle Teilnehmer suchen, deren Stichtag (ext_dates.SZ95) in 5 bis 6
//       Monaten liegt. Die Spanne von einem Monat fängt Tage ab, an denen der
//       Lauf ausfällt, und Stichtage, die etwas später eingetragen werden.
//    2. Überspringen, wenn: keine E-Mail-Adresse, schon alle 5 Module
//       vorhanden, für diesen Stichtag bereits erinnert, oder Erinnerungen
//       abbestellt (ext_dates.BKF_ERINNERUNG_AUS).
//    3. E-Mail mit dem persönlichen Link „Mein BKF-Stand" senden (Brevo).
//    0. Ist die Nachricht in den Einstellungen ausgeschaltet, passiert nichts.
//    4. Vermerken: ext_dates.BKF_ERINNERT = Stichtag, BKF_ERINNERT_AM = heute.
//       Dadurch gibt es je Stichtag genau EINE Erinnerung. Nach einer
//       Verlängerung (neuer Stichtag) gibt es fünf Jahre später wieder eine.
//
//  Geplante Funktionen sind bei Netlify nicht über eine Internetadresse
//  aufrufbar – niemand kann den Versand von außen auslösen.
// ════════════════════════════════════════════════════════════════════

const crypto = require('crypto');

const SUPA_URL = 'https://ejuhpgcwskyqwheinlub.supabase.co';
const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const BREVO_KEY = process.env.BREVO_API_KEY || '';
const SEITE = 'https://fahrschulverwaltung.netlify.app/mein-bkf.html?k=';
const MAX_JE_LAUF = 40;   // Sicherheitsgrenze je Tag (Laufzeit + Schutz vor Massenversand)

const HEAD = { apikey: SUPA_KEY, authorization: `Bearer ${SUPA_KEY}`, 'content-type': 'application/json' };

async function supa(pfad) {
  const r = await fetch(`${SUPA_URL}/rest/v1/${pfad}`, { headers: HEAD });
  if (!r.ok) throw new Error(`Datenbank ${r.status}`);
  return r.json();
}

const iso = (d) => d.toISOString().slice(0, 10);
const de = (s) => String(s || '').slice(0, 10).split('-').reverse().join('.');
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function plusMonate(datum, n) {
  const d = new Date(datum + 'T12:00:00Z');
  const tag = d.getUTCDate();
  d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + n);
  const letzter = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(tag, letzter));
  return iso(d);
}

// Gleiche Zählweise wie Verwaltung und Firmenportal:
// 7 UE = 1 Modul; Fenster = 5 Jahre vor dem Stichtag.
function moduleVorhanden(p, kurse) {
  const ext = p.ext_dates || {};
  const sz95 = ext.SZ95;
  const start = plusMonate(sz95, -60);
  const alt = Math.min(5, Math.floor((+ext.BKF_UE || 0) / 7));
  const stand = ext.BKF_STAND || '';
  const eigene = new Set(
    kurse
      .filter((k) => (k.participant_id && k.participant_id === p.id) || (k.participant_legacy && k.participant_legacy === (p.legacy_id || p.id)))
      .filter((k) => { const d = k.date_from || ''; return d >= start && d <= sz95; })
      .filter((k) => !stand || (k.date_from || '') > stand)
      .map((k) => k.type),
  ).size;
  const externe = new Set(
    (Array.isArray(ext.BKF_EXT) ? ext.BKF_EXT : [])
      .filter((e) => { const d = e.d || ''; return d >= start && d <= sz95 && (!stand || d > stand); })
      .map((e) => e.d),
  ).size;
  return Math.min(5, alt + eigene + externe);
}

const neuerSchluessel = () => {
  const z = 'abcdefghijkmnpqrstuvwxyz23456789';
  return Array.from(crypto.randomBytes(20)).map((x) => z[x % 32]).join('');
};

function mailHtml(p, sz95, fehlen, link) {
  const name = [p.first_name, p.last_name].filter(Boolean).join(' ');
  const anrede = name ? `Guten Tag ${esc(name)},` : 'Guten Tag,';
  const modulText = fehlen === 1 ? 'fehlt Ihnen noch <b>1 Modul</b>' : `fehlen Ihnen noch <b>${fehlen} Module</b>`;
  return `<div style="font-family:Arial,sans-serif;color:#1c2126;max-width:640px;margin:0 auto">
    <div style="background:#1c2126;color:#fff;padding:18px 24px;border-radius:12px 12px 0 0">
      <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#f3b6b8">Fahrschulteam Thorsten Gels</div>
      <div style="font-size:20px;font-weight:bold;margin-top:2px">Ihre Schlüsselzahl 95 läuft in 6 Monaten ab</div>
    </div>
    <div style="border:1px solid #e7e9ee;border-top:0;border-radius:0 0 12px 12px;padding:24px">
      <p>${anrede}</p>
      <p>Ihre BKF-Qualifikation (Schlüsselzahl 95) ist nach unseren Unterlagen gültig bis zum <b>${de(sz95)}</b>. Für die Verlängerung ${modulText} der Weiterbildung.</p>
      <table cellpadding="0" cellspacing="0" style="margin:18px 0"><tr><td style="background:#f6f7f9;border:1px solid #e7e9ee;border-radius:10px;padding:14px 20px">
        <div style="font-size:15px;font-weight:bold">Welche Module fehlen Ihnen noch?</div>
        <div style="font-size:13px;color:#5b6570;margin:4px 0 12px 0">Auf Ihrer persönlichen Seite sehen Sie Ihren Stand und passende Termine. Schulungen bei anderen Anbietern, ADR oder Tiertransport können Sie dort selbst eintragen.</div>
        <a href="${link}" style="display:inline-block;background:#d71920;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;padding:10px 16px;border-radius:8px">Mein BKF-Stand öffnen</a>
      </td></tr></table>
      <p>Planen Sie die Module bitte rechtzeitig ein – ohne gültige Schlüsselzahl 95 dürfen Sie nicht gewerblich fahren.</p>
      <p style="margin-top:20px">Bei Fragen sind wir gern für Sie da: <b>0591 / 51403</b> oder <a href="mailto:lingen@fahrschulteam.info" style="color:#d71920">lingen@fahrschulteam.info</a>.</p>
      <p style="margin-top:18px">Mit freundlichen Grüßen<br><b>Thorsten Gels</b><br>Fahrschulteam Thorsten Gels<br>Rheiner Str. 158 · 49809 Lingen (Ems)<br>0591 / 51403 · www.fahrschulteam.info</p>
      <p style="margin-top:18px;font-size:12px;color:#5b6570">Diese Erinnerung erhalten Sie einmalig, weil Sie bei uns als Teilnehmer der BKF-Weiterbildung geführt sind. Wenn Sie keine Erinnerungen wünschen oder das Datum nicht stimmt, antworten Sie bitte kurz auf diese E-Mail.</p>
    </div></div>`;
}

async function senden(p, html) {
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'api-key': BREVO_KEY },
    body: JSON.stringify({
      sender: { name: 'Fahrschulteam Thorsten Gels', email: 'lingen@fahrschulteam.info' },
      replyTo: { name: 'Fahrschulteam Thorsten Gels', email: 'lingen@fahrschulteam.info' },
      to: [{ email: p.email.trim(), name: [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email.trim() }],
      subject: 'Ihre Schlüsselzahl 95 läuft in 6 Monaten ab – diese Module fehlen noch',
      htmlContent: html,
    }),
  });
  return r.ok;
}

exports.handler = async () => {
  const bericht = { geprueft: 0, gesendet: 0, uebersprungen: 0, fehler: 0 };
  if (!SUPA_KEY || !BREVO_KEY) {
    console.error('bkf-erinnerung: SUPABASE_SERVICE_KEY oder BREVO_API_KEY fehlt');
    return { statusCode: 500, body: 'Konfiguration fehlt' };
  }
  try {
    // Schalter in den Einstellungen (Automatische Nachrichten). Lässt sich der
    // Schalter nicht lesen, wird sicherheitshalber NICHT versendet.
    const fa = await supa('firma?id=eq.1&select=grundlagen');
    const am = ((fa && fa[0] && fa[0].grundlagen) || {}).auto_mails || {};
    if (am.bkf_erinnerung === false) {
      console.log('bkf-erinnerung: in den Einstellungen ausgeschaltet');
      return { statusCode: 200, body: JSON.stringify({ aus: true }) };
    }
    const heute = iso(new Date());
    const von = plusMonate(heute, 5);
    const bis = plusMonate(heute, 6);
    const kandidaten = await supa(
      `schulung_participants?and=(ext_dates->>SZ95.gte.${von},ext_dates->>SZ95.lte.${bis})` +
      '&select=id,legacy_id,first_name,last_name,email,ext_dates&limit=1000',
    );
    const offen = (kandidaten || []).filter((p) => {
      const ext = p.ext_dates || {};
      return /^\d{4}-\d{2}-\d{2}$/.test(ext.SZ95 || '')
        && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(p.email || '').trim())
        && ext.BKF_ERINNERT !== ext.SZ95
        && !ext.BKF_ERINNERUNG_AUS;
    });
    bericht.geprueft = (kandidaten || []).length;
    bericht.uebersprungen = bericht.geprueft - offen.length;
    if (!offen.length) { console.log('bkf-erinnerung', JSON.stringify(bericht)); return { statusCode: 200, body: JSON.stringify(bericht) }; }

    const kurse = await supa('schulung_courses?select=participant_id,participant_legacy,type,date_from&type=like.BKF*&passed=is.true&limit=20000');

    for (const p of offen) {
      if (bericht.gesendet >= MAX_JE_LAUF) break;
      const ext = { ...(p.ext_dates || {}) };
      const fehlen = 5 - moduleVorhanden(p, kurse || []);
      if (fehlen <= 0) { bericht.uebersprungen += 1; continue; }

      if (!/^[a-z0-9]{16,40}$/.test(ext.BKF_LINK || '')) ext.BKF_LINK = neuerSchluessel();
      ext.BKF_ERINNERT = ext.SZ95;
      ext.BKF_ERINNERT_AM = heute;

      // Erst vermerken, dann senden: Schlägt das Vermerken fehl, geht keine
      // E-Mail raus – so kann nie jemand täglich dieselbe Erinnerung bekommen.
      const r = await fetch(`${SUPA_URL}/rest/v1/schulung_participants?id=eq.${encodeURIComponent(p.id)}`, {
        method: 'PATCH', headers: { ...HEAD, Prefer: 'return=minimal' },
        body: JSON.stringify({ ext_dates: ext, updated_at: new Date().toISOString() }),
      });
      if (!r.ok) { bericht.fehler += 1; continue; }

      let ok = false;
      try { ok = await senden(p, mailHtml(p, ext.SZ95, fehlen, SEITE + ext.BKF_LINK)); } catch { ok = false; }
      if (ok) { bericht.gesendet += 1; continue; }

      // Versand fehlgeschlagen: Vermerk zurücknehmen, morgen neuer Versuch
      bericht.fehler += 1;
      delete ext.BKF_ERINNERT; delete ext.BKF_ERINNERT_AM;
      await fetch(`${SUPA_URL}/rest/v1/schulung_participants?id=eq.${encodeURIComponent(p.id)}`, {
        method: 'PATCH', headers: { ...HEAD, Prefer: 'return=minimal' },
        body: JSON.stringify({ ext_dates: ext, updated_at: new Date().toISOString() }),
      }).catch(() => {});
    }
    console.log('bkf-erinnerung', JSON.stringify(bericht));
    return { statusCode: 200, body: JSON.stringify(bericht) };
  } catch (e) {
    console.error('bkf-erinnerung', e);
    return { statusCode: 500, body: 'Fehler' };
  }
};
