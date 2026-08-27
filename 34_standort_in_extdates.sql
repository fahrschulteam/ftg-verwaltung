-- ============================================================
-- 34_standort_in_extdates.sql
-- Fahrschulteam Lingen - Standort beim Teilnehmer nutzbar machen
-- Stand: 27.08.2026
--
-- NACH 33_standorte_essmann.sql ausfuehren.
--
-- Der Teilnehmer-Dialog speichert alle Felder, die "ext_" heissen,
-- automatisch in der Spalte ext_dates. Damit die App den Standort
-- ohne Umbau der Speicherfunktion lesen und schreiben kann, wird
-- die Zuordnung dorthin uebertragen.
--
-- Die Spalte standort_id bleibt bestehen und wird mitgepflegt -
-- sie ist die saubere Verknuepfung fuer spaetere Auswertungen.
-- ============================================================

-- 1. Standortnamen aufraeumen (Ort stand in den alten Firmennamen doppelt)
update schulung_standorte set name = 'Logistikzentrum Berlin'     where name = 'Logistikzentrum Berlin Berlin';
update schulung_standorte set name = 'Logistikzentrum Bielefeld'  where name = 'Logistikzentrum Bielefeld Bielefeld';
update schulung_standorte set name = 'Logistikzentrum Bordesholm' where name = 'Logistikzentrum Bordesholm Bordesholm';
update schulung_standorte set name = 'Logistikzentrum Dorsten'    where name = 'Logistikzentrum Dorsten Dorsten';

-- 2. Vorhandene Zuordnung nach ext_dates uebertragen
update schulung_participants
   set ext_dates = coalesce(ext_dates, '{}'::jsonb)
                   || jsonb_build_object('STANDORT', standort_id::text)
 where standort_id is not null;

-- 3. Ausloeser: haelt standort_id und ext_dates dauerhaft synchron
create or replace function trg_standort_sync() returns trigger as $fn$
begin
  if new.ext_dates ? 'STANDORT' and coalesce(new.ext_dates->>'STANDORT','') <> '' then
    begin
      new.standort_id := (new.ext_dates->>'STANDORT')::uuid;
    exception when others then
      new.standort_id := null;
    end;
  else
    new.standort_id := null;
  end if;
  return new;
end
$fn$ language plpgsql;

drop trigger if exists standort_sync on schulung_participants;
create trigger standort_sync
  before insert or update on schulung_participants
  for each row execute function trg_standort_sync();

-- ---- Kontrolle ----
select s.name as standort,
       count(p.id) as fahrer
  from schulung_standorte s
  left join schulung_participants p on p.standort_id = s.id
 group by s.name
 order by s.name;

select count(*) filter (where standort_id is not null) as mit_standort,
       count(*) filter (where ext_dates ? 'STANDORT')  as mit_extdates
  from schulung_participants;
