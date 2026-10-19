-- ════════════════════════════════════════════════════════════════════
--  Kurstermine 2027 in den Kurskalender übernehmen
--  Quelle: FTG_Veranstaltungskalender_2027.xlsx (Stand 06.10.2026)
--
--  Was das Skript tut:
--   - legt je Termin EINE leere Terminzeile an (ohne Teilnehmer) – genau so
--     entstehen Termine auch in der Verwaltung; damit sind sie im
--     Kurskalender sichtbar und buchbar
--   - übernimmt Ort, Plätze, Dozent, Themen und Stunden vom jeweils letzten
--     vorhandenen Termin derselben Lehrgangsart (= „wie im Vorjahr")
--   - legt nichts doppelt an: gibt es Lehrgangsart + Startdatum schon, wird
--     der Termin übersprungen (darum gefahrlos mehrfach ausführbar)
--   - zeigt am Ende für jeden Termin, was passiert ist
--
--  Nicht enthalten: die beiden „SUF"-Blöcke (15.–18.03. und 30.08.–03.09.),
--  weil es dafür keine Lehrgangsart im Kurskalender gibt.
--
--  Ausführen: Supabase → SQL Editor → alles einfügen → Run
-- ════════════════════════════════════════════════════════════════════
with plan(typ, von, bis) as (
  values
    ('BGQ LKW', '2027-01-04', '2027-01-29'),
    ('BKF Modul 1', '2027-02-01', '2027-02-01'),
    ('BKF Modul 2G', '2027-02-02', '2027-02-02'),
    ('BKF Modul 3', '2027-02-03', '2027-02-03'),
    ('BKF Modul 4', '2027-02-04', '2027-02-04'),
    ('ADR Fortbildung', '2027-02-05', '2027-02-06'),
    ('BKF Modul 5G', '2027-02-05', '2027-02-05'),
    ('FES Modul 1', '2027-02-08', '2027-02-15'),
    ('Gabelstapler', '2027-02-12', '2027-02-13'),
    ('Ladekran', '2027-02-19', '2027-02-20'),
    ('ADR Basiskurs', '2027-02-26', '2027-03-06'),
    ('ADR Aufbaukurs Tank', '2027-03-19', '2027-03-20'),
    ('BKF Modul 1', '2027-04-12', '2027-04-12'),
    ('BKF Modul 2G', '2027-04-13', '2027-04-13'),
    ('BKF Modul 3', '2027-04-14', '2027-04-14'),
    ('BKF Modul 4', '2027-04-15', '2027-04-15'),
    ('BKF Modul 5G', '2027-04-16', '2027-04-16'),
    ('BGQ LKW', '2027-04-19', '2027-05-13'),
    ('Gabelstapler', '2027-05-21', '2027-05-22'),
    ('Ladekran', '2027-05-28', '2027-05-29'),
    ('FES Modul 1', '2027-05-31', '2027-06-07'),
    ('ADR Basiskurs', '2027-06-04', '2027-06-12'),
    ('ADR Aufbaukurs Tank', '2027-06-18', '2027-06-19'),
    ('ADR Fortbildung', '2027-06-25', '2027-06-26'),
    ('BKF Modul 1', '2027-08-16', '2027-08-16'),
    ('BKF Modul 2G', '2027-08-17', '2027-08-17'),
    ('BKF Modul 3', '2027-08-18', '2027-08-18'),
    ('BKF Modul 4', '2027-08-19', '2027-08-19'),
    ('BKF Modul 5G', '2027-08-20', '2027-08-20'),
    ('FES Modul 1', '2027-08-23', '2027-08-30'),
    ('BGQ LKW', '2027-09-06', '2027-09-24'),
    ('Gabelstapler', '2027-10-08', '2027-10-09'),
    ('Ladekran', '2027-10-15', '2027-10-16'),
    ('BKF Modul 1', '2027-11-01', '2027-11-01'),
    ('BKF Modul 2G', '2027-11-02', '2027-11-02'),
    ('BKF Modul 3', '2027-11-03', '2027-11-03'),
    ('BKF Modul 4', '2027-11-04', '2027-11-04'),
    ('BKF Modul 5G', '2027-11-05', '2027-11-05'),
    ('ADR Basiskurs', '2027-11-12', '2027-11-20'),
    ('FES Modul 1', '2027-11-15', '2027-11-22'),
    ('ADR Aufbaukurs Tank', '2027-11-26', '2027-11-27'),
    ('ADR Fortbildung', '2027-12-03', '2027-12-04')
),
vorlage as (
  select p.typ, p.von, p.bis,
    (select to_jsonb(c) from schulung_courses c
      where c.type = p.typ and c.firma_id is null
      order by (c.participant_id is null and coalesce(c.participant_legacy, '') = '') desc,
               c.date_from desc nulls last
      limit 1) as v,
    exists (select 1 from schulung_courses c
      where c.type = p.typ and c.firma_id is null and c.date_from::text = p.von) as vorhanden
  from plan p
),
neu as (
  insert into schulung_courses
  select (jsonb_populate_record(null::schulung_courses,
      x.v || jsonb_build_object(
        'id',                 gen_random_uuid(),
        'legacy_id',          'k27' || substr(md5(random()::text || x.typ || x.von), 1, 10),
        'participant_id',     null,
        'participant_legacy', '',
        'date_from',          x.von,
        'date_to',            x.bis,
        'passed',             false,
        'note',               '',
        'reserviert',         0,
        'reservierungen',     '[]'::jsonb,
        'confirmation_sent',  null,
        'bqr_datei_am',       null,
        'bqr_gemeldet_am',    null,
        'kursplan_id',        null,
        'pruef_theorie',      '',
        'pruef_praxis',       '',
        'created_at',         now(),
        'updated_at',         now()
      ))).*
  from vorlage x
  where x.v is not null and not x.vorhanden
  returning type, date_from
)
select x.typ as lehrgang,
       to_char(x.von::date, 'DD.MM.YYYY') as von,
       to_char(x.bis::date, 'DD.MM.YYYY') as bis,
       case when x.vorhanden then 'schon vorhanden – übersprungen'
            when x.v is null  then 'KEINE VORLAGE – nicht angelegt'
            else 'angelegt' end as ergebnis,
       (select count(*) from neu) as neu_angelegt_gesamt
from vorlage x
order by x.von::date, x.typ;
