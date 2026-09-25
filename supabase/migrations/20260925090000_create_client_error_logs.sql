-- Journal d'erreurs client : capture automatique des erreurs JS attrapées par
-- l'error boundary racine (src/routes/__root.tsx), pour diagnostiquer les bugs
-- intermittents rapportés sur mobile sans dépendre d'une capture d'écran
-- manuelle (l'écran d'erreur peut disparaître en ~1s avant que l'utilisateur
-- ait le temps de cliquer sur "Détails techniques").
--
-- Écriture publique volontaire (anon + authenticated) : l'erreur peut survenir
-- avant toute connexion (pages publiques) ou pendant une session expirée.
-- Aucune policy SELECT pour anon/authenticated : seul le dashboard Supabase
-- (accès service_role) peut lire ce journal — write-only côté application.
CREATE TABLE public.client_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  message text NOT NULL,
  error_name text,
  stack text,
  route text,
  url text,
  user_agent text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_id uuid DEFAULT auth.uid()
);

CREATE INDEX client_error_logs_created_at_idx ON public.client_error_logs (created_at DESC);

GRANT INSERT ON public.client_error_logs TO anon, authenticated;
GRANT ALL ON public.client_error_logs TO service_role;
ALTER TABLE public.client_error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can log an error" ON public.client_error_logs
  FOR INSERT TO anon, authenticated WITH CHECK (true);
