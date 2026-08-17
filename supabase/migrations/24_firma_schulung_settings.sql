-- Migration 24: Schulungs-Settings in firma-Tabelle
ALTER TABLE firma
  ADD COLUMN IF NOT EXISTS tax              numeric(5,2)  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_manual       boolean       DEFAULT false,
  ADD COLUMN IF NOT EXISTS due_days         integer       DEFAULT 14,
  ADD COLUMN IF NOT EXISTS tax_id           text,
  ADD COLUMN IF NOT EXISTS bank             text,
  ADD COLUMN IF NOT EXISTS inv_foot         text,
  ADD COLUMN IF NOT EXISTS basiszins        numeric(5,2)  DEFAULT 1.27,
  ADD COLUMN IF NOT EXISTS default_location text,
  ADD COLUMN IF NOT EXISTS default_capacity integer       DEFAULT 18,
  ADD COLUMN IF NOT EXISTS warn_days        integer       DEFAULT 60,
  ADD COLUMN IF NOT EXISTS instr_interval   integer       DEFAULT 12,
  ADD COLUMN IF NOT EXISTS grundlagen       jsonb         DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS preise           jsonb         DEFAULT '{}'::jsonb;

INSERT INTO firma (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
