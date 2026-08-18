-- Migration 29: BQR-Sachbearbeiterkennung konfigurierbar
-- Erscheint als <sachbearbeiterkennung> in jeder KBA-Meldung (Berufskraft-
-- fahrerqualifikationsregister). Das XML-Schema erlaubt hoechstens 10 Zeichen;
-- der frueher fest verdrahtete Wert "Thorsten G." hatte 11 Zeichen und liess das
-- KBA-Portal die komplette Upload-Datei als nicht schemavalide zurueckweisen.
-- varchar(10) haelt die Grenze auch auf DB-Ebene.
ALTER TABLE firma
  ADD COLUMN IF NOT EXISTS bqr_sachbearbeiter varchar(10) DEFAULT 'TGels';

UPDATE firma
   SET bqr_sachbearbeiter = 'TGels'
 WHERE bqr_sachbearbeiter IS NULL OR btrim(bqr_sachbearbeiter) = '';
