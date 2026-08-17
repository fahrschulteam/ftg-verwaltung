-- ════════════════════════════════════════════════════════════════════
-- Migration 27: BKrFQG Anerkennungsverwaltung
-- Integration in fahrschulverwaltung.netlify.app
-- Fahrlehrer kommen aus bestehender mitarbeiter-Tabelle (qual_bkf = true)
-- ════════════════════════════════════════════════════════════════════

-- 1. STANDORTE
CREATE TABLE IF NOT EXISTS bkrfqg_standorte (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    TEXT NOT NULL,
  strasse                 TEXT,
  plz                     TEXT,
  ort                     TEXT,
  behoerde_name           TEXT,
  behoerde_abteilung      TEXT,
  behoerde_strasse        TEXT,
  behoerde_plz            TEXT,
  behoerde_ort            TEXT,
  behoerde_email          TEXT,
  behoerde_tel            TEXT,
  behoerde_ansprechpartner TEXT,
  aktenzeichen            TEXT,
  anerkennungsdatum       DATE,
  anerkennungsumfang      TEXT[],
  naechste_ueberpruefung  DATE,
  status                  TEXT DEFAULT 'in_vorbereitung',
  aktiv                   BOOLEAN DEFAULT true,
  notizen                 TEXT,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

-- 2. RÄUME
CREATE TABLE IF NOT EXISTS bkrfqg_raeume (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standort_id           UUID REFERENCES bkrfqg_standorte(id) ON DELETE CASCADE,
  bezeichnung           TEXT NOT NULL,
  geschoss              TEXT,
  flaeche_qm            NUMERIC,
  max_teilnehmer        INT,
  ausstattung           TEXT[],
  im_bescheid           BOOLEAN DEFAULT false,
  eigentum_oder_miete   TEXT DEFAULT 'Eigentum',
  vermieter             TEXT,
  mietvertrag_bis       DATE,
  aktiv                 BOOLEAN DEFAULT true,
  notizen               TEXT,
  created_at            TIMESTAMPTZ DEFAULT now()
);

-- 3. KURSPLÄNE
CREATE TABLE IF NOT EXISTS bkrfqg_kursplaene (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standort_id       UUID REFERENCES bkrfqg_standorte(id),
  titel             TEXT NOT NULL,
  kurstyp           TEXT NOT NULL,
  startdatum        DATE,
  enddatum          DATE,
  status            TEXT DEFAULT 'geplant',
  max_teilnehmer    INT DEFAULT 20,
  teilnehmer_anzahl INT DEFAULT 0,
  einheiten_json    JSONB,
  notizen           TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- 4. KURSTAGE (Einzeltermine, für Kursmeldungen)
-- unterrichtsleiter_id referenziert mitarbeiter.id (bestehende Tabelle!)
CREATE TABLE IF NOT EXISTS bkrfqg_kurstage (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kursplan_id           UUID REFERENCES bkrfqg_kursplaene(id) ON DELETE CASCADE,
  standort_id           UUID REFERENCES bkrfqg_standorte(id),
  raum_id               UUID REFERENCES bkrfqg_raeume(id),
  datum                 DATE NOT NULL,
  beginn                TIME,
  ende                  TIME,
  gegenstand            TEXT NOT NULL,
  kenntnisbereich_kb    TEXT,
  unterrichtsleiter_id  UUID REFERENCES mitarbeiter(id),  -- aus bestehender Tabelle!
  stunden               NUMERIC,
  meldung_status        TEXT DEFAULT 'ausstehend',
  gemeldet_am           TIMESTAMPTZ,
  notizen               TEXT,
  created_at            TIMESTAMPTZ DEFAULT now()
);

-- 5. DOKUMENTE
CREATE TABLE IF NOT EXISTS bkrfqg_dokumente (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bezug_typ         TEXT NOT NULL,
  bezug_id          UUID NOT NULL,
  kategorie         TEXT NOT NULL,
  dateiname         TEXT NOT NULL,
  storage_path      TEXT NOT NULL,
  mime_type         TEXT,
  groesse_bytes     BIGINT,
  ablaufdatum       DATE,
  notiz             TEXT,
  hochgeladen_am    TIMESTAMPTZ DEFAULT now()
);

-- 6. ANTRÄGE
CREATE TABLE IF NOT EXISTS bkrfqg_antraege (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standort_id     UUID REFERENCES bkrfqg_standorte(id),
  typ             TEXT NOT NULL,
  kurstypen       TEXT[],
  eingereicht_am  DATE,
  bescheid_am     DATE,
  aktenzeichen    TEXT,
  status          TEXT DEFAULT 'in_vorbereitung',
  notizen         TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- RLS: anon + authenticated dürfen alles
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'bkrfqg_standorte','bkrfqg_raeume','bkrfqg_kursplaene',
    'bkrfqg_kurstage','bkrfqg_dokumente','bkrfqg_antraege'
  ]) LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS anon_full ON %I', t);
    EXECUTE format('CREATE POLICY anon_full ON %I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

-- Storage Bucket anlegen (manuell in Supabase Dashboard oder via SQL)
-- Name: bkrfqg-dokumente (privat)
-- SELECT storage.create_bucket('bkrfqg-dokumente', false);
