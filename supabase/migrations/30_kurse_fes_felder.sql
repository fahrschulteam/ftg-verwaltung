-- Migration 30: Fahreignungsseminar (FES) nach § 4a StVG / § 42 FeV
-- Zwei neue Felder an den Lehrgangseintraegen:
--   fes_bausteine  = tatbezogene Bausteine der verkehrspaedagogischen
--                    Teilmassnahme (Modul 1). Haengen am TEILNEHMER, nicht am
--                    Termin, deshalb je Kurseintrag gespeichert.
--   fes_psychologe = externer Verkehrspsychologe, der die verkehrspsycho-
--                    logische Teilmassnahme (Sitzung 1 und 2) durchfuehrt.
-- Beide Felder bleiben bei allen anderen Lehrgangstypen leer.
ALTER TABLE schulung_courses
  ADD COLUMN IF NOT EXISTS fes_bausteine  jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS fes_psychologe text  DEFAULT '';
