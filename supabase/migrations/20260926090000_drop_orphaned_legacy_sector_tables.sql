-- Suppression definitive des tables des secteurs legacy (Boutique/
-- Electromenager/Restaurant), retirees du code applicatif depuis le pivot
-- mono-secteur (2026-09-24, commit f1d59e0 -- voir CLAUDE.md). Ces tables
-- etaient volontairement conservees en base, orphelines (aucun code ne les
-- lit/ecrit depuis leur suppression du client), en attendant une validation
-- explicite de l'utilisateur avant suppression definitive -- validation
-- donnee le 2026-09-26.
--
-- Electromenager :
DROP TABLE IF EXISTS public.appliances CASCADE;
DROP TABLE IF EXISTS public.warranties CASCADE;
DROP TABLE IF EXISTS public.pro_invoices CASCADE;
DROP TABLE IF EXISTS public.appliance_credits CASCADE;
-- Boutique / commerce generique :
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.sales CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
-- Restaurant :
DROP TABLE IF EXISTS public.dishes CASCADE;
DROP TABLE IF EXISTS public.resto_tables CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.reservations CASCADE;
