// ════════════════════════════════════════════════════════════════════
//  MODUL BKrFQG – Anerkennungsverwaltung
//  Einheitliches Design mit App-Klassen (.card, .ma-table, .btn, .frow …)
//  Nutzt window.sb + globale toast() Funktion
// ════════════════════════════════════════════════════════════════════

// Versionsstempel des Moduls. Muss mit dem ?v= am <script src="bkrfqg.js">
// in index.html uebereinstimmen – beim Aendern beide Stellen anfassen.
const BKRFQG_VERSION = '20260825c';

const bkrfqgState = {
  standorte: [], raeume: [], fahrlehrer: [], kursplaene: [],
  dozentBaender: [], dozentUnterthemen: [],
  aktuellerTab: 'dashboard', loaded: false, antragStandortId: null,
};

// ── Degner-Bänder + BKrFQV Anlage 1 (Rahmenplan 2021) ───────────────
// BGQ = beschleunigte Grundqualifikation  ·  140 Std. = 8 400 min gesamt
// ── DEGENER Rahmenpläne – alle 7 Kurstypen (Anlage 1 BKrFQV, Stand 2021/2022) ──
const BKRFQV_KURSE_META = {
  bgq_g:    { label:'BGQ Güter',      icon:'🚛', std:140, min:8400,  typ:'BGQ'  },
  bgq_p:    { label:'BGQ Person',     icon:'🚌', std:140, min:8400,  typ:'BGQ'  },
  qe_g:     { label:'QE Güter',       icon:'🚛', std: 96, min:5760,  typ:'QE'   },
  qe_p:     { label:'QE Person',      icon:'🚌', std: 96, min:5760,  typ:'QE'   },
  umst_g2p: { label:'Umst. GK→P',    icon:'🔄', std: 35, min:2100,  typ:'Umst' },
  umst_p2g: { label:'Umst. P→GK',    icon:'🔄', std: 35, min:2100,  typ:'Umst' },
  wb_r3_g:  { label:'WB Runde 3 G',  icon:'📚', std: 35, min:2100,  typ:'WB'   },
  wb_t1:    { label:'WB Modul 1 (T1)',icon:'📚', std:  7, min: 420,  typ:'WB'   },
  wb_t2:    { label:'WB Modul 2 (T2)',icon:'📚', std:  7, min: 420,  typ:'WB'   },
  wb_t3:    { label:'WB Modul 3 (T3)',icon:'📚', std:  7, min: 420,  typ:'WB'   },
  wb_t4:    { label:'WB Modul 4 (T4)',icon:'📚', std:  7, min: 420,  typ:'WB'   },
  wb_t5:    { label:'WB Modul 5 (T5)',icon:'📚', std:  7, min: 420,  typ:'WB'   },
  kombi_gp: { label:'Kombi G+P',     icon:'🚛🚌', std:130, min:7800,  typ:'Kombi' },
};

// Unterthemen + Zeitansätze dienen der Kursplanung pro Dozent
const BKRFQV_THEMEN = (() => {
  // ── Band-Helper ────────────────────────────────────────────────────
  const bnd = (nr, titel, kb, min, ut) => ({ nr, titel, kb, bkrfqv: kb ? [kb] : [], dauer_min: min, unterthemen: ut });
  const ut  = (id, titel, min, kb='') => ({ id, titel, dauer_min: min, bkrfqv: kb });

  // ── Geteilte Bänder ────────────────────────────────────────────────
  const B1 = bnd('1','Gesundheit & Fitness','KB 3.3, 3.4', 810, [
    ut('1.1','Gesundheitsvorsorge (Belastungen, Anforderungen, Arbeitsschutz)',         180,'KB 3.3'),
    ut('1.2','Ergonomie – Gesundheitsgerechte Bewegung und Haltungen',                  180,'KB 3.4'),
    ut('1.3','Physische Kondition und individueller Schutz',                             90,'KB 3.4'),
    ut('1.4','Grundsätze einer gesunden und ausgewogenen Ernährung',                    90,'KB 3.4'),
    ut('1.5','Müdigkeit – Ursachen, Symptome, Zyklus von Aktivität und Ruhezeit',       90,'KB 3.4'),
    ut('1.6','Stress – Phasen, Belastungsfaktoren, Stresstreppe, Bewältigungsstrategien',180,'KB 3.3'),
  ]);
  const B2g = bnd('2','Kinematische Kette | Energie & Umwelt','KB 1.1, 1.3, 1.3a', 1080, [
    ut('2.1','Motor / Dieselmotor (Aufbau, Arbeitsweise, Einspritzverfahren, Motormanagement)',270,'KB 1.1'),
    ut('2.2','Alternative Antriebe (Erdgas, Wasserstoff, Brennstoffzelle, Hybrid)',    null,'KB 1.1'),
    ut('2.3','Eigenschaften und Arten von Kraftstoffen',                                 90,'KB 1.1'),
    ut('2.4','Emissionen und Abgasnachbehandlung',                                     null,'KB 1.1'),
    ut('2.5','Antriebskonzeption – Radformel, Kupplung, Getriebe, Gelenkwelle',        270,'KB 1.1'),
    ut('2.6','Fahrwerk, Lenkung, Räder und Reifen',                                     90,'KB 1.1'),
    ut('2.7','Optimierung des Kraftstoffverbrauchs & energiesparende Fahrweise',        300,'KB 1.3'),
    ut('2.8','Straßenkarten, Fahrplanung, Streckenplanung, Zeitplanung',               null,'KB 1.3'),
    ut('2.9','Risiken im Straßenverkehr – vorhersehen, bewerten, anpassen',              60,'KB 1.3a'),
  ]);
  const B2p = bnd('2','Kinematische Kette | Energie & Umwelt','KB 1.1, 1.3, 1.3a', 1050, [
    ut('2.1','Motor / Dieselmotor (Aufbau, Arbeitsweise, Einspritzverfahren, Motormanagement)',270,'KB 1.1'),
    ut('2.2','Alternative Antriebe (Erdgas, Wasserstoff, Brennstoffzelle, Hybrid)',    null,'KB 1.1'),
    ut('2.3','Eigenschaften und Arten von Kraftstoffen',                                 90,'KB 1.1'),
    ut('2.4','Emissionen und Abgasnachbehandlung',                                     null,'KB 1.1'),
    ut('2.5','Antriebskonzeption – Radformel, Kupplung, Getriebe, Gelenkwelle',        270,'KB 1.1'),
    ut('2.6','Fahrwerk, Lenkung, Räder und Reifen',                                     90,'KB 1.1'),
    ut('2.7','Optimierung des Kraftstoffverbrauchs & energiesparende Fahrweise',        210,'KB 1.3'),
    ut('2.8','Straßenkarten, Fahrplanung, Streckenplanung, Zeitplanung',               null,'KB 1.3'),
    ut('2.9','Risiken im Straßenverkehr – vorhersehen, bewerten, anpassen',             120,'KB 1.3a'),
  ]);
  const B3f = bnd('3','Bremsanlagen','KB 1.2', 720, [
    ut('3.1','Grundbegriffe – Reaktionsweg, Bremsweg, Anhalteweg',                      180,'KB 1.2'),
    ut('3.2','Arten der Bremsanlagen (mechanisch, hydraulisch, Hilfskraft, Fremdkraft)',null,'KB 1.2'),
    ut('3.3','Druckluftbeschaffungsanlage (Kompressor, Lufttrockner, Mehrkreisschutzventil)',360,'KB 1.2'),
    ut('3.4','Feststellbremse, Dauerbremsen (Retarder), Bremsanlage bei Lastzügen',   null,'KB 1.2'),
    ut('3.5','Elektronische Bremsunterstützung (EBS, ABS, ASR)',                       null,'KB 1.2'),
    ut('3.6','Kontrollen, Wartung und Pflege',                                          180,'KB 1.2'),
  ]);
  const B3p630 = bnd('3','Bremsanlagen','KB 1.2', 630, [
    ut('3.1','Grundbegriffe – Reaktionsweg, Bremsweg, Anhalteweg',                      180,'KB 1.2'),
    ut('3.2','Arten der Bremsanlagen',                                                  null,'KB 1.2'),
    ut('3.3','Druckluftbeschaffungsanlage',                                              315,'KB 1.2'),
    ut('3.4','Feststellbremse, Dauerbremsen, Bremsanlage bei Lastzügen',               null,'KB 1.2'),
    ut('3.5','Elektronische Bremsunterstützung (EBS, ABS, ASR)',                       null,'KB 1.2'),
    ut('3.6','Kontrollen, Wartung und Pflege',                                          135,'KB 1.2'),
  ]);
  const B5 = bnd('5','Sozialvorschriften','KB 2.1', 810, [
    ut('5.1','Lenk- und Ruhezeiten (Tageslenkzeit, Wochenlenkzeit, Ruhezeiten, Ausnahmen)',360,'KB 2.1'),
    ut('5.2','Kontrollgeräte – analoger und digitaler Tachograph',                      180,'KB 2.1'),
    ut('5.3','Arbeitszeit – Richtlinie 2002/15/EG, ArbZG, Sonntagsfahrverbot',         180,'KB 2.1'),
    ut('5.4','Rechte und Pflichten des Fahrers (Grundqualifikation, Weiterbildung, Befähigungsnachweis)',90,'KB 2.1'),
  ]);
  const B7f = bnd('7','Pannen, Unfälle, Notfälle und Kriminalität','KB 3.1, 3.2, 3.5', 990, [
    ut('7.1','Kriminalität und Schleusung illegaler Einwanderer',                         90,'KB 3.2'),
    ut('7.2','Bewusstseinsbildung für Risiken des Straßenverkehrs und Arbeitsunfälle',   360,'KB 3.1'),
    ut('7.3','Verhalten bei Unfällen und Notfällen – Erste Hilfe, Brandklassen, Feuerlöscher',540,'KB 3.5'),
  ]);
  const B7k630 = bnd('7','Pannen, Unfälle, Notfälle und Kriminalität','KB 3.1, 3.2, 3.5', 630, [
    ut('7.1','Kriminalität und Schleusung illegaler Einwanderer',                         90,'KB 3.2'),
    ut('7.2','Verhalten bei Unfällen und Notfällen',                                     540,'KB 3.5'),
  ]);
  const B7u600 = bnd('7','Pannen, Unfälle, Notfälle und Kriminalität','KB 3.1, 3.2, 3.5', 600, [
    ut('7.1','Bewusstseinsbildung für Risiken des Straßenverkehrs und Arbeitsunfälle',   240,'KB 3.1'),
    ut('7.2','Verhalten bei Unfällen und Notfällen – Erste Hilfe, Brandklassen, Feuerlöscher',360,'KB 3.5'),
  ]);
  const B7u540 = bnd('7','Pannen, Unfälle, Notfälle und Kriminalität','KB 3.1, 3.2, 3.5', 540, [
    ut('7.1','Bewusstseinsbildung für Risiken des Straßenverkehrs und Arbeitsunfälle',   240,'KB 3.1'),
    ut('7.2','Verhalten bei Unfällen und Notfällen',                                     300,'KB 3.5'),
  ]);
  const B9 = (min, w, p) => bnd('9','Fahrpraktische Übungen, Wartung und Pflege','', min, [
    ut('9.1','Wartung und Fahrzeugpflege (Lichttechnik, Bremse, Reifen, Motor, Lenkung)',w,''),
    ut('9.2','Praktische Ausbildung – Fahrpraktische Übungen',                           p,''),
  ]);

  // ── Güter-spezifisch ───────────────────────────────────────────────
  const B4G = (min, ut_list) => bnd('4G','Ladungssicherung','KB 1.4', min, ut_list);
  const B4G_full = B4G(1440, [
    ut('4G.1','Rechtliche Grundlagen (StVO, StVZO, OWiG, GGVSEB, CTU, CMR, VDI-Richtlinien)',135,'KB 1.4'),
    ut('4G.2','Physikalische Grundlagen (Masse, Fliehkraft, Reibung, Standsicherheit)',       270,'KB 1.4'),
    ut('4G.3','Arten der Ladungssicherung (kraftschlüssig, formschlüssig)',                   180,'KB 1.4'),
    ut('4G.4','Berechnung (Reibkraft, Niederzurren, Schrägzurren, Diagonalzurren, Nutzlast)',null,'KB 1.4'),
    ut('4G.5','Fahrzeugaufbauten und Zurrpunkte',                                            null,'KB 1.4'),
    ut('4G.6','Lastverteilungsplan',                                                           90,'KB 1.4'),
    ut('4G.7','Hilfsmittel (Zurrgurte, -ketten, Staupolster, Sperrbalken, Kantenschutz)',     90,'KB 1.4'),
    ut('4G.8','Praxisbeispiele Ladungssicherung',                                            135,'KB 1.4'),
    ut('4G.9','Arbeitssicherheit beim Beladen',                                              null,'KB 1.4'),
    ut('4G.10','Praktische Ausbildung – Übungen zur Ladungssicherung',                       540,'KB 1.4'),
  ]);
  const B4G_840 = B4G(840, [
    ut('4G.1','Rechtliche Grundlagen (StVO, StVZO, OWiG, GGVSEB, CMR, VDI-Richtlinien)',    45,'KB 1.4'),
    ut('4G.2','Physikalische Grundlagen (Masse, Fliehkraft, Reibung, Standsicherheit)',       90,'KB 1.4'),
    ut('4G.3','Arten der Ladungssicherung (kraftschlüssig, formschlüssig)',                   45,'KB 1.4'),
    ut('4G.4','Berechnung (Reibkraft, Niederzurren, Schrägzurren, Diagonalzurren, Nutzlast)', 45,'KB 1.4'),
    ut('4G.5','Fahrzeugaufbauten und Zurrpunkte',                                             45,'KB 1.4'),
    ut('4G.6','Hilfsmittel (Zurrgurte, -ketten, Staupolster, Sperrbalken, Kantenschutz)',     90,'KB 1.4'),
    ut('4G.7','Praxisbeispiele Ladungssicherung',                                             90,'KB 1.4'),
    ut('4G.8','Praktische Ausbildung – Übungen zur Ladungssicherung',                        390,'KB 1.4'),
  ]);
  const B6G = (min, ut_list) => bnd('6G','Vorschriften für den Güterkraftverkehr','KB 2.2', min, ut_list);
  const B6G_full = B6G(900, [
    ut('6G.1','Güterkraftverkehrsgesetz (GüKG) – nationale Verkehre, BAG, Werkverkehr',     360,'KB 2.2'),
    ut('6G.2','HGB, VBGL, ADSp',                                                            null,'KB 2.2'),
    ut('6G.3','Verkehr innerhalb EU – VO EWG Nr. 881/92 (Gemeinschaftslizenz, Fahrerbescheinigung)',360,'KB 2.2'),
    ut('6G.4','Abkommen EG-Schweiz, GüKGrKabotageV (CEMT, Kabotage, Fahrzeugeinsatz)',     null,'KB 2.2'),
    ut('6G.5','Internationale Vereinbarung über Beförderungsverträge (CMR)',                 null,'KB 2.2'),
    ut('6G.6','TIR-Übereinkommen, Abfalltransport',                                         null,'KB 2.2'),
    ut('6G.7','Der Lkw in der StVZO (Untersuchungen, Ausrüstung, Maße, Geschwindigkeitsbegrenzer)',180,'KB 2.2'),
  ]);
  const B6G_240 = B6G(240, [
    ut('6G.1','GüKG, HGB, VBGL, ADSp',                                                       90,'KB 2.2'),
    ut('6G.2','VO EWG Nr. 881/92, Abkommen EG-Schweiz',                                      45,'KB 2.2'),
    ut('6G.3','GüKGrKabotageV, CMR, TIR, Abfalltransport',                                   60,'KB 2.2'),
    ut('6G.4','Der Lkw in der StVZO',                                                         45,'KB 2.2'),
  ]);
  const B8G = (min, ut_list) => bnd('8G','Unternehmensbild & Marktordnung im Güterkraftverkehr','KB 3.6, 3.7', min, ut_list);
  const B8G_full = B8G(960, [
    ut('8G.1','Unternehmensbild im GK – Qualität, Rollen, Gesprächspartner, Arbeitsorganisation',510,'KB 3.6'),
    ut('8G.2','Marktordnung im GK – Verkehrsträger, Organisation, Spezialisierung, Weiterentwicklung',360,'KB 3.7'),
    ut('8G.3','Kommerzielle und finanzielle Konsequenzen eines Rechtsstreits',                   90,'KB 3.7'),
  ]);
  const B8G_420 = B8G(420, [
    ut('8G.1','Unternehmensbild im Güterkraftverkehr – Qualität, Rollen, Gesprächspartner, Arbeitsorganisation',420,'KB 3.6'),
  ]);
  const B8G_300 = B8G(300, [
    ut('8G.1','Unternehmensbild im Güterkraftverkehr',                                         90,'KB 3.6'),
    ut('8G.2','Marktordnung im Güterkraftverkehr',                                            120,'KB 3.7'),
    ut('8G.3','Kommerzielle und finanzielle Konsequenzen eines Rechtsstreits',                  90,'KB 3.7'),
  ]);

  // ── Personen-spezifisch ────────────────────────────────────────────
  const B4P = (min, ut_list) => bnd('4P','Sicherheit der Fahrgäste','KB 1.5, 1.6', min, ut_list);
  const B4P_full = B4P(1440, [
    ut('4P.1','Sicherheit und Komfort (aktiv, passiv, Verkehrssicherheit)',                    90,'KB 1.5'),
    ut('4P.2','Pflichten des Fahrzeugführers (Sorgfalt, Verkehrsflächen, Fahrgastgruppen)',   135,'KB 1.5'),
    ut('4P.3','Längs- und Seitwärtsbewegungen (Fahrgeschwindigkeit, Kurven, Abbremsen)',       90,'KB 1.5'),
    ut('4P.4','Gewährleistung der Sicherheit aller Fahrgäste',                                 45,'KB 1.5'),
    ut('4P.5','Fahrphysik (Fahrwiderstände, Flieh- und Seitenführungskräfte, Gleitreibung)',  360,'KB 1.5'),
    ut('4P.6','Ladungssicherung in Bussen (Rechtl. Grundlagen, Physik, Berechnung, Praxisbeispiele)',720,'KB 1.6'),
  ]);
  const B4P_1350 = B4P(1350, [
    ut('4P.1','Sicherheit und Komfort (aktiv, passiv, Verkehrssicherheit)',                    90,'KB 1.5'),
    ut('4P.2','Pflichten des Fahrzeugführers (Sorgfalt, Verkehrsflächen, Fahrgastgruppen)',   135,'KB 1.5'),
    ut('4P.3','Längs- und Seitwärtsbewegungen des Fahrzeugs',                                 90,'KB 1.5'),
    ut('4P.4','Gewährleistung der Sicherheit aller Fahrgäste',                                 45,'KB 1.5'),
    ut('4P.5','Fahrphysik (Fahrwiderstände, Flieh- und Seitenführungskräfte)',                315,'KB 1.5'),
    ut('4P.6','Ladungssicherung in Bussen',                                                   675,'KB 1.6'),
  ]);
  const B4P_240 = B4P(240, [
    ut('4P.1','Sicherheit und Komfort',                                                        45,'KB 1.5'),
    ut('4P.2','Pflichten des Fahrzeugführers',                                                 60,'KB 1.5'),
    ut('4P.3','Längs- und Seitwärtsbewegungen des Fahrzeugs',                                 45,'KB 1.5'),
    ut('4P.4','Gewährleistung der Sicherheit aller Fahrgäste',                                 45,'KB 1.5'),
    ut('4P.5','Fahrphysik',                                                                    45,'KB 1.5'),
  ]);
  const B6P = (min, ut_list) => bnd('6P','Vorschriften für den Personenverkehr','KB 2.3', min, ut_list);
  const B6P_full = B6P(900, [
    ut('6P.1','Personenbeförderungsgesetz (PBefG) – Geltungsbereich, Genehmigung, Verkehrsformen',240,'KB 2.3'),
    ut('6P.2','EWG/EG-Regelungen – VO 684/92 (grenzüberschreitender Personenverkehr)',         360,'KB 2.3'),
    ut('6P.3','Interbus-Übereinkommen, Abkommen Schweiz/EG, EWR-Abkommen',                    null,'KB 2.3'),
    ut('6P.4','EG-Bus-Durchführungsverordnung (EGBusDV), BOKraft, BefBedV',                   null,'KB 2.3'),
    ut('6P.5','Der Kraftomnibus in der StVZO (Untersuchungen, Ausrüstung, Abmessungen)',       300,'KB 2.3'),
  ]);
  const B6P_540 = B6P(540, [
    ut('6P.1','PBefG – Geltungsbereich, Genehmigung, Ordnungswidrigkeiten (§61)',              120,'KB 2.3'),
    ut('6P.2','EWG/EG-Regelungen – VO 684/92',                                                 360,'KB 2.3'),
    ut('6P.3','Interbus, Schweiz/EG, EWR, EGBusDV, BOKraft, BefBedV',                        null,'KB 2.3'),
    ut('6P.4','Der Kraftomnibus in der StVZO (Grundlagen)',                                    null,'KB 2.3'),
    ut('6P.5','Besondere Formen der Personenbeförderung (Sightseeing-Bahnen, Park- und Kurbahnen)', 60,'KB 2.3'),
  ]);
  const B8P = (min, ut_list) => bnd('8P','Unternehmensbild & Marktordnung im Personenverkehr','KB 3.6, 3.8', min, ut_list);
  const B8P_full = B8P(960, [
    ut('8P.1','Marktordnung im PV – Verkehrsmittel, Organisation, Unternehmen, Produkte',     360,'KB 3.8'),
    ut('8P.2','Unternehmensbild im PV – Qualität, Rollen, Konfliktmanagement',                510,'KB 3.6'),
    ut('8P.3','Kommerzielle und finanzielle Konsequenzen eines Rechtsstreits',                  90,'KB 3.8'),
  ]);
  const B8P_720 = B8P(720, [
    ut('8P.1','Marktordnung im Personenverkehr (Fahrkarten und Tickets)',                       45,'KB 3.8'),
    ut('8P.2','Unternehmensbild, Qualität, Rollen, Konfliktmanagement',                       585,'KB 3.6'),
  ]);
  const B8P_480 = B8P(480, [
    ut('8P.1','Unternehmensbild im Personenverkehr',                                          180,'KB 3.6'),
    ut('8P.2','Marktordnung im Personenverkehr',                                              180,'KB 3.8'),
    ut('8P.3','Kommerzielle und finanzielle Konsequenzen eines Rechtsstreits',                120,'KB 3.8'),
  ]);

  // ── Weiterbildung Runde 3 Güter (5 × 420 Min.) ────────────────────
  const WBR3 = [
    bnd('T1','Tag 1 – Risikobewusstsein und Verhalten','KB 1.3, 1.3a, 3.1', 420, [
      ut('T1.1','Bewusstseinsbildung für Risiken (Verkehrs- und Arbeitsunfälle, Auswirkungen)',  90,'KB 3.1'),
      ut('T1.2','Lebenslanges Lernen – vorausdenkende Fahrweise, Informationsdefizite',          30,'KB 1.3a'),
      ut('T1.3','Grundsätze zur Teilnahme am Straßenverkehr (Vertrauensgrundsatz, doppelte Sicherung)',90,'KB 1.3a'),
      ut('T1.4','Risikoreiches Verhalten (Ablenkung, Geschwindigkeit, Abstände, Aggression)',   180,'KB 1.3'),
      ut('T1.5','Einstieg und Abschluss (obligatorisch)',                                         30,''),
    ]),
    bnd('T2','Tag 2 – Rahmenbedingungen und Ereignisse','KB 1.3a, 1.4', 420, [
      ut('T2.1','Gefahrensituationen erkennen (Verkehrswahrnehmung, Gefahrenbewusstsein, Sicherheitsvorsorge)',120,'KB 1.3a'),
      ut('T2.2','Straßenbedingungen (Autobahn, Parkplatz, Bundes- und Landstraßen)',             60,'KB 1.3a'),
      ut('T2.3','Partnerschaftliches Verhalten (Radfahrende, innerstädtisches Fahren)',           60,'KB 1.3a'),
      ut('T2.4','Wahrnehmung und Ablenkung (Fahrerarbeitsplatz, Spiegel, Geräte)',               60,'KB 1.3a'),
      ut('T2.5','Witterungsbedingungen (außergewöhnlich, winterlich, Sturm)',                     30,'KB 1.3a'),
      ut('T2.6','Sicherung der Ladung – alternative Kombination KB 1.4 (Nutzlast, Lastverteilungsplan)', 60,'KB 1.4'),
      ut('T2.7','Einstieg und Abschluss (obligatorisch)',                                         30,''),
    ]),
    bnd('T3','Tag 3 – Gefahrensituationen, Stress und Unfälle','KB 1.2, 2.1, 3.4, 3.5', 420, [
      ut('T3.1','Gefahrensituationen erkennen (Gefahrenpotentiale, Stress, Fahrassistenzsysteme)',210,'KB 3.4'),
      ut('T3.2','Fahrverhaltenstraining (Unfälle vermeiden, Fahrsimulator)',                      60,'KB 3.5'),
      ut('T3.3','Unfälle und Katastrophen (Definition VVG, Straßentunnel in Deutschland)',         60,'KB 3.5'),
      ut('T3.4','Sicherer Umgang mit Elektrofahrzeugen (Gefahrenpotential, Pannenfall)',           30,'KB 1.2'),
      ut('T3.5','Pannenfall und Fahrtenschreiber (Aufzeichnungen, Straßenkontrolle) – KB 2.1',     30,'KB 2.1'),
      ut('T3.6','Einstieg und Abschluss (obligatorisch)',                                          30,''),
    ]),
    bnd('T4','Tag 4 – Firma – Fahrer – Fahrzeug','KB 2.1, 2.2, 3.6, 3.7, 3.8', 420, [
      ut('T4.1','Kraftverkehrsunternehmen im Markt (Rolle BKF, Rolle Unternehmen)',               45,'KB 3.7'),
      ut('T4.2','Kombination von Rechtsvorschriften (Lenk-/Arbeitszeiten, VO 561/2006, 2002/15/EG)',90,'KB 2.1'),
      ut('T4.3','Anwendung Lenk- und Ruhezeiten in der Praxis (Linienverkehr, Gelegenheitsverkehr)',120,'KB 2.1'),
      ut('T4.4','Digitale Fahrtenschreiber in der Praxis (Tachografensystem, 2. Generation)',      90,'KB 2.1'),
      ut('T4.5','Die LKW-Maut auf deutschen Straßen (Grundlagen, Mautsätze, Befreiung)',          45,'KB 2.2'),
      ut('T4.6','Einstieg und Abschluss (obligatorisch)',                                          30,''),
    ]),
    bnd('T5','Tag 5G – Recht und Dokumente im Güterkraftverkehr','KB 2.2', 420, [
      ut('T5.1','GüKG (nationale Verkehre) – Geltungsbereich, BAG, Werkverkehr',                180,'KB 2.2'),
      ut('T5.2','HGB, VBGL, ADSp, VO EWG Nr. 881/92 (Gemeinschaftslizenz, Fahrerbescheinigung)',210,'KB 2.2'),
      ut('T5.3','Abkommen EG-Schweiz, GüKGrKabotageV, CMR, TIR, Abfalltransport',             null,'KB 2.2'),
      ut('T5.4','Gewerblicher Tiertransport (VO 1/2005, TierSchTrV, Kontrollbücher)',           null,'KB 2.2'),
      ut('T5.5','Einstieg und Abschluss (obligatorisch)',                                         30,''),
    ]),
  ];

  // ── Zusammenstellung aller Kurstypen ──────────────────────────────
  // Kombi: gemeinsame Basis (Güter-Werte) + beide Spezialblöcke.
  // Gemeinsame Bänder werden EINMAL unterrichtet (zählen für beide Qualifikationen),
  // die Spezialblöcke getrennt. Ergibt je Qualifikation 130 Std. ohne Fahrpraxis.
  const B9w = bnd('9','Wartung und Fahrzeugpflege (Theorie)','', 90, [
    ut('9.1','Wartung und Fahrzeugpflege (Lichttechnik, Bremse, Reifen, Motor, Lenkung)',90,''),
  ]);
  const tag = (b, phase) => ({ ...b, phase });

  return {
    bgq_g:    [B1, B2g,   B3f,    B4G_full, B5, B6G_full, B7f,   B8G_full, B9(690,90,600)],
    bgq_p:    [B1, B2p,   B3f,    B4P_full, B5, B6P_full, B7f,   B8P_full, B9(690,90,600)],
    qe_g:     [B1, B2p,   B3f,    B4G_full,     B7k630,   B8G_420,         B9(660,60,600)],
    qe_p:     [B1, B2p,   B3p630, B4P_1350,     B7k630,   B8P_720,         B9(660,60,600)],
    umst_g2p: [         B4P_240,  B6P_540, B7u600, B8P_480,                 B9(240,90,150)],
    umst_p2g: [         B4G_840,  B6G_240, B7u540, B8G_300,                 B9(180,30,150)],
    wb_r3_g:  WBR3,
    wb_t1:    [WBR3[0]],
    wb_t2:    [WBR3[1]],
    wb_t3:    [WBR3[2]],
    wb_t4:    [WBR3[3]],
    wb_t5:    [WBR3[4]],
    kombi_gp: [
      // ── Gemeinsamer Block (beide Gruppen zusammen, Güter-Werte) ──
      tag(B1, 'gemeinsam'),  tag(B2g, 'gemeinsam'), tag(B3f, 'gemeinsam'),
      tag(B5, 'gemeinsam'),  tag(B7f, 'gemeinsam'), tag(B9w, 'gemeinsam'),
      // ── Spezialblock Güter ──
      tag(B4G_full, 'gueter'), tag(B6G_full, 'gueter'), tag(B8G_full, 'gueter'),
      // ── Spezialblock Person ──
      tag(B4P_full, 'person'), tag(B6P_full, 'person'), tag(B8P_full, 'person'),
    ],
    // Rückwärts-Kompatibilität für KI-Kursplangenerator
    Gueter:   [B1, B2g,   B3f,    B4G_full, B5, B6G_full, B7f,   B8G_full, B9(690,90,600)],
    Person:   [B1, B2p,   B3f,    B4P_full, B5, B6P_full, B7f,   B8P_full, B9(690,90,600)],
  };
})();

// Rückwärts-Kompatibilität für KI-Generator (nutzt nur nr + titel)
const DEGNER_BAENDER = {
  Gueter: BKRFQV_THEMEN.Gueter.map(b=>({nr:b.nr, titel:b.titel})),
  Person: BKRFQV_THEMEN.Person.map(b=>({nr:b.nr, titel:b.titel})),
};

// ── KI & Helfer ──────────────────────────────────────────────────────
async function bkrfqgKI(aktion, daten) {
  const res = await fetch('/.netlify/functions/ki', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ aktion, daten })
  });
  // Bei einem Timeout oder Absturz liefert Netlify eine HTML-Seite.
  // Ohne diese Pruefung scheiterte res.json() daran und meldete einen
  // Parserfehler statt der eigentlichen Ursache.
  const roh = await res.text();
  let d;
  try { d = JSON.parse(roh); }
  catch (e) {
    if (res.status === 504 || res.status === 502) {
      throw new Error('Zeitüberschreitung (' + res.status + '): Die Prüfung hat zu lange gedauert.');
    }
    throw new Error('Server antwortete mit ' + res.status + ' (kein JSON): ' + roh.slice(0, 120));
  }
  if (!d.ok && !d.kurstage && !d.pruefung) throw new Error(d.error || 'KI-Fehler');
  return d;
}
function bkrfqgBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = e => resolve(e.target.result.split(',')[1]);
    r.onerror = reject; r.readAsDataURL(file);
  });
}
async function bkrfqgSB(tabelle, opts) {
  opts = opts || {};
  let q = sb.from(tabelle).select(opts.select || '*'); // select immer gesetzt → eq() verfügbar
  if (opts.eq) Object.entries(opts.eq).forEach(([k,v]) => q = q.eq(k, v));
  if (opts.order) q = q.order(opts.order);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data || [];
}
async function bkrfqgInsert(t, p) { const {data,error}=await sb.from(t).insert(p).select(); if(error)throw new Error(error.message); return data; }
async function bkrfqgUpdate(t, id, p) { const {data,error}=await sb.from(t).update(p).eq('id',id).select(); if(error)throw new Error(error.message); return data; }
async function bkrfqgDelete(t, id) { const {error}=await sb.from(t).delete().eq('id',id); if(error)throw new Error(error.message); }


function bKursTypLabel(t) {
  return {BGQ_Gueter:'BGQ Güterkraftverkehr', BGQ_Person:'BGQ Personenverkehr',
          BGQ_Kombi:'BGQ Kombi Güter+Person', Weiterbildung:'BKF Weiterbildung (35 Std.)',
          WB_T1:'WB Modul 1 – Risikobewusstsein', WB_T2:'WB Modul 2 – Rahmenbedingungen',
          WB_T3:'WB Modul 3 – Gefahren & Stress', WB_T4:'WB Modul 4 – Firma/Fahrer/Fahrzeug',
          WB_T5:'WB Modul 5 – Recht & Dokumente'}[t] || t;
}
function bfmtD(d){ return d ? new Date(d+'T12:00').toLocaleDateString('de-DE') : '–'; }
function bTageVon(d){ return d ? Math.round((new Date(d+'T12:00')-new Date())/86400000) : null; }

// Kurstypen die zwingend mit Montag starten müssen
const _BRAUCHT_MONTAG = new Set(['BGQ_Gueter','BGQ_Person','BGQ_Kombi','Weiterbildung']);
function bkrfqgBrauchtMontag(kurstyp){ return _BRAUCHT_MONTAG.has(kurstyp); }

function bkrfqgKPTypChange(){
  const kt = document.getElementById('bkp-typ')?.value || '';
  const hint = document.getElementById('bkp-montag-hint');
  if(hint) hint.style.display = bkrfqgBrauchtMontag(kt) ? '' : 'none';
}
function bAmpel(t){
  if(t===null) return '<span style="color:var(--grau)">–</span>';
  if(t<0)  return `<span style="color:var(--rot);font-weight:600">⚠ ${Math.abs(t)}d überfällig</span>`;
  if(t<30) return `<span style="color:var(--rot);font-weight:600">⚠ in ${t} Tagen</span>`;
  if(t<90) return `<span style="color:var(--gelb);font-weight:600">${t} Tage</span>`;
  return `<span style="color:#059669;font-weight:600">✓ ${bfmtD(new Date(Date.now()+t*86400000).toISOString())}</span>`;
}

// Einheitliche Status-Badges (nutzt .bdot Prinzip der App)
const B_STATUS = {
  anerkannt:{c:'#059669',bg:'#ecfdf5',l:'Anerkannt'},
  aktiv:{c:'#059669',bg:'#ecfdf5',l:'Aktiv'},
  geplant:{c:'#2A6CAE',bg:'#eff6ff',l:'Geplant'},
  in_vorbereitung:{c:'#D97706',bg:'#fffbeb',l:'In Vorbereitung'},
  beantragt:{c:'#D97706',bg:'#fffbeb',l:'Beantragt'},
  eingereicht:{c:'#2A6CAE',bg:'#eff6ff',l:'Eingereicht'},
  gemeldet:{c:'#059669',bg:'#ecfdf5',l:'Gemeldet'},
  ausstehend:{c:'#D97706',bg:'#fffbeb',l:'Ausstehend'},
  ausgefallen:{c:'#C0001A',bg:'#fef2f2',l:'Ausgefallen'},
  abgeschlossen:{c:'#6B7280',bg:'#f3f4f6',l:'Abgeschlossen'},
  widerrufen:{c:'#C0001A',bg:'#fef2f2',l:'Widerrufen'},
};
function bBadge(s){
  const x = B_STATUS[s] || {c:'#6B7280',bg:'#f3f4f6',l:s};
  return `<span style="display:inline-block;background:${x.bg};color:${x.c};border-radius:20px;padding:2px 10px;font-size:11px;font-weight:600;white-space:nowrap">${x.l}</span>`;
}
function bInitialen(vn, nn){ return ((vn||'')[0]||'')+((nn||'')[0]||''); }

// ── Haupt-Render ──────────────────────────────────────────────────────
window.renderBkrfqg = async function() {
  const view = document.getElementById('view-bkrfqg');
  if (!view) return;
  if (!bkrfqgState.loaded) {
    view.innerHTML = '<div class="loading"><div class="spinner"></div>Lade BKrFQG-Daten …</div>';
    await bkrfqgLadeAlles();
  }
  bkrfqgRenderShell(view);
};

async function bkrfqgLadeAlles() {
  try {
    const [standorte, raeume, kursplaene] = await Promise.all([
      bkrfqgSB('bkrfqg_standorte', { select:'*', order:'name' }),
      bkrfqgSB('bkrfqg_raeume', { select:'*,bkrfqg_standorte(name)', order:'bezeichnung' }),
      bkrfqgSB('bkrfqg_kursplaene', { select:'*,bkrfqg_standorte(name)', order:'startdatum' }),
    ]);
    bkrfqgState.standorte = standorte;
    bkrfqgState.raeume = raeume;
    bkrfqgState.kursplaene = kursplaene;
    const { data: ma } = await sb.from('mitarbeiter')
      .select('id,vorname,nachname,qual_bkf,frist_afl,bereich')
      .eq('qual_bkf', true).eq('status', 'aktiv').order('nachname');
    bkrfqgState.fahrlehrer = ma || [];
    // Dozenten-Bänder-Zuweisungen laden
    try {
      bkrfqgState.dozentBaender = await bkrfqgSB('bkrfqg_dozent_baender', { select:'*' });
    } catch(e) { bkrfqgState.dozentBaender = []; }
    // Abweichende Dozenten auf Unterthema-Ebene laden
    try {
      bkrfqgState.dozentUnterthemen = await bkrfqgSB('bkrfqg_dozent_unterthemen', { select:'*' });
    } catch(e) { bkrfqgState.dozentUnterthemen = []; }
    bkrfqgState.loaded = true;
  } catch(e) {
    toast('BKrFQG Ladefehler: ' + e.message, 'err');
    bkrfqgState.loaded = true;
  }
}

// ── Shell mit Sidebar (App-Design) ────────────────────────────────────
// Symbole der Seitenleiste. stroke=currentColor laesst sie der
// Textfarbe folgen: grau im Normalzustand, rot beim aktiven Eintrag.
function bkrfqgIcon(pfad){
  return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
    + ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'
    + ' style="width:20px;flex-shrink:0">' + pfad + '</svg>';
}
const BKRFQG_ICONS = {
  dashboard:   '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
  kursplaene:  '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  kursmeldung: '<path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><polyline points="22,6 12,13 2,6"/>',
  antrag:      '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  dokumente:   '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
  standorte:   '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  raeume:      '<path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-6h6v6"/>',
  dozenten:    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>'
};

function bkrfqgRenderShell(view) {
  const primary = [
    { id:'dashboard',   label:'Übersicht' },
    { id:'kursplaene',  label:'Kurspläne' },
    { id:'kursmeldung', label:'Kursmeldung' },
    { id:'antrag',      label:'Antrag' },
    { id:'dokumente',   label:'Dokumente' },
  ];
  const config = [
    { id:'standorte',   label:'Standorte' },
    { id:'raeume',      label:'Räume' },
    { id:'dozenten',    label:'Dozenten-Themen' },
  ];
  const t = bkrfqgState.aktuellerTab;
  const btn = tab => `
    <button class="mod-side-btn ${t===tab.id?'active':''}" data-btab="${tab.id}" onclick="bkrfqgSetTab('${tab.id}')">
      ${bkrfqgIcon(BKRFQG_ICONS[tab.id] || '')}
      <span class="mod-lbl">${tab.label}</span>
    </button>`;
  view.innerHTML = `
    <div class="mod-shell">
      <aside class="mod-side"><nav>
        <div class="mod-side-label">BKrFQG</div>
        ${primary.map(btn).join('')}
        <div class="mod-side-divider"></div>
        <div class="mod-side-label" style="color:var(--grau);opacity:.7">Einstellungen</div>
        ${config.map(btn).join('')}
      </nav></aside>
      <div class="mod-main" id="bkrfqg-content"></div>
    </div>`;
  bkrfqgRenderTab(t);
}
function bkrfqgSetTab(tab) {
  bkrfqgState.aktuellerTab = tab;
  document.querySelectorAll('#view-bkrfqg .mod-side-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.btab === tab));
  bkrfqgRenderTab(tab);
}
function bkrfqgRenderTab(tab) {
  const el = document.getElementById('bkrfqg-content');
  if (!el) return;
  ({ dashboard:bkrfqgDashboard, standorte:bkrfqgStandorte, fahrlehrer:bkrfqgFahrlehrer,
     dozenten:bkrfqgDozenten, raeume:bkrfqgRaeume, kursplaene:bkrfqgKursplaene, kursmeldung:bkrfqgKursmeldung,
     antrag:bkrfqgAntrag, dokumente:bkrfqgDokumente }[tab] || bkrfqgDashboard)(el);
}

// Einheitlicher Seitenkopf – folgt App-Muster (.toolbar mit Buttons rechts)
function bKopf(titel, sub, aktionHtml) {
  return `<div class="toolbar" style="margin-bottom:16px;justify-content:space-between">
    <div style="display:flex;flex-direction:column;gap:2px">
      <div style="font-size:16px;font-weight:700;color:var(--dunkel)">${titel}</div>
      ${sub?`<div style="font-size:12px;color:var(--grau)">${sub}</div>`:''}
    </div>
    <div style="display:flex;gap:8px;align-items:center">${aktionHtml||''}</div>
  </div>`;
}
// Leerer Zustand im App-Stil
function bLeer(icon, titel, text) {
  return `<div class="module-placeholder"><div class="ph-icon">${icon}</div><h3>${titel}</h3><p>${text||''}</p></div>`;
}

// ════════════════════════════════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════════════════════════════════
function bkrfqgDashboard(el) {
  const s = bkrfqgState;
  const anerkannt = s.standorte.filter(x=>x.status==='anerkannt').length;
  const aktiveKurse = s.kursplaene.filter(x=>x.status==='aktiv').length;
  const fristen = [];
  s.standorte.forEach(st => {
    if (st.naechste_ueberpruefung) {
      const t = bTageVon(st.naechste_ueberpruefung);
      if (t!==null && t<180) fristen.push({label:`Behördenprüfung: ${st.name}`, datum:st.naechste_ueberpruefung, t});
    }
  });
  s.fahrlehrer.forEach(f => {
    if (f.frist_afl) {
      const t = Math.ceil((new Date(f.frist_afl,11,31)-new Date())/86400000);
      if (t<365) fristen.push({label:`BKF-Fortbildung: ${f.vorname} ${f.nachname}`, datum:`${f.frist_afl}-12-31`, t});
    }
  });
  fristen.sort((a,b)=>a.t-b.t);

  const kpi = (zahl,titel,sub,farbe) => `
    <div class="card" style="padding:14px 16px;border-left:3px solid ${farbe}">
      <div style="font-size:26px;font-weight:700;color:${farbe};line-height:1">${zahl}</div>
      <div style="font-weight:600;font-size:13px;margin-top:6px;color:var(--dunkel)">${titel}</div>
      <div style="font-size:11px;color:var(--grau);margin-top:2px">${sub}</div>
    </div>`;

  el.innerHTML = `
    ${bKopf('📊 Übersicht', 'Anerkennungen, Fristen und Kurse auf einen Blick')}
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin-bottom:18px">
      ${kpi(s.standorte.length,'Standorte',`${anerkannt} anerkannt`,'var(--rot)')}
      ${kpi(s.fahrlehrer.length,'BKF-Dozenten','aus Personal-Modul','var(--blau)')}
      ${kpi(s.kursplaene.length,'Kurspläne',`${aktiveKurse} aktiv`,'#059669')}
      ${kpi(fristen.filter(f=>f.t<30).length,'Fristen < 30 Tage','dringend','var(--gelb)')}
    </div>

    <div class="card" style="padding:14px 16px;margin-bottom:16px">
      <div class="card-titel" style="margin-bottom:12px">⏰ Fristen & Wiedervorlagen</div>
      ${fristen.length===0
        ? '<div style="color:#059669;font-size:13px;padding:8px 0">✓ Keine dringenden Fristen in den nächsten 6 Monaten</div>'
        : `<table class="ma-table"><thead><tr><th>Frist</th><th>Datum</th><th>Status</th></tr></thead>
           <tbody>${fristen.slice(0,10).map(f=>`<tr>
             <td>${f.label}</td><td>${bfmtD(f.datum)}</td><td>${bAmpel(f.t)}</td></tr>`).join('')}</tbody></table>`}
    </div>

    <div class="card" style="padding:14px 16px">
      <div class="card-titel" style="margin-bottom:12px">📍 Standorte & Anerkennungsstatus</div>
      ${s.standorte.length===0
        ? '<div style="color:var(--grau);font-size:13px;padding:8px 0">Noch keine Standorte angelegt.</div>'
        : `<table class="ma-table"><thead><tr>
             <th>Standort</th><th>Behörde</th><th>Aktenzeichen</th><th>Status</th><th>Nächste Prüfung</th>
           </tr></thead><tbody>${s.standorte.map(st=>`<tr>
             <td style="font-weight:600;color:var(--dunkel)">${st.name}</td>
             <td>${st.behoerde_name||'–'}</td>
             <td style="font-family:monospace;font-size:12px">${st.aktenzeichen||'–'}</td>
             <td>${bBadge(st.status)}</td>
             <td>${st.naechste_ueberpruefung?bAmpel(bTageVon(st.naechste_ueberpruefung)):'–'}</td>
           </tr>`).join('')}</tbody></table>`}
    </div>`;
}

// ════════════════════════════════════════════════════════════════════
// STANDORTE
// ════════════════════════════════════════════════════════════════════
function bkrfqgStandorte(el) {
  el.innerHTML = bKopf('📍 Standorte & Behörden', 'Jeder Standort hat eine eigene zuständige Behörde',
    '<button class="btn btn-primary btn-sm" onclick="bkrfqgStandortNeu()">＋ Standort</button>')
    + '<div id="bkrfqg-standorte-liste"></div>' + bkrfqgStandortModalHTML();
  bkrfqgRenderStandortListe();
}
function bkrfqgRenderStandortListe() {
  const el = document.getElementById('bkrfqg-standorte-liste');
  if (!el) return;
  if (!bkrfqgState.standorte.length) {
    el.innerHTML = bLeer('📍','Keine Standorte','Noch keine Standorte angelegt. Klicke auf „＋ Standort".');
    return;
  }
  el.innerHTML = bkrfqgState.standorte.map(s => `
    <div class="card" style="padding:14px 16px;margin-bottom:12px;border-left:3px solid ${s.status==='anerkannt'?'#059669':'var(--gelb)'}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid var(--border)">
        <div>
          <div style="font-weight:700;font-size:15px;color:var(--dunkel);display:flex;align-items:center;gap:8px">${s.name} ${bBadge(s.status)}</div>
          <div style="font-size:12px;color:var(--grau);margin-top:3px">${s.strasse||''}, ${s.plz||''} ${s.ort||''}</div>
          ${s.aktenzeichen?`<div style="font-size:11px;color:var(--grau);font-family:monospace;margin-top:2px">AZ: ${s.aktenzeichen}</div>`:''}
        </div>
        <div class="tbl-actions">
          <button class="btn btn-outline btn-sm" onclick="bkrfqgStandortEdit('${s.id}')">✏️ Bearbeiten</button>
          <button class="btn btn-sm" style="background:#f3e8ff;color:#6A1B9A;border-color:#e9d5ff" onclick="bkrfqgStandortEdit('${s.id}')">✨ Bescheid</button>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:13px">
        <div>
          <div style="font-size:10px;font-weight:700;color:var(--blau);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Zuständige Behörde</div>
          <div style="color:var(--dunkel)">${s.behoerde_name||'<span style="color:var(--grau)">nicht eingetragen</span>'}</div>
          ${s.behoerde_abteilung?`<div style="color:var(--grau)">${s.behoerde_abteilung}</div>`:''}
          ${s.behoerde_email?`<div><a href="mailto:${s.behoerde_email}">${s.behoerde_email}</a></div>`:''}
          ${s.behoerde_tel?`<div style="color:var(--grau)">📞 ${s.behoerde_tel}</div>`:''}
        </div>
        <div>
          <div style="font-size:10px;font-weight:700;color:var(--rot);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Anerkennung</div>
          <div style="color:var(--dunkel)">Umfang: ${(s.anerkennungsumfang||[]).join(', ')||'–'}</div>
          <div style="color:var(--dunkel)">Anerkannt: ${bfmtD(s.anerkennungsdatum)}</div>
          <div style="color:var(--dunkel)">Nächste Prüfung: ${s.naechste_ueberpruefung?bAmpel(bTageVon(s.naechste_ueberpruefung)):'–'}</div>
        </div>
      </div>
    </div>`).join('');
}

function bkrfqgStandortModalHTML() {
  return `
  <div class="modal-overlay" id="bkrfqg-standort-modal">
    <div class="modal" style="width:760px">
      <div class="modal-header">
        <h3 id="bkrfqg-s-modal-titel">Neuer Standort</h3>
        <div style="display:flex;gap:8px;align-items:center">
          <label class="btn btn-sm" style="background:#f3e8ff;color:#6A1B9A;border-color:#e9d5ff;cursor:pointer;margin:0">
            ✨ Bescheid scannen
            <input type="file" id="bkrfqg-scan-input" accept=".pdf,.jpg,.jpeg,.png" style="display:none" onchange="bkrfqgScannenModal(this)">
          </label>
          <button class="close-btn" onclick="bkrfqgCloseModal('bkrfqg-standort-modal')">×</button>
        </div>
      </div>
      <div class="modal-body">
        <input type="hidden" id="bs-id">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
          <div>
            <div class="fsec" style="color:var(--rot)">🏢 Ausbildungsstätte</div>
            <div class="frow"><label>Bezeichnung</label><input id="bs-name" placeholder="z.B. Lingen Hauptstelle"></div>
            <div class="frow"><label>Straße</label><input id="bs-strasse"></div>
            <div class="fgrid">
              <div class="frow"><label>PLZ</label><input id="bs-plz"></div>
              <div class="frow"><label>Ort</label><input id="bs-ort"></div>
            </div>
            <div class="frow"><label>Anerkennungsumfang</label>
              <div class="chip-grid" style="margin-top:4px">
                <label class="chip"><input type="checkbox" id="bs-au-g">BGQ Güterkraftverkehr</label>
                <label class="chip"><input type="checkbox" id="bs-au-p">BGQ Personenverkehr</label>
                <label class="chip"><input type="checkbox" id="bs-au-w">BKF-Weiterbildung</label>
              </div>
            </div>
            <div class="frow"><label>Status</label>
              <select id="bs-status">
                <option value="in_vorbereitung">In Vorbereitung</option>
                <option value="beantragt">Beantragt</option>
                <option value="anerkannt">Anerkannt</option>
                <option value="widerrufen">Widerrufen</option>
              </select>
            </div>
            <div class="fgrid">
              <div class="frow"><label>Anerkennungsdatum</label><input type="date" id="bs-adatum"></div>
              <div class="frow"><label>Aktenzeichen</label><input id="bs-az"></div>
            </div>
            <div class="frow"><label>Nächste Behördenprüfung</label><input type="date" id="bs-pruefung"></div>
          </div>
          <div>
            <div class="fsec">🏛️ Zuständige Behörde</div>
            <div class="frow"><label>Behörde Name</label><input id="bs-bname" placeholder="z.B. Landkreis Emsland"></div>
            <div class="frow"><label>Abteilung</label><input id="bs-babt" placeholder="z.B. Straßenverkehrsamt"></div>
            <div class="frow"><label>Ansprechpartner</label><input id="bs-bap"></div>
            <div class="frow"><label>Straße</label><input id="bs-bstr"></div>
            <div class="fgrid">
              <div class="frow"><label>PLZ</label><input id="bs-bplz"></div>
              <div class="frow"><label>Ort</label><input id="bs-bort"></div>
            </div>
            <div class="frow"><label>E-Mail Behörde</label><input type="email" id="bs-bemail" placeholder="amt@landkreis.de"></div>
            <div class="frow"><label>Telefon Behörde</label><input id="bs-btel"></div>
            <div class="frow"><label>Notizen</label><textarea id="bs-notizen" rows="3"></textarea></div>
          </div>
        </div>
        <div id="bkrfqg-scan-info"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="bkrfqgCloseModal('bkrfqg-standort-modal')">Abbrechen</button>
        <button class="btn btn-primary" onclick="bkrfqgStandortSpeichern()">💾 Speichern</button>
      </div>
    </div>
  </div>`;
}
// Definiert .chip und .chip-grid im Design der App. Wird beim ersten
// Aufruf einmalig in den <head> gehaengt - die Klassen kommen an
// mehreren Stellen im Modul vor.
function bkrfqgChipStil(){
  if (document.getElementById('bkrfqg-chip-stil')) return;
  const s = document.createElement('style');
  s.id = 'bkrfqg-chip-stil';
  s.textContent = `
    .chip-grid{display:flex;flex-direction:column;gap:2px;align-items:flex-start}
    .chip{
      display:flex !important;align-items:center;
      padding:5px 0;border:0;background:none;
      font-size:13px;font-weight:500;color:var(--ink);
      cursor:pointer;user-select:none;line-height:1.3;
    }
    .chip input[type=checkbox]{
      -webkit-appearance:checkbox;appearance:checkbox;
      width:15px !important;height:15px !important;
      min-width:15px !important;max-width:15px !important;
      padding:0 !important;border:0 !important;box-shadow:none !important;
      margin:0 10px 0 0 !important;
      flex:0 0 auto !important;display:inline-block !important;
      accent-color:var(--blau);cursor:pointer;
    }
    .chip:has(input:checked){color:var(--blau);font-weight:600}
  `;
  document.head.appendChild(s);
}

function bkrfqgCloseModal(id){ document.getElementById(id).classList.remove('open'); }
function bkrfqgOpenModal(id){ bkrfqgChipStil(); document.getElementById(id).classList.add('open'); }

function bkrfqgStandortNeu() {
  ['bs-id','bs-name','bs-strasse','bs-plz','bs-ort','bs-az','bs-notizen','bs-bname','bs-babt','bs-bap','bs-bstr','bs-bplz','bs-bort','bs-bemail','bs-btel','bs-adatum','bs-pruefung'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  ['bs-au-g','bs-au-p','bs-au-w'].forEach(id=>{const e=document.getElementById(id);if(e)e.checked=false;});
  document.getElementById('bs-status').value='in_vorbereitung';
  document.getElementById('bkrfqg-s-modal-titel').textContent='Neuer Standort';
  document.getElementById('bkrfqg-scan-info').innerHTML='';
  bkrfqgOpenModal('bkrfqg-standort-modal');
}
function bkrfqgStandortEdit(id) {
  const s = bkrfqgState.standorte.find(x=>x.id===id); if(!s)return;
  const g=(k,v)=>{const e=document.getElementById(k);if(e)e.value=v||'';};
  g('bs-id',s.id); g('bs-name',s.name); g('bs-strasse',s.strasse); g('bs-plz',s.plz); g('bs-ort',s.ort);
  g('bs-az',s.aktenzeichen); g('bs-notizen',s.notizen); g('bs-bname',s.behoerde_name); g('bs-babt',s.behoerde_abteilung);
  g('bs-bap',s.behoerde_ansprechpartner); g('bs-bstr',s.behoerde_strasse); g('bs-bplz',s.behoerde_plz);
  g('bs-bort',s.behoerde_ort); g('bs-bemail',s.behoerde_email); g('bs-btel',s.behoerde_tel);
  g('bs-adatum',(s.anerkennungsdatum||'').split('T')[0]); g('bs-pruefung',(s.naechste_ueberpruefung||'').split('T')[0]);
  document.getElementById('bs-status').value=s.status||'in_vorbereitung';
  const au=s.anerkennungsumfang||[];
  document.getElementById('bs-au-g').checked=au.includes('BGQ_Gueter');
  document.getElementById('bs-au-p').checked=au.includes('BGQ_Person');
  document.getElementById('bs-au-w').checked=au.includes('Weiterbildung');
  document.getElementById('bkrfqg-s-modal-titel').textContent='Standort bearbeiten';
  document.getElementById('bkrfqg-scan-info').innerHTML='';
  bkrfqgOpenModal('bkrfqg-standort-modal');
}
async function bkrfqgScannenModal(input) {
  const file=input.files[0]; if(!file)return;
  let mime=file.type;
  if(!mime||mime==='application/octet-stream'){const ext=file.name.split('.').pop().toLowerCase();mime={'pdf':'application/pdf','jpg':'image/jpeg','jpeg':'image/jpeg','png':'image/png'}[ext]||'image/jpeg';}
  toast('KI liest Bescheid aus …','',15000);
  try {
    const b64=await bkrfqgBase64(file);
    const result=await bkrfqgKI('bescheid_auslesen',{bild_base64:b64,mime_type:mime});
    const d=result.daten;
    const set=(k,v)=>{if(v){const e=document.getElementById(k);if(e)e.value=v;}};
    set('bs-az',d.aktenzeichen); set('bs-bname',d.behoerde_name); set('bs-babt',d.behoerde_abteilung);
    set('bs-bap',d.behoerde_ansprechpartner); set('bs-bstr',d.behoerde_strasse); set('bs-bplz',d.behoerde_plz);
    set('bs-bort',d.behoerde_ort); set('bs-bemail',d.behoerde_email); set('bs-btel',d.behoerde_tel);
    set('bs-adatum',d.anerkennungsdatum); set('bs-pruefung',d.naechste_ueberpruefung); set('bs-notizen',d.notizen);
    if(d.status)document.getElementById('bs-status').value=d.status;
    if(d.anerkennungsumfang){
      document.getElementById('bs-au-g').checked=d.anerkennungsumfang.includes('BGQ_Gueter');
      document.getElementById('bs-au-p').checked=d.anerkennungsumfang.includes('BGQ_Person');
      document.getElementById('bs-au-w').checked=d.anerkennungsumfang.includes('Weiterbildung');
    }
    let info='<div class="card" style="background:#ecfdf5;border-color:#a7f3d0;padding:10px 12px;font-size:12px;margin-top:10px;color:#065f46">';
    info+='<strong>✓ KI hat ausgelesen:</strong><br>';
    if(d.genehmigte_raeume?.length)info+=`• ${d.genehmigte_raeume.length} Räume: ${d.genehmigte_raeume.map(r=>r.bezeichnung).join(', ')}<br>`;
    if(d.genehmigte_fahrlehrer?.length)info+=`• ${d.genehmigte_fahrlehrer.length} Fahrlehrer: ${d.genehmigte_fahrlehrer.map(f=>f.name).join(', ')}<br>`;
    info+='</div>';
    document.getElementById('bkrfqg-scan-info').innerHTML=info;
    toast('Bescheid ausgelesen ✓');
  } catch(e){ toast('KI-Fehler: '+e.message,'err'); }
  input.value='';
}
async function bkrfqgStandortSpeichern() {
  const id=document.getElementById('bs-id').value;
  const umfang=[];
  if(document.getElementById('bs-au-g').checked)umfang.push('BGQ_Gueter');
  if(document.getElementById('bs-au-p').checked)umfang.push('BGQ_Person');
  if(document.getElementById('bs-au-w').checked)umfang.push('Weiterbildung');
  const v=id=>document.getElementById(id).value||null;
  const payload={
    name:document.getElementById('bs-name').value, strasse:v('bs-strasse'), plz:v('bs-plz'), ort:v('bs-ort'),
    status:document.getElementById('bs-status').value, aktenzeichen:v('bs-az'), notizen:v('bs-notizen'),
    behoerde_name:v('bs-bname'), behoerde_abteilung:v('bs-babt'), behoerde_ansprechpartner:v('bs-bap'),
    behoerde_strasse:v('bs-bstr'), behoerde_plz:v('bs-bplz'), behoerde_ort:v('bs-bort'),
    behoerde_email:v('bs-bemail'), behoerde_tel:v('bs-btel'),
    anerkennungsdatum:v('bs-adatum'), naechste_ueberpruefung:v('bs-pruefung'), anerkennungsumfang:umfang,
  };
  try {
    if(id){await bkrfqgUpdate('bkrfqg_standorte',id,payload);toast('Standort aktualisiert ✓');}
    else{await bkrfqgInsert('bkrfqg_standorte',payload);toast('Standort angelegt ✓');}
    bkrfqgCloseModal('bkrfqg-standort-modal');
    bkrfqgState.loaded=false; await bkrfqgLadeAlles();
    bkrfqgStandorte(document.getElementById('bkrfqg-content'));
  } catch(e){toast('Fehler: '+e.message,'err');}
}

// ════════════════════════════════════════════════════════════════════
// FAHRLEHRER
// ════════════════════════════════════════════════════════════════════
function bkrfqgFahrlehrer(el) {
  const fl = bkrfqgState.fahrlehrer;
  el.innerHTML = bKopf('👤 BKF-Dozenten', `${fl.length} Dozenten aus dem Personal-Modul (§ 7 BKrFQV)`,
    '<button class="btn btn-outline btn-sm" onclick="showView(\'personal\')">→ Personal-Modul</button>')
    + `<div class="card" style="background:#eff6ff;border-color:#bfdbfe;padding:12px 16px;font-size:13px;margin-bottom:16px;color:#1e40af">
        💡 BKF-Dozenten werden automatisch aus dem Personal-Modul gezogen (Qualifikation „BKF-Dozent" aktiviert). Fortbildungsfristen stammen aus den dort hinterlegten Urkunden.
      </div>`
    + (fl.length===0
      ? bLeer('👤','Keine BKF-Dozenten','Aktiviere im Personal-Modul bei Fahrlehrern die Qualifikation „BKF-Dozent".')
      : `<div class="card" style="padding:0;overflow:hidden">
          <table class="ma-table"><thead><tr>
            <th>Name</th><th>Bereich</th><th>BKF-Fortbildung fällig</th><th>Status</th><th></th>
          </tr></thead><tbody>${fl.map(f=>{
            const t = f.frist_afl ? Math.ceil((new Date(f.frist_afl,11,31)-new Date())/86400000) : null;
            return `<tr>
              <td><div class="ma-name-cell">
                <span class="ma-avatar">${bInitialen(f.vorname,f.nachname)}</span>
                <div><div class="ma-name">${f.vorname} ${f.nachname}</div></div>
              </div></td>
              <td>${f.bereich||'–'}</td>
              <td>${f.frist_afl?`31.12.${f.frist_afl}`:'–'}</td>
              <td>${t!==null?bAmpel(t):'<span style="color:var(--grau)">–</span>'}</td>
              <td class="tbl-actions"><button class="btn btn-outline btn-sm" onclick="bkrfqgOeffneMitarbeiter('${f.id}')">→ Akte</button></td>
            </tr>`;
          }).join('')}</tbody></table>
        </div>`);
}
async function bkrfqgOeffneMitarbeiter(id) {
  showView('personal');
  await new Promise(r=>setTimeout(r,500));
  if(window.oeffneMaAkte)window.oeffneMaAkte(id);
}

// ════════════════════════════════════════════════════════════════════
// DOZENTEN-THEMEN (Degner-Bänder-Zuweisung + BKrFQV-Themenplan BGQ)
// ════════════════════════════════════════════════════════════════════
let bkrfqgDozKurstyp = 'bgq_g';
let bkrfqgKPSelected = null;   // geöffneter Kursplan (id)
let bkrfqgKPKurstage  = [];    // geladene Kurstage für Detail-Ansicht
let bkrfqgKPTeilnehmer = [];   // Teilnehmer des geöffneten Kursplans
let bkrfqgTnSuche      = [];   // Trefferliste der Teilnehmersuche
const bkrfqgExpandedBands = new Set();

function bkrfqgDozenten(el) {
  const fl = bkrfqgState.fahrlehrer;
  const meta = BKRFQV_KURSE_META[bkrfqgDozKurstyp] || { label: '', std: 0, typ: '' };
  const fmtH = min => {
    if (!min) return '—';
    return min % 60 === 0 ? `${min/60}h` : `${Math.floor(min/60)}h ${min%60}min`;
  };

  el.innerHTML = bKopf('🎯 Dozenten-Themen',
    `Themenplan BKrFQV Anlage 1 · ${meta.label} · ${meta.std} Std.`,
    `<div style="display:flex;gap:4px;flex-wrap:wrap;row-gap:4px">
      ${Object.entries(BKRFQV_KURSE_META).map(([id,m]) => {
        const aktiv = bkrfqgDozKurstyp === id;
        const col = m.typ==='QE'?'#059669':m.typ==='Umst'?'#d97706':m.typ==='WB'?'#7c3aed':m.typ==='Kombi'?'#6A1B9A':'var(--blau)';
        const st = aktiv
          ? `background:${col};border-color:${col};color:#fff`
          : `border-color:${col};color:${col};background:#fff`;
        return `<button class="btn btn-sm" onclick="bkrfqgDozSetTyp('${id}')"
          title="${m.label} · ${m.std} Std." style="${st}">${m.icon} ${m.label}</button>`;
      }).join('')}
    </div>`);

  const baender = BKRFQV_THEMEN[bkrfqgDozKurstyp] || [];
  const hatBand = (maId, bandNr) => bkrfqgState.dozentBaender.some(
    d => d.mitarbeiter_id===maId && d.band_nr===bandNr && d.kurstyp===bkrfqgDozKurstyp);
  const gesamtMin = baender.reduce((s,b) => s + (b.dauer_min||0), 0);

  // ── 1. Dozenten-Matrix (nur wenn BKF-Dozenten vorhanden) ─────────
  if (fl.length) {
    el.innerHTML += `
    <div class="card" style="padding:0;overflow-x:auto;margin-bottom:8px">
      <table class="ma-table" style="min-width:800px">
        <thead><tr>
          <th style="position:sticky;left:0;background:var(--dunkel);z-index:1">Dozent</th>
          ${baender.map(b=>`<th style="text-align:center;font-size:10px;line-height:1.4"
              title="${b.titel} · ${(b.bkrfqv||[]).join(', ')} · ${fmtH(b.dauer_min)}">
            <div style="font-size:11px">${b.nr}</div>
            <div style="color:rgba(255,255,255,.55);font-weight:400;font-size:10px">${fmtH(b.dauer_min)}</div>
          </th>`).join('')}
          <th style="text-align:center">Σ</th>
        </tr></thead>
        <tbody>
          ${fl.map(f=>{
            const zugewiesen = baender.filter(b=>hatBand(f.id,b.nr));
            const sumMin = zugewiesen.reduce((s,b)=>s+(b.dauer_min||0),0);
            return `<tr>
              <td style="position:sticky;left:0;background:#fff;font-weight:600;color:var(--dunkel);white-space:nowrap">
                <div class="ma-name-cell">
                  <span class="ma-avatar" style="width:26px;height:26px;font-size:10px">${bInitialen(f.vorname,f.nachname)}</span>
                  <span>${f.vorname} ${f.nachname}</span>
                </div>
              </td>
              ${baender.map(b=>{
                const on = hatBand(f.id,b.nr);
                return `<td style="text-align:center;padding:4px">
                  <button onclick="bkrfqgToggleBand('${f.id}','${b.nr}')"
                    title="${b.titel} · ${fmtH(b.dauer_min)}"
                    style="width:30px;height:30px;border-radius:6px;border:1.5px solid ${on?'#6A1B9A':'var(--border)'};
                      background:${on?'#6A1B9A':'#fff'};color:${on?'#fff':'var(--grau)'};cursor:pointer;
                      font-size:13px;font-weight:700;transition:all .12s">${on?'✓':''}
                  </button>
                </td>`;
              }).join('')}
              <td style="text-align:center;font-weight:700;color:${sumMin>0?'#6A1B9A':'var(--grau)'}">
                ${sumMin>0?fmtH(sumMin):'–'}
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    <div class="card" style="background:#eff6ff;border-color:#bfdbfe;padding:10px 14px;font-size:12px;color:#1e40af;margin-bottom:16px">
      💡 Diese Zuweisung nutzt der <strong>KI-Kursplan-Generator</strong>: Jedes Band wird bevorzugt dem spezialisierten Dozenten zugewiesen.
    </div>`;
  } else {
    el.innerHTML += `<div class="card" style="background:#fff8e1;border-color:#ffe082;padding:12px 16px;font-size:13px;color:#5f4a00;margin-bottom:16px">
      ⚠️ Noch keine BKF-Dozenten konfiguriert – im <strong>Personal-Modul</strong> bei Fahrlehrern die Qualifikation <strong>„BKF-Dozent"</strong> aktivieren. Danach erscheint hier die Zuweisungs-Matrix.
    </div>`;
  }

  // ── 2. Themenplan (immer sichtbar) ────────────────────────────────
  const istKombi = bkrfqgDozKurstyp === 'kombi_gp';
  const phaseMeta = {
    gemeinsam: { label:'① Gemeinsamer Block – beide Gruppen zusammen', col:'#6b7280', bg:'#f3f4f6' },
    gueter:    { label:'② Spezialblock Güterkraftverkehr', col:'#b45309', bg:'#fffbeb' },
    person:    { label:'③ Spezialblock Personenverkehr', col:'#1e40af', bg:'#eff6ff' },
  };
  const phaseSum = ph => baender.filter(b=>b.phase===ph).reduce((s,b)=>s+(b.dauer_min||0),0);

  el.innerHTML += `
    <div style="display:flex;justify-content:space-between;align-items:center;margin:0 0 10px">
      <h3 style="margin:0;font-size:14px;font-weight:700;color:var(--dunkel)">📋 Themenplan · ${meta.label} · ${fmtH(gesamtMin)} gesamt</h3>
      <span style="font-size:11px;color:var(--grau)">▸ Band anklicken zum Aufklappen</span>
    </div>
    ${istKombi ? `<div class="card" style="background:#faf5ff;border-color:#e9d5ff;padding:10px 14px;font-size:12px;color:#6A1B9A;margin-bottom:12px;line-height:1.6">
      🚛🚌 <strong>Kombilehrgang:</strong> Der gemeinsame Block (${fmtH(phaseSum('gemeinsam'))}) wird für beide Gruppen zusammen unterrichtet. Danach teilen sich die Gruppen in die Spezialblöcke Güter (${fmtH(phaseSum('gueter'))}) bzw. Person (${fmtH(phaseSum('person'))}).<br>
      → <strong>Je Qualifikation: ${fmtH(phaseSum('gemeinsam') + phaseSum('gueter'))} (130 Std.)</strong> ohne fahrpraktische Übungen.
    </div>` : ''}
    ${baender.map((b, idx) => {
      const expanded = bkrfqgExpandedBands.has(b.nr);
      const dozentenDesB = fl.filter(f=>hatBand(f.id,b.nr));
      const subSum = b.unterthemen.reduce((s,u)=>s+(u.dauer_min||0),0);
      // Phasen-Trenner beim Kombi (wenn neue Phase beginnt)
      let phaseHeader = '';
      if (istKombi && b.phase && (idx===0 || baender[idx-1].phase !== b.phase)) {
        const pm = phaseMeta[b.phase];
        phaseHeader = `<div style="margin:14px 0 8px;padding:7px 12px;background:${pm.bg};border-left:4px solid ${pm.col};border-radius:0 6px 6px 0;display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:12px;font-weight:700;color:${pm.col}">${pm.label}</span>
          <span style="font-size:11px;font-weight:600;color:${pm.col}">${fmtH(phaseSum(b.phase))}</span>
        </div>`;
      }
      return phaseHeader + `
      <div style="border:1px solid var(--border);border-radius:8px;margin-bottom:6px;overflow:hidden">
        <div onclick="bkrfqgToggleBkrBand('${b.nr}')"
             style="display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;background:var(--faint);user-select:none">
          <span style="font-weight:800;color:#6A1B9A;min-width:48px;font-size:13px">${b.nr}</span>
          <span style="flex:1;font-size:13px;font-weight:600;color:var(--dunkel)">${b.titel}</span>
          <span style="font-size:10px;color:var(--grau);white-space:nowrap">${(b.bkrfqv||[]).join(' · ')}</span>
          <span style="font-size:12px;font-weight:700;color:var(--dunkel);min-width:44px;text-align:right">${fmtH(b.dauer_min)}</span>
          ${dozentenDesB.map(f=>`<span style="background:#6A1B9A;color:#fff;border-radius:999px;padding:2px 8px;font-size:10px;white-space:nowrap">${bInitialen(f.vorname,f.nachname)}</span>`).join('')}
          <span style="color:var(--grau);font-size:11px">${expanded?'▾':'▸'}</span>
        </div>
        ${expanded ? `
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead>
            <tr style="background:#f8f8fb">
              <th style="padding:5px 14px;text-align:left;font-weight:600;color:var(--grau);letter-spacing:.04em;font-size:10px;width:60px">NR.</th>
              <th style="padding:5px 8px;text-align:left;font-weight:600;color:var(--grau);letter-spacing:.04em;font-size:10px">THEMA</th>
              <th style="padding:5px 8px;text-align:left;font-weight:600;color:var(--grau);letter-spacing:.04em;font-size:10px;width:90px">KB</th>
              <th style="padding:5px 8px;text-align:left;font-weight:600;color:var(--grau);letter-spacing:.04em;font-size:10px;width:160px">DOZENT (abweichend)</th>
              <th style="padding:5px 14px;text-align:right;font-weight:600;color:var(--grau);letter-spacing:.04em;font-size:10px;width:55px">MIN</th>
            </tr>
          </thead>
          <tbody>
            ${b.unterthemen.map((u,i)=>{
              const abwId = bkrfqgUtDozent(b.nr, u.id);
              const opts = `<option value="">↳ Hauptdozent</option>` +
                fl.map(f=>`<option value="${f.id}"${abwId===f.id?' selected':''}>${f.vorname} ${f.nachname}</option>`).join('');
              return `
            <tr style="border-top:1px solid var(--border);background:${abwId?'#fef9e7':(i%2?'#fafafa':'#fff')}">
              <td style="padding:6px 14px;color:#6A1B9A;font-weight:700">${u.id}</td>
              <td style="padding:6px 8px;color:var(--dunkel)">${u.titel}</td>
              <td style="padding:6px 8px;color:var(--grau);font-size:10px">${u.bkrfqv||'—'}</td>
              <td style="padding:4px 8px">
                <select onchange="bkrfqgSetUtDozent('${b.nr}','${u.id}',this.value)"
                  style="width:100%;font-size:11px;padding:3px 5px;border:1px solid ${abwId?'#e0a800':'var(--border)'};border-radius:5px;background:${abwId?'#fffbe6':'#fff'};color:${abwId?'#8a6d00':'var(--grau)'};cursor:pointer">
                  ${opts}
                </select>
              </td>
              <td style="padding:6px 14px;text-align:right;font-weight:600;color:${u.dauer_min?'var(--dunkel)':'var(--grau)'}">
                ${u.dauer_min||'—'}
              </td>
            </tr>`;
            }).join('')}
            <tr style="border-top:2px solid #6A1B9A;background:#f3e8ff">
              <td colspan="4" style="padding:6px 14px;font-weight:700;font-size:11px;color:#6A1B9A">Σ ${b.nr}</td>
              <td style="padding:6px 14px;text-align:right;font-weight:800;color:#6A1B9A">${subSum} min = ${fmtH(subSum)}</td>
            </tr>
          </tbody>
        </table>` : ''}
      </div>`;
    }).join('')}
    <div style="text-align:right;padding:6px 4px;font-size:11px;color:var(--grau)">
      ${istKombi
        ? `Kombi gesamt: <strong style="color:var(--dunkel)">${fmtH(gesamtMin)}</strong> · je Qualifikation: <strong style="color:#6A1B9A">${fmtH(phaseSum('gemeinsam')+phaseSum('gueter'))} (130 Std.)</strong>`
        : `Gesamt ${meta.label}: <strong style="color:var(--dunkel)">${gesamtMin} min = ${fmtH(gesamtMin)}</strong>`}
    </div>`;
}


function bkrfqgToggleBkrBand(nr) {
  if (bkrfqgExpandedBands.has(nr)) bkrfqgExpandedBands.delete(nr);
  else bkrfqgExpandedBands.add(nr);
  bkrfqgDozenten(document.getElementById('bkrfqg-content'));
}

function bkrfqgDozSetTyp(typ) {
  bkrfqgDozKurstyp = typ;
  bkrfqgDozenten(document.getElementById('bkrfqg-content'));
}

async function bkrfqgToggleBand(maId, bandNr) {
  const vorhanden = bkrfqgState.dozentBaender.find(
    d => d.mitarbeiter_id===maId && d.band_nr===bandNr && d.kurstyp===bkrfqgDozKurstyp);
  try {
    if (vorhanden) {
      await bkrfqgDelete('bkrfqg_dozent_baender', vorhanden.id);
      bkrfqgState.dozentBaender = bkrfqgState.dozentBaender.filter(d=>d.id!==vorhanden.id);
    } else {
      const neu = await bkrfqgInsert('bkrfqg_dozent_baender', {
        mitarbeiter_id: maId, band_nr: bandNr, kurstyp: bkrfqgDozKurstyp, niveau: 'kann'
      });
      bkrfqgState.dozentBaender.push(neu[0]);
    }
    bkrfqgDozenten(document.getElementById('bkrfqg-content'));
  } catch(e) { toast('Fehler: '+e.message, 'err'); }
}

// ── Abweichende Dozenten auf Unterthema-Ebene ──────────────────────────
// Liefert die mitarbeiter_id eines abweichenden Dozenten für ein Unterthema
// (oder null → Hauptdozent des Bandes gilt)
function bkrfqgUtDozent(bandNr, utId) {
  const e = (bkrfqgState.dozentUnterthemen||[]).find(
    d => d.band_nr===bandNr && d.unterthema_id===utId && d.kurstyp===bkrfqgDozKurstyp);
  return e ? e.mitarbeiter_id : null;
}

async function bkrfqgSetUtDozent(bandNr, utId, maId) {
  const vorhanden = (bkrfqgState.dozentUnterthemen||[]).find(
    d => d.band_nr===bandNr && d.unterthema_id===utId && d.kurstyp===bkrfqgDozKurstyp);
  try {
    if (!maId) {
      // Leer gewählt → abweichende Zuweisung entfernen (Hauptdozent gilt wieder)
      if (vorhanden) {
        await bkrfqgDelete('bkrfqg_dozent_unterthemen', vorhanden.id);
        bkrfqgState.dozentUnterthemen = bkrfqgState.dozentUnterthemen.filter(d=>d.id!==vorhanden.id);
      }
    } else if (vorhanden) {
      // Bestehende Zuweisung auf neuen Dozenten ändern
      await bkrfqgUpdate('bkrfqg_dozent_unterthemen', vorhanden.id, { mitarbeiter_id: maId });
      vorhanden.mitarbeiter_id = maId;
    } else {
      // Neue abweichende Zuweisung
      const neu = await bkrfqgInsert('bkrfqg_dozent_unterthemen', {
        band_nr: bandNr, unterthema_id: utId, mitarbeiter_id: maId, kurstyp: bkrfqgDozKurstyp
      });
      bkrfqgState.dozentUnterthemen.push(neu[0]);
    }
    bkrfqgDozenten(document.getElementById('bkrfqg-content'));
  } catch(e) { toast('Fehler: '+e.message, 'err'); }
}
function bkrfqgRaeume(el) {
  const gruppen = {};
  bkrfqgState.raeume.forEach(r => {
    const key = (r.bkrfqg_standorte&&r.bkrfqg_standorte.name)||'Ohne Standort';
    if(!gruppen[key]) gruppen[key]={raeume:[],sid:r.standort_id};
    gruppen[key].raeume.push(r);
  });
  el.innerHTML = bKopf('🏫 Unterrichtsräume', '§ 9 Abs. 3 BKrFQG – nur genehmigte Räume nutzbar',
    '<button class="btn btn-primary btn-sm" onclick="bkrfqgRaumNeu()">＋ Raum</button>')
    + `<div class="card" style="background:#fffbeb;border-color:#fde68a;padding:10px 14px;font-size:12px;margin-bottom:16px;color:#92400e">
        ⚠️ Präsenzunterricht darf nur in den im Anerkennungsbescheid aufgeführten Räumen stattfinden.
      </div>`
    + (Object.keys(gruppen).length===0
      ? bLeer('🏫','Keine Räume','Noch keine Unterrichtsräume angelegt.')
      : Object.entries(gruppen).map(([standort,g])=>`
        <div class="card" style="padding:0;overflow:hidden;margin-bottom:12px">
          <div style="background:var(--hell);padding:12px 16px;font-weight:600;font-size:13px;color:var(--dunkel);display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border)">
            <span>📍 ${standort} <span style="color:var(--grau);font-weight:400">· ${g.raeume.length} Räume</span></span>
            <button class="btn btn-outline btn-sm" onclick="bkrfqgRaumNeuFuerStandort('${g.sid}')">＋ Raum</button>
          </div>
          <table class="ma-table"><thead><tr>
            <th>Bezeichnung</th><th>Lage</th><th>m²</th><th>Max.TN</th><th>Eigentum</th><th>Im Bescheid</th><th></th>
          </tr></thead><tbody>${g.raeume.map(r=>`<tr>
            <td style="font-weight:600;color:var(--dunkel)">${r.bezeichnung}</td>
            <td>${r.geschoss||'–'}</td>
            <td>${r.flaeche_qm||'–'}</td>
            <td>${r.max_teilnehmer||'–'}</td>
            <td><span class="qchip">${r.eigentum_oder_miete||'–'}</span></td>
            <td>${r.im_bescheid?bBadge('anerkannt'):'<span style="color:var(--rot);font-size:12px">✗ Nein</span>'}</td>
            <td class="tbl-actions"><button class="btn btn-outline btn-sm" onclick="bkrfqgRaumEdit('${r.id}')">✏️</button></td>
          </tr>`).join('')}</tbody></table>
        </div>`).join(''))
    + bkrfqgRaumModalHTML();
}
function bkrfqgRaumModalHTML() {
  return `
  <div class="modal-overlay" id="bkrfqg-raum-modal">
    <div class="modal" style="width:560px">
      <div class="modal-header">
        <h3 id="bkrfqg-r-titel">Neuer Raum</h3>
        <button class="close-btn" onclick="bkrfqgCloseModal('bkrfqg-raum-modal')">×</button>
      </div>
      <div class="modal-body">
        <input type="hidden" id="br-id">
        <div class="frow"><label>Standort</label>
          <select id="br-standort">${bkrfqgState.standorte.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}</select>
        </div>
        <div class="fgrid">
          <div class="frow"><label>Bezeichnung</label><input id="br-bez" placeholder="z.B. Schulungsraum 1 EG"></div>
          <div class="frow"><label>Lage / Geschoss</label><input id="br-lage" placeholder="z.B. Erdgeschoss"></div>
          <div class="frow"><label>Fläche (m²)</label><input type="number" id="br-flaeche"></div>
          <div class="frow"><label>Max. Teilnehmer</label><input type="number" id="br-maxtn"></div>
          <div class="frow"><label>Eigentumsart</label>
            <select id="br-eigentum"><option>Eigentum</option><option>Miete</option><option>Nutzungsüberlassung</option></select>
          </div>
          <div class="frow"><label>Vermieter</label><input id="br-vermieter"></div>
        </div>
        <div class="chip-grid" style="margin-top:8px">
          <label class="chip"><input type="checkbox" id="br-bescheid">Im Anerkennungsbescheid</label>
          <label class="chip"><input type="checkbox" id="br-aktiv" checked>Aktiv</label>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="bkrfqgCloseModal('bkrfqg-raum-modal')">Abbrechen</button>
        <button class="btn btn-primary" onclick="bkrfqgRaumSpeichern()">💾 Speichern</button>
      </div>
    </div>
  </div>`;
}
function bkrfqgRaumNeu() {
  ['br-id','br-bez','br-lage','br-flaeche','br-maxtn','br-vermieter'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  document.getElementById('br-eigentum').value='Eigentum';
  document.getElementById('br-bescheid').checked=false;
  document.getElementById('br-aktiv').checked=true;
  document.getElementById('bkrfqg-r-titel').textContent='Neuer Raum';
  bkrfqgOpenModal('bkrfqg-raum-modal');
}
function bkrfqgRaumNeuFuerStandort(sid){ bkrfqgRaumNeu(); document.getElementById('br-standort').value=sid; }
function bkrfqgRaumEdit(id) {
  const r=bkrfqgState.raeume.find(x=>x.id===id); if(!r)return;
  const g=(k,v)=>{const e=document.getElementById(k);if(e)e.value=v||'';};
  g('br-id',r.id); document.getElementById('br-standort').value=r.standort_id;
  g('br-bez',r.bezeichnung); g('br-lage',r.geschoss); g('br-flaeche',r.flaeche_qm); g('br-maxtn',r.max_teilnehmer);
  g('br-eigentum',r.eigentum_oder_miete||'Eigentum'); g('br-vermieter',r.vermieter);
  document.getElementById('br-bescheid').checked=r.im_bescheid||false;
  document.getElementById('br-aktiv').checked=r.aktiv!==false;
  document.getElementById('bkrfqg-r-titel').textContent='Raum bearbeiten';
  bkrfqgOpenModal('bkrfqg-raum-modal');
}
async function bkrfqgRaumSpeichern() {
  const id=document.getElementById('br-id').value;
  const payload={
    standort_id:document.getElementById('br-standort').value,
    bezeichnung:document.getElementById('br-bez').value,
    geschoss:document.getElementById('br-lage').value||null,
    flaeche_qm:parseFloat(document.getElementById('br-flaeche').value)||null,
    max_teilnehmer:parseInt(document.getElementById('br-maxtn').value)||null,
    eigentum_oder_miete:document.getElementById('br-eigentum').value,
    vermieter:document.getElementById('br-vermieter').value||null,
    im_bescheid:document.getElementById('br-bescheid').checked,
    aktiv:document.getElementById('br-aktiv').checked,
  };
  try {
    if(id)await bkrfqgUpdate('bkrfqg_raeume',id,payload);
    else await bkrfqgInsert('bkrfqg_raeume',payload);
    toast('Raum gespeichert ✓');
    bkrfqgCloseModal('bkrfqg-raum-modal');
    bkrfqgState.loaded=false; await bkrfqgLadeAlles();
    bkrfqgRaeume(document.getElementById('bkrfqg-content'));
  } catch(e){toast('Fehler: '+e.message,'err');}
}

// ════════════════════════════════════════════════════════════════════
// KURSPLÄNE
// ════════════════════════════════════════════════════════════════════
function bkrfqgKursplaene(el) {
  // Detail-Ansicht wenn Kursplan ausgewählt
  if (bkrfqgKPSelected) { bkrfqgKPDetailView(el); return; }
  const kp = bkrfqgState.kursplaene;
  el.innerHTML = bKopf('📅 Kurspläne', 'Lehrgänge und Kurstage – manuell oder per KI generiert',
    '<button class="btn btn-primary btn-sm" onclick="bkrfqgKPNeu()">＋ Kursplan</button>')

    + (kp.length===0
      ? bLeer('📅','Keine Kurspläne','Erstelle einen Kursplan manuell oder per KI-Generator oben.')
      : kp.map(k=>`
        <div class="card" style="margin-bottom:10px;border-left:4px solid ${k.status==='aktiv'?'var(--rot)':k.status==='abgeschlossen'?'#059669':'var(--blau)'};padding-left:20px">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
            <div style="cursor:pointer;flex:1;min-width:0" onclick="bkrfqgKPOeffnen('${k.id}')">
              <div style="font-weight:700;font-size:14px;color:var(--dunkel);display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                ${bKursTypLabel(k.kurstyp)} ${bBadge(k.status)}
              </div>
              <div style="font-size:12px;color:var(--grau);margin-top:3px">
                ${k.bkrfqg_standorte?.name||'–'} · ${bfmtD(k.startdatum)} – ${bfmtD(k.enddatum)}
                ${k.titel&&k.titel!==k.kurstyp+' '+k.startdatum?'· '+k.titel:''}
              </div>
            </div>
            <div style="display:flex;gap:6px;flex-shrink:0">
              <button class="btn btn-outline btn-sm" onclick="bkrfqgKPEdit('${k.id}')" title="Kursplan bearbeiten">✏️</button>
              <button class="btn btn-outline btn-sm" onclick="bkrfqgSetTab('kursmeldung')" title="Kursmeldung">📨</button>
              <button class="btn btn-primary btn-sm" onclick="bkrfqgKPOeffnen('${k.id}')">📋 Kurstage</button>
              <button class="btn btn-outline btn-sm" style="color:var(--rot);border-color:var(--rot)" onclick="event.stopPropagation();bkrfqgKPLoeschen('${k.id}','${(k.titel||'').replace(/'/g,'')}')">🗑</button>
            </div>
          </div>
        </div>`).join(''))
    + bkrfqgKPModalHTML();
  // Nächsten Montag vorausfüllen (für bkp-ki-aktiv relevant)
  const d=new Date(); while(d.getDay()!==1)d.setDate(d.getDate()+1); d.setDate(d.getDate()+7);
  window._bkrfqgNaechsterMontag=d.toISOString().split('T')[0];
}
function bkrfqgKPModalHTML() {
  const standortOpts = bkrfqgState.standorte.map(s=>`<option value="${s.id}">${s.name}</option>`).join('');
  const dozAnzahl = bkrfqgState.fahrlehrer.length;
  const dozMitBand = [...new Set(bkrfqgState.dozentBaender.map(d=>d.mitarbeiter_id))].length;
  return `
  <div class="modal-overlay" id="bkrfqg-kp-modal">
    <div class="modal" style="width:560px">
      <div class="modal-header">
        <h3 id="bkrfqg-kp-titel">Neuer Kursplan</h3>
        <button class="close-btn" onclick="bkrfqgCloseModal('bkrfqg-kp-modal')">×</button>
      </div>
      <div class="modal-body" style="padding-bottom:0">
        <input type="hidden" id="bkp-id">
        <input type="hidden" id="bkp-mode" value="neu">

        <!-- Schritt 1 (immer sichtbar) -->
        <div style="font-size:11px;font-weight:700;color:var(--grau);letter-spacing:.05em;text-transform:uppercase;margin-bottom:10px">
          Schritt 1 · Grunddaten
        </div>
        <div class="frow"><label>Standort</label>
          <select id="bkp-standort">${standortOpts}</select></div>
        <div class="fgrid">
          <div class="frow"><label>Kurstyp</label>
            <select id="bkp-typ" onchange="bkrfqgKPTypChange()">
              <option value="BGQ_Gueter">BGQ Güterkraftverkehr (140 Std.)</option>
              <option value="BGQ_Person">BGQ Personenverkehr (140 Std.)</option>
              <option value="BGQ_Kombi">BGQ Kombi Güter + Person</option>
              <option value="Weiterbildung">BKF Weiterbildung (35 Std. – alle 5 Module)</option>
              <option value="WB_T1">WB Modul 1 – Risikobewusstsein (7 Std.)</option>
              <option value="WB_T2">WB Modul 2 – Rahmenbedingungen (7 Std.)</option>
              <option value="WB_T3">WB Modul 3 – Gefahren &amp; Stress (7 Std.)</option>
              <option value="WB_T4">WB Modul 4 – Firma / Fahrer / Fahrzeug (7 Std.)</option>
              <option value="WB_T5">WB Modul 5 – Recht &amp; Dokumente (7 Std.)</option>
            </select></div>
          <div class="frow"><label>Startdatum <span id="bkp-montag-hint" style="color:var(--rot)">Montag</span></label>
            <input type="date" id="bkp-start"></div>
        </div>
        <div class="frow"><label>Titel <span style="color:var(--grau);font-weight:400">(optional)</span></label>
          <input id="bkp-titel" placeholder="Wird automatisch aus Typ + Datum generiert"></div>

        <!-- Schritt 2: nur bei Neu -->
        <div id="bkp-ki-section">
          <div style="height:1px;background:var(--border);margin:16px 0 14px"></div>
          <div style="font-size:11px;font-weight:700;color:var(--grau);letter-spacing:.05em;text-transform:uppercase;margin-bottom:12px">
            Schritt 2 · Planung
          </div>
          <!-- KI (Standard) -->
          <label style="display:flex;gap:12px;align-items:flex-start;padding:12px;border-radius:8px;
              border:2px solid #6A1B9A;background:#f9f0ff;cursor:pointer;margin-bottom:8px"
              onclick="bkrfqgKIToggle(true)">
            <input type="radio" name="bkp-planer" id="bkp-ki-aktiv" value="ki" checked
                style="margin-top:3px;width:16px;height:16px;accent-color:#6A1B9A;flex-shrink:0">
            <div>
              <div style="font-weight:700;font-size:13px;color:#6A1B9A">✨ KI generiert den Kursplan automatisch</div>
              <div style="font-size:11px;color:#6A1B9A;opacity:.85;margin-top:4px;line-height:1.5">
                · Degner-Bänder B1–B9 nach BKrFQV Anlage 1 eingeplant<br>
                · Niedersächsische Feiertage werden übersprungen<br>
                · ${dozMitBand} von ${dozAnzahl} Dozenten nach Band-Spezialisierung eingeteilt
              </div>
            </div>
          </label>
          <!-- Manuell -->
          <label style="display:flex;gap:12px;align-items:flex-start;padding:12px;border-radius:8px;
              border:1px solid var(--border);background:var(--faint);cursor:pointer"
              onclick="bkrfqgKIToggle(false)">
            <input type="radio" name="bkp-planer" value="manuell"
                style="margin-top:3px;width:16px;height:16px;flex-shrink:0">
            <div>
              <div style="font-weight:600;font-size:13px;color:var(--dunkel)">📋 Manuell planen</div>
              <div style="font-size:11px;color:var(--grau);margin-top:4px">
                Kursplan wird angelegt – Kurstage trägst du selbst ein.
              </div>
            </div>
          </label>
        </div>

        <!-- Bearbeitungsfelder (nur bei Edit) -->
        <div id="bkp-edit-section" style="display:none">
          <div class="fgrid" style="margin-top:8px">
            <div class="frow"><label>Status</label>
              <select id="bkp-status">
                <option value="geplant">Geplant</option>
                <option value="aktiv">Aktiv</option>
                <option value="abgeschlossen">Abgeschlossen</option>
              </select></div>
            <div class="frow"><label>Ende</label><input type="date" id="bkp-ende"></div>
          </div>
        </div>
        <div style="height:16px"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="bkrfqgCloseModal('bkrfqg-kp-modal')">Abbrechen</button>
        <button class="btn btn-primary" id="bkp-save-btn" onclick="bkrfqgKPSpeichern()">
          ✨ Kursplan anlegen &amp; generieren
        </button>
      </div>
    </div>
  </div>`;
}

function bkrfqgKIToggle(kiAn) {
  // Visuelles Feedback: aktiver Radio erhält lila Rahmen
  const kiLabel = document.querySelector('label[onclick="bkrfqgKIToggle(true)"]');
  const mnLabel = document.querySelector('label[onclick="bkrfqgKIToggle(false)"]');
  if (kiLabel) { kiLabel.style.border = kiAn ? '2px solid #6A1B9A' : '1px solid var(--border)'; kiLabel.style.background = kiAn ? '#f9f0ff' : 'var(--faint)'; }
  if (mnLabel) { mnLabel.style.border = kiAn ? '1px solid var(--border)' : '2px solid var(--dunkel)'; mnLabel.style.background = kiAn ? 'var(--faint)' : '#f5f5f5'; }
  const btn = document.getElementById('bkp-save-btn');
  if (btn) btn.innerHTML = kiAn ? '✨ Kursplan anlegen &amp; generieren' : '💾 Kursplan anlegen';
}

function bkrfqgKPNeu() {
  // Grundfelder zurücksetzen
  ['bkp-id','bkp-titel','bkp-ende'].forEach(id=>{ const e=document.getElementById(id); if(e)e.value=''; });
  // Nächsten Montag als Startdatum
  const d=new Date(); while(d.getDay()!==1)d.setDate(d.getDate()+1); d.setDate(d.getDate()+7);
  const startEl=document.getElementById('bkp-start'); if(startEl)startEl.value=d.toISOString().split('T')[0];
  // Modus: Neu → KI-Section anzeigen, Edit-Section verstecken
  const m=document.getElementById('bkp-mode'); if(m)m.value='neu';
  const ki=document.getElementById('bkp-ki-section'); if(ki)ki.style.display='';
  const ed=document.getElementById('bkp-edit-section'); if(ed)ed.style.display='none';
  // KI als Standard auswählen
  const kiRadio=document.getElementById('bkp-ki-aktiv'); if(kiRadio)kiRadio.checked=true;
  bkrfqgKIToggle(true);
  bkrfqgKPTypChange();  // Montag-Hinweis initial setzen
  document.getElementById('bkrfqg-kp-titel').textContent='Neuer Kursplan';
  bkrfqgOpenModal('bkrfqg-kp-modal');
}
function bkrfqgKPEdit(id) {
  const k=bkrfqgState.kursplaene.find(x=>x.id===id); if(!k)return;
  document.getElementById('bkp-id').value=k.id;
  document.getElementById('bkp-standort').value=k.standort_id;
  document.getElementById('bkp-titel').value=k.titel||'';
  document.getElementById('bkp-typ').value=k.kurstyp;
  document.getElementById('bkp-start').value=(k.startdatum||'').split('T')[0];
  document.getElementById('bkp-ende').value=(k.enddatum||'').split('T')[0];
  // Modus: Edit → KI-Section verstecken, Edit-Section anzeigen
  const m=document.getElementById('bkp-mode'); if(m)m.value='edit';
  const ki=document.getElementById('bkp-ki-section'); if(ki)ki.style.display='none';
  const ed=document.getElementById('bkp-edit-section'); if(ed)ed.style.display='';
  const statusEl=document.getElementById('bkp-status'); if(statusEl)statusEl.value=k.status;
  const btn=document.getElementById('bkp-save-btn'); if(btn)btn.innerHTML='💾 Speichern';
  document.getElementById('bkrfqg-kp-titel').textContent='Kursplan bearbeiten';
  bkrfqgKPTypChange();  // Montag-Hinweis setzen
  bkrfqgOpenModal('bkrfqg-kp-modal');
}
async function bkrfqgKPSpeichern() {
  const id      = document.getElementById('bkp-id').value;
  const kurstyp = document.getElementById('bkp-typ').value;
  const startVal= document.getElementById('bkp-start').value||null;
  const modus = document.getElementById('bkp-mode')?.value || 'neu';
  const kiAktiv = modus==='neu' && document.getElementById('bkp-ki-aktiv')?.checked;
  if (kiAktiv && startVal && bkrfqgBrauchtMontag(kurstyp) && new Date(startVal).getDay()!==1) {
    toast('KI-Generierung: Startdatum muss ein Montag sein','err'); return;
  }
  const payload={
    standort_id:document.getElementById('bkp-standort').value,
    titel:document.getElementById('bkp-titel').value||bKursTypLabel(kurstyp)+' ab '+bfmtD(startVal),
    kurstyp,
    status:document.getElementById('bkp-status').value,
    startdatum:startVal,
    enddatum:document.getElementById('bkp-ende').value||null,
  };
  const btn=document.getElementById('bkp-save-btn');
  try {
    let kp;
    if(id){await bkrfqgUpdate('bkrfqg_kursplaene',id,payload); toast('Kursplan gespeichert ✓');}
    else { kp=await bkrfqgInsert('bkrfqg_kursplaene',payload); toast('Kursplan angelegt ✓'); }
    bkrfqgCloseModal('bkrfqg-kp-modal');
    bkrfqgState.loaded=false; await bkrfqgLadeAlles();
    // UI sofort rendern – zeigt den neuen Plan in der Liste
    const _el = document.getElementById('bkrfqg-content');
    // KI-Generierung nach dem Speichern
    if (kiAktiv && kp && startVal) {
      const kpId=kp[0].id;
      const standortId=payload.standort_id;
      // Loading-Anzeige im Content
      if (_el) _el.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
            min-height:60vh;gap:16px;color:#6A1B9A">
          <div style="width:48px;height:48px;border:4px solid #e8d5ff;border-top-color:#6A1B9A;
              border-radius:50%;animation:spin .8s linear infinite"></div>
          <div style="font-size:15px;font-weight:700">KI generiert Kursplan …</div>
          <div style="font-size:12px;color:var(--grau);text-align:center;max-width:320px">
            Degner-Bänder B1–B9 · Niedersächsische Feiertage · Dozenten-Spezialisierung<br>
            <span style="opacity:.7">Das dauert ca. 15–30 Sekunden</span>
          </div>
        </div>
        <style>@keyframes spin{to{transform:rotate(360deg)}}</style>`;
      const standort=bkrfqgState.standorte.find(s=>s.id===standortId);
      const raeume=bkrfqgState.raeume.filter(r=>r.standort_id===standortId&&r.aktiv!==false);
      const feiertage=bkrfqgFeiertage(new Date(startVal).getFullYear())+', '+bkrfqgFeiertage(new Date(startVal).getFullYear()+1);
      // Bereits geplante Kurstage anderer Kurse laden → Dozenten-Konflikte vermeiden
      let belegungen = [];
      try {
        const andereKT = await bkrfqgSB('bkrfqg_kurstage', {
          select: 'datum,beginn,ende,unterrichtsleiter_id,mitarbeiter(vorname,nachname)',
          order: 'datum'
        });
        belegungen = andereKT
          .filter(k => k.unterrichtsleiter_id && k.mitarbeiter)
          .map(k => ({
            datum: k.datum,
            beginn: k.beginn?.slice(0,5),
            ende: k.ende?.slice(0,5),
            dozent: k.mitarbeiter.vorname + ' ' + k.mitarbeiter.nachname
          }));
      } catch(e) { /* Belegungen nicht kritisch */ }

      // Kurstyp → BKRFQV_THEMEN-Key mappen
      const _themenKey = { BGQ_Gueter:'bgq_g', BGQ_Person:'bgq_p', BGQ_Kombi:'kombi_gp',
                           Weiterbildung:'wb_r3_g',
                           WB_T1:'wb_t1',WB_T2:'wb_t2',WB_T3:'wb_t3',WB_T4:'wb_t4',WB_T5:'wb_t5'}[kurstyp] || 'bgq_g';
      const _dozTyp = _themenKey; // Dozenten-Zuweisung nutzt denselben Key
      // Vollständige Band-Struktur aus dem Dozenten-Themen-Tab (= verbindliche Quelle)
      const _baenderData = (BKRFQV_THEMEN[_themenKey] || BKRFQV_THEMEN.bgq_g).map(b => ({
        nr: b.nr,
        titel: b.titel,
        minuten: b.dauer_min,
        kb: b.bkrfqv || [],
        gruppe: b.phase || null,  // gemeinsam | gueter | person (nur Kombi)
        unterthemen: b.unterthemen.map(u => u.titel),
      }));

      const result=await bkrfqgKI('kursplan_generieren',{
        kurstyp,startdatum:startVal,
        baender:_baenderData,   // ← verbindliche Struktur aus BKRFQV_THEMEN
        standort:standort?standort.name+', '+standort.ort:'Fahrschulteam Lingen',
        fahrlehrer:bkrfqgState.fahrlehrer.map(f=>{
          const baender=bkrfqgState.dozentBaender.filter(d=>d.mitarbeiter_id===f.id&&d.kurstyp===_dozTyp).map(d=>d.band_nr);
          return {name:f.vorname+' '+f.nachname, baender};
        }),
        raeume:raeume.map(r=>({bezeichnung:r.bezeichnung,max_teilnehmer:r.max_teilnehmer||20})),
        feiertage,
        belegungen, // bereits belegte Dozenten-Zeiten
      });
      const kurstage=result.kurstage;
      // ── Vollständigkeitsprüfung: sind alle Bänder abgedeckt? ────────────────
      const _sollBaender = (BKRFQV_THEMEN[_themenKey]||[]).filter(b=>(b.dauer_min||0)>0);
      const _geplanteBaender = new Set(kurstage.map(k=>k.band_nr));
      const _fehlende = _sollBaender.filter(b=>!_geplanteBaender.has(b.nr));
      if (_fehlende.length) {
        toast(`⚠️ Kursplan unvollständig: Bänder ${_fehlende.map(b=>b.nr).join(', ')} fehlen. Bitte erneut generieren.`, 'warn', 9000);
      }
      // ── KB + Titel deterministisch aus BKRFQV_THEMEN – KI-Antwort wird NICHT übernommen ──
      // Verhindert Verwechslung Degner-Band-Nr. ↔ BKrFQV-Kenntnisbereich-Nr.
      // und stellt die korrekten Themen-Bezeichnungen aus dem Dozenten-Themen-Tab sicher.
      const _kbMap = {};    // band_nr → [KB-Liste]
      const _titelMap = {}; // band_nr → korrekter Band-Titel
      (BKRFQV_THEMEN[_themenKey] || BKRFQV_THEMEN.bgq_g).forEach(b => {
        _kbMap[b.nr] = b.bkrfqv; _titelMap[b.nr] = b.titel;
      });
      // Hilfsfunktion: liefert korrekte KB-Angabe für ein Band
      const _kbFuerBand = (bandNr, kiKb) => {
        const liste = _kbMap[bandNr];
        if (!liste || !liste.length) return kiKb||null;
        // Falls KI einen Wert geliefert hat der in der Liste steht → übernehmen
        const kiNorm = (kiKb||'').replace(/^KB\s*/i,'').trim();
        const inListe = liste.find(kb => kb.replace(/^KB\s*/i,'').trim() === kiNorm);
        return inListe || liste[0]; // sonst: erstes KB der autorisierten Liste
      };

      // ── STUNDEN-NORMALISIERUNG ─────────────────────────────────────────────
      // Die KI plant nicht immer exakt die Soll-Minuten. Wir korrigieren jeden
      // Kurstag proportional, sodass die Summe je Band exakt dem Rahmenplan entspricht.
      const _sollMinBand = {}; // band_nr → Soll-Minuten
      (BKRFQV_THEMEN[_themenKey] || BKRFQV_THEMEN.bgq_g).forEach(b => { _sollMinBand[b.nr] = b.dauer_min || 0; });
      // Ist-Stunden je Band summieren
      const _istHBand = {};
      kurstage.forEach(k => {
        const bn = k.band_nr;
        _istHBand[bn] = (_istHBand[bn]||0) + (parseFloat(k.stunden)||0);
      });
      // Zeit-Neuberechnung: aus Beginn + korrigierten Stunden neue Endzeit (inkl. 45min Pause ab 6h)
      const _neueEndzeit = (beginn, stunden) => {
        if (!beginn) return null;
        const [bh,bm] = beginn.split(':').map(Number);
        let startMin = bh*60 + bm;
        // Pausenregel: ab >6h Unterricht 45 Min Mittagspause, sonst keine (vereinfacht wie Rahmenplan)
        const pause = stunden > 6 ? 45 : (stunden > 4 ? 30 : 0);
        const endMin = startMin + Math.round(stunden*60) + pause;
        const eh = Math.floor(endMin/60), em = endMin%60;
        return `${String(eh).padStart(2,'0')}:${String(em).padStart(2,'0')}`;
      };
      kurstage.forEach(k => {
        const bn = k.band_nr;
        const soll = _sollMinBand[bn];
        const istH = _istHBand[bn];
        if (!soll || !istH) return;
        const sollH = soll/60;
        if (Math.abs(istH - sollH) < 0.05) return; // stimmt bereits
        // proportional skalieren, dann auf halbe Stunde runden (glatte Zeiten)
        const faktor = sollH / istH;
        let neuH = Math.round((parseFloat(k.stunden)||0) * faktor * 2) / 2;
        k.stunden = neuH;
        k.ende = _neueEndzeit(k.beginn, neuH);
      });
      // Rundungs-Rest je Band verteilen (in Viertelstunden-Schritten), Soll-Summe exakt treffen
      Object.keys(_sollMinBand).forEach(bn => {
        const soll = _sollMinBand[bn]; if (!soll) return;
        const tage = kurstage.filter(k=>k.band_nr===bn);
        if (!tage.length) return;
        const sollH = soll/60;
        let istSum = tage.reduce((s,k)=>s+(parseFloat(k.stunden)||0),0);
        let diff = Math.round((sollH - istSum) * 2) / 2; // Rest in halben Stunden
        // Rest schrittweise auf Kurstage verteilen (max. Tageskapazität beachten)
        let idx = tage.length - 1;
        let guard = 0;
        while (Math.abs(diff) >= 0.5 && guard < 200) {
          const t = tage[idx];
          const wd = new Date(t.datum+'T12:00').getDay();
          const maxH = (wd===5) ? 6 : 7; // Fr 6h, sonst 7h
          const cur = parseFloat(t.stunden)||0;
          if (diff > 0 && cur < maxH) {
            const add = Math.min(0.5, diff, maxH-cur);
            t.stunden = Math.round((cur+add)*2)/2; diff = Math.round((diff-add)*2)/2;
          } else if (diff < 0 && cur > 0.5) {
            const sub = Math.min(0.5, -diff, cur-0.5);
            t.stunden = Math.round((cur-sub)*2)/2; diff = Math.round((diff+sub)*2)/2;
          }
          idx = (idx - 1 + tage.length) % tage.length;
          guard++;
        }
        // eventueller Restbetrag < 0.5 auf letzten Tag
        istSum = tage.reduce((s,k)=>s+(parseFloat(k.stunden)||0),0);
        const rest = Math.round((sollH - istSum)*100)/100;
        if (Math.abs(rest) >= 0.01) {
          const last = tage[tage.length-1];
          last.stunden = Math.round(((parseFloat(last.stunden)||0) + rest)*100)/100;
        }
        tage.forEach(t => { t.ende = _neueEndzeit(t.beginn, t.stunden); });
      });

      // ── DATUMS-NEUVERTEILUNG (Wochenenden + Feiertage überspringen) ─────────
      // Die KI hält Feiertage/Wochenenden nicht zuverlässig ein. Wir mappen die
      // von der KI vergebenen (evtl. ungültigen) Kurstermine deterministisch auf
      // gültige Werktage – unter Beibehaltung der Reihenfolge und der Parallelität
      // (Kombi: Güter+Person am selben Tag bleiben am selben Tag).
      {
        // Eindeutige KI-Termine in chronologischer Reihenfolge sammeln
        const uniqDaten = [...new Set(kurstage.map(k=>k.datum))].sort();
        // Jedem ursprünglichen Termin einen gültigen Werktag zuordnen
        const mapping = {};
        let cursor = bkrfqgNaechsterWerktag(new Date(startVal+'T12:00'));
        uniqDaten.forEach(orig => {
          mapping[orig] = bkrfqgYMD(cursor);
          // nächsten Werktag für den nächsten Termin vorrücken
          const next = new Date(cursor); next.setDate(next.getDate()+1);
          cursor = bkrfqgNaechsterWerktag(next);
        });
        // Termine umschreiben
        kurstage.forEach(k => { if (mapping[k.datum]) k.datum = mapping[k.datum]; });
      }

      const ktPayload=kurstage.map(k=>{
        const fl=bkrfqgState.fahrlehrer.find(f=>(f.vorname+' '+f.nachname)===k.fahrlehrer_name);
        const raum=raeume.find(r=>r.bezeichnung===k.raum_bezeichnung);
        return {kursplan_id:kpId,standort_id:standortId,raum_id:raum?raum.id:null,
          datum:k.datum,beginn:k.beginn,ende:k.ende,
          gegenstand:'Band '+k.band_nr+': '+(_titelMap[k.band_nr] || k.band_titel),
          kenntnisbereich_kb:_kbFuerBand(k.band_nr, k.kenntnisbereich_kb),
          unterrichtsleiter_id:fl?fl.id:null,stunden:k.stunden,
          gruppe:k.gruppe||'gemeinsam',meldung_status:'ausstehend'};
      });
      // Konflikt-Check: gleicher Dozent, gleicher Zeitraum
      const konflikte = [];
      ktPayload.forEach((a,i) => {
        if (!a.unterrichtsleiter_id) return;
        ktPayload.slice(i+1).forEach(b => {
          if (b.unterrichtsleiter_id !== a.unterrichtsleiter_id) return;
          if (a.datum !== b.datum) return;
          // Zeitüberschneidung?
          if (a.beginn < b.ende && a.ende > b.beginn) {
            const doz = bkrfqgState.fahrlehrer.find(f=>f.id===a.unterrichtsleiter_id);
            konflikte.push(`${bfmtD(a.datum)}: ${doz?doz.vorname+' '+doz.nachname:'Dozent'} doppelt belegt`);
          }
        });
      });
      if (konflikte.length) {
        toast(`⚠️ ${konflikte.length} Dozenten-Konflikt(e) – bitte manuell prüfen`, 'warn', 8000);
        console.warn('Dozenten-Konflikte:', konflikte);
      }

      for(let i=0;i<ktPayload.length;i+=50) await bkrfqgInsert('bkrfqg_kurstage',ktPayload.slice(i,i+50));
      toast(`✓ ${kurstage.length} Kurstage generiert!`);
      bkrfqgState.loaded=false; await bkrfqgLadeAlles();
      bkrfqgKPSelected=kpId; bkrfqgKPKurstage=[];
      await bkrfqgKPOeffnen(kpId);
      return;
    }
    bkrfqgKursplaene(document.getElementById('bkrfqg-content'));
  } catch(e){toast('Fehler: '+e.message,'err'); if(btn)btn.disabled=false;}
}

async function bkrfqgKPLoeschen(id, titel) {
  if (!confirm('Kursplan \u201e' + titel + '\u201c wirklich l\u00f6schen?\nAlle zugeh\u00f6rigen Kurstage werden ebenfalls gel\u00f6scht.')) return;
  try {
    const { error: e1 } = await sb.from('bkrfqg_kurstage').delete().eq('kursplan_id', id);
    if (e1) throw new Error(e1.message);
    const { error: e2 } = await sb.from('bkrfqg_kursplaene').delete().eq('id', id);
    if (e2) throw new Error(e2.message);
    toast('Kursplan gel\u00f6scht');
    bkrfqgState.loaded = false;
    await bkrfqgLadeAlles();
    bkrfqgKursplaene(document.getElementById('bkrfqg-content'));
  } catch(e) { toast('Fehler: ' + e.message, 'err'); }
}


// ════════════════════════════════════════════════════════════════════
// KURSPLAN DETAIL-ANSICHT + KURSTAG-BEARBEITUNG
// ════════════════════════════════════════════════════════════════════
async function bkrfqgKPOeffnen(id) {
  bkrfqgKPSelected = id;
  const el = document.getElementById('bkrfqg-content');
  el.innerHTML = '<div class="loading"><div class="spinner"></div>Lade Kurstage …</div>';
  try {
    bkrfqgKPKurstage = await bkrfqgSB('bkrfqg_kurstage', {
      select: '*,bkrfqg_raeume(bezeichnung),mitarbeiter(vorname,nachname)',
      eq: { kursplan_id: id },
      order: 'datum'
    });
    await bkrfqgTnLaden(id);
    bkrfqgKursplaene(el);
  } catch(e) { el.innerHTML = `<div class="card" style="color:var(--rot)">Fehler: ${e.message}</div>`; }
}

function bkrfqgKPZurueck() {
  bkrfqgKPSelected = null;
  bkrfqgKPKurstage = [];
  bkrfqgKursplaene(document.getElementById('bkrfqg-content'));
}

function bkrfqgKPDetailView(el) {
  const kp = bkrfqgState.kursplaene.find(x => x.id === bkrfqgKPSelected);
  if (!kp) { bkrfqgKPZurueck(); return; }
  const kt = bkrfqgKPKurstage;
  const totalH = Math.round(kt.reduce((s,k)=>s+(k.stunden||0),0)*10)/10;
  const isKombi = kp.kurstyp === 'BGQ_Kombi';
  const WT = ['So','Mo','Di','Mi','Do','Fr','Sa'];

  el.innerHTML = bKopf(
    `📅 ${kp.titel}`,
    `${kp.kurstyp} · ${kp.bkrfqg_standorte?.name||''} · ${bfmtD(kp.startdatum)} – ${bfmtD(kp.enddatum)} · ${totalH} Std.`,
    `<div style="display:flex;gap:6px;flex-wrap:wrap">
      <button class="btn btn-outline btn-sm" onclick="bkrfqgKPZurueck()">← Zurück</button>
      <button class="btn btn-outline btn-sm" onclick="bkrfqgKPEdit('${kp.id}');event.stopPropagation()">✏️ Kursplan</button>
      <button class="btn btn-outline btn-sm" onclick="bkrfqgDrucken('lehrplan')">📋 Lehrplan</button>
      <button class="btn btn-outline btn-sm" onclick="bkrfqgDrucken('dozent')">🖨️ Dozenten</button>
      <button class="btn btn-outline btn-sm" onclick="bkrfqgDruckenDozentenplaene()">👥 Dozenten-Pläne</button>
      <!-- Teilnehmererfassung entfaellt: Teilnehmer werden ausschliesslich im
           Dialog "Lehrgang dokumentieren" erfasst.
           Der Knopf "KBA-Meldung" ist vorerst mit ausgeblendet, weil
           bkrfqgKBAMeldung() seine Liste noch aus bkrfqg_kursplan_teilnehmer
           liest und ohne Erfassung nur leere Meldungen erzeugen wuerde.
           Beides kommt zurueck, sobald der Export auf die Lehrgangsteilnehmer
           umgebaut ist. -->
      ${bkrfqgIstBgq(kp.kurstyp) ? `<button class="btn btn-outline btn-sm" onclick="bkrfqgTnSuchDialog()">👥 Teilnehmer (${bkrfqgKPTeilnehmer.length})</button>` : ''}
      ${bkrfqgIstBgq(kp.kurstyp) ? `<button class="btn btn-outline btn-sm" onclick="bkrfqgBgqDialog('${kp.id}')">🏛 BQR-Meldung</button>` : ''}
      <button class="btn btn-primary btn-sm" onclick="bkrfqgKurstagNeu('${kp.id}')">＋ Kurstag</button>
    </div>`
  );

  if (isKombi) {
    const gemH  = Math.round(kt.filter(k=>k.gruppe==='gemeinsam').reduce((s,k)=>s+(k.stunden||0),0)*10)/10;
    const gH    = Math.round(kt.filter(k=>k.gruppe==='gueter')   .reduce((s,k)=>s+(k.stunden||0),0)*10)/10;
    const pH    = Math.round(kt.filter(k=>k.gruppe==='person')   .reduce((s,k)=>s+(k.stunden||0),0)*10)/10;
    // Soll-Werte aus verbindlicher Rahmenplan-Struktur
    const _kb   = BKRFQV_THEMEN.kombi_gp || [];
    const sollGem = _kb.filter(b=>b.phase==='gemeinsam').reduce((s,b)=>s+(b.dauer_min||0),0)/60;
    const sollG   = _kb.filter(b=>b.phase==='gueter').reduce((s,b)=>s+(b.dauer_min||0),0)/60;
    const sollP   = _kb.filter(b=>b.phase==='person').reduce((s,b)=>s+(b.dauer_min||0),0)/60;
    const abw = (ist,soll) => Math.abs(ist-soll) > 0.5
      ? `<span style="color:var(--rot);font-size:10px"> (Soll ${soll}h)</span>` : '';
    el.innerHTML += `
      <div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap">
        <span class="card" style="padding:6px 12px;font-size:12px;flex:0">🔘 Gemeinsam <strong>${gemH}h</strong>${abw(gemH,sollGem)}</span>
        <span class="card" style="padding:6px 12px;font-size:12px;background:#fffbeb;border-color:#fde68a;flex:0">🚛 Güter <strong>${gH}h</strong>${abw(gH,sollG)}</span>
        <span class="card" style="padding:6px 12px;font-size:12px;background:#f0f9ff;border-color:#bae6fd;flex:0">🚌 Person <strong>${pH}h</strong>${abw(pH,sollP)}</span>
        <span class="card" style="padding:6px 12px;font-size:12px;flex:0">Σ je Qualifikation: Güter <strong>${Math.round((gemH+gH)*10)/10}h</strong> / Person <strong>${Math.round((gemH+pH)*10)/10}h</strong> <span style="color:var(--grau);font-size:10px">· Soll ${sollGem+sollG}h</span></span>
      </div>`;
  }

  const tagRows = kt.map((k,i) => {
    const wt = WT[new Date(k.datum+'T12:00').getDay()];
    const bg = isKombi && k.gruppe==='gueter' ? 'background:#fffbeb' :
               isKombi && k.gruppe==='person' ? 'background:#f0f9ff' : '';
    const gBadge = !isKombi ? '' :
      k.gruppe==='gueter'    ? '<span style="background:#fef3c7;color:#d97706;border-radius:4px;padding:1px 6px;font-size:10px;white-space:nowrap">🚛 Güter</span>' :
      k.gruppe==='person'    ? '<span style="background:#e0f2fe;color:#0891b2;border-radius:4px;padding:1px 6px;font-size:10px;white-space:nowrap">🚌 Person</span>' :
                               '<span style="color:var(--grau);font-size:10px">alle</span>';
    const mBadge = k.meldung_status==='gemeldet'
      ? '<span style="color:#059669;font-size:10px">✓ gemeldet</span>'
      : '<span style="color:var(--grau);font-size:10px">ausstehend</span>';
    // Gemeldete Tage bleiben liegen - ein Tausch wuerde die Meldung ans
    // KBA nachtraeglich unrichtig machen.
    const _fest = k.meldung_status==='gemeldet';
    return `<tr style="${bg}" data-kt="${k.id}"
      ondragover="bkrfqgZiehUeber(event)"
      ondragleave="bkrfqgZiehRaus(event)"
      ondrop="bkrfqgZiehAb(event,'${k.id}')"
      ondragend="bkrfqgZiehEnde(event)">
      <td style="font-weight:600;white-space:nowrap;font-size:12px">${_fest?'':'<span draggable="true" ondragstart="bkrfqgZiehStart(event,\''+k.id+'\')" style="color:var(--grau);cursor:grab;margin-right:5px" title="Zum Tauschen auf einen anderen Kurstag ziehen">⠿</span>'}${bfmtD(k.datum)}<br><span style="color:var(--grau);font-weight:400;font-size:10px">${wt}</span></td>
      <td style="white-space:nowrap;font-size:11px">${k.beginn?.slice(0,5)||'–'}<br>${k.ende?.slice(0,5)||'–'}</td>
      <td style="font-size:12px;max-width:260px">
        <div ${_fest?'':'contenteditable="true" spellcheck="false"'}
          onfocus="bkrfqgThemaFokus(this)"
          onblur="bkrfqgThemaSpeichern(this,'${k.id}')"
          onkeydown="bkrfqgThemaTaste(event,this)"
          style="${_fest?'':'cursor:text;border-radius:4px;padding:1px 3px;margin:-1px -3px'}"
          title="${_fest?'Bereits gemeldet – nicht änderbar':'Zum Ändern anklicken'}"
          >${(k.gegenstand||'–').replace(/^Band [^:]+:\s*/,'')}</div>
        ${(()=>{
          const m=(k.gegenstand||'').match(/^Band ([^:]+):/);
          const bn=m?m[1].trim():null;
          if(!bn) return '';
          const _key={BGQ_Gueter:'bgq_g',BGQ_Person:'bgq_p',BGQ_Kombi:'kombi_gp',Weiterbildung:'wb_r3_g',WB_T1:'wb_t1',WB_T2:'wb_t2',WB_T3:'wb_t3',WB_T4:'wb_t4',WB_T5:'wb_t5'}[kp.kurstyp]||'bgq_g';
          const alleUt=(BKRFQV_THEMEN[_key]||BKRFQV_THEMEN.bgq_g).find(b=>b.nr===bn)?.unterthemen||[];
          if(!alleUt.length) return '';
          // Für einzelne Tage (WB-Module): alle Unterthemen mit KB anzeigen
          // Für Mehrtages-Bänder: kompakte Vorschau
          const isSingleBand = (BKRFQV_THEMEN[_key]||[]).length === 1;
          if(isSingleBand) {
            return '<div style="margin-top:4px;padding-left:8px;border-left:2px solid #f0c5c5">'
              + alleUt.map(u=>`<div style="font-size:9.5px;color:#444;padding:1px 0;display:flex;justify-content:space-between;gap:8px"><span>${u.titel}</span><span style="color:#9ca3af;white-space:nowrap;flex-shrink:0">${u.bkrfqv||''}</span></div>`).join('')
              + '</div>';
          }
          const preview=alleUt.slice(0,3).map(u=>u.titel+(u.bkrfqv?` <span style="color:#9ca3af">(${u.bkrfqv})</span>`:'')).join(' · ')+(alleUt.length>3?` <span style="color:#9ca3af">…</span>`:'');
          return `<div style="font-size:9.5px;color:var(--grau);margin-top:2px;line-height:1.4">${preview}</div>`;
        })()}
      </td>
      <td style="font-size:10px;color:var(--grau)">${k.kenntnisbereich_kb||'–'}</td>
      <td style="text-align:center;font-weight:600">${k.stunden||0}</td>
      <td style="font-size:11px;white-space:nowrap">
        ${k.mitarbeiter?k.mitarbeiter.vorname+' '+k.mitarbeiter.nachname:'–'}
        ${(()=>{
          const m=(k.gegenstand||'').match(/^Band ([^:]+):/);
          const bn=m?m[1].trim():null;
          if(!bn) return '';
          const _key={BGQ_Gueter:'bgq_g',BGQ_Person:'bgq_p',BGQ_Kombi:'kombi_gp',Weiterbildung:'wb_r3_g',WB_T1:'wb_t1',WB_T2:'wb_t2',WB_T3:'wb_t3',WB_T4:'wb_t4',WB_T5:'wb_t5'}[kp.kurstyp]||'bgq_g';
          const abw=(bkrfqgState.dozentUnterthemen||[]).filter(d=>d.band_nr===bn && d.kurstyp===_key);
          if(!abw.length) return '';
          const namen=[...new Set(abw.map(d=>{const f=bkrfqgState.fahrlehrer.find(x=>x.id===d.mitarbeiter_id);return f?f.vorname+' '+f.nachname:'';}).filter(Boolean))];
          return `<div style="font-size:9px;color:#C0001A;margin-top:2px" title="Abweichende Dozenten bei einzelnen Unterthemen">▸ tlw. ${namen.join(', ')}</div>`;
        })()}
      </td>
      <td style="font-size:11px">${k.bkrfqg_raeume?.bezeichnung||'–'}</td>
      ${isKombi?`<td>${gBadge}</td>`:''}
      <td>${mBadge}</td>
      <td class="tbl-actions" style="white-space:nowrap">
        <button class="btn btn-outline btn-sm" onclick="bkrfqgKurstagEdit('${k.id}')">✏️</button>
        <button class="btn btn-outline btn-sm" style="color:var(--rot)" onclick="bkrfqgKurstagLoeschen('${k.id}')">🗑</button>
      </td>
    </tr>`;
  }).join('');

  el.innerHTML += bkrfqgTnKarteHTML(kp);

  el.innerHTML += `
    <div class="card" style="padding:0;overflow-x:auto">
      <table class="ma-table" style="min-width:700px">
        <thead><tr>
          <th>Datum</th><th>Zeit</th><th>Thema</th><th>KB</th><th>Std</th>
          <th>Dozent</th><th>Raum</th>
          ${isKombi?'<th>Gruppe</th>':''}
          <th>Meldung</th><th></th>
        </tr></thead>
        <tbody>${tagRows}</tbody>
      </table>
    </div>
    ${bkrfqgKurstagModalHTML(kp.id)}
    ${bkrfqgKPModalHTML()}
    ${bkrfqgTnModalHTML()}`;
}



// ════════════════════════════════════════════════════════════════════
// LEHRPLAN-DRUCK (Teilnehmer-Lehrplan mit Unterthemen)
// ════════════════════════════════════════════════════════════════════
function bkrfqgDruckenLehrplan(kp) {
  const kt = bkrfqgKPKurstage;
  if (!kp || !kt.length) { toast('Keine Kurstage vorhanden', 'err'); return; }

  const logo  = window.FST_LOGO || '';
  const WT    = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
  const KTyp  = {BGQ_Gueter:'bgq_g',BGQ_Person:'bgq_p',BGQ_Kombi:'kombi_gp',Weiterbildung:'wb_r3_g',WB_T1:'wb_t1',WB_T2:'wb_t2',WB_T3:'wb_t3',WB_T4:'wb_t4',WB_T5:'wb_t5'}[kp.kurstyp] || 'bgq_g';
  const isKombi = kp.kurstyp === 'BGQ_Kombi';
  const totalH = Math.round(kt.reduce((s,k)=>s+(k.stunden||0),0)*10)/10;

  // Band-Nr aus gegenstand: "Band 4G: Titel" → "4G"
  const bandNrAus = g => { const m=(g||'').match(/^Band ([^:]+):/); return m?m[1].trim():null; };
  // Bandtitel ohne "Band X: " Präfix
  const bandTitelAus = g => { const m=(g||'').match(/^Band [^:]+:\s*(.*)/); return m?m[1].trim():(g||''); };

  // Alle Unterthemen für ein Band (bei Kombi liefert der kombi_gp-Key alle Bänder inkl. G+P)
  const alleUt = (bandNr, gruppe) => {
    const arr = BKRFQV_THEMEN[KTyp] || BKRFQV_THEMEN.bgq_g;
    return arr.find(b=>b.nr===bandNr)?.unterthemen || [];
  };

  // Band-Tage-Index aufbauen: wie viele Tage hat Band X?
  const bandTageIdx = {}; // key "bandNr+gruppe" → [datum, datum, ...]
  kt.slice().sort((a,b)=>a.datum.localeCompare(b.datum)).forEach(k => {
    const bn = bandNrAus(k.gegenstand); if(!bn) return;
    const key = bn+'|'+(k.gruppe||'');
    if (!bandTageIdx[key]) bandTageIdx[key] = [];
    if (!bandTageIdx[key].includes(k.datum)) bandTageIdx[key].push(k.datum);
  });

  // Unterthemen für einen bestimmten Tag eines Bandes (zeitproportionale Verteilung)
  const utFuerTag = (bandNr, gruppe, datum) => {
    const all = alleUt(bandNr, gruppe);
    if (!all.length) return [];
    const key = bandNr+'|'+(gruppe||'');
    const tage = bandTageIdx[key] || [datum];
    const dayIdx = tage.indexOf(datum);
    const n = tage.length;
    if (n <= 1) return all;

    const totalMin = all.reduce((s,u)=>s+u.dauer_min,0);
    const minPro = totalMin / n;
    let cursor = 0, acc = 0;

    // Überspringe Tage vor dayIdx
    for (let d=0; d<dayIdx; d++) {
      let dayMin=0;
      while (cursor<all.length && dayMin<minPro) { dayMin+=all[cursor++].dauer_min; }
    }
    // Hole Unterthemen für diesen Tag
    const res = [];
    let dayMin = 0;
    while (cursor<all.length) {
      res.push(all[cursor]);
      dayMin += all[cursor].dauer_min;
      cursor++;
      if (dayIdx < n-1 && dayMin >= minPro) break; // letzter Tag bekommt Rest
    }
    return res;
  };

  // Kurstage nach Datum gruppieren
  const tage = {};
  kt.forEach(k => { const d=k.datum; if(!tage[d])tage[d]=[]; tage[d].push(k); });

  // HTML pro Tag
  const tageHtml = Object.entries(tage).sort(([a],[b])=>a.localeCompare(b)).map(([datum, sessions]) => {
    const d = new Date(datum+'T12:00');
    const wt = WT[d.getDay()];
    const datStr = d.toLocaleDateString('de-DE',{day:'2-digit',month:'long',year:'numeric'});
    const tagH = sessions.reduce((s,k)=>s+(k.stunden||0),0);

    const sessHtml = sessions.map(k => {
      const bandNr  = bandNrAus(k.gegenstand);
      const titel   = bandTitelAus(k.gegenstand);
      const ut      = bandNr ? utFuerTag(bandNr, k.gruppe, datum) : [];
      const doz     = k.mitarbeiter ? k.mitarbeiter.vorname+' '+k.mitarbeiter.nachname : '–';
      const gBadge  = isKombi
        ? (k.gruppe==='gueter' ? '<span style="background:#fef3c7;color:#d97706;padding:1px 5px;border-radius:3px;font-size:8pt">🚛 Güter</span>'
          : k.gruppe==='person' ? '<span style="background:#e0f2fe;color:#0891b2;padding:1px 5px;border-radius:3px;font-size:8pt">🚌 Person</span>'
          : '<span style="color:#888;font-size:8pt">Alle</span>') : '';
      const kb1 = ut[0]?.bkrfqv || k.kenntnisbereich_kb || '';

      return `
        <div style="padding:10px 0 8px;border-bottom:1px solid #f0f0f0">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap">
            <div style="flex:1">
              ${bandNr?`<span style="background:#C0001A;color:#fff;border-radius:4px;padding:1px 7px;font-size:8pt;font-weight:700;margin-right:6px">B${bandNr}</span>`:''}
              <strong style="font-size:11pt;color:#1a1a1a">${titel}</strong>
              ${gBadge?' '+gBadge:''}
              ${kb1?`<span style="font-size:8pt;color:#888;margin-left:6px">${kb1}</span>`:''}
            </div>
            <div style="font-size:8.5pt;color:#444;text-align:right;white-space:nowrap;flex-shrink:0">
              ${(()=>{
                const beg=k.beginn?.slice(0,5)||'08:00';
                const end=k.ende?.slice(0,5)||'15:45';
                const nh=k.stunden||7;
                // Pausenzeit berechnen: Brutto - Netto
                const bMin=parseInt(beg.split(':')[0])*60+parseInt(beg.split(':')[1]);
                const eMin=parseInt(end.split(':')[0])*60+parseInt(end.split(':')[1]);
                const brutto=(eMin-bMin)/60;
                const pMin=Math.round((brutto-nh)*60);
                const pText=pMin>0?` + ${pMin} Min. Pause`:'';
                return `${beg}–${end} Uhr<br><strong>${nh}h Unterricht</strong>${pText?'<br><span style="color:#9ca3af;font-size:7.5pt">'+pText+' (§ 4 ArbZG)</span>':''}`;
              })()} &nbsp;|&nbsp; <em>${doz}</em>
            </div>
          </div>
          ${ut.length ? `
          <div style="margin-top:6px;padding-left:16px;border-left:2px solid #f0c5c5">
            ${ut.map(u=>{
              // Abweichender Dozent für dieses Unterthema?
              const abw = (bkrfqgState.dozentUnterthemen||[]).find(
                d => d.band_nr===bandNr && d.unterthema_id===u.id && d.kurstyp===KTyp);
              let abwName = '';
              if (abw) {
                const f = bkrfqgState.fahrlehrer.find(x=>x.id===abw.mitarbeiter_id);
                if (f) abwName = f.vorname+' '+f.nachname;
              }
              return `
            <div style="display:flex;justify-content:space-between;align-items:baseline;
                padding:2px 0;font-size:8.5pt;color:#444">
              <span>${u.titel}${abwName?` <span style="color:#C0001A;font-size:7.5pt;font-style:italic">▸ ${abwName}</span>`:''}</span>
              <span style="color:#9ca3af;font-size:7.5pt;margin-left:10px;flex-shrink:0">${u.bkrfqv}</span>
            </div>`;
            }).join('')}
          </div>` : ''}
        </div>`;
    }).join('');

    return `
      <div style="margin-bottom:16px;page-break-inside:avoid">
        <div style="background:#fdeaea;border-left:4px solid #C0001A;padding:7px 12px;
            display:flex;justify-content:space-between;align-items:center">
          <div>
            <span style="font-weight:800;font-size:11.5pt;color:#C0001A">${wt}</span>
            <span style="font-size:9.5pt;color:#333;margin-left:10px">${datStr}</span>
          </div>
          <span style="font-size:10pt;font-weight:700;color:#C0001A">${tagH} Std.</span>
        </div>
        <div style="border:1px solid #f0c5c5;border-top:none;padding:0 12px">
          ${sessHtml}
        </div>
      </div>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>Lehrplan – ${kp.titel}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  html{overflow-x:hidden;}
  body{font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;
    font-size:10pt;color:#3F4B57;background:#fff;margin:0;}
  @page{size:A4;margin:12mm 10mm 10mm;}
  @media screen{
    body{max-width:210mm;margin:0 auto;padding:14mm 12mm;}
  }
  @media print{
    html,body{width:auto;overflow:visible;}
    body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  }
</style>
</head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;
      border-bottom:3px solid #C0001A;padding-bottom:8px;margin-bottom:14px">
    <div style="display:flex;align-items:center;gap:14px">
      ${logo?`<img src="${logo}" style="height:48px;object-fit:contain" alt="">`:''}
      <div>
        <div style="font-size:8pt;color:#C0001A;font-weight:700;letter-spacing:.05em;text-transform:uppercase">
          Lehrplan · Berufskraftfahrer-Grundqualifikation · BKrFQV Anlage 1
        </div>
        <div style="font-size:14pt;font-weight:800;margin:2px 0">${bKursTypLabel(kp.kurstyp)}</div>
        <div style="font-size:8.5pt;color:#555">
          ${kp.bkrfqg_standorte?.name||'Fahrschulteam Lingen'} &nbsp;·&nbsp;
          ${bfmtD(kp.startdatum)} – ${bfmtD(kp.enddatum)} &nbsp;·&nbsp;
          <strong>${totalH} Unterrichtsstunden</strong>
        </div>
      </div>
    </div>
    <div id="qrcode"></div>
  </div>
  <div style="display:flex;gap:24px;margin-bottom:12px;font-size:8pt;color:#555;
      padding:6px 10px;background:#f9f9f9;border-radius:4px">
    <span><strong>Träger:</strong> Fahrschulteam Lingen GmbH · Rheiner Str. 158 · 49809 Lingen (Ems)</span>
    <span><strong>AZAV-Nr.:</strong> 0333-10660-AZAV-T</span>
  </div>
  ${tageHtml}
  <div style="margin-top:14px;padding:10px 12px;background:#f9f9f9;border:1px solid #e5e5e5;
      border-radius:4px;font-size:8pt;color:#555;line-height:1.5">
    <strong style="color:#333">Hinweis zu den Pausenzeiten</strong><br>
    Die Pausenzeiten während des Lehrgangs werden entsprechend den Vorgaben des Arbeitszeitgesetzes (ArbZG) eingehalten.
    Die konkrete zeitliche Gestaltung der Pausen erfolgt dabei täglich individuell und orientiert sich am jeweiligen
    Unterrichtsverlauf sowie den organisatorischen Erfordernissen. Die Pausen sind nicht Bestandteil der ausgewiesenen
    Unterrichtsstunden und werden daher nicht auf die Unterrichtszeit angerechnet.
  </div>
  <div style="margin-top:10px;display:flex;justify-content:space-between;font-size:7.5pt;
      color:#aaa;border-top:1px solid #e5e5e5;padding-top:5px">
    <span>Fahrschulteam Lingen GmbH · www.fahrschulteam.info</span>
    <span>Stand: ${new Date().toLocaleString('de-DE')}</span>
  </div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
<script>
  try{new QRCode(document.getElementById('qrcode'),{text:'https://www.fahrschulteam.info',
    width:56,height:56,colorDark:'#1a1a1a',colorLight:'#fff',correctLevel:QRCode.CorrectLevel.M});}catch(e){}
  setTimeout(()=>window.print(),600);
<\/script>
</body></html>`;

  const w = window.open('','_blank','width=900,height=1000');
  w.document.write(html); w.document.close();
}


// ════════════════════════════════════════════════════════════════════
// DOZENTEN-PLÄNE (pro Dozent eine Seite, mit Unterkapiteln)
// ════════════════════════════════════════════════════════════════════
function bkrfqgDruckenDozentenplaene() {
  const kp = bkrfqgState.kursplaene.find(x => x.id === bkrfqgKPSelected);
  const kt = bkrfqgKPKurstage;
  if (!kp || !kt.length) { toast('Keine Kurstage vorhanden', 'err'); return; }

  const logo  = window.FST_LOGO || '';
  const WT    = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
  const KTyp  = {BGQ_Gueter:'bgq_g',BGQ_Person:'bgq_p',BGQ_Kombi:'kombi_gp',Weiterbildung:'wb_r3_g',WB_T1:'wb_t1',WB_T2:'wb_t2',WB_T3:'wb_t3',WB_T4:'wb_t4',WB_T5:'wb_t5'}[kp.kurstyp] || 'bgq_g';

  const bandNrAus    = g => { const m=(g||'').match(/^Band ([^:]+):/); return m?m[1].trim():null; };
  const bandTitelAus = g => { const m=(g||'').match(/^Band [^:]+:\s*(.*)/); return m?m[1].trim():(g||''); };
  const alleUt = (bandNr) => (BKRFQV_THEMEN[KTyp]||BKRFQV_THEMEN.bgq_g).find(b=>b.nr===bandNr)?.unterthemen || [];

  // Band-Tage-Index für zeitproportionale Unterthemen-Verteilung
  const bandTageIdx = {};
  kt.slice().sort((a,b)=>a.datum.localeCompare(b.datum)).forEach(k => {
    const bn = bandNrAus(k.gegenstand); if(!bn) return;
    const key = bn+'|'+(k.gruppe||'');
    if (!bandTageIdx[key]) bandTageIdx[key] = [];
    if (!bandTageIdx[key].includes(k.datum)) bandTageIdx[key].push(k.datum);
  });
  const utFuerTag = (bandNr, gruppe, datum) => {
    const all = alleUt(bandNr);
    if (!all.length) return [];
    const key = bandNr+'|'+(gruppe||'');
    const tage = bandTageIdx[key] || [datum];
    const dayIdx = tage.indexOf(datum);
    const n = tage.length;
    if (n <= 1) return all;
    const totalMin = all.reduce((s,u)=>s+(u.dauer_min||0),0);
    const minPro = totalMin / n;
    let cursor = 0;
    for (let d=0; d<dayIdx; d++) { let dm=0; while (cursor<all.length && dm<minPro) dm+=all[cursor++].dauer_min||0; }
    const res=[]; let dm=0;
    while (cursor<all.length) { res.push(all[cursor]); dm+=all[cursor].dauer_min||0; cursor++; if (dayIdx<n-1 && dm>=minPro) break; }
    return res;
  };

  // Abweichende Unterthema-Dozenten für ein Band
  const abwDozentUt = (bandNr, utId) => {
    const e = (bkrfqgState.dozentUnterthemen||[]).find(d => d.band_nr===bandNr && d.unterthema_id===utId && d.kurstyp===KTyp);
    return e ? e.mitarbeiter_id : null;
  };

  // ── Termine je Dozent sammeln ──────────────────────────────────────
  // Ein Dozent erscheint für einen Kurstag, wenn er entweder Hauptdozent ist
  // ODER mindestens ein Unterthema dieses Kurstags abweichend zugewiesen bekommt.
  const dozTermine = {}; // mitarbeiter_id → [{datum,beginn,ende,bandNr,bandTitel,gruppe,stunden,unterthemen:[{titel,istAbweichend}]}]
  const namen = {};      // mitarbeiter_id → "Vorname Nachname"
  bkrfqgState.fahrlehrer.forEach(f => namen[f.id] = f.vorname+' '+f.nachname);

  kt.slice().sort((a,b)=>(a.datum+a.beginn).localeCompare(b.datum+b.beginn)).forEach(k => {
    const bandNr = bandNrAus(k.gegenstand);
    const bandTitel = bandTitelAus(k.gegenstand);
    const ut = bandNr ? utFuerTag(bandNr, k.gruppe, k.datum) : [];
    const hauptId = k.unterrichtsleiter_id;

    // Unterthemen nach zuständigem Dozenten aufteilen
    const proDozent = {}; // dozentId → [{titel,istAbweichend}]
    ut.forEach(u => {
      const abw = abwDozentUt(bandNr, u.id);
      const zid = abw || hauptId;
      if (!zid) return;
      if (!proDozent[zid]) proDozent[zid] = [];
      proDozent[zid].push({ titel: u.titel, istAbweichend: !!abw });
    });
    // Falls keine Unterthemen (z.B. Praxis-Band): nur Hauptdozent
    if (!ut.length && hauptId) proDozent[hauptId] = [];

    Object.entries(proDozent).forEach(([zid, uListe]) => {
      if (!dozTermine[zid]) dozTermine[zid] = [];
      dozTermine[zid].push({
        datum:k.datum, beginn:k.beginn, ende:k.ende, bandNr, bandTitel,
        gruppe:k.gruppe, stunden:k.stunden, kb:k.kenntnisbereich_kb, unterthemen:uListe
      });
    });
  });

  const dozIds = Object.keys(dozTermine);
  if (!dozIds.length) { toast('Keine Dozenten in diesem Kursplan eingeplant', 'err'); return; }

  const gTag = g => g==='gueter' ? '<span style="background:#fef3c7;color:#d97706;padding:1px 6px;border-radius:3px;font-size:8pt">🚛 Güter</span>'
    : g==='person' ? '<span style="background:#e0f2fe;color:#0891b2;padding:1px 6px;border-radius:3px;font-size:8pt">🚌 Person</span>' : '';

  // ── HTML pro Dozent (je eine Druckseite) ───────────────────────────
  const seiten = dozIds.map(zid => {
    const termine = dozTermine[zid];
    const stdSumme = Math.round(termine.reduce((s,t)=>s+(t.stunden||0),0)*10)/10;
    const tageAnzahl = new Set(termine.map(t=>t.datum)).size;

    const zeilen = termine.map(t => {
      const d = new Date(t.datum+'T12:00');
      const wt = WT[d.getDay()];
      const datStr = d.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});
      const utHtml = t.unterthemen.length
        ? `<div style="margin-top:4px;padding-left:12px;border-left:2px solid #f0c5c5">
             ${t.unterthemen.map(u=>`<div style="font-size:8.5pt;color:#444;padding:1px 0">
               ${u.titel}${u.istAbweichend?' <span style="color:#C0001A;font-size:7.5pt;font-style:italic">(Ihr Unterkapitel)</span>':''}</div>`).join('')}
           </div>`
        : '';
      return `<tr style="border-bottom:1px solid #eee">
        <td style="padding:7px 10px;white-space:nowrap;font-weight:600;vertical-align:top;font-size:9pt">
          ${wt}<br><span style="color:#666;font-weight:400;font-size:8.5pt">${datStr}</span>
        </td>
        <td style="padding:7px 10px;white-space:nowrap;vertical-align:top;font-size:9pt">
          ${t.beginn?.slice(0,5)||'–'}<br>${t.ende?.slice(0,5)||'–'}
        </td>
        <td style="padding:7px 10px;vertical-align:top">
          <div style="font-size:9.5pt;font-weight:600;color:#1a1a1a">
            <span style="background:#C0001A;color:#fff;border-radius:3px;padding:1px 6px;font-size:8pt;margin-right:5px">B${t.bandNr}</span>
            ${t.bandTitel} ${gTag(t.gruppe)}
          </div>
          ${utHtml}
        </td>
        <td style="padding:7px 10px;text-align:center;vertical-align:top;font-weight:700;font-size:9.5pt">${t.stunden||0}h</td>
      </tr>`;
    }).join('');

    return `
    <div style="page-break-after:always">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #C0001A;padding-bottom:8px;margin-bottom:14px">
        <div style="display:flex;align-items:center;gap:14px">
          ${logo?`<img src="${logo}" style="height:44px;object-fit:contain" alt="">`:''}
          <div>
            <div style="font-size:8pt;color:#C0001A;font-weight:700;letter-spacing:.05em;text-transform:uppercase">Persönlicher Dozentenplan · ${bKursTypLabel(kp.kurstyp)}</div>
            <div style="font-size:15pt;font-weight:700;margin:2px 0">${namen[zid]||'Dozent'}</div>
            <div style="font-size:8.5pt;color:#555">
              ${kp.bkrfqg_standorte?.name||'Fahrschulteam Lingen'} · ${bfmtD(kp.startdatum)} – ${bfmtD(kp.enddatum)}
            </div>
          </div>
        </div>
        <div style="text-align:right;font-size:8.5pt;color:#555">
          <div><strong style="font-size:13pt;color:#C0001A">${stdSumme}h</strong></div>
          <div>an ${tageAnzahl} Tag${tageAnzahl!==1?'en':''}</div>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:#C0001A;color:#fff">
            <th style="padding:6px 10px;text-align:left;font-size:8.5pt;font-weight:600">Tag</th>
            <th style="padding:6px 10px;text-align:left;font-size:8.5pt;font-weight:600">Uhrzeit</th>
            <th style="padding:6px 10px;text-align:left;font-size:8.5pt;font-weight:600">Thema / Unterkapitel</th>
            <th style="padding:6px 10px;text-align:center;font-size:8.5pt;font-weight:600">Std.</th>
          </tr>
        </thead>
        <tbody>${zeilen}</tbody>
      </table>

      <div style="margin-top:14px;padding:10px 12px;background:#f9f9f9;border:1px solid #e5e5e5;border-radius:4px;font-size:8pt;color:#555;line-height:1.5">
        <strong style="color:#333">Hinweis zu den Pausenzeiten</strong><br>
        Die Pausenzeiten während des Lehrgangs werden entsprechend den Vorgaben des Arbeitszeitgesetzes (ArbZG) eingehalten. Die konkrete zeitliche Gestaltung der Pausen erfolgt dabei täglich individuell und orientiert sich am jeweiligen Unterrichtsverlauf sowie den organisatorischen Erfordernissen. Die Pausen sind nicht Bestandteil der ausgewiesenen Unterrichtsstunden und werden daher nicht auf die Unterrichtszeit angerechnet.
      </div>

      <div style="margin-top:10px;display:flex;justify-content:space-between;font-size:7.5pt;color:#aaa;border-top:1px solid #e5e5e5;padding-top:5px">
        <span>Fahrschulteam Lingen GmbH · www.fahrschulteam.info · AZAV-Nr. 0333-10660-AZAV-T</span>
        <span>Stand: ${new Date().toLocaleString('de-DE')}</span>
      </div>
    </div>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>Dozenten-Pläne – ${kp.titel}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  html{overflow-x:hidden;}
  body{font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;font-size:10pt;color:#3F4B57;background:#fff;margin:0;}
  @page{size:A4;margin:12mm 10mm 10mm;}
  @media screen{ body{max-width:210mm;margin:0 auto;padding:14mm 12mm;} }
  @media print{
    html,body{width:auto;overflow:visible;}
    body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    div[style*="page-break-after"]:last-child{page-break-after:auto;}
  }
</style>
</head>
<body>
  ${seiten}
<script>setTimeout(()=>window.print(),500);<\/script>
</body></html>`;

  const w = window.open('','_blank','width=900,height=1000');
  w.document.write(html); w.document.close();
}


// ════════════════════════════════════════════════════════════════════
// KURSPLAN DRUCKEN (Teilnehmer- & Dozenten-Version mit Logo + QR-Code)
// ════════════════════════════════════════════════════════════════════
function bkrfqgDrucken(modus) {
  const kp  = bkrfqgState.kursplaene.find(x => x.id === bkrfqgKPSelected);
  if (modus === 'lehrplan') { bkrfqgDruckenLehrplan(kp); return; }
  const kt  = bkrfqgKPKurstage;
  if (!kp || !kt.length) { toast('Keine Kurstage vorhanden', 'err'); return; }

  const isDoz   = modus === 'dozent';
  const isKombi = kp.kurstyp === 'BGQ_Kombi';
  const logo    = window.FST_LOGO || '';
  const WT      = ['So','Mo','Di','Mi','Do','Fr','Sa'];
  const totalH  = Math.round(kt.reduce((s,k)=>s+(k.stunden||0),0)*10)/10;

  // Gruppenfarbe für Kombi
  const gBg = k => isKombi
    ? (k.gruppe==='gueter' ? '#fffbeb' : k.gruppe==='person' ? '#e0f2fe' : '#fff')
    : '#fff';
  const gTag = k => !isKombi ? '' :
    k.gruppe==='gueter' ? '<span style="background:#fef3c7;color:#d97706;border-radius:3px;padding:1px 5px;font-size:9px">🚛 Güter</span>' :
    k.gruppe==='person' ? '<span style="background:#e0f2fe;color:#0891b2;border-radius:3px;padding:1px 5px;font-size:9px">🚌 Person</span>' : '';

  // Tabellenzeilen je Modus
  const rows = kt.map(k => {
    const d = new Date(k.datum+'T12:00');
    const wt = WT[d.getDay()];
    const dtStr = `${wt}, ${d.toLocaleDateString('de-DE')}`;
    const zeit  = `${k.beginn?.slice(0,5)||'–'} – ${k.ende?.slice(0,5)||'–'}`;
    const doz   = k.mitarbeiter ? k.mitarbeiter.vorname+' '+k.mitarbeiter.nachname : '–';
    const raum  = k.bkrfqg_raeume?.bezeichnung || '–';

    if (isDoz) {
      return `<tr style="background:${gBg(k)}">
        <td>${dtStr}</td>
        <td>${zeit}</td>
        <td>${k.gegenstand||'–'} ${gTag(k)}</td>
        <td>${k.kenntnisbereich_kb||'–'}</td>
        <td>${k.stunden||0}</td>
        <td>${doz}</td>
        <td>${raum}</td>
        <td style="color:${k.meldung_status==='gemeldet'?'#059669':'#9ca3af'};font-size:10px">
          ${k.meldung_status==='gemeldet'?'✓ gemeldet':'ausstehend'}
        </td>
      </tr>`;
    } else {
      return `<tr>
        <td>${dtStr}</td>
        <td>${zeit}</td>
        <td>${k.gegenstand||'–'}</td>
        <td>${k.stunden||0}</td>
        <td>${raum}</td>
      </tr>`;
    }
  }).join('');

  const thDoz  = isDoz ? '<th>KB</th><th>Std</th><th>Dozent/in</th><th>Raum</th><th>Meldung</th>'
                        : '<th>Std</th><th>Raum</th>';

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>Kursplan – ${kp.titel}</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  html{overflow-x:hidden;}
  body{font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;font-size:10pt;color:#1a1a1a;background:#fff;margin:0;}
  @page{size:A4 landscape;margin:12mm 10mm 10mm;}
  @media screen{
    body{max-width:297mm;margin:0 auto;padding:12mm;}
  }
  @media print{
    html,body{width:auto;overflow:visible;}
    body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  }

  /* Header */
  .header{display:flex;justify-content:space-between;align-items:flex-start;
    border-bottom:3px solid #C0001A;padding-bottom:8px;margin-bottom:10px;}
  .header-logo img{height:48px;object-fit:contain;}
  .header-info{flex:1;padding:0 16px;}
  .kurs-typ{font-size:9pt;color:#C0001A;font-weight:700;text-transform:uppercase;
    letter-spacing:.05em;margin-bottom:3px;}
  .kurs-titel{font-size:14pt;font-weight:800;color:#1a1a1a;margin-bottom:4px;}
  .kurs-meta{font-size:9pt;color:#555;display:flex;gap:16px;flex-wrap:wrap;}
  .kurs-meta span{display:flex;align-items:center;gap:4px;}
  .header-qr{text-align:right;}
  .qr-label{font-size:8pt;color:#888;margin-top:4px;text-align:center;}

  /* Badges (Kombi) */
  .badges{display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap;}
  .badge{padding:3px 10px;border-radius:4px;font-size:9pt;font-weight:600;}
  .badge-g{background:#fffbeb;color:#d97706;border:1px solid #fde68a;}
  .badge-p{background:#e0f2fe;color:#0891b2;border:1px solid #bae6fd;}
  .badge-k{background:#f3f4f6;color:#374151;border:1px solid #d1d5db;}

  /* Tabelle */
  table{width:100%;border-collapse:collapse;font-size:9.5pt;}
  thead tr{background:#C0001A;color:#fff;}
  thead th{padding:5px 7px;text-align:left;font-weight:600;font-size:9pt;}
  tbody tr:nth-child(even){background:#f9f9f9;}
  tbody tr:hover{background:#f0f0f0;}
  td{padding:4px 7px;border-bottom:1px solid #e5e5e5;vertical-align:top;}
  td:first-child{white-space:nowrap;font-weight:600;}
  td:nth-child(2){white-space:nowrap;}
  .col-thema{max-width:280px;}

  /* Footer */
  .footer{margin-top:10px;display:flex;justify-content:space-between;
    font-size:8pt;color:#9ca3af;border-top:1px solid #e5e5e5;padding-top:6px;}
  .footer strong{color:#555;}
  .azav{background:#f3f4f6;border:1px solid #e5e5e5;border-radius:4px;
    padding:3px 8px;font-size:8pt;color:#374151;}
</style>
</head>
<body>
<div class="header">
  <div class="header-logo">
    ${logo ? `<img src="${logo}" alt="Fahrschulteam Lingen">` : '<div style="font-size:14pt;font-weight:800;color:#C0001A">Fahrschulteam<br>Lingen</div>'}
  </div>
  <div class="header-info">
    <div class="kurs-typ">${isDoz ? 'Dozenten-Kursplan' : 'Teilnehmer-Stundenplan'} · BKrFQG § 11</div>
    <div class="kurs-titel">${bKursTypLabel(kp.kurstyp)} ${isDoz?'':''}– ${kp.bkrfqg_standorte?.name||'Fahrschulteam Lingen'}</div>
    <div class="kurs-meta">
      <span>📅 ${bfmtD(kp.startdatum)} – ${bfmtD(kp.enddatum)}</span>
      <span>⏱ ${totalH} Unterrichtsstunden</span>
      <span>📍 ${kp.bkrfqg_standorte?.name||'Lingen'}</span>
      ${kp.bkrfqg_standorte?.ort?`<span>🏙 ${kp.bkrfqg_standorte.ort}</span>`:''}
    </div>
  </div>
  <div class="header-qr">
    <div id="qrcode"></div>
    <div class="qr-label">fahrschulteam.info</div>
  </div>
</div>

${isKombi ? `<div class="badges">
  <span class="badge badge-k">🔘 Gemeinsam</span>
  <span class="badge badge-g">🚛 Güter-Gruppe</span>
  <span class="badge badge-p">🚌 Person-Gruppe</span>
</div>` : ''}

<table>
  <thead>
    <tr>
      <th>Datum</th>
      <th>Uhrzeit</th>
      <th class="col-thema">Thema / Band</th>
      ${thDoz}
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>

<div class="pausen-hinweis" style="margin-top:14px;padding:10px 12px;background:#f9f9f9;
    border:1px solid #e5e5e5;border-radius:4px;font-size:8pt;color:#555;line-height:1.5">
  <strong style="color:#333">Hinweis zu den Pausenzeiten</strong><br>
  Die Pausenzeiten während des Lehrgangs werden entsprechend den Vorgaben des Arbeitszeitgesetzes (ArbZG) eingehalten.
  Die konkrete zeitliche Gestaltung der Pausen erfolgt dabei täglich individuell und orientiert sich am jeweiligen
  Unterrichtsverlauf sowie den organisatorischen Erfordernissen. Die Pausen sind nicht Bestandteil der ausgewiesenen
  Unterrichtsstunden und werden daher nicht auf die Unterrichtszeit angerechnet.
</div>

<div class="footer">
  <div>
    <strong>Fahrschulteam Lingen GmbH</strong> · Rheiner Str. 158, 49809 Lingen (Ems) ·
    Druck: ${new Date().toLocaleString('de-DE')}
  </div>
  <div class="azav">AZAV-Nr. 0333-10660-AZAV-T</div>
</div>

<script>
new QRCode(document.getElementById('qrcode'), {
  text: 'https://www.fahrschulteam.info',
  width: 72, height: 72,
  colorDark: '#1a1a1a', colorLight: '#ffffff',
  correctLevel: QRCode.CorrectLevel.M
});
setTimeout(() => window.print(), 800);
<\/script>
</body></html>`;

  const w = window.open('', '_blank', 'width=1100,height=820');
  w.document.write(html);
  w.document.close();
}

// ── Kurstag-Bearbeitungs-Modal ────────────────────────────────────────
function bkrfqgKurstagModalHTML(kpId) {
  const fl = bkrfqgState.fahrlehrer;
  const raeume = bkrfqgState.raeume;
  return `
  <div class="modal-overlay" id="bkrfqg-kt-modal">
    <div class="modal" style="width:560px">
      <div class="modal-header">
        <h3 id="bkrfqg-kt-titel">Kurstag</h3>
        <button class="close-btn" onclick="bkrfqgCloseModal('bkrfqg-kt-modal')">×</button>
      </div>
      <div class="modal-body">
        <input type="hidden" id="bkt-id">
        <input type="hidden" id="bkt-kpid" value="${kpId||''}">
        <div class="fgrid">
          <div class="frow"><label>Datum</label><input type="date" id="bkt-datum"></div>
          <div class="frow"><label>Gruppe</label>
            <select id="bkt-gruppe">
              <option value="gemeinsam">Gemeinsam (alle)</option>
              <option value="gueter">🚛 Güter</option>
              <option value="person">🚌 Person</option>
            </select></div>
          <div class="frow"><label>Beginn</label><input type="time" id="bkt-beginn" value="08:00"></div>
          <div class="frow"><label>Ende (inkl. Pausen)</label><input type="time" id="bkt-ende" value="15:45"></div>
          <div class="frow"><label>Netto-Std. (ohne Pausen)</label><input type="number" id="bkt-stunden" min="0" max="10" step="0.5" value="7"><div style="font-size:10px;color:var(--grau);margin-top:2px">0 = zaehlt nicht mit, z. B. Selbststudium</div></div>
          <div class="frow"><label>Dozent</label>
            <select id="bkt-dozent">
              <option value="">– kein –</option>
              ${fl.map(f=>`<option value="${f.id}">${f.vorname} ${f.nachname}</option>`).join('')}
            </select></div>
        </div>
        <div class="frow"><label>Thema / Gegenstand</label><input id="bkt-gegenstand"></div>
        <div class="fgrid">
          <div class="frow"><label>BKrFQV KB</label><input id="bkt-kb" placeholder="z.B. KB 1.1"></div>
          <div class="frow"><label>Raum</label>
            <select id="bkt-raum">
              <option value="">– keiner –</option>
              ${raeume.map(r=>`<option value="${r.id}">${r.bezeichnung}</option>`).join('')}
            </select></div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="bkrfqgCloseModal('bkrfqg-kt-modal')">Abbrechen</button>
        <button class="btn btn-primary" onclick="bkrfqgKurstagSpeichern()">💾 Speichern</button>
      </div>
    </div>
  </div>`;
}

// Thema direkt in der Tabelle aendern.
// Der urspruengliche Text wird gemerkt: Escape stellt ihn wieder her,
// und ein unveraendertes Feld loest keinen Schreibvorgang aus.
let _bkrfqgThemaVorher = '';

function bkrfqgThemaFokus(el){
  _bkrfqgThemaVorher = el.textContent.trim();
  el.style.background = '#fffbea';
  el.style.outline = '1px solid var(--blau)';
}

function bkrfqgThemaTaste(ev, el){
  if(ev.key === 'Enter'){ ev.preventDefault(); el.blur(); }
  if(ev.key === 'Escape'){ ev.preventDefault(); el.textContent = _bkrfqgThemaVorher; el.blur(); }
}

async function bkrfqgThemaSpeichern(el, id){
  el.style.background = '';
  el.style.outline = '';
  const neu = el.textContent.trim();
  const k = bkrfqgKPKurstage.find(x=>x.id===id);
  if(!k) return;
  if(neu === _bkrfqgThemaVorher) return;
  if(!neu){ el.textContent = _bkrfqgThemaVorher; return; }
  // "Band 3: " bleibt erhalten - daran haengen die Unterthemen-Anzeige
  // und die Zuordnung abweichender Dozenten.
  const m = (k.gegenstand||'').match(/^Band [^:]+:\s*/);
  const praefix = m ? m[0] : '';
  try {
    await bkrfqgUpdate('bkrfqg_kurstage', id, { gegenstand: praefix + neu });
    k.gegenstand = praefix + neu;
    _bkrfqgThemaVorher = neu;
    toast('Thema gespeichert');
  } catch(e) {
    el.textContent = _bkrfqgThemaVorher;
    toast('Fehler: '+e.message,'err');
  }
}

// ── Kurstage per Ziehen tauschen ─────────────────────────────────────
let _bkrfqgZiehId = null;

function bkrfqgZiehStart(ev, id){
  _bkrfqgZiehId = id;
  ev.dataTransfer.effectAllowed = 'move';
  try { ev.dataTransfer.setData('text/plain', id); } catch(e) {}
  const tr = ev.currentTarget;
  if(tr && tr.style) tr.style.opacity = '.45';
}

function bkrfqgZiehUeber(ev){
  if(!_bkrfqgZiehId) return;
  ev.preventDefault();
  ev.dataTransfer.dropEffect = 'move';
  const tr = ev.currentTarget;
  if(tr && tr.dataset.kt !== _bkrfqgZiehId) tr.style.outline = '2px solid var(--blau)';
}

function bkrfqgZiehRaus(ev){
  const tr = ev.currentTarget;
  if(tr && tr.style) tr.style.outline = '';
}

function bkrfqgZiehEnde(ev){
  const tr = ev.currentTarget;
  if(tr && tr.style) tr.style.opacity = '';
  document.querySelectorAll('tr[data-kt]').forEach(function(r){ r.style.outline=''; });
  _bkrfqgZiehId = null;
}

async function bkrfqgZiehAb(ev, zielId){
  ev.preventDefault();
  document.querySelectorAll('tr[data-kt]').forEach(function(r){ r.style.outline=''; r.style.opacity=''; });
  const quellId = _bkrfqgZiehId;
  _bkrfqgZiehId = null;
  if(!quellId || quellId === zielId) return;

  const a = bkrfqgKPKurstage.find(x=>x.id===quellId);
  const b = bkrfqgKPKurstage.find(x=>x.id===zielId);
  if(!a || !b) return;
  if(a.meldung_status==='gemeldet' || b.meldung_status==='gemeldet'){
    toast('Gemeldete Kurstage können nicht getauscht werden','err');
    return;
  }

  // Datum und Meldestatus bleiben, wo sie sind - getauscht wird der Inhalt.
  const felder = ['gegenstand','kenntnisbereich_kb','unterrichtsleiter_id',
                  'raum_id','gruppe','stunden','beginn','ende'];
  const nachA = {}, nachB = {};
  felder.forEach(function(f){ nachA[f] = b[f]; nachB[f] = a[f]; });

  try {
    await bkrfqgUpdate('bkrfqg_kurstage', a.id, nachA);
    await bkrfqgUpdate('bkrfqg_kurstage', b.id, nachB);
    toast('Kurstage getauscht ✓');
    await bkrfqgKPOeffnen(a.kursplan_id);
  } catch(e) {
    toast('Fehler beim Tauschen: '+e.message,'err');
  }
}

function bkrfqgKurstagEdit(id) {
  const k = bkrfqgKPKurstage.find(x=>x.id===id); if(!k)return;
  document.getElementById('bkt-id').value = k.id;
  document.getElementById('bkt-kpid').value = k.kursplan_id;
  document.getElementById('bkt-datum').value = k.datum||'';
  document.getElementById('bkt-beginn').value = k.beginn?.slice(0,5)||'08:00';
  document.getElementById('bkt-ende').value = k.ende?.slice(0,5)||'15:30';
  // Nicht ||7: sonst wuerde eine gespeicherte 0 als 7 angezeigt.
  document.getElementById('bkt-stunden').value = (k.stunden==null?7:k.stunden);
  document.getElementById('bkt-gegenstand').value = k.gegenstand||'';
  document.getElementById('bkt-kb').value = k.kenntnisbereich_kb||'';
  document.getElementById('bkt-dozent').value = k.unterrichtsleiter_id||'';
  document.getElementById('bkt-raum').value = k.raum_id||'';
  document.getElementById('bkt-gruppe').value = k.gruppe||'gemeinsam';
  document.getElementById('bkrfqg-kt-titel').textContent = 'Kurstag bearbeiten';
  bkrfqgOpenModal('bkrfqg-kt-modal');
}

function bkrfqgKurstagNeu(kpId) {
  ['bkt-id','bkt-gegenstand','bkt-kb'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  document.getElementById('bkt-kpid').value = kpId||'';
  document.getElementById('bkt-datum').value = '';
  document.getElementById('bkt-beginn').value = '08:00';
  document.getElementById('bkt-ende').value = '15:45';
  document.getElementById('bkt-stunden').value = '7';
  document.getElementById('bkt-dozent').value = '';
  document.getElementById('bkt-raum').value = '';
  document.getElementById('bkt-gruppe').value = 'gemeinsam';
  document.getElementById('bkrfqg-kt-titel').textContent = 'Neuer Kurstag';
  bkrfqgOpenModal('bkrfqg-kt-modal');
}

async function bkrfqgKurstagSpeichern() {
  const id = document.getElementById('bkt-id').value;
  const kpId = document.getElementById('bkt-kpid').value;
  const kp = bkrfqgState.kursplaene.find(k=>k.id===kpId);
  const payload = {
    kursplan_id: kpId,
    standort_id: kp?.standort_id||null,
    datum: document.getElementById('bkt-datum').value,
    beginn: document.getElementById('bkt-beginn').value+':00',
    ende: document.getElementById('bkt-ende').value+':00',
    stunden: (function(){ const v=parseFloat(document.getElementById('bkt-stunden').value);
                          return isNaN(v)?7:v; })(),   // 0 ist gueltig
    gegenstand: document.getElementById('bkt-gegenstand').value,
    kenntnisbereich_kb: document.getElementById('bkt-kb').value||null,
    unterrichtsleiter_id: document.getElementById('bkt-dozent').value||null,
    raum_id: document.getElementById('bkt-raum').value||null,
    gruppe: document.getElementById('bkt-gruppe').value||'gemeinsam',
    meldung_status: 'ausstehend',
  };
  try {
    if(id) await bkrfqgUpdate('bkrfqg_kurstage',id,payload);
    else   await bkrfqgInsert('bkrfqg_kurstage',payload);
    toast('Kurstag gespeichert ✓');
    bkrfqgCloseModal('bkrfqg-kt-modal');
    await bkrfqgKPOeffnen(kpId);
  } catch(e) { toast('Fehler: '+e.message,'err'); }
}

async function bkrfqgKurstagLoeschen(id) {
  const k = bkrfqgKPKurstage.find(x=>x.id===id); if(!k)return;
  if(!confirm(`Kurstag ${bfmtD(k.datum)} löschen?`))return;
  try {
    await bkrfqgDelete('bkrfqg_kurstage',id);
    toast('Kurstag gelöscht');
    await bkrfqgKPOeffnen(k.kursplan_id);
  } catch(e) { toast('Fehler: '+e.message,'err'); }
}

function bkrfqgOstern(y){const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mo=Math.floor((h+l-7*m+114)/31),day=((h+l-7*m+114)%31)+1;return new Date(y,mo-1,day);}
// Lokales Datum als YYYY-MM-DD (KEIN toISOString → vermeidet Zeitzonen-Verschiebung!)
function bkrfqgYMD(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
// Liefert ein Set aller Feiertags-Daten (YYYY-MM-DD) für ein Jahr (Niedersachsen)
function bkrfqgFeiertageSet(y){
  const o=bkrfqgOstern(y);const ad=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x;};
  return new Set([
    new Date(y,0,1),   // Neujahr
    ad(o,-2),          // Karfreitag
    o,                 // Ostersonntag
    ad(o,1),           // Ostermontag
    new Date(y,4,1),   // Tag der Arbeit
    ad(o,39),          // Christi Himmelfahrt
    ad(o,49),          // Pfingstsonntag
    ad(o,50),          // Pfingstmontag
    new Date(y,9,3),   // Tag der Deutschen Einheit (3. Oktober)
    new Date(y,9,31),  // Reformationstag (31. Oktober, Niedersachsen)
    new Date(y,11,25), // 1. Weihnachtstag
    new Date(y,11,26), // 2. Weihnachtstag
  ].map(bkrfqgYMD));
}
function bkrfqgFeiertage(y){return [...bkrfqgFeiertageSet(y)].join(', ');}
// Prüft ob ein Datum (YYYY-MM-DD) ein Wochenende oder Feiertag ist
function bkrfqgIstFrei(ymd){
  const d=new Date(ymd+'T12:00');
  const wd=d.getDay();
  if(wd===0||wd===6)return true; // Sa/So
  return bkrfqgFeiertageSet(d.getFullYear()).has(ymd);
}
// Nächster gültiger Werktag ab (einschließlich) einem Datum
function bkrfqgNaechsterWerktag(d){
  const x=new Date(d);
  while(bkrfqgIstFrei(bkrfqgYMD(x))) x.setDate(x.getDate()+1);
  return x;
}

// ════════════════════════════════════════════════════════════════════
// KURSMELDUNG
// ════════════════════════════════════════════════════════════════════
async function bkrfqgKursmeldung(el) {
  el.innerHTML = bKopf('📨 Kursmeldung','§ 11 Abs. 4 BKrFQG – Meldung 5 Werktage vor Unterricht')
    + '<div class="loading"><div class="spinner"></div>Lade Kurstage …</div>';
  try {
    const kurstage=await bkrfqgSB('bkrfqg_kurstage',{
      select:'*,bkrfqg_kursplaene(titel,kurstyp),bkrfqg_standorte(name,behoerde_name,behoerde_email,behoerde_ort,strasse,plz,ort),bkrfqg_raeume(bezeichnung),mitarbeiter(vorname,nachname)',
      order:'datum'
    });
    window._bkrfqgKurstage=kurstage;
    // Tage ohne Unterrichtsstunden (z. B. Selbststudium) sind kein
    // Praesenzunterricht nach BKrFQV und duerfen der Behoerde nicht als
    // solcher gemeldet werden.
    const ausstehend=kurstage.filter(k=>k.meldung_status==='ausstehend');
    // Nur eine ausdrueckliche 0 gilt als unterrichtsfrei. Fehlt der Wert,
    // wird gemeldet - eine versaeumte Meldung waegt schwerer als eine
    // ueberfluessige.
    const istFrei=k=>k.stunden!=null&&Number(k.stunden)===0;
    const offene=ausstehend.filter(k=>!istFrei(k));
    const ohneStd=ausstehend.filter(istFrei);
    const heute=new Date();
    const w5=(datum)=>{const d=new Date(datum+'T12:00');let wt=0;while(wt<5){d.setDate(d.getDate()-1);if(d.getDay()>0&&d.getDay()<6)wt++;}return d;};

    el.innerHTML = bKopf('📨 Kursmeldung','§ 11 Abs. 4 BKrFQG – Meldung 5 Werktage vor Unterricht',
      '<button class="btn btn-outline btn-sm" onclick="bkrfqgKursmeldung(document.getElementById(\'bkrfqg-content\'))">↻ Aktualisieren</button>')
      + `<div class="card" style="background:#fffbeb;border-color:#fde68a;padding:10px 14px;font-size:12px;margin-bottom:16px;color:#92400e">
          ⚠️ Jede Schulung muss der Behörde spätestens 5 Werktage vorher gemeldet werden. Ausfall bis 1 Werktag vorher.
        </div>
        <div class="card" style="padding:14px 16px">
          <div class="card-titel" style="margin-bottom:12px">Ausstehende Meldungen (${offene.length})</div>
          ${offene.length===0
            ? '<div style="color:#059669;font-size:13px;padding:8px 0">✓ Alle Kurstage gemeldet.</div>'
            : `<table class="ma-table"><thead><tr><th>Kurstag</th><th>Gegenstand</th><th>Standort</th><th>Meldung bis</th><th></th></tr></thead>
               <tbody>${offene.map(k=>{
                 const frist=w5(k.datum); const t=Math.round((frist-heute)/86400000);
                 return `<tr>
                   <td style="font-weight:600;color:var(--dunkel)">${bfmtD(k.datum)}<br><span style="font-size:11px;color:var(--grau);font-weight:400">${k.beginn?.slice(0,5)||''}–${k.ende?.slice(0,5)||''}</span></td>
                   <td>${k.gegenstand}</td>
                   <td>${k.bkrfqg_standorte?.name||'–'}</td>
                   <td>${bAmpel(t)}</td>
                   <td class="tbl-actions"><button class="btn btn-primary btn-sm" onclick="bkrfqgMelden('${k.id}')">📨 Melden</button></td>
                 </tr>`;
               }).join('')}</tbody></table>`}
        </div>
        ${ohneStd.length===0 ? '' : `<div class="card" style="padding:10px 14px;font-size:12px;color:var(--grau);margin-top:12px">
          ${ohneStd.length} Kurstag${ohneStd.length===1?'':'e'} ohne Unterrichtsstunden (z. B. Selbststudium) &ndash; nicht meldepflichtig:
          ${ohneStd.map(k=>bfmtD(k.datum)+' '+(k.gegenstand||'')).join(' \u00b7 ')}
        </div>`}`;
  } catch(e){ el.innerHTML=bKopf('📨 Kursmeldung')+`<div class="card" style="padding:20px;color:var(--rot)">Fehler: ${e.message}</div>`; }
}
async function bkrfqgMelden(id) {
  const k=window._bkrfqgKurstage?.find(x=>x.id===id); if(!k)return;
  // Sicherheitsnetz: auch bei direktem Aufruf nichts ohne Unterricht melden.
  if(k.stunden!=null&&Number(k.stunden)===0){toast('Tage ohne Unterrichtsstunden werden nicht gemeldet','err');return;}
  const email=k.bkrfqg_standorte?.behoerde_email;
  if(!email){toast('Keine Behörden-E-Mail hinterlegt!','err');return;}
  toast('KI formuliert Kursmeldung …','',10000);
  try {
    const result=await bkrfqgKI('kursmeldung_formulieren',{
      kurstag:{datum:k.datum,beginn:k.beginn?.slice(0,5)||'',ende:k.ende?.slice(0,5)||'',gegenstand:k.gegenstand,kenntnisbereich_kb:k.kenntnisbereich_kb,raum:k.bkrfqg_raeume?.bezeichnung||'',unterrichtsart:'Präsenz'},
      standort:{name:k.bkrfqg_standorte?.name||'',strasse:k.bkrfqg_standorte?.strasse||'',plz:k.bkrfqg_standorte?.plz||'',ort:k.bkrfqg_standorte?.ort||'',behoerde_name:k.bkrfqg_standorte?.behoerde_name||'',behoerde_ort:k.bkrfqg_standorte?.behoerde_ort||''},
      fahrlehrer:k.mitarbeiter?k.mitarbeiter.vorname+' '+k.mitarbeiter.nachname:'–',
    });
    await fetch('/.netlify/functions/send-email',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({to:email,toName:k.bkrfqg_standorte?.behoerde_name||'Behörde',subject:result.betreff,htmlContent:result.text_html})});
    await bkrfqgUpdate('bkrfqg_kurstage',id,{meldung_status:'gemeldet',gemeldet_am:new Date().toISOString()});
    toast('Kursmeldung versendet ✓');
    bkrfqgKursmeldung(document.getElementById('bkrfqg-content'));
  } catch(e){toast('Fehler: '+e.message,'err');}
}


// ════════════════════════════════════════════════════════════════════
// KURSTEILNEHMER – Erfassung entfernt
// ════════════════════════════════════════════════════════════════════
// Teilnehmer werden ausschliesslich im Dialog "Lehrgang dokumentieren"
// (schulung.html) erfasst. Modal, Formular und Handler sind hier entfallen.
// Die Tabelle bkrfqg_kursplan_teilnehmer bleibt bestehen und behaelt ihre
// Altdaten - nur bkrfqgKBAMeldung() liest sie noch, bis der Export auf die
// Lehrgangsteilnehmer umgebaut ist.

// Erzeugt die KBA-Meldung als Druckansicht. Wird derzeit von keinem Knopf
// aufgerufen (siehe Hinweis in der Kursplan-Kopfzeile) und bleibt nur
// erhalten, damit der Umbau darauf aufsetzen kann.
async function bkrfqgKBAMeldung(kursplanId) {
  const kp = bkrfqgState.kursplaene.find(x => x.id === kursplanId);
  if (!kp) return;
  let tn = [];
  try { tn = await bkrfqgSB('bkrfqg_kursplan_teilnehmer', { select: '*', filter: { kursplan_id: kursplanId }, order: 'nachname' }); } catch(e) {}
  const gLabel = { m: 'männlich', w: 'weiblich', d: 'divers' };
  const logo = window.FST_LOGO || '';
  const heute = new Date().toLocaleDateString('de-DE');
  const html = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>KBA-Meldung</title>
<style>body{font-family:Arial,sans-serif;font-size:10pt;color:#111;margin:0;padding:20px}
h2{font-size:11pt;margin:16px 0 6px;color:#C0001A;border-bottom:2px solid #C0001A;padding-bottom:3px}
table{width:100%;border-collapse:collapse}th{background:#C0001A;color:#fff;padding:5px 8px;font-size:9pt;text-align:left}
td{padding:5px 8px;border-bottom:1px solid #e5e5e5;font-size:9pt}tr:nth-child(even) td{background:#fafafa}
.fehlend{color:#C0001A;font-weight:700}</style></head><body>
<div style="display:flex;justify-content:space-between;margin-bottom:16px">
  <div><h1 style="font-size:14pt;margin:0 0 4px">BKrFQG-Meldung an KBA</h1>
  <div style="font-size:9pt;color:#666">§ 5 Abs. 3 BKrFQV · Stand: ${heute}</div></div>
  ${logo?'<img src="'+logo+'" style="height:40px">':''}
</div>
<h2>Kurs</h2>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 20px;font-size:9.5pt;margin-bottom:12px">
  <div><span style="color:#666">Titel:</span> <strong>${kp.titel}</strong></div>
  <div><span style="color:#666">Kurstyp:</span> ${bKursTypLabel(kp.kurstyp)}</div>
  <div><span style="color:#666">Beginn:</span> ${bfmtD(kp.startdatum)}</div>
  <div><span style="color:#666">Ende:</span> ${bfmtD(kp.enddatum)}</div>
</div>
<h2>Teilnehmer (${tn.length})</h2>
${tn.length===0?'<div style="color:#C0001A">⚠️ Keine Teilnehmer eingetragen.</div>':`
<table><thead><tr><th>#</th><th>Nachname</th><th>Vorname</th><th>Geburtsdatum</th><th>Geburtsort</th><th>Geschlecht</th><th>FS-Klasse</th></tr></thead>
<tbody>${tn.map((t,i)=>`<tr><td>${i+1}</td><td><strong>${t.nachname}</strong></td><td>${t.vorname}</td>
<td>${t.geburtsdatum?new Date(t.geburtsdatum+'T12:00').toLocaleDateString('de-DE'):'<span class="fehlend">fehlt</span>'}</td>
<td>${t.geburtsort||'<span class="fehlend">fehlt</span>'}</td>
<td>${t.geschlecht?gLabel[t.geschlecht]:'<span class="fehlend">fehlt!</span>'}</td>
<td>${t.fs_klasse||'–'}</td></tr>`).join('')}</tbody></table>
<div style="margin-top:8px;font-size:9pt;color:#666">Gesamt: ${tn.length} · männlich: ${tn.filter(t=>t.geschlecht==='m').length} · weiblich: ${tn.filter(t=>t.geschlecht==='w').length} · divers: ${tn.filter(t=>t.geschlecht==='d').length}</div>`}
<div style="margin-top:32px;font-size:9pt;color:#666;border-top:1px solid #ddd;padding-top:10px">
Fahrschulteam Lingen GmbH · Rheiner Str. 158 · 49809 Lingen · AZAV-Nr. 0333-10660-AZAV-T · Erstellt: ${heute}</div>
</body></html>`;
  const w = window.open('','_blank','width=900,height=800');
  w.document.write(html); w.document.close(); setTimeout(()=>w.print(),600);
}


// ════════════════════════════════════════════════════════════════════
// ANTRAG
// ════════════════════════════════════════════════════════════════════
function bkrfqgAntrag(el) {
  bkrfqgChipStil();
  const vorausgewählt=bkrfqgState.antragStandortId||'';
  el.innerHTML = bKopf('📋 Anerkennungsantrag','§ 9 BKrFQG i.V.m. § 5 BKrFQV')
    + `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div style="display:flex;flex-direction:column;gap:12px">
          <div class="card" style="padding:14px 16px">
            <div class="card-titel" style="margin-bottom:10px">1. Standort & Typ</div>
            <div class="frow"><label>Standort</label>
              <select id="ba-standort" onchange="bkrfqgAntragUpdate()">
                <option value="">– auswählen –</option>
                ${bkrfqgState.standorte.map(s=>`<option value="${s.id}" ${s.id===vorausgewählt?'selected':''}>${s.name}</option>`).join('')}
              </select></div>
            <div class="frow"><label>Antragstyp</label>
              <select id="ba-typ" onchange="bkrfqgAntragUpdate()">
                <option value="Erstantrag">Erstantrag</option>
                <option value="Erweiterung">Erweiterung</option>
                <option value="Aenderung">Änderungsmitteilung</option>
              </select></div>
            <div class="frow"><label>Kurstypen</label>
              <div class="chip-grid" style="margin-top:4px">
                <label class="chip"><input type="checkbox" id="ba-au-g" onchange="bkrfqgAntragUpdate()">BGQ Güterkraftverkehr</label>
                <label class="chip"><input type="checkbox" id="ba-au-p" onchange="bkrfqgAntragUpdate()">BGQ Personenverkehr</label>
                <label class="chip"><input type="checkbox" id="ba-au-w" onchange="bkrfqgAntragUpdate()">BKF-Weiterbildung</label>
              </div></div>
          </div>
          <div class="card" style="padding:14px 16px">
            <div class="card-titel" style="margin-bottom:10px">2. Aktionen</div>
            <div style="display:flex;flex-direction:column;gap:8px">
              <button class="btn btn-sm" style="background:#6A1B9A;color:#fff;border-color:#6A1B9A" onclick="bkrfqgAntragPruefen()">✨ KI-Vollständigkeitsprüfung</button>
              <button class="btn btn-primary btn-sm" onclick="bkrfqgAntragSenden()">📧 Antrag per E-Mail senden</button>
            </div>
            <div id="ba-pruef-result" style="margin-top:12px"></div>
          </div>
        </div>
        <div class="card" style="padding:14px 16px">
          <div class="card-titel" style="margin-bottom:10px">Anschreiben-Vorschau</div>
          <div id="ba-vorschau" style="background:var(--hell);border-radius:var(--radius);padding:14px;font-size:12px;font-family:monospace;white-space:pre-wrap;min-height:340px;max-height:520px;overflow-y:auto;color:var(--dunkel);border:1px solid var(--border)">← Standort wählen</div>
        </div>
      </div>`;
  if(vorausgewählt)bkrfqgAntragUpdate();
}
function bkrfqgAntragUpdate() {
  const sid=document.getElementById('ba-standort').value;
  const s=bkrfqgState.standorte.find(x=>x.id===sid); if(!s)return;
  const heute=new Date().toLocaleDateString('de-DE');
  const typ=document.getElementById('ba-typ')?.value||'Erstantrag';
  const umfang=[];
  if(document.getElementById('ba-au-g')?.checked)umfang.push('BGQ Güterkraftverkehr (Klasse C)');
  if(document.getElementById('ba-au-p')?.checked)umfang.push('BGQ Personenverkehr (Klasse D)');
  if(document.getElementById('ba-au-w')?.checked)umfang.push('Weiterbildung');
  const text=`Fahrschulteam Lingen
Rheiner Str. 158 · 49809 Lingen (Ems)
Tel: 0591 / 912340 · info@fahrschulteam.info

${s.behoerde_name||'Zuständige Behörde'}
${s.behoerde_abteilung||''}
${s.behoerde_strasse||''}
${s.behoerde_plz||''} ${s.behoerde_ort||''}
${s.behoerde_ansprechpartner?'z.Hd. '+s.behoerde_ansprechpartner:''}

Lingen, ${heute}

Betreff: ${typ} auf Anerkennung als Ausbildungsstätte
         gem. § 9 BKrFQG i.V.m. § 5 BKrFQV
         Unterrichtsort: ${s.name}, ${s.strasse||''}, ${s.plz||''} ${s.ort||''}

Sehr geehrte Damen und Herren,

hiermit beantragen wir die Anerkennung der o.g. Ausbildungsstätte
für folgende Maßnahmen:
${umfang.map(u=>'  • '+u).join('\n')||'  (bitte Kurstypen auswählen)'}

Dem Antrag beigefügt sind gemäß § 5 BKrFQV:
  1. Ausbildungsprogramm mit Kenntnisbereichen (Anlage 1 BKrFQV)
  2. Nachweise Lehrpersonal (Qualifikationen, Didaktik, BKF-Erfahrung)
  3. Angaben zu Unterrichtsräumen und Lehrmitteln
  4. Führungszeugnis (Belegart „N") des Inhabers
  5. Maximale Teilnehmerzahl

Mit freundlichen Grüßen

Thorsten Gels
Inhaber Fahrschulteam Lingen
AZAV: 0333-10660-AZAV-T`;
  const v=document.getElementById('ba-vorschau'); if(v)v.textContent=text;
}
async function bkrfqgAntragPruefen() {
  const sid=document.getElementById('ba-standort').value;
  const s=bkrfqgState.standorte.find(x=>x.id===sid);
  if(!s){toast('Bitte Standort wählen','err');return;}
  toast('KI prüft Vollständigkeit …','',10000);
  try {
    const raeume=bkrfqgState.raeume.filter(r=>r.standort_id===sid);
    const kurstypen=[];
    if(document.getElementById('ba-au-g')?.checked)kurstypen.push('BGQ_Gueter');
    if(document.getElementById('ba-au-p')?.checked)kurstypen.push('BGQ_Person');
    if(document.getElementById('ba-au-w')?.checked)kurstypen.push('Weiterbildung');
    const result=await bkrfqgKI('antrag_pruefen',{standort:s,fahrlehrer:bkrfqgState.fahrlehrer,raeume,dokumente:[],kurstypen});
    const p=result.pruefung;
    const farbe={vollstaendig:'#059669',unvollstaendig:'var(--gelb)',kritisch:'var(--rot)'}[p.gesamtstatus]||'var(--grau)';
    document.getElementById('ba-pruef-result').innerHTML=`
      <div class="card" style="border:2px solid ${farbe};padding:12px;margin-top:8px">
        <div style="font-weight:700;color:${farbe};margin-bottom:6px;font-size:13px">✨ ${p.gesamtstatus.toUpperCase()}</div>
        <div style="font-size:12px;margin-bottom:8px;color:var(--dunkel)">${p.bewertung}</div>
        ${(p.punkte||[]).map(pt=>`<div style="font-size:11px;margin-bottom:4px;color:var(--dunkel)">${pt.status==='ok'?'✅':pt.status==='warnung'?'⚠️':'❌'} <strong>${pt.kategorie}:</strong> ${pt.text}</div>`).join('')}
      </div>`;
    toast('KI-Prüfung abgeschlossen ✓');
  } catch(e){toast('KI-Fehler: '+e.message,'err');}
}
async function bkrfqgAntragSenden() {
  const sid=document.getElementById('ba-standort').value;
  const s=bkrfqgState.standorte.find(x=>x.id===sid);
  if(!s){toast('Bitte Standort wählen','err');return;}
  if(!s.behoerde_email){toast('Keine Behörden-E-Mail hinterlegt!','err');return;}
  const text=document.getElementById('ba-vorschau')?.textContent||'';
  const typ=document.getElementById('ba-typ')?.value||'Erstantrag';
  try {
    await fetch('/.netlify/functions/send-email',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({to:s.behoerde_email,toName:s.behoerde_name||'Behörde',subject:`${typ} § 9 BKrFQG – ${s.name}`,htmlContent:`<pre style="font-family:Arial;font-size:13px;line-height:1.7;white-space:pre-wrap">${text}</pre>`})});
    await bkrfqgInsert('bkrfqg_antraege',{standort_id:sid,typ,status:'eingereicht',eingereicht_am:new Date().toISOString().split('T')[0]});
    toast('Antrag versendet und gespeichert ✓');
  } catch(e){toast('Fehler: '+e.message,'err');}
}

// ════════════════════════════════════════════════════════════════════
// DOKUMENTE
// ════════════════════════════════════════════════════════════════════
async function bkrfqgDokumente(el) {
  el.innerHTML = bKopf('📁 Dokumente & Scans','Bescheide, Verträge, Nachweise')
    + '<div class="loading"><div class="spinner"></div>Lade Dokumente …</div>';
  try {
    const docs=await sb.from('bkrfqg_dokumente').select('*').order('hochgeladen_am',{ascending:false});
    el.innerHTML = bKopf('📁 Dokumente & Scans','Bescheide, Verträge, Nachweise',
      `<label class="btn btn-primary btn-sm" style="cursor:pointer;margin:0">📤 Hochladen<input type="file" style="display:none" accept=".pdf,.jpg,.jpeg,.png" onchange="bkrfqgDokUpload(this)"></label>`)
      + `<div class="card" style="background:#eff6ff;border-color:#bfdbfe;padding:10px 14px;font-size:12px;margin-bottom:16px;color:#1e40af">
          💡 Anerkennungsbescheide besser direkt beim Standort hochladen → KI liest automatisch aus.
        </div>`
      + (!docs.data?.length
        ? bLeer('📁','Keine Dokumente','Noch keine Dokumente hochgeladen.')
        : `<div class="card" style="padding:12px">${docs.data.map(d=>`
            <div style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:8px;border:1px solid var(--border);margin-bottom:8px">
              <span style="font-size:22px">${d.mime_type?.includes('pdf')?'📄':'🖼️'}</span>
              <div style="flex:1;min-width:0">
                <div style="font-weight:600;font-size:13px;color:var(--dunkel);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${d.dateiname}</div>
                <div style="font-size:11px;color:var(--grau)">${d.bezug_typ} · ${d.kategorie} · ${bfmtD(d.hochgeladen_am)}</div>
              </div>
              <button class="btn btn-outline btn-sm" onclick="bkrfqgDokOeffnen('${d.storage_path}')">👁 Öffnen</button>
            </div>`).join('')}</div>`);
  } catch(e){ el.innerHTML=bKopf('📁 Dokumente')+`<div class="card" style="padding:20px;color:var(--rot)">Fehler: ${e.message}</div>`; }
}
async function bkrfqgDokUpload(input) {
  const file=input.files[0]; if(!file)return;
  const ext=file.name.split('.').pop();
  const path=`allgemein/${Date.now()}.${ext}`;
  try {
    const {error}=await sb.storage.from('bkrfqg-dokumente').upload(path,file,{upsert:true});
    if(error)throw error;
    await bkrfqgInsert('bkrfqg_dokumente',{bezug_typ:'standort',bezug_id:bkrfqgState.standorte[0]?.id||'00000000-0000-0000-0000-000000000000',kategorie:'Sonstiges',dateiname:file.name,storage_path:path,mime_type:file.type,groesse_bytes:file.size});
    toast('Dokument hochgeladen ✓');
    bkrfqgDokumente(document.getElementById('bkrfqg-content'));
  } catch(e){toast('Upload-Fehler: '+e.message,'err');}
  input.value='';
}
async function bkrfqgDokOeffnen(path) {
  try {
    const {data,error}=await sb.storage.from('bkrfqg-dokumente').createSignedUrl(path,3600);
    if(error)throw error;
    window.open(data.signedUrl,'_blank');
  } catch(e){toast('Fehler: '+e.message,'err');}
}


// ════════════════════════════════════════════════════════════════════
// BGQ-TEILNEHMER + BQR-MELDUNG ANS KBA (§ 5 BKrFQG)
// ════════════════════════════════════════════════════════════════════
// Die Teilnehmerliste haelt KEINE Personendaten, sondern nur die
// Verknuepfung auf schulung_participants plus die kursbezogenen Angaben
// (Pruefungsart, Meldestatus). Eine Korrektur am Geburtsdatum wirkt damit
// ueberall - bei einer KBA-Meldung ist genau das entscheidend.
//
// Die Weiterbildungs-Meldung liegt weiterhin in schulung.html und wird
// von hier aus nicht beruehrt.

// Kenntnisbereich-Codes des KBA je BKrFQV-Nummer (Anlage 1).
// HINWEIS zur XSD vom KBA: dort widersprechen sich Muster und Aufzaehlung -
// das Muster 0[0-9]|1[0-8]|7[12]|9[89] laesst 19 und 20 nicht zu, die
// Aufzaehlung listet sie. Eine lokale Schemapruefung schlaegt deshalb fehl.
// Das Portal selbst nimmt 19 an (Modul 2G ist durchgelaufen), das Muster in
// der veroeffentlichten XSD ist also veraltet. Nicht "korrigieren".
// 05 und 18 sind laut XSD ungueltig: 05 lief zum 31.03.2025 aus und wurde
// in 19 (1.4) und 20 (1.6) getrennt.
const BGQ_KB_CODE = {'1.1':'01','1.2':'02','1.3':'03','1.3a':'04','1.4':'19','1.5':'06','1.6':'20',
                     '2.1':'07','2.2':'08','2.3':'09','3.1':'10','3.2':'11','3.3':'12','3.4':'13',
                     '3.5':'14','3.6':'15','3.7':'16','3.8':'17'};

// Kenntnisbereiche je Kurstyp nach dem DEGENER-Rahmenplan.
// Guetertransport: Band 4G deckt nur 1.4 ab (Code 19).
// Personenverkehr: Band 4P deckt 1.5 UND 1.6 ab (Codes 06 und 20) -
// die Ladungssicherung im Omnibus gehoert dorthin, nicht zum Gueterverkehr.
const BGQ_KB_TYP = {
  BGQ_Gueter: ['01','02','03','04','07','08','10','11','12','13','14','15','16','19'],
  BGQ_Person: ['01','02','03','04','06','07','09','10','11','12','13','14','15','17','20'],
  BGQ_Kombi:  ['01','02','03','04','06','07','08','09','10','11','12','13','14','15','16','17','19','20'],
};
const BGQ_KLASSEN = {
  BGQ_Gueter: ['C1','C1E','C','CE'],
  BGQ_Person: ['D1','D1E','D','DE'],
  BGQ_Kombi:  ['C1','C1E','C','CE','D1','D1E','D','DE'],
};
// Zielqualifikation je Teilnehmer. Der Kurstyp gibt nur die Vorbelegung vor:
// in einem Kombi-Kurs kann ein Umsteiger mitlaufen, der nur einen Zweig
// dazuerwirbt und deshalb weniger gemeldet bekommt.
const BGQ_QUALI = {
  gueter: { label:'Güterkraftverkehr', klassen:['C1','C1E','C','CE'] },
  person: { label:'Personenverkehr',   klassen:['D1','D1E','D','DE'] },
  kombi:  { label:'Güter + Person',    klassen:['C1','C1E','C','CE','D1','D1E','D','DE'] },
};
function bgqQualiAusTyp(kurstyp){
  return kurstyp==='BGQ_Gueter' ? 'gueter' : kurstyp==='BGQ_Person' ? 'person' : 'kombi';
}

// Beim Umsteiger wird nur der neu hinzukommende Zweig unterrichtet und
// gemeldet - die gemeinsamen Baender hatte er in seiner ersten
// Qualifikation bereits. Nach DEGENER-Rahmenplan sind das:
//   auf Güter  → 2.2 (08), 3.7 (16), 1.4 (19)
//   auf Person → 1.5 (06), 2.3 (09), 3.8 (17), 1.6 (20)
const BGQ_KB_DELTA = {
  gueter: ['08','16','19'],
  person: ['06','09','17','20'],
};

// Vorbelegung der anzurechnenden Stunden je Pruefungsart. Das Schema
// laesst nur ganze Zahlen bis 140 zu; je Teilnehmer aenderbar.
const BGQ_STD = {
  'Regelprüfung': 140,
  'Quereinsteigerprüfung': 96,
  'Umsteigerprüfung': 38,
  'Ausbildung zum Berufskraftfahrer': 140,
  'Ausbildung zur Fachkraft im Fahrbetrieb': 140,
};

// Was fuer diesen einen Teilnehmer gemeldet wird.
function bgqUmfang(t, kp){
  const q = t.qualifikation || bgqQualiAusTyp(kp && kp.kurstyp);
  const ist = t.pruefungsart === 'Umsteigerprüfung';
  let codes;
  if (ist) {
    // Kombi als Umsteiger ergibt fachlich keinen Sinn: dann fehlt die
    // Angabe, welcher Zweig neu dazukommt.
    codes = BGQ_KB_DELTA[q] || [];
  } else {
    codes = BGQ_KB_TYP[
      q==='gueter' ? 'BGQ_Gueter' : q==='person' ? 'BGQ_Person' : 'BGQ_Kombi'
    ] || [];
  }
  const std = (t.dauer_std!=null && t.dauer_std!=="")
    ? Number(t.dauer_std)
    : (BGQ_STD[t.pruefungsart] || 140);
  return {
    quali: q,
    codes: codes,
    klassen: (BGQ_QUALI[q] || BGQ_QUALI.kombi).klassen,
    dauer: std,
    warnung: (ist && q==='kombi')
      ? 'Umsteiger mit Zielqualifikation „Güter + Person“ – bitte den Zweig wählen, der neu dazukommt.'
      : '',
  };
}

// Exakte Schreibweise laut XSD - Umlaute inbegriffen. Weicht ein Zeichen ab,
// weist das KBA die KOMPLETTE Datei zurueck.
const BGQ_PRUEFUNGSARTEN = [
  'Regelprüfung',
  'Umsteigerprüfung',
  'Quereinsteigerprüfung',
  'Ausbildung zum Berufskraftfahrer',
  'Ausbildung zur Fachkraft im Fahrbetrieb',
];

// Stammdaten aus dem Anerkennungsbescheid. Strasse und Hausnummer stehen
// bewusst zusammen in einem Feld - genau so nimmt das KBA die
// Weiterbildungsmeldungen seit Jahren an.
const BGQ_STAMM = {
  name:'Fahrschulteam Thorsten Gels', strasse:'Rheiner Straße 158',
  plz:'49809', ort:'Lingen', aktenzeichen:'32/HAR', behoerde:'Stadt Lingen (Ems)'
};

// Feldlaengen laut qualifikationenRequest.xsd.
const BGQ_MAXLEN = {
  sachbearbeiterkennung:10, vorname:1000, familiennameUnstrukturiert:1000,
  geburtsnameUnstrukturiert:1000, geburtsort:70, geschlecht:1, geburtsdatum:8,
  ausbildungsstaette:1000, strasse:55, ort:44, postleitzahl:12,
  aktenzeichenAnerkennungsbescheid:1000, anerkennungsbehoerde:1000,
  ueberwachungsbehoerde:1000, kenntnisbereich:2, beginn:10, ende:10,
};
const BGQ_SB_DEFAULT = 'TGels';

function bkrfqgIstBgq(typ){ return typ==='BGQ_Gueter'||typ==='BGQ_Person'||typ==='BGQ_Kombi'; }
function bEsc(s){ return String(s==null?'':s).replace(/[<>&'"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c])); }

// Sammelt Laengenverstoesse, statt sie erst vom KBA-Portal zu erfahren.
function bgqFeld(feld, wert, fehler, wer){
  const v = String(wert==null?'':wert);
  const max = BGQ_MAXLEN[feld];
  if (max && v.length > max) {
    fehler.push((wer?wer+' – ':'')+'Feld '+feld+' ist '+v.length+' Zeichen lang, erlaubt sind '+max);
  }
  return bEsc(v);
}

// ── Teilnehmerliste ───────────────────────────────────────────────────
async function bkrfqgTnLaden(kursplanId){
  try {
    bkrfqgKPTeilnehmer = await bkrfqgSB('bkrfqg_kursplan_teilnehmer', {
      select: '*,schulung_participants(id,first_name,last_name,birth,birthplace,ext_dates)',
      eq: { kursplan_id: kursplanId },
      order: 'created_at'
    });
  } catch(e) { bkrfqgKPTeilnehmer = []; console.warn('bkrfqgTnLaden', e.message); }
}

// Liefert die Personendaten eines Listeneintrags oder null, wenn die
// Verknuepfung fehlt (Altzeilen aus der Zeit vor der Umstellung).
function bgqPerson(t){ return t.schulung_participants || null; }
function bgqName(t){
  const p = bgqPerson(t);
  if (p) return ((p.last_name||'')+', '+(p.first_name||'')).replace(/^, |, $/,'');
  return ((t.nachname||'')+', '+(t.vorname||'')).replace(/^, |, $/,'') || '(ohne Namen)';
}

// Pruefung auf die Pflichtangaben der Meldung. Fehlt eine, wird der
// Teilnehmer uebersprungen statt die ganze Datei zu gefaehrden.
function bgqFehlend(t){
  const p = bgqPerson(t);
  if (!p) return ['Verknüpfung zum Teilnehmerstamm'];
  const ext = p.ext_dates || {};
  const f = [];
  if (!p.first_name && !p.last_name) f.push('Name');
  if (!p.birth) f.push('Geburtsdatum');
  if (!p.birthplace) f.push('Geburtsort');
  if (!ext.GESCHLECHT) f.push('Geschlecht');
  if (!t.pruefungsart) f.push('Prüfungsart');
  if (t.pruefungsart === 'Umsteigerprüfung' && (t.qualifikation||'') === 'kombi') {
    f.push('Umsteiger-Zweig');
  }
  return f;
}

function bkrfqgTnKarteHTML(kp){
  if (!bkrfqgIstBgq(kp.kurstyp)) return '';
  const liste = bkrfqgKPTeilnehmer;
  const rows = liste.map(t => {
    const fehlt = bgqFehlend(t);
    const uf = bgqUmfang(t, kp);
    const p = bgqPerson(t);
    const gemeldet = t.bqr_gemeldet_am ? '<span class="tag" style="background:#dcfce7;color:#166534">✓ im BQR</span>'
                   : t.bqr_datei_am    ? '<span class="tag" style="background:#ffedd5;color:#9a3412">● Datei erzeugt</span>'
                   : '';
    return `<tr>
      <td><strong>${bEsc(bgqName(t))}</strong></td>
      <td style="font-size:11px">${p&&p.birth?bfmtD(p.birth):'<span style="color:var(--rot)">–</span>'}</td>
      <td>
        <select class="bgq-pa" data-id="${t.id}" onchange="bkrfqgTnPruefungsart(this)" style="font-size:12px;padding:3px 6px">
          <option value="">– Prüfungsart –</option>
          ${BGQ_PRUEFUNGSARTEN.map(a=>`<option value="${bEsc(a)}" ${t.pruefungsart===a?'selected':''}>${bEsc(a)}</option>`).join('')}
        </select>
      </td>
      <td>
        <select data-id="${t.id}" onchange="bkrfqgTnQualifikation(this)" style="font-size:12px;padding:3px 6px">
          ${Object.entries(BGQ_QUALI).map(([k,v])=>`<option value="${k}" ${(t.qualifikation||bgqQualiAusTyp(kp.kurstyp))===k?'selected':''}>${bEsc(v.label)}</option>`).join('')}
        </select>
      </td>
      <td style="white-space:nowrap">
        <input type="number" min="1" max="140" data-id="${t.id}" value="${uf.dauer}"
          onchange="bkrfqgTnStunden(this)" style="width:64px;font-size:12px;padding:3px 6px">
        <span style="font-size:11px;color:var(--grau)"> · ${uf.codes.length} KB</span>
      </td>
      <td>${fehlt.length?`<span class="tag" style="background:#fee2e2;color:#b91c1c">fehlt: ${bEsc(fehlt.join(', '))}</span>`:'<span class="tag" style="background:#dcfce7;color:#166534">vollständig</span>'}</td>
      <td>${gemeldet}</td>
      <td style="text-align:right"><button class="btn btn-outline btn-sm" style="color:var(--rot)" onclick="bkrfqgTnEntfernen('${t.id}')">🗑</button></td>
    </tr>`;
  }).join('');
  return `
    <div class="card" id="bgq-tn-karte" style="padding:0;margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid var(--border)">
        <div class="card-titel">👥 Teilnehmer (${liste.length})</div>
        <button class="btn btn-outline btn-sm" onclick="bkrfqgTnSuchDialog()">＋ Teilnehmer</button>
      </div>
      ${liste.length ? `<div style="overflow-x:auto"><table class="ma-table" style="min-width:980px">
        <thead><tr><th>Name</th><th>geboren</th><th>Prüfungsart</th><th>Qualifikation</th><th>Std · Umfang</th><th>Status</th><th>Meldung</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>` : '<div style="padding:16px;color:var(--grau);font-size:13px">Noch keine Teilnehmer zugeordnet.</div>'}
    </div>`;
}

// ── Teilnehmer suchen und verknuepfen ─────────────────────────────────
function bkrfqgTnModalHTML(){
  return `
  <div class="modal-overlay" id="bkrfqg-tn-modal">
    <div class="modal" style="width:560px">
      <div class="modal-header">
        <h3>Teilnehmer zuordnen</h3>
        <button class="close-btn" onclick="bkrfqgCloseModal('bkrfqg-tn-modal')">×</button>
      </div>
      <div class="modal-body">
        <div class="frow"><label>Name suchen</label>
          <input id="bgq-suche" placeholder="Nachname oder Vorname" oninput="bkrfqgTnSuchen()"></div>
        <div style="font-size:11px;color:var(--grau);margin:-4px 0 10px">
          Gesucht wird im Teilnehmerstamm der Schulungen. Wer sich online angemeldet hat, steht dort nach der Übernahme.
        </div>
        <div id="bgq-treffer"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="bkrfqgCloseModal('bkrfqg-tn-modal')">Schließen</button>
      </div>
    </div>
  </div>`;
}

function bkrfqgTnSuchDialog(){
  const e = document.getElementById('bgq-suche'); if (e) e.value = '';
  const tr = document.getElementById('bgq-treffer');
  if (tr) tr.innerHTML = '<div style="color:var(--grau);font-size:13px">Mindestens zwei Zeichen eingeben.</div>';
  bkrfqgOpenModal('bkrfqg-tn-modal');
}

let _bgqSuchTimer = null;
function bkrfqgTnSuchen(){
  clearTimeout(_bgqSuchTimer);
  _bgqSuchTimer = setTimeout(bkrfqgTnSuchenJetzt, 250);
}
async function bkrfqgTnSuchenJetzt(){
  const q = (document.getElementById('bgq-suche')||{}).value||'';
  const box = document.getElementById('bgq-treffer'); if (!box) return;
  if (q.trim().length < 2) { box.innerHTML = '<div style="color:var(--grau);font-size:13px">Mindestens zwei Zeichen eingeben.</div>'; return; }
  box.innerHTML = '<div style="color:var(--grau);font-size:13px">Suche …</div>';
  try {
    const t = q.trim().replace(/[%,()]/g, "");
    const { data, error } = await sb.from('schulung_participants')
      .select('id,first_name,last_name,birth,birthplace,ext_dates')
      .or(`last_name.ilike.%${t}%,first_name.ilike.%${t}%`)
      .order('last_name').limit(25);
    if (error) throw new Error(error.message);
    bkrfqgTnSuche = data || [];
    const drin = new Set(bkrfqgKPTeilnehmer.map(x => x.participant_id).filter(Boolean));
    if (!bkrfqgTnSuche.length) {
      box.innerHTML = '<div style="color:var(--grau);font-size:13px">Kein Treffer.</div>'; return;
    }
    box.innerHTML = bkrfqgTnSuche.map(p => {
      const ext = p.ext_dates || {};
      const luecken = [];
      if (!p.birth) luecken.push('Geburtsdatum');
      if (!p.birthplace) luecken.push('Geburtsort');
      if (!ext.GESCHLECHT) luecken.push('Geschlecht');
      const schon = drin.has(p.id);
      return `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;border:1px solid var(--border);border-radius:6px;padding:7px 10px;margin-bottom:6px">
        <div><strong>${bEsc((p.last_name||'')+', '+(p.first_name||''))}</strong>
        <div style="font-size:11px;color:var(--grau)">${p.birth?bfmtD(p.birth):'ohne Geburtsdatum'}${luecken.length?' · fehlt: '+bEsc(luecken.join(', ')):''}</div></div>
        ${schon?'<span class="tag" style="background:#e5e7eb;color:#374151">bereits zugeordnet</span>'
               :`<button class="btn btn-primary btn-sm" onclick="bkrfqgTnZuordnen('${p.id}')">Zuordnen</button>`}
      </div>`;
    }).join('');
  } catch(e) {
    box.innerHTML = '<div style="color:var(--rot);font-size:13px">Fehler: '+bEsc(e.message)+'</div>';
  }
}

async function bkrfqgTnZuordnen(participantId){
  if (!bkrfqgKPSelected) return;
  try {
    await bkrfqgInsert('bkrfqg_kursplan_teilnehmer', {
      kursplan_id: bkrfqgKPSelected,
      participant_id: participantId,
      qualifikation: bgqQualiAusTyp(
        (bkrfqgState.kursplaene.find(k => k.id === bkrfqgKPSelected)||{}).kurstyp
      )
    });
    await bkrfqgTnLaden(bkrfqgKPSelected);
    bkrfqgKursplaene(document.getElementById('bkrfqg-content'));
    toast('Teilnehmer zugeordnet ✓');
  } catch(e) { toast('Fehler: '+e.message, 'err'); }
}

async function bkrfqgTnEntfernen(id){
  const t = bkrfqgKPTeilnehmer.find(x => x.id === id);
  if (t && t.bqr_gemeldet_am && !confirm('Dieser Teilnehmer ist bereits im BQR gemeldet.\n\nWirklich aus der Liste entfernen? Die Meldung beim KBA bleibt bestehen und müsste dort storniert werden.')) return;
  try {
    await bkrfqgDelete('bkrfqg_kursplan_teilnehmer', id);
    await bkrfqgTnLaden(bkrfqgKPSelected);
    bkrfqgKursplaene(document.getElementById('bkrfqg-content'));
    toast('Teilnehmer entfernt');
  } catch(e) { toast('Fehler: '+e.message, 'err'); }
}

async function bkrfqgTnQualifikation(sel){
  const id = sel.getAttribute('data-id');
  try {
    await bkrfqgUpdate('bkrfqg_kursplan_teilnehmer', id, { qualifikation: sel.value });
    const t = bkrfqgKPTeilnehmer.find(x => x.id === id);
    if (t) t.qualifikation = sel.value;
    bkrfqgKursplaene(document.getElementById('bkrfqg-content'));
  } catch(e) { toast('Fehler: '+e.message, 'err'); }
}

async function bkrfqgTnStunden(inp){
  const id = inp.getAttribute('data-id');
  const v = parseInt(inp.value, 10);
  if (!(v >= 1 && v <= 140)) {
    toast('Stunden müssen zwischen 1 und 140 liegen.', 'err');
    bkrfqgKursplaene(document.getElementById('bkrfqg-content'));
    return;
  }
  try {
    await bkrfqgUpdate('bkrfqg_kursplan_teilnehmer', id, { dauer_std: v });
    const t = bkrfqgKPTeilnehmer.find(x => x.id === id);
    if (t) t.dauer_std = v;
    bkrfqgKursplaene(document.getElementById('bkrfqg-content'));
  } catch(e) { toast('Fehler: '+e.message, 'err'); }
}

async function bkrfqgTnPruefungsart(sel){
  const id = sel.getAttribute('data-id');
  try {
    await bkrfqgUpdate('bkrfqg_kursplan_teilnehmer', id, { pruefungsart: sel.value || null });
    const t = bkrfqgKPTeilnehmer.find(x => x.id === id);
    if (t) t.pruefungsart = sel.value || null;
    bkrfqgKursplaene(document.getElementById('bkrfqg-content'));
  } catch(e) { toast('Fehler: '+e.message, 'err'); }
}

// Meldezeitraum. Die Kurstage haben Vorrang vor den Kursplan-Feldern:
// gemeldet wird, wann tatsaechlich unterrichtet wurde. Sind noch keine
// Kurstage angelegt, greifen Start- und Enddatum des Kursplans.
function bgqZeitraum(kp){
  const tage = bkrfqgKPKurstage
    .map(k => String(k.datum||'').slice(0,10))
    .filter(d => /^20\d\d-\d\d-\d\d$/.test(d))
    .sort();
  const kpVon = String(kp.startdatum||'').slice(0,10);
  const kpBis = String(kp.enddatum||'').slice(0,10);
  return {
    von: tage[0] || kpVon,
    bis: tage.length ? tage[tage.length-1] : (kpBis || kpVon),
    ausKurstagen: tage.length > 0,
    tage: tage.length,
    kpBisFehlt: !kpBis,
  };
}

// Traegt das aus den Kurstagen ermittelte Enddatum am Kursplan nach.
async function bkrfqgBgqEndeUebernehmen(kursplanId){
  const kp = bkrfqgState.kursplaene.find(x => x.id === kursplanId);
  if (!kp) return;
  const z = bgqZeitraum(kp);
  if (!z.bis) { toast('Kein Datum aus den Kurstagen ermittelbar.', 'err'); return; }
  try {
    await bkrfqgUpdate('bkrfqg_kursplaene', kursplanId, { enddatum: z.bis });
    kp.enddatum = z.bis;
    toast('Enddatum übernommen: '+bfmtD(z.bis));
    bkrfqgBgqDialog(kursplanId);
  } catch(e) { toast('Fehler: '+e.message, 'err'); }
}

// ── Meldedialog ──────────────────────────────────────────────────────
function bkrfqgBgqDialog(kursplanId){
  const kp = bkrfqgState.kursplaene.find(x => x.id === kursplanId);
  if (!kp) return;
  if (!bkrfqgIstBgq(kp.kurstyp)) { toast('Für diesen Kurstyp ist keine BGQ-Meldung vorgesehen.'); return; }
  const liste = bkrfqgKPTeilnehmer;
  if (!liste.length) { toast('Diesem Kursplan sind noch keine Teilnehmer zugeordnet.'); return; }

  const zr = bgqZeitraum(kp);
  const codes = BGQ_KB_TYP[kp.kurstyp] || [];
  // Gegenprobe: was steht tatsaechlich in den Kurstagen? Weicht der Plan ab,
  // wird gemeldet, was der Rahmenplan vorsieht - aber sichtbar angemerkt.
  const geplant = new Set();
  bkrfqgKPKurstage.forEach(k => {
    String(k.kenntnisbereich_kb||'').replace(/KB/gi,'').split(/[,;]/).forEach(s => {
      const c = BGQ_KB_CODE[s.trim()];
      if (c) geplant.add(c);
    });
  });
  const fehlenImPlan = codes.filter(c => geplant.size && !geplant.has(c));

  const bereit = liste.filter(t => !bgqFehlend(t).length);
  const offen  = liste.filter(t =>  bgqFehlend(t).length);
  const sb0 = localStorage.getItem('bgqSachbearbeiter') || BGQ_SB_DEFAULT;

  const rows = liste.map(t => {
    const f = bgqFehlend(t);
    return `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;border:1px solid var(--border);border-radius:6px;padding:6px 10px;font-size:13px;margin-bottom:5px">
      <span><strong>${bEsc(bgqName(t))}</strong>
      ${t.pruefungsart?`<span style="color:var(--grau);font-size:11px"> · ${bEsc(t.pruefungsart)}`:''}
      ${t.pruefungsart?` · ${bgqUmfang(t,kp).dauer} Std · KB ${bgqUmfang(t,kp).codes.join(', ')||'–'}</span>`:''}</span>
      ${f.length?`<span class="tag" style="background:#fee2e2;color:#b91c1c">fehlt: ${bEsc(f.join(', '))}</span>`
               :'<span class="tag" style="background:#dcfce7;color:#166534">wird gemeldet</span>'}
    </div>`;
  }).join('');

  const el = document.getElementById('bkrfqg-bgq-modal');
  if (el) el.remove();
  const wrap = document.createElement('div');
  wrap.innerHTML = `
  <div class="modal-overlay open" id="bkrfqg-bgq-modal">
    <div class="modal" style="width:640px">
      <div class="modal-header">
        <h3>🏛 BGQ-Meldung ans KBA</h3>
        <button class="close-btn" onclick="bkrfqgCloseModal('bkrfqg-bgq-modal')">×</button>
      </div>
      <div class="modal-body">
        <div style="font-size:13px;color:var(--grau);margin-bottom:12px">
          <strong>${bEsc(bKursTypLabel(kp.kurstyp))}</strong> · ${bfmtD(zr.von)} – ${bfmtD(zr.bis)}
          ${zr.ausKurstagen?`<span style="font-size:11px">(aus ${zr.tage} Kurstagen)</span>`:''}<br>
          ${bereit.length} von ${liste.length} Teilnehmern vollständig · Umfang je Teilnehmer
        </div>
        ${fehlenImPlan.length?`<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:9px 12px;margin-bottom:12px;font-size:12px">
          ⚠ Laut Rahmenplan zu melden, aber in keinem Kurstag hinterlegt: ${fehlenImPlan.join(', ')}.
          Gemeldet wird trotzdem der volle Rahmenplan – prüfe, ob die Kurstage vollständig erfasst sind.
        </div>`:''}
        ${zr.kpBisFehlt && zr.ausKurstagen ? `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:9px 12px;margin-bottom:12px;font-size:12px">
          Am Kursplan fehlt das Enddatum. Gemeldet wird der letzte Kurstag, der ${bfmtD(zr.bis)}.
          <button class="btn btn-outline btn-sm" style="margin-left:8px" onclick="bkrfqgBgqEndeUebernehmen('${kp.id}')">Am Kursplan nachtragen</button>
        </div>` : ''}
        <div class="frow"><label>Sachbearbeiterkennung</label>
          <input id="bgq-sb" maxlength="10" value="${bEsc(sb0)}"></div>
        <div style="font-size:11px;color:var(--grau);margin:-4px 0 12px">Max. 10 Zeichen (Vorgabe des KBA-Schemas). Stunden und Kenntnisbereiche stehen je Teilnehmer in der Teilnehmerliste.</div>
        ${rows}
        ${offen.length?`<div style="font-size:12px;color:var(--grau);margin-top:8px">Teilnehmer mit fehlenden Angaben werden <b>nicht</b> in die Datei aufgenommen und bleiben ungemeldet.</div>`:''}
        <div id="bgq-fehler"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="bkrfqgCloseModal('bkrfqg-bgq-modal')">Abbrechen</button>
        <button class="btn btn-primary" onclick="bkrfqgBgqErzeugen('${kp.id}')">XML-Datei erzeugen</button>
      </div>
    </div>
  </div>`;
  document.body.appendChild(wrap.firstElementChild);
}

// ── XML erzeugen ──────────────────────────────────────────────────────
async function bkrfqgBgqErzeugen(kursplanId){
  const kp = bkrfqgState.kursplaene.find(x => x.id === kursplanId);
  if (!kp) return;
  const sbk = ((document.getElementById('bgq-sb')||{}).value||'').trim();
  const box = document.getElementById('bgq-fehler');
  if (box) box.innerHTML = '';

  const zeig = (liste) => {
    if (box) box.innerHTML = `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:9px 12px;margin-top:10px">
      <div style="font-weight:700;color:#b91c1c;font-size:13px;margin-bottom:5px">⚠ Keine Datei erzeugt</div>
      <ul style="margin:0;padding-left:18px;font-size:12px;color:#7f1d1d">${liste.map(t=>'<li>'+bEsc(t)+'</li>').join('')}</ul></div>`;
    toast('⚠ '+liste[0], 'err');
  };

  if (!sbk) { zeig(['Bitte Sachbearbeiterkennung eintragen.']); return; }
  if (sbk.length > BGQ_MAXLEN.sachbearbeiterkennung) { zeig(['Sachbearbeiterkennung ist '+sbk.length+' Zeichen lang, erlaubt sind 10.']); return; }
  localStorage.setItem('bgqSachbearbeiter', sbk);

  const zr      = bgqZeitraum(kp);
  const beginn  = zr.von;
  const ende    = zr.bis;
  if (!/^20\d\d-\d\d-\d\d$/.test(beginn) || !/^20\d\d-\d\d-\d\d$/.test(ende)) {
    zeig(['Es liegen weder Kurstage noch Start-/Enddatum am Kursplan vor.']); return;
  }
  if (ende < beginn) {
    zeig(['Das Ende liegt vor dem Beginn – bitte die Kurstage prüfen.']); return;
  }

  const fehler = [];
  const gemeldet = [];
  let nr = 0;
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
          + '<Qualifikationen-Request xmlns="http://www.kba.de/bqr/qualifikation" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n';

  for (const t of bkrfqgKPTeilnehmer) {
    if (bgqFehlend(t).length) continue;
    const p = bgqPerson(t);
    const ext = p.ext_dates || {};
    const uf = bgqUmfang(t, kp);
    if (!uf.codes.length) {
      fehler.push(bgqName(t)+' – kein Kenntnisbereich ermittelbar (Prüfungsart und Qualifikation prüfen)');
      continue;
    }
    nr++; gemeldet.push(t);
    const wer = bgqName(t);
    const F = (feld, wert) => bgqFeld(feld, wert, fehler, wer);
    const gd = String(p.birth).split('-');
    const gebname = String(ext.GEBURTSNAME||'').trim();
    // Klassen des Teilnehmers, falls gepflegt - sonst die des Kurstyps.
    const eigene = String(ext.KLASSEN||'').split(',').map(s=>s.trim())
      .filter(k => /^(C1E|C1|CE|C|D1E|D1|DE|D)$/.test(k));
    const kl = (eigene.length ? eigene : uf.klassen).slice(0, 8);

    xml += '  <Qualifikation>\n'
        +  '    <satznummer>'+nr+'</satznummer>\n'
        +  '    <sachbearbeiterkennung>'+F('sachbearbeiterkennung',sbk)+'</sachbearbeiterkennung>\n'
        +  '    <BeschleunigteGrundqualifikationAusbildungsstaette>\n'
        +  uf.codes.map(c=>'      <kenntnisbereich>'+F('kenntnisbereich',c)+'</kenntnisbereich>\n').join('')
        +  '      <pruefungsart>'+bEsc(t.pruefungsart)+'</pruefungsart>\n'
        +  '      <beginn>'+F('beginn',beginn)+'</beginn>\n'
        +  '      <ende>'+F('ende',ende)+'</ende>\n'
        +  '      <dauer>'+uf.dauer+'</dauer>\n'
        +  kl.map(k=>'      <fahrerlaubnisklasse>'+bEsc(k)+'</fahrerlaubnisklasse>\n').join('')
        +  '      <Ausbildungsstaette>\n'
        +  '        <ausbildungsstaette>'+F('ausbildungsstaette',BGQ_STAMM.name)+'</ausbildungsstaette>\n'
        +  '        <strasse>'+F('strasse',BGQ_STAMM.strasse)+'</strasse>\n'
        +  '        <postleitzahl>'+F('postleitzahl',BGQ_STAMM.plz)+'</postleitzahl>\n'
        +  '        <ort>'+F('ort',BGQ_STAMM.ort)+'</ort>\n'
        +  '      </Ausbildungsstaette>\n'
        +  '      <aktenzeichenAnerkennungsbescheid>'+F('aktenzeichenAnerkennungsbescheid',BGQ_STAMM.aktenzeichen)+'</aktenzeichenAnerkennungsbescheid>\n'
        +  '      <anerkennungsbehoerde>'+F('anerkennungsbehoerde',BGQ_STAMM.behoerde)+'</anerkennungsbehoerde>\n'
        +  '      <ueberwachungsbehoerde>'+F('ueberwachungsbehoerde',BGQ_STAMM.behoerde)+'</ueberwachungsbehoerde>\n'
        +  '    </BeschleunigteGrundqualifikationAusbildungsstaette>\n'
        +  '    <Personendaten>\n'
        +  '      <geburtsdatum>'+F('geburtsdatum',gd[2]+gd[1]+gd[0])+'</geburtsdatum>\n'
        +  '      <geburtsort>'+F('geburtsort',p.birthplace)+'</geburtsort>\n'
        +  '      <geschlecht>'+F('geschlecht',String(ext.GESCHLECHT||'m').toLowerCase().slice(0,1))+'</geschlecht>\n'
        +  '      <PersonendatenMitFamilienname>\n'
        +  '        <vorname>'+F('vorname',p.first_name||'')+'</vorname>\n'
        +  '        <familiennameUnstrukturiert>'+F('familiennameUnstrukturiert',p.last_name||'')+'</familiennameUnstrukturiert>\n'
        +  (gebname ? '        <geburtsnameUnstrukturiert>'+F('geburtsnameUnstrukturiert',gebname)+'</geburtsnameUnstrukturiert>\n'
                   : '        <geburtsnameFehltZurecht>1</geburtsnameFehltZurecht>\n')
        +  '      </PersonendatenMitFamilienname>\n'
        +  '    </Personendaten>\n'
        +  '  </Qualifikation>\n';
  }
  xml += '</Qualifikationen-Request>\n';

  if (!nr) { zeig(['Kein Teilnehmer hat vollständige Pflichtangaben.']); return; }
  // Abbruch VOR dem Download: eine zu lange Angabe macht die komplette
  // Datei schemaungueltig, das KBA-Portal weist sie dann als Ganzes zurueck.
  if (fehler.length) { zeig(fehler); return; }

  const jetzt = new Date().toISOString();
  try {
    for (const t of gemeldet) {
      await bkrfqgUpdate('bkrfqg_kursplan_teilnehmer', t.id, { bqr_datei_am: jetzt, bqr_gemeldet_am: null });
    }
  } catch(e) { toast('Meldestatus konnte nicht gespeichert werden: '+e.message, 'err'); }

  const blob = new Blob([xml], {type:'application/xml'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'bqr-bgq-'+String(kp.kurstyp||'').toLowerCase()+'-'+beginn+'.xml';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>{ try{ URL.revokeObjectURL(a.href); }catch(e){} }, 5000);

  bkrfqgCloseModal('bkrfqg-bgq-modal');
  await bkrfqgTnLaden(kursplanId);
  bkrfqgKursplaene(document.getElementById('bkrfqg-content'));
  toast('✓ BGQ-Datei erzeugt: '+nr+' Teilnehmer · nach dem Upload bei kba-online.de bestätigen');
}

// Bestaetigung, dass die Datei im KBA-Portal hochgeladen wurde. Bewusst ein
// eigener Schritt: hochgeladen wird von Hand, davon bekommt die App nichts mit.
async function bkrfqgBgqUploadBestaetigen(kursplanId){
  const offen = bkrfqgKPTeilnehmer.filter(t => t.bqr_datei_am && !t.bqr_gemeldet_am);
  if (!offen.length) { toast('Keine erzeugte Datei offen.'); return; }
  if (!confirm('Datei im KBA-Portal hochgeladen?\n\n'+offen.length+' Teilnehmer werden als gemeldet vermerkt.')) return;
  const jetzt = new Date().toISOString();
  try {
    for (const t of offen) await bkrfqgUpdate('bkrfqg_kursplan_teilnehmer', t.id, { bqr_gemeldet_am: jetzt });
    await bkrfqgTnLaden(kursplanId);
    bkrfqgKursplaene(document.getElementById('bkrfqg-content'));
    toast('✓ Als im BQR hochgeladen vermerkt');
  } catch(e) { toast('Fehler: '+e.message, 'err'); }
}

