-- Migration 26: Neue Fristablauf-Felder in mitarbeiter (§53 FahrlG)
ALTER TABLE mitarbeiter
  ADD COLUMN IF NOT EXISTS frist_afl integer,  -- AFL-Fortbildung §53 Abs.3 FahrlG (alle 4 Jahre)
  ADD COLUMN IF NOT EXISTS frist_asf integer,  -- ASF-Seminarerlaubnis §53 Abs.2 FahrlG (alle 2 Jahre)
  ADD COLUMN IF NOT EXISTS frist_fes integer;  -- FES-Seminarerlaubnis §53 Abs.2 FahrlG (alle 2 Jahre)
