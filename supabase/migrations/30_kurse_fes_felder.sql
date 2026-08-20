-- Migration 30: Fahreignungsseminar (FES) nach § 4a StVG / § 42 FeV
-- Die Fahrschule fuehrt nur die verkehrspaedagogische Teilmassnahme durch
-- (Modul 1 und Modul 2). Ein neues Feld an den Lehrgangseintraegen:
--   fes_bausteine = tatbezogene Bausteine zu Modul 1. Sie haengen am
--                   TEILNEHMER, nicht am Termin, und stehen deshalb an jedem
--                   einzelnen Kurseintrag.
-- Bei allen anderen Lehrgangstypen bleibt das Feld leer.
ALTER TABLE schulung_courses
  ADD COLUMN IF NOT EXISTS fes_bausteine jsonb DEFAULT '[]'::jsonb;
