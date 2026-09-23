-- vehicle_credits et vehicle_payments n'ont jamais eu d'ecriture directe cote
-- client (tout passe deja par record_vehicle_credit_sale / record_vehicle_credit_payment,
-- SECURITY DEFINER). expenses n'avait plus qu'un seul point d'ecriture directe restant
-- (addExpense(), jamais appelee dans l'app, supprimee du code client) -- toutes les
-- ecritures reelles passent deja par record_manual_expense / complete_vehicle_maintenance /
-- record_payroll_payment. On ferme donc le GRANT direct, meme pattern "harden" que
-- vehicle_sales/cash_movements/ledger_entries/rentals/rental_payments/payslips/
-- vehicle_maintenances.
--
-- suppliers et employees ne sont PAS traitees ici : aucune RPC n'existe encore pour
-- elles, les verrouiller casserait la creation de fournisseurs/employes.

REVOKE INSERT, UPDATE, DELETE ON public.vehicle_credits FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.vehicle_credits FROM PUBLIC;

REVOKE INSERT, UPDATE, DELETE ON public.vehicle_payments FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.vehicle_payments FROM PUBLIC;

REVOKE INSERT, UPDATE ON public.expenses FROM authenticated;
REVOKE INSERT, UPDATE ON public.expenses FROM PUBLIC;
-- DELETE sur expenses reste autorise pour manager+ (policy "managers delete expenses"
-- deja en place, secure_financial_role_policies.sql) : une depense saisie a tort doit
-- pouvoir etre retiree, contrairement aux ventes/paiements/paie qui sont definitives.
