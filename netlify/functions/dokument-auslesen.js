// Netlify Function: liest Fahrzeugscheine und Fortbildungsurkunden per Claude-API aus.
// Der API-Key liegt ausschliesslich serverseitig in der Umgebungsvariable ANTHROPIC_API_KEY
// (Netlify: Site settings -> Environment variables). Er gelangt NIE ins Frontend.

const PROMPTS = {
  fahrzeugschein:
    'Du erhaeltst eine deutsche Zulassungsbescheinigung Teil I (Fahrzeugschein). ' +
    'Lies die Angaben aus und gib AUSSCHLIESSLICH ein JSON-Objekt zurueck (keine Erklaerung, kein Markdown) mit den Schluesseln:\n' +
    '{"kennzeichen": amtliches Kennzeichen oben (z.B. "EL-UI 22"),\n' +
    ' "marke": Hersteller aus Feld D.1 (z.B. "Mercedes-Benz"),\n' +
    ' "modell": Handelsbezeichnung/Typ aus Feld D.3,\n' +
    ' "fin": Fahrzeug-Identifizierungsnummer aus Feld E (17 Stellen),\n' +
    ' "erstzulassung": Datum der Erstzulassung aus Feld B im Format JJJJ-MM-TT,\n' +
    ' "fahrzeugart": genau einer von "pkw","lkw","bus","anhaenger","krad" anhand der Fahrzeugklasse Feld J ' +
    '(M1=pkw, N1/N2/N3=lkw, M2/M3=bus, O1-O4=anhaenger, L=krad),\n' +
    ' "kraftstoff": Kraftstoffart aus Feld P.3 (z.B. "Diesel")}\n' +
    'Ist ein Feld nicht sicher lesbar, setze den Wert auf "". Rate nicht.',
  fortbildung:
    'Du erhaeltst eine deutsche Fortbildungs- oder Teilnahmeurkunde (z.B. Fahrlehrer-Fortbildung nach §53 FahrlG, ' +
    'Berufskraftfahrer-Weiterbildung BKF, Aufbauseminar ASF, Fahreignungsseminar FES). ' +
    'Lies die Angaben aus und gib AUSSCHLIESSLICH ein JSON-Objekt zurueck (keine Erklaerung, kein Markdown):\n' +
    '{"datum": Datum bzw. Beginn der Fortbildung im Format JJJJ-MM-TT,\n' +
    ' "tage": Anzahl der Fortbildungstage als Zahl (ein Tag = 1),\n' +
    ' "thema": Titel/Thema der Fortbildung, ggf. mit Traeger/Veranstalter,\n' +
    ' "art": genau einer von "allgemein","bkf","asf","fes" — "allgemein" fuer allgemeine Fahrlehrer-Fortbildung ' +
    '(§53 Abs.1), "bkf" fuer Berufskraftfahrer-Weiterbildung, "asf" fuer Aufbauseminar, "fes" fuer Fahreignungsseminar; ' +
    'wenn unklar "allgemein"}\n' +
    'Ist ein Feld nicht sicher lesbar, setze den Wert auf "". Rate nicht.',
  bestellung:
    'Du erhaeltst eine Fahrzeug-Bestellung, einen Kaufvertrag oder eine Ausstattungsliste (deutscher Haendler/Hersteller). ' +
    'Ermittle (a) die Fahrzeugdaten und (b) fuer 17 definierte Fahrerassistenzsysteme, ob sie laut Dokument verbaut sind. ' +
    'Beruecksichtige Marketing- und Markennamen sowie Synonyme, z.B.: DISTRONIC/Abstandsregeltempomat = adaptive Geschwindigkeitsregelanlage; ' +
    'Active Brake Assist/PRE-SAFE/City-Notbremsfunktion/AEB = Notbrems-Assistent; Abbiegeassistent/Turn Assist = Abbiege-Assistent; ' +
    'Spurhalte-/Spurfuehrungsassistent, Lane Keeping (aktiv) = Spurhalte-Assistent (mit Lenkeingriff bzw. aktiv); ' +
    'Totwinkel-/Blind-Spot-Assistent = Toter-Winkel-Assistent; Verkehrszeichen-Assistent/Traffic Sign Assist = Verkehrszeichenerkennung; ' +
    'PARKTRONIC/Parkassistent/aktiver Parklenkassistent = Park-Assistent bzw. aktiver Park-Assistent; ' +
    'Stauassistent = teilautomatisiertes Fahren in Stau-Situationen; Drive Pilot = teilautomatisiertes Fahren.\n' +
    'Die 17 Systeme in fester Reihenfolge (Index 0-16):\n' +
    '0 Geschwindigkeitsregelanlage (einfacher Tempomat)\n' +
    '1 Adaptive Geschwindigkeitsregelanlage (ACC)\n' +
    '2 Notbrems-Assistent\n' +
    '3 Abbiege-Assistent\n' +
    '4 Spurhalte-Assistent (nur Warnung)\n' +
    '5 Spurhalte-Assistent mit Lenkeingriff\n' +
    '6 Aktiver Spurhalte-Assistent (kontinuierliche Querfuehrung)\n' +
    '7 Spurwechsel-Assistent (Warnung bei Blinker)\n' +
    '8 Toter-Winkel-Assistent\n' +
    '9 Spurwechsel-Assistent mit Lenkeingriff\n' +
    '10 Aktiver Spurwechsel-Assistent\n' +
    '11 Park-Assistent (Warnung)\n' +
    '12 Aktiver Park-Assistent (uebernimmt Lenkung)\n' +
    '13 Rueckfahrkamera\n' +
    '14 Verkehrszeichenerkennung\n' +
    '15 Teilautomatisiertes Fahren in Stau-Situationen\n' +
    '16 Teilautomatisiertes Fahren\n' +
    'Gib AUSSCHLIESSLICH ein JSON-Objekt zurueck (keine Erklaerung, kein Markdown):\n' +
    '{"hersteller": Fahrzeughersteller oder "",\n' +
    ' "typ": Typ/Modell oder "",\n' +
    ' "handel": Handelsbezeichnung oder "",\n' +
    ' "fin": Fahrgestellnummer/FIN oder "",\n' +
    ' "fas": {"0": s, "1": s, ... "16": s}}\n' +
    'wobei jedes s genau einer von "verbaut", "nicht" oder "unklar" ist: ' +
    '"verbaut" wenn das System im Dokument (auch unter Synonym) als vorhanden/bestellt aufgefuehrt ist; ' +
    '"nicht" nur wenn das Dokument eine vollstaendige Ausstattungsliste ist und das System dort eindeutig fehlt; ' +
    'in allen anderen Faellen "unklar". Rate nicht und erfinde keine Systeme.',
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return resp(405, { error: 'Methode nicht erlaubt.' });
  }
  const KEY = process.env.ANTHROPIC_API_KEY;
  if (!KEY) {
    return resp(500, { error: 'Server-Konfiguration: ANTHROPIC_API_KEY fehlt. Bitte in den Netlify-Umgebungsvariablen hinterlegen.' });
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return resp(400, { error: 'Ungueltige Anfrage.' }); }

  const { data, mediaType, typ } = body;
  if (!data) return resp(400, { error: 'Keine Datei uebermittelt.' });

  const prompt = PROMPTS[typ] || PROMPTS.fahrzeugschein;
  const isPdf = String(mediaType || '').includes('pdf');
  const dokBlock = isPdf
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } }
    : { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data } };

  try {
    const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',   // guter Kompromiss aus Genauigkeit/Kosten; "claude-haiku-4-5-20251001" waere guenstiger
        max_tokens: 1024,
        messages: [{ role: 'user', content: [dokBlock, { type: 'text', text: prompt }] }],
      }),
    });

    const j = await apiRes.json();
    if (j.error) return resp(502, { error: 'KI-Dienst: ' + (j.error.message || 'unbekannter Fehler') });

    let txt = (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
    // evtl. Markdown-Codezaun entfernen
    txt = txt.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```$/, '').trim();

    let felder;
    try { felder = JSON.parse(txt); }
    catch { return resp(502, { error: 'Antwort der KI konnte nicht gelesen werden.' }); }

    return resp(200, { felder });
  } catch (e) {
    return resp(500, { error: 'Aufruf fehlgeschlagen: ' + (e && e.message ? e.message : 'Netzwerkfehler') });
  }
};

function resp(statusCode, obj) {
  return { statusCode, headers: { 'content-type': 'application/json' }, body: JSON.stringify(obj) };
}
