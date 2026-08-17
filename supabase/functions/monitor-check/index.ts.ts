// ════════════════════════════════════════════════════════════════════
//  EDGE FUNCTION: monitor-check (v2)
//  Läuft täglich per pg_cron. Prüft ALLE aktiven Quellen PARALLEL:
//
//  1) Google-Bewertungen (falls google_place_id gesetzt + Secret vorhanden)
//     → Meldung nur bei "Spike" (mehrere neue Bewertungen auf einmal)
//  2) RSS/Atom-Feed (falls feed_url gesetzt) → neue Beitragstitel erkannt
//  3) Sonst: normale Textprüfung der URL mit echtem Satz-Diff
//     (zeigt im To-do, WAS sich geändert hat, nicht nur DASS)
//
//  Deploy: Supabase Dashboard → Edge Functions → "monitor-check" →
//  kompletten Code ersetzen → Deploy (Verify JWT AUS).
//  Optionales Secret: GOOGLE_PLACES_API_KEY (für Bewertungs-Tracking).
// ════════════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const GOOGLE_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');
const REVIEW_SPIKE_SCHWELLE = 3; // ab so vielen neuen Bewertungen auf einmal wird gemeldet
const FOTO_SPIKE_SCHWELLE = 3;   // Achtung: Places API liefert max. 10 Fotos zurück (Cap!)
const MAX_GESPEICHERTER_TEXT = 60000; // Zeichen, Sicherheitsgrenze pro Snapshot

// Zentrum für die Wettbewerber-Entdeckung (Lingen (Ems)) + Radius in Metern
const ENTDECKUNGS_ZENTRUM = { lat: 52.5236, lng: 7.3216 };
const ENTDECKUNGS_RADIUS_M = 30000;

const KATEGORIE_LABEL: Record<string, string> = {
  wettbewerber: '🔎 Wettbewerber-Update',
  autor: '📰 Neue Publikation',
  recht: '⚖️ Rechtsquelle geändert',
};

// ── Hilfsfunktionen ──
async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function holeText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FahrschulteamMonitor/1.0)' },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

function htmlZuVergleichstext(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_GESPEICHERTER_TEXT);
}

function saetze(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 25);
}

function neueSaetze(alterText: string, neuerText: string): string[] {
  const altSet = new Set(saetze(alterText));
  return saetze(neuerText).filter((s) => !altSet.has(s));
}

// Weggefallene Sätze (Gegenrichtung) – hilfreich, um z. B. Preisänderungen
// oder gestrichene Angebote zu erkennen.
function entfalleneSaetze(alterText: string, neuerText: string): string[] {
  const neuSet = new Set(saetze(neuerText));
  return saetze(alterText).filter((s) => !neuSet.has(s));
}

// ── KI-Bewertung der Änderung ────────────────────────────────────────────────
// Der reine Textvergleich meldete bisher auch Menü-, Cookie- und Datums-
// fragmente ("komische" Meldungen). Deshalb bewertet die KI den Unterschied:
// Sie liefert entweder eine präzise, belegte Meldung – oder sagt, dass nichts
// Relevantes passiert ist; dann wird gar kein To-do erzeugt.
// Der Schlüssel liegt sicher in Netlify (ANTHROPIC_API_KEY), nicht hier.
const KI_URL = Deno.env.get('KI_FUNCTION_URL')
  || 'https://fahrschulverwaltung.netlify.app/.netlify/functions/ki';

type KiBewertung = {
  relevant: boolean; titel: string; meldung: string;
  belege?: string[]; art?: string; wichtigkeit?: string;
};

async function bewerteAenderung(
  q: any, neu: string[], weg: string[],
): Promise<KiBewertung | null> {
  try {
    const res = await fetch(KI_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        aktion: 'monitor_bewerten',
        daten: { name: q.name, url: q.url, kategorie: q.kategorie, neu, weg },
      }),
      signal: AbortSignal.timeout(45000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const b = data?.bewertung;
    if (!b || typeof b.relevant !== 'boolean') return null;
    return b as KiBewertung;
  } catch {
    return null; // Bei Störung: alter Weg (Rohauszug) als Rückfallebene
  }
}

function feedTitel(xml: string): string[] {
  const treffer = [...xml.matchAll(/<(?:item|entry)[\s\S]*?<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>[\s\S]*?<\/(?:item|entry)>/gi)];
  return treffer.map((m) => m[1].trim()).filter(Boolean).slice(0, 15);
}

async function holeGoogleBewertungen(placeId: string): Promise<{ rating: number | null; review_count: number | null; photo_count: number | null }> {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=rating,user_ratings_total,photos&key=${GOOGLE_KEY}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const data = await res.json();
  if (data.status !== 'OK') throw new Error(`Places API: ${data.status}${data.error_message ? ' – ' + data.error_message : ''}`);
  return {
    rating: data.result?.rating ?? null,
    review_count: data.result?.user_ratings_total ?? null,
    // Achtung: Places API (Legacy) liefert max. 10 Fotos im Array, unabhängig von der
    // tatsächlichen Gesamtzahl. Ein Sprung ist daher nur zwischen 0 und 10 erkennbar.
    photo_count: Array.isArray(data.result?.photos) ? data.result.photos.length : null,
  };
}

// Sucht per Places API (New) Text Search nach "Fahrschule" im konfigurierten Radius
// und liefert alle gefundenen Orte mit ihrer Place-ID zurück.
async function sucheFahrschulenInRegion(): Promise<Array<{ id: string; name: string; adresse: string }>> {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_KEY!,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress',
    },
    body: JSON.stringify({
      textQuery: 'Fahrschule',
      languageCode: 'de',
      locationBias: {
        circle: {
          center: { latitude: ENTDECKUNGS_ZENTRUM.lat, longitude: ENTDECKUNGS_ZENTRUM.lng },
          radius: ENTDECKUNGS_RADIUS_M,
        },
      },
    }),
    signal: AbortSignal.timeout(20000),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Text Search: ${data.error?.message || res.status}`);
  return (data.places ?? []).map((p: any) => ({
    id: p.id,
    name: p.displayName?.text || '(ohne Namen)',
    adresse: p.formattedAddress || '',
  }));
}

async function anlegenFuerMonitorEmpfaenger(
  titel: string, beschreibung: string, auto_key: string,
  prioritaet: string = 'normal',
): Promise<{ erstellt: string[]; fehler: string[] }> {
  const erstellt: string[] = [];
  const fehler: string[] = [];

  // Primär: konfigurierte Monitor-Empfänger aus monitor_empfaenger
  const { data: empfaenger, error: empErr } = await supabase
    .from('monitor_empfaenger').select('user_id').eq('aktiv', true);

  let userIds: string[] = (empfaenger ?? []).map((e: any) => e.user_id).filter(Boolean);

  // Fallback: alle Admins wenn keine Empfänger konfiguriert
  if (userIds.length === 0) {
    const { data: admins, error: adminErr } = await supabase
      .from('app_users').select('id').in('rolle', ['admin', 'verwaltung']);
    if (adminErr) { fehler.push(`Fallback-Abfrage fehlgeschlagen: ${adminErr.message}`); return { erstellt, fehler }; }
    userIds = (admins ?? []).map((u: any) => u.id);
  }

  for (const uid of userIds) {
    const { data: existing, error: selErr } = await supabase
      .from('todos').select('id').eq('auto_key', auto_key).eq('zugewiesen_an', uid).maybeSingle();
    if (selErr) { fehler.push(`Dedup-Prüfung fehlgeschlagen (${uid}): ${selErr.message}`); continue; }
    if (existing) continue;

    const heute = new Date().toISOString().slice(0, 10);
    const { error: insErr } = await supabase.from('todos').insert({
      titel, beschreibung, faellig_am: heute, prioritaet,
      ersteller_id: uid, zugewiesen_an: uid, auto_key,
    });
    if (insErr) fehler.push(`Insert fehlgeschlagen (${auto_key} → ${uid}): ${insErr.message}`);
    else erstellt.push(`${titel} → Nutzer ${uid}`);
  }
  return { erstellt, fehler };
}

// Legacy-Wrapper für Kompatibilität mit bestehenden Aufrufen
async function anlegenFuerZielgruppe(
  rollen: string[], titel: string, beschreibung: string, auto_key: string,
  prioritaet: string = 'normal',
): Promise<{ erstellt: string[]; fehler: string[] }> {
  return anlegenFuerMonitorEmpfaenger(titel, beschreibung, auto_key, prioritaet);
}

async function pruefeVolltext(
  q: any, snap: any, patch: Record<string, unknown>,
  erstellt: string[], fehler: string[], logTeile: string[],
) {
  const html = await holeText(q.url);
  const text = htmlZuVergleichstext(html);
  const hash = await sha256(text);
  patch.hash = hash;
  patch.content = text;

  if (!snap?.hash) {
    logTeile.push('Ausgangsstand gespeichert');
    return;
  }
  if (snap.hash === hash) {
    logTeile.push('unverändert');
    return;
  }

  const neu = neueSaetze(snap.content || '', text);
  const weg = entfalleneSaetze(snap.content || '', text);
  const label = KATEGORIE_LABEL[q.kategorie] || 'Änderung erkannt';
  const key = `monitor:${q.id}:${hash}`;

  // Erst von der KI beurteilen lassen – so entstehen präzise Meldungen
  // statt Textschnipseln, und Belangloses wird gar nicht erst gemeldet.
  const b = await bewerteAenderung(q, neu, weg);

  if (b && !b.relevant) {
    logTeile.push(`geändert, aber ohne Belang (${(b.meldung || '').slice(0, 80)})`);
    return;
  }

  let titel: string;
  let beschreibung: string;
  let prio = q.prioritaet || 'normal';

  if (b) {
    titel = `${label}: ${b.titel || q.name}`;
    const belege = (b.belege || []).filter(Boolean).slice(0, 3)
      .map((z) => `„${String(z).slice(0, 200)}“`).join('\n');
    beschreibung =
      `${b.meldung}\n` +
      (belege ? `\nBelegstellen von der Seite:\n${belege}\n` : '') +
      `\nQuelle: ${q.url}\nGeprüft am: ${new Date().toLocaleDateString('de-DE')}`;
    if (b.wichtigkeit === 'hoch') prio = 'hoch';
  } else {
    // Rückfallebene, falls die KI gerade nicht erreichbar ist
    const vorschau = neu.length
      ? neu.slice(0, 3).join(' … ').slice(0, 500)
      : 'Inhalt hat sich geändert (evtl. Umstrukturierung ohne eindeutig neue Sätze).';
    titel = `${label}: ${q.name}`;
    beschreibung = `${vorschau}\n\nQuelle: ${q.url}`;
  }

  const r = await anlegenFuerZielgruppe(
    ['admin', 'verwaltung'], titel, beschreibung, key, prio,
  );
  erstellt.push(...r.erstellt); fehler.push(...r.fehler);
  logTeile.push(b ? 'ÄNDERUNG gemeldet (KI-geprüft)' : 'ÄNDERUNG erkannt (ohne KI-Prüfung)');
}

async function pruefeQuelle(q: any): Promise<{ log: string; erstellt: string[]; fehler: string[] }> {
  const erstellt: string[] = [];
  const fehler: string[] = [];
  const logTeile: string[] = [];

  const { data: snap } = await supabase.from('monitor_snapshots').select('*').eq('quelle_id', q.id).maybeSingle();
  const patch: Record<string, unknown> = { quelle_id: q.id, geprueft_am: new Date().toISOString() };

  // 1) Google-Bewertungen (Spike-Erkennung)
  if (q.google_place_id && GOOGLE_KEY) {
    try {
      const { rating, review_count, photo_count } = await holeGoogleBewertungen(q.google_place_id);
      patch.rating = rating;
      patch.review_count = review_count;
      patch.photo_count = photo_count;
      if (snap?.review_count != null && review_count != null) {
        const delta = review_count - snap.review_count;
        if (delta >= REVIEW_SPIKE_SCHWELLE) {
          const key = `monitor:${q.id}:reviews:${review_count}`;
          const r = await anlegenFuerZielgruppe(
            ['admin', 'verwaltung'],
            `📈 Auffällig viele neue Bewertungen: ${q.name}`,
            `${delta} neue Google-Bewertungen seit dem letzten Check (vorher ${snap.review_count}, jetzt ${review_count}, Ø ${rating ?? '–'}★). Ggf. gezielte Werbeaktion des Wettbewerbers.`,
            key,
            q.prioritaet || 'normal',
          );
          erstellt.push(...r.erstellt); fehler.push(...r.fehler);
          logTeile.push('Bewertungs-SPIKE erkannt');
        } else {
          logTeile.push(`Bewertungen ok (${review_count})`);
        }
      } else {
        logTeile.push(`Bewertungen: Ausgangsstand (${review_count ?? '–'})`);
      }
      if (snap?.photo_count != null && photo_count != null) {
        const deltaFoto = photo_count - snap.photo_count;
        if (deltaFoto >= FOTO_SPIKE_SCHWELLE) {
          const key = `monitor:${q.id}:fotos:${photo_count}`;
          const r = await anlegenFuerZielgruppe(
            ['admin', 'verwaltung'],
            `📸 Viele neue Google-Fotos: ${q.name}`,
            `Fotoanzahl bei Google ist von ${snap.photo_count} auf ${photo_count} gestiegen (Hinweis: Places API zeigt max. 10 an, evtl. sind es tatsächlich mehr).`,
            key,
            q.prioritaet || 'normal',
          );
          erstellt.push(...r.erstellt); fehler.push(...r.fehler);
          logTeile.push('Foto-Sprung erkannt');
        }
      }
    } catch (e) {
      fehler.push(`${q.name} [Google]: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // 2) Inhalt: Feed bevorzugt, sonst Volltext-Vergleich
  try {
    if (q.feed_url) {
      let titel: string[] = [];
      try {
        titel = feedTitel(await holeText(q.feed_url));
      } catch {
        titel = [];
      }
      if (titel.length) {
        patch.feed_items = titel;
        const alte = new Set((snap?.feed_items as string[] | null) ?? []);
        const neu = titel.filter((t) => !alte.has(t));
        if (!snap?.feed_items) {
          logTeile.push('Feed: Ausgangsstand gespeichert');
        } else if (neu.length) {
          const key = `monitor:${q.id}:feed:${await sha256(neu.join('|'))}`;
          const label = KATEGORIE_LABEL[q.kategorie] || 'Neuer Beitrag';
          const r = await anlegenFuerZielgruppe(
            ['admin', 'verwaltung'],
            `${label}: ${q.name}`,
            `Neue Beiträge erkannt:\n– ${neu.join('\n– ')}`,
            key,
            q.prioritaet || 'normal',
          );
          erstellt.push(...r.erstellt); fehler.push(...r.fehler);
          logTeile.push(`Feed: ${neu.length} neue(r) Beitrag/Beiträge`);
        } else {
          logTeile.push('Feed: unverändert');
        }
      } else {
        await pruefeVolltext(q, snap, patch, erstellt, fehler, logTeile);
      }
    } else {
      await pruefeVolltext(q, snap, patch, erstellt, fehler, logTeile);
    }
    // Erfolgreich durchgelaufen: Fehlerhistorie dieser Quelle zurücksetzen
    patch.letzter_fehler = null;
    patch.fehler_seit = null;
    patch.fehler_anzahl = 0;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    fehler.push(`${q.name} [Inhalt]: ${msg}`);
    patch.letzter_fehler = msg;
    patch.fehler_seit = snap?.fehler_seit || new Date().toISOString();
    patch.fehler_anzahl = (snap?.fehler_anzahl || 0) + 1;
  }

  await supabase.from('monitor_snapshots').upsert(patch, { onConflict: 'quelle_id' });

  return { log: `${q.name}: ${logTeile.join(' · ') || 'geprüft'}`, erstellt, fehler };
}

async function entdeckeNeueWettbewerber(): Promise<{ geprueft: string[]; erstellt: string[]; fehler: string[] }> {
  const geprueft: string[] = [];
  const erstellt: string[] = [];
  const fehler: string[] = [];

  if (!GOOGLE_KEY) {
    fehler.push('GOOGLE_PLACES_API_KEY nicht gesetzt – Entdeckung übersprungen.');
    return { geprueft, erstellt, fehler };
  }

  try {
    const gefunden = await sucheFahrschulenInRegion();
    const { data: quellen } = await supabase.from('monitor_quellen').select('google_place_id').not('google_place_id', 'is', null);
    const bekannt = new Set((quellen ?? []).map((q: any) => q.google_place_id));
    const { data: bereitsGesehen } = await supabase.from('monitor_entdeckungen').select('place_id');
    (bereitsGesehen ?? []).forEach((e: any) => bekannt.add(e.place_id));

    const neue = gefunden.filter((p) => !bekannt.has(p.id));
    for (const p of neue) {
      const { error: insErr } = await supabase.from('monitor_entdeckungen')
        .insert({ place_id: p.id, name: p.name, adresse: p.adresse, status: 'neu' });
      if (insErr) { fehler.push(`Entdeckung speichern (${p.name}): ${insErr.message}`); continue; }
      const r = await anlegenFuerZielgruppe(
        ['admin', 'verwaltung'],
        `🆕 Neue Fahrschule entdeckt: ${p.name}`,
        `Bei Google im 30-km-Radius neu gefunden: ${p.adresse}. Zur Prüfung unter "Wettbewerb & Recht → Neu entdeckt".`,
        `monitor:discovery:${p.id}`,
      );
      erstellt.push(...r.erstellt); fehler.push(...r.fehler);
    }
    geprueft.push(`Entdeckung: ${gefunden.length} Treffer, ${neue.length} davon neu`);
  } catch (e) {
    fehler.push(`Entdeckung: ${e instanceof Error ? e.message : String(e)}`);
  }

  return { geprueft, erstellt, fehler };
}

async function erstelleFehlerbericht(): Promise<{ geprueft: string[]; erstellt: string[]; fehler: string[] }> {
  const geprueft: string[] = [];
  const erstellt: string[] = [];
  const fehler: string[] = [];

  // "Dauerhaft" = seit mindestens 3 Tagen ununterbrochen fehlerhaft (keine einmaligen Ausrutscher)
  const grenze = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('monitor_snapshots')
    .select('letzter_fehler, fehler_seit, fehler_anzahl, monitor_quellen(name, url)')
    .not('fehler_seit', 'is', null)
    .lt('fehler_seit', grenze);

  if (error) {
    fehler.push(`Fehlerbericht-Abfrage fehlgeschlagen: ${error.message}`);
    return { geprueft, erstellt, fehler };
  }

  if (!data || data.length === 0) {
    geprueft.push('Fehlerbericht: keine dauerhaft fehlerhaften Quellen');
    return { geprueft, erstellt, fehler };
  }

  const zeilen = data.map((d: any) => {
    const name = d.monitor_quellen?.name ?? '?';
    const seit = new Date(d.fehler_seit).toLocaleDateString('de-DE');
    return `– ${name}: seit ${seit}, ${d.fehler_anzahl}× fehlgeschlagen – ${d.letzter_fehler}`;
  });

  const key = `monitor:fehlerbericht:${new Date().toISOString().slice(0, 10)}`;
  const r = await anlegenFuerZielgruppe(
    ['admin', 'verwaltung'],
    `⚠️ ${data.length} Quelle(n) dauerhaft fehlerhaft – bitte prüfen`,
    `Diese Quellen im Monitor konnten seit mindestens 3 Tagen nicht mehr erfolgreich geprüft werden (z.B. geänderte URL, umgebaute Seite):\n\n${zeilen.join('\n')}\n\nBitte unter "Wettbewerb & Recht" die URL prüfen/korrigieren oder die Quelle deaktivieren.`,
    key,
    'hoch',
  );
  erstellt.push(...r.erstellt); fehler.push(...r.fehler);
  geprueft.push(`Fehlerbericht: ${data.length} dauerhaft fehlerhafte Quelle(n) gemeldet`);

  return { geprueft, erstellt, fehler };
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('CRON_SECRET');
  if (secret) {
    const given = req.headers.get('x-cron-secret');
    if (given !== secret) return new Response('unauthorized', { status: 401 });
  }

  const hatServiceKey = !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const hatUrl = !!Deno.env.get('SUPABASE_URL');
  if (!hatServiceKey || !hatUrl) {
    return new Response(JSON.stringify({
      ok: false,
      fehler: [`Konfigurationsfehler: SUPABASE_URL vorhanden=${hatUrl}, SUPABASE_SERVICE_ROLE_KEY vorhanden=${hatServiceKey}.`],
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  let body: any = {};
  try { body = await req.json(); } catch { /* leerer Body ist ok (Cron/manueller Test) */ }

  if (body?.modus === 'discovery') {
    const r = await entdeckeNeueWettbewerber();
    return new Response(JSON.stringify({ ok: r.fehler.length === 0, ...r }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (body?.modus === 'fehlerbericht') {
    const r = await erstelleFehlerbericht();
    return new Response(JSON.stringify({ ok: r.fehler.length === 0, ...r }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: quellen, error: qErr } = await supabase
    .from('monitor_quellen').select('*').eq('aktiv', true);
  if (qErr) {
    return new Response(JSON.stringify({ ok: false, fehler: [`monitor_quellen-Abfrage fehlgeschlagen: ${qErr.message}`] }),
      { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  const ergebnisse = await Promise.allSettled((quellen ?? []).map(pruefeQuelle));

  const geprueft: string[] = [];
  const erstellt: string[] = [];
  const fehler: string[] = [];
  ergebnisse.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      geprueft.push(r.value.log);
      erstellt.push(...r.value.erstellt);
      fehler.push(...r.value.fehler);
    } else {
      fehler.push(`${quellen?.[i]?.name ?? '?'}: ${r.reason}`);
    }
  });

  return new Response(JSON.stringify({ ok: fehler.length === 0, geprueft, erstellt, fehler }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
