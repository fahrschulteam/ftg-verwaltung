-- ════════════════════════════════════════════════════════════════════
--  Verkehrsleiterschulung 2027 – zwei Termine in den Kurskalender
--    15.03.–18.03.2027  und  30.08.–03.09.2027
--
--  In der Verwaltung stehen die Termine unter dem Reiter
--  „Fachkunde Güterverkehr"; im Kurskalender und in der Anmeldung heißen
--  sie „Verkehrsleiterschulung". Dozent bleibt offen.
--  Gefahrlos mehrfach ausführbar (legt nichts doppelt an).
--
--  Ausführen: Supabase (Projekt der VERWALTUNG) → SQL Editor → Run
-- ════════════════════════════════════════════════════════════════════
with plan(typ, von, bis) as (
  values
    ('Fachkunde Güterverkehr', '2027-03-15', '2027-03-18'),
    ('Fachkunde Güterverkehr', '2027-08-30', '2027-09-03')
),
vorlage as (
  select p.typ, p.von, p.bis,
    -- Vorlage: letzter Termin derselben Art, sonst irgendein öffentlicher Termin
    (select to_jsonb(c) from schulung_courses c
      where c.firma_id is null
      order by (c.type = p.typ) desc,
               (c.participant_id is null and coalesce(c.participant_legacy, '') = '') desc,
               c.date_from desc nulls last
      limit 1) as v,
    exists (select 1 from schulung_courses c
      where c.type = p.typ and c.firma_id is null and c.date_from::text = p.von) as vorhanden
  from plan p
),
neu as (
  insert into schulung_courses
  select (jsonb_populate_record(null::schulung_courses,
      x.v
      -- stammt die Vorlage von einer anderen Lehrgangsart: deren Inhalte leeren
      || case when x.v->>'type' = x.typ then '{}'::jsonb else jsonb_build_object(
           'themes', '[]'::jsonb, 'fes_bausteine', '[]'::jsonb,
           'theory', 0, 'practice', 0, 'vehicle_hours', 0, 'sim_hours', 0,
           'ls_dauer', '', 'bauart', '', 'antrieb', '', 'tragfaehigkeit', '',
           'location_praxis', '') end
      || jsonb_build_object(
        'id',                 gen_random_uuid(),
        'legacy_id',          'k27' || substr(md5(random()::text || x.typ || x.von), 1, 10),
        'type',               x.typ,
        'participant_id',     null,
        'participant_legacy', '',
        'date_from',          x.von,
        'date_to',            x.bis,
        'dozent_legacy',      '',
        'dozent_intern_id',   null,
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
select 'Verkehrsleiterschulung' as lehrgang,
       to_char(x.von::date, 'DD.MM.YYYY') as von,
       to_char(x.bis::date, 'DD.MM.YYYY') as bis,
       case when x.vorhanden then 'schon vorhanden – übersprungen'
            when x.v is null  then 'KEINE VORLAGE – nicht angelegt'
            else 'angelegt' end as ergebnis,
       (select count(*) from neu) as neu_angelegt_gesamt
from vorlage x
order by x.von::date;
