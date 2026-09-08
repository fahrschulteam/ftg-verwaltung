// ════════════════════════════════════════════════════════════════════
//  FIRMENPORTAL-API – Fahrschulteam Thorsten Gels
//
//  Firmen melden sich mit ihrem Zugangscode an und sehen/ändern
//  AUSSCHLIESSLICH die eigenen Fahrer. Alle Datenbank-Zugriffe laufen
//  hier serverseitig – das Portal selbst bekommt nie einen Datenbank-
//  Schlüssel. Änderbar sind Kontaktdaten (Adresse, Telefon, E-Mail).
//
//  Firmeninterne Termine: Kurszeilen in schulung_courses mit gesetzter
//  firma_id. Diese Termine sind aus dem öffentlichen Kurskalender
//  (View kurskalender_public) ausgeblendet und nur hier sichtbar.
//  Die Firma kann eigene Fahrer zuordnen, wieder austragen und neue
//  Fahrer anlegen. Die company_id wird IMMER serverseitig aus dem
//  Zugangscode abgeleitet, niemals aus der Anfrage übernommen.
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

// Ein Termin ist die Gruppe aus Datum + Kursart + Ort – genau wie in der
// View kurskalender_public. Der Schlüssel identifiziert ihn eindeutig.
const terminKey = (r) => [r.date_from || '', r.type || '', r.location || ''].join('|');

const text = (v, max) => String(v == null ? '' : v).trim().slice(0, max || 200);
const istDatum = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''));
// Jeder Teilnehmer braucht eine legacy_id – die Verwaltung verknuepft darueber.
const neueLegacyId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

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

// Alle Kurszeilen dieser Firma ab heute – Grundlage für Anzeige und Prüfung.
async function interneZeilen(firmaId, abDatum) {
  return supa(
    `schulung_courses?firma_id=eq.${firmaId}&date_from=gte.${abDatum}` +
    `&select=id,type,date_from,date_to,location,capacity,participant_id,passed,note` +
    `&order=date_from.asc&limit=2000`,
  );
}

// Kurszeilen zu Terminen zusammenfassen (gleiche Logik wie kurskalender_public).
function zuTerminen(zeilen) {
  const map = new Map();
  for (const r of zeilen) {
    const k = terminKey(r);
    if (!map.has(k)) {
      map.set(k, { key: k, type: r.type || '', date: r.date_from || '', bis: r.date_to || '', location: r.location || '', capacity: 0, belegt: 0, fahrer: [], termine: '' });
    }
    const g = map.get(k);
    const cap = +r.capacity || 0;
    if (cap > g.capacity) g.capacity = cap;
    if (r.date_to && r.date_to > g.bis) g.bis = r.date_to;
    if (!g.termine && r.note) {
      const m = String(r.note).match(/Termine:.*/);
      if (m) g.termine = m[0];
    }
    if (r.participant_id) { g.belegt += 1; g.fahrer.push(r.participant_id); }
  }
  return [...map.values()];
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return antwort(200, { ok: true });
  if (event.httpMethod !== 'POST') return antwort(405, { success: false, message: 'Nur POST erlaubt.' });

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch { return antwort(400, { success: false, message: 'Ungültige Anfrage.' }); }

  const code = String(body.code || '').trim().toUpperCase();
  if (!code || code.length < 6) return antwort(401, { success: false, message: 'Bitte den Zugangscode Ihrer Firma eingeben.' });

  const heute = new Date().toISOString().slice(0, 10);
  const jetzt = new Date().toISOString();

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
      erlaubt.updated_at = jetzt;
      // company_id-Filter stellt sicher: nur eigene Fahrer sind änderbar.
      const r = await fetch(
        `${SUPA_URL}/rest/v1/schulung_participants?id=eq.${encodeURIComponent(body.id)}&company_id=eq.${firma.id}`,
        { method: 'PATCH', headers: { ...HEAD, Prefer: 'return=representation' }, body: JSON.stringify(erlaubt) },
      );
      const rows = r.ok ? await r.json() : [];
      if (!r.ok || !rows.length) return antwort(403, { success: false, message: 'Dieser Fahrer gehört nicht zu Ihrer Firma.' });
      return antwort(200, { success: true });
    }

    // ── Neuen Fahrer der eigenen Firma anlegen ─────────────────────────
    if (body.action === 'neuerFahrer') {
      const f = body.fahrer || {};
      const vorname = text(f.first_name, 80);
      const nachname = text(f.last_name, 80);
      if (!vorname || !nachname) return antwort(400, { success: false, message: 'Vorname und Nachname werden benötigt.' });

      const bestand = await supa(`schulung_participants?company_id=eq.${firma.id}&select=id,first_name,last_name,birth&limit=2000`);
      const norm = (s) => String(s || '').trim().toLowerCase();
      const dublette = (bestand || []).find((x) =>
        norm(x.first_name) === norm(vorname) && norm(x.last_name) === norm(nachname)
        && (!istDatum(f.birth) || !x.birth || x.birth === f.birth));
      if (dublette) return antwort(409, { success: false, message: 'Dieser Fahrer ist bereits angelegt.' });

      // company_id kommt aus dem Zugangscode, nie aus der Anfrage.
      const neu = {
        first_name: vorname,
        last_name: nachname,
        company_id: firma.id,
        legacy_id: neueLegacyId(),
        created_at: jetzt,
        updated_at: jetzt,
        ext_dates: { PORTAL_NEU: heute },
      };
      if (istDatum(f.birth)) neu.birth = f.birth;
      for (const feld of ['birthplace', 'street', 'zip', 'city', 'phone', 'email']) {
        const w = text(f[feld], 200);
        if (w) neu[feld] = w;
      }

      const r = await fetch(`${SUPA_URL}/rest/v1/schulung_participants`,
        { method: 'POST', headers: { ...HEAD, Prefer: 'return=representation' }, body: JSON.stringify(neu) });
      const rows = r.ok ? await r.json() : [];
      if (!r.ok || !rows.length) return antwort(500, { success: false, message: 'Der Fahrer konnte nicht angelegt werden.' });
      const p = rows[0];
      return antwort(200, {
        success: true,
        fahrer: {
          id: p.id,
          name: [p.last_name, p.first_name].filter(Boolean).join(', '),
          birth: p.birth || '',
          street: p.street || '', zip: p.zip || '', city: p.city || '',
          phone: p.phone || '', email: p.email || '',
          fe: '', sz95: '', module: 0, fehlen: 5,
        },
      });
    }

    // ── Fahrer einem firmeninternen Termin zuordnen ────────────────────
    if (body.action === 'zuordnen') {
      const key = String(body.key || '');
      const ids = Array.isArray(body.ids) ? body.ids.slice(0, 100).map(String) : [];
      if (!key || !ids.length) return antwort(400, { success: false, message: 'Bitte mindestens einen Fahrer auswählen.' });

      const zeilen = await interneZeilen(firma.id, heute);
      const treffer = (zeilen || []).filter((r) => terminKey(r) === key);
      if (!treffer.length) return antwort(404, { success: false, message: 'Dieser Termin gehört nicht zu Ihrer Firma.' });

      const vorlage = treffer[0];
      const kapazitaet = Math.max(...treffer.map((r) => +r.capacity || 0));
      const belegt = treffer.filter((r) => r.participant_id).length;
      const schonDrin = new Set(treffer.filter((r) => r.participant_id).map((r) => r.participant_id));

      // Nur Fahrer der eigenen Firma – Prüfung serverseitig, nicht im Browser.
      const eigene = await supa(`schulung_participants?company_id=eq.${firma.id}&select=id,legacy_id&limit=2000`);
      const erlaubteIds = new Set((eigene || []).map((x) => x.id));
      const legacyVon = {};
      (eigene || []).forEach((x) => { legacyVon[x.id] = x.legacy_id || x.id; });
      const neueIds = ids.filter((id) => erlaubteIds.has(id) && !schonDrin.has(id));

      if (!neueIds.length) return antwort(200, { success: true, hinzugefuegt: 0, message: 'Diese Fahrer sind bereits eingetragen.' });
      if (kapazitaet > 0 && belegt + neueIds.length > kapazitaet) {
        return antwort(400, { success: false, message: `Für diesen Termin sind noch ${Math.max(0, kapazitaet - belegt)} Plätze frei.` });
      }

      const neueZeilen = neueIds.map((id) => ({
        participant_id: id,
        participant_legacy: legacyVon[id],
        type: vorlage.type,
        date_from: vorlage.date_from,
        date_to: vorlage.date_to,
        location: vorlage.location,
        capacity: vorlage.capacity,
        firma_id: firma.id,
        created_at: jetzt,
        updated_at: jetzt,
      }));
      const r = await fetch(`${SUPA_URL}/rest/v1/schulung_courses`,
        { method: 'POST', headers: { ...HEAD, Prefer: 'return=minimal' }, body: JSON.stringify(neueZeilen) });
      if (!r.ok) return antwort(500, { success: false, message: 'Die Zuordnung konnte nicht gespeichert werden.' });
      return antwort(200, { success: true, hinzugefuegt: neueIds.length });
    }

    // ── Fahrer wieder aus einem firmeninternen Termin austragen ────────
    if (body.action === 'austragen') {
      const key = String(body.key || '');
      const id = String(body.id || '');
      if (!key || !id) return antwort(400, { success: false, message: 'Angabe unvollständig.' });

      const zeilen = await interneZeilen(firma.id, heute);
      const zeile = (zeilen || []).find((r) => terminKey(r) === key && r.participant_id === id);
      if (!zeile) return antwort(404, { success: false, message: 'Dieser Eintrag wurde nicht gefunden.' });
      if (zeile.passed) return antwort(403, { success: false, message: 'Dieser Kurs ist bereits abgeschlossen und kann nicht geändert werden.' });

      // firma_id-Filter im Löschbefehl: fremde Zeilen sind nicht erreichbar.
      const r = await fetch(
        `${SUPA_URL}/rest/v1/schulung_courses?id=eq.${encodeURIComponent(zeile.id)}&firma_id=eq.${firma.id}`,
        { method: 'DELETE', headers: { ...HEAD, Prefer: 'return=minimal' } },
      );
      if (!r.ok) return antwort(500, { success: false, message: 'Der Eintrag konnte nicht entfernt werden.' });
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
    // Firmeninterne Termine – nur für diese Firma sichtbar
    let intern = [];
    try { intern = zuTerminen(await interneZeilen(firma.id, heute)); } catch { intern = []; }

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
      intern,
    });
  } catch (e) {
    console.error('firmenportal', e);
    return antwort(500, { success: false, message: 'Der Dienst ist gerade nicht erreichbar. Bitte später erneut versuchen.' });
  }
};
