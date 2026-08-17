// ════════════════════════════════════════════════════════════════════
//  EDGE FUNCTION: auto-todos
//  Läuft täglich per pg_cron (siehe 21_auto_todos.sql).
//  Prüft 4 Regeln und legt fehlende To-Dos an (dedupliziert über auto_key):
//
//  1) Jubiläum (alle 5 Jahre ab Eintrittsdatum) – 2 Monate vorher → admin
//  2) Fahrzeug HU/AU – 6 Monate vorher → admin + verwaltung
//  3) Fahrzeug Leasing/Finanzierung-Ende – 9 Monate vorher → admin + verwaltung
//  4) Fahrlehrerfortbildung-Frist – 6 Monate vorher → admin + verwaltung
//
//  Deploy: Supabase Dashboard → Edge Functions → "auto-todos" →
//  diesen Code einfügen → Deploy (mit "Verify JWT" AUS, da pg_cron
//  keinen Nutzer-JWT mitschickt).
// ════════════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, // Service-Role: umgeht RLS, ist automatisch als Secret verfügbar
);

// ── Hilfsfunktionen ──
function tageBis(datumStr: string): number {
  const heute = new Date(); heute.setHours(0, 0, 0, 0);
  return Math.round((new Date(datumStr).getTime() - heute.getTime()) / 86400000);
}
function fmt(datumStr: string): string {
  return new Date(datumStr).toLocaleDateString('de-DE');
}

// Legt ein To-Do für jeden Nutzer der Zielrollen an, falls noch nicht vorhanden (auto_key + zugewiesen_an eindeutig)
// Gibt zurück: { erstellt: string[], fehler: string[] } – echte Erfolge/Fehler, nicht nur "versucht".
async function anlegenFuerZielgruppe(
  rollen: string[], titel: string, beschreibung: string,
  faellig_am: string, auto_key: string, prioritaet: 'niedrig' | 'normal' | 'hoch' = 'normal',
): Promise<{ erstellt: string[]; fehler: string[] }> {
  const erstellt: string[] = [];
  const fehler: string[] = [];

  const { data: users, error } = await supabase.from('app_users').select('id').in('rolle', rollen);
  if (error) { fehler.push(`app_users-Abfrage fehlgeschlagen: ${error.message}`); return { erstellt, fehler }; }
  if (!users || users.length === 0) { fehler.push(`Keine Nutzer mit Rolle ${rollen.join('/')} gefunden.`); return { erstellt, fehler }; }

  for (const u of users) {
    const { data: existing, error: selErr } = await supabase
      .from('todos').select('id').eq('auto_key', auto_key).eq('zugewiesen_an', u.id).maybeSingle();
    if (selErr) { fehler.push(`Dedup-Prüfung fehlgeschlagen (${u.id}): ${selErr.message}`); continue; }
    if (existing) continue; // schon vorhanden, kein Fehler

    const { error: insErr } = await supabase.from('todos').insert({
      titel, beschreibung, faellig_am, prioritaet,
      ersteller_id: u.id, zugewiesen_an: u.id, auto_key,
    });
    if (insErr) {
      fehler.push(`Insert fehlgeschlagen (${auto_key} → ${u.id}): ${insErr.message}`);
    } else {
      erstellt.push(`${titel} → Nutzer ${u.id}`);
    }
  }
  return { erstellt, fehler };
}

// ── Fortbildungslogik, 1:1 portiert aus fortbildung.js (pure Funktionen, keine DOM-Abhängigkeit) ──
const FB_PFLICHTEN = [
  { id: 'allgemein', name: 'Allgemeine Fortbildung (§53 Abs.1)', zyklus: 4, sollTage: 3, gilt: (m: any) => m.bereich === 'fahrlehrer' },
  { id: 'asf',       name: 'ASF-Seminarleiter (§53 Abs.2)',      zyklus: 2, sollTage: 1, gilt: (m: any) => m.qual_asf },
  { id: 'fes',       name: 'FES-Seminarleiter (§53 Abs.2)',      zyklus: 2, sollTage: 1, gilt: (m: any) => m.qual_fes },
  { id: 'afl',       name: 'Ausbildungsfahrlehrer (§53 Abs.3)',  zyklus: 4, sollTage: 1, gilt: (m: any) => m.qual_ausb },
  { id: 'bkf',       name: 'BKF-Dozent (§7 BKrFQV)',             zyklus: 4, sollTage: 3, gilt: (m: any) => m.qual_bkf },
];
function jahresEnde(jahr: number) { return new Date(jahr, 11, 31); }

function berechnePflicht(pflicht: any, fbs: any[], fristAblaufJahr: number | null, alleFbsDesMa: any[]) {
  const heute = new Date();
  const A = pflicht.id;
  const zyklus = pflicht.zyklus;
  if (!fristAblaufJahr) return { status: 'unbekannt', fristEnde: null, erfuellt: false };

  const nw = fbs.filter((f) => f.art === A && f.datum)
    .map((f) => ({ jahr: new Date(f.datum).getFullYear(), tage: Number(f.tage) || 1, zusammenhaengend: !!f.zusammenhaengend }));
  const sollMax = (A === 'allgemein' || A === 'bkf') ? 4 : pflicht.sollTage;

  function blockErfuellt(bStart: number, bEnde: number) {
    const imBlock = nw.filter((t) => t.jahr >= bStart && t.jahr <= bEnde);
    if (A === 'allgemein' || A === 'bkf') {
      const soll = pflicht.sollTage;
      const amStueck = imBlock.some((t) => t.zusammenhaengend && t.tage >= soll);
      if (amStueck) return { ok: true, einheiten: 4 };
      let bonus = 0;
      if (A === 'allgemein' && alleFbsDesMa) {
        const hat = (art: string) => alleFbsDesMa.some((f) => f.art === art && f.datum &&
          new Date(f.datum).getFullYear() >= bStart && new Date(f.datum).getFullYear() <= bEnde);
        if (hat('asf') || hat('fes')) bonus++;
        if (hat('afl')) bonus++;
        if (hat('fps')) bonus++;
        bonus = Math.min(bonus, 3);
      }
      const gezaehlt = imBlock.length + bonus;
      return { ok: imBlock.length >= 1 && gezaehlt >= 4, einheiten: Math.min(gezaehlt, 4) };
    }
    return { ok: imBlock.length >= pflicht.sollTage, einheiten: Math.min(imBlock.length, pflicht.sollTage) };
  }

  const aktStart = fristAblaufJahr - zyklus + 1;
  const aktEnde = fristAblaufJahr;
  const nbStart = fristAblaufJahr + 1;
  const nbEnde = fristAblaufJahr + zyklus;

  const aktErf = blockErfuellt(aktStart, aktEnde);
  const nbErf = blockErfuellt(nbStart, nbEnde);
  const fristEnde = jahresEnde(aktEnde);

  let status;
  const tageBisFrist = Math.ceil((fristEnde.getTime() - heute.getTime()) / 86400000);
  if (nbErf.ok) status = 'naechster_ok';
  else if (tageBisFrist < 0 && !aktErf.ok) status = 'ueberschritten';
  else status = 'im_rahmen';

  return { status, fristEnde, erfuellt: aktErf.ok };
}

function fortbildungsStatus(m: any, fbsAll: any[]) {
  const fbs = fbsAll.filter((f) => f.mitarbeiter_id === m.id);
  return FB_PFLICHTEN.filter((p) => p.gilt(m)).map((p) => {
    const ablaufJahr = p.id === 'bkf' ? m.frist_bkf : m.frist_fahrlg;
    return { pflicht: p, ...berechnePflicht(p, fbs, ablaufJahr, fbs) };
  });
}

// ── Haupt-Handler ──
Deno.serve(async (req) => {
  // Optionaler Schutz gegen versehentliche/fremde Aufrufe
  const secret = Deno.env.get('CRON_SECRET');
  if (secret) {
    const given = req.headers.get('x-cron-secret');
    if (given !== secret) return new Response('unauthorized', { status: 401 });
  }

  // Sofortige Diagnose: Sind die nötigen Secrets überhaupt gesetzt?
  const hatServiceKey = !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const hatUrl = !!Deno.env.get('SUPABASE_URL');
  if (!hatServiceKey || !hatUrl) {
    return new Response(JSON.stringify({
      ok: false,
      fehler: [`Konfigurationsfehler: SUPABASE_URL vorhanden=${hatUrl}, SUPABASE_SERVICE_ROLE_KEY vorhanden=${hatServiceKey}. Beide müssen als Secret gesetzt sein.`],
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  const erstellt: string[] = [];
  const fehler: string[] = [];

  // 1) JUBILÄEN – alle 5 Jahre ab Eintrittsdatum, 2 Monate (60 Tage) vorher, nur admin
  {
    const { data: mitarbeiter, error: maErr } = await supabase
      .from('mitarbeiter').select('id,vorname,nachname,eintrittsdatum,status')
      .eq('status', 'aktiv').not('eintrittsdatum', 'is', null);
    if (maErr) fehler.push(`mitarbeiter-Abfrage (Jubiläen) fehlgeschlagen: ${maErr.message}`);

    for (const m of mitarbeiter ?? []) {
      const eintritt = new Date(m.eintrittsdatum);
      const heute = new Date();
      const jahre = Math.floor((heute.getTime() - eintritt.getTime()) / (365.25 * 86400000));
      const naechstes = Math.ceil(Math.max(jahre, 1) / 5) * 5;
      const jubDatum = new Date(eintritt); jubDatum.setFullYear(eintritt.getFullYear() + naechstes);
      const diffTage = Math.round((jubDatum.getTime() - heute.getTime()) / 86400000);

      if (diffTage >= 0 && diffTage <= 60) {
        const key = `jub:${m.id}:${jubDatum.getFullYear()}`;
        const datumIso = jubDatum.toISOString().slice(0, 10);
        const r = await anlegenFuerZielgruppe(
          ['admin'],
          `🎉 Jubiläum: ${m.vorname} ${m.nachname} (${naechstes} Jahre)`,
          `${m.vorname} ${m.nachname} feiert am ${fmt(datumIso)} ${naechstes}-jähriges Firmenjubiläum (Eintritt: ${fmt(m.eintrittsdatum)}).`,
          datumIso, key, 'normal',
        );
        erstellt.push(...r.erstellt);
        fehler.push(...r.fehler);
      }
    }
  }

  // 2) FAHRZEUGE – HU/AU 6 Monate (183 Tage), Leasing/Finanzierung 9 Monate (270 Tage), admin+verwaltung
  {
    const { data: fahrzeuge, error: fzErr } = await supabase
      .from('fahrzeuge')
      .select('id,kennzeichen,marke,modell,haltung,hu_faellig,sp_faellig,bestand_bis,status')
      .eq('status', 'aktiv');
    if (fzErr) fehler.push(`fahrzeuge-Abfrage fehlgeschlagen: ${fzErr.message}`);

    for (const v of fahrzeuge ?? []) {
      const name = `${v.kennzeichen}${v.marke ? ' · ' + v.marke : ''}${v.modell ? ' ' + v.modell : ''}`;

      if (v.hu_faellig) {
        const t = tageBis(v.hu_faellig);
        if (t >= 0 && t <= 183) {
          const r = await anlegenFuerZielgruppe(
            ['admin', 'verwaltung'],
            `🚗 HU/AU fällig: ${name}`,
            `HU/AU für ${name} ist am ${fmt(v.hu_faellig)} fällig.`,
            v.hu_faellig, `hu:${v.id}:${v.hu_faellig}`, t <= 30 ? 'hoch' : 'normal',
          );
          erstellt.push(...r.erstellt); fehler.push(...r.fehler);
        }
      }
      if (v.sp_faellig) {
        const t = tageBis(v.sp_faellig);
        if (t >= 0 && t <= 183) {
          const r = await anlegenFuerZielgruppe(
            ['admin', 'verwaltung'],
            `🚗 SP fällig: ${name}`,
            `Sicherheitsprüfung für ${name} ist am ${fmt(v.sp_faellig)} fällig.`,
            v.sp_faellig, `sp:${v.id}:${v.sp_faellig}`, t <= 30 ? 'hoch' : 'normal',
          );
          erstellt.push(...r.erstellt); fehler.push(...r.fehler);
        }
      }
      if (v.bestand_bis && ['leasing', 'finanzierung'].includes(v.haltung)) {
        const t = tageBis(v.bestand_bis);
        if (t >= 0 && t <= 270) {
          const typ = v.haltung === 'leasing' ? 'Leasing' : 'Finanzierung';
          const r = await anlegenFuerZielgruppe(
            ['admin', 'verwaltung'],
            `🚗 ${typ}-Ende: ${name}`,
            `${typ} für ${name} endet am ${fmt(v.bestand_bis)}.`,
            v.bestand_bis, `${v.haltung}:${v.id}:${v.bestand_bis}`, t <= 60 ? 'hoch' : 'normal',
          );
          erstellt.push(...r.erstellt); fehler.push(...r.fehler);
        }
      }
    }
  }

  // 3) FAHRLEHRERFORTBILDUNGEN – 6 Monate (183 Tage) vor Fristende, admin+verwaltung
  {
    const { data: mitarbeiter, error: maErr } = await supabase.from('mitarbeiter').select('*').eq('status', 'aktiv');
    if (maErr) fehler.push(`mitarbeiter-Abfrage (Fortbildungen) fehlgeschlagen: ${maErr.message}`);
    const { data: fortbildungen, error: fbErr } = await supabase.from('fortbildungen').select('*');
    if (fbErr) fehler.push(`fortbildungen-Abfrage fehlgeschlagen: ${fbErr.message}`);

    for (const m of mitarbeiter ?? []) {
      const ergebnisse = fortbildungsStatus(m, fortbildungen ?? []);
      for (const e of ergebnisse) {
        if (!e.fristEnde || e.erfuellt || e.status === 'naechster_ok') continue;
        const t = tageBis(e.fristEnde.toISOString().slice(0, 10));
        if (t >= 0 && t <= 183) {
          const jahr = e.fristEnde.getFullYear();
          const paraMatch = e.pflicht.name.match(/\(([^)]+)\)/);
          const para = paraMatch ? paraMatch[1] : e.pflicht.id;
          const datumIso = e.fristEnde.toISOString().slice(0, 10);
          const key = `fb:${m.id}:${e.pflicht.id}:${jahr}`;
          const r = await anlegenFuerZielgruppe(
            ['admin', 'verwaltung'],
            `🎓 Fortbildung fällig: ${m.nachname}, ${m.vorname} (${para})`,
            `${e.pflicht.name} für ${m.vorname} ${m.nachname} muss bis ${fmt(datumIso)} nachgewiesen sein.`,
            datumIso, key, t <= 30 ? 'hoch' : 'normal',
          );
          erstellt.push(...r.erstellt); fehler.push(...r.fehler);
        }
      }
    }
  }

  return new Response(JSON.stringify({ ok: fehler.length === 0, erstellt, fehler }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
