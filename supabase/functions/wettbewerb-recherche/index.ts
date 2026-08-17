// ════════════════════════════════════════════════════════════════════
//  EDGE FUNCTION: wettbewerb-recherche
//  Erstellt für EINEN Wettbewerber (oder eine andere überwachte Quelle)
//  einen Rechercheberichtein – mit echter Web-Suche, wie ein Agent:
//  Die KI sucht selbst, liest die Treffer, vergleicht mit dem letzten
//  Bericht und schreibt eine Einschätzung mit Quellenangaben.
//
//  Aufruf aus der App:  sb.functions.invoke('wettbewerb-recherche',
//                         { body: { quelle_id: '…' } })
//
//  Benötigte Secrets (Supabase → Settings → Edge Functions → Secrets):
//    ANTHROPIC_API_KEY   – derselbe Schlüssel wie in Netlify
//  Deploy: über update.cmd oder Supabase-Dashboard. Verify JWT AUS.
// ════════════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const MODELL = 'claude-sonnet-4-6';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

// ── Kostenbremse ────────────────────────────────────────────────────────
// Jede Recherche kostet echtes Geld (Web-Suche, rund 20 Cent pro Bericht).
// Diese Funktion ist oeffentlich erreichbar. Damit ein Versehen oder ein
// fremder Dauer-Aufruf nicht ins Geld geht, ist die Zahl der Berichte je
// 24 Stunden begrenzt. Wert aenderbar ueber das Supabase-Secret
// RECHERCHE_TAGESLIMIT (Standard: 12 Berichte, also hoechstens ca. 2,40 €).
const TAGESLIMIT = Math.max(1, Number(Deno.env.get('RECHERCHE_TAGESLIMIT') ?? '12'));

async function budgetFrei(): Promise<number> {
  const seit = new Date(Date.now() - 86400000).toISOString();
  const { count, error } = await supabase
    .from('monitor_briefings')
    .select('id', { count: 'exact', head: true })
    .gte('erstellt_am', seit);
  // Bei einem Lesefehler nicht blockieren, aber vorsichtig weitermachen.
  if (error) return 1;
  return Math.max(0, TAGESLIMIT - (count ?? 0));
}

// ── Herkunftspruefung (leichtgewichtig) ─────────────────────────────────
// Der Zeitplan (pg_cron) ruft ohne Origin-Kopfzeile auf – das bleibt erlaubt.
// Kommt der Aufruf aber aus einem Browser einer FREMDEN Seite, wird er
// abgewiesen. Das verhindert, dass jemand die Funktion von seiner eigenen
// Webseite aus anstoesst.
const ERLAUBTE_HOSTS = ['fahrschulverwaltung.netlify.app', 'fahrschulteam.info', 'localhost', '127.0.0.1'];

function herkunftOk(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true; // Zeitplan / Server-zu-Server
  let host = '';
  try { host = new URL(origin).hostname.toLowerCase(); } catch { return false; }
  return ERLAUBTE_HOSTS.some((h) => host === h || host.endsWith('.' + h) || host.endsWith('--' + h));
}

// Eigene Fahrschule – als Bezugspunkt für die Einschätzung.
const WIR = 'Fahrschulteam Thorsten Gels, Rheiner Str. 158, 49809 Lingen (Ems) – Schwerpunkte: BKF-Weiterbildung (§ 5 BKrFQG), Berufskraftfahrer-Ausbildung, ADR, Stapler, Ladungssicherung, Führerscheinklassen bis CE/DE.';

function baueAuftrag(q: any, letzter: any): string {
  const heute = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
  const seit = letzter?.erstellt_am
    ? new Date(letzter.erstellt_am).toLocaleDateString('de-DE')
    : null;

  return [
    `Du bist Marktbeobachter für: ${WIR}`,
    `Heutiges Datum: ${heute}.`,
    '',
    `AUFTRAG: Recherchiere im Internet den aktuellen Stand zu diesem Mitbewerber und berichte, was sich verändert hat.`,
    `Name: ${q.name}`,
    q.url ? `Website: ${q.url}` : '',
    q.ort ? `Ort/Region: ${q.ort}` : '',
    q.notiz ? `Interne Notiz: ${q.notiz}` : '',
    '',
    seit
      ? `Es gab bereits einen Bericht vom ${seit}. Berichte vor allem, was SEITDEM neu ist. Bekanntes bitte nicht wiederholen. Auszug aus dem letzten Bericht:\n"""\n${String(letzter.bericht || '').slice(0, 1800)}\n"""`
      : 'Es ist der erste Bericht zu diesem Mitbewerber. Erfasse den aktuellen Stand kompakt.',
    '',
    'PRÜFE GEZIELT DIESE PUNKTE (nutze die Web-Suche, mehrere Suchanfragen sind erwünscht):',
    '1. Standorte: neue Filialen, Umzüge, Schließungen, angekündigte Eröffnungen (mit Datum und Adresse).',
    '2. Angebot: neue Kurse, Lehrgänge, Klassen, Kooperationen, Förderangebote.',
    '3. Preise: veröffentlichte Preise oder Preisaktionen, Änderungen gegenüber früher.',
    '4. Personal: Stellenanzeigen, neue Fahrlehrer, Geschäftsführungswechsel.',
    '5. Außenwirkung: Google-Bewertungen (Anzahl/Schnitt), Presseberichte, auffällige Kampagnen.',
    '',
    'REGELN:',
    '- Stütze jede Aussage auf eine gefundene Quelle. Erfinde nichts und vermute nichts.',
    '- Widersprüche ausdrücklich benennen (z. B. zwei verschiedene Adressen für denselben Standort auf derselben Website).',
    '- Punkte, die du geprüft hast, zu denen du aber nichts Belastbares gefunden hast, ausdrücklich als "geprüft, kein Befund" erwähnen.',
    '- Kurz begründen, warum eine Feststellung für uns wettbewerbsrelevant ist (oder warum nicht).',
    '- Sprache: Deutsch, sachlich, ganze Sätze, keine Aufzählungszeichen im Fließtext, keine Emojis.',
    '',
    'Antworte AUSSCHLIESSLICH mit einem JSON-Objekt, kein Markdown, keine Erklärung davor oder danach:',
    `{
  "titel": "kurze Überschrift, max. 80 Zeichen",
  "relevanz": "hoch|normal|niedrig",
  "bericht": "Fließtext, 3 bis 6 Absätze, mit Leerzeile zwischen den Absätzen. Erst die wichtigste Veränderung, dann weitere Beobachtungen, am Ende die geprüften Punkte ohne Befund und eine kurze Einschätzung für uns.",
  "quellen": ["die verwendeten Internetadressen"]
}`,
  ].filter(Boolean).join('\n');
}

// Wandelt echte Zeilenumbrüche/Tabulatoren, die innerhalb von Textfeldern
// stehen, in gültige Zeichenfolgen um. Alles außerhalb bleibt unberührt.
function repariereJson(roh: string): string {
  let out = '';
  let imText = false;
  let escaped = false;
  for (const c of roh) {
    if (escaped) { out += c; escaped = false; continue; }
    if (c === '\\') { out += c; escaped = true; continue; }
    if (c === '"') { imText = !imText; out += c; continue; }
    if (imText && (c === '\n' || c === '\r')) { out += '\\n'; continue; }
    if (imText && c === '\t') { out += '\\t'; continue; }
    out += c;
  }
  return out.replace(/,(\s*[}\]])/g, '$1');
}

async function recherchiere(q: any, letzter: any) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': ANTHROPIC_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODELL,
      max_tokens: 3000,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 6 }],
      messages: [{ role: 'user', content: baueAuftrag(q, letzter) }],
    }),
    signal: AbortSignal.timeout(180000),
  });

  const roh = await res.text();
  let data: any = {};
  try { data = roh ? JSON.parse(roh) : {}; } catch { data = { message: roh }; }
  if (!res.ok) throw new Error(data?.error?.message || `KI-Anfrage fehlgeschlagen (${res.status})`);

  const bloecke = Array.isArray(data.content) ? data.content : [];
  const text = bloecke.filter((b: any) => b?.type === 'text').map((b: any) => b.text).join('\n').trim();

  // Tatsächlich aufgerufene Quellen aus den Suchergebnissen einsammeln
  const gefundeneQuellen: string[] = [];
  bloecke.forEach((b: any) => {
    if (b?.type === 'web_search_tool_result' && Array.isArray(b.content)) {
      b.content.forEach((t: any) => { if (t?.url) gefundeneQuellen.push(t.url); });
    }
  });

  const sauber = text.replace(/```json|```/g, '').trim();
  const start = sauber.indexOf('{');
  const ende = sauber.lastIndexOf('}');
  const kern = start >= 0 && ende > start ? sauber.slice(start, ende + 1) : sauber;

  let ergebnis: any;
  try {
    ergebnis = JSON.parse(kern);
  } catch {
    try {
      // Häufigster Fehler: echte Zeilenumbrüche innerhalb der Textfelder.
      // Die sind im Datenformat nicht erlaubt – hier sauber umwandeln,
      // damit die Absätze im Bericht erhalten bleiben.
      ergebnis = JSON.parse(repariereJson(kern));
    } catch {
    // Notfall: freien Text als Bericht übernehmen, damit nichts verloren geht
      ergebnis = { titel: `Recherche: ${q.name}`, relevanz: 'normal', bericht: sauber, quellen: [] };
    }
  }

  const quellen = Array.from(new Set([...(ergebnis.quellen || []), ...gefundeneQuellen])).slice(0, 12);
  return { ...ergebnis, quellen, suchen: bloecke.filter((b: any) => b?.type === 'server_tool_use').length };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  if (!ANTHROPIC_KEY) {
    return json(503, { ok: false, fehler: 'ANTHROPIC_API_KEY fehlt in den Supabase-Secrets (Settings → Edge Functions → Secrets).' });
  }

  if (!herkunftOk(req)) {
    return json(403, { ok: false, fehler: 'Aufruf nur aus der Fahrschulverwaltung moeglich.' });
  }

  let body: any = {};
  try { body = await req.json(); } catch { /* leer */ }

  const frei = await budgetFrei();
  if (frei <= 0) {
    return json(429, {
      ok: false,
      fehler: `Tagesgrenze erreicht: In den letzten 24 Stunden wurden bereits ${TAGESLIMIT} Recherchen erstellt. ` +
              `Morgen geht es automatisch weiter. Die Grenze laesst sich in Supabase ueber das Secret RECHERCHE_TAGESLIMIT anheben.`,
    });
  }

  // ── Betriebsart "faellig": vom Zeitplan aufgerufen ───────────────────────
  // Arbeitet die Quellen ab, deren Rhythmus (woechentlich/monatlich) faellig
  // ist – hoechstens `max` Stueck pro Aufruf, damit das Zeitlimit reicht.
  if (String(body?.modus || '') === 'faellig') {
    const max = Math.min(Math.max(Number(body?.max) || 4, 1), 8, frei);
    const { data: quellen } = await supabase
      .from('monitor_quellen').select('*')
      .eq('aktiv', true)
      .in('recherche_rhythmus', ['woechentlich', 'monatlich']);

    const { data: alleBriefings } = await supabase
      .from('monitor_briefings').select('quelle_id,erstellt_am')
      .order('erstellt_am', { ascending: false }).limit(400);
    const letzterStand: Record<string, string> = {};
    (alleBriefings ?? []).forEach((b: any) => {
      if (!letzterStand[b.quelle_id]) letzterStand[b.quelle_id] = b.erstellt_am;
    });

    const jetzt = Date.now();
    const faellige = (quellen ?? []).filter((q: any) => {
      const tage = q.recherche_rhythmus === 'woechentlich' ? 7 : 30;
      const letzte = letzterStand[q.id];
      if (!letzte) return true;
      return (jetzt - new Date(letzte).getTime()) / 86400000 >= tage;
    }).slice(0, max);

    const berichte: string[] = [];
    const probleme: string[] = [];
    for (const q of faellige) {
      try {
        const { data: vorher } = await supabase
          .from('monitor_briefings').select('*').eq('quelle_id', q.id)
          .order('erstellt_am', { ascending: false }).limit(1).maybeSingle();
        const r = await recherchiere(q, vorher);
        await supabase.from('monitor_briefings').insert({
          quelle_id: q.id,
          titel: String(r.titel || `Recherche: ${q.name}`).slice(0, 200),
          bericht: String(r.bericht || '').slice(0, 12000),
          relevanz: ['hoch', 'normal', 'niedrig'].includes(r.relevanz) ? r.relevanz : 'normal',
          quellen: r.quellen ?? [],
        });
        berichte.push(`${q.name}: ${r.titel || 'Bericht erstellt'}${r.relevanz === 'hoch' ? ' (wichtig)' : ''}`);
      } catch (e) {
        probleme.push(`${q.name}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // Ein gesammelter Hinweis fuer das Team, statt vieler Einzelmeldungen
    if (berichte.length) {
      const heute = new Date().toISOString().slice(0, 10);
      const { data: empf } = await supabase.from('monitor_empfaenger').select('user_id').eq('aktiv', true);
      let userIds: string[] = (empf ?? []).map((e: any) => e.user_id).filter(Boolean);
      if (!userIds.length) {
        const { data: admins } = await supabase.from('app_users').select('id').in('rolle', ['admin', 'verwaltung']);
        userIds = (admins ?? []).map((u: any) => u.id);
      }
      for (const uid of userIds) {
        const key = `monitor:briefing:${heute}:${uid}`;
        const { data: da } = await supabase.from('todos').select('id').eq('auto_key', key).maybeSingle();
        if (da) continue;
        await supabase.from('todos').insert({
          titel: `🕵 Marktbeobachtung: ${berichte.length} neue Recherchebericht(e)`,
          beschreibung: `${berichte.join('\n')}\n\nDie vollstaendigen Berichte stehen in der Verwaltung unter "Wettbewerb & Recht".`,
          faellig_am: heute, prioritaet: 'normal',
          ersteller_id: uid, zugewiesen_an: uid, auto_key: key,
        });
      }
    }

    return json(200, { ok: probleme.length === 0, erstellt: berichte, fehler: probleme, offen: Math.max(0, (quellen ?? []).length - faellige.length) });
  }

  const quelleId = String(body?.quelle_id || '').trim();
  if (!quelleId) return json(400, { ok: false, fehler: 'Bitte quelle_id angeben oder modus=faellig setzen.' });

  const { data: q, error: qErr } = await supabase
    .from('monitor_quellen').select('*').eq('id', quelleId).maybeSingle();
  if (qErr || !q) return json(404, { ok: false, fehler: 'Quelle nicht gefunden.' });

  const { data: letzter } = await supabase
    .from('monitor_briefings').select('*').eq('quelle_id', quelleId)
    .order('erstellt_am', { ascending: false }).limit(1).maybeSingle();

  try {
    const r = await recherchiere(q, letzter);

    const { data: gespeichert, error: insErr } = await supabase.from('monitor_briefings').insert({
      quelle_id: quelleId,
      titel: String(r.titel || `Recherche: ${q.name}`).slice(0, 200),
      bericht: String(r.bericht || '').slice(0, 12000),
      relevanz: ['hoch', 'normal', 'niedrig'].includes(r.relevanz) ? r.relevanz : 'normal',
      quellen: r.quellen ?? [],
    }).select().single();

    if (insErr) return json(500, { ok: false, fehler: `Speichern fehlgeschlagen: ${insErr.message}` });
    return json(200, { ok: true, briefing: gespeichert, suchen: r.suchen ?? 0 });
  } catch (e) {
    return json(502, { ok: false, fehler: e instanceof Error ? e.message : String(e) });
  }
});
