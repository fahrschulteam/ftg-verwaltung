-- Migration 31: Meldestatus der BQR/KBA-Meldung (§ 5 BKrFQG)
--
-- Zwei getrennte Zeitstempel, weil "Datei erzeugt" NICHT "gemeldet" heisst:
--   bqr_datei_am    = die XML-Upload-Datei wurde erzeugt und heruntergeladen
--   bqr_gemeldet_am = der Upload bei kba-online.de ("Dateiuebermittlung")
--                     wurde in der App von Hand bestaetigt
--
-- Beide Felder haengen am EINZELNEN Kurseintrag, nicht am Termin: gemeldet
-- wird je Teilnehmer. Wer nach dem Erzeugen der Datei dazukommt, hat kein
-- bqr_datei_am und faellt dadurch als "noch nicht in der Meldung" auf, statt
-- unter einem Sammelhaken am Termin zu verschwinden.
--
-- Kein NOT NULL / kein Default: NULL heisst ausdruecklich "nie passiert".
-- Altbestand bleibt damit korrekt ungemeldet und wird nicht faelschlich
-- als erledigt angezeigt.
ALTER TABLE schulung_courses
  ADD COLUMN IF NOT EXISTS bqr_datei_am    timestamptz,
  ADD COLUMN IF NOT EXISTS bqr_gemeldet_am timestamptz;

COMMENT ON COLUMN schulung_courses.bqr_datei_am    IS 'BQR/KBA: XML-Upload-Datei erzeugt am (noch keine Meldung!)';
COMMENT ON COLUMN schulung_courses.bqr_gemeldet_am IS 'BQR/KBA: Upload ins KBA-Portal am (von Hand bestaetigt)';
