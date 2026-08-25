const https = require('https');

// Kurz unter der Netlify-Grenze aus netlify.toml (26 s): lieber selbst
// abbrechen und eine verstaendliche Meldung senden, als abgewuergt werden.
const KI_TIMEOUT_MS = 22000;

// Anthropic API Anfrage
function anthropicRequest(payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(data),
      },
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch(e) { reject(new Error('JSON parse error: ' + body)); }
      });
    });
    req.on('error', reject);
    req.setTimeout(KI_TIMEOUT_MS, () => {
      req.destroy();
      reject(new Error('Zeitüberschreitung: Die KI hat nach '
        + Math.round(KI_TIMEOUT_MS/1000) + ' Sekunden nicht geantwortet. '
        + 'Bitte mit weniger Daten erneut versuchen.'));
    });
    req.write(data);
    req.end();
  });
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

// Universeller Parser für die KI-Kursplan-Antwort.
// Deckt ab: echtes JSON-Array, NDJSON (ein Objekt pro Zeile, ohne Array-Klammern),
// Text vor/nach dem JSON, sowie abgeschnittene Antworten (max_tokens).
// Strategie: alle vollständigen {…}-Objekte aus dem Text extrahieren und einzeln parsen.
function parseKurstage(text) {
  // 1) Direkter Versuch als Array
  const arrStart = text.indexOf('[');
  if (arrStart >= 0) {
    const candidate = text.slice(arrStart);
    try {
      const parsed = JSON.parse(candidate);
      if (Array.isArray(parsed)) return parsed;
    } catch (_) { /* weiter zu Objekt-Extraktion */ }
  }
  // 2) Alle Top-Level-{…}-Objekte scannen (funktioniert für Array, NDJSON, Komma-getrennt)
  const objs = [];
  let depth = 0, inStr = false, esc = false, start = -1;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === '{') { if (depth === 0) start = i; depth++; }
    else if (c === '}') {
      depth--;
      if (depth === 0 && start >= 0) {
        try { objs.push(JSON.parse(text.slice(start, i + 1))); } catch (_) {}
        start = -1;
      }
    }
  }
  return objs;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };

  // Guard: API-Key vorhanden?
  if (!process.env.ANTHROPIC_API_KEY) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'ANTHROPIC_API_KEY fehlt – bitte in Netlify → Site Settings → Environment Variables setzen.' }) };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch(e) { return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { aktion, daten } = body;

  try {
    let prompt, messages;

    // ── 1. BESCHEID-SCAN AUSLESEN ─────────────────────────────────────────────
    if (aktion === 'bescheid_auslesen') {
      // PDF → document-Block, Bild → image-Block
      const isPdf = daten.mime_type === 'application/pdf';
      const mediaBlock = isPdf
        ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: daten.bild_base64 } }
        : { type: 'image',    source: { type: 'base64', media_type: daten.mime_type,   data: daten.bild_base64 } };

      messages = [{
        role: 'user',
        content: [
          mediaBlock,
          {
            type: 'text',
            text: `Du liest einen deutschen Anerkennungsbescheid für eine Berufskraftfahrer-Ausbildungsstätte (BKrFQG).
Extrahiere alle relevanten Informationen und antworte NUR mit einem JSON-Objekt, kein Markdown:
{
  "aktenzeichen": "AZ aus dem Bescheid oder null",
  "behoerde_name": "Name der ausstellenden Behörde",
  "behoerde_abteilung": "Abteilung/Referat wenn erkennbar",
  "behoerde_strasse": "Straße der Behörde",
  "behoerde_plz": "PLZ",
  "behoerde_ort": "Ort",
  "behoerde_email": "E-Mail wenn angegeben",
  "behoerde_tel": "Telefon wenn angegeben",
  "anerkennungsdatum": "YYYY-MM-DD",
  "naechste_ueberpruefung": "YYYY-MM-DD oder null",
  "anerkennungsumfang": ["BGK_Gueter", "BGK_Person", "Weiterbildung"] (nur zutreffende),
  "genehmigte_raeume": [
    { "bezeichnung": "Raumname", "geschoss": "EG/OG etc", "adresse": "wenn abweichend" }
  ],
  "genehmigte_fahrlehrer": [
    { "name": "Vor- und Nachname" }
  ],
  "ausbildungsstaette_name": "Name der Ausbildungsstätte",
  "ausbildungsstaette_strasse": "Straße",
  "ausbildungsstaette_plz": "PLZ",
  "ausbildungsstaette_ort": "Ort",
  "status": "anerkannt",
  "notizen": "Besondere Auflagen oder Hinweise aus dem Bescheid"
}`,
          },
        ],
      }];

      const result = await anthropicRequest({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        messages,
      });

      if (result.status !== 200) throw new Error(result.data.error?.message || 'API Fehler');
      const text = result.data.content[0].text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(text);
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, daten: parsed }) };
    }

    // ── 2. DOKUMENT-KATEGORIE ERKENNEN ────────────────────────────────────────
    if (aktion === 'dokument_erkennen') {
      const isPdf2 = daten.mime_type === 'application/pdf';
      const mediaBlock2 = isPdf2
        ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: daten.bild_base64 } }
        : { type: 'image',    source: { type: 'base64', media_type: daten.mime_type,   data: daten.bild_base64 } };

      messages = [{
        role: 'user',
        content: [
          mediaBlock2,
          {
            type: 'text',
            text: `Erkenne dieses Dokument und antworte NUR mit JSON, kein Markdown:
{
  "kategorie": "Anerkennungsbescheid|Fuehrungszeugnis|Nutzungsvertrag|Didaktiknachweis|Fortbildungsnachweis|Fahrlehrerschein|Ausbildungsprogramm|Behoerdenschreiben|Sonstiges",
  "datum": "YYYY-MM-DD oder null (Ausstellungsdatum)",
  "ablaufdatum": "YYYY-MM-DD oder null",
  "person_name": "Name der Person falls erkennbar",
  "behoerde": "Ausstellende Behörde/Institution",
  "beschreibung": "Kurze Beschreibung in 1 Satz"
}`,
          },
        ],
      }];

      const result = await anthropicRequest({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        messages,
      });

      if (result.status !== 200) throw new Error(result.data.error?.message || 'API Fehler');
      const text = result.data.content[0].text.replace(/```json|```/g, '').trim();
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, daten: JSON.parse(text) }) };
    }

    // ── 3. KURSPLAN GENERIEREN ────────────────────────────────────────────────
    if (aktion === 'kursplan_generieren') {
      const { kurstyp, startdatum, fahrlehrer, standort, raeume, feiertage, belegungen, baender: baenderInput } = daten;

      // ── Band-Struktur: bevorzugt aus Frontend (BKRFQV_THEMEN = verbindliche Quelle) ──
      // Fallback nur falls Frontend keine Struktur mitschickt (alte Clients).
      const BAENDER_FALLBACK_GUETER = [
        { nr:'1',  minuten: 810,  titel:'Gesundheit & Fitness',                          kb:['KB 3.3','KB 3.4'] },
        { nr:'2',  minuten:1080,  titel:'Kinematische Kette | Energie & Umwelt',         kb:['KB 1.1','KB 1.3','KB 1.3a'] },
        { nr:'3',  minuten: 720,  titel:'Bremsanlagen',                                  kb:['KB 1.2'] },
        { nr:'4G', minuten:1440,  titel:'Ladungssicherung',                              kb:['KB 1.4'] },
        { nr:'5',  minuten: 810,  titel:'Sozialvorschriften',                            kb:['KB 2.1'] },
        { nr:'6G', minuten: 900,  titel:'Vorschriften für den Güterkraftverkehr',        kb:['KB 2.2'] },
        { nr:'7',  minuten: 990,  titel:'Pannen, Unfälle, Notfälle und Kriminalität',    kb:['KB 3.1','KB 3.2','KB 3.5'] },
        { nr:'8G', minuten: 960,  titel:'Unternehmensbild & Marktordnung im Güterkraftverkehr', kb:['KB 3.6','KB 3.7'] },
        { nr:'9',  minuten: 690,  titel:'Fahrpraktische Übungen, Wartung und Pflege',    kb:[] },
      ];

      const baender = (Array.isArray(baenderInput) && baenderInput.length)
        ? baenderInput
        : BAENDER_FALLBACK_GUETER;

      const istKombi = kurstyp === 'BGK_Kombi' || baender.some(b => b.gruppe);

      // Bereits belegte Dozenten-Zeiten als kompakte Liste
      const belegungsHinweis = (belegungen && belegungen.length)
        ? `\nBEREITS BELEGTE DOZENTEN-ZEITEN (dürfen nicht doppelt vergeben werden):\n` +
          belegungen.slice(0,50).map(b=>`${b.datum} ${b.beginn}–${b.ende}: ${b.dozent}`).join('\n')
        : '';

      // Kombi-Hinweis dynamisch aus tatsächlicher Band-Struktur
      const _sumGrp = grp => baender.filter(b=>b.gruppe===grp).reduce((s,b)=>s+(b.minuten||0),0);
      const _hStr = min => min%60===0 ? `${min/60}h` : `${Math.floor(min/60)}h${min%60}min`;
      const kombiHinweis = istKombi ? `
KOMBI-LEHRGANG (Güter + Person gleichzeitig):
- Phase 1: Gemeinsame Bänder (gruppe="gemeinsam", ${_hStr(_sumGrp('gemeinsam'))}) – ALLE Teilnehmer zusammen
- Phase 2 (parallel): Güter-Bänder (gruppe="gueter", ${_hStr(_sumGrp('gueter'))}) UND Person-Bänder (gruppe="person", ${_hStr(_sumGrp('person'))}) gleichzeitig
  In Phase 2 laufen beide Gruppen zeitgleich (gleiche Zeitslots, verschiedene Räume, verschiedene Dozenten)
- Feld "gruppe" PFLICHT: "gemeinsam" | "gueter" | "person"` : '';

      // Vollständige Band-Liste mit Titeln, Minuten und Unterthemen (verbindlich)
      const baenderListe = baender.map(b => {
        const utTxt = (b.unterthemen && b.unterthemen.length)
          ? `\n    Unterthemen: ${b.unterthemen.join('; ')}` : '';
        const grpTxt = b.gruppe ? ` [gruppe=${b.gruppe}]` : '';
        const zielH = Math.round(b.minuten/60*100)/100;
        return `Band ${b.nr}: "${b.titel}" · ZIEL: genau ${zielH} Zeitstunden (${b.minuten} Min)${grpTxt} · KB: ${b.kb.join(' | ')||'—'}${utTxt}`;
      }).join('\n');

      // Gesamt-Soll für die Bilanz
      const _gesamtMin = baender.reduce((s,b)=>s+(b.minuten||0),0);
      const _bilanz = istKombi
        ? `Gemeinsam ${_hStr(_sumGrp('gemeinsam'))} + Güter ${_hStr(_sumGrp('gueter'))} + Person ${_hStr(_sumGrp('person'))} = ${Math.round(_gesamtMin/60*10)/10} Zeitstunden gesamt. Je Qualifikation genau ${Math.round((_sumGrp('gemeinsam')+_sumGrp('gueter'))/60*10)/10} Zeitstunden.`
        : `Summe aller Bänder = genau ${Math.round(_gesamtMin/60*10)/10} Zeitstunden.`;

      prompt = `Du bist ein Planungsassistent für die Fahrschule Fahrschulteam Lingen.
Erstelle einen detaillierten Kursplan für: ${kurstyp}
Startdatum: ${startdatum} (immer ein Montag)
Standort: ${standort}
Verfügbare Fahrlehrer: ${fahrlehrer.map(f => f.name + ' (Bände: ' + (f.baender||[]).join(',') + ')').join(', ')}
Verfügbare Räume: ${raeume.map(r => r.bezeichnung + ' (max. ' + (r.max_teilnehmer||20) + ' TN)').join(', ')}
Feiertage im Zeitraum: ${feiertage || 'keine bekannt'}
${kombiHinweis}

ZU PLANENDE BÄNDER (Titel EXAKT übernehmen für "band_titel"!):
${baenderListe}

STUNDENBILANZ (verbindlich – exakt einhalten): ${_bilanz}

DOZENTEN-PFLICHTREGELN:
- Ein Dozent kann NICHT zur gleichen Zeit in zwei Sessions eingeplant werden
- Bei Kombi in der Parallelphase (Güter + Person gleichzeitig): VERSCHIEDENE Dozenten für jede Gruppe
${belegungsHinweis}

PFLICHTREGELN KENNTNISBEREICHE (band_nr ≠ kenntnisbereich_kb – nie vermischen!):
${baender.map(b=>`Band ${b.nr} → kenntnisbereich_kb NUR aus: ${b.kb.join(' | ')||'—'}`).join('\n')}

Weise jedem Kurstag exakt einen KB-Wert aus der obigen Liste für das jeweilige Band zu.
"band_titel" MUSS wortwörtlich dem oben angegebenen Band-Titel entsprechen (nicht abkürzen, nicht umformulieren).

Planungsregeln:
- Alle Zeiten in ZEITSTUNDEN à 60 Minuten (nicht 45-Min-Einheiten). Die oben angegebenen Minuten sind verbindlich.
- WICHTIG – Stundenbilanz: Die Summe aller "stunden" pro Band MUSS exakt den angegebenen Band-Minuten entsprechen (Minuten ÷ 60). Beispiel: Band mit 810 Min = 13,5 Zeitstunden gesamt über alle Kurstage dieses Bandes. Plane nicht mehr und nicht weniger.
- Ein Kurstag kann Nachkommastunden haben (z.B. "stunden":6.75). Summe je Band muss stimmen.
- Mo–Do: max. 7h Netto pro Tag (08:00–16:00, Mittagspause 12:00–12:45)
- Fr: max. 6h Netto pro Tag (08:00–15:00, Mittagspause 12:00–12:45)
- Mehrere Bänder/Einheiten pro Tag möglich bis Tageskapazität (7h bzw. 6h) erreicht
- Jede Einheit dem spezialisierten Fahrlehrer für dieses Band zuweisen
  (Dozenten-Bänder-Zuweisung beachten: nur Dozenten einsetzen die das Band unterrichten dürfen)
- Bänder in der angegebenen Reihenfolge und mit den angegebenen Minuten vollständig verplanen
- Feiertage überspringen

Antworte NUR mit einem kompakten JSON-Array (ein Objekt pro Zeile, keine Einrückung, keine Leerzeilen), kein Markdown, kein Text davor/danach.
Halte die Antwort so kompakt wie möglich, damit auch lange Kurspläne vollständig übertragen werden.
Jedes Objekt hat exakt diese Felder:
{"datum":"YYYY-MM-DD","beginn":"HH:MM","ende":"HH:MM","band_nr":"1","band_titel":"Gesundheit & Fitness","kenntnisbereich_kb":"KB 3.4","fahrlehrer_name":"Name","raum_bezeichnung":"Raumname","stunden":7,"gruppe":"gemeinsam","unterrichtsart":"Präsenz"}`;

      // Haiku: 3–5× schneller als Sonnet → Netlify-Timeout-kompatibel für Kursplanung
      const result = await anthropicRequest({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 8000,
        messages: [{ role: 'user', content: prompt }],
      });

      if (result.status !== 200) throw new Error(result.data.error?.message || 'API Fehler');
      let text = result.data.content[0].text.replace(/```json|```/g, '').trim();
      const kurstage = parseKurstage(text);
      if (!kurstage.length) throw new Error('KI-Antwort konnte nicht gelesen werden');
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, kurstage }) };
    }

    // ── 4. KURSMELDUNG FORMULIEREN ────────────────────────────────────────────
    if (aktion === 'kursmeldung_formulieren') {
      const { kurstag, standort, fahrlehrer } = daten;

      prompt = `Formuliere eine professionelle Kursanzeige gemäß § 11 Abs. 4 BKrFQG.
Ausbildungsstätte: Fahrschulteam Lingen, Rheiner Str. 158, 49809 Lingen (Ems)
AZAV-Zertifikat: 0333-10660-AZAV-T
Unterrichtsort: ${standort.name}, ${standort.strasse}, ${standort.plz} ${standort.ort}
Behörde: ${standort.behoerde_name}, ${standort.behoerde_ort}
Datum: ${kurstag.datum}
Uhrzeit: ${kurstag.beginn} – ${kurstag.ende} Uhr
Raum: ${kurstag.raum || '–'}
Gegenstand: ${kurstag.gegenstand}
Kenntnisbereich: ${kurstag.kenntnisbereich_kb || '–'} (Anlage 1 BKrFQV)
Unterrichtsleiter: ${fahrlehrer || '–'}
Unterrichtsart: ${kurstag.unterrichtsart || 'Präsenz'}
Max. Teilnehmer: ${kurstag.max_teilnehmer || '–'}

Schreibe ein formelles, korrektes Anschreiben auf Deutsch.
Fasse dich knapp: hoechstens sechs Punkte, je Text maximal 25 Woerter.
Antworte NUR mit JSON, kein Markdown:
{
  "betreff": "Betreff des Schreibens",
  "text_html": "HTML-formatierter Brieftext mit <p>, <strong>, <br> Tags"
}`;

      const result = await anthropicRequest({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      });

      if (result.status !== 200) throw new Error(result.data.error?.message || 'API Fehler');
      const text = result.data.content[0].text.replace(/```json|```/g, '').trim();
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, ...JSON.parse(text) }) };
    }

    // ── 5. VOLLSTÄNDIGKEITSPRÜFUNG ANTRAG ────────────────────────────────────
    if (aktion === 'antrag_pruefen') {
      const { standort, fahrlehrer, raeume, dokumente, kurstypen } = daten;

      prompt = `Prüfe als Experte für das Berufskraftfahrerqualifikationsgesetz (BKrFQG) diesen Anerkennungsantrag.

Standort: ${standort.name}, ${standort.ort}
Kurstypen beantragt: ${kurstypen.join(', ')}
Fahrlehrer (${fahrlehrer.length}):
${fahrlehrer.map(f => `- ${f.vorname} ${f.nachname}: Qualifikationen: ${(f.qualifikationen||[]).join(', ')}, Didaktik: ${f.didaktik_nachweis||'fehlt'}, BKF-Erfahrung: ${f.berufserfahrung_bkf?'ja':'nein'}, Führungszeugnis: ${f.fuehrungszeugnis_datum||'fehlt'}`).join('\n')}
Räume (${raeume.length}):
${raeume.map(r => `- ${r.bezeichnung}: ${r.flaeche_qm||'?'}m², max. ${r.max_teilnehmer||'?'} TN, Eigentum: ${r.eigentum_oder_miete}, Im Bescheid: ${r.im_bescheid}`).join('\n')}
Vorhandene Dokumente: ${dokumente.map(d => d.kategorie).join(', ') || 'keine'}

Prüfe gemäß § 9 BKrFQG und § 5 BKrFQV ob alle Voraussetzungen erfüllt sind.
Antworte NUR mit JSON, kein Markdown:
{
  "gesamtstatus": "vollstaendig|unvollstaendig|kritisch",
  "bewertung": "Kurze Gesamtbewertung in 2 Sätzen",
  "punkte": [
    {
      "kategorie": "Lehrpersonal|Räume|Dokumente|Ausbildungsprogramm|Sonstiges",
      "status": "ok|warnung|fehler",
      "text": "Beschreibung",
      "massnahme": "Was zu tun ist oder null"
    }
  ],
  "fehlende_dokumente": ["Liste fehlender Pflichtdokumente"],
  "empfehlung": "Konkrete nächste Schritte"
}`;

      const result = await anthropicRequest({
        model: 'claude-sonnet-4-6',
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }],
      });

      if (result.status !== 200) throw new Error(result.data.error?.message || 'API Fehler');
      const text = result.data.content[0].text.replace(/```json|```/g, '').trim();
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, pruefung: JSON.parse(text) }) };
    }

    // ── MONITOR-MELDUNG BEWERTEN (Wettbewerb & Recht) ─────────────────────────
    // Aus dem Roh-Textunterschied einer überwachten Seite eine präzise,
    // verständliche Meldung machen – oder klar sagen, dass nichts Relevantes
    // passiert ist (dann wird gar kein To-do erzeugt). Das verhindert die
    // früheren "komischen" Meldungen aus Menü-, Cookie- und Datumsfragmenten.
    if (aktion === 'monitor_bewerten') {
      const kat = daten.kategorie || 'wettbewerber';
      const rolle = kat === 'recht'
        ? 'Du beobachtest Rechtsquellen (FahrlG, BKrFQG, StVO, FeV) für eine deutsche Fahrschule.'
        : kat === 'autor'
          ? 'Du beobachtest Fachautoren und Fachpublikationen für eine deutsche Fahrschule.'
          : 'Du beobachtest Wettbewerber (andere Fahrschulen) im Raum Lingen (Ems) / Emsland für das Fahrschulteam Thorsten Gels.';

      prompt = `${rolle}
Eine überwachte Seite hat sich geändert. Beurteile NUR anhand der unten stehenden Textunterschiede, ob es eine geschäftlich relevante Änderung gibt.

Quelle: ${daten.name || '(unbekannt)'}
Adresse: ${daten.url || '(keine)'}

NEU hinzugekommene Textstellen:
${(Array.isArray(daten.neu) ? daten.neu : []).slice(0, 25).map((s, i) => `${i + 1}. ${String(s).slice(0, 300)}`).join('\n') || '(keine)'}

ENTFALLENE Textstellen (nur als Zusatzinformation, z. B. um Preisänderungen zu erkennen):
${(Array.isArray(daten.weg) ? daten.weg : []).slice(0, 12).map((s, i) => `${i + 1}. ${String(s).slice(0, 200)}`).join('\n') || '(keine)'}

REGELN – bitte strikt einhalten:
- Erfinde NICHTS. Nenne nur, was wörtlich in den Textstellen steht. Keine Vermutungen über Gründe oder Absichten.
- NICHT relevant sind: Cookie- und Datenschutzhinweise, Navigations- und Menütexte, Impressum, Öffnungszeiten-Boilerplate, geänderte Datums-/Zeitangaben ohne Inhalt, Zählerstände, kosmetische Umformulierungen, wiederkehrende Werbefloskeln. In diesen Fällen: relevant = false.
- RELEVANT sind z. B.: neuer oder geschlossener Standort, neue Kurse/Lehrgänge/Termine, Preisänderungen, Stellenanzeigen und Personalwechsel, neue Fahrzeuge/Ausstattung, Kooperationen, Förderhinweise, geänderte Rechtsvorschriften und Fristen.
- Schreibe konkret: nenne Datum, Ort, Adresse, Preis, Bezeichnung – genau so, wie es dasteht.
- Fallen dir Widersprüche innerhalb der Texte auf (z. B. zwei verschiedene Adressen für dieselbe Sache), weise ausdrücklich darauf hin.
- Sprache: Deutsch, sachlich, in ganzen Sätzen. Keine Aufzählungszeichen, keine Emojis.

Antworte NUR mit einem JSON-Objekt, kein Markdown:
{
  "relevant": true oder false,
  "titel": "kurze Überschrift, max. 70 Zeichen, z. B. 'Kemper eröffnet Standort Meppen-Esterfeld'",
  "meldung": "2-5 Sätze mit den konkreten Fakten und – falls vorhanden – dem Hinweis auf Widersprüche. Bei relevant=false: ein Satz, warum die Änderung unwichtig ist.",
  "belege": ["die 1-3 wörtlichen Textstellen, auf die sich die Meldung stützt, jeweils max. 200 Zeichen"],
  "art": "standort|preis|personal|angebot|kooperation|recht|sonstiges",
  "wichtigkeit": "hoch|normal|niedrig"
}`;

      // Bewusst knapp gehalten: Die Netlify-Function hat 26 Sekunden Zeitlimit,
      // deshalb kurzer Eingabetext und begrenzte Antwortlänge.
      const result = await anthropicRequest({
        model: 'claude-sonnet-4-6',
        max_tokens: 900,
        messages: [{ role: 'user', content: prompt }],
      });

      if (result.status !== 200) throw new Error(result.data.error?.message || 'API Fehler');
      const text = result.data.content[0].text.replace(/```json|```/g, '').trim();
      let bewertung;
      try { bewertung = JSON.parse(text); }
      catch (e) { throw new Error('Antwort der KI war kein gültiges JSON'); }
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, bewertung }) };
    }

    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Unbekannte Aktion: ' + aktion }) };

  } catch(e) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: e.message }) };
  }
};
