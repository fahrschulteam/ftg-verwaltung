// ════════════════════════════════════════════════════════════════════
//  ZENTRALE PREISLISTE (preisliste.js)
//
//  EINE Preisliste für Rechnungen (Schulungsmodul) und Kostenvoranschläge
//  (KVA). Gepflegt wird sie unter Einstellungen → Preise, gespeichert in
//  firma.preise. Alle Preise sind BRUTTO (Endpreis inkl. MwSt.); die
//  Rechnung rechnet den Nettobetrag mit dem USt-Satz der Einstellungen
//  zurück. Bei 0 % USt sind Brutto und Netto gleich.
//
//  Umstellung ohne Überraschung: Solange die Liste noch nie unter
//  „Preise" gespeichert wurde (Kennzeichen firma.preise._brutto fehlt),
//  rechnen Rechnungen und KVA unverändert wie vorher.
//
//  Neuen Lehrgang aufnehmen = eine Zeile in LEHRGAENGE ergänzen.
//    key   : Name des Lehrgangs in der Verwaltung (= Schlüssel in firma.preise)
//    label : Bezeichnung in der Preisliste
//    kva   : { id, l } → erscheint im KVA unter diesem Namen (id bleibt stabil,
//            damit archivierte KVA ihre Auswahl behalten); ohne kva = nur Rechnung
//    alt   : bisheriger fester KVA-Preis (nur als Vorschlag bei der Umstellung)
//  Muss VOR kva.js und einstellungen.js geladen werden.
// ════════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  var LEHRGAENGE = [
    { key: 'Gabelstapler',        label: 'Gabelstapler',                              kva: { id: 'c5',  l: 'Gabelstaplerschulung' }, alt: 199 },
    { key: 'Ladekran',            label: 'Ladekran',                                  kva: { id: 'c7',  l: 'Ladekranausbildung' }, alt: 399 },
    { key: 'Baumaschinen',        label: 'Baumaschinen',                              kva: { id: 'c14', l: 'Baumaschinen' } },
    { key: 'Fahrtenschreiber',    label: 'Fahrtenschreiber',                          kva: { id: 'c15', l: 'Fahrtenschreiber' } },
    { key: 'Ladungssicherung',    label: 'Ladungssicherung',                          kva: { id: 'c6',  l: 'Ladungssicherung' }, alt: 259 },
    { key: 'ADR Basiskurs',       label: 'ADR Basiskurs',                             kva: { id: 'c1',  l: 'ADR Basiskurs' }, alt: 319 },
    { key: 'ADR Aufbaukurs Tank', label: 'ADR Aufbaukurs Tank',                       kva: { id: 'c2',  l: 'ADR Aufbaukurs Tank' }, alt: 260 },
    { key: 'ADR Basis+Tank',      label: 'ADR Basiskurs + Aufbaukurs Tank (Paket)',   kva: { id: 'c3',  l: 'ADR Basiskurs + Aufbaukurs Tank' }, alt: 550 },
    { key: 'ADR Fortbildung',     label: 'ADR Fortbildung',                           kva: { id: 'c4',  l: 'ADR Fortbildung' }, alt: 249 },
    { key: 'BKF Modul',           label: 'BKF-Weiterbildung (je Modul)',              kva: { id: 'c10', l: 'BKF-Weiterbildung (je Modul)' }, alt: 115 },
    { key: 'BGQ LKW',             label: 'BGQ LKW (140 h)',                           kva: { id: 'c11', l: 'Beschleunigte Grundqualifikation LKW (140 h)' }, alt: 2480 },
    { key: 'BGQ KOM',             label: 'BGQ KOM (140 h)',                           kva: { id: 'c16', l: 'Beschleunigte Grundqualifikation KOM (140 h)' }, alt: 2480 },
    { key: 'Umsteiger LKW',       label: 'Umsteiger LKW (35 h)',                      kva: { id: 'c12', l: 'Grundqualifikation Umsteiger LKW (35 h)' }, alt: 980 },
    { key: 'Umsteiger KOM',       label: 'Umsteiger KOM (35 h)',                      kva: { id: 'c17', l: 'Grundqualifikation Umsteiger KOM (35 h)' }, alt: 980 },
    { key: 'FES Modul 1',         label: 'FES Modul 1 (verkehrspäd.)',                kva: { id: 'c9',  l: 'Fahreignungsseminar Modul 1' } },
    { key: 'FES Modul 2',         label: 'FES Modul 2 (verkehrspäd.)',                kva: { id: 'c18', l: 'Fahreignungsseminar Modul 2' } },
    { key: 'ASF',                 label: 'ASF (Aufbauseminar)',                       kva: { id: 'c8',  l: 'ASF (Aufbauseminar)' }, alt: 450 },
    { key: 'Sach- und Fachkunde', label: 'Sach- und Fachkunde',                       kva: { id: 'c13', l: 'Sach- und Fachkunde' }, alt: 1500 },
  ];
  var UNTERWEISUNGEN = [
    { key: 'UW_Gabelstapler',     label: 'Unterweisung Gabelstapler' },
    { key: 'UW_Ladekran',         label: 'Unterweisung Ladekran' },
    { key: 'UW_ADR',              label: 'ADR-Unterweisung' },
    { key: 'UW_Fahrtenschreiber', label: 'Unterweisung Fahrtenschreiber' },
    { key: 'UW_Baumaschinen',     label: 'Unterweisung Baumaschinen' },
  ];

  function firma() { return (window.einstState && window.einstState.firma) || {}; }
  function gespeichert() { return firma().preise || {}; }
  function steuer() { var t = parseFloat(firma().tax); return isNaN(t) ? 0 : t; }
  function runden(x) { return Math.round(x * 100) / 100; }
  function zahl(v) { var n = parseFloat(v); return isNaN(n) || n <= 0 ? null : n; }

  // true = die zentrale Liste wurde unter Einstellungen → Preise gespeichert
  function aktiv() { return gespeichert()._brutto === true; }

  // Bruttopreis aus der zentralen Liste (nur wenn aktiv), sonst null
  function brutto(key) { return aktiv() ? zahl(gespeichert()[key]) : null; }

  // Lehrgänge für den KVA: genau die Lehrgänge der Preisliste, die einen Preis haben
  function kvaKurse() {
    var out = [];
    LEHRGAENGE.forEach(function (x) {
      if (!x.kva) return;
      var p = brutto(x.key);
      if (p != null) out.push({ id: x.kva.id, l: x.kva.l, p: p });
    });
    return out;
  }

  // Vorschlag für die Umstellung: was stand bisher wo?
  //   rechnungNetto = bisher gespeicherter Rechnungspreis (netto)
  //   kvaAlt        = bisheriger fester KVA-Preis (brutto)
  function vorschlag(x) {
    var st = gespeichert();
    var rn = zahl(st[x.key]);
    var rb = rn != null ? runden(rn * (1 + steuer() / 100)) : null;
    var kva = x.alt != null ? x.alt : null;
    return { rechnungNetto: rn, rechnungBrutto: rb, kvaAlt: kva, wert: kva != null ? kva : rb };
  }

  window.FTG_PREISE = {
    LEHRGAENGE: LEHRGAENGE, UNTERWEISUNGEN: UNTERWEISUNGEN,
    aktiv: aktiv, brutto: brutto, steuer: steuer, kvaKurse: kvaKurse, vorschlag: vorschlag, runden: runden,
  };
})();
