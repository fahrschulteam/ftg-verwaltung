// ════════════════════════════════════════════════════════════════════
//  FORTBILDUNGS-LOGIK  (FahrlG §53 + §7 BKrFQV)
//  Berechnet Fristen, summiert Tage aus Urkunden, erzeugt Ampelstatus.
// ════════════════════════════════════════════════════════════════════

// Definition der Pflichten je nach Qualifikation des Mitarbeiters
//  zyklus: Jahre · sollTage: nachzuweisende Tage im Zyklus · feld: Qual-Flag am MA
const FB_PFLICHTEN = [
  { id:'allgemein', name:'Allgemeine Fortbildung (§53 Abs.1)', zyklus:4, sollTage:3, gilt:m=>m.bereich==='fahrlehrer' },
  { id:'asf',       name:'ASF-Seminarleiter (§53 Abs.2)',      zyklus:2, sollTage:1, gilt:m=>m.qual_asf },
  { id:'fes',       name:'FES-Seminarleiter (§53 Abs.2)',      zyklus:2, sollTage:1, gilt:m=>m.qual_fes },
  { id:'afl',       name:'Ausbildungsfahrlehrer (§53 Abs.3)',  zyklus:4, sollTage:1, gilt:m=>m.qual_ausb },
  { id:'bkf',       name:'BKF-Dozent (§7 BKrFQV)',             zyklus:4, sollTage:3, gilt:m=>m.qual_bkf },
];

// Jahresende-Datum
function jahresEnde(jahr) { return new Date(jahr, 11, 31); }

// ── Kernberechnung für EINE Pflicht ──────────────────────────────────
//  fbs: Array der Fortbildungen dieser Art {datum, tage}
//  start: Erlaubnisjahr (Fallback für ersten Zyklus)
function berechnePflicht(pflicht, fbs, fristAblaufJahr, alleFbsDesMa, mitarbeiter) {
  const heute = new Date();
  const A = pflicht.id;
  const zyklus = pflicht.zyklus;
  const heuteJahr = heute.getFullYear();

  if (!fristAblaufJahr) {
    return { status:'unbekannt', tageVorhanden:0, tageSoll:(A==='allgemein'||A==='bkf')?4:1, restTage:0, fristEnde:null, erfuellt:false };
  }

  const nw = fbs
    .filter(f => f.art === A && f.datum)
    .map(f => ({ jahr:new Date(f.datum).getFullYear(), tage:Number(f.tage)||1, zusammenhaengend:!!f.zusammenhaengend }));

  const sollMax = (A==='allgemein'||A==='bkf') ? 4 : pflicht.sollTage;

  // Prüft, ob im Block [bStart,bEnde] die Pflicht erfüllt ist; gibt {ok, einheiten}
  function blockErfuellt(bStart, bEnde) {
    const imBlock = nw.filter(t => t.jahr >= bStart && t.jahr <= bEnde);
    if (A === 'allgemein' || A === 'bkf') {
      const soll = pflicht.sollTage;
      const amStueck = imBlock.some(t => t.zusammenhaengend && t.tage >= soll);
      if (amStueck) return { ok:true, einheiten:4 };
      let bonus = 0;
      if (A === 'allgemein' && alleFbsDesMa) {
        const hat = (art) => alleFbsDesMa.some(f => f.art===art && f.datum &&
          new Date(f.datum).getFullYear() >= bStart && new Date(f.datum).getFullYear() <= bEnde);
        if (hat('asf')||hat('fes')) bonus++;
        if (hat('afl')) bonus++;
        if (hat('fps')) bonus++;
        bonus = Math.min(bonus,3);
      }
      const gezaehlt = imBlock.length + bonus;
      return { ok: imBlock.length>=1 && gezaehlt>=4, einheiten: Math.min(gezaehlt,4) };
    }
    return { ok: imBlock.length >= pflicht.sollTage, einheiten: Math.min(imBlock.length, pflicht.sollTage) };
  }

  // ── Der DERZEITIGE Zyklus endet am fristAblaufJahr. ──
  // Blöcke: [fristAblauf-zyklus+1 .. fristAblauf] = aktueller Zyklus
  //         [fristAblauf+1 .. fristAblauf+zyklus]  = nächster Zyklus
  const aktStart = fristAblaufJahr - zyklus + 1;
  const aktEnde  = fristAblaufJahr;
  const nbStart  = fristAblaufJahr + 1;
  const nbEnde   = fristAblaufJahr + zyklus;

  const aktErf = blockErfuellt(aktStart, aktEnde);
  const nbErf  = blockErfuellt(nbStart, nbEnde);

  const fristEnde = jahresEnde(aktEnde);
  const tageBisFrist = Math.ceil((fristEnde - heute)/86400000);

  // naechsterFortschritt: Stand des nächsten Zyklus
  const naechsterFortschritt = (nbErf.einheiten > 0) ? { einheiten: nbErf.einheiten, soll: sollMax } : null;

  // ── 3-FARBEN-LOGIK ──
  //  grün  (naechster_ok)   = nächster Zyklus bereits erfüllt
  //  grau  (im_rahmen)      = Frist (aktEnde) liegt in Zukunft ODER aktueller erfüllt
  //  rot   (ueberschritten) = Frist vorbei (31.12. aktEnde) und aktueller NICHT erfüllt
  let status;
  if (nbErf.ok) {
    status = 'naechster_ok';            // grün
  } else if (tageBisFrist < 0 && !aktErf.ok) {
    status = 'ueberschritten';          // rot
  } else {
    status = 'im_rahmen';               // grau
  }

  return {
    status,
    tageVorhanden: aktErf.einheiten,
    tageSoll: sollMax,
    restTage: Math.max(0, sollMax - aktErf.einheiten),
    fristEnde,
    tageBisFrist,
    naechsterFortschritt,
    erfuellt: aktErf.ok,
  };
}

// ── Gesamtstatus eines Mitarbeiters ──────────────────────────────────
function fortbildungsStatus(m, fbsAll) {
  const fbs = fbsAll.filter(f => f.mitarbeiter_id === m.id);
  const ergebnisse = FB_PFLICHTEN
    .filter(p => p.gilt(m))
    .map(p => {
      // Fristablauf-Jahr je nach Pflicht: BKF nutzt frist_bkf, alle anderen frist_fahrlg
      const ablaufJahr = (p.id === 'bkf') ? m.frist_bkf : m.frist_fahrlg;
      return { pflicht:p, ...berechnePflicht(p, fbs, ablaufJahr, fbs, m) };
    });

  // schlechtester Status bestimmt die Ampel
  const rang = { ueberschritten:3, im_rahmen:1, unbekannt:1, naechster_ok:0 };
  const schlechtester = ergebnisse.reduce((w,e) =>
    rang[e.status] > rang[w] ? e.status : w, 'ok');

  return { ergebnisse, gesamt: ergebnisse.length ? schlechtester : null };
}

function statusFarbe(s) {
  return ({ naechster_ok:'#166534', im_rahmen:'#6B7280', ueberschritten:'#991B1B',
            unbekannt:'#9CA3AF' })[s] || '#6B7280';
}
function statusLabel(s) {
  return ({ naechster_ok:'Nächster Zyklus erfüllt', im_rahmen:'Im Rahmen',
            ueberschritten:'Überschritten', unbekannt:'Frist nicht gesetzt' })[s] || s;
}

// Liefert [blockStart, blockEnde] des aktuell gültigen Blocks für eine Pflicht.
function aktuellerBlock(pflichtId, fristAblaufJahr) {
  if (!fristAblaufJahr) return null;
  const zyklus = (pflichtId === 'asf' || pflichtId === 'fes') ? 2 : 4;
  const heuteJahr = new Date().getFullYear();
  let ende = fristAblaufJahr;
  while (ende < heuteJahr) ende += zyklus;
  return [ende - zyklus + 1, ende];
}

// Prüft, ob eine einzelne Fortbildung (Datum) im aktuell gültigen Block ihrer Pflicht liegt.
function fbImAktuellenBlock(fb, mitarbeiter) {
  const ablauf = (fb.art === 'bkf') ? mitarbeiter.frist_bkf : mitarbeiter.frist_fahrlg;
  const block = aktuellerBlock(fb.art, ablauf);
  if (!block) return null;  // unbekannt
  const jahr = new Date(fb.datum).getFullYear();
  return jahr >= block[0] && jahr <= block[1];
}

function fbArtLabel(art) {
  return ({ allgemein:'Allgemein §53.1', asf:'ASF §53.2', fes:'FES §53.2',
            afl:'AFL §53.3', bkf:'BKF §7 BKrFQV' })[art] || art;
}
