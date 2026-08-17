-- Migration 25: Monitor-Empfänger Konfiguration
CREATE TABLE IF NOT EXISTS monitor_empfaenger (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES app_users(id) ON DELETE CASCADE,
  email       text,
  whatsapp    text,
  aktiv       boolean NOT NULL DEFAULT true,
  erstellt_am timestamptz NOT NULL DEFAULT now()
);

-- Index für schnelle Abfrage
CREATE INDEX IF NOT EXISTS monitor_empfaenger_user_idx ON monitor_empfaenger(user_id);
CREATE INDEX IF NOT EXISTS monitor_empfaenger_aktiv_idx ON monitor_empfaenger(aktiv);

-- RLS
ALTER TABLE monitor_empfaenger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins verwalten Empfänger" ON monitor_empfaenger
  FOR ALL USING (
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND rolle = 'admin')
  );
CREATE POLICY "Eigene Einträge lesen" ON monitor_empfaenger
  FOR SELECT USING (user_id = auth.uid());
