-- 37: Versandvermerk der Teilnahmebescheinigung dauerhaft in der Datenbank
-- Verhindert, dass ein Teilnehmer die Bescheinigung mehrfach per E-Mail bekommt
-- (vorher ging der Vermerk beim Neuladen / an anderen PCs verloren).
DO $$
BEGIN
  ALTER TABLE public.schulung_courses
    ADD COLUMN IF NOT EXISTS cert_mail_sent timestamptz;

  -- Altbestand seit Start des automatischen Versands (Oktober 2026):
  -- bestandene Einträge bis gestern gelten als "bereits versendet" (Datum unbekannt).
  UPDATE public.schulung_courses
     SET cert_mail_sent = '2000-01-01T00:00:00Z'
   WHERE cert_mail_sent IS NULL
     AND passed = true
     AND date_from >= '2026-10-01'
     AND date_from <  current_date;
END $$;

-- Schema-Cache von Supabase neu laden, damit die Spalte sofort bekannt ist
NOTIFY pgrst, 'reload schema';

-- Kontrolle: Anzahl vermerkter Einträge
SELECT count(*) AS bereits_vermerkt FROM public.schulung_courses WHERE cert_mail_sent IS NOT NULL;
