-- ═══════════════════════════════════════════════════════════════════════
-- BKrFQG: Abweichende Dozenten auf Unterthema-Ebene
-- Ergänzt bkrfqg_dozent_baender (Hauptdozent pro Band) um die Möglichkeit,
-- einzelne Unterthemen (z.B. 2.7) einem anderen Dozenten zuzuweisen.
-- Leer/nicht vorhanden = Hauptdozent des Bandes gilt.
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS bkrfqg_dozent_unterthemen (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kurstyp        text NOT NULL,               -- bgq_g | bgq_p | qe_g | ... | kombi_gp
  band_nr        text NOT NULL,               -- '1', '2', '4G', '4P', ...
  unterthema_id  text NOT NULL,               -- '2.7', '4G.3', ...
  mitarbeiter_id uuid NOT NULL REFERENCES mitarbeiter(id) ON DELETE CASCADE,
  created_at     timestamptz DEFAULT now(),
  UNIQUE (kurstyp, band_nr, unterthema_id)    -- pro Unterthema max. 1 abweichender Dozent
);

CREATE INDEX IF NOT EXISTS idx_bkrfqg_dozent_ut_lookup
  ON bkrfqg_dozent_unterthemen (kurstyp, band_nr);

-- RLS: anon + authenticated dürfen alles (analog zu den übrigen bkrfqg-Tabellen)
ALTER TABLE bkrfqg_dozent_unterthemen ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_full ON bkrfqg_dozent_unterthemen;
CREATE POLICY anon_full ON bkrfqg_dozent_unterthemen
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
