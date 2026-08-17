const https = require('https');

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
    req.write(data);
    req.end();
  });
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

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
      const { kurstyp, startdatum, fahrlehrer, standort, raeume, feiertage, belegungen } = daten;

      // Degner-Bänder je Kurstyp
      // Minuten gemäß BKRFQV_THEMEN (BGK = 140h = 8400 min gesamt)
      // ── BAND→KB Mapping (BKrFQV Anlage 1) ──────────────────────────────
      // ACHTUNG: Band-Nummer ≠ Kenntnisbereich-Nummer!
      // Band 1 (Gesundheit) → KB 3.4/3.10  (NICHT KB 1.x!)
      // Band 2 (Kinematik)  → KB 1.1/1.2/1.3
      // usw. – die `kb`-Liste ist verbindlich!
      const BAENDER_GUETER = [
        { nr:'1',  minuten: 600, titel:'Gesundheit und Fitness',                     kb:['KB 3.4','KB 3.10'] },
        { nr:'2',  minuten:1320, titel:'Rationelles Fahren · Energie und Umwelt',    kb:['KB 1.1','KB 1.2','KB 1.3'] },
        { nr:'3',  minuten: 900, titel:'Bremsanlagen',                              kb:['KB 1.1','KB 3.2'] },
        { nr:'4G', minuten:1320, titel:'Güterbeförderung und Ladungssicherung',                          kb:['KB 3.5','KB 3.6'] },
        { nr:'5',  minuten:1320, titel:'Sozialvorschriften',                        kb:['KB 2.1'] },
        { nr:'6G', minuten: 840, titel:'Güterkraftverkehrsrecht',            kb:['KB 2.2','KB 3.6'] },
        { nr:'7',  minuten: 900, titel:'Pannen, Unfälle, Notfälle und Kriminalität', kb:['KB 3.1','KB 3.3'] },
        { nr:'8',  minuten: 600, titel:'Unternehmensführung und Marktordnung',           kb:['KB 3.7','KB 3.8','KB 3.9'] },
      ]; // Σ 7500 min = 125h
      const BAENDER_PERSON = [
        { nr:'1',  minuten: 600, titel:'Gesundheit und Fitness',                     kb:['KB 3.4','KB 3.10'] },
        { nr:'2',  minuten:1320, titel:'Rationelles Fahren · Energie und Umwelt',    kb:['KB 1.1','KB 1.2','KB 1.3'] },
        { nr:'3',  minuten: 900, titel:'Bremsanlagen',                              kb:['KB 1.1','KB 3.2'] },
        { nr:'4P', minuten:1320, titel:'Personenbeförderung und Sicherheit der Fahrgäste',                 kb:['KB 3.5','KB 3.6'] },
        { nr:'5',  minuten:1320, titel:'Sozialvorschriften',                        kb:['KB 2.1'] },
        { nr:'6P', minuten: 840, titel:'Vorschriften Personenverkehr (PBefG)',      kb:['KB 2.2'] },
        { nr:'7',  minuten: 900, titel:'Pannen, Unfälle, Notfälle und Kriminalität', kb:['KB 3.1','KB 3.3'] },
        { nr:'8P', minuten: 600, titel:'Unternehmensbild & Marktordnung Person',   kb:['KB 3.7','KB 3.8','KB 3.9'] },
      ]; // Σ 7500 min = 125h
      const BAENDER_WB = [
        { nr:'M1', minuten:420, titel:'Verbesserung des rationellen Fahrverhaltens',  kb:['KB 1.1','KB 1.2','KB 1.3'] },
        { nr:'M2', minuten:420, titel:'Anwendung der Vorschriften',                   kb:['KB 2.1','KB 2.2'] },
        { nr:'M3', minuten:420, titel:'Gesundheit, Verkehrssicherheit, Umweltschutz', kb:['KB 3.1','KB 3.4','KB 3.10'] },
        { nr:'M4', minuten:420, titel:'Dienstleistung, Logistik',                     kb:['KB 3.7','KB 3.8','KB 3.9'] },
        { nr:'M5', minuten:420, titel:'Sicherheit im Straßenverkehr',                 kb:['KB 3.2','KB 3.3','KB 3.5'] },
      ];
      const BAENDER_KOMBI_GEMEINSAM = [
        { nr:'1',  minuten: 600, gruppe:'gemeinsam', titel:'Gesundheit und Fitness',                     kb:['KB 3.4','KB 3.10'] },
        { nr:'2',  minuten:1260, gruppe:'gemeinsam', titel:'Rationelles Fahren · Energie und Umwelt',    kb:['KB 1.1','KB 1.2','KB 1.3'] },
        { nr:'3',  minuten: 840, gruppe:'gemeinsam', titel:'Bremsanlagen',                              kb:['KB 1.1','KB 3.2'] },
        { nr:'5',  minuten:1260, gruppe:'gemeinsam', titel:'Sozialvorschriften',                        kb:['KB 2.1'] },
        { nr:'7',  minuten: 840, gruppe:'gemeinsam', titel:'Pannen, Unfälle, Notfälle und Kriminalität', kb:['KB 3.1','KB 3.3'] },
      ]; // Σ 4800 min = 80h gemeinsam (Fahrpraxis separat)
      const BAENDER_KOMBI_GUETER = [
        { nr:'4G', minuten:1260, gruppe:'gueter', titel:'Güterbeförderung und Ladungssicherung',                 kb:['KB 3.5','KB 3.6'] },
        { nr:'6G', minuten: 840, gruppe:'gueter', titel:'Güterkraftverkehrsrecht',   kb:['KB 2.2','KB 3.6'] },
        { nr:'8',  minuten: 600, gruppe:'gueter', titel:'Unternehmensführung und Marktordnung',  kb:['KB 3.7','KB 3.8','KB 3.9'] },
      ]; // Σ 2700 min = 45h
      const BAENDER_KOMBI_PERSON = [
        { nr:'4P', minuten:1260, gruppe:'person', titel:'Personenbeförderung und Sicherheit der Fahrgäste',               kb:['KB 3.5','KB 3.6'] },
        { nr:'6P', minuten: 840, gruppe:'person', titel:'Vorschriften Personenverkehr (PBefG)',   kb:['KB 2.2'] },
        { nr:'8P', minuten: 600, gruppe:'person', titel:'Unternehmensbild & Marktordnung Person', kb:['KB 3.7','KB 3.8','KB 3.9'] },
      ]; // Σ 2700 min = 45h

      const baender = kurstyp === 'BGK_Person' ? BAENDER_PERSON :
                      kurstyp === 'BGK_Kombi'  ? [...BAENDER_KOMBI_GEMEINSAM, ...BAENDER_KOMBI_GUETER, ...BAENDER_KOMBI_PERSON] :
                      kurstyp === 'Weiterbildung' ? BAENDER_WB : BAENDER_GUETER;

      // Bereits belegte Dozenten-Zeiten als kompakte Liste
      const belegungsHinweis = (belegungen && belegungen.length)
        ? `\nBEREITS BELEGTE DOZENTEN-ZEITEN (dürfen nicht doppelt vergeben werden):\n` +
          belegungen.slice(0,50).map(b=>`${b.datum} ${b.beginn}–${b.ende}: ${b.dozent}`).join('\n')
        : '';

      const kombiHinweis = kurstyp === 'BGK_Kombi' ? `
KOMBI-LEHRGANG (Güter + Person gleichzeitig):
- Phase 1 (ca. Woche 1-13): Gemeinsame Bänder (1,2,3,5,7,9 = 95h) – alle Teilnehmer zusammen → gruppe="gemeinsam"
- Phase 2 (ab Woche 14 parallel): Güter-Bänder (4G,6G,8 = 45h) → gruppe="gueter" UND Person-Bänder (4P,6P,8P = 45h) → gruppe="person"
  In Phase 2 laufen beide Gruppen gleichzeitig (gleiche Zeitslots, ggf. verschiedene Räume)
  Σ Güter: 95h+45h=140h, Σ Person: 95h+45h=140h
- Feld "gruppe" PFLICHT: "gemeinsam" | "gueter" | "person"` : '';

      prompt = `Du bist ein Planungsassistent für die Fahrschule Fahrschulteam Lingen.
Erstelle einen detaillierten Kursplan für: ${kurstyp}
Startdatum: ${startdatum} (immer ein Montag)
Standort: ${standort}
Verfügbare Fahrlehrer: ${fahrlehrer.map(f => f.name + ' (Bände: ' + (f.baender||[]).join(',') + ')').join(', ')}
Verfügbare Räume: ${raeume.map(r => r.bezeichnung + ' (max. ' + (r.max_teilnehmer||20) + ' TN)').join(', ')}
Feiertage im Zeitraum: ${feiertage || 'keine bekannt'}
${kombiHinweis}
DOZENTEN-PFLICHTREGELN:
- Ein Dozent kann NICHT zur gleichen Zeit in zwei Sessions eingeplant werden
- Bei BGK_Kombi in der Parallelphase (Güter + Person gleichzeitig): VERSCHIEDENE Dozenten für jede Gruppe
${belegungsHinweis}

PFLICHTREGELN KENNTNISBEREICHE (band_nr ≠ kenntnisbereich_kb – nie vermischen!):
${baender.map(b=>`Band ${b.nr} → kenntnisbereich_kb NUR aus: ${b.kb.join(' | ')}`).join('\n')}

Beispiel-Fehler den du NIEMALS machen darfst:
  Band 1 (Gesundheit) hat NICHTS mit KB 1.x zu tun → KB 1.x gehört zu Band 2/3/9
  Band 2 (Kinematik) → KB 1.1/1.2/1.3, NICHT KB 2.x
  Weise jedem Kurstag exakt einen KB-Wert aus der obigen Liste für das jeweilige Band zu.

Planungsregeln:
- Mo–Do: 08:00–16:00 Uhr (7h Netto, Mittagspause 12:00–12:45)
- Fr: 08:00–15:00 Uhr (6h Netto, Mittagspause 12:00–12:45)
- Mehrere Einheiten pro Tag möglich bis Tageskapazität erreicht
- Jede Einheit dem spezialisierten Fahrlehrer für dieses Band zuweisen
  (Dozenten-Bänder-Zuweisung beachten: nur Dozenten einsetzen die das Band unterrichten dürfen)
- BGK Unterricht: 130h gesamt über ca. 3,5 Wochen (Mo–Fr) – Fahrpraktische Übungen separat
- Weiterbildung: 5 Module à 7h = 35h gesamt
- Feiertage überspringen

Antworte NUR mit JSON-Array, kein Markdown, kein Text davor/danach:
[{
  "datum": "YYYY-MM-DD",
  "beginn": "HH:MM",
  "ende": "HH:MM",
  "band_nr": "1",
  "band_titel": "Gesundheit & Fitness",
  "kenntnisbereich_kb": "KB 3.4",
  "fahrlehrer_name": "Name",
  "raum_bezeichnung": "Raumname",
  "stunden": 7,
  "gruppe": "gemeinsam",
  "unterrichtsart": "Präsenz"
}]`;

      // Haiku: 3–5× schneller als Sonnet → Netlify-Timeout-kompatibel für Kursplanung
      const result = await anthropicRequest({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 6000,
        messages: [{ role: 'user', content: prompt }],
      });

      if (result.status !== 200) throw new Error(result.data.error?.message || 'API Fehler');
      const text = result.data.content[0].text.replace(/```json|```/g, '').trim();
      const kurstage = JSON.parse(text);
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
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      });

      if (result.status !== 200) throw new Error(result.data.error?.message || 'API Fehler');
      const text = result.data.content[0].text.replace(/```json|```/g, '').trim();
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, pruefung: JSON.parse(text) }) };
    }

    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Unbekannte Aktion: ' + aktion }) };

  } catch(e) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: e.message }) };
  }
};
